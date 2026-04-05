import { NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/firebase-admin'
import { getAccessContext, hasAdminAccess } from '@/lib/admin-access'
import {
    getPriceHistorySeries,
    getPriceTrackerStatus,
    getRecentPriceSyncRuns,
    readPriceTrackerConfig,
    savePriceTrackerConfig,
    syncDailyPriceHistory,
} from '@/lib/price-history-tracker'

export const dynamic = 'force-dynamic'

const toNum = (value, fallback) => {
    const num = Number.parseInt(value, 10)
    return Number.isFinite(num) ? num : fallback
}

const getProductsForPicker = async () => {
    if (!dbAdmin) return []

    const snap = await dbAdmin.collection('products').limit(500).get()
    const rows = []

    snap.forEach((doc) => {
        const data = doc.data() || {}
        const isActive = data.isActive ?? data.is_active ?? data.public ?? true
        if (!isActive) return

        rows.push({
            id: doc.id,
            title: data.title || 'Untitled product',
            price: data.price ?? null,
            originalPrice: data.originalPrice ?? data.original_price ?? null,
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt || null,
        })
    })

    rows.sort((a, b) => {
        const at = Date.parse(a.updatedAt || '') || 0
        const bt = Date.parse(b.updatedAt || '') || 0
        return bt - at
    })

    return rows.slice(0, 250)
}

export async function GET(req) {
    const accessCtx = await getAccessContext(req)
    if (!accessCtx.ok) {
        return NextResponse.json({ error: accessCtx.error }, { status: accessCtx.status })
    }
    if (!hasAdminAccess(accessCtx, 'analytics')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    try {
        const { searchParams } = new URL(req.url)
        const productId = String(searchParams.get('productId') || '').trim()
        const days = Math.max(30, Math.min(180, toNum(searchParams.get('days'), 60)))

        const [config, runs, products] = await Promise.all([
            readPriceTrackerConfig(),
            getRecentPriceSyncRuns(20),
            getProductsForPicker(),
        ])

        const series = productId ? await getPriceHistorySeries(productId, days) : []

        return NextResponse.json({
            status: getPriceTrackerStatus(),
            config,
            runs,
            products,
            series,
            selectedProductId: productId || null,
        })
    } catch (error) {
        return NextResponse.json({ error: error.message || 'Failed to load price history module.' }, { status: 500 })
    }
}

export async function POST(req) {
    const accessCtx = await getAccessContext(req)
    if (!accessCtx.ok) {
        return NextResponse.json({ error: accessCtx.error }, { status: accessCtx.status })
    }
    if (!hasAdminAccess(accessCtx, 'analytics')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    try {
        const body = await req.json().catch(() => ({}))
        const action = String(body?.action || '').trim()

        if (action === 'saveConfig') {
            const config = await savePriceTrackerConfig(body?.config || {})
            return NextResponse.json({ success: true, config })
        }

        if (action === 'syncNow') {
            const result = await syncDailyPriceHistory({ force: true })
            return NextResponse.json({ success: true, ...result })
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    } catch (error) {
        return NextResponse.json({ error: error.message || 'Price history action failed.' }, { status: 500 })
    }
}

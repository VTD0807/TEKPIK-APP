import { NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/firebase-admin'

export const dynamic = 'force-dynamic'

const MAX_IDS = 40

const uniqueIds = (ids) => Array.from(new Set(
    (Array.isArray(ids) ? ids : [])
        .map((id) => String(id || '').trim())
        .filter(Boolean)
)).slice(0, MAX_IDS)

const startOfToday = () => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

export async function POST(req) {
    try {
        if (!dbAdmin) return NextResponse.json({ counts: {} })

        const body = await req.json().catch(() => ({}))
        const productIds = uniqueIds(body?.productIds)
        if (!productIds.length) return NextResponse.json({ counts: {} })

        const dayStart = startOfToday()

        const snapshots = await Promise.all(productIds.map((productId) =>
            dbAdmin
                .collection('analytics_product_unique_visitors')
                .where('productId', '==', productId)
                .where('createdAt', '>=', dayStart)
                .get()
        ))

        const counts = {}
        snapshots.forEach((snap, index) => {
            counts[productIds[index]] = snap.size
        })

        return NextResponse.json({ counts })
    } catch (error) {
        console.error('[views-today]', error)
        return NextResponse.json({ counts: {} }, { status: 200 })
    }
}

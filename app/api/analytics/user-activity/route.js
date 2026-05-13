import { NextResponse } from 'next/server'
import { dbAdmin, timestampToJSON } from '@/lib/firebase-admin'
import { getUnifiedIdentity } from '@/lib/identity-graph'

export const dynamic = 'force-dynamic'

const getLimit = (raw, fallback = 25, max = 100) => {
    const parsed = Number(raw)
    if (!Number.isFinite(parsed)) return fallback
    return Math.max(1, Math.min(Math.floor(parsed), max))
}

const toDate = (value) => {
    if (!value) return null
    if (value?.toDate && typeof value.toDate === 'function') return value.toDate()
    const dt = new Date(value)
    return Number.isFinite(dt.getTime()) ? dt : null
}

const scoreActivity = ({ createdAt, eventType, isShared = false }) => {
    const ageDays = createdAt ? Math.max((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24), 0) : 365
    const recencyBoost = Math.max(0, 1 - (ageDays / 45))
    const eventBoost = eventType === 'wishlist_add' ? 1.2
        : eventType === 'product_click' ? 1
        : eventType === 'amazon_click' ? 0.95
        : eventType === 'page_view' ? 0.6
        : eventType === 'search_query' ? 0.5
        : 0.4
    return Number(((recencyBoost * 0.65) + (eventBoost * 0.35) - (isShared ? 0.1 : 0)).toFixed(4))
}

export async function GET(req) {
    if (!dbAdmin) return NextResponse.json({ ok: false, activities: [], summary: {} })

    try {
        const url = new URL(req.url)
        const accountId = String(url.searchParams.get('accountId') || '').trim()
        const limit = getLimit(url.searchParams.get('limit'), 25, 120)

        if (!accountId) {
            return NextResponse.json({ ok: true, activities: [], summary: { total: 0 } })
        }

        const identity = await getUnifiedIdentity({ dbAdmin, accountId })
        const { deviceIds = [], networkFingerprints = [] } = identity

        const [interactionSnap, pageSnap, productSnap] = await Promise.all([
            dbAdmin.collection('analytics_product_interactions').where('accountId', '==', accountId).limit(400).get(),
            dbAdmin.collection('analytics_page_unique_visitors').where('identityType', '==', 'account').get(),
            dbAdmin.collection('analytics_product_unique_visitors').where('accountId', '==', accountId).limit(400).get(),
        ])

        const activities = []
        interactionSnap.forEach((doc) => {
            const data = doc.data() || {}
            const createdAt = toDate(data.createdAt)
            activities.push({
                id: doc.id,
                type: 'interaction',
                eventType: data.eventType || 'interaction',
                label: data.query || data.productId || 'Activity',
                createdAt,
                accountId: data.accountId || accountId,
                deviceId: data.deviceId || null,
                networkFingerprint: data.networkFingerprint || null,
                score: scoreActivity({ createdAt, eventType: data.eventType, isShared: false }),
            })
        })

        pageSnap.forEach((doc) => {
            const data = doc.data() || {}
            if ((data.identityId || '').trim() !== accountId) return
            const createdAt = toDate(data.createdAt)
            activities.push({
                id: doc.id,
                type: 'page',
                eventType: 'page_view',
                label: data.pagePath || 'Page view',
                createdAt,
                accountId,
                deviceId: null,
                networkFingerprint: data.networkFingerprint || null,
                score: scoreActivity({ createdAt, eventType: 'page_view', isShared: false }),
            })
        })

        productSnap.forEach((doc) => {
            const data = doc.data() || {}
            const createdAt = toDate(data.createdAt)
            const isShared = Boolean(data.viewerType === 'device' && identity.sharedDeviceIds.includes(data.viewerId))
            activities.push({
                id: doc.id,
                type: 'product',
                eventType: 'product_view',
                label: data.productId || 'Product view',
                createdAt,
                accountId: data.accountId || accountId,
                deviceId: data.viewerId || null,
                networkFingerprint: data.networkFingerprint || null,
                score: scoreActivity({ createdAt, eventType: 'product_view', isShared }),
            })
        })

        const merged = activities
            .filter((item) => item.createdAt)
            .sort((a, b) => b.createdAt - a.createdAt || b.score - a.score)
            .slice(0, limit)

        const summary = {
            total: merged.length,
            accountId,
            linkedDevices: deviceIds.length,
            linkedNetworks: networkFingerprints.length,
            privateDevices: identity.privateDeviceIds.length,
            sharedDevices: identity.sharedDeviceIds.length,
        }

        return NextResponse.json({
            ok: true,
            activities: merged.map((item) => ({
                ...item,
                createdAt: item.createdAt ? timestampToJSON(item.createdAt) : null,
            })),
            summary,
        })
    } catch (error) {
        console.error('[user-activity]', error)
        return NextResponse.json({ ok: false, activities: [], summary: {} }, { status: 500 })
    }
}
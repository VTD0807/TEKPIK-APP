/**
 * GET /api/admin/analytics/devices
 * List anonymous devices from analytics_devices collection.
 * Query params:
 *   ?limit=50       — number of devices (max 200)
 *   ?sort=recent    — recent | views | oldest
 *   ?type=mobile    — filter by deviceType
 *   ?country=IN     — filter by lastCountry
 *   ?search=...     — search by deviceId, browser, os, phoneModel
 */
import { NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/firebase-admin'
import { getAccessContext, hasAdminAccess } from '@/lib/admin-access'

export const dynamic = 'force-dynamic'

export async function GET(req) {
    if (!dbAdmin) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })

    const ctx = await getAccessContext(req)
    if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status })
    if (!hasAdminAccess(ctx, 'analytics')) {
        // Fallback: check for general admin
        if (!hasAdminAccess(ctx, 'users')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
    }

    try {
        const url = new URL(req.url)
        const limit = Math.min(Number(url.searchParams.get('limit')) || 50, 200)
        const sort = url.searchParams.get('sort') || 'recent'
        const typeFilter = url.searchParams.get('type') || ''
        const countryFilter = url.searchParams.get('country') || ''
        const search = (url.searchParams.get('search') || '').trim().toLowerCase()

        let query = dbAdmin.collection('analytics_devices')

        // Apply sort
        if (sort === 'views') {
            query = query.orderBy('pageViews', 'desc')
        } else if (sort === 'oldest') {
            query = query.orderBy('lastSeenAt', 'asc')
        } else {
            query = query.orderBy('lastSeenAt', 'desc')
        }

        // We fetch more to allow client-side filtering
        const fetchLimit = search || typeFilter || countryFilter ? limit * 4 : limit
        const snap = await query.limit(Math.min(fetchLimit, 800)).get()

        let devices = []
        snap.forEach(doc => {
            const d = doc.data() || {}
            devices.push({
                id: doc.id,
                deviceId: d.deviceId || doc.id,
                deviceType: d.deviceType || 'unknown',
                phoneModel: d.phoneModel || null,
                browser: d.browser || 'Unknown',
                os: d.os || 'Unknown',
                screenWidth: d.screenWidth || null,
                screenHeight: d.screenHeight || null,
                language: d.language || null,
                timezone: d.timezone || null,
                lastCountry: d.lastCountry || null,
                lastRegion: d.lastRegion || null,
                lastCity: d.lastCity || null,
                lastIp: d.lastIp || null,
                lastPath: d.lastPath || null,
                pageViews: d.pageViews || 0,
                pagesVisited: (d.pagesVisited || []).length,
                productsViewed: (d.productsViewed || []).length,
                accountIds: d.accountIds || [],
                isAnonymous: !(d.accountIds?.length > 0),
                firstSeenAt: d.firstSeenAt?.toDate?.()?.toISOString() || null,
                lastSeenAt: d.lastSeenAt?.toDate?.()?.toISOString() || (d.lastSeenAt instanceof Date ? d.lastSeenAt.toISOString() : d.lastSeenAt) || null,
            })
        })

        // Client-side filters
        if (typeFilter) {
            devices = devices.filter(d => d.deviceType === typeFilter)
        }
        if (countryFilter) {
            devices = devices.filter(d => d.lastCountry === countryFilter)
        }
        if (search) {
            devices = devices.filter(d =>
                (d.deviceId || '').toLowerCase().includes(search) ||
                (d.browser || '').toLowerCase().includes(search) ||
                (d.os || '').toLowerCase().includes(search) ||
                (d.phoneModel || '').toLowerCase().includes(search) ||
                (d.lastCity || '').toLowerCase().includes(search)
            )
        }

        // Trim to limit
        devices = devices.slice(0, limit)

        // Summary stats
        const totalSnap = await dbAdmin.collection('analytics_devices').count().get()
        const totalDevices = totalSnap.data()?.count || devices.length

        return NextResponse.json({
            devices,
            total: totalDevices,
            returned: devices.length,
        })
    } catch (err) {
        console.error('[admin/analytics/devices]', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

import { NextResponse } from 'next/server'
import { dbAdmin, timestampToJSON } from '@/lib/firebase-admin'

export const dynamic = 'force-dynamic'

const makeDeviceId = (uid) => {
    const seed = String(uid || '').slice(0, 8) || 'user'
    const rand = Math.random().toString(36).slice(2, 10)
    return `dev_${seed}_${rand}`
}

const toList = (map) => Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)

const normalizeKnown = (value) => {
    const raw = String(value || '').trim()
    if (!raw) return null
    const low = raw.toLowerCase()
    if (low === 'unknown' || low === 'null' || low === 'undefined' || raw === '—') return null
    return raw
}

const addKnown = (map, value) => {
    const normalized = normalizeKnown(value)
    if (!normalized) return
    map.set(normalized, (map.get(normalized) || 0) + 1)
}

export async function GET() {
    if (!dbAdmin) return NextResponse.json({ users: [], summary: {} })

    try {
        const snap = await dbAdmin.collection('users').get()
        const users = []
        const regionCounts = new Map()
        const cityCounts = new Map()
        const phoneCounts = new Map()
        const browserCounts = new Map()
        const osCounts = new Map()
        const countryCounts = new Map()

        snap.forEach(doc => {
            const data = doc.data() || {}
            const user = {
                id: doc.id,
                name: data.name || 'Unknown',
                email: data.email || '',
                role: data.role || 'USER',
                image: data.image || '',
                createdAt: data.createdAt ? timestampToJSON(data.createdAt) : null,
                deviceId: data.deviceId || data.lastDeviceId || null,
                deviceIds: Array.isArray(data.deviceIds) ? data.deviceIds : (data.deviceId ? [data.deviceId] : []),
                lastKnownIp: data.lastKnownIp || null,
                lastKnownCountry: data.lastKnownCountry || null,
                lastKnownRegion: data.lastKnownRegion || null,
                lastKnownCity: data.lastKnownCity || null,
                lastKnownPhoneModel: data.lastKnownPhoneModel || null,
                lastKnownBrowser: data.lastKnownBrowser || null,
                lastKnownOs: data.lastKnownOs || null,
                lastKnownDeviceType: data.lastKnownDeviceType || null,
                lastSeenAt: data.lastSeenAt ? timestampToJSON(data.lastSeenAt) : null,
            }
            users.push(user)

            addKnown(countryCounts, user.lastKnownCountry)
            addKnown(regionCounts, user.lastKnownRegion)
            addKnown(cityCounts, user.lastKnownCity)
            addKnown(phoneCounts, user.lastKnownPhoneModel)
            addKnown(browserCounts, user.lastKnownBrowser)
            addKnown(osCounts, user.lastKnownOs)
        })

        const summary = {
            totalUsers: users.length,
            adminUsers: users.filter(u => u.role === 'ADMIN').length,
            usersWithLocation: users.filter(u => u.lastKnownCountry || u.lastKnownRegion || u.lastKnownCity).length,
            usersWithDeviceInfo: users.filter(u => u.lastKnownPhoneModel || u.lastKnownBrowser || u.lastKnownOs).length,
            topCountries: toList(countryCounts).slice(0, 10),
            topRegions: toList(regionCounts).slice(0, 10),
            topCities: toList(cityCounts).slice(0, 10),
            topPhones: toList(phoneCounts).slice(0, 10),
            topBrowsers: toList(browserCounts).slice(0, 10),
            topOs: toList(osCounts).slice(0, 10),
        }

        return NextResponse.json({ users, summary })
    } catch (error) {
        console.error('[admin-user-analytics]', error)
        return NextResponse.json({ users: [], summary: {} })
    }
}

export async function POST() {
    if (!dbAdmin) return NextResponse.json({ success: false, error: 'DB not initialized' }, { status: 500 })

    try {
        const [usersSnap, productAnalyticsSnap, pageAnalyticsSnap] = await Promise.all([
            dbAdmin.collection('users').get(),
            dbAdmin.collection('analytics_product_unique_visitors').limit(5000).get(),
            dbAdmin.collection('analytics_page_unique_visitors').where('identityType', '==', 'account').limit(5000).get(),
        ])

        const latestByAccount = new Map()
        productAnalyticsSnap.forEach((doc) => {
            const data = doc.data() || {}
            const accountId = String(data.accountId || '').trim()
            if (!accountId) return

            const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : null
            const existing = latestByAccount.get(accountId)
            if (!existing || (createdAt && existing.createdAt && createdAt > existing.createdAt) || (createdAt && !existing.createdAt)) {
                latestByAccount.set(accountId, {
                    createdAt,
                    data,
                })
            }
        })

        const latestPageByAccount = new Map()
        pageAnalyticsSnap.forEach((doc) => {
            const data = doc.data() || {}
            const accountId = String(data.identityId || '').trim()
            if (!accountId) return
            const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : null
            const existing = latestPageByAccount.get(accountId)
            if (!existing || (createdAt && existing.createdAt && createdAt > existing.createdAt) || (createdAt && !existing.createdAt)) {
                latestPageByAccount.set(accountId, { createdAt, data })
            }
        })

        let updatedUsers = 0
        let assignedDeviceIds = 0
        let enrichedProfiles = 0

        const batch = dbAdmin.batch()
        usersSnap.forEach((doc) => {
            const user = doc.data() || {}
            const latest = latestByAccount.get(doc.id)?.data || null
            const latestPage = latestPageByAccount.get(doc.id) || null
            const updates = {}

            const currentDeviceId = user.deviceId || user.lastDeviceId || null
            if (!currentDeviceId) {
                const generated = makeDeviceId(doc.id)
                updates.deviceId = generated
                updates.lastDeviceId = generated
                updates.deviceIds = [generated]
                assignedDeviceIds += 1
            } else if (!Array.isArray(user.deviceIds) || !user.deviceIds.includes(currentDeviceId)) {
                updates.deviceIds = Array.isArray(user.deviceIds)
                    ? Array.from(new Set([...user.deviceIds, currentDeviceId]))
                    : [currentDeviceId]
            }

            if (latest) {
                if (!user.lastKnownCountry && latest.country) updates.lastKnownCountry = latest.country
                if (!user.lastKnownRegion && latest.region) updates.lastKnownRegion = latest.region
                if (!user.lastKnownCity && latest.city) updates.lastKnownCity = latest.city
                if (!user.lastKnownPhoneModel && latest.phoneModel) updates.lastKnownPhoneModel = latest.phoneModel
                if (!user.lastKnownBrowser && latest.browser) updates.lastKnownBrowser = latest.browser
                if (!user.lastKnownOs && latest.os) updates.lastKnownOs = latest.os
                if (!user.lastKnownDeviceType && latest.deviceType) updates.lastKnownDeviceType = latest.deviceType
                if (!user.lastKnownIp && latest.ipAddress) updates.lastKnownIp = latest.ipAddress
                if (!user.lastSeenAt && latest.createdAt) updates.lastSeenAt = latest.createdAt

                const addedProfileFields = [
                    'lastKnownCountry',
                    'lastKnownRegion',
                    'lastKnownCity',
                    'lastKnownPhoneModel',
                    'lastKnownBrowser',
                    'lastKnownOs',
                    'lastKnownDeviceType',
                    'lastKnownIp',
                    'lastSeenAt',
                ].some((key) => key in updates)

                if (addedProfileFields) enrichedProfiles += 1
            }

            if (!user.lastSeenAt && latestPage?.createdAt) {
                updates.lastSeenAt = latestPage.createdAt
            }

            if ((!user.deviceId && !user.lastDeviceId) && latestPage?.data?.identityId) {
                const fallbackDevice = makeDeviceId(doc.id)
                updates.deviceId = fallbackDevice
                updates.lastDeviceId = fallbackDevice
                updates.deviceIds = Array.isArray(updates.deviceIds) ? updates.deviceIds : [fallbackDevice]
            }

            if (Object.keys(updates).length > 0) {
                batch.set(doc.ref, updates, { merge: true })
                updatedUsers += 1
            }
        })

        if (updatedUsers > 0) {
            await batch.commit()
        }

        return NextResponse.json({
            success: true,
            updatedUsers,
            assignedDeviceIds,
            enrichedProfiles,
        })
    } catch (error) {
        console.error('[admin-user-analytics:backfill]', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

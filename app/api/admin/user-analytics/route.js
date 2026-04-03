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

const parseDeviceInfoFromUserAgent = (userAgent = '') => {
    const ua = String(userAgent || '')

    let phoneModel = null
    if (/iphone/i.test(ua)) phoneModel = 'iPhone'
    else if (/pixel/i.test(ua)) phoneModel = 'Google Pixel'
    else if (/sm-/i.test(ua) || /samsung/i.test(ua)) phoneModel = 'Samsung Galaxy'
    else if (/redmi|mi\s|xiaomi/i.test(ua)) phoneModel = 'Xiaomi Redmi'
    else if (/oneplus/i.test(ua)) phoneModel = 'OnePlus'
    else if (/oppo/i.test(ua)) phoneModel = 'Oppo'
    else if (/vivo/i.test(ua)) phoneModel = 'Vivo'
    else if (/realme/i.test(ua)) phoneModel = 'Realme'
    else if (/motorola|moto/i.test(ua)) phoneModel = 'Motorola'
    else if (/nokia/i.test(ua)) phoneModel = 'Nokia'
    else if (/nothing/i.test(ua)) phoneModel = 'Nothing'

    let browser = null
    if (/chrome/i.test(ua) && !/edg|opr|opera/i.test(ua)) browser = 'Chrome'
    else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari'
    else if (/firefox/i.test(ua)) browser = 'Firefox'
    else if (/edg/i.test(ua)) browser = 'Edge'
    else if (/opera|opr/i.test(ua)) browser = 'Opera'

    return { phoneModel, browser }
}

const isPublicIp = (ip) => {
    const raw = String(ip || '').trim()
    if (!raw) return false
    if (raw === '::1' || raw.startsWith('127.') || raw.startsWith('10.') || raw.startsWith('192.168.')) return false
    if (raw.startsWith('172.')) {
        const second = Number(raw.split('.')[1])
        if (second >= 16 && second <= 31) return false
    }
    if (raw.startsWith('fc') || raw.startsWith('fd') || raw.startsWith('fe80:')) return false
    return true
}

const fetchGeoFromIp = async (ip) => {
    const target = String(ip || '').trim()
    if (!isPublicIp(target)) return null

    try {
        const response = await fetch(`https://ipapi.co/${encodeURIComponent(target)}/json/`, {
            cache: 'no-store',
            signal: AbortSignal.timeout(1800),
        })
        if (!response.ok) return null
        const data = await response.json().catch(() => null)
        if (!data) return null

        return {
            country: normalizeKnown(data.country_name || data.country || null),
            region: normalizeKnown(data.region || data.region_code || null),
            city: normalizeKnown(data.city || null),
        }
    } catch {
        return null
    }
}

export async function GET() {
    if (!dbAdmin) return NextResponse.json({ users: [], summary: {} })

    try {
        const [usersSnap, productAnalyticsSnap] = await Promise.all([
            dbAdmin.collection('users').get(),
            dbAdmin.collection('analytics_product_unique_visitors').limit(8000).get(),
        ])

        const latestByAccount = new Map()
        productAnalyticsSnap.forEach((doc) => {
            const data = doc.data() || {}
            const accountId = String(data.accountId || '').trim()
            if (!accountId) return

            const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : null
            const existing = latestByAccount.get(accountId)
            if (!existing || (createdAt && existing.createdAt && createdAt > existing.createdAt) || (createdAt && !existing.createdAt)) {
                latestByAccount.set(accountId, { createdAt, data })
            }
        })

        const users = []
        const regionCounts = new Map()
        const cityCounts = new Map()
        const phoneCounts = new Map()
        const browserCounts = new Map()
        const osCounts = new Map()
        const countryCounts = new Map()
        const ipLookupTasks = []
        const ipLookupCache = new Map()

        usersSnap.forEach(doc => {
            const data = doc.data() || {}
            const analyticsLatest = latestByAccount.get(doc.id)?.data || null
            const uaFallback = parseDeviceInfoFromUserAgent(data.lastKnownUserAgent || analyticsLatest?.userAgent || '')
            const user = {
                id: doc.id,
                name: data.name || 'Unknown',
                email: data.email || '',
                role: data.role || 'USER',
                image: data.image || '',
                createdAt: data.createdAt ? timestampToJSON(data.createdAt) : null,
                deviceId: data.deviceId || data.lastDeviceId || null,
                deviceIds: Array.isArray(data.deviceIds) ? data.deviceIds : (data.deviceId ? [data.deviceId] : []),
                lastKnownIp: data.lastKnownIp || analyticsLatest?.ipAddress || null,
                lastKnownCountry: data.lastKnownCountry || analyticsLatest?.country || null,
                lastKnownRegion: data.lastKnownRegion || analyticsLatest?.region || null,
                lastKnownCity: data.lastKnownCity || analyticsLatest?.city || null,
                lastKnownPhoneModel: data.lastKnownPhoneModel || analyticsLatest?.phoneModel || uaFallback.phoneModel || null,
                lastKnownBrowser: data.lastKnownBrowser || analyticsLatest?.browser || uaFallback.browser || null,
                lastKnownOs: data.lastKnownOs || analyticsLatest?.os || null,
                lastKnownDeviceType: data.lastKnownDeviceType || null,
                lastSeenAt: data.lastSeenAt ? timestampToJSON(data.lastSeenAt) : null,
            }

            const needsGeoLookup = !user.lastKnownRegion && !user.lastKnownCity && !user.lastKnownCountry && isPublicIp(user.lastKnownIp)
            if (needsGeoLookup) {
                const normalizedIp = String(user.lastKnownIp).trim()
                ipLookupTasks.push(
                    (async () => {
                        if (!ipLookupCache.has(normalizedIp)) {
                            ipLookupCache.set(normalizedIp, await fetchGeoFromIp(normalizedIp))
                        }
                        const geo = ipLookupCache.get(normalizedIp)
                        if (!geo) return
                        user.lastKnownCountry = user.lastKnownCountry || geo.country || null
                        user.lastKnownRegion = user.lastKnownRegion || geo.region || null
                        user.lastKnownCity = user.lastKnownCity || geo.city || null
                    })()
                )
            }

            users.push(user)
        })

        if (ipLookupTasks.length > 0) {
            await Promise.allSettled(ipLookupTasks)
        }

        users.forEach((user) => {
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

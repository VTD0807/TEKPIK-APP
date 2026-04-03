import { NextResponse } from 'next/server'
import { dbAdmin, authAdmin, timestampToJSON } from '@/lib/firebase-admin'

const toList = (map) => Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

const toDateSafe = (value) => {
    if (!value) return null
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? null : d
}

const isIndexError = (error) => {
    const msg = String(error?.message || '')
    return msg.includes('FAILED_PRECONDITION') || msg.includes('requires an index')
}

const toJsonTime = (value) => {
    if (!value) return null
    if (typeof value?.toDate === 'function') return value.toDate().toISOString()
    return timestampToJSON(value)
}

async function queryByUserWithOrderFallback(collectionName, userId, orderField, limit = 50) {
    const base = dbAdmin.collection(collectionName).where('userId', '==', userId)
    try {
        return await base.orderBy(orderField, 'desc').limit(limit).get()
    } catch (error) {
        if (!isIndexError(error)) throw error
        return await base.limit(limit).get()
    }
}

const extractChargeMinutes = (text = '') => {
    const source = String(text || '')
    const patterns = [
        /(\d{1,3})\s*(?:min|mins|minutes)\s*(?:fast\s*)?charge/i,
        /charge(?:d|ing)?\s*(?:in|within)?\s*(\d{1,3})\s*(?:min|mins|minutes)/i,
    ]
    for (const pattern of patterns) {
        const match = source.match(pattern)
        if (match?.[1]) return Number(match[1])
    }
    return null
}

const extractBatteryHours = (text = '') => {
    const source = String(text || '')
    const patterns = [
        /(\d{1,3})\s*(?:hr|hrs|hour|hours)\s*(?:battery|playback|backup|life)/i,
        /battery\s*life\s*(?:of|up\s*to)?\s*(\d{1,3})\s*(?:hr|hrs|hour|hours)/i,
    ]
    for (const pattern of patterns) {
        const match = source.match(pattern)
        if (match?.[1]) return Number(match[1])
    }
    return null
}

export const dynamic = 'force-dynamic'

async function deleteCollectionByField(collectionName, fieldName, value, batchSize = 250) {
    let deleted = 0

    while (true) {
        const snapshot = await dbAdmin
            .collection(collectionName)
            .where(fieldName, '==', value)
            .limit(batchSize)
            .get()

        if (snapshot.empty) break

        const batch = dbAdmin.batch()
        snapshot.docs.forEach((doc) => batch.delete(doc.ref))
        await batch.commit()
        deleted += snapshot.size

        if (snapshot.size < batchSize) break
    }

    return deleted
}

export async function GET(req, { params }) {
    const { id } = await params
    if (!dbAdmin) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })

    try {
        const userSnap = await dbAdmin.collection('users').doc(id).get()
        let user
        if (userSnap.exists) {
            user = { id: userSnap.id, ...userSnap.data(), createdAt: timestampToJSON(userSnap.data().createdAt) }
        } else if (authAdmin) {
            const authUser = await authAdmin.getUser(id)
            user = {
                id: authUser.uid,
                name: authUser.displayName || (authUser.email ? authUser.email.split('@')[0] : 'User'),
                email: authUser.email || '',
                image: authUser.photoURL || '',
                role: 'USER',
                createdAt: authUser.metadata?.creationTime || new Date().toISOString(),
            }
        } else {
            return NextResponse.json({ error: 'Not found' }, { status: 404 })
        }

        user.deviceId = user.deviceId || user.lastDeviceId || null
        user.deviceIds = Array.isArray(user.deviceIds) ? user.deviceIds : (user.deviceId ? [user.deviceId] : [])

        const [reviewSnap, wlSnap, analyticsSnap, pageSnap] = await Promise.all([
            queryByUserWithOrderFallback('reviews', id, 'createdAt', 30),
            queryByUserWithOrderFallback('wishlists', id, 'addedAt', 50),
            dbAdmin.collection('analytics_product_unique_visitors').where('accountId', '==', id).limit(500).get(),
            dbAdmin.collection('analytics_page_unique_visitors').where('identityId', '==', id).limit(500).get(),
        ])

        const reviewIds = []
        let reviews = []
        reviewSnap.forEach((doc) => {
            const data = doc.data()
            const productId = data.productId || data.product_id || null
            if (productId) reviewIds.push(productId)
            reviews.push({
                id: doc.id,
                ...data,
                productId,
                createdAt: toJsonTime(data.createdAt || data.created_at),
            })
        })

        let wishlists = []
        wlSnap.forEach((doc) => {
            const data = doc.data()
            const productId = data.productId || data.product_id || null
            if (productId) reviewIds.push(productId)
            wishlists.push({
                id: doc.id,
                ...data,
                productId,
                addedAt: toJsonTime(data.addedAt || data.added_at),
            })
        })

        const analytics = []
        analyticsSnap.forEach((doc) => {
            const data = doc.data()
            analytics.push({ id: doc.id, ...data, createdAt: toJsonTime(data.createdAt) })
            if (data.productId) reviewIds.push(data.productId)
        })

        const pageVisits = []
        pageSnap.forEach((doc) => {
            const data = doc.data()
            if (data.identityType === 'account') {
                pageVisits.push({ id: doc.id, ...data, createdAt: toJsonTime(data.createdAt) })
            }
        })

        reviews.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        wishlists.sort((a, b) => new Date(b.addedAt || 0) - new Date(a.addedAt || 0))

        const productIds = Array.from(new Set(reviewIds)).filter(Boolean)
        const productsMap = {}
        if (productIds.length > 0) {
            const refs = productIds.map((pid) => dbAdmin.collection('products').doc(pid))
            const chunkSize = 100
            for (let i = 0; i < refs.length; i += chunkSize) {
                const docs = await dbAdmin.getAll(...refs.slice(i, i + chunkSize))
                docs.forEach((doc) => {
                    if (doc.exists) productsMap[doc.id] = doc.data()
                })
            }
        }

        const categoriesMap = {}
        const hasCategory = Object.values(productsMap).some((p) => p?.categoryId)
        if (hasCategory) {
            const categoriesSnap = await dbAdmin.collection('categories').get()
            categoriesSnap.forEach((doc) => {
                const d = doc.data() || {}
                categoriesMap[doc.id] = d.name || 'Unknown'
            })
        }

        reviews = reviews.map(r => ({
            ...r,
            products: productsMap[r.productId] ? {
                title: productsMap[r.productId].title,
                imageUrls: productsMap[r.productId].imageUrls || productsMap[r.productId].image_urls || [],
                image_urls: productsMap[r.productId].imageUrls || productsMap[r.productId].image_urls || [],
                price: productsMap[r.productId].price,
            } : null
        }))

        wishlists = wishlists.map(w => ({
            ...w,
            products: productsMap[w.productId] ? {
                id: w.productId,
                title: productsMap[w.productId].title,
                imageUrls: productsMap[w.productId].imageUrls || productsMap[w.productId].image_urls || [],
                image_urls: productsMap[w.productId].imageUrls || productsMap[w.productId].image_urls || [],
                price: productsMap[w.productId].price,
                brand: productsMap[w.productId].brand,
                category: categoriesMap[productsMap[w.productId].categoryId] || null,
                affiliateUrl: productsMap[w.productId].affiliateUrl || productsMap[w.productId].affiliate_url || null,
                affiliate_url: productsMap[w.productId].affiliateUrl || productsMap[w.productId].affiliate_url || null,
            } : null
        }))

        const regionCounts = new Map()
        const cityCounts = new Map()
        const phoneCounts = new Map()
        const browserCounts = new Map()
        const osCounts = new Map()
        let latestVisit = null

        analytics.forEach(v => {
            const region = String(v.region || v.country || user.lastKnownRegion || user.lastKnownCountry || 'Unknown').trim() || 'Unknown'
            const city = String(v.city || user.lastKnownCity || 'Unknown').trim() || 'Unknown'
            const phone = String(v.phoneModel || user.lastKnownPhoneModel || 'Unknown').trim() || 'Unknown'
            const browser = String(v.browser || user.lastKnownBrowser || 'Unknown').trim() || 'Unknown'
            const os = String(v.os || user.lastKnownOs || 'Unknown').trim() || 'Unknown'

            regionCounts.set(region, (regionCounts.get(region) || 0) + 1)
            cityCounts.set(city, (cityCounts.get(city) || 0) + 1)
            phoneCounts.set(phone, (phoneCounts.get(phone) || 0) + 1)
            browserCounts.set(browser, (browserCounts.get(browser) || 0) + 1)
            osCounts.set(os, (osCounts.get(os) || 0) + 1)

            if (!latestVisit || (v.createdAt && new Date(v.createdAt) > new Date(latestVisit.createdAt || 0))) {
                latestVisit = v
            }
        })

        const analyticsSummary = {
            totalVisits: analytics.length,
            totalPageVisits: pageVisits.length,
            topRegions: toList(regionCounts),
            topCities: toList(cityCounts),
            topPhones: toList(phoneCounts),
            topBrowsers: toList(browserCounts),
            topOs: toList(osCounts),
            latestVisit,
        }

        const dayCounts = new Map()
        const allEvents = [...analytics, ...pageVisits].filter((item) => item.createdAt)
        allEvents.forEach((item) => {
            const dayKey = String(item.createdAt).slice(0, 10)
            dayCounts.set(dayKey, (dayCounts.get(dayKey) || 0) + 1)
        })

        const now = Date.now()
        const thirtyDaysMs = 1000 * 60 * 60 * 24 * 30
        const eventsLast30Days = allEvents.filter((item) => {
            const d = toDateSafe(item.createdAt)
            return d ? (now - d.getTime()) <= thirtyDaysMs : false
        }).length

        const activeDays = dayCounts.size || 1
        const visitsPerActiveDay = Number((allEvents.length / activeDays).toFixed(2))

        const brandCounts = new Map()
        const categoryCounts = new Map()
        const likedProductsMap = new Map()
        const chargingMinutes = []
        const batteryHours = []

        wishlists.forEach((item) => {
            const p = item.products
            if (!p?.id) return
            likedProductsMap.set(p.id, {
                id: p.id,
                title: p.title || 'Unknown product',
                imageUrls: p.imageUrls || [],
                price: p.price ?? null,
                brand: p.brand || null,
                category: p.category || null,
                reason: 'wishlisted',
            })
        })

        reviews.forEach((review) => {
            if (Number(review.rating) < 4) return
            const p = productsMap[review.productId]
            if (!p) return
            likedProductsMap.set(review.productId, {
                id: review.productId,
                title: p.title || 'Unknown product',
                imageUrls: p.imageUrls || p.image_urls || [],
                price: p.price ?? null,
                brand: p.brand || null,
                category: categoriesMap[p.categoryId] || null,
                reason: 'high-rating-review',
            })
        })

        Array.from(likedProductsMap.values()).forEach((p) => {
            const brand = String(p.brand || 'Unknown').trim() || 'Unknown'
            const category = String(p.category || 'Unknown').trim() || 'Unknown'
            brandCounts.set(brand, (brandCounts.get(brand) || 0) + 1)
            categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1)

            const sourceProduct = productsMap[p.id] || {}
            const textBlob = [sourceProduct.title, sourceProduct.description, p.title].filter(Boolean).join(' ')
            const charge = extractChargeMinutes(textBlob)
            const battery = extractBatteryHours(textBlob)
            if (Number.isFinite(charge)) chargingMinutes.push(charge)
            if (Number.isFinite(battery)) batteryHours.push(battery)
        })

        const averageChargingMinutes = chargingMinutes.length
            ? Number((chargingMinutes.reduce((a, b) => a + b, 0) / chargingMinutes.length).toFixed(1))
            : null

        const averageBatteryHours = batteryHours.length
            ? Number((batteryHours.reduce((a, b) => a + b, 0) / batteryHours.length).toFixed(1))
            : null

        const lastSiteVisit = [
            user.lastSeenAt,
            analyticsSummary.latestVisit?.createdAt,
            ...pageVisits.map((v) => v.createdAt),
        ].filter(Boolean)
            .map((x) => toDateSafe(x))
            .filter(Boolean)
            .sort((a, b) => b.getTime() - a.getTime())[0] || null

        const engagement = {
            uniquePagesVisited: pageVisits.length,
            productInteractionCount: analytics.length,
            allInteractionCount: allEvents.length,
            eventsLast30Days,
            activeDays,
            visitsPerActiveDay,
            lastSiteVisit: lastSiteVisit ? lastSiteVisit.toISOString() : null,
            likedProducts: Array.from(likedProductsMap.values()).slice(0, 12),
            favoriteBrands: toList(brandCounts).slice(0, 6),
            favoriteCategories: toList(categoryCounts).slice(0, 6),
            averageChargingMinutes,
            averageBatteryHours,
            topVisitedPages: toList(pageVisits.reduce((map, v) => {
                const path = String(v.pagePath || '/').trim() || '/'
                map.set(path, (map.get(path) || 0) + 1)
                return map
            }, new Map())).slice(0, 8),
        }

        return NextResponse.json({
            user,
            reviews,
            wishlists,
            analytics: analyticsSummary,
            engagement,
        })

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function PATCH(req, { params }) {
    if (!dbAdmin) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })

    try {
        const { id } = await params
        const { role, dashboardAccess } = await req.json()

        if (!id) {
            return NextResponse.json({ error: 'user id required' }, { status: 400 })
        }

        const updates = {}
        if (role) updates.role = role
        if (dashboardAccess && typeof dashboardAccess === 'object') {
            updates.dashboardAccess = {
                cms: Boolean(dashboardAccess.cms),
                admin: Boolean(dashboardAccess.admin),
                store: Boolean(dashboardAccess.store),
            }
        }
        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
        }

        await dbAdmin.collection('users').doc(id).set(updates, { merge: true })
        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function DELETE(req, { params }) {
    if (!dbAdmin) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })

    try {
        const { id } = await params
        if (!id) return NextResponse.json({ error: 'user id required' }, { status: 400 })

        const cleanupResults = await Promise.allSettled([
            deleteCollectionByField('wishlists', 'userId', id),
            deleteCollectionByField('reviews', 'userId', id),
            deleteCollectionByField('user_notifications', 'receiverId', id),
            deleteCollectionByField('analytics_product_unique_visitors', 'accountId', id),
            deleteCollectionByField('analytics_page_unique_visitors', 'identityId', id),
        ])

        const cleaned = cleanupResults.reduce((sum, result) => {
            if (result.status === 'fulfilled') return sum + result.value
            return sum
        }, 0)

        await dbAdmin.collection('users').doc(id).delete()

        if (authAdmin) {
            try {
                await authAdmin.deleteUser(id)
            } catch (authError) {
                if (authError?.code !== 'auth/user-not-found') {
                    throw authError
                }
            }
        }

        return NextResponse.json({ success: true, cleanedRecords: cleaned })
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

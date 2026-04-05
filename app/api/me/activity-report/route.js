import { NextResponse } from 'next/server'
import { dbAdmin, timestampToJSON } from '@/lib/firebase-admin'
import { getAccessContext } from '@/lib/admin-access'

export const dynamic = 'force-dynamic'

const toIso = (value) => {
    if (!value) return null
    if (typeof value.toDate === 'function') return value.toDate().toISOString()
    return value instanceof Date ? value.toISOString() : null
}

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

async function queryByUserWithOrderFallback(collectionName, userId, fieldName, orderField, limit = 50) {
    const base = dbAdmin.collection(collectionName).where(fieldName, '==', userId)
    try {
        return await base.orderBy(orderField, 'desc').limit(limit).get()
    } catch (error) {
        if (!isIndexError(error)) throw error
        return await base.limit(limit).get()
    }
}

function normalizeDashboardAccess(value = {}) {
    const source = value && typeof value === 'object' ? value : {}
    return {
        cms: Boolean(source.cms),
        admin: Boolean(source.admin),
        store: Boolean(source.store),
        analytics: Boolean(source.analytics),
        users: Boolean(source.users),
        employees: Boolean(source.employees),
        reviews: Boolean(source.reviews),
        products: Boolean(source.products),
        notifications: Boolean(source.notifications),
        settings: Boolean(source.settings),
    }
}

export async function GET(req) {
    if (!dbAdmin) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })

    const ctx = await getAccessContext(req)
    if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

    try {
        const userSnap = await dbAdmin.collection('users').doc(ctx.uid).get()
        const userData = userSnap.exists ? (userSnap.data() || {}) : {}
        const role = String(userData.role || ctx.role || 'USER').trim().toUpperCase()
        const dashboardAccess = normalizeDashboardAccess(userData.dashboardAccess)

        const [reviewSnap, wishlistSnap, analyticsSnap, pageSnap, productSnap] = await Promise.all([
            queryByUserWithOrderFallback('reviews', ctx.uid, 'userId', 'createdAt', 50),
            queryByUserWithOrderFallback('wishlists', ctx.uid, 'userId', 'addedAt', 50),
            dbAdmin.collection('analytics_product_unique_visitors').where('accountId', '==', ctx.uid).limit(500).get(),
            dbAdmin.collection('analytics_page_unique_visitors').where('identityId', '==', ctx.uid).limit(500).get(),
            dbAdmin.collection('products').where('createdBy', '==', ctx.uid).limit(500).get().catch(() => ({ empty: true, docs: [], size: 0 })),
        ])

        const reviews = []
        const wishlists = []
        const analytics = []
        const pageVisits = []
        const products = []

        reviewSnap.forEach((doc) => {
            const data = doc.data() || {}
            reviews.push({
                id: doc.id,
                ...data,
                productId: data.productId || data.product_id || null,
                createdAt: toIso(data.createdAt || data.created_at),
            })
        })

        wishlistSnap.forEach((doc) => {
            const data = doc.data() || {}
            wishlists.push({
                id: doc.id,
                ...data,
                productId: data.productId || data.product_id || null,
                addedAt: toIso(data.addedAt || data.added_at),
            })
        })

        analyticsSnap.forEach((doc) => {
            const data = doc.data() || {}
            analytics.push({ id: doc.id, ...data, createdAt: toIso(data.createdAt) })
        })

        pageSnap.forEach((doc) => {
            const data = doc.data() || {}
            pageVisits.push({ id: doc.id, ...data, createdAt: toIso(data.createdAt) })
        })

        if (productSnap?.docs) {
            productSnap.docs.forEach((doc) => {
                const data = doc.data() || {}
                products.push({
                    id: doc.id,
                    title: data.title || data.name || 'Untitled',
                    imageUrl: data.imageUrls?.[0] || data.image_urls?.[0] || null,
                    price: data.price ?? null,
                    isActive: data.isActive ?? data.is_active ?? data.public ?? true,
                    createdAt: toIso(data.createdAt),
                })
            })
        }

        const reviewIds = Array.from(new Set([
            ...reviews.map((item) => item.productId).filter(Boolean),
            ...wishlists.map((item) => item.productId).filter(Boolean),
        ]))

        const productIds = products.map((item) => item.id).filter(Boolean)

        const productMap = {}
        if (reviewIds.length > 0) {
            const refs = reviewIds.map((pid) => dbAdmin.collection('products').doc(pid))
            const chunkSize = 100
            for (let i = 0; i < refs.length; i += chunkSize) {
                const docs = await dbAdmin.getAll(...refs.slice(i, i + chunkSize))
                docs.forEach((doc) => {
                    if (doc.exists) productMap[doc.id] = doc.data()
                })
            }
        }

        const createdProductViewCounts = {}
        if (productIds.length > 0) {
            const countRefs = productIds.map((pid) => dbAdmin.collection('analytics_product_view_counts').doc(pid))
            const chunkSize = 100
            for (let i = 0; i < countRefs.length; i += chunkSize) {
                const docs = await dbAdmin.getAll(...countRefs.slice(i, i + chunkSize))
                docs.forEach((doc) => {
                    if (doc.exists) {
                        const data = doc.data() || {}
                        createdProductViewCounts[doc.id] = Number(data.uniqueDeviceViews || 0)
                    }
                })
            }
        }

        const createdProductInteractions = []
        if (productIds.length > 0) {
            const clickTypes = new Set(['product_click', 'amazon_click'])
            const chunkSize = 10
            for (let i = 0; i < productIds.length; i += chunkSize) {
                const batchIds = productIds.slice(i, i + chunkSize)
                const interactionsSnap = await dbAdmin.collection('analytics_product_interactions').where('productId', 'in', batchIds).limit(1000).get().catch(() => null)
                if (!interactionsSnap) continue
                interactionsSnap.forEach((doc) => {
                    const data = doc.data() || {}
                    if (clickTypes.has(data.eventType)) {
                        createdProductInteractions.push({ id: doc.id, ...data, createdAt: toIso(data.createdAt) })
                    }
                })
            }
        }

        const totalImpressions = Object.values(createdProductViewCounts).reduce((sum, count) => sum + count, 0)
        const totalClicks = createdProductInteractions.length

        const productStats = {
            productsAdded: products.length,
            activeProducts: products.filter((item) => item.isActive).length,
            totalViews: totalImpressions,
        }

        const approvedReviews = reviews.filter((item) => item.isApproved).length
        const avgRating = reviews.length > 0 ? (reviews.reduce((sum, item) => sum + (Number(item.rating) || 0), 0) / reviews.length) : 0

        const regionCounts = new Map()
        const cityCounts = new Map()
        const browserCounts = new Map()
        const osCounts = new Map()
        const pageCounts = new Map()
        let latestVisit = null

        analytics.forEach((item) => {
            const region = String(item.region || item.country || 'Unknown').trim() || 'Unknown'
            const city = String(item.city || 'Unknown').trim() || 'Unknown'
            const browser = String(item.browser || 'Unknown').trim() || 'Unknown'
            const os = String(item.os || 'Unknown').trim() || 'Unknown'
            regionCounts.set(region, (regionCounts.get(region) || 0) + 1)
            cityCounts.set(city, (cityCounts.get(city) || 0) + 1)
            browserCounts.set(browser, (browserCounts.get(browser) || 0) + 1)
            osCounts.set(os, (osCounts.get(os) || 0) + 1)
            if (!latestVisit || (item.createdAt && new Date(item.createdAt) > new Date(latestVisit.createdAt || 0))) {
                latestVisit = item
            }
        })

        pageVisits.forEach((item) => {
            const path = String(item.pagePath || '/').trim() || '/'
            pageCounts.set(path, (pageCounts.get(path) || 0) + 1)
        })

        const allEvents = [...analytics, ...pageVisits].filter((item) => item.createdAt)
        const now = Date.now()
        const thirtyDaysMs = 1000 * 60 * 60 * 24 * 30
        const eventsLast30Days = allEvents.filter((item) => {
            const d = toDateSafe(item.createdAt)
            return d ? (now - d.getTime()) <= thirtyDaysMs : false
        }).length

        const dayCounts = new Map()
        allEvents.forEach((item) => {
            const dayKey = String(item.createdAt).slice(0, 10)
            dayCounts.set(dayKey, (dayCounts.get(dayKey) || 0) + 1)
        })

        const activeDays = dayCounts.size || 1
        const visitsPerActiveDay = Number((allEvents.length / activeDays).toFixed(2))

        const likedProducts = []
        const brandCounts = new Map()
        const categoryCounts = new Map()
        wishlists.forEach((item) => {
            const product = productMap[item.productId]
            if (!product) return
            likedProducts.push({
                id: item.productId,
                title: product.title || product.name || 'Unknown product',
                imageUrls: product.imageUrls || product.image_urls || [],
                price: product.price ?? null,
                brand: product.brand || null,
                category: product.category || null,
            })
            const brand = String(product.brand || 'Unknown').trim() || 'Unknown'
            const category = String(product.category || 'Unknown').trim() || 'Unknown'
            brandCounts.set(brand, (brandCounts.get(brand) || 0) + 1)
            categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1)
        })

        const recentActivities = [
            ...products.map((item) => ({ type: 'product', title: item.title, date: item.createdAt, data: item })),
            ...reviews.map((item) => ({ type: 'review', title: 'Review submitted', date: item.createdAt, data: item })),
            ...pageVisits.map((item) => ({ type: 'page', title: item.pagePath || 'Page visit', date: item.createdAt, data: item })),
            ...analytics.map((item) => ({ type: 'visit', title: 'Product visit', date: item.createdAt, data: item })),
        ]
            .filter((item) => item.date)
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 50)

        const moduleCards = Object.entries(dashboardAccess)
            .filter(([, enabled]) => enabled)
            .map(([key]) => key)

        return NextResponse.json({
            user: {
                id: ctx.uid,
                name: userData.name || ctx.user?.name || 'User',
                email: userData.email || ctx.user?.email || '',
                image: userData.image || '',
                role,
                dashboardAccess,
                employeeAccess: Boolean(userData.employeeAccess) || role === 'EMPLOYEE',
                createdAt: userData.createdAt ? timestampToJSON(userData.createdAt) : null,
                lastSeenAt: userData.lastSeenAt ? timestampToJSON(userData.lastSeenAt) : null,
            },
            modules: moduleCards,
            stats: {
                ...productStats,
                reviewsSubmitted: reviews.length,
                reviewsApproved: approvedReviews,
                avgRating: Number(avgRating.toFixed(1)),
                totalClicks,
                totalImpressions,
                uniquePagesVisited: pageVisits.length,
                productInteractionCount: analytics.length,
                allInteractionCount: allEvents.length,
                eventsLast30Days,
                activeDays,
                visitsPerActiveDay,
            },
            analytics: {
                latestVisit,
                topRegions: toList(regionCounts),
                topCities: toList(cityCounts),
                topBrowsers: toList(browserCounts),
                topOs: toList(osCounts),
                topPages: toList(pageCounts),
                topClickedProducts: toList(new Map(createdProductInteractions.reduce((map, item) => {
                    const key = String(item.productId || 'Unknown').trim() || 'Unknown'
                    map.set(key, (map.get(key) || 0) + 1)
                    return map
                }, new Map()))),
            },
            favorites: {
                likedProducts: likedProducts.slice(0, 12),
                favoriteBrands: toList(brandCounts).slice(0, 6),
                favoriteCategories: toList(categoryCounts).slice(0, 6),
            },
            recentActivities,
        })
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

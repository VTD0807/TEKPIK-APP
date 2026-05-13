import { NextResponse } from 'next/server'
import { getProductionDb, dbUsers, timestampToJSON } from '@/lib/firebase-admin'
import { rankProductsWithHybridModel, normalizeSearchText, tokenizeSearch } from '@/lib/search-intelligence'

export const dynamic = 'force-dynamic'

// ── IN-MEMORY CACHE ──────────────────────────────────────────────────────────
let CACHED_CATALOG = null
let CACHED_TIME = 0
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes cache

const getRatingOf = (product = {}) => {
    const summary = Number(product.reviewSummary?.averageRating)
    if (Number.isFinite(summary)) return summary
    const direct = Number(product.rating)
    if (Number.isFinite(direct)) return direct
    return Number(product.amazonRating) || 0
}

const getDiscountOf = (product = {}) => {
    const provided = Number(product.discount)
    if (Number.isFinite(provided) && provided > 0) return provided
    const price = Number(product.price)
    const original = Number(product.originalPrice || product.original_price)
    if (!price || !original || original <= price) return 0
    return Math.round(((original - price) / original) * 100)
}

const sortProducts = (products = [], sort = 'newest') => {
    if (!Array.isArray(products)) return []
    const rows = [...products]

    if (sort === 'price_asc' || sort === 'price_low') {
        rows.sort((a, b) => Number(a.price || 0) - Number(b.price || 0))
        return rows
    }
    if (sort === 'price_desc' || sort === 'price_high') {
        rows.sort((a, b) => Number(b.price || 0) - Number(a.price || 0))
        return rows
    }
    if (sort === 'rating') {
        rows.sort((a, b) => getRatingOf(b) - getRatingOf(a))
        return rows
    }
    if (sort === 'discount') {
        rows.sort((a, b) => getDiscountOf(b) - getDiscountOf(a))
        return rows
    }

    rows.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    return rows
}

export async function GET(req) {
    const prodDb = await getProductionDb()
    if (!prodDb) return NextResponse.json({ error: 'Production DB not initialized' }, { status: 500 })

    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')
    const search = normalizeSearchText(searchParams.get('search') || '')
    const featured = searchParams.get('featured')
    const sort = searchParams.get('sort') || 'newest'
    const page = parseInt(searchParams.get('page') || '1')
    const requestedLimit = parseInt(searchParams.get('limit') || '12')
    const limit = Math.max(1, Math.min(Number.isFinite(requestedLimit) ? requestedLimit : 12, 160))
    const searchTokens = search ? tokenizeSearch(search) : []
    const accountId = String(searchParams.get('accountId') || '').trim()
    const deviceId = String(searchParams.get('deviceId') || '').trim()
    const identityId = accountId || deviceId

    try {
        let products = []

        // ── CACHE OR FETCH ───────────────────────────────────────────────────
        if (CACHED_CATALOG && (Date.now() - CACHED_TIME < CACHE_TTL_MS)) {
            products = CACHED_CATALOG
        } else {
            let query = prodDb.collection('products').where('isActive', '==', true)
            // Note: We no longer filter 'isFeatured' at the DB level so we can cache the whole catalog
            query = query.orderBy('createdAt', 'desc')

            const snapshot = await query.get()
            
            const categoriesSnap = await prodDb.collection('categories').get()
            const categoriesMap = {}
            categoriesSnap.forEach(doc => { categoriesMap[doc.id] = doc.data() })

            snapshot.forEach(doc => {
                const data = doc.data()
                const categoryData = categoriesMap[data.categoryId]
                products.push({
                    id: doc.id,
                    ...data,
                    createdAt: timestampToJSON(data.createdAt),
                    updatedAt: timestampToJSON(data.updatedAt),
                    categories: categoryData || null,
                })
            })

            CACHED_CATALOG = products
            CACHED_TIME = Date.now()
        }

        // ── FILTERING (In-Memory) ────────────────────────────────────────────
        let filteredProducts = products

        if (featured === 'true') {
            filteredProducts = filteredProducts.filter(p => p.isFeatured === true)
        }

        if (category) {
            filteredProducts = filteredProducts.filter(p => p.categories?.slug === category)
        }

        if (search) {
            filteredProducts = filteredProducts.filter(data => {
                const searchStr = normalizeSearchText([
                    data.title,
                    data.name,
                    data.description,
                    data.brand,
                    data.categories?.name,
                    data.categories?.slug,
                    ...(Array.isArray(data.tags) ? data.tags : []),
                    data.metaKeywords,
                ].filter(Boolean).join(' '))

                return searchStr.includes(search) || 
                       (searchTokens.length > 0 && searchTokens.every(token => searchStr.includes(token)))
            })
        }

        let modelType = 'rule-sort-v1'
        let parsedIntent = null

        if ((search && search.length >= 2) || sort === 'relevance') {
            let userVector = null
            if (identityId && dbUsers) {
                // Identity vector read is 1 read per user request, acceptable.
                const vectorSnap = await dbUsers.collection('analytics_user_interest_vectors').doc(identityId).get()
                if (vectorSnap.exists) userVector = vectorSnap.data() || null
            }

            const ranked = rankProductsWithHybridModel(filteredProducts, {
                query: search,
                userVector,
                limit: filteredProducts.length || 1,
                preferReliability: true,
                minScore: search ? 0.1 : 0,
            })

            parsedIntent = ranked.intent
            modelType = search ? 'hybrid-search-ml-v1' : 'adaptive-ranking-v1'
            filteredProducts = ranked.items.map((item) => ({
                ...item.product,
                _searchScore: item.score,
                _searchReliability: item.reliabilityScore,
            }))
        } else {
            filteredProducts = sortProducts(filteredProducts, sort)
        }

        const total = filteredProducts.length
        const start = (page - 1) * limit
        const paginatedProducts = filteredProducts.slice(start, start + limit)

        return NextResponse.json({
            products: paginatedProducts,
            total,
            page,
            pages: Math.ceil((total || 0) / limit),
            model: {
                type: modelType,
                intent: parsedIntent,
            },
        })
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

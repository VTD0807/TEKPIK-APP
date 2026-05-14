/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║ Tekpik — Centralized Database Query Layer                              ║
 * ║                                                                        ║
 * ║  All Firestore reads are funneled through this module to ensure:       ║
 * ║   1. Consistent caching (no duplicate fetches across routes)           ║
 * ║   2. Batched reads (getAll instead of N individual doc reads)          ║
 * ║   3. Write-through invalidation (writes bust the right caches)        ║
 * ║   4. Reduced Firestore billing (fewer reads = less cost)              ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import {
    getCachedSWR,
    setCached,
    invalidateCache,
    invalidateCachePrefix,
} from '@/lib/server-cache'
import {
    getProductionDb,
    dbAdmin,
    dbUsers,
    timestampToJSON,
    sanitizeFirestoreData,
} from '@/lib/firebase-admin'

// ── TTL Constants ────────────────────────────────────────────────────────────
const TTL = {
    CATALOG:           10 * 60 * 1000,     // 10 min — product catalog
    CATALOG_STALE:     8 * 60 * 1000,      // 8 min extra stale window
    CATEGORIES:        30 * 60 * 1000,     // 30 min — categories rarely change
    CATEGORIES_STALE:  15 * 60 * 1000,
    AI_ANALYSIS:       30 * 60 * 1000,     // 30 min — AI analysis is expensive
    AI_ANALYSIS_STALE: 15 * 60 * 1000,
    PRODUCT_DETAIL:    5 * 60 * 1000,      // 5 min — individual product
    PRODUCT_STALE:     3 * 60 * 1000,
    REVIEWS:           10 * 60 * 1000,     // 10 min — reviews
    REVIEWS_STALE:     5 * 60 * 1000,
    TRENDING:          10 * 60 * 1000,     // 10 min — trending scores
    TRENDING_STALE:    5 * 60 * 1000,
    FEATURE_VECTORS:   30 * 60 * 1000,     // 30 min — product feature vectors
    FEATURE_STALE:     15 * 60 * 1000,
    AGGREGATES:        10 * 60 * 1000,     // 10 min — review/wishlist counts
    AGGREGATES_STALE:  5 * 60 * 1000,
}

// ── Cache Keys ───────────────────────────────────────────────────────────────
const CK = {
    catalog: () => 'db:catalog:v3',
    categories: () => 'db:categories:v2',
    categoriesMap: () => 'db:categories-map:v2',
    aiAnalysisMap: () => 'db:ai-analysis-map:v1',
    productDetail: (id) => `db:product:${id}`,
    productReviews: (id) => `db:reviews:${id}`,
    trendingData: () => 'db:trending-data:v2',
    featureVectors: () => 'db:feature-vectors:v1',
    reviewCounts: () => 'db:review-counts:v1',
    wishlistCounts: () => 'db:wishlist-counts:v1',
}

// ── Catalog (all active products) ────────────────────────────────────────────

/**
 * Fetches the full active product catalog with category data joined.
 * Shared by: /api/products, /api/trending-products, /api/recommendations/feed
 *
 * Returns: { products: Array, categoriesMap: Object }
 */
export async function getCatalog() {
    const prodDb = await getProductionDb()
    if (!prodDb) return { products: [], categoriesMap: {} }

    return getCachedSWR(CK.catalog(), TTL.CATALOG, TTL.CATALOG_STALE, async () => {
        const [productsSnap, categoriesMap] = await Promise.all([
            prodDb.collection('products')
                .orderBy('createdAt', 'desc')
                .limit(500)
                .get(),
            getCategoriesMap(),
        ])

        const products = []
        productsSnap.forEach(doc => {
            const data = doc.data()
            // In-memory filter to avoid composite index requirements on failover DBs
            if (data.isActive === false) return 

            const categoryData = categoriesMap[data.categoryId]
            products.push(sanitizeFirestoreData({
                id: doc.id,
                ...data,
                createdAt: timestampToJSON(data.createdAt),
                updatedAt: timestampToJSON(data.updatedAt),
                categories: categoryData || null,
            }))
        })

        return { products, categoriesMap }
    })
}

/**
 * Fetches the FULL product list (including inactive) for admin.
 * Not cached as heavily — admin usage is low-frequency.
 */
export async function getAdminCatalog() {
    if (!dbAdmin) return { products: [], categoriesMap: {}, aiMap: {} }

    return getCachedSWR('db:admin-catalog:v1', 2 * 60 * 1000, 60 * 1000, async () => {
        const [productsSnap, categoriesMap, aiMap] = await Promise.all([
            dbAdmin.collection('products').orderBy('createdAt', 'desc').get(),
            getCategoriesMap(),
            getAiAnalysisMap(),
        ])

        const products = []
        productsSnap.forEach(doc => {
            const data = doc.data()
            const cat = categoriesMap[data.categoryId]
            const ai = aiMap[doc.id]
            products.push({
                id: doc.id,
                ...data,
                createdAt: timestampToJSON(data.createdAt),
                updatedAt: timestampToJSON(data.updatedAt),
                categories: cat ? { name: cat.name, slug: cat.slug } : null,
                ai_analysis: ai ? { score: ai.score, generatedAt: timestampToJSON(ai.generatedAt) } : null,
            })
        })

        return { products, categoriesMap, aiMap }
    })
}

// ── Categories ───────────────────────────────────────────────────────────────

/**
 * Returns a map of categoryId -> category data.
 * Heavily cached (10min + 5min stale) since categories rarely change.
 */
export async function getCategoriesMap() {
    const prodDb = await getProductionDb()
    const db = prodDb || dbAdmin
    if (!db) return {}

    return getCachedSWR(CK.categoriesMap(), TTL.CATEGORIES, TTL.CATEGORIES_STALE, async () => {
        const snap = await db.collection('categories').get()
        const map = {}
        snap.forEach(doc => {
            map[doc.id] = sanitizeFirestoreData(doc.data())
        })
        return map
    })
}

// ── AI Analysis ──────────────────────────────────────────────────────────────

/**
 * Returns a map of productId -> AI analysis data.
 * Cached 15 min since AI analysis runs are infrequent.
 */
export async function getAiAnalysisMap() {
    if (!dbAdmin) return {}

    return getCachedSWR(CK.aiAnalysisMap(), TTL.AI_ANALYSIS, TTL.AI_ANALYSIS_STALE, async () => {
        const snap = await dbAdmin.collection('ai_analysis').get()
        const map = {}
        snap.forEach(doc => {
            const data = doc.data()
            map[data.productId] = data
        })
        return map
    })
}

// ── Single Product Detail ────────────────────────────────────────────────────

/**
 * Fetches a single product with all joins (category, AI analysis, reviews).
 * Uses the catalog cache when available to avoid an extra read.
 */
export async function getProductDetail(productId) {
    const prodDb = await getProductionDb()
    if (!prodDb) return null

    return getCachedSWR(CK.productDetail(productId), TTL.PRODUCT_DETAIL, TTL.PRODUCT_STALE, async () => {
        const productSnap = await prodDb.collection('products').doc(productId).get()
        if (!productSnap.exists) {
            // Try slug lookup
            const slugSnap = await prodDb.collection('products')
                .where('slug', '==', productId)
                .limit(1)
                .get()
            if (slugSnap.empty) return null
            return _hydrateProduct(slugSnap.docs[0], prodDb)
        }
        return _hydrateProduct(productSnap, prodDb)
    })
}

/** Hydrate a product doc with category, AI analysis, and reviews in parallel. */
async function _hydrateProduct(doc, prodDb) {
    const product = { id: doc.id, ...doc.data() }
    product.createdAt = timestampToJSON(product.createdAt)
    product.updatedAt = timestampToJSON(product.updatedAt)

    // Fetch category, AI analysis, and reviews in parallel
    const [categoriesMap, aiResult, reviewsSnap] = await Promise.all([
        getCategoriesMap(),
        prodDb.collection('ai_analysis')
            .where('productId', '==', product.id)
            .limit(1)
            .get(),
        prodDb.collection('reviews')
            .where('productId', '==', product.id)
            .where('isApproved', '==', true)
            .get(),
    ])

    if (product.categoryId && categoriesMap[product.categoryId]) {
        product.categories = categoriesMap[product.categoryId]
    }

    if (!aiResult.empty) {
        const aiDoc = aiResult.docs[0]
        product.ai_analysis = {
            id: aiDoc.id,
            ...aiDoc.data(),
            generatedAt: timestampToJSON(aiDoc.data().generatedAt),
        }
    } else {
        product.ai_analysis = null
    }

    product.reviews = reviewsSnap.docs.map(r => ({
        id: r.id,
        ...r.data(),
        createdAt: timestampToJSON(r.data().createdAt),
    }))

    return product
}

// ── Reviews ──────────────────────────────────────────────────────────────────

/**
 * Get approved reviews for a product.
 */
export async function getProductReviews(productId) {
    const prodDb = await getProductionDb()
    if (!prodDb || !productId) return []

    return getCachedSWR(CK.productReviews(productId), TTL.REVIEWS, TTL.REVIEWS_STALE, async () => {
        const snapshot = await prodDb.collection('reviews')
            .where('productId', '==', productId)
            .where('isApproved', '==', true)
            .orderBy('createdAt', 'desc')
            .get()

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: timestampToJSON(doc.data().createdAt),
        }))
    })
}

// ── Trending Aggregates ──────────────────────────────────────────────────────

/**
 * Get review and wishlist counts per product.
 * Shared by: /api/trending-products (was fetching 1500+1500 docs every time)
 */
export async function getReviewCounts() {
    const prodDb = await getProductionDb()
    if (!prodDb) return new Map()

    return getCachedSWR(CK.reviewCounts(), TTL.AGGREGATES, TTL.AGGREGATES_STALE, async () => {
        const snap = await prodDb.collection('reviews').limit(500).get()
        const counts = new Map()
        snap.forEach(doc => {
            const data = doc.data() || {}
            const productId = String(data.productId || data.product_id || '').trim()
            if (productId) counts.set(productId, (counts.get(productId) || 0) + 1)
        })
        return counts
    })
}

export async function getWishlistCounts() {
    const prodDb = await getProductionDb()
    if (!prodDb) return new Map()

    return getCachedSWR(CK.wishlistCounts(), TTL.AGGREGATES, TTL.AGGREGATES_STALE, async () => {
        const snap = await prodDb.collection('wishlists').limit(500).get()
        const counts = new Map()
        snap.forEach(doc => {
            const data = doc.data() || {}
            const productId = String(data.productId || data.product_id || '').trim()
            if (productId) counts.set(productId, (counts.get(productId) || 0) + 1)
        })
        return counts
    })
}

// ── Feature Vectors ──────────────────────────────────────────────────────────

/**
 * Get all product feature vectors (for recommendations).
 * @param {string[]} productIds
 */
export async function getProductFeatureVectors(productIds = []) {
    const prodDb = await getProductionDb()
    if (!prodDb || !productIds.length) return {}

    return getCachedSWR(CK.featureVectors(), TTL.FEATURE_VECTORS, TTL.FEATURE_STALE, async () => {
        const refs = productIds.map(id => prodDb.collection('analytics_product_feature_vectors').doc(id))
        const featureMap = {}

        // Batch in chunks of 100 (Firestore getAll limit)
        for (let i = 0; i < refs.length; i += 100) {
            const chunk = refs.slice(i, i + 100)
            if (!chunk.length) continue
            const docs = await prodDb.getAll(...chunk)
            docs.forEach(doc => {
                if (!doc.exists) return
                const data = doc.data() || {}
                if (Array.isArray(data.features)) featureMap[doc.id] = data.features
            })
        }

        return featureMap
    })
}

// ── Batch Product Reads ──────────────────────────────────────────────────────

/**
 * Fetch multiple products by ID using batched getAll (1 RPC vs N reads).
 * Returns a Map<productId, productData>.
 */
export async function getProductsByIds(productIds = []) {
    const prodDb = await getProductionDb()
    if (!prodDb || !productIds.length) return {}

    const uniqueIds = Array.from(new Set(productIds)).filter(Boolean)
    if (!uniqueIds.length) return {}

    const productsMap = {}
    const refs = uniqueIds.map(pid => prodDb.collection('products').doc(pid))

    // Batch in chunks of 100
    for (let i = 0; i < refs.length; i += 100) {
        const chunk = refs.slice(i, i + 100)
        const docs = await prodDb.getAll(...chunk)
        docs.forEach(doc => {
            if (doc.exists) productsMap[doc.id] = doc.data()
        })
    }

    return productsMap
}

// ── Cache Invalidation (Write-Through) ───────────────────────────────────────

/**
 * Call after creating/updating/deleting a product.
 */
export function invalidateProductCaches(productId) {
    invalidateCachePrefix('db:catalog')
    invalidateCachePrefix('db:admin-catalog')
    invalidateCachePrefix('db:trending')
    invalidateCachePrefix('db:feature-vectors')
    if (productId) {
        invalidateCache(CK.productDetail(productId))
    }
}

/**
 * Call after creating/updating/deleting a review.
 */
export function invalidateReviewCaches(productId) {
    invalidateCache(CK.reviewCounts())
    if (productId) {
        invalidateCache(CK.productReviews(productId))
        invalidateCache(CK.productDetail(productId))
    }
}

/**
 * Call after modifying categories.
 */
export function invalidateCategoryCaches() {
    invalidateCache(CK.categoriesMap())
    invalidateCachePrefix('db:catalog')
    invalidateCachePrefix('db:admin-catalog')
}

/**
 * Call after wishlist changes.
 */
export function invalidateWishlistCaches() {
    invalidateCache(CK.wishlistCounts())
}

/**
 * Call after AI analysis updates.
 */
export function invalidateAiCaches() {
    invalidateCache(CK.aiAnalysisMap())
    invalidateCachePrefix('db:admin-catalog')
}

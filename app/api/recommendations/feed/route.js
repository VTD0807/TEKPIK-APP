import { NextResponse } from 'next/server'
import { dbAdmin, authAdmin, sanitizeFirestoreData } from '@/lib/firebase-admin'
import { getCached } from '@/lib/server-cache'
import { buildProductFeatureVector } from '@/lib/recommendation-features'

export const dynamic = 'force-dynamic'

const LIMIT_PRODUCTS = 120
const LIMIT_FEED = 8
const VECTOR_TTL_MS = 1000 * 60 * 30
const MAX_VECTOR_FEATURES = 220
const MAX_VECTOR_CATEGORY = 40
const MAX_VECTOR_BRANDS = 60

const getProductIdFromPath = (path) => {
    const match = /^\/products\/([^/?#]+)/.exec(String(path || ''))
    return match?.[1] ? decodeURIComponent(match[1]) : null
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const getInteractionWeight = ({ type, rating }) => {
    if (type === 'wishlist') return 4
    if (type === 'view') return 1.5
    if (type === 'page-view') return 1.25
    if (type === 'review') {
        const r = Number(rating)
        if (Number.isFinite(r) && r >= 4) return 3.5
        if (Number.isFinite(r) && r <= 2) return -1.5
        return 1.5
    }
    return 1
}

const toList = (map) => Array.from(map.entries())
    .map(([name, score]) => ({ name, score: Number(score.toFixed(2)) }))
    .sort((a, b) => b.score - a.score)

const mapToObject = (map) => {
    const out = {}
    map.forEach((value, key) => {
        out[key] = Number(value)
    })
    return out
}

const trimMapTopN = (map, limit) => new Map(
    Array.from(map.entries())
        .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
        .slice(0, limit)
)

const objectToMap = (obj) => {
    const map = new Map()
    Object.entries(obj || {}).forEach(([key, value]) => {
        const num = Number(value)
        if (Number.isFinite(num)) map.set(key, num)
    })
    return map
}

const getVectorRef = (accountId) => dbAdmin.collection('analytics_user_interest_vectors').doc(accountId)

const getVectorState = async (accountId) => {
    const snap = await getVectorRef(accountId).get()
    if (!snap.exists) return { exists: false, isFresh: false, data: null, vector: null }

    const data = snap.data() || {}
    const updatedAt = data.updatedAt?.toDate ? data.updatedAt.toDate().getTime() : 0
    const isFresh = !!updatedAt && (Date.now() - updatedAt) <= VECTOR_TTL_MS

    const vector = {
        preferenceMap: objectToMap(data.preferenceMap),
        categoryWeight: objectToMap(data.categoryWeight),
        brandWeight: objectToMap(data.brandWeight),
        interactedProductIds: new Set(Array.isArray(data.interactedProductIds) ? data.interactedProductIds : []),
    }

    return { exists: true, isFresh, data, vector }
}

const saveVector = async (accountId, vector, interactionCount) => {
    const compactPreferenceMap = trimMapTopN(vector.preferenceMap, MAX_VECTOR_FEATURES)
    const compactCategoryWeight = trimMapTopN(vector.categoryWeight, MAX_VECTOR_CATEGORY)
    const compactBrandWeight = trimMapTopN(vector.brandWeight, MAX_VECTOR_BRANDS)

    await getVectorRef(accountId).set({
        preferenceMap: mapToObject(compactPreferenceMap),
        categoryWeight: mapToObject(compactCategoryWeight),
        brandWeight: mapToObject(compactBrandWeight),
        interactedProductIds: Array.from(vector.interactedProductIds).slice(0, 500),
        interactionCount: Number(interactionCount) || 0,
        updatedAt: new Date(),
    }, { merge: true })
}

const buildVectorFromInteractions = (interactions, productMap) => {
    const preferenceMap = new Map()
    const categoryWeight = new Map()
    const brandWeight = new Map()
    const interactedProductIds = new Set()

    interactions.forEach((interaction) => {
        if (!interaction.productId) return
        const product = productMap.get(interaction.productId)
        if (!product) return

        const w = getInteractionWeight(interaction)
        interactedProductIds.add(product.id)

        const categoryId = product.categoryId || product.category_id || null
        const brand = String(product.brand || '').trim().toLowerCase() || null
        if (categoryId) categoryWeight.set(categoryId, (categoryWeight.get(categoryId) || 0) + w)
        if (brand) brandWeight.set(brand, (brandWeight.get(brand) || 0) + w)

        const features = getProductFeatures(product)
        features.forEach((feature) => {
            preferenceMap.set(feature, (preferenceMap.get(feature) || 0) + w)
        })
    })

    return { preferenceMap, categoryWeight, brandWeight, interactedProductIds }
}

const buildFallbackFeed = (products, categoriesMap) => {
    const rows = products.slice(0, LIMIT_FEED).map((product) => ({
        ...product,
        categories: categoriesMap[product.categoryId]
            ? { name: categoriesMap[product.categoryId].name, slug: categoriesMap[product.categoryId].slug }
            : null,
    }))

    return {
        source: 'fallback',
        interestCategories: [],
        products: rows,
    }
}

async function resolveAccountId(req) {
    const url = new URL(req.url)
    const accountParam = String(url.searchParams.get('accountId') || '').trim()

    const authHeader = req.headers.get('Authorization') || ''
    if (authHeader.startsWith('Bearer ') && authAdmin) {
        try {
            const token = authHeader.slice('Bearer '.length)
            const decoded = await authAdmin.verifyIdToken(token)
            return decoded.uid
        } catch (_) {
            return accountParam || ''
        }
    }

    return accountParam || ''
}

export async function GET(req) {
    if (!dbAdmin) return NextResponse.json({ source: 'fallback', products: [], interestCategories: [] })

    try {
        const accountId = await resolveAccountId(req)

        const catalog = await getCached('recommendations:catalog:v2', 1000 * 60 * 5, async () => {
            const [productsSnap, categoriesSnap] = await Promise.all([
                dbAdmin.collection('products')
                    .where('isActive', '==', true)
                    .orderBy('createdAt', 'desc')
                    .limit(LIMIT_PRODUCTS)
                    .get(),
                dbAdmin.collection('categories').get(),
            ])

            const categoriesMap = {}
            categoriesSnap.forEach((doc) => {
                categoriesMap[doc.id] = sanitizeFirestoreData(doc.data())
            })

            const products = []
            productsSnap.forEach((doc) => {
                products.push(sanitizeFirestoreData({ id: doc.id, ...doc.data() }))
            })

            const featureRefs = products.map((p) => dbAdmin.collection('analytics_product_feature_vectors').doc(p.id))
            const featureMap = {}
            for (let i = 0; i < featureRefs.length; i += 100) {
                const chunk = featureRefs.slice(i, i + 100)
                if (!chunk.length) continue
                const docs = await dbAdmin.getAll(...chunk)
                docs.forEach((doc) => {
                    if (!doc.exists) return
                    const data = doc.data() || {}
                    if (Array.isArray(data.features)) featureMap[doc.id] = data.features
                })
            }

            const hydratedProducts = products.map((p) => ({
                ...p,
                _featureVector: Array.isArray(featureMap[p.id])
                    ? featureMap[p.id]
                    : buildProductFeatureVector(p),
            }))

            return { products: hydratedProducts, categoriesMap }
        })

        const products = catalog.products || []
        const categoriesMap = catalog.categoriesMap || {}
        const productMap = new Map(products.map((p) => [p.id, p]))

        if (!accountId) {
            return NextResponse.json(buildFallbackFeed(products, categoriesMap))
        }

        const vectorState = await getVectorState(accountId)
        let vector = vectorState.vector

        if (!vectorState.isFresh || !vector) {
            const [wishSnap, reviewSnap, viewSnap, pageSnap] = await Promise.all([
                dbAdmin.collection('wishlists').where('userId', '==', accountId).limit(120).get(),
                dbAdmin.collection('reviews').where('userId', '==', accountId).limit(120).get(),
                dbAdmin.collection('analytics_product_unique_visitors').where('accountId', '==', accountId).limit(220).get(),
                dbAdmin.collection('analytics_page_unique_visitors').where('identityId', '==', accountId).limit(300).get(),
            ])

            const interactions = []
            wishSnap.forEach((doc) => {
                const d = doc.data() || {}
                interactions.push({ type: 'wishlist', productId: d.productId || d.product_id || null })
            })
            reviewSnap.forEach((doc) => {
                const d = doc.data() || {}
                interactions.push({ type: 'review', productId: d.productId || d.product_id || null, rating: d.rating })
            })
            viewSnap.forEach((doc) => {
                const d = doc.data() || {}
                interactions.push({ type: 'view', productId: d.productId || null })
            })
            pageSnap.forEach((doc) => {
                const d = doc.data() || {}
                const productId = getProductIdFromPath(d.pagePath)
                if (productId) interactions.push({ type: 'page-view', productId })
            })

            if (!interactions.length) {
                return NextResponse.json(buildFallbackFeed(products, categoriesMap))
            }

            vector = buildVectorFromInteractions(interactions, productMap)
            const interactionCount = interactions.length
            const previousCount = Number(vectorState?.data?.interactionCount || 0)
            if (!vectorState.exists || previousCount !== interactionCount) {
                await saveVector(accountId, vector, interactionCount)
            }
        }

        const { preferenceMap, categoryWeight, brandWeight, interactedProductIds } = vector

        const ranked = []
        products.forEach((product) => {
            if (interactedProductIds.has(product.id)) return

            const features = Array.isArray(product._featureVector)
                ? product._featureVector
                : buildProductFeatureVector(product)
            let score = 0
            features.forEach((feature) => {
                score += preferenceMap.get(feature) || 0
            })

            const categoryId = product.categoryId || product.category_id || null
            const brand = String(product.brand || '').trim().toLowerCase() || null
            if (categoryId) score += (categoryWeight.get(categoryId) || 0) * 0.8
            if (brand) score += (brandWeight.get(brand) || 0) * 0.5

            const aiScore = Number(product.ai_analysis?.score || product.aiScore || 0)
            const qualityBonus = Number.isFinite(aiScore) ? clamp(aiScore, 0, 10) * 0.35 : 0
            score += qualityBonus

            if (score <= 0) return

            ranked.push({
                ...product,
                _interestScore: Number(score.toFixed(2)),
                categories: categoriesMap[categoryId]
                    ? { name: categoriesMap[categoryId].name, slug: categoriesMap[categoryId].slug }
                    : null,
            })
        })

        if (!ranked.length) {
            return NextResponse.json(buildFallbackFeed(products, categoriesMap))
        }

        ranked.sort((a, b) => b._interestScore - a._interestScore)

        const categoryInterests = new Map()
        categoryWeight.forEach((score, categoryId) => {
            const name = categoriesMap[categoryId]?.name || 'Unknown'
            categoryInterests.set(name, (categoryInterests.get(name) || 0) + score)
        })

        const brandInterests = new Map()
        brandWeight.forEach((score, brand) => {
            const pretty = brand.charAt(0).toUpperCase() + brand.slice(1)
            brandInterests.set(pretty, (brandInterests.get(pretty) || 0) + score)
        })

        const interestCategories = [
            ...toList(categoryInterests).slice(0, 4),
            ...toList(brandInterests).slice(0, 2),
        ].map((item) => ({ name: item.name, score: item.score }))

        return NextResponse.json({
            source: 'personalized',
            interestCategories,
            products: ranked.slice(0, LIMIT_FEED),
        })
    } catch (error) {
        console.error('[recommendations-feed]', error)
        return NextResponse.json({ source: 'fallback', products: [], interestCategories: [] })
    }
}

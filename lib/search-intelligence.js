import { buildProductFeatureVector } from '@/lib/recommendation-features'

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const toNumber = (value, fallback = 0) => {
    const num = Number(value)
    return Number.isFinite(num) ? num : fallback
}

export const normalizeSearchText = (value = '') => String(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

export const tokenizeSearch = (value = '') => normalizeSearchText(value)
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length > 1)

const getAverageRating = (product = {}) => {
    const summaryRating = toNumber(product.reviewSummary?.averageRating, NaN)
    if (Number.isFinite(summaryRating) && summaryRating > 0) return summaryRating

    const directRating = toNumber(product.rating, NaN)
    if (Number.isFinite(directRating) && directRating > 0) return directRating

    return toNumber(product.amazonRating, 0)
}

const getReviewCount = (product = {}) => {
    const summaryCount = toNumber(product.reviewSummary?.count, NaN)
    if (Number.isFinite(summaryCount) && summaryCount >= 0) return summaryCount
    if (Array.isArray(product.reviews)) return product.reviews.length
    return toNumber(product.reviewCount, 0)
}

const getDiscountPercent = (product = {}) => {
    const provided = toNumber(product.discount, NaN)
    if (Number.isFinite(provided) && provided > 0) return clamp(provided, 0, 95)

    const price = toNumber(product.price, 0)
    const original = toNumber(product.originalPrice || product.original_price, 0)
    if (!price || !original || original <= price) return 0
    return clamp(((original - price) / original) * 100, 0, 95)
}

const daysSince = (dateValue) => {
    if (!dateValue) return 365
    const dt = new Date(dateValue)
    const ts = dt.getTime()
    if (!Number.isFinite(ts)) return 365
    const diff = Date.now() - ts
    if (!Number.isFinite(diff) || diff < 0) return 0
    return diff / (1000 * 60 * 60 * 24)
}

const normalizedEditSimilarity = (a = '', b = '') => {
    const left = normalizeSearchText(a)
    const right = normalizeSearchText(b)
    if (!left || !right) return 0
    if (left === right) return 1

    const m = left.length
    const n = right.length
    if (m > 48 || n > 48) return 0

    const prev = new Array(n + 1)
    const curr = new Array(n + 1)
    for (let j = 0; j <= n; j += 1) prev[j] = j

    for (let i = 1; i <= m; i += 1) {
        curr[0] = i
        for (let j = 1; j <= n; j += 1) {
            const cost = left[i - 1] === right[j - 1] ? 0 : 1
            curr[j] = Math.min(
                prev[j] + 1,
                curr[j - 1] + 1,
                prev[j - 1] + cost,
            )
        }
        for (let j = 0; j <= n; j += 1) prev[j] = curr[j]
    }

    const distance = prev[n]
    const maxLen = Math.max(m, n)
    return clamp(1 - (distance / maxLen), 0, 1)
}

export const parseSearchIntent = (query = '') => {
    const normalized = normalizeSearchText(query)
    const tokens = tokenizeSearch(normalized)

    const budgetHints = ['budget', 'cheap', 'affordable', 'low price', 'value', 'under', 'below', 'less than']
    const premiumHints = ['premium', 'flagship', 'high end', 'best', 'top', 'pro', 'ultimate']
    const speedHints = ['fast', 'quick', 'instant', 'speed', 'latency']
    const reliabilityHints = ['reliable', 'durable', 'trusted', 'authentic', 'original', 'verified']

    const priceMatch = normalized.match(/(?:under|below|less than|<=?)\s*(\d{3,7})/)
    const detectedBudget = priceMatch ? Number(priceMatch[1]) : null

    return {
        query: normalized,
        tokens,
        budgetMode: budgetHints.some((hint) => normalized.includes(hint)),
        premiumMode: premiumHints.some((hint) => normalized.includes(hint)),
        speedMode: speedHints.some((hint) => normalized.includes(hint)),
        reliabilityMode: reliabilityHints.some((hint) => normalized.includes(hint)),
        maxPrice: Number.isFinite(detectedBudget) ? detectedBudget : null,
    }
}

const computeTextScore = (product = {}, query = '', tokens = []) => {
    if (!query) return 0

    const title = normalizeSearchText(product.title || product.name || '')
    const brand = normalizeSearchText(product.brand || '')
    const category = normalizeSearchText(product.categories?.name || product.category || '')
    const tags = normalizeSearchText(Array.isArray(product.tags) ? product.tags.join(' ') : '')
    const description = normalizeSearchText(product.description || '')

    const searchable = [title, brand, category, tags, description].filter(Boolean).join(' ')
    if (!searchable) return 0

    let score = 0
    if (title === query) score += 1
    if (title.startsWith(query)) score += 0.8
    if (title.includes(query)) score += 0.55
    if (brand.includes(query)) score += 0.35
    if (category.includes(query)) score += 0.3
    if (tags.includes(query)) score += 0.2
    if (searchable.includes(query)) score += 0.18

    if (tokens.length) {
        const tokenMatches = tokens.filter((token) => searchable.includes(token)).length
        const coverage = tokenMatches / tokens.length
        score += coverage * 0.8
        if (tokenMatches === tokens.length && tokens.length > 1) score += 0.35
    }

    score += normalizedEditSimilarity(query, title) * 0.45
    score += normalizedEditSimilarity(query, `${brand} ${title}`) * 0.2

    return clamp(score / 3, 0, 1)
}

const buildMap = (value) => {
    if (value instanceof Map) return value
    const map = new Map()
    Object.entries(value || {}).forEach(([k, v]) => {
        const num = Number(v)
        if (Number.isFinite(num)) map.set(k, num)
    })
    return map
}

const computeUserAffinity = (product = {}, userVector = null) => {
    if (!userVector) return 0

    const preferenceMap = buildMap(userVector.preferenceMap)
    const categoryWeight = buildMap(userVector.categoryWeight)
    const brandWeight = buildMap(userVector.brandWeight)

    const features = Array.isArray(product._featureVector) && product._featureVector.length
        ? product._featureVector
        : buildProductFeatureVector(product)

    let featureScore = 0
    features.forEach((feature) => {
        featureScore += preferenceMap.get(feature) || 0
    })
    featureScore = featureScore / Math.max(features.length, 8)

    const categoryId = product.categoryId || product.category_id || null
    const brand = normalizeSearchText(product.brand || '')
    const categoryScore = categoryId ? (categoryWeight.get(categoryId) || 0) : 0
    const brandScore = brand ? (brandWeight.get(brand) || 0) : 0

    const combined = (featureScore * 0.62) + (categoryScore * 0.23) + (brandScore * 0.15)
    return clamp((Math.tanh(combined / 3) + 1) / 2, 0, 1)
}

const contentCompleteness = (product = {}) => {
    const fields = [
        product.title || product.name,
        product.description,
        product.brand,
        product.price,
        product.image,
        product.categoryId || product.category || product.categories?.name,
    ]
    const present = fields.filter((field) => {
        if (typeof field === 'number') return Number.isFinite(field)
        return Boolean(String(field || '').trim())
    }).length
    return present / fields.length
}

export const calculateContentReliability = (product = {}) => {
    const avgRating = clamp(getAverageRating(product) / 5, 0, 1)
    const reviewCount = getReviewCount(product)
    const reviewConfidence = clamp(Math.log10(reviewCount + 1) / Math.log10(350), 0, 1)

    const aiScoreRaw = Number(product.ai_analysis?.score || product.aiScore || 0)
    const aiScore = Number.isFinite(aiScoreRaw) ? clamp(aiScoreRaw / 10, 0, 1) : 0

    const freshness = clamp(1 - (daysSince(product.updatedAt || product.createdAt) / 240), 0, 1)
    const completeness = contentCompleteness(product)

    const reliability = (
        avgRating * 0.33
        + reviewConfidence * 0.24
        + aiScore * 0.2
        + completeness * 0.16
        + freshness * 0.07
    )

    return Number(clamp(reliability, 0, 1).toFixed(4))
}

const computeIntentBoost = (product = {}, intent) => {
    if (!intent) return 0

    let boost = 0
    const price = toNumber(product.price, NaN)
    const discount = getDiscountPercent(product)
    const rating = clamp(getAverageRating(product) / 5, 0, 1)

    if (intent.budgetMode) {
        if (Number.isFinite(price) && price > 0 && price <= (intent.maxPrice || price * 1.2)) boost += 0.16
        boost += clamp(discount / 100, 0, 0.12)
    }

    if (intent.premiumMode) {
        if (Number.isFinite(price) && price > 0) boost += clamp(Math.log10(price) / 10, 0, 0.12)
        boost += rating * 0.1
    }

    if (intent.reliabilityMode) {
        boost += calculateContentReliability(product) * 0.18
    }

    if (intent.speedMode) {
        const inStock = product.inStock !== false
        if (inStock) boost += 0.08
        boost += clamp(1 - (daysSince(product.updatedAt || product.createdAt) / 120), 0, 0.08)
    }

    return clamp(boost, 0, 0.28)
}

export const rankProductsWithHybridModel = (products = [], options = {}) => {
    const {
        query = '',
        limit = 20,
        minScore,
        userVector = null,
        preferReliability = false,
    } = options

    const intent = parseSearchIntent(query)
    const queryText = intent.query
    const queryTokens = intent.tokens
    const effectiveMinScore = Number.isFinite(minScore)
        ? minScore
        : (queryText ? 0.12 : 0)

    const scored = (Array.isArray(products) ? products : [])
        .filter(Boolean)
        .map((product) => {
            const textScore = computeTextScore(product, queryText, queryTokens)
            const affinity = computeUserAffinity(product, userVector)
            const reliability = calculateContentReliability(product)
            const valueScore = clamp(getDiscountPercent(product) / 100, 0, 1)
            const freshness = clamp(1 - (daysSince(product.createdAt) / 180), 0, 1)
            const popularity = clamp(Math.log10(getReviewCount(product) + 1) / Math.log10(500), 0, 1)
            const intentBoost = computeIntentBoost(product, intent)

            const score = queryText
                ? (
                    textScore * 0.5
                    + affinity * 0.16
                    + reliability * 0.16
                    + valueScore * 0.08
                    + freshness * 0.05
                    + popularity * 0.05
                    + intentBoost
                )
                : (
                    affinity * 0.34
                    + reliability * 0.3
                    + valueScore * 0.16
                    + freshness * 0.12
                    + popularity * 0.08
                ) + (preferReliability ? reliability * 0.08 : 0)

            return {
                product,
                score: Number(score.toFixed(4)),
                textScore: Number(textScore.toFixed(4)),
                affinityScore: Number(affinity.toFixed(4)),
                reliabilityScore: reliability,
                intentScore: Number(intentBoost.toFixed(4)),
            }
        })
        .filter((item) => item.score >= effectiveMinScore)
        .sort((a, b) => b.score - a.score)

    return {
        intent,
        items: scored.slice(0, Math.max(1, Number(limit) || 20)),
    }
}

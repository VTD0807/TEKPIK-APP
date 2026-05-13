const STOPWORDS = new Set([
    'the', 'and', 'for', 'with', 'from', 'this', 'that', 'your', 'best', 'new',
    'in', 'on', 'of', 'to', 'by', 'at', 'or', 'a', 'an', 'is', 'it', 'you',
    'get', 'buy', 'use', 'set', 'all', 'one', 'has', 'are', 'was', 'its',
])

const toTokens = (text = '') => {
    const words = String(text || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .map((word) => word.trim())
        .filter((word) => word.length >= 3 && !STOPWORDS.has(word))
    return Array.from(new Set(words)).slice(0, 24)
}

/**
 * Price tier bucket — gives the model a stable signal for price sensitivity.
 * Users who interact with ₹500–₹1000 products will get more of those.
 */
const priceTier = (price) => {
    const p = Number(price)
    if (!Number.isFinite(p) || p <= 0) return null
    if (p < 500) return 'price:under500'
    if (p < 1000) return 'price:500-1k'
    if (p < 2500) return 'price:1k-2.5k'
    if (p < 5000) return 'price:2.5k-5k'
    if (p < 10000) return 'price:5k-10k'
    if (p < 25000) return 'price:10k-25k'
    return 'price:25k+'
}

/**
 * Discount tier — users who click high-discount products get more of them.
 */
const discountTier = (discount) => {
    const d = Number(discount)
    if (!Number.isFinite(d) || d <= 0) return null
    if (d < 10) return 'disc:low'
    if (d < 25) return 'disc:mid'
    if (d < 50) return 'disc:high'
    return 'disc:very-high'
}

/**
 * AI quality tier — surfaces high-quality products to users who engage with them.
 */
const aiTier = (score) => {
    const s = Number(score)
    if (!Number.isFinite(s) || s <= 0) return null
    if (s >= 8) return 'ai:top'
    if (s >= 6) return 'ai:good'
    if (s >= 4) return 'ai:avg'
    return 'ai:low'
}

export const buildProductFeatureVector = (product = {}) => {
    const categoryId = product.categoryId || product.category_id || null
    const brand = String(product.brand || '').trim().toLowerCase() || null
    const tags = Array.isArray(product.tags) ? product.tags : []

    // Rich text blob: title + description + tags
    const textBlob = [product.title, product.name, product.description, ...tags]
        .filter(Boolean).join(' ')
    const textTokens = toTokens(textBlob)

    const features = []

    // Structural signals (high weight in learning)
    if (categoryId) features.push(`cat:${categoryId}`)
    if (brand) features.push(`brand:${brand}`)

    // Price sensitivity signal
    const pt = priceTier(product.price)
    if (pt) features.push(pt)

    // Discount affinity signal
    const dt = discountTier(product.discount)
    if (dt) features.push(dt)

    // AI quality signal
    const aiScore = product.ai_analysis?.score ?? product.aiScore ?? null
    const at = aiTier(aiScore)
    if (at) features.push(at)

    // Keyword signals
    textTokens.forEach((token) => features.push(`kw:${token}`))

    // Tag signals (explicit, higher weight than body text)
    tags.forEach((tag) => {
        const normalized = String(tag || '').toLowerCase().trim()
        if (normalized.length >= 2) features.push(`tag:${normalized}`)
    })

    return features
}

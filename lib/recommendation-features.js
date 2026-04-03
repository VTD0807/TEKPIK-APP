const STOPWORDS = new Set([
    'the', 'and', 'for', 'with', 'from', 'this', 'that', 'your', 'best', 'new',
    'in', 'on', 'of', 'to', 'by', 'at', 'or', 'a', 'an', 'is', 'it', 'you',
])

const toTokens = (text = '') => {
    const words = String(text || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .map((word) => word.trim())
        .filter((word) => word.length >= 3 && !STOPWORDS.has(word))
    return Array.from(new Set(words)).slice(0, 18)
}

export const buildProductFeatureVector = (product = {}) => {
    const categoryId = product.categoryId || product.category_id || null
    const brand = String(product.brand || '').trim().toLowerCase() || null
    const tags = Array.isArray(product.tags) ? product.tags : []
    const textBlob = [product.title, product.description, ...tags].filter(Boolean).join(' ')
    const textTokens = toTokens(textBlob)

    const features = []
    if (categoryId) features.push(`cat:${categoryId}`)
    if (brand) features.push(`brand:${brand}`)
    textTokens.forEach((token) => features.push(`kw:${token}`))
    return features
}

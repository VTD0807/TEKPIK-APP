import { buildProductFeatureVector } from '@/lib/recommendation-features'

export const buildUserPreferenceKeys = ({ accountId = '', deviceId = '' } = {}) => {
    const account = String(accountId || '').trim()
    const device = String(deviceId || '').trim()
    const keys = []
    if (account) { keys.push(`account:${account}`); keys.push(account) }
    if (device) { keys.push(`device:${device}`); keys.push(device) }
    return Array.from(new Set(keys)).filter(Boolean)
}

export const getPrimaryPreferenceKey = ({ accountId = '', deviceId = '' } = {}) => {
    const account = String(accountId || '').trim()
    if (account) return `account:${account}`
    const device = String(deviceId || '').trim()
    if (device) return `device:${device}`
    return ''
}

/**
 * Event weights — higher = stronger signal.
 * Negative events actively suppress features.
 */
export const getEventWeight = (eventType) => {
    if (eventType === 'wishlist_add') return 5.0
    if (eventType === 'amazon_click') return 4.0
    if (eventType === 'product_click') return 2.8
    if (eventType === 'page_view') return 1.5
    if (eventType === 'review_positive') return 4.5   // rating >= 4
    if (eventType === 'review_neutral') return 1.0    // rating 3
    if (eventType === 'review_negative') return -2.0  // rating <= 2
    if (eventType === 'wishlist_remove') return -2.5
    if (eventType === 'skip') return -0.8
    return 1.0
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
const toNumber = (value, fallback = 0) => { const n = Number(value); return Number.isFinite(n) ? n : fallback }

export const objectToMap = (obj) => {
    const map = new Map()
    Object.entries(obj || {}).forEach(([k, v]) => { const n = Number(v); if (Number.isFinite(n)) map.set(k, n) })
    return map
}

export const mapToObject = (map) => {
    const out = {}
    map.forEach((v, k) => { out[k] = Number(v) })
    return out
}

export const trimMapTopN = (map, limit) => new Map(
    Array.from(map.entries())
        .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
        .slice(0, limit)
)

export const stableHash = (text = '') => {
    let hash = 0
    const str = String(text)
    for (let i = 0; i < str.length; i += 1) hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
    return Math.abs(hash)
}

export const createEmptyPreferenceVector = () => ({
    preferenceMap: new Map(),
    categoryWeight: new Map(),
    brandWeight: new Map(),
    interactedProductIds: new Set(),
})

export const loadPreferenceVector = async ({ dbAdmin, keys = [] }) => {
    if (!dbAdmin) return { exists: false, key: '', data: null, vector: createEmptyPreferenceVector() }

    for (const key of keys) {
        const snap = await dbAdmin.collection('analytics_user_interest_vectors').doc(key).get()
        if (!snap.exists) continue
        const data = snap.data() || {}
        return {
            exists: true, key, data,
            vector: {
                preferenceMap: objectToMap(data.preferenceMap),
                categoryWeight: objectToMap(data.categoryWeight),
                brandWeight: objectToMap(data.brandWeight),
                interactedProductIds: new Set(Array.isArray(data.interactedProductIds) ? data.interactedProductIds : []),
            },
        }
    }

    return { exists: false, key: '', data: null, vector: createEmptyPreferenceVector() }
}

export const savePreferenceVector = async ({ dbAdmin, primaryKey, aliasKeys = [], vector, interactionCount = 0, updatedAt = new Date() }) => {
    if (!dbAdmin || !primaryKey) return

    const payload = {
        preferenceMap: mapToObject(trimMapTopN(vector.preferenceMap, 300)),
        categoryWeight: mapToObject(trimMapTopN(vector.categoryWeight, 50)),
        brandWeight: mapToObject(trimMapTopN(vector.brandWeight, 80)),
        interactedProductIds: Array.from(vector.interactedProductIds).slice(0, 600),
        interactionCount: Number(interactionCount) || 0,
        updatedAt,
    }

    const targetKeys = [primaryKey, ...aliasKeys].filter(Boolean)
    await Promise.all(targetKeys.map((key) =>
        dbAdmin.collection('analytics_user_interest_vectors').doc(key).set(payload, { merge: true })
    ))
}

const applyDecay = (map, factor) => {
    if (!Number.isFinite(factor) || factor >= 1) return map
    const out = new Map()
    map.forEach((v, k) => out.set(k, v * factor))
    return out
}

/**
 * Recency multiplier: interactions from today = 1.0, 30 days ago = ~0.7, 90 days ago = ~0.4
 * This makes recent behavior dominate over old behavior.
 */
const recencyMultiplier = (interactionTimestamp) => {
    if (!interactionTimestamp) return 0.6
    const ageDays = Math.max((Date.now() - new Date(interactionTimestamp).getTime()) / 86400000, 0)
    return clamp(Math.exp(-ageDays / 45), 0.15, 1.0)
}

export const applyLearningEvent = ({ vector, product, eventType, rating, updatedAt, interactionTimestamp }) => {
    const nextVector = vector || createEmptyPreferenceVector()

    // Resolve event type from rating if needed
    let resolvedEventType = eventType
    if (eventType === 'review' || eventType === 'review_submit') {
        const r = toNumber(rating, 3)
        resolvedEventType = r >= 4 ? 'review_positive' : r <= 2 ? 'review_negative' : 'review_neutral'
    }

    const baseWeight = getEventWeight(resolvedEventType)
    if (!product || baseWeight === 0) return nextVector

    // Apply recency multiplier to the weight
    const recency = recencyMultiplier(interactionTimestamp || updatedAt)
    const weight = baseWeight * recency

    const categoryId = product.categoryId || product.category_id || null
    const brand = String(product.brand || '').trim().toLowerCase() || null
    const features = buildProductFeatureVector(product)

    // Light global decay on existing vector (prevents old interests from dominating)
    const ageDays = updatedAt ? Math.max((Date.now() - new Date(updatedAt).getTime()) / 86400000, 0) : 0
    const globalDecay = clamp(1 - (ageDays * 0.002), 0.88, 1)
    nextVector.preferenceMap = applyDecay(nextVector.preferenceMap, globalDecay)
    nextVector.categoryWeight = applyDecay(nextVector.categoryWeight, globalDecay)
    nextVector.brandWeight = applyDecay(nextVector.brandWeight, globalDecay)

    nextVector.interactedProductIds.add(product.id)

    if (categoryId) nextVector.categoryWeight.set(categoryId, (nextVector.categoryWeight.get(categoryId) || 0) + weight)
    if (brand) nextVector.brandWeight.set(brand, (nextVector.brandWeight.get(brand) || 0) + weight)

    features.forEach((feature) => {
        nextVector.preferenceMap.set(feature, (nextVector.preferenceMap.get(feature) || 0) + weight)
    })

    return nextVector
}

const normalizeSearchText = (v = '') => String(v).toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim()
const tokenizeQuery = (v = '') => normalizeSearchText(v).split(' ').filter((w) => w.length >= 3)

export const applyQueryLearning = ({ vector, query, strength = 1 }) => {
    const nextVector = vector || createEmptyPreferenceVector()
    const tokens = tokenizeQuery(query)
    if (!tokens.length) return nextVector

    const baseWeight = clamp(Number(strength) || 1, 0.15, 2)
    tokens.forEach((token, index) => {
        const decay = 1 - (index * 0.1)
        const tokenWeight = baseWeight * clamp(decay, 0.4, 1)
        nextVector.preferenceMap.set(`kw:${token}`, (nextVector.preferenceMap.get(`kw:${token}`) || 0) + tokenWeight)
    })

    return nextVector
}

import { buildProductFeatureVector } from '@/lib/recommendation-features'

export const buildUserPreferenceKeys = ({ accountId = '', deviceId = '' } = {}) => {
    const account = String(accountId || '').trim()
    const device = String(deviceId || '').trim()

    const keys = []
    if (account) {
        keys.push(`account:${account}`)
        keys.push(account)
    }
    if (device) {
        keys.push(`device:${device}`)
        keys.push(device)
    }
    return Array.from(new Set(keys)).filter(Boolean)
}

export const getPrimaryPreferenceKey = ({ accountId = '', deviceId = '' } = {}) => {
    const account = String(accountId || '').trim()
    if (account) return `account:${account}`
    const device = String(deviceId || '').trim()
    if (device) return `device:${device}`
    return ''
}

export const getEventWeight = (eventType) => {
    if (eventType === 'wishlist_add') return 4.5
    if (eventType === 'amazon_click') return 3.5
    if (eventType === 'product_click') return 2.5
    if (eventType === 'page_view') return 1.25
    if (eventType === 'wishlist_remove') return -1.5
    if (eventType === 'skip') return -0.5
    return 1
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const toNumber = (value, fallback = 0) => {
    const num = Number(value)
    return Number.isFinite(num) ? num : fallback
}

export const objectToMap = (obj) => {
    const map = new Map()
    Object.entries(obj || {}).forEach(([key, value]) => {
        const num = Number(value)
        if (Number.isFinite(num)) map.set(key, num)
    })
    return map
}

export const mapToObject = (map) => {
    const out = {}
    map.forEach((value, key) => {
        out[key] = Number(value)
    })
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
    for (let i = 0; i < str.length; i += 1) {
        hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
    }
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
            exists: true,
            key,
            data,
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

export const savePreferenceVector = async ({
    dbAdmin,
    primaryKey,
    aliasKeys = [],
    vector,
    interactionCount = 0,
    updatedAt = new Date(),
}) => {
    if (!dbAdmin || !primaryKey) return

    const compactPreferenceMap = trimMapTopN(vector.preferenceMap, 220)
    const compactCategoryWeight = trimMapTopN(vector.categoryWeight, 40)
    const compactBrandWeight = trimMapTopN(vector.brandWeight, 60)
    const payload = {
        preferenceMap: mapToObject(compactPreferenceMap),
        categoryWeight: mapToObject(compactCategoryWeight),
        brandWeight: mapToObject(compactBrandWeight),
        interactedProductIds: Array.from(vector.interactedProductIds).slice(0, 500),
        interactionCount: Number(interactionCount) || 0,
        updatedAt,
    }

    const targetKeys = [primaryKey, ...aliasKeys].filter(Boolean)
    const writes = targetKeys.map((key) => dbAdmin.collection('analytics_user_interest_vectors').doc(key).set(payload, { merge: true }))
    await Promise.all(writes)
}

const applyDecay = (map, factor) => {
    if (!Number.isFinite(factor) || factor >= 1) return map
    const out = new Map()
    map.forEach((value, key) => {
        out.set(key, value * factor)
    })
    return out
}

export const applyLearningEvent = ({
    vector,
    product,
    eventType,
    rating,
    updatedAt,
}) => {
    const nextVector = vector || createEmptyPreferenceVector()
    const weight = getEventWeight(eventType)
    if (!product || !weight) return nextVector

    const categoryId = product.categoryId || product.category_id || null
    const brand = String(product.brand || '').trim().toLowerCase() || null
    const features = buildProductFeatureVector(product)

    const lastUpdatedAt = updatedAt ? new Date(updatedAt).getTime() : 0
    const ageDays = lastUpdatedAt ? Math.max((Date.now() - lastUpdatedAt) / (1000 * 60 * 60 * 24), 0) : 0
    const decay = clamp(1 - (ageDays * 0.0025), 0.86, 1)

    nextVector.preferenceMap = applyDecay(nextVector.preferenceMap, decay)
    nextVector.categoryWeight = applyDecay(nextVector.categoryWeight, decay)
    nextVector.brandWeight = applyDecay(nextVector.brandWeight, decay)

    nextVector.interactedProductIds.add(product.id)

    if (categoryId) {
        nextVector.categoryWeight.set(categoryId, (nextVector.categoryWeight.get(categoryId) || 0) + weight)
    }
    if (brand) {
        nextVector.brandWeight.set(brand, (nextVector.brandWeight.get(brand) || 0) + weight)
    }

    features.forEach((feature) => {
        nextVector.preferenceMap.set(feature, (nextVector.preferenceMap.get(feature) || 0) + weight)
    })

    if (eventType === 'wishlist_remove') {
        const penalty = clamp(weight, -4, -0.25)
        features.forEach((feature) => {
            nextVector.preferenceMap.set(feature, (nextVector.preferenceMap.get(feature) || 0) + penalty)
        })
    }

    if (Number.isFinite(Number(rating))) {
        const normalizedRating = clamp((toNumber(rating, 0) - 3) / 2, -1, 1)
        const ratingBoost = normalizedRating * 2.5
        features.forEach((feature) => {
            nextVector.preferenceMap.set(feature, (nextVector.preferenceMap.get(feature) || 0) + ratingBoost)
        })
    }

    return nextVector
}

const normalizeSearchText = (value = '') => String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const tokenizeQuery = (value = '') => normalizeSearchText(value)
    .split(' ')
    .filter((word) => word.length >= 3)

export const applyQueryLearning = ({ vector, query, strength = 1 }) => {
    const nextVector = vector || createEmptyPreferenceVector()
    const tokens = tokenizeQuery(query)
    if (!tokens.length) return nextVector

    const baseWeight = clamp(Number(strength) || 1, 0.15, 2)
    tokens.forEach((token, index) => {
        const decay = 1 - (index * 0.12)
        const tokenWeight = baseWeight * clamp(decay, 0.45, 1)
        nextVector.preferenceMap.set(`kw:${token}`, (nextVector.preferenceMap.get(`kw:${token}`) || 0) + tokenWeight)
    })

    return nextVector
}

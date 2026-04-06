import crypto from 'crypto'

const IDENTITY_COLLECTION = 'product_identity_keys'

const normalizeText = (value = '') => String(value || '').trim()

export const normalizeSlug = (value = '') => normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

export const extractAsin = (asin = '', affiliateUrl = '') => {
    const direct = normalizeText(asin).toUpperCase()
    if (/^[A-Z0-9]{10}$/.test(direct)) return direct

    const fromUrl = normalizeText(affiliateUrl)
    if (!fromUrl) return ''

    const candidate = fromUrl.match(/(?:\/dp\/|\/gp\/product\/|\/gp\/aw\/d\/|\/product\/)([A-Z0-9]{10})(?:[/?]|$)/i)
    if (candidate?.[1]) return String(candidate[1]).toUpperCase()

    return ''
}

export const normalizeAffiliateUrl = (value = '') => {
    const raw = normalizeText(value)
    if (!raw) return ''

    try {
        const parsed = new URL(raw)
        parsed.hash = ''

        const path = parsed.pathname.replace(/\/$/, '') || '/'
        const host = parsed.hostname.toLowerCase()

        const output = `${parsed.protocol}//${host}${path}`
        return output.toLowerCase()
    } catch {
        return raw.toLowerCase().replace(/\/$/, '')
    }
}

const shortHash = (value = '') => crypto.createHash('sha1').update(String(value)).digest('hex').slice(0, 16)

export const buildProductIdentity = ({ title = '', slug = '', asin = '', affiliateUrl = '' } = {}) => {
    const resolvedSlug = normalizeSlug(slug || title)
    const resolvedAsin = extractAsin(asin, affiliateUrl)
    const normalizedAffiliateUrl = normalizeAffiliateUrl(affiliateUrl)

    let identityKey = ''
    if (resolvedAsin) {
        identityKey = `asin_${resolvedAsin}`
    } else if (resolvedSlug) {
        identityKey = `slug_${resolvedSlug}`
    } else if (normalizedAffiliateUrl) {
        identityKey = `url_${shortHash(normalizedAffiliateUrl)}`
    } else {
        identityKey = `title_${shortHash(normalizeText(title).toLowerCase())}`
    }

    return {
        slug: resolvedSlug,
        asin: resolvedAsin,
        affiliateUrlNormalized: normalizedAffiliateUrl,
        identityKey,
    }
}

const isSameProduct = (id = '', excludeId = '') => Boolean(excludeId) && id === excludeId

export async function findExistingProductByIdentity(dbAdmin, identity, options = {}) {
    const { excludeId = '' } = options
    const products = dbAdmin.collection('products')

    if (identity.identityKey) {
        const identitySnap = await dbAdmin.collection(IDENTITY_COLLECTION).doc(identity.identityKey).get()
        if (identitySnap.exists) {
            const productId = String(identitySnap.data()?.productId || '')
            if (productId && !isSameProduct(productId, excludeId)) {
                const productSnap = await products.doc(productId).get()
                if (productSnap.exists) {
                    return { id: productSnap.id, ...productSnap.data() }
                }
                return { id: productId }
            }
        }
    }

    const checks = []
    if (identity.asin) {
        checks.push({ field: 'asin', value: identity.asin })
    }
    if (identity.slug) {
        checks.push({ field: 'slug', value: identity.slug })
    }
    if (identity.affiliateUrlNormalized) {
        checks.push({ field: 'affiliateUrlNormalized', value: identity.affiliateUrlNormalized })
    }

    for (const check of checks) {
        const snapshot = await products.where(check.field, '==', check.value).limit(1).get()
        if (!snapshot.empty) {
            const doc = snapshot.docs[0]
            if (!isSameProduct(doc.id, excludeId)) {
                return { id: doc.id, ...doc.data() }
            }
        }
    }

    return null
}

export function getIdentityCollectionName() {
    return IDENTITY_COLLECTION
}

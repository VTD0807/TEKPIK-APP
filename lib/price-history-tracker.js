import { dbAdmin, timestampToJSON } from '@/lib/firebase-admin'
import { dbSecondary, secondaryFirebaseAdminStatus } from '@/lib/firebase-secondary-admin'

const DEFAULT_PRICE_TRACKER_CONFIG = {
    enabled: false,
    timezone: 'Asia/Kolkata',
    peakHour: 21,
    peakMinute: 0,
    lookbackDays: 60,
    batchSize: 300,
}

const toInt = (value, fallback) => {
    const next = Number.parseInt(value, 10)
    return Number.isFinite(next) ? next : fallback
}

const toNum = (value) => {
    const num = Number(value)
    return Number.isFinite(num) ? num : null
}

const normalize = (value = {}) => {
    const source = value && typeof value === 'object' ? value : {}
    return {
        ...DEFAULT_PRICE_TRACKER_CONFIG,
        ...source,
        enabled: source.enabled === true,
        timezone: String(source.timezone || DEFAULT_PRICE_TRACKER_CONFIG.timezone),
        peakHour: Math.max(0, Math.min(23, toInt(source.peakHour, DEFAULT_PRICE_TRACKER_CONFIG.peakHour))),
        peakMinute: Math.max(0, Math.min(59, toInt(source.peakMinute, DEFAULT_PRICE_TRACKER_CONFIG.peakMinute))),
        lookbackDays: Math.max(30, Math.min(180, toInt(source.lookbackDays, DEFAULT_PRICE_TRACKER_CONFIG.lookbackDays))),
        batchSize: Math.max(50, Math.min(500, toInt(source.batchSize, DEFAULT_PRICE_TRACKER_CONFIG.batchSize))),
    }
}

const getDateParts = (date = new Date(), timezone = 'UTC') => {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).formatToParts(date)

    const map = {}
    parts.forEach((part) => {
        if (part.type !== 'literal') map[part.type] = part.value
    })

    return {
        year: toInt(map.year, 1970),
        month: toInt(map.month, 1),
        day: toInt(map.day, 1),
        hour: toInt(map.hour, 0),
        minute: toInt(map.minute, 0),
    }
}

const buildDayKey = (date, timezone) => {
    const p = getDateParts(date, timezone)
    return `${String(p.year).padStart(4, '0')}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`
}

const isWithinPeakWindow = (date, config, windowMinutes = 70) => {
    const p = getDateParts(date, config.timezone)
    const current = p.hour * 60 + p.minute
    const target = config.peakHour * 60 + config.peakMinute
    return Math.abs(current - target) <= windowMinutes
}

export const readPriceTrackerConfig = async () => {
    if (!dbAdmin) return normalize()
    const snap = await dbAdmin.collection('settings').doc('general').get()
    const data = snap.exists ? (snap.data() || {}) : {}
    return normalize(data.priceHistoryTracker || {})
}

export const savePriceTrackerConfig = async (patch = {}) => {
    if (!dbAdmin) return normalize(patch)
    const current = await readPriceTrackerConfig()
    const next = normalize({
        ...current,
        ...patch,
        updatedAt: new Date().toISOString(),
    })

    await dbAdmin.collection('settings').doc('general').set({
        priceHistoryTracker: next,
    }, { merge: true })

    return next
}

const computeDiscountPercent = (price, originalPrice) => {
    const p = toNum(price)
    const o = toNum(originalPrice)
    if (!Number.isFinite(p) || !Number.isFinite(o) || o <= 0 || p >= o) return 0
    return Math.max(0, Math.round((1 - (p / o)) * 100))
}

const fetchActiveProducts = async () => {
    const snap = await dbAdmin.collection('products').limit(1500).get()
    const products = []

    snap.forEach((doc) => {
        const data = doc.data() || {}
        const isActive = data.isActive ?? data.is_active ?? data.public ?? true
        if (!isActive) return

        products.push({
            id: doc.id,
            title: data.title || 'Untitled product',
            price: toNum(data.price),
            originalPrice: toNum(data.originalPrice ?? data.original_price),
            discount: toNum(data.discount),
            affiliateUrl: data.affiliateUrl || data.affiliate_url || '',
            imageUrl: data.imageUrls?.[0] || data.image_urls?.[0] || data.imageUrl || '',
            brand: data.brand || '',
            asin: data.asin || '',
            categoryId: data.categoryId || data.category_id || null,
            updatedAt: timestampToJSON(data.updatedAt) || null,
        })
    })

    return products
}

export const syncDailyPriceHistory = async ({ force = false, now = new Date() } = {}) => {
    if (!dbAdmin) {
        return { success: false, skipped: true, reason: 'Main Firestore is not initialized.' }
    }

    if (!dbSecondary) {
        return { success: false, skipped: true, reason: secondaryFirebaseAdminStatus.error || 'Secondary Firestore is not initialized.' }
    }

    const config = await readPriceTrackerConfig()
    if (!config.enabled && !force) {
        return { success: true, skipped: true, reason: 'Price tracker is disabled.', config }
    }

    if (!force && !isWithinPeakWindow(now, config)) {
        return { success: true, skipped: true, reason: 'Outside configured peak window.', config }
    }

    const dayKey = buildDayKey(now, config.timezone)
    const products = await fetchActiveProducts()
    if (products.length === 0) {
        return { success: true, skipped: true, reason: 'No active products found.', config, dayKey }
    }

    let captured = 0
    const batchSize = Math.max(1, config.batchSize)

    for (let i = 0; i < products.length; i += batchSize) {
        const batch = dbSecondary.batch()
        const chunk = products.slice(i, i + batchSize)

        chunk.forEach((product) => {
            const docId = `${dayKey}__${product.id}`
            const discount = Number.isFinite(product.discount)
                ? product.discount
                : computeDiscountPercent(product.price, product.originalPrice)

            batch.set(dbSecondary.collection('product_price_logs').doc(docId), {
                dayKey,
                capturedAt: new Date(),
                productId: product.id,
                title: product.title,
                price: product.price,
                originalPrice: product.originalPrice,
                discount,
                affiliateUrl: product.affiliateUrl,
                imageUrl: product.imageUrl,
                brand: product.brand,
                asin: product.asin,
                categoryId: product.categoryId,
                updatedAt: product.updatedAt || null,
            }, { merge: true })
            captured += 1
        })

        await batch.commit()
    }

    await dbSecondary.collection('price_sync_runs').add({
        dayKey,
        captured,
        totalProducts: products.length,
        timezone: config.timezone,
        peakHour: config.peakHour,
        peakMinute: config.peakMinute,
        force,
        createdAt: new Date(),
    })

    await dbAdmin.collection('settings').doc('general').set({
        priceHistoryTracker: {
            ...config,
            lastRunAt: new Date().toISOString(),
            lastRunDayKey: dayKey,
            lastCaptured: captured,
        },
    }, { merge: true })

    return {
        success: true,
        skipped: false,
        dayKey,
        captured,
        totalProducts: products.length,
        config,
    }
}

export const getPriceHistorySeries = async (productId, days = 60) => {
    if (!dbSecondary || !productId) return []

    let snapshot
    try {
        snapshot = await dbSecondary
            .collection('product_price_logs')
            .where('productId', '==', productId)
            .orderBy('capturedAt', 'desc')
            .limit(Math.max(10, days))
            .get()
    } catch {
        snapshot = await dbSecondary
            .collection('product_price_logs')
            .where('productId', '==', productId)
            .limit(200)
            .get()
    }

    const rows = []
    snapshot.forEach((doc) => {
        const data = doc.data() || {}
        rows.push({
            id: doc.id,
            dayKey: data.dayKey || null,
            price: toNum(data.price),
            originalPrice: toNum(data.originalPrice),
            discount: toNum(data.discount),
            title: data.title || '',
            capturedAt: timestampToJSON(data.capturedAt) || data.capturedAt || null,
        })
    })

    rows.sort((a, b) => {
        const at = Date.parse(a.capturedAt || '') || 0
        const bt = Date.parse(b.capturedAt || '') || 0
        return at - bt
    })

    return rows.slice(-Math.max(10, days))
}

export const getRecentPriceSyncRuns = async (limit = 20) => {
    if (!dbSecondary) return []

    const snap = await dbSecondary
        .collection('price_sync_runs')
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get()

    const runs = []
    snap.forEach((doc) => {
        const data = doc.data() || {}
        runs.push({
            id: doc.id,
            ...data,
            createdAt: timestampToJSON(data.createdAt) || data.createdAt || null,
        })
    })

    return runs
}

export const getPriceTrackerStatus = () => ({
    secondary: secondaryFirebaseAdminStatus,
    mainReady: Boolean(dbAdmin),
})

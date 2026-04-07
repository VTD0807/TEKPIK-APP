import { NextResponse } from 'next/server'
import { dbAdmin, timestampToJSON } from '@/lib/firebase-admin'
import { buildProductFeatureVector } from '@/lib/recommendation-features'
import { scrapeAmazonProduct } from '@/lib/amazon-scraper'

export const dynamic = 'force-dynamic'

const DEFAULT_UPDATER = {
    enabled: false,
    frequencyMinutes: 1440,
    maxPerRun: 5,
    delayMs: 500,
    batches: [
        { name: 'Batch 1', size: 5, delayMs: 500 },
    ],
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

const toNumberOrNull = (value) => {
    if (value === null || value === undefined || value === '') return null
    const num = Number(value)
    return Number.isFinite(num) ? num : null
}

const getTimestampValue = (value) => {
    if (!value) return 0
    if (typeof value?.toDate === 'function') return value.toDate().getTime()
    const date = new Date(value)
    return Number.isFinite(date.getTime()) ? date.getTime() : 0
}

const normalizeBatch = (batch, index, fallbackDelay = DEFAULT_UPDATER.delayMs) => {
    const rawName = String(batch?.name || '').trim()
    const size = Math.max(1, Number.parseInt(batch?.size, 10) || 1)
    const delayMs = Math.max(0, Number.parseInt(batch?.delayMs, 10) || fallbackDelay || 0)
    return {
        name: rawName || `Batch ${index + 1}`,
        size,
        delayMs,
    }
}

const normalizeBatches = (rawBatches, fallbackDelay = DEFAULT_UPDATER.delayMs) => {
    const source = Array.isArray(rawBatches) ? rawBatches : []
    const batches = source
        .map((batch, index) => normalizeBatch(batch, index, fallbackDelay))
        .filter((batch) => batch.size > 0)

    if (batches.length > 0) return batches
    return [normalizeBatch({ name: 'Batch 1', size: DEFAULT_UPDATER.maxPerRun, delayMs: fallbackDelay }, 0, fallbackDelay)]
}

const getUpdaterConfig = async () => {
    const snap = await dbAdmin.collection('settings').doc('general').get()
    const data = snap.exists ? (snap.data() || {}) : {}
    const merged = {
        ...DEFAULT_UPDATER,
        ...(data.amazonUpdater || {}),
    }

    return {
        ...merged,
        batches: normalizeBatches(merged.batches, merged.delayMs),
    }
}

const saveUpdaterMeta = async (patch) => {
    await dbAdmin.collection('settings').doc('general').set({
        amazonUpdater: patch,
    }, { merge: true })
}

const writeLog = async (payload) => {
    await dbAdmin.collection('amazon_updater_logs').add({
        ...payload,
        createdAt: new Date(),
    })
}

const getRecentLogs = async (limit = 20) => {
    const snap = await dbAdmin.collection('amazon_updater_logs')
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get()

    const logs = []
    snap.forEach((doc) => {
        logs.push({ id: doc.id, ...timestampToJSONPayload(doc.data()) })
    })
    return logs
}

const timestampToJSONPayload = (value) => {
    const out = { ...value }
    Object.keys(out).forEach((key) => {
        if (out[key] && typeof out[key].toDate === 'function') {
            out[key] = timestampToJSON(out[key])
        }
    })
    return out
}

const fetchProductsForRefresh = async () => {
    const snap = await dbAdmin.collection('products').get()
    const products = []

    snap.forEach((doc) => {
        const data = doc.data() || {}
        products.push({ id: doc.id, ...data })
    })

    return products
        .filter((product) => Boolean(product.affiliateUrl || product.affiliate_url))
        .sort((a, b) => {
            const syncA = getTimestampValue(a.amazonSyncedAt)
            const syncB = getTimestampValue(b.amazonSyncedAt)
            if (syncA !== syncB) return syncA - syncB

            const updatedA = getTimestampValue(a.updatedAt)
            const updatedB = getTimestampValue(b.updatedAt)
            if (updatedA !== updatedB) return updatedA - updatedB

            return getTimestampValue(a.createdAt) - getTimestampValue(b.createdAt)
        })
}

const buildUpdatePayload = (existingProduct, scraped) => {
    const now = new Date()
    const nextDescription = scraped.descriptionHtml || existingProduct.description || ''
    const nextPrice = toNumberOrNull(scraped.price) ?? toNumberOrNull(existingProduct.price) ?? 0
    const nextOriginalPrice = toNumberOrNull(scraped.originalPrice)
        ?? toNumberOrNull(existingProduct.originalPrice)
        ?? toNumberOrNull(existingProduct.original_price)
    const nextImageUrls = Array.isArray(scraped.imageUrls) && scraped.imageUrls.length > 0
        ? scraped.imageUrls
        : (Array.isArray(existingProduct.imageUrls) ? existingProduct.imageUrls : (Array.isArray(existingProduct.image_urls) ? existingProduct.image_urls : []))

    const nextDiscount = (nextOriginalPrice && nextOriginalPrice > nextPrice)
        ? Math.max(0, Math.round((1 - (nextPrice / nextOriginalPrice)) * 100))
        : 0

    const stableAffiliateUrl = existingProduct.affiliateUrl || existingProduct.affiliate_url || scraped.affiliateUrl

    const previousValues = {
        title: existingProduct.title || existingProduct.name || '',
        description: existingProduct.description || '',
        price: toNumberOrNull(existingProduct.price) ?? 0,
        originalPrice: toNumberOrNull(existingProduct.originalPrice) ?? toNumberOrNull(existingProduct.original_price),
        discount: Number(existingProduct.discount || 0),
        affiliateUrl: existingProduct.affiliateUrl || existingProduct.affiliate_url || '',
        asin: existingProduct.asin || null,
        imageUrls: JSON.stringify(Array.isArray(existingProduct.imageUrls)
            ? existingProduct.imageUrls
            : (Array.isArray(existingProduct.image_urls) ? existingProduct.image_urls : [])),
        amazonSyncSource: existingProduct.amazonSyncSource || '',
        amazonSyncStatus: existingProduct.amazonSyncStatus || '',
        amazonRatingText: existingProduct.amazonRatingText || '',
        amazonReviewsText: existingProduct.amazonReviewsText || '',
    }

    const nextValues = {
        title: scraped.title || existingProduct.title || existingProduct.name || '',
        description: nextDescription,
        price: nextPrice,
        originalPrice: nextOriginalPrice,
        discount: nextDiscount,
        affiliateUrl: stableAffiliateUrl,
        asin: scraped.asin || existingProduct.asin || null,
        imageUrls: JSON.stringify(nextImageUrls),
        amazonSyncSource: scraped.resolvedUrl || scraped.affiliateUrl || stableAffiliateUrl,
        amazonSyncStatus: 'success',
        amazonRatingText: scraped.ratingText || existingProduct.amazonRatingText || '',
        amazonReviewsText: scraped.reviewsText || existingProduct.amazonReviewsText || '',
    }

    const changedFields = Object.keys(nextValues).filter((key) => nextValues[key] !== previousValues[key])

    return {
        updateData: {
            title: nextValues.title,
            description: nextValues.description,
            price: nextValues.price,
            originalPrice: nextValues.originalPrice,
            original_price: nextValues.originalPrice,
            discount: nextValues.discount,
            affiliateUrl: nextValues.affiliateUrl,
            affiliate_url: nextValues.affiliateUrl,
            asin: nextValues.asin,
            imageUrls: nextImageUrls,
            image_urls: nextImageUrls,
            amazonRatingText: nextValues.amazonRatingText,
            amazonReviewsText: nextValues.amazonReviewsText,
            lastUpdated: now,
            updatedAt: now,
            amazonSyncedAt: now,
            amazonSyncSource: nextValues.amazonSyncSource,
            amazonSyncStatus: nextValues.amazonSyncStatus,
        },
        changedFields,
    }
}

export async function GET() {
    if (!dbAdmin) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })

    try {
        const config = await getUpdaterConfig()
        const logs = await getRecentLogs(20)
        return NextResponse.json({
            settings: config,
            logs,
            nextRunAt: config.enabled ? new Date(Date.now() + (Number(config.frequencyMinutes || 0) * 60 * 1000)).toISOString() : null,
        })
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function PUT(req) {
    if (!dbAdmin) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })

    try {
        const body = await req.json().catch(() => ({}))
        const current = await getUpdaterConfig()

        const nextConfig = {
            ...current,
            enabled: body.enabled ?? current.enabled,
            frequencyMinutes: Number.parseInt(body.frequencyMinutes ?? current.frequencyMinutes, 10) || current.frequencyMinutes,
            maxPerRun: Number.parseInt(body.maxPerRun ?? current.maxPerRun, 10) || current.maxPerRun,
            delayMs: Number.parseInt(body.delayMs ?? current.delayMs, 10) || current.delayMs,
            batches: normalizeBatches(body.batches ?? current.batches, body.delayMs ?? current.delayMs),
            updatedAt: new Date(),
        }

        await saveUpdaterMeta(nextConfig)

        return NextResponse.json({ success: true, settings: nextConfig })
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function POST(req) {
    if (!dbAdmin) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })

    try {
        const body = await req.json().catch(() => ({}))
        const force = body.force === true
        const runLimit = Number.parseInt(body.limit || body.maxPerRun || '', 10)
        const delayMs = Number.parseInt(body.delayMs || '', 10)
        const requestedRunId = String(body.runId || '').trim()
        const requestBatches = body.batches

        const config = await getUpdaterConfig()
        const effectiveLimit = Number.isFinite(runLimit) && runLimit > 0
            ? runLimit
            : Math.max(1, Number.parseInt(config.maxPerRun || DEFAULT_UPDATER.maxPerRun, 10) || DEFAULT_UPDATER.maxPerRun)
        const effectiveDelay = Number.isFinite(delayMs) && delayMs >= 0
            ? delayMs
            : Math.max(0, Number.parseInt(config.delayMs || DEFAULT_UPDATER.delayMs, 10) || DEFAULT_UPDATER.delayMs)

        if (!force && config.enabled === false) {
            return NextResponse.json({ skipped: true, reason: 'Updater is disabled in settings.' })
        }

        const products = await fetchProductsForRefresh()
        const effectiveBatches = normalizeBatches(requestBatches ?? config.batches, effectiveDelay)
        const totalTarget = effectiveBatches.reduce((sum, batch) => sum + batch.size, 0)
        const hardLimit = Number.isFinite(runLimit) && runLimit > 0 ? runLimit : totalTarget
        const candidates = products.slice(0, hardLimit)

        if (candidates.length === 0) {
            const emptySummary = {
                processed: 0,
                updated: 0,
                failed: 0,
                skipped: 0,
                totalCandidates: 0,
                batches: [],
            }
            await saveUpdaterMeta({
                ...config,
                lastRunAt: new Date(),
                lastRunSummary: emptySummary,
            })
            return NextResponse.json({ success: true, summary: emptySummary, logs: [] })
        }

        const runId = requestedRunId || `run_${Date.now()}`
        const summary = {
            processed: 0,
            updated: 0,
            failed: 0,
            skipped: 0,
            totalCandidates: candidates.length,
            batches: [],
        }
        const runLogs = []
        let cursor = 0

        for (let batchIndex = 0; batchIndex < effectiveBatches.length; batchIndex += 1) {
            const batch = effectiveBatches[batchIndex]
            const batchItems = candidates.slice(cursor, cursor + batch.size)
            cursor += batch.size

            if (batchItems.length === 0) break

            const batchSummary = {
                index: batchIndex + 1,
                name: batch.name,
                size: batch.size,
                processed: 0,
                updated: 0,
                failed: 0,
                delayMs: batch.delayMs,
            }

            for (let index = 0; index < batchItems.length; index += 1) {
                const product = batchItems[index]
                summary.processed += 1
                batchSummary.processed += 1
                const sourceUrl = product.affiliateUrl || product.affiliate_url || ''

                try {
                    const scraped = await scrapeAmazonProduct(sourceUrl)
                    const scrapedPrice = toNumberOrNull(scraped.price)
                    if (!(scrapedPrice && scrapedPrice > 0)) {
                        throw new Error('Scraper returned no valid current price.')
                    }
                    const { updateData, changedFields } = buildUpdatePayload(product, scraped)

                    await dbAdmin.collection('products').doc(product.id).update(updateData)
                    await dbAdmin.collection('analytics_product_feature_vectors').doc(product.id).set({
                        productId: product.id,
                        features: buildProductFeatureVector({ id: product.id, ...product, ...updateData }),
                        updatedAt: new Date(),
                    }, { merge: true })

                    const logEntry = {
                        runId,
                        batchName: batch.name,
                        batchIndex: batchIndex + 1,
                        productId: product.id,
                        productTitle: updateData.title || product.title || '',
                        status: 'success',
                        message: 'Product refreshed successfully.',
                        sourceUrl,
                        resolvedUrl: scraped.resolvedUrl || sourceUrl,
                        changedFields,
                        createdAt: new Date(),
                    }
                    runLogs.push(logEntry)
                    await writeLog(logEntry)
                    summary.updated += 1
                    batchSummary.updated += 1
                } catch (error) {
                    summary.failed += 1
                    batchSummary.failed += 1
                    const logEntry = {
                        runId,
                        batchName: batch.name,
                        batchIndex: batchIndex + 1,
                        productId: product.id,
                        productTitle: product.title || '',
                        status: 'failed',
                        message: error.message || 'Failed to refresh product.',
                        sourceUrl,
                        resolvedUrl: '',
                        changedFields: [],
                        createdAt: new Date(),
                    }
                    runLogs.push(logEntry)
                    await writeLog(logEntry)
                }

                if (batch.delayMs > 0 && index < batchItems.length - 1) {
                    await sleep(batch.delayMs)
                }
            }

            summary.batches.push(batchSummary)
        }

        const nextConfig = {
            ...config,
            lastRunAt: new Date(),
            lastRunSummary: summary,
        }
        await saveUpdaterMeta(nextConfig)

        return NextResponse.json({ success: true, runId, summary, logs: runLogs })
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

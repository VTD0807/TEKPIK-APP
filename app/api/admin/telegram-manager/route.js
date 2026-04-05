import { NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/firebase-admin'
import { scrapeAmazonProduct } from '@/lib/amazon-scraper'
import { buildProductFeatureVector } from '@/lib/recommendation-features'
import {
    getTelegramManagerStats,
    normalizeTelegramManagerConfig,
    publishMissingProductsToTelegram,
    readTelegramManagerConfig,
    runTelegramPriceTracker,
    saveTelegramManagerConfig,
    sendTelegramManualMessage,
    sendTelegramTestMessage,
    getTelegramStatus,
} from '@/lib/telegram-manager'

export const dynamic = 'force-dynamic'

const slugify = (value = '') => String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

const toNumber = (value) => {
    if (value === null || value === undefined || value === '') return null
    const num = Number(value)
    return Number.isFinite(num) ? num : null
}

const getRecentImportedProducts = async () => {
    const snap = await dbAdmin.collection('telegram_import_logs')
        .orderBy('createdAt', 'desc')
        .limit(20)
        .get()

    const rows = []
    snap.forEach((doc) => {
        const data = doc.data() || {}
        rows.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt || null,
        })
    })

    return rows
}

const getManualSendProducts = async () => {
    const snap = await dbAdmin.collection('products').limit(300).get()
    const rows = []

    snap.forEach((doc) => {
        const data = doc.data() || {}
        const isActive = data.isActive ?? data.is_active ?? data.public ?? true
        if (!isActive) return

        rows.push({
            id: doc.id,
            title: data.title || 'Untitled product',
            price: data.price ?? null,
            originalPrice: data.originalPrice ?? data.original_price ?? null,
            affiliateUrl: data.affiliateUrl || data.affiliate_url || '',
            imageUrl: data.imageUrls?.[0] || data.image_urls?.[0] || data.imageUrl || '',
            brand: data.brand || '',
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt || null,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt || null,
        })
    })

    rows.sort((a, b) => {
        const aTime = Date.parse(a.updatedAt || a.createdAt || '') || 0
        const bTime = Date.parse(b.updatedAt || b.createdAt || '') || 0
        return bTime - aTime
    })

    return rows.slice(0, 200)
}

export async function GET() {
    if (!dbAdmin) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })

    try {
        const config = await readTelegramManagerConfig(dbAdmin)
        const stats = await getTelegramManagerStats(dbAdmin)
        const importedProducts = await getRecentImportedProducts()
        const manualProducts = await getManualSendProducts()

        return NextResponse.json({
            config,
            status: getTelegramStatus(config),
            stats,
            importedProducts,
            manualProducts,
            cron: {
                path: '/api/cron/telegram-price-tracker',
                schedule: '0 */3 * * *',
                note: 'Runs every 3 hours by default. Change vercel.json if you want 2-hour intervals.',
            },
        })
    } catch (error) {
        console.error('[telegram-manager:get]', error)
        return NextResponse.json({ error: error.message || 'Failed to load Telegram manager' }, { status: 500 })
    }
}

export async function PUT(req) {
    if (!dbAdmin) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })

    try {
        const body = await req.json().catch(() => ({}))
        const nextConfig = normalizeTelegramManagerConfig({
            ...(await readTelegramManagerConfig(dbAdmin)),
            ...body,
        })
        const saved = await saveTelegramManagerConfig(dbAdmin, nextConfig)
        return NextResponse.json({ success: true, config: saved, status: getTelegramStatus(saved) })
    } catch (error) {
        console.error('[telegram-manager:put]', error)
        return NextResponse.json({ error: error.message || 'Failed to save Telegram manager' }, { status: 500 })
    }
}

export async function POST(req) {
    if (!dbAdmin) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })

    try {
        const body = await req.json().catch(() => ({}))
        const action = String(body?.action || '').trim()
        const config = await readTelegramManagerConfig(dbAdmin)

        if (action === 'test') {
            const result = await sendTelegramTestMessage(config, {
                testMessage: body?.testMessage,
            })
            return NextResponse.json({ success: true, ...result })
        }

        if (action === 'publishCatalog') {
            const result = await publishMissingProductsToTelegram(dbAdmin, config, {
                limit: body.limit,
                delayMs: body.delayMs,
            })
            return NextResponse.json({ success: true, ...result })
        }

        if (action === 'priceTrack') {
            const result = await runTelegramPriceTracker(dbAdmin, config, {
                limit: body.limit,
                delayMs: body.delayMs,
                runId: body.runId,
            })
            return NextResponse.json({ success: true, ...result })
        }

        if (action === 'manualSend') {
            let selectedProduct = null
            const productId = String(body?.productId || '').trim()
            if (productId) {
                const productSnap = await dbAdmin.collection('products').doc(productId).get()
                if (productSnap.exists) {
                    selectedProduct = { id: productSnap.id, ...(productSnap.data() || {}) }
                }
            }

            const result = await sendTelegramManualMessage(config, {
                message: body.message,
                templateKey: body.templateKey,
                variables: body.variables,
                product: selectedProduct,
                includeImage: body.includeImage !== false,
            })

            await dbAdmin.collection('telegram_channel_messages').add({
                type: 'manual_send',
                status: 'success',
                message: 'Manual Telegram message sent',
                preview: String(result?.message || '').slice(0, 500),
                templateKey: body.templateKey || null,
                productId: selectedProduct?.id || null,
                imageSent: Boolean(result?.usedImage),
                createdAt: new Date(),
            })

            return NextResponse.json({ success: true, ...result })
        }

        if (action === 'importProduct') {
            const sourceUrl = String(body?.url || '').trim()
            if (!sourceUrl) {
                return NextResponse.json({ error: 'Product URL is required' }, { status: 400 })
            }

            const scraped = await scrapeAmazonProduct(sourceUrl)
            const now = new Date()
            const title = String(body?.title || scraped.title || '').trim()
            const brand = String(body?.brand || '').trim()
            const categoryId = String(body?.categoryId || '').trim() || null
            const tags = Array.isArray(body?.tags)
                ? body.tags.map((item) => String(item).trim()).filter(Boolean)
                : String(body?.tags || '').split(',').map((item) => item.trim()).filter(Boolean)

            if (!title) {
                return NextResponse.json({ error: 'Could not extract product title from URL' }, { status: 400 })
            }

            const nextPrice = toNumber(body?.price) ?? toNumber(scraped.price) ?? 0
            const nextOriginalPrice = toNumber(body?.originalPrice) ?? toNumber(scraped.originalPrice)
            const nextDiscount = nextOriginalPrice && nextOriginalPrice > nextPrice
                ? Math.max(0, Math.round((1 - (nextPrice / nextOriginalPrice)) * 100))
                : 0

            const affiliateUrl = String(body?.affiliateUrl || scraped.affiliateUrl || sourceUrl).trim()
            const imageUrls = Array.isArray(scraped.imageUrls) && scraped.imageUrls.length > 0
                ? scraped.imageUrls
                : []

            let existingRef = null
            if (scraped.asin) {
                const existingByAsin = await dbAdmin.collection('products').where('asin', '==', scraped.asin).limit(1).get()
                if (!existingByAsin.empty) existingRef = existingByAsin.docs[0].ref
            }

            if (!existingRef) {
                const existingByAffiliate = await dbAdmin.collection('products').where('affiliateUrl', '==', affiliateUrl).limit(1).get()
                if (!existingByAffiliate.empty) existingRef = existingByAffiliate.docs[0].ref
            }

            const payload = {
                title,
                slug: slugify(title),
                description: scraped.descriptionHtml || '',
                price: nextPrice,
                originalPrice: nextOriginalPrice,
                original_price: nextOriginalPrice,
                discount: nextDiscount,
                affiliateUrl,
                affiliate_url: affiliateUrl,
                asin: scraped.asin || null,
                brand,
                imageUrls,
                image_urls: imageUrls,
                categoryId,
                category_id: categoryId,
                tags,
                isFeatured: body?.isFeatured === true,
                is_featured: body?.isFeatured === true,
                isActive: body?.isActive !== false,
                is_active: body?.isActive !== false,
                public: body?.isActive !== false,
                amazonRatingText: scraped.ratingText || '',
                amazonReviewsText: scraped.reviewsText || '',
                amazonSyncedAt: now,
                amazonSyncSource: scraped.resolvedUrl || affiliateUrl,
                amazonSyncStatus: 'success',
                telegramImportedAt: now,
                updatedAt: now,
            }

            let productId = ''
            let mode = 'created'
            if (existingRef) {
                await existingRef.set(payload, { merge: true })
                productId = existingRef.id
                mode = 'updated'
            } else {
                const created = await dbAdmin.collection('products').add({ ...payload, createdAt: now })
                productId = created.id
            }

            await dbAdmin.collection('analytics_product_feature_vectors').doc(productId).set({
                productId,
                features: buildProductFeatureVector({ id: productId, ...payload }),
                updatedAt: now,
            }, { merge: true })

            await dbAdmin.collection('telegram_import_logs').add({
                productId,
                mode,
                title,
                price: nextPrice,
                originalPrice: nextOriginalPrice,
                discount: nextDiscount,
                brand: brand || null,
                affiliateUrl,
                asin: scraped.asin || null,
                categoryId,
                tags,
                imageUrl: imageUrls[0] || null,
                imageCount: imageUrls.length,
                createdAt: now,
            })

            // Auto-send Telegram message if enabled
            let telegramSent = false
            let telegramError = null
            if (body?.sendToTelegram === true && config.enabled && config.publishNewProducts) {
                try {
                    const msgResult = await sendTelegramManualMessage(config, {
                        message: '',
                        templateKey: 'catalog',
                        product: { id: productId, ...payload },
                        includeImage: true,
                    })
                    if (msgResult?.success) {
                        telegramSent = true
                        await dbAdmin.collection('telegram_channel_messages').add({
                            type: 'auto_import',
                            status: 'success',
                            message: 'Auto-sent on product import from Telegram Manager',
                            preview: String(msgResult?.message || '').slice(0, 500),
                            templateKey: 'catalog',
                            productId,
                            imageSent: Boolean(msgResult?.usedImage),
                            createdAt: now,
                        })
                    }
                } catch (err) {
                    telegramError = err.message
                }
            }

            return NextResponse.json({
                success: true,
                mode,
                product: {
                    id: productId,
                    title,
                    price: nextPrice,
                    originalPrice: nextOriginalPrice,
                    affiliateUrl,
                    asin: scraped.asin || null,
                    categoryId,
                    tags,
                    imageUrls,
                },
                telegram: {
                    sent: telegramSent,
                    error: telegramError || null,
                },
            })
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    } catch (error) {
        console.error('[telegram-manager:post]', error)
        return NextResponse.json({ error: error.message || 'Telegram action failed' }, { status: 500 })
    }
}

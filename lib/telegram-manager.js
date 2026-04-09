import { absoluteUrl } from '@/lib/seo'
import { scrapeAmazonProduct } from '@/lib/amazon-scraper'

const DEFAULT_TELEGRAM_MANAGER = {
    enabled: false,
    botToken: '',
    chatId: '',
    frequencyMinutes: 180,
    maxPerRun: 25,
    delayMs: 350,
    publishNewProducts: true,
    priceTrackerEnabled: true,
    minimumPriceDropPercent: 0,
    templates: {
        catalog: '<b>{{title}}</b>\nPrice: {{price}}\n\nView: {{productUrl}}\nAffiliate: {{affiliateUrl}}',
        priceDrop: '<b>Price Drop Alert</b>\n<b>{{title}}</b>\nOld: {{oldPrice}}\nNew: {{newPrice}}\nDrop: {{dropPercent}}%\n\nView: {{productUrl}}',
        test: '<b>TEKPIK Telegram Test</b>\nTelegram integration is connected and ready.\n\nOpen: {{adminUrl}}',
        customTemplates: [],
    },
    lastRunSummary: {
        checked: 0,
        updated: 0,
        alertsSent: 0,
        published: 0,
        failed: 0,
    },
}

const telegramMessageCollection = 'telegram_channel_messages'
const telegramRunCollection = 'telegram_price_tracker_runs'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const toNumber = (value) => {
    if (value === null || value === undefined || value === '') return null
    const num = Number(value)
    return Number.isFinite(num) ? num : null
}

const toDateValue = (value) => {
    if (!value) return 0
    if (typeof value.toDate === 'function') return value.toDate().getTime()
    const parsed = new Date(value)
    return Number.isFinite(parsed.getTime()) ? parsed.getTime() : 0
}

const isTruthy = (value) => value === true || value === 'true' || value === 1 || value === '1'

const normalizeTemplateList = (value) => {
    if (!Array.isArray(value)) return []

    return value
        .map((item, index) => {
            const key = String(item?.key || `custom_${index + 1}`)
                .trim()
                .toLowerCase()
                .replace(/[^a-z0-9_]+/g, '_')
                .replace(/(^_|_$)/g, '') || `custom_${index + 1}`

            return {
                key,
                label: String(item?.label || key).trim(),
                body: String(item?.body || '').trim(),
            }
        })
        .filter((item) => item.body)
}

export const normalizeTelegramManagerConfig = (value = {}) => {
    const source = value && typeof value === 'object' ? value : {}
    const sourceTemplates = source?.templates && typeof source.templates === 'object' ? source.templates : {}
    return {
        ...DEFAULT_TELEGRAM_MANAGER,
        ...source,
        enabled: isTruthy(source.enabled),
        botToken: String(source.botToken || '').trim(),
        chatId: String(source.chatId || '').trim(),
        frequencyMinutes: Math.max(15, Number.parseInt(source.frequencyMinutes ?? DEFAULT_TELEGRAM_MANAGER.frequencyMinutes, 10) || DEFAULT_TELEGRAM_MANAGER.frequencyMinutes),
        maxPerRun: Math.max(1, Number.parseInt(source.maxPerRun ?? DEFAULT_TELEGRAM_MANAGER.maxPerRun, 10) || DEFAULT_TELEGRAM_MANAGER.maxPerRun),
        delayMs: Math.max(0, Number.parseInt(source.delayMs ?? DEFAULT_TELEGRAM_MANAGER.delayMs, 10) || DEFAULT_TELEGRAM_MANAGER.delayMs),
        publishNewProducts: source.publishNewProducts === false ? false : true,
        priceTrackerEnabled: source.priceTrackerEnabled === false ? false : true,
        minimumPriceDropPercent: Math.max(0, Number.parseFloat(source.minimumPriceDropPercent ?? DEFAULT_TELEGRAM_MANAGER.minimumPriceDropPercent) || 0),
        templates: {
            catalog: String(sourceTemplates.catalog ?? DEFAULT_TELEGRAM_MANAGER.templates.catalog),
            priceDrop: String(sourceTemplates.priceDrop ?? DEFAULT_TELEGRAM_MANAGER.templates.priceDrop),
            test: String(sourceTemplates.test ?? DEFAULT_TELEGRAM_MANAGER.templates.test),
            customTemplates: normalizeTemplateList(sourceTemplates.customTemplates ?? []),
        },
        lastRunSummary: {
            ...DEFAULT_TELEGRAM_MANAGER.lastRunSummary,
            ...(source.lastRunSummary || {}),
        },
        lastRunAt: source.lastRunAt || null,
        lastCatalogPublishAt: source.lastCatalogPublishAt || null,
        updatedAt: source.updatedAt || null,
    }
}

export const readTelegramManagerConfig = async (dbAdmin) => {
    const snap = await dbAdmin.collection('settings').doc('general').get()
    const data = snap.exists ? (snap.data() || {}) : {}
    return normalizeTelegramManagerConfig(data.telegramManager || {})
}

export const saveTelegramManagerConfig = async (dbAdmin, patch = {}) => {
    const current = await readTelegramManagerConfig(dbAdmin)
    const patchTemplates = patch?.templates && typeof patch.templates === 'object' ? patch.templates : {}
    const next = normalizeTelegramManagerConfig({
        ...current,
        ...patch,
        templates: {
            ...(current.templates || {}),
            ...patchTemplates,
        },
        updatedAt: new Date(),
    })

    await dbAdmin.collection('settings').doc('general').set({
        telegramManager: next,
    }, { merge: true })

    return next
}

const getCredentials = (config = {}) => {
    const botToken = String(config.botToken || process.env.TELEGRAM_BOT_TOKEN || process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN || '').trim()
    const chatId = String(config.chatId || process.env.TELEGRAM_CHAT_ID || process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID || '').trim()
    return { botToken, chatId }
}

export const getTelegramStatus = (config = {}) => {
    const creds = getCredentials(config)
    return {
        enabled: Boolean(config.enabled),
        botTokenConfigured: Boolean(creds.botToken),
        chatIdConfigured: Boolean(creds.chatId),
        priceTrackerEnabled: Boolean(config.priceTrackerEnabled),
        publishNewProducts: Boolean(config.publishNewProducts),
        ready: Boolean(config.enabled && creds.botToken && creds.chatId),
    }
}

const escapeHtml = (value = '') => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const formatMoney = (value) => {
    const amount = toNumber(value)
    if (!Number.isFinite(amount)) return '—'
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(amount)
}

const productPath = (product = {}) => {
    if (product.id) return `/products/${product.id}`
    if (product.slug) return `/products/${product.slug}`
    return '/shop'
}

const productImage = (product = {}) => product.imageUrls?.[0] || product.image_urls?.[0] || product.imageUrl || ''

const buildTemplateVariables = (product = {}, extras = {}) => {
    const priceDrop = extras.priceDrop || null
    const fallbackProductUrl = absoluteUrl(productPath(product))
    const productUrl = String(
        product.productUrl
        || product.sourceUrl
        || product.importSourceUrl
        || fallbackProductUrl,
    ).trim() || fallbackProductUrl

    return {
        title: escapeHtml(product.title || product.name || 'Untitled product'),
        brand: escapeHtml(product.brand || 'No brand'),
        price: formatMoney(product.price),
        originalPrice: formatMoney(product.originalPrice || product.original_price),
        productUrl,
        affiliateUrl: escapeHtml(product.affiliateUrl || product.affiliate_url || productUrl),
        oldPrice: formatMoney(priceDrop?.oldPrice ?? extras.oldPrice),
        newPrice: formatMoney(priceDrop?.newPrice ?? extras.newPrice ?? product.price),
        dropPercent: Number(priceDrop?.dropPercent ?? extras.dropPercent ?? 0),
        dropAmount: formatMoney(priceDrop?.dropAmount ?? extras.dropAmount),
        adminUrl: absoluteUrl('/admin/integrations'),
        description: escapeHtml(String(product.description || '').slice(0, 180)),
    }
}

const renderTemplate = (template = '', variables = {}) => {
    const source = String(template || '')
    if (!source.trim()) return ''

    return source.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, key) => {
        const value = variables[key]
        return value === undefined || value === null ? '' : String(value)
    })
}

export const buildProductMessage = (config = {}, product = {}, extras = {}) => {
    const url = absoluteUrl(productPath(product))
    const image = productImage(product)
    const variables = buildTemplateVariables(product, extras)
    const templateType = extras.templateType || 'catalog'
    const selectedTemplate = templateType === 'priceDrop'
        ? (config?.templates?.priceDrop || DEFAULT_TELEGRAM_MANAGER.templates.priceDrop)
        : (config?.templates?.catalog || DEFAULT_TELEGRAM_MANAGER.templates.catalog)

    let text = renderTemplate(selectedTemplate, variables)
    if (!text.trim()) {
        text = `<b>${variables.title}</b>\nPrice: ${variables.price}\n\nView: ${variables.productUrl}\nAffiliate: ${variables.affiliateUrl}`
    }

    return {
        text,
        image,
    }
}

const telegramRequest = async (botToken, method, payload) => {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data.ok) {
        throw new Error(data?.description || `Telegram ${method} failed`)
    }

    return data.result
}

export const sendTelegramText = async (config, message) => {
    const creds = getCredentials(config)
    if (!creds.botToken || !creds.chatId) {
        throw new Error('Telegram bot token or chat ID is missing')
    }

    return telegramRequest(creds.botToken, 'sendMessage', {
        chat_id: creds.chatId,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: false,
    })
}

export const sendTelegramPhoto = async (config, photoUrl, caption) => {
    const creds = getCredentials(config)
    if (!creds.botToken || !creds.chatId) {
        throw new Error('Telegram bot token or chat ID is missing')
    }

    if (!photoUrl) return sendTelegramText(config, caption)

    return telegramRequest(creds.botToken, 'sendPhoto', {
        chat_id: creds.chatId,
        photo: photoUrl,
        caption,
        parse_mode: 'HTML',
    })
}

export const recordTelegramMessage = async (dbAdmin, payload) => {
    await dbAdmin.collection(telegramMessageCollection).add({
        ...payload,
        createdAt: new Date(),
    })
}

export const getRecentTelegramMessages = async (dbAdmin, limit = 25) => {
    const snap = await dbAdmin.collection(telegramMessageCollection)
        .orderBy('createdAt', 'desc')
        .limit(limit)
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

const getTrackedProducts = async (dbAdmin) => {
    const snap = await dbAdmin.collection('products').limit(2000).get()

    const products = []
    snap.forEach((doc) => {
        const data = doc.data() || {}
        const isActive = data.isActive ?? data.is_active ?? data.public ?? true
        if (!isActive) return
        products.push({ id: doc.id, ...data })
    })

    return products
        .filter((product) => Boolean(product.affiliateUrl || product.affiliate_url))
        .sort((a, b) => {
            const aScore = toDateValue(a.telegramTrackedAt) || toDateValue(a.amazonSyncedAt) || toDateValue(a.updatedAt) || toDateValue(a.createdAt)
            const bScore = toDateValue(b.telegramTrackedAt) || toDateValue(b.amazonSyncedAt) || toDateValue(b.updatedAt) || toDateValue(b.createdAt)
            return aScore - bScore
        })
}

const getExistingPrice = (product = {}) => {
    const price = toNumber(product.price)
    if (Number.isFinite(price)) return price
    return toNumber(product.lastTrackedPrice) || toNumber(product.lastPrice) || 0
}

export const publishMissingProductsToTelegram = async (dbAdmin, config, options = {}) => {
    const hasExplicitLimit = options.limit !== undefined && options.limit !== null && options.limit !== ''
    const limit = hasExplicitLimit
        ? Math.max(1, Number.parseInt(options.limit, 10) || DEFAULT_TELEGRAM_MANAGER.maxPerRun)
        : Number.POSITIVE_INFINITY
    const delayMs = Math.max(0, Number.parseInt(options.delayMs ?? config.delayMs ?? DEFAULT_TELEGRAM_MANAGER.delayMs, 10) || 0)
    const products = await getTrackedProducts(dbAdmin)
    const candidates = products.filter((product) => !product.telegramPublishedAt)
    const selected = Number.isFinite(limit) ? candidates.slice(0, limit) : candidates

    const summary = {
        checked: selected.length,
        published: 0,
        failed: 0,
        alertsSent: 0,
        updated: 0,
    }

    for (let index = 0; index < selected.length; index += 1) {
        const product = selected[index]
        try {
            const { text, image } = buildProductMessage(config, product, { templateType: 'catalog' })
            const sent = image ? await sendTelegramPhoto(config, image, text) : await sendTelegramText(config, text)

            await dbAdmin.collection('products').doc(product.id).set({
                telegramPublishedAt: new Date(),
                telegramPublishedMessageId: sent?.message_id || null,
                telegramPublishedChatId: getCredentials(config).chatId,
            }, { merge: true })

            await recordTelegramMessage(dbAdmin, {
                type: 'catalog_post',
                productId: product.id,
                productTitle: product.title || product.name || 'Untitled product',
                status: 'success',
                message: 'Published product to Telegram channel.',
                sourceUrl: product.affiliateUrl || product.affiliate_url || null,
            })

            summary.published += 1
        } catch (error) {
            summary.failed += 1
            await recordTelegramMessage(dbAdmin, {
                type: 'catalog_post',
                productId: product.id,
                productTitle: product.title || product.name || 'Untitled product',
                status: 'failed',
                message: error.message || 'Failed to publish product to Telegram.',
                sourceUrl: product.affiliateUrl || product.affiliate_url || null,
            })
        }

        if (delayMs > 0 && index < selected.length - 1) {
            await sleep(delayMs)
        }
    }

    return { summary, publishedCount: summary.published, selectedCount: selected.length }
}

export const runTelegramPriceTracker = async (dbAdmin, config, options = {}) => {
    const limit = Math.max(1, Number.parseInt(options.limit ?? config.maxPerRun ?? DEFAULT_TELEGRAM_MANAGER.maxPerRun, 10) || DEFAULT_TELEGRAM_MANAGER.maxPerRun)
    const delayMs = Math.max(0, Number.parseInt(options.delayMs ?? config.delayMs ?? DEFAULT_TELEGRAM_MANAGER.delayMs, 10) || 0)
    const products = await getTrackedProducts(dbAdmin)
    const selected = products.slice(0, limit)
    const runId = options.runId || `telegram_run_${Date.now()}`

    const summary = {
        checked: 0,
        updated: 0,
        alertsSent: 0,
        failed: 0,
        published: 0,
        runId,
    }

    const runLogs = []

    for (let index = 0; index < selected.length; index += 1) {
        const product = selected[index]
        summary.checked += 1
        const sourceUrl = product.affiliateUrl || product.affiliate_url || ''

        try {
            const scraped = await scrapeAmazonProduct(sourceUrl)
            const nextPrice = toNumber(scraped.price)
            const currentPrice = getExistingPrice(product)
            const dropAmount = currentPrice > 0 && nextPrice !== null ? currentPrice - nextPrice : 0
            const dropPercent = currentPrice > 0 && dropAmount > 0 ? Math.round((dropAmount / currentPrice) * 100) : 0
            const shouldAlert = dropAmount > 0 && dropPercent >= (Number.parseFloat(config.minimumPriceDropPercent) || 0)

            const updateData = {
                title: scraped.title || product.title || product.name || '',
                price: nextPrice ?? currentPrice,
                originalPrice: toNumber(scraped.originalPrice) ?? toNumber(product.originalPrice) ?? toNumber(product.original_price) ?? null,
                original_price: toNumber(scraped.originalPrice) ?? toNumber(product.originalPrice) ?? toNumber(product.original_price) ?? null,
                affiliateUrl: product.affiliateUrl || product.affiliate_url || scraped.affiliateUrl,
                affiliate_url: product.affiliateUrl || product.affiliate_url || scraped.affiliateUrl,
                imageUrls: Array.isArray(scraped.imageUrls) && scraped.imageUrls.length > 0 ? scraped.imageUrls : (product.imageUrls || product.image_urls || []),
                image_urls: Array.isArray(scraped.imageUrls) && scraped.imageUrls.length > 0 ? scraped.imageUrls : (product.imageUrls || product.image_urls || []),
                updatedAt: new Date(),
                amazonSyncedAt: new Date(),
                telegramTrackedAt: new Date(),
                telegramLastTrackedPrice: nextPrice ?? currentPrice,
                telegramLastTrackedAt: new Date(),
                telegramPriceDrop: shouldAlert ? {
                    oldPrice: currentPrice,
                    newPrice: nextPrice,
                    dropAmount,
                    dropPercent,
                    detectedAt: new Date(),
                } : null,
            }

            await dbAdmin.collection('products').doc(product.id).set(updateData, { merge: true })

            let alertStatus = 'skipped'
            let alertMessage = 'Price checked.'

            if (shouldAlert) {
                const templateProduct = {
                    ...product,
                    title: scraped.title || product.title || product.name || 'Product',
                    price: nextPrice,
                }
                const { text: caption } = buildProductMessage(config, templateProduct, {
                    templateType: 'priceDrop',
                    priceDrop: {
                        oldPrice: currentPrice,
                        newPrice: nextPrice,
                        dropAmount,
                        dropPercent,
                    },
                })

                const image = productImage(product)
                const sent = image ? await sendTelegramPhoto(config, image, caption) : await sendTelegramText(config, caption)
                alertStatus = 'success'
                alertMessage = 'Price drop announced on Telegram.'
                summary.alertsSent += 1

                await recordTelegramMessage(dbAdmin, {
                    type: 'price_drop',
                    productId: product.id,
                    productTitle: scraped.title || product.title || product.name || 'Untitled product',
                    status: 'success',
                    message: alertMessage,
                    sourceUrl,
                    oldPrice: currentPrice,
                    newPrice: nextPrice,
                    dropAmount,
                    dropPercent,
                    telegramMessageId: sent?.message_id || null,
                })
            }

            await recordTelegramMessage(dbAdmin, {
                type: 'price_check',
                productId: product.id,
                productTitle: scraped.title || product.title || product.name || 'Untitled product',
                status: 'success',
                message: alertMessage,
                sourceUrl,
                oldPrice: currentPrice,
                newPrice: nextPrice,
                dropAmount,
                dropPercent,
            })

            summary.updated += 1
            runLogs.push({
                productId: product.id,
                productTitle: scraped.title || product.title || product.name || 'Untitled product',
                status: alertStatus,
                message: alertMessage,
                oldPrice: currentPrice,
                newPrice: nextPrice,
                dropAmount,
                dropPercent,
            })
        } catch (error) {
            summary.failed += 1
            const log = {
                productId: product.id,
                productTitle: product.title || product.name || 'Untitled product',
                status: 'failed',
                message: error.message || 'Failed to check price.',
            }
            runLogs.push(log)
            await recordTelegramMessage(dbAdmin, {
                type: 'price_check',
                productId: product.id,
                productTitle: product.title || product.name || 'Untitled product',
                status: 'failed',
                message: error.message || 'Failed to check price.',
                sourceUrl,
            })
        }

        if (delayMs > 0 && index < selected.length - 1) {
            await sleep(delayMs)
        }
    }

    await dbAdmin.collection(telegramRunCollection).add({
        runId,
        createdAt: new Date(),
        summary,
        logCount: runLogs.length,
    })

    await saveTelegramManagerConfig(dbAdmin, {
        lastRunAt: new Date(),
        lastRunSummary: summary,
    })

    return { runId, summary, runLogs }
}

export const sendTelegramTestMessage = async (config, options = {}) => {
    const override = String(options?.testMessage || '').trim()
    const source = override || config?.templates?.test || DEFAULT_TELEGRAM_MANAGER.templates.test
    const message = renderTemplate(source, {
        adminUrl: absoluteUrl('/admin/integrations'),
    }) || '<b>TEKPIK Telegram Test</b>\nTelegram integration is connected and ready.'

    const result = await sendTelegramText(config, message)
    return { result, message }
}

export const sendTelegramManualMessage = async (config, payload = {}) => {
    const manualText = String(payload?.message || '').trim()
    const templateKey = String(payload?.templateKey || '').trim()
    const templateVariables = payload?.variables && typeof payload.variables === 'object' ? payload.variables : {}
    const selectedProduct = payload?.product && typeof payload.product === 'object' ? payload.product : null
    const includeImage = payload?.includeImage !== false

    let message = manualText

    if (!message && templateKey) {
        const customTemplates = Array.isArray(config?.templates?.customTemplates) ? config.templates.customTemplates : []
        const customTemplate = customTemplates.find((item) => item.key === templateKey)
        const builtInTemplate = config?.templates?.[templateKey]
        const sourceTemplate = customTemplate?.body || builtInTemplate || ''
        const productVariables = selectedProduct ? buildTemplateVariables(selectedProduct, {}) : {}
        message = renderTemplate(sourceTemplate, {
            ...productVariables,
            ...templateVariables,
        })
    }

    if (!message.trim()) {
        throw new Error('Message is empty. Enter message text or choose a valid template.')
    }

    const imageUrl = selectedProduct ? productImage(selectedProduct) : ''
    const result = includeImage && imageUrl
        ? await sendTelegramPhoto(config, imageUrl, message)
        : await sendTelegramText(config, message)

    return {
        result,
        message,
        usedImage: Boolean(includeImage && imageUrl),
        imageUrl: imageUrl || null,
    }
}

export const getTelegramManagerStats = async (dbAdmin) => {
    const [productsSnap, messagesSnap, runsSnap] = await Promise.all([
        dbAdmin.collection('products').where('isActive', '==', true).get(),
        dbAdmin.collection(telegramMessageCollection).orderBy('createdAt', 'desc').limit(50).get(),
        dbAdmin.collection(telegramRunCollection).orderBy('createdAt', 'desc').limit(20).get(),
    ])

    const stats = {
        activeProducts: 0,
        publishedProducts: 0,
        pendingCatalogPosts: 0,
        lastMessages: [],
        recentRuns: [],
    }

    productsSnap.forEach((doc) => {
        const data = doc.data() || {}
        stats.activeProducts += 1
        if (data.telegramPublishedAt) stats.publishedProducts += 1
    })

    stats.pendingCatalogPosts = Math.max(0, stats.activeProducts - stats.publishedProducts)

    messagesSnap.forEach((doc) => {
        const data = doc.data() || {}
        stats.lastMessages.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt || null,
        })
    })

    runsSnap.forEach((doc) => {
        const data = doc.data() || {}
        stats.recentRuns.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt || null,
        })
    })

    return stats
}

export { DEFAULT_TELEGRAM_MANAGER }

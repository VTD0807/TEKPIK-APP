import { NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/firebase-admin'
import { scrapeAmazonProduct } from '@/lib/amazon-scraper'
import { sendTelegramMessage, sendTelegramPhoto, formatProductReply, logTelegramImport } from '@/lib/telegram-bot-utils'
import { readTelegramManagerConfig, sendTelegramManualMessage } from '@/lib/telegram-manager'

export const dynamic = 'force-dynamic'

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''
const TELEGRAM_BOT_OWNER_ID = process.env.TELEGRAM_BOT_OWNER_ID || ''

/**
 * Check if user is the bot owner (PRIVATE BOT)
 */
function isOwner(userId) {
    if (!TELEGRAM_BOT_OWNER_ID) {
        console.warn('⚠️ TELEGRAM_BOT_OWNER_ID not configured - BOT IS PUBLIC!')
        return true
    }
    const match = String(userId) === String(TELEGRAM_BOT_OWNER_ID)
    if (!match) console.warn(`🚫 Unauthorized: user ${userId}`)
    return match
}
/**
 * Validate that request is from Telegram
 */
function isTelegramRequest(req) {
    const authHeader = req.headers.get('x-telegram-auth')
    // In production, you'd validate the Telegram signature here
    // For now, check if bot token is configured
    return Boolean(TELEGRAM_BOT_TOKEN)
}

/**
 * Check if URL is an Amazon product link
 */
function isAmazonUrl(urlString) {
    try {
        const url = new URL(urlString.startsWith('http') ? urlString : `https://${urlString}`)
        return /amazon\.|amzn\.to/.test(url.hostname)
    } catch {
        return false
    }
}

/**
 * Extract product link from message
 */
function extractUrl(text) {
    const urlMatch = text.match(/https?:\/\/[^\s]+|amzn\.to\/[^\s]+/)
    return urlMatch ? urlMatch[0] : null
}

/**
 * Generate unique product ID
 */
function generateProductId() {
    return `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * POST: Telegram sends updates here
 */
export async function POST(req) {
    if (!dbAdmin) {
        return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })
    }

    if (!isTelegramRequest(req)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    try {
        const update = await req.json()
        const message = update.message || update.channel_post

        if (!message || !message.text) {
            return NextResponse.json({ ok: true })
        }

        const { chat, from, text, message_id } = message
        const chatId = chat.id
        const userId = from.id
        const username = from.username || from.first_name || 'User'

        // PRIVATE BOT - Owner only!
        if (!isOwner(userId)) {
            await sendTelegramMessage(chatId, `❌ <b>Access Denied</b>\n\nThis is a <b>private bot</b> for admin use only.`, { reply_to_message_id: message_id })
            return NextResponse.json({ ok: true })
        }

        // Extract URL from message
        const url = extractUrl(text)

        // Check if it's a command
        if (text.startsWith('/')) {
            if (text === '/start') {
                await sendTelegramMessage(chatId, `
👋 <b>TEKPIK Admin Bot</b>

Your private bot for managing TEKPIK products.

<b>Quick Start:</b>
1️⃣ Send Amazon link → imports product
2️⃣ /help → see commands
3️⃣ /stats → view stats

<b>Commands:</b> /help, /stats, /list, /update, /search, /info

✨ <b>Reply includes:</b>
• Product title
• Original and current price
• Discount percentage
• Product image
• Link to view on TEKPIK

Just send a link and I'll handle the rest! 🚀
                `)
                return NextResponse.json({ ok: true })
            }

            // /help
            if (text === '/help') {
                await sendTelegramMessage(chatId, `
📖 <b>Commands</b>

<b>📥 Import:</b> Just send Amazon link
<b>/help</b> - Show this message
<b>/stats</b> - Import statistics
<b>/list [n]</b> - Show last n imports
<b>/search TERM</b> - Search products
<b>/update ASIN</b> - Update product
<b>/info ID</b> - Product details
                `)
                return NextResponse.json({ ok: true })
            }

            // /info
            if (text.startsWith('/info')) {
                const productId = text.replace(/^\/info(?:@\w+)?(?:\s+)?/i, '').trim()
                if (!productId) {
                    await sendTelegramMessage(chatId, `Usage: /info PRODUCT_ID`)
                    return NextResponse.json({ ok: true })
                }

                const productSnap = await dbAdmin.collection('products').doc(productId).get()
                if (!productSnap.exists) {
                    await sendTelegramMessage(chatId, `❌ Product ${productId} not found`)
                    return NextResponse.json({ ok: true })
                }

                const product = { id: productSnap.id, ...productSnap.data() }
                const price = Number(product.price || 0)
                const originalPrice = Number(product.originalPrice || product.original_price || 0)
                const discount = Number(product.discount || 0)

                await sendTelegramMessage(chatId, `
ℹ️ <b>Product Info</b>

<b>${product.title || product.name || 'Untitled Product'}</b>

💰 Price: ₹${price.toLocaleString('en-IN')}
${originalPrice > 0 ? `📌 Original: ₹${originalPrice.toLocaleString('en-IN')}\n` : ''}${discount > 0 ? `🏷️ Discount: ${discount}%\n` : ''}🔗 ID: <code>${product.id}</code>
${product.asin ? `🆔 ASIN: <code>${product.asin}</code>\n` : ''}📍 <a href="https://tekpik.in/products/${product.id}">View on TEKPIK</a>
                `)
                return NextResponse.json({ ok: true })
            }

            // /stats
            if (text === '/stats') {
                const snap = await dbAdmin.collection('telegram_imports').get()
                const success = snap.docs.filter(d => d.data().status === 'success').length
                const failed = snap.docs.filter(d => d.data().status === 'failed').length
                const rate = snap.size > 0 ? Math.round((success / snap.size) * 100) : 0

                await sendTelegramMessage(chatId, `
📊 <b>Statistics</b>

✅ Successful: ${success}
❌ Failed: ${failed}
📈 Rate: ${rate}%
                `)
                return NextResponse.json({ ok: true })
            }

            // /list
            if (text.startsWith('/list')) {
                const limit = Number(text.split(' ')[1]) || 10
                const snap = await dbAdmin.collection('telegram_imports').orderBy('createdAt', 'desc').limit(limit).get()
                let list = ''
                let index = 0
                snap.forEach((doc) => {
                    index += 1
                    const d = doc.data()
                    const icon = d.status === 'success' ? '✅' : '❌'
                    const title = (d.message || '').replace('Added: ', '').substring(0, 35)
                    list += `${index}. ${icon} ${title}\n`
                })
                await sendTelegramMessage(chatId, `📋 <b>Last ${Math.min(limit, snap.size)}</b>\n\n${list || 'No imports'}`)
                return NextResponse.json({ ok: true })
            }

            // /search
            if (text.startsWith('/search')) {
                const query = text.replace(/^\/search(?:@\w+)?(?:\s+)?/i, '').trim().toLowerCase()
                if (!query) {
                    await sendTelegramMessage(chatId, `Usage: /search KEYWORD`)
                    return NextResponse.json({ ok: true })
                }
                const snap = await dbAdmin.collection('products').limit(100).get()
                const results = snap.docs.filter(d => {
                    const title = (d.data().title || '').toLowerCase()
                    return title.includes(query)
                }).slice(0, 10)

                let list = ''
                results.forEach((doc, i) => {
                    const d = doc.data()
                    list += `${i + 1}. <b>${d.title || 'Unknown'}</b> - ₹${d.price}\n`
                })
                await sendTelegramMessage(chatId, `🔍 <b>Results: "${query}"</b>\n\n${list || 'No products found'}`)
                return NextResponse.json({ ok: true })
            }

            // /update - Update existing product
            if (text.startsWith('/update')) {
                const asn = text.replace(/^\/update(?:@\w+)?(?:\s+)?/i, '').trim().toUpperCase()
                if (!asn) {
                    await sendTelegramMessage(chatId, `Usage: /update ASIN`)
                    return NextResponse.json({ ok: true })
                }

                await sendTelegramMessage(chatId, '⏳ Updating...')
                try {
                    const snap = await dbAdmin.collection('products').where('asin', '==', asn).limit(1).get()
                    if (snap.size === 0) {
                        await sendTelegramMessage(chatId, `❌ Product ${asn} not found`)
                        return NextResponse.json({ ok: true })
                    }

                    const doc = snap.docs[0]
                    const product = doc.data()
                    const url = product.affiliateUrl || product.affiliate_url

                    if (!url) {
                        await sendTelegramMessage(chatId, `❌ No affiliate URL`)
                        return NextResponse.json({ ok: true })
                    }

                    const scraped = await scrapeAmazonProduct(url)
                    const discount = scraped.originalPrice && scraped.price ? Math.max(0, Math.round((1 - (scraped.price / scraped.originalPrice)) * 100)) : 0

                    const updateData = {
                        title: scraped.title || product.title,
                        price: scraped.price,
                        originalPrice: scraped.originalPrice,
                        discount,
                        imageUrls: scraped.imageUrls || product.imageUrls,
                        updatedAt: new Date(),
                    }

                    await dbAdmin.collection('products').doc(doc.id).update(updateData)

                    const msg = `✅ Updated\n\n<b>${updateData.title}</b>\n💰 ₹${(updateData.price || 0).toLocaleString()}\n🏷️ ${discount}%`
                    await sendTelegramMessage(chatId, msg)
                } catch (err) {
                    await sendTelegramMessage(chatId, `❌ Error: ${err.message}`)
                }
                return NextResponse.json({ ok: true })
            }

            await sendTelegramMessage(chatId, `❓ Unknown command - type /help`)
            return NextResponse.json({ ok: true })
        }

        // Not a URL - inform user
        if (!url) {
            await sendTelegramMessage(chatId, `
❌ No link found in your message.

Please send an Amazon product link:
• <code>https://amazon.in/dp/B0XXXXX</code>
• <code>amzn.to/xxx</code>

Type /help for more info.
            `)
            return NextResponse.json({ ok: true })
        }

        // Check if it's an Amazon URL
        if (!isAmazonUrl(url)) {
            await sendTelegramMessage(chatId, `
❌ This doesn't look like an Amazon link.

Send an Amazon product link:
• <code>amazon.in/dp/ASIN</code>
• <code>amzn.to/xxx</code>
            `)
            return NextResponse.json({ ok: true })
        }

        // Send "processing" message
        const processingMsg = await sendTelegramMessage(
            chatId,
            '⏳ Processing your link... Please wait!',
            { reply_to_message_id: message_id }
        )

        try {
            // Scrape product from Amazon
            let scraped
            try {
                scraped = await scrapeAmazonProduct(url)
            } catch (scrapeErr) {
                await sendTelegramMessage(
                    chatId,
                    `❌ <b>Failed to fetch product</b>\n\n${scrapeErr.message}\n\nMake sure it's a valid Amazon product link.`,
                    { reply_to_message_id: message_id }
                )
                await logTelegramImport(dbAdmin, {
                    chatId,
                    userId,
                    sourceUrl: url,
                    status: 'failed',
                    message: scrapeErr.message,
                })
                return NextResponse.json({ ok: true })
            }

            // Generate product ID
            const productId = generateProductId()

            // Prepare product document
            const productData = {
                id: productId,
                name: scraped.title || 'Untitled Product',
                title: scraped.title || 'Untitled Product',
                description: scraped.descriptionHtml || '',
                price: scraped.price || 0,
                originalPrice: scraped.originalPrice || null,
                discount: scraped.originalPrice && scraped.price
                    ? Math.max(0, Math.round((1 - (scraped.price / scraped.originalPrice)) * 100))
                    : 0,
                imageUrls: scraped.imageUrls || [],
                image_urls: scraped.imageUrls || [],
                imageUrl: scraped.imageUrls?.[0] || '',
                affiliateUrl: url,
                affiliate_url: url,
                asin: scraped.asin || null,
                rating: 0,
                reviews: 0,
                amazonRatingText: scraped.ratingText || '',
                amazonReviewsText: scraped.reviewsText || '',
                isActive: true,
                is_active: true,
                category: 'Imported',
                createdBy: 'telegram_bot',
                createdByUser: userId,
                createdAt: new Date(),
                updatedAt: new Date(),
                amazonSyncedAt: new Date(),
                amazonSyncSource: url,
                amazonSyncStatus: 'success',
            }

            // Save to Firestore
            await dbAdmin.collection('products').doc(productId).set(productData)

            // Publish new product into the configured Telegram channel
            try {
                const telegramManagerConfig = await readTelegramManagerConfig(dbAdmin)
                if (telegramManagerConfig.enabled && telegramManagerConfig.publishNewProducts) {
                    const channelResult = await sendTelegramManualMessage(telegramManagerConfig, {
                        templateKey: 'catalog',
                        product: {
                            ...productData,
                            productUrl: `https://tekpik.in/products/${productId}`,
                        },
                        includeImage: true,
                    })

                    await dbAdmin.collection('telegram_channel_messages').add({
                        type: 'auto_import',
                        status: 'success',
                        message: 'Published imported product to Telegram channel.',
                        preview: String(channelResult?.message || '').slice(0, 500),
                        templateKey: 'catalog',
                        productId,
                        imageSent: Boolean(channelResult?.usedImage),
                        createdAt: new Date(),
                    })
                }
            } catch (channelErr) {
                await dbAdmin.collection('telegram_channel_messages').add({
                    type: 'auto_import',
                    status: 'failed',
                    message: channelErr.message || 'Failed to publish imported product to Telegram channel.',
                    productId,
                    createdAt: new Date(),
                }).catch(() => {})
                console.warn('Failed to publish imported product to Telegram channel:', channelErr)
            }

            // Notify admins of new product
            try {
                const adminsSnap = await dbAdmin.collection('users').where('role', '==', 'ADMIN').get()
                if (adminsSnap.size > 0) {
                    const adminIds = adminsSnap.docs.map(d => d.id)
                    await dbAdmin.collection('admin_notifications').add({
                        title: '📦 New Product Imported',
                        message: `${scraped.title} added via Telegram (@${username})`,
                        attachedProduct: {
                            id: productId,
                            title: scraped.title,
                            imageUrl: scraped.imageUrls?.[0],
                            price: scraped.price,
                        },
                        targetType: 'role',
                        role: 'ADMIN',
                        sentCount: adminIds.length,
                        createdAt: new Date(),
                    })
                }
            } catch (notifyErr) {
                console.warn('Failed to notify admins:', notifyErr)
            }

            // Log successful import
            await logTelegramImport(dbAdmin, {
                chatId,
                userId,
                productId,
                sourceUrl: url,
                status: 'success',
                message: `Added: ${scraped.title}`,
            })

            // Format and send reply
            const caption = formatProductReply(productData)

            // Send photo if available
            if (scraped.imageUrls?.[0]) {
                await sendTelegramPhoto(chatId, scraped.imageUrls[0], caption, {
                    reply_to_message_id: message_id,
                })
            } else {
                await sendTelegramMessage(chatId, caption, {
                    reply_to_message_id: message_id,
                })
            }

            // Try to delete processing message
            if (processingMsg?.result?.message_id) {
                fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: chatId,
                        message_id: processingMsg.result.message_id,
                    }),
                }).catch(() => {}) // Ignore errors
            }
        } catch (error) {
            console.error('[telegram-import-bot]', error)
            await sendTelegramMessage(
                chatId,
                `❌ <b>Error adding product</b>\n\n<code>${error.message}</code>`,
                { reply_to_message_id: message_id }
            )

            await logTelegramImport(dbAdmin, {
                chatId,
                userId,
                sourceUrl: url,
                status: 'error',
                message: error.message,
            })
        }

        return NextResponse.json({ ok: true })
    } catch (error) {
        console.error('[telegram-webhook]', error)
        return NextResponse.json({ ok: true })
    }
}

/**
 * GET: Webhook health check or setup
 */
export async function GET(req) {
    const { searchParams } = new URL(req.url)
    const action = searchParams.get('action')

    // Setup webhook (requires TELEGRAM_BOT_TOKEN and webhook URL)
    if (action === 'setup') {
        const webhookUrl = searchParams.get('webhookUrl')
        
        if (!TELEGRAM_BOT_TOKEN || !webhookUrl) {
            return NextResponse.json({
                error: 'Missing TELEGRAM_BOT_TOKEN or webhookUrl',
                required: ['TELEGRAM_BOT_TOKEN env var', 'webhookUrl query param'],
            }, { status: 400 })
        }

        try {
            const response = await fetch(
                `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: webhookUrl }),
                }
            )

            const data = await response.json()
            return NextResponse.json(data)
        } catch (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }
    }

    // Check webhook info
    if (action === 'info') {
        if (!TELEGRAM_BOT_TOKEN) {
            return NextResponse.json({ error: 'Telegram bot token not configured' }, { status: 400 })
        }

        try {
            const response = await fetch(
                `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo`
            )
            const data = await response.json()
            return NextResponse.json(data)
        } catch (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }
    }

    return NextResponse.json({
        status: 'ok',
        message: 'Telegram import bot webhook is active',
        endpoints: {
            setup: '/api/webhooks/telegram-import-bot?action=setup&webhookUrl=YOUR_URL',
            info: '/api/webhooks/telegram-import-bot?action=info',
        },
    })
}

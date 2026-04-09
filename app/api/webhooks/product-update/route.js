import { NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/firebase-admin'
import { sendTelegramPhoto, sendTelegramText, buildProductMessage as buildTelegramMessage, recordTelegramMessage } from '@/lib/telegram-manager'
import { readTelegramManagerConfig } from '@/lib/telegram-manager'

export const dynamic = 'force-dynamic'

/**
 * Webhook endpoint: Called whenever a product is updated (CMS, Admin, or Auto-Scraper)
 * Checks for price drops and immediately posts to Telegram if configured
 */
export async function POST(req) {
    if (!dbAdmin) {
        return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })
    }

    try {
        const body = await req.json().catch(() => ({}))
        const { productId, previousData, currentData, source } = body

        if (!productId || !currentData) {
            return NextResponse.json({ error: 'productId and currentData required' }, { status: 400 })
        }

        // Get Telegram config
        const config = await readTelegramManagerConfig(dbAdmin)
        if (!config.enabled || !config.priceTrackerEnabled) {
            return NextResponse.json({ skipped: true, reason: 'Telegram tracking disabled' })
        }

        // Get full product doc
        const productDoc = await dbAdmin.collection('products').doc(productId).get()
        if (!productDoc.exists) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 })
        }

        const product = { id: productDoc.id, ...productDoc.data() }
        const previousPrice = previousData?.price || currentData?.price || 0
        const currentPrice = currentData?.price || 0
        const previousDiscount = previousData?.discount || 0
        const currentDiscount = currentData?.discount || 0

        // Check if price dropped
        const priceDrop = previousPrice > currentPrice ? previousPrice - currentPrice : 0
        const discountIncrease = currentDiscount > previousDiscount ? currentDiscount - previousDiscount : 0
        const dropPercent = previousPrice > 0 ? Math.round((priceDrop / previousPrice) * 100) : 0

        // Only notify if price dropped significantly
        const minDropPercent = Number.parseFloat(config.minimumPriceDropPercent) || 0
        if (dropPercent < minDropPercent && discountIncrease === 0) {
            return NextResponse.json({ 
                skipped: true, 
                reason: `Price drop ${dropPercent}% below minimum ${minDropPercent}%` 
            })
        }

        // Build and send Telegram alert
        const templateProduct = {
            ...product,
            title: currentData?.title || product.title || 'Product',
            price: currentPrice,
            originalPrice: currentData?.originalPrice || product.originalPrice,
        }

        const { text: caption } = buildTelegramMessage(config, templateProduct, {
            templateType: 'priceDrop',
            priceDrop: {
                oldPrice: previousPrice,
                newPrice: currentPrice,
                dropAmount: priceDrop,
                dropPercent,
            },
        })

        const imageUrl = (Array.isArray(currentData?.imageUrls) ? currentData.imageUrls[0] : null) 
            || (Array.isArray(product.imageUrls) ? product.imageUrls[0] : null)
            || product.imageUrl 
            || ''

        let telegramSent = null
        if (imageUrl) {
            try {
                telegramSent = await sendTelegramPhoto(config, imageUrl, caption)
            } catch (photoErr) {
                console.warn('Failed to send photo, falling back to text:', photoErr.message)
                telegramSent = await sendTelegramText(config, caption)
            }
        } else {
            telegramSent = await sendTelegramText(config, caption)
        }

        // Record message
        await recordTelegramMessage(dbAdmin, {
            type: 'product_updated',
            productId: product.id,
            productTitle: templateProduct.title,
            status: 'success',
            message: `Price drop detected: ₹${previousPrice} → ₹${currentPrice} (${dropPercent}%)`,
            sourceUrl: product.affiliateUrl || product.productUrl,
            oldPrice: previousPrice,
            newPrice: currentPrice,
            dropAmount: priceDrop,
            dropPercent,
            source,
            telegramMessageId: telegramSent?.message_id || null,
        })

        // Update product with drop info
        await dbAdmin.collection('products').doc(productId).set({
            telegramPriceDrop: {
                oldPrice: previousPrice,
                newPrice: currentPrice,
                dropAmount: priceDrop,
                dropPercent,
                detectedAt: new Date(),
                source,
            },
            telegramLastNotifiedAt: new Date(),
        }, { merge: true })

        return NextResponse.json({
            success: true,
            message: 'Price drop notification sent',
            dropPercent,
            priceDrop,
            telegramMessageId: telegramSent?.message_id || null,
        })
    } catch (error) {
        console.error('[product-update-webhook]', error)
        return NextResponse.json({ error: error.message || 'Webhook processing failed' }, { status: 500 })
    }
}

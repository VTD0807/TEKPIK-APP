/**
 * Telegram Bot Utilities
 * Handle communication with Telegram Bot API
 */

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''
const TELEGRAM_API = 'https://api.telegram.org/bot'

export const isTelegramBotConfigured = () => {
    return Boolean(TELEGRAM_BOT_TOKEN)
}

/**
 * Send a message via Telegram bot
 */
export async function sendTelegramMessage(chatId, text, options = {}) {
    if (!TELEGRAM_BOT_TOKEN) {
        console.warn('Telegram bot token not configured')
        return null
    }

    try {
        const response = await fetch(`${TELEGRAM_API}${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text,
                parse_mode: 'HTML',
                ...options,
            }),
        })

        if (!response.ok) {
            const error = await response.json()
            console.error('Telegram sendMessage error:', error)
            return null
        }

        return await response.json()
    } catch (error) {
        console.error('Telegram request error:', error)
        return null
    }
}

/**
 * Send a photo with caption via Telegram bot
 */
export async function sendTelegramPhoto(chatId, photoUrl, caption, options = {}) {
    if (!TELEGRAM_BOT_TOKEN) {
        console.warn('Telegram bot token not configured')
        return null
    }

    try {
        const response = await fetch(`${TELEGRAM_API}${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                photo: photoUrl,
                caption,
                parse_mode: 'HTML',
                ...options,
            }),
        })

        if (!response.ok) {
            const error = await response.json()
            console.error('Telegram sendPhoto error:', error)
            return null
        }

        return await response.json()
    } catch (error) {
        console.error('Telegram request error:', error)
        return null
    }
}

/**
 * Format product info for Telegram reply
 */
export function formatProductReply(product) {
    const lines = [
        `<b>✅ Product Added!</b>`,
        '',
        `<b>${product.title || 'Untitled'}</b>`,
        '',
        `💰 <b>Price:</b> ₹${(product.price || 0).toLocaleString('en-IN')}`,
    ]

    if (product.originalPrice && product.originalPrice > product.price) {
        lines.push(`📌 <b>Original:</b> ₹${(product.originalPrice).toLocaleString('en-IN')}`)
    }

    if (product.discount > 0) {
        lines.push(`🏷️ <b>Discount:</b> ${product.discount}%`)
    }

    if (product.asin) {
        lines.push(`🔗 <b>ASIN:</b> <code>${product.asin}</code>`)
    }

    lines.push('')
    lines.push(`📍 <a href="https://tekpik.in/products/${product.id}">View on TEKPIK</a>`)

    return lines.join('\n')
}

/**
 * Log import action
 */
export async function logTelegramImport(dbAdmin, data = {}) {
    try {
        await dbAdmin.collection('telegram_imports').add({
            chatId: data.chatId,
            userId: data.userId,
            productId: data.productId,
            sourceUrl: data.sourceUrl,
            status: data.status,
            message: data.message,
            createdAt: new Date(),
        })
    } catch (error) {
        console.error('Failed to log telegram import:', error)
    }
}

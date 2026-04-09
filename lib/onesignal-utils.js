/**
 * OneSignal utility functions
 * Handles web push notifications to users
 */

const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY || ''
const ONESIGNAL_APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || ''
const ONESIGNAL_API_URL = 'https://onesignal.com/api/v1'

export const isOneSignalConfigured = () => {
    return Boolean(ONESIGNAL_REST_API_KEY && ONESIGNAL_APP_ID)
}

/**
 * Send a web push notification via OneSignal
 * @param {Object} config - Configuration
 * @param {string} config.heading - Notification title
 * @param {string} config.content - Notification content
 * @param {string[]} config.externalUserIds - Array of user IDs to send to (Firebase UIDs)
 * @param {string} config.bigImage - Large image URL
 * @param {string} config.largeIcon - Icon URL
 * @param {Object} config.data - Custom data object
 * @param {string[]} config.includedSegments - Segments to target
 * @returns {Promise<{success: boolean, notificationId: string, error?: string}>}
 */
export async function sendOneSignalPush(config = {}) {
    if (!isOneSignalConfigured()) {
        console.warn('OneSignal is not configured')
        return { success: false, error: 'OneSignal not configured' }
    }

    const payload = {
        app_id: ONESIGNAL_APP_ID,
        headings: { en: String(config.heading || 'TEKPIK') },
        contents: { en: String(config.content || '') },
    }

    // Add optional fields
    if (config.bigImage) payload.big_picture = config.bigImage
    if (config.largeIcon) payload.large_icon = config.largeIcon
    if (config.data && typeof config.data === 'object') {
        payload.data = config.data
    }

    // Set target
    if (config.externalUserIds && Array.isArray(config.externalUserIds) && config.externalUserIds.length > 0) {
        payload.include_external_user_ids = config.externalUserIds
    } else if (config.includedSegments && Array.isArray(config.includedSegments) && config.includedSegments.length > 0) {
        payload.included_segments = config.includedSegments
    } else {
        // Default to all users
        payload.included_segments = ['All']
    }

    try {
        const response = await fetch(`${ONESIGNAL_API_URL}/notifications`, {
            method: 'POST',
            headers: {
                Authorization: `Basic ${ONESIGNAL_REST_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        })

        const data = await response.json()

        if (!response.ok) {
            const error = data.errors?.[0] || `OneSignal error: ${response.status}`
            console.error('[OneSignal Error]', error)
            return { success: false, error }
        }

        return {
            success: true,
            notificationId: data.body?.notification_id || data.id || null,
        }
    } catch (error) {
        console.error('[OneSignal Request Error]', error)
        return { success: false, error: error.message }
    }
}

/**
 * Send a price drop alert
 */
export async function sendPriceDropAlert(userIds = [], product = {}, priceInfo = {}) {
    return sendOneSignalPush({
        heading: '💰 Price Drop Alert!',
        content: `${product.title || 'Product'} dropped from ₹${priceInfo.oldPrice} to ₹${priceInfo.newPrice}!`,
        bigImage: product.imageUrls?.[0] || product.imageUrl,
        largeIcon: product.imageUrls?.[0] || product.imageUrl,
        externalUserIds: userIds,
        data: {
            type: 'price_drop',
            productId: product.id,
            oldPrice: String(priceInfo.oldPrice),
            newPrice: String(priceInfo.newPrice),
            dropPercent: String(priceInfo.dropPercent || 0),
        },
    })
}

/**
 * Send a new product alert
 */
export async function sendNewProductAlert(userIds = [], product = {}) {
    return sendOneSignalPush({
        heading: '✨ New Product Added',
        content: `${product.title || 'New product'} is now available at TEKPIK`,
        bigImage: product.imageUrls?.[0] || product.imageUrl,
        largeIcon: product.imageUrls?.[0] || product.imageUrl,
        externalUserIds: userIds,
        data: {
            type: 'new_product',
            productId: product.id,
            price: String(product.price || 0),
        },
    })
}

/**
 * Send a general broadcast notification
 */
export async function broadcastNotification(heading = '', content = '', options = {}) {
    return sendOneSignalPush({
        heading,
        content,
        externalUserIds: options.userIds,
        includedSegments: options.segments || ['All'],
        bigImage: options.imageUrl,
        largeIcon: options.imageUrl,
        data: options.data,
    })
}

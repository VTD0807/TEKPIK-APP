/**
 * Utility to trigger product update webhooks and notifications
 * Call this whenever a product is updated to trigger Telegram alerts if price drops
 */

import { sendPriceDropAlert } from '@/lib/onesignal-utils'

export async function notifyProductUpdate(productId, previousData = {}, currentData = {}, source = 'manual') {
    try {
        // Call the internal webhook for Telegram
        const response = await fetch(
            `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/webhooks/product-update`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productId,
                    previousData,
                    currentData,
                    source,
                }),
            }
        )

        // Also send OneSignal notification if price dropped
        const previousPrice = previousData?.price || currentData?.price || 0
        const currentPrice = currentData?.price || 0
        const priceDrop = previousPrice > currentPrice ? previousPrice - currentPrice : 0
        const dropPercent = previousPrice > 0 ? Math.round((priceDrop / previousPrice) * 100) : 0

        if (priceDrop > 0 && dropPercent >= 5) {
            // Get wishlisted users for this product
            try {
                const wishlistSnap = await fetch(
                    `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/admin/product-wishlists?productId=${productId}`
                ).then(r => r.json())

                const userIds = wishlistSnap?.userIds || []
                if (userIds.length > 0) {
                    await sendPriceDropAlert(userIds, { id: productId, ...currentData }, {
                        oldPrice: previousPrice,
                        newPrice: currentPrice,
                        dropPercent,
                    })
                }
            } catch (err) {
                console.warn('Failed to send OneSignal price drop alert:', err)
            }
        }

        if (!response.ok) {
            console.error(`Product update notification failed: ${response.status}`)
            return null
        }

        return await response.json()
    } catch (error) {
        console.error('Error notifying product update:', error)
        return null
    }
}

/**
 * Extract significant changes from before/after data
 */
export function detectSignificantChanges(previousData, currentData) {
    const changes = {
        title: previousData?.title !== currentData?.title,
        price: previousData?.price !== currentData?.price,
        originalPrice: previousData?.originalPrice !== currentData?.originalPrice,
        discount: previousData?.discount !== currentData?.discount,
        imageUrls: JSON.stringify(previousData?.imageUrls) !== JSON.stringify(currentData?.imageUrls),
        description: previousData?.description !== currentData?.description,
    }

    return {
        hasChanges: Object.values(changes).some(Boolean),
        changes,
    }
}

/**
 * Wrapper for Firestore update that handles notifications
 * Usage: await updateProductWithNotification(dbAdmin, productId, updateData, source)
 */
export async function updateProductWithNotification(dbAdmin, productId, updateData, source = 'manual') {
    try {
        // Get previous data
        const previousDoc = await dbAdmin.collection('products').doc(productId).get()
        const previousData = previousDoc.exists ? previousDoc.data() : {}

        // Update document
        await dbAdmin.collection('products').doc(productId).set(updateData, { merge: true })

        // Trigger notification
        const newData = { ...previousData, ...updateData }
        const significant = detectSignificantChanges(previousData, newData)

        if (significant.hasChanges) {
            await notifyProductUpdate(productId, previousData, newData, source)
        }

        return { success: true, changes: significant.changes }
    } catch (error) {
        console.error('Error in updateProductWithNotification:', error)
        throw error
    }
}

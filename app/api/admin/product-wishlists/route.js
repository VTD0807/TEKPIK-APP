import { NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/firebase-admin'

export const dynamic = 'force-dynamic'

/**
 * Get all users who have wishlisted a specific product
 */
export async function GET(req) {
    if (!dbAdmin) {
        return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })
    }

    try {
        const { searchParams } = new URL(req.url)
        const productId = searchParams.get('productId')

        if (!productId) {
            return NextResponse.json({ error: 'productId required' }, { status: 400 })
        }

        // Get all wishlist entries for this product
        const snap = await dbAdmin.collection('wishlists')
            .where('productId', '==', productId)
            .get()

        const userIds = []
        snap.forEach(doc => {
            const data = doc.data()
            if (data.userId) {
                userIds.push(data.userId)
            }
        })

        // Remove duplicates
        const uniqueUserIds = [...new Set(userIds)]

        return NextResponse.json({
            productId,
            userCount: uniqueUserIds.length,
            userIds: uniqueUserIds,
        })
    } catch (error) {
        console.error('[product-wishlists:get]', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

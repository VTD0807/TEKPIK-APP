import { NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/firebase-admin'

export const dynamic = 'force-dynamic'

export async function GET() {
    if (!dbAdmin) {
        return NextResponse.json({ totalProducts: 0, pendingReviews: 0, wishlistSaves: 0, aiCoverage: { analysed: 0, total: 0 } })
    }

    try {
        const [productsSnap, reviewsSnap, wishlistsSnap, aiSnap] = await Promise.all([
            dbAdmin.collection('products').where('isActive', '==', true).count().get(),
            dbAdmin.collection('reviews').where('isApproved', '==', false).count().get(),
            dbAdmin.collection('wishlists').count().get(),
            dbAdmin.collection('ai_analysis').count().get(),
        ])

        const totalProducts = productsSnap.data().count || 0
        const pendingReviews = reviewsSnap.data().count || 0
        const wishlistSaves = wishlistsSnap.data().count || 0
        const analysedProducts = aiSnap.data().count || 0

        return NextResponse.json({
            totalProducts,
            pendingReviews,
            wishlistSaves,
            aiCoverage: { analysed: analysedProducts, total: totalProducts },
        })
    } catch (err) {
        console.error('[analytics]', err)
        return NextResponse.json({ totalProducts: 0, pendingReviews: 0, wishlistSaves: 0, aiCoverage: { analysed: 0, total: 0 } })
    }
}

import { NextResponse } from 'next/server'
import { dbAdmin, firebaseAdminStatus } from '@/lib/firebase-admin'

export const dynamic = 'force-dynamic'

export async function GET() {
    if (!dbAdmin) {
        return NextResponse.json({
            totalProducts: 0,
            pendingReviews: 0,
            wishlistSaves: 0,
            uniqueVisitors: 0,
            uniquePageVisitors: 0,
            aiCoverage: { analysed: 0, total: 0 },
            _meta: {
                dbReady: false,
                reason: firebaseAdminStatus.error,
            },
        })
    }

    try {
        const [productsSnap, reviewsSnap, wishlistsSnap, aiSnap, uniqueVisitorsSnap, uniquePageVisitorsSnap] = await Promise.all([
            dbAdmin.collection('products').where('isActive', '==', true).count().get(),
            dbAdmin.collection('reviews').where('isApproved', '==', false).count().get(),
            dbAdmin.collection('wishlists').count().get(),
            dbAdmin.collection('ai_analysis').count().get(),
            dbAdmin.collection('analytics_site_unique_visitors').count().get(),
            dbAdmin.collection('analytics_page_unique_visitors').count().get(),
        ])

        const totalProducts = productsSnap.data().count || 0
        const pendingReviews = reviewsSnap.data().count || 0
        const wishlistSaves = wishlistsSnap.data().count || 0
        const analysedProducts = aiSnap.data().count || 0
        const uniqueVisitors = uniqueVisitorsSnap.data().count || 0
        const uniquePageVisitors = uniquePageVisitorsSnap.data().count || 0

        return NextResponse.json({
            totalProducts,
            pendingReviews,
            wishlistSaves,
            uniqueVisitors,
            uniquePageVisitors,
            aiCoverage: { analysed: analysedProducts, total: totalProducts },
            _meta: {
                dbReady: true,
            },
        })
    } catch (err) {
        console.error('[analytics]', err)
        return NextResponse.json({
            totalProducts: 0,
            pendingReviews: 0,
            wishlistSaves: 0,
            uniqueVisitors: 0,
            uniquePageVisitors: 0,
            aiCoverage: { analysed: 0, total: 0 },
            _meta: {
                dbReady: false,
                reason: err?.message || 'Analytics query failed',
            },
        })
    }
}

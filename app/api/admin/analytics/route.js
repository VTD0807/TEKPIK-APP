import { NextResponse } from 'next/server'
import { getAdminDb, getAnalyticsDb, firebaseAdminStatus } from '@/lib/firebase-admin'

export const dynamic = 'force-dynamic'

export async function GET() {
    const db = await getAdminDb()
    const analyticsDb = getAnalyticsDb()
    
    if (!db) {
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
        // Product/content counts from production DB (with failover)
        // Analytics counts from analytics DB (dbUsers — isolated quota)
        const [productsSnap, reviewsSnap, wishlistsSnap, aiSnap, uniqueVisitorsSnap, uniquePageVisitorsSnap] = await Promise.all([
            db.collection('products').where('isActive', '==', true).count().get(),
            db.collection('reviews').where('isApproved', '==', false).count().get(),
            db.collection('wishlists').count().get(),
            db.collection('ai_analysis').count().get(),
            analyticsDb ? analyticsDb.collection('analytics_site_unique_visitors').count().get().catch(() => ({ data: () => ({ count: 0 }) })) : Promise.resolve({ data: () => ({ count: 0 }) }),
            analyticsDb ? analyticsDb.collection('analytics_page_unique_visitors').count().get().catch(() => ({ data: () => ({ count: 0 }) })) : Promise.resolve({ data: () => ({ count: 0 }) }),
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

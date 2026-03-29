import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/admin/analytics
export async function GET() {
    const [totalProducts, pendingReviews, totalWishlists, analysedProducts] = await Promise.all([
        prisma.product.count({ where: { isActive: true } }),
        prisma.review.count({ where: { isApproved: false } }),
        prisma.wishlist.count(),
        prisma.aiAnalysis.count(),
    ])

    return NextResponse.json({
        totalProducts,
        pendingReviews,
        wishlistSaves: totalWishlists,
        aiCoverage: { analysed: analysedProducts, total: totalProducts },
    })
}

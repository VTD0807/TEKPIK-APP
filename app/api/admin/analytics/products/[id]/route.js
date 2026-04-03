import { NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/firebase-admin'

export const dynamic = 'force-dynamic'

const toIso = (value) => {
    if (!value) return null
    if (typeof value.toDate === 'function') return value.toDate().toISOString()
    return value instanceof Date ? value.toISOString() : null
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const toNumber = (value, fallback = 0) => {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
}

const interestScore = ({ views, wishlists, reviews, avgRating, aiScore }) => {
    const viewScore = clamp((Math.log10(views + 1) / Math.log10(1000)) * 100, 0, 100)
    const wishlistScore = clamp((Math.log10(wishlists + 1) / Math.log10(250)) * 100, 0, 100)
    const reviewScore = clamp((Math.log10(reviews + 1) / Math.log10(120)) * 100, 0, 100)
    const ratingScore = clamp((avgRating / 5) * 100, 0, 100)
    const aiScoreNorm = clamp((toNumber(aiScore, 0) / 10) * 100, 0, 100)

    return Math.round((viewScore * 0.35) + (wishlistScore * 0.25) + (reviewScore * 0.15) + (ratingScore * 0.15) + (aiScoreNorm * 0.10))
}

export async function GET(req, { params }) {
    const { id } = await params
    if (!dbAdmin) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })

    try {
        const [productSnap, countsSnap, uniqueSnap, reviewsSnap, wishlistsSnap, aiSnap] = await Promise.all([
            dbAdmin.collection('products').doc(id).get(),
            dbAdmin.collection('analytics_product_view_counts').doc(id).get(),
            dbAdmin.collection('analytics_product_unique_visitors').where('productId', '==', id).get(),
            dbAdmin.collection('reviews').where('productId', '==', id).where('isApproved', '==', true).get(),
            dbAdmin.collection('wishlists').where('productId', '==', id).get(),
            dbAdmin.collection('ai_analysis').where('productId', '==', id).limit(1).get(),
        ])

        if (!productSnap.exists) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 })
        }

        const product = { id: productSnap.id, ...productSnap.data() }
        const viewCount = countsSnap.exists ? (countsSnap.data().uniqueDeviceViews || 0) : 0
        const uniqueVisitors = uniqueSnap.docs.map((doc) => ({ id: doc.id, ...doc.data(), createdAt: toIso(doc.data().createdAt) }))
        const reviewList = reviewsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data(), createdAt: toIso(doc.data().createdAt) }))
        const wishlistCount = wishlistsSnap.size || 0
        const aiAnalysis = aiSnap.docs[0] ? { id: aiSnap.docs[0].id, ...aiSnap.docs[0].data() } : null

        const regionCounts = new Map()
        const cityCounts = new Map()
        uniqueVisitors.forEach((visit) => {
            const region = String(visit.region || visit.country || 'Unknown').trim() || 'Unknown'
            const city = String(visit.city || 'Unknown').trim() || 'Unknown'
            regionCounts.set(region, (regionCounts.get(region) || 0) + 1)
            cityCounts.set(city, (cityCounts.get(city) || 0) + 1)
        })

        const topRegions = Array.from(regionCounts.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10)

        const topCities = Array.from(cityCounts.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10)

        const averageRating = reviewList.length
            ? reviewList.reduce((sum, review) => sum + toNumber(review.rating), 0) / reviewList.length
            : 0

        const interest = interestScore({
            views: viewCount,
            wishlists: wishlistCount,
            reviews: reviewList.length,
            avgRating: averageRating,
            aiScore: aiAnalysis?.score,
        })

        return NextResponse.json({
            product: {
                id: product.id,
                title: product.title || product.name || 'Unknown product',
                price: product.price ?? null,
                imageUrl: product.imageUrls?.[0] || product.image_urls?.[0] || null,
                brand: product.brand || null,
                description: product.description || '',
                aiScore: aiAnalysis?.score ?? null,
                aiSummary: aiAnalysis?.summary || aiAnalysis?.verdict || null,
            },
            metrics: {
                uniqueDeviceViews: viewCount,
                wishlistCount,
                reviewCount: reviewList.length,
                averageRating,
                interestScore: interest,
            },
            topRegions,
            topCities,
            reviews: reviewList.slice(0, 8),
            aiAnalysis,
        })
    } catch (err) {
        console.error('[admin-product-analytics]', err)
        return NextResponse.json({ error: 'Failed to load analytics' }, { status: 500 })
    }
}

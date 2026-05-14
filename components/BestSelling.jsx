import React from 'react'
import Title from './Title'
import ProductCard from './ProductCard'
import { getCatalog, getReviewCounts, getWishlistCounts } from '@/lib/db-queries'
import { calculateContentReliability } from '@/lib/search-intelligence'

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const toDate = (value) => {
    if (!value) return null
    if (value?.toDate && typeof value.toDate === 'function') return value.toDate()
    const dt = new Date(value)
    return Number.isFinite(dt.getTime()) ? dt : null
}

const daysSince = (value) => {
    const dt = toDate(value)
    if (!dt) return 365
    const diff = Date.now() - dt.getTime()
    if (!Number.isFinite(diff) || diff < 0) return 0
    return diff / (1000 * 60 * 60 * 24)
}

const BestSelling = async () => {
    const displayQuantity = 12

    let products = []
    try {
        // Direct DB access via centralized queries — no self-HTTP loopback
        const [{ products: catalogProducts }, reviewCounts, wishlistCounts] = await Promise.all([
            getCatalog(),
            getReviewCounts(),
            getWishlistCounts(),
        ])

        const candidates = catalogProducts.map(data => {
            const views = Number(data.uniqueDeviceViews || 0)
            const reviews = Number(reviewCounts.get(data.id) || data.reviewCount || 0)
            const wishlist = Number(wishlistCounts.get(data.id) || data.wishlistCount || 0)
            const popularity = clamp(
                (Math.log10(views + 1) * 2.6) + (Math.log10(reviews + 1) * 2.1) + (Math.log10(wishlist + 1) * 1.7),
                0, 10,
            )
            const freshBoost = clamp(1 - (daysSince(data.updatedAt || data.createdAt) / 14), 0, 1)
            const recentBoost = clamp(1 - (daysSince(data.updatedAt || data.createdAt) / 30), 0, 1)
            const velocity = (freshBoost * 0.7) + (recentBoost * 0.3)
            const reliability = (typeof calculateContentReliability === 'function' ? calculateContentReliability(data) : 0.5) * 10
            const aiScore = Number(data.ai_analysis?.score || data.aiScore || 0)
            const quality = clamp((Number.isFinite(aiScore) ? aiScore : 0) * 0.5 + reliability * 0.5, 0, 10)
            const score = (popularity * 0.38) + (velocity * 10 * 0.24) + (quality * 0.2) + (clamp(Number(data.discount || 0) / 10, 0, 9) * 0.1)

            return { ...data, _trendingScore: Number(score.toFixed(4)) }
        })

        candidates.sort((a, b) => b._trendingScore - a._trendingScore)
        products = candidates.slice(0, displayQuantity)
    } catch (e) {
        console.error('Unexpected error in BestSelling:', e)
    }

    return (
        <div className='px-4 sm:px-6 my-14 sm:my-20 max-w-[1500px] mx-auto'>
            <Title title='Trending Products' description={`What's moving fastest right now.`} href='/shop' />
            <div className='mt-8 sm:mt-12 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 sm:gap-5'>
                {products && products.length > 0 ? (
                    products.map((product, index) => (
                        <ProductCard key={product.id || index} product={product} />
                    ))
                ) : (
                    <div className="w-full col-span-full text-center text-slate-400 py-10">
                        No products found.
                    </div>
                )}
            </div>
        </div>
    )
}

export default BestSelling

import React from 'react'
import ProductCard from './ProductCard'
import { getCatalog, getAiAnalysisMap, getReviewCounts } from '@/lib/db-queries'
import { getCachedSWR } from '@/lib/server-cache'

const MAX_PRODUCTS = 12

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const toNumber = (value, fallback = 0) => {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
}

const calculateAnalysisScore = (analysis) => {
    if (!analysis) return 0
    const score = clamp(toNumber(analysis.score), 0, 10) * 10
    const value = (() => {
        const normalized = String(analysis.valueForMoney || analysis.value_for_money || '').toLowerCase()
        if (normalized.includes('excellent')) return 100
        if (normalized.includes('very good') || normalized.includes('great')) return 90
        if (normalized.includes('good') || normalized.includes('high')) return 70
        if (normalized.includes('fair') || normalized.includes('average')) return 50
        if (normalized.includes('poor') || normalized.includes('low')) return 20
        return 50
    })()
    const verdict = String(analysis.verdict || '').toLowerCase()
    const verdictBonus = verdict.includes('recommend') || verdict.includes('best') ? 6 : verdict.includes('good') ? 3 : 0
    return Math.round((score * 0.7) + (value * 0.2) + verdictBonus)
}

export default async function BestPicksForYou() {
    let products = []

    try {
        const data = await getCachedSWR('best-picks:v3', 1000 * 60 * 8, 1000 * 60 * 5, async () => {
            // Use ONLY centralized cached sources — NO separate full-collection reads
            const [{ products: catalogProducts }, aiMap, reviewCounts] = await Promise.all([
                getCatalog(),
                getAiAnalysisMap(),
                getReviewCounts(),
            ])

            const rankedProducts = []
            catalogProducts.forEach(product => {
                const analysis = aiMap[product.id] || null
                const reviewCount = reviewCounts.get?.(product.id) || 0
                const analysisScore = calculateAnalysisScore(analysis)
                // Use review COUNT (from cached aggregate) instead of reading each review
                const opinionScore = reviewCount > 0
                    ? clamp(Math.round((Math.log10(reviewCount + 1) / Math.log10(51)) * 100), 0, 100)
                    : 0
                const hasSignals = opinionScore > 0 || analysisScore > 0
                if (!hasSignals) return

                const combinedScore = opinionScore > 0 && analysisScore > 0
                    ? Math.round((analysisScore * 0.6) + (opinionScore * 0.4))
                    : analysisScore || opinionScore

                rankedProducts.push({
                    ...product,
                    reviewSummary: reviewCount > 0 ? { count: reviewCount, averageRating: product.amazonRating || 0 } : null,
                    ai_analysis: analysis,
                    _rankingScore: combinedScore,
                })
            })

            return rankedProducts
                .sort((a, b) => b._rankingScore - a._rankingScore)
                .slice(0, MAX_PRODUCTS)
        })

        products = data
    } catch (e) {
        console.warn('BestPicksForYou error:', e.message)
        return null
    }

    if (!products || products.length === 0) return null

    return (
        <div className='px-4 sm:px-6 my-14 sm:my-16 max-w-[1500px] mx-auto'>
            <div className="mb-3">
                <h2 className="text-xl font-semibold text-slate-800">Best Picks For You</h2>
                <p className="text-sm text-slate-500 mt-1">Ranked using community opinion and AI analysis.</p>
            </div>
            
            <div className='mt-6 sm:mt-8 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 sm:gap-5'>
                {products.map((product, index) => (
                    <ProductCard key={product.id || index} product={product} />
                ))}
            </div>
        </div>
    )
}

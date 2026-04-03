import React from 'react'
import Title from './Title'
import ProductCard from './ProductCard'
import { dbAdmin, sanitizeFirestoreData } from '@/lib/firebase-admin'
import { getCached } from '@/lib/server-cache'

const MAX_PRODUCTS = 80

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const toNumber = (value, fallback = 0) => {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
}

const valueScoreMap = [
    ['excellent', 10],
    ['very good', 9],
    ['great', 9],
    ['high', 8],
    ['good', 7],
    ['fair', 5],
    ['average', 5],
    ['medium', 4],
    ['low', 2],
    ['poor', 1],
]

const getValueScore = (value) => {
    const normalized = String(value || '').toLowerCase()
    const matched = valueScoreMap.find(([label]) => normalized.includes(label))
    return matched ? matched[1] : 5
}

const calculateOpinionScore = (reviews) => {
    if (!reviews.length) return 0

    const reviewCount = reviews.length
    const totalRating = reviews.reduce((sum, review) => sum + toNumber(review.rating), 0)
    const averageRating = totalRating / reviewCount
    const helpfulVotes = reviews.reduce((sum, review) => {
        const liked = Array.isArray(review.likedBy) ? review.likedBy.length : 0
        const disliked = Array.isArray(review.dislikedBy) ? review.dislikedBy.length : 0
        return sum + toNumber(review.helpful) + liked - disliked
    }, 0)

    const ratingScore = (averageRating / 5) * 100
    const volumeScore = clamp((Math.log10(reviewCount + 1) / Math.log10(51)) * 100, 0, 100)
    const helpfulScore = clamp((helpfulVotes / Math.max(reviewCount * 3, 1)) * 100, 0, 100)

    return Math.round((ratingScore * 0.6) + (volumeScore * 0.2) + (helpfulScore * 0.2))
}

const calculateAnalysisScore = (analysis) => {
    if (!analysis) return 0

    const score = clamp(toNumber(analysis.score), 0, 10) * 10
    const value = getValueScore(analysis.valueForMoney || analysis.value_for_money) * 10
    const verdict = String(analysis.verdict || '').toLowerCase()
    const verdictBonus = verdict.includes('recommend') || verdict.includes('best') ? 6 : verdict.includes('good') ? 3 : 0

    return Math.round((score * 0.7) + (value * 0.2) + verdictBonus)
}

export default async function BestPicksForYou() {
    if (!dbAdmin) return null

    let products = []

    try {
        const data = await getCached('best-picks:v1', 1000 * 60 * 5, async () => {
            const [productsSnap, reviewsSnap, aiSnap, categoriesSnap] = await Promise.all([
                dbAdmin.collection('products')
                .where('isActive', '==', true)
                .orderBy('createdAt', 'desc')
                .limit(MAX_PRODUCTS)
                .get(),
                dbAdmin.collection('reviews').where('isApproved', '==', true).get(),
                dbAdmin.collection('ai_analysis').get(),
                dbAdmin.collection('categories').get(),
            ])

            const catMap = {}
            categoriesSnap.forEach(doc => {
                catMap[doc.id] = doc.data()
            })

            const reviewMap = new Map()
            reviewsSnap.forEach(doc => {
                const review = sanitizeFirestoreData({ id: doc.id, ...doc.data() })
                const list = reviewMap.get(review.productId) || []
                list.push(review)
                reviewMap.set(review.productId, list)
            })

            const analysisMap = new Map()
            aiSnap.forEach(doc => {
                const analysis = sanitizeFirestoreData({ id: doc.id, ...doc.data() })
                analysisMap.set(analysis.productId, analysis)
            })

            const rankedProducts = []
            productsSnap.forEach(doc => {
                const product = sanitizeFirestoreData({ id: doc.id, ...doc.data() })
                const reviews = reviewMap.get(product.id) || []
                const analysis = analysisMap.get(product.id) || null
                const opinionScore = calculateOpinionScore(reviews)
                const analysisScore = calculateAnalysisScore(analysis)
                const hasSignals = opinionScore > 0 || analysisScore > 0

                if (!hasSignals) return

                const combinedScore = opinionScore > 0 && analysisScore > 0
                    ? Math.round((opinionScore * 0.58) + (analysisScore * 0.42))
                    : opinionScore || analysisScore

                const reviewCount = reviews.length
                const averageRating = reviewCount
                    ? reviews.reduce((sum, review) => sum + toNumber(review.rating), 0) / reviewCount
                    : 0

                rankedProducts.push({
                    ...product,
                    reviewSummary: reviewCount > 0 ? { count: reviewCount, averageRating } : null,
                    reviews,
                    ai_analysis: analysis,
                    categories: catMap[product.categoryId] ? { name: catMap[product.categoryId].name, slug: catMap[product.categoryId].slug } : null,
                    _rankingScore: combinedScore,
                })
            })

            return rankedProducts
                .sort((a, b) => b._rankingScore - a._rankingScore)
                .slice(0, 12)
        })

        products = data
    } catch (e) {
        console.warn('BestPicksForYou error:', e.message)
        return null
    }

    if (products.length === 0) {
        return null 
    }

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



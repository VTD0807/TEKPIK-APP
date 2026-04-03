import Image from 'next/image'
import { BoxArrowUpRight, Star, StarFill } from 'react-bootstrap-icons'
import AiAnalysis from '@/components/ai/AiAnalysis'
import ReviewList from '@/components/reviews/ReviewList'
import WishlistButton from '@/components/WishlistButton'
import ShareButton from '@/components/ShareButton'
import ProductImageGallery from '@/components/ProductImageGallery'
import ProductCard from '@/components/ProductCard'
import { dbAdmin, timestampToJSON, sanitizeFirestoreData } from '@/lib/firebase-admin'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const toNumber = (value, fallback = 0) => {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
}

const getValueScore = (value) => {
    const normalized = String(value || '').toLowerCase()
    if (normalized.includes('excellent')) return 95
    if (normalized.includes('very good')) return 90
    if (normalized.includes('great')) return 88
    if (normalized.includes('good')) return 80
    if (normalized.includes('average')) return 65
    if (normalized.includes('fair')) return 55
    if (normalized.includes('poor')) return 40
    return 70
}

const scoreFromAnalysis = (analysis) => {
    if (!analysis) return 0
    const base = clamp(toNumber(analysis.score), 0, 10) * 10
    const value = getValueScore(analysis.valueForMoney || analysis.value_for_money)
    const verdict = String(analysis.verdict || '').toLowerCase()
    const verdictBoost = verdict.includes('best') || verdict.includes('recommend') ? 6 : verdict.includes('good') ? 3 : 0
    return Math.round((base * 0.7) + (value * 0.25) + verdictBoost)
}

const scoreFromReviews = (reviews) => {
    if (!reviews.length) return 0
    const count = reviews.length
    const avg = reviews.reduce((sum, review) => sum + toNumber(review.rating), 0) / count
    const ratingScore = (avg / 5) * 100
    const volumeScore = clamp((Math.log10(count + 1) / Math.log10(26)) * 100, 0, 100)
    return Math.round((ratingScore * 0.75) + (volumeScore * 0.25))
}

export async function generateMetadata({ params }) {
    const { id } = await params
    
    if (!dbAdmin) return { title: 'Product Not Found' }

    const snap = await dbAdmin.collection('products').doc(id).get()
    if (!snap.exists) return { title: 'Product Not Found' }

    const product = snap.data()

    return {
        title: `${product.title} - TEKPIK`,
        description: product.description?.slice(0, 160),
        openGraph: {
            title: product.title,
            description: product.description?.slice(0, 160),
        },
    }
}

export default async function ProductPage({ params }) {
    const { id } = await params
    
    if (!dbAdmin) notFound()

    const snap = await dbAdmin.collection('products').doc(id).get()
    if (!snap.exists) notFound()

    const productData = { id: snap.id, ...snap.data() }

    // Fetch categories
    if (productData.categoryId) {
        const catSnap = await dbAdmin.collection('categories').doc(productData.categoryId).get()
        if (catSnap.exists) productData.categories = { name: catSnap.data().name, slug: catSnap.data().slug }
    }

    // Fetch AI Analysis
    const aiSnap = await dbAdmin.collection('ai_analysis').where('productId', '==', id).limit(1).get()
    if (!aiSnap.empty) productData.ai_analysis = { id: aiSnap.docs[0].id, ...aiSnap.docs[0].data() }

    // Fetch Reviews
    const revSnap = await dbAdmin.collection('reviews').where('productId', '==', id).where('isApproved', '==', true).get()
    productData.reviews = []
    revSnap.forEach(doc => {
        let revData = doc.data()
        // Convert Firestore timestamps to plain JSON-safe values.
        productData.reviews.push({
            id: doc.id,
            ...revData,
            createdAt: timestampToJSON(revData.createdAt),
            updatedAt: timestampToJSON(revData.updatedAt),
        })
    })

    const product = productData

    const images = product.imageUrls || []
    const rating = product.reviews?.length
        ? (product.reviews.reduce((s, r) => s + r.rating, 0) / product.reviews.length).toFixed(1)
        : null

    let suggestedProducts = []
    try {
        if (product.categoryId) {
            const relatedSnap = await dbAdmin.collection('products')
                .where('isActive', '==', true)
                .where('categoryId', '==', product.categoryId)
                .limit(8)
                .get()

            const related = relatedSnap.docs
                .map(doc => sanitizeFirestoreData({ id: doc.id, ...doc.data() }))
                .filter(p => p.id !== product.id)

            if (related.length > 0) {
                const ids = related.map(p => p.id).slice(0, 10)
                const [relatedReviewsSnap, relatedAiSnap] = await Promise.all([
                    dbAdmin.collection('reviews').where('isApproved', '==', true).where('productId', 'in', ids).get(),
                    dbAdmin.collection('ai_analysis').where('productId', 'in', ids).get(),
                ])

                const reviewMap = new Map()
                relatedReviewsSnap.forEach(doc => {
                    const data = sanitizeFirestoreData({ id: doc.id, ...doc.data() })
                    const list = reviewMap.get(data.productId) || []
                    list.push(data)
                    reviewMap.set(data.productId, list)
                })

                const analysisMap = new Map()
                relatedAiSnap.forEach(doc => {
                    const data = sanitizeFirestoreData({ id: doc.id, ...doc.data() })
                    analysisMap.set(data.productId, data)
                })

                suggestedProducts = related
                    .map(p => {
                        const reviews = reviewMap.get(p.id) || []
                        const analysis = analysisMap.get(p.id) || null
                        const reviewScore = scoreFromReviews(reviews)
                        const analysisScore = scoreFromAnalysis(analysis)
                        const combinedScore = analysisScore
                            ? Math.round((analysisScore * 0.7) + (reviewScore * 0.3))
                            : reviewScore

                        const reviewCount = reviews.length
                        const averageRating = reviewCount
                            ? reviews.reduce((sum, review) => sum + toNumber(review.rating), 0) / reviewCount
                            : 0

                        return {
                            ...p,
                            reviews,
                            ai_analysis: analysis,
                            reviewSummary: reviewCount > 0 ? { count: reviewCount, averageRating } : null,
                            _score: combinedScore,
                        }
                    })
                    .sort((a, b) => b._score - a._score)
                    .slice(0, 4)
            }
        }
    } catch (err) {
        console.warn('Suggested products error:', err.message)
    }

    if (suggestedProducts.length === 0) {
        try {
            const fallbackSnap = await dbAdmin.collection('products')
                .where('isActive', '==', true)
                .orderBy('createdAt', 'desc')
                .limit(6)
                .get()

            const fallback = fallbackSnap.docs
                .map(doc => sanitizeFirestoreData({ id: doc.id, ...doc.data() }))
                .filter(p => p.id !== product.id)
                .slice(0, 4)

            suggestedProducts = fallback
        } catch (err) {
            console.warn('Suggested fallback error:', err.message)
        }
    }

    return (
        <div className="max-w-6xl mx-auto px-3 sm:px-6 py-5 sm:py-10 space-y-6 sm:space-y-10">
            {/* Product hero */}
            <div className="grid md:grid-cols-2 gap-6 sm:gap-10">
                <ProductImageGallery images={images} title={product.title} price={product.price} rating={rating} />

                {/* Info */}
                <div className="space-y-3 sm:space-y-4">
                    {product.brand && <p className="text-xs text-slate-400 uppercase tracking-widest">{product.brand}</p>}
                    <h1 className="text-xl sm:text-2xl font-semibold text-slate-800 break-words">{product.title}</h1>

                    {rating && (
                        <div className="flex items-center gap-2 flex-wrap">
                            <div className="flex">
                                {Array(5).fill('').map((_, i) => (
                                    parseFloat(rating) >= i + 1
                                        ? <StarFill key={i} size={16} className="text-amber-500" />
                                        : <Star key={i} size={16} className="text-slate-300" />
                                ))}
                            </div>
                            <span className="text-xs sm:text-sm text-slate-500">{rating} ({product.reviews.length} reviews)</span>
                        </div>
                    )}

                    <div className="flex flex-wrap items-baseline gap-2">
                        <span className="text-2xl sm:text-3xl font-bold text-slate-800">₹{product.price}</span>
                        {(product.original_price || product.originalPrice) && (
                            <>
                                <span className="text-sm sm:text-lg text-slate-400 line-through">₹{product.original_price || product.originalPrice}</span>
                                {(product.discount || 0) > 0 && <span className="text-sm bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">-{product.discount}%</span>}
                            </>
                        )}
                    </div>
                    <p className="text-xs text-slate-400">Price may vary. Check current price on Amazon.</p>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2">
                        <a
                            href={product.affiliate_url || product.affiliateUrl || '#'}
                            target="_blank"
                            rel="noopener noreferrer sponsored"
                            className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 bg-amber-400 hover:bg-amber-500 transition text-slate-900 font-semibold rounded-full"
                        >
                            <BoxArrowUpRight size={16} />
                            View on Amazon
                        </a>
                        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                            <WishlistButton productId={product.id} className="w-auto min-w-[96px] justify-center px-3 py-2 text-xs sm:text-sm" />
                            <ShareButton title={product.title} className="w-auto min-w-[96px] justify-center px-3 py-2 text-xs sm:text-sm" />
                        </div>
                    </div>

                    <p className="text-slate-600 text-sm leading-relaxed break-words">{product.description}</p>

                </div>
            </div>

            {/* AI Analysis */}
            {product.ai_analysis && <AiAnalysis analysis={product.ai_analysis} />}

            {/* Reviews */}
            <ReviewList reviews={product.reviews || []} productId={product.id} />

            {suggestedProducts.length > 0 && (
                <div className="pt-2">
                    <div className="mb-3">
                        <h2 className="text-lg font-semibold text-slate-800">Suggested for you</h2>
                        <p className="text-sm text-slate-500">Ranked using AI analysis + review quality, with latest releases as fallback.</p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                        {suggestedProducts.map((item, index) => (
                            <ProductCard key={item.id || index} product={item} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

import Image from 'next/image'
import { BoxArrowUpRight, Star, StarFill } from 'react-bootstrap-icons'
import AiAnalysis from '@/components/ai/AiAnalysis'
import ReviewList from '@/components/reviews/ReviewList'
import WishlistButton from '@/components/WishlistButton'
import ShareButton from '@/components/ShareButton'
import ProductImageGallery from '@/components/ProductImageGallery'
import ProductPriceTrend from '@/components/ProductPriceTrend'
import ProductDescription from '@/components/ProductDescription'
import ProductCard from '@/components/ProductCard'
import { dbAdmin, timestampToJSON, sanitizeFirestoreData } from '@/lib/firebase-admin'
import { sanitizeDescriptionHtml, descriptionToPlainText } from '@/lib/description-html'
import { absoluteUrl } from '@/lib/seo'
import { formatPrice } from '@/lib/currency'
import { getPriceHistorySeries } from '@/lib/price-history-tracker'
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
    const storeName = process.env.NEXT_PUBLIC_APP_NAME || 'TEKPIK'
    const fallbackImage = absoluteUrl('/logo-tekpik.png')
    
    if (!dbAdmin) {
        const title = `Product - Best Price in India | ${storeName}`
        const description = `Explore products and compare prices in India on ${storeName}.`
        return {
            title,
            description,
            alternates: { canonical: absoluteUrl(`/products/${id}`) },
            openGraph: {
                title,
                description,
                url: absoluteUrl(`/products/${id}`),
                type: 'website',
                images: [{ url: fallbackImage }],
            },
            twitter: {
                card: 'summary_large_image',
                title,
                description,
                images: [fallbackImage],
            },
        }
    }

    const snap = await dbAdmin.collection('products').doc(id).get()
    if (!snap.exists) {
        const title = `Product - Best Price in India | ${storeName}`
        const description = `Explore products and compare prices in India on ${storeName}.`
        return {
            title,
            description,
            alternates: { canonical: absoluteUrl(`/products/${id}`) },
            openGraph: {
                title,
                description,
                url: absoluteUrl(`/products/${id}`),
                type: 'website',
                images: [{ url: fallbackImage }],
            },
            twitter: {
                card: 'summary_large_image',
                title,
                description,
                images: [fallbackImage],
            },
        }
    }

    const product = snap.data()
    const descriptionText = descriptionToPlainText(product.description)
    const canonicalPath = `/products/${id}`
    const image = product.imageUrls?.[0] || product.image_urls?.[0] || ''
    const productName = String(product.title || product.name || 'Product').trim()
    const productBrand = String(product.brand || storeName).trim()
    const title = `${productName} - Best Price in India | ${productBrand}`
    const description = descriptionText.slice(0, 160) || `${productName} deals, reviews, and best price in India on ${storeName}.`
    const canonical = absoluteUrl(canonicalPath)
    const resolvedImage = image || fallbackImage

    return {
        title,
        description,
        alternates: {
            canonical,
        },
        openGraph: {
            title,
            description,
            url: canonical,
            type: 'website',
            images: [{ url: resolvedImage }],
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: [resolvedImage],
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
    const descriptionHtml = sanitizeDescriptionHtml(product.description)
    let priceHistorySeries = []
    try {
        priceHistorySeries = await getPriceHistorySeries(product.id, 60)
    } catch (error) {
        console.warn('Price history series load error:', error.message)
    }

    const images = product.imageUrls || []
    const rating = product.reviews?.length
        ? (product.reviews.reduce((s, r) => s + r.rating, 0) / product.reviews.length).toFixed(1)
        : null
    const productUrl = absoluteUrl(`/products/${product.id}`)
    const schemaImage = images[0] || null
    const numericPrice = Number(product.price)
    const numericOriginalPrice = Number(product.original_price || product.originalPrice)
    const showAnchoredMrp = Number.isFinite(numericOriginalPrice)
        && Number.isFinite(numericPrice)
        && numericOriginalPrice > 0
        && numericOriginalPrice > numericPrice
    const lastUpdatedDate = (() => {
        const raw = product.lastUpdated
        if (!raw) return null
        if (typeof raw?.toDate === 'function') return raw.toDate()
        const parsed = new Date(raw)
        return Number.isNaN(parsed.getTime()) ? null : parsed
    })()
    const verifiedHours = lastUpdatedDate
        ? Math.max(0, Math.round((Date.now() - lastUpdatedDate.getTime()) / (1000 * 60 * 60)))
        : null
    const freshnessClass = verifiedHours === null
        ? 'text-slate-400'
        : verifiedHours > 24
            ? 'text-amber-600'
            : verifiedHours < 6
                ? 'text-emerald-600'
                : 'text-slate-500'
    const schemaData = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.title,
        description: descriptionToPlainText(product.description).slice(0, 500),
        image: schemaImage ? [schemaImage] : undefined,
        sku: product.asin || product.id,
        brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
        category: product.categories?.name || undefined,
        url: productUrl,
        offers: {
            '@type': 'Offer',
            priceCurrency: 'INR',
            price: Number.isFinite(numericPrice) ? numericPrice.toFixed(2) : undefined,
            availability: 'https://schema.org/InStock',
            url: productUrl,
        },
        aggregateRating: rating
            ? {
                '@type': 'AggregateRating',
                ratingValue: Number(rating),
                reviewCount: product.reviews.length,
            }
            : undefined,
    }

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
        <div className="max-w-6xl mx-auto px-3 sm:px-6 py-5 sm:py-10 pb-28 sm:pb-10 space-y-6 sm:space-y-10">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
            />

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
                        <span className="text-2xl sm:text-3xl font-bold text-slate-800">{formatPrice(numericPrice, 'INR', 'en-IN')}</span>
                        {showAnchoredMrp && (
                            <>
                                <span className="text-sm sm:text-lg text-slate-400 line-through">{formatPrice(numericOriginalPrice, 'INR', 'en-IN')}</span>
                                {(product.discount || 0) > 0 && <span className="text-sm bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">-{product.discount}%</span>}
                            </>
                        )}
                    </div>
                    {verifiedHours !== null && (
                        <p className={`text-xs font-medium ${freshnessClass}`}>
                            Price verified {verifiedHours} hour{verifiedHours === 1 ? '' : 's'} ago
                        </p>
                    )}
                    <p className="text-xs text-slate-400">Price may vary. Check current price on Amazon.</p>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2">
                        <a
                            href={product.affiliate_url || product.affiliateUrl || '#'}
                            target="_blank"
                            rel="noopener noreferrer nofollow sponsored"
                            className="hidden sm:flex items-center justify-center gap-2 w-full sm:w-auto px-7 py-3 bg-amber-400 hover:bg-amber-500 transition text-slate-900 text-base font-semibold rounded-md border border-amber-500"
                        >
                            <BoxArrowUpRight size={16} />
                            Buy on Amazon →
                        </a>
                        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                            <WishlistButton productId={product.id} className="w-auto min-w-[96px] justify-center px-3 py-2 text-xs sm:text-sm" />
                            <ShareButton title={product.title} className="w-auto min-w-[96px] justify-center px-3 py-2 text-xs sm:text-sm" />
                        </div>
                    </div>

                    {descriptionHtml ? (
                        <ProductDescription html={descriptionHtml} />
                    ) : (
                        <p className="text-slate-500 text-sm leading-relaxed break-words">No description available.</p>
                    )}

                </div>
            </div>

            <div className="sm:hidden fixed bottom-0 inset-x-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur px-3 pt-2 pb-[calc(env(safe-area-inset-bottom)+10px)] shadow-[0_-10px_30px_rgba(15,23,42,0.12)]">
                <a
                    href={product.affiliate_url || product.affiliateUrl || '#'}
                    target="_blank"
                    rel="noopener noreferrer nofollow sponsored"
                    className="flex items-center justify-center gap-2 w-full px-5 py-3 bg-amber-400 hover:bg-amber-500 transition text-slate-900 text-base font-semibold rounded-md border border-amber-500"
                >
                    <BoxArrowUpRight size={16} />
                    Buy on Amazon →
                </a>
            </div>

            {/* AI Analysis */}
            {product.ai_analysis && <AiAnalysis analysis={product.ai_analysis} />}

            {/* Product Price Trend (Secondary Firestore) */}
            <ProductPriceTrend history={priceHistorySeries} />

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

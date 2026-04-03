'use client'
import { Heart, HeartFill, Star, StarFill, BoxArrowUpRight } from 'react-bootstrap-icons'
import Link from 'next/link'
import { useDispatch, useSelector } from 'react-redux'
import { toggleWishlistItem } from '@/lib/features/wishlist/wishlistSlice'
import { usePostHog } from 'posthog-js/react'
import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { getDeviceId } from '@/lib/device'

const ProductImage = ({ src, alt, className }) => {
    const [error, setError] = useState(false)
    const fallback = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNGMUY1RjkiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iI0NCRDVFMSIgZm9udC1zaXplPSIxNCIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg=='

    if (error || !src) {
        return <img src={fallback} alt={alt || 'Product'} className={className} />
    }

    return (
        <img
            src={src}
            alt={alt || 'Product'}
            className={className}
            onError={() => setError(true)}
            loading="lazy"
            referrerPolicy="no-referrer"
        />
    )
}

const ScoreBadge = ({ score }) => {
    if (typeof score !== 'number' || !Number.isFinite(score)) return null
    return (
        <span className="absolute top-2 right-2 w-9 h-9 flex items-center justify-center">
            <span className="absolute inset-0 rounded-full bg-purple-500/15 blur-[2px]" />
            <span className="absolute inset-0 rounded-full ring-1 ring-purple-400/60" />
            <span className="relative bg-white/70 text-purple-700 text-[11px] font-semibold w-7 h-7 rounded-full flex items-center justify-center shadow-sm" title="AI Score">
                {Math.round(score)}
            </span>
        </span>
    )
}

const ProductCard = ({ product }) => {
    const dispatch = useDispatch()
    const posthog = usePostHog()
    const { user } = useAuth()
    const wishlistIds = useSelector(state => state.wishlist.ids)
    const isWishlisted = wishlistIds.includes(product.id)

    const trackInteraction = async (eventType) => {
        const deviceId = getDeviceId()
        if (!deviceId) return

        const payload = {
            eventType,
            productId: product.id,
            accountId: user?.uid || null,
            deviceId,
            pagePath: typeof window !== 'undefined' ? window.location.pathname : null,
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
            platform: typeof navigator !== 'undefined' ? navigator.platform || null : null,
            language: typeof navigator !== 'undefined' ? navigator.language || null : null,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
        }

        try {
            await fetch('/api/analytics/product-interaction', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                keepalive: true,
            })
        } catch {
            // Ignore analytics failures.
        }
    }

    const handleAmazonClick = () => {
        posthog.capture('amazon_click', {
            product_id: product.id,
            product_title: product.title || product.name,
            category: product.category,
            price: product.price
        })
    }

    const rating = typeof product.reviewSummary?.averageRating === 'number'
        ? Math.round(product.reviewSummary.averageRating)
        : product.reviews?.length
            ? Math.round(product.reviews.reduce((a, r) => a + r.rating, 0) / product.reviews.length)
            : product.amazonRating || 0
    const reviewCount = product.reviewSummary?.count ?? product.reviews?.length ?? 0

    const discount = product.discount || (product.originalPrice && product.price
        ? Math.round((1 - product.price / product.originalPrice) * 100)
        : 0)

    const imgSrc = product.imageUrls?.[0] || product.images?.[0] || product.image_urls?.[0]
    const aiScore = typeof product.ai_analysis?.score === 'number'
        ? product.ai_analysis.score
        : (typeof product.aiAnalysis?.score === 'number' ? product.aiAnalysis.score : null)

    return (
        <div className="group relative flex flex-col w-full min-w-0">
            {/* Image */}
            <Link href={`/products/${product.id}`} className="block">
                <div className="relative bg-[#F5F5F5] h-28 sm:h-44 w-full rounded-lg flex items-center justify-center overflow-hidden">
                    <ProductImage
                        src={imgSrc}
                        alt={product.title || product.name}
                        className="max-h-20 sm:max-h-32 w-auto group-hover:scale-110 transition duration-300 object-contain"
                    />
                    {discount > 0 && (
                        <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                            -{discount}%
                        </span>
                    )}
                    <ScoreBadge score={aiScore} />
                </div>
            </Link>

            {/* Info */}
            <div className="flex justify-between gap-2 text-xs sm:text-sm text-slate-800 pt-2">
                <div className="flex-1 min-w-0">
                    <Link href={`/products/${product.id}`}>
                        <p className="truncate hover:text-indigo-600 transition">{product.title || product.name}</p>
                    </Link>
                    {rating > 0 && (
                        <div className="flex mt-0.5">
                            {Array(5).fill('').map((_, i) => (
                                rating >= i + 1
                                    ? <StarFill key={i} size={12} className="text-emerald-500" />
                                    : <Star key={i} size={12} className="text-slate-300" />
                            ))}
                            {reviewCount > 0 && <span className="ml-1 text-[11px] text-slate-400">({reviewCount})</span>}
                        </div>
                    )}
                </div>
                <div className="text-right shrink-0">
                    <p className="font-medium">₹{product.price}</p>
                    {(product.originalPrice || product.original_price) && (
                        <p className="text-xs text-slate-400 line-through">₹{product.originalPrice || product.original_price}</p>
                    )}
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 mt-2">
                <a
                    href={product.affiliateUrl || product.affiliate_url || '#'}
                    target="_blank"
                    rel="noopener noreferrer nofollow sponsored"
                    onClick={() => {
                        handleAmazonClick()
                        trackInteraction('amazon_click')
                    }}
                    className="flex-1 min-w-0 flex items-center justify-center gap-1 text-[10px] sm:text-xs bg-amber-400 hover:bg-amber-500 transition text-slate-900 font-semibold py-2 sm:py-1.5 rounded-full"
                >
                    <BoxArrowUpRight size={12} />
                    View on Amazon
                </a>
                <button
                    onClick={() => {
                        dispatch(toggleWishlistItem(product.id))
                        posthog.capture(isWishlisted ? 'wishlist_remove' : 'wishlist_add', {
                            product_id: product.id,
                            source: 'product_card',
                        })
                        trackInteraction(isWishlisted ? 'wishlist_remove' : 'wishlist_add')
                    }}
                    className={`p-1.5 rounded-full border transition shrink-0 ${isWishlisted ? 'bg-red-50 border-red-300' : 'bg-white border-slate-300 hover:border-red-300'}`}
                    aria-label="Toggle wishlist"
                    title={isWishlisted ? 'Saved to wishlist' : 'Save to wishlist'}
                >
                    {isWishlisted ? (
                        <HeartFill size={14} className="text-red-500" />
                    ) : (
                        <Heart size={14} className="text-slate-600" />
                    )}
                </button>
            </div>
        </div>
    )
}

export default ProductCard

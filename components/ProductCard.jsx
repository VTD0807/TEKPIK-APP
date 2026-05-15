'use client'
import { Heart, HeartFill, Star, StarFill, BoxArrowUpRight } from 'react-bootstrap-icons'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useDispatch, useSelector } from 'react-redux'
import { toggleWishlistItem } from '@/lib/features/wishlist/wishlistSlice'
import { usePostHog } from 'posthog-js/react'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { getDeviceId } from '@/lib/device'
import { formatPrice } from '@/lib/currency'

const viewsTodayCache = new Map()
const viewsTodaySubscribers = new Map()
let viewsBatchTimer = null

const flushViewsBatch = async () => {
    viewsBatchTimer = null
    const pendingIds = Array.from(viewsTodaySubscribers.keys()).filter((id) => !viewsTodayCache.has(id))
    if (!pendingIds.length) return

    try {
        const response = await fetch('/api/analytics/posthog/views-today', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productIds: pendingIds }),
        })

        const data = await response.json().catch(() => ({}))
        const countMap = data?.counts && typeof data.counts === 'object' ? data.counts : {}

        pendingIds.forEach((id) => {
            const rawCount = Number(countMap[id])
            const resolved = Number.isFinite(rawCount) && rawCount > 0 ? rawCount : null
            viewsTodayCache.set(id, resolved)

            const listeners = viewsTodaySubscribers.get(id) || []
            listeners.forEach((setValue) => setValue(resolved))
        })
    } catch {
        pendingIds.forEach((id) => {
            viewsTodayCache.set(id, null)
            const listeners = viewsTodaySubscribers.get(id) || []
            listeners.forEach((setValue) => setValue(null))
        })
    }
}

const subscribeViewsToday = (productId, setValue) => {
    if (!productId) return () => {}

    const cached = viewsTodayCache.get(productId)
    if (cached !== undefined) {
        setValue(cached)
    } else {
        const listeners = viewsTodaySubscribers.get(productId) || []
        viewsTodaySubscribers.set(productId, [...listeners, setValue])

        if (!viewsBatchTimer) {
            viewsBatchTimer = setTimeout(flushViewsBatch, 35)
        }
    }

    return () => {
        const listeners = viewsTodaySubscribers.get(productId) || []
        const next = listeners.filter((listener) => listener !== setValue)
        if (next.length) viewsTodaySubscribers.set(productId, next)
        else viewsTodaySubscribers.delete(productId)
    }
}

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
    const router = useRouter()
    const dispatch = useDispatch()
    const posthog = usePostHog()
    const { user } = useAuth()
    const wishlistIds = useSelector(state => state.wishlist.ids)
    const isWishlisted = wishlistIds.includes(product.id)
    const [todayViews, setTodayViews] = useState(() => {
        const direct = Number(product.todayViews)
        if (Number.isFinite(direct) && direct > 0) return direct
        return null
    })

    useEffect(() => {
        const direct = Number(product.todayViews)
        if (Number.isFinite(direct) && direct > 0) {
            viewsTodayCache.set(product.id, direct)
            setTodayViews(direct)
            return
        }

        return subscribeViewsToday(product.id, setTodayViews)
    }, [product.id, product.todayViews])

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
    const currentPrice = Number(product.price)
    const originalPrice = Number(product.originalPrice || product.original_price)
    const showAnchoredMrp = Number.isFinite(originalPrice)
        && Number.isFinite(currentPrice)
        && originalPrice > 0
        && originalPrice > currentPrice
    const lastUpdatedDate = (() => {
        const raw = product.amazonSyncedAt || product.lastUpdated || product.updatedAt
        if (!raw) return null
        if (typeof raw === 'string' || typeof raw === 'number') {
            const parsed = new Date(raw)
            return Number.isNaN(parsed.getTime()) ? null : parsed
        }
        if (typeof raw?.toDate === 'function') {
            const parsed = raw.toDate()
            return Number.isNaN(parsed?.getTime?.()) ? null : parsed
        }
        return null
    })()
    const verifiedAgo = (() => {
        if (!lastUpdatedDate) return null
        const diffMs = Math.max(0, Date.now() - lastUpdatedDate.getTime())
        const totalMinutes = Math.floor(diffMs / (1000 * 60))
        const hours = Math.floor(totalMinutes / 60)
        const minutes = totalMinutes % 60
        if (hours === 0) return { label: `${minutes} min${minutes === 1 ? '' : 's'} ago`, hours: 0 }
        return { label: `${hours} hr${hours === 1 ? '' : 's'} ${minutes > 0 ? `${minutes} min ` : ''}ago`, hours }
    })()
    const freshnessClass = verifiedAgo === null
        ? 'text-slate-400'
        : verifiedAgo.hours > 24
            ? 'text-amber-600'
            : verifiedAgo.hours < 6
                ? 'text-emerald-600'
                : 'text-slate-500'

    return (
        <>
            {/* --- NEW PREMIUM MOBILE LAYOUT (visible only on mobile) --- */}
            <div className="sm:hidden relative flex flex-col w-full h-full bg-white rounded-[16px] border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] overflow-hidden">
                {/* Image Section */}
                <Link href={`/products/${product.id}`} className="relative bg-[#F8FAFC] aspect-square w-full flex items-center justify-center p-4">
                    <ProductImage
                        src={imgSrc}
                        alt={product.title || product.name}
                        className="w-full h-full object-contain mix-blend-multiply drop-shadow-[0_4px_12px_rgba(0,0,0,0.05)]"
                    />
                    {/* Badges Overlay */}
                    {discount > 0 && (
                        <span className="absolute top-2.5 left-2.5 bg-[#FF3B30] text-white text-[10px] font-black px-1.5 py-0.5 rounded-md tracking-wider">
                            -{discount}%
                        </span>
                    )}
                    <ScoreBadge score={aiScore} />
                </Link>

                {/* Content Section */}
                <div className="flex flex-col flex-1 p-3">
                    {/* Brand & Rating */}
                    <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[9px] uppercase tracking-widest font-bold text-slate-400 truncate pr-2">
                            {product.brand || 'TEKPIK'}
                        </span>
                        {rating > 0 && (
                            <div className="flex items-center gap-0.5 shrink-0 bg-amber-50 px-1 py-0.5 rounded-md">
                                <StarFill size={8} className="text-amber-500" />
                                <span className="text-[9px] font-bold text-amber-700">{rating}</span>
                            </div>
                        )}
                    </div>

                    {/* Title */}
                    <Link href={`/products/${product.id}`} className="mb-2">
                        <h3 className="text-xs font-bold text-slate-800 line-clamp-2 leading-snug tracking-tight">
                            {product.title || product.name}
                        </h3>
                    </Link>

                    {/* Spacer to push price/actions to bottom */}
                    <div className="flex-1" />

                    {/* Price Row */}
                    <div className="flex items-baseline gap-1.5 mb-2.5">
                        <span className="text-sm font-black text-slate-900 tracking-tight">
                            {formatPrice(currentPrice, 'INR', 'en-IN')}
                        </span>
                        {showAnchoredMrp && (
                            <span className="text-[10px] font-semibold text-slate-400 line-through">
                                {formatPrice(originalPrice, 'INR', 'en-IN')}
                            </span>
                        )}
                    </div>

                    {/* Action Row */}
                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={() => {
                                if (product.inStock !== false && product.isActive !== false && product.available !== false) {
                                    handleAmazonClick()
                                    trackInteraction('amazon_click')
                                }
                                router.push(`/products/${product.id}`)
                            }}
                            className={`flex-1 flex items-center justify-center gap-1 text-[11px] font-bold py-2 rounded-[10px] transition-all active:scale-95 ${
                                product.inStock === false || product.isActive === false || product.available === false
                                ? 'bg-slate-100 text-slate-400' 
                                : 'bg-black text-white hover:bg-slate-800 shadow-[0_2px_8px_rgba(0,0,0,0.12)]'
                            }`}
                        >
                            {product.isActive === false || product.available === false ? 'Unavailable' : product.inStock === false ? 'Out of Stock' : 'View Deal'}
                        </button>

                        <button
                            onClick={() => {
                                dispatch(toggleWishlistItem(product.id))
                                posthog.capture(isWishlisted ? 'wishlist_remove' : 'wishlist_add', { product_id: product.id, source: 'product_card' })
                                trackInteraction(isWishlisted ? 'wishlist_remove' : 'wishlist_add')
                            }}
                            className={`w-[34px] h-[34px] flex items-center justify-center rounded-[10px] border transition-colors shrink-0 active:scale-95 ${
                                isWishlisted ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200 hover:bg-slate-50'
                            }`}
                        >
                            {isWishlisted ? <HeartFill size={14} className="text-[#FF3B30]" /> : <Heart size={14} className="text-slate-500" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* --- DESKTOP LAYOUT (visible only on sm and up) --- */}
            <div className="hidden sm:flex group relative flex-col w-full h-full bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                {/* Image */}
                <Link href={`/products/${product.id}`} className="block -mx-4 -mt-4 mb-3">
                    <div className="relative bg-slate-50 h-48 w-full flex items-center justify-center overflow-hidden rounded-t-xl">
                        <ProductImage
                            src={imgSrc}
                            alt={product.title || product.name}
                            className="h-[88%] w-[88%] group-hover:scale-105 transition duration-300 object-contain mix-blend-multiply"
                        />
                        {discount > 0 && (
                            <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                -{discount}%
                            </span>
                        )}
                        <ScoreBadge score={aiScore} />
                    </div>
                </Link>

                {/* Info */}
                <div className="flex flex-col mt-2 mb-2 flex-1">
                    <div className="flex justify-between items-start gap-2 text-slate-800">
                        <Link href={`/products/${product.id}`} className="flex-1 min-w-0">
                            <p className="line-clamp-2 hover:text-indigo-600 transition font-medium text-sm leading-snug break-words">
                                {product.title || product.name}
                            </p>
                        </Link>
                        <div className="text-right shrink-0">
                            <p className="font-bold text-base">{formatPrice(currentPrice, 'INR', 'en-IN')}</p>
                            {showAnchoredMrp && (
                                <p className="text-xs text-slate-400 line-through">{formatPrice(originalPrice, 'INR', 'en-IN')}</p>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 mt-1.5">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 flex-1 min-w-0">
                            {rating > 0 && (
                                <div className="flex items-center gap-0.5">
                                    {Array(5).fill('').map((_, i) => (
                                        rating >= i + 1
                                            ? <StarFill key={i} size={10} className="text-amber-400" />
                                            : <Star key={i} size={10} className="text-slate-200" />
                                    ))}
                                    {reviewCount > 0 && <span className="ml-1 text-[10px] text-slate-400">({reviewCount})</span>}
                                </div>
                            )}
                            {product.brand && (
                                <span className="text-[10px] text-slate-400 uppercase tracking-wider truncate">{product.brand}</span>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 mt-1.5">
                        {verifiedAgo !== null ? (
                            <p className={`text-[10px] font-medium truncate ${freshnessClass}`}>
                                Verified {verifiedAgo.label}
                            </p>
                        ) : <div />}
                        
                        {typeof todayViews === 'number' && todayViews > 0 && (
                            <p className="text-[10px] text-slate-500 truncate">{todayViews} viewed today</p>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-100 shrink-0">
                    <button
                        onClick={() => {
                            if (product.inStock !== false && product.isActive !== false && product.available !== false) {
                                handleAmazonClick()
                                trackInteraction('amazon_click')
                            }
                            router.push(`/products/${product.id}`)
                        }}
                        className={`flex-1 min-w-0 flex items-center justify-center gap-1.5 text-xs transition text-white font-semibold py-2 rounded-full ${
                            product.inStock === false || product.isActive === false || product.available === false
                            ? 'bg-slate-300 hover:bg-slate-400' 
                            : 'bg-[#00A8A8] hover:bg-[#008888]'
                        }`}
                    >
                        <BoxArrowUpRight size={11} />
                        {product.isActive === false || product.available === false ? 'Unavailable' : product.inStock === false ? 'Out of Stock' : 'View Deal'}
                    </button>
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
        </>
    )
}

export default ProductCard

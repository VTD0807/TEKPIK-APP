'use client'
import { Heart, HeartFill, Star, StarFill, BoxArrowUpRight } from 'react-bootstrap-icons'
import Link from 'next/link'
import { useDispatch, useSelector } from 'react-redux'
import { toggleWishlistItem } from '@/lib/features/wishlist/wishlistSlice'
import { usePostHog } from 'posthog-js/react'
import { useState } from 'react'

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
    if (!score) return null
    const color = score >= 8 ? 'bg-green-500' : score >= 6 ? 'bg-amber-500' : 'bg-red-500'
    return (
        <span className={`absolute top-2 right-2 ${color} text-white text-xs font-bold w-7 h-7 rounded-full flex items-center justify-center shadow`}>
            {score}
        </span>
    )
}

const ProductCard = ({ product }) => {
    const dispatch = useDispatch()
    const posthog = usePostHog()
    const wishlistIds = useSelector(state => state.wishlist.ids)
    const isWishlisted = wishlistIds.includes(product.id)

    const handleAmazonClick = () => {
        posthog.capture('amazon_click', {
            product_id: product.id,
            product_title: product.title || product.name,
            category: product.category,
            price: product.price
        })
    }

    const rating = product.reviews?.length
        ? Math.round(product.reviews.reduce((a, r) => a + r.rating, 0) / product.reviews.length)
        : product.amazonRating || 0

    const discount = product.discount || (product.originalPrice && product.price
        ? Math.round((1 - product.price / product.originalPrice) * 100)
        : 0)

    const imgSrc = product.imageUrls?.[0] || product.images?.[0] || product.image_urls?.[0]

    return (
        <div className="group relative max-xl:mx-auto flex flex-col w-full sm:w-auto">
            {/* Image */}
            <Link href={`/products/${product.id}`} className="block">
                <div className="relative bg-[#F5F5F5] h-44 w-full sm:w-60 sm:h-64 rounded-lg flex items-center justify-center overflow-hidden">
                    <ProductImage
                        src={imgSrc}
                        alt={product.title || product.name}
                        className="max-h-32 sm:max-h-44 w-auto group-hover:scale-110 transition duration-300 object-contain"
                    />
                    {discount > 0 && (
                        <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                            -{discount}%
                        </span>
                    )}
                    <ScoreBadge score={product.aiAnalysis?.score || product.ai_analysis?.score} />
                </div>
            </Link>

            {/* Info */}
            <div className="flex justify-between gap-2 text-sm text-slate-800 pt-2 sm:max-w-60">
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
            <div className="flex items-center gap-2 mt-2 sm:max-w-60">
                <a
                    href={product.affiliateUrl || product.affiliate_url || '#'}
                    target="_blank"
                    rel="noopener noreferrer sponsored"
                    onClick={handleAmazonClick}
                    className="flex-1 flex items-center justify-center gap-1.5 text-[11px] sm:text-xs bg-amber-400 hover:bg-amber-500 transition text-slate-900 font-semibold py-2 sm:py-1.5 rounded-full"
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
                    }}
                    className={`p-1.5 rounded-full border transition ${isWishlisted ? 'bg-red-50 border-red-300' : 'bg-white border-slate-300 hover:border-red-300'}`}
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

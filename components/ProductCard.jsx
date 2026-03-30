'use client'
import { HeartIcon, StarIcon, ExternalLinkIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useDispatch, useSelector } from 'react-redux'
import { toggleWishlistItem } from '@/lib/features/wishlist/wishlistSlice'
import { usePostHog } from 'posthog-js/react'

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

    return (
        <div className="group relative max-xl:mx-auto flex flex-col">
            {/* Image */}
            <Link href={`/products/${product.id}`} className="block">
                <div className="relative bg-[#F5F5F5] h-40 sm:w-60 sm:h-64 rounded-lg flex items-center justify-center overflow-hidden">
                    <Image
                        width={500} height={500}
                        className="max-h-32 sm:max-h-44 w-auto group-hover:scale-110 transition duration-300 object-contain"
                        src={product.imageUrls?.[0] || product.images?.[0]}
                        alt={product.title || product.name}
                    />
                    {discount > 0 && (
                        <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                            -{discount}%
                        </span>
                    )}
                    <ScoreBadge score={product.aiAnalysis?.score} />
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
                                <StarIcon key={i} size={12} className="text-transparent" fill={rating >= i + 1 ? "#00C950" : "#D1D5DB"} />
                            ))}
                        </div>
                    )}
                </div>
                <div className="text-right shrink-0">
                    <p className="font-medium">${product.price}</p>
                    {product.originalPrice && (
                        <p className="text-xs text-slate-400 line-through">${product.originalPrice}</p>
                    )}
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 mt-2 sm:max-w-60">
                <a
                    href={product.affiliateUrl || '#'}
                    target="_blank"
                    rel="noopener noreferrer sponsored"
                    onClick={handleAmazonClick}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-amber-400 hover:bg-amber-500 transition text-slate-900 font-semibold py-1.5 rounded-full"
                >
                    <ExternalLinkIcon size={12} />
                    View on Amazon
                </a>
                <button
                    onClick={() => dispatch(toggleWishlistItem(product.id))}
                    className="p-1.5 rounded-full border border-slate-200 hover:border-red-300 transition"
                    aria-label="Toggle wishlist"
                >
                    <HeartIcon size={14} fill={isWishlisted ? '#ef4444' : 'none'} className={isWishlisted ? 'text-red-500' : 'text-slate-400'} />
                </button>
            </div>
        </div>
    )
}

export default ProductCard

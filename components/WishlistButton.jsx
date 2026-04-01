'use client'
import { HeartFill } from 'react-bootstrap-icons'
import { useDispatch, useSelector } from 'react-redux'
import { toggleWishlistItem } from '@/lib/features/wishlist/wishlistSlice'
import { usePostHog } from 'posthog-js/react'

export default function WishlistButton({ productId, className = '' }) {
    const dispatch = useDispatch()
    const posthog = usePostHog()
    const isWishlisted = useSelector(state => state.wishlist.ids.includes(productId))

    const handleToggle = () => {
        dispatch(toggleWishlistItem(productId))
        posthog?.capture(isWishlisted ? 'wishlist_remove' : 'wishlist_add', {
            product_id: productId,
            source: 'product_detail',
        })
    }

    return (
        <button
            onClick={handleToggle}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full border text-sm font-medium transition ${isWishlisted ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white border-slate-300 text-slate-700 hover:border-red-300 hover:text-red-500'} ${className}`}
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
        >
            <HeartFill size={16} className={isWishlisted ? 'text-red-500' : 'text-slate-400'} />
            <span>{isWishlisted ? 'Saved' : 'Save'}</span>
        </button>
    )
}

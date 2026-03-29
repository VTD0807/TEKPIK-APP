'use client'
import { HeartIcon } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { toggleWishlistItem } from '@/lib/features/wishlist/wishlistSlice'

export default function WishlistButton({ productId, className = '' }) {
    const dispatch = useDispatch()
    const isWishlisted = useSelector(state => state.wishlist.ids.includes(productId))

    return (
        <button
            onClick={() => dispatch(toggleWishlistItem(productId))}
            className={`flex items-center gap-1.5 text-sm transition ${isWishlisted ? 'text-red-500' : 'text-slate-400 hover:text-red-400'} ${className}`}
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
        >
            <HeartIcon size={18} fill={isWishlisted ? 'currentColor' : 'none'} />
            <span>{isWishlisted ? 'Saved' : 'Save'}</span>
        </button>
    )
}

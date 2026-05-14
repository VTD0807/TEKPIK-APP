'use client'

import { useSelector } from 'react-redux'
import { Heart, HeartFill } from 'react-bootstrap-icons'
import ProductCard from '@/components/ProductCard'
import Link from 'next/link'

export default function WishlistClient() {
    const wishlistIds = useSelector(state => state.wishlist.ids)
    const allProducts = useSelector(state => state.product.list)
    const saved = allProducts.filter((p) => wishlistIds.includes(p.id))

    return (
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 sm:py-10 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <HeartFill size={20} className="text-red-400" />
                    <h1 className="text-2xl font-semibold text-slate-800">Your Wishlist</h1>
                </div>
                {saved.length > 0 && (
                    <span className="text-sm text-slate-400">{saved.length} item{saved.length !== 1 ? 's' : ''} saved</span>
                )}
            </div>

            {saved.length === 0 ? (
                <div className="text-center py-24 space-y-5">
                    <div className="w-20 h-20 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto">
                        <Heart size={32} className="text-slate-300" />
                    </div>
                    <div className="space-y-2">
                        <p className="text-lg font-medium text-slate-700">Nothing saved yet</p>
                        <p className="text-sm text-slate-400 max-w-sm mx-auto">
                            Tap the heart icon on any product to save it here for later.
                        </p>
                    </div>
                    <Link href="/shop" className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white text-sm rounded-full hover:bg-slate-800 transition font-medium">
                        Browse Products
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 xl:gap-8">
                    {saved.map((p) => <ProductCard key={p.id} product={p} />)}
                </div>
            )}
        </div>
    )
}

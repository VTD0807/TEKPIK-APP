'use client'
import { useSelector } from 'react-redux'
import { Heart } from 'react-bootstrap-icons'
import ProductCard from '@/components/ProductCard'
import Link from 'next/link'

export default function WishlistPage() {
    const wishlistIds = useSelector(state => state.wishlist.ids)
    const allProducts = useSelector(state => state.product.list)
    const saved = allProducts.filter(p => wishlistIds.includes(p.id))

    return (
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 sm:py-10 space-y-6">
            <div className="flex items-center gap-2 text-red-500">
                <Heart size={22} fill="currentColor" />
                <h1 className="text-2xl font-semibold text-slate-800">Your Wishlist</h1>
            </div>

            {saved.length === 0 ? (
                <div className="text-center py-20 space-y-3">
                    <Heart size={40} className="mx-auto text-slate-200" />
                    <p className="text-slate-400">Nothing saved yet.</p>
                    <Link href="/shop" className="inline-block px-6 py-2 bg-indigo-500 text-white text-sm rounded-full hover:bg-indigo-600 transition">
                        Browse Products
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 xl:gap-10">
                    {saved.map(p => <ProductCard key={p.id} product={p} />)}
                </div>
            )}
        </div>
    )
}

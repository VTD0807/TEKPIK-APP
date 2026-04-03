'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'react-bootstrap-icons'
import ProductCard from '@/components/ProductCard'
import { useAuth } from '@/lib/auth-context'
import { getDeviceId } from '@/lib/device'

export default function ShopCatalogClient({ initialSearch = '' }) {
    const { user, loading: authLoading } = useAuth()
    const [products, setProducts] = useState([])
    const [source, setSource] = useState('fallback')
    const [loading, setLoading] = useState(true)

    const normalizedSearch = useMemo(() => String(initialSearch || '').trim(), [initialSearch])

    useEffect(() => {
        if (authLoading) return

        let cancelled = false
        setLoading(true)

        const params = new URLSearchParams()
        params.set('limit', '120')
        if (normalizedSearch) params.set('search', normalizedSearch)
        if (user?.uid) params.set('accountId', user.uid)
        const deviceId = getDeviceId()
        if (deviceId) params.set('deviceId', deviceId)

        fetch(`/api/recommendations/feed?${params.toString()}`, { cache: 'no-store' })
            .then((res) => res.json())
            .then((data) => {
                if (cancelled) return
                setProducts(Array.isArray(data?.products) ? data.products : [])
                setSource(data?.source === 'personalized' ? 'personalized' : 'fallback')
                setLoading(false)
            })
            .catch(() => {
                if (cancelled) return
                setProducts([])
                setSource('fallback')
                setLoading(false)
            })

        return () => {
            cancelled = true
        }
    }, [authLoading, user?.uid, normalizedSearch])

    const hasProducts = products.length > 0

    return (
        <div className="min-h-[70vh] px-3 sm:px-6">
            <div className="max-w-7xl mx-auto">
                <div className="my-6">
                    <Link href="/shop" className="text-2xl text-slate-500 flex items-center gap-2 hover:text-slate-700 transition group">
                        {normalizedSearch && <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />}
                        All <span className="text-slate-700 font-medium">Products</span>
                    </Link>
                    {normalizedSearch && (
                        <p className="text-sm text-slate-400 mt-1">
                            Showing results for "{normalizedSearch}"
                        </p>
                    )}
                    <p className="text-xs text-slate-400 mt-2">
                        {source === 'personalized'
                            ? 'Sorted by your interest signals, quality, value, recency, and diversity.'
                            : 'Sorted by quality, value, and freshness. Sign in for personalized ranking.'}
                    </p>
                </div>

                {loading ? (
                    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 mx-auto mb-20 sm:mb-32">
                        {Array.from({ length: 12 }).map((_, i) => (
                            <div key={i} className="h-56 rounded-xl border border-slate-100 bg-slate-50 animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 mx-auto mb-20 sm:mb-32">
                        {hasProducts ? (
                            products.map((product) => (
                                <ProductCard key={product.id} product={product} />
                            ))
                        ) : (
                            <div className="w-full text-center py-32 flex flex-col items-center justify-center gap-4 col-span-full">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                                    <span className="text-2xl text-slate-300"></span>
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-slate-800 font-medium text-lg">0 results found</h3>
                                    <p className="text-slate-400 text-sm">We couldn't find any products matching your criteria.</p>
                                </div>
                                <Link href="/shop" className="text-indigo-600 font-medium text-sm hover:underline">
                                    Clear filters
                                </Link>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

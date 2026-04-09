'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import Title from './Title'
import ProductCard from './ProductCard'

export default function LatestProducts() {
    const { user, loading } = useAuth()
    const [products, setProducts] = useState([])
    const [source, setSource] = useState('fallback')
    const [feedLoading, setFeedLoading] = useState(true)
    const displayQuantity = 12

    useEffect(() => {
        if (loading) return

        const controller = new AbortController()
        setFeedLoading(true)

        const accountParam = user?.uid ? `?accountId=${encodeURIComponent(user.uid)}&limit=${displayQuantity}` : `?limit=${displayQuantity}`

        fetch(`/api/recommendations/feed${accountParam}`, {
            cache: 'no-store',
            signal: controller.signal,
        })
            .then((res) => res.json())
            .then((data) => {
                const nextProducts = Array.isArray(data?.products) ? data.products.slice(0, displayQuantity) : []
                setProducts(nextProducts)
                setSource(data?.source === 'personalized' ? 'personalized' : 'fallback')
                setFeedLoading(false)
            })
            .catch(async () => {
                try {
                    const fallback = await fetch(`/api/products?limit=${displayQuantity}&sort=newest`, {
                        cache: 'no-store',
                        signal: controller.signal,
                    }).then((res) => res.json())
                    setProducts(Array.isArray(fallback?.products) ? fallback.products.slice(0, displayQuantity) : [])
                } catch {
                    setProducts([])
                }
                setSource('fallback')
                setFeedLoading(false)
            })

        return () => controller.abort()
    }, [user?.uid, loading])

    const description = useMemo(() => {
        if (!user?.uid) return 'Fresh products and trending picks for you.'
        if (source === 'personalized') return 'Personalized latest feed based on your interests and behavior.'
        return 'New products sorted by quality, value, and freshness.'
    }, [user?.uid, source])

    if (loading) return null

    return (
        <div className='px-4 sm:px-6 my-14 sm:my-16 max-w-[1500px] mx-auto'>
            <Title title='Latest Feed' description={description} href='/shop' />

            {feedLoading ? (
                <div className='mt-8 sm:mt-10 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 sm:gap-5'>
                    {Array.from({ length: displayQuantity }).map((_, index) => (
                        <div key={index} className='h-64 rounded-xl border border-slate-100 bg-slate-50 animate-pulse' />
                    ))}
                </div>
            ) : (
                <div className='mt-8 sm:mt-10 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 sm:gap-5'>
                    {products && products.length > 0 ? (
                        products.map((product, index) => (
                            <ProductCard key={product.id || index} product={product} />
                        ))
                    ) : (
                        <div className='w-full text-center text-slate-400 py-10'>No products found.</div>
                    )}
                </div>
            )}
        </div>
    )
}

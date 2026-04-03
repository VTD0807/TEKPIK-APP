'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import ProductCard from './ProductCard'

export default function PersonalizedTopFeed() {
    const { user, loading } = useAuth()
    const [products, setProducts] = useState([])
    const [interestCategories, setInterestCategories] = useState([])
    const [source, setSource] = useState('fallback')
    const [feedLoading, setFeedLoading] = useState(true)

    useEffect(() => {
        if (loading) return

        if (!user?.uid) {
            setProducts([])
            setInterestCategories([])
            setSource('fallback')
            setFeedLoading(false)
            return
        }

        const controller = new AbortController()
        setFeedLoading(true)

        const accountParam = `?accountId=${encodeURIComponent(user.uid)}`

        fetch(`/api/recommendations/feed${accountParam}`, {
            cache: 'no-store',
            signal: controller.signal,
        })
            .then((res) => res.json())
            .then((data) => {
                const nextProducts = Array.isArray(data?.products) ? data.products.slice(0, 12) : []
                setProducts(nextProducts)
                setInterestCategories(Array.isArray(data?.interestCategories) ? data.interestCategories : [])
                setSource(data?.source || 'fallback')
                setFeedLoading(false)
            })
            .catch(() => setFeedLoading(false))

        return () => controller.abort()
    }, [user?.uid, loading])

    const subtitle = useMemo(() => {
        if (!user) return 'Popular products picked from community activity.'
        if (source === 'personalized') return 'Based on your interests, views, wishlists and reviews.'
        return 'Building your interest profile. Showing trending picks for now.'
    }, [user, source])

    if (loading || !user?.uid) return null

    if (feedLoading) {
        return (
            <div className='px-4 sm:px-6 my-14 sm:my-16 max-w-[1500px] mx-auto'>
                <div className='mb-3'>
                    <h2 className='text-xl font-semibold text-slate-800'>Recommended For You</h2>
                    <p className='text-sm text-slate-500 mt-1'>Analyzing your interests...</p>
                </div>
                <div className='mt-6 sm:mt-8 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 sm:gap-5'>
                    {Array.from({ length: 12 }).map((_, index) => (
                        <div key={index} className='h-64 rounded-xl border border-slate-100 bg-slate-50 animate-pulse' />
                    ))}
                </div>
            </div>
        )
    }

    const hasValidInterest = interestCategories.some((item) => {
        if (!item || typeof item.name !== 'string') return false
        return item.name.trim().length > 0 && Number(item.weight || 0) > 0
    })

    if (source !== 'personalized' || !hasValidInterest) return null

    if (!products.length) return null

    return (
        <div className='px-4 sm:px-6 my-14 sm:my-16 max-w-[1500px] mx-auto'>
            <div className='mb-3'>
                <h2 className='text-xl font-semibold text-slate-800'>Recommended For You</h2>
                <p className='text-sm text-slate-500 mt-1'>{subtitle}</p>
            </div>

            {interestCategories.length > 0 && (
                <div className='mt-3 flex flex-wrap gap-2'>
                    {interestCategories.slice(0, 6).map((item) => (
                        <span
                            key={item.name}
                            className='inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200'
                        >
                            {item.name}
                        </span>
                    ))}
                </div>
            )}

            <div className='mt-6 sm:mt-8 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 sm:gap-5'>
                {products.map((product, index) => (
                    <ProductCard key={product.id || index} product={product} />
                ))}
            </div>
        </div>
    )
}

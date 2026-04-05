'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CurrencyDollar, Funnel, Search, Sliders, XCircle } from 'react-bootstrap-icons'
import ProductCard from '@/components/ProductCard'
import { useAuth } from '@/lib/auth-context'
import { getDeviceId } from '@/lib/device'
import { formatPrice } from '@/lib/currency'

const SORT_OPTIONS = [
    { value: 'relevance', label: 'Relevance' },
    { value: 'newest', label: 'Newest' },
    { value: 'price_low', label: 'Price: Low to High' },
    { value: 'price_high', label: 'Price: High to Low' },
    { value: 'discount', label: 'Biggest Discount' },
    { value: 'rating', label: 'Top Rated' },
]

const canonicalizeBrand = (value = '') => String(value).trim().toLowerCase()
const humanizeBrand = (value = '') => {
    const text = String(value || '').trim()
    if (!text) return ''
    return text
        .toLowerCase()
        .split(/\s+/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
}

const getRatingOf = (product) => {
    const summary = Number(product.reviewSummary?.averageRating)
    if (Number.isFinite(summary)) return summary
    const direct = Number(product.rating)
    if (Number.isFinite(direct)) return direct
    return Number(product.amazonRating) || 0
}

const getDiscountOf = (product) => {
    const provided = Number(product.discount)
    if (Number.isFinite(provided) && provided > 0) return provided
    const price = Number(product.price)
    const original = Number(product.originalPrice || product.original_price)
    if (!price || !original || original <= price) return 0
    return Math.round(((original - price) / original) * 100)
}

export default function ShopCatalogClient({ initialSearch = '', mode = 'shop' }) {
    const router = useRouter()
    const { user, loading: authLoading } = useAuth()
    const [products, setProducts] = useState([])
    const [source, setSource] = useState('fallback')
    const [loading, setLoading] = useState(true)
    const [query, setQuery] = useState(String(initialSearch || ''))
    const [brand, setBrand] = useState('all')
    const [category, setCategory] = useState('all')
    const [sortBy, setSortBy] = useState('relevance')
    const [minPrice, setMinPrice] = useState('')
    const [maxPrice, setMaxPrice] = useState('')
    const [filtersOpen, setFiltersOpen] = useState(false)
    const [fallbackProducts, setFallbackProducts] = useState([])
    const [fallbackCategoryLabel, setFallbackCategoryLabel] = useState('this category')
    const [fallbackLoading, setFallbackLoading] = useState(false)

    useEffect(() => {
        setQuery(String(initialSearch || ''))
    }, [initialSearch])

    useEffect(() => {
        if (authLoading) return

        let cancelled = false
        setLoading(true)

        const params = new URLSearchParams()
        params.set('limit', '120')
        const normalizedSearch = String(query || '').trim()
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
    }, [authLoading, user?.uid, query])

    const brands = useMemo(() => {
        const values = new Map()
        products.forEach((product) => {
            const value = String(product.brand || '').trim()
            const key = canonicalizeBrand(value)
            if (!key) return
            if (!values.has(key)) values.set(key, humanizeBrand(value))
        })
        return Array.from(values.entries())
            .map(([value, label]) => ({ value, label }))
            .sort((a, b) => a.label.localeCompare(b.label))
    }, [products])

    const priceBounds = useMemo(() => {
        const numericPrices = products
            .map((product) => Number(product.price))
            .filter((value) => Number.isFinite(value) && value >= 0)

        if (!numericPrices.length) return { min: 0, max: 100000 }
        return {
            min: Math.floor(Math.min(...numericPrices)),
            max: Math.ceil(Math.max(...numericPrices)),
        }
    }, [products])

    const categories = useMemo(() => {
        const values = new Set()
        products.forEach((product) => {
            const value = String(product.categories?.name || product.category || '').trim()
            if (value) values.add(value)
        })
        return Array.from(values).sort((a, b) => a.localeCompare(b))
    }, [products])

    const filteredProducts = useMemo(() => {
        const normalizedQuery = String(query || '').trim().toLowerCase()
        const min = Number.parseFloat(minPrice)
        const max = Number.parseFloat(maxPrice)

        const matches = products.filter((product) => {
            const searchBlob = [
                product.title,
                product.name,
                product.description,
                product.brand,
                product.categories?.name,
                product.category,
                ...(Array.isArray(product.tags) ? product.tags : []),
            ].filter(Boolean).join(' ').toLowerCase()

            if (normalizedQuery && !searchBlob.includes(normalizedQuery)) return false
            if (brand !== 'all' && canonicalizeBrand(product.brand || '') !== brand) return false

            const categoryName = String(product.categories?.name || product.category || '').trim()
            if (category !== 'all' && categoryName !== category) return false

            const price = Number(product.price)
            if (Number.isFinite(min) && minPrice !== '' && price < min) return false
            if (Number.isFinite(max) && maxPrice !== '' && price > max) return false

            return true
        })

        matches.sort((a, b) => {
            if (sortBy === 'price_low') return Number(a.price || 0) - Number(b.price || 0)
            if (sortBy === 'price_high') return Number(b.price || 0) - Number(a.price || 0)
            if (sortBy === 'rating') return getRatingOf(b) - getRatingOf(a)
            if (sortBy === 'discount') return getDiscountOf(b) - getDiscountOf(a)
            if (sortBy === 'newest') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
            return 0
        })

        return matches
    }, [products, query, brand, category, minPrice, maxPrice, sortBy])

    const activeFilterCount = [
        String(query || '').trim() !== String(initialSearch || '').trim(),
        brand !== 'all',
        category !== 'all',
        sortBy !== 'relevance',
        minPrice !== '',
        maxPrice !== '',
    ].filter(Boolean).length

    const clearFilters = () => {
        setQuery(String(initialSearch || ''))
        setBrand('all')
        setCategory('all')
        setSortBy('relevance')
        setMinPrice('')
        setMaxPrice('')
    }

    const sliderMin = minPrice === '' ? priceBounds.min : Number(minPrice)
    const sliderMax = maxPrice === '' ? priceBounds.max : Number(maxPrice)

    useEffect(() => {
        if (loading || filteredProducts.length > 0 || !String(query || '').trim()) {
            setFallbackProducts([])
            setFallbackCategoryLabel('this category')
            setFallbackLoading(false)
            return
        }

        let cancelled = false
        setFallbackLoading(true)

        fetch('/api/products?limit=120', { cache: 'no-store' })
            .then((res) => res.json())
            .then((data) => {
                if (cancelled) return

                const pool = Array.isArray(data?.products) ? data.products : []
                if (!pool.length) {
                    setFallbackProducts([])
                    setFallbackLoading(false)
                    return
                }

                const normalizedQuery = String(query || '').trim().toLowerCase()
                const categoryNames = new Map()

                pool.forEach((item) => {
                    const name = String(item.categories?.name || item.category || '').trim()
                    if (!name) return
                    categoryNames.set(name, (categoryNames.get(name) || 0) + 1)
                })

                let targetCategory = category !== 'all' ? category : null
                if (!targetCategory && normalizedQuery) {
                    targetCategory = Array.from(categoryNames.keys()).find((name) => {
                        const n = name.toLowerCase()
                        return n.includes(normalizedQuery) || normalizedQuery.includes(n)
                    }) || null
                }

                if (!targetCategory) {
                    targetCategory = Array.from(categoryNames.entries())
                        .sort((a, b) => b[1] - a[1])[0]?.[0] || null
                }

                const scoped = targetCategory
                    ? pool.filter((item) => String(item.categories?.name || item.category || '').trim() === targetCategory)
                    : pool

                const picks = scoped
                    .sort((a, b) => {
                        const valueA = getDiscountOf(a) * 2 + getRatingOf(a) * 6
                        const valueB = getDiscountOf(b) * 2 + getRatingOf(b) * 6
                        return valueB - valueA
                    })
                    .slice(0, 6)

                setFallbackProducts(picks)
                setFallbackCategoryLabel(targetCategory || 'this category')
                setFallbackLoading(false)
            })
            .catch(() => {
                if (cancelled) return
                setFallbackProducts([])
                setFallbackLoading(false)
            })

        return () => {
            cancelled = true
        }
    }, [loading, filteredProducts, query, category])

    const visibleProducts = filteredProducts.length > 0 ? filteredProducts : fallbackProducts
    const showingFallback = filteredProducts.length === 0 && fallbackProducts.length > 0

    const comparisonRows = useMemo(() => {
        if (category === 'all') return []

        const scoped = visibleProducts
            .filter((item) => String(item.categories?.name || item.category || '').trim() === category)
            .slice(0, 12)

        if (!scoped.length) return []

        const rows = scoped
            .map((item) => ({
                ...item,
                _valueScore: getDiscountOf(item) * 2 + getRatingOf(item) * 6,
                _keySpec: Array.isArray(item.tags) && item.tags.length
                    ? String(item.tags[0])
                    : String(item.brand || item.categories?.name || item.category || 'Smart pick'),
            }))
            .sort((a, b) => b._valueScore - a._valueScore)
            .slice(0, 4)

        return rows
    }, [visibleProducts, category])

    return (
        <div className="min-h-[70vh] px-3 sm:px-6">
            <div className="max-w-7xl mx-auto my-6 space-y-5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                        <Link href="/shop" className="text-2xl text-slate-500 flex items-center gap-2 hover:text-slate-700 transition group">
                            {(mode === 'search' || query.trim()) && <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />}
                            {mode === 'search' ? 'Discover' : 'All'} <span className="text-slate-700 font-medium">Products</span>
                        </Link>
                        {query.trim() && (
                            <p className="text-sm text-slate-400 mt-1">Showing results for "{query.trim()}"</p>
                        )}
                        <p className="text-xs text-slate-400 mt-2">
                            {source === 'personalized'
                                ? 'Sorted by your interest signals, quality, value, recency, and diversity.'
                                : 'Sorted by quality, value, and freshness. Sign in for personalized ranking.'}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => setFiltersOpen((prev) => !prev)}
                        className="lg:hidden inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                    >
                        <Sliders size={14} />
                        Filters
                        {activeFilterCount > 0 && <span className="ml-1 inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-black text-white text-[10px]">{activeFilterCount}</span>}
                    </button>
                </div>

                <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)] items-start">
                    <aside className={`${filtersOpen ? 'block' : 'hidden'} lg:block lg:sticky lg:top-24 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3`}>
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-1.5"><Funnel size={12} /> Filters</p>
                            {activeFilterCount > 0 && (
                                <button
                                    type="button"
                                    onClick={clearFilters}
                                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
                                >
                                    <XCircle size={12} />
                                    Clear
                                </button>
                            )}
                        </div>

                        <label className="space-y-1.5 block">
                            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 flex items-center gap-1.5"><Search size={12} /> Search</span>
                            <input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder={mode === 'search' ? 'Search discover products...' : 'Search products...'}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
                            />
                        </label>

                        <label className="space-y-1.5 block">
                            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Sort</span>
                            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 bg-white">
                                {SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                            </select>
                        </label>

                        <label className="space-y-1.5 block">
                            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Brand</span>
                            <select value={brand} onChange={(e) => setBrand(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 bg-white">
                                <option value="all">All brands</option>
                                {brands.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                            </select>
                        </label>

                        <label className="space-y-1.5 block">
                            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Category</span>
                            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 bg-white">
                                <option value="all">All categories</option>
                                {categories.map((item) => <option key={item} value={item}>{item}</option>)}
                            </select>
                        </label>

                        <div className="grid grid-cols-2 gap-2">
                            <label className="space-y-1.5 block">
                                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 flex items-center gap-1.5"><CurrencyDollar size={12} /> Min</span>
                                <input
                                    type="number"
                                    value={minPrice}
                                    onChange={(e) => setMinPrice(e.target.value)}
                                    placeholder="0"
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
                                />
                            </label>
                            <label className="space-y-1.5 block">
                                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 flex items-center gap-1.5"><CurrencyDollar size={12} /> Max</span>
                                <input
                                    type="number"
                                    value={maxPrice}
                                    onChange={(e) => setMaxPrice(e.target.value)}
                                    placeholder="99999"
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
                                />
                            </label>
                        </div>

                        <div className="space-y-2 pt-1">
                            <div className="flex items-center justify-between text-xs text-slate-500">
                                <span>Min: {formatPrice(sliderMin, 'INR', 'en-IN')}</span>
                                <span>{formatPrice(sliderMax, 'INR', 'en-IN')}</span>
                            </div>
                            <input
                                type="range"
                                min={priceBounds.min}
                                max={Math.max(priceBounds.max, priceBounds.min + 1)}
                                value={sliderMax}
                                onChange={(e) => {
                                    const next = Number(e.target.value)
                                    setMaxPrice(String(next))
                                    if (minPrice !== '' && Number(minPrice) > next) {
                                        setMinPrice(String(next))
                                    }
                                }}
                                className="w-full accent-slate-800"
                            />
                        </div>

                        <p className="text-xs text-slate-400 pt-1">{filteredProducts.length} products match your filters.</p>
                    </aside>

                    {loading ? (
                        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 mx-auto mb-20 sm:mb-32">
                            {Array.from({ length: 12 }).map((_, i) => (
                                <div key={i} className="h-56 rounded-xl bg-slate-100" />
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-4 mb-20 sm:mb-32">
                            {showingFallback && (
                                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                                    No exact match — here are our top picks in this category: <span className="font-semibold text-slate-800">{fallbackCategoryLabel}</span>
                                </div>
                            )}

                            {fallbackLoading && filteredProducts.length === 0 && (
                                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                                    Looking for category-based alternatives...
                                </div>
                            )}

                            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-7 mx-auto">
                                {visibleProducts.length > 0 ? (
                                    visibleProducts.map((product) => (
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
                                        <button type="button" onClick={clearFilters} className="text-indigo-600 font-medium text-sm hover:underline">
                                            Clear filters
                                        </button>
                                    </div>
                                )}
                            </div>

                            {comparisonRows.length > 0 && (
                                <div className="sticky bottom-3 z-20 rounded-2xl border border-slate-200 bg-white/95 backdrop-blur shadow-lg">
                                    <div className="px-4 pt-3 pb-2 border-b border-slate-100">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Category Comparison</p>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-[740px] w-full text-sm">
                                            <thead>
                                                <tr className="text-left text-slate-500 border-b border-slate-100">
                                                    <th className="px-4 py-2.5 font-medium">Name</th>
                                                    <th className="px-4 py-2.5 font-medium">Price</th>
                                                    <th className="px-4 py-2.5 font-medium">Rating</th>
                                                    <th className="px-4 py-2.5 font-medium">Key Spec</th>
                                                    <th className="px-4 py-2.5 font-medium">CTA</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {comparisonRows.map((item, idx) => (
                                                    <tr key={item.id || idx} className={`${idx === 0 ? 'border-l-4 border-emerald-400/50 bg-emerald-50/30' : ''} border-b border-slate-100 align-top`}>
                                                        <td className="px-4 py-3 text-slate-800 font-medium max-w-[220px] truncate">{item.title || item.name}</td>
                                                        <td className="px-4 py-3 text-slate-700">{formatPrice(Number(item.price || 0), 'INR', 'en-IN')}</td>
                                                        <td className="px-4 py-3 text-slate-700">{getRatingOf(item).toFixed(1)}</td>
                                                        <td className="px-4 py-3 text-slate-600">{item._keySpec}</td>
                                                        <td className="px-4 py-3">
                                                            <button
                                                                onClick={() => router.push(`/products/${item.id}`)}
                                                                className="inline-flex items-center justify-center rounded-full bg-[#00A8A8] hover:bg-[#008888] text-white text-xs font-semibold px-3 py-1.5"
                                                            >
                                                                Check It →
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

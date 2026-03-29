'use client'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useSelector } from 'react-redux'
import ProductCard from '@/components/ProductCard'
import { SearchIcon } from 'lucide-react'

function SearchContent() {
    const searchParams = useSearchParams()
    const q = searchParams.get('q') || ''
    const products = useSelector(state => state.product.list)

    const results = q
        ? products.filter(p =>
            (p.title || p.name).toLowerCase().includes(q.toLowerCase()) ||
            p.description?.toLowerCase().includes(q.toLowerCase())
        )
        : []

    return (
        <div className="max-w-7xl mx-auto px-6 py-10 space-y-6">
            <div className="flex items-center gap-2 text-slate-600">
                <SearchIcon size={20} />
                <h1 className="text-xl font-semibold text-slate-800">
                    {q ? `Results for "${q}"` : 'Search Products'}
                </h1>
                {q && <span className="text-slate-400 text-sm">({results.length} found)</span>}
            </div>

            {!q && <p className="text-slate-400 text-sm">Enter a search term in the navbar to find products.</p>}

            {q && results.length === 0 && (
                <div className="text-center py-20 text-slate-400">No products found for "{q}".</div>
            )}

            {results.length > 0 && (
                <div className="grid grid-cols-2 sm:flex flex-wrap gap-6 xl:gap-10">
                    {results.map(p => <ProductCard key={p.id} product={p} />)}
                </div>
            )}
        </div>
    )
}

export default function SearchPage() {
    return <Suspense fallback={<div className="p-10 text-slate-400">Searching...</div>}><SearchContent /></Suspense>
}

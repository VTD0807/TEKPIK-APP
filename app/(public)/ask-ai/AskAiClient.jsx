'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Stars, LightningCharge } from 'react-bootstrap-icons'
import { formatPrice } from '@/lib/currency'

export const dynamic = 'force-dynamic'

export default function AskAiClient() {
    const [query, setQuery] = useState('')
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState(null)
    const [error, setError] = useState('')

    const onSubmit = async (e) => {
        e.preventDefault()
        const trimmed = query.trim()
        if (!trimmed) return

        try {
            setLoading(true)
            setError('')
            const res = await fetch('/api/ai/ask-ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: trimmed }),
            })
            const payload = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(payload?.error || 'Failed to get Ask AI recommendations')
            setResult(payload)
        } catch (err) {
            setError(err.message)
            setResult(null)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 sm:py-10">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
                <div className="flex items-center gap-2 text-slate-800 mb-2">
                    <Stars size={20} className="text-indigo-600" />
                    <h1 className="text-2xl font-semibold">Ask AI</h1>
                </div>
                <p className="text-sm text-slate-500 mb-4">
                    Describe what you need. Ask AI checks live products from Firebase, recommends the closest matches, and gives a quick overview.
                </p>

                <form onSubmit={onSubmit} className="space-y-3">
                    <textarea
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        rows={3}
                        placeholder="Example: Recommend a gaming phone under 30000 with great battery and AMOLED display"
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
                    />
                    <button
                        type="submit"
                        disabled={loading || !query.trim()}
                        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-700 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        <LightningCharge size={14} />
                        {loading ? 'Thinking...' : 'Get Recommendations'}
                    </button>
                </form>
            </div>

            {error && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            {result && (
                <div className="mt-6 space-y-5">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
                        <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Overview</p>
                            <p className="text-xs text-slate-400">Model: {result.modelUsed}</p>
                        </div>
                        <p className="text-sm text-slate-700 leading-6">{result.overview}</p>
                    </div>

                    {Array.isArray(result.whyThese) && result.whyThese.length > 0 && (
                        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Why these picks</p>
                            <ul className="space-y-1 text-sm text-slate-700">
                                {result.whyThese.map((reason, idx) => <li key={idx}>• {reason}</li>)}
                            </ul>
                        </div>
                    )}

                    {Array.isArray(result.products) && result.products.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {result.products.map((product) => {
                                const title = product.title || product.name || 'Untitled product'
                                const image = product.imageUrls?.[0] || product.images?.[0] || product.image_urls?.[0]
                                const subtitle = [product.brand, product.categories?.name || product.category].filter(Boolean).join(' • ')

                                return (
                                    <Link key={product.id} href={`/products/${product.id}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition block">
                                        <div className="h-36 w-full rounded-lg border border-slate-100 bg-slate-50 overflow-hidden flex items-center justify-center mb-3">
                                            {image ? (
                                                <img src={image} alt={title} className="h-full w-full object-contain" loading="lazy" referrerPolicy="no-referrer" />
                                            ) : (
                                                <span className="text-xs text-slate-400">No image</span>
                                            )}
                                        </div>
                                        <p className="text-sm font-semibold text-slate-800 line-clamp-2">{title}</p>
                                        <p className="text-xs text-slate-500 mt-1">{subtitle || 'Recommended product'}</p>
                                        <p className="text-sm text-slate-900 font-semibold mt-2">{formatPrice(Number(product.price || 0), 'INR', 'en-IN')}</p>
                                    </Link>
                                )
                            })}
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                            No exact qualifying products matched your requirement right now.
                        </div>
                    )}

                    {Array.isArray(result.alternativeAdvice) && result.alternativeAdvice.length > 0 && (
                        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Alternative advice</p>
                            <ul className="space-y-1 text-sm text-slate-700">
                                {result.alternativeAdvice.map((advice, idx) => <li key={idx}>• {advice}</li>)}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

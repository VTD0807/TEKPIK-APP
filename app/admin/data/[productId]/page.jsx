'use client'
import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Loading from '@/components/Loading'
import { ArrowLeft, GraphUp, GeoAlt, Heart, Star, Stars } from 'react-bootstrap-icons'

const SimpleMap = ({ regions = [] }) => {
    const total = regions.reduce((sum, item) => sum + item.count, 0) || 1
    const max = Math.max(...regions.map(item => item.count), 1)

    const tiles = regions.slice(0, 6).map((item, index) => {
        const positions = [
            { x: '50%', y: '18%', w: '22%', h: '12%' },
            { x: '30%', y: '40%', w: '18%', h: '12%' },
            { x: '50%', y: '42%', w: '20%', h: '12%' },
            { x: '70%', y: '40%', w: '18%', h: '12%' },
            { x: '50%', y: '66%', w: '22%', h: '12%' },
            { x: '82%', y: '28%', w: '18%', h: '12%' },
        ]
        return { ...item, ...positions[index] }
    })

    return (
        <div className="space-y-3">
            <div className="relative h-[320px] rounded-2xl border border-slate-200 bg-gradient-to-b from-sky-50 to-white overflow-hidden">
                <div className="absolute inset-0 opacity-[0.06] [background-image:radial-gradient(circle_at_1px_1px,#0f172a_1px,transparent_0)] [background-size:24px_24px]" />
                <div className="absolute left-4 top-4 text-xs text-slate-500 uppercase tracking-wider">India region heatmap</div>
                <div className="absolute inset-0">
                    {tiles.length > 0 ? tiles.map((tile, index) => {
                        const intensity = tile.count > 0 ? (tile.count / max) : 0
                        return (
                            <div
                                key={`${tile.name}-${index}`}
                                className="absolute flex items-center justify-center rounded-2xl border shadow-sm transition"
                                style={{
                                    left: tile.x,
                                    top: tile.y,
                                    width: tile.w,
                                    height: tile.h,
                                    transform: 'translate(-50%, -50%)',
                                    backgroundColor: `rgba(59,130,246,${0.12 + (0.42 * intensity)})`,
                                    borderColor: 'rgba(59,130,246,0.35)',
                                }}
                                title={`${tile.name}: ${tile.count} visits`}
                            >
                                <div className="text-center px-2">
                                    <p className="text-[10px] font-semibold text-slate-700 truncate max-w-full">{tile.name}</p>
                                    <p className="text-[10px] text-slate-500">{tile.count}</p>
                                </div>
                            </div>
                        )
                    }) : (
                        <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
                            No regional visits captured yet
                        </div>
                    )}
                </div>
                <div className="absolute bottom-4 right-4 text-[11px] text-slate-400">Top region intensity shown by unique visits</div>
                <div className="absolute bottom-4 left-4 text-[11px] text-slate-500">Total unique regional records: {total}</div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {regions.slice(0, 6).map((region, index) => (
                    <div key={`${region.name}-summary-${index}`} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                        <p className="text-xs text-slate-400 uppercase tracking-wider truncate">{region.name}</p>
                        <p className="text-lg font-semibold text-slate-800">{region.count}</p>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default function ProductAnalyticsPage() {
    const { productId } = useParams()
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState(null)

    useEffect(() => {
        if (!productId) return
        fetch(`/api/admin/analytics/products/${productId}`, { cache: 'no-store' })
            .then(res => res.json())
            .then(json => {
                setData(json)
                setLoading(false)
            })
            .catch(() => setLoading(false))
    }, [productId])

    const scorePct = useMemo(() => Number(data?.metrics?.interestScore || 0), [data])

    if (loading) return <Loading />

    if (!data?.product) {
        return (
            <div className="space-y-4">
                <button onClick={() => router.back()} className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900">
                    <ArrowLeft size={16} /> Back
                </button>
                <p className="text-slate-500">Product analytics not found.</p>
            </div>
        )
    }

    const { product, metrics, topRegions, topCities, reviews, aiAnalysis } = data

    return (
        <div className="space-y-6 pb-16">
            <button onClick={() => router.back()} className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 transition">
                <ArrowLeft size={16} /> Back to product analytics
            </button>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row gap-5 items-start">
                <div className="w-24 h-24 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center shrink-0">
                    {product.imageUrl ? <img src={product.imageUrl} alt={product.title} className="w-full h-full object-contain" referrerPolicy="no-referrer" /> : <span className="text-xs text-slate-400">No image</span>}
                </div>
                <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h1 className="text-2xl text-slate-800 font-semibold">{product.title}</h1>
                        {product.brand && <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{product.brand}</span>}
                    </div>
                    <p className="text-sm text-slate-500 max-w-3xl">{product.description || 'No product description available.'}</p>
                    <div className="flex items-center gap-4 flex-wrap text-sm text-slate-500">
                        <span className="inline-flex items-center gap-1.5"><GraphUp size={14} /> Interest score {scorePct}%</span>
                        <span className="inline-flex items-center gap-1.5"><GeoAlt size={14} /> {metrics.uniqueDeviceViews} unique device views</span>
                        <span className="inline-flex items-center gap-1.5"><Heart size={14} /> {metrics.wishlistCount} wishlists</span>
                        <span className="inline-flex items-center gap-1.5"><Star size={14} /> {metrics.reviewCount} reviews</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard label="Unique Device Views" value={metrics.uniqueDeviceViews} />
                <MetricCard label="Wishlist Interest" value={metrics.wishlistCount} />
                <MetricCard label="Review Volume" value={metrics.reviewCount} />
                <MetricCard label="Average Rating" value={metrics.averageRating ? metrics.averageRating.toFixed(1) : '—'} />
            </div>

            <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6 items-start">
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-800">India Region Breakdown</h2>
                            <p className="text-sm text-slate-500">Regions captured from page visits. Hotter areas mean more unique visits.</p>
                        </div>
                        <span className="text-sm font-medium text-slate-700">{metrics.interestScore}% interest</span>
                    </div>
                    <SimpleMap regions={topRegions || []} />
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                    <h2 className="text-lg font-semibold text-slate-800">Top Regions</h2>
                    <div className="space-y-3">
                        {(topRegions || []).length > 0 ? topRegions.map((item, index) => (
                            <div key={`${item.name}-${index}`} className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="font-medium text-slate-700 truncate">{item.name}</p>
                                    <p className="text-xs text-slate-400">Unique visits</p>
                                </div>
                                <span className="font-semibold text-slate-800">{item.count}</span>
                            </div>
                        )) : <p className="text-sm text-slate-400">No region data collected yet.</p>}
                    </div>

                    <h2 className="text-lg font-semibold text-slate-800 pt-2">Top Cities</h2>
                    <div className="space-y-3">
                        {(topCities || []).length > 0 ? topCities.map((item, index) => (
                            <div key={`${item.name}-${index}`} className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="font-medium text-slate-700 truncate">{item.name}</p>
                                    <p className="text-xs text-slate-400">Unique visits</p>
                                </div>
                                <span className="font-semibold text-slate-800">{item.count}</span>
                            </div>
                        )) : <p className="text-sm text-slate-400">No city data collected yet.</p>}
                    </div>
                </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                    <h2 className="text-lg font-semibold text-slate-800">Deep Product Analysis</h2>
                    <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
                        <p><span className="font-semibold text-slate-800">Interest rate:</span> {metrics.interestScore}% based on views, wishlists, reviews, average rating, and AI score.</p>
                        <p><span className="font-semibold text-slate-800">Audience quality:</span> unique device views ensure repeat refreshes do not inflate engagement.</p>
                        <p><span className="font-semibold text-slate-800">Market signal:</span> product is being tracked across region-level visits, which can help identify where demand is strongest.</p>
                        <p><span className="font-semibold text-slate-800">AI verdict:</span> {aiAnalysis?.verdict || aiAnalysis?.summary || 'No AI analysis available yet.'}</p>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                    <h2 className="text-lg font-semibold text-slate-800">Recent Reviews</h2>
                    <div className="space-y-3 max-h-[360px] overflow-auto pr-1">
                        {reviews && reviews.length > 0 ? reviews.map((review) => (
                            <div key={review.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-2">
                                <div className="flex items-center justify-between gap-3">
                                    <p className="font-medium text-slate-700 truncate">{review.title || 'Review'}</p>
                                    <span className="text-xs font-semibold text-slate-500">{review.rating}/5</span>
                                </div>
                                <p className="text-sm text-slate-600 line-clamp-4">{review.body || review.review || ''}</p>
                            </div>
                        )) : <p className="text-sm text-slate-400">No reviews yet.</p>}
                    </div>
                </div>
            </div>
        </div>
    )
}

function MetricCard({ label, value }) {
    return (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
        </div>
    )
}

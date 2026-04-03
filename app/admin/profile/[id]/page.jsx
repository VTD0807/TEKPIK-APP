'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Shield, Person, Star, Heart, BoxSeam, BoxArrowUpRight, Calendar, Envelope, Cpu, GeoAlt } from 'react-bootstrap-icons'
import Link from 'next/link'

export default function AdminUserProfile() {
    const params = useParams()
    const router = useRouter()
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [tab, setTab] = useState('wishlists')

    useEffect(() => {
        if (!params.id) return
        fetch(`/api/admin/users/${params.id}`)
            .then(r => r.json())
            .then(d => { setData(d); setLoading(false) })
            .catch(() => setLoading(false))
    }, [params.id])

    if (loading) {
        return (
            <div className="text-slate-500 space-y-6 pb-20">
                <div className="flex items-center gap-3">
                    <button onClick={() => router.back()} className="p-1.5 text-slate-400 hover:text-slate-600 transition">
                        <ArrowLeft size={18} />
                    </button>
                    <div className="h-7 w-48 bg-slate-100 rounded animate-pulse" />
                </div>
                <div className="animate-pulse space-y-4">
                    <div className="h-32 bg-slate-50 rounded-xl border border-slate-100" />
                    <div className="h-48 bg-slate-50 rounded-xl border border-slate-100" />
                </div>
            </div>
        )
    }

    if (!data?.user) {
        return (
            <div className="text-slate-500 space-y-6 pb-20">
                <div className="flex items-center gap-3">
                    <button onClick={() => router.back()} className="p-1.5 text-slate-400 hover:text-slate-600 transition">
                        <ArrowLeft size={18} />
                    </button>
                    <h1 className="text-2xl text-slate-500">User <span className="text-slate-800 font-medium">Not Found</span></h1>
                </div>
                <p className="text-slate-400">This user does not exist or hasn't been synced yet.</p>
            </div>
        )
    }

    const { user, reviews, wishlists, analytics } = data

    return (
        <div className="text-slate-600 space-y-6 pb-20 max-w-4xl">
            <div className="flex items-center gap-3">
                <button onClick={() => router.back()} className="p-1.5 text-slate-400 hover:text-slate-600 transition">
                    <ArrowLeft size={18} />
                </button>
                <h1 className="text-2xl text-slate-500">User <span className="text-slate-800 font-medium">Profile</span></h1>
            </div>

            {/* User Card */}
            <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm flex flex-col sm:flex-row items-start gap-5">
                {user.image ? (
                    <img src={user.image} alt={user.name} className="w-16 h-16 rounded-full object-cover ring-4 ring-slate-100" referrerPolicy="no-referrer" />
                ) : (
                    <div className="w-16 h-16 rounded-full bg-black flex items-center justify-center text-white text-xl font-bold ring-4 ring-slate-100">
                        {(user.name || user.email || '?')[0]?.toUpperCase() || 'U'}
                    </div>
                )}
                <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3 flex-wrap">
                        <h2 className="text-xl font-semibold text-slate-800">{user.name || 'Unknown'}</h2>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${user.role === 'ADMIN' ? 'bg-slate-100 text-slate-900' : 'bg-slate-100 text-slate-500'}`}>
                            {user.role === 'ADMIN' ? <Shield size={11} /> : <Person size={11} />}
                            {user.role || 'USER'}
                        </span>
                    </div>
                    <div className="flex items-center gap-4 flex-wrap text-sm text-slate-500">
                        <span className="flex items-center gap-1.5"><Envelope size={13} /> {user.email}</span>
                        <span className="flex items-center gap-1.5"><Calendar size={13} /> Joined {new Date(user.createdAt || user.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                </div>
                <div className="flex gap-4 sm:gap-6 text-center">
                    <div>
                        <p className="text-2xl font-bold text-slate-800">{reviews?.length || 0}</p>
                        <p className="text-[11px] text-slate-400 uppercase tracking-wider">Reviews</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-slate-800">{wishlists?.length || 0}</p>
                        <p className="text-[11px] text-slate-400 uppercase tracking-wider">Wishlisted</p>
                    </div>
                </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                    <Cpu size={15} className="text-slate-500" />
                    <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Device Identity</h2>
                </div>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div className="rounded-lg border border-slate-100 bg-slate-50 p-4 space-y-1">
                        <p className="text-xs text-slate-400 uppercase tracking-wider">Primary Device ID</p>
                        <p className="font-mono text-slate-800 break-all">{user.deviceId || '—'}</p>
                    </div>
                    <div className="rounded-lg border border-slate-100 bg-slate-50 p-4 space-y-1">
                        <p className="text-xs text-slate-400 uppercase tracking-wider">Known Device IDs</p>
                        <p className="font-mono text-slate-800 break-all">{Array.isArray(user.deviceIds) && user.deviceIds.length > 0 ? user.deviceIds.join(', ') : '—'}</p>
                    </div>
                </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm space-y-5">
                <div>
                    <div className="flex items-center gap-2">
                        <GeoAlt size={15} className="text-slate-500" />
                        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Location & Device Analytics</h2>
                    </div>
                    <p className="text-sm text-slate-400 mt-1">Latest IP-based location and device data captured from user activity.</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <AnalyticsCard label="Total Visits" value={analytics?.totalVisits || 0} />
                    <AnalyticsCard label="Top Phone" value={analytics?.topPhones?.[0]?.name || '—'} />
                    <AnalyticsCard label="Top Browser" value={analytics?.topBrowsers?.[0]?.name || '—'} />
                    <AnalyticsCard label="Top OS" value={analytics?.topOs?.[0]?.name || '—'} />
                </div>

                <div className="grid lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-slate-700">India Region Map</h3>
                        <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-sky-50 to-white p-4 min-h-[280px] flex flex-col justify-center">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {(analytics?.topRegions || []).length > 0 ? analytics.topRegions.map((item, index) => (
                                    <div key={`${item.name}-${index}`} className="rounded-xl border border-slate-200 bg-white/80 p-3">
                                        <p className="text-[10px] uppercase tracking-wider text-slate-400 truncate">{item.name}</p>
                                        <p className="text-lg font-bold text-slate-800">{item.count}</p>
                                    </div>
                                )) : <p className="text-sm text-slate-400">No region analytics captured yet.</p>}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-slate-700">Device / Location Details</h3>
                        <div className="space-y-3">
                            <InfoRow label="Last Known IP" value={user.lastKnownIp || '—'} />
                            <InfoRow label="Country" value={user.lastKnownCountry || '—'} />
                            <InfoRow label="Region" value={user.lastKnownRegion || '—'} />
                            <InfoRow label="City" value={user.lastKnownCity || '—'} />
                            <InfoRow label="Phone Model" value={user.lastKnownPhoneModel || analytics?.topPhones?.[0]?.name || '—'} />
                            <InfoRow label="Browser" value={user.lastKnownBrowser || analytics?.topBrowsers?.[0]?.name || '—'} />
                            <InfoRow label="Operating System" value={user.lastKnownOs || analytics?.topOs?.[0]?.name || '—'} />
                            <InfoRow label="Device Type" value={user.lastKnownDeviceType || '—'} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 w-fit">
                {[
                    { key: 'wishlists', label: 'Interests', icon: Heart, count: wishlists?.length },
                    { key: 'reviews', label: 'Reviews', icon: Star, count: reviews?.length },
                ].map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)}
                        className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition ${tab === t.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                        <t.icon size={14} />
                        {t.label}
                        {t.count > 0 && <span className="text-[11px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full">{t.count}</span>}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {tab === 'wishlists' && (
                <div className="space-y-3">
                    {wishlists && wishlists.length > 0 ? wishlists.map((w, i) => (
                        <div key={i} className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm flex items-center gap-4 hover:shadow-md transition">
                            <div className="w-14 h-14 bg-slate-50 rounded-lg flex items-center justify-center overflow-hidden border border-slate-100 shrink-0">
                                {w.products?.image_urls?.[0] ? (
                                    <img src={w.products.image_urls[0]} alt="" className="w-full h-full object-contain" referrerPolicy="no-referrer" onError={e => e.target.style.display = 'none'} />
                                ) : (
                                    <BoxSeam size={18} className="text-slate-300" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-800 truncate">{w.products?.title || 'Unknown Product'}</p>
                                <div className="flex items-center gap-3 mt-0.5">
                                    {w.products?.brand && <span className="text-xs text-slate-400">{w.products.brand}</span>}
                                    {w.products?.price && <span className="text-xs font-medium text-slate-800">${w.products.price}</span>}
                                    <span className="text-xs text-slate-400">Added {new Date(w.added_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                            {w.products?.affiliate_url && (
                                <a href={w.products.affiliate_url} target="_blank" rel="noopener noreferrer" className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition">
                                    <BoxArrowUpRight size={15} />
                                </a>
                            )}
                        </div>
                    )) : (
                        <div className="text-center py-12 bg-white border border-slate-100 rounded-xl">
                            <Heart size={32} className="mx-auto mb-2 text-slate-300" />
                            <p className="text-slate-400">No wishlisted items yet.</p>
                        </div>
                    )}
                </div>
            )}

            {tab === 'reviews' && (
                <div className="space-y-3">
                    {reviews && reviews.length > 0 ? reviews.map((r, i) => (
                        <div key={i} className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm hover:shadow-md transition">
                            <div className="flex items-start gap-4">
                                <div className="w-14 h-14 bg-slate-50 rounded-lg flex items-center justify-center overflow-hidden border border-slate-100 shrink-0">
                                    {r.products?.image_urls?.[0] ? (
                                        <img src={r.products.image_urls[0]} alt="" className="w-full h-full object-contain" referrerPolicy="no-referrer" onError={e => e.target.style.display = 'none'} />
                                    ) : (
                                        <BoxSeam size={18} className="text-slate-300" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-slate-400 mb-1">{r.products?.title || 'Unknown Product'}</p>
                                    <p className="text-sm font-medium text-slate-800">{r.title}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="flex">
                                            {Array(5).fill('').map((_, j) => (
                                                <Star key={j} size={11} fill={j < r.rating ? '#f59e0b' : '#e2e8f0'} className={j < r.rating ? 'text-slate-400' : 'text-slate-200'} />
                                            ))}
                                        </div>
                                        <span className="text-xs text-slate-400">{new Date(r.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="text-center py-12 bg-white border border-slate-100 rounded-xl">
                            <Star size={32} className="mx-auto mb-2 text-slate-300" />
                            <p className="text-slate-400">No reviews written yet.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

function AnalyticsCard({ label, value }) {
    return (
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-[10px] uppercase tracking-wider text-slate-400">{label}</p>
            <p className="mt-1 text-base font-semibold text-slate-800 break-words">{String(value)}</p>
        </div>
    )
}

function InfoRow({ label, value }) {
    return (
        <div className="flex items-start justify-between gap-4 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
            <p className="text-xs uppercase tracking-wider text-slate-400">{label}</p>
            <p className="text-sm font-medium text-slate-800 text-right break-all">{value}</p>
        </div>
    )
}

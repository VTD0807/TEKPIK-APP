'use client'
import { useEffect, useState, useCallback } from 'react'
import {
    Phone, Laptop, Tablet, Globe2, GeoAlt, Eye, ArrowRepeat,
    Search, FunnelFill, PeopleFill, PersonFill, ClockHistory,
} from 'react-bootstrap-icons'

const fmtDate = v => v ? new Date(v).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'
const fmtNum = n => Number.isFinite(Number(n)) ? Number(n).toLocaleString('en-IN') : '0'

const DeviceIcon = ({ type, size = 16 }) => {
    if (type === 'mobile') return <Phone size={size} />
    if (type === 'tablet') return <Tablet size={size} />
    return <Laptop size={size} />
}

const Badge = ({ children, color = 'slate' }) => (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold bg-${color}-50 text-${color}-700`}>
        {children}
    </span>
)

export default function DevicesPage() {
    const [devices, setDevices] = useState([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    const [sort, setSort] = useState('recent')
    const [typeFilter, setTypeFilter] = useState('')
    const [search, setSearch] = useState('')
    const [searchInput, setSearchInput] = useState('')
    const [expanded, setExpanded] = useState(null)

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams({ limit: '100', sort })
            if (typeFilter) params.set('type', typeFilter)
            if (search) params.set('search', search)
            const res = await fetch(`/api/admin/analytics/devices?${params}`)
            const data = await res.json()
            setDevices(data.devices || [])
            setTotal(data.total || 0)
        } catch { /* ignore */ }
        setLoading(false)
    }, [sort, typeFilter, search])

    useEffect(() => { load() }, [load])

    const handleSearch = (e) => {
        e.preventDefault()
        setSearch(searchInput)
    }

    const anonymousCount = devices.filter(d => d.isAnonymous).length
    const identifiedCount = devices.filter(d => !d.isAnonymous).length

    return (
        <div className="space-y-6 pb-12">
            <div>
                <h1 className="text-2xl text-slate-500">Device <span className="text-slate-800 font-medium">Analytics</span></h1>
                <p className="text-sm text-slate-400 mt-1">Every physical device tracked across sessions. 1 device = 1 entry, persistent across cache clears.</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
                    <p className="text-xs text-slate-400 uppercase tracking-wide">Total Devices</p>
                    <p className="text-2xl font-bold text-slate-800 mt-1">{fmtNum(total)}</p>
                    <p className="text-xs text-slate-400 mt-1">All-time unique devices</p>
                </div>
                <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
                    <p className="text-xs text-slate-400 uppercase tracking-wide">Anonymous</p>
                    <p className="text-2xl font-bold text-amber-600 mt-1">{fmtNum(anonymousCount)}</p>
                    <p className="text-xs text-slate-400 mt-1">Not linked to any account</p>
                </div>
                <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
                    <p className="text-xs text-slate-400 uppercase tracking-wide">Identified</p>
                    <p className="text-2xl font-bold text-emerald-600 mt-1">{fmtNum(identifiedCount)}</p>
                    <p className="text-xs text-slate-400 mt-1">Linked to user accounts</p>
                </div>
                <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
                    <p className="text-xs text-slate-400 uppercase tracking-wide">Showing</p>
                    <p className="text-2xl font-bold text-slate-800 mt-1">{fmtNum(devices.length)}</p>
                    <p className="text-xs text-slate-400 mt-1">of {fmtNum(total)} devices</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <div className="flex flex-wrap items-center gap-3">
                    <form onSubmit={handleSearch} className="flex-1 min-w-[200px] relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input value={searchInput} onChange={e => setSearchInput(e.target.value)}
                            placeholder="Search by device ID, browser, OS, phone model, city..."
                            className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-sm outline-none focus:border-slate-400" />
                    </form>
                    <div className="flex items-center gap-2">
                        <FunnelFill size={12} className="text-slate-400" />
                        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs outline-none focus:border-slate-400">
                            <option value="">All Types</option>
                            <option value="mobile">Mobile</option>
                            <option value="desktop">Desktop</option>
                            <option value="tablet">Tablet</option>
                        </select>
                        <select value={sort} onChange={e => setSort(e.target.value)}
                            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs outline-none focus:border-slate-400">
                            <option value="recent">Most Recent</option>
                            <option value="views">Most Views</option>
                            <option value="oldest">Oldest First</option>
                        </select>
                        <button onClick={load} className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition">
                            <ArrowRepeat size={14} className="text-slate-500" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Device List */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                {loading ? (
                    <p className="px-5 py-12 text-center text-sm text-slate-400">Loading devices...</p>
                ) : !devices.length ? (
                    <p className="px-5 py-12 text-center text-sm text-slate-400">No devices found.</p>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {devices.map(d => (
                            <div key={d.id}>
                                <button onClick={() => setExpanded(expanded === d.id ? null : d.id)}
                                    className="w-full px-5 py-3.5 flex items-center gap-4 text-left hover:bg-slate-50/50 transition">
                                    {/* Icon */}
                                    <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${d.isAnonymous ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                        <DeviceIcon type={d.deviceType} />
                                    </div>
                                    {/* Info */}
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-medium text-slate-800 truncate">{d.phoneModel || d.deviceType}</p>
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${d.isAnonymous ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                {d.isAnonymous ? 'Anonymous' : 'Identified'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-400 truncate">
                                            {d.browser} · {d.os}
                                            {d.lastCity ? ` · ${d.lastCity}` : ''}
                                            {d.lastCountry ? `, ${d.lastCountry}` : ''}
                                        </p>
                                    </div>
                                    {/* Stats */}
                                    <div className="hidden sm:flex items-center gap-4 shrink-0 text-xs text-slate-500">
                                        <span className="flex items-center gap-1"><Eye size={12} /> {fmtNum(d.pageViews)}</span>
                                        <span className="flex items-center gap-1"><ClockHistory size={12} /> {fmtDate(d.lastSeenAt)}</span>
                                    </div>
                                </button>
                                {/* Expanded details */}
                                {expanded === d.id && (
                                    <div className="px-5 pb-4 pt-1 bg-slate-50/50 border-t border-slate-100">
                                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                                            <InfoRow label="Device ID" value={d.deviceId} mono />
                                            <InfoRow label="Device Type" value={d.deviceType} />
                                            <InfoRow label="Phone Model" value={d.phoneModel} />
                                            <InfoRow label="Browser" value={d.browser} />
                                            <InfoRow label="OS" value={d.os} />
                                            <InfoRow label="Screen" value={d.screenWidth && d.screenHeight ? `${d.screenWidth}×${d.screenHeight}` : null} />
                                            <InfoRow label="Language" value={d.language} />
                                            <InfoRow label="Timezone" value={d.timezone} />
                                            <InfoRow label="Country" value={d.lastCountry} />
                                            <InfoRow label="Region" value={d.lastRegion} />
                                            <InfoRow label="City" value={d.lastCity} />
                                            <InfoRow label="Last IP" value={d.lastIp} mono />
                                            <InfoRow label="Page Views" value={fmtNum(d.pageViews)} />
                                            <InfoRow label="Unique Pages" value={fmtNum(d.pagesVisited)} />
                                            <InfoRow label="Products Viewed" value={fmtNum(d.productsViewed)} />
                                            <InfoRow label="Last Page" value={d.lastPath} />
                                            <InfoRow label="First Seen" value={fmtDate(d.firstSeenAt)} />
                                            <InfoRow label="Last Seen" value={fmtDate(d.lastSeenAt)} />
                                        </div>
                                        {d.accountIds?.length > 0 && (
                                            <div className="mt-3 space-y-1.5">
                                                <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Linked Accounts</p>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {d.accountIds.map(id => (
                                                        <span key={id} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-100 px-2 py-0.5 text-[11px] text-emerald-700 font-mono">
                                                            <PersonFill size={10} /> {id.slice(0, 20)}...
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

function InfoRow({ label, value, mono }) {
    return (
        <div>
            <p className="text-[11px] uppercase tracking-widest text-slate-400">{label}</p>
            <p className={`text-slate-700 mt-0.5 truncate ${mono ? 'font-mono text-[11px]' : 'text-xs'}`}>{value || '—'}</p>
        </div>
    )
}

'use client'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import Loading from '@/components/Loading'
import {
    Basket,
    Star,
    Megaphone,
    Database,
    PeopleFill,
    GraphUpArrow,
    Gear,
    Grid,
    Shop,
    Eye,
    ClockHistory,
    PersonLinesFill,
    Cursor,
    GraphUp,
} from 'react-bootstrap-icons'

const META = {
    products: { title: 'Products', description: 'Manage product listings', icon: Basket, href: '/e/products' },
    reviews: { title: 'Reviews', description: 'Moderate and verify reviews', icon: Star, href: '/e/reviews' },
    notifications: { title: 'Notifications', description: 'Send campaign updates', icon: Megaphone, href: '/e/notifications' },
    analytics: { title: 'Analytics', description: 'Track performance metrics', icon: Database, href: '/e/analytics' },
    users: { title: 'Users', description: 'Manage users and roles', icon: PeopleFill, href: '/e/users' },
    employees: { title: 'Employees', description: 'Team performance and access', icon: GraphUpArrow, href: '/e/employees' },
    settings: { title: 'Settings', description: 'Configure panel settings', icon: Gear, href: '/e/settings' },
    cms: { title: 'CMS', description: 'Content and storefront controls', icon: Grid, href: '/e/cms' },
    store: { title: 'Store', description: 'Seller-facing store tools', icon: Shop, href: '/e/store' },
}

export default function EmployeeDashboardPage() {
    const { user } = useAuth()
    const [modules, setModules] = useState([])
    const [report, setReport] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let cancelled = false

        const load = async () => {
            try {
                const token = user ? await user.getIdToken() : null
                const controller = new AbortController()
                const timeout = setTimeout(() => controller.abort(), 10000)
                const [accessRes, reportRes] = await Promise.all([
                    fetch('/api/me/dashboard-access', {
                        cache: 'no-store',
                        signal: controller.signal,
                        headers: token ? { Authorization: `Bearer ${token}` } : {},
                    }),
                    fetch('/api/me/activity-report', {
                        cache: 'no-store',
                        signal: controller.signal,
                        headers: token ? { Authorization: `Bearer ${token}` } : {},
                    }),
                ])
                clearTimeout(timeout)

                const payload = await accessRes.json().catch(() => ({}))
                const reportPayload = await reportRes.json().catch(() => ({}))
                if (!accessRes.ok) throw new Error(payload?.error || 'Failed')
                if (!reportRes.ok) throw new Error(reportPayload?.error || 'Failed to load tracker')
                if (!cancelled) {
                    setModules(payload?.isAdmin ? Object.keys(META) : (payload?.modules || []).map((m) => m.key).filter((key) => META[key]))
                    setReport(reportPayload)
                }
            } catch {
                if (!cancelled) setModules([])
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        if (user) {
            load()
        } else {
            setLoading(false)
        }

        return () => { cancelled = true }
    }, [user])

    const cards = useMemo(() => modules.map((key) => META[key]).filter(Boolean), [modules])
    const trackerStats = report?.stats || {}
    const trackerAnalytics = report?.analytics || {}
    const trackerFavorites = report?.favorites || {}
    const recentActivities = report?.recentActivities || []

    return (
        <div className="space-y-6 pb-24">
            <div>
                <h1 className="text-2xl text-slate-500">Employee <span className="text-slate-800 font-medium">Dashboard</span></h1>
                <p className="text-sm text-slate-400 mt-1">Only your assigned modules are visible and accessible.</p>
            </div>

            {loading && <Loading />}

            {!loading && report && (
                <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                    <TrackerCard label="Total Clicks" value={trackerStats.totalClicks || 0} icon={Cursor} sub={`${trackerStats.totalImpressions || 0} impressions`} />
                    <TrackerCard label="Impressions" value={trackerStats.totalImpressions || 0} icon={Eye} sub={`${trackerStats.productsAdded || 0} product listings`} />
                    <TrackerCard label="Products Added" value={trackerStats.productsAdded || 0} icon={Basket} sub={`${trackerStats.activeProducts || 0} active`} />
                    <TrackerCard label="Reviews" value={trackerStats.reviewsSubmitted || 0} icon={Star} sub={`${trackerStats.reviewsApproved || 0} approved`} />
                </div>
            )}

            {!loading && report && (
                <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-4 items-start">
                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                        <div className="flex items-center gap-2">
                            <PersonLinesFill size={16} className="text-slate-600" />
                            <h2 className="text-lg font-semibold text-slate-800">Full Action Tracker</h2>
                        </div>
                        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
                            <MiniMetric label="Last Seen" value={report.user?.lastSeenAt ? new Date(report.user.lastSeenAt).toLocaleString() : '—'} />
                            <MiniMetric label="Active Days" value={trackerStats.activeDays || 0} />
                            <MiniMetric label="Avg Rating" value={trackerStats.avgRating || 0} />
                            <MiniMetric label="Clicks / Product" value={trackerStats.productsAdded > 0 ? (trackerStats.totalClicks / trackerStats.productsAdded).toFixed(1) : 0} />
                            <MiniMetric label="Impressions / Product" value={trackerStats.productsAdded > 0 ? (trackerStats.totalImpressions / trackerStats.productsAdded).toFixed(0) : 0} />
                            <MiniMetric label="Actions" value={trackerStats.allInteractionCount || 0} />
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                            <TrackerList title="Top Clicked Products" items={(trackerAnalytics.topClickedProducts || []).map((item) => `${item.name} (${item.count})`)} />
                            <TrackerList title="Recent Work" items={recentActivities.slice(0, 8).map((item) => `${item.title} • ${item.date ? new Date(item.date).toLocaleString() : '—'}`)} />
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                        <div className="flex items-center gap-2">
                            <GraphUpArrow size={16} className="text-slate-600" />
                            <h2 className="text-lg font-semibold text-slate-800">Assigned Modules</h2>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                            {cards.map((card) => (
                                <Link
                                    key={card.href}
                                    href={card.href}
                                    className="rounded-xl border border-slate-200 p-4 hover:bg-slate-50 transition flex items-center gap-3"
                                >
                                    <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                                        <card.icon size={18} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-semibold text-slate-800">{card.title}</p>
                                        <p className="text-xs text-slate-500">{card.description}</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                        {trackerFavorites?.favoriteBrands?.length > 0 && (
                            <div className="pt-2">
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Favorite Brands</p>
                                <div className="flex flex-wrap gap-2">
                                    {trackerFavorites.favoriteBrands.map((item) => (
                                        <span key={item.name} className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs">{item.name} · {item.count}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {!loading && cards.length === 0 && (
                <div className="bg-white border border-slate-200 rounded-xl p-6 text-sm text-slate-500">
                    No modules assigned yet. Contact an admin to grant dashboard access.
                </div>
            )}

            {!loading && cards.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {cards.map((card) => (
                        <Link
                            key={card.href}
                            href={card.href}
                            className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition"
                        >
                            <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center mb-4">
                                <card.icon size={18} />
                            </div>
                            <p className="text-base font-semibold text-slate-800">{card.title}</p>
                            <p className="text-sm text-slate-500 mt-1">{card.description}</p>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}

function TrackerCard({ label, value, sub, icon: Icon }) {
    return (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-2">
            <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-slate-400 uppercase tracking-wide">{label}</p>
                <Icon size={16} className="text-slate-400" />
            </div>
            <p className="text-2xl font-bold text-slate-800">{value}</p>
            {sub && <p className="text-xs text-slate-400">{sub}</p>}
        </div>
    )
}

function MiniMetric({ label, value }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
            <p className="text-sm font-semibold text-slate-800 mt-1 break-words">{value}</p>
        </div>
    )
}

function TrackerList({ title, items = [] }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-700 mb-3">{title}</p>
            <div className="space-y-2 max-h-64 overflow-auto pr-1">
                {items.length > 0 ? items.map((item, index) => (
                    <div key={`${title}-${index}`} className="text-sm text-slate-600 rounded-lg bg-slate-50 px-3 py-2">
                        {item}
                    </div>
                )) : <p className="text-sm text-slate-400">No records.</p>}
            </div>
        </div>
    )
}

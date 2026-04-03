'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Loading from '@/components/Loading'
import { ArrowRight, GeoAlt, Phone, BrowserChrome, Globe2, People, Shield } from 'react-bootstrap-icons'

const Card = ({ label, value, sub }) => (
    <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
        <p className="text-xs text-slate-400 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-slate-800 mt-1 break-words">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
)

export default function UserAnalyticsPage() {
    const [loading, setLoading] = useState(true)
    const [users, setUsers] = useState([])
    const [summary, setSummary] = useState({})
    const [backfilling, setBackfilling] = useState(false)

    const loadData = () => {
        setLoading(true)
        fetch('/api/admin/user-analytics', { cache: 'no-store' })
            .then(res => res.json())
            .then(data => {
                setUsers(Array.isArray(data?.users) ? data.users : [])
                setSummary(data?.summary || {})
                setLoading(false)
            })
            .catch(() => setLoading(false))
    }

    useEffect(() => {
        loadData()
    }, [])

    const runBackfill = async () => {
        setBackfilling(true)
        try {
            await fetch('/api/admin/user-analytics', { method: 'POST' })
        } catch (_) {
            // Ignore error toast to keep this page dependency-light.
        } finally {
            setBackfilling(false)
            loadData()
        }
    }

    const latestUsers = useMemo(() => [...users].sort((a, b) => new Date(b.lastSeenAt || b.createdAt || 0) - new Date(a.lastSeenAt || a.createdAt || 0)), [users])

    if (loading) return <Loading />

    return (
        <div className="space-y-6 pb-12">
            <div>
                <h1 className="text-2xl text-slate-500">User <span className="text-slate-800 font-medium">Analytics</span></h1>
                <p className="text-sm text-slate-400 mt-1">Location, device and browser insights captured from user activity.</p>
                <div className="mt-3">
                    <button
                        onClick={runBackfill}
                        disabled={backfilling}
                        className="text-xs px-3 py-1.5 border border-slate-300 rounded-lg bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {backfilling ? 'Backfilling user data...' : 'Backfill Existing Users'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card label="Total Users" value={summary.totalUsers || 0} sub={`${summary.adminUsers || 0} admins`} />
                <Card label="Users With Location" value={summary.usersWithLocation || 0} sub="IP-based geo captured" />
                <Card label="Users With Device Info" value={summary.usersWithDeviceInfo || 0} sub="Phone/browser/os parsed" />
                <Card label="Top Country" value={summary.topCountries?.[0]?.name || '—'} sub={summary.topCountries?.[0]?.count ? `${summary.topCountries[0].count} users` : 'No data'} />
            </div>

            <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-6 items-start">
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-800">India Region Overview</h2>
                            <p className="text-sm text-slate-500">Top regions and cities from logged-in user activity.</p>
                        </div>
                        <GeoAlt size={18} className="text-slate-400" />
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-sky-50 to-white p-4 min-h-[280px]">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {(summary.topRegions || []).slice(0, 6).map((item, index) => (
                                <div key={`${item.name}-${index}`} className="rounded-xl border border-slate-200 bg-white/80 p-3">
                                    <p className="text-[10px] uppercase tracking-wider text-slate-400 truncate">{item.name}</p>
                                    <p className="text-lg font-bold text-slate-800">{item.count}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                        <ListPanel title="Top Phones" icon={Phone} items={summary.topPhones || []} />
                        <ListPanel title="Top Browsers" icon={BrowserChrome} items={summary.topBrowsers || []} />
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-800">Device Breakdown</h2>
                            <p className="text-sm text-slate-500">Which devices and operating systems users are on.</p>
                        </div>
                        <Globe2 size={18} className="text-slate-400" />
                    </div>

                    <div className="grid gap-3">
                        <ListPanel title="Top Operating Systems" icon={Shield} items={summary.topOs || []} />
                        <ListPanel title="Top Regions" icon={GeoAlt} items={summary.topRegions || []} />
                        <ListPanel title="Top Cities" icon={People} items={summary.topCities || []} />
                    </div>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-800">User List</h2>
                        <p className="text-sm text-slate-500">Open a profile for full device and location details.</p>
                    </div>
                </div>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-600">
                            <tr>
                                <th className="px-4 py-3">User</th>
                                <th className="px-4 py-3">Region</th>
                                <th className="px-4 py-3">City</th>
                                <th className="px-4 py-3">Phone</th>
                                <th className="px-4 py-3">Browser</th>
                                <th className="px-4 py-3">Profile</th>
                            </tr>
                        </thead>
                        <tbody>
                            {latestUsers.length > 0 ? latestUsers.map((user) => (
                                <tr key={user.id} className="border-t border-slate-100 hover:bg-slate-50">
                                    <td className="px-4 py-3">
                                        <div className="min-w-0">
                                            <p className="font-medium text-slate-700 truncate">{user.name}</p>
                                            <p className="text-xs text-slate-400 truncate">{user.email}</p>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">{user.lastKnownRegion || user.lastKnownCountry || '—'}</td>
                                    <td className="px-4 py-3 text-slate-600">{user.lastKnownCity || '—'}</td>
                                    <td className="px-4 py-3 text-slate-600">{user.lastKnownPhoneModel || '—'}</td>
                                    <td className="px-4 py-3 text-slate-600">{user.lastKnownBrowser || '—'}</td>
                                    <td className="px-4 py-3">
                                        <Link href={`/admin/profile/${user.id}`} className="inline-flex items-center gap-1 text-sm font-medium text-slate-800 hover:underline">
                                            View <ArrowRight size={14} />
                                        </Link>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={6} className="px-4 py-10 text-center text-slate-400">No user analytics data yet.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

function ListPanel({ title, icon: Icon, items }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <div className="flex items-center gap-2">
                <Icon size={14} className="text-slate-500" />
                <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
            </div>
            <div className="space-y-2 max-h-64 overflow-auto pr-1">
                {(items || []).length > 0 ? items.map((item, index) => (
                    <div key={`${title}-${item.name}-${index}`} className="flex items-center justify-between gap-3 rounded-lg bg-white border border-slate-100 px-3 py-2">
                        <p className="text-sm text-slate-700 truncate">{item.name}</p>
                        <p className="text-sm font-semibold text-slate-800">{item.count}</p>
                    </div>
                )) : <p className="text-sm text-slate-400">No data.</p>}
            </div>
        </div>
    )
}

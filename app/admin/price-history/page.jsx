'use client'

import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { ArrowRepeat, ClockHistory, Gear, LightningChargeFill } from 'react-bootstrap-icons'
import {
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts'

const DEFAULT_CONFIG = {
    enabled: false,
    timezone: 'Asia/Kolkata',
    peakHour: 21,
    peakMinute: 0,
    lookbackDays: 60,
    batchSize: 300,
}

const formatPrice = (value) => {
    const num = Number(value)
    if (!Number.isFinite(num)) return '—'
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(num)
}

const toDateLabel = (value) => {
    if (!value) return '—'
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString()
}

const buildProductLabel = (item) => {
    const title = String(item?.title || 'Untitled product')
    const price = item?.price ? ` • ${formatPrice(item.price)}` : ''
    const short = title.length > 90 ? `${title.slice(0, 89)}...` : title
    return `${short}${price}`
}

export default function AdminPriceHistoryPage() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [syncing, setSyncing] = useState(false)
    const [config, setConfig] = useState(DEFAULT_CONFIG)
    const [status, setStatus] = useState({ secondary: { ready: false, error: '' }, mainReady: false })
    const [products, setProducts] = useState([])
    const [series, setSeries] = useState([])
    const [runs, setRuns] = useState([])
    const [selectedProductId, setSelectedProductId] = useState('')
    const [days, setDays] = useState(60)
    const secondaryAdminMissing = String(status?.secondary?.error || '').includes('web config is present')

    const fetchModule = async (nextProductId = selectedProductId, nextDays = days) => {
        const query = new URLSearchParams()
        if (nextProductId) query.set('productId', nextProductId)
        query.set('days', String(nextDays || 60))

        const res = await fetch(`/api/admin/price-history?${query.toString()}`, { cache: 'no-store' })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.error || 'Failed to load price history module')

        setStatus(data?.status || { secondary: { ready: false, error: '' }, mainReady: false })
        setConfig({ ...DEFAULT_CONFIG, ...(data?.config || {}) })
        setProducts(Array.isArray(data?.products) ? data.products : [])
        setSeries(Array.isArray(data?.series) ? data.series : [])
        setRuns(Array.isArray(data?.runs) ? data.runs : [])
        setSelectedProductId(data?.selectedProductId || nextProductId || '')
    }

    useEffect(() => {
        fetchModule()
            .catch((error) => toast.error(error.message || 'Failed to load price history module'))
            .finally(() => setLoading(false))
    }, [])

    const chartRows = useMemo(() => {
        return (series || []).map((item) => ({
            ...item,
            label: item.dayKey || toDateLabel(item.capturedAt),
            discount: Number(item.discount) || 0,
            price: Number(item.price) || 0,
        }))
    }, [series])

    const selectedProduct = products.find((item) => item.id === selectedProductId) || null

    const onSaveConfig = async () => {
        setSaving(true)
        try {
            const res = await fetch('/api/admin/price-history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'saveConfig', config }),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(data?.error || 'Failed to save config')
            setConfig({ ...DEFAULT_CONFIG, ...(data?.config || {}) })
            toast.success('Price history tracker settings saved')
        } catch (error) {
            toast.error(error.message || 'Failed to save config')
        } finally {
            setSaving(false)
        }
    }

    const onSyncNow = async () => {
        setSyncing(true)
        try {
            const res = await fetch('/api/admin/price-history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'syncNow' }),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(data?.error || 'Sync failed')

            if (data?.skipped) {
                toast(data?.reason || 'Sync skipped')
            } else {
                toast.success(`Captured ${data?.captured || 0} products`) 
            }

            await fetchModule(selectedProductId, days)
        } catch (error) {
            toast.error(error.message || 'Sync failed')
        } finally {
            setSyncing(false)
        }
    }

    if (loading) {
        return (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
                Loading price history module...
            </div>
        )
    }

    return (
        <div className="space-y-6 pb-16 text-slate-700">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Price History Tracker</h1>
                <p className="mt-1 text-sm text-slate-500">Separate 60-day price log module backed by secondary Firebase.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Main DB</p>
                    <p className={`mt-2 text-sm font-medium ${status?.mainReady ? 'text-emerald-600' : 'text-rose-600'}`}>{status?.mainReady ? 'Connected' : 'Not Ready'}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Secondary DB</p>
                    <p className={`mt-2 text-sm font-medium ${status?.secondary?.ready ? 'text-emerald-600' : 'text-rose-600'}`}>{status?.secondary?.ready ? 'Connected' : 'Not Ready'}</p>
                    {!status?.secondary?.ready && status?.secondary?.error ? <p className="mt-2 text-xs text-rose-500 break-words">{status.secondary.error}</p> : null}
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Lookback</p>
                    <p className="mt-2 text-sm font-medium text-slate-800">{config.lookbackDays} days</p>
                </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div>
                            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Graph</p>
                            <h2 className="text-lg font-semibold text-slate-900">Product price trend</h2>
                        </div>
                        <div className="flex items-center gap-2">
                            <select
                                value={days}
                                onChange={(e) => {
                                    const nextDays = Number.parseInt(e.target.value, 10) || 60
                                    setDays(nextDays)
                                    fetchModule(selectedProductId, nextDays).catch((error) => toast.error(error.message || 'Reload failed'))
                                }}
                                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                            >
                                <option value={30}>30 days</option>
                                <option value={60}>60 days</option>
                                <option value={90}>90 days</option>
                            </select>
                        </div>
                    </div>

                    <label className="block space-y-1.5 text-sm">
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Product</span>
                        <select
                            value={selectedProductId}
                            onChange={(e) => {
                                const next = e.target.value
                                setSelectedProductId(next)
                                fetchModule(next, days).catch((error) => toast.error(error.message || 'Failed to load series'))
                            }}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 bg-white"
                        >
                            <option value="">Select product</option>
                            {products.map((item) => (
                                <option key={item.id} value={item.id}>{buildProductLabel(item)}</option>
                            ))}
                        </select>
                    </label>

                    {selectedProduct ? (
                        <p className="text-xs text-slate-500">Showing {days}-day trend for <span className="font-medium text-slate-700">{selectedProduct.title}</span></p>
                    ) : (
                        <p className="text-xs text-slate-400">Select a product to view its chart.</p>
                    )}

                    <div className="h-72 w-full">
                        {chartRows.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartRows} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="label" minTickGap={24} />
                                    <YAxis />
                                    <Tooltip
                                        formatter={(value, key) => {
                                            if (key === 'price') return [formatPrice(value), 'Price']
                                            if (key === 'discount') return [`${value}%`, 'Discount']
                                            return [value, key]
                                        }}
                                    />
                                    <Line type="monotone" dataKey="price" stroke="#0f172a" strokeWidth={2} dot={false} />
                                    <Line type="monotone" dataKey="discount" stroke="#16a34a" strokeWidth={2} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full rounded-xl border border-dashed border-slate-200 flex items-center justify-center text-sm text-slate-400">
                                No captured points yet. Run sync once.
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Daily Sync Settings</p>
                        {secondaryAdminMissing && (
                            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                                Secondary Firebase web config is loaded, but the Admin SDK credential is still missing in Vercel. Add one of the secondary service account env vars to enable price history writes.
                            </div>
                        )}
                        <div className="grid gap-3 md:grid-cols-2">
                            <label className="space-y-1 text-sm">
                                <span className="text-xs uppercase tracking-[0.16em] text-slate-400">Enabled</span>
                                <select value={config.enabled ? 'true' : 'false'} onChange={(e) => setConfig((prev) => ({ ...prev, enabled: e.target.value === 'true' }))} className="w-full rounded-lg border border-slate-200 px-3 py-2">
                                    <option value="false">Disabled</option>
                                    <option value="true">Enabled</option>
                                </select>
                            </label>
                            <label className="space-y-1 text-sm">
                                <span className="text-xs uppercase tracking-[0.16em] text-slate-400">Timezone</span>
                                <input value={config.timezone} onChange={(e) => setConfig((prev) => ({ ...prev, timezone: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2" />
                            </label>
                            <label className="space-y-1 text-sm">
                                <span className="text-xs uppercase tracking-[0.16em] text-slate-400">Peak Hour</span>
                                <input type="number" min="0" max="23" value={config.peakHour} onChange={(e) => setConfig((prev) => ({ ...prev, peakHour: Number.parseInt(e.target.value, 10) || 0 }))} className="w-full rounded-lg border border-slate-200 px-3 py-2" />
                            </label>
                            <label className="space-y-1 text-sm">
                                <span className="text-xs uppercase tracking-[0.16em] text-slate-400">Peak Minute</span>
                                <input type="number" min="0" max="59" value={config.peakMinute} onChange={(e) => setConfig((prev) => ({ ...prev, peakMinute: Number.parseInt(e.target.value, 10) || 0 }))} className="w-full rounded-lg border border-slate-200 px-3 py-2" />
                            </label>
                            <label className="space-y-1 text-sm">
                                <span className="text-xs uppercase tracking-[0.16em] text-slate-400">Lookback Days</span>
                                <input type="number" min="30" max="180" value={config.lookbackDays} onChange={(e) => setConfig((prev) => ({ ...prev, lookbackDays: Number.parseInt(e.target.value, 10) || 60 }))} className="w-full rounded-lg border border-slate-200 px-3 py-2" />
                            </label>
                            <label className="space-y-1 text-sm">
                                <span className="text-xs uppercase tracking-[0.16em] text-slate-400">Batch Size</span>
                                <input type="number" min="50" max="500" value={config.batchSize} onChange={(e) => setConfig((prev) => ({ ...prev, batchSize: Number.parseInt(e.target.value, 10) || 300 }))} className="w-full rounded-lg border border-slate-200 px-3 py-2" />
                            </label>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <button type="button" onClick={onSaveConfig} disabled={saving || syncing} className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60">
                                <Gear size={14} /> {saving ? 'Saving...' : 'Save Settings'}
                            </button>
                            <button type="button" onClick={onSyncNow} disabled={saving || syncing} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 disabled:opacity-60">
                                {syncing ? <ArrowRepeat size={14} className="animate-spin" /> : <LightningChargeFill size={14} />} {syncing ? 'Syncing...' : 'Sync Now'}
                            </button>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Recent Sync Runs</p>
                        {runs.length > 0 ? runs.map((run) => (
                            <div key={run.id} className="rounded-xl border border-slate-200 p-3">
                                <div className="flex items-center justify-between gap-3">
                                    <p className="text-sm font-medium text-slate-800">{run.dayKey || 'Run'}</p>
                                    <span className="text-xs text-slate-500 inline-flex items-center gap-1"><ClockHistory size={12} /> {toDateLabel(run.createdAt)}</span>
                                </div>
                                <p className="mt-1 text-xs text-slate-500">Captured: {run.captured || 0} / {run.totalProducts || 0}</p>
                            </div>
                        )) : (
                            <p className="text-sm text-slate-400">No runs yet.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { ArrowRepeat, ClockHistory, CheckCircleFill, XCircleFill, PlayFill, Gear } from 'react-bootstrap-icons'

const DEFAULT_SETTINGS = {
    enabled: false,
    frequencyMinutes: 360,
    maxPerRun: 4,
    delayMs: 500,
    batches: [
        { name: 'Batch 1', size: 4, delayMs: 500 },
    ],
}

const formatDateTime = (value) => {
    if (!value) return '—'
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString()
}

const statusStyles = {
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    failed: 'bg-rose-50 text-rose-700 border-rose-200',
    skipped: 'bg-slate-50 text-slate-600 border-slate-200',
}

function SummaryCard({ label, value, hint }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
            {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
        </div>
    )
}

export default function ProductUpdaterPanel({ mode = 'full', title = 'Amazon Product Updater' }) {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [running, setRunning] = useState(false)
    const [settings, setSettings] = useState(DEFAULT_SETTINGS)
    const [logs, setLogs] = useState([])
    const [summary, setSummary] = useState({ processed: 0, updated: 0, failed: 0, skipped: 0, totalCandidates: 0 })
    const [nextRunAt, setNextRunAt] = useState(null)
    const [activeRunId, setActiveRunId] = useState('')
    const [activeRunLogs, setActiveRunLogs] = useState([])
    const [runTargetCount, setRunTargetCount] = useState(0)
    const pollRef = useRef(null)

    useEffect(() => {
        let cancelled = false

        const load = async () => {
            setLoading(true)
            try {
                const res = await fetch('/api/admin/product-updater')
                const data = await res.json().catch(() => null)
                if (!res.ok) {
                    throw new Error(data?.error || 'Failed to load updater data')
                }

                if (cancelled) return
                setSettings({ ...DEFAULT_SETTINGS, ...(data?.settings || {}) })
                setLogs(Array.isArray(data?.logs) ? data.logs : [])
                setSummary(data?.settings?.lastRunSummary || { processed: 0, updated: 0, failed: 0, skipped: 0, totalCandidates: 0 })
                setNextRunAt(data?.nextRunAt || null)
            } catch (error) {
                if (!cancelled) {
                    toast.error(error.message || 'Failed to load updater')
                }
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        load()
        return () => { cancelled = true }
    }, [])

    const upcomingRunText = useMemo(() => formatDateTime(nextRunAt), [nextRunAt])
    const latestRunLog = activeRunLogs[0] || null

    const stopPolling = () => {
        if (pollRef.current) {
            clearInterval(pollRef.current)
            pollRef.current = null
        }
    }

    const pollRunLogs = async (runId) => {
        try {
            const res = await fetch('/api/admin/product-updater', { cache: 'no-store' })
            const data = await res.json().catch(() => null)
            if (!res.ok) return

            const allLogs = Array.isArray(data?.logs) ? data.logs : []
            setLogs(allLogs)
            const runLogs = allLogs
                .filter((log) => log.runId === runId)
                .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())

            setActiveRunLogs(runLogs)
        } catch {
            // Ignore polling failures; final result still comes from run response.
        }
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            const res = await fetch('/api/admin/product-updater', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings),
            })
            const data = await res.json().catch(() => null)
            if (!res.ok) throw new Error(data?.error || 'Failed to save updater settings')
            setSettings({ ...DEFAULT_SETTINGS, ...(data?.settings || settings) })
            toast.success('Updater settings saved')
        } catch (error) {
            toast.error(error.message || 'Failed to save settings')
        } finally {
            setSaving(false)
        }
    }

    const updateBatch = (index, key, value) => {
        setSettings((prev) => {
            const nextBatches = Array.isArray(prev.batches) ? [...prev.batches] : []
            const current = nextBatches[index] || { name: `Batch ${index + 1}`, size: 1, delayMs: 0 }
            nextBatches[index] = { ...current, [key]: value }
            return { ...prev, batches: nextBatches }
        })
    }

    const addBatch = () => {
        setSettings((prev) => {
            const nextBatches = Array.isArray(prev.batches) ? [...prev.batches] : []
            nextBatches.push({ name: `Batch ${nextBatches.length + 1}`, size: 3, delayMs: Number(prev.delayMs || 0) })
            return { ...prev, batches: nextBatches }
        })
    }

    const removeBatch = (index) => {
        setSettings((prev) => {
            const nextBatches = Array.isArray(prev.batches) ? prev.batches.filter((_, i) => i !== index) : []
            if (nextBatches.length === 0) nextBatches.push({ name: 'Batch 1', size: 5, delayMs: Number(prev.delayMs || 0) })
            return { ...prev, batches: nextBatches }
        })
    }

    const handleRunNow = async () => {
        const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

        setRunning(true)
        setActiveRunId(runId)
        setRunTargetCount(0)
        setActiveRunLogs([])
        const toastId = toast.loading('Running sequential Amazon update...')

        await pollRunLogs(runId)
        stopPolling()
        pollRef.current = setInterval(() => {
            pollRunLogs(runId)
        }, 1500)

        try {
            const res = await fetch('/api/admin/product-updater', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    force: true,
                    runId,
                    runAll: true,
                    delayMs: settings.delayMs,
                    batches: Array.isArray(settings.batches) ? settings.batches : [],
                }),
            })
            const data = await res.json().catch(() => null)
            if (!res.ok) throw new Error(data?.error || 'Updater run failed')

            setSummary(data?.summary || summary)
            setRunTargetCount(Number(data?.summary?.totalCandidates || 0))
            if (Array.isArray(data?.logs) && data.logs.length > 0) {
                setLogs(prev => [...data.logs, ...prev].slice(0, 50))
                const runLogs = data.logs
                    .filter((log) => log.runId === runId)
                    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
                setActiveRunLogs(runLogs)
            }
            toast.success('Updater run completed', { id: toastId })
        } catch (error) {
            toast.error(error.message || 'Updater run failed', { id: toastId })
        } finally {
            stopPolling()
            setRunning(false)
            setTimeout(() => {
                setActiveRunId('')
                setRunTargetCount(0)
                setActiveRunLogs([])
            }, 2500)
        }
    }

    useEffect(() => {
        return () => stopPolling()
    }, [])

    if (loading) {
        return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-400">Loading updater...</div>
    }

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
                    <p className="mt-1 text-sm text-slate-500">Runs one product at a time, writes a log row for each update, and stays light on the server.</p>
                </div>
                {mode === 'full' && (
                    <button
                        type="button"
                        onClick={handleRunNow}
                        disabled={running}
                        className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-black/90 disabled:opacity-60"
                    >
                        <PlayFill size={14} />
                        {running ? 'Running...' : 'Run now'}
                    </button>
                )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryCard label="Processed" value={summary.processed ?? 0} hint="Products checked in the last run" />
                <SummaryCard label="Updated" value={summary.updated ?? 0} hint="Products refreshed successfully" />
                <SummaryCard label="Failed" value={summary.failed ?? 0} hint="Scrapes that could not complete" />
                <SummaryCard label="Next Run" value={upcomingRunText} hint="Based on saved frequency" />
            </div>

            {mode === 'full' && (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-5">
                    <div className="flex items-center gap-2 text-slate-900">
                        <Gear size={16} />
                        <h2 className="text-lg font-semibold">Schedule</h2>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <label className="space-y-2 text-sm">
                            <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Enabled</span>
                            <select
                                value={settings.enabled ? 'true' : 'false'}
                                onChange={(e) => setSettings(prev => ({ ...prev, enabled: e.target.value === 'true' }))}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-slate-400"
                            >
                                <option value="false">Disabled</option>
                                <option value="true">Enabled</option>
                            </select>
                        </label>
                        <label className="space-y-2 text-sm">
                            <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Frequency (minutes)</span>
                            <input
                                type="number"
                                min="15"
                                value={settings.frequencyMinutes}
                                onChange={(e) => setSettings(prev => ({ ...prev, frequencyMinutes: e.target.value }))}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-slate-400"
                            />
                        </label>
                        <label className="space-y-2 text-sm">
                            <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Max products per run</span>
                            <input
                                type="number"
                                min="1"
                                value={settings.maxPerRun}
                                onChange={(e) => setSettings(prev => ({ ...prev, maxPerRun: e.target.value }))}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-slate-400"
                            />
                        </label>
                        <label className="space-y-2 text-sm">
                            <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Delay between products (ms)</span>
                            <input
                                type="number"
                                min="0"
                                value={settings.delayMs}
                                onChange={(e) => setSettings(prev => ({ ...prev, delayMs: e.target.value }))}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-slate-400"
                            />
                        </label>
                    </div>

                    <div className="rounded-xl border border-slate-200 p-4 space-y-3">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Batches</p>
                            <button
                                type="button"
                                onClick={addBatch}
                                className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                            >
                                Add batch
                            </button>
                        </div>
                        <div className="space-y-3">
                            {(Array.isArray(settings.batches) ? settings.batches : []).map((batch, index) => (
                                <div key={`${index}-${batch.name || ''}`} className="grid gap-2 sm:grid-cols-12 border border-slate-200 rounded-xl p-3">
                                    <label className="sm:col-span-5 space-y-1">
                                        <span className="block text-[11px] text-slate-400">Name</span>
                                        <input
                                            value={batch.name || ''}
                                            onChange={(e) => updateBatch(index, 'name', e.target.value)}
                                            className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm outline-none focus:border-slate-400"
                                        />
                                    </label>
                                    <label className="sm:col-span-3 space-y-1">
                                        <span className="block text-[11px] text-slate-400">Size</span>
                                        <input
                                            type="number"
                                            min="1"
                                            value={batch.size}
                                            onChange={(e) => updateBatch(index, 'size', e.target.value)}
                                            className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm outline-none focus:border-slate-400"
                                        />
                                    </label>
                                    <label className="sm:col-span-3 space-y-1">
                                        <span className="block text-[11px] text-slate-400">Delay (ms)</span>
                                        <input
                                            type="number"
                                            min="0"
                                            value={batch.delayMs}
                                            onChange={(e) => updateBatch(index, 'delayMs', e.target.value)}
                                            className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm outline-none focus:border-slate-400"
                                        />
                                    </label>
                                    <div className="sm:col-span-1 flex items-end justify-end">
                                        <button
                                            type="button"
                                            onClick={() => removeBatch(index)}
                                            className="rounded-lg border border-rose-200 px-2 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-slate-400">Each batch runs sequentially and can have its own size/delay.</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                        >
                            <ArrowRepeat size={14} />
                            {saving ? 'Saving...' : 'Save schedule'}
                        </button>
                        <p className="text-xs text-slate-400">The updater processes products one by one and records each result in the log stream below.</p>
                    </div>
                </div>
            )}

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                    <div className="flex items-center gap-2 text-slate-900">
                        <ClockHistory size={16} />
                        <h2 className="text-lg font-semibold">Update Logs</h2>
                    </div>
                    <p className="text-xs text-slate-400">Latest {logs.length} runs</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                        <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                            <tr>
                                <th className="px-5 py-3">Product</th>
                                <th className="px-5 py-3">Batch</th>
                                <th className="px-5 py-3">Status</th>
                                <th className="px-5 py-3">Message</th>
                                <th className="px-5 py-3">Source</th>
                                <th className="px-5 py-3">Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.length > 0 ? logs.map((log, index) => (
                                <tr key={log.id || `${log.runId || 'run'}-${log.productId || 'product'}-${log.createdAt || 'time'}-${index}`} className="border-t border-slate-100 align-top">
                                    <td className="px-5 py-3">
                                        <p className="font-medium text-slate-800">{log.productTitle || 'Unknown product'}</p>
                                        <p className="text-xs text-slate-400">{log.productId || '—'}</p>
                                    </td>
                                    <td className="px-5 py-3 text-slate-500">{log.batchName || `Batch ${log.batchIndex || '—'}`}</td>
                                    <td className="px-5 py-3">
                                        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${statusStyles[log.status] || statusStyles.skipped}`}>
                                            {log.status === 'success' ? <CheckCircleFill size={12} /> : log.status === 'failed' ? <XCircleFill size={12} /> : <ClockHistory size={12} />}
                                            {log.status || 'skipped'}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3 text-slate-600">{log.message || '—'}</td>
                                    <td className="px-5 py-3 text-slate-500">
                                        <p className="break-all text-xs">{log.sourceUrl || '—'}</p>
                                    </td>
                                    <td className="px-5 py-3 text-slate-500">{formatDateTime(log.createdAt)}</td>
                                </tr>
                            )) : (
                                <tr>
                                    <td className="px-5 py-8 text-center text-slate-400" colSpan={6}>
                                        No updater logs yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {running && mode === 'full' && (
                <div className="fixed right-4 bottom-4 z-[60] w-[360px] max-w-[calc(100vw-1.5rem)] rounded-2xl border border-slate-200 bg-white shadow-2xl">
                    <div className="border-b border-slate-100 px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Updater progress</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{activeRunLogs.length}/{runTargetCount || '—'} processed</p>
                        {latestRunLog?.batchName ? <p className="text-xs text-slate-500 mt-1">Current batch: {latestRunLog.batchName}</p> : null}
                    </div>
                    <div className="space-y-3 px-4 py-3">
                        {latestRunLog ? (
                            <>
                                <div>
                                    <p className="text-xs text-slate-400">Current product</p>
                                    <p className="text-sm font-semibold text-slate-900 truncate">{latestRunLog.productTitle || 'Updating product...'}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${statusStyles[latestRunLog.status] || statusStyles.skipped}`}>
                                        {latestRunLog.status === 'success' ? <CheckCircleFill size={12} /> : latestRunLog.status === 'failed' ? <XCircleFill size={12} /> : <ClockHistory size={12} />}
                                        {latestRunLog.status || 'running'}
                                    </span>
                                    <span className="text-xs text-slate-400">{formatDateTime(latestRunLog.createdAt)}</span>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400 mb-1">Updating fields</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {(Array.isArray(latestRunLog.changedFields) && latestRunLog.changedFields.length > 0
                                            ? latestRunLog.changedFields
                                            : ['price', 'title', 'description']).slice(0, 8).map((field) => (
                                            <span key={field} className="rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-700">
                                                {field}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <p className="text-xs text-slate-500">{latestRunLog.message || 'Sequential update in progress...'}</p>
                            </>
                        ) : (
                            <div className="space-y-2">
                                <p className="text-sm font-semibold text-slate-900">Starting updater run...</p>
                                <p className="text-xs text-slate-500">Preparing product context, price update, and metadata refresh.</p>
                            </div>
                        )}
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full w-2/3 animate-pulse rounded-full bg-slate-800" />
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

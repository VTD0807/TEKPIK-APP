'use client'
import { useState, useEffect } from 'react'
import { Server, Activity, ExclamationTriangle, CheckCircleFill, ShieldCheck, LightningCharge, ArrowRepeat } from 'react-bootstrap-icons'

export default function DatabaseStatusPage() {
    const [databases, setDatabases] = useState([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)

    const fetchStatus = async () => {
        setRefreshing(true)
        try {
            const res = await fetch('/api/admin/db/status')
            const data = await res.json()
            if (data.databases) {
                setDatabases(data.databases)
            }
        } catch (err) {
            console.error('Failed to fetch DB status', err)
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }

    useEffect(() => {
        fetchStatus()
    }, [])

    if (loading) {
        return <div className="p-8 text-center text-slate-500">Pinging Database Fabric...</div>
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 mb-1">Database Health & Limits</h1>
                    <p className="text-sm text-slate-500">Live latency ping and quota monitoring across the 4-Tier infrastructure.</p>
                </div>
                <button 
                    onClick={fetchStatus}
                    disabled={refreshing}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl shadow-sm text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition"
                >
                    <ArrowRepeat size={16} className={refreshing ? 'animate-spin' : ''} />
                    {refreshing ? 'Pinging...' : 'Refresh'}
                </button>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-4 items-start shadow-sm">
                <ExclamationTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                    <h4 className="text-sm font-semibold text-amber-900">Note on Traffic & Quotas</h4>
                    <p className="text-sm text-amber-800 mt-1">
                        Google Cloud does not expose exact "quota remaining" numbers via the Admin API. 
                        This monitor actively pings each database to verify its status and detects <code>RESOURCE_EXHAUSTED</code> limits dynamically.
                        For exact quota usage graphs, please check your Firebase Console.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {databases.map((db, idx) => (
                    <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden">
                        {db.status === 'healthy' && <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-50 rounded-bl-[100px] -z-0"></div>}
                        {db.status === 'exhausted' && <div className="absolute top-0 right-0 w-16 h-16 bg-red-50 rounded-bl-[100px] -z-0"></div>}
                        {db.status === 'offline' && <div className="absolute top-0 right-0 w-16 h-16 bg-slate-50 rounded-bl-[100px] -z-0"></div>}

                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-4">
                                <div className={`p-2 rounded-xl ${
                                    db.status === 'healthy' ? 'bg-emerald-100 text-emerald-600' :
                                    db.status === 'exhausted' ? 'bg-red-100 text-red-600' :
                                    'bg-slate-100 text-slate-400'
                                }`}>
                                    <Server size={20} />
                                </div>
                                <h3 className="font-bold text-slate-800 text-sm tracking-tight">{db.name}</h3>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">Status</p>
                                    <div className="flex items-center gap-2">
                                        {db.status === 'healthy' && <><CheckCircleFill size={14} className="text-emerald-500" /><span className="text-sm font-medium text-emerald-700">Healthy</span></>}
                                        {db.status === 'exhausted' && <><ExclamationTriangle size={14} className="text-red-500" /><span className="text-sm font-medium text-red-700">Quota Exceeded</span></>}
                                        {db.status === 'offline' && <span className="text-sm font-medium text-slate-500">Not Configured</span>}
                                        {db.status === 'error' && <><ExclamationTriangle size={14} className="text-amber-500" /><span className="text-sm font-medium text-amber-700">Error</span></>}
                                    </div>
                                </div>

                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">Ping Latency</p>
                                    <div className="flex items-center gap-2">
                                        <LightningCharge size={14} className={db.status === 'healthy' ? 'text-blue-500' : 'text-slate-300'} />
                                        <span className="text-sm font-medium text-slate-700">{db.latency > 0 ? `${db.latency} ms` : '—'}</span>
                                    </div>
                                </div>
                            </div>

                            {db.error && (
                                <div className="mt-4 p-2.5 bg-red-50 border border-red-100 rounded-lg">
                                    <p className="text-[11px] font-mono text-red-600 break-words line-clamp-3">{db.error}</p>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <h3 className="font-bold text-slate-800 text-lg mb-4">Traffic Overview</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-sm font-medium text-slate-600">Product / Catalog Reads</span>
                            <span className="text-xs font-bold px-2.5 py-1 bg-white border border-slate-200 rounded-lg shadow-sm">Routed to DB-1 / DB-2</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-sm font-medium text-slate-600">Authentication & Analytics</span>
                            <span className="text-xs font-bold px-2.5 py-1 bg-white border border-slate-200 rounded-lg shadow-sm">Routed to DB-3</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-sm font-medium text-slate-600">Mailing & Campaigns</span>
                            <span className="text-xs font-bold px-2.5 py-1 bg-white border border-slate-200 rounded-lg shadow-sm">Routed to DB-4</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-sm font-medium text-slate-600">Admin Operations</span>
                            <span className="text-xs font-bold px-2.5 py-1 bg-white border border-slate-200 rounded-lg shadow-sm">Routed to DB-4</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center">
                    <ShieldCheck size={48} className="text-emerald-500 mb-4" />
                    <h3 className="font-bold text-slate-800 text-lg mb-2">Architecture Isolated</h3>
                    <p className="text-sm text-slate-500 max-w-sm mb-6">
                        Your multi-tier setup ensures that if storefront traffic exhausts DB-1, the admin panel (DB-4) and mailer (DB-4) remain completely unaffected and online.
                    </p>
                    <a href="/admin/settings/database-router" className="text-sm font-medium text-blue-600 hover:text-blue-800 bg-blue-50 px-4 py-2 rounded-xl transition">
                        Open Database Router
                    </a>
                </div>
            </div>
        </div>
    )
}

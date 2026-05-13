'use client'
import { useState, useEffect } from 'react'
import { Database, ExclamationTriangle, ArrowRight, Server, HddStack, HddNetwork, ShieldCheck } from 'react-bootstrap-icons'
import toast from 'react-hot-toast'

export default function DatabaseRouterPage() {
    const [settings, setSettings] = useState({ activeProductionDb: 'primary' })
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [status, setStatus] = useState(null)

    useEffect(() => {
        // Fetch current active routing state
        fetch('/api/admin/database-router')
            .then(res => res.json())
            .then(data => {
                setSettings({ activeProductionDb: data.activeProductionDb || 'primary' })
                setStatus(data.status)
                setLoading(false)
            })
            .catch(() => setLoading(false))
    }, [])

    const handleSave = async (dbChoice) => {
        setSaving(true)
        try {
            const res = await fetch('/api/admin/database-router', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ activeProductionDb: dbChoice }),
            })
            if (!res.ok) throw new Error('Failed to update router')
            setSettings({ activeProductionDb: dbChoice })
            toast.success(`Traffic successfully routed to ${dbChoice.toUpperCase()} DB`)
        } catch (err) {
            toast.error(err.message)
        }
        setSaving(false)
    }

    if (loading) return <div className="p-8 text-center text-slate-500">Checking connection fabric...</div>

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                    <HddNetwork size={24} className="text-blue-600" />
                    <h2 className="text-xl font-bold text-slate-900">Database Fabric Router</h2>
                </div>
                <p className="text-sm text-slate-500 mb-8 pl-9">
                    Instantly reroute live production traffic to a secondary database to avoid quota exhaustion.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Primary Database Card */}
                    <div className={`relative p-6 rounded-2xl border-2 transition-all ${settings.activeProductionDb === 'primary' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                        {settings.activeProductionDb === 'primary' && (
                            <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1 bg-blue-500 text-white text-xs font-bold uppercase rounded-full tracking-wider animate-pulse">
                                <span className="w-1.5 h-1.5 bg-white rounded-full"></span> Live
                            </div>
                        )}
                        <div className="flex items-center gap-3 mb-4">
                            <Server size={24} className={settings.activeProductionDb === 'primary' ? 'text-blue-600' : 'text-slate-400'} />
                            <h3 className="font-bold text-slate-900 text-lg">Primary Database</h3>
                        </div>
                        <p className="text-sm text-slate-600 mb-6">Default production database for high-volume product and category reads.</p>
                        <button 
                            onClick={() => handleSave('primary')}
                            disabled={saving || settings.activeProductionDb === 'primary'}
                            className="w-full py-2.5 rounded-xl font-medium transition-all bg-slate-900 text-white disabled:opacity-50 disabled:bg-slate-200 disabled:text-slate-500 hover:bg-slate-800"
                        >
                            {settings.activeProductionDb === 'primary' ? 'Currently Active' : 'Route Traffic Here'}
                        </button>
                    </div>

                    {/* Secondary Database Card */}
                    <div className={`relative p-6 rounded-2xl border-2 transition-all ${settings.activeProductionDb === 'secondary' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                        {settings.activeProductionDb === 'secondary' && (
                            <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1 bg-emerald-500 text-white text-xs font-bold uppercase rounded-full tracking-wider animate-pulse">
                                <span className="w-1.5 h-1.5 bg-white rounded-full"></span> Live
                            </div>
                        )}
                        <div className="flex items-center gap-3 mb-4">
                            <HddStack size={24} className={settings.activeProductionDb === 'secondary' ? 'text-emerald-600' : 'text-slate-400'} />
                            <h3 className="font-bold text-slate-900 text-lg">Secondary / Backup</h3>
                        </div>
                        <p className="text-sm text-slate-600 mb-6">Failover database. Switch to this if your primary hits the daily 50,000 read limit.</p>
                        <button 
                            onClick={() => handleSave('secondary')}
                            disabled={saving || settings.activeProductionDb === 'secondary'}
                            className="w-full py-2.5 rounded-xl font-medium transition-all bg-slate-900 text-white disabled:opacity-50 disabled:bg-slate-200 disabled:text-slate-500 hover:bg-slate-800"
                        >
                            {settings.activeProductionDb === 'secondary' ? 'Currently Active' : 'Route Traffic Here'}
                        </button>
                    </div>
                </div>

                <div className="mt-8 p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-4">
                    <ShieldCheck size={24} className="text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                        <h4 className="font-semibold text-slate-900 text-sm">Workspace Database</h4>
                        <p className="text-sm text-slate-600 mt-1">
                            Your admin panel, user accounts, and internal logs are securely isolated on a 3rd database. Routing production traffic will not affect admin panel uptime.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

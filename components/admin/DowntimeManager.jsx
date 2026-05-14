'use client'
import { useState, useEffect } from 'react'
import { ShieldExclamation, Server, Ban, CartX, PersonX, Globe, ArrowRight } from 'react-bootstrap-icons'
import toast from 'react-hot-toast'

export default function DowntimeManager() {
    const [settings, setSettings] = useState({
        maintenanceMode: false,
        blockedRoutes: [],
        blockBuyNow: false,
        blockSignups: false,
        fallbackUrl: '',
    })
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [newRoute, setNewRoute] = useState('')

    useEffect(() => {
        fetch('/api/admin/downtime')
            .then(res => res.json())
            .then(data => {
                setSettings({
                    maintenanceMode: data.maintenanceMode || false,
                    blockedRoutes: data.blockedRoutes || [],
                    blockBuyNow: data.blockBuyNow || false,
                    blockSignups: data.blockSignups || false,
                    fallbackUrl: data.fallbackUrl || '',
                })
                setLoading(false)
            })
            .catch(() => setLoading(false))
    }, [])

    const handleSave = async () => {
        setSaving(true)
        try {
            const res = await fetch('/api/admin/downtime', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings),
            })
            if (!res.ok) throw new Error('Failed to save')
            toast.success('Downtime settings updated!')
        } catch (err) {
            toast.error(err.message)
        }
        setSaving(false)
    }

    const addRoute = () => {
        if (!newRoute.startsWith('/')) return toast.error('Route must start with /')
        if (settings.blockedRoutes.includes(newRoute)) return toast.error('Route already blocked')
        setSettings(s => ({ ...s, blockedRoutes: [...s.blockedRoutes, newRoute] }))
        setNewRoute('')
    }

    const removeRoute = (r) => {
        setSettings(s => ({ ...s, blockedRoutes: s.blockedRoutes.filter(x => x !== r) }))
    }

    if (loading) return <div className="p-8 text-center text-slate-500">Loading configurations...</div>

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <ShieldExclamation size={24} className="text-red-500" />
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Downtime & Traffic Manager</h2>
                        <p className="text-sm text-slate-500">Control application availability, block routes, and redirect traffic instantly.</p>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Master Switch */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-3">
                            <Server size={20} className={settings.maintenanceMode ? 'text-red-500' : 'text-emerald-500'} />
                            <div>
                                <h3 className="font-semibold text-slate-900">Global Maintenance Mode</h3>
                                <p className="text-sm text-slate-500">Blocks all public access. Only admins and CMS will work.</p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={settings.maintenanceMode} onChange={async (e) => {
                                const newValue = e.target.checked
                                setSettings(s => ({ ...s, maintenanceMode: newValue }))
                                // Auto-save critical toggle immediately
                                try {
                                    await fetch('/api/admin/downtime', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ ...settings, maintenanceMode: newValue }),
                                    })
                                    toast.success(newValue ? 'Maintenance mode enabled' : 'Maintenance mode disabled')
                                } catch { toast.error('Failed to save') }
                            }} />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                        </label>
                    </div>

                    {/* Quick Toggles */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl">
                            <div className="flex items-center gap-3">
                                <CartX size={18} className="text-orange-500" />
                                <div>
                                    <h3 className="font-medium text-slate-900">Block "Buy Now"</h3>
                                    <p className="text-xs text-slate-500">Disables purchasing globally.</p>
                                </div>
                            </div>
                            <input type="checkbox" checked={settings.blockBuyNow} onChange={e => setSettings(s => ({ ...s, blockBuyNow: e.target.checked }))} className="w-4 h-4 text-blue-600 rounded" />
                        </div>
                        <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl">
                            <div className="flex items-center gap-3">
                                <PersonX size={18} className="text-orange-500" />
                                <div>
                                    <h3 className="font-medium text-slate-900">Block New Signups</h3>
                                    <p className="text-xs text-slate-500">Prevents new user registrations.</p>
                                </div>
                            </div>
                            <input type="checkbox" checked={settings.blockSignups} onChange={e => setSettings(s => ({ ...s, blockSignups: e.target.checked }))} className="w-4 h-4 text-blue-600 rounded" />
                        </div>
                    </div>

                    {/* Fallback URL */}
                    <div className="p-4 border border-slate-200 rounded-xl space-y-3">
                        <div className="flex items-center gap-3">
                            <Globe size={18} className="text-blue-500" />
                            <h3 className="font-medium text-slate-900">Fallback / Redirect URL</h3>
                        </div>
                        <p className="text-xs text-slate-500">If set, blocked users will be redirected here instead of seeing the maintenance page.</p>
                        <input type="url" placeholder="https://backup.tekpik.in" value={settings.fallbackUrl} onChange={e => setSettings(s => ({ ...s, fallbackUrl: e.target.value }))} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
                    </div>

                    {/* Route Blocking */}
                    <div className="p-4 border border-slate-200 rounded-xl space-y-4">
                        <div className="flex items-center gap-3">
                            <Ban size={18} className="text-slate-700" />
                            <div>
                                <h3 className="font-medium text-slate-900">Custom Route Blocking</h3>
                                <p className="text-xs text-slate-500">Instantly take down specific pages (e.g., /deals, /blog/post-1)</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <input type="text" placeholder="e.g. /products/iphone" value={newRoute} onChange={e => setNewRoute(e.target.value)} onKeyDown={e => e.key === 'Enter' && addRoute()} className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
                            <button onClick={addRoute} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition">Block Route</button>
                        </div>
                        <div className="space-y-2">
                            {settings.blockedRoutes.map(route => (
                                <div key={route} className="flex items-center justify-between px-3 py-2 bg-red-50 text-red-700 rounded-lg text-sm">
                                    <span className="font-mono">{route}</span>
                                    <button onClick={() => removeRoute(route)} className="text-red-500 hover:text-red-800 font-medium text-xs uppercase tracking-wider">Unblock</button>
                                </div>
                            ))}
                            {settings.blockedRoutes.length === 0 && (
                                <div className="text-sm text-slate-400 italic">No custom routes currently blocked.</div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-8 flex justify-end">
                    <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-black text-white rounded-xl font-medium hover:bg-slate-800 transition disabled:opacity-50">
                        {saving ? 'Saving...' : 'Save Configuration'}
                        <ArrowRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    )
}

'use client'
import { useState, useEffect } from 'react'
import {
    Plus,
    PencilSquare,
    Trash,
    ArrowRepeat,
    Tag,
    Basket,
    Eye,
    Stars,
    GeoAlt,
    Bell,
    Gear,
    Magic,
    CheckCircleFill,
    XCircleFill,
} from 'react-bootstrap-icons'
import toast from 'react-hot-toast'

export default function AdminCategories() {
    const [categories, setCategories] = useState([])
    const [loading, setLoading] = useState(true)
    const [form, setForm] = useState({ name: '', slug: '' })
    const [adding, setAdding] = useState(false)
    const [autoStats, setAutoStats] = useState(null)
    const [autoRunning, setAutoRunning] = useState(false)
    const [autoResults, setAutoResults] = useState(null)

    useEffect(() => {
        let cancelled = false
        const load = async () => {
            try {
                const [catRes, statsRes] = await Promise.all([
                    fetch('/api/admin/categories'),
                    fetch('/api/admin/auto-categorise'),
                ])
                const data = await catRes.json().catch(() => null)
                if (!catRes.ok) throw new Error(data?.error || 'Failed to load categories')
                const list = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : [])
                if (!cancelled) setCategories(list)
                if (statsRes.ok) {
                    const stats = await statsRes.json().catch(() => null)
                    if (!cancelled && stats) setAutoStats(stats)
                }
            } catch (err) {
                if (!cancelled) { setCategories([]); toast.error(err?.message || 'Failed to load categories') }
            } finally {
                if (!cancelled) setLoading(false)
            }
        }
        load()
        return () => { cancelled = true }
    }, [])

    const handleAdd = async (e) => {
        e.preventDefault()
        if (!form.name || !form.slug) return toast.error('Name and slug are required')
        const res = await fetch('/api/admin/categories', { method: 'POST', body: JSON.stringify(form) })
        if (res.ok) {
            const newCat = await res.json()
            setCategories(prev => [...prev, { ...newCat, products: 0 }])
            setForm({ name: '', slug: '' })
            setAdding(false)
            toast.success('Category added')
        } else {
            const data = await res.json().catch(() => null)
            toast.error(data?.error || 'Failed to add category')
        }
    }

    const handleDelete = async (id) => {
        if (!confirm('Are you sure?')) return
        const res = await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' })
        if (res.ok) {
            setCategories(prev => prev.filter(c => c.id !== id))
            toast.success('Category deleted')
        } else {
            const data = await res.json().catch(() => null)
            toast.error(data?.error || 'Failed to delete category')
        }
    }

    const handleAutoCategorise = async (force = false, dryRun = false) => {
        setAutoRunning(true)
        setAutoResults(null)
        const tid = toast.loading(dryRun ? 'Previewing auto-categorisation...' : 'Auto-categorising products...')
        try {
            const res = await fetch('/api/admin/auto-categorise', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ force, dryRun, minConfidence: 0.3 }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed')
            setAutoResults(data)
            toast.success(
                dryRun
                    ? `Preview: ${data.updated} products would be categorised`
                    : `Done — ${data.updated} products categorised`,
                { id: tid }
            )
            // Refresh stats
            const statsRes = await fetch('/api/admin/auto-categorise')
            if (statsRes.ok) setAutoStats(await statsRes.json().catch(() => null))
        } catch (err) {
            toast.error(err.message, { id: tid })
        } finally {
            setAutoRunning(false)
        }
    }

    if (loading) return <div className="flex justify-center py-20"><ArrowRepeat className="animate-spin text-slate-900" /></div>

    return (
        <div className="text-slate-500 mb-28 space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <h1 className="text-2xl text-slate-500">Manage <span className="text-slate-800 font-medium">Categories</span></h1>
                <button onClick={() => setAdding(v => !v)} className="flex items-center gap-2 px-4 py-2 bg-black hover:bg-black/90 text-white text-sm rounded-lg transition">
                    <Plus size={14} /> {adding ? 'Cancel' : 'Add Category'}
                </button>
            </div>

            {/* Auto-categorise panel */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <div className="flex items-center gap-2">
                            <Magic size={16} className="text-violet-500" />
                            <h2 className="text-base font-semibold text-slate-900">Auto-Categorise</h2>
                        </div>
                        <p className="text-sm text-slate-500 mt-1">
                            Automatically assign categories to products using keyword rules + AI fallback.
                        </p>
                        {autoStats && (
                            <p className="text-xs text-slate-400 mt-1">
                                {autoStats.uncategorised} of {autoStats.total} products have no category
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            onClick={() => handleAutoCategorise(false, true)}
                            disabled={autoRunning}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-60 transition"
                        >
                            <Eye size={13} /> Preview
                        </button>
                        <button
                            onClick={() => handleAutoCategorise(false, false)}
                            disabled={autoRunning || autoStats?.uncategorised === 0}
                            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60 transition"
                        >
                            <Magic size={13} /> {autoRunning ? 'Running...' : `Categorise ${autoStats?.uncategorised ?? ''} products`}
                        </button>
                        <button
                            onClick={() => handleAutoCategorise(true, false)}
                            disabled={autoRunning}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-500 hover:bg-slate-50 disabled:opacity-60 transition"
                            title="Re-categorise all products, including already categorised ones"
                        >
                            <ArrowRepeat size={13} /> Re-run All
                        </button>
                    </div>
                </div>

                {/* Results */}
                {autoResults && (
                    <div className="space-y-3">
                        <div className="flex gap-4 text-sm">
                            <span className="text-emerald-600 font-medium">✓ {autoResults.updated} categorised</span>
                            <span className="text-slate-400">{autoResults.unmatched} unmatched</span>
                            {autoResults.errors > 0 && <span className="text-rose-500">{autoResults.errors} errors</span>}
                            {autoResults.dryRun && <span className="text-amber-500 font-medium">(preview only — nothing saved)</span>}
                        </div>
                        <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-100 divide-y divide-slate-50">
                            {autoResults.results.map((r) => (
                                <div key={r.productId} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                                    {r.status === 'updated' || r.status === 'preview'
                                        ? <CheckCircleFill size={13} className="text-emerald-500 shrink-0" />
                                        : <XCircleFill size={13} className="text-slate-300 shrink-0" />
                                    }
                                    <span className="flex-1 truncate text-slate-700">{r.productTitle || r.productId}</span>
                                    {r.newCategoryName && (
                                        <span className="text-xs text-violet-600 font-medium shrink-0">→ {r.newCategoryName}</span>
                                    )}
                                    {r.confidence && (
                                        <span className="text-[11px] text-slate-400 shrink-0">{Math.round(r.confidence * 100)}% {r.method}</span>
                                    )}
                                    {r.status === 'unmatched' && <span className="text-xs text-slate-400">no match</span>}
                                    {r.status === 'error' && <span className="text-xs text-rose-400 truncate max-w-[120px]">{r.error}</span>}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {adding && (
                <form onSubmit={handleAdd} className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm flex flex-wrap gap-3 items-end">
                    <div className="flex flex-col gap-1 flex-1 min-w-32">
                        <label className="text-xs text-slate-400">Name</label>
                        <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })} placeholder="e.g. Laptops" className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-slate-400" />
                    </div>
                    <div className="flex flex-col gap-1 flex-1 min-w-32">
                        <label className="text-xs text-slate-400">Slug</label>
                        <input required value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} placeholder="e.g. laptops" className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-slate-400" />
                    </div>
                    <button type="submit" className="px-5 py-2 bg-black hover:bg-black text-white text-sm rounded-lg transition">Save</button>
                </form>
            )}

            <div className="overflow-x-auto">
                <table className="w-full text-left ring ring-slate-200 rounded overflow-hidden text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                        <tr>
                            <th className="px-4 py-3">Icon</th>
                            <th className="px-4 py-3">Name</th>
                            <th className="px-4 py-3">Slug</th>
                            <th className="px-4 py-3">Products</th>
                            <th className="px-4 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(Array.isArray(categories) ? categories : []).map(cat => (
                            <tr key={cat.id} className="border-t border-slate-100 hover:bg-slate-50">
                                <td className="px-4 py-3"><CategoryIcon category={cat} /></td>
                                <td className="px-4 py-3 font-medium text-slate-700">{cat.name}</td>
                                <td className="px-4 py-3 text-slate-400">{cat.slug}</td>
                                <td className="px-4 py-3">{cat.products}</td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <button className="p-1.5 text-slate-400 hover:bg-slate-100 rounded transition"><PencilSquare size={14} /></button>
                                        <button onClick={() => handleDelete(cat.id)} className="p-1.5 text-slate-700 hover:bg-slate-100 rounded transition"><Trash size={14} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

function CategoryIcon({ category }) {
    const key = `${category?.slug || ''} ${category?.name || ''}`.toLowerCase()

    let Icon = Tag
    if (key.includes('audio') || key.includes('sound') || key.includes('speaker')) Icon = Bell
    else if (key.includes('camera') || key.includes('photo')) Icon = Eye
    else if (key.includes('game')) Icon = Stars
    else if (key.includes('home') || key.includes('kitchen')) Icon = Basket
    else if (key.includes('phone') || key.includes('laptop') || key.includes('tablet')) Icon = Gear
    else if (key.includes('travel') || key.includes('location')) Icon = GeoAlt

    return (
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-slate-100 text-slate-600" title={category?.name || 'Category'}>
            <Icon size={16} />
        </span>
    )
}

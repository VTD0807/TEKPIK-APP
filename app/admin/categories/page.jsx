'use client'
import { useState, useEffect } from 'react'
import { PlusIcon, PencilIcon, TrashIcon, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminCategories() {
    const [categories, setCategories] = useState([])
    const [loading, setLoading] = useState(true)
    const [form, setForm] = useState({ name: '', slug: '', icon: '🛍️' })
    const [adding, setAdding] = useState(false)

    useEffect(() => {
        let cancelled = false
        const load = async () => {
            try {
                const res = await fetch('/api/admin/categories')
                const data = await res.json().catch(() => null)
                if (!res.ok) {
                    throw new Error(data?.error || 'Failed to load categories')
                }
                const list = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : [])
                if (!cancelled) setCategories(list)
            } catch (err) {
                if (!cancelled) {
                    setCategories([])
                    toast.error(err?.message || 'Failed to load categories')
                }
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
        
        const res = await fetch('/api/admin/categories', {
            method: 'POST',
            body: JSON.stringify(form)
        })

        if (res.ok) {
            const newCat = await res.json()
            setCategories(prev => [...prev, { ...newCat, products: 0 }])
            setForm({ name: '', slug: '', icon: '🛍️' })
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

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-500" /></div>

    return (
        <div className="text-slate-500 mb-28 space-y-5">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl text-slate-500">Manage <span className="text-slate-800 font-medium">Categories</span></h1>
                <button onClick={() => setAdding(v => !v)} className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm rounded-lg transition">
                    <PlusIcon size={14} /> {adding ? 'Cancel' : 'Add Category'}
                </button>
            </div>

            {adding && (
                <form onSubmit={handleAdd} className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm flex flex-wrap gap-3 items-end">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-slate-400">Icon (emoji)</label>
                        <input value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} className="w-16 border border-slate-200 rounded-lg px-2 py-2 text-center text-lg outline-none" />
                    </div>
                    <div className="flex flex-col gap-1 flex-1 min-w-32">
                        <label className="text-xs text-slate-400">Name</label>
                        <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })} placeholder="e.g. Laptops" className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400" />
                    </div>
                    <div className="flex flex-col gap-1 flex-1 min-w-32">
                        <label className="text-xs text-slate-400">Slug</label>
                        <input required value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} placeholder="e.g. laptops" className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400" />
                    </div>
                    <button type="submit" className="px-5 py-2 bg-green-500 hover:bg-green-600 text-white text-sm rounded-lg transition">Save</button>
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
                                <td className="px-4 py-3 text-xl">{cat.icon}</td>
                                <td className="px-4 py-3 font-medium text-slate-700">{cat.name}</td>
                                <td className="px-4 py-3 text-slate-400">{cat.slug}</td>
                                <td className="px-4 py-3">{cat.products}</td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <button className="p-1.5 text-slate-400 hover:bg-slate-100 rounded transition"><PencilIcon size={14} /></button>
                                        <button onClick={() => handleDelete(cat.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded transition"><TrashIcon size={14} /></button>
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

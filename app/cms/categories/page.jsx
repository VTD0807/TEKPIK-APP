'use client'
import { useEffect, useState } from 'react'
import CMSModal from '@/components/cms/CMSModal'
import { Plus, PencilSquare, Trash, Tags } from 'react-bootstrap-icons'
import toast from 'react-hot-toast'

export default function CMSCategories() {
    const [categories, setCategories] = useState([])
    const [loading, setLoading] = useState(true)
    const [modal, setModal] = useState({ open: false, mode: 'create', data: null })
    const [form, setForm] = useState({ name: '', slug: '', icon: '️', description: '' })

    const fetchCategories = () => {
        fetch('/api/admin/categories')
            .then(r => r.json())
            .then(d => { setCategories(Array.isArray(d) ? d : []); setLoading(false) })
            .catch(() => setLoading(false))
    }

    useEffect(() => { fetchCategories() }, [])

    const openCreate = () => {
        setForm({ name: '', slug: '', icon: '️', description: '' })
        setModal({ open: true, mode: 'create', data: null })
    }

    const openEdit = (cat) => {
        setForm({ name: cat.name, slug: cat.slug, icon: cat.icon || '️', description: cat.description || '' })
        setModal({ open: true, mode: 'edit', data: cat })
    }

    const handleSubmit = async () => {
        if (!form.name) return toast.error('Category name is required')
        const slug = form.slug || form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
        const toastId = toast.loading(modal.mode === 'create' ? 'Creating...' : 'Updating...')
        try {
            const url = modal.mode === 'create' ? '/api/admin/categories' : `/api/admin/categories/${modal.data.id}`
            const res = await fetch(url, {
                method: modal.mode === 'create' ? 'POST' : 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, slug }),
            })
            if (!res.ok) throw new Error('Failed')
            toast.success(modal.mode === 'create' ? 'Category created!' : 'Category updated!', { id: toastId })
            setModal({ open: false, mode: 'create', data: null })
            fetchCategories()
        } catch (e) {
            toast.error(e.message, { id: toastId })
        }
    }

    const handleDelete = async (id) => {
        if (!confirm('Delete this category?')) return
        const toastId = toast.loading('Deleting...')
        try {
            const res = await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' })
            if (!res.ok) throw new Error('Failed')
            toast.success('Deleted', { id: toastId })
            fetchCategories()
        } catch (e) {
            toast.error(e.message, { id: toastId })
        }
    }

    const inputClass = "w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 placeholder-slate-400 outline-none focus:border-slate-400 focus:ring-2 focus:ring-black/10 transition"

    if (loading) {
        return (
            <div className="space-y-4">
                <h1 className="text-2xl font-bold text-slate-800">Categories</h1>
                <div className="animate-pulse grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array(6).fill(0).map((_, i) => <div key={i} className="h-28 bg-white rounded-2xl border border-slate-200" />)}
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-end justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Categories</h1>
                    <p className="text-sm text-slate-500 mt-1">{categories.length} categories configured</p>
                </div>
                <button onClick={openCreate}
                    className="flex items-center gap-2 px-4 py-2.5 bg-black text-white text-sm font-medium rounded-xl shadow-lg shadow-black/10 hover:scale-105 transition-transform duration-200">
                    <Plus size={15} /> Add Category
                </button>
            </div>

            {categories.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categories.map(cat => (
                        <div key={cat.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition group">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">{cat.icon || '️'}</span>
                                    <div>
                                        <p className="text-slate-800 font-semibold">{cat.name}</p>
                                        <p className="text-xs text-slate-400">/{cat.slug}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                                    <button onClick={() => openEdit(cat)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition">
                                        <PencilSquare size={13} />
                                    </button>
                                    <button onClick={() => handleDelete(cat.id)} className="p-1.5 rounded-lg text-slate-700 hover:bg-slate-100 transition">
                                        <Trash size={13} />
                                    </button>
                                </div>
                            </div>
                            {cat.description && <p className="text-sm text-slate-500 mt-2 line-clamp-2">{cat.description}</p>}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl">
                    <Tags size={40} className="mx-auto mb-3 text-slate-300" />
                    <p className="text-slate-500">No categories yet. Create your first one.</p>
                </div>
            )}

            <CMSModal isOpen={modal.open} onClose={() => setModal({ open: false, mode: 'create', data: null })} title={modal.mode === 'create' ? 'New Category' : 'Edit Category'} size="sm">
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1.5">Name</label>
                        <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Electronics" className={inputClass} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1.5">Slug</label>
                            <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="electronics" className={inputClass} />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1.5">Icon (emoji)</label>
                            <input value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} className={inputClass} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1.5">Description</label>
                        <textarea rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Category description..." className={`${inputClass} resize-none`} />
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button onClick={() => setModal({ open: false, mode: 'create', data: null })} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 bg-slate-50 border border-slate-200 rounded-xl transition">Cancel</button>
                        <button onClick={handleSubmit} className="px-4 py-2 text-sm text-white bg-black rounded-xl shadow-lg shadow-black/10 hover:scale-105 transition-transform">{modal.mode === 'create' ? 'Create' : 'Save'}</button>
                    </div>
                </div>
            </CMSModal>
        </div>
    )
}


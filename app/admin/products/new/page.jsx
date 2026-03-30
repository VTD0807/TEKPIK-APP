'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeftIcon, SaveIcon, PlusIcon, XIcon } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function NewProduct() {
    const router = useRouter()
    const [saving, setSaving] = useState(false)
    const [categories, setCategories] = useState([])
    const [form, setForm] = useState({
        title: '', description: '', price: '', originalPrice: '',
        discount: '', affiliateUrl: '', asin: '', brand: '',
        categoryId: '', tags: '', isFeatured: false, isActive: true,
    })
    const [imageUrls, setImageUrls] = useState([''])

    useEffect(() => {
        fetch('/api/admin/categories')
            .then(r => r.json())
            .then(d => setCategories(Array.isArray(d) ? d : []))
            .catch(() => {})
    }, [])

    const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

    const handleSubmit = async (e) => {
        e.preventDefault()
        await submitForm(false)
    }

    const handleDraft = async () => {
        await submitForm(true)
    }

    const submitForm = async (isDraft) => {
        if (!form.title || !form.price || !form.affiliateUrl) {
            return toast.error('Title, price and affiliate URL are required')
        }
        setSaving(true)
        try {
            const slug = form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
            const res = await fetch('/api/admin/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    slug,
                    price: parseFloat(form.price),
                    originalPrice: form.originalPrice ? parseFloat(form.originalPrice) : null,
                    discount: parseInt(form.discount) || 0,
                    imageUrls: imageUrls.filter(Boolean),
                    tags: form.tags.split(',').map(s => s.trim()).filter(Boolean),
                    isActive: isDraft ? false : form.isActive,
                }),
            })
            if (!res.ok) {
                const d = await res.json()
                throw new Error(d.error || 'Failed')
            }
            toast.success(isDraft ? 'Draft saved!' : 'Product created!')
            router.push('/admin/products')
        } catch (err) {
            toast.error(err.message)
        } finally {
            setSaving(false)
        }
    }

    const field = (label, key, type = 'text', hint = '', required = false) => (
        <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">
                {label} {required && <span className="text-red-400">*</span>}
            </label>
            {type === 'textarea' ? (
                <textarea rows={4} value={form[key]} onChange={e => set(key, e.target.value)}
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400 resize-none" />
            ) : (
                <input type={type} value={form[key]} onChange={e => set(key, e.target.value)}
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400" />
            )}
            {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
        </div>
    )

    return (
        <div className="max-w-3xl space-y-6 mb-28">
            <div className="flex items-center gap-3">
                <Link href="/admin/products" className="p-1.5 text-slate-400 hover:text-slate-600 transition">
                    <ArrowLeftIcon size={18} />
                </Link>
                <h1 className="text-2xl text-slate-500">Add <span className="text-slate-800 font-medium">Product</span></h1>
            </div>

            <form onSubmit={handleSubmit} className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm space-y-5">

                {/* Basic info */}
                <div className="grid sm:grid-cols-2 gap-4">
                    {field('Title', 'title', 'text', '', true)}
                    {field('Brand', 'brand')}
                </div>
                {field('Description', 'description', 'textarea')}

                {/* Pricing */}
                <div className="grid sm:grid-cols-3 gap-4">
                    {field('Price ($)', 'price', 'number', '', true)}
                    {field('Original Price ($)', 'originalPrice', 'number', 'For showing strikethrough')}
                    {field('Discount (%)', 'discount', 'number')}
                </div>

                {/* Affiliate */}
                {field('Affiliate URL', 'affiliateUrl', 'url', 'Full Amazon URL with your associate tag', true)}
                {field('ASIN', 'asin', 'text', 'e.g. B08N5WRWNW (optional)')}

                {/* Category */}
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-500">Category <span className="text-red-400">*</span></label>
                    <select value={form.categoryId} onChange={e => set('categoryId', e.target.value)} required
                        className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400 bg-white">
                        <option value="">Select a category...</option>
                        {categories.map(c => (
                            <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                        ))}
                    </select>
                    {categories.length === 0 && (
                        <p className="text-[11px] text-amber-500">No categories yet — <Link href="/admin/categories" className="underline">add one first</Link></p>
                    )}
                </div>
                {field('Tags', 'tags', 'text', 'Comma-separated: wireless, gaming, budget')}

                {/* Images */}
                <div className="flex flex-col gap-2">
                    <label className="text-xs font-medium text-slate-500">Image URLs</label>
                    {imageUrls.map((url, i) => (
                        <div key={i} className="flex gap-2">
                            <input
                                type="url"
                                value={url}
                                placeholder={`Image URL ${i + 1}`}
                                onChange={e => setImageUrls(prev => prev.map((u, j) => j === i ? e.target.value : u))}
                                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400"
                            />
                            {imageUrls.length > 1 && (
                                <button type="button" onClick={() => setImageUrls(prev => prev.filter((_, j) => j !== i))}
                                    className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition">
                                    <XIcon size={14} />
                                </button>
                            )}
                        </div>
                    ))}
                    <button type="button" onClick={() => setImageUrls(prev => [...prev, ''])}
                        className="flex items-center gap-1.5 text-xs text-indigo-500 hover:text-indigo-700 transition w-fit">
                        <PlusIcon size={13} /> Add image URL
                    </button>
                    <p className="text-[11px] text-slate-400">Use Amazon image URLs (m.media-amazon.com) or Cloudinary URLs</p>
                </div>

                {/* Flags */}
                <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                        <input type="checkbox" checked={form.isFeatured} onChange={e => set('isFeatured', e.target.checked)} className="rounded" />
                        Featured product
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                        <input type="checkbox" checked={form.isActive} onChange={e => set('isActive', e.target.checked)} className="rounded" />
                        Active (visible on site)
                    </label>
                </div>

                <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                    <button type="submit" disabled={saving}
                        className="flex items-center gap-2 px-6 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 text-white text-sm rounded-lg transition">
                        <SaveIcon size={14} /> {saving ? 'Creating...' : 'Create Product'}
                    </button>
                    <Link href="/admin/products" className="px-5 py-2 border border-slate-200 text-slate-500 text-sm rounded-lg hover:bg-slate-50 transition">
                        Cancel
                    </Link>
                </div>
            </form>
        </div>
    )
}

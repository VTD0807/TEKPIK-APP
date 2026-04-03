'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Save, ArrowRepeat, Plus, X, Image, ShieldCheck, PersonCheck, Flag, Clock } from 'react-bootstrap-icons'
import Link from 'next/link'
import toast from 'react-hot-toast'

import RichTextEditor from '@/components/RichTextEditor'

export default function CMSProductEditor() {
    const router = useRouter()
    const params = useParams()
    const isNew = params.id === 'new'
    const [saving, setSaving] = useState(false)
    const [loading, setLoading] = useState(!isNew)
    const [categories, setCategories] = useState([])
    const [form, setForm] = useState({
        title: '', description: '', aiSummary: '', price: '', originalPrice: '',
        discount: '', affiliateUrl: '', asin: '', brand: '',
        categoryId: '', tags: '', isFeatured: false, isActive: true,
    })
    const [imageUrls, setImageUrls] = useState([''])
    const [moderation, setModeration] = useState({
        status: 'Draft',
        reviewer: '',
        priority: 'Normal',
        notes: '',
    })

    useEffect(() => {
        fetch('/api/admin/categories')
            .then(r => r.json())
            .then(d => setCategories(Array.isArray(d) ? d : []))
            .catch(() => {})
    }, [])

    useEffect(() => {
        if (!isNew) {
            fetch(`/api/admin/products`)
                .then(r => r.json())
                .then(d => {
                    const p = (d.products || []).find(x => x.id === params.id)
                    if (p) {
                        setForm({
                            title: p.title || '',
                            description: p.description || '',
                            aiSummary: p.aiSummary || p.ai_summary || '',
                            price: p.price?.toString() || '',
                            originalPrice: (p.originalPrice ?? p.original_price)?.toString() || '',
                            discount: p.discount?.toString() || '',
                            affiliateUrl: p.affiliateUrl || p.affiliate_url || '',
                            asin: p.asin || '',
                            brand: p.brand || '',
                            categoryId: p.categoryId || p.category_id || '',
                            tags: (p.tags || []).join(', '),
                            isFeatured: p.isFeatured ?? p.is_featured ?? false,
                            isActive: p.isActive ?? p.is_active ?? p.public ?? true,
                        })
                        const imgs = p.imageUrls || p.image_urls || []
                        setImageUrls(imgs.length > 0 ? imgs : [''])
                    }
                    setLoading(false)
                })
                .catch(() => setLoading(false))
        }
    }, [params.id, isNew])

    const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!form.title || !form.price || !form.affiliateUrl) {
            return toast.error('Title, price and affiliate URL are required')
        }
        setSaving(true)
        try {
            const slug = form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
            const method = isNew ? 'POST' : 'PUT'
            const url = isNew ? '/api/admin/products' : `/api/admin/products/${params.id}`
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    slug,
                    aiSummary: form.aiSummary,
                    price: parseFloat(form.price),
                    originalPrice: form.originalPrice ? parseFloat(form.originalPrice) : null,
                    discount: parseInt(form.discount) || 0,
                    imageUrls: imageUrls.filter(Boolean),
                    tags: form.tags.split(',').map(s => s.trim()).filter(Boolean),
                }),
            })
            if (!res.ok) {
                const d = await res.json()
                throw new Error(d.error || 'Failed')
            }
            toast.success(isNew ? 'Product created!' : 'Product updated!')
            router.push('/cms/products')
        } catch (err) {
            toast.error(err.message)
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="max-w-3xl space-y-6">
                <div className="flex items-center gap-3">
                    <Link href="/cms/products" className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition">
                        <ArrowLeft size={18} />
                    </Link>
                    <div className="h-7 w-48 bg-slate-200 rounded animate-pulse" />
                </div>
                <div className="space-y-4 animate-pulse">
                    {Array(6).fill(0).map((_, i) => <div key={i} className="h-12 bg-white rounded-xl border border-slate-200" />)}
                </div>
            </div>
        )
    }

    const inputClass = "w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 placeholder-slate-400 outline-none focus:border-slate-400 focus:ring-2 focus:ring-black/10 transition"
    const canViewAffiliate = !!form.affiliateUrl
    const descriptionPlain = (form.description || '').replace(/<[^>]*>/g, '').trim()
    const imageCount = imageUrls.filter(Boolean).length
    const titleLength = (form.title || '').trim().length
    const isPriceValid = Number(form.price) > 0
    const isOriginalValid = !form.originalPrice || Number(form.originalPrice) >= Number(form.price || 0)

    return (
        <div className="max-w-6xl space-y-6">
            <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-6 items-start">
                <div className="space-y-6">
                    <div className="flex items-center gap-3">
                <Link href="/cms/products" className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition">
                    <ArrowLeft size={18} />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">{isNew ? 'Add Product' : 'Edit Product'}</h1>
                    <p className="text-sm text-slate-400 mt-0.5">{isNew ? 'Create a new product listing' : 'Update product information'}</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Top Actions */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center gap-3 flex-wrap">
                        <a
                            href={canViewAffiliate ? form.affiliateUrl : '#'}
                            target="_blank"
                            rel="noopener noreferrer sponsored"
                            onClick={(e) => { if (!canViewAffiliate) e.preventDefault() }}
                            className={`px-5 py-2.5 text-sm font-medium rounded-xl border transition ${canViewAffiliate
                                ? 'text-slate-700 border-slate-300 hover:bg-slate-50'
                                : 'text-slate-400 border-slate-200 cursor-not-allowed'
                            }`}
                        >
                            View Product
                        </a>
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex items-center gap-2 px-6 py-2.5 bg-black text-white text-sm font-medium rounded-xl shadow-lg shadow-black/10 hover:scale-105 disabled:opacity-60 disabled:hover:scale-100 transition-transform duration-200"
                        >
                            {saving ? <><ArrowRepeat size={15} className="animate-spin" /> Saving...</> : <><Save size={15} /> Save Product</>}
                        </button>
                    </div>
                </div>

                {/* Basic Info */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
                    <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">Basic Information</h3>
                    <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1.5">Title <span className="text-slate-700">*</span></label>
                            <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Product title" className={inputClass} />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1.5">Brand</label>
                            <input value={form.brand} onChange={e => set('brand', e.target.value)} placeholder="Brand name" className={inputClass} />
                        </div>
                    </div>
                </div>

                {/* Description */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
                    <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">Description</h3>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5">Description (Rich Text)</label>
                        <RichTextEditor value={form.description} onChange={val => set('description', val)} placeholder="Detailed product description..." />
                    </div>
                </div>

                {/* AI Summary */}
                <div className="relative rounded-2xl p-[1.5px] ai-summary-roaming">
                    <div className="bg-white rounded-2xl p-5 space-y-4 shadow-sm">
                        <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">AI Summary</h3>
                        <div>
                            <label className="block text-xs font-medium text-violet-700 mb-1.5">Manual AI Summary (Overrides Auto-Analysis)</label>
                            <RichTextEditor value={form.aiSummary} onChange={val => set('aiSummary', val)} placeholder="Enter a manually verified Pros/Cons/Summary..." />
                        </div>
                    </div>
                </div>

                {/* Pricing */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
                    <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">Pricing</h3>
                    <div className="grid sm:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1.5">Price (INR) <span className="text-slate-700">*</span></label>
                            <input type="number" step="0.01" value={form.price} onChange={e => set('price', e.target.value)} placeholder="29.99" className={inputClass} />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1.5">Original Price (INR)</label>
                            <input type="number" step="0.01" value={form.originalPrice} onChange={e => set('originalPrice', e.target.value)} placeholder="49.99" className={inputClass} />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1.5">Discount (%)</label>
                            <input type="number" value={form.discount} onChange={e => set('discount', e.target.value)} placeholder="40" className={inputClass} />
                        </div>
                    </div>
                </div>

                {/* Affiliate & Category */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
                    <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">Affiliate & Classification</h3>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5">Affiliate URL <span className="text-slate-700">*</span></label>
                        <input type="url" value={form.affiliateUrl} onChange={e => set('affiliateUrl', e.target.value)} placeholder="https://amazon.com/dp/..." className={inputClass} />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1.5">ASIN</label>
                            <input value={form.asin} onChange={e => set('asin', e.target.value)} placeholder="B08N5WRWNW" className={inputClass} />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1.5">Category</label>
                            <select value={form.categoryId} onChange={e => set('categoryId', e.target.value)} className={`${inputClass} bg-white`}>
                                <option value="">Select category...</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5">Tags</label>
                        <input value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="wireless, gaming, budget" className={inputClass} />
                        <p className="text-[11px] text-slate-400 mt-1">Comma-separated tags</p>
                    </div>
                </div>

                {/* Images */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
                    <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider flex items-center gap-2">
                        <Image size={14} className="text-slate-900" />
                        Product Images
                    </h3>
                    {imageUrls.map((url, i) => (
                        <div key={i} className="flex gap-2">
                            <input
                                type="url" value={url} placeholder={`Image URL ${i + 1}`}
                                onChange={e => setImageUrls(prev => prev.map((u, j) => j === i ? e.target.value : u))}
                                className={`flex-1 ${inputClass}`}
                            />
                            {url && (
                                <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                                    <img src={url} alt="" className="w-full h-full object-contain" onError={e => e.target.style.display = 'none'} referrerPolicy="no-referrer" />
                                </div>
                            )}
                            {imageUrls.length > 1 && (
                                <button type="button" onClick={() => setImageUrls(prev => prev.filter((_, j) => j !== i))}
                                    className="p-2.5 text-slate-700 hover:bg-slate-100 rounded-xl transition">
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    ))}
                    <button type="button" onClick={() => setImageUrls(prev => [...prev, ''])}
                        className="flex items-center gap-1.5 text-xs text-slate-900 hover:text-slate-900 transition">
                        <Plus size={13} /> Add image URL
                    </button>
                </div>

                {/* Flags */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
                    <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">Visibility</h3>
                    <div className="flex items-center gap-6">
                        <label className="flex items-center gap-2.5 text-sm text-slate-600 cursor-pointer group">
                            <input type="checkbox" checked={form.isFeatured} onChange={e => set('isFeatured', e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-black/10" />
                            <span className="group-hover:text-slate-800 transition">Featured product</span>
                        </label>
                        <label className="flex items-center gap-2.5 text-sm text-slate-600 cursor-pointer group">
                            <input type="checkbox" checked={form.isActive} onChange={e => set('isActive', e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-black/10" />
                            <span className="group-hover:text-slate-800 transition">Active (visible on site)</span>
                        </label>
                    </div>
                </div>

                {/* Submit */}
                <div className="flex items-center gap-3 sticky bottom-4">
                    <button type="submit" disabled={saving}
                        className="flex items-center gap-2 px-6 py-3 bg-black text-white text-sm font-medium rounded-xl shadow-lg shadow-black/10 hover:scale-105 disabled:opacity-60 disabled:hover:scale-100 transition-transform duration-200">
                        {saving ? <><ArrowRepeat size={15} className="animate-spin" /> Saving...</> : <><Save size={15} /> {isNew ? 'Create Product' : 'Save Changes'}</>}
                    </button>
                    <Link href="/cms/products" className="px-5 py-3 text-sm text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-xl shadow-sm transition">
                        Cancel
                    </Link>
                </div>
            </form>
                </div>

                <aside className="space-y-6 lg:sticky lg:top-6">
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                <ShieldCheck size={14} className="text-slate-900" />
                                Moderation
                            </h3>
                            <span className={`text-[11px] px-2 py-1 rounded-full border ${form.isActive ? 'border-emerald-200 text-emerald-700 bg-emerald-50' : 'border-slate-200 text-slate-500 bg-slate-50'}`}>
                                {form.isActive ? 'Active' : 'Hidden'}
                            </span>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1.5">Status</label>
                            <select
                                value={moderation.status}
                                onChange={e => setModeration(m => ({ ...m, status: e.target.value }))}
                                className={`${inputClass} bg-white`}
                            >
                                <option>Draft</option>
                                <option>In Review</option>
                                <option>Approved</option>
                                <option>Published</option>
                                <option>Archived</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1.5">Reviewer</label>
                            <div className="flex items-center gap-2">
                                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                                    <PersonCheck size={16} />
                                </span>
                                <input
                                    value={moderation.reviewer}
                                    onChange={e => setModeration(m => ({ ...m, reviewer: e.target.value }))}
                                    placeholder="Assign reviewer"
                                    className={inputClass}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1.5">Priority</label>
                            <div className="grid grid-cols-3 gap-2 text-xs">
                                {['Low', 'Normal', 'High'].map(level => (
                                    <button
                                        type="button"
                                        key={level}
                                        onClick={() => setModeration(m => ({ ...m, priority: level }))}
                                        className={`px-3 py-2 rounded-xl border transition ${moderation.priority === level ? 'border-slate-900 text-slate-900 bg-slate-50' : 'border-slate-200 text-slate-500 hover:text-slate-700'}`}
                                    >
                                        {level}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1.5">Internal Notes</label>
                            <textarea
                                rows={3}
                                value={moderation.notes}
                                onChange={e => setModeration(m => ({ ...m, notes: e.target.value }))}
                                placeholder="Add review notes..."
                                className={`${inputClass} resize-none`}
                            />
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
                        <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider flex items-center gap-2">
                            <Flag size={14} className="text-slate-900" />
                            Quality Checks
                        </h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-slate-600">Title length</span>
                                <span className={`${titleLength >= 20 ? 'text-emerald-700' : 'text-amber-600'}`}>{titleLength} chars</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-slate-600">Description</span>
                                <span className={`${descriptionPlain.length >= 120 ? 'text-emerald-700' : 'text-amber-600'}`}>{descriptionPlain.length} chars</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-slate-600">Images</span>
                                <span className={`${imageCount >= 2 ? 'text-emerald-700' : 'text-amber-600'}`}>{imageCount} added</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-slate-600">Price valid</span>
                                <span className={`${isPriceValid ? 'text-emerald-700' : 'text-rose-600'}`}>{isPriceValid ? 'Yes' : 'No'}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-slate-600">Original &gt;= Price</span>
                                <span className={`${isOriginalValid ? 'text-emerald-700' : 'text-rose-600'}`}>{isOriginalValid ? 'OK' : 'Fix'}</span>
                            </div>
                        </div>
                        <button type="button" className="w-full mt-2 px-4 py-2.5 text-sm rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition">
                            Run checklist
                        </button>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
                        <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider flex items-center gap-2">
                            <Clock size={14} className="text-slate-900" />
                            Recent Activity
                        </h3>
                        <div className="space-y-3 text-xs text-slate-500">
                            <div className="flex items-start gap-2">
                                <span className="mt-1 h-2 w-2 rounded-full bg-emerald-500" />
                                <div>
                                    <p className="text-slate-600">Listing opened for edit</p>
                                    <p className="text-[11px] text-slate-400">Just now</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2">
                                <span className="mt-1 h-2 w-2 rounded-full bg-slate-300" />
                                <div>
                                    <p className="text-slate-600">Last publish check passed</p>
                                    <p className="text-[11px] text-slate-400">1 day ago</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </aside>
            </div>

            <style jsx>{`
                .ai-summary-roaming {
                    background: conic-gradient(from 0deg, #7c3aed, #a78bfa, #9333ea, #c4b5fd, #7c3aed);
                    animation: roamBorder 5s linear infinite;
                    background-size: 180% 180%;
                }

                @keyframes roamBorder {
                    0% {
                        background-position: 0% 50%;
                    }
                    100% {
                        background-position: 100% 50%;
                    }
                }
            `}</style>
        </div>
    )
}

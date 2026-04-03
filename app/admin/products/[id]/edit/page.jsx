'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Save, Plus, X, ArrowRepeat, CheckCircle, XCircle, Flag, Eye, EyeSlash, AlertCircle } from 'react-bootstrap-icons'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function EditProduct() {
    const router = useRouter()
    const { id } = useParams()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [form, setForm] = useState({
        title: '', description: '', price: '', originalPrice: '',
        discount: '', affiliateUrl: '', asin: '', brand: '',
        categoryId: '', tags: '', isFeatured: false, isActive: true,
        status: 'pending', moderationNotes: '', aiScore: 0
    })
    const [imageUrls, setImageUrls] = useState([''])

    useEffect(() => {
        fetch(`/api/products/${id}`)
            .then(r => r.json())
            .then(data => {
                setForm({
                    title: data.title || '',
                    description: data.description || '',
                    price: data.price || '',
                    originalPrice: data.original_price || data.originalPrice || '',
                    discount: data.discount || '',
                    affiliateUrl: data.affiliate_url || data.affiliateUrl || '',
                    asin: data.asin || '',
                    brand: data.brand || '',
                    categoryId: data.category_id || data.categoryId || '',
                    tags: data.tags?.join(', ') || '',
                    isFeatured: data.is_featured || data.isFeatured || false,
                    isActive: data.is_active ?? data.isActive ?? true,
                    status: data.status || 'pending',
                    moderationNotes: data.moderation_notes || '',
                    aiScore: data.ai_score || 0
                })
                const imgs = data.image_urls || data.imageUrls || []
                setImageUrls(imgs.length > 0 ? imgs : [''])
                setLoading(false)
            })
            .catch(() => setLoading(false))
    }, [id])

    const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

    const getProductAlerts = () => {
        const alerts = []
        if (!form.title) alerts.push({ type: 'error', msg: 'Title is required' })
        if (!form.description || form.description.length < 50) alerts.push({ type: 'warning', msg: 'Description too short' })
        if (!form.price) alerts.push({ type: 'error', msg: 'Price is required' })
        if (!form.affiliateUrl) alerts.push({ type: 'error', msg: 'Affiliate URL required' })
        if (!form.categoryId) alerts.push({ type: 'warning', msg: 'Category missing' })
        if (imageUrls.filter(Boolean).length === 0) alerts.push({ type: 'warning', msg: 'No images set' })
        return alerts
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!form.title || !form.price || !form.affiliateUrl) {
            return toast.error('Title, price and affiliate URL are required')
        }
        setSaving(true)
        try {
            const res = await fetch(`/api/admin/products/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    price: parseFloat(form.price),
                    originalPrice: form.originalPrice ? parseFloat(form.originalPrice) : null,
                    discount: parseInt(form.discount) || 0,
                    imageUrls: imageUrls.filter(Boolean),
                    tags: form.tags.split(',').map(s => s.trim()).filter(Boolean),
                    status: form.status,
                    moderationNotes: form.moderationNotes
                }),
            })
            if (!res.ok) {
                const d = await res.json()
                throw new Error(d.error || 'Failed')
            }
            toast.success('Product updated!')
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
                {label} {required && <span className="text-slate-700">*</span>}
            </label>
            {type === 'textarea' ? (
                <textarea rows={4} value={form[key]} onChange={e => set(key, e.target.value)}
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-slate-400 resize-none" />
            ) : (
                <input type={type} value={form[key]} onChange={e => set(key, e.target.value)}
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-slate-400" />
            )}
            {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
        </div>
    )

    if (loading) return <div className="flex justify-center py-20"><ArrowRepeat className="animate-spin text-slate-900" /></div>

    const alerts = getProductAlerts()

    return (
        <div className="mb-28">
            <div className="flex items-center gap-3 mb-6">
                <Link href="/admin/products" className="p-1.5 text-slate-400 hover:text-slate-600 transition">
                    <ArrowLeft size={18} />
                </Link>
                <h1 className="text-2xl text-slate-500">Edit <span className="text-slate-800 font-medium">Product</span></h1>
            </div>

            <div className="flex gap-6">
                {/* LEFT: FORM */}
                <div className="flex-1 min-w-0">
                <form onSubmit={handleSubmit} className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm space-y-5">
                    {/* Basic info */}
                    <div className="grid sm:grid-cols-2 gap-4">
                        {field('Title', 'title', 'text', '', true)}
                        {field('Brand', 'brand')}
                    </div>
                    {field('Description', 'description', 'textarea')}

                    {/* Pricing */}
                    <div className="grid sm:grid-cols-3 gap-4">
                        {field('Price (INR)', 'price', 'number', '', true)}
                        {field('Original Price (INR)', 'originalPrice', 'number', 'For showing strikethrough')}
                        {field('Discount (%)', 'discount', 'number')}
                    </div>

                    {/* Affiliate */}
                    {field('Affiliate URL', 'affiliateUrl', 'url', 'Full Amazon URL with your associate tag', true)}
                    {field('ASIN', 'asin', 'text', 'e.g. B08N5WRWNW (optional)')}

                    {/* Category */}
                    {field('Category ID', 'categoryId', 'text', 'Paste the category ID from the Categories page')}
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
                                    className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-slate-400"
                                />
                                {imageUrls.length > 1 && (
                                    <button type="button" onClick={() => setImageUrls(prev => prev.filter((_, j) => j !== i))}
                                        className="p-2 text-slate-700 hover:bg-slate-100 rounded-lg transition">
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        ))}
                        <button type="button" onClick={() => setImageUrls(prev => [...prev, ''])}
                            className="flex items-center gap-1.5 text-xs text-slate-900 hover:text-slate-900 transition w-fit">
                            <Plus size={13} /> Add image URL
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
                            className="flex items-center gap-2 px-6 py-2 bg-black hover:bg-black/90 disabled:opacity-60 text-white text-sm rounded-lg transition">
                            {saving ? (
                                <><ArrowRepeat className="animate-spin" size={14} /> Updating...</>
                            ) : (
                                <><Save size={14} /> Update Product</>
                            )}
                        </button>
                        <Link href="/admin/products" className="px-5 py-2 border border-slate-200 text-slate-500 text-sm rounded-lg hover:bg-slate-50 transition">
                            Cancel
                        </Link>
                    </div>
                </form>
                </div>

                {/* RIGHT: MODERATION SIDEBAR */}
                <div className="w-80 flex-shrink-0 space-y-4">
                {/* Status Card */}
                <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm space-y-4">
                    <div className="text-xs font-medium text-slate-500 uppercase">Status</div>
                    <select value={form.status} onChange={e => set('status', e.target.value)}
                        style={{
                            borderColor: form.status === 'approved' ? '#10b981' : form.status === 'rejected' ? '#ef4444' : form.status === 'pending' ? '#f59e0b' : '#cbd5e1',
                            backgroundColor: form.status === 'approved' ? '#d1fae5' : form.status === 'rejected' ? '#fee2e2' : form.status === 'pending' ? '#fef3c7' : '#f1f5f9'
                        }}
                        className="w-full px-3 py-2 text-sm border rounded-lg outline-none">
                        <option value="draft">Draft</option>
                        <option value="pending">Pending Review</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                    </select>
                </div>

                {/* AI Quality Score */}
                <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
                    <div className="text-xs font-medium text-slate-500 uppercase mb-3">Quality Score</div>
                    <div className="flex items-end gap-3">
                        <div className="text-3xl font-bold text-slate-900">{form.aiScore}<span className="text-lg text-slate-500">/10</span></div>
                        <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500" style={{ width: `${form.aiScore * 10}%` }}></div>
                        </div>
                    </div>
                </div>

                {/* Alerts */}
                {alerts.length > 0 && (
                    <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm space-y-2">
                        <div className="text-xs font-medium text-slate-500 uppercase">Alerts</div>
                        {alerts.map((alert, i) => (
                            <div key={i} className={`flex gap-2 text-[13px] p-2 rounded-lg ${alert.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
                                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                                <span>{alert.msg}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Quick Actions */}
                <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm space-y-2">
                    <div className="text-xs font-medium text-slate-500 uppercase mb-3">Actions</div>
                    <button onClick={() => set('status', 'approved')}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-green-50 hover:bg-green-100 text-green-700 text-sm rounded-lg transition">
                        <CheckCircle size={14} /> Approve
                    </button>
                    <button onClick={() => set('status', 'rejected')}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-red-200 hover:bg-red-50 text-red-700 text-sm rounded-lg transition">
                        <XCircle size={14} /> Reject
                    </button>
                    <button onClick={() => set('status', 'pending')}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-amber-200 hover:bg-amber-50 text-amber-700 text-sm rounded-lg transition">
                        <Flag size={14} /> Flag for Review
                    </button>
                </div>

                {/* Publish Toggle */}
                <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
                    <button onClick={() => set('isActive', !form.isActive)}
                        className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition ${form.isActive ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-slate-50 text-slate-700 border border-slate-200'}`}>
                        {form.isActive ? <Eye size={14} /> : <EyeSlash size={14} />}
                        {form.isActive ? 'Published' : 'Unpublished'}
                    </button>
                </div>

                {/* Moderation Notes */}
                <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm space-y-2">
                    <label className="text-xs font-medium text-slate-500 uppercase">Notes</label>
                    <textarea rows={3} value={form.moderationNotes} onChange={e => set('moderationNotes', e.target.value)}
                        placeholder="Add moderation comments..."
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-slate-400 resize-none" />
                </div>
                </div>
            </div>
        </div>
    )
}

'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Loading from '@/components/Loading'
import { SparklesIcon, SaveIcon, ArrowLeftIcon, RefreshCwIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import AiAnalysis from '@/components/ai/AiAnalysis'
import Link from 'next/link'

export default function EditProduct() {
    const { id } = useParams()
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [analysing, setAnalysing] = useState(false)
    const [analysis, setAnalysis] = useState(null)
    const [form, setForm] = useState({
        title: '', description: '', price: '', originalPrice: '',
        discount: '', affiliateUrl: '', asin: '', brand: '',
        imageUrls: '', isFeatured: false, isActive: true,
    })

    useEffect(() => {
        fetch(`/api/products/${id}`)
            .then(r => r.json())
            .then(p => {
                setForm({
                    title: p.title || '',
                    description: p.description || '',
                    price: p.price || '',
                    originalPrice: p.originalPrice || '',
                    discount: p.discount || '',
                    affiliateUrl: p.affiliateUrl || '',
                    asin: p.asin || '',
                    brand: p.brand || '',
                    imageUrls: (p.imageUrls || p.images || []).join(', '),
                    isFeatured: p.isFeatured || false,
                    isActive: p.isActive ?? true,
                })
                setAnalysis(p.aiAnalysis || null)
                setLoading(false)
            })
            .catch(() => { toast.error('Failed to load product'); setLoading(false) })
    }, [id])

    const handleSave = async (e) => {
        e.preventDefault()
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
                    imageUrls: form.imageUrls.split(',').map(s => s.trim()).filter(Boolean),
                }),
            })
            if (!res.ok) throw new Error()
            toast.success('Product saved')
            router.push('/admin/products')
        } catch {
            toast.error('Failed to save product')
        } finally {
            setSaving(false)
        }
    }

    const handleAnalyse = async () => {
        setAnalysing(true)
        try {
            const res = await fetch('/api/ai/analyse', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId: id }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            setAnalysis(data.analysis)
            toast.success('AI analysis generated!')
        } catch (e) {
            toast.error(e.message || 'Analysis failed')
        } finally {
            setAnalysing(false)
        }
    }

    if (loading) return <Loading />

    const field = (label, key, type = 'text', hint = '') => (
        <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500 font-medium">{label}</label>
            {type === 'textarea' ? (
                <textarea rows={4} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })}
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400 resize-none" />
            ) : (
                <input type={type} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })}
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
                <h1 className="text-2xl text-slate-500">Edit <span className="text-slate-800 font-medium">Product</span></h1>
            </div>

            <form onSubmit={handleSave} className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                    {field('Title', 'title')}
                    {field('Brand', 'brand')}
                </div>
                {field('Description', 'description', 'textarea')}
                <div className="grid sm:grid-cols-3 gap-4">
                    {field('Price ($)', 'price', 'number')}
                    {field('Original Price ($)', 'originalPrice', 'number')}
                    {field('Discount (%)', 'discount', 'number')}
                </div>
                {field('Affiliate URL', 'affiliateUrl', 'url', 'Amazon affiliate link with your tag')}
                {field('ASIN', 'asin', 'text', 'Amazon Standard Identification Number (optional)')}
                {field('Image URLs', 'imageUrls', 'text', 'Comma-separated image URLs')}

                <div className="flex items-center gap-6 pt-1">
                    <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                        <input type="checkbox" checked={form.isFeatured} onChange={e => setForm({ ...form, isFeatured: e.target.checked })} className="rounded" />
                        Featured product
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                        <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} className="rounded" />
                        Active (visible)
                    </label>
                </div>

                <div className="flex items-center gap-3 pt-2">
                    <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 text-white text-sm rounded-lg transition">
                        <SaveIcon size={14} /> {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <Link href="/admin/products" className="px-5 py-2 border border-slate-200 text-slate-500 text-sm rounded-lg hover:bg-slate-50 transition">
                        Cancel
                    </Link>
                </div>
            </form>

            <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                    <p className="font-medium text-slate-700 flex items-center gap-2">
                        <SparklesIcon size={16} className="text-purple-500" /> AI Analysis
                    </p>
                    <button onClick={handleAnalyse} disabled={analysing} className="flex items-center gap-2 px-4 py-1.5 bg-purple-500 hover:bg-purple-600 disabled:opacity-60 text-white text-sm rounded-lg transition">
                        {analysing ? 'Analysing...' : (analysis ? 'Re-analyse' : 'Generate Analysis')}
                    </button>
                </div>
                {analysis ? <AiAnalysis analysis={analysis} /> : (
                    <p className="text-sm text-slate-400">No AI analysis yet. Click Generate Analysis to create one.</p>
                )}
            </div>
        </div>
    )
}
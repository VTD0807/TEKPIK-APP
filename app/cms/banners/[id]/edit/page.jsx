'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Image, ArrowRepeat, Trash } from 'react-bootstrap-icons'
import toast from 'react-hot-toast'

export default function EditBannerPage({ params }) {
    const router = useRouter()
    const [id, setId] = useState(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [formData, setFormData] = useState({
        title: '',
        link: '',
        imageUrl: '',
        isActive: true
    })

    useEffect(() => {
        params.then(p => setId(p.id))
    }, [params])

    useEffect(() => {
        if (!id) return
        fetch(`/api/admin/banners`)
            .then(r => r.json())
            .then(data => {
                const banner = Array.isArray(data) ? data.find(b => b.id === id) : null
                if (banner) {
                    setFormData({
                        title: banner.title || '',
                        link: banner.link || '',
                        imageUrl: banner.imageUrl || '',
                        isActive: banner.isActive !== undefined ? banner.isActive : true
                    })
                }
                setLoading(false)
            })
            .catch(() => setLoading(false))
    }, [id])

    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploading(true)
        const data = new FormData()
        data.append('file', file)
        data.append('upload_preset', 'tekpik_oqens')

        try {
            const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'c-c86c0e6d24ffc635b0151c04821e389'}/image/upload`, {
                method: 'POST',
                body: data,
            })
            const result = await res.json()
            if (result.secure_url) {
                setFormData(prev => ({ ...prev, imageUrl: result.secure_url }))
                toast.success('Image uploaded successfully')
            } else {
                throw new Error(result.error?.message || 'Upload failed')
            }
        } catch (error) {
            toast.error(error.message)
            console.error('Cloudinary error:', error)
        } finally {
            setUploading(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!formData.imageUrl) return toast.error("Please upload a banner image")

        setSaving(true)
        const toastId = toast.loading('Saving changes...')
        
        try {
            const res = await fetch(`/api/admin/banners/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            
            toast.success('Banner updated', { id: toastId })
            router.push('/cms/banners')
        } catch (err) {
            toast.error(err.message, { id: toastId })
        } finally {
            setSaving(false)
        }
    }

    if (loading) return (
        <div className="flex items-center justify-center min-h-[50vh]">
            <ArrowRepeat size={32} className="animate-spin text-slate-300" />
        </div>
    )

    return (
        <div className="max-w-3xl space-y-6 pb-20">
            <div className="flex items-center gap-4">
                <Link href="/cms/banners" className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition">
                    <ArrowLeft size={20} />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Edit Image Banner</h1>
                    <p className="text-sm text-slate-400">Update promotional banner image and specific links.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
                
                {/* Full Image Upload */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Banner Image</label>
                    <div className="w-full">
                        {formData.imageUrl ? (
                            <div className="relative w-full aspect-[21/6] rounded-xl border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center shadow-sm">
                                <img src={formData.imageUrl} className="w-full h-full object-cover" alt="Banner preview" />
                                <button type="button" onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))} className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-lg text-slate-700 hover:text-slate-700 shadow-md border border-slate-100 transition z-10">
                                    <Trash size={18} />
                                </button>
                            </div>
                        ) : (
                            <label className="relative w-full aspect-[21/6] rounded-xl border-2 border-dashed border-slate-200 hover:border-slate-400 hover:bg-slate-100/50 flex flex-col gap-3 items-center justify-center cursor-pointer transition text-slate-400 hover:text-slate-900 bg-slate-50 shadow-sm">
                                {uploading ? <ArrowRepeat size={32} className="animate-spin text-slate-900" /> : <Image size={32} />}
                                <div className="text-center">
                                    <span className="text-sm font-medium">{uploading ? 'Uploading to Cloudinary...' : 'Click to Upload Full Banner Image'}</span>
                                    {!uploading && <p className="text-xs text-slate-500 mt-1">Recommended aspect ratio: 21:6</p>}
                                </div>
                                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                            </label>
                        )}
                    </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Internal Name (Optional)</label>
                        <input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-black focus:ring-1 focus:ring-black/10 transition"
                            placeholder="e.g. Diwali Sale 2026" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Target Link URL</label>
                        <input value={formData.link} onChange={e => setFormData({ ...formData, link: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-black focus:ring-1 focus:ring-black/10 transition"
                            placeholder="e.g. /shop?category=tvs" />
                    </div>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={formData.isActive} onChange={e => setFormData({ ...formData, isActive: e.target.checked })} />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                        <span className="ml-3 text-sm font-medium text-slate-700">Active (Visible on homepage)</span>
                    </label>
                </div>

                <div className="flex justify-end pt-6">
                    <button type="submit" disabled={saving || uploading}
                        className="px-6 py-2.5 bg-black text-white font-medium rounded-xl shadow-lg shadow-black/10 hover:scale-105 transition-transform disabled:opacity-50 disabled:pointer-events-none">
                        {saving ? 'Saving...' : 'Update Banner'}
                    </button>
                </div>
            </form>
        </div>
    )
}

'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Image as ImageIcon, ArrowRepeat, Trash, CloudUpload } from 'react-bootstrap-icons'
import toast from 'react-hot-toast'

export default function NewBannerPage() {
    const router = useRouter()
    const fileInputRef = useRef(null)
    const [saving, setSaving] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState(0)
    const [formData, setFormData] = useState({
        title: '',
        link: '',
        imageUrl: '',
        isActive: true
    })

    const handleImageUpload = (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploading(true)
        setUploadProgress(0)
        
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
        const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
        if (!cloudName || !uploadPreset) {
            setUploading(false)
            toast.error('Cloudinary is not configured. Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET.')
            return
        }

        const data = new FormData()
        data.append('file', file)
        data.append('upload_preset', uploadPreset)

        const xhr = new XMLHttpRequest()
        xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`)

        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                const percentComplete = Math.round((event.loaded / event.total) * 100)
                setUploadProgress(percentComplete)
            }
        }

        xhr.onload = () => {
            setUploading(false)
            if (xhr.status === 200) {
                const result = JSON.parse(xhr.responseText)
                setFormData(prev => ({ ...prev, imageUrl: result.secure_url }))
                toast.success('Image uploaded successfully')
            } else {
                toast.error('Upload failed')
                console.error('Cloudinary error:', xhr.responseText)
            }
        }

        xhr.onerror = () => {
            setUploading(false)
            toast.error('Network error occurred during upload')
        }

        xhr.send(data)
    }

    const handleDelete = () => {
        setFormData(prev => ({ ...prev, imageUrl: '' }))
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const handleReplace = () => {
        if (fileInputRef.current) fileInputRef.current.click()
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!formData.imageUrl) return toast.error("Please upload a banner image")
        
        setSaving(true)
        const toastId = toast.loading('Creating banner...')
        
        try {
            const res = await fetch('/api/admin/banners', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            
            toast.success('Banner created', { id: toastId })
            router.push('/cms/banners')
        } catch (err) {
            toast.error(err.message, { id: toastId })
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="max-w-3xl space-y-6 pb-20">
            <div className="flex items-center gap-4">
                <Link href="/cms/banners" className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition">
                    <ArrowLeft size={20} />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">New Image Banner</h1>
                    <p className="text-sm text-slate-400">Upload a full-width promotional banner image.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
                
                {/* Full Image Upload */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Banner Image</label>
                    <div className="w-full">
                        {formData.imageUrl ? (
                            <div className="relative w-full aspect-[21/6] rounded-xl border border-slate-200 overflow-hidden bg-slate-50 group flex items-center justify-center shadow-sm">
                                <img src={formData.imageUrl} className="w-full h-full object-cover" alt="Banner preview" />
                                
                                {/* Hover Actions */}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition duration-300 flex items-center justify-center gap-4 backdrop-blur-sm">
                                    <button type="button" onClick={handleReplace} className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg text-slate-700 font-medium hover:bg-slate-50 shadow-md transition transform hover:scale-105">
                                        <ArrowRepeat size={16} /> Replace
                                    </button>
                                    <button type="button" onClick={handleDelete} className="flex items-center gap-2 px-4 py-2 bg-black rounded-lg text-white font-medium hover:bg-black/90 shadow-md transition transform hover:scale-105">
                                        <Trash size={16} /> Delete
                                    </button>
                                    <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleImageUpload} />
                                </div>
                            </div>
                        ) : (
                            <div className="relative w-full aspect-[21/6] rounded-xl border-2 border-dashed border-slate-200 hover:border-slate-400 hover:bg-slate-100/50 flex flex-col items-center justify-center transition bg-slate-50 shadow-sm overflow-hidden group">
                                {uploading ? (
                                    <div className="flex flex-col items-center justify-center w-full max-w-xs space-y-4 z-10 p-6 bg-white/80 backdrop-blur-md rounded-2xl border shadow-sm border-slate-100">
                                        <CloudUpload size={32} className="text-slate-900 animate-bounce" />
                                        <div className="w-full">
                                            <div className="flex justify-between text-xs font-medium text-slate-500 mb-1">
                                                <span>Uploading...</span>
                                                <span>{uploadProgress}%</span>
                                            </div>
                                            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                                                <div className="h-full bg-black transition-all duration-300 ease-out rounded-full" style={{ width: `${uploadProgress}%` }}></div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <label className="w-full h-full flex flex-col gap-3 items-center justify-center cursor-pointer text-slate-400 group-hover:text-slate-900">
                                        <ImageIcon size={32} className="transition-transform group-hover:scale-110" />
                                        <div className="text-center">
                                            <span className="text-sm font-medium">Click to Upload Full Banner Image</span>
                                            <p className="text-xs text-slate-500 mt-1">Recommended aspect ratio: 21:6</p>
                                        </div>
                                        <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleImageUpload} />
                                    </label>
                                )}
                            </div>
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
                        {saving ? 'Saving...' : 'Create Banner'}
                    </button>
                </div>
            </form>
        </div>
    )
}


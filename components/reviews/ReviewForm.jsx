'use client'
import { useState } from 'react'
import { Star, StarFill } from 'react-bootstrap-icons'
import toast from 'react-hot-toast'
import { useAuth } from '@/lib/auth-context'

export default function ReviewForm({ productId, onSubmitted }) {
    const { user } = useAuth()
    const [rating, setRating] = useState(0)
    const [hover, setHover] = useState(0)
    const [form, setForm] = useState({ title: '', body: '' })
    const [mediaUrls, setMediaUrls] = useState([])
    const [uploading, setUploading] = useState(false)
    const [loading, setLoading] = useState(false)
    const [done, setDone] = useState(false)

    const uploadMedia = async (file) => {
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
        const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET

        if (!cloudName || !uploadPreset) {
            throw new Error('Media upload is not configured')
        }

        const fd = new FormData()
        fd.append('file', file)
        fd.append('upload_preset', uploadPreset)

        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
            method: 'POST',
            body: fd,
        })
        const data = await res.json()
        if (!res.ok || !data.secure_url) throw new Error(data.error?.message || 'Upload failed')
        return data.secure_url
    }

    const handleMediaChange = async (e) => {
        const files = Array.from(e.target.files || [])
        if (files.length === 0) return

        setUploading(true)
        const toastId = toast.loading('Uploading media...')
        try {
            const uploaded = []
            for (const file of files) {
                uploaded.push(await uploadMedia(file))
            }
            setMediaUrls(prev => [...prev, ...uploaded])
            toast.success('Media uploaded', { id: toastId })
        } catch (err) {
            toast.error(err.message || 'Failed to upload media', { id: toastId })
        } finally {
            setUploading(false)
            e.target.value = ''
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!user) return toast.error('Please login to submit a review')
        if (!rating) return toast.error('Please select a star rating')
        if ((form.body || '').trim().length < 10) return toast.error('Review must be at least 10 characters')
        setLoading(true)
        try {
            const res = await fetch('/api/reviews', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productId,
                    rating,
                    authorName: user.displayName || user.email?.split('@')[0] || 'User',
                    authorImage: user.photoURL || '',
                    userId: user.uid,
                    title: form.title,
                    body: form.body,
                    mediaUrls,
                }),
            })
            if (!res.ok) throw new Error()
            setDone(true)
            onSubmitted?.()
        } catch {
            toast.error('Failed to submit review. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    if (done) return (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700 text-center">
            Thanks! Your review is under review and will appear once approved.
        </div>
    )

    return (
        <form onSubmit={handleSubmit} className="space-y-3 border border-slate-100 rounded-xl p-4 bg-white">
            <p className="font-medium text-slate-700">Write a Review</p>

            {/* Stars */}
            <div className="flex gap-1">
                {Array(5).fill('').map((_, i) => (
                    <button key={i} type="button" onClick={() => setRating(i + 1)} onMouseEnter={() => setHover(i + 1)} onMouseLeave={() => setHover(0)}>
                        {(hover || rating) >= i + 1
                            ? <StarFill size={22} className="text-amber-500" />
                            : <Star size={22} className="text-slate-300" />}
                    </button>
                ))}
            </div>

            {user && (
                <div className="flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
                    {user.photoURL
                        ? <img src={user.photoURL} alt="Profile" className="w-7 h-7 rounded-full object-cover" referrerPolicy="no-referrer" />
                        : <div className="w-7 h-7 rounded-full bg-slate-200" />}
                    <p className="text-sm text-slate-700 truncate">{user.displayName || user.email}</p>
                </div>
            )}

            <input required className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400" placeholder="Review title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            <textarea required minLength={10} maxLength={2000} rows={4} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400 resize-none" placeholder="Your review (min 10 characters)" value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} />
            <p className="text-xs text-slate-500">Minimum 10 characters ({(form.body || '').trim().length}/10)</p>

            <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-500">Attach Media (optional)</label>
                <input type="file" accept="image/*,video/*" multiple onChange={handleMediaChange} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" disabled={uploading} />
                {mediaUrls.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {mediaUrls.map((url, i) => (
                            <div key={i} className="relative w-14 h-14 rounded-md border border-slate-200 overflow-hidden bg-slate-50">
                                <img src={url} alt="Media" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                <button
                                    type="button"
                                    onClick={() => setMediaUrls(prev => prev.filter((_, idx) => idx !== i))}
                                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-black text-white text-[10px] leading-none"
                                >
                                    x
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <button type="submit" disabled={loading || uploading || !user} className="w-full py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 transition text-white text-sm rounded-lg font-medium">
                {loading ? 'Submitting...' : uploading ? 'Uploading media...' : user ? 'Submit Review' : 'Login to Review'}
            </button>
        </form>
    )
}

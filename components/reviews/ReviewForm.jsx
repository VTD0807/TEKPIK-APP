'use client'
import { useState } from 'react'
import { StarIcon } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ReviewForm({ productId, onSubmitted }) {
    const [rating, setRating] = useState(0)
    const [hover, setHover] = useState(0)
    const [form, setForm] = useState({ authorName: '', title: '', body: '', pros: '', cons: '' })
    const [loading, setLoading] = useState(false)
    const [done, setDone] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!rating) return toast.error('Please select a star rating')
        setLoading(true)
        try {
            const res = await fetch('/api/reviews', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productId,
                    rating,
                    authorName: form.authorName,
                    title: form.title,
                    body: form.body,
                    pros: form.pros.split(',').map(s => s.trim()).filter(Boolean),
                    cons: form.cons.split(',').map(s => s.trim()).filter(Boolean),
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
                        <StarIcon size={22} className="text-transparent" fill={(hover || rating) >= i + 1 ? '#f59e0b' : '#e2e8f0'} />
                    </button>
                ))}
            </div>

            <input required className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400" placeholder="Your name" value={form.authorName} onChange={e => setForm({ ...form, authorName: e.target.value })} />
            <input required className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400" placeholder="Review title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            <textarea required minLength={50} maxLength={2000} rows={4} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400 resize-none" placeholder="Your review (min 50 characters)" value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} />
            <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400" placeholder="Pros (comma separated, optional)" value={form.pros} onChange={e => setForm({ ...form, pros: e.target.value })} />
            <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400" placeholder="Cons (comma separated, optional)" value={form.cons} onChange={e => setForm({ ...form, cons: e.target.value })} />

            <button type="submit" disabled={loading} className="w-full py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 transition text-white text-sm rounded-lg font-medium">
                {loading ? 'Submitting...' : 'Submit Review'}
            </button>
        </form>
    )
}

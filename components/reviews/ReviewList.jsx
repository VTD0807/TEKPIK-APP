'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Star, StarFill, X, HandThumbsUp, HandThumbsDown, Trash } from 'react-bootstrap-icons'
import { useAuth } from '@/lib/auth-context'
import toast from 'react-hot-toast'
import ReviewCard from './ReviewCard'
import ReviewForm from './ReviewForm'

const SORT_OPTIONS = [
    { label: 'Most Recent', value: 'recent' },
    { label: 'Highest Rated', value: 'highest' },
    { label: 'Lowest Rated', value: 'lowest' },
    { label: 'Most Helpful', value: 'helpful' },
]

export default function ReviewList({ reviews = [], productId }) {
    const router = useRouter()
    const { user } = useAuth()
    const [sort, setSort] = useState('recent')
    const [showForm, setShowForm] = useState(false)
    const [localReviews, setLocalReviews] = useState(reviews)
    const [selectedReview, setSelectedReview] = useState(null)
    const [selectedMedia, setSelectedMedia] = useState('')

    useEffect(() => {
        setLocalReviews(reviews)
    }, [reviews])

    const sorted = [...localReviews].sort((a, b) => {
        const dateA = new Date(a.created_at || a.createdAt)
        const dateB = new Date(b.created_at || b.createdAt)
        if (sort === 'recent') return dateB - dateA
        if (sort === 'highest') return b.rating - a.rating
        if (sort === 'lowest') return a.rating - b.rating
        if (sort === 'helpful') return b.helpful - a.helpful
        return 0
    })

    const avg = localReviews.length
        ? (localReviews.reduce((s, r) => s + r.rating, 0) / localReviews.length).toFixed(1)
        : null

    const applyActionResult = (reviewId, payload) => {
        setLocalReviews(prev => prev.map(r => r.id === reviewId
            ? { ...r, likedBy: payload.likedBy, dislikedBy: payload.dislikedBy, helpful: payload.helpful }
            : r
        ))
        setSelectedReview(prev => prev && prev.id === reviewId
            ? { ...prev, likedBy: payload.likedBy, dislikedBy: payload.dislikedBy, helpful: payload.helpful }
            : prev
        )
    }

    const handleReviewAction = async (reviewId, action) => {
        if (!user?.uid) return toast.error('Please login first')
        try {
            const res = await fetch(`/api/reviews/${reviewId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, userId: user.uid }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Action failed')
            applyActionResult(reviewId, data)
        } catch (err) {
            toast.error(err.message)
        }
    }

    const handleDelete = async (reviewId) => {
        if (!user?.uid) return toast.error('Please login first')
        try {
            const res = await fetch(`/api/reviews/${reviewId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.uid }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Delete failed')

            setLocalReviews(prev => prev.filter(r => r.id !== reviewId))
            if (selectedReview?.id === reviewId) setSelectedReview(null)
            toast.success('Review deleted')
        } catch (err) {
            toast.error(err.message)
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <p className="font-semibold text-slate-800">
                        Community Reviews {avg && <span className="text-amber-500 ml-1"> {avg}</span>}
                        <span className="text-slate-400 font-normal text-sm ml-2">({localReviews.length})</span>
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <select value={sort} onChange={e => setSort(e.target.value)} className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 outline-none">
                        {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <button onClick={() => setShowForm(v => !v)} className="text-sm px-4 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition">
                        {showForm ? 'Cancel' : 'Write a Review'}
                    </button>
                </div>
            </div>

            {showForm && (
                <ReviewForm
                    productId={productId}
                    onSubmitted={() => {
                        setShowForm(false)
                        router.refresh()
                    }}
                />
            )}

            {sorted.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-sm">No reviews yet. Be the first!</div>
            ) : (
                <div className="space-y-3">
                    {sorted.map(r => (
                        <ReviewCard
                            key={r.id}
                            review={r}
                            currentUserId={user?.uid}
                            onLike={(id) => handleReviewAction(id, 'like')}
                            onDislike={(id) => handleReviewAction(id, 'dislike')}
                            onDelete={handleDelete}
                            onClick={() => {
                                setSelectedReview(r)
                                setSelectedMedia(Array.isArray(r.mediaUrls) && r.mediaUrls.length > 0 ? r.mediaUrls[0] : '')
                            }}
                        />
                    ))}
                </div>
            )}

            {selectedReview && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4" onClick={() => setSelectedReview(null)}>
                    <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-base font-semibold text-slate-800">{selectedReview.title}</p>
                                <p className="text-xs text-slate-500">{selectedReview.authorName}</p>
                            </div>
                            <button type="button" className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100" onClick={() => setSelectedReview(null)}>
                                <X size={16} />
                            </button>
                        </div>

                        <div className="flex items-center gap-1">
                            {Array(5).fill('').map((_, i) => (
                                selectedReview.rating >= i + 1
                                    ? <StarFill key={i} size={14} className="text-amber-500" />
                                    : <Star key={i} size={14} className="text-slate-300" />
                            ))}
                        </div>

                        <p className="text-sm text-slate-700 leading-relaxed">{selectedReview.body}</p>

                        <div className="flex items-center gap-2 flex-wrap">
                            <button type="button" onClick={() => handleReviewAction(selectedReview.id, 'like')} className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs border ${Array.isArray(selectedReview.likedBy) && selectedReview.likedBy.includes(user?.uid) ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-slate-600 border-slate-200'}`}>
                                <HandThumbsUp size={11} /> Like {selectedReview.likedBy?.length ? `(${selectedReview.likedBy.length})` : ''}
                            </button>
                            <button type="button" onClick={() => handleReviewAction(selectedReview.id, 'dislike')} className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs border ${Array.isArray(selectedReview.dislikedBy) && selectedReview.dislikedBy.includes(user?.uid) ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-white text-slate-600 border-slate-200'}`}>
                                <HandThumbsDown size={11} /> Dislike {selectedReview.dislikedBy?.length ? `(${selectedReview.dislikedBy.length})` : ''}
                            </button>
                            {selectedReview.userId === user?.uid && (
                                <button type="button" onClick={() => handleDelete(selectedReview.id)} className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs border border-red-200 text-red-600 bg-red-50">
                                    <Trash size={11} /> Delete
                                </button>
                            )}
                        </div>

                        {Array.isArray(selectedReview.mediaUrls) && selectedReview.mediaUrls.length > 0 && (
                            <div className="space-y-2">
                                {selectedMedia && (
                                    <div className="w-full h-56 sm:h-72 rounded-xl border border-slate-200 overflow-hidden bg-slate-900/95 flex items-center justify-center p-2">
                                        <img src={selectedMedia} alt="Review media" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                                    </div>
                                )}
                                <div className="flex flex-wrap gap-2">
                                    {selectedReview.mediaUrls.map((url, i) => (
                                        <button key={i} type="button" onClick={() => setSelectedMedia(url)} className={`w-14 h-14 rounded-md border overflow-hidden ${selectedMedia === url ? 'border-slate-500' : 'border-slate-200'}`}>
                                            <img src={url} alt="Review thumbnail" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

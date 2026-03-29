'use client'
import { useState } from 'react'
import ReviewCard from './ReviewCard'
import ReviewForm from './ReviewForm'

const SORT_OPTIONS = [
    { label: 'Most Recent', value: 'recent' },
    { label: 'Highest Rated', value: 'highest' },
    { label: 'Lowest Rated', value: 'lowest' },
    { label: 'Most Helpful', value: 'helpful' },
]

export default function ReviewList({ reviews = [], productId }) {
    const [sort, setSort] = useState('recent')
    const [showForm, setShowForm] = useState(false)

    const sorted = [...reviews].sort((a, b) => {
        if (sort === 'recent') return new Date(b.createdAt) - new Date(a.createdAt)
        if (sort === 'highest') return b.rating - a.rating
        if (sort === 'lowest') return a.rating - b.rating
        if (sort === 'helpful') return b.helpful - a.helpful
        return 0
    })

    const avg = reviews.length
        ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
        : null

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <p className="font-semibold text-slate-800">
                        Community Reviews {avg && <span className="text-amber-500 ml-1">★ {avg}</span>}
                        <span className="text-slate-400 font-normal text-sm ml-2">({reviews.length})</span>
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

            {showForm && <ReviewForm productId={productId} onSubmitted={() => setShowForm(false)} />}

            {sorted.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-sm">No reviews yet. Be the first!</div>
            ) : (
                <div className="space-y-3">
                    {sorted.map(r => <ReviewCard key={r.id} review={r} />)}
                </div>
            )}
        </div>
    )
}

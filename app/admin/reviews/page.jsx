'use client'
import { useEffect, useState } from 'react'
import Loading from '@/components/Loading'
import { Check, X, PatchCheck, Trash } from 'react-bootstrap-icons'
import toast from 'react-hot-toast'
const TABS = ['All', 'Pending', 'Approved', 'Rejected']

export default function AdminReviews() {
    const [reviews, setReviews] = useState([])
    const [tab, setTab] = useState('All')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch('/api/admin/reviews')
            .then(r => r.json())
            .then(d => {
                setReviews((d.reviews || []).map(r => ({
                    ...r,
                    productName: r.product?.title || 'Unknown',
                })))
                setLoading(false)
            })
            .catch(() => setLoading(false))
    }, [])

    const filtered = tab === 'All' ? reviews
        : tab === 'Pending' ? reviews.filter(r => !r.isApproved)
        : tab === 'Approved' ? reviews.filter(r => r.isApproved)
        : []

    const action = async (id, type) => {
        const update = type === 'approved' ? { is_approved: true }
            : type === 'rejected' ? { is_approved: false }
            : type === 'verified' ? { is_verified: true }
            : null

        if (!update) return

        try {
            const res = await fetch(`/api/admin/reviews/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(update)
            })

            if (!res.ok) throw new Error()

            toast.success(`Review ${type}`)
            setReviews(prev => prev.map(r => r.id === id
                ? { 
                    ...r, 
                    isApproved: type === 'approved' ? true : type === 'rejected' ? false : r.isApproved, 
                    isVerified: type === 'verified' ? true : r.isVerified 
                  }
                : r
            ))
        } catch {
            toast.error('Action failed')
        }
    }

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this review?')) return
        try {
            const res = await fetch(`/api/admin/reviews/${id}`, { method: 'DELETE' })
            if (!res.ok) throw new Error()
            toast.success('Review deleted')
            setReviews(prev => prev.filter(r => r.id !== id))
        } catch {
            toast.error('Delete failed')
        }
    }

    if (loading) return <Loading />

    return (
        <div className="text-slate-500 mb-28 space-y-4">
            <h1 className="text-2xl text-slate-500">Review <span className="text-slate-800 font-medium">Moderation</span></h1>

            <div className="flex gap-2 border-b border-slate-200">
                {TABS.map(t => (
                    <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm transition border-b-2 -mb-px ${tab === t ? 'border-black text-slate-900' : 'border-transparent hover:text-slate-700'}`}>
                        {t}
                    </button>
                ))}
            </div>

            {filtered.length === 0 ? (
                <div className="text-center py-16 text-slate-300">No reviews in this category.</div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(r => (
                        <div key={r.id} className="border border-slate-100 rounded-xl p-4 bg-white space-y-2">
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <p className="font-medium text-slate-700 text-sm">{r.authorName} <span className="text-slate-400 font-normal">on</span> {r.productName}</p>
                                    <p className="text-xs text-slate-400">{''.repeat(r.rating)}{''.repeat(5 - r.rating)}</p>
                                </div>
                                <div className="flex gap-1.5">
                                    <button onClick={() => action(r.id, 'approved')} className="p-1.5 text-slate-700 hover:bg-slate-100 rounded transition" title="Approve"><Check size={15} /></button>
                                    <button onClick={() => action(r.id, 'verified')} className="p-1.5 text-slate-700 hover:bg-slate-100 rounded transition" title="Verify"><PatchCheck size={15} /></button>
                                    <button onClick={() => action(r.id, 'rejected')} className="p-1.5 text-slate-700 hover:bg-slate-100 rounded transition" title="Reject"><X size={15} /></button>
                                    <button onClick={() => handleDelete(r.id)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded transition" title="Delete"><Trash size={15} /></button>
                                </div>
                            </div>
                            <p className="text-sm text-slate-600">{r.body}</p>
                            {r.isApproved && <span className="text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded-full">Approved</span>}
                            {r.isVerified && <span className="text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded-full ml-1">Verified</span>}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

'use client'
import { useEffect, useState } from 'react'
import Loading from '@/components/Loading'
import { CheckIcon, XIcon, BadgeCheckIcon, TrashIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import { dummyRatingsData } from '@/assets/assets'

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

    const action = (id, type) => {
        // TODO: PATCH /api/admin/reviews/[id]
        toast.success(`Review ${type}`)
        setReviews(prev => prev.map(r => r.id === id
            ? { ...r, isApproved: type === 'approved', isVerified: type === 'verified' ? true : r.isVerified }
            : r
        ))
    }

    if (loading) return <Loading />

    return (
        <div className="text-slate-500 mb-28 space-y-4">
            <h1 className="text-2xl text-slate-500">Review <span className="text-slate-800 font-medium">Moderation</span></h1>

            <div className="flex gap-2 border-b border-slate-200">
                {TABS.map(t => (
                    <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm transition border-b-2 -mb-px ${tab === t ? 'border-indigo-500 text-indigo-600' : 'border-transparent hover:text-slate-700'}`}>
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
                                    <p className="text-xs text-slate-400">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</p>
                                </div>
                                <div className="flex gap-1.5">
                                    <button onClick={() => action(r.id, 'approved')} className="p-1.5 text-green-500 hover:bg-green-50 rounded transition" title="Approve"><CheckIcon size={15} /></button>
                                    <button onClick={() => action(r.id, 'verified')} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded transition" title="Verify"><BadgeCheckIcon size={15} /></button>
                                    <button onClick={() => action(r.id, 'rejected')} className="p-1.5 text-red-400 hover:bg-red-50 rounded transition" title="Reject"><XIcon size={15} /></button>
                                    <button className="p-1.5 text-slate-400 hover:bg-slate-100 rounded transition" title="Delete"><TrashIcon size={15} /></button>
                                </div>
                            </div>
                            <p className="text-sm text-slate-600">{r.body}</p>
                            {r.isApproved && <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full">Approved</span>}
                            {r.isVerified && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full ml-1">Verified</span>}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

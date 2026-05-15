'use client'
// Final build trigger - verified clean imports and logic
import { useEffect, useState } from 'react'
import Loading from '@/components/Loading'
import { CheckCircle, XCircle, Star, Clock, PatchCheck, Trash } from 'react-bootstrap-icons'
import toast from 'react-hot-toast'
import CMSDataTable from '@/components/cms/CMSDataTable'

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
                    productName: r.products?.title || 'Unknown',
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
        const apiAction = type === 'approved' ? 'approve' : type === 'rejected' ? 'reject' : 'verify';

        const previousReviews = [...reviews]
        setReviews(prev => prev.map(r => r.id === id
            ? { 
                ...r, 
                isApproved: type === 'approved' ? true : type === 'rejected' ? false : r.isApproved, 
                isVerified: type === 'verified' ? true : r.isVerified 
              }
            : r
        ))

        try {
            const res = await fetch(`/api/admin/reviews/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: apiAction })
            })

            if (!res.ok) throw new Error()
            toast.success(`Review ${type}`)
        } catch {
            setReviews(previousReviews)
            toast.error('Action failed')
        }
    }

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this review?')) return
        
        const previousReviews = [...reviews]
        setReviews(prev => prev.filter(r => r.id !== id))

        try {
            const res = await fetch(`/api/admin/reviews/${id}`, { method: 'DELETE' })
            if (!res.ok) throw new Error()
            toast.success('Review deleted')
        } catch {
            setReviews(previousReviews)
            toast.error('Delete failed')
        }
    }

    const columns = [
        {
            key: 'author',
            label: 'Author',
            accessor: row => row.authorName,
            render: (row) => (
                <div>
                    <p className="text-slate-800 font-medium">{row.authorName || 'Anonymous'}</p>
                    <p className="text-xs text-slate-500 max-w-xs truncate" title={row.productName}>on {row.productName}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{new Date(row.createdAt).toLocaleDateString()}</p>
                </div>
            ),
        },
        {
            key: 'rating',
            label: 'Rating',
            accessor: row => row.rating,
            render: (row) => (
                <div className="flex items-center gap-1">
                    {Array(5).fill('').map((_, i) => (
                        <Star key={i} size={12} fill={i < row.rating ? '#f59e0b' : '#e2e8f0'} className={i < row.rating ? 'text-slate-400' : 'text-slate-200'} />
                    ))}
                    <span className="text-xs text-slate-500 ml-1 font-medium">{row.rating}/5</span>
                </div>
            ),
        },
        {
            key: 'content',
            label: 'Review',
            accessor: row => row.title,
            render: (row) => (
                <div className="max-w-sm">
                    <p className="text-sm text-slate-800 font-medium truncate">{row.title}</p>
                    <p className="text-xs text-slate-500 truncate">{row.body}</p>
                </div>
            ),
        },
        {
            key: 'status',
            label: 'Status',
            accessor: row => row.isApproved ? 'Approved' : 'Pending',
            render: (row) => (
                <div className="flex flex-col gap-1 items-start">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-800 border border-slate-200`}>
                        {row.isApproved ? <CheckCircle size={11} /> : <Clock size={11} />}
                        {row.isApproved ? 'Approved' : 'Pending'}
                    </span>
                    {row.isVerified && (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100`}>
                            <PatchCheck size={11} /> Verified
                        </span>
                    )}
                </div>
            ),
        },
        {
            key: 'actions',
            label: 'Actions',
            sortable: false,
            render: (row) => (
                <div className="flex items-center gap-1">
                    <button onClick={() => action(row.id, 'approved')} className="p-1.5 rounded-lg text-slate-700 hover:bg-slate-100 transition" title="Approve">
                        <CheckCircle size={18} />
                    </button>
                    <button onClick={() => action(row.id, 'verified')} className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition" title="Verify">
                        <PatchCheck size={18} />
                    </button>
                    <button onClick={() => action(row.id, 'rejected')} className="p-1.5 rounded-lg text-slate-700 hover:bg-slate-100 transition" title="Reject">
                        <XCircle size={18} />
                    </button>
                    <button onClick={() => handleDelete(row.id)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition" title="Delete">
                        <Trash size={18} />
                    </button>
                </div>
            ),
        },
    ]

    if (loading) return <Loading />

    return (
        <div className="space-y-6 mb-28">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Review Moderation</h1>
                <p className="text-sm text-slate-500 mt-1">{reviews.length} total reviews · {reviews.filter(r => !r.isApproved).length} pending moderation</p>
            </div>

            <CMSDataTable
                columns={columns}
                data={filtered}
                searchPlaceholder="Search reviews..."
                actions={
                    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-0.5 shadow-sm">
                        {['All', 'Pending', 'Approved'].map(f => (
                            <button key={f} onClick={() => setTab(f)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${tab === f ? 'bg-black text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>
                                {f}
                            </button>
                        ))}
                    </div>
                }
            />
        </div>
    )
}

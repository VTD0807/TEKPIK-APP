'use client'
import { useEffect, useState } from 'react'
import CMSDataTable from '@/components/cms/CMSDataTable'
import { CheckCircle, XCircle, Star, Clock } from 'react-bootstrap-icons'
import toast from 'react-hot-toast'

export default function CMSReviews() {
    const [reviews, setReviews] = useState([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('all')

    const fetchReviews = () => {
        fetch('/api/admin/reviews')
            .then(r => r.json())
            .then(d => { setReviews(Array.isArray(d?.reviews) ? d.reviews : Array.isArray(d) ? d : []); setLoading(false) })
            .catch(() => setLoading(false))
    }

    useEffect(() => { fetchReviews() }, [])

    const handleAction = async (id, action) => {
        const toastId = toast.loading(action === 'approve' ? 'Approving...' : 'Rejecting...')
        try {
            const res = await fetch(`/api/admin/reviews/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isApproved: action === 'approve' }),
            })
            if (!res.ok) throw new Error('Failed')
            toast.success(action === 'approve' ? 'Approved!' : 'Rejected!', { id: toastId })
            fetchReviews()
        } catch (e) {
            toast.error(e.message, { id: toastId })
        }
    }

    const filtered = reviews.filter(r => {
        if (filter === 'pending') return !r.is_approved
        if (filter === 'approved') return r.is_approved
        return true
    })

    const columns = [
        {
            key: 'author',
            label: 'Author',
            accessor: row => row.author_name || row.authorName,
            render: (row) => (
                <div>
                    <p className="text-slate-800 font-medium">{row.author_name || row.authorName || 'Anonymous'}</p>
                    <p className="text-xs text-slate-400">{new Date(row.created_at || row.createdAt).toLocaleDateString()}</p>
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
            accessor: row => row.is_approved ? 'Approved' : 'Pending',
            render: (row) => (
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${row.is_approved || row.isApproved ? 'bg-slate-100 text-slate-800 border border-slate-200' : 'bg-slate-100 text-slate-800 border border-slate-200'}`}>
                    {row.is_approved || row.isApproved ? <CheckCircle size={11} /> : <Clock size={11} />}
                    {row.is_approved || row.isApproved ? 'Approved' : 'Pending'}
                </span>
            ),
        },
        {
            key: 'actions',
            label: 'Actions',
            sortable: false,
            render: (row) => (
                <div className="flex items-center gap-1">
                    {!(row.is_approved || row.isApproved) && (
                        <button onClick={() => handleAction(row.id, 'approve')}
                            className="p-1.5 rounded-lg text-slate-700 hover:bg-slate-100 transition" title="Approve">
                            <CheckCircle size={16} />
                        </button>
                    )}
                    <button onClick={() => handleAction(row.id, 'reject')}
                        className="p-1.5 rounded-lg text-slate-700 hover:bg-slate-100 transition" title="Reject">
                        <XCircle size={16} />
                    </button>
                </div>
            ),
        },
    ]

    if (loading) {
        return (
            <div className="space-y-4">
                <h1 className="text-2xl font-bold text-slate-800">Reviews</h1>
                <div className="animate-pulse space-y-3">
                    {Array(5).fill(0).map((_, i) => <div key={i} className="h-14 bg-white rounded-xl border border-slate-200" />)}
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Reviews</h1>
                <p className="text-sm text-slate-500 mt-1">{reviews.length} total reviews · {reviews.filter(r => !r.is_approved && !r.isApproved).length} pending moderation</p>
            </div>

            <CMSDataTable
                columns={columns}
                data={filtered}
                searchPlaceholder="Search reviews..."
                actions={
                    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-0.5 shadow-sm">
                        {['all', 'pending', 'approved'].map(f => (
                            <button key={f} onClick={() => setFilter(f)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${filter === f ? 'bg-black text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>
                                {f.charAt(0).toUpperCase() + f.slice(1)}
                            </button>
                        ))}
                    </div>
                }
            />
        </div>
    )
}


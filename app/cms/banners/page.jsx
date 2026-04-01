'use client'
import { useEffect, useState } from 'react'
import CMSDataTable from '@/components/cms/CMSDataTable'
import CMSModal from '@/components/cms/CMSModal'
import { Plus, PencilSquare, Trash, ToggleOff, ToggleOn, BoxArrowUpRight } from 'react-bootstrap-icons'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function CMSBanners() {
    const [banners, setBanners] = useState([])
    const [loading, setLoading] = useState(true)
    const [deleteTarget, setDeleteTarget] = useState(null)

    const fetchBanners = () => {
        fetch('/api/admin/banners')
            .then(r => r.json())
            .then(data => { setBanners(Array.isArray(data) ? data : []); setLoading(false) })
            .catch(() => setLoading(false))
    }

    useEffect(() => { fetchBanners() }, [])

    const handleDelete = async () => {
        if (!deleteTarget) return
        const toastId = toast.loading('Deleting banner...')
        try {
            const res = await fetch(`/api/admin/banners/${deleteTarget}`, { method: 'DELETE' })
            if (!res.ok) throw new Error('Delete failed')
            toast.success('Banner deleted', { id: toastId })
            setBanners(prev => prev.filter(b => b.id !== deleteTarget))
        } catch (e) {
            toast.error(e.message, { id: toastId })
        } finally {
            setDeleteTarget(null)
        }
    }

    const columns = [
        {
            key: 'banner',
            label: 'Banner',
            accessor: row => row.title,
            render: (row) => (
                <div className="flex items-center gap-3">
                    <div className="w-16 h-10 bg-slate-50 rounded-lg flex items-center justify-center overflow-hidden shrink-0 border border-slate-200">
                        {row.imageUrl ? (
                            <img src={row.imageUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-[10px] text-slate-300">No img</span>
                        )}
                    </div>
                    <div className="min-w-0">
                        <p className="text-slate-800 font-medium truncate max-w-[200px]">{row.title || 'Untitled'}</p>
                        <p className="text-[11px] text-slate-400">{row.subtitle || 'No subtitle'}</p>
                    </div>
                </div>
            ),
        },
        {
            key: 'link',
            label: 'Target Link',
            accessor: row => row.link || '—',
        },
        {
            key: 'status',
            label: 'Status',
            accessor: row => row.isActive ? 'Active' : 'Draft',
            render: (row) => (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${row.isActive ? 'bg-slate-100 text-slate-800 border border-slate-200' : 'bg-slate-50 text-slate-500 border border-slate-200'}`}>
                    {row.isActive ? <ToggleOn size={11} /> : <ToggleOff size={11} />}
                    {row.isActive ? 'Active' : 'Draft'}
                </span>
            ),
        },
        {
            key: 'actions',
            label: 'Actions',
            sortable: false,
            render: (row) => (
                <div className="flex items-center gap-1">
                    <Link href={`/cms/banners/${row.id}/edit`} onClick={e => e.stopPropagation()}
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition" title="Edit">
                        <PencilSquare size={14} />
                    </Link>
                    {row.link && (
                        <a href={row.link} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition" title="Test Link">
                            <BoxArrowUpRight size={14} />
                        </a>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(row.id) }}
                        className="p-1.5 rounded-lg text-slate-700 hover:bg-slate-100 transition" title="Delete">
                        <Trash size={14} />
                    </button>
                </div>
            ),
        },
    ]

    if (loading) {
        return (
            <div className="space-y-4">
                <h1 className="text-2xl font-bold text-slate-800">Banners</h1>
                <div className="animate-pulse space-y-3">
                    {Array(3).fill(0).map((_, i) => (
                        <div key={i} className="h-14 bg-white rounded-xl border border-slate-200" />
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-end justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Banners</h1>
                    <p className="text-sm text-slate-400 mt-1">{banners.length} total banners managing the storefront</p>
                </div>
            </div>

            <CMSDataTable
                columns={columns}
                data={banners}
                searchPlaceholder="Search banners by title..."
                onRowClick={(row) => window.location.href = `/cms/banners/${row.id}/edit`}
                actions={
                    <Link href="/cms/banners/new" className="flex items-center gap-2 px-4 py-2.5 bg-black text-white text-sm font-medium rounded-xl shadow-lg shadow-black/10 hover:scale-105 transition-transform duration-200">
                        <Plus size={15} />
                        Add Banner
                    </Link>
                }
            />

            <CMSModal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Banner" size="sm">
                <div className="space-y-4">
                    <p className="text-sm text-slate-600">Are you sure you want to delete this banner? This action cannot be undone.</p>
                    <div className="flex justify-end gap-3">
                        <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 bg-slate-50 border border-slate-200 rounded-xl transition">
                            Cancel
                        </button>
                        <button onClick={handleDelete} className="px-4 py-2 text-sm text-white bg-black rounded-xl shadow-lg shadow-black/10 hover:scale-105 transition-transform">
                            Delete Banner
                        </button>
                    </div>
                </div>
            </CMSModal>
        </div>
    )
}


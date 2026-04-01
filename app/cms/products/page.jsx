'use client'
import { useEffect, useState } from 'react'
import CMSDataTable from '@/components/cms/CMSDataTable'
import CMSModal from '@/components/cms/CMSModal'
import { Plus, PencilSquare, Trash, Stars, BoxArrowUpRight, ToggleOff, ToggleOn } from 'react-bootstrap-icons'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function CMSProducts() {
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const [deleteTarget, setDeleteTarget] = useState(null)

    const fetchProducts = () => {
        fetch('/api/admin/products')
            .then(r => r.json())
            .then(d => { setProducts(d.products || []); setLoading(false) })
            .catch(() => setLoading(false))
    }

    useEffect(() => { fetchProducts() }, [])

    const handleAnalyse = async (productId) => {
        const toastId = toast.loading('Generating AI analysis...')
        try {
            const res = await fetch('/api/ai/analyse', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            toast.success('AI analysis generated!', { id: toastId })
            fetchProducts()
        } catch (e) {
            toast.error(e.message || 'Analysis failed', { id: toastId })
        }
    }

    const handleDelete = async () => {
        if (!deleteTarget) return
        const toastId = toast.loading('Deleting product...')
        try {
            const res = await fetch(`/api/admin/products/${deleteTarget}`, { method: 'DELETE' })
            if (!res.ok) throw new Error('Delete failed')
            toast.success('Product deleted', { id: toastId })
            setProducts(prev => prev.filter(p => p.id !== deleteTarget))
        } catch (e) {
            toast.error(e.message, { id: toastId })
        } finally {
            setDeleteTarget(null)
        }
    }

    const columns = [
        {
            key: 'product',
            label: 'Product',
            accessor: row => row.title,
            render: (row) => (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center overflow-hidden shrink-0 border border-slate-200">
                        {row.image_urls?.[0] || row.imageUrls?.[0] ? (
                            <img src={row.image_urls?.[0] || row.imageUrls?.[0]} alt="" className="w-full h-full object-contain" referrerPolicy="no-referrer" onError={e => e.target.style.display = 'none'} />
                        ) : (
                            <span className="text-[10px] text-slate-300">No img</span>
                        )}
                    </div>
                    <div className="min-w-0">
                        <p className="text-slate-800 font-medium truncate max-w-[200px]">{row.title || 'Untitled'}</p>
                        <p className="text-[11px] text-slate-400">{row.brand || 'No brand'}</p>
                    </div>
                </div>
            ),
        },
        {
            key: 'category',
            label: 'Category',
            accessor: row => row.categories?.name || row.category || '—',
        },
        {
            key: 'price',
            label: 'Price',
            accessor: row => row.price,
            render: (row) => (
                <div>
                    <span className="text-slate-800 font-medium">₹{row.price}</span>
                    {(row.originalPrice || row.original_price) && (
                        <span className="text-xs text-slate-400 line-through ml-1.5">₹{row.originalPrice || row.original_price}</span>
                    )}
                </div>
            ),
        },
        {
            key: 'status',
            label: 'Status',
            accessor: row => (row.isActive ?? row.is_active ?? row.public) ? 'Active' : 'Draft',
            render: (row) => (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${(row.isActive ?? row.is_active ?? row.public) ? 'bg-slate-100 text-slate-800 border border-slate-200' : 'bg-slate-50 text-slate-500 border border-slate-200'}`}>
                    {(row.isActive ?? row.is_active ?? row.public) ? <ToggleOn size={11} /> : <ToggleOff size={11} />}
                    {(row.isActive ?? row.is_active ?? row.public) ? 'Active' : 'Draft'}
                </span>
            ),
        },
        {
            key: 'ai',
            label: 'AI Score',
            accessor: row => row.ai_analysis?.score,
            render: (row) => {
                const score = row.ai_analysis?.score
                if (!score) return <span className="text-slate-300">—</span>
                const color = score >= 8 ? 'emerald' : score >= 6 ? 'amber' : 'rose'
                const styles = { emerald: 'bg-slate-100 text-slate-800 border-slate-200', amber: 'bg-slate-100 text-slate-800 border-slate-200', rose: 'bg-slate-100 text-slate-700 border-slate-200' }
                return (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${styles[color]}`}>
                        <Stars size={10} />
                        {score}/10
                    </span>
                )
            },
        },
        {
            key: 'actions',
            label: 'Actions',
            sortable: false,
            render: (row) => (
                <div className="flex items-center gap-1">
                    <button onClick={(e) => { e.stopPropagation(); handleAnalyse(row.id) }}
                        className="p-1.5 rounded-lg text-slate-900 hover:bg-slate-100 transition" title="Generate AI Analysis">
                        <Stars size={14} />
                    </button>
                    <Link href={`/cms/products/${row.id}`} onClick={e => e.stopPropagation()}
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition" title="Edit">
                        <PencilSquare size={14} />
                    </Link>
                    <a href={row.affiliateUrl || row.affiliate_url || '#'} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition" title="View on Amazon">
                        <BoxArrowUpRight size={14} />
                    </a>
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
                <h1 className="text-2xl font-bold text-slate-800">Products</h1>
                <div className="animate-pulse space-y-3">
                    {Array(5).fill(0).map((_, i) => (
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
                    <h1 className="text-2xl font-bold text-slate-800">Products</h1>
                    <p className="text-sm text-slate-400 mt-1">{products.length} total products in catalog</p>
                </div>
            </div>

            <CMSDataTable
                columns={columns}
                data={products}
                searchPlaceholder="Search products by name, brand..."
                onRowClick={(row) => window.location.href = `/cms/products/${row.id}`}
                actions={
                    <Link href="/cms/products/new" className="flex items-center gap-2 px-4 py-2.5 bg-black text-white text-sm font-medium rounded-xl shadow-lg shadow-black/10 hover:scale-105 transition-transform duration-200">
                        <Plus size={15} />
                        Add Product
                    </Link>
                }
            />

            <CMSModal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Product" size="sm">
                <div className="space-y-4">
                    <p className="text-sm text-slate-600">Are you sure you want to delete this product? This action cannot be undone.</p>
                    <div className="flex justify-end gap-3">
                        <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 bg-slate-50 border border-slate-200 rounded-xl transition">
                            Cancel
                        </button>
                        <button onClick={handleDelete} className="px-4 py-2 text-sm text-white bg-black rounded-xl shadow-lg shadow-black/10 hover:scale-105 transition-transform">
                            Delete Product
                        </button>
                    </div>
                </div>
            </CMSModal>
        </div>
    )
}


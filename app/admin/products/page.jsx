'use client'
import { useEffect, useState } from 'react'
import Loading from '@/components/Loading'
import Link from 'next/link'
import { Plus, PencilSquare, Trash, Stars } from 'react-bootstrap-icons'
import toast from 'react-hot-toast'
import { usePathname } from 'next/navigation'

export default function AdminProducts() {
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const pathname = usePathname()
    const productsBasePath = pathname?.startsWith('/e') ? '/e/products' : '/admin/products'

    useEffect(() => {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 7000)

        fetch('/api/admin/products', { signal: controller.signal, cache: 'no-store' })
            .then(r => r.json())
            .then(d => { setProducts(d.products || []) })
            .catch(() => setProducts([]))
            .finally(() => {
                clearTimeout(timeout)
                setLoading(false)
            })

        return () => {
            controller.abort()
            clearTimeout(timeout)
        }
    }, [])

    const handleAnalyse = async (productId) => {
        toast.loading('Generating AI analysis...', { id: productId })
        try {
            const res = await fetch('/api/ai/analyse', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            toast.success('AI analysis generated!', { id: productId })
        } catch (e) {
            toast.error(e.message || 'Analysis failed', { id: productId })
        }
    }

    if (loading) return <Loading />

    return (
        <div className="text-slate-500 mb-28 space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl text-slate-500">Manage <span className="text-slate-800 font-medium">Products</span></h1>
                <Link href={`${productsBasePath}/new`} className="flex items-center gap-2 px-4 py-2 bg-black hover:bg-black/90 text-white text-sm rounded-lg transition">
                    <Plus size={14} /> Add Product
                </Link>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left ring ring-slate-200 rounded overflow-hidden text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                        <tr>
                            <th className="px-4 py-3">Product</th>
                            <th className="px-4 py-3">Category</th>
                            <th className="px-4 py-3">Price</th>
                            <th className="px-4 py-3">AI Score</th>
                            <th className="px-4 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {products.length > 0 ? products.map(p => (
                            <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50">
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-slate-100 rounded flex items-center justify-center overflow-hidden shrink-0">
                                            {(p.image_urls?.[0] || p.imageUrls?.[0]) ? (
                                                <img src={p.image_urls?.[0] || p.imageUrls?.[0]} alt={p.title || 'Product'} className="w-full h-full object-contain" referrerPolicy="no-referrer" onError={e => e.target.style.display = 'none'} />
                                            ) : (
                                                <div className="text-[10px] text-slate-300">No img</div>
                                            )}
                                        </div>
                                        <span className="max-w-48 truncate font-medium text-slate-700">{p.title || 'Untitled Product'}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3">{p.category}</td>
                                <td className="px-4 py-3">₹{p.price}</td>
                                <td className="px-4 py-3">
                                    {(p.ai_analysis?.score || p.aiAnalysis?.score)
                                        ? <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-xs font-medium">{p.ai_analysis?.score || p.aiAnalysis?.score}/10</span>
                                        : <span className="text-slate-300 text-xs">—</span>
                                    }
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => handleAnalyse(p.id)} className="p-1.5 text-slate-900 hover:bg-slate-100 rounded transition" title="Generate AI Analysis">
                                            <Stars size={15} />
                                        </button>
                                        <Link href={`${productsBasePath}/${p.id}/edit`} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded transition">
                                            <PencilSquare size={15} />
                                        </Link>
                                        <button className="p-1.5 text-slate-700 hover:bg-slate-100 rounded transition">
                                            <Trash size={15} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                                    No products found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

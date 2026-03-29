'use client'
import { useEffect, useState } from 'react'
import Loading from '@/components/Loading'
import Image from 'next/image'
import Link from 'next/link'
import { PlusIcon, PencilIcon, TrashIcon, SparklesIcon } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminProducts() {
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch('/api/admin/products')
            .then(r => r.json())
            .then(d => { setProducts(d.products || []); setLoading(false) })
            .catch(() => setLoading(false))
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
                <Link href="/admin/products/new" className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm rounded-lg transition">
                    <PlusIcon size={14} /> Add Product
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
                        {products.map(p => (
                            <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50">
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        <Image src={p.imageUrls[0]} alt={p.title} width={40} height={40} className="w-10 h-10 object-contain rounded bg-slate-100" />
                                        <span className="max-w-48 truncate">{p.title}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3">{p.category}</td>
                                <td className="px-4 py-3">${p.price}</td>
                                <td className="px-4 py-3">
                                    {p.aiAnalysis?.score
                                        ? <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">{p.aiAnalysis.score}/10</span>
                                        : <span className="text-slate-300 text-xs">—</span>
                                    }
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => handleAnalyse(p.id)} className="p-1.5 text-purple-500 hover:bg-purple-50 rounded transition" title="Generate AI Analysis">
                                            <SparklesIcon size={15} />
                                        </button>
                                        <Link href={`/admin/products/${p.id}/edit`} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded transition">
                                            <PencilIcon size={15} />
                                        </Link>
                                        <button className="p-1.5 text-red-400 hover:bg-red-50 rounded transition">
                                            <TrashIcon size={15} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

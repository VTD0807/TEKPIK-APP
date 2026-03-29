'use client'
import { productDummyData } from '@/assets/assets'
import { HeartIcon } from 'lucide-react'
import Image from 'next/image'

// Simulate wishlist save counts per product
const saveCounts = { prod_1: 12, prod_2: 8, prod_3: 15, prod_4: 6, prod_5: 19, prod_6: 3 }

export default function AdminWishlist() {
    const products = productDummyData
        .map(p => ({ ...p, title: p.title || p.name, imageUrls: p.imageUrls || p.images, saves: saveCounts[p.id] || 0 }))
        .sort((a, b) => b.saves - a.saves)

    const total = products.reduce((s, p) => s + p.saves, 0)

    return (
        <div className="text-slate-500 mb-28 space-y-5">
            <div className="flex items-center gap-3">
                <h1 className="text-2xl text-slate-500">Wishlist <span className="text-slate-800 font-medium">Insights</span></h1>
                <span className="flex items-center gap-1 text-sm text-red-400"><HeartIcon size={14} fill="currentColor" /> {total} total saves</span>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left ring ring-slate-200 rounded overflow-hidden text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                        <tr>
                            <th className="px-4 py-3">Product</th>
                            <th className="px-4 py-3">Category</th>
                            <th className="px-4 py-3">Price</th>
                            <th className="px-4 py-3">Saves</th>
                            <th className="px-4 py-3">Popularity</th>
                        </tr>
                    </thead>
                    <tbody>
                        {products.map(p => (
                            <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50">
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        <Image src={p.imageUrls[0]} alt={p.title} width={36} height={36} className="w-9 h-9 object-contain rounded bg-slate-100" />
                                        <span className="max-w-44 truncate">{p.title}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3">{p.category}</td>
                                <td className="px-4 py-3">${p.price}</td>
                                <td className="px-4 py-3">
                                    <span className="flex items-center gap-1 text-red-400 font-medium">
                                        <HeartIcon size={12} fill="currentColor" /> {p.saves}
                                    </span>
                                </td>
                                <td className="px-4 py-3 w-36">
                                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                                        <div className="bg-red-400 h-1.5 rounded-full" style={{ width: `${Math.min((p.saves / 20) * 100, 100)}%` }} />
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

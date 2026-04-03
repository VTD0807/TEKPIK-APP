'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Loading from '@/components/Loading'

export default function DataPage() {
    const [loading, setLoading] = useState(true)
    const [rows, setRows] = useState([])

    useEffect(() => {
        fetch('/api/admin/analytics/products', { cache: 'no-store' })
            .then(res => res.json())
            .then(data => {
                setRows(Array.isArray(data?.products) ? data.products : [])
                setLoading(false)
            })
            .catch(() => {
                setRows([])
                setLoading(false)
            })
    }, [])

    const totals = useMemo(() => {
        const totalProducts = rows.length
        const totalViews = rows.reduce((sum, row) => sum + (Number(row.uniqueDeviceViews) || 0), 0)
        return { totalProducts, totalViews }
    }, [rows])

    if (loading) return <Loading />

    return (
        <div className="space-y-6 pb-12">
            <div>
                <h1 className="text-2xl text-slate-500">Product <span className="text-slate-800 font-medium">Analytics</span></h1>
                <p className="text-sm text-slate-400 mt-1">Strict unique-device logic: one device contributes only one view per product, forever.</p>
            </div>

            <div className="grid grid-cols-2 gap-4 max-w-xl">
                <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
                    <p className="text-xs text-slate-400 uppercase tracking-wide">Products tracked</p>
                    <p className="text-2xl font-bold text-slate-800 mt-1">{totals.totalProducts}</p>
                </div>
                <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
                    <p className="text-xs text-slate-400 uppercase tracking-wide">Unique device views</p>
                    <p className="text-2xl font-bold text-slate-800 mt-1">{totals.totalViews}</p>
                </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                        <tr>
                            <th className="px-4 py-3">Product</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3 text-right">Price</th>
                            <th className="px-4 py-3 text-right">Unique Device Views</th>
                            <th className="px-4 py-3">Last Updated</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length > 0 ? rows.map((row) => (
                            <tr key={row.productId} className="border-t border-slate-100 hover:bg-slate-50">
                                <td className="px-4 py-3">
                                    <Link href={`/admin/data/${row.productId}`} className="flex items-center gap-3 group">
                                        <div className="w-10 h-10 rounded-md bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                                            {row.imageUrl
                                                ? <img src={row.imageUrl} alt={row.title} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                                                : <span className="text-[10px] text-slate-400">No image</span>
                                            }
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-medium text-slate-700 truncate max-w-[280px] group-hover:text-slate-900">{row.title}</p>
                                            <p className="text-xs text-slate-400">{row.productId}</p>
                                        </div>
                                    </Link>
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${row.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                        {row.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-right text-slate-700">{row.price != null ? `₹${row.price}` : '—'}</td>
                                <td className="px-4 py-3 text-right font-semibold text-slate-800">
                                    <Link href={`/admin/data/${row.productId}`} className="hover:underline">{row.uniqueDeviceViews || 0}</Link>
                                </td>
                                <td className="px-4 py-3 text-slate-500">{row.updatedAt ? new Date(row.updatedAt).toLocaleString() : '—'}</td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={5} className="px-4 py-10 text-center text-slate-400">No product analytics data yet.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
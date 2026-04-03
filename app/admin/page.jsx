'use client'
import { useEffect, useState } from 'react'
import Loading from '@/components/Loading'
import OrdersAreaChart from '@/components/OrdersAreaChart'
import { Stars, Basket, Clock, Heart, Star, Plus, CheckSquare, Eye } from 'react-bootstrap-icons'
import Link from 'next/link'

export default function AdminDashboard() {
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState(null)

    useEffect(() => {
        fetch('/api/admin/analytics')
            .then(r => r.json())
            .then(d => {
                setData({
                    totalProducts: d.totalProducts,
                    pendingReviews: d.pendingReviews,
                    aiCoverage: d.aiCoverage,
                    wishlistSaves: d.wishlistSaves,
                    uniqueVisitors: d.uniqueVisitors,
                    uniquePageVisitors: d.uniquePageVisitors,
                    allOrders: [],
                    recentActivity: [
                        { type: 'review', text: 'New review submitted', time: 'just now' },
                        { type: 'ai', text: 'AI analysis available', time: 'today' },
                    ],
                })
                setLoading(false)
            })
            .catch(() => {
                // fallback to zeros if DB not connected yet
                setData({ totalProducts: 0, pendingReviews: 0, aiCoverage: { analysed: 0, total: 0 }, wishlistSaves: 0, uniqueVisitors: 0, uniquePageVisitors: 0, allOrders: [], recentActivity: [] })
                setLoading(false)
            })
    }, [])

    if (loading) return <Loading />

    const aiTotal = Number(data?.aiCoverage?.total) || 0
    const aiAnalysed = Number(data?.aiCoverage?.analysed) || 0
    const aiPct = aiTotal > 0 ? Math.round((aiAnalysed / aiTotal) * 100) : 0

    const statCards = [
        { title: 'Total Products', value: data.totalProducts, icon: Basket, sub: '+2 this week', color: 'text-slate-900 bg-slate-100' },
        { title: 'Pending Reviews', value: data.pendingReviews, icon: Clock, sub: data.pendingReviews > 0 ? 'Needs attention' : 'All clear', color: data.pendingReviews > 0 ? 'text-slate-800 bg-slate-100' : 'text-slate-800 bg-slate-100' },
        { title: 'AI Coverage', value: `${data.aiCoverage.analysed}/${data.aiCoverage.total}`, icon: Stars, sub: `${aiPct}% analysed`, color: 'text-slate-900 bg-slate-100' },
        { title: 'Wishlist Saves', value: data.wishlistSaves, icon: Heart, sub: '+5 this week', color: 'text-slate-700 bg-slate-100' },
        { title: 'Unique Visitors', value: data.uniqueVisitors || 0, icon: Eye, sub: `${data.uniquePageVisitors || 0} strict unique page views`, color: 'text-slate-800 bg-slate-100' },
    ]

    const activityIcons = { review: Star, product: Basket, ai: Stars, wishlist: Heart }

    return (
        <div className="text-slate-600 space-y-8 pb-20">
            <h1 className="text-2xl text-slate-500">Admin <span className="text-slate-800 font-medium">Dashboard</span></h1>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {statCards.map((card, i) => (
                    <div key={i} className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm space-y-2">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${card.color}`}>
                            <card.icon size={18} />
                        </div>
                        <p className="text-2xl font-bold text-slate-800">{card.value}</p>
                        <p className="text-sm text-slate-500">{card.title}</p>
                        <p className="text-xs text-slate-400">{card.sub}</p>
                    </div>
                ))}
            </div>

            {/* AI Coverage bar */}
            <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-slate-700 flex items-center gap-1.5"><Stars size={14} className="text-slate-900" /> AI Analysis Coverage</p>
                    <span className="text-sm text-slate-500">{aiPct}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="bg-black h-2 rounded-full transition-all" style={{ width: `${aiPct}%` }} />
                </div>
                <p className="text-xs text-slate-400 mt-1">{data.aiCoverage.analysed} of {data.aiCoverage.total} products have AI analysis</p>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                {/* Chart */}
                <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
                    <p className="text-sm font-medium text-slate-700 mb-4">Click Activity (last 30 days)</p>
                    <OrdersAreaChart data={data.allOrders} />
                </div>

                {/* Activity Feed */}
                <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
                    <p className="text-sm font-medium text-slate-700 mb-4">Recent Activity</p>
                    <ul className="space-y-3">
                        {data.recentActivity.map((item, i) => {
                            const Icon = activityIcons[item.type] || Star
                            return (
                                <li key={i} className="flex items-start gap-3 text-sm">
                                    <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                        <Icon size={13} className="text-slate-500" />
                                    </div>
                                    <div>
                                        <p className="text-slate-700">{item.text}</p>
                                        <p className="text-xs text-slate-400">{item.time}</p>
                                    </div>
                                </li>
                            )
                        })}
                    </ul>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
                <p className="text-sm font-medium text-slate-700 mb-4">Quick Actions</p>
                <div className="flex flex-wrap gap-3">
                    <Link href="/admin/products/new" className="flex items-center gap-2 px-4 py-2 bg-black hover:bg-black/90 text-white text-sm rounded-lg transition">
                        <Plus size={14} /> Add Product
                    </Link>
                    <Link href="/admin/reviews" className="flex items-center gap-2 px-4 py-2 bg-black hover:bg-black/90 text-white text-sm rounded-lg transition">
                        <CheckSquare size={14} /> Moderate Reviews
                        {data.pendingReviews > 0 && <span className="bg-white text-slate-800 text-xs font-bold px-1.5 rounded-full">{data.pendingReviews}</span>}
                    </Link>
                    <Link href="/admin/ai-analysis" className="flex items-center gap-2 px-4 py-2 bg-black hover:bg-black/90 text-white text-sm rounded-lg transition">
                        <Stars size={14} /> Run AI Analysis
                    </Link>
                    <Link href="/admin/data" className="flex items-center gap-2 px-4 py-2 bg-black hover:bg-black/90 text-white text-sm rounded-lg transition">
                        <Eye size={14} /> Product Analytics
                    </Link>
                </div>
            </div>
        </div>
    )
}

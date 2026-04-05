'use client'
import { useEffect, useState } from 'react'
import CMSStatCard from '@/components/cms/CMSStatCard'
import {
    BoxSeam, Star, Stars, Heart,
    ArrowUpRight, GraphUpArrow, Images, Gear
} from 'react-bootstrap-icons'
import Link from 'next/link'

function SkeletonCard() {
    return (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 animate-pulse space-y-3">
            <div className="h-3 w-20 bg-slate-100 rounded" />
            <div className="h-8 w-16 bg-slate-200 rounded" />
            <div className="h-2 w-28 bg-slate-100 rounded" />
        </div>
    )
}

function QuickAction({ href, icon: Icon, label }) {
    return (
        <Link href={href}
            className="flex items-center gap-2 px-4 py-2.5 bg-black text-white text-sm font-medium rounded-xl shadow-lg hover:bg-black/90 transition duration-200"
        >
            <Icon size={15} />
            {label}
            <ArrowUpRight size={12} className="ml-auto opacity-60" />
        </Link>
    )
}

export default function CMSDashboard() {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)

    const fallbackData = {
        totalProducts: 0,
        pendingReviews: 0,
        aiCoverage: { analysed: 0, total: 0 },
        wishlistSaves: 0,
    }

    useEffect(() => {
        let alive = true

        const load = async () => {
            try {
                const controller = new AbortController()
                const timeout = setTimeout(() => controller.abort(), 8000)
                const res = await fetch('/api/admin/analytics', { signal: controller.signal, cache: 'no-store' })
                clearTimeout(timeout)

                if (!res.ok) throw new Error('Analytics request failed')
                const d = await res.json()
                if (!alive) return
                setData({ ...fallbackData, ...(d || {}) })
            } catch {
                if (!alive) return
                setData(fallbackData)
            } finally {
                if (alive) setLoading(false)
            }
        }

        load()
        return () => { alive = false }
    }, [])

    if (loading) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
                    <p className="text-slate-500 text-sm mt-1">Loading your overview...</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    {Array(4).fill(0).map((_, i) => <SkeletonCard key={i} />)}
                </div>
            </div>
        )
    }

    const aiPct = data.aiCoverage?.total > 0
        ? Math.round((data.aiCoverage.analysed / data.aiCoverage.total) * 100)
        : 0
    const dbUnavailable = data?._meta?.dbReady === false
    const dbReason = data?._meta?.reason || 'Firebase Admin is not initialized in deployment environment.'

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-end justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
                    <p className="text-slate-500 text-sm mt-1">Affiliate store control center.</p>
                </div>
                <p className="text-xs text-slate-400">
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
            </div>

            {dbUnavailable && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 text-amber-900 p-3 text-sm whitespace-normal break-words">
                    Data source is unavailable. Dashboard values are fallback zeros. Reason: {dbReason}
                </div>
            )}

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <CMSStatCard title="Total Products" value={data.totalProducts || 0} icon={BoxSeam} color="indigo" subtitle="Active listings" />
                <CMSStatCard title="Pending Reviews" value={data.pendingReviews || 0} icon={Star} color={data.pendingReviews > 0 ? 'amber' : 'emerald'} subtitle={data.pendingReviews > 0 ? 'Needs moderation' : 'All clear'} />
                <CMSStatCard title="AI Coverage" value={`${aiPct}%`} icon={Stars} color="purple" subtitle={`${data.aiCoverage?.analysed || 0} of ${data.aiCoverage?.total || 0} analysed`} />
                <CMSStatCard title="Wishlist Saves" value={data.wishlistSaves || 0} icon={Heart} color="rose" subtitle="Total saves" />
            </div>

            {/* Quick Actions */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                    <GraphUpArrow size={15} className="text-slate-900" />
                    Quick Actions
                </h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <QuickAction href="/cms/products/new" icon={BoxSeam} label="Add Product" color="indigo" />
                    <QuickAction href="/cms/banners" icon={Images} label="Manage Banners" color="amber" />
                    <QuickAction href="/cms/storefront" icon={Gear} label="Storefront Sections" color="purple" />
                    <QuickAction href="/cms/categories" icon={BoxSeam} label="Manage Categories" color="emerald" />
                </div>
                <div className="grid sm:grid-cols-3 gap-3 mt-3">
                    <MiniLink href="/cms/reports" title="Operational Reports" text="Review content health, backlog, and coverage." />
                    <MiniLink href="/cms/product-updater" title="Product Updater" text="Run the Amazon updater and monitor sync work." />
                    <MiniLink href="/cms/product-updater/logs" title="Updater Logs" text="Inspect recent runs and failures fast." />
                </div>
            </div>

            {/* AI Coverage */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Stars size={16} className="text-slate-900" />
                        <span className="text-sm font-semibold text-slate-700">AI Analysis Progress</span>
                    </div>
                    <span className="text-sm font-bold text-slate-900">{aiPct}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-black rounded-full transition-all duration-700 ease-out" style={{ width: `${aiPct}%` }} />
                </div>
                <p className="text-xs text-slate-500 mt-2">{data.aiCoverage?.analysed || 0} of {data.aiCoverage?.total || 0} products have AI-generated analysis</p>
            </div>
        </div>
    )
}

function MiniLink({ href, title, text }) {
    return (
        <Link href={href} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 hover:bg-slate-50 transition block">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-sm font-semibold text-slate-800">{title}</p>
                    <p className="text-xs text-slate-500 mt-1">{text}</p>
                </div>
                <ArrowUpRight size={14} className="text-slate-400 shrink-0 mt-0.5" />
            </div>
        </Link>
    )
}


 'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowUpRight, BoxSeam, GraphUpArrow, Star, Heart, ClockHistory, Gear } from 'react-bootstrap-icons'

const StatCard = ({ label, value, sub, icon: Icon }) => (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
        <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-slate-400 uppercase tracking-wide">{label}</p>
            <Icon size={16} className="text-slate-400" />
        </div>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
        {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </div>
)

export default function ReportsPage() {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let alive = true

        const load = async () => {
            try {
                const res = await fetch('/api/admin/analytics', { cache: 'no-store' })
                const payload = await res.json().catch(() => ({}))
                if (!alive) return
                setData(payload)
            } catch {
                if (!alive) return
                setData({})
            } finally {
                if (alive) setLoading(false)
            }
        }

        load()
        return () => { alive = false }
    }, [])

    const aiPct = data?.aiCoverage?.total > 0
        ? Math.round((data.aiCoverage.analysed / data.aiCoverage.total) * 100)
        : 0

    return (
        <div className="space-y-6 pb-20">
            <div className="flex items-end justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">CMS Reports</h1>
                    <p className="text-sm text-slate-500 mt-1">A compact operational view for content, quality, and backlog.</p>
                </div>
                <Link href="/cms/product-updater" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-black text-white text-sm font-medium hover:bg-black/90 transition">
                    Open Product Updater <ArrowUpRight size={14} />
                </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <StatCard label="Total Products" value={loading ? '...' : (data?.totalProducts || 0)} icon={BoxSeam} sub="Published content inventory" />
                <StatCard label="Pending Reviews" value={loading ? '...' : (data?.pendingReviews || 0)} icon={Star} sub="Items waiting moderation" />
                <StatCard label="Wishlist Saves" value={loading ? '...' : (data?.wishlistSaves || 0)} icon={Heart} sub="Demand signal from users" />
                <StatCard label="AI Coverage" value={loading ? '...' : `${aiPct}%`} icon={GraphUpArrow} sub={`${data?.aiCoverage?.analysed || 0} of ${data?.aiCoverage?.total || 0} analysed`} />
            </div>

            <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-4 items-start">
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center gap-2">
                        <ClockHistory size={16} className="text-slate-600" />
                        <h2 className="text-lg font-semibold text-slate-800">Priority Queue</h2>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                        <ActionItem href="/cms/reviews" title="Moderate Reviews" text="Clear pending reviews before they pile up." />
                        <ActionItem href="/cms/banners/new" title="Create Banner" text="Push promotions without leaving the CMS." />
                        <ActionItem href="/cms/categories" title="Maintain Categories" text="Keep taxonomy clean for browsing and search." />
                        <ActionItem href="/cms/affiliate-links" title="Check Affiliate Links" text="Update links that drive revenue or tracking." />
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center gap-2">
                        <Gear size={16} className="text-slate-600" />
                        <h2 className="text-lg font-semibold text-slate-800">Fast Access</h2>
                    </div>
                    <div className="space-y-2">
                        <ActionItem href="/cms/products" title="Products" text="Review listings and update catalog data." />
                        <ActionItem href="/cms/product-updater/logs" title="Updater Logs" text="Inspect sync runs and failures." />
                        <ActionItem href="/cms/users" title="Users" text="Open the CMS user directory." />
                        <ActionItem href="/cms/storefront" title="Storefront" text="Tune visible storefront sections." />
                    </div>
                </div>
            </div>
        </div>
    )
}

function ActionItem({ href, title, text }) {
    return (
        <Link href={href} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 hover:bg-slate-50 transition flex items-start justify-between gap-3">
            <div>
                <p className="text-sm font-semibold text-slate-800">{title}</p>
                <p className="text-xs text-slate-500 mt-1">{text}</p>
            </div>
            <ArrowUpRight size={14} className="text-slate-400 shrink-0 mt-0.5" />
        </Link>
    )
}
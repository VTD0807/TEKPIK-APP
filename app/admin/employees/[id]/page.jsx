'use client'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState, useMemo } from 'react'
import Loading from '@/components/Loading'
import { 
    ArrowLeft, Basket, Star, Eye, GraphUpArrow, Calendar,
    CheckCircle, Clock, Heart, Shield, Person
} from 'react-bootstrap-icons'

const StatCard = ({ label, value, sub }) => (
    <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm space-y-2">
        <p className="text-xs text-slate-400 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
)

export default function EmployeeProfilePage() {
    const { id } = useParams()
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [employee, setEmployee] = useState(null)
    const [allEmployees, setAllEmployees] = useState([])
    const [details, setDetails] = useState(null)

    useEffect(() => {
        const load = async () => {
            try {
                const [summaryRes, detailRes] = await Promise.all([
                    fetch('/api/admin/employees', { cache: 'no-store' }),
                    fetch(`/api/admin/users/${id}`, { cache: 'no-store' }),
                ])

                const summaryData = await summaryRes.json().catch(() => ({}))
                const detailData = await detailRes.json().catch(() => ({}))

                setAllEmployees(summaryData.employees || [])
                const emp = (summaryData.employees || []).find(e => e.id === id)
                setEmployee(emp)
                setDetails(detailData)
            } catch (err) {
                console.error('Failed to load employee', err)
            } finally {
                setLoading(false)
            }
        }

        load()
    }, [id])

    const activityTimeline = useMemo(() => {
        if (!employee) return []
        
        const timeline = []
        
        // Add products to timeline
        if (employee.workHistory?.products) {
            employee.workHistory.products.forEach(product => {
                timeline.push({
                    type: 'product',
                    title: product.title,
                    date: product.createdAt,
                    data: product,
                    icon: Basket,
                })
            })
        }
        
        // Add reviews to timeline
        if (employee.workHistory?.reviews) {
            employee.workHistory.reviews.forEach(review => {
                timeline.push({
                    type: 'review',
                    title: `Review submitted`,
                    date: review.createdAt,
                    data: review,
                    icon: Star,
                })
            })
        }
        
        // Sort by date descending
        return timeline.sort((a, b) => new Date(b.date) - new Date(a.date))
    }, [employee])

    if (loading) return <Loading />

    if (!employee) {
        return (
            <div className="space-y-4 pb-12">
                <button onClick={() => router.back()} className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900">
                    <ArrowLeft size={16} /> Back
                </button>
                <p className="text-slate-500">Employee not found.</p>
            </div>
        )
    }

    const detailAnalytics = details?.analytics || {}
    const detailEngagement = details?.engagement || {}
    const accessModules = Object.entries(details?.user?.dashboardAccess || {}).filter(([, enabled]) => enabled)

    const joinDate = new Date(employee.createdAt)
    const daysSinceJoin = Math.floor((new Date() - joinDate) / (1000 * 60 * 60 * 24))
    const avgProductsPerMonth = daysSinceJoin > 0 ? ((employee.stats.productsAdded * 30) / daysSinceJoin).toFixed(1) : 0

    return (
        <div className="space-y-6 pb-24">
            {/* Header */}
            <div className="flex items-center gap-3">
                <button onClick={() => router.back()} className="p-1.5 text-slate-400 hover:text-slate-600 transition">
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-2xl text-slate-500">Employee <span className="text-slate-800 font-medium">Profile</span></h1>
            </div>

            {/* Employee Card */}
            <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm space-y-4">
                <div className="flex items-start gap-4 sm:gap-6">
                    {employee.image ? (
                        <img src={employee.image} alt={employee.name} className="w-20 h-20 rounded-full object-cover ring-4 ring-slate-100" />
                    ) : (
                        <div className="w-20 h-20 rounded-full bg-black/80 flex items-center justify-center text-white text-2xl font-bold ring-4 ring-slate-100">
                            {employee.name[0]?.toUpperCase() || 'U'}
                        </div>
                    )}
                    <div className="flex-1 min-w-0 space-y-3">
                        <div>
                            <div className="flex items-center gap-3 flex-wrap">
                                <h2 className="text-2xl font-semibold text-slate-800">{employee.name}</h2>
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${employee.role === 'ADMIN' ? 'bg-slate-100 text-slate-900' : 'bg-slate-50 text-slate-600'}`}>
                                    {employee.role === 'ADMIN' ? <Shield size={11} /> : <Person size={11} />}
                                    {employee.role}
                                </span>
                            </div>
                            <p className="text-slate-500 text-sm mt-1">{employee.email}</p>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                            <span className="flex items-center gap-1.5"><Calendar size={14} /> Joined {joinDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            <span className="flex items-center gap-1.5"><Clock size={14} /> {daysSinceJoin} days tenure</span>
                            {employee.lastSeenAt && <span className="flex items-center gap-1.5"><Eye size={14} /> Last active {formatLastSeen(employee.lastSeenAt)}</span>}
                        </div>
                    </div>
                    <div className={`text-right flex-shrink-0 p-4 rounded-lg border-2 ${getScoreBorder(employee.stats.performanceScore)}`}>
                        <div className={`text-3xl font-bold ${getScoreColor(employee.stats.performanceScore)}`}>
                            {employee.stats.performanceScore}
                        </div>
                        <p className="text-xs text-slate-400 font-medium mt-1">Performance Score</p>
                    </div>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Products Added" value={employee.stats.productsAdded} sub={`${avgProductsPerMonth} per month`} />
                <StatCard label="Active Products" value={employee.stats.activeProducts} sub={`${employee.stats.productsAdded > 0 ? Math.round((employee.stats.activeProducts / employee.stats.productsAdded) * 100) : 0}% quality`} />
                <StatCard label="Total Views" value={employee.stats.totalViews} sub={`${employee.stats.productsAdded > 0 ? (employee.stats.totalViews / employee.stats.productsAdded).toFixed(0) : 0} avg/product`} />
                <StatCard label="Reviews" value={employee.stats.reviewsSubmitted} sub={`${employee.stats.reviewsApproved} approved`} />
            </div>

            {/* Full Trackers */}
            {details && (
                <div className="grid lg:grid-cols-3 gap-4">
                    <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm space-y-3 lg:col-span-2">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <h3 className="font-semibold text-slate-800">Full Activity Tracker</h3>
                                <p className="text-sm text-slate-500">Actions, clicks, impressions, and work events for this employee.</p>
                            </div>
                            <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600">{detailEngagement.allInteractionCount || 0} total actions</span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <StatCard label="Last Seen" value={details.user?.lastSeenAt ? new Date(details.user.lastSeenAt).toLocaleString() : '—'} />
                            <StatCard label="Active Days" value={detailEngagement.activeDays || 0} />
                            <StatCard label="Clicks" value={details.stats?.totalClicks || 0} />
                            <StatCard label="Impressions" value={details.stats?.totalImpressions || 0} />
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            <DetailList title="Top Clicked Products" items={(detailAnalytics.topClickedProducts || []).map((item) => `${item.name} (${item.count})`)} />
                            <DetailList title="Recent Activities" items={(details.recentActivities || []).slice(0, 10).map((item) => `${item.title} • ${item.date ? new Date(item.date).toLocaleString() : '—'}`)} />
                        </div>
                    </div>

                    <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm space-y-3">
                        <h3 className="font-semibold text-slate-800">Assigned Modules</h3>
                        <div className="space-y-2">
                            {accessModules.length > 0 ? accessModules.map(([key]) => (
                                <div key={key} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                                    {key}
                                </div>
                            )) : <p className="text-sm text-slate-400">No modules assigned.</p>}
                        </div>

                        <div className="pt-3 border-t border-slate-100 space-y-2">
                            <p className="text-sm font-semibold text-slate-700">Location / Device Analytics</p>
                            <div className="text-sm text-slate-600 space-y-1">
                                <p>Browser groups: {detailAnalytics.topBrowsers?.length || 0}</p>
                                <p>OS groups: {detailAnalytics.topOs?.length || 0}</p>
                                <p>Regions: {detailAnalytics.topRegions?.length || 0}</p>
                                <p>Cities: {detailAnalytics.topCities?.length || 0}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Work Performance Summary */}
            <div className="grid lg:grid-cols-3 gap-4">
                <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm space-y-3">
                    <div className="flex items-center gap-2">
                        <GraphUpArrow size={16} className="text-slate-600" />
                        <h3 className="font-semibold text-slate-800">Performance Breakdown</h3>
                    </div>
                    <div className="space-y-3">
                        <MetricBar label="Product Contribution" value={employee.stats.productsAdded} max={10} color="from-blue-500 to-blue-600" />
                        <MetricBar label="Product Quality" value={employee.stats.activeProducts} max={employee.stats.productsAdded || 1} color="from-emerald-500 to-emerald-600" />
                        <MetricBar label="Reviewer Activity" value={employee.stats.reviewsApproved} max={20} color="from-purple-500 to-purple-600" />
                    </div>
                </div>

                <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm space-y-3">
                    <div className="flex items-center gap-2">
                        <Star size={16} className="text-slate-600" />
                        <h3 className="font-semibold text-slate-800">Review Metrics</h3>
                    </div>
                    <div className="space-y-3">
                        <div className="rounded-lg bg-slate-50 p-3">
                            <p className="text-xs text-slate-500 mb-1">Submission Quality</p>
                            <p className="text-2xl font-bold text-slate-800">
                                {employee.stats.reviewsSubmitted > 0 ? `${Math.round((employee.stats.reviewsApproved / employee.stats.reviewsSubmitted) * 100)}%` : '0%'}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">Approved Rate</p>
                        </div>
                        <div className="rounded-lg bg-slate-50 p-3">
                            <p className="text-xs text-slate-500 mb-1">Average Rating</p>
                            <p className="text-2xl font-bold text-slate-800">{employee.stats.avgRating}</p>
                            <p className="text-xs text-slate-400 mt-1">out of 5</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm space-y-3">
                    <div className="flex items-center gap-2">
                        <Basket size={16} className="text-slate-600" />
                        <h3 className="font-semibold text-slate-800">Product Stats</h3>
                    </div>
                    <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between py-2 border-b border-slate-100">
                            <span className="text-slate-600">Total Added</span>
                            <span className="font-semibold text-slate-800">{employee.stats.productsAdded}</span>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b border-slate-100">
                            <span className="text-slate-600">Inactive</span>
                            <span className="font-semibold text-slate-800">{employee.stats.productsAdded - employee.stats.activeProducts}</span>
                        </div>
                        <div className="flex items-center justify-between py-2">
                            <span className="text-slate-600">Avg Views/Product</span>
                            <span className="font-semibold text-slate-800">{employee.stats.productsAdded > 0 ? (employee.stats.totalViews / employee.stats.productsAdded).toFixed(0) : 0}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Activity Timeline */}
            <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm space-y-6">
                <div>
                    <h2 className="text-lg font-semibold text-slate-800">Full Work History</h2>
                    <p className="text-sm text-slate-500 mt-1">Complete timeline of products added and reviews submitted.</p>
                </div>

                {activityTimeline.length > 0 ? (
                    <div className="space-y-4">
                        {activityTimeline.map((activity, index) => (
                            <TimelineItem key={`${activity.type}-${index}`} activity={activity} />
                        ))}
                    </div>
                ) : (
                    <div className="py-8 text-center text-slate-400">
                        <p>No work history yet.</p>
                    </div>
                )}
            </div>

            {/* Products Added Section */}
            {employee.workHistory?.products && employee.workHistory.products.length > 0 && (
                <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-slate-800">Products Added ({employee.stats.productsAdded})</h2>
                        <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600">Latest first</span>
                    </div>
                    <div className="grid gap-4">
                        {employee.workHistory.products.map((product) => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

function DetailList({ title, items = [] }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-700 mb-3">{title}</p>
            <div className="space-y-2 max-h-64 overflow-auto pr-1">
                {items.length > 0 ? items.map((item, index) => (
                    <div key={`${title}-${index}`} className="rounded-lg bg-white border border-slate-200 px-3 py-2 text-sm text-slate-600">
                        {item}
                    </div>
                )) : <p className="text-sm text-slate-400">No records.</p>}
            </div>
        </div>
    )
}

function TimelineItem({ activity }) {
    const Icon = activity.icon
    const isProduct = activity.type === 'product'
    
    return (
        <div className="flex gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center border-2 border-slate-200">
                <Icon size={14} className="text-slate-600" />
            </div>
            <div className="flex-1 min-w-0 py-2">
                <div className="flex items-baseline gap-2">
                    <p className="font-medium text-slate-800 break-words">
                        {isProduct ? `Added product: "${activity.title}"` : activity.title}
                    </p>
                    <span className="text-xs text-slate-400 flex-shrink-0">
                        {formatDate(activity.date)}
                    </span>
                </div>
                {isProduct && activity.data && (
                    <div className="mt-2 text-sm text-slate-600">
                        <p>Price: ₹{activity.data.price} • Views: {activity.data.views} • Status: <span className={activity.data.isActive ? 'text-emerald-600 font-medium' : 'text-slate-500'}>
                            {activity.data.isActive ? 'Active' : 'Inactive'}
                        </span></p>
                    </div>
                )}
            </div>
        </div>
    )
}

function ProductCard({ product }) {
    return (
        <div className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition flex gap-4">
            {product.imageUrl ? (
                <img src={product.imageUrl} alt={product.title} className="w-16 h-16 rounded-lg object-cover bg-slate-100 flex-shrink-0" />
            ) : (
                <div className="w-16 h-16 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <Basket size={20} className="text-slate-400" />
                </div>
            )}
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <div>
                        <p className="font-medium text-slate-800 truncate">{product.title}</p>
                        {product.brand && <p className="text-xs text-slate-500">{product.brand}</p>}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${product.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {product.isActive ? 'Active' : 'Inactive'}
                    </span>
                </div>
                <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                    <span className="flex items-center gap-1">
                        <Heart size={12} /> ₹{product.price}
                    </span>
                    <span className="flex items-center gap-1">
                        <Eye size={12} /> {product.views} views
                    </span>
                    <span className="flex items-center gap-1 text-slate-400">
                        <Calendar size={12} /> {formatDate(product.createdAt)}
                    </span>
                </div>
            </div>
        </div>
    )
}

function MetricBar({ label, value, max, color }) {
    const percentage = Math.min((value / max) * 100, 100)
    return (
        <div>
            <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-slate-600">{label}</span>
                <span className="text-sm font-semibold text-slate-800">{value}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                    className={`bg-gradient-to-r ${color} h-2 rounded-full transition-all`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    )
}

function formatDate(dateString) {
    if (!dateString) return '—'
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = now - date
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}m ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatLastSeen(dateString) {
    if (!dateString) return '—'

    const date = new Date(dateString)
    if (Number.isNaN(date.getTime())) return '—'

    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfTarget = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const diffDays = Math.floor((startOfToday - startOfTarget) / (1000 * 60 * 60 * 24))
    const timePart = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

    if (diffDays === 0) return `Today, ${timePart}`
    if (diffDays === 1) return `Yesterday, ${timePart}`
    if (diffDays < 7) {
        const weekday = date.toLocaleDateString('en-US', { weekday: 'long' })
        return `${weekday}, ${timePart}`
    }

    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    })
}

function getScoreColor(score) {
    if (score >= 80) return 'text-emerald-600'
    if (score >= 60) return 'text-blue-600'
    if (score >= 40) return 'text-amber-600'
    return 'text-slate-600'
}

function getScoreBorder(score) {
    if (score >= 80) return 'border-emerald-200 bg-emerald-50'
    if (score >= 60) return 'border-blue-200 bg-blue-50'
    if (score >= 40) return 'border-amber-200 bg-amber-50'
    return 'border-slate-200 bg-slate-50'
}

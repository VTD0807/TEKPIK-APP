'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Loading from '@/components/Loading'
import { usePathname } from 'next/navigation'
import { 
    PeopleFill, Basket, Star, Eye, GraphUpArrow, CheckCircle,
    ArrowRight, Filter, SortDown, PersonCircle, Gear, PersonLinesFill, ArrowUpRight
} from 'react-bootstrap-icons'

const StatCard = ({ label, value, sub, icon: Icon }) => (
    <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm space-y-2">
        <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400 uppercase tracking-wide">{label}</p>
            <Icon size={16} className="text-slate-400" />
        </div>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
        {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
)

export default function AdminEmployeesPage() {
    const [loading, setLoading] = useState(true)
    const [employees, setEmployees] = useState([])
    const [roleStats, setRoleStats] = useState({})
    const [summary, setSummary] = useState({})
    const [filter, setFilter] = useState('all')
    const [sortBy, setSortBy] = useState('performance')
    const pathname = usePathname()
    const employeesBasePath = pathname?.startsWith('/e') ? '/e/employees' : '/admin/employees'

    useEffect(() => {
        const load = async () => {
            try {
                const controller = new AbortController()
                const timeout = setTimeout(() => controller.abort(), 10000)
                const res = await fetch('/api/admin/employees', { cache: 'no-store', signal: controller.signal })
                clearTimeout(timeout)

                const data = await res.json().catch(() => ({}))
                if (!res.ok) throw new Error(data?.error || 'Failed to load employees')

                setEmployees(data.employees || [])
                setRoleStats(data.roleStats || {})
                setSummary(data.summary || {})
            } catch (err) {
                console.error('Failed to load employees', err)
                setEmployees([])
                setRoleStats({})
                setSummary({})
            } finally {
                setLoading(false)
            }
        }

        load()
    }, [])

    const filteredEmployees = useMemo(() => {
        let filtered = employees
        
        if (filter !== 'all') {
            filtered = employees.filter(emp => emp.role === filter)
        }

        // Sort
        if (sortBy === 'performance') {
            filtered = [...filtered].sort((a, b) => b.stats.performanceScore - a.stats.performanceScore)
        } else if (sortBy === 'products') {
            filtered = [...filtered].sort((a, b) => b.stats.productsAdded - a.stats.productsAdded)
        } else if (sortBy === 'name') {
            filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name))
        } else if (sortBy === 'recent') {
            filtered = [...filtered].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        }

        return filtered
    }, [employees, filter, sortBy])

    if (loading) return <Loading />

    const roles = Object.keys(roleStats).sort()

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div>
                <h1 className="text-2xl text-slate-500">Team <span className="text-slate-800 font-medium">Performance</span></h1>
                <p className="text-sm text-slate-400 mt-1">User and role-wise analytics with full work history and product tracking.</p>
            </div>

            <div className="grid lg:grid-cols-3 gap-4">
                <Link href="/admin/employees/access" className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-slate-200 transition">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="text-xs uppercase tracking-wide text-slate-400">Access Center</p>
                            <p className="text-base font-semibold text-slate-800 mt-1">Manage employee assignments</p>
                            <p className="text-sm text-slate-500 mt-1">Add, revoke, and scope dashboard access from one place.</p>
                        </div>
                        <Gear size={18} className="text-slate-400" />
                    </div>
                </Link>
                <Link href="/e/dashboard" className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-slate-200 transition">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="text-xs uppercase tracking-wide text-slate-400">Employee Panel</p>
                            <p className="text-base font-semibold text-slate-800 mt-1">Open the employee workspace</p>
                            <p className="text-sm text-slate-500 mt-1">Review the live dashboard experience employees see.</p>
                        </div>
                        <PersonLinesFill size={18} className="text-slate-400" />
                    </div>
                </Link>
                <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="text-xs uppercase tracking-wide text-slate-400">Team Snapshot</p>
                            <p className="text-base font-semibold text-slate-800 mt-1">{summary.totalEmployees || 0} employees tracked</p>
                            <p className="text-sm text-slate-500 mt-1">{summary.totalProducts || 0} products and {summary.totalReviews || 0} reviews logged.</p>
                        </div>
                        <ArrowUpRight size={18} className="text-slate-400" />
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Team Members" value={summary.totalEmployees || 0} icon={PeopleFill} />
                <StatCard label="Total Products" value={summary.totalProducts || 0} icon={Basket} />
                <StatCard label="Total Reviews" value={summary.totalReviews || 0} icon={Star} />
                <StatCard label="Avg Products/Member" value={summary.avgProductsPerEmployee || 0} icon={Eye} />
            </div>

            {/* Role-wise Analytics */}
            {roles.length > 0 && (
                <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-2">
                        <GraphUpArrow size={18} className="text-slate-600" />
                        <h2 className="text-lg font-semibold text-slate-800">Role-wise Analytics</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {roles.map(role => {
                            const stats = roleStats[role]
                            return (
                                <div key={role} className="border border-slate-200 rounded-lg p-4 space-y-3 hover:shadow-md transition">
                                    <div className="flex items-center justify-between">
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${role === 'ADMIN' ? 'bg-slate-100 text-slate-900' : 'bg-slate-50 text-slate-600'}`}>
                                            {role}
                                        </span>
                                        <span className="text-sm font-semibold text-slate-700">{stats.count} members</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div className="rounded bg-slate-50 p-2">
                                            <p className="text-xs text-slate-500">Avg Products</p>
                                            <p className="text-lg font-bold text-slate-800">{stats.avgProducts}</p>
                                        </div>
                                        <div className="rounded bg-slate-50 p-2">
                                            <p className="text-xs text-slate-500">Avg Views</p>
                                            <p className="text-lg font-bold text-slate-800">{stats.avgViews}</p>
                                        </div>
                                        <div className="rounded bg-slate-50 p-2">
                                            <p className="text-xs text-slate-500">Avg Reviews</p>
                                            <p className="text-lg font-bold text-slate-800">{stats.avgReviews}</p>
                                        </div>
                                        <div className="rounded bg-slate-50 p-2">
                                            <p className="text-xs text-slate-500">Avg Score</p>
                                            <p className="text-lg font-bold text-slate-800">{stats.avgPerformanceScore}</p>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
                <div className="flex gap-2 flex-wrap">
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 text-slate-700 cursor-pointer"
                    >
                        <option value="all">All Roles</option>
                        {roles.map(role => (
                            <option key={role} value={role}>{role}</option>
                        ))}
                    </select>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 text-slate-700 cursor-pointer"
                    >
                        <option value="performance">Sort by Performance Score</option>
                        <option value="products">Sort by Products Added</option>
                        <option value="name">Sort by Name</option>
                        <option value="recent">Sort by Recent Join</option>
                    </select>
                </div>
                <p className="text-xs text-slate-500">{filteredEmployees.length} members</p>
            </div>

            {/* Employee List */}
            <div className="space-y-3">
                {filteredEmployees.length > 0 ? (
                    filteredEmployees.map((emp) => (
                        <Link key={emp.id} href={`${employeesBasePath}/${emp.id}`}>
                            <div className="bg-white border border-slate-100 rounded-xl p-4 hover:shadow-md hover:border-slate-200 transition space-y-4">
                                {/* Header */}
                                <div className="flex items-start gap-4">
                                    <EmployeeAvatar src={emp.image} name={emp.name} />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="font-semibold text-slate-800">{emp.name}</h3>
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${emp.role === 'ADMIN' ? 'bg-slate-100 text-slate-900' : 'bg-slate-50 text-slate-600'}`}>
                                                {emp.role}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-500">{emp.email}</p>
                                        <p className="text-xs text-slate-400 mt-1">Joined {new Date(emp.createdAt).toLocaleDateString()}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="text-right">
                                            <div className={`text-2xl font-bold ${getScoreColor(emp.stats.performanceScore)}`}>
                                                {emp.stats.performanceScore}
                                            </div>
                                            <p className="text-xs text-slate-400">Performance</p>
                                        </div>
                                        <ArrowRight size={18} className="text-slate-300" />
                                    </div>
                                </div>

                                {/* Stats Grid */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <StatBox label="Products Added" value={emp.stats.productsAdded} icon={Basket} />
                                    <StatBox label="Active Products" value={emp.stats.activeProducts} icon={CheckCircle} />
                                    <StatBox label="Total Views" value={emp.stats.totalViews} icon={Eye} />
                                    <StatBox label="Reviews" value={emp.stats.reviewsSubmitted} icon={Star} />
                                </div>

                                {/* Progress Bar */}
                                <div className="pt-2">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs text-slate-500">Products Quality</span>
                                        <span className="text-xs font-semibold text-slate-600">
                                            {emp.stats.productsAdded > 0 ? Math.round((emp.stats.activeProducts / emp.stats.productsAdded) * 100) : 0}% Active
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                                        <div
                                            className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-1.5 rounded-full transition-all"
                                            style={{
                                                width: emp.stats.productsAdded > 0 ? `${(emp.stats.activeProducts / emp.stats.productsAdded) * 100}%` : '0%'
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))
                ) : (
                    <div className="bg-white border border-slate-100 rounded-xl p-12 text-center">
                        <p className="text-slate-500">No employees found.</p>
                    </div>
                )}
            </div>
        </div>
    )
}

function StatBox({ label, value, icon: Icon }) {
    return (
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-3 space-y-1 border border-slate-200">
            <div className="flex items-center gap-1.5">
                <Icon size={13} className="text-slate-500" />
                <p className="text-xs text-slate-500">{label}</p>
            </div>
            <p className="text-lg font-bold text-slate-800">{value}</p>
        </div>
    )
}

function getScoreColor(score) {
    if (score >= 80) return 'text-emerald-600'
    if (score >= 60) return 'text-blue-600'
    if (score >= 40) return 'text-amber-600'
    return 'text-slate-600'
}

function EmployeeAvatar({ src, name }) {
    const [hasError, setHasError] = useState(false)

    if (!src || hasError) {
        return (
            <div className="w-12 h-12 rounded-full bg-slate-100 ring-2 ring-slate-100 flex items-center justify-center">
                <PersonCircle size={28} className="text-slate-500" />
            </div>
        )
    }

    return (
        <img
            src={src}
            alt={name || 'User'}
            onError={() => setHasError(true)}
            className="w-12 h-12 rounded-full object-cover ring-2 ring-slate-100"
            referrerPolicy="no-referrer"
        />
    )
}

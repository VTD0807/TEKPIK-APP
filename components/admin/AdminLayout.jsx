'use client'
import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import Loading from "../Loading"
import AdminNavbar from "./AdminNavbar"
import AdminSidebar from "./AdminSidebar"
import AdminMobileNav from "./AdminMobileNav"
import { useAuth } from "@/lib/auth-context"
import { db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"
import Link from "next/link"
import { isAdminEmail } from "@/lib/admin"

export default function AdminLayout({ children }) {
    const { user, loading: authLoading } = useAuth()
    const [status, setStatus] = useState('checking')
    const pathname = usePathname()

    useEffect(() => {
        if (authLoading) return
        if (!user) { setStatus('noauth'); return }

        if (isAdminEmail(user.email) && canAccessPath(pathname, { role: 'ADMIN', dashboardAccess: {} })) {
            sessionStorage.setItem(`admin_profile_${user.uid}`, JSON.stringify({ role: 'ADMIN', dashboardAccess: {} }))
            setStatus('allowed')
            return
        }

        const cached = sessionStorage.getItem(`admin_profile_${user.uid}`)
        if (cached) {
            try {
                const profile = JSON.parse(cached)
                setStatus(canAccessPath(pathname, profile) ? 'allowed' : 'denied')
                return
            } catch {
                sessionStorage.removeItem(`admin_profile_${user.uid}`)
            }
        }

        getDoc(doc(db, 'users', user.uid))
            .then(docSnap => {
                const data = docSnap.exists() ? docSnap.data() : {}
                const profile = {
                    role: isAdminEmail(user.email) ? 'ADMIN' : (data.role || 'USER'),
                    dashboardAccess: normalizeDashboardAccess(data.dashboardAccess),
                }
                sessionStorage.setItem(`admin_profile_${user.uid}`, JSON.stringify(profile))
                setStatus(canAccessPath(pathname, profile) ? 'allowed' : 'denied')
            })
            .catch(() => setStatus('denied'))
    }, [user, authLoading, pathname])

    if (authLoading || status === 'checking') return <Loading />

    if (status === 'noauth') return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="text-center space-y-4">
                <p className="text-slate-600">Sign in to access the admin panel.</p>
                <Link href="/login?redirect=/admin" className="inline-block px-6 py-2 bg-black text-white text-sm rounded-full hover:bg-black/90 transition">
                    Sign In
                </Link>
            </div>
        </div>
    )

    if (status === 'denied') return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="text-center space-y-3">
                <p className="text-slate-700 font-medium">Access Denied</p>
                <p className="text-sm text-slate-400">Your account does not have permission for this admin module.</p>
                <Link href="/" className="inline-block px-6 py-2 border border-slate-200 text-slate-600 text-sm rounded-full">Go Home</Link>
            </div>
        </div>
    )

    return (
        <div className="flex h-screen flex-col bg-slate-50">
            <AdminNavbar />

            <div className="flex min-h-0 flex-1">
                <div className="hidden lg:block">
                    <AdminSidebar />
                </div>

                <main className="min-h-0 flex-1 overflow-y-auto no-scrollbar px-4 py-4 sm:px-5 sm:py-5 lg:pl-12 lg:pt-10 lg:pr-8 pb-28 lg:pb-8">
                    {children}
                </main>
            </div>

            <AdminMobileNav />
        </div>
    )
}

function canAccessPath(pathname, profile = {}) {
    const role = profile.role || 'USER'
    if (role === 'ADMIN') return true

    const access = normalizeDashboardAccess(profile.dashboardAccess)
    if (!access.admin) return false

    const moduleKey = moduleForPath(pathname)
    if (!moduleKey) return true
    return Boolean(access[moduleKey])
}

function moduleForPath(pathname = '') {
    if (pathname.startsWith('/admin/employees/access')) return 'users'
    if (pathname.startsWith('/admin/employees')) return 'employees'
    if (pathname.startsWith('/admin/work-assignments')) return 'employees'
    if (pathname.startsWith('/admin/users') || pathname.startsWith('/admin/profile')) return 'users'
    if (pathname.startsWith('/admin/data')) return 'analytics'
    if (pathname.startsWith('/admin/price-history')) return 'analytics'
    if (pathname.startsWith('/admin/integrations')) return 'integrations'
    if (pathname.startsWith('/admin/reviews')) return 'reviews'
    if (pathname.startsWith('/admin/notifications')) return 'notifications'
    if (pathname.startsWith('/admin/categories') || pathname.startsWith('/admin/products')) return 'products'
    if (pathname.startsWith('/admin/settings')) return 'settings'
    return null
}

function normalizeDashboardAccess(value = {}) {
    const source = value && typeof value === 'object' ? value : {}
    return {
        admin: Boolean(source.admin),
        cms: Boolean(source.cms),
        store: Boolean(source.store),
        analytics: Boolean(source.analytics),
        users: Boolean(source.users),
        employees: Boolean(source.employees),
        reviews: Boolean(source.reviews),
        products: Boolean(source.products),
        integrations: Boolean(source.integrations),
        notifications: Boolean(source.notifications),
        settings: Boolean(source.settings),
    }
}


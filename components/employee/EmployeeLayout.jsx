'use client'
import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Loading from '@/components/Loading'
import EmployeeNavbar from './EmployeeNavbar'
import EmployeeSidebar, { getAllowedEmployeeLinks, getModuleForEmployeePath } from './EmployeeSidebar'
import { useAuth } from '@/lib/auth-context'

export default function EmployeeLayout({ children }) {
    const { user, loading: authLoading } = useAuth()
    const pathname = usePathname()
    const [state, setState] = useState({ status: 'checking', isAdmin: false, access: {}, canViewDashboard: false, error: '' })

    useEffect(() => {
        if (authLoading) return
        if (!user) {
            setState({ status: 'noauth', isAdmin: false, access: {}, canViewDashboard: false, error: '' })
            return
        }

        let cancelled = false
        setState((prev) => ({ ...prev, status: 'checking' }))

        const loadAccess = async () => {
            try {
                const token = await user.getIdToken()
                const controller = new AbortController()
                const timeout = setTimeout(() => controller.abort(), 10000)
                const res = await fetch('/api/me/dashboard-access', {
                    cache: 'no-store',
                    signal: controller.signal,
                    headers: { Authorization: `Bearer ${token}` },
                })
                clearTimeout(timeout)

                const payload = await res.json().catch(() => ({}))
                if (!res.ok) throw new Error(payload?.error || 'Failed to load access')
                if (cancelled) return

                setState({
                    status: 'ready',
                    isAdmin: Boolean(payload?.isAdmin),
                    access: payload?.access || {},
                    canViewDashboard: Boolean(payload?.canViewDashboard),
                    error: '',
                })
            } catch (error) {
                if (cancelled) return
                setState({ status: 'denied', isAdmin: false, access: {}, canViewDashboard: false, error: error?.message || 'Access check failed' })
            }
        }

        loadAccess()

        return () => {
            cancelled = true
        }
    }, [user, authLoading])

    const allowedLinks = useMemo(() => getAllowedEmployeeLinks(state.access, state.isAdmin), [state.access, state.isAdmin])

    const canAccessCurrentPath = useMemo(() => {
        if (state.isAdmin) return true
        if (!state.canViewDashboard) return false

        const module = getModuleForEmployeePath(pathname)
        if (!module || module === 'dashboard') return true
        return Boolean(state.access?.[module])
    }, [pathname, state])

    if (authLoading || state.status === 'checking') return <Loading />

    if (state.status === 'noauth') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center space-y-4">
                    <p className="text-slate-600">Sign in to access the employee panel.</p>
                    <Link href="/login?redirect=/e/dashboard" className="inline-block px-6 py-2 bg-black text-white text-sm rounded-full hover:bg-black/90 transition">
                        Sign In
                    </Link>
                </div>
            </div>
        )
    }

    if (state.status === 'denied' || !state.canViewDashboard || !canAccessCurrentPath) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center space-y-3">
                    <p className="text-slate-700 font-medium">Access Denied</p>
                    <p className="text-sm text-slate-400">{state.error || 'This employee module is not assigned to your account.'}</p>
                    <Link href="/" className="inline-block px-6 py-2 border border-slate-200 text-slate-600 text-sm rounded-full">Go Home</Link>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-screen">
            <EmployeeNavbar />
            <div className="flex flex-1 items-start h-full overflow-y-scroll no-scrollbar">
                <EmployeeSidebar links={allowedLinks} />
                <div className="flex-1 h-full p-5 lg:pl-12 lg:pt-12 overflow-y-scroll no-scrollbar">
                    {children}
                </div>
            </div>
        </div>
    )
}

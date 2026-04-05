'use client'
import { useEffect, useState } from 'react'
import CMSSidebar from '@/components/cms/CMSSidebar'
import CMSHeader from '@/components/cms/CMSHeader'
import { useAuth } from '@/lib/auth-context'
import { db } from '@/lib/firebase'
import { doc, getDoc } from 'firebase/firestore'
import { isAdminEmail } from '@/lib/admin'
import Loading from '@/components/Loading'
import Link from 'next/link'

export default function CMSLayout({ children }) {
    const { user, loading: authLoading } = useAuth()
    const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
    const [status, setStatus] = useState('checking')

    useEffect(() => {
        if (authLoading) return
        if (!user) {
            setStatus('noauth')
            return
        }

        if (isAdminEmail(user.email)) {
            setStatus('authorized')
            return
        }

        getDoc(doc(db, 'users', user.uid))
            .then((docSnap) => {
                const payload = docSnap.exists() ? (docSnap.data() || {}) : {}
                const role = String(payload.role || 'USER').toUpperCase()
                const cmsAccess = Boolean(payload?.dashboardAccess?.cms)
                setStatus(role === 'ADMIN' || cmsAccess ? 'authorized' : 'denied')
            })
            .catch(() => setStatus('denied'))
    }, [authLoading, user])

    if (authLoading || status === 'checking') return <Loading />

    if (status === 'noauth') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
                <div className="text-center space-y-4">
                    <p className="text-slate-700 font-medium">Sign in to access the CMS panel.</p>
                    <Link href="/login?redirect=/cms" className="inline-block px-6 py-2 bg-black text-white text-sm rounded-full hover:bg-black/90 transition">
                        Sign In
                    </Link>
                </div>
            </div>
        )
    }

    if (status === 'denied') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
                <div className="text-center space-y-3">
                    <p className="text-slate-700 font-medium">You are not authorized to access CMS.</p>
                    <Link href="/" className="inline-block px-6 py-2 border border-slate-200 text-slate-600 text-sm rounded-full">
                        Go Home
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="h-screen bg-white flex overflow-hidden">
            <CMSSidebar
                collapsed={sidebarCollapsed}
                onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
            />
            <div className="flex-1 flex flex-col min-w-0 min-h-0">
                <CMSHeader onMenuToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
                <main className="flex-1 min-h-0 overflow-y-auto p-4 lg:p-6">
                    {children}
                </main>
            </div>
        </div>
    )
}

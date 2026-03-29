'use client'
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Loading from "../Loading"
import AdminNavbar from "./AdminNavbar"
import AdminSidebar from "./AdminSidebar"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase"
import Link from "next/link"

export default function AdminLayout({ children }) {
    const { user, loading: authLoading } = useAuth()
    const [status, setStatus] = useState('checking')
    const router = useRouter()

    useEffect(() => {
        if (authLoading) return
        if (!user) { setStatus('noauth'); return }

        // Cache role in sessionStorage to avoid repeated DB calls
        const cached = sessionStorage.getItem(`role_${user.id}`)
        if (cached) {
            setStatus(cached === 'ADMIN' ? 'admin' : 'denied')
            return
        }

        supabase.from('users').select('role').eq('id', user.id).single()
            .then(({ data }) => {
                const role = data?.role || 'USER'
                sessionStorage.setItem(`role_${user.id}`, role)
                setStatus(role === 'ADMIN' ? 'admin' : 'denied')
            })
            .catch(() => setStatus('denied'))
    }, [user, authLoading])

    if (authLoading || status === 'checking') return <Loading />

    if (status === 'noauth') return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="text-center space-y-4">
                <p className="text-slate-600">Sign in to access the admin panel.</p>
                <Link href="/login?redirect=/admin" className="inline-block px-6 py-2 bg-indigo-500 text-white text-sm rounded-full hover:bg-indigo-600 transition">
                    Sign In
                </Link>
            </div>
        </div>
    )

    if (status === 'denied') return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="text-center space-y-3">
                <p className="text-2xl">🔒</p>
                <p className="text-slate-700 font-medium">Access Denied</p>
                <Link href="/" className="inline-block px-6 py-2 border border-slate-200 text-slate-600 text-sm rounded-full">Go Home</Link>
            </div>
        </div>
    )

    return (
        <div className="flex flex-col h-screen">
            <AdminNavbar />
            <div className="flex flex-1 items-start h-full overflow-y-scroll no-scrollbar">
                <AdminSidebar />
                <div className="flex-1 h-full p-5 lg:pl-12 lg:pt-12 overflow-y-scroll no-scrollbar">
                    {children}
                </div>
            </div>
        </div>
    )
}

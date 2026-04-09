'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import toast from 'react-hot-toast'
import { assets } from '@/assets/assets'
import { isAdminEmail } from '@/lib/admin'

export default function GoogleNavbar() {
    const router = useRouter()
    const pathname = usePathname()
    const { user, signOut } = useAuth()
    const [menuOpen, setMenuOpen] = useState(false)
    const menuRef = useRef(null)
    const isAdmin = user ? isAdminEmail(user.email) : false

    useEffect(() => {
        const handler = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setMenuOpen(false)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    const handleSignOut = async () => {
        setMenuOpen(false)
        await signOut()
        toast.success('Signed out')
        router.push('/')
    }

    const navLinks = [
        { href: '/shop', label: 'Shop' },
        { href: '/about', label: 'About' },
        { href: '/help', label: 'Help' },
    ]

    return (
        <nav className="sticky top-0 z-40 bg-white border-b border-slate-200">
            <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2">
                    <Image 
                        src={assets.tekpik_logo}
                        alt="TEKPIK"
                        width={120}
                        height={40}
                        className="h-8 w-auto object-contain"
                    />
                </Link>

                {/* Navigation */}
                <div className="hidden sm:flex items-center gap-8">
                    {navLinks.map(({ href, label }) => (
                        <Link
                            key={href}
                            href={href}
                            className={`text-sm transition-colors ${
                                pathname === href
                                    ? 'text-blue-600 font-semibold'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            {label}
                        </Link>
                    ))}
                </div>

                {/* User Menu */}
                <div className="flex items-center gap-4">
                    {user ? (
                        <div className="relative" ref={menuRef}>
                            <button
                                onClick={() => setMenuOpen(!menuOpen)}
                                className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
                            >
                                {user.photoURL ? (
                                    <img
                                        src={user.photoURL}
                                        alt={user.displayName || 'User'}
                                        className="w-8 h-8 rounded-full"
                                    />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold">
                                        {(user.displayName || user.email || 'U')[0].toUpperCase()}
                                    </div>
                                )}
                                <span className="hidden sm:inline">{user.displayName || user.email?.split('@')[0]}</span>
                            </button>

                            {menuOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-lg py-2">
                                    <Link href="/profile" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">
                                        Profile
                                    </Link>
                                    {isAdmin && (
                                        <Link href="/admin" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">
                                            Admin Dashboard
                                        </Link>
                                    )}
                                    <button
                                        onClick={handleSignOut}
                                        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                                    >
                                        Sign Out
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <Link
                            href="/auth/login"
                            className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                        >
                            Sign In
                        </Link>
                    )}
                </div>
            </div>
        </nav>
    )
}

'use client'
import { Search, HeartIcon, SparklesIcon, UserIcon, LogOutIcon, XIcon } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useEffect, useRef } from "react"
import { useSelector } from "react-redux"
import { assets } from "@/assets/assets"
import { useAuth } from "@/lib/auth-context"
import toast from "react-hot-toast"

const Navbar = () => {
    const router = useRouter()
    const [search, setSearch] = useState('')
    const [menuOpen, setMenuOpen] = useState(false)
    const menuRef = useRef(null)
    const wishlistCount = useSelector(state => state.wishlist?.ids?.length ?? 0)
    const { user, signOut } = useAuth()

    const name = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || ''
    const avatar = user?.user_metadata?.avatar_url

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setMenuOpen(false)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    const handleSearch = (e) => {
        e.preventDefault()
        if (search.trim()) router.push(`/search?q=${encodeURIComponent(search.trim())}`)
    }

    const handleSignOut = async () => {
        setMenuOpen(false)
        await signOut()
        toast.success('Signed out')
        router.push('/')
    }

    return (
        <nav className="relative bg-white z-40">
            <div className="mx-6">
                <div className="flex items-center justify-between max-w-7xl mx-auto py-4 transition-all">

                    {/* Logo */}
                    <Link href="/" className="flex items-center shrink-0">
                        <Image src={assets.tekpik_logo} alt="TEKPIK" width={140} height={48} className="h-12 w-auto object-contain" />
                    </Link>

                    {/* Desktop nav */}
                    <div className="hidden sm:flex items-center gap-4 lg:gap-6 text-slate-600">
                        <Link href="/" className="hover:text-slate-900 transition text-sm">Home</Link>
                        <Link href="/shop" className="hover:text-slate-900 transition text-sm">Shop</Link>
                        <Link href="/ai-picks" className="flex items-center gap-1 hover:text-indigo-600 transition text-sm">
                            <SparklesIcon size={14} /> AI Picks
                        </Link>
                        <Link href="/disclosure" className="hover:text-slate-900 transition text-sm">Disclosure</Link>

                        <form onSubmit={handleSearch} className="hidden xl:flex items-center w-52 text-sm gap-2 bg-slate-100 px-4 py-2 rounded-full">
                            <Search size={15} className="text-slate-400 shrink-0" />
                            <input
                                className="w-full bg-transparent outline-none placeholder-slate-400 text-sm"
                                type="text" placeholder="Search products"
                                value={search} onChange={e => setSearch(e.target.value)}
                            />
                        </form>

                        {/* Wishlist */}
                        <Link href="/wishlist" className="relative text-slate-600 hover:text-red-500 transition">
                            <HeartIcon size={20} />
                            {wishlistCount > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 text-[9px] text-white bg-red-500 w-4 h-4 rounded-full flex items-center justify-center font-bold">
                                    {wishlistCount}
                                </span>
                            )}
                        </Link>

                        {/* Admin */}
                        <Link href="/admin" className="px-4 py-1.5 text-xs font-medium border border-slate-300 hover:bg-slate-50 transition text-slate-600 rounded-full">
                            Admin
                        </Link>

                        {/* Auth */}
                        {user ? (
                            <div className="relative" ref={menuRef}>
                                <button
                                    onClick={() => setMenuOpen(v => !v)}
                                    className="flex items-center gap-2 text-sm text-slate-700 hover:text-slate-900 transition"
                                >
                                    {avatar
                                        ? <img src={avatar} alt={name} referrerPolicy="no-referrer" className="w-8 h-8 rounded-full object-cover ring-2 ring-indigo-100" />
                                        : <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-sm">{name[0]?.toUpperCase()}</div>
                                    }
                                    <span className="max-w-28 truncate text-sm">{name}</span>
                                </button>

                                {menuOpen && (
                                    <div className="absolute right-0 top-11 bg-white border border-slate-100 rounded-2xl shadow-xl py-2 w-52 z-50">
                                        {/* User info */}
                                        <div className="px-4 py-2 border-b border-slate-100 mb-1">
                                            <p className="text-xs font-semibold text-slate-700 truncate">{name}</p>
                                            <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                                        </div>
                                        <Link href="/wishlist" onClick={() => setMenuOpen(false)}
                                            className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition">
                                            <HeartIcon size={14} /> Wishlist
                                        </Link>
                                        <button onClick={handleSignOut}
                                            className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition">
                                            <LogOutIcon size={14} /> Sign Out
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <Link href="/login" className="px-5 py-2 bg-indigo-500 hover:bg-indigo-600 transition text-white text-sm font-medium rounded-full">
                                Login
                            </Link>
                        )}
                    </div>

                    {/* Mobile */}
                    <div className="sm:hidden flex items-center gap-2">
                        <Link href="/wishlist" className="relative p-1.5">
                            <HeartIcon size={20} className="text-slate-600" />
                            {wishlistCount > 0 && (
                                <span className="absolute top-0 right-0 text-[8px] text-white bg-red-500 w-3.5 h-3.5 rounded-full flex items-center justify-center">{wishlistCount}</span>
                            )}
                        </Link>
                        <Link href="/admin" className="px-3 py-1.5 text-xs border border-slate-300 text-slate-600 rounded-full">Admin</Link>
                        {user
                            ? <button onClick={handleSignOut} className="flex items-center gap-1 px-3 py-1.5 text-xs text-red-500 border border-red-200 rounded-full">
                                <LogOutIcon size={12} /> Out
                              </button>
                            : <Link href="/login" className="px-4 py-1.5 bg-indigo-500 text-xs text-white rounded-full font-medium">Login</Link>
                        }
                    </div>
                </div>
            </div>
            <hr className="border-slate-100" />
        </nav>
    )
}

export default Navbar
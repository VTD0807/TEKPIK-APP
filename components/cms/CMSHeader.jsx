'use client'
import { Search, Bell, List, BoxSeam, Tags, Star, Stars, People, Gear, Images, Link45deg } from 'react-bootstrap-icons'
import { useAuth } from '@/lib/auth-context'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const SEARCH_ITEMS = [
    { label: 'Products', desc: 'Manage product catalog', href: '/cms/products', icon: BoxSeam },
    { label: 'Add Product', desc: 'Create new product listing', href: '/cms/products/new', icon: BoxSeam },
    { label: 'Categories', desc: 'Manage product categories', href: '/cms/categories', icon: Tags },
    { label: 'Banners', desc: 'Homepage promo banners', href: '/cms/banners', icon: Images },
    { label: 'Affiliate Links', desc: 'Manage affiliate URLs', href: '/cms/affiliate-links', icon: Link45deg },
    { label: 'Reviews', desc: 'Moderate user reviews', href: '/cms/reviews', icon: Star },
    { label: 'AI Analysis', desc: 'Run & manage AI analysis', href: '/cms/ai-analysis', icon: Stars },
    { label: 'Users', desc: 'View registered users', href: '/cms/users', icon: People },
    { label: 'Storefront', desc: 'Homepage sections & layout', href: '/cms/storefront', icon: Gear },
    { label: 'Dashboard', desc: 'Overview & analytics', href: '/cms', icon: Stars },
]

export default function CMSHeader({ onMenuToggle }) {
    const { user } = useAuth()
    const router = useRouter()
    const [search, setSearch] = useState('')
    const [focused, setFocused] = useState(false)
    const inputRef = useRef(null)
    const dropdownRef = useRef(null)

    const results = search.trim()
        ? SEARCH_ITEMS.filter(item =>
            item.label.toLowerCase().includes(search.toLowerCase()) ||
            item.desc.toLowerCase().includes(search.toLowerCase())
        )
        : SEARCH_ITEMS.slice(0, 5) // Show top 5 as suggestions when empty but focused

    // Close on outside click
    useEffect(() => {
        const handler = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target) && !inputRef.current?.contains(e.target)) {
                setFocused(false)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    // Keyboard shortcut
    useEffect(() => {
        const handler = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault()
                inputRef.current?.focus()
            }
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [])

    const navigate = (href) => {
        setSearch('')
        setFocused(false)
        router.push(href)
    }

    return (
        <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-xl border-b border-slate-200 flex items-center justify-between px-4 lg:px-6">
            {/* Left — mobile menu + search */}
            <div className="flex items-center gap-3 flex-1">
                <button
                    onClick={onMenuToggle}
                    className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                >
                    <List size={20} />
                </button>
                <div className="relative hidden sm:block w-72">
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-black/10 focus-within:bg-white transition">
                        <Search size={15} className="text-slate-400" />
                        <input
                            ref={inputRef}
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            onFocus={() => setFocused(true)}
                            placeholder="Search pages..."
                            className="bg-transparent text-sm text-slate-700 placeholder-slate-400 outline-none w-full"
                        />
                        <kbd className="hidden md:inline text-[10px] text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono">CTRL+K</kbd>
                    </div>

                    {/* Search Dropdown */}
                    {focused && (
                        <div ref={dropdownRef} className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl shadow-black/5 overflow-hidden z-50">
                            <div className="px-3 py-2 border-b border-slate-100">
                                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                                    {search.trim() ? `${results.length} result${results.length !== 1 ? 's' : ''}` : 'Quick Navigation'}
                                </p>
                            </div>
                            {results.length > 0 ? results.map((item) => (
                                <button
                                    key={item.href}
                                    onClick={() => navigate(item.href)}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-100 transition"
                                >
                                    <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                                        <item.icon size={14} className="text-slate-500" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm text-slate-700 font-medium">{item.label}</p>
                                        <p className="text-[11px] text-slate-400 truncate">{item.desc}</p>
                                    </div>
                                </button>
                            )) : (
                                <div className="px-3 py-6 text-center text-sm text-slate-400">No results found</div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Right — notifications + user */}
            <div className="flex items-center gap-2">
                <button className="relative p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition">
                    <Bell size={18} />
                </button>

                <div className="flex items-center gap-2.5 ml-2 pl-3 border-l border-slate-200">
                    {user?.photoURL ? (
                        <img
                            src={user.photoURL}
                            alt={user.displayName || 'User'}
                            className="w-8 h-8 rounded-full object-cover ring-2 ring-slate-100"
                            referrerPolicy="no-referrer"
                        />
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-white text-xs font-bold ring-2 ring-slate-100">
                            {(user?.displayName || user?.email || 'A')[0].toUpperCase()}
                        </div>
                    )}
                    <div className="hidden md:block">
                        <p className="text-sm text-slate-800 font-medium leading-tight">{user?.displayName || 'Admin'}</p>
                        <p className="text-[11px] text-slate-500 leading-tight">{user?.email || ''}</p>
                    </div>
                </div>
            </div>
        </header>
    )
}



'use client'
import {
    Search,
    Heart,
    Stars,
    Person,
    BoxArrowRight,
    House,
    Grid,
    InfoCircle,
} from 'react-bootstrap-icons'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { assets } from '@/assets/assets'
import { useAuth } from '@/lib/auth-context'
import { isAdminEmail } from '@/lib/admin'
import toast from 'react-hot-toast'
import { usePostHog } from 'posthog-js/react'

const MOBILE_NAV = [
    { href: '/', label: 'Home', icon: House },
    { href: '/shop', label: 'Shop', icon: Grid },
    { href: '/ai-picks', label: 'AI', icon: Stars },
    { href: '/disclosure', label: 'Info', icon: InfoCircle },
]

const Navbar = () => {
    const router = useRouter()
    const pathname = usePathname()
    const [search, setSearch] = useState('')
    const [menuOpen, setMenuOpen] = useState(false)
    const [searchOpen, setSearchOpen] = useState(false)
    const menuRef = useRef(null)
    const desktopSearchRef = useRef(null)
    const mobileSearchRef = useRef(null)
    const wishlistCount = useSelector(state => state.wishlist?.ids?.length ?? 0)
    const products = useSelector(state => state.product?.list || [])
    const posthog = usePostHog()
    const { user, signOut } = useAuth()
    const name = user?.displayName || user?.email?.split('@')[0] || ''
    const avatar = user?.photoURL
    const isAdmin = user ? isAdminEmail(user.email) : false
    const deferredSearch = useDeferredValue(search)
    const normalizedSearch = deferredSearch.trim().toLowerCase()

    const suggestions = useMemo(() => {
        if (!searchOpen) return []
        const baseProducts = Array.isArray(products) ? products.filter(Boolean) : []
        if (baseProducts.length === 0) return []

        const query = normalizedSearch
        const indexedProducts = baseProducts.slice(0, 120).map(product => {
            const searchable = [
                product.title,
                product.name,
                product.brand,
                product.description,
                product.categories?.name,
                ...(Array.isArray(product.tags) ? product.tags : []),
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase()

            const title = (product.title || product.name || '').toLowerCase()
            const brand = (product.brand || '').toLowerCase()
            const category = (product.categories?.name || '').toLowerCase()

            return { product, searchable, title, brand, category }
        })

        if (!query) return indexedProducts.slice(0, 6).map(entry => ({ product: entry.product, score: 1 }))

        return indexedProducts
            .map(entry => {
                let score = 0
                if (entry.title.startsWith(query)) score += 50
                if (entry.title.includes(query)) score += 30
                if (entry.brand.startsWith(query)) score += 16
                if (entry.category.includes(query)) score += 12
                if (entry.searchable.includes(query)) score += 10
                return score > 0 ? { product: entry.product, score } : null
            })
            .filter(Boolean)
            .sort((a, b) => b.score - a.score)
            .slice(0, 6)
    }, [products, normalizedSearch, searchOpen])

    useEffect(() => {
        const handler = (e) => {
            const clickedMenu = menuRef.current && menuRef.current.contains(e.target)
            const clickedDesktopSearch = desktopSearchRef.current && desktopSearchRef.current.contains(e.target)
            const clickedMobileSearch = mobileSearchRef.current && mobileSearchRef.current.contains(e.target)

            if (!clickedMenu) setMenuOpen(false)
            if (!clickedDesktopSearch && !clickedMobileSearch) setSearchOpen(false)
        }

        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    const handleSearch = (e) => {
        e.preventDefault()
        const term = search.trim()
        if (!term) return

        posthog?.capture('search_submitted', { query: term, source: 'navbar' })
        setSearchOpen(false)
        router.push('/search?q=' + encodeURIComponent(term))
    }

    const openSuggestion = (product) => {
        setSearch(product.title || product.name || '')
        setSearchOpen(false)
        router.push(`/products/${product.id}`)
    }

    const handleSignOut = async () => {
        setMenuOpen(false)
        await signOut()
        toast.success('Signed out')
        router.push('/')
    }

    return (
        <>
            <nav className="sticky top-0 z-40 border-b border-slate-100 bg-white/95 backdrop-blur">
                <div className="mx-3 sm:mx-6">
                    <div className="flex items-center justify-between max-w-7xl mx-auto py-3 sm:py-4">
                        <Link href="/" className="flex items-center shrink-0">
                            <Image src={assets.tekpik_logo} alt="TEKPIK" width={132} height={44} className="h-10 sm:h-12 w-auto object-contain" />
                        </Link>

                        <div className="hidden sm:flex items-center gap-4 lg:gap-6 text-slate-600">
                            <Link href="/" className="hover:text-slate-900 transition text-sm">Home</Link>
                            <Link href="/shop" className="hover:text-slate-900 transition text-sm">Shop</Link>
                            <Link href="/ai-picks" className="flex items-center gap-1 hover:text-indigo-600 transition text-sm"><Stars size={14} /> AI Picks</Link>
                            <Link href="/disclosure" className="hover:text-slate-900 transition text-sm">Disclosure</Link>

                            <div ref={desktopSearchRef} className="relative hidden xl:block w-72">
                                <form onSubmit={handleSearch} className="flex items-center w-full text-sm gap-2 bg-slate-100 px-4 py-2 rounded-full border border-transparent focus-within:border-slate-300 focus-within:bg-white transition">
                                    <Search size={15} className="text-slate-400 shrink-0" />
                                    <input
                                        className="w-full bg-transparent outline-none placeholder-slate-400 text-sm"
                                        type="text"
                                        placeholder="Search products"
                                        value={search}
                                        onChange={e => {
                                            setSearch(e.target.value)
                                            setSearchOpen(true)
                                        }}
                                        onFocus={() => setSearchOpen(true)}
                                    />
                                </form>

                                {searchOpen && (
                                    <SuggestionDropdown
                                        products={products}
                                        suggestions={suggestions}
                                        normalizedSearch={normalizedSearch}
                                        search={search}
                                        handleSearch={handleSearch}
                                        openSuggestion={openSuggestion}
                                    />
                                )}
                            </div>

                            <Link href="/wishlist" className="relative text-slate-600 hover:text-red-500 transition">
                                <Heart size={20} />
                                {wishlistCount > 0 && <span className="absolute -top-1.5 -right-1.5 text-[9px] text-white bg-red-500 w-4 h-4 rounded-full flex items-center justify-center font-bold">{wishlistCount}</span>}
                            </Link>

                            {isAdmin && <Link href="/admin" className="px-4 py-1.5 text-xs font-medium border border-indigo-300 hover:bg-indigo-50 transition text-indigo-600 rounded-full">Admin</Link>}

                            {user ? (
                                <div className="relative" ref={menuRef}>
                                    <button onClick={() => setMenuOpen(v => !v)} className="flex items-center gap-2 text-sm text-slate-700 hover:text-slate-900 transition">
                                        {avatar ? <img src={avatar} alt={name} referrerPolicy="no-referrer" className="w-8 h-8 rounded-full object-cover ring-2 ring-indigo-100" /> : <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-sm">{name?.[0]?.toUpperCase() || 'A'}</div>}
                                        <span className="max-w-28 truncate text-sm">{name}</span>
                                    </button>
                                    {menuOpen && (
                                        <div className="absolute right-0 top-11 bg-white border border-slate-100 rounded-2xl shadow-xl py-2 w-52 z-50">
                                            <div className="px-4 py-2 border-b border-slate-100 mb-1">
                                                <p className="text-xs font-semibold text-slate-700 truncate">{name}</p>
                                                <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                                            </div>
                                            <Link href="/wishlist" onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition"><Heart size={14} /> Wishlist</Link>
                                            {isAdmin && <Link href="/admin" onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-sm text-indigo-600 hover:bg-indigo-50 transition"><Person size={14} /> Admin Panel</Link>}
                                            <button onClick={handleSignOut} className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition"><BoxArrowRight size={14} /> Sign Out</button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <Link href="/login" className="px-5 py-2 bg-indigo-500 hover:bg-indigo-600 transition text-white text-sm font-medium rounded-full">Login</Link>
                            )}
                        </div>

                        <div className="sm:hidden flex items-center gap-2">
                            <Link href="/wishlist" className="relative p-2 rounded-full border border-slate-200 bg-slate-50">
                                <Heart size={18} className="text-slate-700" />
                                {wishlistCount > 0 && <span className="absolute -top-1 -right-1 text-[8px] text-white bg-red-500 w-4 h-4 rounded-full flex items-center justify-center">{wishlistCount}</span>}
                            </Link>
                            {isAdmin && <Link href="/admin" className="px-2.5 py-1.5 text-[11px] border border-indigo-300 text-indigo-600 rounded-full">Admin</Link>}
                            {user ? (
                                <button onClick={handleSignOut} className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] text-red-500 border border-red-200 rounded-full">
                                    <BoxArrowRight size={12} /> Out
                                </button>
                            ) : (
                                <Link href="/login" className="px-3 py-1.5 bg-indigo-500 text-[11px] text-white rounded-full font-medium">Login</Link>
                            )}
                        </div>
                    </div>

                    <div ref={mobileSearchRef} className="sm:hidden pb-3 relative">
                        <form onSubmit={handleSearch} className="flex items-center gap-2 bg-slate-100 px-3 py-2.5 rounded-2xl border border-slate-200 focus-within:border-slate-300">
                            <Search size={15} className="text-slate-400 shrink-0" />
                            <input
                                className="w-full bg-transparent outline-none placeholder-slate-400 text-sm"
                                type="text"
                                placeholder="Search products"
                                value={search}
                                onChange={e => {
                                    setSearch(e.target.value)
                                    setSearchOpen(true)
                                }}
                                onFocus={() => setSearchOpen(true)}
                            />
                        </form>

                        {searchOpen && (
                            <div className="absolute top-full left-0 right-0 mt-2 z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                                <SuggestionDropdown
                                    products={products}
                                    suggestions={suggestions}
                                    normalizedSearch={normalizedSearch}
                                    search={search}
                                    handleSearch={handleSearch}
                                    openSuggestion={openSuggestion}
                                    mobile
                                />
                            </div>
                        )}
                    </div>
                </div>
            </nav>

            <div className="sm:hidden fixed bottom-0 inset-x-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur px-2 pb-[calc(env(safe-area-inset-bottom)+6px)] pt-2">
                <div className="grid grid-cols-4 gap-1">
                    {MOBILE_NAV.map(item => {
                        const active = item.href === '/' ? pathname === '/' : pathname?.startsWith(item.href)
                        const Icon = item.icon
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex flex-col items-center justify-center gap-1 rounded-xl py-2.5 text-[10px] font-semibold tracking-wide transition ${active ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-500 border border-slate-100'}`}
                            >
                                <Icon size={14} />
                                <span>{item.label}</span>
                            </Link>
                        )
                    })}
                </div>
            </div>
        </>
    )
}

function SuggestionDropdown({
    products,
    suggestions,
    normalizedSearch,
    search,
    handleSearch,
    openSuggestion,
    mobile = false,
}) {
    if (products.length === 0) {
        return <div className="px-4 py-5 text-sm text-slate-400">Loading suggestions...</div>
    }

    return (
        <>
            <div className={`flex items-center justify-between px-4 py-2 border-b border-slate-100 ${mobile ? 'bg-white' : 'bg-slate-50/80'}`}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">
                    {normalizedSearch ? 'Suggestions' : 'Popular products'}
                </p>
                {normalizedSearch && (
                    <button type="button" onClick={() => handleSearch({ preventDefault() {} })} className="text-[11px] text-indigo-600 hover:text-indigo-700">
                        Search all
                    </button>
                )}
            </div>

            {suggestions.length > 0 ? (
                <div className="max-h-80 overflow-auto py-1">
                    {suggestions.map(({ product }) => {
                        const title = product.title || product.name || 'Untitled product'
                        const image = product.imageUrls?.[0] || product.images?.[0] || product.image_urls?.[0]
                        return (
                            <button
                                key={product.id}
                                type="button"
                                onClick={() => openSuggestion(product)}
                                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition"
                            >
                                <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center">
                                    {image ? <img src={image} alt={title} className="h-full w-full object-cover" loading="lazy" referrerPolicy="no-referrer" /> : <span className="text-[10px] text-slate-400 uppercase">No image</span>}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-slate-800">{title}</p>
                                    <p className="truncate text-xs text-slate-400">{product.brand || product.categories?.name || 'Suggested product'}</p>
                                </div>
                                <div className="shrink-0 text-right">
                                    <p className="text-sm font-semibold text-slate-900">₹{product.price}</p>
                                </div>
                            </button>
                        )
                    })}
                </div>
            ) : (
                <div className="px-4 py-5 text-sm text-slate-400">No suggestions found.</div>
            )}

            {normalizedSearch && (
                <button
                    type="button"
                    onClick={handleSearch}
                    className="w-full border-t border-slate-100 px-4 py-3 text-left text-sm font-medium text-indigo-600 hover:bg-indigo-50 transition"
                >
                    Search for "{search.trim()}"
                </button>
            )}
        </>
    )
}

export default Navbar

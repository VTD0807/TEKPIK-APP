'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { 
    Grid1x2, BoxSeam, Link45deg, Tags, Images,
    Star, Robot, People, Gear,
    ChevronLeft, XLg, ArrowRepeat, ClockHistory 
} from 'react-bootstrap-icons'

const navItems = [
    { name: 'Dashboard', href: '/cms', icon: Grid1x2 },
    { name: 'Reports', href: '/cms/reports', icon: ClockHistory },
    { name: 'Products', href: '/cms/products', icon: BoxSeam },
    { name: 'Affiliate Links', href: '/cms/affiliate-links', icon: Link45deg },
    { name: 'Categories', href: '/cms/categories', icon: Tags },
    { name: 'Banners', href: '/cms/banners', icon: Images },
    { name: 'Reviews', href: '/cms/reviews', icon: Star },
    { name: 'AI Analysis', href: '/cms/ai-analysis', icon: Robot },
    { name: 'Users', href: '/cms/users', icon: People },
    { name: 'Product Updater', href: '/cms/product-updater', icon: ArrowRepeat },
    { name: 'Updater Logs', href: '/cms/product-updater/logs', icon: ClockHistory },
    { name: 'Storefront', href: '/cms/storefront', icon: Gear }
]

export default function CMSSidebar({ collapsed, onToggle }) {
    const pathname = usePathname()
    const navRef = useRef(null)

    useEffect(() => {
        if (!navRef.current) return
        navRef.current.scrollTop = 0
    }, [pathname])

    const isActive = (href) => {
        if (href === '/cms') return pathname === '/cms'
        return pathname.startsWith(href)
    }

    return (
        <>
            {/* Mobile overlay */}
            {!collapsed && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden" onClick={onToggle} />
            )}

            <aside className={`
                relative lg:sticky top-0 left-0 z-50 h-screen max-h-screen overflow-hidden
                bg-white border-r border-slate-200
                flex flex-col
                transition-all duration-300 ease-in-out
                ${collapsed ? '-translate-x-full lg:translate-x-0 lg:w-[72px]' : 'translate-x-0 w-[260px]'}
            `}>
                {/* Logo */}
                <div className={`flex items-center h-16 px-4 border-b border-slate-100 ${collapsed ? 'lg:justify-center' : 'justify-between'}`}>
                    {!collapsed && (
                        <Link href="/cms" className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center text-white font-bold text-sm shadow-sm">
                                T
                            </div>
                            <div>
                                <span className="text-slate-900 font-semibold text-sm tracking-wide">TEKPIK</span>
                                <span className="text-slate-700 text-[10px] block -mt-0.5 font-medium">CMS</span>
                            </div>
                        </Link>
                    )}
                    {collapsed && (
                        <div className="hidden lg:flex items-center justify-center">
                            <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center text-white font-bold text-sm shadow-sm">
                                T
                            </div>
                        </div>
                    )}
                    <button
                        onClick={onToggle}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition lg:hidden"
                    >
                        <XLg size={16} />
                    </button>
                    <button
                        onClick={onToggle}
                        className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                    >
                        <ChevronLeft size={14} className={`transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
                    </button>
                </div>

                {/* Nav */}
                <nav ref={navRef} className="flex-1 min-h-0 py-3 px-2 space-y-0.5 overflow-y-auto overscroll-contain no-scrollbar">
                    {navItems.map((item) => {
                        const active = isActive(item.href)
                        const Icon = item.icon
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => { if (window.innerWidth < 1024) onToggle?.() }}
                                className={`
                                    group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                                    transition-all duration-200
                                    ${active
                                        ? 'bg-black text-white'
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                                    }
                                    ${collapsed ? 'lg:justify-center lg:px-0' : ''}
                                `}
                                title={collapsed ? item.name : undefined}
                            >
                                {active && (
                                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-black rounded-r-full" />
                                )}
                                <Icon size={17} className={`shrink-0 ${active ? 'text-white' : 'text-slate-400 group-hover:text-slate-700'} transition`} />
                                {!collapsed && <span>{item.name}</span>}
                            </Link>
                        )
                    })}
                </nav>

                {/* Footer */}
                {!collapsed && (
                    <div className="p-3 border-t border-slate-100 mt-auto">
                        <div className="bg-white border border-slate-200 rounded-xl p-3">
                            <p className="text-[11px] text-slate-800 font-medium tracking-wide">TEKPIK MODULAR CMS</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">12 Active Nodes</p>
                        </div>
                    </div>
                )}
            </aside>
        </>
    )
}

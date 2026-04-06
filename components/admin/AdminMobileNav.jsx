'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Basket, Star, GraphUpArrow, SendFill, ClockHistory, PlusCircleFill } from 'react-bootstrap-icons'

const mobileLinks = [
    { name: 'Products', href: '/admin/products', icon: Basket },
    { name: 'Reviews', href: '/admin/reviews', icon: Star },
    { name: 'Price', href: '/admin/price-history', icon: GraphUpArrow },
    { name: 'Telegram', href: '/admin/integrations', icon: SendFill },
    { name: 'Logs', href: '/admin/product-updater/logs', icon: ClockHistory },
]

function isLinkActive(pathname = '', href = '') {
    if (href === '/admin') return pathname === '/admin'
    return pathname === href || pathname.startsWith(`${href}/`)
}

export default function AdminMobileNav() {
    const pathname = usePathname()

    return (
        <>
            <div className="lg:hidden fixed bottom-4 left-3 right-3 z-40 rounded-2xl border border-slate-200/80 bg-white/95 backdrop-blur-md shadow-[0_8px_30px_rgba(15,23,42,0.12)]">
                <div className="grid grid-cols-5 gap-0.5 px-2 py-2">
                    {mobileLinks.map((link) => {
                        const active = isLinkActive(pathname, link.href)
                        const Icon = link.icon

                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`flex flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[11px] font-medium transition ${active
                                    ? 'bg-slate-900 text-white'
                                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                                }`}
                            >
                                <Icon size={15} />
                                <span>{link.name}</span>
                            </Link>
                        )
                    })}
                </div>
            </div>

            <Link
                href="/admin/products/new"
                className="lg:hidden fixed bottom-24 right-5 z-50 inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-lg"
                aria-label="Add new product"
            >
                <PlusCircleFill size={16} />
                Add Product
            </Link>
        </>
    )
}

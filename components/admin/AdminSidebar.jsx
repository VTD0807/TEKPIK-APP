'use client'
import { usePathname } from "next/navigation"
import { 
    Speedometer2, PeopleFill, Gear, Database,
    Bell, Basket, Tag, Star, Stars, Eye, Megaphone, GeoAlt,
    ArrowRepeat, ClockHistory, GraphUpArrow, SendFill
} from "react-bootstrap-icons"
import Image from "next/image"
import Link from "next/link"
import { assets } from "@/assets/assets"

const AdminSidebar = () => {
    const pathname = usePathname()

    const sidebarLinks = [
        { name: 'Dashboard', href: '/admin', icon: Speedometer2 },
        { name: 'Products', href: '/admin/products', icon: Basket },
        { name: 'Categories', href: '/admin/categories', icon: Tag },
        { name: 'Reviews', href: '/admin/reviews', icon: Star },
        { name: 'AI Analysis', href: '/admin/ai-analysis', icon: Stars },
        { name: 'Users', href: '/admin/users', icon: PeopleFill },
        { name: 'Employee Access', href: '/admin/employees/access', icon: PeopleFill },
        { name: 'Employee Performance', href: '/admin/employees', icon: GraphUpArrow },
        { name: 'Work Assignments', href: '/admin/work-assignments', icon: GraphUpArrow },
        { name: 'User Analytics', href: '/admin/user-analytics', icon: GeoAlt },
        { name: 'Notify Users', href: '/admin/notifications', icon: Megaphone },
        { name: 'Analytics', href: '/admin/data', icon: Database },
        { name: 'Product Analytics', href: '/admin/data', icon: Eye },
        { name: 'Price History', href: '/admin/price-history', icon: GraphUpArrow },
        { name: 'Product Updater', href: '/admin/product-updater', icon: ArrowRepeat },
        { name: 'Updater Logs', href: '/admin/product-updater/logs', icon: ClockHistory },
        { name: 'Integrations', href: '/admin/integrations', icon: SendFill },
        { name: 'Settings', href: '/admin/settings', icon: Gear },
    ]

    const activeHref = getActiveHref(pathname, sidebarLinks)

    return (
        <div className="inline-flex h-full flex-col gap-5 border-r border-slate-200 sm:min-w-60">
            <div className="flex flex-col gap-3 justify-center items-center pt-8 max-sm:hidden">
                <Image className="w-14 h-14 rounded-full object-contain" src={assets.tekpik_logo} alt="TEKPIK" width={80} height={80} />
                <p className="text-slate-700 text-sm">Admin Panel</p>
            </div>

            <div className="max-sm:mt-6 flex-1 overflow-y-auto no-scrollbar pb-6">
                <div className="px-3 sm:px-0 space-y-1">
                    <p className="px-2 sm:px-5 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400 mb-2">Core</p>
                    {sidebarLinks.slice(0, 7).map((link, index) => {
                        const isActive = activeHref === link.href
                        return (
                        <Link key={index} href={link.href} className={`relative flex items-center gap-3 text-slate-500 hover:bg-slate-50 p-2.5 transition rounded-r-xl ${isActive && 'bg-slate-100 sm:text-slate-600'}`}>
                            <link.icon size={18} className="sm:ml-5" />
                            <p className="max-sm:hidden">{link.name}</p>
                            {isActive && <span className="absolute bg-black right-0 top-1.5 bottom-1.5 w-1 sm:w-1.5 rounded-l"></span>}
                        </Link>
                        )
                    })}

                    <p className="px-2 sm:px-5 pt-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400 mb-2">Engagement</p>
                    {sidebarLinks.slice(7, 13).map((link, index) => {
                        const isActive = activeHref === link.href
                        return (
                        <Link key={index + 100} href={link.href} className={`relative flex items-center gap-3 text-slate-500 hover:bg-slate-50 p-2.5 transition rounded-r-xl ${isActive && 'bg-slate-100 sm:text-slate-600'}`}>
                            <link.icon size={18} className="sm:ml-5" />
                            <p className="max-sm:hidden">{link.name}</p>
                            {isActive && <span className="absolute bg-black right-0 top-1.5 bottom-1.5 w-1 sm:w-1.5 rounded-l"></span>}
                        </Link>
                        )
                    })}

                    <p className="px-2 sm:px-5 pt-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400 mb-2">Settings</p>
                    {sidebarLinks.slice(13).map((link, index) => {
                        const isActive = activeHref === link.href
                        return (
                        <Link key={index + 200} href={link.href} className={`relative flex items-center gap-3 text-slate-500 hover:bg-slate-50 p-2.5 transition rounded-r-xl ${isActive && 'bg-slate-100 sm:text-slate-600'}`}>
                            <link.icon size={18} className="sm:ml-5" />
                            <p className="max-sm:hidden">{link.name}</p>
                            {isActive && <span className="absolute bg-black right-0 top-1.5 bottom-1.5 w-1 sm:w-1.5 rounded-l"></span>}
                        </Link>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

function getActiveHref(pathname, links) {
    if (!pathname) return null

    const matches = links.filter((link) => {
        if (link.href === '/admin') return pathname === '/admin'
        return pathname === link.href || pathname.startsWith(`${link.href}/`)
    })

    if (matches.length === 0) return null
    matches.sort((a, b) => b.href.length - a.href.length)
    return matches[0].href
}

export default AdminSidebar


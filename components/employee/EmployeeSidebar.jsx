'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    Speedometer2,
    Basket,
    Star,
    Megaphone,
    Database,
    PeopleFill,
    GraphUpArrow,
    Gear,
    Grid,
    Shop,
} from 'react-bootstrap-icons'

const ICONS = {
    dashboard: Speedometer2,
    products: Basket,
    reviews: Star,
    notifications: Megaphone,
    analytics: Database,
    users: PeopleFill,
    employees: GraphUpArrow,
    settings: Gear,
    cms: Grid,
    store: Shop,
}

export const EMPLOYEE_MODULE_LINKS = [
    { key: 'products', label: 'Products', href: '/e/products' },
    { key: 'reviews', label: 'Reviews', href: '/e/reviews' },
    { key: 'notifications', label: 'Notifications', href: '/e/notifications' },
    { key: 'analytics', label: 'Analytics', href: '/e/analytics' },
    { key: 'users', label: 'Users', href: '/e/users' },
    { key: 'employees', label: 'Employees', href: '/e/employees' },
    { key: 'settings', label: 'Settings', href: '/e/settings' },
    { key: 'cms', label: 'CMS', href: '/e/cms' },
    { key: 'store', label: 'Store', href: '/e/store' },
]

export function getAllowedEmployeeLinks(access = {}, isAdmin = false) {
    if (isAdmin) return EMPLOYEE_MODULE_LINKS
    return EMPLOYEE_MODULE_LINKS.filter((item) => Boolean(access?.[item.key]))
}

export function getModuleForEmployeePath(pathname = '') {
    if (!pathname.startsWith('/e')) return null
    if (pathname === '/e' || pathname === '/e/dashboard') return 'dashboard'

    const match = EMPLOYEE_MODULE_LINKS.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    return match?.key || null
}

export default function EmployeeSidebar({ links = [] }) {
    const pathname = usePathname()

    return (
        <div className="inline-flex h-full flex-col gap-4 border-r border-slate-200 sm:min-w-60">
            <div className="px-4 pt-6 pb-2 max-sm:hidden">
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Workspace</p>
            </div>

            <div className="px-3 sm:px-0 space-y-1 pb-6 overflow-y-auto no-scrollbar">
                <SidebarItem
                    href="/e/dashboard"
                    label="Dashboard"
                    icon={ICONS.dashboard}
                    active={pathname === '/e' || pathname === '/e/dashboard'}
                />

                {links.map((link) => (
                    <SidebarItem
                        key={link.href}
                        href={link.href}
                        label={link.label}
                        icon={ICONS[link.key] || Grid}
                        active={pathname === link.href || pathname.startsWith(`${link.href}/`)}
                    />
                ))}
            </div>
        </div>
    )
}

function SidebarItem({ href, label, icon: Icon, active }) {
    return (
        <Link
            href={href}
            className={`relative flex items-center gap-3 text-slate-500 hover:bg-slate-50 p-2.5 transition rounded-r-xl ${active ? 'bg-slate-100 sm:text-slate-700' : ''}`}
        >
            <Icon size={18} className="sm:ml-5" />
            <p className="max-sm:hidden">{label}</p>
            {active && <span className="absolute bg-black right-0 top-1.5 bottom-1.5 w-1 sm:w-1.5 rounded-l" />}
        </Link>
    )
}

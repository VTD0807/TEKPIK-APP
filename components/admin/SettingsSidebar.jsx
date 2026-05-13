'use client'
import { usePathname } from "next/navigation"
import Link from "next/link"
import { 
    ShieldExclamation, Database, SendFill, EnvelopeFill, ArrowRepeat, ClockHistory
} from "react-bootstrap-icons"

const SettingsSidebar = () => {
    const pathname = usePathname()

    const links = [
        { name: 'General', href: '/admin/settings', icon: Database, exact: true },
        { name: 'Downtime Manager', href: '/admin/settings/downtime', icon: ShieldExclamation },
        { name: 'Database Router', href: '/admin/settings/database-router', icon: Database },
        { name: 'Mail Manager', href: '/admin/settings/mail', icon: EnvelopeFill },
        { name: 'Integrations', href: '/admin/settings/integrations', icon: SendFill },
        { name: 'Product Updater', href: '/admin/settings/updater', icon: ArrowRepeat },
        { name: 'Updater Logs', href: '/admin/settings/updater/logs', icon: ClockHistory },
    ]

    return (
        <div className="w-64 border-r border-slate-200 bg-white h-full p-4 overflow-y-auto hidden md:block">
            <h2 className="text-lg font-semibold text-slate-800 mb-6">Settings</h2>
            <div className="space-y-1">
                {links.map((link, i) => {
                    const isActive = link.exact ? pathname === link.href : pathname.startsWith(link.href)
                    return (
                        <Link 
                            key={i} 
                            href={link.href}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium
                                ${isActive 
                                    ? 'bg-blue-50 text-blue-700' 
                                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                }
                            `}
                        >
                            <link.icon className={isActive ? 'text-blue-600' : 'text-slate-400'} size={18} />
                            {link.name}
                        </Link>
                    )
                })}
            </div>
        </div>
    )
}

export default SettingsSidebar

'use client'
import { usePathname } from "next/navigation"
import { 
    Speedometer2, PeopleFill, ShieldLock, Gear, Plug,
    LightningCharge, ShieldCheck, Palette, Database, Globe,
    Bell, HeartPulse 
} from "react-bootstrap-icons"
import Image from "next/image"
import Link from "next/link"
import { assets } from "@/assets/assets"

const AdminSidebar = () => {
    const pathname = usePathname()

    const sidebarLinks = [
        { name: 'Dashboard', href: '/admin', icon: Speedometer2 },
        { name: 'Users / Staff', href: '/admin/users', icon: PeopleFill },
        { name: 'Roles & Permissions', href: '/admin/roles', icon: ShieldLock },
        { name: 'Store Settings', href: '/admin/settings', icon: Gear },
        { name: 'API Integrations', href: '/admin/integrations', icon: Plug },
        { name: 'Webhooks', href: '/admin/webhooks', icon: LightningCharge },
        { name: 'Security', href: '/admin/security', icon: ShieldCheck },
        { name: 'Theme', href: '/admin/theme', icon: Palette },
        { name: 'Data Management', href: '/admin/data', icon: Database },
        { name: 'Localization', href: '/admin/localization', icon: Globe },
        { name: 'Notifications', href: '/admin/notifications', icon: Bell },
        { name: 'Platform Health', href: '/admin/health', icon: HeartPulse },
    ]

    return (
        <div className="inline-flex h-full flex-col gap-5 border-r border-slate-200 sm:min-w-60">
            <div className="flex flex-col gap-3 justify-center items-center pt-8 max-sm:hidden">
                <Image className="w-14 h-14 rounded-full object-contain" src={assets.tekpik_logo} alt="TEKPIK" width={80} height={80} />
                <p className="text-slate-700 text-sm">Admin Panel</p>
            </div>

            <div className="max-sm:mt-6">
                {sidebarLinks.map((link, index) => (
                    <Link key={index} href={link.href} className={`relative flex items-center gap-3 text-slate-500 hover:bg-slate-50 p-2.5 transition ${pathname.startsWith(link.href) && (link.href !== '/admin' || pathname === '/admin') && 'bg-slate-100 sm:text-slate-600'}`}>
                        <link.icon size={18} className="sm:ml-5" />
                        <p className="max-sm:hidden">{link.name}</p>
                        {pathname.startsWith(link.href) && (link.href !== '/admin' || pathname === '/admin') && <span className="absolute bg-black right-0 top-1.5 bottom-1.5 w-1 sm:w-1.5 rounded-l"></span>}
                    </Link>
                ))}
            </div>
        </div>
    )
}

export default AdminSidebar


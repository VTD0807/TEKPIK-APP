'use client'
import Link from "next/link"

import { useAuth } from "@/lib/auth-context"
import { assets } from "@/assets/assets"
import Image from "next/image"

const StoreNavbar = () => {
    const { user } = useAuth()
    const name = user?.displayName || user?.email?.split('@')[0] || 'Seller'

    return (
        <div className="flex items-center justify-between px-12 py-3 border-b border-slate-200 transition-all">
            <Link href="/" className="flex items-center gap-2">
                <Image src={assets.tekpik_logo} alt="TEKPIK" width={120} height={40} className="h-10 w-auto object-contain" />
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full text-white bg-green-500">Store</span>
            </Link>
            <div className="flex items-center gap-3">
                <span className="text-sm text-slate-600 font-medium">Hi, {name}</span>
                {user?.photoURL 
                    ? <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full border border-slate-100 shadow-sm" />
                    : <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-green-600 text-sm font-medium border border-green-100 shadow-sm">{name[0].toUpperCase()}</div>
                }
            </div>
        </div>
    )
}

export default StoreNavbar
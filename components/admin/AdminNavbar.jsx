'use client'
import Image from "next/image"
import Link from "next/link"
import { assets } from "@/assets/assets"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import { LogOutIcon } from "lucide-react"

const AdminNavbar = () => {
    const { user } = useAuth()
    const router = useRouter()

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        toast.success('Signed out')
        router.push('/login')
    }

    const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Admin'

    return (
        <div className="flex items-center justify-between px-8 py-3 border-b border-slate-200">
            <Link href="/" className="flex items-center gap-2">
                <Image src={assets.tekpik_logo} alt="TEKPIK" width={120} height={40} className="h-10 w-auto object-contain" />
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full text-white bg-indigo-500">Admin</span>
            </Link>
            <div className="flex items-center gap-3">
                {user?.user_metadata?.avatar_url
                    ? <img src={user.user_metadata.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                    : <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-sm font-medium">{name[0].toUpperCase()}</div>
                }
                <span className="text-sm text-slate-600 hidden sm:block">{name}</span>
                <button onClick={handleSignOut} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-500 transition px-2 py-1.5 rounded-lg hover:bg-red-50">
                    <LogOutIcon size={14} /> Sign out
                </button>
            </div>
        </div>
    )
}

export default AdminNavbar

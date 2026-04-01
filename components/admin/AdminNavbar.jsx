'use client'
import Image from "next/image"
import Link from "next/link"
import { assets } from "@/assets/assets"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import { BoxArrowRight } from "react-bootstrap-icons"

const AdminNavbar = () => {
    const { user, signOut } = useAuth()
    const router = useRouter()

    const handleSignOut = async () => {
        try {
            await signOut()
            toast.success('Signed out')
            router.push('/login')
        } catch (error) {
            console.error('Sign out error:', error)
            toast.error('Failed to sign out')
        }
    }

    const name = user?.displayName || user?.email?.split('@')[0] || 'Admin'

    return (
        <div className="flex items-center justify-between px-8 py-3 border-b border-slate-200">
            <Link href="/" className="flex items-center gap-2">
                <Image src={assets.tekpik_logo} alt="TEKPIK" width={120} height={40} className="h-10 w-auto object-contain" />
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full text-white bg-black">Admin</span>
            </Link>
            <div className="flex items-center gap-3">
                {user?.photoURL
                    ? <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full object-cover border border-slate-100 shadow-sm" />
                    : <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-900 text-sm font-medium border border-slate-200 shadow-sm">{name?.[0]?.toUpperCase() || 'A'}</div>
                }
                <span className="text-sm text-slate-600 hidden sm:block font-medium">{name}</span>
                <button onClick={handleSignOut} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-900 transition px-2 py-1.5 rounded-lg hover:bg-slate-100">
                    <BoxArrowRight size={14} /> Sign out
                </button>
            </div>
        </div>
    )
}

export default AdminNavbar


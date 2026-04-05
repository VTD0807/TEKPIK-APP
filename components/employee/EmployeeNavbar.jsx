'use client'
import Image from 'next/image'
import { assets } from '@/assets/assets'
import { BoxArrowRight } from 'react-bootstrap-icons'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export default function EmployeeNavbar() {
    const { user, signOut } = useAuth()
    const router = useRouter()

    const handleSignOut = async () => {
        await signOut()
        toast.success('Signed out')
        router.push('/')
    }

    return (
        <div className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-3">
                <Image className="w-8 h-8 rounded-full object-contain" src={assets.tekpik_logo} alt="TEKPIK" width={40} height={40} />
                <div>
                    <p className="text-sm font-semibold text-slate-800">Employee Panel</p>
                    <p className="text-[11px] text-slate-400">Assigned modules workspace</p>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                    <p className="text-xs text-slate-700 font-medium truncate max-w-52">{user?.displayName || user?.email || 'Employee'}</p>
                    <p className="text-[11px] text-slate-400">{user?.email || ''}</p>
                </div>
                <button
                    onClick={handleSignOut}
                    className="inline-flex items-center gap-2 px-3 py-2 text-xs border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition"
                >
                    <BoxArrowRight size={13} />
                    Sign Out
                </button>
            </div>
        </div>
    )
}

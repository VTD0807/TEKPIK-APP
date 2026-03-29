'use client'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { LogOutIcon, UserIcon } from 'lucide-react'
import toast from 'react-hot-toast'

export default function UserProfileCard() {
    const { user, signOut } = useAuth()
    const router = useRouter()

    if (!user) return null

    const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0]
    const avatar = user.user_metadata?.avatar_url
    const email = user.email

    const handleSignOut = async () => {
        await signOut()
        toast.success('Signed out')
        router.push('/')
    }

    return (
        <div className="flex items-center gap-3 bg-white border border-slate-100 rounded-2xl px-4 py-3 shadow-sm">
            {/* Avatar */}
            {avatar
                ? <img src={avatar} alt={name} referrerPolicy="no-referrer" className="w-10 h-10 rounded-full object-cover ring-2 ring-indigo-100" />
                : <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                    <UserIcon size={18} className="text-indigo-600" />
                  </div>
            }

            {/* Info */}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">Welcome, {name}</p>
                <p className="text-xs text-slate-400 truncate">{email}</p>
            </div>

            {/* Sign out */}
            <button
                onClick={handleSignOut}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-500 transition px-2 py-1.5 rounded-lg hover:bg-red-50"
            >
                <LogOutIcon size={14} />
                <span className="hidden sm:inline">Sign out</span>
            </button>
        </div>
    )
}

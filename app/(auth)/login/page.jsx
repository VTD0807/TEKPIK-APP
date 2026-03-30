'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { assets } from '@/assets/assets'
import { EyeIcon, EyeOffIcon, AlertCircleIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/lib/auth-context'

const GoogleIcon = () => (
    <svg width="18" height="18" viewBox="0 0 48 48">
        <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.7-.1-4z"/>
        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.1 18.9 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
        <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.4 35.6 26.8 36 24 36c-5.2 0-9.6-2.9-11.3-7.1l-6.5 5C9.6 39.6 16.3 44 24 44z"/>
        <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.9 2.4-2.5 4.4-4.6 5.8l6.2 5.2C40.8 35.5 44 30.2 44 24c0-1.3-.1-2.7-.4-4z"/>
    </svg>
)

function LoginForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const redirect = searchParams.get('redirect') || '/'
    const urlError = searchParams.get('error')

    const { signInWithGoogle, signInWithEmail } = useAuth()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPw, setShowPw] = useState(false)
    const [loading, setLoading] = useState(false)
    const [googleLoading, setGoogleLoading] = useState(false)
    const [error, setError] = useState(urlError ? decodeURIComponent(urlError) : '')

    const handleGoogle = async () => {
        setGoogleLoading(true)
        setError('')
        try {
            await signInWithGoogle()
            toast.success('Welcome!')
            setTimeout(() => { window.location.href = redirect }, 300)
        } catch (e) {
            console.error('Google sign-in error:', e)
            setError(e.message || 'Google sign-in failed')
            setGoogleLoading(false)
        }
    }

    const handleLogin = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        try {
            await signInWithEmail(email, password)
            toast.success('Welcome back!')
            setTimeout(() => { window.location.href = redirect }, 300)
        } catch (e) {
            console.error('Login error:', e)
            setError('Invalid email or password')
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-20">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-6">
                <div className="flex flex-col items-center gap-2">
                    <Image src={assets.tekpik_logo} alt="TEKPIK" width={120} height={40} className="h-10 w-auto object-contain" />
                    <p className="text-slate-500 text-sm">Sign in to your account</p>
                </div>

                {error && (
                    <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                        <AlertCircleIcon size={16} className="shrink-0 mt-0.5" />
                        <span>{error}</span>
                    </div>
                )}

                <button type="button" onClick={handleGoogle} disabled={googleLoading}
                    className="w-full flex items-center justify-center gap-3 border border-slate-200 rounded-xl py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 transition shadow-sm">
                    {googleLoading ? <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" /> : <GoogleIcon />}
                    {googleLoading ? 'Signing in...' : 'Continue with Google'}
                </button>

                <div className="flex items-center gap-3 text-xs text-slate-400">
                    <div className="flex-1 h-px bg-slate-200" /><span>or sign in with email</span><div className="flex-1 h-px bg-slate-200" />
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-slate-500">Email</label>
                        <input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:bg-white transition" placeholder="you@example.com" />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-slate-500">Password</label>
                        <div className="relative">
                            <input type={showPw ? 'text' : 'password'} required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:bg-white transition" placeholder="••••••••" />
                            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition">
                                {showPw ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                            </button>
                        </div>
                    </div>

                    <button type="submit" disabled={loading}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-3 text-sm font-semibold transition shadow-md shadow-indigo-100 disabled:opacity-60">
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                <p className="text-center text-sm text-slate-500">
                    Don't have an account? <Link href="/register" className="text-indigo-600 font-medium hover:underline">Sign up</Link>
                </p>
            </div>
        </div>
    )
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <LoginForm />
        </Suspense>
    )
}

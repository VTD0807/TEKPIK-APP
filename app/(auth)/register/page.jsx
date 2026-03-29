'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'
import Link from 'next/link'
import { assets } from '@/assets/assets'
import { EyeIcon, EyeOffIcon } from 'lucide-react'
import toast from 'react-hot-toast'

function RegisterForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const redirect = searchParams.get('redirect') || '/'

    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPw, setShowPw] = useState(false)
    const [loading, setLoading] = useState(false)

    const handleRegister = async (e) => {
        e.preventDefault()
        if (password.length < 6) return toast.error('Password must be at least 6 characters')
        setLoading(true)

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: name },
                // emailRedirectTo not needed — confirmation disabled in Supabase dashboard
            },
        })

        if (error) {
            toast.error(error.message)
            setLoading(false)
            return
        }

        // Send welcome email (fire and forget)
        fetch('/api/auth/welcome', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email }),
        }).catch(() => {})

        toast.success('Account created! Signing you in...')

        // Auto sign-in (works when email confirmation is disabled)
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        if (signInError) {
            // Fallback: redirect to login
            router.push(`/login?redirect=${redirect}`)
        } else {
            router.push(redirect)
            router.refresh()
        }
    }

    const handleGoogle = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback?redirect=${redirect}`,
            },
        })
        if (error) toast.error(error.message)
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-6">
                <div className="flex flex-col items-center gap-2">
                    <Image src={assets.tekpik_logo} alt="TEKPIK" width={120} height={40} className="h-10 w-auto object-contain" />
                    <p className="text-slate-500 text-sm">Create your account</p>
                </div>

                <button
                    type="button"
                    onClick={handleGoogle}
                    className="w-full flex items-center justify-center gap-3 border border-slate-200 rounded-xl py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition"
                >
                    <svg width="18" height="18" viewBox="0 0 48 48">
                        <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.7-.1-4z"/>
                        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.1 18.9 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
                        <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.4 35.6 26.8 36 24 36c-5.2 0-9.6-2.9-11.3-7.1l-6.5 5C9.6 39.6 16.3 44 24 44z"/>
                        <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.9 2.4-2.5 4.4-4.6 5.8l6.2 5.2C40.8 35.5 44 30.2 44 24c0-1.3-.1-2.7-.4-4z"/>
                    </svg>
                    Continue with Google
                </button>

                <div className="flex items-center gap-3 text-xs text-slate-400">
                    <div className="flex-1 h-px bg-slate-200" />
                    <span>or</span>
                    <div className="flex-1 h-px bg-slate-200" />
                </div>

                <form onSubmit={handleRegister} className="space-y-4">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-slate-500">Full Name</label>
                        <input
                            type="text"
                            required
                            autoComplete="name"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-400 transition"
                            placeholder="John Doe"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-slate-500">Email</label>
                        <input
                            type="email"
                            required
                            autoComplete="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-400 transition"
                            placeholder="you@example.com"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-slate-500">Password</label>
                        <div className="relative">
                            <input
                                type={showPw ? 'text' : 'password'}
                                required
                                autoComplete="new-password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-400 transition pr-10"
                                placeholder="Min 6 characters"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPw(v => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                {showPw ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                            </button>
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2.5 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 text-white text-sm font-medium rounded-xl transition"
                    >
                        {loading ? 'Creating account...' : 'Create Account'}
                    </button>
                </form>

                <p className="text-center text-sm text-slate-500">
                    Already have an account?{' '}
                    <Link href={`/login?redirect=${redirect}`} className="text-indigo-500 hover:underline font-medium">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    )
}

export default function RegisterPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>}>
            <RegisterForm />
        </Suspense>
    )
}
'use client'
import React, { useState } from 'react'
import Title from './Title'
import toast from 'react-hot-toast'

const Newsletter = () => {
    const [email, setEmail] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [subscribed, setSubscribed] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        const trimmed = email.trim()
        if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
            toast.error('Please enter a valid email address.')
            return
        }

        setSubmitting(true)
        try {
            const res = await fetch('/api/newsletter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: trimmed }),
            })
            if (res.ok) {
                setSubscribed(true)
                setEmail('')
                toast.success('You\'re subscribed! 🎉')
            } else {
                const data = await res.json().catch(() => ({}))
                toast.error(data.error || 'Something went wrong. Try again.')
            }
        } catch {
            toast.error('Network error. Please try again.')
        } finally {
            setSubmitting(false)
        }
    }

    if (subscribed) {
        return (
            <div className='flex flex-col items-center mx-4 sm:mx-6 my-16 sm:my-24'>
                <div className="text-center space-y-3">
                    <div className="text-4xl">✉️</div>
                    <h2 className="text-2xl font-semibold text-slate-800">You&apos;re on the list!</h2>
                    <p className="text-sm text-slate-500 max-w-sm mx-auto">
                        Thanks for subscribing. We&apos;ll send you the best deals and new arrivals straight to your inbox.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className='flex flex-col items-center mx-4 sm:mx-6 my-16 sm:my-24'>
            <Title title="Join Newsletter" description="Subscribe to get exclusive deals, new arrivals, and insider updates delivered straight to your inbox every week." visibleButton={false} />
            <form onSubmit={handleSubmit} className='flex flex-col sm:flex-row gap-2 bg-slate-50 text-sm p-2 rounded-2xl sm:rounded-full w-full max-w-xl my-8 sm:my-10 border border-slate-200'>
                <input
                    className='flex-1 px-4 py-3 sm:py-0 sm:pl-5 outline-none bg-transparent placeholder-slate-400'
                    type="email"
                    placeholder='Enter your email address'
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={submitting}
                />
                <button
                    type="submit"
                    disabled={submitting}
                    className='font-medium bg-emerald-500 text-white px-6 py-3 rounded-xl sm:rounded-full hover:bg-emerald-600 active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed'
                >
                    {submitting ? 'Subscribing...' : 'Get Updates'}
                </button>
            </form>
        </div>
    )
}

export default Newsletter

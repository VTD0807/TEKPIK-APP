'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { getDeviceId } from '@/lib/device'

export default function Home() {
    const router = useRouter()
    const [search, setSearch] = useState('')

    const handleSearch = async (e) => {
        e.preventDefault()
        if (!search.trim()) return
        
        const deviceId = getDeviceId()
        await fetch('/api/analytics/product-interaction', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                eventType: 'search_query',
                searchQuery: search,
                deviceId,
            })
        }).catch(() => {})

        router.push(`/shop?search=${encodeURIComponent(search)}`)
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-white">
            {/* Logo Section */}
            <div className="mb-12 mt-12">
                <div className="flex items-center gap-2 justify-center">
                    <Image
                        src="/logo-tekpik.png"
                        alt="TEKPIK"
                        width={120}
                        height={60}
                        priority
                        className="h-16 w-auto"
                    />
                    <h1 className="text-5xl font-light text-slate-800 tracking-tight">TEKPIK</h1>
                </div>
                <p className="text-center text-slate-600 text-lg mt-2">Shop smarter with AI-powered product discovery</p>
            </div>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="w-full max-w-2xl px-6 mb-12">
                <div className="flex shadow-lg rounded-full border border-slate-300 bg-white hover:shadow-xl transition-shadow">
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search products..."
                        className="flex-1 px-6 py-4 rounded-full outline-none text-lg"
                    />
                    <button
                        type="submit"
                        className="px-8 py-4 text-blue-600 hover:text-blue-800 font-semibold"
                    >
                        Search
                    </button>
                </div>
            </form>

            {/* Quick Links */}
            <div className="flex gap-6 mb-16">
                <Link href="/ai-picks" className="text-blue-600 hover:underline font-medium">
                    AI Picks
                </Link>
                <Link href="/shop" className="text-blue-600 hover:underline font-medium">
                    Browse Shop
                </Link>
                <Link href="/help" className="text-blue-600 hover:underline font-medium">
                    Help
                </Link>
            </div>

            {/* Footer */}
            <div className="absolute bottom-0 left-0 right-0 bg-slate-100 border-t border-slate-300 py-4">
                <div className="max-w-4xl mx-auto px-6 flex justify-between text-sm text-slate-600">
                    <div className="flex gap-6">
                        <Link href="/disclosure" className="hover:text-blue-600">
                            Affiliate Disclosure
                        </Link>
                        <Link href="/about" className="hover:text-blue-600">
                            About
                        </Link>
                    </div>
                    <p>© 2026 TEKPIK</p>
                </div>
            </div>
        </div>
    )
}

'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { assets } from '@/assets/assets'

export default function Error({ error, reset }) {
    const [details, setDetails] = useState(false)

    return (
        <div className="min-h-screen flex flex-col bg-white">
            {/* Navbar */}
            <nav className="border-b border-slate-200 py-4 px-6">
                <div className="max-w-7xl mx-auto flex items-center gap-3">
                    <Image
                        src={assets.tekpik_logo}
                        alt="TEKPIK"
                        width={120}
                        height={40}
                        className="h-8 w-auto object-contain"
                    />
                </div>
            </nav>

            {/* Error Content */}
            <div className="flex-1 flex items-center justify-center px-6 py-16">
                <div className="text-center max-w-md space-y-6">
                    {/* Error Icon */}
                    <div className="flex justify-center py-8">
                        <div className="text-6xl">⚠️</div>
                    </div>

                    {/* Error Message */}
                    <div className="space-y-2">
                        <h1 className="text-4xl font-semibold text-slate-900">
                            Oops! Something went wrong
                        </h1>
                        <p className="text-lg text-slate-600">
                            We encountered an unexpected error. Please try again or contact support.
                        </p>
                    </div>

                    {/* Error Details */}
                    {process.env.NODE_ENV === 'development' && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-left">
                            <button
                                onClick={() => setDetails(!details)}
                                className="w-full text-sm font-semibold text-red-900 hover:underline text-left"
                            >
                                {details ? '▼' : '▶'} Error Details (Development)
                            </button>
                            {details && (
                                <pre className="text-xs text-red-700 mt-3 overflow-auto max-h-40 bg-white p-2 rounded border border-red-300">
                                    {error?.message || 'Unknown error'}
                                </pre>
                            )}
                        </div>
                    )}

                    {/* Suggestions */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                        <p className="text-sm font-semibold text-slate-900">
                            Try these options:
                        </p>
                        <ul className="text-sm text-slate-700 space-y-2">
                            <li>• Refresh the page</li>
                            <li>• Clear your browser cache</li>
                            <li>• Try again in a few moments</li>
                            <li>• Contact our support team</li>
                        </ul>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                        <button
                            onClick={() => reset()}
                            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
                        >
                            Try Again
                        </button>
                        <Link
                            href="/"
                            className="px-6 py-2.5 border border-slate-300 hover:bg-slate-100 text-slate-900 font-semibold rounded-lg transition inline-block"
                        >
                            Go Home
                        </Link>
                    </div>

                    {/* Help Links */}
                    <div className="flex justify-center gap-6 text-sm">
                        <a href="mailto:support@tekpik.in" className="text-blue-600 hover:underline">
                            Contact Support
                        </a>
                        <Link href="/help" className="text-blue-600 hover:underline">
                            Help Center
                        </Link>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-200 bg-slate-50 py-4 px-6">
                <div className="max-w-7xl mx-auto flex justify-between items-center text-sm text-slate-600">
                    <p>© 2026 TEKPIK</p>
                    <div className="flex gap-6">
                        <Link href="/disclosure" className="hover:text-blue-600">
                            Disclosure
                        </Link>
                        <Link href="/about" className="hover:text-blue-600">
                            About
                        </Link>
                        <Link href="/help" className="hover:text-blue-600">
                            Help
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}

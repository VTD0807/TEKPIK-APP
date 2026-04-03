import Image from 'next/image'
import Link from 'next/link'
import { assets } from '@/assets/assets'

export const metadata = {
    title: '404 - Page Not Found - TEKPIK',
    description: 'The page you are looking for does not exist.',
}

export default function NotFound() {
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

            {/* 404 Content */}
            <div className="flex-1 flex items-center justify-center px-6 py-16">
                <div className="text-center max-w-md space-y-6">
                    {/* Large 404 */}
                    <div className="space-y-2">
                        <div className="text-9xl font-light text-slate-300">404</div>
                        <h1 className="text-4xl font-semibold text-slate-900">Not Found</h1>
                        <p className="text-lg text-slate-600">
                            The page you're looking for doesn't exist or has been removed.
                        </p>
                    </div>

                    {/* Empty Cart Icon */}
                    <div className="flex justify-center py-8">
                        <div className="relative w-32 h-32">
                            <svg
                                className="w-full h-full text-slate-300"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={1}
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-4xl">🔍</span>
                            </div>
                        </div>
                    </div>

                    {/* Suggestions */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                        <p className="text-sm font-semibold text-slate-900">
                            What you can do:
                        </p>
                        <ul className="text-sm text-slate-700 space-y-2">
                            <li>• Check the URL for typos</li>
                            <li>• Return to the previous page</li>
                            <li>• Search for products</li>
                            <li>• Contact support if the issue persists</li>
                        </ul>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                        <Link
                            href="/"
                            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition inline-block"
                        >
                            Go Home
                        </Link>
                        <Link
                            href="/shop"
                            className="px-6 py-2.5 border border-slate-300 hover:bg-slate-100 text-slate-900 font-semibold rounded-lg transition inline-block"
                        >
                            Browse Shop
                        </Link>
                    </div>

                    {/* Help Links */}
                    <div className="flex justify-center gap-6 text-sm">
                        <Link href="/help" className="text-blue-600 hover:underline">
                            Help Center
                        </Link>
                        <Link href="/ai-picks" className="text-blue-600 hover:underline">
                            AI Picks
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

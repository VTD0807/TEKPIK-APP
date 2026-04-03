'use client'

import Link from 'next/link'
import AIGeneratedResults from '@/components/AIGeneratedResults'
import { useState } from 'react'

export default function HelpPageClient() {
    const [selectedFAQ, setSelectedFAQ] = useState(null)

    const faqs = [
        {
            id: 'what-is-tekpik',
            q: 'What is TEKPIK?',
            a: 'TEKPIK is a smart product discovery platform powered by AI. We help you find the best tech products by combining AI-generated analysis, community reviews, price comparisons, and personalized recommendations.'
        },
        {
            id: 'ai-analysis',
            q: 'How does the AI analysis work?',
            a: 'Our AI analyzes thousands of product details including specs, reviews, and features to provide you with honest, neutral assessments. Each product gets a comprehensive breakdown of strengths, weaknesses, and best-for scenarios.'
        },
        {
            id: 'save-products',
            q: 'How can I save products?',
            a: 'Browse any product and click the heart icon to add it to your wishlist. Your wishlist is saved to your account and synced across devices. You can access it anytime from your profile.'
        },
        {
            id: 'personalization',
            q: 'How does personalized ranking work?',
            a: 'TEKPIK learns from your behavior. As you browse, click products, add items to wishlists, and search, our system learns your preferences and ranks products accordingly. This means the shop and feed get smarter over time.'
        },
        {
            id: 'data-privacy',
            q: 'Do you sell my personal data?',
            a: 'No. We collect minimal data (name, email, profile picture from Google sign-in) and never sell it to third parties. We only use it to identify your account and optionally send product updates.'
        },
        {
            id: 'affiliate-links',
            q: 'How do affiliate links work?',
            a: 'Many product links earn us a small commission at no extra cost to you. This helps keep TEKPIK free. Learn more in our affiliate disclosure.'
        },
        {
            id: 'delete-account',
            q: 'Can I delete my account?',
            a: 'Yes. You can delete your account anytime from your profile settings. Your data will be permanently removed. Contact support@tekpik.in if you need assistance.'
        },
        {
            id: 'feedback',
            q: 'How do I report a problem or suggest a feature?',
            a: 'Email us at support@tekpik.in with your feedback. We read every message and would love to hear your suggestions for improving TEKPIK.'
        },
    ]

    return (
        <div className="min-h-screen bg-white text-slate-800">
            {/* Header Section */}
            <div className="max-w-4xl mx-auto px-6 py-8 border-b border-slate-200">
                <h1 className="text-4xl font-bold text-slate-900 mb-2">Help Center</h1>
                <p className="text-lg text-slate-600">Answers to your questions about TEKPIK and AI-powered product discovery</p>
            </div>

            {/* AI Result for selected FAQ */}
            {selectedFAQ && (
                <div className="max-w-4xl mx-auto px-6 py-8">
                    <AIGeneratedResults 
                        query={selectedFAQ.q}
                        products={[]}
                    />
                </div>
            )}

            {/* FAQ Results Section */}
            <div className="max-w-4xl mx-auto px-6 py-8 space-y-4">
                {faqs.map((faq) => (
                    <div 
                        key={faq.id}
                        onClick={() => setSelectedFAQ(selectedFAQ?.id === faq.id ? null : faq)}
                        className={`border rounded-lg p-4 cursor-pointer transition ${
                            selectedFAQ?.id === faq.id
                                ? 'border-blue-500 bg-blue-50 shadow-md'
                                : 'border-slate-100 hover:bg-slate-50 hover:shadow-sm'
                        }`}
                    >
                        <h3 className="text-lg font-medium text-blue-600 hover:underline mb-2">
                            {faq.q}
                        </h3>
                        {selectedFAQ?.id !== faq.id && (
                            <p className="text-sm text-slate-600 line-clamp-2">
                                {faq.a}
                            </p>
                        )}
                        {selectedFAQ?.id === faq.id && (
                            <p className="text-sm text-slate-700 leading-relaxed mb-2">
                                {faq.a}
                            </p>
                        )}
                        <div className="text-xs text-slate-500 mt-2">
                            <span className="text-blue-600 hover:underline">tekpik.in/help</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Contact Section */}
            <div className="max-w-4xl mx-auto px-6 py-12 border-t border-slate-200 space-y-6">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
                    <h2 className="text-xl font-semibold text-slate-900 mb-2">Still have questions?</h2>
                    <p className="text-slate-700 mb-4">
                        Our support team is here to help. Send us an email and we'll get back to you within 24 hours.
                    </p>
                    <a 
                        href="mailto:support@tekpik.in" 
                        className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition"
                    >
                        Contact Support
                    </a>
                </div>

                <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-slate-900">Other Resources</h3>
                    <ul className="space-y-2 text-sm">
                        <li>
                            <Link href="/disclosure" className="text-blue-600 hover:underline font-medium">
                                Affiliate Disclosure
                            </Link>
                            <p className="text-slate-600">Learn how our affiliate program works</p>
                        </li>
                        <li>
                            <Link href="/shop" className="text-blue-600 hover:underline font-medium">
                                Browse Products
                            </Link>
                            <p className="text-slate-600">Discover tech products with AI analysis</p>
                        </li>
                        <li>
                            <Link href="/ai-picks" className="text-blue-600 hover:underline font-medium">
                                AI Picks
                            </Link>
                            <p className="text-slate-600">See our best AI-curated recommendations</p>
                        </li>
                    </ul>
                </div>
            </div>

            <footer className="border-t border-slate-200 text-center py-6 text-xs text-slate-500">
                <p>© 2026 TEKPIK. All rights reserved.</p>
                <p>Last updated: April 2026</p>
            </footer>
        </div>
    )
}

'use client'

import Link from 'next/link'
import ProductCard from '@/components/ProductCard'
import { useEffect, useMemo, useState } from 'react'

export default function HelpPageClient() {
    const [selectedFAQ, setSelectedFAQ] = useState(null)
    const [products, setProducts] = useState([])
    const [loadingProducts, setLoadingProducts] = useState(true)
    const [productError, setProductError] = useState(null)

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

    useEffect(() => {
        let cancelled = false

        const loadProducts = async () => {
            try {
                setLoadingProducts(true)
                const response = await fetch('/api/products?limit=160&sort=price_asc', {
                    cache: 'no-store',
                })

                if (!response.ok) {
                    throw new Error('Failed to load products')
                }

                const data = await response.json()
                if (!cancelled) {
                    setProducts(Array.isArray(data.products) ? data.products : [])
                    setProductError(null)
                }
            } catch (error) {
                if (!cancelled) {
                    setProducts([])
                    setProductError(error.message || 'Failed to load products')
                }
            } finally {
                if (!cancelled) setLoadingProducts(false)
            }
        }

        loadProducts()

        return () => {
            cancelled = true
        }
    }, [])

    const featuredProducts = useMemo(() => {
        const safeProducts = Array.isArray(products) ? products.filter(Boolean) : []
        if (safeProducts.length === 0) return []

        const toPrice = (product) => {
            const price = Number(product?.price)
            return Number.isFinite(price) ? price : Number.POSITIVE_INFINITY
        }

        const categoryKeyFor = (product) => {
            const categoryName = product?.categories?.name || product?.category || ''
            const categorySlug = product?.categories?.slug || ''
            return String(categorySlug || categoryName || 'uncategorized').toLowerCase().trim()
        }

        const grouped = new Map()
        for (const product of safeProducts) {
            const key = categoryKeyFor(product)
            const existing = grouped.get(key)
            if (!existing || toPrice(product) < toPrice(existing)) {
                grouped.set(key, product)
            }
        }

        const categoryPicks = Array.from(grouped.values())
            .filter((product) => Number.isFinite(Number(product?.price)) && Number(product.price) > 0)
            .sort((a, b) => Number(a.price) - Number(b.price))

        const lowPricePool = [...safeProducts]
            .filter((product) => Number.isFinite(Number(product?.price)) && Number(product.price) > 0)
            .sort((a, b) => Number(a.price) - Number(b.price))
            .slice(0, Math.max(12, categoryPicks.length))

        const shuffle = (list) => {
            const copy = [...list]
            for (let index = copy.length - 1; index > 0; index -= 1) {
                const randomIndex = Math.floor(Math.random() * (index + 1))
                const temp = copy[index]
                copy[index] = copy[randomIndex]
                copy[randomIndex] = temp
            }
            return copy
        }

        const selected = []
        const seenIds = new Set()

        for (const product of shuffle(categoryPicks)) {
            if (selected.length >= 8) break
            if (!seenIds.has(product.id)) {
                selected.push(product)
                seenIds.add(product.id)
            }
        }

        for (const product of shuffle(lowPricePool)) {
            if (selected.length >= 8) break
            if (!seenIds.has(product.id)) {
                selected.push(product)
                seenIds.add(product.id)
            }
        }

        return shuffle(selected).slice(0, 8)
    }, [products])

    return (
        <div className="min-h-screen bg-white text-slate-800">
            <div className="max-w-4xl mx-auto px-6 py-8 border-b border-slate-200">
                <h1 className="text-4xl font-bold text-slate-900 mb-2">Help Center</h1>
                <p className="text-lg text-slate-600">
                    Answers to your questions about TEKPIK and low-price products across categories
                </p>
            </div>

            <div className="max-w-6xl mx-auto px-6 py-8">
                <div className="flex items-end justify-between gap-4 mb-5">
                    <div>
                        <h2 className="text-2xl font-semibold text-slate-900">Random low-price picks</h2>
                        <p className="text-sm text-slate-600">
                            A mixed set of affordable products from different categories.
                        </p>
                    </div>
                    <Link href="/shop" className="text-sm font-medium text-blue-600 hover:underline">
                        Browse all products
                    </Link>
                </div>

                {loadingProducts ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
                        {Array.from({ length: 8 }).map((_, index) => (
                            <div key={index} className="h-56 rounded-lg bg-slate-100 animate-pulse" />
                        ))}
                    </div>
                ) : productError ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        {productError}
                    </div>
                ) : featuredProducts.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
                        {featuredProducts.map((product) => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>
                ) : (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                        No products found yet.
                    </div>
                )}
            </div>

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
                        {selectedFAQ?.id !== faq.id ? (
                            <p className="text-sm text-slate-600 line-clamp-2">
                                {faq.a}
                            </p>
                        ) : (
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

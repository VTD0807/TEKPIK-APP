'use client'
import { Stars } from 'react-bootstrap-icons'
import { useSelector } from 'react-redux'
import ProductCard from '@/components/ProductCard'
import AffiliateDisclosure from '@/components/AffiliateDisclosure'

export default function AiPicksPage() {
    const products = useSelector(state => state.product.list)

    // Products with AI analysis, sorted by score desc
    const aiProducts = products
        .filter(p => p.aiAnalysis?.score)
        .sort((a, b) => b.aiAnalysis.score - a.aiAnalysis.score)

    // If no AI analyses yet, show all products
    const display = aiProducts.length > 0 ? aiProducts : products

    return (
        <div className="max-w-7xl mx-auto px-6 py-10 space-y-6">
            <div className="flex items-center gap-2 text-indigo-700">
                <Stars size={22} />
                <h1 className="text-2xl font-semibold">AI Picks</h1>
            </div>
            <p className="text-slate-500 text-sm max-w-xl">
                Products curated and scored by our AI analyser. Higher scores mean better value, quality, and honest pros/cons breakdowns.
            </p>

            <AffiliateDisclosure />

            {display.length === 0 ? (
                <div className="text-center py-20 text-slate-400">No AI-analysed products yet.</div>
            ) : (
                <div className="grid grid-cols-2 sm:flex flex-wrap gap-6 xl:gap-10">
                    {display.map(p => <ProductCard key={p.id} product={p} />)}
                </div>
            )}
        </div>
    )
}

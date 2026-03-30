import Image from 'next/image'
import { ExternalLinkIcon, StarIcon } from 'lucide-react'
import AiAnalysis from '@/components/ai/AiAnalysis'
import ReviewList from '@/components/reviews/ReviewList'
import AffiliateDisclosure from '@/components/AffiliateDisclosure'
import WishlistButton from '@/components/WishlistButton'
import ProductImageGallery from '@/components/ProductImageGallery'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'

export async function generateMetadata({ params }) {
    const { id } = await params
    const supabase = await createSupabaseServerClient()
    const { data: product } = await supabase.from('products').select('title, description').eq('id', id).single()

    if (!product) return { title: 'Product Not Found' }

    return {
        title: `${product.title} - TEKPIK`,
        description: product.description?.slice(0, 160),
        openGraph: {
            title: product.title,
            description: product.description?.slice(0, 160),
        },
    }
}

export default async function ProductPage({ params }) {
    const { id } = await params
    const supabase = await createSupabaseServerClient()

    const { data: product, error } = await supabase
        .from('products')
        .select('*, categories(name,slug), ai_analysis(*), reviews(id,author_name,rating,title,body,pros,cons,is_verified,helpful,created_at)')
        .eq('id', id)
        .eq('reviews.is_approved', true)
        .single()

    if (error || !product) notFound()

    const images = product.imageUrls || product.images || []
    const rating = product.reviews?.length
        ? (product.reviews.reduce((s, r) => s + r.rating, 0) / product.reviews.length).toFixed(1)
        : null

    return (
        <div className="max-w-6xl mx-auto px-6 py-10 space-y-10">
            <AffiliateDisclosure />

            {/* Product hero */}
            <div className="grid md:grid-cols-2 gap-10">
                <ProductImageGallery images={images} title={product.title} />

                {/* Info */}
                <div className="space-y-4">
                    {product.brand && <p className="text-xs text-slate-400 uppercase tracking-widest">{product.brand}</p>}
                    <h1 className="text-2xl font-semibold text-slate-800">{product.title}</h1>

                    {rating && (
                        <div className="flex items-center gap-2">
                            <div className="flex">
                                {Array(5).fill('').map((_, i) => (
                                    <StarIcon key={i} size={16} className="text-transparent" fill={parseFloat(rating) >= i + 1 ? '#f59e0b' : '#e2e8f0'} />
                                ))}
                            </div>
                            <span className="text-sm text-slate-500">{rating} ({product.reviews.length} reviews)</span>
                        </div>
                    )}

                    <div className="flex items-baseline gap-3">
                        <span className="text-3xl font-bold text-slate-800">${product.price}</span>
                        {product.originalPrice && (
                            <>
                                <span className="text-lg text-slate-400 line-through">${product.originalPrice}</span>
                                {product.discount > 0 && <span className="text-sm bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">-{product.discount}%</span>}
                            </>
                        )}
                    </div>
                    <p className="text-xs text-slate-400">Price may vary. Check current price on Amazon.</p>

                    <p className="text-slate-600 text-sm leading-relaxed">{product.description}</p>

                    <div className="flex items-center gap-3 pt-2">
                        <a
                            href={product.affiliateUrl || '#'}
                            target="_blank"
                            rel="noopener noreferrer sponsored"
                            className="flex items-center gap-2 px-6 py-3 bg-amber-400 hover:bg-amber-500 transition text-slate-900 font-semibold rounded-full"
                        >
                            <ExternalLinkIcon size={16} />
                            View on Amazon
                        </a>
                        <WishlistButton productId={product.id} />
                    </div>

                    <AffiliateDisclosure variant="inline" />
                </div>
            </div>

            {/* AI Analysis */}
            {product.ai_analysis && <AiAnalysis analysis={product.ai_analysis} />}

            {/* Reviews */}
            <ReviewList reviews={product.reviews || []} productId={product.id} />
        </div>
    )
}

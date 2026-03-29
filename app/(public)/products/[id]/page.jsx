'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import { ExternalLinkIcon, StarIcon } from 'lucide-react'
import AiAnalysis from '@/components/ai/AiAnalysis'
import ReviewList from '@/components/reviews/ReviewList'
import AffiliateDisclosure from '@/components/AffiliateDisclosure'
import WishlistButton from '@/components/WishlistButton'
import Loading from '@/components/Loading'

export default function ProductPage() {
    const { id } = useParams()
    const [product, setProduct] = useState(null)
    const [activeImg, setActiveImg] = useState(0)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch(`/api/products/${id}`)
            .then(r => r.json())
            .then(data => { setProduct(data); setLoading(false) })
            .catch(() => setLoading(false))
    }, [id])

    if (loading) return <Loading />
    if (!product) return <div className="min-h-screen flex items-center justify-center text-slate-500">Product not found.</div>

    const images = product.imageUrls || product.images || []
    const rating = product.reviews?.length
        ? (product.reviews.reduce((s, r) => s + r.rating, 0) / product.reviews.length).toFixed(1)
        : null

    return (
        <div className="max-w-6xl mx-auto px-6 py-10 space-y-10">
            <AffiliateDisclosure />

            {/* Product hero */}
            <div className="grid md:grid-cols-2 gap-10">
                {/* Images */}
                <div className="space-y-3">
                    <div className="bg-[#F5F5F5] rounded-xl flex items-center justify-center h-80 overflow-hidden">
                        <Image src={images[activeImg]} alt={product.title} width={400} height={400} className="max-h-72 w-auto object-contain" />
                    </div>
                    {images.length > 1 && (
                        <div className="flex gap-2 flex-wrap">
                            {images.map((img, i) => (
                                <button key={i} onClick={() => setActiveImg(i)} className={`w-16 h-16 rounded-lg bg-[#F5F5F5] flex items-center justify-center border-2 transition ${activeImg === i ? 'border-indigo-400' : 'border-transparent'}`}>
                                    <Image src={img} alt="" width={60} height={60} className="max-h-12 w-auto object-contain" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

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
            {product.aiAnalysis && <AiAnalysis analysis={product.aiAnalysis} />}

            {/* Reviews */}
            <ReviewList reviews={product.reviews || []} productId={product.id} />
        </div>
    )
}

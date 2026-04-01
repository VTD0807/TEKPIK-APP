import Image from 'next/image'
import { BoxArrowUpRight, Star, StarFill } from 'react-bootstrap-icons'
import AiAnalysis from '@/components/ai/AiAnalysis'
import ReviewList from '@/components/reviews/ReviewList'
import AffiliateDisclosure from '@/components/AffiliateDisclosure'
import WishlistButton from '@/components/WishlistButton'
import ShareButton from '@/components/ShareButton'
import ProductImageGallery from '@/components/ProductImageGallery'
import { dbAdmin, timestampToJSON } from '@/lib/firebase-admin'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }) {
    const { id } = await params
    
    if (!dbAdmin) return { title: 'Product Not Found' }

    const snap = await dbAdmin.collection('products').doc(id).get()
    if (!snap.exists) return { title: 'Product Not Found' }

    const product = snap.data()

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
    
    if (!dbAdmin) notFound()

    const snap = await dbAdmin.collection('products').doc(id).get()
    if (!snap.exists) notFound()

    const productData = { id: snap.id, ...snap.data() }

    // Fetch categories
    if (productData.categoryId) {
        const catSnap = await dbAdmin.collection('categories').doc(productData.categoryId).get()
        if (catSnap.exists) productData.categories = { name: catSnap.data().name, slug: catSnap.data().slug }
    }

    // Fetch AI Analysis
    const aiSnap = await dbAdmin.collection('ai_analysis').where('productId', '==', id).limit(1).get()
    if (!aiSnap.empty) productData.ai_analysis = { id: aiSnap.docs[0].id, ...aiSnap.docs[0].data() }

    // Fetch Reviews
    const revSnap = await dbAdmin.collection('reviews').where('productId', '==', id).where('isApproved', '==', true).get()
    productData.reviews = []
    revSnap.forEach(doc => {
        let revData = doc.data()
        // Convert Firestore timestamps to plain JSON-safe values.
        productData.reviews.push({
            id: doc.id,
            ...revData,
            createdAt: timestampToJSON(revData.createdAt),
            updatedAt: timestampToJSON(revData.updatedAt),
        })
    })

    const product = productData

    const images = product.imageUrls || []
    const rating = product.reviews?.length
        ? (product.reviews.reduce((s, r) => s + r.rating, 0) / product.reviews.length).toFixed(1)
        : null

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8 sm:space-y-10">
            <AffiliateDisclosure />

            {/* Product hero */}
            <div className="grid md:grid-cols-2 gap-6 sm:gap-10">
                <ProductImageGallery images={images} title={product.title} />

                {/* Info */}
                <div className="space-y-4">
                    {product.brand && <p className="text-xs text-slate-400 uppercase tracking-widest">{product.brand}</p>}
                    <h1 className="text-2xl font-semibold text-slate-800">{product.title}</h1>

                    {rating && (
                        <div className="flex items-center gap-2">
                            <div className="flex">
                                {Array(5).fill('').map((_, i) => (
                                    parseFloat(rating) >= i + 1
                                        ? <StarFill key={i} size={16} className="text-amber-500" />
                                        : <Star key={i} size={16} className="text-slate-300" />
                                ))}
                            </div>
                            <span className="text-sm text-slate-500">{rating} ({product.reviews.length} reviews)</span>
                        </div>
                    )}

                    <div className="flex items-baseline gap-3">
                        <span className="text-3xl font-bold text-slate-800">₹{product.price}</span>
                        {(product.original_price || product.originalPrice) && (
                            <>
                                <span className="text-lg text-slate-400 line-through">₹{product.original_price || product.originalPrice}</span>
                                {(product.discount || 0) > 0 && <span className="text-sm bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">-{product.discount}%</span>}
                            </>
                        )}
                    </div>
                    <p className="text-xs text-slate-400">Price may vary. Check current price on Amazon.</p>

                    <div className="flex flex-wrap items-center gap-3 pt-2">
                        <a
                            href={product.affiliate_url || product.affiliateUrl || '#'}
                            target="_blank"
                            rel="noopener noreferrer sponsored"
                            className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 bg-amber-400 hover:bg-amber-500 transition text-slate-900 font-semibold rounded-full"
                        >
                            <BoxArrowUpRight size={16} />
                            View on Amazon
                        </a>
                        <WishlistButton productId={product.id} />
                        <ShareButton title={product.title} />
                    </div>

                    <p className="text-slate-600 text-sm leading-relaxed">{product.description}</p>

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

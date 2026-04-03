import ProductCard from "@/components/ProductCard"
import { ArrowLeft } from 'react-bootstrap-icons'
import { dbAdmin, sanitizeFirestoreData } from "@/lib/firebase-admin"
import Link from "next/link"

export const dynamic = 'force-dynamic'

export const metadata = {
    title: "Shop All Products - TEKPIK",
    description: "Browse our full catalog of AI-analyzed products.",
}

export default async function ShopPage({ searchParams }) {
    const { search } = await searchParams

    let products = []
    let hasProducts = false

    if (dbAdmin) {
        try {
            const querySnap = await dbAdmin.collection('products')
                .where('isActive', '==', true)
                .orderBy('createdAt', 'desc')
                .get()

            const allProducts = []
            querySnap.forEach(doc => allProducts.push(sanitizeFirestoreData({ id: doc.id, ...doc.data() })))

            products = search
                ? allProducts.filter(p => p.title.toLowerCase().includes(search.toLowerCase()))
                : allProducts

            hasProducts = products.length > 0
        } catch (error) {
            console.error('Error fetching shop products:', error)
        }
    }

    return (
        <div className="min-h-[70vh] px-3 sm:px-6">
            <div className="max-w-7xl mx-auto">
                <div className="my-6">
                    <Link href="/shop" className="text-2xl text-slate-500 flex items-center gap-2 hover:text-slate-700 transition group">
                        {search && <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />}
                        All <span className="text-slate-700 font-medium">Products</span>
                    </Link>
                    {search && (
                        <p className="text-sm text-slate-400 mt-1">
                            Showing results for "{search}"
                        </p>
                    )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 mx-auto mb-20 sm:mb-32">
                    {hasProducts ? (
                        products.map((product) => (
                            <ProductCard key={product.id} product={product} />
                        ))
                    ) : (
                        <div className="w-full text-center py-32 flex flex-col items-center justify-center gap-4">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                                <span className="text-2xl text-slate-300"></span>
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-slate-800 font-medium text-lg">0 results found</h3>
                                <p className="text-slate-400 text-sm">We couldn't find any products matching your criteria.</p>
                            </div>
                            <Link href="/shop" className="text-indigo-600 font-medium text-sm hover:underline">
                                Clear filters
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

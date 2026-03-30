import ProductCard from "@/components/ProductCard"
import { MoveLeftIcon } from "lucide-react"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import Link from "next/link"

export const metadata = {
    title: "Shop All Products - TEKPIK",
    description: "Browse our full catalog of AI-analyzed products.",
}

export default async function ShopPage({ searchParams }) {
    const { search } = await searchParams
    const supabase = await createSupabaseServerClient()

    let query = supabase
        .from('products')
        .select('*, categories(name,slug), reviews(rating)')
        .eq('is_active', true)

    if (search) {
        query = query.ilike('title', `%${search}%`)
    }

    const { data: products, error } = await query.order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching shop products:', error)
    }

    const hasProducts = products && products.length > 0

    return (
        <div className="min-h-[70vh] mx-6">
            <div className="max-w-7xl mx-auto">
                <div className="my-6">
                    <Link href="/shop" className="text-2xl text-slate-500 flex items-center gap-2 hover:text-slate-700 transition group">
                        {search && <MoveLeftIcon size={20} className="group-hover:-translate-x-1 transition-transform" />}
                        All <span className="text-slate-700 font-medium">Products</span>
                    </Link>
                    {search && (
                        <p className="text-sm text-slate-400 mt-1">
                            Showing results for "{search}"
                        </p>
                    )}
                </div>

                <div className="grid grid-cols-2 sm:flex flex-wrap gap-6 xl:gap-12 mx-auto mb-32">
                    {hasProducts ? (
                        products.map((product) => (
                            <ProductCard key={product.id} product={product} />
                        ))
                    ) : (
                        <div className="w-full text-center py-32 flex flex-col items-center justify-center gap-4">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                                <span className="text-2xl text-slate-300">🔍</span>
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

import React from 'react'
import Title from './Title'
import ProductCard from './ProductCard'
import { createSupabasePublicClient } from '@/lib/supabase-server'

const BestSelling = async () => {
    const displayQuantity = 8
    let products = []
    let errorMsg = null

    try {
        const supabase = createSupabasePublicClient()
        const { data, error } = await supabase
            .from('products')
            .select('*, categories(name,slug)')
            .eq('is_active', true)
            .eq('is_featured', true)
            .limit(displayQuantity)

        if (error) {
            console.error('Error fetching best selling products:', error)
            errorMsg = error.message
        } else {
            products = data || []
        }
    } catch (e) {
        console.error('Unexpected error in BestSelling:', e)
        errorMsg = e.message
    }

    return (
        <div className='px-6 my-30 max-w-6xl mx-auto'>
            <Title title='Best Selling' description={`Our most popular picks.`} href='/shop' />
            <div className='mt-12 grid grid-cols-2 sm:flex flex-wrap gap-6 xl:gap-12'>
                {products && products.length > 0 ? (
                    products.map((product, index) => (
                        <ProductCard key={product.id || index} product={product} />
                    ))
                ) : (
                    <div className="w-full text-center text-slate-400 py-10">
                        {errorMsg ? `Failed to load products: ${errorMsg}` : 'No products found.'}
                    </div>
                )}
            </div>
        </div>
    )
}

export default BestSelling

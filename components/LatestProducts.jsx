import React from 'react'
import Title from './Title'
import ProductCard from './ProductCard'
import { createSupabasePublicClient } from '@/lib/supabase-server'

const LatestProducts = async () => {
    const displayQuantity = 4
    let products = []
    let errorMsg = null

    try {
        const supabase = createSupabasePublicClient()
        const { data, error } = await supabase
            .from('products')
            .select('*, categories(name,slug)')
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(displayQuantity)

        if (error) {
            console.error('Error fetching latest products:', error)
            errorMsg = error.message
        } else {
            products = data || []
        }
    } catch (e) {
        console.error('Unexpected error in LatestProducts:', e)
        errorMsg = e.message
    }

    return (
        <div className='px-6 my-30 max-w-6xl mx-auto'>
            <Title title='Latest Products' description={`Our newest finds for you.`} href='/shop' />
            <div className='mt-12 grid grid-cols-2 sm:flex flex-wrap gap-6 justify-between'>
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

export default LatestProducts

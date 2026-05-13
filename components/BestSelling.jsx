import React from 'react'
import Title from './Title'
import ProductCard from './ProductCard'
import { getCached } from '@/lib/server-cache'

const BestSelling = async () => {
    const displayQuantity = 12
    let products = []
    let errorMsg = null

    try {
        const data = await getCached('best-selling:v1', 1000 * 60 * 5, async () => {
            try {
                const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.tekpik.in'}/api/trending-products?limit=${displayQuantity}`, {
                    cache: 'no-store',
                })
                const payload = await response.json().catch(() => ({}))
                if (Array.isArray(payload?.products)) return payload.products
            } catch {
                return []
            }

            return []
        })
        products = data
    } catch (e) {
        console.error('Unexpected error in BestSelling:', e)
        errorMsg = e.message
    }

    return (
        <div className='px-4 sm:px-6 my-14 sm:my-20 max-w-[1500px] mx-auto'>
            <Title title='Trending Products' description={`What's moving fastest right now.`} href='/shop' />
            <div className='mt-8 sm:mt-12 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 sm:gap-5'>
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

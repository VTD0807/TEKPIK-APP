import React from 'react'
import Title from './Title'
import ProductCard from './ProductCard'
import { dbAdmin, sanitizeFirestoreData } from '@/lib/firebase-admin'
import { getCached } from '@/lib/server-cache'

const BestSelling = async () => {
    const displayQuantity = 8
    let products = []
    let errorMsg = null

    try {
        if (!dbAdmin) throw new Error('DB not initialized')

        const data = await getCached('best-selling:v1', 1000 * 60 * 5, async () => {
            const querySnap = await dbAdmin.collection('products')
                .where('isActive', '==', true)
                .where('isFeatured', '==', true)
                .limit(displayQuantity)
                .get()

            const prodList = []
            querySnap.forEach(doc => prodList.push(sanitizeFirestoreData({ id: doc.id, ...doc.data() })))

            if (prodList.length === 0) return []

            const catSnap = await dbAdmin.collection('categories').get()
            const catMap = {}
            catSnap.forEach(doc => catMap[doc.id] = doc.data())

            return prodList.map(p => ({
                ...p,
                categories: catMap[p.categoryId] ? { name: catMap[p.categoryId].name, slug: catMap[p.categoryId].slug } : null
            }))
        })
        products = data
    } catch (e) {
        console.error('Unexpected error in BestSelling:', e)
        errorMsg = e.message
    }

    return (
        <div className='px-4 sm:px-6 my-14 sm:my-20 max-w-6xl mx-auto'>
            <Title title='Best Selling' description={`Our most popular picks.`} href='/shop' />
            <div className='mt-8 sm:mt-12 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 xl:gap-8'>
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

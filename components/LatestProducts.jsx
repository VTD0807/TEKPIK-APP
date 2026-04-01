import React from 'react'
import Title from './Title'
import ProductCard from './ProductCard'
import { dbAdmin, sanitizeFirestoreData } from '@/lib/firebase-admin'

const LatestProducts = async () => {
    const displayQuantity = 4
    let products = []
    let errorMsg = null

    try {
        if (!dbAdmin) throw new Error('DB not initialized')

        const querySnap = await dbAdmin.collection('products')
            .where('isActive', '==', true)
            .orderBy('createdAt', 'desc')
            .limit(displayQuantity)
            .get()

        const prodList = []
        querySnap.forEach(doc => prodList.push(sanitizeFirestoreData({ id: doc.id, ...doc.data() })))

        if (prodList.length > 0) {
            const catSnap = await dbAdmin.collection('categories').get()
            const catMap = {}
            catSnap.forEach(doc => catMap[doc.id] = doc.data())

            products = prodList.map(p => ({
                ...p,
                categories: catMap[p.categoryId] ? { name: catMap[p.categoryId].name, slug: catMap[p.categoryId].slug } : null
            }))
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

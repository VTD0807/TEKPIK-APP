import React from 'react'
import { cookies } from 'next/headers'
import Title from './Title'
import ProductCard from './ProductCard'
import { dbAdmin, authAdmin, sanitizeFirestoreData } from '@/lib/firebase-admin'

export default async function BestPicksForYou() {
    // 1. Check if user is logged in
    const cookieStore = await cookies()
    const fbToken = cookieStore.get('fb-token')?.value

    if (!fbToken || !dbAdmin || !authAdmin) {
        return null // Hide entirely
    }

    let userInterests = []
    let products = []
    let errorMsg = null

    try {
        // 2. Decode token to get UID
        const decodedToken = await authAdmin.verifyIdToken(fbToken)
        const uid = decodedToken.uid

        // 3. Fetch User profile to get interests/measures
        const userDoc = await dbAdmin.collection('users').doc(uid).get()
        if (!userDoc.exists) return null

        const userData = userDoc.data()
        userInterests = userData.interests || [] 

        // CRITICAL CONSTRAINT: Hide if exact measures haven't been analysed (empty array)
        if (!Array.isArray(userInterests) || userInterests.length === 0) {
            return null
        }

        // 4. Fetch Products and Match against Interests
        // We fetch a decent pool of active products, then filter locally
        // since Firestore doing a client-side 'array-contains-any' is limited to 10
        const querySnap = await dbAdmin.collection('products')
            .where('isActive', '==', true)
            .orderBy('createdAt', 'desc')
            .limit(50) 
            .get()

        const prodList = []
        querySnap.forEach(doc => prodList.push(sanitizeFirestoreData({ id: doc.id, ...doc.data() })))

        if (prodList.length > 0) {
            // Get categories map to attach slugs
            const catSnap = await dbAdmin.collection('categories').get()
            const catMap = {}
            catSnap.forEach(doc => catMap[doc.id] = doc.data())

            // Filter products that match user interests via Tags or Category Name
            const matchedProducts = prodList.filter(p => {
                const catName = catMap[p.categoryId]?.name?.toLowerCase() || ''
                const pTags = (p.tags || []).map(t => t.toLowerCase())
                
                return userInterests.some(interest => {
                    const term = interest.toLowerCase()
                    return catName.includes(term) || pTags.some(t => t.includes(term))
                })
            })

            // Limit to top 4 recommendations
            products = matchedProducts.slice(0, 4).map(p => ({
                ...p,
                categories: catMap[p.categoryId] ? { name: catMap[p.categoryId].name, slug: catMap[p.categoryId].slug } : null
            }))
        }
        
    } catch (e) {
        // Silently fail authentication issues and simply hide the section
        console.warn('BestPicksForYou error:', e.message)
        return null
    }

    // Hide if no products matched their exact measures
    if (products.length === 0) {
        return null 
    }

    return (
        <div className='px-6 my-20 max-w-6xl mx-auto'>
            <div className="flex items-center gap-2 mb-2">
                <div className="w-2.5 h-8 bg-black rounded-full"></div>
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Best Picks For You ✨</h2>
                    <p className="text-sm text-slate-500 mt-0.5">Highly personalized selections based on your exact measures.</p>
                </div>
            </div>
            
            <div className='mt-8 grid grid-cols-2 sm:flex flex-wrap gap-6 justify-between'>
                {products.map((product, index) => (
                    <ProductCard key={product.id || index} product={product} />
                ))}
            </div>
        </div>
    )
}


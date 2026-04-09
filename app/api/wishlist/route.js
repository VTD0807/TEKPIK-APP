import { NextResponse } from 'next/server'
import { dbAdmin, authAdmin } from '@/lib/firebase-admin'

export const dynamic = 'force-dynamic'

async function getUser(req) {
    const authHeader = req.headers.get('Authorization')
    if (authHeader?.startsWith('Bearer ')) {
        try { return await authAdmin.verifyIdToken(authHeader.split('Bearer ')[1]) } catch(e) {}
    }
    const userId = req.headers.get('x-user-id')
    if (userId) return { uid: userId }
    return null
}

export async function GET(req) {
    if (!dbAdmin) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })
    const user = await getUser(req)
    if (!user) return NextResponse.json({ wishlist: [] })

    try {
        let snap
        try {
            // Try with compound index (userId, addedAt desc)
            snap = await dbAdmin.collection('wishlists').where('userId', '==', user.uid).orderBy('addedAt', 'desc').get()
        } catch (indexErr) {
            // Fallback: without orderBy if index doesn't exist
            snap = await dbAdmin.collection('wishlists').where('userId', '==', user.uid).get()
        }
        
        let productIds = []
        let seenIds = new Set()
        let duplicateDocs = []
        
        snap.forEach(doc => {
            const productId = doc.data().productId
            if (seenIds.has(productId)) {
                duplicateDocs.push(doc.id) // Mark for cleanup
            } else {
                seenIds.add(productId)
                productIds.push(productId)
            }
        })

        // Cleanup duplicate entries in background
        if (duplicateDocs.length > 0) {
            duplicateDocs.forEach(docId => {
                dbAdmin.collection('wishlists').doc(docId).delete().catch(err => 
                    console.error(`Failed to delete duplicate wishlist doc: ${docId}`, err)
                )
            })
        }

        let wishlistMap = []
        if (productIds.length > 0) {
            const pSnap = await dbAdmin.collection('products').where('__name__', 'in', productIds.slice(0, 30)).get()
            const pMap = {}
            pSnap.forEach(doc => { pMap[doc.id] = { id: doc.id, ...doc.data() } })
            productIds.forEach(id => {
                if (pMap[id]) wishlistMap.push(pMap[id])
            })
        }

        return NextResponse.json({ wishlist: wishlistMap })
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}

export async function POST(req) {
    if (!dbAdmin) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })
    const user = await getUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const { productId } = await req.json()
        if (!productId) return NextResponse.json({ error: 'productId required' }, { status: 400 })

        let snap
        try {
            // Try with compound index first (userId, productId)
            snap = await dbAdmin.collection('wishlists').where('userId', '==', user.uid).where('productId', '==', productId).get()
        } catch (indexErr) {
            // Fallback: fetch all and filter client-side if index doesn't exist
            const allDocs = await dbAdmin.collection('wishlists').where('userId', '==', user.uid).get()
            snap = {
                docs: allDocs.docs.filter(doc => doc.data().productId === productId),
                empty: allDocs.docs.length === 0
            }
        }

        if (!snap.empty) {
            // Delete ALL matching entries (handles multiple duplicates)
            const deletePromises = snap.docs.map(doc => 
                dbAdmin.collection('wishlists').doc(doc.id).delete()
            )
            await Promise.all(deletePromises)
            return NextResponse.json({ saved: false })
        } else {
            await dbAdmin.collection('wishlists').add({ userId: user.uid, productId, addedAt: new Date() })
            return NextResponse.json({ saved: true })
        }
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}

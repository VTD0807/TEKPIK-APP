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
        const snap = await dbAdmin.collection('wishlists').where('userId', '==', user.uid).orderBy('addedAt', 'desc').get()
        let productIds = []
        snap.forEach(doc => productIds.push(doc.data().productId))

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

        const snap = await dbAdmin.collection('wishlists').where('userId', '==', user.uid).where('productId', '==', productId).limit(1).get()

        if (!snap.empty) {
            await dbAdmin.collection('wishlists').doc(snap.docs[0].id).delete()
            return NextResponse.json({ saved: false })
        } else {
            await dbAdmin.collection('wishlists').add({ userId: user.uid, productId, addedAt: new Date() })
            return NextResponse.json({ saved: true })
        }
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}

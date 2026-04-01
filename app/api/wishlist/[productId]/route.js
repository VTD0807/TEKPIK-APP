import { NextResponse } from 'next/server'
import { dbAdmin, authAdmin } from '@/lib/firebase-admin'

async function getUser(req) {
    const authHeader = req.headers.get('Authorization')
    if (authHeader?.startsWith('Bearer ')) {
        try { return await authAdmin.verifyIdToken(authHeader.split('Bearer ')[1]) } catch(e) {}
    }
    const userId = req.headers.get('x-user-id')
    if (userId) return { uid: userId }
    return null
}

export async function DELETE(req, { params }) {
    const { productId } = await params
    if (!dbAdmin) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })

    const user = await getUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const snap = await dbAdmin.collection('wishlists')
            .where('userId', '==', user.uid)
            .where('productId', '==', productId)
            .get()
        
        const batch = dbAdmin.batch()
        snap.forEach(doc => batch.delete(doc.ref))
        await batch.commit()

        return NextResponse.json({ success: true })
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}

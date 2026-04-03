import { NextResponse } from 'next/server'
import { dbAdmin, timestampToJSON } from '@/lib/firebase-admin'

export const dynamic = 'force-dynamic'

const toJsonDate = (value) => {
    if (!value) return null
    return value?.toDate ? timestampToJSON(value) : value
}

const chunkArray = (arr, size) => {
    const chunks = []
    for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size))
    return chunks
}

export async function GET() {
    if (!dbAdmin) return NextResponse.json({ campaigns: [] })

    try {
        const snap = await dbAdmin.collection('admin_notifications').orderBy('createdAt', 'desc').limit(50).get()
        const campaigns = []
        snap.forEach((doc) => {
            const data = doc.data() || {}
            campaigns.push({
                id: doc.id,
                ...data,
                createdAt: toJsonDate(data.createdAt),
            })
        })

        return NextResponse.json({ campaigns })
    } catch (error) {
        console.error('[admin-notifications:get]', error)
        return NextResponse.json({ campaigns: [] })
    }
}

export async function POST(req) {
    if (!dbAdmin) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })

    try {
        const body = await req.json()
        const title = String(body?.title || '').trim()
        const message = String(body?.message || '').trim()
        const link = String(body?.link || '').trim()
        const targetType = String(body?.targetType || 'all').trim()
        const role = String(body?.role || '').trim().toUpperCase()
        const userId = String(body?.userId || '').trim()
        const attachedProductId = String(body?.attachedProductId || '').trim()

        if (!title || !message) {
            return NextResponse.json({ error: 'Title and message are required.' }, { status: 400 })
        }

        if (!['all', 'role', 'user'].includes(targetType)) {
            return NextResponse.json({ error: 'Invalid target type.' }, { status: 400 })
        }

        if (targetType === 'role' && !['ADMIN', 'USER'].includes(role)) {
            return NextResponse.json({ error: 'Role target requires ADMIN or USER.' }, { status: 400 })
        }

        if (targetType === 'user' && !userId) {
            return NextResponse.json({ error: 'User target requires userId.' }, { status: 400 })
        }

        let attachedProduct = null
        if (attachedProductId) {
            const productSnap = await dbAdmin.collection('products').doc(attachedProductId).get()
            if (!productSnap.exists) {
                return NextResponse.json({ error: 'Attached product not found.' }, { status: 404 })
            }
            const product = productSnap.data() || {}
            attachedProduct = {
                id: productSnap.id,
                title: product.title || product.name || 'Untitled product',
                imageUrl: product.imageUrls?.[0] || product.image_urls?.[0] || null,
                price: product.price ?? null,
            }
        }

        let usersSnap
        if (targetType === 'all') {
            usersSnap = await dbAdmin.collection('users').get()
        } else if (targetType === 'role') {
            usersSnap = await dbAdmin.collection('users').where('role', '==', role).get()
        } else {
            usersSnap = await dbAdmin.collection('users').where('__name__', '==', userId).get()
        }

        const recipients = []
        usersSnap.forEach((doc) => {
            const data = doc.data() || {}
            recipients.push({
                userId: doc.id,
                email: data.email || '',
                role: data.role || 'USER',
            })
        })

        const campaignRef = dbAdmin.collection('admin_notifications').doc()
        const createdAt = new Date()

        const campaignPayload = {
            title,
            message,
            link: link || null,
            attachedProduct,
            targetType,
            role: targetType === 'role' ? role : null,
            userId: targetType === 'user' ? userId : null,
            sentCount: recipients.length,
            createdAt,
        }

        await campaignRef.set(campaignPayload)

        const batches = chunkArray(recipients, 400)
        for (const group of batches) {
            const batch = dbAdmin.batch()
            group.forEach((recipient) => {
                const ref = dbAdmin.collection('user_notifications').doc()
                batch.set(ref, {
                    userId: recipient.userId,
                    title,
                    message,
                    link: link || null,
                    attachedProduct,
                    isRead: false,
                    campaignId: campaignRef.id,
                    createdAt,
                })
            })
            await batch.commit()
        }

        return NextResponse.json({ success: true, sentCount: recipients.length })
    } catch (error) {
        console.error('[admin-notifications:post]', error)
        return NextResponse.json({ error: 'Failed to send notification.' }, { status: 500 })
    }
}

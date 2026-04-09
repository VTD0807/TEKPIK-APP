import { NextResponse } from 'next/server'
import { dbAdmin, timestampToJSON } from '@/lib/firebase-admin'

export const dynamic = 'force-dynamic'

const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY || ''
const ONESIGNAL_APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || ''

const toJsonDate = (value) => {
    if (!value) return null
    return value?.toDate ? timestampToJSON(value) : value
}

const chunkArray = (arr, size) => {
    const chunks = []
    for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size))
    return chunks
}

/**
 * Send OneSignal web push notifications
 */
const sendOneSignalPush = async (config = {}) => {
    if (!ONESIGNAL_REST_API_KEY || !ONESIGNAL_APP_ID) {
        console.warn('OneSignal credentials not configured, skipping web push')
        return null
    }

    const payload = {
        app_id: ONESIGNAL_APP_ID,
        headings: { en: config.title },
        contents: { en: config.message },
        big_picture: config.imageUrl || undefined,
        large_icon: config.imageUrl || undefined,
        data: {
            link: config.link || undefined,
            productId: config.attachedProductId || undefined,
        },
        // Target segments or external IDs
        ...(config.includeExternalIds && config.includeExternalIds.length > 0 ? {
            include_external_user_ids: config.includeExternalIds,
        } : config.targetSegment ? {
            included_segments: [config.targetSegment],
        } : {
            included_segments: ['All'],
        }),
    }

    try {
        const response = await fetch('https://onesignal.com/api/v1/notifications', {
            method: 'POST',
            headers: {
                Authorization: `Basic ${ONESIGNAL_REST_API_KEY}`,
                'Content-Type': 'application/json; charset=utf-8',
            },
            body: JSON.stringify(payload),
        })

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            const errorMsg = errorData.errors?.[0] || `OneSignal push failed: ${response.status}`
            console.error('[OneSignal Error]', errorMsg)
            return null
        }

        const result = await response.json()
        return result
    } catch (error) {
        console.error('[OneSignal Request Error]', error.message)
        return null
    }
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
            onesignalStatus: 'pending',
        }

        await campaignRef.set(campaignPayload)

        // Send OneSignal web push
        let oneSignalResult = null
        let oneSignalStatus = 'skipped'
        try {
            const pushConfig = {
                title,
                message,
                imageUrl: attachedProduct?.imageUrl || undefined,
                link: link || undefined,
                attachedProductId: attachedProductId || undefined,
                includeExternalIds: recipients.map(r => r.userId),
                targetSegment: targetType === 'all' ? 'All' : (targetType === 'role' ? `role_${role}` : undefined),
            }

            oneSignalResult = await sendOneSignalPush(pushConfig)
            if (oneSignalResult?.body?.notification_id) {
                oneSignalStatus = 'success'
                // Update campaign with OneSignal result
                await campaignRef.update({
                    onesignalStatus: 'success',
                    onesignalNotificationId: oneSignalResult.body.notification_id,
                })
            } else {
                oneSignalStatus = 'failed'
                await campaignRef.update({ onesignalStatus: 'failed' })
            }
        } catch (osError) {
            console.error('OneSignal push error:', osError)
            oneSignalStatus = 'error'
            await campaignRef.update({ onesignalStatus: 'error', onesignalError: osError.message })
        }

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

        return NextResponse.json({ 
            success: true, 
            sentCount: recipients.length,
            onesignalStatus,
            onesignalNotificationId: oneSignalResult?.body?.notification_id || null,
        })
    } catch (error) {
        console.error('[admin-notifications:post]', error)
        return NextResponse.json({ error: 'Failed to send notification.' }, { status: 500 })
    }
}

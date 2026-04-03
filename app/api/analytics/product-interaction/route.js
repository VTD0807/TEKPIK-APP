import { NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/firebase-admin'
import {
    applyLearningEvent,
    applyQueryLearning,
    buildUserPreferenceKeys,
    createEmptyPreferenceVector,
    getPrimaryPreferenceKey,
    loadPreferenceVector,
    savePreferenceVector,
} from '@/lib/recommendation-learning'

export const dynamic = 'force-dynamic'

const getIpAddress = (req) => {
    const forwarded = req.headers.get('x-forwarded-for') || ''
    const direct = req.headers.get('x-real-ip') || req.headers.get('cf-connecting-ip') || req.headers.get('x-client-ip') || ''
    const ip = forwarded.split(',')[0]?.trim() || direct.trim()
    return ip || null
}

const normalizeRegion = (value) => {
    const raw = String(value || '').trim()
    if (!raw) return null
    const cleaned = raw.replace(/_/g, ' ').replace(/-/g, ' ').trim()
    return cleaned || null
}

const getGeoFromRequest = (req) => {
    const headers = req.headers
    const country = headers.get('x-vercel-ip-country') || headers.get('x-country-code') || headers.get('cf-ipcountry') || ''
    const region = headers.get('x-vercel-ip-country-region') || headers.get('x-region') || headers.get('cf-region') || ''
    const city = headers.get('x-vercel-ip-city') || headers.get('x-city') || headers.get('cf-city') || ''

    return {
        country: country || null,
        region: normalizeRegion(region),
        city: normalizeRegion(city),
    }
}

const parseDeviceInfo = (userAgent = '') => {
    const ua = String(userAgent || '')

    let phoneModel = null
    if (/iphone/i.test(ua)) phoneModel = 'iPhone'
    else if (/pixel/i.test(ua)) phoneModel = 'Google Pixel'
    else if (/sm-/i.test(ua) || /samsung/i.test(ua)) phoneModel = 'Samsung Galaxy'
    else if (/redmi|mi\s|xiaomi/i.test(ua)) phoneModel = 'Xiaomi Redmi'
    else if (/oneplus/i.test(ua)) phoneModel = 'OnePlus'
    else if (/oppo/i.test(ua)) phoneModel = 'Oppo'
    else if (/vivo/i.test(ua)) phoneModel = 'Vivo'
    else if (/realme/i.test(ua)) phoneModel = 'Realme'
    else if (/motorola|moto/i.test(ua)) phoneModel = 'Motorola'
    else if (/nokia/i.test(ua)) phoneModel = 'Nokia'
    else if (/nothing/i.test(ua)) phoneModel = 'Nothing'

    let browser = 'Unknown'
    if (/chrome/i.test(ua) && !/edg|opr|opera/i.test(ua)) browser = 'Chrome'
    else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari'
    else if (/firefox/i.test(ua)) browser = 'Firefox'
    else if (/edg/i.test(ua)) browser = 'Edge'
    else if (/opera|opr/i.test(ua)) browser = 'Opera'

    let os = 'Unknown'
    if (/android/i.test(ua)) os = 'Android'
    else if (/iphone|ipad|ios/i.test(ua)) os = 'iOS'
    else if (/windows/i.test(ua)) os = 'Windows'
    else if (/mac os x|macintosh/i.test(ua)) os = 'macOS'
    else if (/linux/i.test(ua)) os = 'Linux'

    return { phoneModel, browser, os }
}

export async function POST(req) {
    if (!dbAdmin) return NextResponse.json({ ok: false, reason: 'db_unavailable' }, { status: 200 })

    try {
        const body = await req.json().catch(() => ({}))
        const eventType = String(body?.eventType || '').trim()
        const productId = String(body?.productId || '').trim()
        const accountId = String(body?.accountId || '').trim()
        const deviceId = String(body?.deviceId || '').trim()
        const query = String(body?.query || '').trim()

        const isSearchEvent = eventType === 'search_query'

        if (!eventType || ((!productId && !isSearchEvent) || (!accountId && !deviceId))) {
            return NextResponse.json({ ok: false, reason: 'invalid_payload' }, { status: 400 })
        }

        const ipAddress = getIpAddress(req)
        const geo = getGeoFromRequest(req)
        const deviceInfo = parseDeviceInfo(body?.userAgent || req.headers.get('user-agent') || '')
        const now = new Date()
        const productSnap = await dbAdmin.collection('products').doc(productId).get()
        const product = productSnap.exists ? { id: productSnap.id, ...productSnap.data() } : null
        const primaryKey = getPrimaryPreferenceKey({ accountId, deviceId })
        const aliasKeys = buildUserPreferenceKeys({ accountId, deviceId }).filter((key) => key !== primaryKey)

        await dbAdmin.collection('analytics_product_interactions').add({
            eventType,
            weight: eventType === 'wishlist_add' ? 4.5 : eventType === 'amazon_click' ? 3.5 : eventType === 'product_click' ? 2.5 : eventType === 'wishlist_remove' ? -1.5 : 1,
            productId: productId || null,
            accountId: accountId || null,
            deviceId: deviceId || null,
            query: query || null,
            pagePath: String(body?.pagePath || null) || null,
            ipAddress,
            country: geo.country,
            region: geo.region,
            city: geo.city,
            userAgent: body?.userAgent || req.headers.get('user-agent') || null,
            platform: body?.platform || null,
            language: body?.language || null,
            timezone: body?.timezone || null,
            phoneModel: deviceInfo.phoneModel,
            browser: deviceInfo.browser,
            os: deviceInfo.os,
            createdAt: now,
        })

        if (primaryKey && (productId || isSearchEvent)) {
            const current = await loadPreferenceVector({ dbAdmin, keys: [primaryKey, ...aliasKeys] })
            const nextVector = current.exists ? current.vector : createEmptyPreferenceVector()
            let eventVector = nextVector

            if (isSearchEvent) {
                eventVector = applyQueryLearning({
                    vector: eventVector,
                    query,
                    strength: body?.strength || 1,
                })
            } else {
                const productSnap = await dbAdmin.collection('products').doc(productId).get()
                const product = productSnap.exists ? { id: productSnap.id, ...productSnap.data() } : null
                if (product) {
                    eventVector = applyLearningEvent({
                        vector: eventVector,
                        product,
                        eventType,
                        rating: body?.rating,
                        updatedAt: current.data?.updatedAt || null,
                    })
                }
            }

            const nextCount = Number(current.data?.interactionCount || 0) + 1
            await savePreferenceVector({
                dbAdmin,
                primaryKey,
                aliasKeys,
                vector: eventVector,
                interactionCount: nextCount,
                updatedAt: now,
            })
        }

        if (accountId) {
            const userUpdate = {
                lastSeenAt: now,
                lastKnownIp: ipAddress,
                lastKnownCountry: geo.country,
                lastKnownRegion: geo.region,
                lastKnownCity: geo.city,
                lastKnownUserAgent: body?.userAgent || req.headers.get('user-agent') || null,
                lastKnownPlatform: body?.platform || null,
                lastKnownLanguage: body?.language || null,
                lastKnownTimezone: body?.timezone || null,
                lastKnownPhoneModel: deviceInfo.phoneModel,
                lastKnownBrowser: deviceInfo.browser,
                lastKnownOs: deviceInfo.os,
            }

            await dbAdmin.collection('users').doc(accountId).set(userUpdate, { merge: true })
        }

        return NextResponse.json({ ok: true })
    } catch (error) {
        console.error('[product-interaction-track]', error)
        return NextResponse.json({ ok: false }, { status: 500 })
    }
}

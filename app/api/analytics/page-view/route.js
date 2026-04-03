import { NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/firebase-admin'
import admin from 'firebase-admin'

export const dynamic = 'force-dynamic'

const isAlreadyExistsError = (error) => {
    const code = error?.code
    const message = String(error?.message || '')
    return code === 6 || message.includes('ALREADY_EXISTS')
}

const normalizePath = (value) => {
    const raw = String(value || '/').trim()
    if (!raw) return '/'
    const base = raw.split('?')[0].split('#')[0] || '/'
    return base.startsWith('/') ? base : `/${base}`
}

const getProductIdFromPath = (path) => {
    const match = /^\/products\/([^/?#]+)/.exec(path)
    return match?.[1] ? decodeURIComponent(match[1]) : ''
}

const getIpAddress = (req) => {
    const forwarded = req.headers.get('x-forwarded-for') || ''
    const direct = req.headers.get('x-real-ip') || req.headers.get('cf-connecting-ip') || req.headers.get('x-client-ip') || ''
    const ip = forwarded.split(',')[0]?.trim() || direct.trim()
    return ip || null
}

const parseDeviceInfo = (userAgent = '') => {
    const ua = String(userAgent || '')
    const lower = ua.toLowerCase()
    const isMobile = /mobile|iphone|android/.test(lower)
    const isTablet = /ipad|tablet/.test(lower)
    const deviceType = isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop'

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

    return { deviceType, phoneModel, browser, os }
}

const safePart = (value, max = 400) => encodeURIComponent(String(value || '')).slice(0, max)

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

export async function POST(req) {
    if (!dbAdmin) return NextResponse.json({ ok: false, reason: 'db_unavailable' }, { status: 200 })

    try {
        const body = await req.json().catch(() => ({}))
        const pagePath = normalizePath(body?.pagePath)
        const accountId = String(body?.accountId || '').trim()
        const deviceId = String(body?.deviceId || '').trim()
        const productId = getProductIdFromPath(pagePath)
        const ipAddress = getIpAddress(req)
        const geo = getGeoFromRequest(req)
        const deviceInfo = parseDeviceInfo(body?.userAgent || req.headers.get('user-agent') || '')
        const screen = body?.screen || {}

        if (!pagePath || (!accountId && !deviceId)) {
            return NextResponse.json({ ok: false, reason: 'invalid_payload' }, { status: 400 })
        }

        const identityType = accountId ? 'account' : 'device'
        const identityId = accountId || deviceId

        const pageDocId = `${safePart(pagePath, 500)}__${identityType}__${safePart(identityId, 300)}`
        const siteDocId = `${identityType}__${safePart(identityId, 500)}`
        const productViewerId = deviceId || `account:${accountId}`
        const productDocId = productId
            ? `${safePart(productId, 250)}__device__${safePart(productViewerId, 300)}`
            : ''

        const now = admin.firestore.FieldValue.serverTimestamp()
        const pageRef = dbAdmin.collection('analytics_page_unique_visitors').doc(pageDocId)
        const siteRef = dbAdmin.collection('analytics_site_unique_visitors').doc(siteDocId)
        const productUniqueRef = productDocId
            ? dbAdmin.collection('analytics_product_unique_visitors').doc(productDocId)
            : null
        const productCountRef = productId
            ? dbAdmin.collection('analytics_product_view_counts').doc(productId)
            : null

        await Promise.all([
            pageRef.create({ pagePath, identityType, identityId, createdAt: now }).catch((err) => {
                if (!isAlreadyExistsError(err)) throw err
            }),
            siteRef.create({ identityType, identityId, createdAt: now }).catch((err) => {
                if (!isAlreadyExistsError(err)) throw err
            }),
        ])

        if (accountId) {
            const userUpdate = {
                lastSeenAt: new Date(),
                lastKnownIp: ipAddress,
                lastKnownCountry: geo.country,
                lastKnownRegion: geo.region,
                lastKnownCity: geo.city,
                lastKnownUserAgent: body?.userAgent || req.headers.get('user-agent') || null,
                lastKnownPlatform: body?.platform || null,
                lastKnownLanguage: body?.language || null,
                lastKnownTimezone: body?.timezone || null,
                lastKnownDeviceType: deviceInfo.deviceType,
                lastKnownPhoneModel: deviceInfo.phoneModel,
                lastKnownBrowser: deviceInfo.browser,
                lastKnownOs: deviceInfo.os,
                lastKnownScreenWidth: screen?.width || null,
                lastKnownScreenHeight: screen?.height || null,
                lastKnownDevicePixelRatio: screen?.devicePixelRatio || null,
            }

            if (deviceId) {
                userUpdate.deviceId = deviceId
                userUpdate.lastDeviceId = deviceId
                userUpdate.deviceIds = admin.firestore.FieldValue.arrayUnion(deviceId)
            }

            await dbAdmin.collection('users').doc(accountId).set(userUpdate, { merge: true })
        }

        if (productUniqueRef && productCountRef) {
            let created = false
            await productUniqueRef.create({
                productId,
                viewerType: 'device',
                viewerId: productViewerId,
                pagePath,
                accountId: accountId || null,
                ipAddress,
                country: geo.country,
                region: geo.region,
                city: geo.city,
                userAgent: body?.userAgent || req.headers.get('user-agent') || null,
                platform: body?.platform || null,
                language: body?.language || null,
                timezone: body?.timezone || null,
                deviceType: deviceInfo.deviceType,
                phoneModel: deviceInfo.phoneModel,
                browser: deviceInfo.browser,
                os: deviceInfo.os,
                screenWidth: screen?.width || null,
                screenHeight: screen?.height || null,
                devicePixelRatio: screen?.devicePixelRatio || null,
                createdAt: now,
            }).then(() => {
                created = true
            }).catch((err) => {
                if (!isAlreadyExistsError(err)) throw err
            })

            if (created) {
                await productCountRef.set({
                    productId,
                    uniqueDeviceViews: admin.firestore.FieldValue.increment(1),
                    updatedAt: now,
                }, { merge: true })
            }
        }

        return NextResponse.json({ ok: true })
    } catch (error) {
        console.error('[page-view-track]', error)
        return NextResponse.json({ ok: false }, { status: 500 })
    }
}

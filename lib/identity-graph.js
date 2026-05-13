import admin from 'firebase-admin'
import { createHash } from 'node:crypto'

const normalize = (value = '') => String(value || '').trim().toLowerCase()

const getIpv4Prefix = (ip = '') => {
    const raw = String(ip || '').trim()
    const match = raw.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3})\.\d{1,3}$/)
    return match ? `${match[1]}.0` : raw
}

const getIpv6Prefix = (ip = '') => {
    const raw = String(ip || '').trim().toLowerCase()
    if (!raw.includes(':')) return raw
    const parts = raw.split(':').filter(Boolean)
    return parts.slice(0, 4).join(':')
}

const normalizeIpPrefix = (ip = '') => {
    const raw = String(ip || '').trim()
    if (!raw) return 'unknown-ip'
    if (raw.includes('.')) return getIpv4Prefix(raw)
    if (raw.includes(':')) return getIpv6Prefix(raw)
    return raw
}

const getUaFamily = (ua = '') => {
    const text = normalize(ua)
    if (!text) return 'unknown-ua'

    if (text.includes('chrome') && !text.includes('edg') && !text.includes('opr')) return 'chrome'
    if (text.includes('safari') && !text.includes('chrome')) return 'safari'
    if (text.includes('firefox')) return 'firefox'
    if (text.includes('edg')) return 'edge'
    if (text.includes('opr') || text.includes('opera')) return 'opera'
    return 'other'
}

export const buildNetworkFingerprint = ({
    ipAddress = '',
    userAgent = '',
    language = '',
    timezone = '',
    platform = '',
    country = '',
    region = '',
} = {}) => {
    const basis = [
        normalizeIpPrefix(ipAddress),
        getUaFamily(userAgent),
        normalize(language) || 'unknown-lang',
        normalize(timezone) || 'unknown-tz',
        normalize(platform) || 'unknown-platform',
        normalize(country) || 'unknown-country',
        normalize(region) || 'unknown-region',
    ].join('|')

    const hash = createHash('sha256').update(basis).digest('hex').slice(0, 24)
    return `net_${hash}`
}

const toDate = (value) => {
    if (!value) return null
    if (value?.toDate && typeof value.toDate === 'function') {
        return value.toDate()
    }
    const dt = new Date(value)
    return Number.isFinite(dt.getTime()) ? dt : null
}

const uniqueStrings = (values = []) => Array.from(new Set((Array.isArray(values) ? values : [])
    .map((item) => String(item || '').trim())
    .filter(Boolean)))

export const upsertIdentityGraph = async ({
    dbAdmin,
    accountId = '',
    deviceId = '',
    networkFingerprint = '',
    now = new Date(),
}) => {
    const account = String(accountId || '').trim()
    const device = String(deviceId || '').trim()
    const network = String(networkFingerprint || '').trim()

    if (!dbAdmin || (!account && !device)) return

    const writes = []
    if (account) {
        const ref = dbAdmin.collection('analytics_identity_links').doc(`account:${account}`)
        const payload = {
            type: 'account',
            accountId: account,
            updatedAt: now,
        }
        if (device) payload.deviceIds = admin.firestore.FieldValue.arrayUnion(device)
        if (network) payload.networkFingerprints = admin.firestore.FieldValue.arrayUnion(network)
        writes.push(ref.set(payload, { merge: true }))
    }

    if (device) {
        const ref = dbAdmin.collection('analytics_identity_links').doc(`device:${device}`)
        const payload = {
            type: 'device',
            deviceId: device,
            updatedAt: now,
        }
        if (account) payload.accountIds = admin.firestore.FieldValue.arrayUnion(account)
        if (network) payload.networkFingerprints = admin.firestore.FieldValue.arrayUnion(network)
        writes.push(ref.set(payload, { merge: true }))
    }

    if (writes.length) await Promise.all(writes)
}

export const getUnifiedIdentity = async ({ dbAdmin, accountId = '' }) => {
    const account = String(accountId || '').trim()
    if (!dbAdmin || !account) {
        return {
            accountId: account,
            deviceIds: [],
            networkFingerprints: [],
            privateDeviceIds: [],
            sharedDeviceIds: [],
        }
    }

    const accountSnap = await dbAdmin.collection('analytics_identity_links').doc(`account:${account}`).get()
    const accountData = accountSnap.exists ? accountSnap.data() || {} : {}
    const deviceIds = uniqueStrings(accountData.deviceIds || [])
    const networkFingerprints = uniqueStrings(accountData.networkFingerprints || [])

    if (!deviceIds.length) {
        return {
            accountId: account,
            deviceIds,
            networkFingerprints,
            privateDeviceIds: [],
            sharedDeviceIds: [],
        }
    }

    const refs = deviceIds.map((id) => dbAdmin.collection('analytics_identity_links').doc(`device:${id}`))
    const docs = []
    for (let i = 0; i < refs.length; i += 100) {
        const chunk = refs.slice(i, i + 100)
        if (!chunk.length) continue
        const snap = await dbAdmin.getAll(...chunk)
        docs.push(...snap)
    }

    const privateDeviceIds = []
    const sharedDeviceIds = []

    docs.forEach((snap) => {
        if (!snap?.exists) return
        const data = snap.data() || {}
        const deviceId = String(data.deviceId || '').trim()
        if (!deviceId) return

        const accountIds = uniqueStrings(data.accountIds || [])
        if (accountIds.length > 1) sharedDeviceIds.push(deviceId)
        else privateDeviceIds.push(deviceId)

        uniqueStrings(data.networkFingerprints || []).forEach((fp) => networkFingerprints.push(fp))
    })

    return {
        accountId: account,
        deviceIds: uniqueStrings(deviceIds),
        networkFingerprints: uniqueStrings(networkFingerprints),
        privateDeviceIds: uniqueStrings(privateDeviceIds),
        sharedDeviceIds: uniqueStrings(sharedDeviceIds),
    }
}

export const isRecent = (value, maxDays = 30) => {
    const dt = toDate(value)
    if (!dt) return false
    const ageMs = Date.now() - dt.getTime()
    if (!Number.isFinite(ageMs) || ageMs < 0) return false
    return ageMs <= maxDays * 24 * 60 * 60 * 1000
}

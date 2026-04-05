import admin from 'firebase-admin'

const parseMaybeJson = (value) => {
    if (!value || typeof value !== 'string') return null
    const trimmed = value.trim()
    if (!trimmed) return null

    try {
        return JSON.parse(trimmed)
    } catch {
        // Some deployment UIs wrap JSON in single quotes.
        if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
            try {
                return JSON.parse(trimmed.slice(1, -1))
            } catch {
                return null
            }
        }
        return null
    }
}

const parseBase64Json = (value) => {
    if (!value || typeof value !== 'string') return null
    try {
        const decoded = Buffer.from(value, 'base64').toString('utf8')
        return JSON.parse(decoded)
    } catch {
        return null
    }
}

const buildServiceAccount = () => {
    const fromInlineJson = parseMaybeJson(process.env.FIREBASE_SERVICE_ACCOUNT)
    if (fromInlineJson) return { source: 'FIREBASE_SERVICE_ACCOUNT', credentials: fromInlineJson }

    const fromJsonBase64 = parseBase64Json(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64)
    if (fromJsonBase64) return { source: 'FIREBASE_SERVICE_ACCOUNT_BASE64', credentials: fromJsonBase64 }

    const fromGoogleJson = parseMaybeJson(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON)
    if (fromGoogleJson) return { source: 'GOOGLE_APPLICATION_CREDENTIALS_JSON', credentials: fromGoogleJson }

    if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
        return {
            source: 'FIREBASE_PRIVATE_KEY + FIREBASE_CLIENT_EMAIL',
            credentials: {
                projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            },
        }
    }

    return null
}

let adminInitSource = null
let adminInitError = null

if (!admin.apps.length) {
    try {
        const serviceAccountConfig = buildServiceAccount()
        if (serviceAccountConfig?.credentials) {
            const serviceAccount = serviceAccountConfig.credentials
            adminInitSource = serviceAccountConfig.source
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            })
        } else {
            adminInitError = 'Missing credentials. Configure FIREBASE_SERVICE_ACCOUNT or FIREBASE_PRIVATE_KEY/FIREBASE_CLIENT_EMAIL.'
            console.warn(`Firebase Admin: ${adminInitError}`)
        }
    } catch (error) {
        adminInitError = error?.message || 'Unknown initialization error'
        console.error('Firebase Admin Initialization Error:', error.stack)
    }
}

export const dbAdmin = admin.apps.length > 0 ? admin.firestore() : null
export const authAdmin = admin.apps.length > 0 ? admin.auth() : null
export const storageAdmin = admin.apps.length > 0 ? admin.storage() : null
export const firebaseAdminStatus = {
    ready: admin.apps.length > 0,
    source: adminInitSource,
    error: admin.apps.length > 0 ? null : (adminInitError || 'Not initialized'),
}

// Helper for converting Firestore timestamps in responses
export const timestampToJSON = (ts) => {
    if (!ts) return null
    return ts.toDate ? ts.toDate().toISOString() : ts
}

// Recursively sanitize Firestore data for Server -> Client component props
export const sanitizeFirestoreData = (value) => {
    if (!value) return value
    if (Array.isArray(value)) return value.map(sanitizeFirestoreData)
    if (typeof value === 'object') {
        if (typeof value.toDate === 'function') return timestampToJSON(value)
        const out = {}
        for (const [key, val] of Object.entries(value)) {
            out[key] = sanitizeFirestoreData(val)
        }
        return out
    }
    return value
}

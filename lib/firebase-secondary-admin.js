import admin from 'firebase-admin'

const parseMaybeJson = (value) => {
    if (!value || typeof value !== 'string') return null
    const trimmed = value.trim()
    if (!trimmed) return null

    try {
        return JSON.parse(trimmed)
    } catch {
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

const buildSecondaryServiceAccount = () => {
    const fromInlineJson = parseMaybeJson(process.env.SECONDARY_FIREBASE_SERVICE_ACCOUNT)
    if (fromInlineJson) return { source: 'SECONDARY_FIREBASE_SERVICE_ACCOUNT', credentials: fromInlineJson }

    const fromJsonBase64 = parseBase64Json(process.env.SECONDARY_FIREBASE_SERVICE_ACCOUNT_BASE64)
    if (fromJsonBase64) return { source: 'SECONDARY_FIREBASE_SERVICE_ACCOUNT_BASE64', credentials: fromJsonBase64 }

    const fromGoogleJson = parseMaybeJson(process.env.SECONDARY_GOOGLE_APPLICATION_CREDENTIALS_JSON)
    if (fromGoogleJson) return { source: 'SECONDARY_GOOGLE_APPLICATION_CREDENTIALS_JSON', credentials: fromGoogleJson }

    if (process.env.SECONDARY_FIREBASE_PRIVATE_KEY && process.env.SECONDARY_FIREBASE_CLIENT_EMAIL) {
        return {
            source: 'SECONDARY_FIREBASE_PRIVATE_KEY + SECONDARY_FIREBASE_CLIENT_EMAIL',
            credentials: {
                projectId: process.env.SECONDARY_FIREBASE_PROJECT_ID,
                clientEmail: process.env.SECONDARY_FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.SECONDARY_FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            },
        }
    }

    return null
}

const SECONDARY_APP_NAME = 'secondary-price-tracker'
let secondaryInitSource = null
let secondaryInitError = null
const hasPublicSecondaryWebConfig = Boolean(
    process.env.NEXT_PUBLIC_SECONDARY_FIREBASE_API_KEY
    || process.env.NEXT_PUBLIC_SECONDARY_FIREBASE_AUTH_DOMAIN
    || process.env.NEXT_PUBLIC_SECONDARY_FIREBASE_PROJECT_ID
    || process.env.NEXT_PUBLIC_SECONDARY_FIREBASE_APP_ID
)

try {
    const existing = admin.apps.find((app) => app.name === SECONDARY_APP_NAME)
    if (!existing) {
        const serviceAccountConfig = buildSecondaryServiceAccount()
        if (serviceAccountConfig?.credentials) {
            secondaryInitSource = serviceAccountConfig.source
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccountConfig.credentials),
            }, SECONDARY_APP_NAME)
        } else {
            secondaryInitError = hasPublicSecondaryWebConfig
                ? 'Secondary Firebase web config is present, but Admin SDK credentials are missing. Add SECONDARY_FIREBASE_SERVICE_ACCOUNT, SECONDARY_FIREBASE_SERVICE_ACCOUNT_BASE64, SECONDARY_GOOGLE_APPLICATION_CREDENTIALS_JSON, or SECONDARY_FIREBASE_CLIENT_EMAIL + SECONDARY_FIREBASE_PRIVATE_KEY.'
                : 'Missing secondary Firebase credentials.'
        }
    } else {
        secondaryInitSource = 'existing app instance'
    }
} catch (error) {
    secondaryInitError = error?.message || 'Secondary Firebase initialization error'
}

const secondaryApp = admin.apps.find((app) => app.name === SECONDARY_APP_NAME) || null

export const dbSecondary = secondaryApp ? secondaryApp.firestore() : null
export const secondaryFirebaseAdminStatus = {
    ready: Boolean(secondaryApp),
    source: secondaryInitSource,
    error: secondaryApp ? null : (secondaryInitError || 'Not initialized'),
}

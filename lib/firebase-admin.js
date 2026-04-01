import admin from 'firebase-admin'

if (!admin.apps.length) {
    try {
        const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT
        if (serviceAccountStr) {
            // Option 1: Full JSON string
            const serviceAccount = JSON.parse(serviceAccountStr)
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            })
        } else if (process.env.FIREBASE_PRIVATE_KEY) {
            // Option 2: Individual variables
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
                })
            })
        } else {
            console.warn('Firebase Admin: Missing credentials. Some features may not work.')
        }
    } catch (error) {
        console.error('Firebase Admin Initialization Error:', error.stack)
    }
}

export const dbAdmin = admin.apps.length > 0 ? admin.firestore() : null
export const authAdmin = admin.apps.length > 0 ? admin.auth() : null
export const storageAdmin = admin.apps.length > 0 ? admin.storage() : null

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

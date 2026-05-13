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

const initializeAppInstance = (appName, jsonEnvKey, base64EnvKey) => {
    try {
        let creds = parseMaybeJson(process.env[jsonEnvKey])
        if (!creds) creds = parseBase64Json(process.env[base64EnvKey])
        
        // Remove the automatic fallback here. We will handle fallback at the app level.
        if (!creds) {
            return null
        }

        if (creds) {
            return admin.initializeApp({ credential: admin.credential.cert(creds) }, appName)
        }
    } catch (e) {
        console.warn(`[Firebase] Failed to initialize ${appName}:`, e.message)
    }
    return null
}

let primaryApp = admin.apps.find(a => a.name === 'primary')
let secondaryApp = admin.apps.find(a => a.name === 'secondary')
let usersApp = admin.apps.find(a => a.name === 'users')
let workspaceApp = admin.apps.find(a => a.name === 'workspace')

// 1. Initialize Primary App
if (!primaryApp) {
    primaryApp = initializeAppInstance('primary', 'FIREBASE_PRIMARY_SERVICE_ACCOUNT', 'FIREBASE_PRIMARY_SERVICE_ACCOUNT_BASE64')
    if (!primaryApp) {
        primaryApp = initializeAppInstance('primary', 'FIREBASE_SERVICE_ACCOUNT', 'FIREBASE_SERVICE_ACCOUNT_BASE64')
    }
    // Fallback to default app if no named app could be created but Google Default Credentials exist
    if (!primaryApp && admin.apps.length > 0) {
        primaryApp = admin.apps[0]
    }
}

// 2. Initialize Secondary App (only if custom env vars exist, otherwise alias Primary)
if (!secondaryApp) {
    secondaryApp = initializeAppInstance('secondary', 'FIREBASE_SECONDARY_SERVICE_ACCOUNT', 'FIREBASE_SECONDARY_SERVICE_ACCOUNT_BASE64')
}

// 3. Initialize Users App (only if custom env vars exist, otherwise alias Primary)
if (!usersApp) {
    usersApp = initializeAppInstance('users', 'FIREBASE_USERS_SERVICE_ACCOUNT', 'FIREBASE_USERS_SERVICE_ACCOUNT_BASE64')
}

// 4. Initialize Workspace App (only if custom env vars exist, otherwise alias Primary)
if (!workspaceApp) {
    workspaceApp = initializeAppInstance('workspace', 'FIREBASE_WORKSPACE_SERVICE_ACCOUNT', 'FIREBASE_WORKSPACE_SERVICE_ACCOUNT_BASE64')
}

// For backwards compatibility and internal routing
export const dbAdmin = primaryApp ? primaryApp.firestore() : null
export const authAdmin = primaryApp ? primaryApp.auth() : null
export const storageAdmin = primaryApp ? primaryApp.storage() : null

export const dbPrimary = primaryApp ? primaryApp.firestore() : null
export const dbSecondary = secondaryApp ? secondaryApp.firestore() : null
export const dbUsers = usersApp ? usersApp.firestore() : (primaryApp ? primaryApp.firestore() : null)
export const dbWorkspace = workspaceApp ? workspaceApp.firestore() : (primaryApp ? primaryApp.firestore() : null)

// Cache for the active production database router
let cachedRouterState = null
let routerCacheExpiry = 0

export async function getProductionDb() {
    if (!dbWorkspace) return dbPrimary // Ultimate fallback

    if (Date.now() < routerCacheExpiry && cachedRouterState) {
        return cachedRouterState === 'secondary' && dbSecondary ? dbSecondary : dbPrimary
    }

    try {
        const snap = await dbWorkspace.collection('settings').doc('database_router').get()
        const active = snap.exists ? snap.data().activeProductionDb : 'primary'
        
        cachedRouterState = active
        routerCacheExpiry = Date.now() + 1000 * 60 // 1 minute cache

        return active === 'secondary' && dbSecondary ? dbSecondary : dbPrimary
    } catch (err) {
        return dbPrimary
    }
}

export const firebaseAdminStatus = {
    ready: !!dbAdmin,
    multiDbEnabled: !!(usersApp && workspaceApp),
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

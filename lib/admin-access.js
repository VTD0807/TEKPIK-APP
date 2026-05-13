import { authAdmin, dbAdmin } from '@/lib/firebase-admin'
import { isAdminEmail } from '@/lib/admin'

const DEFAULT_ACCESS = {
    admin: false,
    cms: false,
    store: false,
    analytics: false,
    users: false,
    employees: false,
    reviews: false,
    products: false,
    notifications: false,
    settings: false,
}

export function normalizeDashboardAccess(value = {}) {
    const source = value && typeof value === 'object' ? value : {}
    const out = { ...DEFAULT_ACCESS }
    Object.keys(out).forEach((key) => {
        out[key] = Boolean(source[key])
    })
    return out
}

function getRequestToken(req) {
    const authHeader = req.headers.get('Authorization') || ''
    if (authHeader.startsWith('Bearer ')) {
        return authHeader.slice('Bearer '.length)
    }
    return req.cookies.get('fb-token')?.value || null
}

// In-memory cache to prevent slow database lookups on every API call
const ACCESS_CACHE = new Map()
const CACHE_TTL_MS = 1000 * 60 * 2 // 2 minutes

export async function getAccessContext(req) {
    if (!authAdmin || !dbAdmin) {
        return { ok: false, status: 500, error: 'Auth/DB not initialized' }
    }

    const token = getRequestToken(req)
    if (!token) {
        return { ok: false, status: 401, error: 'Authentication required' }
    }

    try {
        // Check cache
        if (ACCESS_CACHE.has(token)) {
            const cached = ACCESS_CACHE.get(token)
            if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
                return cached.data
            }
            ACCESS_CACHE.delete(token)
        }

        const decoded = await authAdmin.verifyIdToken(token)
        const userSnap = await dbAdmin.collection('users').doc(decoded.uid).get()
        const userData = userSnap.exists ? (userSnap.data() || {}) : {}
        const role = userData.role || 'USER'
        const access = normalizeDashboardAccess(userData.dashboardAccess)
        const isAdmin = role === 'ADMIN' || isAdminEmail(decoded.email || userData.email)

        const result = {
            ok: true,
            uid: decoded.uid,
            role,
            isAdmin,
            access,
            user: userData,
            email: decoded.email || userData.email,
        }

        ACCESS_CACHE.set(token, { timestamp: Date.now(), data: result })
        return result
    } catch (error) {
        if (error?.code?.startsWith('auth/')) {
            return { ok: false, status: 401, error: 'Invalid or expired auth token' }
        }
        console.error('[getAccessContext] DB/Auth Error:', error.message)
        return { ok: false, status: 500, error: 'Internal Server Error: ' + error.message }
    }
}

export function hasAdminAccess(ctx, moduleKey = 'admin') {
    if (!ctx?.ok) return false
    if (ctx.isAdmin) return true

    const access = normalizeDashboardAccess(ctx.access)
    if (!moduleKey || moduleKey === 'admin') {
        return Boolean(access.admin)
    }

    // Module APIs are accessible for users assigned to that module,
    // even if they are not granted full admin-home access.
    return Boolean(access.admin || access[moduleKey])
}

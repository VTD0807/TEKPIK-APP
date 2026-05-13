/**
 * Persistent Device Identity — survives cache/cookie/history clears.
 *
 * Strategy (ordered by durability):
 * 1. localStorage          — fast, cleared on "Clear site data"
 * 2. Cookie (10-year)       — survives localStorage clear, cleared on "Clear cookies"
 * 3. IndexedDB              — survives both above, cleared on "Clear all site data"
 * 4. Canvas+WebGL fingerprint — deterministic hash from GPU/rendering, survives ALL clears
 *
 * On every call we try all 4 sources, pick the first UUID found, and
 * re-sync it into all layers. If all layers are empty (first visit or total wipe),
 * we generate a new UUID and write everywhere.
 *
 * The canvas fingerprint is sent to the server so the backend can re-associate
 * a wiped device with its old UUID (Firestore lookup by fingerprint).
 */

const STORAGE_KEY = 'tekpik_device_id'
const COOKIE_KEY  = 'tkpk_did'
const IDB_DB      = 'tekpik_identity'
const IDB_STORE   = 'device'
const IDB_KEY     = 'device_id'
const FP_KEY      = 'tekpik_fp'

// ── UUID generator ───────────────────────────────────────────────────────────
const makeUUID = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID()
    }
    return `dev_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

// ── localStorage ─────────────────────────────────────────────────────────────
const lsGet = () => { try { return localStorage.getItem(STORAGE_KEY) || '' } catch { return '' } }
const lsSet = (v) => { try { localStorage.setItem(STORAGE_KEY, v) } catch {} }

// ── Cookie (10 years) ────────────────────────────────────────────────────────
const cookieGet = () => {
    try {
        const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_KEY}=([^;]+)`))
        return match?.[1] || ''
    } catch { return '' }
}
const cookieSet = (v) => {
    try {
        const expires = new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000).toUTCString()
        document.cookie = `${COOKIE_KEY}=${v}; expires=${expires}; path=/; SameSite=Lax`
    } catch {}
}

// ── IndexedDB ────────────────────────────────────────────────────────────────
const idbOpen = () => new Promise((resolve, reject) => {
    try {
        const req = indexedDB.open(IDB_DB, 1)
        req.onupgradeneeded = () => {
            const db = req.result
            if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE)
        }
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
    } catch (e) { reject(e) }
})

const idbGet = async () => {
    try {
        const db = await idbOpen()
        return new Promise((resolve) => {
            const tx = db.transaction(IDB_STORE, 'readonly')
            const req = tx.objectStore(IDB_STORE).get(IDB_KEY)
            req.onsuccess = () => resolve(req.result || '')
            req.onerror = () => resolve('')
        })
    } catch { return '' }
}

const idbSet = async (v) => {
    try {
        const db = await idbOpen()
        const tx = db.transaction(IDB_STORE, 'readwrite')
        tx.objectStore(IDB_STORE).put(v, IDB_KEY)
    } catch {}
}

// ── Canvas / WebGL Fingerprint ───────────────────────────────────────────────
// Deterministic hash derived from GPU rendering — same device ≈ same hash.
const computeFingerprint = () => {
    try {
        const parts = []

        // Canvas fingerprint
        const canvas = document.createElement('canvas')
        canvas.width = 280
        canvas.height = 60
        const ctx = canvas.getContext('2d')
        if (ctx) {
            ctx.textBaseline = 'alphabetic'
            ctx.fillStyle = '#f60'
            ctx.fillRect(125, 1, 62, 20)
            ctx.fillStyle = '#069'
            ctx.font = '14px Arial'
            ctx.fillText('TekPik:fp:2025', 2, 15)
            ctx.fillStyle = 'rgba(102,204,0,0.7)'
            ctx.font = '18px Times New Roman'
            ctx.fillText('TekPik:fp:2025', 4, 45)
            parts.push(canvas.toDataURL())
        }

        // WebGL fingerprint
        const gl = document.createElement('canvas').getContext('webgl')
        if (gl) {
            const dbg = gl.getExtension('WEBGL_debug_renderer_info')
            if (dbg) {
                parts.push(gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) || '')
                parts.push(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '')
            }
        }

        // Screen geometry
        parts.push(`${screen.width}x${screen.height}x${window.devicePixelRatio || 1}`)
        parts.push(screen.colorDepth || '')
        parts.push(Intl.DateTimeFormat().resolvedOptions().timeZone || '')
        parts.push(navigator.hardwareConcurrency || '')
        parts.push(navigator.maxTouchPoints || 0)
        parts.push(navigator.language || '')
        parts.push(navigator.platform || '')

        const raw = parts.join('|||')
        return hashString(raw)
    } catch {
        return ''
    }
}

// Simple but collision-resistant string hash (FNV-1a + hex)
const hashString = (str) => {
    let h1 = 0x811c9dc5, h2 = 0x01000193
    for (let i = 0; i < str.length; i++) {
        const c = str.charCodeAt(i)
        h1 = Math.imul(h1 ^ c, h2)
        h2 = Math.imul(h2 ^ (c << 1), 0x01000193)
    }
    const a = (h1 >>> 0).toString(16).padStart(8, '0')
    const b = (h2 >>> 0).toString(16).padStart(8, '0')
    // Run again with different seed for more entropy
    let h3 = 0x6c62272e
    for (let i = 0; i < str.length; i++) {
        h3 = Math.imul(h3 ^ str.charCodeAt(i), 0x5bd1e995)
    }
    const c = (h3 >>> 0).toString(16).padStart(8, '0')
    return `fp_${a}${b}${c}`
}

// ── Cached fingerprint ───────────────────────────────────────────────────────
let _cachedFp = null
export const getDeviceFingerprint = () => {
    if (typeof window === 'undefined') return ''
    if (_cachedFp) return _cachedFp
    _cachedFp = computeFingerprint()
    // Also persist the fingerprint so we can read it without recomputing
    try { localStorage.setItem(FP_KEY, _cachedFp) } catch {}
    return _cachedFp
}

// ── Main: get or create persistent device ID ─────────────────────────────────
let _deviceIdPromise = null

export const getDeviceId = () => {
    if (typeof window === 'undefined') return ''

    // Synchronous fast path — check localStorage and cookie first
    const ls = lsGet()
    const ck = cookieGet()
    const fast = ls || ck
    if (fast) {
        // Re-sync into whichever layer was missing
        if (!ls) lsSet(fast)
        if (!ck) cookieSet(fast)
        // Async sync to IDB in background
        idbSet(fast).catch(() => {})
        return fast
    }

    // If no sync source, return empty; the async resolver will fix it
    return ''
}

// Async version — tries all layers including IDB + fingerprint server recovery
export const getDeviceIdAsync = async () => {
    if (typeof window === 'undefined') return ''
    if (_deviceIdPromise) return _deviceIdPromise
    _deviceIdPromise = _resolveDeviceId()
    return _deviceIdPromise
}

const _resolveDeviceId = async () => {
    // 1. Check sync layers
    const ls = lsGet()
    const ck = cookieGet()
    let id = ls || ck

    // 2. Check IndexedDB
    if (!id) {
        id = await idbGet()
    }

    // 3. If still no ID, try to recover from server using fingerprint
    if (!id) {
        const fp = getDeviceFingerprint()
        if (fp) {
            try {
                const res = await fetch('/api/analytics/device-recover', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fingerprint: fp }),
                })
                const data = await res.json()
                if (data.deviceId) id = data.deviceId
            } catch {}
        }
    }

    // 4. Last resort — generate new UUID
    if (!id) id = makeUUID()

    // 5. Write to all layers
    lsSet(id)
    cookieSet(id)
    await idbSet(id)

    return id
}

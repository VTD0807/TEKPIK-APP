/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║ Tekpik — Production-Grade Server Cache                                 ║
 * ║                                                                        ║
 * ║  A multi-tier, LRU-evictable, stale-while-revalidate in-memory cache   ║
 * ║  for reducing Firestore read pressure on hot paths.                    ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Features:
 *  - LRU eviction with configurable max entries (prevents memory leaks)
 *  - Stale-while-revalidate: serves stale data immediately while refreshing
 *  - Deduplication: concurrent fetchers for the same key share one promise
 *  - Manual invalidation & prefix invalidation for write-through patterns
 *  - Batch get for multi-key reads
 *  - Cache statistics for monitoring
 */

const CACHE_KEY = '__tekpik_server_cache__'
const DEFAULT_MAX_ENTRIES = 500

/**
 * @typedef {{ value: any, expiresAt: number, staleAt: number, lastAccess: number }} CacheEntry
 */

class TekpikCache {
    constructor(maxEntries = DEFAULT_MAX_ENTRIES) {
        /** @type {Map<string, CacheEntry>} */
        this.store = new Map()
        /** @type {Map<string, Promise>} in-flight fetchers for dedup */
        this.inflight = new Map()
        this.maxEntries = maxEntries
        this.hits = 0
        this.misses = 0
        this.staleHits = 0
    }

    /**
     * Get a cached value, or fetch it if missing / expired.
     *
     * @param {string} key          Unique cache key
     * @param {number} ttlMs        Time-to-live in milliseconds (fresh window)
     * @param {() => Promise<any>} fetcher  Async function that produces the value
     * @param {{ staleTtlMs?: number }} [opts]
     *        staleTtlMs — extra time the value is considered "stale but usable".
     *        Defaults to ttlMs (so total life = 2×ttlMs before hard expiry).
     */
    async get(key, ttlMs, fetcher, opts = {}) {
        const now = Date.now()
        const staleTtlMs = opts.staleTtlMs ?? ttlMs
        const cached = this.store.get(key)

        // ── CACHE HIT (fresh) ──
        if (cached && now < cached.expiresAt) {
            cached.lastAccess = now
            this.hits++
            return cached.value
        }

        // ── STALE-WHILE-REVALIDATE ──
        if (cached && now < cached.staleAt) {
            cached.lastAccess = now
            this.staleHits++
            // Trigger background revalidation (fire-and-forget)
            if (!this.inflight.has(key)) {
                const revalidate = this._fetch(key, ttlMs, staleTtlMs, fetcher)
                revalidate.catch(() => {}) // swallow background errors
            }
            return cached.value
        }

        // ── CACHE MISS — deduplicated fetch ──
        this.misses++
        return this._fetch(key, ttlMs, staleTtlMs, fetcher)
    }

    /** Internal: run the fetcher with in-flight deduplication. */
    async _fetch(key, ttlMs, staleTtlMs, fetcher) {
        // If another caller is already fetching, piggyback on the same promise
        if (this.inflight.has(key)) {
            return this.inflight.get(key)
        }

        const promise = fetcher().then((value) => {
            const now = Date.now()
            this._evictIfNeeded()
            this.store.set(key, {
                value,
                expiresAt: now + ttlMs,
                staleAt: now + ttlMs + staleTtlMs,
                lastAccess: now,
            })
            this.inflight.delete(key)
            return value
        }).catch((err) => {
            this.inflight.delete(key)
            
            // Intercept Quota Limit Exhaustion
            if (err?.code === 8 || (err?.message && err.message.includes('RESOURCE_EXHAUSTED'))) {
                import('@/lib/mailer').then(m => m.reportDatabaseQuotaError(err)).catch(() => {})
            }

            // If we have stale data, return it on fetch failure (resilience)
            const stale = this.store.get(key)
            if (stale) {
                stale.lastAccess = Date.now()
                return stale.value
            }
            throw err
        })

        this.inflight.set(key, promise)
        return promise
    }

    /** Set a value directly (write-through). */
    set(key, value, ttlMs, staleTtlMs) {
        const now = Date.now()
        this._evictIfNeeded()
        this.store.set(key, {
            value,
            expiresAt: now + ttlMs,
            staleAt: now + ttlMs + (staleTtlMs ?? ttlMs),
            lastAccess: now,
        })
    }

    /** Invalidate a single key. */
    invalidate(key) {
        this.store.delete(key)
        this.inflight.delete(key)
    }

    /** Invalidate all keys matching a prefix (e.g., 'products:' clears all product caches). */
    invalidatePrefix(prefix) {
        for (const key of this.store.keys()) {
            if (key.startsWith(prefix)) {
                this.store.delete(key)
                this.inflight.delete(key)
            }
        }
    }

    /** Check if a key exists and is still fresh. */
    has(key) {
        const entry = this.store.get(key)
        return entry ? Date.now() < entry.expiresAt : false
    }

    /** Get raw value without fetching (returns undefined if missing/expired). */
    peek(key) {
        const entry = this.store.get(key)
        if (!entry) return undefined
        if (Date.now() >= entry.staleAt) {
            this.store.delete(key)
            return undefined
        }
        return entry.value
    }

    /** Evict LRU entries when store exceeds maxEntries. */
    _evictIfNeeded() {
        if (this.store.size < this.maxEntries) return

        const now = Date.now()
        // First pass: remove expired entries
        for (const [key, entry] of this.store) {
            if (now >= entry.staleAt) this.store.delete(key)
        }
        if (this.store.size < this.maxEntries) return

        // Second pass: evict LRU (oldest lastAccess)
        const entries = Array.from(this.store.entries())
            .sort((a, b) => a[1].lastAccess - b[1].lastAccess)

        const toRemove = entries.slice(0, Math.ceil(this.maxEntries * 0.2))
        toRemove.forEach(([key]) => this.store.delete(key))
    }

    /** Cache statistics for monitoring. */
    getStats() {
        const total = this.hits + this.misses + this.staleHits
        return {
            entries: this.store.size,
            hits: this.hits,
            misses: this.misses,
            staleHits: this.staleHits,
            hitRate: total > 0 ? ((this.hits + this.staleHits) / total * 100).toFixed(1) + '%' : '0%',
            inflightCount: this.inflight.size,
        }
    }

    /** Reset stats (useful for periodic monitoring). */
    resetStats() {
        this.hits = 0
        this.misses = 0
        this.staleHits = 0
    }
}

/** Singleton — survives HMR in dev and shares state across modules. */
const getCache = () => {
    if (!globalThis[CACHE_KEY]) {
        globalThis[CACHE_KEY] = new TekpikCache(DEFAULT_MAX_ENTRIES)
    }
    return globalThis[CACHE_KEY]
}

// ── Public API (backwards-compatible) ────────────────────────────────────────

/**
 * Get or fetch a cached value (original API — kept for backward compat).
 * @param {string} key
 * @param {number} ttlMs
 * @param {() => Promise<any>} fetcher
 */
export async function getCached(key, ttlMs, fetcher) {
    return getCache().get(key, ttlMs, fetcher)
}

/**
 * Enhanced get with stale-while-revalidate support.
 * @param {string} key
 * @param {number} ttlMs       Fresh window
 * @param {number} staleTtlMs  Extra stale window (serves stale while revalidating)
 * @param {() => Promise<any>} fetcher
 */
export async function getCachedSWR(key, ttlMs, staleTtlMs, fetcher) {
    return getCache().get(key, ttlMs, fetcher, { staleTtlMs })
}

/** Write-through: set value directly in cache. */
export function setCached(key, value, ttlMs, staleTtlMs) {
    getCache().set(key, value, ttlMs, staleTtlMs)
}

/** Invalidate a single key. */
export function invalidateCache(key) {
    getCache().invalidate(key)
}

/** Invalidate all keys with a given prefix. */
export function invalidateCachePrefix(prefix) {
    getCache().invalidatePrefix(prefix)
}

/** Check if key is fresh in cache. */
export function hasCached(key) {
    return getCache().has(key)
}

/** Peek at cached value without triggering fetch. */
export function peekCached(key) {
    return getCache().peek(key)
}

/** Get cache stats for monitoring/debugging. */
export function getCacheStats() {
    return getCache().getStats()
}

/** Reset cache stats. */
export function resetCacheStats() {
    getCache().resetStats()
}

export default getCache

const CACHE_KEY = '__tekpik_server_cache__'

const getStore = () => {
    if (!globalThis[CACHE_KEY]) {
        globalThis[CACHE_KEY] = new Map()
    }
    return globalThis[CACHE_KEY]
}

export async function getCached(key, ttlMs, fetcher) {
    const store = getStore()
    const now = Date.now()
    const cached = store.get(key)
    if (cached && cached.expiresAt > now) {
        return cached.value
    }
    const value = await fetcher()
    store.set(key, { value, expiresAt: now + ttlMs })
    return value
}

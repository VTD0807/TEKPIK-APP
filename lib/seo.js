const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1'])

const normalizeSiteUrl = (rawValue = '') => {
    const value = String(rawValue || '').trim()
    if (!value) return ''

    const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`

    try {
        const parsed = new URL(withProtocol)
        const isLocalHost = LOCAL_HOSTS.has(parsed.hostname.toLowerCase())
        if (isLocalHost && process.env.NODE_ENV === 'production') {
            return ''
        }
        return parsed.origin.replace(/\/$/, '')
    } catch {
        return ''
    }
}

export const getSiteUrl = () => {
    const candidates = [
        process.env.NEXT_PUBLIC_SITE_URL,
        process.env.NEXT_PUBLIC_APP_URL,
        process.env.SITE_URL,
        process.env.APP_URL,
        process.env.VERCEL_PROJECT_PRODUCTION_URL,
        process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '',
        'https://tekpik.in',
    ]

    for (const candidate of candidates) {
        const normalized = normalizeSiteUrl(candidate)
        if (normalized) return normalized
    }

    return 'https://tekpik.in'
}

export const absoluteUrl = (path = '/') => {
    const normalizedPath = String(path || '/').startsWith('/') ? String(path || '/') : `/${String(path || '')}`
    return `${getSiteUrl()}${normalizedPath}`
}

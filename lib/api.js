/**
 * Internal service client.
 * SERVER-SIDE only — SERVICE_API_KEY is not prefixed with NEXT_PUBLIC_.
 */
const SERVICE_URL = process.env.SERVICE_URL
const SERVICE_API_KEY = process.env.SERVICE_API_KEY

/**
 * Fetch wrapper for internal service calls.
 * @param {string} path  - e.g. '/products'
 * @param {RequestInit} [options]
 */
export async function serviceRequest(path, options = {}) {
    const res = await fetch(`${SERVICE_URL}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': SERVICE_API_KEY,
            ...options.headers,
        },
    })

    if (!res.ok) {
        const text = await res.text()
        throw new Error(`Service error ${res.status}: ${text}`)
    }

    return res.json()
}

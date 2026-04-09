import { dbAdmin, timestampToJSON } from '@/lib/firebase-admin'

export const dynamic = 'force-dynamic'
export const revalidate = 3600

export default async function sitemap() {
    const siteUrl = 'https://tekpik.in'
    const now = new Date()
    const staticPages = [
        '',
        '/shop',
        '/ask-ai',
        '/about',
        '/help',
        '/disclosure',
    ].map((path) => ({
        url: `${siteUrl}${path}`,
        lastModified: now,
        changeFrequency: 'daily',
        priority: path === '' ? 1.0 : 0.8,
        images: path === '' ? [`${siteUrl}/logo-tekpik.png`] : [],
    }))

    if (!dbAdmin) return staticPages

    try {
        const [activeSnap, legacyActiveSnap] = await Promise.all([
            dbAdmin.collection('products').where('isActive', '==', true).get(),
            dbAdmin.collection('products').where('is_active', '==', true).get(),
        ])

        const docsById = new Map()
        activeSnap.forEach((doc) => docsById.set(doc.id, doc))
        legacyActiveSnap.forEach((doc) => docsById.set(doc.id, doc))

        const productPages = []

        docsById.forEach((doc) => {
            const data = doc.data() || {}
            const updatedAt = timestampToJSON(data.updatedAt || data.createdAt) || new Date().toISOString()
            productPages.push({
                url: `${siteUrl}/products/${doc.id}`,
                lastModified: updatedAt,
                changeFrequency: 'daily',
                priority: 0.9,
            })
        })

        return [...staticPages, ...productPages]
    } catch {
        return staticPages
    }
}

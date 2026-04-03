import { dbAdmin, timestampToJSON } from '@/lib/firebase-admin'
import { getSiteUrl } from '@/lib/seo'

export const dynamic = 'force-dynamic'

export default async function sitemap() {
    const siteUrl = getSiteUrl()
    const staticPages = [
        '',
        '/shop',
        '/ai-picks',
        '/about',
        '/help',
        '/disclosure',
    ].map((path) => ({
        url: `${siteUrl}${path}`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: path === '' ? 1.0 : 0.8,
        images: path === '' ? [`${siteUrl}/logo-tekpik.png`] : [],
    }))

    if (!dbAdmin) return staticPages

    try {
        const snapshot = await dbAdmin.collection('products').where('isActive', '==', true).get()
        const productPages = []

        snapshot.forEach((doc) => {
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

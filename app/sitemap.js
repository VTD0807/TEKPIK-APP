import { getCatalog } from '@/lib/db-queries'

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
        '/privacy',
        '/terms',
        '/contact',
        '/disclosure',
    ].map((path) => ({
        url: `${siteUrl}${path}`,
        lastModified: now,
        changeFrequency: 'daily',
        priority: path === '' ? 1.0 : 0.8,
        images: path === '' ? [`${siteUrl}/logo-tekpik.png`] : [],
    }))

    try {
        // Use the cached catalog — zero extra reads, routes through DB router
        const { products } = await getCatalog()

        const productPages = products.map((product) => ({
            url: `${siteUrl}/products/${product.id}`,
            lastModified: product.updatedAt || product.createdAt || now.toISOString(),
            changeFrequency: 'daily',
            priority: 0.9,
        }))

        return [...staticPages, ...productPages]
    } catch {
        return staticPages
    }
}

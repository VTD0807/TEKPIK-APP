import { getSiteUrl } from '@/lib/seo'

export default function robots() {
    const siteUrl = getSiteUrl()

    return {
        rules: [
            {
                userAgent: '*',
                allow: ['/', '/products/', '/shop', '/search'],
                disallow: ['/admin', '/cms', '/api', '/auth', '/store'],
            },
        ],
        sitemap: `${siteUrl}/sitemap.xml`,
        host: siteUrl,
    }
}

import { getSiteUrl } from '@/lib/seo'

export default function robots() {
    const siteUrl = getSiteUrl()
    const host = new URL(siteUrl).host

    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: ['/admin', '/cms', '/api', '/auth', '/store', '/e'],
            },
        ],
        sitemap: `${siteUrl}/sitemap.xml`,
        host,
    }
}

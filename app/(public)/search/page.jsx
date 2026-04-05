import ShopCatalogClient from '@/components/ShopCatalogClient'
import { absoluteUrl } from '@/lib/seo'

const STORE_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'TEKPIK'

export async function generateMetadata({ searchParams }) {
    const params = await searchParams
    const q = String(params?.q || '').trim()
    const title = q
        ? `Search results for ${q} | ${STORE_NAME}`
        : `Search results | ${STORE_NAME}`
    const description = q
        ? `Find the best ${q} deals, recommendations, and comparisons in India on ${STORE_NAME}.`
        : `Search products, compare options, and discover top prices in India on ${STORE_NAME}.`
    const canonical = q
        ? absoluteUrl(`/search?q=${encodeURIComponent(q)}`)
        : absoluteUrl('/search')
    const ogImage = absoluteUrl('/logo-tekpik.png')

    return {
        title,
        description,
        alternates: {
            canonical,
        },
        openGraph: {
            title,
            description,
            url: canonical,
            type: 'website',
            images: [{ url: ogImage }],
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: [ogImage],
        },
    }
}

export default async function SearchPage({ searchParams }) {
    const params = await searchParams
    return <ShopCatalogClient initialSearch={params?.q || ''} mode="search" />
}

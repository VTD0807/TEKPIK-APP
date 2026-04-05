import AiPicksClient from './AiPicksClient'
import { absoluteUrl } from '@/lib/seo'

const STORE_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'TEKPIK'

export async function generateMetadata() {
    const title = `AI-Recommended Products | ${STORE_NAME}`
    const description = `Explore AI-ranked recommendations and product picks for Indian shoppers on ${STORE_NAME}.`
    const canonical = absoluteUrl('/ai-picks')
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

export default function AiPicksPage() {
    return <AiPicksClient />
}

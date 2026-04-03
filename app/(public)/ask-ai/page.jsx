import AskAiClient from './AskAiClient'
import { absoluteUrl } from '@/lib/seo'

const STORE_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'TEKPIK'

export async function generateMetadata() {
    const title = `Ask AI Product Recommender | ${STORE_NAME}`
    const description = `Describe your needs and get AI-powered product recommendations, price-aware picks, and alternatives in India on ${STORE_NAME}.`
    const canonical = absoluteUrl('/ask-ai')
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

export default function AskAiPage() {
    const faqLd = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
            {
                '@type': 'Question',
                name: 'How does Ask AI choose product recommendations?',
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Ask AI scores products using your query, product relevance, ratings, discount signals, and availability in the catalog before returning top matches.',
                },
            },
            {
                '@type': 'Question',
                name: 'Can I use Ask AI for budget-based suggestions?',
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Yes. Include your budget and priorities in the prompt, such as battery, display, brand preference, or usage type.',
                },
            },
        ],
    }

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
            />
            <AskAiClient />
        </>
    )
}

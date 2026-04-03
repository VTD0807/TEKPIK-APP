import { absoluteUrl } from '@/lib/seo'

const STORE_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'TEKPIK'

export async function generateMetadata() {
    const title = `About ${STORE_NAME}`
    const description = `${STORE_NAME} helps shoppers discover the best products with AI analysis, practical recommendations, and community feedback.`
    const canonical = absoluteUrl('/about')
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

export default function AboutPage() {
    return (
        <div className="max-w-3xl mx-auto px-6 py-14 space-y-10 text-slate-700">
            <h1 className="text-3xl font-semibold text-slate-800">About TEKPIK</h1>

            <section className="space-y-3">
                <h2 className="text-xl font-semibold text-slate-800">What We Do</h2>
                <p className="text-sm leading-relaxed">
                    TEKPIK helps you discover the best gadgets and everyday tech with a mix of AI analysis
                    and honest community reviews. We focus on clarity, value, and practicality - no fluff.
                </p>
            </section>

            <section className="space-y-3">
                <h2 className="text-xl font-semibold text-slate-800">How It Works</h2>
                <p className="text-sm leading-relaxed">
                    We analyze product specs, pricing, and real user feedback to surface the strongest picks.
                    Our AI summaries highlight strengths and tradeoffs so you can decide faster.
                </p>
            </section>

            <section className="space-y-3">
                <h2 className="text-xl font-semibold text-slate-800">Transparency</h2>
                <p className="text-sm leading-relaxed">
                    Some product links are affiliate links, which may earn us a commission at no extra cost
                    to you. This supports the platform and keeps TEKPIK running.
                </p>
                <p className="text-sm leading-relaxed">
                    Learn more in our <a href="/disclosure" className="text-indigo-500 hover:underline">Affiliate Disclosure</a>.
                </p>
            </section>

            <section className="space-y-3">
                <h2 className="text-xl font-semibold text-slate-800">Contact</h2>
                <p className="text-sm">
                    Reach us at <a href="mailto:support@tekpik.in" className="text-indigo-500 hover:underline">support@tekpik.in</a>.
                </p>
            </section>

            <p className="text-xs text-slate-400 pt-4">Last updated: April 2026</p>
        </div>
    )
}

import { absoluteUrl } from '@/lib/seo'
import { EnvelopeFill, GeoAltFill } from 'react-bootstrap-icons'

const STORE_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'TEKPIK'

export async function generateMetadata() {
    const title = `Contact Us | ${STORE_NAME}`
    const description = `Get in touch with ${STORE_NAME} for support, business inquiries, or general questions.`
    const canonical = absoluteUrl('/contact')
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

export default function ContactPage() {
    return (
        <div className="max-w-3xl mx-auto px-6 py-14 space-y-10 text-slate-700">
            <div>
                <h1 className="text-3xl font-semibold text-slate-800">Contact Us</h1>
                <p className="mt-2 text-slate-500">We'd love to hear from you. Please reach out using the details below.</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
                <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                        <EnvelopeFill size={18} />
                    </div>
                    <div>
                        <h3 className="font-medium text-slate-900">Email Support</h3>
                        <p className="text-sm text-slate-500 mt-1">For general questions and support.</p>
                        <a href="mailto:support@tekpik.app" className="inline-block mt-3 text-indigo-600 font-medium hover:underline">
                            support@tekpik.app
                        </a>
                    </div>
                </div>

                <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                        <GeoAltFill size={18} />
                    </div>
                    <div>
                        <h3 className="font-medium text-slate-900">Office</h3>
                        <p className="text-sm text-slate-500 mt-1">HQ Location</p>
                        <p className="mt-3 text-slate-700 font-medium">
                            Hyderabad, Telangana, India
                        </p>
                    </div>
                </div>
            </div>

            <section className="space-y-4 pt-6 border-t border-slate-100">
                <h2 className="text-xl font-semibold text-slate-800">Response Time</h2>
                <p className="text-sm leading-relaxed">
                    We typically respond to all support requests within 24-48 business hours. For faster resolution regarding your account, please make sure you email us from your registered email address.
                </p>
            </section>
        </div>
    )
}

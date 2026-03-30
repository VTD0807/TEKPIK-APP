export default function HelpPage() {
    return (
        <div className="max-w-3xl mx-auto px-6 py-14 space-y-10 text-slate-700">
            <h1 className="text-3xl font-semibold text-slate-800">Help & Legal</h1>

            <section className="space-y-3">
                <h2 className="text-xl font-semibold text-slate-800">Privacy Policy</h2>
                <p className="text-sm leading-relaxed">
                    TEKPIK collects only the information necessary to provide our service — your name, email address, and profile picture when you sign in with Google. We do not sell your personal data to third parties.
                </p>
                <p className="text-sm leading-relaxed">
                    We use your email to identify your account and optionally send you product updates. You can delete your account at any time by contacting us.
                </p>
                <p className="text-sm leading-relaxed">
                    TEKPIK uses cookies to maintain your login session. No third-party tracking cookies are used.
                </p>
            </section>

            <section className="space-y-3">
                <h2 className="text-xl font-semibold text-slate-800">Terms of Service</h2>
                <p className="text-sm leading-relaxed">
                    By using TEKPIK, you agree to use the platform for lawful purposes only. You may not submit fake reviews, spam, or abusive content. We reserve the right to remove content or accounts that violate these terms.
                </p>
                <p className="text-sm leading-relaxed">
                    TEKPIK is an Amazon affiliate platform. Product links may earn us a commission at no extra cost to you. See our <a href="/disclosure" className="text-indigo-500 hover:underline">Affiliate Disclosure</a> for details.
                </p>
            </section>

            <section className="space-y-3">
                <h2 className="text-xl font-semibold text-slate-800">Contact</h2>
                <p className="text-sm">
                    For any questions, reach us at{' '}
                    <a href="mailto:support@tekpik.in" className="text-indigo-500 hover:underline">support@tekpik.in</a>
                </p>
            </section>

            <p className="text-xs text-slate-400 pt-4">Last updated: March 2026</p>
        </div>
    )
}

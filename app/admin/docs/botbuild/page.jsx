import Link from 'next/link'

export const metadata = {
    title: 'TEKPIK - Bot Build Guide',
    description: 'Step-by-step Telegram bot setup guide for TEKPIK integrations.',
}

const steps = [
    {
        title: 'Create Telegram Bot With BotFather',
        bullets: [
            'Open Telegram app and search for BotFather.',
            'Send /newbot and follow the prompts.',
            'Set bot name and username (must end with bot).',
            'Copy the bot token shown by BotFather.',
        ],
    },
    {
        title: 'Create Or Choose A Channel',
        bullets: [
            'Create a Telegram channel for deals, or use an existing channel.',
            'Open channel settings and add your bot as an admin.',
            'Grant permission to post messages and media.',
        ],
    },
    {
        title: 'Get Chat ID Quickly',
        bullets: [
            'Post one message manually in the channel.',
            'Open in browser: https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates',
            'Find the channel chat id in response (usually starts with -100...).',
            'You can also use @channelusername in many cases.',
        ],
    },
    {
        title: 'Configure In TEKPIK Integrations',
        bullets: [
            'Go to Admin -> Integrations -> Bot Settings.',
            'Enable the bot, paste Bot Token and Chat ID.',
            'Save Bot Settings and click Test Telegram.',
            'Confirm test message appears in your channel.',
        ],
    },
    {
        title: 'Set Templates And Automation',
        bullets: [
            'Go to Message Templates tab and use seed templates.',
            'Insert placeholder shortcuts instead of typing manually.',
            'In Automation tab, configure tracker frequency and limits.',
            'Run Publish Missing Products and Run Price Tracker for a quick check.',
        ],
    },
    {
        title: 'Use Manual Send With Product + Image',
        bullets: [
            'Open Manual Send tab.',
            'Select a product from dropdown (optional).',
            'Enable Send product image if you want photo + caption.',
            'Select template or write custom text, then click Send Message.',
        ],
    },
]

const quickChecks = [
    'If Test Telegram fails, check token and chat ID again.',
    'If image is not sent, ensure selected product has at least one image URL.',
    'If automation does not run on deploy, verify Vercel cron in vercel.json.',
    'If messages contain raw placeholders, check your template has matching variable keys.',
]

export default function BotBuildGuidePage() {
    return (
        <div className="mx-auto w-full max-w-5xl space-y-6 pb-16 text-slate-700">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Documentation</p>
                <h1 className="mt-2 text-2xl font-bold text-slate-900">Telegram Bot Build Guide</h1>
                <p className="mt-2 text-sm text-slate-500">Follow these steps once, then manage everything from Integrations.</p>
                <div className="mt-4 flex flex-wrap gap-2">
                    <Link href="/admin/integrations" className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/90">
                        Open Integrations
                    </Link>
                    <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                        Open BotFather
                    </a>
                </div>
            </div>

            <div className="grid gap-4">
                {steps.map((step, index) => (
                    <section key={step.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <h2 className="text-lg font-semibold text-slate-900">Step {index + 1}: {step.title}</h2>
                        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600">
                            {step.bullets.map((item) => (
                                <li key={item}>{item}</li>
                            ))}
                        </ul>
                    </section>
                ))}
            </div>

            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                <h2 className="text-base font-semibold text-amber-800">Quick Troubleshooting</h2>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-amber-900">
                    {quickChecks.map((item) => (
                        <li key={item}>{item}</li>
                    ))}
                </ul>
            </section>
        </div>
    )
}

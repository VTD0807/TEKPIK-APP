import Link from 'next/link'

export default function SettingsPage() {
    return (
        <div className="max-w-4xl">
            <h1 className="text-2xl font-bold text-slate-800 mb-2">System Settings</h1>
            <p className="text-slate-500 mb-8">Manage database routing, application downtime, integrations, and automated background tasks.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link href="/admin/db/status" className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:border-blue-400 hover:shadow-md transition cursor-pointer group">
                    <h3 className="font-semibold text-lg text-slate-800 mb-1 group-hover:text-blue-600 transition">Database Health</h3>
                    <p className="text-sm text-slate-500 mb-4">View latency, quota exhaustion limits, and live traffic overview for all 4 databases.</p>
                </Link>

                <Link href="/admin/settings/database-router" className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:border-blue-400 hover:shadow-md transition cursor-pointer group">
                    <h3 className="font-semibold text-lg text-slate-800 mb-1 group-hover:text-blue-600 transition">Database Router</h3>
                    <p className="text-sm text-slate-500 mb-4">Monitor the 4-Tier database architecture and manually route production traffic.</p>
                </Link>

                <Link href="/admin/settings/downtime" className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:border-blue-400 hover:shadow-md transition cursor-pointer group">
                    <h3 className="font-semibold text-lg text-slate-800 mb-1 group-hover:text-blue-600 transition">Downtime Manager</h3>
                    <p className="text-sm text-slate-500 mb-4">Toggle maintenance modes, block specific routes, and disable checkout or signups.</p>
                </Link>

                <Link href="/admin/settings/mail" className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:border-blue-400 hover:shadow-md transition cursor-pointer group">
                    <h3 className="font-semibold text-lg text-slate-800 mb-1 group-hover:text-blue-600 transition">Mail Manager</h3>
                    <p className="text-sm text-slate-500 mb-4">Configure email templates and monitor the primary/secondary automatic failover system.</p>
                </Link>

                <Link href="/admin/settings/updater" className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:border-blue-400 hover:shadow-md transition cursor-pointer group">
                    <h3 className="font-semibold text-lg text-slate-800 mb-1 group-hover:text-blue-600 transition">Product Updater</h3>
                    <p className="text-sm text-slate-500 mb-4">Manage automated background jobs that update the catalog.</p>
                </Link>
            </div>
        </div>
    )
}
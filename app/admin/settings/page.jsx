export default function SettingsPage() {
    return (
        <div className="max-w-4xl">
            <h1 className="text-2xl font-bold text-slate-800 mb-2">System Settings</h1>
            <p className="text-slate-500 mb-8">Manage database routing, application downtime, integrations, and automated background tasks.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-semibold text-lg text-slate-800 mb-1">Downtime Manager</h3>
                    <p className="text-sm text-slate-500 mb-4">Toggle maintenance modes, block specific routes, and disable checkout or signups.</p>
                </div>
                
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-semibold text-lg text-slate-800 mb-1">Database Router</h3>
                    <p className="text-sm text-slate-500 mb-4">Monitor the 4-Tier database architecture and manually route production traffic.</p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-semibold text-lg text-slate-800 mb-1">Mail Manager</h3>
                    <p className="text-sm text-slate-500 mb-4">Configure email templates and monitor the primary/secondary automatic failover system.</p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-semibold text-lg text-slate-800 mb-1">Product Updater</h3>
                    <p className="text-sm text-slate-500 mb-4">Manage automated background jobs that update the catalog.</p>
                </div>
            </div>
        </div>
    )
}
import { Tools } from 'react-bootstrap-icons'

export const metadata = {
    title: 'Under Maintenance - TEKPIK',
    description: 'We are currently performing scheduled maintenance.',
}

export default function MaintenancePage() {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                <Tools size={32} className="text-blue-600" />
            </div>
            
            <h1 className="text-4xl font-bold text-slate-900 mb-4 tracking-tight">
                We'll be back soon!
            </h1>
            
            <p className="text-lg text-slate-600 max-w-md mx-auto mb-8 leading-relaxed">
                TEKPIK is currently down for scheduled maintenance. We are upgrading our systems to serve you better. 
                Please check back in a little while.
            </p>

            <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-200 text-slate-700 rounded-full text-sm font-medium">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                System Upgrade in Progress
            </div>

            <div className="fixed bottom-6 text-sm text-slate-400">
                Are you an admin? <a href="/login" className="text-blue-600 hover:underline">Sign in</a>
            </div>
        </div>
    )
}

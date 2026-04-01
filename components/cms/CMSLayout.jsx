'use client'
import { useState } from 'react'
import CMSSidebar from '@/components/cms/CMSSidebar'
import CMSHeader from '@/components/cms/CMSHeader'

export default function CMSLayout({ children }) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(true)

    return (
        <div className="min-h-screen bg-white flex">
            <CMSSidebar
                collapsed={sidebarCollapsed}
                onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
            />
            <div className="flex-1 flex flex-col min-w-0">
                <CMSHeader onMenuToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
                <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    )
}

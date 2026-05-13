import SettingsSidebar from "@/components/admin/SettingsSidebar"

export default function SettingsLayout({ children }) {
    return (
        <div className="flex h-full bg-slate-50/50">
            <SettingsSidebar />
            <div className="flex-1 overflow-y-auto p-4 md:p-8">
                {children}
            </div>
        </div>
    )
}

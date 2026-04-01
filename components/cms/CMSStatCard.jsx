export default function CMSStatCard({ title, value, subtitle, icon: Icon, trend }) {
    const styles = {
        card: 'bg-white border border-slate-200',
        icon: 'text-slate-900 bg-slate-100',
        trendUp: 'text-slate-900',
        trendDown: 'text-slate-700'
    }

    return (
        <div className={`${styles.card} rounded-2xl p-5 hover:shadow-md hover:scale-[1.02] transition-all duration-200`}>
            <div className="flex items-start justify-between">
                <div className="space-y-2">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{title}</p>
                    <p className="text-3xl font-bold text-slate-800">{value}</p>
                    {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
                    {trend && (
                        <p className={`text-xs font-medium ${trend > 0 ? styles.trendUp : styles.trendDown}`}>
                            {trend > 0 ? '?' : '?'} {Math.abs(trend)}% from last week
                        </p>
                    )}
                </div>
                {Icon && (
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${styles.icon}`}>
                        <Icon size={20} />
                    </div>
                )}
            </div>
        </div>
    )
}


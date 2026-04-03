const Skeleton = ({ className = '' }) => (
    <div className={`animate-pulse rounded-xl bg-slate-100 ${className}`} />
)

export default function Loading() {
    return (
        <div className="max-w-6xl mx-auto px-3 sm:px-6 py-5 sm:py-10 space-y-6 sm:space-y-10">
            <div className="grid md:grid-cols-2 gap-6 sm:gap-10">
                <div className="space-y-3 sm:space-y-4">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-[240px] sm:h-[420px] w-full" />
                    <div className="grid grid-cols-5 gap-2 md:hidden">
                        {Array(10).fill(0).map((_, i) => (
                            <Skeleton key={i} className="h-14 w-full rounded-lg" />
                        ))}
                    </div>
                </div>

                <div className="space-y-3 sm:space-y-4">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-7 w-full" />
                    <Skeleton className="h-7 w-11/12" />

                    <div className="flex gap-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-28" />
                    </div>

                    <div className="flex items-end gap-2">
                        <Skeleton className="h-9 w-28" />
                        <Skeleton className="h-5 w-16" />
                        <Skeleton className="h-5 w-12 rounded-full" />
                    </div>

                    <Skeleton className="h-3 w-56" />

                    <Skeleton className="h-12 w-full rounded-full" />

                    <div className="flex gap-2 pt-1">
                        <Skeleton className="h-10 w-24 rounded-full" />
                        <Skeleton className="h-10 w-24 rounded-full" />
                    </div>

                    <div className="space-y-2 pt-2">
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-10/12" />
                    </div>
                </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between gap-3">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-9 w-20 rounded-full" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-11/12" />
                <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-12" />
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-10/12" />
                        <Skeleton className="h-3 w-11/12" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-12" />
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-10/12" />
                        <Skeleton className="h-3 w-11/12" />
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-64" />
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                    {Array(4).fill(0).map((_, i) => (
                        <div key={i} className="space-y-2">
                            <Skeleton className="h-32 sm:h-52 w-full" />
                            <Skeleton className="h-3 w-full" />
                            <Skeleton className="h-3 w-10/12" />
                            <Skeleton className="h-9 w-full rounded-full" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

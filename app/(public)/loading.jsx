const Skeleton = ({ className }) => (
    <div className={`animate-pulse bg-slate-100 rounded-xl ${className}`} />
)

export default function Loading() {
    return (
        <div className="max-w-7xl mx-auto px-6 py-10 space-y-12">
            {/* Hero Skeleton */}
            <div className="flex flex-col gap-6">
                <Skeleton className="h-10 w-48" />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                    {Array(4).fill(0).map((_, i) => (
                        <div key={i} className="space-y-3">
                            <Skeleton className="h-64 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-4 w-1/4" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Content Skeleton */}
            <div className="flex flex-col gap-6">
                <Skeleton className="h-10 w-48" />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                    {Array(8).fill(0).map((_, i) => (
                        <div key={i} className="space-y-3">
                            <Skeleton className="h-64 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-4 w-1/4" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

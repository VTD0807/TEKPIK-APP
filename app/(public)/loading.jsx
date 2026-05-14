const Skeleton = ({ className }) => (
    <div className={`animate-pulse bg-slate-100 rounded-xl ${className}`} />
)

export default function Loading() {
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-12">
            {/* Banner Skeleton */}
            <Skeleton className="h-48 sm:h-72 w-full rounded-2xl" />

            {/* Category Pills Skeleton */}
            <div className="flex gap-3 overflow-hidden">
                {Array(6).fill(0).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-24 rounded-full shrink-0" />
                ))}
            </div>

            {/* Section Title Skeleton */}
            <div className="flex flex-col items-center gap-2">
                <Skeleton className="h-7 w-44" />
                <Skeleton className="h-4 w-72" />
            </div>

            {/* Product Grid Skeleton */}
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4 sm:gap-5">
                {Array(6).fill(0).map((_, i) => (
                    <div key={i} className="space-y-3">
                        <Skeleton className="h-36 sm:h-48 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/3" />
                        <Skeleton className="h-4 w-1/4" />
                    </div>
                ))}
            </div>

            {/* Second Section */}
            <div className="flex flex-col items-center gap-2">
                <Skeleton className="h-7 w-40" />
                <Skeleton className="h-4 w-64" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4 sm:gap-5">
                {Array(6).fill(0).map((_, i) => (
                    <div key={i} className="space-y-3">
                        <Skeleton className="h-36 sm:h-48 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/3" />
                        <Skeleton className="h-4 w-1/4" />
                    </div>
                ))}
            </div>
        </div>
    )
}

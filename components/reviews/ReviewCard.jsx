import { StarIcon, BadgeCheckIcon, ThumbsUpIcon } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export default function ReviewCard({ review }) {
    const date = review.createdAt
        ? formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })
        : ''

    return (
        <div className="border border-slate-100 rounded-xl p-4 space-y-2 bg-white">
            <div className="flex items-start justify-between gap-2">
                <div>
                    <div className="flex items-center gap-1.5">
                        <p className="font-medium text-sm text-slate-800">{review.authorName}</p>
                        {review.isVerified && (
                            <span className="flex items-center gap-0.5 text-[10px] text-green-600 font-medium">
                                <BadgeCheckIcon size={12} /> Verified
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-slate-400">{date}</p>
                </div>
                <div className="flex">
                    {Array(5).fill('').map((_, i) => (
                        <StarIcon key={i} size={13} className="text-transparent" fill={review.rating >= i + 1 ? '#f59e0b' : '#e2e8f0'} />
                    ))}
                </div>
            </div>

            <p className="text-sm font-medium text-slate-700">{review.title}</p>
            <p className="text-sm text-slate-600 leading-relaxed">{review.body}</p>

            {(review.pros?.length > 0 || review.cons?.length > 0) && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                    {review.pros?.map((p, i) => (
                        <span key={i} className="text-[11px] bg-green-50 text-green-700 px-2 py-0.5 rounded-full">+ {p}</span>
                    ))}
                    {review.cons?.map((c, i) => (
                        <span key={i} className="text-[11px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full">− {c}</span>
                    ))}
                </div>
            )}

            <div className="flex items-center gap-1 pt-1">
                <ThumbsUpIcon size={12} className="text-slate-400" />
                <span className="text-xs text-slate-400">{review.helpful} found this helpful</span>
            </div>
        </div>
    )
}

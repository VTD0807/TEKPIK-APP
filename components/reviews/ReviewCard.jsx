import { Star, StarFill, PatchCheck, HandThumbsUp, HandThumbsDown, Trash } from 'react-bootstrap-icons'
import { formatDistanceToNow } from 'date-fns'

export default function ReviewCard({ review, onClick, currentUserId, onLike, onDislike, onDelete }) {
    const date = review.createdAt
        ? formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })
        : ''

    const likedBy = Array.isArray(review.likedBy) ? review.likedBy : []
    const dislikedBy = Array.isArray(review.dislikedBy) ? review.dislikedBy : []
    const liked = !!currentUserId && likedBy.includes(currentUserId)
    const disliked = !!currentUserId && dislikedBy.includes(currentUserId)
    const canDelete = !!currentUserId && review.userId === currentUserId

    return (
        <div
            onClick={onClick}
            className="w-full text-left border border-slate-200 rounded-lg p-3 space-y-1.5 bg-white hover:border-slate-300 transition"
        >
            <div className="flex items-start justify-between gap-2">
                <div>
                    <div className="flex items-center gap-1.5">
                        {review.authorImage ? (
                            <img src={review.authorImage} alt={review.authorName} className="w-6 h-6 rounded-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                            <div className="w-6 h-6 rounded-full bg-slate-200" />
                        )}
                        <p className="font-medium text-xs text-slate-800">{review.authorName}</p>
                        {review.isVerified && (
                            <span className="flex items-center gap-0.5 text-[10px] text-green-600 font-medium">
                                <PatchCheck size={12} /> Verified
                            </span>
                        )}
                    </div>
                    <p className="text-[11px] text-slate-400">{date}</p>
                </div>
                <div className="flex">
                    {Array(5).fill('').map((_, i) => (
                        review.rating >= i + 1
                            ? <StarFill key={i} size={13} className="text-amber-500" />
                            : <Star key={i} size={13} className="text-slate-300" />
                    ))}
                </div>
            </div>

            <p className="text-sm font-medium text-slate-700 truncate">{review.title}</p>
            <p className="text-xs text-slate-600 leading-snug line-clamp-2">{review.body}</p>

            {Array.isArray(review.mediaUrls) && review.mediaUrls.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                    {review.mediaUrls.slice(0, 2).map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="w-12 h-12 rounded-md border border-slate-200 overflow-hidden bg-slate-50">
                            <img src={url} alt="Review media" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </a>
                    ))}
                    {review.mediaUrls.length > 2 && (
                        <div className="w-12 h-12 rounded-md border border-slate-200 bg-slate-50 text-[11px] text-slate-500 flex items-center justify-center">
                            +{review.mediaUrls.length - 2}
                        </div>
                    )}
                </div>
            )}

            <div className="flex items-center gap-2 pt-1 flex-wrap">
                <span className="text-[11px] text-slate-400">{review.helpful} helpful</span>

                <button type="button" onClick={(e) => { e.stopPropagation(); onLike?.(review.id) }} className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] border ${liked ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-slate-600 border-slate-200'}`}>
                    <HandThumbsUp size={11} />
                    Like {likedBy.length > 0 ? `(${likedBy.length})` : ''}
                </button>
                <button type="button" onClick={(e) => { e.stopPropagation(); onDislike?.(review.id) }} className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] border ${disliked ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-white text-slate-600 border-slate-200'}`}>
                    <HandThumbsDown size={11} />
                    Dislike {dislikedBy.length > 0 ? `(${dislikedBy.length})` : ''}
                </button>
                {canDelete && (
                    <button type="button" onClick={(e) => { e.stopPropagation(); onDelete?.(review.id) }} className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] border border-red-200 text-red-600 bg-red-50">
                        <Trash size={11} /> Delete
                    </button>
                )}
            </div>
        </div>
    )
}

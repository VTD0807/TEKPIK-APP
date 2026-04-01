'use client'
import { Share } from 'react-bootstrap-icons'
import toast from 'react-hot-toast'

export default function ShareButton({ title }) {
    const handleShare = async () => {
        const shareUrl = typeof window !== 'undefined' ? window.location.href : ''
        try {
            if (navigator.share) {
                await navigator.share({ title: title || 'Check this out', url: shareUrl })
                return
            }
            await navigator.clipboard.writeText(shareUrl)
            toast.success('Link copied')
        } catch {
            toast.error('Unable to share right now')
        }
    }

    return (
        <button
            onClick={handleShare}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 transition"
            aria-label="Share product"
        >
            <Share size={15} />
            <span>Share</span>
        </button>
    )
}

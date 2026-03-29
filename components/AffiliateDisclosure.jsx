import Link from 'next/link'
import { InfoIcon } from 'lucide-react'

export default function AffiliateDisclosure({ variant = 'banner' }) {
    if (variant === 'inline') {
        return (
            <p className="text-xs text-slate-400 mt-2">
                <span className="font-medium">Affiliate link:</span> We may earn a commission if you purchase through this link, at no extra cost to you.{' '}
                <Link href="/disclosure" className="underline hover:text-slate-600">Learn more</Link>
            </p>
        )
    }

    return (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
            <InfoIcon size={16} className="shrink-0 mt-0.5" />
            <p>
                <span className="font-medium">Affiliate Disclosure:</span> TEKPIK participates in the Amazon Associates Program. We earn a small commission on qualifying purchases at no extra cost to you.{' '}
                <Link href="/disclosure" className="underline hover:text-amber-900">Full disclosure</Link>
            </p>
        </div>
    )
}

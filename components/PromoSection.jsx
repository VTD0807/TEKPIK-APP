'use client'
import Link from 'next/link'

export default function PromoSection({
    title,
    subtitle,
    ctaText,
    link,
    imageUrl,
    bgColor = 'bg-white'
}) {
    return (
        <div className={`w-full rounded-[2.25rem] overflow-hidden ${bgColor} border border-slate-200`}>
            <div className="px-6 py-10 sm:px-10 sm:py-12 grid sm:grid-cols-[1.2fr_0.8fr] gap-8 items-center">
                <div>
                    <p className="text-[11px] uppercase tracking-[0.3em] font-mono text-slate-700/70">Featured</p>
                    <h2 className="text-2xl sm:text-4xl font-serif font-semibold text-slate-900 mt-3">{title || 'New Spotlight'}</h2>
                    {subtitle && <p className="text-sm sm:text-base text-slate-700 mt-3 max-w-xl">{subtitle}</p>}
                    {ctaText && link && (
                        <Link href={link} className="inline-flex items-center gap-2 mt-6 text-[11px] font-mono uppercase tracking-[0.25em] text-slate-900 bg-white/80 px-5 py-3 rounded-full border border-white hover:bg-white transition">
                            {ctaText}
                        </Link>
                    )}
                </div>
                <div className="relative w-full">
                    {imageUrl ? (
                        <img src={imageUrl} alt={title || 'Promo'} className="w-full h-48 sm:h-56 object-cover rounded-3xl shadow-lg shadow-slate-900/10" />
                    ) : (
                        <div className="w-full h-48 sm:h-56 rounded-3xl border border-dashed border-slate-600/30 flex items-center justify-center text-[10px] font-mono uppercase tracking-[0.3em] text-slate-600/70 bg-white/30">
                            Image Placeholder
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}


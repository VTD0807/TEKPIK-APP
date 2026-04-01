import Link from 'next/link'

function PromoCard({ title, ctaText, link, imageUrl, bgColor, compact = false }) {
    const isHexColor = typeof bgColor === 'string' && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(bgColor)
    const bgClass = isHexColor ? '' : (bgColor || 'bg-white')
    const bgStyle = isHexColor ? { backgroundColor: bgColor } : undefined

    return (
        <div
            className={`rounded-[2rem] sm:rounded-[2.6rem] border border-slate-200 px-6 sm:px-8 lg:px-10 py-6 sm:py-8 lg:py-10 ${bgClass} ${compact ? 'min-h-[190px] sm:min-h-[255px]' : 'min-h-[300px] sm:min-h-[420px] lg:min-h-[520px]'} relative overflow-hidden`}
            style={bgStyle}
        >
            <div className="max-w-[72%] sm:max-w-[70%]">
                <h3 className={`${compact ? 'text-3xl sm:text-4xl lg:text-5xl' : 'text-4xl sm:text-5xl lg:text-7xl'} font-serif font-semibold text-slate-900 leading-[0.95]`}>
                    {title || 'Promo title'}
                </h3>

                {ctaText && link && (
                    <Link
                        href={link}
                        className="inline-flex items-center gap-2 mt-6 sm:mt-10 text-[11px] sm:text-[12px] tracking-[0.25em] sm:tracking-[0.35em] uppercase font-mono text-slate-900"
                    >
                        {ctaText}
                        <span aria-hidden="true">&rarr;</span>
                    </Link>
                )}
            </div>

            <div className="absolute right-5 sm:right-8 top-5 sm:top-8 text-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-28 lg:h-28 rounded-full border border-dashed border-slate-700/30 flex items-center justify-center text-[9px] sm:text-[10px] lg:text-[12px] tracking-[0.25em] sm:tracking-[0.3em] uppercase font-mono text-slate-800/70 bg-white/20 overflow-hidden">
                    {imageUrl ? (
                        <img src={imageUrl} alt={title || 'Promo'} className="w-full h-full object-cover" />
                    ) : (
                        'IMG'
                    )}
                </div>
            </div>
        </div>
    )
}

export default function PromoGridSection({
    bigTitle,
    bigCtaText,
    bigLink,
    bigImageUrl,
    bigBgColor,
    topTitle,
    topCtaText,
    topLink,
    topImageUrl,
    topBgColor,
    bottomTitle,
    bottomCtaText,
    bottomLink,
    bottomImageUrl,
    bottomBgColor,
}) {
    return (
        <section className="w-full px-3 sm:px-6">
            <div className="max-w-[1600px] mx-auto grid xl:grid-cols-[2.1fr_1fr] gap-4 sm:gap-6 lg:gap-8 items-stretch">
                <PromoCard
                    title={bigTitle || "Gadgets you'll love."}
                    ctaText={bigCtaText || 'Learn more'}
                    link={bigLink || '/shop'}
                    imageUrl={bigImageUrl}
                    bgColor={bigBgColor || 'bg-[#A9E6BD]'}
                />

                <div className="grid gap-8">
                    <PromoCard
                        title={topTitle || 'Best products'}
                        ctaText={topCtaText || 'View more'}
                        link={topLink || '/shop'}
                        imageUrl={topImageUrl}
                        bgColor={topBgColor || 'bg-[#F1D4B8]'}
                        compact
                    />
                    <PromoCard
                        title={bottomTitle || '20% discounts'}
                        ctaText={bottomCtaText || 'View more'}
                        link={bottomLink || '/shop'}
                        imageUrl={bottomImageUrl}
                        bgColor={bottomBgColor || 'bg-[#B3D0F2]'}
                        compact
                    />
                </div>
            </div>
        </section>
    )
}

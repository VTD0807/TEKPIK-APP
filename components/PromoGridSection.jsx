import Link from 'next/link'

function PromoCard({ title, ctaText, link, imageUrl, bgColor, compact = false }) {
    const isHexColor = typeof bgColor === 'string' && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(bgColor)
    const bgClass = isHexColor ? '' : (bgColor || 'bg-white')
    const bgStyle = isHexColor ? { backgroundColor: bgColor } : undefined

    return (
        <div
            className={`rounded-[1.8rem] sm:rounded-[2.6rem] px-5 sm:px-8 lg:px-10 py-6 sm:py-8 lg:py-10 ${bgClass} ${compact ? 'min-h-[170px] sm:min-h-[255px]' : 'min-h-[260px] sm:min-h-[420px] lg:min-h-[520px]'} relative overflow-hidden`}
            style={bgStyle}
        >
            {imageUrl && (
                <img
                    src={imageUrl}
                    alt={title || 'Promo'}
                    className="absolute inset-0 w-full h-full object-cover"
                />
            )}

            {imageUrl && (
                <div className="absolute inset-0 bg-gradient-to-r from-white/92 via-white/80 to-white/10" />
            )}

            <div className="relative z-10 max-w-[85%] sm:max-w-[70%]">
                <h3 className={`${compact ? 'text-2xl sm:text-4xl lg:text-5xl' : 'text-3xl sm:text-5xl lg:text-7xl'} font-serif font-semibold text-slate-900 leading-[0.95]`}>
                    {title || 'Promo title'}
                </h3>

                {ctaText && link && (
                    <Link
                        href={link}
                        className="inline-flex items-center gap-2 mt-4 sm:mt-10 text-[10px] sm:text-[12px] tracking-[0.2em] sm:tracking-[0.35em] uppercase font-mono text-slate-900"
                    >
                        {ctaText}
                        <span aria-hidden="true">&rarr;</span>
                    </Link>
                )}
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

                <div className="grid gap-4 sm:gap-8">
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

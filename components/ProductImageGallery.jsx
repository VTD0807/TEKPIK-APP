'use client'
import { useMemo, useState } from 'react'

const FALLBACK = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDQwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjQwMCIgaGVpZ2h0PSI0MDAiIGZpbGw9IiNGMUY1RjkiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iI0NCRDVFMSIgZm9udC1zaXplPSIxOCIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg=='

function SafeImage({ src, alt, className }) {
    const [error, setError] = useState(false)

    if (error || !src) {
        return <img src={FALLBACK} alt={alt || 'Product'} className={className} />
    }

    return (
        <img
            src={src}
            alt={alt || 'Product'}
            className={className}
            onError={() => setError(true)}
            loading="lazy"
            referrerPolicy="no-referrer"
        />
    )
}

export default function ProductImageGallery({ images, title, price, rating }) {
    const [activeImg, setActiveImg] = useState(0)
    const [zoom, setZoom] = useState({ active: false, x: 50, y: 50 })
    const imgs = useMemo(() => {
        const next = Array.isArray(images) ? images.filter(Boolean) : []
        return next.length > 0 ? next : [FALLBACK]
    }, [images])
    const hasMultiple = imgs.length > 1 || imgs[0] !== FALLBACK
    const currentImage = imgs[activeImg] || FALLBACK

    const handleMove = (e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        const x = ((e.clientX - rect.left) / rect.width) * 100
        const y = ((e.clientY - rect.top) / rect.height) * 100
        setZoom({ active: true, x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) })
    }

    const handleLeave = () => {
        setZoom(prev => ({ ...prev, active: false }))
    }

    const selectImage = (index) => {
        setActiveImg(index)
        setZoom(prev => ({ ...prev, active: false }))
    }

    return (
        <div className="space-y-3 sm:space-y-4">
            <div className="hidden sm:flex items-center justify-between text-[11px] sm:text-xs text-slate-400">
                <span>Preview</span>
                <span>{activeImg + 1}/{imgs.length}</span>
            </div>

            <div className="grid gap-4 md:grid-cols-[92px_minmax(0,1fr)]">
                {hasMultiple && (
                    <div className="hidden md:flex flex-col gap-3 h-full max-h-[420px] overflow-y-auto pr-1 rounded-xl border border-slate-200 p-2 bg-white [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {imgs.map((img, i) => (
                            <button
                                key={i}
                                onClick={() => selectImage(i)}
                                className={`relative aspect-square flex-none overflow-hidden rounded-lg border bg-white transition ${activeImg === i ? 'border-slate-400' : 'border-slate-200 hover:border-slate-300'}`}
                                aria-label={`View image ${i + 1}`}
                            >
                                <SafeImage src={img} alt="" className="h-full w-full object-cover p-2" />
                            </button>
                        ))}
                    </div>
                )}

                <div className="relative">
                    <div
                        className="relative overflow-hidden rounded-xl border border-slate-200 bg-white"
                        onMouseMove={handleMove}
                        onMouseEnter={handleMove}
                        onMouseLeave={handleLeave}
                    >
                        <div className="flex h-[240px] sm:min-h-[420px] items-center justify-center px-2 sm:px-4 py-3 sm:py-6">
                            <SafeImage src={currentImage} alt={title} className="h-auto w-auto max-h-[220px] sm:max-h-[380px] max-w-full object-contain object-center" />
                        </div>
                        <div className="hidden sm:block pointer-events-none absolute inset-x-0 bottom-0 px-4 py-2 text-[11px] text-slate-400">
                            Hover to zoom
                        </div>
                    </div>

                    {zoom.active && currentImage !== FALLBACK && (
                        <div className="hidden lg:block absolute top-3 right-3 h-[200px] w-[200px] rounded-xl border border-slate-200 bg-white/95 shadow-lg overflow-hidden pointer-events-none">
                            <div
                                className="h-full w-full"
                                style={{
                                    backgroundImage: `url(${currentImage})`,
                                    backgroundSize: '220% 220%',
                                    backgroundPosition: `${zoom.x}% ${zoom.y}%`,
                                    backgroundRepeat: 'no-repeat',
                                }}
                            />
                        </div>
                    )}
                </div>
            </div>

            {hasMultiple && (
                <div className="md:hidden grid grid-cols-5 gap-2 pb-1 pr-1">
                    {imgs.map((img, i) => (
                        <button
                            key={i}
                            onClick={() => selectImage(i)}
                            className={`relative h-14 w-full overflow-hidden rounded-lg border bg-white transition ${activeImg === i ? 'border-slate-400' : 'border-slate-200'}`}
                            aria-label={`View image ${i + 1}`}
                        >
                            <SafeImage src={img} alt="" className="h-full w-full object-cover p-2" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

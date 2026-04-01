'use client'
import { useState } from 'react'

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

export default function ProductImageGallery({ images, title }) {
    const [activeImg, setActiveImg] = useState(0)
    const [zoom, setZoom] = useState({ active: false, x: 50, y: 50 })
    const imgs = images && images.length > 0 ? images : [FALLBACK]
    const hasMultiple = imgs.length > 1 && imgs[0] !== FALLBACK

    const handleMove = (e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        const x = ((e.clientX - rect.left) / rect.width) * 100
        const y = ((e.clientY - rect.top) / rect.height) * 100
        setZoom({ active: true, x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) })
    }

    const handleLeave = () => {
        setZoom(prev => ({ ...prev, active: false }))
    }

    return (
        <div className="space-y-3">
            <div className="relative">
                <div
                    className="bg-[#F5F5F5] rounded-xl flex items-center justify-center h-80 overflow-hidden"
                    onMouseMove={handleMove}
                    onMouseEnter={handleMove}
                    onMouseLeave={handleLeave}
                >
                    <SafeImage src={imgs[activeImg]} alt={title} className="max-h-72 w-auto object-contain" />
                </div>

                {zoom.active && imgs[activeImg] !== FALLBACK && (
                    <div className="hidden lg:block absolute top-3 -right-[228px] w-56 h-56 rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden z-20">
                        <div
                            className="w-full h-full"
                            style={{
                                backgroundImage: `url(${imgs[activeImg]})`,
                                backgroundSize: '220% 220%',
                                backgroundPosition: `${zoom.x}% ${zoom.y}%`,
                                backgroundRepeat: 'no-repeat',
                            }}
                        />
                    </div>
                )}
            </div>
            {hasMultiple && (
                <div className="flex gap-2 flex-wrap">
                    {imgs.map((img, i) => (
                        <button key={i} onClick={() => setActiveImg(i)} className={`w-16 h-16 rounded-lg bg-[#F5F5F5] flex items-center justify-center border-2 transition ${activeImg === i ? 'border-indigo-400' : 'border-transparent'}`}>
                            <SafeImage src={img} alt="" className="max-h-12 w-auto object-contain" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

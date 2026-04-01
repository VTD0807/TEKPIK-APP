'use client'
import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'react-bootstrap-icons'
import Link from 'next/link'

export default function BannerCarousel({ banners = [], settings = {} }) {
    const [currentIndex, setCurrentIndex] = useState(0)

    const duration = settings.carouselDuration || 5000
    const animationType = settings.carouselAnimation || 'slide' // 'slide' or 'flip'

    useEffect(() => {
        if (!banners?.length || banners.length <= 1) return
        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % banners.length)
        }, duration)
        return () => clearInterval(timer)
    }, [banners, duration])

    const nextSlide = () => setCurrentIndex((prev) => (prev + 1) % banners.length)
    const prevSlide = () => setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length)

    if (!banners || banners.length === 0) {
        return (
            <div className="relative w-full max-w-7xl mx-auto my-8 aspect-[21/6] sm:aspect-[21/5] bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 font-medium border border-slate-200 shadow-sm">
                No active promotional banners
            </div>
        )
    }

    return (
        <div className="relative w-full max-w-7xl mx-auto mt-4 sm:mt-12 mb-8 overflow-hidden rounded-xl shadow-lg bg-slate-100 group [perspective:1000px]">
            {/* Carousel Container */}
            <div 
                className={`w-full aspect-[21/6] sm:aspect-[21/5] relative ${animationType === 'slide' ? 'flex transition-transform duration-700 ease-in-out' : ''}`}
                style={animationType === 'slide' ? { transform: `translateX(-${currentIndex * 100}%)` } : {}}
            >
                {banners.map((banner, index) => {
                    const isActive = currentIndex === index

                    const content = (
                        <div className="relative w-full h-full flex items-center justify-center bg-slate-50 overflow-hidden">
                            {banner.imageUrl ? (
                                <img 
                                    src={banner.imageUrl} 
                                    alt={banner.title || `Banner ${index + 1}`} 
                                    className="w-full h-full object-cover sm:object-fill"
                                />
                            ) : (
                                <div className="text-slate-400 font-medium">Image not available</div>
                            )}
                        </div>
                    )

                    // If animation is slide, we render them in a row flex container.
                    if (animationType === 'slide') {
                        return (
                            <div key={banner.id || index} className="w-full flex-shrink-0 relative">
                                {banner.link ? (
                                    <Link href={banner.link} className="block w-full h-full">
                                        {content}
                                    </Link>
                                ) : content}
                            </div>
                        )
                    }

                    // If animation is flip, we render them stacked absolutely and crossfade/flip them
                    return (
                        <div 
                            key={banner.id || index} 
                            className="absolute inset-0 w-full h-full transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)]"
                            style={{
                                opacity: isActive ? 1 : 0,
                                transform: isActive ? 'rotateX(0deg)' : 'rotateX(-90deg)',
                                transformOrigin: 'top',
                                pointerEvents: isActive ? 'auto' : 'none'
                            }}
                        >
                            {banner.link ? (
                                <Link href={banner.link} className="block w-full h-full">
                                    {content}
                                </Link>
                            ) : content}
                        </div>
                    )
                })}
            </div>

            {/* Navigation Arrows */}
            {banners.length > 1 && (
                <>
                    <button 
                        onClick={prevSlide}
                        className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 bg-white/30 hover:bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center text-slate-800 shadow-sm opacity-0 group-hover:opacity-100 transition-all z-20"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <button 
                        onClick={nextSlide}
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 bg-white/30 hover:bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center text-slate-800 shadow-sm opacity-0 group-hover:opacity-100 transition-all z-20"
                    >
                        <ChevronRight size={24} />
                    </button>

                    {/* Indicators */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
                        {banners.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setCurrentIndex(i)}
                                className={`h-2 rounded-full transition-all ${currentIndex === i ? 'w-6 bg-white shadow-md' : 'w-2 bg-white/50 hover:bg-white/80'}`}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}

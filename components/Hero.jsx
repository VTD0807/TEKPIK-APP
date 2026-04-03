'use client'
import { ArrowRight } from 'react-bootstrap-icons'
import React from 'react'
import Link from 'next/link'
import CategoriesMarquee from './CategoriesMarquee'

const Hero = ({ settings = {}, categories = [] }) => {
    // Determine the grid array payload from settings context
    // We expect an array of at least 3 items, or we fall back to defaults
    const [main, side1, side2] = settings.heroBanners && settings.heroBanners.length >= 3 
        ? settings.heroBanners 
        : [
            { imageUrl: '', link: '/shop', title: "Gadgets you'll love." },
            { imageUrl: '', link: '/shop', title: "Best products" },
            { imageUrl: '', link: '/shop', title: "20% discounts" }
        ]

    return (
        <div className='mx-4 sm:mx-6'>
            <div className='flex max-xl:flex-col gap-6 md:gap-8 max-w-7xl mx-auto my-8 sm:my-10 min-h-[320px] sm:min-h-[400px]'>
                
                {/* Main Left Banner */}
                <Link href={main?.link || "/shop"} className='relative flex-1 flex flex-col bg-[#baf4cb] rounded-[2.4rem_1.8rem_2.8rem_1.8rem] sm:rounded-[3.25rem_2.25rem_3.75rem_2.25rem] overflow-hidden group hover:ring-2 ring-[#aaeac3] ring-offset-2 transition-all duration-300'>
                    {main?.imageUrl ? (
                        <img 
                            src={main.imageUrl} 
                            alt={main.title || "Main promo"} 
                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                        />
                    ) : (
                        <div className='p-6 sm:p-14 relative z-10 flex flex-col justify-center h-full'>
                            <div className="absolute right-6 top-6 hidden sm:flex flex-col items-center justify-center text-center">
                                <div className="w-28 h-20 rounded-[40%_60%_45%_55%/50%_40%_60%_50%] border-2 border-dashed border-slate-700/30 bg-white/30 text-[10px] font-mono uppercase tracking-[0.2em] text-slate-700 flex items-center justify-center">
                                    Image
                                </div>
                                <span className="mt-2 text-[10px] font-mono uppercase tracking-[0.25em] text-slate-600">CMS</span>
                            </div>
                            <h2 className='text-2xl sm:text-5xl leading-[1.2] my-3 font-serif font-semibold text-slate-900 max-w-xs sm:max-w-sm'>
                                {main?.title || "Gadgets you'll love. Prices you'll trust."}
                            </h2>
                            <div className='mt-8'>
                                <span className='inline-block bg-slate-900 text-white text-[10px] sm:text-[11px] py-3 sm:py-4 px-8 sm:px-10 rounded-[1.25rem] shadow-xl hover:bg-slate-800 transition font-mono uppercase tracking-[0.3em]'>
                                    LEARN MORE
                                </span>
                            </div>
                        </div>
                    )}
                </Link>

                {/* Side Right Banners (Stacked) */}
                <div className='flex flex-col gap-5 md:gap-8 w-full xl:max-w-[400px]'>
                    
                    {/* Top Right Box */}
                    <Link href={side1?.link || "/shop"} className='flex-1 flex flex-col justify-center w-full bg-[#fedcc0] rounded-[2rem_2.5rem_1.8rem_2.8rem] sm:rounded-[2.5rem_3.25rem_2rem_3.5rem] p-6 sm:p-8 group relative overflow-hidden hover:ring-2 ring-[#ffd8b8] ring-offset-2 transition-all duration-300 min-h-[160px] sm:min-h-[190px]'>
                        {side1?.imageUrl ? (
                            <img src={side1.imageUrl} alt={side1.title || "Promo 1"} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                        ) : (
                            <div className="relative z-10 space-y-3">
                                <div className="absolute right-5 top-5 hidden sm:flex items-center justify-center w-14 h-12 rounded-[45%_55%_55%_45%/50%_40%_60%_50%] border border-dashed border-slate-700/30 text-[9px] font-mono uppercase tracking-[0.2em] text-slate-600">
                                    IMG
                                </div>
                                <p className='text-xl sm:text-3xl font-serif font-semibold text-slate-900 max-w-[12rem]'>{side1?.title || "Best products"}</p>
                                <p className='flex items-center gap-1 text-[11px] text-slate-700 font-mono uppercase tracking-[0.25em]'>View more <ArrowRight className='group-hover:ml-1 transition-all' size={14} /></p>
                            </div>
                        )}
                    </Link>

                    {/* Bottom Right Box */}
                    <Link href={side2?.link || "/shop"} className='flex-1 flex flex-col justify-center w-full bg-[#bfddfe] rounded-[2.6rem_1.8rem_2.8rem_2.2rem] sm:rounded-[3rem_2rem_3.25rem_2.5rem] p-6 sm:p-8 group relative overflow-hidden hover:ring-2 ring-[#b6d8fd] ring-offset-2 transition-all duration-300 min-h-[160px] sm:min-h-[190px]'>
                        {side2?.imageUrl ? (
                            <img src={side2.imageUrl} alt={side2.title || "Promo 2"} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                        ) : (
                            <div className="relative z-10 space-y-3">
                                <div className="absolute right-5 top-5 hidden sm:flex items-center justify-center w-14 h-12 rounded-[55%_45%_45%_55%/50%_60%_40%_50%] border border-dashed border-slate-700/30 text-[9px] font-mono uppercase tracking-[0.2em] text-slate-600">
                                    IMG
                                </div>
                                <p className='text-xl sm:text-3xl font-serif font-semibold text-slate-900 max-w-[12rem]'>{side2?.title || "20% discounts"}</p>
                                <p className='flex items-center gap-1 text-[11px] text-slate-700 font-mono uppercase tracking-[0.25em]'>View more <ArrowRight className='group-hover:ml-1 transition-all' size={14} /></p>
                            </div>
                        )}
                    </Link>
                </div>
            </div>
            
            {/* Dynamic Categories Marquee */}
            <CategoriesMarquee categories={categories} />
        </div>
    )
}

export default Hero

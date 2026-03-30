'use client'
import { useState } from 'react'
import Image from 'next/image'

export default function ProductImageGallery({ images, title }) {
    const [activeImg, setActiveImg] = useState(0)
    const imgs = images && images.length > 0 ? images : ['/placeholder.png'] // Fallback to a placeholder

    return (
        <div className="space-y-3">
            <div className="bg-[#F5F5F5] rounded-xl flex items-center justify-center h-80 overflow-hidden">
                <Image src={imgs[activeImg]} alt={title} width={400} height={400} className="max-h-72 w-auto object-contain" priority />
            </div>
            {imgs.length > 1 && imgs[0] !== '/placeholder.png' && (
                <div className="flex gap-2 flex-wrap">
                    {imgs.map((img, i) => (
                        <button key={i} onClick={() => setActiveImg(i)} className={`w-16 h-16 rounded-lg bg-[#F5F5F5] flex items-center justify-center border-2 transition ${activeImg === i ? 'border-indigo-400' : 'border-transparent'}`}>
                            <Image src={img} alt="" width={60} height={60} className="max-h-12 w-auto object-contain" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

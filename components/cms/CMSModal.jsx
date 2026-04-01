'use client'
import { useEffect, useRef } from 'react'
import { X } from 'react-bootstrap-icons'

export default function CMSModal({ isOpen, onClose, title, children, size = 'md' }) {
    const overlayRef = useRef(null)

    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden'
        else document.body.style.overflow = ''
        return () => { document.body.style.overflow = '' }
    }, [isOpen])

    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose?.() }
        if (isOpen) window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [isOpen, onClose])

    if (!isOpen) return null

    const sizes = {
        sm: 'max-w-md',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
    }

    return (
        <div
            ref={overlayRef}
            onClick={(e) => { if (e.target === overlayRef.current) onClose?.() }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-[fadeIn_150ms_ease-out]"
        >
            <div className={`w-full ${sizes[size] || sizes.md} bg-white border border-slate-200 rounded-2xl shadow-2xl shadow-black/10 animate-[slideUp_200ms_ease-out]`}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                    >
                        <X size={18} />
                    </button>
                </div>
                {/* Content */}
                <div className="p-6 max-h-[70vh] overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    )
}

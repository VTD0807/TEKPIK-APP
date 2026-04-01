'use client'
import React from 'react'

export default function RichTextEditor({ value, onChange, placeholder }) {
    return (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-2 text-[11px] font-mono uppercase tracking-[0.2em] text-slate-500 bg-slate-50 border-b border-slate-200">
                Rich Text (Plain Input)
            </div>
            <textarea
                className="w-full min-h-[150px] resize-y px-4 py-3 text-sm text-slate-700 focus:outline-none"
                value={value || ''}
                onChange={(e) => onChange?.(e.target.value)}
                placeholder={placeholder || 'Start typing...'}
            />
        </div>
    )
}

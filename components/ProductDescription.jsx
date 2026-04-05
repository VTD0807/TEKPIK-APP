'use client'
import { ChevronDown, ChevronUp } from 'react-bootstrap-icons'
import { useState } from 'react'

export default function ProductDescription({ html }) {
    const [expanded, setExpanded] = useState(false)

    if (!html) {
        return <p className="text-slate-500 text-sm leading-relaxed break-words">No description available.</p>
    }

    return (
        <div className="space-y-2">
            <div
                className={`text-slate-600 text-sm leading-relaxed break-words [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1 transition-all ${
                    expanded ? '' : 'line-clamp-4'
                }`}
                dangerouslySetInnerHTML={{ __html: html }}
            />
            <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 transition"
            >
                {expanded ? (
                    <>
                        <ChevronUp size={14} />
                        Show Less
                    </>
                ) : (
                    <>
                        <ChevronDown size={14} />
                        Show More
                    </>
                )}
            </button>
        </div>
    )
}
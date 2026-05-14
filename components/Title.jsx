'use client'
import { ArrowRight } from 'react-bootstrap-icons'
import Link from 'next/link'
import React from 'react'

const Title = ({ title, description, visibleButton = true, href = '' }) => {

    return (
        <div className='flex flex-col items-center text-center'>
            <h2 className='text-2xl font-semibold text-slate-800'>{title}</h2>
            {description && (
                <p className='max-w-lg text-sm text-slate-500 mt-2'>{description}</p>
            )}
            {visibleButton && href && (
                <Link href={href} className='inline-flex items-center gap-1.5 mt-3 text-sm text-emerald-600 hover:text-emerald-700 font-medium transition group'>
                    View more <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                </Link>
            )}
        </div>
    )
}

export default Title

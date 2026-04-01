'use client'
import { ArrowRight } from 'react-bootstrap-icons'
import Link from 'next/link'

const PageTitle = ({ heading, text, path = "/", linkText }) => {
    return (
        <div className="my-6">
            <h2 className="text-2xl font-semibold">{heading}</h2>
            <div className="flex items-center gap-3">
                <p className="text-slate-600">{text}</p>
                <Link href={path} className="flex items-center gap-1 text-green-500 text-sm">
                    {linkText} <ArrowRight size={14} />
                </Link>
            </div>
        </div>
    )
}

export default PageTitle
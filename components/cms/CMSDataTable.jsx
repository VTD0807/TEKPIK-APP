'use client'
import { useState } from 'react'
import { Search, ChevronLeft, ChevronRight, ChevronExpand } from 'react-bootstrap-icons'

export default function CMSDataTable({ columns, data, searchPlaceholder = 'Search...', onRowClick, actions }) {
    const [search, setSearch] = useState('')
    const [sortCol, setSortCol] = useState(null)
    const [sortDir, setSortDir] = useState('asc')
    const [page, setPage] = useState(1)
    const perPage = 10

    const filtered = data.filter(row =>
        columns.some(col => {
            const val = typeof col.accessor === 'function' ? col.accessor(row) : row[col.accessor]
            return val?.toString().toLowerCase().includes(search.toLowerCase())
        })
    )

    const sorted = [...filtered].sort((a, b) => {
        if (!sortCol) return 0
        const col = columns.find(c => c.key === sortCol)
        if (!col) return 0
        const aVal = typeof col.accessor === 'function' ? col.accessor(a) : a[col.accessor]
        const bVal = typeof col.accessor === 'function' ? col.accessor(b) : b[col.accessor]
        const cmp = String(aVal || '').localeCompare(String(bVal || ''), undefined, { numeric: true })
        return sortDir === 'asc' ? cmp : -cmp
    })

    const totalPages = Math.max(1, Math.ceil(sorted.length / perPage))
    const pageData = sorted.slice((page - 1) * perPage, page * perPage)

    const toggleSort = (key) => {
        if (sortCol === key) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc')
        } else {
            setSortCol(key)
            setSortDir('asc')
        }
    }

    return (
        <div className="space-y-4">
            {/* Search bar */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 flex-1 min-w-[200px] max-w-sm focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-black/10 transition shadow-sm">
                    <Search size={14} className="text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1) }}
                        placeholder={searchPlaceholder}
                        className="bg-transparent text-sm text-slate-700 placeholder-slate-400 outline-none w-full"
                    />
                </div>
                {actions && <div className="flex items-center gap-2">{actions}</div>}
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/80">
                            {columns.map(col => (
                                <th
                                    key={col.key}
                                    onClick={() => col.sortable !== false && toggleSort(col.key)}
                                    className={`px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider ${col.sortable !== false ? 'cursor-pointer hover:text-slate-700 select-none' : ''} ${col.className || ''}`}
                                >
                                    <span className="flex items-center gap-1">
                                        {col.label}
                                        {col.sortable !== false && (
                                            <ChevronExpand size={12} className={sortCol === col.key ? 'text-slate-900' : 'text-slate-300'} />
                                        )}
                                    </span>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {pageData.length > 0 ? pageData.map((row, i) => (
                            <tr
                                key={row.id || i}
                                onClick={() => onRowClick?.(row)}
                                className={`border-b border-slate-50 transition-colors ${onRowClick ? 'cursor-pointer hover:bg-slate-100' : 'hover:bg-slate-50'}`}
                            >
                                {columns.map(col => (
                                    <td key={col.key} className={`px-4 py-3 text-slate-600 ${col.className || ''}`}>
                                        {col.render ? col.render(row) : (typeof col.accessor === 'function' ? col.accessor(row) : row[col.accessor])}
                                    </td>
                                ))}
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={columns.length} className="px-4 py-12 text-center text-slate-400">
                                    No data found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between text-sm">
                    <p className="text-slate-400">
                        Showing {(page - 1) * perPage + 1}-{Math.min(page * perPage, sorted.length)} of {sorted.length}
                    </p>
                    <div className="flex items-center gap-1">
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition">
                            <ChevronLeft size={16} />
                        </button>
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let n
                            if (totalPages <= 5) n = i + 1
                            else if (page <= 3) n = i + 1
                            else if (page >= totalPages - 2) n = totalPages - 4 + i
                            else n = page - 2 + i
                            return (
                                <button key={n} onClick={() => setPage(n)}
                                    className={`w-8 h-8 rounded-lg text-xs font-medium transition ${page === n ? 'bg-black text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}>
                                    {n}
                                </button>
                            )
                        })}
                        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition">
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}



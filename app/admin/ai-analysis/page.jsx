'use client'
import { useEffect, useState } from 'react'
import Loading from '@/components/Loading'
import { Stars, ArrowRepeat } from 'react-bootstrap-icons'
import toast from 'react-hot-toast'

export default function AdminAiAnalysis() {
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const [bulkRunning, setBulkRunning] = useState(false)
    const [progress, setProgress] = useState(0)

    useEffect(() => {
        fetch('/api/products')
            .then(r => r.json())
            .then(data => {
                setProducts((data.products || []).map(p => ({ ...p, title: p.title || p.name })))
                setLoading(false)
            })
            .catch(() => setLoading(false))
    }, [])

    const analyseOne = async (productId) => {
        toast.loading('Analysing...', { id: productId })
        try {
            const res = await fetch('/api/ai/analyse', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            toast.success('Done!', { id: productId })
            setProducts(prev => prev.map(p => p.id === productId ? { ...p, aiAnalysis: data.analysis } : p))
        } catch (e) {
            toast.error(e.message || 'Failed', { id: productId })
        }
    }

    const runBulk = async () => {
        setBulkRunning(true)
        setProgress(0)
        const unanalysed = products.filter(p => !p.aiAnalysis)
        for (let i = 0; i < unanalysed.length; i++) {
            await analyseOne(unanalysed[i].id)
            setProgress(Math.round(((i + 1) / unanalysed.length) * 100))
            await new Promise(r => setTimeout(r, 1500))
        }
        setBulkRunning(false)
        toast.success('Bulk analysis complete!')
    }

    const analysed = products.filter(p => p.aiAnalysis).length

    if (loading) return <Loading />

    return (
        <div className="text-slate-500 mb-28 space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <h1 className="text-2xl text-slate-500">AI <span className="text-slate-800 font-medium">Analysis</span></h1>
                <button onClick={runBulk} disabled={bulkRunning} className="flex items-center gap-2 px-4 py-2 bg-black hover:bg-black/90 disabled:opacity-60 text-white text-sm rounded-lg transition">
                    <Stars size={14} /> {bulkRunning ? `Running... ${progress}%` : 'Bulk Analyse All'}
                </button>
            </div>

            {/* Coverage */}
            <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm space-y-2">
                <div className="flex justify-between text-sm">
                    <span>Coverage: {analysed}/{products.length} products</span>
                    <span>{Math.round((analysed / products.length) * 100)}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="bg-black h-2 rounded-full transition-all" style={{ width: `${(analysed / products.length) * 100}%` }} />
                </div>
                {bulkRunning && (
                    <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1">
                        <div className="bg-black h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
                    </div>
                )}
            </div>

            {/* Product list */}
            <div className="space-y-2">
                {products.map(p => (
                    <div key={p.id} className="flex items-center justify-between bg-white border border-slate-100 rounded-xl px-4 py-3 shadow-sm">
                        <div>
                            <p className="text-sm font-medium text-slate-700">{p.title}</p>
                            <p className="text-xs text-slate-400">{p.category}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            {p.aiAnalysis
                                ? <span className="text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded-full font-medium">Score: {p.aiAnalysis.score}/10</span>
                                : <span className="text-xs text-slate-300">Not analysed</span>
                            }
                            <button onClick={() => analyseOne(p.id)} className="p-1.5 text-slate-900 hover:bg-slate-100 rounded transition" title={p.aiAnalysis ? 'Re-analyse' : 'Analyse'}>
                                {p.aiAnalysis ? <ArrowRepeat size={14} /> : <Stars size={14} />}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

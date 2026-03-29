'use client'
import { useEffect, useState } from 'react'
import { productDummyData } from '@/assets/assets'
import Loading from '@/components/Loading'
import { SparklesIcon, RefreshCwIcon } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminAiAnalysis() {
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const [bulkRunning, setBulkRunning] = useState(false)
    const [progress, setProgress] = useState(0)

    useEffect(() => {
        setProducts(productDummyData.map(p => ({ ...p, title: p.title || p.name })))
        setLoading(false)
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
                <button onClick={runBulk} disabled={bulkRunning} className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:opacity-60 text-white text-sm rounded-lg transition">
                    <SparklesIcon size={14} /> {bulkRunning ? `Running... ${progress}%` : 'Bulk Analyse All'}
                </button>
            </div>

            {/* Coverage */}
            <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm space-y-2">
                <div className="flex justify-between text-sm">
                    <span>Coverage: {analysed}/{products.length} products</span>
                    <span>{Math.round((analysed / products.length) * 100)}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="bg-purple-500 h-2 rounded-full transition-all" style={{ width: `${(analysed / products.length) * 100}%` }} />
                </div>
                {bulkRunning && (
                    <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1">
                        <div className="bg-indigo-400 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
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
                                ? <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-medium">Score: {p.aiAnalysis.score}/10</span>
                                : <span className="text-xs text-slate-300">Not analysed</span>
                            }
                            <button onClick={() => analyseOne(p.id)} className="p-1.5 text-purple-500 hover:bg-purple-50 rounded transition" title={p.aiAnalysis ? 'Re-analyse' : 'Analyse'}>
                                {p.aiAnalysis ? <RefreshCwIcon size={14} /> : <SparklesIcon size={14} />}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

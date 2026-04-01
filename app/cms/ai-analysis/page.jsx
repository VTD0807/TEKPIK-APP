'use client'
import { useEffect, useState } from 'react'
import { Stars, Play, ArrowRepeat, CheckCircle, ExclamationCircle } from 'react-bootstrap-icons'
import toast from 'react-hot-toast'

export default function CMSAIAnalysis() {
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const [analysing, setAnalysing] = useState(new Set())

    useEffect(() => {
        fetch('/api/admin/products')
            .then(r => r.json())
            .then(d => { setProducts(d.products || []); setLoading(false) })
            .catch(() => setLoading(false))
    }, [])

    const runAnalysis = async (productId) => {
        setAnalysing(prev => new Set([...prev, productId]))
        const toastId = toast.loading('Running AI analysis...')
        try {
            const res = await fetch('/api/ai/analyse', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            toast.success('Analysis complete!', { id: toastId })
            const refreshRes = await fetch('/api/admin/products')
            const refreshData = await refreshRes.json()
            setProducts(refreshData.products || [])
        } catch (e) {
            toast.error(e.message || 'Analysis failed', { id: toastId })
        } finally {
            setAnalysing(prev => { const next = new Set(prev); next.delete(productId); return next })
        }
    }

    const runBulkAnalysis = async () => {
        const unanalysed = products.filter(p => !p.ai_analysis)
        if (unanalysed.length === 0) return toast.error('All products already have analysis')
        toast.success(`Starting analysis for ${unanalysed.length} products...`)
        for (const product of unanalysed) {
            await runAnalysis(product.id)
        }
    }

    const analysed = products.filter(p => p.ai_analysis)
    const unanalysed = products.filter(p => !p.ai_analysis)
    const pct = products.length > 0 ? Math.round((analysed.length / products.length) * 100) : 0

    if (loading) {
        return (
            <div className="space-y-4">
                <h1 className="text-2xl font-bold text-slate-800">AI Analysis</h1>
                <div className="animate-pulse space-y-3">
                    {Array(4).fill(0).map((_, i) => <div key={i} className="h-20 bg-white rounded-2xl border border-slate-200" />)}
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-end justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2.5">
                        <Stars className="text-slate-900" size={24} />
                        AI Analysis
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">{analysed.length} of {products.length} products analysed</p>
                </div>
                {unanalysed.length > 0 && (
                    <button onClick={runBulkAnalysis}
                        className="flex items-center gap-2 px-4 py-2.5 bg-black text-white text-sm font-medium rounded-xl shadow-lg shadow-black/10 hover:scale-105 transition-transform duration-200">
                        <Play size={15} />
                        Analyse All ({unanalysed.length})
                    </button>
                )}
            </div>

            {/* Progress */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-slate-700">Coverage Progress</span>
                    <span className="text-sm font-bold text-slate-900">{pct}%</span>
                </div>
                <div className="w-full h-3 bg-white/80 rounded-full overflow-hidden">
                    <div className="h-full bg-black rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                </div>
                <div className="flex items-center gap-6 mt-3 text-xs">
                    <span className="flex items-center gap-1.5 text-slate-800 font-medium"><CheckCircle size={12} /> {analysed.length} Analysed</span>
                    <span className="flex items-center gap-1.5 text-slate-800 font-medium"><ExclamationCircle size={12} /> {unanalysed.length} Pending</span>
                </div>
            </div>

            {/* Product Grid */}
            <div className="grid gap-3">
                {products.map(p => {
                    const hasAnalysis = !!p.ai_analysis
                    const isRunning = analysing.has(p.id)
                    const score = p.ai_analysis?.score

                    return (
                        <div key={p.id} className={`flex items-center gap-4 p-4 rounded-2xl border shadow-sm transition ${hasAnalysis ? 'bg-white border-slate-200' : 'bg-slate-100 border-slate-200'}`}>
                            <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center overflow-hidden border border-slate-200 shrink-0">
                                {p.image_urls?.[0] ? (
                                    <img src={p.image_urls[0]} alt="" className="w-full h-full object-contain" referrerPolicy="no-referrer" onError={e => e.target.style.display = 'none'} />
                                ) : (
                                    <span className="text-[10px] text-slate-400">No img</span>
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-slate-800 font-semibold truncate">{p.title}</p>
                                <p className="text-xs text-slate-500">{p.brand || 'No brand'} · ₹{p.price}</p>
                            </div>

                            {hasAnalysis && score != null && (
                                <div className={`text-center px-3 py-1.5 rounded-xl border ${score >= 8 ? 'bg-slate-100 border-slate-200 text-slate-800' : score >= 6 ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-slate-100 border-slate-200 text-slate-700'}`}>
                                    <p className="text-lg font-bold">{score}</p>
                                    <p className="text-[10px] opacity-70">/10</p>
                                </div>
                            )}

                            <button onClick={() => runAnalysis(p.id)} disabled={isRunning}
                                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl transition shrink-0 ${hasAnalysis ? 'text-slate-600 hover:text-slate-800 bg-slate-50 border border-slate-200 hover:bg-slate-100' : 'text-white bg-black shadow-lg shadow-black/10'}`}>
                                {isRunning ? <ArrowRepeat size={13} className="animate-spin" /> : hasAnalysis ? <ArrowRepeat size={13} /> : <Stars size={13} />}
                                {isRunning ? 'Analysing...' : hasAnalysis ? 'Regenerate' : 'Analyse'}
                            </button>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}


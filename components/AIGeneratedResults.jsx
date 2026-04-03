'use client'

import { useState, useEffect } from 'react'
import { DiamondsIcon } from 'react-bootstrap-icons'

export default function AIGeneratedResults({ query, products = [] }) {
    const [aiResult, setAiResult] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        const generateResult = async () => {
            if (!query) {
                setLoading(false)
                return
            }

            try {
                setLoading(true)
                const response = await fetch('/api/ai/generate-result', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query, products: products.slice(0, 5) })
                })

                if (!response.ok) throw new Error('Failed to generate AI result')

                const data = await response.json()
                setAiResult(data)
                setError(null)
            } catch (err) {
                console.error('AI generation error:', err)
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }

        generateResult()
    }, [query, products])

    if (!query) return null

    return (
        <div className="mb-8 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 shadow-sm">
            {/* AI Badge */}
            <div className="flex items-center gap-2 mb-4">
                <DiamondsIcon className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-semibold text-blue-900">AI-Generated Answer</span>
            </div>

            {loading ? (
                <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-blue-200 rounded w-full"></div>
                    <div className="h-4 bg-blue-200 rounded w-5/6"></div>
                    <div className="h-4 bg-blue-200 rounded w-4/5"></div>
                </div>
            ) : error ? (
                <p className="text-sm text-red-600">Unable to generate AI response at this time</p>
            ) : aiResult ? (
                <div className="space-y-4">
                    {/* Answer */}
                    <div>
                        <p className="text-slate-800 leading-relaxed">
                            {aiResult.answer}
                        </p>
                    </div>

                    {/* Key Points */}
                    {aiResult.keyPoints && aiResult.keyPoints.length > 0 && (
                        <div className="mt-4">
                            <h4 className="text-sm font-semibold text-slate-900 mb-2">Key Points:</h4>
                            <ul className="space-y-1">
                                {aiResult.keyPoints.map((point, idx) => (
                                    <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                                        <span className="text-blue-600 font-bold">•</span>
                                        <span>{point}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Recommendations */}
                    {aiResult.recommendations && aiResult.recommendations.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-blue-200">
                            <h4 className="text-sm font-semibold text-slate-900 mb-2">Recommendations:</h4>
                            <ul className="space-y-1">
                                {aiResult.recommendations.map((rec, idx) => (
                                    <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                                        <span className="text-indigo-600 font-bold">✓</span>
                                        <span>{rec}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Confidence Score */}
                    {aiResult.confidence && (
                        <div className="mt-4 pt-4 border-t border-blue-200">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-600">AI Confidence</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-20 bg-slate-200 rounded-full h-1.5">
                                        <div
                                            className="bg-blue-600 h-1.5 rounded-full"
                                            style={{ width: `${aiResult.confidence * 100}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-xs text-slate-600">{(aiResult.confidence * 100).toFixed(0)}%</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Source Attribution */}
                    {aiResult.sources && aiResult.sources.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-blue-200">
                            <p className="text-xs text-slate-600 mb-2">Sources:</p>
                            <div className="flex flex-wrap gap-2">
                                {aiResult.sources.map((source, idx) => (
                                    <span key={idx} className="inline-block px-2 py-1 bg-white border border-blue-200 rounded text-xs text-slate-700">
                                        {source}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : null}
        </div>
    )
}

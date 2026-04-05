'use client'

import {
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts'

const toNum = (value) => {
    const num = Number(value)
    return Number.isFinite(num) ? num : null
}

const formatPrice = (value) => {
    const num = toNum(value)
    if (!Number.isFinite(num)) return '—'
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(num)
}

const formatDateLabel = (value) => {
    if (!value) return '—'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return String(value)
    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
}

const buildInsight = (points = []) => {
    if (!Array.isArray(points) || points.length < 2) {
        return {
            title: 'AI Price Insight',
            summary: 'More daily points are needed before trend intelligence becomes reliable.',
            toneClass: 'text-slate-600',
            badgeClass: 'bg-slate-100 text-slate-700',
            badge: 'Insufficient history',
        }
    }

    const prices = points.map((p) => toNum(p.price)).filter((p) => Number.isFinite(p))
    if (prices.length < 2) {
        return {
            title: 'AI Price Insight',
            summary: 'Price points are incomplete. Try syncing again at peak time.',
            toneClass: 'text-slate-600',
            badgeClass: 'bg-slate-100 text-slate-700',
            badge: 'Incomplete data',
        }
    }

    const first = prices[0]
    const last = prices[prices.length - 1]
    const lowest = Math.min(...prices)
    const highest = Math.max(...prices)
    const delta = last - first
    const deltaPct = first > 0 ? (delta / first) * 100 : 0

    const drops = points.filter((p) => (toNum(p.change) || 0) < 0).length
    const hikes = points.filter((p) => (toNum(p.change) || 0) > 0).length

    if (delta < 0) {
        return {
            title: 'AI Price Insight',
            summary: `Price trend is cooling by ${Math.abs(deltaPct).toFixed(1)}% in this period. ${drops} drops vs ${hikes} hikes observed. Current level is near the lower side of the 60-day range.`,
            toneClass: 'text-emerald-700',
            badgeClass: 'bg-emerald-100 text-emerald-700',
            badge: 'Favorable trend',
            range: { lowest, highest, current: last },
        }
    }

    if (delta > 0) {
        return {
            title: 'AI Price Insight',
            summary: `Price trend is rising by ${Math.abs(deltaPct).toFixed(1)}% in this period. ${hikes} hikes vs ${drops} drops observed. Consider waiting if a near-term dip appears.`,
            toneClass: 'text-rose-700',
            badgeClass: 'bg-rose-100 text-rose-700',
            badge: 'Uptrend',
            range: { lowest, highest, current: last },
        }
    }

    return {
        title: 'AI Price Insight',
        summary: `Price is relatively flat over this period with ${drops} drops and ${hikes} hikes. Watch for a stronger directional move before buying in bulk.`,
        toneClass: 'text-slate-700',
        badgeClass: 'bg-slate-100 text-slate-700',
        badge: 'Sideways',
        range: { lowest, highest, current: last },
    }
}

function TrendDot({ cx, cy, payload }) {
    if (!payload || cx == null || cy == null) return null
    const change = toNum(payload.change) || 0
    const fill = change < 0 ? '#16a34a' : change > 0 ? '#dc2626' : '#64748b'
    return <circle cx={cx} cy={cy} r={3} fill={fill} stroke="#ffffff" strokeWidth={1.2} />
}

export default function ProductPriceTrend({ history = [] }) {
    const points = (Array.isArray(history) ? history : [])
        .map((item) => {
            const price = toNum(item.price)
            return {
                ...item,
                price,
                label: item.dayKey || formatDateLabel(item.capturedAt),
                dateLabel: formatDateLabel(item.capturedAt || item.dayKey),
            }
        })
        .filter((item) => Number.isFinite(item.price))

    const chartData = points.map((item, index) => {
        const prev = index > 0 ? points[index - 1].price : item.price
        const change = item.price - prev
        return {
            ...item,
            change,
            dropPoint: change < 0 ? item.price : null,
            hikePoint: change > 0 ? item.price : null,
        }
    })

    const insight = buildInsight(chartData)

    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm space-y-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Price Intelligence</p>
                    <h2 className="text-lg font-semibold text-slate-900">60-Day Price Trend</h2>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${insight.badgeClass}`}>{insight.badge}</span>
            </div>

            {chartData.length > 1 ? (
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="label" minTickGap={26} stroke="#94a3b8" />
                            <YAxis stroke="#94a3b8" />
                            <Tooltip
                                formatter={(value, name, ctx) => {
                                    if (name === 'price') return [formatPrice(value), 'Price']
                                    if (name === 'change') {
                                        const numeric = toNum(value) || 0
                                        const sign = numeric > 0 ? '+' : ''
                                        return [`${sign}${formatPrice(numeric)}`, 'Day change']
                                    }
                                    return [value, name]
                                }}
                                labelFormatter={(_, payload) => payload?.[0]?.payload?.dateLabel || '—'}
                            />
                            <Line type="linear" dataKey="price" stroke="#0f172a" strokeWidth={2} dot={<TrendDot />} activeDot={{ r: 4 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-sm text-slate-400">
                    Price chart will appear after at least 2 daily captures in the secondary Firestore.
                </div>
            )}

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 sm:p-4">
                <p className="text-sm font-semibold text-slate-800">{insight.title}</p>
                {insight.range ? (
                    <p className={`mt-1 text-xs ${insight.toneClass}`}>
                        Range in view: low {formatPrice(insight.range.lowest)} | high {formatPrice(insight.range.highest)} | latest {formatPrice(insight.range.current)}
                    </p>
                ) : null}
                <p className="mt-2 text-[11px] text-slate-400">Green dot = daily drop, red dot = daily hike.</p>
            </div>
        </section>
    )
}

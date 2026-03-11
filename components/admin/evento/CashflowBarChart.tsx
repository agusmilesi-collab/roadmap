'use client'

import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
    Tooltip, CartesianGrid,
} from 'recharts'

// Minimal types — both admin and client can satisfy this shape
export interface ChartPago {
    id: string
    monto: number
    moneda: string
    tipo_cambio_snapshot: number | null
    fecha: string
    realizado: boolean
}

export interface ChartRubro {
    id: string
    nombre: string
    proveedor: string | null
    pagos_proveedor?: ChartPago[]
}

// ─── Palette ──────────────────────────────────────────────────────────────────

export const RUBRO_COLORS = [
    '#7C8B70', '#C9A84C', '#6B7F9E', '#C17B5C', '#8B7C9E',
    '#5C8B7C', '#9E7C6B', '#6B8B5C', '#9E6B7C', '#5C6B8B',
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString('es-AR', { maximumFractionDigits: 1 })}M`
    if (n >= 1_000) return `${(n / 1_000).toLocaleString('es-AR', { maximumFractionDigits: 0 })}k`
    return n.toLocaleString('es-AR', { maximumFractionDigits: 0 })
}

function fmtFull(n: number) {
    return n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function getChartMonths(rubros: ChartRubro[], fechaEvento: string): Date[] {
    const today = new Date()
    today.setDate(1); today.setHours(0, 0, 0, 0)

    const eventoDate = new Date(fechaEvento + 'T00:00:00')
    eventoDate.setDate(1); eventoDate.setHours(0, 0, 0, 0)

    // Extend start to earliest pago date if before today
    const allPageDates = rubros
        .flatMap(r => (r.pagos_proveedor ?? []).map(p => {
            const d = new Date(p.fecha + 'T00:00:00')
            d.setDate(1); d.setHours(0, 0, 0, 0)
            return d.getTime()
        }))

    const startTime = allPageDates.length
        ? Math.min(today.getTime(), ...allPageDates)
        : today.getTime()

    const endTime = Math.max(eventoDate.getTime(), today.getTime())

    const months: Date[] = []
    const cur = new Date(startTime)
    while (cur.getTime() <= endTime) {
        months.push(new Date(cur))
        cur.setMonth(cur.getMonth() + 1)
    }
    return months.length ? months : [new Date(today)]
}

function pagoToUSD(pago: ChartPago, fallbackTc: number): number {
    if (pago.moneda === 'USD') return pago.monto
    const tc = pago.tipo_cambio_snapshot && pago.tipo_cambio_snapshot > 0
        ? pago.tipo_cambio_snapshot
        : fallbackTc
    return pago.monto / (tc > 0 ? tc : 1)
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────

interface TooltipPayloadEntry {
    dataKey: string
    value: number
    fill: string
}

function buildTooltip(rubros: ChartRubro[], showARS: boolean) {
    return function CustomTooltip({ active, payload, label }: {
        active?: boolean
        payload?: TooltipPayloadEntry[]
        label?: string
    }) {
        if (!active || !payload?.length) return null
        const currency = showARS ? 'ARS' : 'USD'

        // Group payload by rubro index → { pagado, aPagar }
        const byRubro = new Map<number, { pagado: number; aPagar: number }>()
        for (const entry of payload) {
            const val = entry.value ?? 0
            if (val < 0.01) continue
            const parts = (entry.dataKey as string).split('_')
            const idx = parseInt(parts[1])
            const isReal = parts[2] === 'real'
            const cur = byRubro.get(idx) ?? { pagado: 0, aPagar: 0 }
            if (isReal) cur.pagado += val
            else cur.aPagar += val
            byRubro.set(idx, cur)
        }
        if (byRubro.size === 0) return null

        let totalPagado = 0
        let totalAPagar = 0
        byRubro.forEach(({ pagado, aPagar }) => {
            totalPagado += pagado
            totalAPagar += aPagar
        })

        return (
            <div style={{
                background: 'white', border: '1px solid #E5E0D8', borderRadius: '8px',
                padding: '0.75rem 1rem', boxShadow: '0 4px 20px rgba(0,0,0,0.13)',
                minWidth: '230px', maxWidth: '300px',
            }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#9CA3AF', margin: '0 0 0.65rem' }}>{label}</p>
                {Array.from(byRubro.entries()).map(([idx, { pagado, aPagar }]) => {
                    const rubro = rubros[idx]
                    const color = RUBRO_COLORS[idx % RUBRO_COLORS.length]
                    return (
                        <div key={idx} style={{ marginBottom: '0.55rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.18rem' }}>
                                <span style={{ width: 9, height: 9, borderRadius: '2px', background: color, flexShrink: 0 }} />
                                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {rubro?.nombre ?? `Rubro ${idx + 1}`}
                                </span>
                            </div>
                            {pagado > 0.01 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: '1.2rem', fontSize: '0.78rem' }}>
                                    <span style={{ color: '#2E7D32' }}>✓ Pagado</span>
                                    <span style={{ fontWeight: 600, color: '#2E7D32' }}>{currency} {fmtFull(pagado)}</span>
                                </div>
                            )}
                            {aPagar > 0.01 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: '1.2rem', fontSize: '0.78rem' }}>
                                    <span style={{ color: '#D97706' }}>⏳ A pagar</span>
                                    <span style={{ fontWeight: 600, color: '#D97706' }}>{currency} {fmtFull(aPagar)}</span>
                                </div>
                            )}
                        </div>
                    )
                })}
                <div style={{ marginTop: '0.4rem', paddingTop: '0.5rem', borderTop: '1px solid #F3EDE4', display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.81rem', fontWeight: 700 }}>
                    {totalPagado > 0.01 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#2E7D32' }}>
                            <span>Total pagado</span>
                            <span>{currency} {fmtFull(totalPagado)}</span>
                        </div>
                    )}
                    {totalAPagar > 0.01 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#D97706' }}>
                            <span>Total a pagar</span>
                            <span>{currency} {fmtFull(totalAPagar)}</span>
                        </div>
                    )}
                </div>
            </div>
        )
    }
}

// ─── Chart ────────────────────────────────────────────────────────────────────

export interface CashflowBarChartProps {
    rubros: ChartRubro[]
    fechaEvento: string
    tc: number
    showARS: boolean
}

export function CashflowBarChart({ rubros, fechaEvento, tc, showARS }: CashflowBarChartProps) {
    const months = getChartMonths(rubros, fechaEvento)

    function toDisplay(pago: ChartPago): number {
        const usd = pagoToUSD(pago, tc)
        return showARS ? usd * tc : usd
    }

    const chartData = months.map(month => {
        const point: Record<string, number | string> = {
            month: month.toLocaleString('es-AR', { month: 'short', year: '2-digit' }),
        }
        rubros.forEach((rubro, idx) => {
            const pagosEnMes = (rubro.pagos_proveedor ?? []).filter(p => {
                const d = new Date(p.fecha + 'T00:00:00')
                return d.getFullYear() === month.getFullYear() && d.getMonth() === month.getMonth()
            })
            const realizados = pagosEnMes.filter(p => p.realizado).reduce((s, p) => s + toDisplay(p), 0)
            const pendientes = pagosEnMes.filter(p => !p.realizado).reduce((s, p) => s + toDisplay(p), 0)
            if (realizados > 0.01) point[`r_${idx}_real`] = Math.round(realizados)
            if (pendientes > 0.01) point[`r_${idx}_pend`] = Math.round(pendientes)
        })
        return point
    })

    const currency = showARS ? 'ARS' : 'USD'
    const CustomTooltip = buildTooltip(rubros, showARS)

    return (
        <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }} barCategoryGap="35%">
                <CartesianGrid strokeDasharray="3 3" stroke="#EDE8E0" vertical={false} />
                <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: '#9CA3AF' }}
                    axisLine={false}
                    tickLine={false}
                />
                <YAxis
                    tick={{ fontSize: 11, fill: '#9CA3AF' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={v => `${currency} ${fmt(v)}`}
                    width={80}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(201,168,76,0.06)' }} />
                {rubros.flatMap((rubro, idx) => {
                    const color = RUBRO_COLORS[idx % RUBRO_COLORS.length]
                    return [
                        <Bar
                            key={`${rubro.id}_real`}
                            dataKey={`r_${idx}_real`}
                            stackId="a"
                            fill={color}
                            fillOpacity={1}
                            isAnimationActive={false}
                        />,
                        <Bar
                            key={`${rubro.id}_pend`}
                            dataKey={`r_${idx}_pend`}
                            stackId="a"
                            fill={color}
                            fillOpacity={0.42}
                            isAnimationActive={false}
                        />,
                    ]
                })}
            </BarChart>
        </ResponsiveContainer>
    )
}

'use client'

import type { DistribucionItem } from '@/lib/presupuestoMetrics'

interface Props {
    items: DistribucionItem[]
    centerValue: string  // ej: "USD 38.200"
    centerLabel: string  // ej: "Asignado"
    size?: number
}

// Donut chart implementado con SVG nativo (sin recharts) — más liviano y predecible.
// Usa el pattern de circle + stroke-dasharray que ya está en el sistema de diseño.
export function DonutChart({ items, centerValue, centerLabel, size = 200 }: Props) {
    if (items.length === 0) {
        return (
            <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontStyle: 'italic', fontSize: '0.85rem' }}>
                Sin datos para graficar
            </div>
        )
    }

    // Cada segmento ocupa item.pct del círculo. dashoffset acumula desde 25 (offset inicial para empezar arriba).
    const RADIUS = 15.915
    const segments = items.reduce<Array<{ item: typeof items[number]; dashoffset: number }>>((acc, item) => {
        const prevOffset = acc.length === 0 ? 25 : acc[acc.length - 1].dashoffset - acc[acc.length - 1].item.pct
        acc.push({ item, dashoffset: prevOffset })
        return acc
    }, [])

    return (
        <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
            <svg width={size} height={size} viewBox="0 0 42 42" style={{ display: 'block' }}>
                {/* Track de fondo */}
                <circle cx="21" cy="21" r={RADIUS} fill="transparent" stroke="var(--color-cream-dark)" strokeWidth="6" />
                {segments.map(({ item, dashoffset }) => {
                    const dasharray = `${item.pct} ${100 - item.pct}`
                    return (
                        <circle
                            key={item.rubroId}
                            cx="21" cy="21" r={RADIUS}
                            fill="transparent"
                            stroke={item.color}
                            strokeWidth="6"
                            strokeDasharray={dasharray}
                            strokeDashoffset={dashoffset}
                        >
                            <title>{`${item.nombre}: ${item.pct.toFixed(1)}% (USD ${Math.round(item.montoUSD).toLocaleString('es-AR')})`}</title>
                        </circle>
                    )
                })}
            </svg>
            <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                pointerEvents: 'none',
            }}>
                <span style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: '1.4rem',
                    fontWeight: 700,
                    color: 'var(--color-text)',
                    lineHeight: 1,
                }}>
                    {centerValue}
                </span>
                <span style={{
                    fontSize: '0.65rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'var(--color-text-muted)',
                    marginTop: '0.3rem',
                    fontWeight: 600,
                }}>
                    {centerLabel}
                </span>
            </div>
        </div>
    )
}

interface LegendProps {
    items: DistribucionItem[]
    formatAmount: (usd: number) => string
}

export function DonutLegend({ items, formatAmount }: LegendProps) {
    if (items.length === 0) return null
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {items.map(item => (
                <div
                    key={item.rubroId}
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '14px 1fr auto auto',
                        alignItems: 'center',
                        gap: '0.55rem',
                        padding: '0.32rem 0.4rem',
                        fontSize: '0.83rem',
                        borderRadius: '6px',
                    }}
                >
                    <span style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: item.color }} />
                    <span style={{ color: 'var(--color-text)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.nombre}
                        {item.proveedor ? <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}> · {item.proveedor}</span> : null}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono, monospace)', color: 'var(--color-text-muted)', fontSize: '0.78rem', minWidth: 48, textAlign: 'right' }}>
                        {item.pct.toFixed(1).replace('.', ',')}%
                    </span>
                    <span style={{ fontWeight: 600, color: 'var(--color-text)', fontSize: '0.8rem', minWidth: 88, textAlign: 'right' }}>
                        {formatAmount(item.montoUSD)}
                    </span>
                </div>
            ))}
        </div>
    )
}

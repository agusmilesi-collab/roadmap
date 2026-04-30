'use client'

import { useRef, useState } from 'react'
import type { CashflowSemana } from '@/lib/presupuestoMetrics'

interface Props {
    semanas: CashflowSemana[]
    formatAmount: (usd: number) => string
}

interface HoverInfo {
    x: number
    y: number
    rubroNombre: string
    proveedor: string | null
    montoLabel: string
    estadoLabel: string
    color: string
}

const MESES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']

export function CashflowSemanalChart({ semanas, formatAmount }: Props) {
    const containerRef = useRef<HTMLDivElement | null>(null)
    const [hover, setHover] = useState<HoverInfo | null>(null)
    if (semanas.length === 0) {
        return (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontStyle: 'italic', fontSize: '0.85rem' }}>
                Sin pagos para graficar
            </div>
        )
    }

    const maxTotal = Math.max(...semanas.map(s => s.totalUSD), 1)
    const cols = semanas.length

    // Calcular S1, S2, S3, S4... por semana del mes
    // Y agrupar columnas consecutivas del mismo mes para el label de meses (con span)
    const semanaDelMes: number[] = []
    const monthGroups: Array<{ month: number; year: number; span: number }> = []
    let lastKey = ''
    let counter = 0
    for (const s of semanas) {
        const m = s.weekStart.getMonth()
        const y = s.weekStart.getFullYear()
        const key = `${y}-${m}`
        if (key !== lastKey) {
            counter = 1
            monthGroups.push({ month: m, year: y, span: 1 })
            lastKey = key
        } else {
            counter++
            monthGroups[monthGroups.length - 1].span++
        }
        semanaDelMes.push(counter)
    }

    return (
        <div ref={containerRef} style={{ position: 'relative' }}>
            {/* Bars */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${cols}, 1fr)`,
                    gap: '0.18rem',
                    alignItems: 'end',
                    height: 200,
                    padding: '0 0.15rem',
                }}
            >
                {semanas.map((s, i) => (
                    <div
                        key={i}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'flex-end',
                            height: '100%',
                            gap: 1,
                        }}
                    >
                        {s.segmentos.map((seg, j) => {
                            const segPct = (seg.montoUSD / maxTotal) * 100
                            const baseStyle: React.CSSProperties = {
                                width: '100%',
                                height: `${segPct}%`,
                                background: seg.color,
                                color: seg.color,
                                borderRadius: j === 0 ? '3px 3px 0 0' : 0,
                                cursor: 'help',
                                transition: 'opacity 0.15s',
                            }
                            if (seg.kind === 'pendiente') {
                                Object.assign(baseStyle, {
                                    opacity: 0.45,
                                    backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.4) 4px, rgba(255,255,255,0.4) 8px)',
                                    border: '1px dashed currentColor',
                                })
                            } else if (seg.kind === 'devolucion_esperada') {
                                Object.assign(baseStyle, {
                                    background: 'rgba(46,125,50,0.5)',
                                    color: '#2E7D32',
                                    backgroundImage: 'repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(255,255,255,0.4) 4px, rgba(255,255,255,0.4) 8px)',
                                    border: '1px dashed #2E7D32',
                                    opacity: 0.85,
                                })
                            } else if (seg.kind === 'devolucion_realizada') {
                                Object.assign(baseStyle, {
                                    background: '#2E7D32',
                                    color: '#2E7D32',
                                })
                            }
                            const tip = `${seg.rubroNombre} · ${formatAmount(seg.montoUSD)} · ${labelKind(seg.kind)}`
                            return (
                                <div
                                    key={j}
                                    style={baseStyle}
                                    title={tip}
                                    onMouseEnter={(e) => {
                                        const rect = e.currentTarget.getBoundingClientRect()
                                        const cont = containerRef.current?.getBoundingClientRect()
                                        if (!cont) return
                                        setHover({
                                            x: rect.left + rect.width / 2 - cont.left,
                                            y: rect.top - cont.top,
                                            rubroNombre: seg.rubroNombre,
                                            proveedor: seg.proveedor,
                                            montoLabel: formatAmount(seg.montoUSD),
                                            estadoLabel: labelKind(seg.kind),
                                            color: seg.color,
                                        })
                                    }}
                                    onMouseLeave={() => setHover(null)}
                                />
                            )
                        })}
                    </div>
                ))}
            </div>

            {/* Row 1: S1, S2, S3, S4 + marcadores HOY/EVENTO/DEVOL */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${cols}, 1fr)`,
                    gap: '0.18rem',
                    marginTop: '0.4rem',
                }}
            >
                {semanas.map((s, i) => {
                    const isDevolucion = s.segmentos.some(x => x.kind === 'devolucion_esperada' || x.kind === 'devolucion_realizada')
                        && !s.segmentos.some(x => x.kind === 'realizado' || x.kind === 'pendiente')
                    const color = s.isToday
                        ? 'var(--color-gold-dark)'
                        : s.isEvento
                            ? '#7B5EA7'
                            : isDevolucion
                                ? '#2E7D32'
                                : 'var(--color-text-muted)'
                    const fontWeight = (s.isToday || s.isEvento || isDevolucion) ? 700 : 500
                    return (
                        <span
                            key={i}
                            title={s.label}
                            style={{
                                fontFamily: 'var(--font-mono, monospace)',
                                fontSize: '0.62rem',
                                color, fontWeight,
                                textAlign: 'center',
                                lineHeight: 1.1,
                                overflow: 'hidden',
                            }}
                        >
                            S{semanaDelMes[i]}
                            {s.isToday && <span style={{ display: 'block', fontSize: '0.55rem', letterSpacing: 0 }}>◆HOY</span>}
                            {s.isEvento && <span style={{ display: 'block', fontSize: '0.55rem', letterSpacing: 0 }}>★EVT</span>}
                            {isDevolucion && !s.isEvento && <span style={{ display: 'block', fontSize: '0.55rem', letterSpacing: 0 }}>↩DEV</span>}
                        </span>
                    )
                })}
            </div>

            {/* Row 2: meses agrupados */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${cols}, 1fr)`,
                    gap: '0.18rem',
                    marginTop: '0.4rem',
                    paddingTop: '0.35rem',
                    borderTop: '1px solid var(--color-border)',
                }}
            >
                {monthGroups.map((g, i) => (
                    <span
                        key={i}
                        style={{
                            gridColumn: `span ${g.span}`,
                            fontFamily: 'var(--font-mono, monospace)',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            letterSpacing: '0.06em',
                            color: 'var(--color-text)',
                            textAlign: 'center',
                            lineHeight: 1.1,
                        }}
                    >
                        {MESES[g.month]}
                        {monthGroups.length > 1 && i === 0 ? ` ${g.year}` : ''}
                    </span>
                ))}
            </div>

            {/* Tooltip custom (sin delay) */}
            {hover && (
                <div
                    style={{
                        position: 'absolute',
                        left: hover.x,
                        top: hover.y,
                        transform: 'translate(-50%, calc(-100% - 8px))',
                        background: 'var(--color-text)',
                        color: 'var(--color-white)',
                        padding: '0.45rem 0.7rem',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.74rem',
                        lineHeight: 1.35,
                        whiteSpace: 'nowrap',
                        pointerEvents: 'none',
                        zIndex: 10,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: hover.color, flexShrink: 0 }} />
                        {hover.rubroNombre}
                        {hover.proveedor && <span style={{ opacity: 0.7, fontWeight: 400 }}>· {hover.proveedor}</span>}
                    </div>
                    <div style={{ opacity: 0.85, marginTop: '0.15rem' }}>
                        {hover.montoLabel} · {hover.estadoLabel}
                    </div>
                </div>
            )}
        </div>
    )
}

function labelKind(k: CashflowSemana['segmentos'][number]['kind']): string {
    switch (k) {
        case 'realizado': return 'realizado'
        case 'pendiente': return 'pendiente'
        case 'devolucion_esperada': return 'devolución esperada'
        case 'devolucion_realizada': return 'devolución realizada'
    }
}

export function CashflowSemanalLegend() {
    return (
        <div style={{
            display: 'flex',
            gap: '1.2rem',
            fontSize: '0.74rem',
            color: 'var(--color-text-muted)',
            marginTop: '0.85rem',
            flexWrap: 'wrap',
            paddingTop: '0.85rem',
            borderTop: '1px dashed var(--color-border)',
        }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--color-text-muted)' }} />
                Sólido = realizado
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--color-text-muted)', opacity: 0.45, border: '1px dashed var(--color-text-muted)' }} />
                Rayado = pendiente
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: 'rgba(46,125,50,0.5)', border: '1px dashed #2E7D32' }} />
                ↩ Devolución esperada
            </span>
            <span style={{ fontStyle: 'italic', color: 'var(--color-text-faint)', fontSize: '0.72rem' }}>
                Hover sobre cada barra para ver el proveedor.
            </span>
        </div>
    )
}

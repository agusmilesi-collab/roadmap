'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import type { CashflowBarChartProps } from '@/components/admin/evento/CashflowBarChart'
import { RUBRO_COLORS } from '@/components/admin/evento/CashflowBarChart'

const CashflowBarChart = dynamic<CashflowBarChartProps>(
    () => import('@/components/admin/evento/CashflowBarChart').then(m => ({ default: m.CashflowBarChart })),
    {
        ssr: false,
        loading: () => (
            <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                Cargando gráfico…
            </div>
        ),
    }
)

// ─── Types ────────────────────────────────────────────────────────────────────

interface PagoCliente {
    id: string
    monto: number
    moneda: string
    tipo_cambio_snapshot: number | null
    fecha: string
    realizado: boolean
    descripcion: string | null
    created_at: string
}

interface RubroCliente {
    id: string
    nombre: string
    estado: string
    proveedor: string | null
    monto_original: number | null
    moneda: string
    tipo_cambio_propio: number | null
    sena_pct: number | null
    orden: number
    notas: string | null
    costo_total: number | null
    descripcion_servicio: string | null
    pagos_proveedor: PagoCliente[]
}

interface Props {
    rubros: RubroCliente[]
    presupuestoUsd: number | null
    tipoCambioInicial: number | null
    fechaEvento: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ESTADO_STYLES: Record<string, React.CSSProperties> = {
    pendiente: { backgroundColor: 'rgba(120,120,120,0.08)', color: '#888' },
    en_proceso: { backgroundColor: 'rgba(201,168,76,0.15)', color: 'var(--color-gold-dark)' },
    decidido: { backgroundColor: 'rgba(107,124,92,0.15)', color: 'var(--color-olive)' },
    señado: { backgroundColor: 'rgba(138,109,174,0.15)', color: '#7B5EA7' },
    completado: { backgroundColor: 'rgba(40,167,69,0.12)', color: '#2E7D32' },
}

const ESTADO_LABELS: Record<string, string> = {
    pendiente: 'Pendiente', en_proceso: 'En proceso', decidido: 'Decidido',
    señado: 'Señado', completado: 'Completado',
}

function fmt(n: number, decimals = 0) {
    return n.toLocaleString('es-AR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

async function fetchDolarBlue(): Promise<number | null> {
    try {
        const res = await fetch('https://dolarapi.com/v1/dolares/blue', { cache: 'no-store' })
        const data = await res.json()
        return typeof data.venta === 'number' ? data.venta : null
    } catch { return null }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PresupuestoClienteTab({ rubros, presupuestoUsd, tipoCambioInicial, fechaEvento }: Props) {
    const [tcBlue, setTcBlue] = useState<number>(tipoCambioInicial ?? 0)
    const [tcLoading, setTcLoading] = useState(true)
    const [showARS, setShowARS] = useState(false)
    const [expandedId, setExpandedId] = useState<string | null>(null)

    useEffect(() => {
        fetchDolarBlue().then(val => {
            if (val !== null) setTcBlue(val)
            setTcLoading(false)
        })
    }, [])

    const tc = tcBlue > 0 ? tcBlue : 1

    function toUSD(monto: number, moneda: string, tcSnap?: number | null): number {
        if (moneda === 'USD') return monto
        return monto / (tcSnap && tcSnap > 0 ? tcSnap : tc)
    }

    // Budget calculations
    const comprometidoUSD = rubros.reduce((sum, r) => {
        const base = r.costo_total ?? r.monto_original
        if (!base) return sum
        return sum + toUSD(base, r.moneda, r.tipo_cambio_propio)
    }, 0)

    const totalUSD = presupuestoUsd ?? 0
    const disponibleUSD = totalUSD - comprometidoUSD
    const pct = totalUSD > 0 ? Math.min(100, Math.round((comprometidoUSD / totalUSD) * 100)) : 0
    const hasPagos = rubros.some(r => r.pagos_proveedor.length > 0)

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* ── BLOQUE 1: Resumen financiero ─────────────────────────────── */}
            <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                    <div>
                        <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-muted)', margin: 0 }}>
                            Resumen financiero
                        </p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '0.2rem 0 0', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', backgroundColor: tcLoading ? '#D1D5DB' : '#22C55E' }} />
                            TC blue: {tcLoading ? 'obteniendo…' : `$ ${fmt(tc)} ARS/USD`}
                        </p>
                    </div>
                    {/* USD / ARS toggle */}
                    <div style={{ display: 'flex', borderRadius: '20px', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
                        {(['USD', 'ARS'] as const).map(cur => (
                            <button
                                key={cur}
                                type="button"
                                onClick={() => setShowARS(cur === 'ARS')}
                                style={{
                                    padding: '0.28rem 0.9rem',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontFamily: 'var(--font-sans)',
                                    fontWeight: 600,
                                    fontSize: '0.78rem',
                                    backgroundColor: (cur === 'ARS') === showARS ? 'var(--color-gold)' : 'transparent',
                                    color: (cur === 'ARS') === showARS ? 'white' : 'var(--color-text-muted)',
                                    transition: 'background-color 0.15s, color 0.15s',
                                }}
                            >{cur}</button>
                        ))}
                    </div>
                </div>

                <div className="budget-cards-grid">
                    <FinancialCard
                        label="Presupuesto total"
                        usdValue={totalUSD}
                        arsValue={totalUSD * tc}
                        showARS={showARS}
                        color="var(--color-text)"
                    />
                    <FinancialCard
                        label="Comprometido"
                        usdValue={comprometidoUSD}
                        arsValue={comprometidoUSD * tc}
                        showARS={showARS}
                        color={comprometidoUSD > totalUSD ? 'var(--color-error)' : 'var(--color-gold-dark)'}
                        sub={`${pct}% del presupuesto`}
                    />
                    <FinancialCard
                        label="Disponible"
                        usdValue={Math.max(0, disponibleUSD)}
                        arsValue={Math.max(0, disponibleUSD) * tc}
                        showARS={showARS}
                        color={disponibleUSD < 0 ? 'var(--color-error)' : 'var(--color-olive)'}
                        sub={disponibleUSD < 0 ? '⚠ Presupuesto excedido' : undefined}
                    />
                </div>

                {totalUSD > 0 && (
                    <div style={{ height: '6px', backgroundColor: 'var(--color-cream-dark)', borderRadius: '99px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: '99px', transition: 'width 0.4s ease', width: `${pct}%`, backgroundColor: comprometidoUSD > totalUSD ? 'var(--color-error)' : 'var(--color-gold)' }} />
                    </div>
                )}
            </div>

            {/* ── BLOQUE 2: Cashflow ───────────────────────────────────────── */}
            {hasPagos && (
                <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                        <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-muted)', margin: 0 }}>
                            Cashflow de pagos
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
                            {rubros.filter(r => r.pagos_proveedor.length > 0).map(r => {
                                const idx = rubros.indexOf(r)
                                return (
                                    <span key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                                        <span style={{ width: 8, height: 8, borderRadius: '2px', backgroundColor: RUBRO_COLORS[idx % RUBRO_COLORS.length], flexShrink: 0 }} />
                                        {r.nombre}
                                    </span>
                                )
                            })}
                        </div>
                    </div>
                    <CashflowBarChart rubros={rubros} fechaEvento={fechaEvento} tc={tc} showARS={showARS} />
                    <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <span style={{ width: 10, height: 10, borderRadius: '2px', backgroundColor: '#7C8B70', flexShrink: 0 }} />
                            Sólido = realizado
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <span style={{ width: 10, height: 10, borderRadius: '2px', backgroundColor: '#7C8B70', opacity: 0.4, flexShrink: 0 }} />
                            Transparente = pendiente
                        </span>
                    </div>
                </div>
            )}

            {/* ── BLOQUE 3: Rubros ─────────────────────────────────────────── */}
            {rubros.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                    No hay rubros definidos para este evento.
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {rubros.map((rubro, idx) => (
                        <RubroReadCard
                            key={rubro.id}
                            rubro={rubro}
                            rubroColor={RUBRO_COLORS[idx % RUBRO_COLORS.length]}
                            tc={tc}
                            showARS={showARS}
                            isExpanded={expandedId === rubro.id}
                            onToggle={() => setExpandedId(expandedId === rubro.id ? null : rubro.id)}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

// ─── FinancialCard ────────────────────────────────────────────────────────────

function FinancialCard({ label, usdValue, arsValue, showARS, color, sub }: {
    label: string; usdValue: number; arsValue: number; showARS: boolean; color: string; sub?: string
}) {
    const primary = showARS ? arsValue : usdValue
    const secondary = showARS ? usdValue : arsValue
    const primaryPrefix = showARS ? 'ARS' : 'USD'
    const secondaryPrefix = showARS ? 'USD' : 'ARS'
    return (
        <div style={{ padding: '1.1rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-cream)', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-muted)' }}>{label}</span>
            <span style={{ fontSize: '1.1rem', fontWeight: 700, color, fontFamily: 'var(--font-serif)', lineHeight: 1.2 }}>
                {primaryPrefix} {fmt(primary)}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                {secondaryPrefix} {fmt(secondary)}
            </span>
            {sub && <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.1rem' }}>{sub}</span>}
        </div>
    )
}

// ─── RubroReadCard ────────────────────────────────────────────────────────────

function RubroReadCard({ rubro, rubroColor, tc, showARS, isExpanded, onToggle }: {
    rubro: RubroCliente
    rubroColor: string
    tc: number
    showARS: boolean
    isExpanded: boolean
    onToggle: () => void
}) {
    function toUSD(monto: number, moneda: string, tcSnap?: number | null): number {
        if (moneda === 'USD') return monto
        return monto / (tcSnap && tcSnap > 0 ? tcSnap : tc)
    }
    function fmtAmt(usd: number, decimals = 0): string {
        return showARS ? `ARS ${fmt(usd * tc, decimals)}` : `USD ${fmt(usd, decimals)}`
    }

    const costoNum = rubro.costo_total ?? rubro.monto_original ?? 0
    const costoUSD = toUSD(costoNum, rubro.moneda, rubro.tipo_cambio_propio)
    const pagos = rubro.pagos_proveedor
    const pagosRealizados = pagos.filter(p => p.realizado).length
    const pagosPendientes = pagos.length - pagosRealizados

    const realizadosUSD = pagos.filter(p => p.realizado).reduce((s, p) => s + toUSD(p.monto, p.moneda, p.tipo_cambio_snapshot), 0)
    const todosUSD = pagos.reduce((s, p) => s + toUSD(p.monto, p.moneda, p.tipo_cambio_snapshot), 0)
    const saldoAPagarUSD = costoUSD - realizadosUSD
    const proyectadoUSD = costoUSD - todosUSD
    const estaSaldado = saldoAPagarUSD <= 0 && pagosPendientes === 0

    return (
        <div style={{ border: '1px solid', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-white)', overflow: 'hidden', transition: 'border-color 0.2s', borderColor: isExpanded ? 'var(--color-gold)' : 'var(--color-border)' }}>
            {/* Collapsed row */}
            <button
                onClick={onToggle}
                style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', padding: '0.75rem 0.85rem', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
            >
                {/* Left: color bar + nombre + proveedor */}
                <span style={{ width: 3, alignSelf: 'stretch', borderRadius: '99px', backgroundColor: rubroColor, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.1rem', textAlign: 'left' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {rubro.nombre}
                    </span>
                    {rubro.proveedor && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {rubro.proveedor}
                        </span>
                    )}
                </div>
                {/* Right: estado | costo | saldo | pagos | chevron */}
                <span style={{ fontSize: '0.67rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0.15rem 0.55rem', borderRadius: '20px', whiteSpace: 'nowrap', flexShrink: 0, ...ESTADO_STYLES[rubro.estado] }}>
                    {ESTADO_LABELS[rubro.estado] ?? rubro.estado}
                </span>
                {costoUSD > 0 && (
                    <span style={{ fontSize: '0.82rem', fontWeight: 500, whiteSpace: 'nowrap' }}>
                        {fmtAmt(costoUSD)}
                    </span>
                )}
                {costoUSD > 0 && (
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, whiteSpace: 'nowrap', color: saldoAPagarUSD <= 0 ? '#2E7D32' : '#D97706' }}>
                        {estaSaldado ? '✓ Saldado' : `Saldo: ${fmtAmt(Math.max(0, saldoAPagarUSD))}`}
                    </span>
                )}
                {pagos.length > 0 ? (
                    <span style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                        <span style={{ color: '#2E7D32', fontWeight: 500 }}>{pagosRealizados} ✓</span>
                        {pagosPendientes > 0 && <span style={{ color: 'var(--color-text-muted)' }}> · {pagosPendientes} pend.</span>}
                    </span>
                ) : (
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Sin pagos</span>
                )}
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0, color: 'var(--color-text-muted)' }}>
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </button>

            {/* Expanded detail */}
            {isExpanded && (
                <div style={{ padding: '1rem 1.1rem', backgroundColor: 'var(--color-cream)', borderTop: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>

                    {/* Info grid: proveedor + costo (descripción se muestra después de pagos) */}
                    {(rubro.proveedor || costoNum > 0) && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.65rem' }}>
                            {rubro.proveedor && (
                                <div>
                                    <p style={st.fieldLabel}>Proveedor</p>
                                    <p style={st.fieldValue}>{rubro.proveedor}</p>
                                </div>
                            )}
                            {costoUSD > 0 && (
                                <div>
                                    <p style={st.fieldLabel}>Costo total del servicio</p>
                                    <p style={st.fieldValue}>
                                        {fmtAmt(costoUSD)}
                                        {rubro.moneda !== (showARS ? 'ARS' : 'USD') && (
                                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginLeft: '0.4rem' }}>
                                                ({fmt(costoNum)} {rubro.moneda})
                                            </span>
                                        )}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Pagos */}
                    {pagos.length > 0 && (
                        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem' }}>
                            <p style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-muted)', margin: '0 0 0.6rem' }}>
                                Pagos al proveedor
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                {pagos.map(pago => {
                                    const pagoDate = new Date(pago.fecha + 'T00:00:00')
                                    const dateStr = pagoDate.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
                                    const badgeStyle: React.CSSProperties = pago.realizado
                                        ? { backgroundColor: 'rgba(46,125,50,0.1)', color: '#2E7D32' }
                                        : { backgroundColor: 'rgba(120,120,120,0.08)', color: '#888' }
                                    return (
                                        <div
                                            key={pago.id}
                                            className="pago-row-cliente"
                                            style={{
                                                padding: '0.5rem 0.75rem',
                                                borderRadius: 'var(--radius-sm)',
                                                backgroundColor: pago.realizado ? 'rgba(46,125,50,0.05)' : 'var(--color-white)',
                                                border: '1px solid',
                                                borderColor: pago.realizado ? 'rgba(46,125,50,0.15)' : 'var(--color-border)',
                                            }}
                                        >
                                            {/* Monto */}
                                            <span className="pago-monto" style={{ fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                                {fmtAmt(toUSD(pago.monto, pago.moneda, pago.tipo_cambio_snapshot))}
                                            </span>
                                            {/* Secondary info: fecha + descripción + TC */}
                                            <span className="pago-details" style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                                                <span style={{ whiteSpace: 'nowrap' }}>{dateStr}</span>
                                                {pago.descripcion && (
                                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {pago.descripcion}
                                                    </span>
                                                )}
                                                {pago.realizado && pago.tipo_cambio_snapshot && (
                                                    <span style={{ fontStyle: 'italic', whiteSpace: 'nowrap' }}>
                                                        TC {fmt(pago.tipo_cambio_snapshot)}
                                                    </span>
                                                )}
                                            </span>
                                            {/* Badge */}
                                            <span className="pago-badge" style={{ fontSize: '0.72rem', fontWeight: 600, padding: '0.15rem 0.55rem', borderRadius: '20px', whiteSpace: 'nowrap', alignSelf: 'center', ...badgeStyle }}>
                                                {pago.realizado ? '✓ Realizado' : 'Pendiente'}
                                            </span>
                                        </div>
                                    )
                                })}
                            </div>

                            {/* Balance summary */}
                            {costoUSD > 0 && (
                                <div style={{ marginTop: '0.6rem', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-white)', border: '1px solid var(--color-border)', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                                        Total pagado: <strong style={{ color: 'var(--color-text)' }}>{fmtAmt(realizadosUSD)}</strong>
                                    </span>
                                    <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                                        Saldo a pagar:{' '}
                                        <strong style={{ color: saldoAPagarUSD <= 0 ? '#2E7D32' : '#D97706' }}>
                                            {fmtAmt(Math.max(0, saldoAPagarUSD))}
                                        </strong>
                                        {estaSaldado && <span style={{ fontSize: '0.72rem', color: '#2E7D32', marginLeft: '0.35rem' }}>✓ Saldado</span>}
                                    </span>
                                    {Math.abs(proyectadoUSD) > 0.5 && (
                                        <span style={{ fontSize: '0.78rem', fontStyle: 'italic' }}>
                                            Saldo proyectado:{' '}
                                            <strong style={{ color: proyectadoUSD < 0 ? '#C62828' : proyectadoUSD === 0 ? '#2E7D32' : 'var(--color-text-muted)' }}>
                                                {proyectadoUSD < 0 ? `-${fmtAmt(Math.abs(proyectadoUSD))}` : fmtAmt(proyectadoUSD)}
                                            </strong>
                                            {proyectadoUSD <= 0 && ' ✓'}
                                        </span>
                                    )}
                                </div>
                            )}
                            {proyectadoUSD < -0.5 && (
                                <div style={{ padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(198,40,40,0.07)', border: '1px solid rgba(198,40,40,0.2)', fontSize: '0.78rem', color: '#C62828', fontWeight: 500 }}>
                                    ⚠ Los pagos proyectados superan el costo total del rubro
                                </div>
                            )}
                        </div>
                    )}

                    {/* Descripción del servicio — al final */}
                    {rubro.descripcion_servicio && (
                        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem' }}>
                            <p style={st.fieldLabel}>Descripción del servicio</p>
                            <p style={{ ...st.fieldValue, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{rubro.descripcion_servicio}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const st: Record<string, React.CSSProperties> = {
    fieldLabel: { fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)', margin: '0 0 0.2rem' },
    fieldValue: { fontSize: '0.88rem', color: 'var(--color-text)', margin: 0, fontWeight: 500 },
}

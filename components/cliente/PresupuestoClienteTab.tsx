'use client'

import { useState, useEffect } from 'react'
import { agruparRubros, type GrupoRubro } from '@/lib/presupuestoMetrics'

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
    tipo?: 'cuota' | 'sena' | 'deposito_garantia'
    devuelto?: boolean
    fecha_devolucion?: string | null
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

export function PresupuestoClienteTab({ rubros, presupuestoUsd, tipoCambioInicial }: Props) {
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

    const sortedRubros = [...rubros].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
    const grupos = agruparRubros(sortedRubros)

    // Budget calculations
    const asignadoUSD = rubros.reduce((sum, r) => {
        const base = r.costo_total ?? r.monto_original
        if (!base) return sum
        return sum + toUSD(base, r.moneda, r.tipo_cambio_propio)
    }, 0)

    const pagadoUSD = rubros.reduce((sum, r) =>
        sum + r.pagos_proveedor
            .filter(p => p.realizado)
            .reduce((s, p) => s + toUSD(p.monto, p.moneda, p.tipo_cambio_snapshot), 0)
    , 0)

    const aPagarFlowUSD = Math.max(0, asignadoUSD - pagadoUSD)
    const totalUSD = presupuestoUsd ?? 0
    const pct = totalUSD > 0 ? Math.min(100, Math.round((asignadoUSD / totalUSD) * 100)) : 0

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* ── Resumen del evento (estética Progreso) ─────────────────── */}
            <div className="card" style={{ padding: '1.75rem 2rem 1.5rem' }}>
                <div style={{ paddingBottom: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.7rem', fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-gold-dark)' }}>
                                Presupuesto
                            </div>
                            <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: '1.375rem', fontWeight: 600, margin: '0.25rem 0 0.4rem', color: 'var(--color-text)', letterSpacing: '-0.015em', lineHeight: 1.2 }}>
                                Resumen del evento
                            </h2>
                            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.55, display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: tcLoading ? '#D1D5DB' : '#22C55E', flexShrink: 0 }} />
                                TC blue: <strong style={{ color: 'var(--color-text)' }}>{tcLoading ? 'obteniendo…' : `$ ${fmt(tc)} ARS/USD`}</strong>
                                {' · '}{rubros.length} rubro{rubros.length === 1 ? '' : 's'}
                            </p>
                        </div>
                        <div style={{ display: 'flex', borderRadius: 99, border: '1px solid var(--color-border)', overflow: 'hidden' }}>
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
                                    }}
                                >{cur}</button>
                            ))}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.65rem' }} className="kpi-grid-presupuesto">
                    <KPI label="Total" usdValue={totalUSD} tc={tc} showARS={showARS} />
                    <KPI label="Asignado" usdValue={asignadoUSD} tc={tc} showARS={showARS} variant="gold" secondary={`${pct}% del total`} />
                    <KPI label="Pagado" usdValue={pagadoUSD} tc={tc} showARS={showARS} variant="green" />
                    <KPI label="A pagar" usdValue={aPagarFlowUSD} tc={tc} showARS={showARS} variant="warn" />
                </div>

                {totalUSD > 0 && (
                    <>
                        <div style={{ marginTop: '1.25rem', height: 8, background: 'var(--color-cream-dark)', borderRadius: 99, overflow: 'hidden' }}>
                            <div style={{
                                height: '100%', borderRadius: 99, transition: 'width 0.5s ease',
                                width: `${pct}%`,
                                background: asignadoUSD > totalUSD ? 'var(--color-error)' : 'linear-gradient(90deg, var(--color-olive), var(--color-gold))',
                            }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.45rem', fontFamily: 'var(--font-mono, monospace)' }}>
                            <span>USD 0</span>
                            <span>{showARS ? `ARS ${fmt(asignadoUSD * tc)}` : `USD ${fmt(asignadoUSD)}`} asignado</span>
                            <span>{showARS ? `ARS ${fmt(totalUSD * tc)}` : `USD ${fmt(totalUSD)}`} total</span>
                        </div>
                    </>
                )}
            </div>

            {/* ── Rubros agrupados ───────────────────────────────────────── */}
            {rubros.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                    No hay rubros definidos para este evento.
                </div>
            ) : (
                <>
                    {(['pendiente', 'señado', 'cerrado'] as const).map(g => {
                        const rubrosGrupo = grupos[g]
                        if (rubrosGrupo.length === 0) return null
                        const titulos: Record<GrupoRubro, string> = {
                            pendiente: 'Pendiente', señado: 'Señado', cerrado: 'Cerrado',
                        }
                        const hints: Record<GrupoRubro, string> = {
                            pendiente: 'sin compromiso firme',
                            señado: 'con compromiso firme',
                            cerrado: 'saldado',
                        }
                        return (
                            <div key={g}>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.55rem', padding: '0.5rem 0.25rem 0.6rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)' }}>
                                    {titulos[g]}
                                    <span style={{ color: 'var(--color-text-faint)', fontWeight: 500, fontFamily: 'var(--font-mono, monospace)' }}>
                                        · {rubrosGrupo.length} rubro{rubrosGrupo.length === 1 ? '' : 's'} {hints[g]}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {rubrosGrupo.map(rubro => (
                                        <RubroReadCard
                                            key={rubro.id}
                                            rubro={rubro}
                                            tc={tc}
                                            showARS={showARS}
                                            isExpanded={expandedId === rubro.id}
                                            onToggle={() => setExpandedId(expandedId === rubro.id ? null : rubro.id)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                </>
            )}
        </div>
    )
}

// ─── KPI card ────────────────────────────────────────────────────────────────

function KPI({ label, usdValue, tc, showARS, secondary, variant }: {
    label: string; usdValue: number; tc: number; showARS: boolean; secondary?: string
    variant?: 'gold' | 'green' | 'warn'
}) {
    const value = showARS ? `ARS ${fmt(usdValue * tc)}` : `USD ${fmt(usdValue)}`
    const valueColor =
        variant === 'gold' ? 'var(--color-gold-dark)' :
        variant === 'green' ? '#2E7D32' :
        variant === 'warn' ? '#D97706' :
        'var(--color-text)'
    return (
        <div style={{
            padding: '0.95rem 1rem',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-cream)',
            border: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.18rem',
        }}>
            <span style={{ fontSize: '0.66rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)' }}>
                {label}
            </span>
            <span style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', fontWeight: 700, lineHeight: 1.15, color: valueColor }}>
                {value}
            </span>
            {secondary && <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{secondary}</span>}
        </div>
    )
}


// ─── RubroReadCard ────────────────────────────────────────────────────────────

function RubroReadCard({ rubro, tc, showARS, isExpanded, onToggle }: {
    rubro: RubroCliente
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
    const allPagos = rubro.pagos_proveedor
    const pagos = allPagos.filter(p => p.tipo !== 'deposito_garantia')
    const deposito = allPagos.find(p => p.tipo === 'deposito_garantia') ?? null
    const pagosRealizados = pagos.filter(p => p.realizado).length
    const pagosPendientes = pagos.length - pagosRealizados

    const realizadosUSD = pagos.filter(p => p.realizado).reduce((s, p) => s + toUSD(p.monto, p.moneda, p.tipo_cambio_snapshot), 0)
    const todosUSD = pagos.reduce((s, p) => s + toUSD(p.monto, p.moneda, p.tipo_cambio_snapshot), 0)
    const saldoAPagarUSD = costoUSD - realizadosUSD
    const proyectadoUSD = costoUSD - todosUSD
    const estaSaldado = saldoAPagarUSD <= 0 && pagosPendientes === 0

    return (
        <div style={{
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--color-white)',
            overflow: 'hidden',
            transition: 'border-color 0.2s',
            border: '1px solid',
            borderColor: isExpanded ? 'var(--color-gold)' : '#E5E7EB',
        }}>
            {/* Collapsed row */}
            <button
                onClick={onToggle}
                style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', width: '100%', padding: '0.8rem 0.85rem', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
            >
                {/* Left column: nombre · proveedor · costo */}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-text)', lineHeight: 1.3 }}>
                        {rubro.nombre}
                    </span>
                    {rubro.proveedor && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', lineHeight: 1.3 }}>
                            {rubro.proveedor}
                        </span>
                    )}
                    {costoUSD > 0 && (
                        <span style={{ fontSize: '0.75rem', color: '#374151', fontWeight: 500, lineHeight: 1.3 }}>
                            {fmtAmt(costoUSD)}
                        </span>
                    )}
                </div>

                {/* Right column: badge · saldo · pagos */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.22rem', flexShrink: 0 }}>
                    <span style={{ fontSize: '0.67rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0.15rem 0.55rem', borderRadius: '20px', whiteSpace: 'nowrap', ...ESTADO_STYLES[rubro.estado] }}>
                        {ESTADO_LABELS[rubro.estado] ?? rubro.estado}
                    </span>
                    {costoUSD > 0 && (
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap', color: saldoAPagarUSD <= 0 ? '#2E7D32' : '#D97706' }}>
                            {estaSaldado ? '✓ Saldado' : `Saldo: ${fmtAmt(Math.max(0, saldoAPagarUSD))}`}
                        </span>
                    )}
                    {pagos.length > 0 ? (
                        <span style={{ fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
                            <span style={{ color: '#2E7D32', fontWeight: 500 }}>{pagosRealizados} ✓</span>
                            {pagosPendientes > 0 && <span style={{ color: 'var(--color-text-muted)' }}> · {pagosPendientes} pend.</span>}
                        </span>
                    ) : (
                        <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Sin pagos</span>
                    )}
                </div>

                {/* Chevron */}
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0, color: 'var(--color-text-muted)', alignSelf: 'center' }}>
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

                    {/* Depósito en garantía (si existe) */}
                    {deposito && (
                        <div style={{
                            background: 'rgba(46,125,50,0.04)',
                            border: '1px dashed rgba(46,125,50,0.35)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '0.7rem 0.9rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.65rem',
                            flexWrap: 'wrap',
                        }}>
                            <div style={{
                                flexShrink: 0, width: 28, height: 28, borderRadius: '50%',
                                background: 'rgba(46,125,50,0.15)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#2E7D32', fontSize: '0.95rem',
                            }}>🔒</div>
                            <div style={{ fontSize: '0.82rem', color: 'var(--color-text)', flex: 1, lineHeight: 1.45, minWidth: 0 }}>
                                Depósito en garantía: <strong style={{ color: '#2E7D32' }}>{fmtAmt(toUSD(deposito.monto, deposito.moneda, deposito.tipo_cambio_snapshot))}</strong>
                                <small style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', display: 'block', marginTop: '0.15rem' }}>
                                    {deposito.devuelto
                                        ? `✓ Devuelto el ${deposito.fecha_devolucion ?? ''}`
                                        : deposito.realizado
                                            ? 'Pagado · pendiente devolución al finalizar el evento'
                                            : 'Aún sin pagar'}
                                </small>
                            </div>
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

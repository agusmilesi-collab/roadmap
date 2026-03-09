'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import dynamic from 'next/dynamic'
import type { Rubro, PagoProveedor } from './EventoDetailClient'
import {
    createRubro, updateRubro, deleteRubro,
    createPago, updatePago, deletePago,
} from '@/app/(admin)/eventos/[id]/actions'
import type { CashflowBarChartProps } from './CashflowBarChart'

const CashflowBarChart = dynamic<CashflowBarChartProps>(
    () => import('./CashflowBarChart').then(m => ({ default: m.CashflowBarChart })),
    {
        ssr: false,
        loading: () => (
            <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                Cargando gráfico…
            </div>
        ),
    }
)

// ─── Constants ────────────────────────────────────────────────────────────────

const ESTADO_OPTIONS = [
    { value: 'pendiente', label: 'Pendiente' },
    { value: 'señado', label: 'Señado' },
    { value: 'completado', label: 'Completado' },
]
const ESTADO_STYLES: Record<string, React.CSSProperties> = {
    pendiente: { backgroundColor: 'rgba(120,120,120,0.1)', color: '#888' },
    en_proceso: { backgroundColor: 'rgba(201,168,76,0.15)', color: 'var(--color-gold-dark)' },
    decidido: { backgroundColor: 'rgba(107,124,92,0.15)', color: 'var(--color-olive)' },
    señado: { backgroundColor: 'rgba(138,109,174,0.15)', color: '#7B5EA7' },
    completado: { backgroundColor: 'rgba(40,167,69,0.12)', color: '#2E7D32' },
}

function fmt(n: number, decimals = 0) {
    return n.toLocaleString('es-AR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

async function fetchDolarBlue(): Promise<number | null> {
    try {
        const res = await fetch('https://dolarapi.com/v1/dolares/blue', { cache: 'no-store' })
        const data = await res.json()
        return typeof data.venta === 'number' ? data.venta : null
    } catch {
        return null
    }
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
    rubros: Rubro[]
    eventoId: string
    presupuestoUsd: number | null
    tipoCambioInicial: number | null
    fechaEvento: string
}

export function PresupuestoTab({ rubros, eventoId, presupuestoUsd, tipoCambioInicial, fechaEvento }: Props) {
    const [tcBlue, setTcBlue] = useState<number>(tipoCambioInicial ?? 0)
    const [tcLoading, setTcLoading] = useState(true)
    const [showARS, setShowARS] = useState(false)
    const [expandedRubroId, setExpandedRubroId] = useState<string | null>(null)
    const [showAddRubro, setShowAddRubro] = useState(false)

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

    // ── Budget calculations ──────────────────────────────────────────────────
    const comprometidoUSD = rubros.reduce((sum, r) => {
        const base = r.costo_total ?? r.monto_original
        if (!base) return sum
        return sum + toUSD(base, r.moneda, r.tipo_cambio_propio)
    }, 0)

    const totalUSD = presupuestoUsd ?? 0
    const disponibleUSD = totalUSD - comprometidoUSD
    const pctComprometido = totalUSD > 0 ? Math.min(100, Math.round((comprometidoUSD / totalUSD) * 100)) : 0

    const hasPagos = rubros.some(r => (r.pagos_proveedor ?? []).length > 0)

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* ── BLOQUE 1: Resumen financiero ─────────────────────────────── */}
            <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Header row */}
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
                                    background: (cur === 'ARS') === showARS ? 'var(--color-gold)' : 'transparent',
                                    color: (cur === 'ARS') === showARS ? 'white' : 'var(--color-text-muted)',
                                    transition: 'background 0.15s, color 0.15s',
                                }}
                            >{cur}</button>
                        ))}
                    </div>
                </div>

                {/* Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
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
                        sub={`${pctComprometido}% del presupuesto`}
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

                {/* Budget bar */}
                {totalUSD > 0 && (
                    <div style={{ height: '6px', backgroundColor: 'var(--color-cream-dark)', borderRadius: '99px', overflow: 'hidden' }}>
                        <div style={{
                            height: '100%', borderRadius: '99px', transition: 'width 0.3s ease',
                            width: `${pctComprometido}%`,
                            backgroundColor: comprometidoUSD > totalUSD ? 'var(--color-error)' : 'var(--color-gold)',
                        }} />
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
                        {/* Rubro legend */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
                            {rubros.filter(r => (r.pagos_proveedor ?? []).length > 0).map((r, i) => {
                                const globalIdx = rubros.indexOf(r)
                                const color = RUBRO_COLORS[globalIdx % RUBRO_COLORS.length]
                                return (
                                    <span key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                                        <span style={{ width: 8, height: 8, borderRadius: '2px', backgroundColor: color, flexShrink: 0 }} />
                                        {r.nombre}
                                    </span>
                                )
                            })}
                        </div>
                    </div>
                    <CashflowBarChart
                        rubros={rubros}
                        fechaEvento={fechaEvento}
                        tc={tc}
                        showARS={showARS}
                    />
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

            {/* ── Rubros ─────────────────────────────────────────────────────── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {rubros.length === 0 && (
                    <div className="card" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                        Sin rubros aún. Agregá el primero abajo.
                    </div>
                )}

                {rubros.map((rubro, idx) => (
                    <RubroCard
                        key={rubro.id}
                        rubro={rubro}
                        rubroColor={RUBRO_COLORS[idx % RUBRO_COLORS.length]}
                        eventoId={eventoId}
                        tipoCambio={tc}
                        isExpanded={expandedRubroId === rubro.id}
                        onToggle={() => setExpandedRubroId(expandedRubroId === rubro.id ? null : rubro.id)}
                    />
                ))}
            </div>

            {/* ── Add Rubro ──────────────────────────────────────────────────── */}
            {showAddRubro ? (
                <AddRubroForm eventoId={eventoId} onDone={() => setShowAddRubro(false)} />
            ) : (
                <button className="btn-ghost" style={st.addBtn} onClick={() => setShowAddRubro(true)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    Agregar rubro
                </button>
            )}
        </div>
    )
}

// ─── RUBRO_COLORS (re-exported for chart) ────────────────────────────────────

const RUBRO_COLORS = [
    '#7C8B70', '#C9A84C', '#6B7F9E', '#C17B5C', '#8B7C9E',
    '#5C8B7C', '#9E7C6B', '#6B8B5C', '#9E6B7C', '#5C6B8B',
]

// ─── FinancialCard ────────────────────────────────────────────────────────────

function FinancialCard({ label, usdValue, arsValue, showARS, color, sub }: {
    label: string
    usdValue: number
    arsValue: number
    showARS: boolean
    color: string
    sub?: string
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

// ─── RubroCard ────────────────────────────────────────────────────────────────

function RubroCard({ rubro, rubroColor, eventoId, tipoCambio, isExpanded, onToggle }: {
    rubro: Rubro; rubroColor: string; eventoId: string; tipoCambio: number; isExpanded: boolean; onToggle: () => void
}) {
    const [isPending, startTransition] = useTransition()
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [showAddPago, setShowAddPago] = useState(false)

    // Rubro form state
    const [nombre, setNombre] = useState(rubro.nombre)
    const [estado, setEstado] = useState(rubro.estado)
    const [proveedor, setProveedor] = useState(rubro.proveedor ?? '')
    const [descripcionServicio, setDescripcionServicio] = useState(rubro.descripcion_servicio ?? '')
    const [costoTotal, setCostoTotal] = useState(String(rubro.costo_total ?? rubro.monto_original ?? ''))
    const [moneda, setMoneda] = useState(rubro.moneda)
    const [tcPropio, setTcPropio] = useState(String(rubro.tipo_cambio_propio ?? ''))
    const [senaPct, setSenaPct] = useState(String(rubro.sena_pct ?? ''))
    const [fechaDecision, setFechaDecision] = useState(rubro.fecha_decision ?? '')

    const tcEfectivo = (parseFloat(tcPropio) > 0) ? parseFloat(tcPropio) : tipoCambio
    const costoNum = parseFloat(costoTotal) || 0
    const costoUSD = moneda === 'USD' ? costoNum : costoNum / tcEfectivo

    const pagos = rubro.pagos_proveedor ?? []
    const pagosRealizados = pagos.filter(p => p.realizado).length
    const pagosPendientes = pagos.length - pagosRealizados

    // Auto-create seña pago on first expansion
    const señaCheckedRef = useRef(false)
    useEffect(() => {
        if (!isExpanded || señaCheckedRef.current) return
        señaCheckedRef.current = true
        const senaPctNum = parseFloat(senaPct)
        const costoNum_ = parseFloat(costoTotal) || 0
        if (!senaPctNum || !costoNum_) return
        const yaExiste = pagos.some(p => p.descripcion?.toLowerCase() === 'seña')
        if (yaExiste) return
        startTransition(async () => {
            await createPago(rubro.id, eventoId, {
                monto: parseFloat((costoNum_ * senaPctNum / 100).toFixed(2)),
                moneda: moneda as 'USD' | 'ARS',
                fecha: fechaDecision || new Date().toISOString().slice(0, 10),
                descripcion: 'Seña',
            })
        })
    }, [isExpanded]) // eslint-disable-line react-hooks/exhaustive-deps

    // Real-time pago montos for balance calculation
    const [pagosMontos, setPagosMontos] = useState<Map<string, { monto: number; moneda: string }>>(
        () => new Map(pagos.map(p => [p.id, { monto: p.monto, moneda: p.moneda }]))
    )
    function handlePagoMontoChange(id: string, monto: number, pagoMoneda: string) {
        setPagosMontos(prev => new Map(prev).set(id, { monto, moneda: pagoMoneda }))
    }
    function pagoToUSDLocal(monto: number, moneda: string) {
        return moneda === 'USD' ? monto : monto / (tcEfectivo > 0 ? tcEfectivo : 1)
    }
    // Saldo a pagar = costo - suma de REALIZADOS (dinero real pendiente)
    const realizadosUSD = pagos
        .filter(p => p.realizado)
        .reduce((sum, p) => {
            const state = pagosMontos.get(p.id)
            return sum + pagoToUSDLocal(state?.monto ?? p.monto, state?.moneda ?? p.moneda)
        }, 0)
    // Proyectado = costo - suma de TODOS los pagos (cobertura)
    const todosUSD = Array.from(pagosMontos.values()).reduce((sum, p) => sum + pagoToUSDLocal(p.monto, p.moneda), 0)
    const saldoAPagarUSD = costoUSD - realizadosUSD
    const proyectadoUSD = costoUSD - todosUSD
    const estaSaldado = saldoAPagarUSD <= 0 && pagosPendientes === 0

    function handleSave() {
        startTransition(async () => {
            await updateRubro(rubro.id, eventoId, {
                nombre,
                estado: estado as 'pendiente' | 'señado' | 'completado',
                proveedor: proveedor || null,
                costo_total: parseFloat(costoTotal) || null,
                monto_original: parseFloat(costoTotal) || null,
                moneda: moneda as 'USD' | 'ARS',
                tipo_cambio_propio: parseFloat(tcPropio) > 0 ? parseFloat(tcPropio) : null,
                sena_pct: parseFloat(senaPct) || null,
                fecha_decision: fechaDecision || null,
                descripcion_servicio: descripcionServicio || null,
            })
            onToggle()
        })
    }

    function handleDelete() {
        startTransition(async () => { await deleteRubro(rubro.id, eventoId) })
    }

    return (
        <div style={{ ...st.rubroCard, borderColor: isExpanded ? 'var(--color-gold)' : 'var(--color-border)' }}>
            {/* ── Summary row ──────────────────────────────────────────────── */}
            <button onClick={onToggle} style={st.rubroRowBtn}>
                {/* Color bar */}
                <span style={{ width: 3, alignSelf: 'stretch', borderRadius: '99px', backgroundColor: rubroColor, flexShrink: 0 }} />

                {/* 3-row content */}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.28rem', textAlign: 'left' }}>
                    {/* Row 1: nombre · costo */}
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '0.75rem' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--color-text)' }}>
                            {rubro.nombre}
                        </span>
                        {costoNum > 0 && (
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0, color: '#2563EB' }}>
                                {moneda} {fmt(costoNum)}
                            </span>
                        )}
                    </div>
                    {/* Row 2: proveedor · badge */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                            {proveedor || <span style={{ fontStyle: 'italic' }}>Sin proveedor</span>}
                        </span>
                        <span style={{ ...st.estadoBadge, ...ESTADO_STYLES[estado], flexShrink: 0 }}>
                            {ESTADO_OPTIONS.find(o => o.value === estado)?.label}
                        </span>
                    </div>
                    {/* Row 3: saldo · resumen pagos */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                        {costoUSD > 0 ? (
                            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: saldoAPagarUSD <= 0 ? '#2E7D32' : '#D97706' }}>
                                {estaSaldado ? '✓ Saldado' : `Saldo: USD ${fmt(Math.max(0, saldoAPagarUSD), 0)}`}
                            </span>
                        ) : <span />}
                        {pagos.length > 0 ? (
                            <span style={{ fontSize: '0.75rem', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                <span style={{ color: '#2E7D32', fontWeight: 500 }}>{pagosRealizados} ✓</span>
                                {pagosPendientes > 0 && <span style={{ color: 'var(--color-text-muted)' }}> · {pagosPendientes} pend.</span>}
                            </span>
                        ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', flexShrink: 0 }}>Sin pagos</span>
                        )}
                    </div>
                </div>

                {/* Chevron */}
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0, color: 'var(--color-text-muted)', alignSelf: 'center' }}>
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </button>

            {/* ── Expanded ─────────────────────────────────────────────────── */}
            {isExpanded && (
                <div style={st.rubroDetail}>

                    <p style={st.sectionTitle}>Datos del rubro</p>
                    <div style={st.rubroGrid}>
                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                            <label className="form-label">Nombre del rubro</label>
                            <input value={nombre} onChange={e => setNombre(e.target.value)} className="form-input" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Proveedor</label>
                            <input value={proveedor} onChange={e => setProveedor(e.target.value)} className="form-input" placeholder="Nombre del proveedor" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Estado</label>
                            <select value={estado} onChange={e => setEstado(e.target.value)} className="form-input">
                                {ESTADO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>
                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                            <label className="form-label">Descripción del servicio contratado</label>
                            <textarea value={descripcionServicio} onChange={e => setDescripcionServicio(e.target.value)} className="form-input" rows={2} style={{ resize: 'vertical', fontFamily: 'var(--font-sans)', fontSize: '0.88rem' }} placeholder="Detalle del servicio, condiciones, etc." />
                        </div>
                    </div>

                    <p style={st.sectionTitle}>Costo y finanzas</p>
                    <div style={st.rubroGrid}>
                        <div className="form-group">
                            <label className="form-label">Costo total del servicio</label>
                            <input type="number" min="0" step="100" value={costoTotal} onChange={e => setCostoTotal(e.target.value)} className="form-input" placeholder="0" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Moneda</label>
                            <select value={moneda} onChange={e => setMoneda(e.target.value)} className="form-input">
                                <option value="USD">USD</option>
                                <option value="ARS">ARS</option>
                            </select>
                        </div>
                        {moneda === 'ARS' && (
                            <div className="form-group">
                                <label className="form-label" title="Sobreescribe el TC del evento para este rubro">
                                    TC propio (ARS/USD)
                                    <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', marginLeft: '0.3rem' }}>
                                        {tcPropio ? '' : `usando ${fmt(tipoCambio)}`}
                                    </span>
                                </label>
                                <input type="number" min="1" step="10" value={tcPropio} onChange={e => setTcPropio(e.target.value)} className="form-input" placeholder={`${fmt(tipoCambio)} (blue)`} />
                            </div>
                        )}
                        <div className="form-group">
                            <label className="form-label">Seña %</label>
                            <input type="number" min="0" max="100" step="5" value={senaPct} onChange={e => setSenaPct(e.target.value)} className="form-input" placeholder="30" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Fecha aprobación</label>
                            <input type="date" value={fechaDecision} onChange={e => setFechaDecision(e.target.value)} className="form-input" />
                        </div>
                    </div>

                    {costoNum > 0 && (
                        <div style={st.computedRow}>
                            <span style={st.computedItem}>Equivalente USD: <strong>USD {fmt(costoUSD, 0)}</strong></span>
                            {parseFloat(senaPct) > 0 && <span style={st.computedItem}>Monto seña: <strong>USD {fmt(costoUSD * (parseFloat(senaPct) / 100), 0)}</strong> ({senaPct}%)</span>}
                            {moneda === 'ARS' && <span style={st.computedItem}>TC usado: <strong>{fmt(tcEfectivo)} ARS/USD</strong>{rubro.tipo_cambio_propio ? ' (propio)' : ' (blue)'}</span>}
                        </div>
                    )}

                    {/* Pagos */}
                    <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.85rem' }}>
                        <p style={{ ...st.sectionTitle, marginBottom: '0.6rem' }}>Pagos al proveedor</p>
                        {pagos.length === 0 && !showAddPago && (
                            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', fontStyle: 'italic', marginBottom: '0.5rem' }}>Sin pagos registrados.</p>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            {pagos.map(pago => (
                                <PagoRow
                                    key={pago.id}
                                    pago={pago}
                                    eventoId={eventoId}
                                    onMontoChange={handlePagoMontoChange}
                                />
                            ))}
                        </div>

                        {/* Balance summary */}
                        {pagos.length > 0 && costoUSD > 0 && (
                            <div style={{ marginTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                <div style={{ padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-cream)', border: '1px solid var(--color-border)', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                                    Total pagado: <strong style={{ color: 'var(--color-text)' }}>USD {fmt(realizadosUSD, 0)}</strong>
                                </span>
                                <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                                    Saldo a pagar:{' '}
                                    <strong style={{ color: saldoAPagarUSD <= 0 ? '#2E7D32' : '#D97706' }}>
                                        USD {fmt(Math.max(0, saldoAPagarUSD), 0)}
                                    </strong>
                                    {estaSaldado && <span style={{ fontSize: '0.72rem', color: '#2E7D32', marginLeft: '0.35rem' }}>✓ Saldado</span>}
                                </span>
                                {Math.abs(proyectadoUSD) > 0.5 && (
                                    <span style={{ fontSize: '0.78rem', fontStyle: 'italic' }}>
                                        Saldo proyectado:{' '}
                                        <strong style={{ color: proyectadoUSD < 0 ? '#C62828' : proyectadoUSD === 0 ? '#2E7D32' : 'var(--color-text-muted)' }}>
                                            {proyectadoUSD < 0 ? `-USD ${fmt(Math.abs(proyectadoUSD), 0)}` : `USD ${fmt(proyectadoUSD, 0)}`}
                                        </strong>
                                        {proyectadoUSD <= 0 && ' ✓'}
                                    </span>
                                )}
                                </div>
                                {proyectadoUSD < -0.5 && (
                                    <div style={{ padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(198,40,40,0.07)', border: '1px solid rgba(198,40,40,0.2)', fontSize: '0.78rem', color: '#C62828', fontWeight: 500 }}>
                                        ⚠ Los pagos proyectados superan el costo total del rubro
                                    </div>
                                )}
                            </div>
                        )}
                        {showAddPago ? (
                            <AddPagoForm rubroId={rubro.id} eventoId={eventoId} onDone={() => setShowAddPago(false)} />
                        ) : (
                            <button type="button" className="btn-ghost" style={{ marginTop: pagos.length > 0 ? '0.5rem' : '0', fontSize: '0.8rem', padding: '0.35rem 0.75rem', gap: '0.35rem', display: 'flex', alignItems: 'center' }} onClick={() => setShowAddPago(true)}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                                Agregar pago
                            </button>
                        )}
                    </div>

                    {/* Actions */}
                    <div style={st.rubroActions}>
                        {confirmDelete ? (
                            <span style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.8rem', color: 'var(--color-error)' }}>¿Eliminar rubro?</span>
                                <button onClick={handleDelete} disabled={isPending} style={st.confirmYesSmall}>Sí, eliminar</button>
                                <button onClick={() => setConfirmDelete(false)} style={st.confirmNoSmall}>No</button>
                            </span>
                        ) : (
                            <button onClick={() => setConfirmDelete(true)} className="btn-ghost" style={{ fontSize: '0.78rem', color: 'var(--color-error)', borderColor: 'rgba(200,75,75,0.2)', padding: '0.3rem 0.75rem' }}>
                                Eliminar rubro
                            </button>
                        )}
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button onClick={onToggle} className="btn-ghost" style={{ fontSize: '0.8rem', padding: '0.4rem 0.9rem' }}>Cancelar</button>
                            <button onClick={handleSave} disabled={isPending} className="btn-gold" style={{ fontSize: '0.8rem', padding: '0.4rem 1rem' }}>
                                {isPending ? 'Guardando…' : 'Guardar cambios'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// ─── PagoRow ──────────────────────────────────────────────────────────────────

function PagoRow({ pago, eventoId, onMontoChange }: {
    pago: PagoProveedor
    eventoId: string
    onMontoChange?: (id: string, monto: number, moneda: string) => void
}) {
    const [isPending, startTransition] = useTransition()
    const [realizado, setRealizado] = useState(pago.realizado)
    const [tcSnapshot, setTcSnapshot] = useState(pago.tipo_cambio_snapshot)
    const [fetchingTc, setFetchingTc] = useState(false)
    const [monto, setMonto] = useState(String(pago.monto))
    const [moneda, setMoneda] = useState(pago.moneda)
    const [fecha, setFecha] = useState(pago.fecha)
    const [descripcion, setDescripcion] = useState(pago.descripcion ?? '')
    const [isHovered, setIsHovered] = useState(false)
    const [confirmDelete, setConfirmDelete] = useState(false)

    async function handleToggleRealizado() {
        const newVal = !realizado
        setRealizado(newVal)
        let tc: number | null = tcSnapshot
        if (newVal && !tcSnapshot) {
            setFetchingTc(true)
            tc = await fetchDolarBlue()
            setFetchingTc(false)
            setTcSnapshot(tc)
        }
        startTransition(async () => {
            await updatePago(pago.id, eventoId, {
                realizado: newVal,
                ...(newVal && tc !== null ? { tipo_cambio_snapshot: tc } : {}),
            })
        })
    }

    function saveField(data: Parameters<typeof updatePago>[2]) {
        startTransition(async () => { await updatePago(pago.id, eventoId, data) })
    }

    function handleDelete() {
        startTransition(async () => { await deletePago(pago.id, eventoId) })
    }

    return (
        <div
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-sm)', backgroundColor: realizado ? 'rgba(46,125,50,0.04)' : 'var(--color-white)', border: '1px solid', borderColor: realizado ? 'rgba(46,125,50,0.18)' : 'var(--color-border)', transition: 'border-color 0.2s, background-color 0.2s' }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => { setIsHovered(false); setConfirmDelete(false) }}
        >
            <input type="number" min="0" step="100" value={monto} onChange={e => { setMonto(e.target.value); onMontoChange?.(pago.id, parseFloat(e.target.value) || 0, moneda) }} onBlur={() => saveField({ monto: parseFloat(monto) || 0 })} className="form-input" style={{ width: '110px', fontSize: '0.85rem' }} placeholder="0" title="Monto" />
            <select value={moneda} onChange={e => { setMoneda(e.target.value); saveField({ moneda: e.target.value as 'USD' | 'ARS' }); onMontoChange?.(pago.id, parseFloat(monto) || 0, e.target.value) }} className="form-input" style={{ width: '88px', minWidth: '88px', fontSize: '0.85rem' }} title="Moneda">
                <option value="USD">USD</option>
                <option value="ARS">ARS</option>
            </select>
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} onBlur={() => fecha && saveField({ fecha })} className="form-input" style={{ flex: 1, minWidth: '130px', fontSize: '0.85rem' }} title="Fecha del pago" />
            <input value={descripcion} onChange={e => setDescripcion(e.target.value)} onBlur={() => saveField({ descripcion: descripcion || null })} className="form-input" style={{ flex: 2, fontSize: '0.85rem' }} placeholder="Descripción…" title="Descripción" />
            {realizado && tcSnapshot && (
                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', fontStyle: 'italic' }}>TC {fmt(tcSnapshot)}</span>
            )}
            <button type="button" onClick={handleToggleRealizado} disabled={isPending || fetchingTc} title={realizado ? 'Marcar como pendiente' : 'Marcar como realizado (guarda TC blue)'}
                style={{ fontSize: '0.72rem', fontWeight: 600, padding: '0.28rem 0.7rem', borderRadius: '20px', border: '1px solid', cursor: isPending || fetchingTc ? 'wait' : 'pointer', fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap', transition: 'all 0.2s', background: realizado ? 'rgba(46,125,50,0.1)' : 'transparent', color: realizado ? '#2E7D32' : 'var(--color-text-muted)', borderColor: realizado ? 'rgba(46,125,50,0.35)' : 'var(--color-border)', flexShrink: 0 }}>
                {fetchingTc ? 'Obteniendo TC…' : realizado ? '✓ Realizado' : 'Pendiente'}
            </button>
            {confirmDelete ? (
                <span style={{ display: 'flex', gap: '0.3rem', alignItems: 'center', flexShrink: 0 }}>
                    <button onClick={handleDelete} disabled={isPending} style={st.confirmYesSmall}>Eliminar</button>
                    <button onClick={() => setConfirmDelete(false)} style={st.confirmNoSmall}>No</button>
                </span>
            ) : (
                <button type="button" onClick={() => setConfirmDelete(true)} style={{ opacity: isHovered ? 1 : 0, transition: 'opacity 0.15s', background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem', color: 'var(--color-error)', flexShrink: 0, display: 'flex', alignItems: 'center' }} title="Eliminar pago">
                    <TrashIcon />
                </button>
            )}
        </div>
    )
}

// ─── AddPagoForm ──────────────────────────────────────────────────────────────

function AddPagoForm({ rubroId, eventoId, onDone }: { rubroId: string; eventoId: string; onDone: () => void }) {
    const [isPending, startTransition] = useTransition()
    const [monto, setMonto] = useState('')
    const [moneda, setMoneda] = useState<'USD' | 'ARS'>('USD')
    const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
    const [descripcion, setDescripcion] = useState('')
    const inputRef = useRef<HTMLInputElement>(null)

    function handleSubmit() {
        const montoNum = parseFloat(monto)
        if (!montoNum || !fecha) return
        startTransition(async () => {
            await createPago(rubroId, eventoId, { monto: montoNum, moneda, fecha, descripcion: descripcion || null })
            onDone()
        })
    }

    return (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', flexWrap: 'wrap', marginTop: '0.5rem', padding: '0.65rem 0.75rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(201,168,76,0.05)', border: '1px dashed var(--color-gold-light)' }}>
            <div className="form-group" style={{ minWidth: '100px', flex: 1 }}>
                <label className="form-label">Monto</label>
                <input ref={inputRef} autoFocus type="number" min="0" step="100" value={monto} onChange={e => setMonto(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} className="form-input" placeholder="0" />
            </div>
            <div className="form-group">
                <label className="form-label">Moneda</label>
                <select value={moneda} onChange={e => setMoneda(e.target.value as 'USD' | 'ARS')} className="form-input" style={{ width: '75px' }}>
                    <option value="USD">USD</option>
                    <option value="ARS">ARS</option>
                </select>
            </div>
            <div className="form-group" style={{ minWidth: '130px', flex: 1 }}>
                <label className="form-label">Fecha</label>
                <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className="form-input" />
            </div>
            <div className="form-group" style={{ minWidth: '160px', flex: 2 }}>
                <label className="form-label">Descripción <span style={{ fontWeight: 400, color: 'var(--color-text-muted)' }}>(opcional)</span></label>
                <input value={descripcion} onChange={e => setDescripcion(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} className="form-input" placeholder="Ej: Seña, Saldo…" />
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', paddingBottom: '1px' }}>
                <button onClick={handleSubmit} disabled={isPending || !monto || !fecha} className="btn-gold" style={{ fontSize: '0.82rem', padding: '0.48rem 0.9rem' }}>{isPending ? 'Agregando…' : 'Agregar'}</button>
                <button onClick={onDone} className="btn-ghost" style={{ fontSize: '0.82rem', padding: '0.48rem 0.75rem' }}>Cancelar</button>
            </div>
        </div>
    )
}

// ─── AddRubroForm ─────────────────────────────────────────────────────────────

function AddRubroForm({ eventoId, onDone }: { eventoId: string; onDone: () => void }) {
    const [isPending, startTransition] = useTransition()
    const [nombre, setNombre] = useState('')

    function handleSubmit() {
        if (!nombre.trim()) return
        startTransition(async () => { await createRubro(eventoId, nombre.trim()); onDone() })
    }

    return (
        <div className="card" style={{ padding: '1.25rem', border: '1.5px dashed var(--color-gold-light)' }}>
            <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-gold-dark)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>Nuevo rubro</p>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
                <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Nombre del rubro</label>
                    <input autoFocus value={nombre} onChange={e => setNombre(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }} className="form-input" placeholder="DJ · Fotografía · Catering…" />
                </div>
                <button onClick={handleSubmit} disabled={isPending || !nombre.trim()} className="btn-gold" style={{ fontSize: '0.85rem', padding: '0.55rem 1.1rem' }}>{isPending ? 'Creando…' : 'Crear rubro'}</button>
                <button onClick={onDone} className="btn-ghost" style={{ fontSize: '0.85rem', padding: '0.55rem 0.9rem' }}>Cancelar</button>
            </div>
        </div>
    )
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function TrashIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14H6L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4h6v2" />
        </svg>
    )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const st: Record<string, React.CSSProperties> = {
    summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' },
    rubroCard: { border: '1px solid', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-white)', overflow: 'hidden', transition: 'border-color 0.2s' },
    rubroRowBtn: { display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', padding: '0.75rem 0.85rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' },
    estadoBadge: { fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0.15rem 0.55rem', borderRadius: '20px', whiteSpace: 'nowrap' },
    rubroDetail: { padding: '1rem 1.1rem', backgroundColor: 'var(--color-cream)', borderTop: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '0.85rem' },
    rubroGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' },
    sectionTitle: { fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-muted)', margin: 0 },
    computedRow: { display: 'flex', gap: '1.25rem', flexWrap: 'wrap', padding: '0.65rem 0.85rem', backgroundColor: 'rgba(201,168,76,0.06)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(201,168,76,0.2)' },
    computedItem: { fontSize: '0.82rem', color: 'var(--color-text-muted)' },
    rubroActions: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem', borderTop: '1px solid var(--color-border)' },
    addBtn: { fontSize: '0.85rem', padding: '0.65rem', gap: '0.4rem', justifyContent: 'center', borderStyle: 'dashed' },
    confirmYesSmall: { fontSize: '0.72rem', padding: '0.2rem 0.55rem', background: 'var(--color-error)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontFamily: 'var(--font-sans)' },
    confirmNoSmall: { fontSize: '0.72rem', padding: '0.2rem 0.55rem', background: 'transparent', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', borderRadius: '4px', cursor: 'pointer', fontFamily: 'var(--font-sans)' },
}

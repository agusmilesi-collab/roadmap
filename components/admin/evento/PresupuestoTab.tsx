'use client'

import { useState, useTransition, useRef } from 'react'
import type { Rubro, PagoProveedor } from './EventoDetailClient'
import {
    createRubro, updateRubro, deleteRubro, updateTipoCambio,
    createPago, updatePago, deletePago,
} from '@/app/(admin)/eventos/[id]/actions'

// ─── Constants ────────────────────────────────────────────────────────────────

const ESTADO_OPTIONS = [
    { value: 'pendiente', label: 'Pendiente' },
    { value: 'en_proceso', label: 'En proceso' },
    { value: 'decidido', label: 'Decidido' },
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
}

export function PresupuestoTab({ rubros, eventoId, presupuestoUsd, tipoCambioInicial }: Props) {
    const [tipoCambio, setTipoCambio] = useState(tipoCambioInicial ?? 0)
    const [tipoCambioInput, setTipoCambioInput] = useState(String(tipoCambioInicial ?? ''))
    const [expandedRubroId, setExpandedRubroId] = useState<string | null>(null)
    const [showAddRubro, setShowAddRubro] = useState(false)
    const [isSavingTipo, startSavingTipo] = useTransition()

    function handleTipoCambioBlur() {
        const val = parseFloat(tipoCambioInput)
        if (isNaN(val) || val <= 0) return
        setTipoCambio(val)
        startSavingTipo(async () => { await updateTipoCambio(eventoId, val) })
    }

    // ── Budget calculations ──────────────────────────────────────────────────
    const tc = tipoCambio > 0 ? tipoCambio : 1

    function montoUSD(r: Rubro) {
        const base = r.costo_total ?? r.monto_original
        if (!base) return 0
        const tcEf = r.tipo_cambio_propio && r.tipo_cambio_propio > 0 ? r.tipo_cambio_propio : tc
        return r.moneda === 'USD' ? base : base / tcEf
    }

    const comprometido = rubros
        .filter((r) => r.estado !== 'pendiente')
        .reduce((sum, r) => sum + montoUSD(r), 0)

    const totalUSD = presupuestoUsd ?? 0
    const disponible = totalUSD - comprometido
    const pctComprometido = totalUSD > 0 ? Math.min(100, Math.round((comprometido / totalUSD) * 100)) : 0

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* ── Tipo de cambio ─────────────────────────────────────────────── */}
            <div className="card" style={st.tipoCambioCard}>
                <span style={st.tipoCambioLabel}>Tipo de cambio</span>
                <div style={st.tipoCambioRow}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>ARS 1 USD =</span>
                    <input
                        type="number"
                        min="1"
                        step="10"
                        value={tipoCambioInput}
                        onChange={e => setTipoCambioInput(e.target.value)}
                        onBlur={handleTipoCambioBlur}
                        className="form-input"
                        style={{ width: '120px', fontSize: '0.95rem', textAlign: 'right', fontWeight: 600 }}
                    />
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>ARS</span>
                    {isSavingTipo && <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Guardando…</span>}
                </div>
            </div>

            {/* ── Summary cards ──────────────────────────────────────────────── */}
            <div style={st.summaryGrid}>
                <SummaryCard label="Presupuesto total" value={`USD ${fmt(totalUSD)}`} sub={tipoCambio > 0 ? `ARS ${fmt(totalUSD * tc)}` : undefined} color="var(--color-text)" />
                <SummaryCard label="Comprometido" value={`USD ${fmt(comprometido)}`} sub={`${pctComprometido}% del presupuesto`} color={comprometido > totalUSD ? 'var(--color-error)' : 'var(--color-gold-dark)'} />
                <SummaryCard label="Disponible" value={`USD ${fmt(Math.max(0, disponible))}`} sub={disponible < 0 ? '⚠ Presupuesto excedido' : undefined} color={disponible < 0 ? 'var(--color-error)' : 'var(--color-olive)'} />
            </div>

            {/* ── Budget progress ─────────────────────────────────────────────── */}
            {totalUSD > 0 && (
                <div style={st.budgetBar}>
                    <div style={{ ...st.budgetFill, width: `${pctComprometido}%`, backgroundColor: comprometido > totalUSD ? 'var(--color-error)' : 'var(--color-gold)' }} />
                </div>
            )}

            {/* ── Rubros ─────────────────────────────────────────────────────── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {rubros.length === 0 && (
                    <div className="card" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                        Sin rubros aún. Agregá el primero abajo.
                    </div>
                )}

                {rubros.map((rubro) => (
                    <RubroCard
                        key={rubro.id}
                        rubro={rubro}
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

// ─── SummaryCard ──────────────────────────────────────────────────────────────

function SummaryCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
    return (
        <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-muted)' }}>{label}</span>
            <span style={{ fontSize: '1.15rem', fontWeight: 700, color, fontFamily: 'var(--font-serif)' }}>{value}</span>
            {sub && <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{sub}</span>}
        </div>
    )
}

// ─── RubroCard ────────────────────────────────────────────────────────────────

function RubroCard({ rubro, eventoId, tipoCambio, isExpanded, onToggle }: {
    rubro: Rubro; eventoId: string; tipoCambio: number; isExpanded: boolean; onToggle: () => void
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
    const [fechaSena, setFechaSena] = useState(rubro.fecha_sena ?? '')
    const [notas, setNotas] = useState(rubro.notas ?? '')

    const tcEfectivo = (parseFloat(tcPropio) > 0) ? parseFloat(tcPropio) : tipoCambio
    const costoNum = parseFloat(costoTotal) || 0
    const costoUSD = moneda === 'USD' ? costoNum : costoNum / tcEfectivo

    // Pagos summary for collapsed row
    const pagos = rubro.pagos_proveedor ?? []
    const pagosRealizados = pagos.filter(p => p.realizado).length
    const pagosPendientes = pagos.length - pagosRealizados

    function handleSave() {
        startTransition(async () => {
            await updateRubro(rubro.id, eventoId, {
                nombre,
                estado: estado as 'pendiente' | 'en_proceso' | 'decidido' | 'señado' | 'completado',
                proveedor: proveedor || null,
                costo_total: parseFloat(costoTotal) || null,
                monto_original: parseFloat(costoTotal) || null,
                moneda: moneda as 'USD' | 'ARS',
                tipo_cambio_propio: parseFloat(tcPropio) > 0 ? parseFloat(tcPropio) : null,
                sena_pct: parseFloat(senaPct) || null,
                fecha_decision: fechaDecision || null,
                fecha_sena: fechaSena || null,
                notas: notas || null,
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
            {/* ── Summary row (collapsed) ───────────────────────────────────── */}
            <button onClick={onToggle} style={st.rubroRowBtn}>
                <span style={{ flex: 2, fontWeight: 500, fontSize: '0.88rem', textAlign: 'left', color: 'var(--color-text)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {rubro.nombre}
                </span>
                <span style={{ ...st.estadoBadge, ...ESTADO_STYLES[rubro.estado] }}>
                    {ESTADO_OPTIONS.find(o => o.value === rubro.estado)?.label}
                </span>
                <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', minWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {rubro.proveedor || '—'}
                </span>
                <span style={{ fontSize: '0.82rem', textAlign: 'right', fontWeight: 500, whiteSpace: 'nowrap', minWidth: '100px' }}>
                    {costoNum > 0 ? `${fmt(costoNum)} ${moneda}` : '—'}
                </span>
                <span style={{ fontSize: '0.82rem', textAlign: 'right', color: 'var(--color-text-muted)', minWidth: '80px' }}>
                    {costoNum > 0 ? `≈ USD ${fmt(costoUSD, 0)}` : '—'}
                </span>
                {pagos.length > 0 ? (
                    <span style={{ fontSize: '0.75rem', textAlign: 'right', minWidth: '90px', whiteSpace: 'nowrap' }}>
                        <span style={{ color: '#2E7D32', fontWeight: 500 }}>{pagosRealizados} ✓</span>
                        {pagosPendientes > 0 && <span style={{ color: 'var(--color-text-muted)' }}> · {pagosPendientes} pend.</span>}
                    </span>
                ) : (
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', minWidth: '90px', textAlign: 'right' }}>Sin pagos</span>
                )}
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0, color: 'var(--color-text-muted)', marginLeft: '0.25rem' }}>
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </button>

            {/* ── Expanded detail ──────────────────────────────────────────── */}
            {isExpanded && (
                <div style={st.rubroDetail}>

                    {/* Section: Datos del rubro */}
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
                            <textarea
                                value={descripcionServicio}
                                onChange={e => setDescripcionServicio(e.target.value)}
                                className="form-input"
                                rows={2}
                                style={{ resize: 'vertical', fontFamily: 'var(--font-sans)', fontSize: '0.88rem' }}
                                placeholder="Detalle del servicio, condiciones, etc."
                            />
                        </div>
                    </div>

                    {/* Section: Costo y finanzas */}
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
                                <input type="number" min="1" step="10" value={tcPropio} onChange={e => setTcPropio(e.target.value)} className="form-input" placeholder={`${fmt(tipoCambio)} (evento)`} />
                            </div>
                        )}
                        <div className="form-group">
                            <label className="form-label">Seña %</label>
                            <input type="number" min="0" max="100" step="5" value={senaPct} onChange={e => setSenaPct(e.target.value)} className="form-input" placeholder="30" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Fecha decisión</label>
                            <input type="date" value={fechaDecision} onChange={e => setFechaDecision(e.target.value)} className="form-input" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Fecha seña</label>
                            <input type="date" value={fechaSena} onChange={e => setFechaSena(e.target.value)} className="form-input" />
                        </div>
                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                            <label className="form-label">Notas</label>
                            <textarea value={notas} onChange={e => setNotas(e.target.value)} className="form-input" rows={2} style={{ resize: 'vertical', fontFamily: 'var(--font-sans)', fontSize: '0.88rem' }} placeholder="Notas adicionales…" />
                        </div>
                    </div>

                    {/* Computed summary */}
                    {costoNum > 0 && (
                        <div style={st.computedRow}>
                            <span style={st.computedItem}>Equivalente USD: <strong>USD {fmt(costoUSD, 0)}</strong></span>
                            {parseFloat(senaPct) > 0 && <span style={st.computedItem}>Monto seña: <strong>USD {fmt(costoUSD * (parseFloat(senaPct) / 100), 0)}</strong> ({senaPct}%)</span>}
                            {moneda === 'ARS' && <span style={st.computedItem}>TC usado: <strong>{fmt(tcEfectivo)} ARS/USD</strong>{rubro.tipo_cambio_propio ? ' (propio)' : ' (evento)'}</span>}
                        </div>
                    )}

                    {/* Section: Pagos */}
                    <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.85rem' }}>
                        <p style={{ ...st.sectionTitle, marginBottom: '0.6rem' }}>Pagos al proveedor</p>

                        {pagos.length === 0 && !showAddPago && (
                            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', fontStyle: 'italic', marginBottom: '0.5rem' }}>
                                Sin pagos registrados.
                            </p>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            {pagos.map(pago => (
                                <PagoRow key={pago.id} pago={pago} eventoId={eventoId} />
                            ))}
                        </div>

                        {showAddPago ? (
                            <AddPagoForm
                                rubroId={rubro.id}
                                eventoId={eventoId}
                                onDone={() => setShowAddPago(false)}
                            />
                        ) : (
                            <button
                                type="button"
                                className="btn-ghost"
                                style={{ marginTop: pagos.length > 0 ? '0.5rem' : '0', fontSize: '0.8rem', padding: '0.35rem 0.75rem', gap: '0.35rem', display: 'flex', alignItems: 'center' }}
                                onClick={() => setShowAddPago(true)}
                            >
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

function PagoRow({ pago, eventoId }: { pago: PagoProveedor; eventoId: string }) {
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
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.55rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: realizado ? 'rgba(46,125,50,0.04)' : 'var(--color-white)',
                border: '1px solid',
                borderColor: realizado ? 'rgba(46,125,50,0.18)' : 'var(--color-border)',
                transition: 'border-color 0.2s, background-color 0.2s',
                position: 'relative',
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => { setIsHovered(false); setConfirmDelete(false) }}
        >
            {/* Monto */}
            <input
                type="number"
                min="0"
                step="100"
                value={monto}
                onChange={e => setMonto(e.target.value)}
                onBlur={() => saveField({ monto: parseFloat(monto) || 0 })}
                className="form-input"
                style={{ width: '110px', fontSize: '0.85rem' }}
                placeholder="0"
                title="Monto"
            />
            {/* Moneda */}
            <select
                value={moneda}
                onChange={e => { setMoneda(e.target.value); saveField({ moneda: e.target.value as 'USD' | 'ARS' }) }}
                className="form-input"
                style={{ width: '72px', fontSize: '0.85rem' }}
                title="Moneda"
            >
                <option value="USD">USD</option>
                <option value="ARS">ARS</option>
            </select>
            {/* Fecha */}
            <input
                type="date"
                value={fecha}
                onChange={e => setFecha(e.target.value)}
                onBlur={() => fecha && saveField({ fecha })}
                className="form-input"
                style={{ flex: 1, minWidth: '130px', fontSize: '0.85rem' }}
                title="Fecha del pago"
            />
            {/* Descripción */}
            <input
                value={descripcion}
                onChange={e => setDescripcion(e.target.value)}
                onBlur={() => saveField({ descripcion: descripcion || null })}
                className="form-input"
                style={{ flex: 2, fontSize: '0.85rem' }}
                placeholder="Descripción…"
                title="Descripción"
            />
            {/* TC snapshot (when realizado) */}
            {realizado && tcSnapshot && (
                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', fontStyle: 'italic' }}>
                    TC {fmt(tcSnapshot)}
                </span>
            )}
            {/* Realizado toggle */}
            <button
                type="button"
                onClick={handleToggleRealizado}
                disabled={isPending || fetchingTc}
                title={realizado ? 'Marcar como pendiente' : 'Marcar como realizado (guarda tipo de cambio blue)'}
                style={{
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    padding: '0.28rem 0.7rem',
                    borderRadius: '20px',
                    border: '1px solid',
                    cursor: isPending || fetchingTc ? 'wait' : 'pointer',
                    fontFamily: 'var(--font-sans)',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s',
                    background: realizado ? 'rgba(46,125,50,0.1)' : 'transparent',
                    color: realizado ? '#2E7D32' : 'var(--color-text-muted)',
                    borderColor: realizado ? 'rgba(46,125,50,0.35)' : 'var(--color-border)',
                    flexShrink: 0,
                }}
            >
                {fetchingTc ? 'Obteniendo TC…' : realizado ? '✓ Realizado' : 'Pendiente'}
            </button>
            {/* Delete — visible on hover */}
            {confirmDelete ? (
                <span style={{ display: 'flex', gap: '0.3rem', alignItems: 'center', flexShrink: 0 }}>
                    <button onClick={handleDelete} disabled={isPending} style={st.confirmYesSmall}>Eliminar</button>
                    <button onClick={() => setConfirmDelete(false)} style={st.confirmNoSmall}>No</button>
                </span>
            ) : (
                <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    style={{
                        opacity: isHovered ? 1 : 0,
                        transition: 'opacity 0.15s',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '0.2rem',
                        color: 'var(--color-error)',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                    }}
                    title="Eliminar pago"
                >
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
            await createPago(rubroId, eventoId, {
                monto: montoNum,
                moneda,
                fecha,
                descripcion: descripcion || null,
            })
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
                <button onClick={handleSubmit} disabled={isPending || !monto || !fecha} className="btn-gold" style={{ fontSize: '0.82rem', padding: '0.48rem 0.9rem' }}>
                    {isPending ? 'Agregando…' : 'Agregar'}
                </button>
                <button onClick={onDone} className="btn-ghost" style={{ fontSize: '0.82rem', padding: '0.48rem 0.75rem' }}>
                    Cancelar
                </button>
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
        startTransition(async () => {
            await createRubro(eventoId, nombre.trim())
            onDone()
        })
    }

    return (
        <div className="card" style={{ padding: '1.25rem', border: '1.5px dashed var(--color-gold-light)' }}>
            <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-gold-dark)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>Nuevo rubro</p>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
                <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Nombre del rubro</label>
                    <input autoFocus value={nombre} onChange={e => setNombre(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }} className="form-input" placeholder="DJ · Fotografía · Catering…" />
                </div>
                <button onClick={handleSubmit} disabled={isPending || !nombre.trim()} className="btn-gold" style={{ fontSize: '0.85rem', padding: '0.55rem 1.1rem' }}>
                    {isPending ? 'Creando…' : 'Crear rubro'}
                </button>
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
    tipoCambioCard: { padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' },
    tipoCambioLabel: { fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-muted)' },
    tipoCambioRow: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
    summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' },
    budgetBar: { height: '8px', backgroundColor: 'var(--color-cream-dark)', borderRadius: '99px', overflow: 'hidden' },
    budgetFill: { height: '100%', borderRadius: '99px', transition: 'width 0.3s ease' },
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

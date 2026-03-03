'use client'

import { useState, useTransition } from 'react'
import type { Rubro } from './EventoDetailClient'
import {
    createRubro, updateRubro, deleteRubro, updateTipoCambio,
} from '@/app/(admin)/eventos/[id]/actions'

// ─── Constants ────────────────────────────────────────────────────────────────

const ESTADO_OPTIONS = [
    { value: 'pendiente', label: 'Pendiente' },
    { value: 'en_proceso', label: 'En proceso' },
    { value: 'decidido', label: 'Decidido' },
]
const ESTADO_STYLES: Record<string, React.CSSProperties> = {
    pendiente: { backgroundColor: 'rgba(120,120,120,0.1)', color: '#888' },
    en_proceso: { backgroundColor: 'rgba(201,168,76,0.15)', color: 'var(--color-gold-dark)' },
    decidido: { backgroundColor: 'rgba(107,124,92,0.15)', color: 'var(--color-olive)' },
}

function fmt(n: number, decimals = 0) {
    return n.toLocaleString('es-AR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
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
        if (!r.monto_original) return 0
        return r.moneda === 'USD' ? r.monto_original : r.monto_original / tc
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

                {/* Column headers */}
                {rubros.length > 0 && (
                    <div style={st.colHeaders}>
                        <span style={{ flex: 2 }}>Rubro</span>
                        <span>Estado</span>
                        <span>Proveedor</span>
                        <span style={{ textAlign: 'right' }}>Monto</span>
                        <span style={{ textAlign: 'right' }}>Equiv. USD</span>
                        <span style={{ textAlign: 'right' }}>Seña</span>
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

            {/* Add Rubro */}
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

    // Form state
    const [nombre, setNombre] = useState(rubro.nombre)
    const [estado, setEstado] = useState(rubro.estado)
    const [proveedor, setProveedor] = useState(rubro.proveedor ?? '')
    const [monto, setMonto] = useState(String(rubro.monto_original ?? ''))
    const [moneda, setMoneda] = useState(rubro.moneda)
    const [senaPct, setSenaPct] = useState(String(rubro.sena_pct ?? ''))
    const [fechaDecision, setFechaDecision] = useState(rubro.fecha_decision ?? '')
    const [fechaSena, setFechaSena] = useState(rubro.fecha_sena ?? '')
    const [notas, setNotas] = useState(rubro.notas ?? '')

    const montoNum = parseFloat(monto) || 0
    const montoUSD = moneda === 'USD' ? montoNum : montoNum / tipoCambio
    const senaUSD = montoUSD * ((parseFloat(senaPct) || 0) / 100)

    function handleSave() {
        startTransition(async () => {
            await updateRubro(rubro.id, eventoId, {
                nombre,
                estado: estado as 'pendiente' | 'en_proceso' | 'decidido',
                proveedor: proveedor || null,
                monto_original: parseFloat(monto) || null,
                moneda: moneda as 'USD' | 'ARS',
                sena_pct: parseFloat(senaPct) || null,
                fecha_decision: fechaDecision || null,
                fecha_sena: fechaSena || null,
                notas: notas || null,
            })
            onToggle()
        })
    }

    function handleDelete() {
        startTransition(async () => { await deleteRubro(rubro.id, eventoId) })
    }

    return (
        <div style={{ ...st.rubroCard, borderColor: isExpanded ? 'var(--color-gold)' : 'var(--color-border)' }}>
            {/* Summary row */}
            <button onClick={onToggle} style={st.rubroRowBtn}>
                <span style={{ flex: 2, fontWeight: 500, fontSize: '0.88rem', textAlign: 'left', color: 'var(--color-text)' }}>{rubro.nombre}</span>
                <span style={{ ...st.estadoBadge, ...ESTADO_STYLES[rubro.estado] }}>{ESTADO_OPTIONS.find(o => o.value === rubro.estado)?.label}</span>
                <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', minWidth: '80px' }}>{rubro.proveedor || '—'}</span>
                <span style={{ fontSize: '0.82rem', textAlign: 'right', fontWeight: 500, whiteSpace: 'nowrap', minWidth: '90px' }}>
                    {rubro.monto_original ? `${fmt(rubro.monto_original)} ${rubro.moneda}` : '—'}
                </span>
                <span style={{ fontSize: '0.82rem', textAlign: 'right', color: 'var(--color-text-muted)', minWidth: '80px' }}>
                    {rubro.monto_original ? `USD ${fmt(moneda === 'USD' ? montoNum : montoNum / tipoCambio, 0)}` : '—'}
                </span>
                <span style={{ fontSize: '0.82rem', textAlign: 'right', color: 'var(--color-olive)', minWidth: '70px' }}>
                    {rubro.sena_pct && rubro.monto_original ? `USD ${fmt(senaUSD, 0)}` : '—'}
                </span>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0, color: 'var(--color-text-muted)', marginLeft: '0.25rem' }}>
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </button>

            {/* Edit form */}
            {isExpanded && (
                <div style={st.rubroDetail}>
                    <div style={st.rubroGrid}>
                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                            <label className="form-label">Nombre del rubro</label>
                            <input value={nombre} onChange={e => setNombre(e.target.value)} className="form-input" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Estado</label>
                            <select value={estado} onChange={e => setEstado(e.target.value)} className="form-input">
                                {ESTADO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Proveedor</label>
                            <input value={proveedor} onChange={e => setProveedor(e.target.value)} className="form-input" placeholder="Nombre del proveedor" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Monto</label>
                            <input type="number" min="0" step="100" value={monto} onChange={e => setMonto(e.target.value)} className="form-input" placeholder="0" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Moneda</label>
                            <select value={moneda} onChange={e => setMoneda(e.target.value)} className="form-input">
                                <option value="USD">USD</option>
                                <option value="ARS">ARS</option>
                            </select>
                        </div>
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
                    {montoNum > 0 && (
                        <div style={st.computedRow}>
                            <span style={st.computedItem}>Equivalente USD: <strong>USD {fmt(montoUSD, 0)}</strong></span>
                            {parseFloat(senaPct) > 0 && <span style={st.computedItem}>Monto seña: <strong>USD {fmt(senaUSD, 0)}</strong> ({senaPct}%)</span>}
                            {moneda === 'ARS' && tipoCambio > 0 && <span style={st.computedItem}>TC aplicado: <strong>{fmt(tipoCambio)} ARS/USD</strong></span>}
                        </div>
                    )}

                    {/* Actions */}
                    <div style={st.rubroActions}>
                        {confirmDelete ? (
                            <span style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.8rem', color: 'var(--color-error)' }}>¿Eliminar?</span>
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

// ─── Styles ───────────────────────────────────────────────────────────────────

const st: Record<string, React.CSSProperties> = {
    tipoCambioCard: { padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' },
    tipoCambioLabel: { fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-muted)' },
    tipoCambioRow: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
    summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' },
    budgetBar: { height: '8px', backgroundColor: 'var(--color-cream-dark)', borderRadius: '99px', overflow: 'hidden' },
    budgetFill: { height: '100%', borderRadius: '99px', transition: 'width 0.3s ease' },
    colHeaders: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0 0.85rem', fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)' },
    rubroCard: { border: '1px solid', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-white)', overflow: 'hidden', transition: 'border-color 0.2s' },
    rubroRowBtn: { display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', padding: '0.75rem 0.85rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' },
    estadoBadge: { fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0.15rem 0.55rem', borderRadius: '20px', whiteSpace: 'nowrap' },
    rubroDetail: { padding: '1rem', backgroundColor: 'var(--color-cream)', borderTop: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '0.85rem' },
    rubroGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' },
    computedRow: { display: 'flex', gap: '1.25rem', flexWrap: 'wrap', padding: '0.65rem 0.85rem', backgroundColor: 'rgba(201,168,76,0.06)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(201,168,76,0.2)' },
    computedItem: { fontSize: '0.82rem', color: 'var(--color-text-muted)' },
    rubroActions: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem', borderTop: '1px solid var(--color-border)' },
    addBtn: { fontSize: '0.85rem', padding: '0.65rem', gap: '0.4rem', justifyContent: 'center', borderStyle: 'dashed' },
    confirmYesSmall: { fontSize: '0.72rem', padding: '0.2rem 0.55rem', background: 'var(--color-error)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontFamily: 'var(--font-sans)' },
    confirmNoSmall: { fontSize: '0.72rem', padding: '0.2rem 0.55rem', background: 'transparent', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', borderRadius: '4px', cursor: 'pointer', fontFamily: 'var(--font-sans)' },
}

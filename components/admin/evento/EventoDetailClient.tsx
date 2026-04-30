'use client'

import { useState, useTransition } from 'react'
import { ProgresoTab } from './ProgresoTab'
import { PresupuestoTab } from './PresupuestoTab'
import { DashboardTab } from './DashboardTab'
import { AcuerdosTab } from './AcuerdosTab'
import { updateEvento } from '@/app/(admin)/eventos/[id]/actions'

// ─── Shared types (passed as props from server) ──────────────────────────────

export interface Acuerdo {
    id: string
    texto: string
    created_at: string
}

export interface Tarea {
    id: string
    nombre: string
    estado: string
    position: number
}

export interface Tema {
    id: string
    nombre: string
    descripcion: string | null
    position: number
    tareas: Tarea[]
    acuerdos: Acuerdo[]
}

export interface Fase {
    id: string
    nombre: string
    descripcion: string | null
    fecha_inicio: string | null
    fecha_fin: string | null
    position: number
    temas: Tema[]
}

export interface PagoProveedor {
    id: string
    rubro_id: string
    monto: number
    moneda: string
    tipo_cambio_snapshot: number | null
    fecha: string
    realizado: boolean
    descripcion: string | null
    created_at: string
    tipo: 'cuota' | 'sena' | 'deposito_garantia'
    devuelto: boolean
    fecha_devolucion: string | null
}

export interface Rubro {
    id: string
    nombre: string
    estado: string
    proveedor: string | null
    monto_original: number | null
    moneda: string
    tipo_cambio_propio: number | null
    sena_pct: number | null
    fecha_decision: string | null
    fecha_sena: string | null
    notas: string | null
    orden: number
    costo_total: number | null
    descripcion_servicio: string | null
    pagos_proveedor?: PagoProveedor[]
}

export interface EventoData {
    id: string
    nombre: string
    tipo_evento: string
    fecha_evento: string
    presupuesto_usd: number | null
    tipo_cambio: number | null
    token_acceso: string
    mostrar_dashboard_cliente: boolean
    mostrar_acuerdos_cliente: boolean
    planner: { nombre: string; email: string; telefono: string | null } | null
    fases: Fase[]
    rubros: Rubro[]
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TIPO_LABELS: Record<string, string> = {
    boda: 'Boda', quince: 'Quinceañera', cumple: 'Cumpleaños', baby_shower: 'Baby Shower',
}
const TIPO_COLORS: Record<string, string> = {
    boda: '#C9A84C', quince: '#8A6DAE', cumple: '#4C8AC9', baby_shower: '#C96B8A',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function tareasOfFase(f: Fase): Tarea[] {
    return f.temas.flatMap((t) => t.tareas)
}

function isFaseVencida(fase: Fase): boolean {
    if (!fase.fecha_fin) return false
    const tareas = tareasOfFase(fase)
    const total = tareas.length
    const done = tareas.filter((t) => t.estado === 'completada').length
    if (total > 0 && done === total) return false
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
    return new Date(fase.fecha_fin + 'T12:00:00') < hoy
}

// ─── Segmented progress bar ───────────────────────────────────────────────────

function SegmentedProgressBar({ fases }: { fases: Fase[] }) {
    if (fases.length === 0) return null
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', gap: '3px', height: '6px' }}>
                {fases.map((fase) => {
                    const tareas = tareasOfFase(fase)
                    const total = tareas.length
                    const done = tareas.filter((t) => t.estado === 'completada').length
                    const pct = total === 0 ? 0 : Math.round((done / total) * 100)
                    const vencida = isFaseVencida(fase)
                    const bg = vencida
                        ? '#EF4444'
                        : pct === 100
                            ? '#7C8B70'
                            : pct > 0
                                ? '#C9A84C'
                                : '#D1D5DB'
                    const trackBg = total === 0 || pct === 0 ? '#D1D5DB' : '#E5E7EB'
                    return (
                        <div
                            key={fase.id}
                            title={`${fase.nombre}: ${pct}%${vencida ? ' ⚠ etapa vencida' : ''}`}
                            style={{ flex: 1, backgroundColor: trackBg, borderRadius: '99px', overflow: 'hidden', position: 'relative' }}
                        >
                            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, backgroundColor: bg, borderRadius: '99px', transition: 'width 0.3s ease, background-color 0.3s ease' }} />
                        </div>
                    )
                })}
            </div>
            <div style={{ display: 'flex', gap: '3px' }}>
                {fases.map((fase, idx) => (
                    <div
                        key={fase.id}
                        title={fase.nombre}
                        style={{
                            flex: 1,
                            minWidth: 0,
                            textAlign: 'center',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontSize: '0.65rem',
                            color: '#6B7280',
                            lineHeight: 1,
                            fontFamily: 'var(--font-mono, monospace)',
                            letterSpacing: '0.04em',
                        }}
                    >
                        E{idx + 1}
                    </div>
                ))}
            </div>
        </div>
    )
}

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
    evento: EventoData
    allPlanners: { id: string; nombre: string }[]
    plannerId: string | null
    canChangePlanner?: boolean
    backHref?: string
}

export function EventoDetailClient({ evento, allPlanners, plannerId, canChangePlanner = true }: Props) {
    const [tab, setTab] = useState<'progreso' | 'presupuesto' | 'dashboard' | 'acuerdos'>('progreso')
    const [editingHeader, setEditingHeader] = useState(false)
    const [editNombre, setEditNombre] = useState(evento.nombre)
    const [editPlannerId, setEditPlannerId] = useState(plannerId ?? '')
    const [editFecha, setEditFecha] = useState(evento.fecha_evento)
    const [editPresupuesto, setEditPresupuesto] = useState<string>(evento.presupuesto_usd != null ? String(evento.presupuesto_usd) : '')
    const [editTipoCambio, setEditTipoCambio] = useState<string>(evento.tipo_cambio != null ? String(evento.tipo_cambio) : '')
    const [isSavingHeader, startSavingHeader] = useTransition()

    function handleSaveHeader() {
        startSavingHeader(async () => {
            const presupuesto = editPresupuesto.trim() !== '' ? parseFloat(editPresupuesto) : null
            const tipoCambio = editTipoCambio.trim() !== '' ? parseFloat(editTipoCambio) : null
            await updateEvento(evento.id, {
                nombre: editNombre.trim() || evento.nombre,
                fecha_evento: editFecha || evento.fecha_evento,
                presupuesto_usd: presupuesto,
                tipo_cambio: tipoCambio,
                ...(canChangePlanner ? { planner_id: editPlannerId || null } : {}),
            })
            setEditingHeader(false)
        })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const fechaEvento = new Date(evento.fecha_evento + 'T12:00:00')
    const diasRestantes = Math.round(
        (fechaEvento.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    )

    const todasTareas = evento.fases.flatMap(tareasOfFase)
    const completadas = todasTareas.filter((t) => t.estado === 'completada').length
    const avance = todasTareas.length > 0
        ? Math.round((completadas / todasTareas.length) * 100)
        : 0

    const tipoColor = TIPO_COLORS[evento.tipo_evento] ?? 'var(--color-gold)'
    const tipoLabel = TIPO_LABELS[evento.tipo_evento] ?? evento.tipo_evento

    return (
        <div style={styles.wrapper}>
            <div className="card" style={styles.header}>
                {editingHeader ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                        <p style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-gold-dark)' }}>Editar evento</p>
                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                            <div className="form-group" style={{ flex: 2, minWidth: '200px' }}>
                                <label className="form-label">Nombre del evento</label>
                                <input
                                    autoFocus
                                    value={editNombre}
                                    onChange={e => setEditNombre(e.target.value)}
                                    className="form-input"
                                    style={{ fontSize: '1rem', fontFamily: 'var(--font-serif)' }}
                                />
                            </div>
                            <div className="form-group" style={{ minWidth: '160px' }}>
                                <label className="form-label">Fecha del evento</label>
                                <input
                                    type="date"
                                    value={editFecha}
                                    onChange={e => setEditFecha(e.target.value)}
                                    className="form-input"
                                />
                            </div>
                            {canChangePlanner && allPlanners.length > 0 && (
                                <div className="form-group" style={{ minWidth: '200px' }}>
                                    <label className="form-label">Planner asignado</label>
                                    <select
                                        value={editPlannerId}
                                        onChange={e => setEditPlannerId(e.target.value)}
                                        className="form-input"
                                    >
                                        <option value="">Sin planner</option>
                                        {allPlanners.map(p => (
                                            <option key={p.id} value={p.id}>{p.nombre}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <div className="form-group" style={{ minWidth: '140px' }}>
                                <label className="form-label">Presupuesto (USD)</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="100"
                                    value={editPresupuesto}
                                    onChange={e => setEditPresupuesto(e.target.value)}
                                    className="form-input"
                                    placeholder="Sin definir"
                                />
                            </div>
                            <div className="form-group" style={{ minWidth: '140px' }}>
                                <label className="form-label">Tipo de cambio (ARS)</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="10"
                                    value={editTipoCambio}
                                    onChange={e => setEditTipoCambio(e.target.value)}
                                    className="form-input"
                                    placeholder="Sin definir"
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button onClick={handleSaveHeader} disabled={isSavingHeader} className="btn-gold" style={{ fontSize: '0.82rem', padding: '0.45rem 1rem' }}>
                                {isSavingHeader ? 'Guardando…' : 'Guardar'}
                            </button>
                            <button
                                onClick={() => { setEditingHeader(false); setEditNombre(evento.nombre); setEditPlannerId(plannerId ?? ''); setEditFecha(evento.fecha_evento); setEditPresupuesto(evento.presupuesto_usd != null ? String(evento.presupuesto_usd) : ''); setEditTipoCambio(evento.tipo_cambio != null ? String(evento.tipo_cambio) : '') }}
                                className="btn-ghost"
                                style={{ fontSize: '0.82rem', padding: '0.45rem 0.85rem' }}
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                ) : (
                    <div style={styles.headerTop}>
                        <div>
                            <span style={{ ...styles.tipoBadge, backgroundColor: tipoColor + '18', color: tipoColor, borderColor: tipoColor + '40' }}>
                                {tipoLabel}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.3rem' }}>
                                <h1 style={styles.nombre}>{evento.nombre}</h1>
                                <button
                                    onClick={() => setEditingHeader(true)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '0.2rem', display: 'flex', alignItems: 'center', flexShrink: 0 }}
                                    title="Editar nombre, fecha y planner"
                                >
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                    </svg>
                                </button>
                            </div>
                            {evento.planner && (
                                <p style={styles.plannerRow}>
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                                    </svg>
                                    {evento.planner.nombre}
                                </p>
                            )}
                        </div>
                        <div style={styles.headerRight}>
                            <div style={styles.statBox}>
                                <span style={styles.statLabel}>Fecha</span>
                                <span style={styles.statValue}>
                                    {fechaEvento.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                            </div>
                            <div style={styles.statBox}>
                                <span style={styles.statLabel}>Días restantes</span>
                                <span style={{ ...styles.statValue, color: diasRestantes < 0 ? 'var(--color-error)' : diasRestantes <= 30 ? '#C97A2A' : 'var(--color-olive)' }}>
                                    {diasRestantes < 0 ? `−${Math.abs(diasRestantes)} días` : diasRestantes === 0 ? '¡Hoy!' : `${diasRestantes} días`}
                                </span>
                            </div>
                            <div style={styles.statBox}>
                                <span style={styles.statLabel}>Avance</span>
                                <span style={styles.statValue}>{avance}% <span style={{ fontWeight: 400, color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>({completadas}/{todasTareas.length})</span></span>
                            </div>
                        </div>
                    </div>
                )}

                {!editingHeader && (
                    <div style={{ marginTop: '1rem' }}>
                        <SegmentedProgressBar fases={evento.fases} />
                    </div>
                )}
            </div>

            <div style={styles.tabs}>
                {(['progreso', 'presupuesto', 'dashboard', 'acuerdos'] as const).map((t) => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        style={{ ...styles.tabBtn, ...(tab === t ? styles.tabBtnActive : {}) }}
                    >
                        {t === 'progreso' ? '📋 Progreso'
                            : t === 'presupuesto' ? '💰 Presupuesto'
                            : t === 'dashboard' ? '📊 Dashboard'
                            : '📝 Acuerdos'}
                    </button>
                ))}
            </div>

            {tab === 'progreso' && (
                <ProgresoTab fases={evento.fases} eventoId={evento.id} />
            )}
            {tab === 'dashboard' && (
                <>
                    <VisibilidadClienteBanner
                        eventoId={evento.id}
                        field="mostrar_dashboard_cliente"
                        currentValue={evento.mostrar_dashboard_cliente}
                        labelTab="Dashboard"
                    />
                    <DashboardTab
                        rubros={evento.rubros}
                        presupuestoUsd={evento.presupuesto_usd}
                        tipoCambioInicial={evento.tipo_cambio}
                        fechaEvento={evento.fecha_evento}
                    />
                </>
            )}
            {tab === 'presupuesto' && (
                <PresupuestoTab
                    rubros={evento.rubros}
                    eventoId={evento.id}
                    presupuestoUsd={evento.presupuesto_usd}
                    tipoCambioInicial={evento.tipo_cambio}
                    fechaEvento={evento.fecha_evento}
                />
            )}
            {tab === 'acuerdos' && (
                <>
                    <VisibilidadClienteBanner
                        eventoId={evento.id}
                        field="mostrar_acuerdos_cliente"
                        currentValue={evento.mostrar_acuerdos_cliente}
                        labelTab="Acuerdos"
                    />
                    <AcuerdosTab fases={evento.fases} />
                </>
            )}
        </div>
    )
}

const styles: Record<string, React.CSSProperties> = {
    wrapper: { maxWidth: '980px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' },
    header: { padding: '1.75rem' },
    headerTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem' },
    tipoBadge: { display: 'inline-block', fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', padding: '0.2rem 0.55rem', borderRadius: '20px', borderWidth: '1px', borderStyle: 'solid', marginBottom: '0.5rem' },
    nombre: { fontFamily: 'var(--font-serif)', fontSize: '1.75rem', fontWeight: 600, color: 'var(--color-text)', lineHeight: 1.2 },
    plannerRow: { display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', color: 'var(--color-text-muted)', marginTop: '0.4rem' },
    headerRight: { display: 'flex', gap: '1.5rem', flexShrink: 0, flexWrap: 'wrap' },
    statBox: { display: 'flex', flexDirection: 'column', gap: '0.2rem', minWidth: '80px' },
    statLabel: { fontSize: '0.7rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-muted)' },
    statValue: { fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-text)' },
    tabs: { display: 'flex', gap: '0.5rem' },
    tabBtn: { padding: '0.6rem 1.25rem', fontSize: '0.9rem', fontFamily: 'var(--font-sans)', fontWeight: 500, background: 'var(--color-white)', border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--color-text-muted)', transition: 'all 0.15s ease' },
    tabBtnActive: { borderColor: 'var(--color-gold)', color: 'var(--color-gold-dark)', backgroundColor: 'rgba(201,168,76,0.06)' },
}

// ─── VisibilidadClienteBanner ────────────────────────────────────────────────

function VisibilidadClienteBanner({
    eventoId, field, currentValue, labelTab,
}: {
    eventoId: string
    field: 'mostrar_dashboard_cliente' | 'mostrar_acuerdos_cliente'
    currentValue: boolean
    labelTab: string
}) {
    const [visible, setVisible] = useState(currentValue)
    const [isPending, startTr] = useTransition()

    function toggle() {
        const next = !visible
        setVisible(next)
        startTr(async () => {
            await updateEvento(eventoId, { [field]: next })
        })
    }

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem',
                padding: '0.7rem 1rem',
                marginBottom: '1rem',
                background: visible ? 'rgba(46,125,50,0.04)' : 'rgba(120,120,120,0.05)',
                border: '1px solid',
                borderColor: visible ? 'rgba(46,125,50,0.25)' : 'rgba(120,120,120,0.2)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.82rem',
            }}
        >
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: visible ? '#2E7D32' : 'var(--color-text-muted)', fontWeight: 500 }}>
                <span>{visible ? '👁' : '🚫'}</span>
                {visible
                    ? `${labelTab} es visible para el cliente.`
                    : `${labelTab} oculto para el cliente.`}
            </span>
            <button
                onClick={toggle}
                disabled={isPending}
                style={{
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    padding: '0.35rem 0.85rem',
                    borderRadius: 99,
                    border: '1px solid',
                    borderColor: visible ? 'rgba(46,125,50,0.35)' : 'var(--color-border)',
                    background: visible ? 'transparent' : 'var(--color-gold)',
                    color: visible ? '#2E7D32' : 'white',
                    cursor: isPending ? 'wait' : 'pointer',
                    fontFamily: 'var(--font-sans)',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s',
                }}
            >
                {isPending ? 'Guardando…' : visible ? 'Ocultar al cliente' : 'Mostrar al cliente'}
            </button>
        </div>
    )
}


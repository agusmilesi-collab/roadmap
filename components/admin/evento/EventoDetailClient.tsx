'use client'

import { useState } from 'react'
import { ProgresoTab } from './ProgresoTab'
import { PresupuestoTab } from './PresupuestoTab'

// ─── Shared types (passed as props from server) ──────────────────────────────

export interface Acuerdo {
    id: string
    texto: string
    created_at: string
}

export interface Tarea {
    id: string
    nombre: string
    fecha: string | null
    estado: string
    tipo: string
    resumen: string | null
    completada: boolean
    orden: number
    acuerdos: Acuerdo[]
}

export interface Fase {
    id: string
    nombre: string
    descripcion: string | null
    orden: number
    tareas: Tarea[]
}

export interface Rubro {
    id: string
    nombre: string
    estado: string
    proveedor: string | null
    monto_original: number | null
    moneda: string
    sena_pct: number | null
    fecha_decision: string | null
    fecha_sena: string | null
    notas: string | null
    orden: number
}

export interface EventoData {
    id: string
    nombre: string
    tipo_evento: string
    fecha_evento: string
    presupuesto_usd: number | null
    tipo_cambio: number | null
    token_acceso: string
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

// ─── Component ───────────────────────────────────────────────────────────────

interface Props { evento: EventoData }

export function EventoDetailClient({ evento }: Props) {
    const [tab, setTab] = useState<'progreso' | 'presupuesto'>('progreso')

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const fechaEvento = new Date(evento.fecha_evento + 'T12:00:00')
    const diasRestantes = Math.round(
        (fechaEvento.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    )

    const todasTareas = evento.fases.flatMap((f) => f.tareas)
    const completadas = todasTareas.filter((t) => t.completada).length
    const avance = todasTareas.length > 0
        ? Math.round((completadas / todasTareas.length) * 100)
        : 0

    const tipoColor = TIPO_COLORS[evento.tipo_evento] ?? 'var(--color-gold)'
    const tipoLabel = TIPO_LABELS[evento.tipo_evento] ?? evento.tipo_evento

    return (
        <div style={styles.wrapper}>
            {/* ── Event header ─────────────────────────────────── */}
            <div className="card" style={styles.header}>
                <div style={styles.headerTop}>
                    <div>
                        <span style={{ ...styles.tipoBadge, backgroundColor: tipoColor + '18', color: tipoColor, borderColor: tipoColor + '40' }}>
                            {tipoLabel}
                        </span>
                        <h1 style={styles.nombre}>{evento.nombre}</h1>
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

                {/* Progress bar */}
                <div style={styles.progressBar}>
                    <div style={{ ...styles.progressFill, width: `${avance}%`, backgroundColor: avance === 100 ? 'var(--color-olive)' : 'var(--color-gold)' }} />
                </div>
            </div>

            {/* ── Tabs ─────────────────────────────────────────── */}
            <div style={styles.tabs}>
                {(['progreso', 'presupuesto'] as const).map((t) => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        style={{ ...styles.tabBtn, ...(tab === t ? styles.tabBtnActive : {}) }}
                    >
                        {t === 'progreso' ? '📋 Progreso' : '💰 Presupuesto'}
                    </button>
                ))}
            </div>

            {/* ── Tab content ──────────────────────────────────── */}
            {tab === 'progreso' ? (
                <ProgresoTab fases={evento.fases} eventoId={evento.id} />
            ) : (
                <PresupuestoTab
                    rubros={evento.rubros}
                    eventoId={evento.id}
                    presupuestoUsd={evento.presupuesto_usd}
                    tipoCambioInicial={evento.tipo_cambio}
                />
            )}
        </div>
    )
}

const styles: Record<string, React.CSSProperties> = {
    wrapper: { maxWidth: '980px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' },
    header: { padding: '1.75rem' },
    headerTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem' },
    tipoBadge: { display: 'inline-block', fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', padding: '0.2rem 0.55rem', borderRadius: '20px', border: '1px solid', marginBottom: '0.5rem' },
    nombre: { fontFamily: 'var(--font-serif)', fontSize: '1.75rem', fontWeight: 600, color: 'var(--color-text)', lineHeight: 1.2 },
    plannerRow: { display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', color: 'var(--color-text-muted)', marginTop: '0.4rem' },
    headerRight: { display: 'flex', gap: '1.5rem', flexShrink: 0, flexWrap: 'wrap' },
    statBox: { display: 'flex', flexDirection: 'column', gap: '0.2rem', minWidth: '80px' },
    statLabel: { fontSize: '0.7rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-muted)' },
    statValue: { fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-text)' },
    progressBar: { height: '6px', backgroundColor: 'var(--color-cream-dark)', borderRadius: '99px', overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: '99px', transition: 'width 0.3s ease' },
    tabs: { display: 'flex', gap: '0.5rem' },
    tabBtn: { padding: '0.6rem 1.25rem', fontSize: '0.9rem', fontFamily: 'var(--font-sans)', fontWeight: 500, background: 'var(--color-white)', border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--color-text-muted)', transition: 'all 0.15s ease' },
    tabBtnActive: { borderColor: 'var(--color-gold)', color: 'var(--color-gold-dark)', backgroundColor: 'rgba(201,168,76,0.06)' },
}

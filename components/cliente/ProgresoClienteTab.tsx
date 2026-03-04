'use client'

import { useState } from 'react'
import type { EventoCliente } from './EventoClienteView'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    fases: EventoCliente['fases']
}

// ─── Status config ────────────────────────────────────────────────────────────

const TIPO_ICON: Record<string, string> = {
    reunion: '💬',
    entregable: '📦',
    decision: '⚡',
    pago: '💰',
}

// ─── Long date format helper ──────────────────────────────────────────────────

function formatFechaLarga(fechaStr: string): string {
    return new Date(fechaStr + 'T12:00:00').toLocaleDateString('es-AR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    })
}

// ─── Helper: compute effective visual state ───────────────────────────────────

type TareaVisualState = 'completada' | 'vencida' | 'en_curso' | 'pendiente'

function getVisualState(tarea: Tarea): TareaVisualState {
    if (tarea.completada) return 'completada'
    if (tarea.fecha) {
        const hoy = new Date()
        hoy.setHours(0, 0, 0, 0)
        const d = new Date(tarea.fecha + 'T12:00:00')
        if (d < hoy) return 'vencida'
    }
    if (tarea.estado === 'en_curso' || tarea.estado === 'en_proceso') return 'en_curso'
    return 'pendiente'
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ProgresoClienteTab({ fases }: Props) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {fases.length === 0 && (
                <div style={st.empty}>Aún no hay fases definidas para este evento.</div>
            )}

            {fases.map((fase) => {
                const total = fase.tareas.length
                const completadas = fase.tareas.filter((t) => t.completada).length
                const hasVencida = fase.tareas.some((t) => {
                    if (t.completada || !t.fecha) return false
                    const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
                    return new Date(t.fecha + 'T12:00:00') < hoy
                })
                // Sort by orden asc, then fecha asc (nulls last)
                const tareasOrdenadas = [...fase.tareas].sort((a, b) => {
                    if (a.orden !== b.orden) return (a.orden ?? 0) - (b.orden ?? 0)
                    if (!a.fecha && !b.fecha) return 0
                    if (!a.fecha) return 1
                    if (!b.fecha) return -1
                    return a.fecha.localeCompare(b.fecha)
                })

                return (
                    <div key={fase.id} className="card" style={st.faseCard}>
                        {/* Fase header */}
                        <div style={st.faseHeader}>
                            <div style={st.faseTitleGroup}>
                                <h3 style={st.faseName}>{fase.nombre}</h3>
                                {fase.descripcion && (
                                    <p style={st.faseDesc}>{fase.descripcion}</p>
                                )}
                            </div>
                            <div style={st.faseCounter}>
                                <span style={{ fontSize: '0.75rem', color: hasVencida ? '#EF4444' : 'var(--color-text-muted)' }}>
                                    {completadas}/{total} tareas
                                    {hasVencida && <span style={{ marginLeft: 4, fontWeight: 700 }}>· con vencidas</span>}
                                </span>
                                {total > 0 && (
                                    <div style={st.miniBar}>
                                        <div style={{
                                            ...st.miniBarFill,
                                            width: `${Math.round((completadas / total) * 100)}%`,
                                            backgroundColor: hasVencida ? '#EF4444' : 'var(--color-olive)',
                                        }} />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Tareas — timeline */}
                        <div style={st.tareasList}>
                            {tareasOrdenadas.map((tarea, idx) => (
                                <TareaRow
                                    key={tarea.id}
                                    tarea={tarea}
                                    isLast={idx === tareasOrdenadas.length - 1}
                                    nextState={idx < tareasOrdenadas.length - 1 ? getVisualState(tareasOrdenadas[idx + 1]) : null}
                                />
                            ))}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

// ─── TareaRow ─────────────────────────────────────────────────────────────────

type Tarea = EventoCliente['fases'][number]['tareas'][number]

function TareaRow({ tarea, isLast, nextState }: { tarea: Tarea; isLast: boolean; nextState: TareaVisualState | null }) {
    const [expanded, setExpanded] = useState(false)
    const hasDetail = tarea.resumen || (tarea.acuerdos && tarea.acuerdos.length > 0)

    const visualState = getVisualState(tarea)
    const isCompleted = visualState === 'completada'
    const isVencida = visualState === 'vencida'
    const isInProgress = visualState === 'en_curso'

    const fecha = tarea.fecha ? formatFechaLarga(tarea.fecha) : null

    // Connector line color = based on the NEXT task's state
    const lineColor = nextState === 'completada'
        ? '#7C8B70'
        : nextState === 'vencida'
            ? '#EF4444'
            : 'var(--color-border)'

    return (
        <div style={{ display: 'flex', gap: '0.75rem' }}>
            {/* Timeline column */}
            <div style={st.timelineCol}>
                {/* Circle */}
                <div style={st.timelineCircle}>
                    {isCompleted
                        ? <CompletedIcon />
                        : isVencida
                            ? <VencidaIcon />
                            : isInProgress
                                ? <InProgressIcon />
                                : <PendingIcon />
                    }
                </div>
                {/* Vertical line — only between items */}
                {!isLast && (
                    <div style={{ ...st.timelineLine, backgroundColor: lineColor }} />
                )}
            </div>

            {/* Content */}
            <div style={{ flex: 1, paddingBottom: isLast ? 0 : '0.85rem', minWidth: 0 }}>
                <button
                    onClick={() => hasDetail && setExpanded((v) => !v)}
                    style={{ ...st.tareaRowBtn, cursor: hasDetail ? 'pointer' : 'default' }}
                >
                    {/* Tipo icon + Nombre */}
                    <span style={st.tipoIcon}>{TIPO_ICON[tarea.tipo ?? ''] ?? '•'}</span>
                    <span style={{
                        ...st.tareaNombre,
                        color: isCompleted ? 'var(--color-text-muted)' : isVencida ? '#EF4444' : 'var(--color-text)',
                        textDecoration: isCompleted ? 'line-through' : 'none',
                    }}>
                        {tarea.nombre}
                    </span>

                    <span style={st.tareasRight}>
                        {isVencida && (
                            <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.06em', color: '#EF4444', backgroundColor: 'rgba(239,68,68,0.1)', padding: '0.1rem 0.45rem', borderRadius: '20px', whiteSpace: 'nowrap' }}>VENCIDA</span>
                        )}
                        {fecha && <span style={{ ...st.tareaFecha, color: isVencida ? '#EF4444' : 'var(--color-text-muted)' }}>{fecha}</span>}
                        {hasDetail && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                                style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', color: 'var(--color-text-muted)' }}>
                                <polyline points="6 9 12 15 18 9" />
                            </svg>
                        )}
                    </span>
                </button>

                {/* Expandido */}
                {expanded && hasDetail && (
                    <div style={st.tareaDetail}>
                        {tarea.resumen && (
                            <div style={st.resumenBlock}>
                                <p style={st.resumenLabel}>Resumen</p>
                                <p style={st.resumenText}>{tarea.resumen}</p>
                            </div>
                        )}

                        {tarea.acuerdos && tarea.acuerdos.length > 0 && (
                            <div style={st.acuerdosBlock}>
                                <p style={st.resumenLabel}>Acuerdos</p>
                                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                    {tarea.acuerdos.map((a) => (
                                        <li key={a.id} style={st.acuerdoItem}>
                                            <span style={st.acuerdoBullet}>✦</span>
                                            {a.texto}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

// ─── Status icon components ───────────────────────────────────────────────────

function VencidaIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="11" fill="#EF4444" />
            <line x1="8" y1="8" x2="16" y2="16" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
            <line x1="16" y1="8" x2="8" y2="16" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
    )
}

function CompletedIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="11" fill="#7C8B70" />
            <polyline points="7 12.5 10.5 16 17 9" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

function InProgressIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="var(--color-gold)" strokeWidth="1.5" strokeDasharray="4 2" />
            <circle cx="12" cy="12" r="4" fill="var(--color-gold)" opacity="0.5" />
        </svg>
    )
}

function PendingIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="var(--color-border)" strokeWidth="1.5" />
        </svg>
    )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const st: Record<string, React.CSSProperties> = {
    empty: { padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.9rem', fontStyle: 'italic' },
    faseCard: { padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' },
    faseHeader: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' },
    faseTitleGroup: { display: 'flex', flexDirection: 'column', gap: '0.2rem' },
    faseName: { fontSize: '1rem', fontWeight: 600, fontFamily: 'var(--font-serif)', color: 'var(--color-text)' },
    faseDesc: { fontSize: '0.78rem', color: 'var(--color-text-muted)', lineHeight: 1.4 },
    faseCounter: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.3rem', flexShrink: 0 },
    miniBar: { width: '70px', height: '4px', backgroundColor: 'var(--color-cream-dark)', borderRadius: '99px', overflow: 'hidden' },
    miniBarFill: { height: '100%', backgroundColor: 'var(--color-olive)', borderRadius: '99px', transition: 'width 0.3s' },
    tareasList: { display: 'flex', flexDirection: 'column' },
    // Timeline
    timelineCol: { display: 'flex', flexDirection: 'column', alignItems: 'center', width: '18px', flexShrink: 0 },
    timelineCircle: { flexShrink: 0 },
    timelineLine: { flex: 1, width: '2px', minHeight: '18px', marginTop: '2px', marginBottom: '2px', borderRadius: '1px' },
    // Row
    tareaRowBtn: { display: 'flex', alignItems: 'center', gap: '0.55rem', width: '100%', padding: '0.35rem 0', background: 'none', border: 'none', textAlign: 'left' },
    tipoIcon: { fontSize: '0.85rem', flexShrink: 0 },
    tareaNombre: { fontSize: '0.88rem', flex: 1 },
    tareasRight: { display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto', flexShrink: 0 },
    tareaFecha: { fontSize: '0.73rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' },
    tareaDetail: { padding: '0.65rem 0 0.65rem 0', display: 'flex', flexDirection: 'column', gap: '0.75rem' },
    resumenBlock: { display: 'flex', flexDirection: 'column', gap: '0.35rem' },
    resumenLabel: { fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-muted)' },
    resumenText: { fontSize: '0.875rem', color: 'var(--color-text)', lineHeight: 1.6 },
    acuerdosBlock: { display: 'flex', flexDirection: 'column', gap: '0.4rem' },
    acuerdoItem: { display: 'flex', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--color-text)', lineHeight: 1.5 },
    acuerdoBullet: { color: 'var(--color-gold)', flexShrink: 0, fontSize: '0.6rem', marginTop: '0.3rem' },
}

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
                                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                    {completadas}/{total} tareas
                                </span>
                                {total > 0 && (
                                    <div style={st.miniBar}>
                                        <div style={{ ...st.miniBarFill, width: `${Math.round((completadas / total) * 100)}%` }} />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Tareas */}
                        <div style={st.tareasList}>
                            {fase.tareas.map((tarea) => (
                                <TareaRow key={tarea.id} tarea={tarea} />
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

function TareaRow({ tarea }: { tarea: Tarea }) {
    const [expanded, setExpanded] = useState(false)
    const hasDetail = tarea.resumen || (tarea.acuerdos && tarea.acuerdos.length > 0)

    const statusIcon = tarea.completada
        ? <CompletedIcon />
        : tarea.estado === 'en_proceso'
            ? <InProgressIcon />
            : <PendingIcon />

    const fecha = tarea.fecha
        ? new Date(tarea.fecha + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
        : null

    return (
        <div style={st.tareaWrapper}>
            <button
                onClick={() => hasDetail && setExpanded((v) => !v)}
                style={{ ...st.tareaRowBtn, cursor: hasDetail ? 'pointer' : 'default' }}
            >
                {/* Status icon */}
                {statusIcon}

                {/* Tipo icon + Nombre */}
                <span style={st.tipoIcon}>{TIPO_ICON[tarea.tipo ?? ''] ?? '•'}</span>
                <span style={{ ...st.tareaNombre, textDecoration: tarea.completada ? 'line-through' : 'none', opacity: tarea.completada ? 0.55 : 1 }}>
                    {tarea.nombre}
                </span>

                <span style={st.tareasRight}>
                    {fecha && <span style={st.tareaFecha}>{fecha}</span>}
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
    )
}

// ─── Status icon components ───────────────────────────────────────────────────

function CompletedIcon() {
    return (
        <span style={st.statusIcon}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" fill="var(--color-olive)" opacity="0.15" />
                <circle cx="12" cy="12" r="10" stroke="var(--color-olive)" strokeWidth="1.5" />
                <polyline points="7 12.5 10.5 16 17 9" stroke="var(--color-olive)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        </span>
    )
}

function InProgressIcon() {
    return (
        <span style={st.statusIcon}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="var(--color-gold)" strokeWidth="1.5" strokeDasharray="4 2" />
                <circle cx="12" cy="12" r="4" fill="var(--color-gold)" opacity="0.5" />
            </svg>
        </span>
    )
}

function PendingIcon() {
    return (
        <span style={st.statusIcon}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="var(--color-border)" strokeWidth="1.5" />
            </svg>
        </span>
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
    tareasList: { display: 'flex', flexDirection: 'column', gap: '0.15rem' },
    tareaWrapper: { borderRadius: 'var(--radius-sm)', overflow: 'hidden' },
    tareaRowBtn: { display: 'flex', alignItems: 'center', gap: '0.55rem', width: '100%', padding: '0.55rem 0.4rem', background: 'none', border: 'none', textAlign: 'left', borderRadius: 'var(--radius-sm)', transition: 'background 0.15s' },
    statusIcon: { display: 'flex', alignItems: 'center', flexShrink: 0 },
    tipoIcon: { fontSize: '0.85rem', flexShrink: 0 },
    tareaNombre: { fontSize: '0.88rem', color: 'var(--color-text)', flex: 1 },
    tareasRight: { display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto', flexShrink: 0 },
    tareaFecha: { fontSize: '0.73rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' },
    tareaDetail: { padding: '0.85rem 1rem 0.85rem 2rem', backgroundColor: 'var(--color-cream)', borderTop: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '0.85rem' },
    resumenBlock: { display: 'flex', flexDirection: 'column', gap: '0.35rem' },
    resumenLabel: { fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-muted)' },
    resumenText: { fontSize: '0.875rem', color: 'var(--color-text)', lineHeight: 1.6 },
    acuerdosBlock: { display: 'flex', flexDirection: 'column', gap: '0.4rem' },
    acuerdoItem: { display: 'flex', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--color-text)', lineHeight: 1.5 },
    acuerdoBullet: { color: 'var(--color-gold)', flexShrink: 0, fontSize: '0.6rem', marginTop: '0.3rem' },
}

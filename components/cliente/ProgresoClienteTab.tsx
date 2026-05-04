'use client'

import { useState } from 'react'
import type { EventoCliente } from './EventoClienteView'

interface Props {
    fases: EventoCliente['fases']
}

type Tema = EventoCliente['fases'][number]['temas'][number]
type Tarea = Tema['tareas'][number]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function temaPercent(tema: Tema): number {
    if (tema.tareas.length === 0) return 0
    const done = tema.tareas.filter((t) => t.estado === 'completada').length
    return Math.round((done / tema.tareas.length) * 100)
}

function temaEstado(tema: Tema): 'pendiente' | 'en_curso' | 'completada' {
    const pct = temaPercent(tema)
    if (pct === 0) return 'pendiente'
    if (pct === 100) return 'completada'
    return 'en_curso'
}

function formatAcuerdoDate(iso: string): string {
    const d = new Date(iso)
    const monthsShort = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']
    return `${d.getDate()} ${monthsShort[d.getMonth()]}`
}

function formatRangeMonths(inicio: string | null, fin: string | null): string {
    if (!inicio && !fin) return ''
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
    function fmt(iso: string | null): string {
        if (!iso) return ''
        const d = new Date(iso + 'T12:00:00')
        return `${meses[d.getMonth()]} ${d.getFullYear()}`
    }
    const a = fmt(inicio)
    const b = fmt(fin)
    if (a && b) return `${a} → ${b}`
    return a || b
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ProgresoClienteTab({ fases }: Props) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {fases.length === 0 && (
                <div style={st.empty}>Aún no hay fases definidas para este evento.</div>
            )}

            {fases.map((fase, idx) => (
                <FaseCard key={fase.id} fase={fase} index={idx} />
            ))}
        </div>
    )
}

// ─── FaseCard ─────────────────────────────────────────────────────────────────

function FaseCard({ fase, index }: { fase: EventoCliente['fases'][number]; index: number }) {
    return (
        <div className="fase-cliente" style={st.fase}>
            <div className="fase-cliente-header" style={st.faseHeader}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={st.faseEyebrow}>Etapa {index + 1}</div>
                    <div style={st.faseName}>{fase.nombre}</div>
                    {fase.descripcion && <div style={st.faseDesc}>{fase.descripcion}</div>}
                </div>
                {(fase.fecha_inicio || fase.fecha_fin) && (
                    <div className="fase-cliente-dates" style={st.faseDates}>{formatRangeMonths(fase.fecha_inicio, fase.fecha_fin)}</div>
                )}
            </div>

            <div style={st.temasList}>
                {fase.temas.map((tema) => (
                    <TemaRow key={tema.id} tema={tema} />
                ))}
            </div>
        </div>
    )
}

// ─── TemaRow ──────────────────────────────────────────────────────────────────

function TemaRow({ tema }: { tema: Tema }) {
    const [expanded, setExpanded] = useState(false)
    const pct = temaPercent(tema)
    const estado = temaEstado(tema)
    const done = tema.tareas.filter((t) => t.estado === 'completada').length

    return (
        <div style={st.tema}>
            <div className="tema-row-resp no-handle" style={{ cursor: 'pointer' }} onClick={() => setExpanded((v) => !v)}>
                <div className="tema-row-main">
                    <div style={st.temaName}>{tema.nombre}</div>
                    {tema.descripcion && <div style={st.temaDesc}>{tema.descripcion}</div>}
                </div>
                <div className="tema-row-meta">
                    <StatusPill estado={estado} pct={pct} />
                    <svg style={{ ...st.chevron, transform: expanded ? 'rotate(180deg)' : 'none' }} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M6 9l6 6 6-6" />
                    </svg>
                </div>
            </div>

            {expanded && (
                <div style={st.temaBody}>
                    <div style={st.sectionLabel}>
                        <span style={{ ...st.sectionDot, backgroundColor: 'var(--color-gold)' }} />
                        Tareas <span style={st.countTag}>{done} de {tema.tareas.length}</span>
                    </div>
                    <div style={st.tareasTimeline}>
                        {tema.tareas.map((tarea) => (
                            <TareaItem key={tarea.id} tarea={tarea} />
                        ))}
                    </div>

                    {tema.cotizaciones.length > 0 && (
                        <>
                            <div style={{ ...st.sectionLabel, marginTop: '1.25rem' }}>
                                <span style={{ ...st.sectionDot, backgroundColor: 'var(--color-gold)' }} />
                                Cotizaciones <span style={st.countTag}>{tema.cotizaciones.length} {tema.cotizaciones.length === 1 ? 'presupuesto' : 'presupuestos'}</span>
                            </div>
                            {tema.cotizaciones.map((cot) => (
                                <div key={cot.id} style={st.cotizacion}>
                                    <span style={st.cotizacionIcon}>📄</span>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', minWidth: 0 }}>
                                        <span style={st.cotizacionProveedor}>{cot.proveedor}</span>
                                        <a href={cot.link} target="_blank" rel="noopener noreferrer" style={st.cotizacionLink} title={`Ver presupuesto: ${cot.link}`}>
                                            ↗
                                        </a>
                                    </span>
                                </div>
                            ))}
                        </>
                    )}

                    {tema.acuerdos.length > 0 && (
                        <>
                            <div style={{ ...st.sectionLabel, marginTop: '1.25rem' }}>
                                <span style={{ ...st.sectionDot, backgroundColor: 'var(--color-gold)' }} />
                                Acuerdos <span style={st.countTag}>{tema.acuerdos.length} {tema.acuerdos.length === 1 ? 'registro' : 'registros'}</span>
                            </div>
                            {tema.acuerdos.map((acuerdo) => (
                                <div key={acuerdo.id} style={st.acuerdo}>
                                    <div style={st.acuerdoDate}>{formatAcuerdoDate(acuerdo.created_at)}</div>
                                    <div style={st.acuerdoText}>{acuerdo.texto}</div>
                                </div>
                            ))}
                        </>
                    )}
                </div>
            )}
        </div>
    )
}

// ─── TareaItem ────────────────────────────────────────────────────────────────

function TareaItem({ tarea }: { tarea: Tarea }) {
    return (
        <div style={st.tarea} data-estado={tarea.estado}>
            <span
                style={{
                    ...st.tareaNode,
                    ...(tarea.estado === 'en_curso' ? st.tareaNodeEnCurso : {}),
                    ...(tarea.estado === 'completada' ? st.tareaNodeCompletada : {}),
                }}
                title={tarea.estado === 'completada' ? 'Completada' : tarea.estado === 'en_curso' ? 'En curso' : 'Pendiente'}
            >
                {tarea.estado === 'en_curso' && <span style={st.tareaNodeDot} />}
                {tarea.estado === 'completada' && <span style={st.tareaNodeCheck}>✓</span>}
            </span>
            <div
                style={{
                    ...st.tareaName,
                    ...(tarea.estado === 'completada' ? st.tareaNameCompletada : {}),
                }}
            >
                {tarea.nombre}
            </div>
        </div>
    )
}

// ─── Status pill ─────────────────────────────────────────────────────────────

function StatusPill({ estado, pct }: { estado: 'pendiente' | 'en_curso' | 'completada'; pct: number }) {
    if (estado === 'pendiente') {
        return (
            <div style={{ ...st.pill, ...st.pillPendiente }}>
                <span style={{ ...st.pillDot, background: 'var(--color-text-muted)' }} />
                Pendiente
            </div>
        )
    }
    if (estado === 'completada') {
        return (
            <div style={{ ...st.pill, ...st.pillCompletado }}>
                <span style={{ ...st.pillDot, background: '#4B7C5C' }} />
                Completado
            </div>
        )
    }
    return (
        <div style={{ ...st.pill, ...st.pillCurso }}>
            <span style={{ ...st.pillDot, background: 'var(--color-gold)' }} />
            En curso · {pct}%
        </div>
    )
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const st: Record<string, React.CSSProperties> = {
    empty: { padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.9rem', fontStyle: 'italic' },
    fase: {
        background: 'var(--color-white)',
        border: '1px solid var(--color-border)',
        borderRadius: '16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)',
        padding: '1.75rem 2rem 0.5rem',
        overflow: 'hidden',
    },
    faseHeader: {
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: '1rem',
        paddingBottom: '1rem',
        marginBottom: '0.5rem',
        borderBottom: '1px solid var(--color-border)',
        flexWrap: 'wrap',
    },
    faseEyebrow: {
        fontFamily: 'var(--font-mono, monospace)',
        fontSize: '0.7rem',
        fontWeight: 500,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'var(--color-gold-dark)',
    },
    faseName: {
        fontFamily: 'var(--font-sans)',
        fontSize: '1.375rem',
        fontWeight: 600,
        marginTop: '0.25rem',
        color: 'var(--color-text)',
        letterSpacing: '-0.015em',
    },
    faseDesc: {
        fontSize: '0.875rem',
        color: 'var(--color-text-muted)',
        marginTop: '0.4rem',
        lineHeight: 1.55,
        maxWidth: '620px',
    },
    faseDates: {
        fontFamily: 'var(--font-mono, monospace)',
        fontSize: '0.8rem',
        color: 'var(--color-text-muted)',
        letterSpacing: '0.02em',
        whiteSpace: 'nowrap',
    },
    temasList: { display: 'flex', flexDirection: 'column' },
    tema: { borderBottom: '1px solid #CFC8B0' },
    temaRow: {
        display: 'grid',
        gridTemplateColumns: '1fr auto auto',
        gap: '1rem',
        alignItems: 'center',
        padding: '1.1rem 0.5rem',
        cursor: 'pointer',
        userSelect: 'none',
    },
    temaName: {
        fontFamily: 'var(--font-sans)',
        fontSize: '1rem',
        fontWeight: 600,
        color: 'var(--color-text)',
        letterSpacing: '-0.01em',
    },
    temaDesc: {
        fontSize: '0.85rem',
        color: 'var(--color-text-muted)',
        marginTop: '0.2rem',
        lineHeight: 1.5,
    },
    temaDeadline: {
        fontFamily: 'var(--font-mono, monospace)',
        fontSize: '0.75rem',
        color: 'var(--color-text)',
        background: 'var(--color-cream-dark)',
        padding: '0.3rem 0.7rem',
        borderRadius: '6px',
        whiteSpace: 'nowrap',
        letterSpacing: '0.02em',
        border: '1px solid var(--color-border)',
    },
    chevron: {
        color: 'var(--color-text-muted)',
        transition: 'transform 0.2s ease',
    },
    pill: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        fontSize: '0.75rem',
        fontWeight: 500,
        padding: '0.3rem 0.75rem',
        borderRadius: '99px',
        letterSpacing: '0.01em',
        whiteSpace: 'nowrap',
    },
    pillDot: { width: '6px', height: '6px', borderRadius: '50%' },
    pillPendiente: {
        background: 'var(--color-cream-dark)',
        color: 'var(--color-text-muted)',
        border: '1px solid var(--color-border)',
    },
    pillCurso: {
        background: 'rgba(201, 168, 76, 0.14)',
        color: 'var(--color-gold-dark)',
    },
    pillCompletado: {
        background: 'rgba(75, 124, 92, 0.12)',
        color: '#4B7C5C',
    },
    temaBody: {
        padding: '0.5rem 0.5rem 2.25rem 1.75rem',
    },
    sectionLabel: {
        fontFamily: 'var(--font-mono, monospace)',
        fontSize: '0.7rem',
        fontWeight: 500,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'var(--color-text-muted)',
        marginBottom: '0.65rem',
        display: 'flex', alignItems: 'center', gap: '0.5rem',
    },
    sectionDot: {
        display: 'inline-block',
        width: 7,
        height: 7,
        borderRadius: '50%',
        flexShrink: 0,
    },
    countTag: {
        fontFamily: 'var(--font-mono, monospace)',
        fontSize: '0.7rem',
        color: 'var(--color-text-faint, #B8B2A4)',
        fontWeight: 400,
        textTransform: 'none',
        letterSpacing: '0.02em',
    },
    tareasTimeline: { position: 'relative' },
    tarea: {
        display: 'grid',
        gridTemplateColumns: '1.2rem 1fr',
        gap: '0.85rem',
        alignItems: 'center',
        padding: '0.32rem 0.4rem',
        borderRadius: '6px',
    },
    tareaNode: {
        width: '16px', height: '16px',
        border: '1.5px solid #D6D0C2',
        background: 'var(--color-white)',
        borderRadius: '50%',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative',
        flexShrink: 0,
        marginLeft: '8px',
    },
    tareaNodeEnCurso: { borderColor: 'var(--color-gold)' },
    tareaNodeDot: {
        width: '8px', height: '8px',
        background: 'var(--color-gold)',
        borderRadius: '50%',
    },
    tareaNodeCompletada: {
        borderColor: '#4B7C5C',
        background: '#4B7C5C',
    },
    tareaNodeCheck: { color: 'white', fontSize: '0.65rem', fontWeight: 700, lineHeight: 1 },
    tareaName: {
        fontSize: '0.9rem',
        color: 'var(--color-text)',
    },
    tareaNameCompletada: {
        color: 'var(--color-text-muted)',
        textDecoration: 'line-through',
        textDecorationColor: 'rgba(122,122,122,0.4)',
    },
    tareaStatus: {
        fontFamily: 'var(--font-mono, monospace)',
        fontSize: '0.7rem',
        color: 'var(--color-text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        fontWeight: 500,
        whiteSpace: 'nowrap',
    },
    acuerdo: {
        display: 'grid',
        gridTemplateColumns: '60px 1fr',
        gap: '1rem',
        padding: '0.4rem 0 0.4rem 1.85rem',
        fontSize: '0.875rem',
        color: 'var(--color-text)',
        lineHeight: 1.4,
    },
    acuerdoDate: {
        fontFamily: 'var(--font-mono, monospace)',
        color: 'var(--color-gold-dark)',
        fontSize: '0.7rem',
        fontWeight: 500,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        paddingTop: '0.2rem',
    },
    acuerdoText: { color: 'var(--color-text)' },
    cotizacion: {
        display: 'grid',
        gridTemplateColumns: 'auto 1fr',
        gap: '0.5rem',
        padding: '0.32rem 0 0.32rem 1.85rem',
        fontSize: '0.85rem',
        alignItems: 'center',
    },
    cotizacionIcon: {
        fontSize: '0.95rem',
        opacity: 0.7,
        lineHeight: 1,
    },
    cotizacionProveedor: {
        fontWeight: 600,
        color: 'var(--color-text)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        minWidth: 0,
    },
    cotizacionLink: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '22px',
        height: '22px',
        fontSize: '0.85rem',
        color: 'var(--color-gold-dark)',
        textDecoration: 'none',
        borderRadius: '4px',
        whiteSpace: 'nowrap',
        flexShrink: 0,
        lineHeight: 1,
    },
}

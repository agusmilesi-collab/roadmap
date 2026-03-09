'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { deleteEvento } from '@/app/(admin)/dashboard/actions'

export interface EventoConStats {
    id: string
    nombre: string
    tipo_evento: string
    fecha_evento: string
    token_acceso: string
    diasRestantes: number
    porcentajeAvance: number
    totalTareas: number
    tareasCompletadas: number
    plannerNombre: string | null
    fases: { nombre: string; total: number; completadas: number }[]
    /** Nombre legible del tipo de evento (para tipos custom) */
    tipoEventoDisplay?: string | null
}

const TIPO_LABELS: Record<string, string> = {
    boda: 'Boda', quince: 'Quinceañera', cumple: 'Cumpleaños', baby_shower: 'Baby Shower',
}
const TIPO_COLORS: Record<string, string> = {
    boda: '#C9A84C', quince: '#8A6DAE', cumple: '#4C8AC9', baby_shower: '#C96B8A',
}

interface EventCardProps {
    evento: EventoConStats
    href?: string
    canDelete?: boolean
}

export function EventCard({ evento, href, canDelete = true }: EventCardProps) {
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [isPending, startTransition] = useTransition()

    const tipoColor = TIPO_COLORS[evento.tipo_evento] ?? 'var(--color-gold)'
    const tipoLabel = evento.tipoEventoDisplay ?? TIPO_LABELS[evento.tipo_evento] ?? evento.tipo_evento

    const diasLabel =
        evento.diasRestantes < 0
            ? `Hace ${Math.abs(evento.diasRestantes)}d`
            : evento.diasRestantes === 0
                ? '¡Hoy!'
                : `${evento.diasRestantes}d`

    const diasColor =
        evento.diasRestantes < 0
            ? 'var(--color-error)'
            : evento.diasRestantes <= 30
                ? '#C97A2A'
                : 'var(--color-olive)'

    const fechaLabel = new Date(evento.fecha_evento + 'T12:00:00').toLocaleDateString('es-AR', {
        day: 'numeric', month: 'short', year: 'numeric',
    })

    const clientUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/evento/${evento.token_acceso}`
        : `/evento/${evento.token_acceso}`

    function handleDelete() {
        startTransition(async () => { await deleteEvento(evento.id) })
    }

    const editHref = href ?? `/eventos/${evento.id}`

    return (
        <div className="card" style={st.card}>
            {/* ── LEFT: main content ───────────────────────────────────────── */}
            <div style={st.left}>
                {/* Row 1: fecha + días · badge tipo */}
                <div style={st.topRow}>
                    <div style={st.topLeft}>
                        <span style={{ color: diasColor, fontSize: '0.72rem', fontWeight: 500 }}>
                            {fechaLabel}
                            <span style={{ color: 'var(--color-text-muted)', margin: '0 0.3rem' }}>·</span>
                            <strong>{diasLabel}</strong>
                        </span>
                        <Link href={editHref} style={st.nombre}>{evento.nombre}</Link>
                    </div>
                    <span style={{ ...st.tipoBadge, backgroundColor: tipoColor + '18', color: tipoColor, borderColor: tipoColor + '40' }}>
                        {tipoLabel}
                    </span>
                </div>

                {/* Row 2: segmented bar + planner */}
                <div style={st.midRow}>
                    <div style={st.barWrap}>
                        {evento.fases.length > 0 ? (
                            <>
                                <div style={{ display: 'flex', gap: '3px', height: '5px', marginBottom: '4px' }}>
                                    {evento.fases.map((f, i) => {
                                        const pct = f.total === 0 ? 0 : Math.round((f.completadas / f.total) * 100)
                                        const bg = f.total === 0
                                            ? 'var(--color-cream-dark)'
                                            : pct === 100 ? 'var(--color-olive)'
                                                : pct > 0 ? 'var(--color-gold)'
                                                    : 'var(--color-cream-dark)'
                                        return (
                                            <div key={i} title={`${f.nombre}: ${pct}%`}
                                                style={{ flex: 1, backgroundColor: 'var(--color-cream-dark)', borderRadius: '99px', overflow: 'hidden', position: 'relative' }}>
                                                <div style={{ position: 'absolute', inset: 0, width: `${pct}%`, backgroundColor: bg, borderRadius: '99px', transition: 'width 0.4s ease' }} />
                                            </div>
                                        )
                                    })}
                                </div>
                                <div style={{ display: 'flex', gap: '3px' }}>
                                    {evento.fases.map((f, i) => (
                                        <div key={i} style={{ flex: 1, minWidth: 0, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.6rem', color: 'var(--color-text-muted)' }}>
                                            {f.nombre}
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div style={st.simpleBar}>
                                <div style={{ ...st.simpleBarFill, width: `${evento.porcentajeAvance}%`, backgroundColor: evento.porcentajeAvance === 100 ? 'var(--color-olive)' : 'var(--color-gold)' }} />
                            </div>
                        )}
                    </div>

                    <div style={st.midRight}>
                        <span style={st.pct}>
                            {evento.porcentajeAvance}%
                            <span style={st.pctCount}> ({evento.tareasCompletadas}/{evento.totalTareas})</span>
                        </span>
                        {evento.plannerNombre && (
                            <span style={st.planner}>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                                </svg>
                                {evento.plannerNombre}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* ── DIVIDER ──────────────────────────────────────────────────── */}
            <div style={st.divider} />

            {/* ── RIGHT: icon buttons stacked vertically ──────────────────── */}
            <div style={st.actions}>
                {/* Link cliente */}
                <CopyIconButton url={clientUrl} />

                {/* Editar */}
                <Link href={editHref} style={st.iconBtn} title="Editar">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                </Link>

                {/* Eliminar */}
                {canDelete && (
                    confirmDelete ? (
                        <div style={st.confirmMini}>
                            <button onClick={handleDelete} disabled={isPending} style={st.confirmYes} title="Confirmar eliminación">
                                {isPending ? '…' : '✓'}
                            </button>
                            <button onClick={() => setConfirmDelete(false)} style={st.confirmNo} title="Cancelar">✕</button>
                        </div>
                    ) : (
                        <button onClick={() => setConfirmDelete(true)} style={{ ...st.iconBtn, color: 'var(--color-error)' }} title="Eliminar">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
                            </svg>
                        </button>
                    )
                )}
            </div>
        </div>
    )
}

// ─── Copy icon button (internal, no text) ─────────────────────────────────────

function CopyIconButton({ url }: { url: string }) {
    const [copied, setCopied] = useState(false)

    async function handleCopy() {
        try { await navigator.clipboard.writeText(url) }
        catch {
            const ta = document.createElement('textarea')
            ta.value = url; document.body.appendChild(ta); ta.select()
            document.execCommand('copy'); document.body.removeChild(ta)
        }
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <button
            onClick={handleCopy}
            style={{ ...st.iconBtn, color: copied ? 'var(--color-olive)' : undefined }}
            title={copied ? '¡Copiado!' : 'Copiar link cliente'}
        >
            {copied ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                </svg>
            ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
            )}
        </button>
    )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const st: Record<string, React.CSSProperties> = {
    card: {
        padding: '1.25rem 1rem 1.25rem 1.5rem',
        display: 'flex',
        flexDirection: 'row',
        gap: '0',
        alignItems: 'stretch',
    },
    // Left content
    left: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem',
        minWidth: 0,
        paddingRight: '1rem',
    },
    topRow: {
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '0.75rem',
    },
    topLeft: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.2rem',
        minWidth: 0,
    },
    nombre: {
        fontFamily: 'var(--font-serif)',
        fontSize: '1.05rem',
        fontWeight: 600,
        color: 'var(--color-text)',
        textDecoration: 'none',
        lineHeight: 1.3,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        maxWidth: '420px',
        display: 'block',
    },
    tipoBadge: {
        display: 'inline-block',
        fontSize: '0.62rem',
        fontWeight: 600,
        letterSpacing: '0.07em',
        textTransform: 'uppercase',
        padding: '0.2rem 0.5rem',
        borderRadius: '20px',
        border: '1px solid',
        whiteSpace: 'nowrap',
        flexShrink: 0,
        alignSelf: 'flex-start',
    },
    midRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
    },
    barWrap: {
        flex: 1,
        minWidth: 0,
    },
    simpleBar: {
        height: '5px',
        backgroundColor: 'var(--color-cream-dark)',
        borderRadius: '99px',
        overflow: 'hidden',
    },
    simpleBarFill: {
        height: '100%',
        borderRadius: '99px',
        transition: 'width 0.4s ease',
    },
    midRight: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '0.15rem',
        flexShrink: 0,
    },
    pct: {
        fontSize: '0.78rem',
        fontWeight: 600,
        color: 'var(--color-text)',
        whiteSpace: 'nowrap',
    },
    pctCount: {
        fontWeight: 400,
        color: 'var(--color-text-muted)',
        fontSize: '0.7rem',
    },
    planner: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.2rem',
        fontSize: '0.7rem',
        color: 'var(--color-text-muted)',
        whiteSpace: 'nowrap',
    },
    // Divider
    divider: {
        width: '1px',
        backgroundColor: 'var(--color-border)',
        alignSelf: 'stretch',
        flexShrink: 0,
    },
    // Right actions
    actions: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-evenly',
        gap: '0.25rem',
        paddingLeft: '0.85rem',
        flexShrink: 0,
    },
    iconBtn: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: 'var(--color-text-muted)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0.4rem',
        borderRadius: 'var(--radius-sm)',
        transition: 'background 0.15s, color 0.15s',
        textDecoration: 'none',
    },
    confirmMini: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.2rem',
        alignItems: 'center',
    },
    confirmYes: {
        fontSize: '0.7rem',
        width: '24px',
        height: '24px',
        backgroundColor: 'var(--color-error)',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontFamily: 'var(--font-sans)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmNo: {
        fontSize: '0.7rem',
        width: '24px',
        height: '24px',
        backgroundColor: 'transparent',
        color: 'var(--color-text-muted)',
        border: '1px solid var(--color-border)',
        borderRadius: '4px',
        cursor: 'pointer',
        fontFamily: 'var(--font-sans)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
}

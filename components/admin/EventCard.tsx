'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { CopyLinkButton } from './CopyLinkButton'
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
}

const TIPO_LABELS: Record<string, string> = {
    boda: 'Boda',
    quince: 'Quinceañera',
    cumple: 'Cumpleaños',
    baby_shower: 'Baby Shower',
}

const TIPO_COLORS: Record<string, string> = {
    boda: '#C9A84C',
    quince: '#8A6DAE',
    cumple: '#4C8AC9',
    baby_shower: '#C96B8A',
}

interface EventCardProps {
    evento: EventoConStats
}

export function EventCard({ evento }: EventCardProps) {
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [isPending, startTransition] = useTransition()

    const tipoColor = TIPO_COLORS[evento.tipo_evento] ?? 'var(--color-gold)'
    const tipoLabel = TIPO_LABELS[evento.tipo_evento] ?? evento.tipo_evento

    const diasLabel =
        evento.diasRestantes < 0
            ? `Hace ${Math.abs(evento.diasRestantes)} días`
            : evento.diasRestantes === 0
                ? '¡Hoy!'
                : `${evento.diasRestantes} días`

    const diasColor =
        evento.diasRestantes < 0
            ? 'var(--color-error)'
            : evento.diasRestantes <= 30
                ? '#C97A2A'
                : 'var(--color-olive)'

    function handleDelete() {
        startTransition(async () => {
            await deleteEvento(evento.id)
        })
    }

    return (
        <div className="card" style={styles.card}>
            {/* Top row */}
            <div style={styles.topRow}>
                <div style={styles.titleGroup}>
                    <span
                        style={{
                            ...styles.tipoBadge,
                            backgroundColor: tipoColor + '18',
                            color: tipoColor,
                            borderColor: tipoColor + '40',
                        }}
                    >
                        {tipoLabel}
                    </span>
                    <Link href={`/eventos/${evento.id}`} style={styles.nombre}>
                        {evento.nombre}
                    </Link>
                </div>

                <div style={{ ...styles.diasBadge, color: diasColor }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    {new Date(evento.fecha_evento + 'T12:00:00').toLocaleDateString('es-AR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                    })}
                    &nbsp;·&nbsp;
                    <strong>{diasLabel}</strong>
                </div>
            </div>

            {/* Progress */}
            <div style={styles.progressSection}>
                <div style={styles.progressHeader}>
                    <span style={styles.progressLabel}>Avance</span>
                    <span style={styles.progressValue}>
                        {evento.porcentajeAvance}%
                        <span style={styles.progressCount}>
                            &nbsp;({evento.tareasCompletadas}/{evento.totalTareas} tareas)
                        </span>
                    </span>
                </div>
                <div style={styles.progressBar}>
                    <div
                        style={{
                            ...styles.progressFill,
                            width: `${evento.porcentajeAvance}%`,
                            backgroundColor:
                                evento.porcentajeAvance === 100 ? 'var(--color-olive)' : 'var(--color-gold)',
                        }}
                    />
                </div>
            </div>

            {/* Planner */}
            {evento.plannerNombre && (
                <p style={styles.plannerRow}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                    </svg>
                    {evento.plannerNombre}
                </p>
            )}

            {/* Actions */}
            <div style={styles.actions}>
                <div style={styles.actionsLeft}>
                    <CopyLinkButton token={evento.token_acceso} />
                    <Link href={`/eventos/${evento.id}`} className="btn-ghost" style={styles.editBtn}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        Editar
                    </Link>
                </div>

                <div style={styles.actionsRight}>
                    {confirmDelete ? (
                        <div style={styles.confirmRow}>
                            <span style={styles.confirmText}>¿Eliminar?</span>
                            <button
                                onClick={handleDelete}
                                disabled={isPending}
                                style={styles.confirmYes}
                            >
                                {isPending ? 'Eliminando…' : 'Sí, eliminar'}
                            </button>
                            <button
                                onClick={() => setConfirmDelete(false)}
                                style={styles.confirmNo}
                            >
                                Cancelar
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setConfirmDelete(true)}
                            className="btn-ghost"
                            style={styles.deleteBtn}
                        >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6l-1 14H6L5 6" />
                                <path d="M10 11v6M14 11v6" />
                                <path d="M9 6V4h6v2" />
                            </svg>
                            Eliminar
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

const styles: Record<string, React.CSSProperties> = {
    card: {
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        transition: 'box-shadow 0.2s ease',
    },
    topRow: {
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '1rem',
        flexWrap: 'wrap',
    },
    titleGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.4rem',
    },
    tipoBadge: {
        display: 'inline-block',
        fontSize: '0.68rem',
        fontWeight: 600,
        letterSpacing: '0.07em',
        textTransform: 'uppercase',
        padding: '0.2rem 0.55rem',
        borderRadius: '20px',
        border: '1px solid',
        width: 'fit-content',
    },
    nombre: {
        fontFamily: 'var(--font-serif)',
        fontSize: '1.15rem',
        fontWeight: 600,
        color: 'var(--color-text)',
        textDecoration: 'none',
        lineHeight: 1.3,
    },
    diasBadge: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.3rem',
        fontSize: '0.8rem',
        whiteSpace: 'nowrap',
        flexShrink: 0,
    },
    progressSection: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.4rem',
    },
    progressHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    progressLabel: {
        fontSize: '0.75rem',
        fontWeight: 500,
        color: 'var(--color-text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
    },
    progressValue: {
        fontSize: '0.8rem',
        fontWeight: 600,
        color: 'var(--color-text)',
    },
    progressCount: {
        fontWeight: 400,
        color: 'var(--color-text-muted)',
    },
    progressBar: {
        height: '6px',
        backgroundColor: 'var(--color-cream-dark)',
        borderRadius: '99px',
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: '99px',
        transition: 'width 0.4s ease',
    },
    plannerRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.35rem',
        fontSize: '0.8rem',
        color: 'var(--color-text-muted)',
    },
    actions: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: '0.5rem',
        borderTop: '1px solid var(--color-border)',
        flexWrap: 'wrap',
        gap: '0.5rem',
    },
    actionsLeft: {
        display: 'flex',
        gap: '0.5rem',
        alignItems: 'center',
    },
    actionsRight: {
        display: 'flex',
        alignItems: 'center',
    },
    editBtn: {
        fontSize: '0.78rem',
        padding: '0.35rem 0.75rem',
        gap: '0.35rem',
    },
    deleteBtn: {
        fontSize: '0.78rem',
        padding: '0.35rem 0.75rem',
        gap: '0.35rem',
        color: 'var(--color-error)',
        borderColor: 'rgba(200,75,75,0.25)',
    },
    confirmRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
    },
    confirmText: {
        fontSize: '0.8rem',
        color: 'var(--color-error)',
        fontWeight: 500,
    },
    confirmYes: {
        fontSize: '0.78rem',
        padding: '0.3rem 0.75rem',
        backgroundColor: 'var(--color-error)',
        color: 'white',
        border: 'none',
        borderRadius: 'var(--radius-sm)',
        cursor: 'pointer',
        fontFamily: 'var(--font-sans)',
    },
    confirmNo: {
        fontSize: '0.78rem',
        padding: '0.3rem 0.75rem',
        backgroundColor: 'transparent',
        color: 'var(--color-text-muted)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-sm)',
        cursor: 'pointer',
        fontFamily: 'var(--font-sans)',
    },
}

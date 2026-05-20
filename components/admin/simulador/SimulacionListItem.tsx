'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { deleteSimulacion } from '@/app/(admin)/simulador/actions'

interface Props {
    simulacion: {
        id: string
        nombre: string
        updated_at: string
        cantVariantes: number
        totalMin: number
        totalMax: number
        invitadosMin: number
        invitadosMax: number
    }
}

export function SimulacionListItem({ simulacion: s }: Props) {
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [isPending, startTransition] = useTransition()

    const fmt = (n: number) => 'USD ' + Math.round(n).toLocaleString('es-AR')
    const updatedDate = new Date(s.updated_at)
    const updatedLabel = updatedDate.toLocaleDateString('es-AR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    })

    const totalLabel =
        s.cantVariantes === 0
            ? '—'
            : s.totalMin === s.totalMax
                ? fmt(s.totalMin)
                : `${fmt(s.totalMin)} — ${fmt(s.totalMax)}`

    const invitadosLabel =
        s.invitadosMin === s.invitadosMax
            ? `${s.invitadosMin} invitados`
            : `${s.invitadosMin}–${s.invitadosMax} invitados`

    return (
        <div className="card" style={styles.row}>
            <Link href={`/simulador/${s.id}`} style={styles.link}>
                <div style={styles.main}>
                    <span style={styles.nombre}>{s.nombre}</span>
                    <span style={styles.meta}>
                        {s.cantVariantes} variante{s.cantVariantes !== 1 ? 's' : ''} · {invitadosLabel} · actualizado {updatedLabel}
                    </span>
                </div>
                <div style={styles.totalBlock}>
                    <span style={styles.total}>{totalLabel}</span>
                    <span style={styles.perGuest}>
                        {s.cantVariantes > 1 ? 'rango entre variantes' : 'total'}
                    </span>
                </div>
            </Link>
            <div style={styles.actions}>
                {confirmDelete ? (
                    <>
                        <button
                            type="button"
                            onClick={() => setConfirmDelete(false)}
                            className="btn-ghost"
                            style={styles.actionBtn}
                            disabled={isPending}
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={() =>
                                startTransition(async () => {
                                    await deleteSimulacion(s.id)
                                    setConfirmDelete(false)
                                })
                            }
                            style={{ ...styles.actionBtn, ...styles.deleteBtn }}
                            disabled={isPending}
                        >
                            {isPending ? '…' : 'Borrar'}
                        </button>
                    </>
                ) : (
                    <button
                        type="button"
                        onClick={() => setConfirmDelete(true)}
                        className="btn-ghost"
                        style={styles.actionBtn}
                        aria-label="Borrar simulación"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
                            <path d="M10 11v6M14 11v6" />
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                        </svg>
                    </button>
                )}
            </div>
        </div>
    )
}

const styles: Record<string, React.CSSProperties> = {
    row: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.85rem 1rem',
    },
    link: {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        minWidth: 0,
        textDecoration: 'none',
        color: 'inherit',
    },
    main: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.2rem',
        minWidth: 0,
    },
    nombre: {
        fontSize: '0.95rem',
        fontWeight: 600,
        color: 'var(--color-text)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    meta: {
        fontSize: '0.75rem',
        color: 'var(--color-text-muted)',
        fontFamily: 'var(--font-mono, monospace)',
    },
    totalBlock: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '0.15rem',
        flexShrink: 0,
    },
    total: {
        fontSize: '0.95rem',
        fontWeight: 600,
        color: 'var(--color-text)',
        fontVariantNumeric: 'tabular-nums',
    },
    perGuest: {
        fontSize: '0.65rem',
        color: 'var(--color-text-muted)',
        fontFamily: 'var(--font-mono, monospace)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
    },
    actions: {
        display: 'flex',
        gap: '0.4rem',
        paddingLeft: '0.5rem',
        borderLeft: '1px solid var(--color-border)',
    },
    actionBtn: {
        fontSize: '0.8rem',
        padding: '0.4rem 0.7rem',
    },
    deleteBtn: {
        background: 'var(--color-error)',
        color: 'white',
        border: 'none',
        borderRadius: 'var(--radius-sm)',
        cursor: 'pointer',
        fontWeight: 500,
    },
}

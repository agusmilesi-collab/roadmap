'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createEvento } from '@/app/(admin)/eventos/nuevo/actions'
import type { Planner, TipoEvento } from '@/lib/types'

interface NuevoEventoFormProps {
    planners: Planner[]
}

const TIPOS: { value: TipoEvento; label: string }[] = [
    { value: 'boda', label: 'Boda' },
    { value: 'quince', label: 'Quinceañera' },
    { value: 'cumple', label: 'Cumpleaños' },
    { value: 'baby_shower', label: 'Baby Shower' },
]

export function NuevoEventoForm({ planners }: NuevoEventoFormProps) {
    const [isPending, startTransition] = useTransition()
    const router = useRouter()

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        startTransition(async () => {
            await createEvento(formData)
        })
    }

    return (
        <form onSubmit={handleSubmit} style={styles.form} noValidate>
            {/* Nombre */}
            <div className="form-group">
                <label htmlFor="nombre" className="form-label">
                    Nombre del evento
                </label>
                <input
                    id="nombre"
                    name="nombre"
                    type="text"
                    className="form-input"
                    placeholder="Boda de Ana y Martín"
                    required
                />
            </div>

            {/* Tipo */}
            <div className="form-group">
                <label htmlFor="tipo_evento" className="form-label">
                    Tipo de evento
                </label>
                <select
                    id="tipo_evento"
                    name="tipo_evento"
                    className="form-input"
                    required
                    style={styles.select}
                >
                    <option value="">— Seleccioná un tipo —</option>
                    {TIPOS.map((t) => (
                        <option key={t.value} value={t.value}>
                            {t.label}
                        </option>
                    ))}
                </select>
            </div>

            {/* Fecha */}
            <div className="form-group">
                <label htmlFor="fecha_evento" className="form-label">
                    Fecha del evento
                </label>
                <input
                    id="fecha_evento"
                    name="fecha_evento"
                    type="date"
                    className="form-input"
                    required
                />
            </div>

            {/* Presupuesto + Tipo de cambio */}
            <div style={styles.row}>
                <div className="form-group" style={{ flex: 1 }}>
                    <label htmlFor="presupuesto_usd" className="form-label">
                        Presupuesto (USD)
                    </label>
                    <input
                        id="presupuesto_usd"
                        name="presupuesto_usd"
                        type="number"
                        min="0"
                        step="100"
                        className="form-input"
                        placeholder="15000"
                    />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                    <label htmlFor="tipo_cambio" className="form-label">
                        Tipo de cambio (ARS)
                    </label>
                    <input
                        id="tipo_cambio"
                        name="tipo_cambio"
                        type="number"
                        min="0"
                        step="10"
                        className="form-input"
                        placeholder="1150"
                    />
                </div>
            </div>

            {/* Planner */}
            <div className="form-group">
                <label htmlFor="planner_id" className="form-label">
                    Planner asignado
                </label>
                <select
                    id="planner_id"
                    name="planner_id"
                    className="form-input"
                    style={styles.select}
                >
                    <option value="">— Sin planner asignado —</option>
                    {planners.map((p) => (
                        <option key={p.id} value={p.id}>
                            {p.nombre}
                        </option>
                    ))}
                </select>
            </div>

            {/* Actions */}
            <div style={styles.formActions}>
                <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => router.back()}
                    disabled={isPending}
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    className="btn-gold"
                    style={styles.submitBtn}
                    disabled={isPending}
                >
                    {isPending ? (
                        <>
                            <span style={styles.spinner} aria-hidden="true" />
                            Creando evento…
                        </>
                    ) : (
                        <>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                            Crear evento
                        </>
                    )}
                </button>
            </div>
        </form>
    )
}

const styles: Record<string, React.CSSProperties> = {
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
    },
    select: {
        cursor: 'pointer',
        appearance: 'auto',
    },
    row: {
        display: 'flex',
        gap: '1rem',
        flexWrap: 'wrap',
    },
    formActions: {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '0.75rem',
        paddingTop: '0.5rem',
        borderTop: '1px solid var(--color-border)',
    },
    submitBtn: {
        paddingInline: '2rem',
        gap: '0.45rem',
    },
    spinner: {
        display: 'inline-block',
        width: '13px',
        height: '13px',
        border: '2px solid rgba(255,255,255,0.3)',
        borderTopColor: 'white',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
    },
}

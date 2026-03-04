'use client'

import { useState, useTransition } from 'react'
import { createPlanner, updatePlanner, deletePlanner } from '@/app/(admin)/planners/actions'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Planner {
    id: string
    nombre: string
    email: string | null
    telefono: string | null
    bio_corta: string | null
    foto_url: string | null
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PlannersClient({ planners: initial }: { planners: Planner[] }) {
    const [planners, setPlanners] = useState(initial)
    const [showNewForm, setShowNewForm] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()

    function handleCreated() {
        setShowNewForm(false)
        window.location.reload()
    }

    function handleUpdated() {
        setEditingId(null)
        window.location.reload()
    }

    return (
        <div style={st.wrapper}>
            {error && <div className="alert-error">{error}</div>}

            {/* New planner form */}
            {showNewForm && (
                <div className="card" style={st.formCard}>
                    <h3 style={st.formTitle}>Nuevo planner</h3>
                    <PlannerForm
                        onSubmit={async (fd) => {
                            setError(null)
                            const res = await createPlanner(fd)
                            if (res?.error) setError(res.error)
                            else handleCreated()
                        }}
                        onCancel={() => setShowNewForm(false)}
                    />
                </div>
            )}

            {/* Planners list */}
            {planners.length === 0 && !showNewForm && (
                <div className="card" style={st.empty}>
                    <div style={{ fontSize: '2.5rem' }}>👤</div>
                    <p style={st.emptyText}>No hay planners creados aún.<br />Agregá el primero para asignarlo a eventos.</p>
                </div>
            )}

            <div style={st.list}>
                {planners.map((p) => (
                    <div key={p.id}>
                        {editingId === p.id ? (
                            <div className="card" style={st.formCard}>
                                <h3 style={st.formTitle}>Editar planner</h3>
                                <PlannerForm
                                    planner={p}
                                    onSubmit={async (fd) => {
                                        setError(null)
                                        const res = await updatePlanner(p.id, fd)
                                        if (res?.error) setError(res.error)
                                        else handleUpdated()
                                    }}
                                    onCancel={() => setEditingId(null)}
                                />
                            </div>
                        ) : (
                            <PlannerCard
                                planner={p}
                                onEdit={() => setEditingId(p.id)}
                                onDelete={() => {
                                    startTransition(async () => {
                                        const res = await deletePlanner(p.id)
                                        if (res?.error) setError(res.error)
                                        else setPlanners((prev) => prev.filter((x) => x.id !== p.id))
                                    })
                                }}
                                isDeleting={isPending}
                            />
                        )}
                    </div>
                ))}
            </div>

            {/* Add button */}
            {!showNewForm && (
                <button
                    className="btn-gold"
                    onClick={() => setShowNewForm(true)}
                    style={{ alignSelf: 'flex-start' }}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Nuevo planner
                </button>
            )}
        </div>
    )
}

// ─── PlannerCard ────────────────────────────────────────────────────────────

function PlannerCard({
    planner: p,
    onEdit,
    onDelete,
    isDeleting,
}: {
    planner: Planner
    onEdit: () => void
    onDelete: () => void
    isDeleting: boolean
}) {
    const initials = p.nombre
        .split(' ')
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase()

    return (
        <div className="card" style={st.plannerCard}>
            {/* Avatar */}
            {p.foto_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.foto_url} alt={p.nombre} style={st.avatar} />
            ) : (
                <div style={st.avatarFallback}>{initials}</div>
            )}

            {/* Info */}
            <div style={st.info}>
                <p style={st.nombre}>{p.nombre}</p>
                {p.email && <p style={st.detail}>✉ {p.email}</p>}
                {p.telefono && <p style={st.detail}>📞 {p.telefono}</p>}
                {p.bio_corta && <p style={st.bio}>{p.bio_corta}</p>}
            </div>

            {/* Actions */}
            <div style={st.actions}>
                <button className="btn-ghost" onClick={onEdit} style={st.actionBtn}>
                    Editar
                </button>
                <button
                    className="btn-ghost"
                    onClick={onDelete}
                    disabled={isDeleting}
                    style={{ ...st.actionBtn, color: 'var(--color-error)', borderColor: 'rgba(200,75,75,0.2)' }}
                >
                    Eliminar
                </button>
            </div>
        </div>
    )
}

// ─── PlannerForm ─────────────────────────────────────────────────────────────

function PlannerForm({
    planner,
    onSubmit,
    onCancel,
}: {
    planner?: Planner
    onSubmit: (fd: FormData) => Promise<void>
    onCancel: () => void
}) {
    const [isPending, startTransition] = useTransition()

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        startTransition(() => onSubmit(fd))
    }

    return (
        <form onSubmit={handleSubmit} style={st.form}>
            <div style={st.formGrid}>
                <div className="form-group">
                    <label className="form-label">Nombre *</label>
                    <input name="nombre" className="form-input" defaultValue={planner?.nombre} required placeholder="Ej: María García" />
                </div>
                <div className="form-group">
                    <label className="form-label">Email</label>
                    <input name="email" type="email" className="form-input" defaultValue={planner?.email ?? ''} placeholder="maria@example.com" />
                </div>
                <div className="form-group">
                    <label className="form-label">Teléfono</label>
                    <input name="telefono" className="form-input" defaultValue={planner?.telefono ?? ''} placeholder="+54 911 xxxx-xxxx" />
                </div>
                <div className="form-group">
                    <label className="form-label">URL de foto</label>
                    <input name="foto_url" className="form-input" defaultValue={planner?.foto_url ?? ''} placeholder="https://..." />
                </div>
            </div>
            <div className="form-group">
                <label className="form-label">Bio corta</label>
                <textarea
                    name="bio_corta"
                    className="form-input"
                    rows={2}
                    defaultValue={planner?.bio_corta ?? ''}
                    placeholder="Breve descripción del planner..."
                    style={{ resize: 'vertical' }}
                />
            </div>
            <div style={st.formBtns}>
                <button type="button" className="btn-ghost" onClick={onCancel} disabled={isPending}>
                    Cancelar
                </button>
                <button type="submit" className="btn-gold" disabled={isPending}>
                    {isPending ? 'Guardando...' : planner ? 'Guardar cambios' : 'Crear planner'}
                </button>
            </div>
        </form>
    )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const st: Record<string, React.CSSProperties> = {
    wrapper: { display: 'flex', flexDirection: 'column', gap: '1rem' },
    list: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
    plannerCard: { padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' },
    avatar: { width: '52px', height: '52px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--color-border)', flexShrink: 0 },
    avatarFallback: { width: '52px', height: '52px', borderRadius: '50%', backgroundColor: 'var(--color-gold)', color: 'white', fontFamily: 'var(--font-serif)', fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    info: { flex: 1, display: 'flex', flexDirection: 'column', gap: '0.2rem' },
    nombre: { fontFamily: 'var(--font-serif)', fontSize: '1.05rem', fontWeight: 600, color: 'var(--color-text)' },
    detail: { fontSize: '0.8rem', color: 'var(--color-text-muted)' },
    bio: { fontSize: '0.8rem', color: 'var(--color-text-muted)', fontStyle: 'italic', marginTop: '0.1rem' },
    actions: { display: 'flex', gap: '0.5rem', flexShrink: 0 },
    actionBtn: { fontSize: '0.75rem', padding: '0.35rem 0.75rem' },
    formCard: { padding: '1.5rem' },
    formTitle: { fontFamily: 'var(--font-serif)', fontSize: '1.1rem', fontWeight: 500, marginBottom: '1rem', color: 'var(--color-text)' },
    form: { display: 'flex', flexDirection: 'column', gap: '1rem' },
    formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' },
    formBtns: { display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' },
    empty: { padding: '2.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' },
    emptyText: { fontSize: '0.9rem', color: 'var(--color-text-muted)', lineHeight: 1.6 },
}

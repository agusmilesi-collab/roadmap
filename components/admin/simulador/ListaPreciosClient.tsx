'use client'

import { useState, useTransition, useEffect } from 'react'
import {
    DragDropContext,
    Droppable,
    Draggable,
    type DropResult,
    type DraggableProvidedDragHandleProps,
} from '@hello-pangea/dnd'
import {
    createRubro,
    updateRubro,
    deleteRubro,
    reorderRubros,
    createProveedor,
    updateProveedor,
    deleteProveedor,
} from '@/app/(admin)/simulador/precios/actions'

// ─── Tipos ──────────────────────────────────────────────────────────────────

interface Proveedor {
    id: string
    nombre: string
    precio: number
    descripcion: string | null
    orden: number
}

interface Rubro {
    id: string
    nombre: string
    tipo: 'fijo' | 'var'
    opcional: boolean
    orden: number
    proveedores: Proveedor[]
}

interface Props {
    rubros: Rubro[]
}

// ─── Parent ─────────────────────────────────────────────────────────────────

export function ListaPreciosClient({ rubros: initialRubros }: Props) {
    const [creating, setCreating] = useState(false)
    const [rubros, setRubros] = useState(initialRubros)
    const [expanded, setExpanded] = useState<Record<string, boolean>>({})

    // Sincronizar cuando llegan rubros nuevos del server (post-revalidate)
    useEffect(() => {
        setRubros(initialRubros)
    }, [initialRubros])

    const toggleExpanded = (id: string) => {
        setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
    }

    const handleDragEnd = (result: DropResult) => {
        if (!result.destination) return
        const from = result.source.index
        const to = result.destination.index
        if (from === to) return

        // Optimistic update
        const next = Array.from(rubros)
        const [moved] = next.splice(from, 1)
        next.splice(to, 0, moved)
        setRubros(next)

        // Persistir
        reorderRubros(next.map((r) => r.id)).catch(() => {
            // Rollback si falla
            setRubros(rubros)
        })
    }

    return (
        <div style={styles.list}>
            <div style={styles.topActions}>
                {!creating ? (
                    <button
                        type="button"
                        onClick={() => setCreating(true)}
                        className="btn-gold"
                        style={styles.addBtn}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Nuevo rubro
                    </button>
                ) : (
                    <NewRubroForm onClose={() => setCreating(false)} />
                )}
            </div>

            {rubros.length === 0 ? (
                <div className="card" style={styles.empty}>
                    <p>No hay rubros cargados.</p>
                </div>
            ) : (
                <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="rubros-list" type="RUBRO">
                        {(droppableProvided) => (
                            <div
                                ref={droppableProvided.innerRef}
                                {...droppableProvided.droppableProps}
                                style={styles.dndList}
                            >
                                {rubros.map((r, index) => (
                                    <Draggable key={r.id} draggableId={r.id} index={index}>
                                        {(draggableProvided, snapshot) => (
                                            <div
                                                ref={draggableProvided.innerRef}
                                                {...draggableProvided.draggableProps}
                                                style={{
                                                    ...draggableProvided.draggableProps.style,
                                                    boxShadow: snapshot.isDragging ? 'var(--shadow-md)' : undefined,
                                                }}
                                            >
                                                <RubroCard
                                                    rubro={r}
                                                    expanded={!!expanded[r.id]}
                                                    onToggle={() => toggleExpanded(r.id)}
                                                    dragHandleProps={draggableProvided.dragHandleProps}
                                                />
                                            </div>
                                        )}
                                    </Draggable>
                                ))}
                                {droppableProvided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>
            )}
        </div>
    )
}

// ─── Crear rubro ────────────────────────────────────────────────────────────

function NewRubroForm({ onClose }: { onClose: () => void }) {
    const [tipo, setTipo] = useState<'fijo' | 'var'>('fijo')
    const [opcional, setOpcional] = useState(false)

    return (
        <form
            action={async (fd) => {
                await createRubro(fd)
                onClose()
            }}
            style={styles.newRubroForm}
        >
            <input
                type="text"
                name="nombre"
                placeholder="Nombre del rubro"
                required
                autoFocus
                style={styles.input}
            />
            <select
                name="tipo"
                value={tipo}
                onChange={(e) => setTipo(e.target.value as 'fijo' | 'var')}
                style={styles.select}
            >
                <option value="fijo">Fijo</option>
                <option value="var">Por invitado</option>
            </select>
            <label style={styles.checkboxLabel}>
                <input
                    type="checkbox"
                    name="opcional"
                    checked={opcional}
                    onChange={(e) => setOpcional(e.target.checked)}
                />
                Opcional
            </label>
            <button type="button" onClick={onClose} className="btn-ghost" style={styles.smallBtn}>
                Cancelar
            </button>
            <button type="submit" className="btn-gold" style={styles.smallBtn}>
                Crear
            </button>
        </form>
    )
}

// ─── Card por rubro ─────────────────────────────────────────────────────────

function RubroCard({
    rubro,
    expanded,
    onToggle,
    dragHandleProps,
}: {
    rubro: Rubro
    expanded: boolean
    onToggle: () => void
    dragHandleProps: DraggableProvidedDragHandleProps | null | undefined
}) {
    const [editing, setEditing] = useState(false)
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [addingProv, setAddingProv] = useState(false)
    const [isPending, startTransition] = useTransition()

    const [nombre, setNombre] = useState(rubro.nombre)
    const [tipo, setTipo] = useState(rubro.tipo)
    const [opcional, setOpcional] = useState(rubro.opcional)

    const handleSave = () => {
        startTransition(async () => {
            await updateRubro(rubro.id, { nombre, tipo, opcional, orden: rubro.orden })
            setEditing(false)
        })
    }
    const handleCancel = () => {
        setNombre(rubro.nombre)
        setTipo(rubro.tipo)
        setOpcional(rubro.opcional)
        setEditing(false)
    }
    const handleDelete = () => {
        startTransition(async () => {
            await deleteRubro(rubro.id)
        })
    }

    return (
        <div className="card" style={styles.rubroCard}>
            <div style={styles.rubroHeader}>
                <div
                    {...dragHandleProps}
                    style={styles.dragHandle}
                    aria-label="Arrastrar para reordenar"
                    title="Arrastrar"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="9" cy="6" r="1.2" />
                        <circle cx="9" cy="12" r="1.2" />
                        <circle cx="9" cy="18" r="1.2" />
                        <circle cx="15" cy="6" r="1.2" />
                        <circle cx="15" cy="12" r="1.2" />
                        <circle cx="15" cy="18" r="1.2" />
                    </svg>
                </div>

                {editing ? (
                    <div style={styles.rubroEditRow}>
                        <input
                            type="text"
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            style={{ ...styles.input, flex: 1, minWidth: 140 }}
                        />
                        <select
                            value={tipo}
                            onChange={(e) => setTipo(e.target.value as 'fijo' | 'var')}
                            style={styles.select}
                        >
                            <option value="fijo">Fijo</option>
                            <option value="var">Por invitado</option>
                        </select>
                        <label style={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                checked={opcional}
                                onChange={(e) => setOpcional(e.target.checked)}
                            />
                            Opcional
                        </label>
                        <button
                            type="button"
                            onClick={handleCancel}
                            className="btn-ghost"
                            style={styles.smallBtn}
                            disabled={isPending}
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            className="btn-gold"
                            style={styles.smallBtn}
                            disabled={isPending || !nombre.trim()}
                        >
                            {isPending ? '…' : 'Guardar'}
                        </button>
                    </div>
                ) : (
                    <>
                        <button
                            type="button"
                            onClick={onToggle}
                            style={styles.toggleBtn}
                            aria-label={expanded ? 'Contraer' : 'Expandir'}
                            aria-expanded={expanded}
                        >
                            <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                style={{
                                    transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                    transition: 'transform 0.15s',
                                }}
                            >
                                <polyline points="9 18 15 12 9 6" />
                            </svg>
                        </button>
                        <button
                            type="button"
                            onClick={onToggle}
                            style={styles.rubroNameBtn}
                        >
                            <span style={styles.rubroName}>{rubro.nombre}</span>
                            <span style={styles.rubroBadge}>
                                {rubro.tipo === 'var' ? 'Por invitado' : 'Fijo'}
                            </span>
                            {rubro.opcional && (
                                <span style={{ ...styles.rubroBadge, ...styles.rubroBadgeOpcional }}>
                                    Opcional
                                </span>
                            )}
                            <span style={styles.rubroCount}>
                                {rubro.proveedores.length} proveedor
                                {rubro.proveedores.length !== 1 ? 'es' : ''}
                            </span>
                        </button>
                        <div style={styles.rubroActions}>
                            {confirmDelete ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => setConfirmDelete(false)}
                                        className="btn-ghost"
                                        style={styles.smallBtn}
                                        disabled={isPending}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleDelete}
                                        style={{ ...styles.smallBtn, ...styles.deleteBtn }}
                                        disabled={isPending}
                                    >
                                        {isPending ? '…' : 'Borrar'}
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => setEditing(true)}
                                        className="btn-ghost"
                                        style={styles.smallBtn}
                                    >
                                        Editar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setConfirmDelete(true)}
                                        className="btn-ghost"
                                        style={styles.smallBtn}
                                    >
                                        Borrar
                                    </button>
                                </>
                            )}
                        </div>
                    </>
                )}
            </div>

            {expanded && !editing && (
                <div style={styles.proveedores}>
                    {rubro.proveedores.map((p) => (
                        <ProveedorRow key={p.id} proveedor={p} tipo={rubro.tipo} />
                    ))}

                    {addingProv ? (
                        <NewProveedorForm rubroId={rubro.id} tipo={rubro.tipo} onClose={() => setAddingProv(false)} />
                    ) : (
                        <button
                            type="button"
                            onClick={() => setAddingProv(true)}
                            style={styles.addProvBtn}
                        >
                            + Agregar proveedor
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}

// ─── Crear proveedor ────────────────────────────────────────────────────────

function NewProveedorForm({
    rubroId,
    tipo,
    onClose,
}: {
    rubroId: string
    tipo: 'fijo' | 'var'
    onClose: () => void
}) {
    return (
        <form
            action={async (fd) => {
                await createProveedor(fd)
                onClose()
            }}
            style={styles.newProvForm}
        >
            <input type="hidden" name="rubro_id" value={rubroId} />
            <input
                type="text"
                name="nombre"
                placeholder="Nombre del proveedor"
                required
                autoFocus
                style={{ ...styles.input, flex: 1, minWidth: 160 }}
            />
            <div style={styles.precioWrap}>
                <input
                    type="number"
                    name="precio"
                    placeholder="0"
                    required
                    min={0}
                    step="0.01"
                    style={{ ...styles.input, width: 110 }}
                />
                <span style={styles.precioUnit}>{tipo === 'var' ? 'USD/inv.' : 'USD'}</span>
            </div>
            <input
                type="text"
                name="descripcion"
                placeholder="Descripción (opcional)"
                style={{ ...styles.input, flex: 2, minWidth: 180 }}
            />
            <button type="button" onClick={onClose} className="btn-ghost" style={styles.smallBtn}>
                Cancelar
            </button>
            <button type="submit" className="btn-gold" style={styles.smallBtn}>
                Crear
            </button>
        </form>
    )
}

// ─── Fila de proveedor ──────────────────────────────────────────────────────

function ProveedorRow({ proveedor: p, tipo }: { proveedor: Proveedor; tipo: 'fijo' | 'var' }) {
    const [editing, setEditing] = useState(false)
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [isPending, startTransition] = useTransition()

    const [nombre, setNombre] = useState(p.nombre)
    const [precio, setPrecio] = useState(p.precio)
    const [descripcion, setDescripcion] = useState(p.descripcion ?? '')

    const handleSave = () => {
        startTransition(async () => {
            await updateProveedor(p.id, {
                nombre,
                precio,
                descripcion: descripcion.trim() || null,
                orden: p.orden,
            })
            setEditing(false)
        })
    }
    const handleCancel = () => {
        setNombre(p.nombre)
        setPrecio(p.precio)
        setDescripcion(p.descripcion ?? '')
        setEditing(false)
    }
    const handleDelete = () => {
        startTransition(async () => {
            await deleteProveedor(p.id)
        })
    }

    if (editing) {
        return (
            <div style={styles.provRowEdit}>
                <input
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    style={{ ...styles.input, flex: 1, minWidth: 140 }}
                />
                <div style={styles.precioWrap}>
                    <input
                        type="number"
                        value={precio}
                        onChange={(e) => setPrecio(Number(e.target.value))}
                        min={0}
                        step="0.01"
                        style={{ ...styles.input, width: 110 }}
                    />
                    <span style={styles.precioUnit}>{tipo === 'var' ? 'USD/inv.' : 'USD'}</span>
                </div>
                <input
                    type="text"
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    placeholder="Descripción"
                    style={{ ...styles.input, flex: 2, minWidth: 160 }}
                />
                <button
                    type="button"
                    onClick={handleCancel}
                    className="btn-ghost"
                    style={styles.smallBtn}
                    disabled={isPending}
                >
                    Cancelar
                </button>
                <button
                    type="button"
                    onClick={handleSave}
                    className="btn-gold"
                    style={styles.smallBtn}
                    disabled={isPending || !nombre.trim()}
                >
                    {isPending ? '…' : 'Guardar'}
                </button>
            </div>
        )
    }

    return (
        <div style={styles.provRow}>
            <span style={styles.provName}>{p.nombre}</span>
            <span style={styles.provPrecio}>
                USD {p.precio.toLocaleString('es-AR')}
                {tipo === 'var' ? ' /inv.' : ''}
            </span>
            <span style={styles.provDesc}>
                {p.descripcion ? p.descripcion : <em style={{ color: 'var(--color-text-muted)' }}>Sin descripción</em>}
            </span>
            <div style={styles.provActions}>
                {confirmDelete ? (
                    <>
                        <button
                            type="button"
                            onClick={() => setConfirmDelete(false)}
                            className="btn-ghost"
                            style={styles.smallBtn}
                            disabled={isPending}
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleDelete}
                            style={{ ...styles.smallBtn, ...styles.deleteBtn }}
                            disabled={isPending}
                        >
                            {isPending ? '…' : 'Borrar'}
                        </button>
                    </>
                ) : (
                    <>
                        <button
                            type="button"
                            onClick={() => setEditing(true)}
                            className="btn-ghost"
                            style={styles.smallBtn}
                        >
                            Editar
                        </button>
                        <button
                            type="button"
                            onClick={() => setConfirmDelete(true)}
                            className="btn-ghost"
                            style={styles.smallBtn}
                            aria-label="Borrar proveedor"
                        >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
                            </svg>
                        </button>
                    </>
                )}
            </div>
        </div>
    )
}

// ─── Estilos ────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
    list: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
    },
    dndList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
    },
    topActions: {
        display: 'flex',
        justifyContent: 'flex-end',
    },
    empty: {
        padding: '2rem',
        textAlign: 'center',
        color: 'var(--color-text-muted)',
    },
    addBtn: {
        fontSize: '0.85rem',
        padding: '0.55rem 1.1rem',
        gap: '0.35rem',
    },
    newRubroForm: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        flexWrap: 'wrap',
        padding: '0.85rem 1rem',
        background: 'var(--color-white)',
        border: '1.5px solid var(--color-gold)',
        borderRadius: 'var(--radius-md)',
    },
    rubroCard: {
        padding: 0,
        overflow: 'hidden',
    },
    rubroHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.65rem 1rem 0.65rem 0.5rem',
        background: 'var(--color-cream)',
        borderBottom: '1px solid var(--color-border)',
    },
    dragHandle: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 22,
        height: 22,
        color: 'var(--color-text-muted)',
        cursor: 'grab',
        flexShrink: 0,
        opacity: 0.6,
        transition: 'opacity 0.15s',
    },
    toggleBtn: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 22,
        height: 22,
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        color: 'var(--color-text-muted)',
        flexShrink: 0,
        padding: 0,
    },
    rubroNameBtn: {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        gap: '0.55rem',
        flexWrap: 'wrap',
        minWidth: 0,
        background: 'transparent',
        border: 'none',
        padding: '0.25rem 0',
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: 'inherit',
    },
    rubroName: {
        fontFamily: 'var(--font-serif)',
        fontSize: '1.05rem',
        fontWeight: 600,
        color: 'var(--color-text)',
    },
    rubroBadge: {
        fontFamily: 'var(--font-mono, monospace)',
        fontSize: '0.65rem',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: 'var(--color-text-muted)',
        background: 'var(--color-cream-dark)',
        padding: '0.15rem 0.5rem',
        borderRadius: 'var(--radius-sm)',
        fontWeight: 500,
    },
    rubroBadgeOpcional: {
        background: 'rgba(107, 124, 92, 0.15)',
        color: 'var(--color-olive)',
    },
    rubroCount: {
        fontSize: '0.75rem',
        color: 'var(--color-text-muted)',
        marginLeft: 'auto',
    },
    rubroEditRow: {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        flexWrap: 'wrap',
    },
    rubroActions: {
        display: 'flex',
        gap: '0.35rem',
        flexShrink: 0,
    },
    proveedores: {
        display: 'flex',
        flexDirection: 'column',
    },
    provRow: {
        display: 'grid',
        gridTemplateColumns: 'minmax(120px, 1.2fr) minmax(110px, auto) minmax(140px, 2fr) auto',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.65rem 1.25rem',
        borderBottom: '1px solid var(--color-border)',
        fontSize: '0.85rem',
    },
    provRowEdit: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '0.65rem 1.25rem',
        borderBottom: '1px solid var(--color-border)',
        flexWrap: 'wrap',
        background: 'var(--color-cream)',
    },
    provName: {
        fontWeight: 500,
        color: 'var(--color-text)',
    },
    provPrecio: {
        fontVariantNumeric: 'tabular-nums',
        fontWeight: 500,
        color: 'var(--color-text)',
        fontFamily: 'var(--font-mono, monospace)',
        fontSize: '0.8rem',
    },
    provDesc: {
        color: 'var(--color-text-muted)',
        fontSize: '0.8rem',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    provActions: {
        display: 'flex',
        gap: '0.3rem',
        justifyContent: 'flex-end',
    },
    addProvBtn: {
        padding: '0.65rem 1.25rem',
        background: 'transparent',
        border: 'none',
        textAlign: 'left',
        color: 'var(--color-gold-dark)',
        fontSize: '0.8rem',
        fontWeight: 500,
        cursor: 'pointer',
        fontFamily: 'var(--font-sans)',
    },
    newProvForm: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '0.65rem 1.25rem',
        borderTop: '1px solid var(--color-border)',
        background: 'var(--color-cream)',
        flexWrap: 'wrap',
    },
    precioWrap: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.35rem',
    },
    precioUnit: {
        fontFamily: 'var(--font-mono, monospace)',
        fontSize: '0.7rem',
        color: 'var(--color-text-muted)',
    },
    input: {
        fontFamily: 'var(--font-sans)',
        fontSize: '0.85rem',
        padding: '0.45rem 0.7rem',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-sm)',
        background: 'var(--color-white)',
        outline: 'none',
        color: 'var(--color-text)',
    },
    select: {
        fontFamily: 'var(--font-sans)',
        fontSize: '0.85rem',
        padding: '0.45rem 0.7rem',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-sm)',
        background: 'var(--color-white)',
        outline: 'none',
        color: 'var(--color-text)',
    },
    checkboxLabel: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.35rem',
        fontSize: '0.8rem',
        color: 'var(--color-text-muted)',
    },
    smallBtn: {
        fontSize: '0.75rem',
        padding: '0.4rem 0.75rem',
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

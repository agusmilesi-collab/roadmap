'use client'

import { useState, useTransition } from 'react'
import { DragDropContext, Droppable, Draggable, type DropResult, type DraggableProvidedDragHandleProps } from '@hello-pangea/dnd'
import type { Fase, Tarea, Acuerdo } from './EventoDetailClient'
import {
    createFaseEnPosicion,
    updateFase, deleteFase,
    createTarea, updateTarea, deleteTarea,
    createAcuerdo, deleteAcuerdo,
    reorderFases, reorderTareas,
} from '@/app/(admin)/eventos/[id]/actions'

// ─── Constants ────────────────────────────────────────────────────────────────

const TIPO_ICONS: Record<string, string> = { reunion: '💬', entregable: '📦', decision: '⚡', pago: '💰' }
const TIPO_OPTIONS = [
    { value: 'reunion', label: '💬 Reunión' },
    { value: 'entregable', label: '📦 Entregable' },
    { value: 'decision', label: '⚡ Decisión' },
    { value: 'pago', label: '💰 Pago' },
]
const ESTADO_OPTIONS = [
    { value: 'pendiente', label: 'Pendiente' },
    { value: 'en_curso', label: 'En curso' },
    { value: 'completada', label: 'Completada' },
]
const ESTADO_STYLES: Record<string, React.CSSProperties> = {
    pendiente: { backgroundColor: 'rgba(120,120,120,0.1)', color: '#888' },
    en_curso: { backgroundColor: 'rgba(59,130,246,0.12)', color: '#2563EB' },
    completada: { backgroundColor: 'rgba(34,197,94,0.12)', color: '#16A34A' },
}

const TODAY_ADMIN = new Date()
TODAY_ADMIN.setHours(0, 0, 0, 0)

function isVencida(tarea: Tarea): boolean {
    if (tarea.completada) return false
    if (!tarea.fecha) return false
    return new Date(tarea.fecha + 'T12:00:00') < TODAY_ADMIN
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ProgresoTab({ fases: initialFases, eventoId }: { fases: Fase[]; eventoId: string }) {
    const [fases, setFases] = useState<Fase[]>(initialFases)
    const [expandedTareaId, setExpandedTareaId] = useState<string | null>(null)
    const [addTareaFaseId, setAddTareaFaseId] = useState<string | null>(null)
    const [editingFaseId, setEditingFaseId] = useState<string | null>(null)
    const [showAddFase, setShowAddFase] = useState(false)
    const [, startReorder] = useTransition()

    function handleDragEnd(result: DropResult) {
        const { destination, source, type } = result
        if (!destination) return
        if (destination.droppableId === source.droppableId && destination.index === source.index) return

        if (type === 'FASE') {
            const reordered = Array.from(fases)
            const [moved] = reordered.splice(source.index, 1)
            reordered.splice(destination.index, 0, moved)
            const withOrden = reordered.map((f, i) => ({ ...f, orden: i + 1 }))
            setFases(withOrden)
            startReorder(async () => {
                await reorderFases(eventoId, withOrden.map((f) => ({ id: f.id, orden: f.orden })))
            })
        } else if (type.startsWith('TAREA_')) {
            const faseId = source.droppableId
            const faseIdx = fases.findIndex((f) => f.id === faseId)
            if (faseIdx === -1) return
            const fase = fases[faseIdx]
            const tareas = Array.from(fase.tareas)
            const [moved] = tareas.splice(source.index, 1)
            tareas.splice(destination.index, 0, moved)
            const tareasConOrden = tareas.map((t, i) => ({ ...t, orden: i + 1 }))
            const newFases = [...fases]
            newFases[faseIdx] = { ...fase, tareas: tareasConOrden }
            setFases(newFases)
            startReorder(async () => {
                await reorderTareas(eventoId, tareasConOrden.map((t) => ({ id: t.id, orden: t.orden })))
            })
        }
    }

    function reloadNeeded() { window.location.reload() }

    return (
        <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="fases-list" type="FASE">
                {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps}
                        style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
                    >
                        {fases.length === 0 && (
                            <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                                Sin fases aún. Agregá la primera fase abajo.
                            </div>
                        )}

                        {fases.map((fase, index) => (
                            <Draggable key={fase.id} draggableId={fase.id} index={index}>
                                {(drag, snapshot) => (
                                    <div
                                        ref={drag.innerRef}
                                        {...drag.draggableProps}
                                        style={{ ...drag.draggableProps.style, opacity: snapshot.isDragging ? 0.85 : 1 }}
                                    >
                                        <FaseCard
                                            fase={fase}
                                            eventoId={eventoId}
                                            expandedTareaId={expandedTareaId}
                                            setExpandedTareaId={setExpandedTareaId}
                                            isAddingTarea={addTareaFaseId === fase.id}
                                            onToggleAddTarea={() => setAddTareaFaseId(addTareaFaseId === fase.id ? null : fase.id)}
                                            isEditing={editingFaseId === fase.id}
                                            onToggleEdit={() => setEditingFaseId(editingFaseId === fase.id ? null : fase.id)}
                                            dragHandleProps={drag.dragHandleProps}
                                            onReloadNeeded={reloadNeeded}
                                        />
                                    </div>
                                )}
                            </Draggable>
                        ))}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>

            {/* Add Fase */}
            <div style={{ marginTop: '0.5rem' }}>
                {showAddFase ? (
                    <AddFaseForm eventoId={eventoId} onDone={() => setShowAddFase(false)} fasesExistentes={fases} />
                ) : (
                    <button className="btn-ghost" style={styles.addFaseBtn} onClick={() => setShowAddFase(true)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                        Agregar fase
                    </button>
                )}
            </div>
        </DragDropContext>
    )
}

// ─── FaseCard ─────────────────────────────────────────────────────────────────

function FaseCard({
    fase, eventoId, expandedTareaId, setExpandedTareaId,
    isAddingTarea, onToggleAddTarea, isEditing, onToggleEdit,
    dragHandleProps, onReloadNeeded,
}: {
    fase: Fase; eventoId: string
    expandedTareaId: string | null
    setExpandedTareaId: (id: string | null) => void
    isAddingTarea: boolean; onToggleAddTarea: () => void
    isEditing: boolean; onToggleEdit: () => void
    dragHandleProps: DraggableProvidedDragHandleProps | null | undefined
    onReloadNeeded: () => void
}) {
    const [isPending, startTransition] = useTransition()
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [editNombre, setEditNombre] = useState(fase.nombre)
    const [editDescripcion, setEditDescripcion] = useState(fase.descripcion ?? '')

    const completadas = fase.tareas.filter((t) => t.completada).length

    function handleSaveFase() {
        startTransition(async () => {
            await updateFase(fase.id, eventoId, { nombre: editNombre, descripcion: editDescripcion || null })
            onToggleEdit()
        })
    }

    function handleDeleteFase() {
        startTransition(async () => {
            await deleteFase(fase.id, eventoId)
        })
    }

    return (
        <div className="card" style={styles.faseCard}>
            {/* Fase header */}
            <div style={styles.faseHeader}>
                {/* Drag handle */}
                <div {...(dragHandleProps as object)} style={styles.faseDragHandle} title="Arrastrar para reordenar">
                    ⠿
                </div>
                {isEditing ? (
                    <div style={styles.faseEditRow}>
                        <input value={editNombre} onChange={e => setEditNombre(e.target.value)} className="form-input" style={{ fontSize: '0.95rem', flex: 1 }} placeholder="Nombre de fase" />
                        <input value={editDescripcion} onChange={e => setEditDescripcion(e.target.value)} className="form-input" style={{ fontSize: '0.85rem', flex: 2 }} placeholder="Descripción (opcional)" />
                        <button onClick={handleSaveFase} disabled={isPending} className="btn-gold" style={{ padding: '0.45rem 1rem', fontSize: '0.8rem' }}>Guardar</button>
                        <button onClick={onToggleEdit} className="btn-ghost" style={{ padding: '0.45rem 0.75rem', fontSize: '0.8rem' }}>Cancelar</button>
                    </div>
                ) : (
                    <div style={styles.faseTitleRow}>
                        <div>
                            <h3 style={styles.faseNombre}>{fase.nombre}</h3>
                            {fase.descripcion && <p style={styles.faseDesc}>{fase.descripcion}</p>}
                        </div>
                        <div style={styles.faseMeta}>
                            <span style={styles.faseCounter}>{completadas}/{fase.tareas.length} tareas</span>
                            <button onClick={onToggleEdit} style={styles.iconBtn} title="Editar fase">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                            </button>
                            {confirmDelete ? (
                                <span style={styles.confirmSmall}>
                                    <button onClick={handleDeleteFase} disabled={isPending} style={styles.confirmYesSmall}>Eliminar</button>
                                    <button onClick={() => setConfirmDelete(false)} style={styles.confirmNoSmall}>No</button>
                                </span>
                            ) : (
                                <button onClick={() => setConfirmDelete(true)} style={{ ...styles.iconBtn, color: 'var(--color-error)' }} title="Eliminar fase">
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Tareas — draggable */}
            {fase.tareas.length > 0 && (
                <Droppable droppableId={fase.id} type={`TAREA_${fase.id}`}>
                    {(provided) => (
                        <div ref={provided.innerRef} {...provided.droppableProps} style={styles.tareasList}>
                            {[...fase.tareas]
                                .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
                                .map((tarea, tIdx) => (
                                    <Draggable key={tarea.id} draggableId={tarea.id} index={tIdx}>
                                        {(tdrag, tsnap) => (
                                            <div
                                                ref={tdrag.innerRef}
                                                {...tdrag.draggableProps}
                                                style={{ ...tdrag.draggableProps.style, opacity: tsnap.isDragging ? 0.85 : 1 }}
                                            >
                                                <TareaRow
                                                    tarea={tarea}
                                                    eventoId={eventoId}
                                                    isExpanded={expandedTareaId === tarea.id}
                                                    onToggle={() => setExpandedTareaId(expandedTareaId === tarea.id ? null : tarea.id)}
                                                    dragHandleProps={tdrag.dragHandleProps}
                                                />
                                            </div>
                                        )}
                                    </Draggable>
                                ))}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            )}

            {/* Add Tarea */}
            {isAddingTarea ? (
                <AddTareaForm faseId={fase.id} eventoId={eventoId} onDone={onToggleAddTarea} />
            ) : (
                <button onClick={onToggleAddTarea} className="btn-ghost" style={styles.addTareaBtn}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    Agregar tarea
                </button>
            )}
        </div>
    )
}

// ─── TareaRow ─────────────────────────────────────────────────────────────────

function TareaRow({ tarea, eventoId, isExpanded, onToggle, dragHandleProps }: {
    tarea: Tarea; eventoId: string; isExpanded: boolean; onToggle: () => void;
    dragHandleProps?: DraggableProvidedDragHandleProps | null
}) {
    const vencida = isVencida(tarea)
    return (
        <div style={{ ...styles.tareaRow, borderColor: isExpanded ? 'var(--color-gold)' : vencida ? 'rgba(239,68,68,0.3)' : 'var(--color-border)' }}>
            {/* Drag handle for tarea */}
            {dragHandleProps && (
                <div {...dragHandleProps} style={styles.tareaDragHandle} title="Arrastrar para reordenar">
                    ⠿
                </div>
            )}
            {/* Summary row (always visible) */}
            <button onClick={onToggle} style={styles.tareaRowBtn}>
                <span style={styles.tareaIcon}>{TIPO_ICONS[tarea.tipo] ?? '📌'}</span>
                <span style={{
                    ...styles.tareaNombre,
                    color: tarea.completada ? 'var(--color-text-muted)' : vencida ? '#EF4444' : 'var(--color-text)',
                    textDecoration: tarea.completada ? 'line-through' : 'none',
                }}>{tarea.nombre}</span>
                {vencida ? (
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.06em', color: '#EF4444', backgroundColor: 'rgba(239,68,68,0.1)', padding: '0.1rem 0.45rem', borderRadius: '20px', whiteSpace: 'nowrap', flexShrink: 0 }}>VENCIDA</span>
                ) : (
                    <span style={{ ...styles.estadoBadge, ...ESTADO_STYLES[tarea.estado] }}>
                        {ESTADO_OPTIONS.find(o => o.value === tarea.estado)?.label ?? tarea.estado}
                    </span>
                )}
                {tarea.fecha && (
                    <span style={{ ...styles.tareaFecha, color: vencida ? '#EF4444' : 'var(--color-text-muted)' }}>
                        {new Date(tarea.fecha + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                )}
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0, color: 'var(--color-text-muted)' }}>
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </button>

            {/* Expanded detail */}
            {isExpanded && (
                <TareaDetail tarea={tarea} eventoId={eventoId} onClose={onToggle} />
            )}
        </div>
    )
}

// ─── TareaDetail ─────────────────────────────────────────────────────────────

function TareaDetail({ tarea, eventoId, onClose }: {
    tarea: Tarea; eventoId: string; onClose: () => void
}) {
    const [isPending, startTransition] = useTransition()
    const [nombre, setNombre] = useState(tarea.nombre)
    const [estado, setEstado] = useState(tarea.estado)
    const [tipo, setTipo] = useState(tarea.tipo)
    const [fecha, setFecha] = useState(tarea.fecha ?? '')
    const [resumen, setResumen] = useState(tarea.resumen ?? '')
    const [newAcuerdo, setNewAcuerdo] = useState('')
    const [confirmDelete, setConfirmDelete] = useState(false)

    function handleSave() {
        startTransition(async () => {
            await updateTarea(tarea.id, eventoId, {
                nombre,
                estado: estado as 'pendiente' | 'en_curso' | 'completada',
                tipo: tipo as 'reunion' | 'entregable' | 'decision' | 'pago',
                fecha: fecha || null,
                resumen: resumen || null,
            })
            onClose()
        })
    }

    function handleAddAcuerdo() {
        if (!newAcuerdo.trim()) return
        startTransition(async () => {
            await createAcuerdo(tarea.id, eventoId, newAcuerdo.trim())
            setNewAcuerdo('')
        })
    }

    function handleDeleteAcuerdo(id: string) {
        startTransition(async () => { await deleteAcuerdo(id, eventoId) })
    }

    function handleDelete() {
        startTransition(async () => { await deleteTarea(tarea.id, eventoId) })
    }

    return (
        <div style={styles.tareaDetail}>
            <div style={styles.detailGrid}>
                {/* Nombre */}
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Nombre</label>
                    <input value={nombre} onChange={e => setNombre(e.target.value)} className="form-input" />
                </div>
                {/* Tipo */}
                <div className="form-group">
                    <label className="form-label">Tipo</label>
                    <select value={tipo} onChange={e => setTipo(e.target.value)} className="form-input">
                        {TIPO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>
                {/* Estado */}
                <div className="form-group">
                    <label className="form-label">Estado</label>
                    <select value={estado} onChange={e => setEstado(e.target.value)} className="form-input">
                        {ESTADO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>
                {/* Fecha */}
                <div className="form-group">
                    <label className="form-label">Fecha</label>
                    <input
                        type="date"
                        value={fecha}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={e => setFecha(e.target.value)}
                        className="form-input"
                    />
                </div>
                {/* Resumen */}
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Resumen / notas</label>
                    <textarea value={resumen} onChange={e => setResumen(e.target.value)} className="form-input" rows={3} style={{ resize: 'vertical', fontFamily: 'var(--font-sans)', fontSize: '0.9rem' }} placeholder="Notas sobre esta tarea…" />
                </div>
            </div>

            {/* Actions row */}
            <div style={styles.detailActions}>
                <div>
                    {confirmDelete ? (
                        <span style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-error)' }}>¿Eliminar?</span>
                            <button onClick={handleDelete} disabled={isPending} style={styles.confirmYesSmall}>Sí</button>
                            <button onClick={() => setConfirmDelete(false)} style={styles.confirmNoSmall}>No</button>
                        </span>
                    ) : (
                        <button onClick={() => setConfirmDelete(true)} className="btn-ghost" style={{ fontSize: '0.78rem', color: 'var(--color-error)', borderColor: 'rgba(200,75,75,0.2)', padding: '0.3rem 0.75rem' }}>
                            Eliminar tarea
                        </button>
                    )}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={onClose} className="btn-ghost" style={{ fontSize: '0.8rem', padding: '0.4rem 0.9rem' }}>Cancelar</button>
                    <button onClick={handleSave} disabled={isPending} className="btn-gold" style={{ fontSize: '0.8rem', padding: '0.4rem 1rem' }}>
                        {isPending ? 'Guardando…' : 'Guardar cambios'}
                    </button>
                </div>
            </div>

            {/* Acuerdos */}
            <div style={styles.acuerdosSection}>
                <p style={styles.acuerdosTitle}>📝 Acuerdos</p>
                {tarea.acuerdos.length === 0 && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontStyle: 'italic', marginBottom: '0.5rem' }}>Sin acuerdos registrados.</p>
                )}
                {tarea.acuerdos.map((a: Acuerdo) => (
                    <AcuerdoItem key={a.id} acuerdo={a} eventoId={eventoId} />
                ))}
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <input
                        value={newAcuerdo}
                        onChange={e => setNewAcuerdo(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddAcuerdo() } }}
                        className="form-input"
                        style={{ fontSize: '0.85rem', flex: 1 }}
                        placeholder="Escribí un acuerdo y presioná Enter…"
                    />
                    <button onClick={handleAddAcuerdo} disabled={isPending || !newAcuerdo.trim()} className="btn-gold" style={{ fontSize: '0.8rem', padding: '0.4rem 0.9rem', whiteSpace: 'nowrap' }}>
                        + Agregar
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── AcuerdoItem ──────────────────────────────────────────────────────────────

function AcuerdoItem({ acuerdo, eventoId }: { acuerdo: Acuerdo; eventoId: string }) {
    const [isPending, startTransition] = useTransition()
    return (
        <div style={styles.acuerdoItem}>
            <span style={{ fontSize: '0.85rem', flex: 1 }}>· {acuerdo.texto}</span>
            <button
                onClick={() => startTransition(async () => { await deleteAcuerdo(acuerdo.id, eventoId) })}
                disabled={isPending}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', padding: '0', lineHeight: 1 }}
                title="Eliminar acuerdo"
            >×</button>
        </div>
    )
}

// ─── AddTareaForm ─────────────────────────────────────────────────────────────

function AddTareaForm({ faseId, eventoId, onDone }: { faseId: string; eventoId: string; onDone: () => void }) {
    const [isPending, startTransition] = useTransition()
    const [nombre, setNombre] = useState('')
    const [tipo, setTipo] = useState<'reunion' | 'entregable' | 'decision' | 'pago'>('reunion')
    const [fecha, setFecha] = useState('')

    const today = new Date().toISOString().split('T')[0]

    function handleSubmit() {
        if (!nombre.trim()) return
        startTransition(async () => {
            await createTarea(faseId, eventoId, { nombre: nombre.trim(), tipo, fecha: fecha || null })
            setNombre(''); setFecha(''); onDone()
        })
    }

    return (
        <div style={styles.addForm}>
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div className="form-group" style={{ flex: 2, minWidth: '160px' }}>
                    <label className="form-label">Nombre de la tarea</label>
                    <input autoFocus value={nombre} onChange={e => setNombre(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }} className="form-input" style={{ fontSize: '0.88rem' }} placeholder="Reunión inicial…" />
                </div>
                <div className="form-group" style={{ minWidth: '130px' }}>
                    <label className="form-label">Tipo</label>
                    <select value={tipo} onChange={e => setTipo(e.target.value as 'reunion' | 'entregable' | 'decision' | 'pago')} className="form-input" style={{ fontSize: '0.88rem' }}>
                        {TIPO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>
                <div className="form-group" style={{ minWidth: '120px' }}>
                    <label className="form-label">Fecha</label>
                    <input type="date" value={fecha} min={today} onChange={e => setFecha(e.target.value)} className="form-input" style={{ fontSize: '0.88rem' }} />
                </div>
                <button onClick={handleSubmit} disabled={isPending || !nombre.trim()} className="btn-gold" style={{ fontSize: '0.82rem', padding: '0.5rem 1rem', marginBottom: '0' }}>
                    {isPending ? '…' : 'Agregar'}
                </button>
                <button onClick={onDone} className="btn-ghost" style={{ fontSize: '0.82rem', padding: '0.5rem 0.75rem' }}>Cancelar</button>
            </div>
        </div>
    )
}

// ─── AddFaseForm ──────────────────────────────────────────────────────────────

function AddFaseForm({ eventoId, onDone, fasesExistentes }: { eventoId: string; onDone: () => void; fasesExistentes: Fase[] }) {
    const [isPending, startTransition] = useTransition()
    const [nombre, setNombre] = useState('')
    const [descripcion, setDescripcion] = useState('')
    // Position: 'end' = after all, or a faseId meaning 'insert before this fase'
    const [posicion, setPosicion] = useState<string>('end')

    function handleSubmit() {
        if (!nombre.trim()) return
        startTransition(async () => {
            await createFaseEnPosicion(eventoId, nombre.trim(), descripcion, posicion, fasesExistentes)
            onDone()
        })
    }

    return (
        <div className="card" style={{ padding: '1.25rem', border: '1.5px dashed var(--color-gold-light)' }}>
            <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-gold-dark)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>Nueva fase</p>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div className="form-group" style={{ flex: 1, minWidth: '180px' }}>
                    <label className="form-label">Nombre</label>
                    <input autoFocus value={nombre} onChange={e => setNombre(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }} className="form-input" placeholder="Planificación inicial…" />
                </div>
                <div className="form-group" style={{ flex: 2, minWidth: '200px' }}>
                    <label className="form-label">Descripción (opcional)</label>
                    <input value={descripcion} onChange={e => setDescripcion(e.target.value)} className="form-input" placeholder="Descripción breve…" />
                </div>
                {fasesExistentes.length > 0 && (
                    <div className="form-group" style={{ minWidth: '180px' }}>
                        <label className="form-label">Posición</label>
                        <select value={posicion} onChange={e => setPosicion(e.target.value)} className="form-input" style={{ fontSize: '0.85rem' }}>
                            {fasesExistentes.map((f, idx) => (
                                <option key={f.id} value={f.id}>Antes de: {f.nombre}</option>
                            ))}
                            <option value="end">Al final</option>
                        </select>
                    </div>
                )}
                <button onClick={handleSubmit} disabled={isPending || !nombre.trim()} className="btn-gold" style={{ fontSize: '0.85rem', padding: '0.55rem 1.1rem' }}>
                    {isPending ? 'Creando…' : 'Crear fase'}
                </button>
                <button onClick={onDone} className="btn-ghost" style={{ fontSize: '0.85rem', padding: '0.55rem 0.9rem' }}>Cancelar</button>
            </div>
        </div>
    )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
    faseCard: { padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0' },
    faseHeader: { marginBottom: '0.75rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' },
    faseDragHandle: { cursor: 'grab', fontSize: '1.1rem', color: 'var(--color-text-muted)', paddingTop: '0.15rem', flexShrink: 0, userSelect: 'none', opacity: 0.5, lineHeight: 1 },
    tareaDragHandle: { cursor: 'grab', fontSize: '0.9rem', color: 'var(--color-text-muted)', padding: '0 0.4rem 0 0.6rem', display: 'flex', alignItems: 'center', flexShrink: 0, userSelect: 'none', opacity: 0.4 },
    faseEditRow: { display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', flex: 1 },
    faseTitleRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', flex: 1 },
    faseNombre: { fontFamily: 'var(--font-serif)', fontSize: '1.05rem', fontWeight: 600, color: 'var(--color-text)' },
    faseDesc: { fontSize: '0.82rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' },
    faseMeta: { display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 },
    faseCounter: { fontSize: '0.75rem', fontWeight: 500, color: 'var(--color-text-muted)', background: 'var(--color-cream-dark)', padding: '0.15rem 0.55rem', borderRadius: '20px', whiteSpace: 'nowrap' },
    tareasList: { display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.75rem' },
    tareaRow: { border: '1px solid', borderRadius: 'var(--radius-sm)', overflow: 'hidden', backgroundColor: 'var(--color-white)', transition: 'border-color 0.2s', display: 'flex', alignItems: 'stretch' },
    tareaRowBtn: { display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1, padding: '0.65rem 0.85rem 0.65rem 0', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' },
    tareaIcon: { fontSize: '1rem', flexShrink: 0 },
    tareaNombre: { fontSize: '0.88rem', fontWeight: 500, color: 'var(--color-text)', flex: 1 },
    estadoBadge: { fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0.15rem 0.55rem', borderRadius: '20px', whiteSpace: 'nowrap' },
    tareaFecha: { fontSize: '0.75rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' },
    tareaDetail: { padding: '1rem', backgroundColor: 'var(--color-cream)', borderTop: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '0.85rem' },
    detailGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' },
    detailActions: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem', borderTop: '1px solid var(--color-border)' },
    acuerdosSection: { backgroundColor: 'var(--color-white)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' },
    acuerdosTitle: { fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-muted)', marginBottom: '0.25rem' },
    acuerdoItem: { display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.3rem 0', borderBottom: '1px solid var(--color-cream-dark)' },
    addTareaBtn: { fontSize: '0.78rem', padding: '0.35rem 0.75rem', gap: '0.35rem', alignSelf: 'flex-start', color: 'var(--color-gold-dark)', borderColor: 'var(--color-gold-light)' },
    addFaseBtn: { fontSize: '0.85rem', padding: '0.65rem', gap: '0.4rem', justifyContent: 'center', borderStyle: 'dashed' },
    addForm: { backgroundColor: 'var(--color-cream)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', padding: '0.85rem', marginTop: '0.5rem' },
    iconBtn: { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '0.2rem', display: 'flex', alignItems: 'center' },
    confirmSmall: { display: 'flex', alignItems: 'center', gap: '0.35rem' },
    confirmYesSmall: { fontSize: '0.72rem', padding: '0.2rem 0.55rem', background: 'var(--color-error)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontFamily: 'var(--font-sans)' },
    confirmNoSmall: { fontSize: '0.72rem', padding: '0.2rem 0.55rem', background: 'transparent', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', borderRadius: '4px', cursor: 'pointer', fontFamily: 'var(--font-sans)' },
}

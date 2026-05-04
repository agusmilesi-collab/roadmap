'use client'

import { useState, useEffect, useTransition, useRef } from 'react'
import { DragDropContext, Droppable, Draggable, type DropResult, type DraggableProvidedDragHandleProps } from '@hello-pangea/dnd'
import type { Fase, Tema, Tarea, Acuerdo, Cotizacion } from './EventoDetailClient'
import {
    createFase, updateFase, deleteFase, reorderFases,
    createTema, updateTema, deleteTema, reorderTemas,
    createTarea, updateTarea, deleteTarea, reorderTareas,
    createAcuerdo, deleteAcuerdo,
    createCotizacion, updateCotizacion, deleteCotizacion,
} from '@/app/(admin)/eventos/[id]/actions'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ESTADOS: Array<'pendiente' | 'en_curso' | 'completada'> = ['pendiente', 'en_curso', 'completada']

function nextEstado(actual: string): 'pendiente' | 'en_curso' | 'completada' {
    const idx = ESTADOS.indexOf(actual as typeof ESTADOS[number])
    return ESTADOS[((idx >= 0 ? idx : -1) + 1) % ESTADOS.length]
}

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
    const day = d.getDate()
    const monthsShort = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']
    return `${day} ${monthsShort[d.getMonth()]}`
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

function computePosition(items: { position: number }[], destIdx: number): number {
    if (items.length === 0) return 1
    if (destIdx <= 0) return items[0].position / 2
    if (destIdx >= items.length) return items[items.length - 1].position + 1
    return (items[destIdx - 1].position + items[destIdx].position) / 2
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ProgresoTab({ fases: initialFases, eventoId }: { fases: Fase[]; eventoId: string }) {
    const [fases, setFases] = useState<Fase[]>(initialFases)
    const [expanded, setExpanded] = useState<Set<string>>(new Set())
    const [, startReorder] = useTransition()

    useEffect(() => {
        setFases(initialFases)
    }, [initialFases])

    function toggleExpand(temaId: string) {
        setExpanded((prev) => {
            const next = new Set(prev)
            if (next.has(temaId)) next.delete(temaId)
            else next.add(temaId)
            return next
        })
    }

    function handleDragEnd(result: DropResult) {
        const { destination, source, type } = result
        if (!destination) return
        if (destination.droppableId === source.droppableId && destination.index === source.index) return

        if (type === 'FASE') {
            const updated = Array.from(fases)
            const [moved] = updated.splice(source.index, 1)
            const newPos = computePosition(updated, destination.index)
            updated.splice(destination.index, 0, { ...moved, position: newPos })
            setFases(updated)
            startReorder(async () => {
                await reorderFases(eventoId, [{ id: moved.id, position: newPos }])
            })
            return
        }

        if (type.startsWith('TEMA_')) {
            const faseId = source.droppableId
            if (destination.droppableId !== faseId) return // no cross-fase drag for now
            const faseIdx = fases.findIndex((f) => f.id === faseId)
            if (faseIdx === -1) return
            const fase = fases[faseIdx]
            const temas = Array.from(fase.temas)
            const [moved] = temas.splice(source.index, 1)
            const otros = temas
            const newPos = computePosition(otros, destination.index)
            temas.splice(destination.index, 0, { ...moved, position: newPos })

            const newFases = [...fases]
            newFases[faseIdx] = { ...fase, temas }
            setFases(newFases)

            startReorder(async () => {
                await reorderTemas(eventoId, [{ id: moved.id, position: newPos }])
            })
        } else if (type.startsWith('TAREA_')) {
            const temaId = source.droppableId
            if (destination.droppableId !== temaId) return
            for (let fi = 0; fi < fases.length; fi++) {
                const fase = fases[fi]
                const ti = fase.temas.findIndex((t) => t.id === temaId)
                if (ti === -1) continue
                const tema = fase.temas[ti]
                const tareas = Array.from(tema.tareas)
                const [moved] = tareas.splice(source.index, 1)
                const newPos = computePosition(tareas, destination.index)
                tareas.splice(destination.index, 0, { ...moved, position: newPos })
                const newTemas = [...fase.temas]
                newTemas[ti] = { ...tema, tareas }
                const newFases = [...fases]
                newFases[fi] = { ...fase, temas: newTemas }
                setFases(newFases)
                startReorder(async () => {
                    await reorderTareas(eventoId, [{ id: moved.id, position: newPos }])
                })
                return
            }
        }
    }

    return (
        <DragDropContext onDragEnd={handleDragEnd}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {fases.length === 0 && (
                    <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                        Sin fases aún. Agregá la primera fase abajo.
                    </div>
                )}

                <Droppable droppableId="fases-list" type="FASE">
                    {(provided) => (
                        <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
                        >
                            {fases.map((fase, idx) => (
                                <Draggable key={fase.id} draggableId={`fase-${fase.id}`} index={idx}>
                                    {(drag, snap) => (
                                        <div
                                            ref={drag.innerRef}
                                            {...drag.draggableProps}
                                            style={{
                                                ...drag.draggableProps.style,
                                                opacity: snap.isDragging ? 0.9 : 1,
                                                boxShadow: snap.isDragging ? '0 8px 24px rgba(0,0,0,0.12)' : undefined,
                                                borderRadius: '16px',
                                            }}
                                        >
                                            <FaseCard
                                                fase={fase}
                                                index={idx}
                                                eventoId={eventoId}
                                                expanded={expanded}
                                                onToggleExpand={toggleExpand}
                                                dragHandleProps={drag.dragHandleProps}
                                            />
                                        </div>
                                    )}
                                </Draggable>
                            ))}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>

                <AddFaseRow eventoId={eventoId} fases={fases} />
            </div>
        </DragDropContext>
    )
}

// ─── FaseCard ─────────────────────────────────────────────────────────────────

function FaseCard({
    fase, index, eventoId, expanded, onToggleExpand, dragHandleProps,
}: {
    fase: Fase
    index: number
    eventoId: string
    expanded: Set<string>
    onToggleExpand: (id: string) => void
    dragHandleProps?: DraggableProvidedDragHandleProps | null
}) {
    const [editingNombre, setEditingNombre] = useState(false)
    const [editingDesc, setEditingDesc] = useState(false)
    const [editingFechas, setEditingFechas] = useState(false)
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [, startTr] = useTransition()
    const [adding, setAdding] = useState(false)

    function saveNombre(value: string) {
        const v = value.trim()
        if (!v || v === fase.nombre) { setEditingNombre(false); return }
        startTr(async () => {
            await updateFase(fase.id, eventoId, { nombre: v })
            setEditingNombre(false)
        })
    }
    function saveDesc(value: string) {
        const v = value.trim()
        if (v === (fase.descripcion ?? '')) { setEditingDesc(false); return }
        startTr(async () => {
            await updateFase(fase.id, eventoId, { descripcion: v || null })
            setEditingDesc(false)
        })
    }
    function saveFechas(inicio: string, fin: string) {
        startTr(async () => {
            await updateFase(fase.id, eventoId, {
                fecha_inicio: inicio || null,
                fecha_fin: fin || null,
            })
            setEditingFechas(false)
        })
    }
    function handleDelete() {
        startTr(async () => { await deleteFase(fase.id, eventoId) })
    }

    const dateLabel = formatRangeMonths(fase.fecha_inicio, fase.fecha_fin)

    return (
        <div style={st.fase}>
            <div style={st.faseHeader}>
                <div {...(dragHandleProps as object)} style={st.faseDragHandle} title="Arrastrar para reordenar etapa">⠿</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={st.faseEyebrow}>Etapa {index + 1}</div>
                    {editingNombre ? (
                        <InlineInput initial={fase.nombre} onSave={saveNombre} onCancel={() => setEditingNombre(false)} fontSize="1.375rem" fontWeight={600} />
                    ) : (
                        <div style={st.faseName} onClick={() => setEditingNombre(true)} title="Click para editar">
                            {fase.nombre}
                        </div>
                    )}
                    {editingDesc ? (
                        <InlineTextarea initial={fase.descripcion ?? ''} onSave={saveDesc} onCancel={() => setEditingDesc(false)} placeholder="Descripción de la etapa…" />
                    ) : (
                        <div style={st.faseDesc} onClick={() => setEditingDesc(true)} title="Click para editar descripción">
                            {fase.descripcion || <span style={{ color: 'var(--color-text-faint, #B8B2A4)', fontStyle: 'italic' }}>+ Agregar descripción</span>}
                        </div>
                    )}
                </div>
                <div style={st.faseHeaderRight}>
                    {editingFechas ? (
                        <FechasEditor
                            inicio={fase.fecha_inicio}
                            fin={fase.fecha_fin}
                            onSave={saveFechas}
                            onCancel={() => setEditingFechas(false)}
                        />
                    ) : (
                        <div style={st.faseDates} onClick={() => setEditingFechas(true)} title="Click para editar fechas">
                            {dateLabel || '+ Fechas'}
                        </div>
                    )}
                    {confirmDelete ? (
                        <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                            <button onClick={handleDelete} style={st.confirmYes}>Eliminar</button>
                            <button onClick={() => setConfirmDelete(false)} style={st.confirmNo}>Cancelar</button>
                        </div>
                    ) : (
                        <button onClick={() => setConfirmDelete(true)} style={st.faseDeleteBtn} title="Eliminar etapa">×</button>
                    )}
                </div>
            </div>

            <Droppable droppableId={fase.id} type={`TEMA_${fase.id}`}>
                {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} style={st.temasList}>
                        {fase.temas.map((tema, idx) => (
                            <Draggable key={tema.id} draggableId={tema.id} index={idx}>
                                {(drag, snap) => (
                                    <div
                                        ref={drag.innerRef}
                                        {...drag.draggableProps}
                                        style={{
                                            ...drag.draggableProps.style,
                                            opacity: snap.isDragging ? 0.85 : 1,
                                        }}
                                    >
                                        <TemaRow
                                            tema={tema}
                                            eventoId={eventoId}
                                            isExpanded={expanded.has(tema.id)}
                                            onToggle={() => onToggleExpand(tema.id)}
                                            dragHandleProps={drag.dragHandleProps}
                                        />
                                    </div>
                                )}
                            </Draggable>
                        ))}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>

            {adding ? (
                <AddTemaForm
                    eventoId={eventoId}
                    faseId={fase.id}
                    onDone={(newTemaId) => {
                        setAdding(false)
                        if (newTemaId) onToggleExpand(newTemaId)
                    }}
                />
            ) : (
                <button onClick={() => setAdding(true)} style={st.addInline}>+ Agregar tema</button>
            )}
        </div>
    )
}

// ─── TemaRow ──────────────────────────────────────────────────────────────────

function TemaRow({
    tema, eventoId, isExpanded, onToggle, dragHandleProps,
}: {
    tema: Tema
    eventoId: string
    isExpanded: boolean
    onToggle: () => void
    dragHandleProps?: DraggableProvidedDragHandleProps | null
}) {
    const [editingNombre, setEditingNombre] = useState(false)
    const [editingDesc, setEditingDesc] = useState(false)
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [, startTr] = useTransition()

    const pct = temaPercent(tema)
    const estado = temaEstado(tema)
    const done = tema.tareas.filter((t) => t.estado === 'completada').length

    function saveNombre(value: string) {
        const v = value.trim()
        if (!v || v === tema.nombre) { setEditingNombre(false); return }
        startTr(async () => {
            await updateTema(tema.id, eventoId, { nombre: v })
            setEditingNombre(false)
        })
    }
    function saveDesc(value: string) {
        const v = value.trim()
        if (v === (tema.descripcion ?? '')) { setEditingDesc(false); return }
        startTr(async () => {
            await updateTema(tema.id, eventoId, { descripcion: v || null })
            setEditingDesc(false)
        })
    }
    function handleDelete() {
        startTr(async () => { await deleteTema(tema.id, eventoId) })
    }

    return (
        <div style={{ ...st.tema, borderBottom: '1px solid var(--color-border)' }}>
            <div className="tema-row-resp">
                <div {...(dragHandleProps as object)} style={st.temaDragHandle} title="Arrastrar para reordenar">⠿</div>

                <div className="tema-row-main" style={{ cursor: 'pointer' }} onClick={(e) => {
                    if (editingNombre || editingDesc) return
                    if ((e.target as HTMLElement).closest('button, input, textarea')) return
                    onToggle()
                }}>
                    {editingNombre ? (
                        <InlineInput initial={tema.nombre} onSave={saveNombre} onCancel={() => setEditingNombre(false)} fontSize="1rem" fontWeight={600} />
                    ) : (
                        <div style={st.temaName} onClick={(e) => { e.stopPropagation(); setEditingNombre(true) }} title="Click para editar">
                            {tema.nombre}
                        </div>
                    )}
                    {editingDesc ? (
                        <InlineTextarea initial={tema.descripcion ?? ''} onSave={saveDesc} onCancel={() => setEditingDesc(false)} placeholder="Descripción del tema…" />
                    ) : (
                        <div style={st.temaDesc} onClick={(e) => { e.stopPropagation(); setEditingDesc(true) }} title="Click para editar descripción">
                            {tema.descripcion || <span style={{ color: 'var(--color-text-faint, #B8B2A4)', fontStyle: 'italic' }}>+ descripción</span>}
                        </div>
                    )}
                </div>

                <div className="tema-row-meta">
                    <StatusPill estado={estado} pct={pct} />

                    <button onClick={onToggle} style={st.chevronBtn} title={isExpanded ? 'Colapsar' : 'Expandir'}>
                        <svg style={{ ...st.chevron, transform: isExpanded ? 'rotate(180deg)' : 'none' }} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M6 9l6 6 6-6" />
                        </svg>
                    </button>

                    {confirmDelete ? (
                        <div style={st.deleteConfirmInline}>
                            <button onClick={handleDelete} style={st.confirmYesXs}>Sí</button>
                            <button onClick={() => setConfirmDelete(false)} style={st.confirmNoXs}>No</button>
                        </div>
                    ) : (
                        <button onClick={() => setConfirmDelete(true)} style={st.temaDeleteBtn} title="Eliminar tema">×</button>
                    )}
                </div>
            </div>

            {isExpanded && (
                <TemaBody tema={tema} eventoId={eventoId} done={done} />
            )}
        </div>
    )
}

// ─── TemaBody ─────────────────────────────────────────────────────────────────

function TemaBody({ tema, eventoId, done }: { tema: Tema; eventoId: string; done: number }) {
    const [addingTarea, setAddingTarea] = useState(false)
    const [addingAcuerdo, setAddingAcuerdo] = useState(false)
    const [addingCotizacion, setAddingCotizacion] = useState(false)

    return (
        <div style={st.temaBody}>
            <div style={st.sectionLabel}>
                <span style={{ ...st.sectionDot, backgroundColor: 'var(--color-gold)' }} />
                Tareas <span style={st.countTag}>{done} de {tema.tareas.length}</span>
            </div>
            <Droppable droppableId={tema.id} type={`TAREA_${tema.id}`}>
                {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} style={st.tareasTimeline}>
                        {tema.tareas.map((tarea, idx) => (
                            <Draggable key={tarea.id} draggableId={tarea.id} index={idx}>
                                {(drag, snap) => (
                                    <div
                                        ref={drag.innerRef}
                                        {...drag.draggableProps}
                                        style={{
                                            ...drag.draggableProps.style,
                                            opacity: snap.isDragging ? 0.85 : 1,
                                        }}
                                    >
                                        <TareaItem
                                            tarea={tarea}
                                            eventoId={eventoId}
                                            dragHandleProps={drag.dragHandleProps}
                                        />
                                    </div>
                                )}
                            </Draggable>
                        ))}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
            {addingTarea ? (
                <AddTareaForm eventoId={eventoId} temaId={tema.id} onDone={() => setAddingTarea(false)} />
            ) : (
                <button onClick={() => setAddingTarea(true)} style={st.addInlineSm}>+ Agregar tarea</button>
            )}

            {tema.cotizaciones.length > 0 && (
                <>
                    <div style={{ ...st.sectionLabel, marginTop: '1.25rem' }}>
                        <span style={{ ...st.sectionDot, backgroundColor: 'var(--color-gold)' }} />
                        Cotizaciones <span style={st.countTag}>{tema.cotizaciones.length} {tema.cotizaciones.length === 1 ? 'presupuesto' : 'presupuestos'}</span>
                    </div>
                    {tema.cotizaciones.map((cot) => (
                        <CotizacionRow key={cot.id} cotizacion={cot} eventoId={eventoId} />
                    ))}
                </>
            )}
            {addingCotizacion ? (
                <div style={{ marginTop: tema.cotizaciones.length > 0 ? 0 : '0.85rem' }}>
                    <AddCotizacionForm eventoId={eventoId} temaId={tema.id} onDone={() => setAddingCotizacion(false)} />
                </div>
            ) : (
                <button
                    onClick={() => setAddingCotizacion(true)}
                    style={{
                        ...st.addInlineSm,
                        marginTop: tema.cotizaciones.length > 0 ? '0.4rem' : '0.85rem',
                        opacity: tema.cotizaciones.length > 0 ? 1 : 0.7,
                    }}
                >
                    + {tema.cotizaciones.length > 0 ? 'Agregar otra cotización' : 'Sumar cotización (opcional)'}
                </button>
            )}

            <div style={{ ...st.sectionLabel, marginTop: '1.25rem' }}>
                <span style={{ ...st.sectionDot, backgroundColor: 'var(--color-gold)' }} />
                Acuerdos <span style={st.countTag}>{tema.acuerdos.length} {tema.acuerdos.length === 1 ? 'registro' : 'registros'}</span>
            </div>
            {tema.acuerdos.length === 0 && (
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontStyle: 'italic', marginBottom: '0.5rem' }}>
                    Sin acuerdos registrados.
                </div>
            )}
            {tema.acuerdos.map((acuerdo) => (
                <AcuerdoRow key={acuerdo.id} acuerdo={acuerdo} eventoId={eventoId} />
            ))}
            {addingAcuerdo ? (
                <AddAcuerdoForm eventoId={eventoId} temaId={tema.id} onDone={() => setAddingAcuerdo(false)} />
            ) : (
                <button onClick={() => setAddingAcuerdo(true)} style={st.addInlineSm}>+ Agregar acuerdo</button>
            )}
        </div>
    )
}

// ─── TareaItem ────────────────────────────────────────────────────────────────

function TareaItem({
    tarea, eventoId, dragHandleProps,
}: {
    tarea: Tarea
    eventoId: string
    dragHandleProps?: DraggableProvidedDragHandleProps | null
}) {
    const [editing, setEditing] = useState(false)
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [, startTr] = useTransition()

    function cycle() {
        const next = nextEstado(tarea.estado)
        startTr(async () => {
            await updateTarea(tarea.id, eventoId, { estado: next })
        })
    }
    function saveNombre(value: string) {
        const v = value.trim()
        if (!v || v === tarea.nombre) { setEditing(false); return }
        startTr(async () => {
            await updateTarea(tarea.id, eventoId, { nombre: v })
            setEditing(false)
        })
    }
    function handleDelete() {
        startTr(async () => { await deleteTarea(tarea.id, eventoId) })
    }

    return (
        <div style={st.tarea} data-estado={tarea.estado}>
            <div {...(dragHandleProps as object)} style={st.tareaDragHandle} title="Arrastrar para reordenar">⠿</div>
            <span
                onClick={cycle}
                style={{
                    ...st.tareaNode,
                    ...(tarea.estado === 'en_curso' ? st.tareaNodeEnCurso : {}),
                    ...(tarea.estado === 'completada' ? st.tareaNodeCompletada : {}),
                }}
                title="Click para cambiar estado"
            >
                {tarea.estado === 'en_curso' && <span style={st.tareaNodeDot} />}
                {tarea.estado === 'completada' && <span style={st.tareaNodeCheck}>✓</span>}
            </span>
            {editing ? (
                <InlineInput initial={tarea.nombre} onSave={saveNombre} onCancel={() => setEditing(false)} fontSize="0.9rem" />
            ) : (
                <div
                    style={{
                        ...st.tareaName,
                        ...(tarea.estado === 'completada' ? st.tareaNameCompletada : {}),
                        cursor: 'pointer',
                    }}
                    onClick={() => setEditing(true)}
                    title="Click para editar nombre"
                >
                    {tarea.nombre}
                </div>
            )}
            {confirmDelete ? (
                <div style={st.deleteConfirmInline}>
                    <button onClick={handleDelete} style={st.confirmYesXs}>Sí</button>
                    <button onClick={() => setConfirmDelete(false)} style={st.confirmNoXs}>No</button>
                </div>
            ) : (
                <button onClick={() => setConfirmDelete(true)} style={st.tareaDeleteBtn} title="Eliminar tarea">×</button>
            )}
        </div>
    )
}

// ─── AcuerdoRow ──────────────────────────────────────────────────────────────

function AcuerdoRow({ acuerdo, eventoId }: { acuerdo: Acuerdo; eventoId: string }) {
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [, startTr] = useTransition()

    function handleDelete() {
        startTr(async () => { await deleteAcuerdo(acuerdo.id, eventoId) })
    }

    return (
        <div style={st.acuerdo}>
            <div style={st.acuerdoDate}>{formatAcuerdoDate(acuerdo.created_at)}</div>
            <div style={st.acuerdoText}>{acuerdo.texto}</div>
            {confirmDelete ? (
                <div style={st.deleteConfirmInline}>
                    <button onClick={handleDelete} style={st.confirmYesXs}>Sí</button>
                    <button onClick={() => setConfirmDelete(false)} style={st.confirmNoXs}>No</button>
                </div>
            ) : (
                <button onClick={() => setConfirmDelete(true)} style={{ ...st.tareaDeleteBtn, marginLeft: 'auto' }} title="Eliminar acuerdo">×</button>
            )}
        </div>
    )
}

// ─── CotizacionRow ───────────────────────────────────────────────────────────

function CotizacionRow({ cotizacion, eventoId }: { cotizacion: Cotizacion; eventoId: string }) {
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [editingField, setEditingField] = useState<'proveedor' | 'link' | null>(null)
    const [, startTr] = useTransition()

    function handleDelete() {
        startTr(async () => { await deleteCotizacion(cotizacion.id, eventoId) })
    }

    function saveProveedor(value: string) {
        const v = value.trim()
        if (!v || v === cotizacion.proveedor) { setEditingField(null); return }
        startTr(async () => {
            await updateCotizacion(cotizacion.id, eventoId, { proveedor: v })
            setEditingField(null)
        })
    }
    function saveLink(value: string) {
        const v = value.trim()
        if (!v || v === cotizacion.link) { setEditingField(null); return }
        startTr(async () => {
            await updateCotizacion(cotizacion.id, eventoId, { link: v })
            setEditingField(null)
        })
    }

    return (
        <div style={st.cotizacion}>
            <span style={st.cotizacionIcon} title="Cotización">📄</span>

            {/* Proveedor + flecha (ambos en la misma celda 1fr) */}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', minWidth: 0 }}>
                {editingField === 'proveedor' ? (
                    <InlineInput
                        initial={cotizacion.proveedor}
                        onSave={saveProveedor}
                        onCancel={() => setEditingField(null)}
                        fontSize="0.85rem"
                        fontWeight={600}
                    />
                ) : editingField === 'link' ? (
                    <InlineInput
                        initial={cotizacion.link}
                        onSave={saveLink}
                        onCancel={() => setEditingField(null)}
                        fontSize="0.78rem"
                    />
                ) : (
                    <>
                        <span
                            style={{ ...st.cotizacionProveedor, cursor: 'pointer' }}
                            onClick={() => setEditingField('proveedor')}
                            title="Click para editar proveedor"
                        >
                            {cotizacion.proveedor}
                        </span>
                        <a
                            href={cotizacion.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={st.cotizacionLink}
                            title={`Ver presupuesto: ${cotizacion.link}`}
                        >
                            ↗
                        </a>
                    </>
                )}
            </span>

            {/* Lápiz para editar link (sólo visible cuando NO está editando) */}
            {editingField === null ? (
                <button
                    onClick={() => setEditingField('link')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-faint)', padding: '0.15rem', fontSize: '0.7rem', lineHeight: 1 }}
                    title="Editar link"
                >
                    ✎
                </button>
            ) : (
                <span />
            )}

            {confirmDelete ? (
                <div style={st.deleteConfirmInline}>
                    <button onClick={handleDelete} style={st.confirmYesXs}>Sí</button>
                    <button onClick={() => setConfirmDelete(false)} style={st.confirmNoXs}>No</button>
                </div>
            ) : (
                <button onClick={() => setConfirmDelete(true)} style={{ ...st.tareaDeleteBtn, marginLeft: 'auto' }} title="Eliminar cotización">×</button>
            )}
        </div>
    )
}

// ─── AddCotizacionForm ───────────────────────────────────────────────────────

function AddCotizacionForm({ eventoId, temaId, onDone }: { eventoId: string; temaId: string; onDone: () => void }) {
    const [proveedor, setProveedor] = useState('')
    const [link, setLink] = useState('')
    const [, startTr] = useTransition()
    const ref = useRef<HTMLInputElement>(null)
    useEffect(() => { ref.current?.focus() }, [])

    function submit() {
        const p = proveedor.trim()
        const l = link.trim()
        if (!p || !l) { onDone(); return }
        startTr(async () => {
            await createCotizacion(temaId, eventoId, { proveedor: p, link: l })
            onDone()
        })
    }

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr auto', gap: '0.4rem', padding: '0.5rem 0', alignItems: 'center' }}>
            <input
                ref={ref}
                value={proveedor}
                onChange={(e) => setProveedor(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); submit() }
                    else if (e.key === 'Escape') onDone()
                }}
                placeholder="Proveedor"
                style={{ ...st.inlineInput, fontSize: '0.85rem' }}
            />
            <input
                type="url"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); submit() }
                    else if (e.key === 'Escape') onDone()
                }}
                placeholder="https://link-al-presupuesto.com"
                style={{ ...st.inlineInput, fontSize: '0.85rem' }}
            />
            <button onClick={submit} style={st.confirmYesXs} disabled={!proveedor.trim() || !link.trim()}>
                Guardar
            </button>
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

// ─── Inline editors ──────────────────────────────────────────────────────────

function InlineInput({
    initial, onSave, onCancel, fontSize, fontWeight,
}: {
    initial: string
    onSave: (v: string) => void
    onCancel: () => void
    fontSize?: string
    fontWeight?: number
}) {
    const ref = useRef<HTMLInputElement>(null)
    useEffect(() => { ref.current?.focus(); ref.current?.select() }, [])
    return (
        <input
            ref={ref}
            defaultValue={initial}
            onBlur={(e) => onSave(e.target.value)}
            onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLInputElement).blur() }
                else if (e.key === 'Escape') onCancel()
            }}
            style={{
                ...st.inlineInput,
                fontSize: fontSize ?? '0.95rem',
                fontWeight: fontWeight ?? 400,
            }}
        />
    )
}

function InlineTextarea({
    initial, onSave, onCancel, placeholder,
}: {
    initial: string
    onSave: (v: string) => void
    onCancel: () => void
    placeholder?: string
}) {
    const ref = useRef<HTMLTextAreaElement>(null)
    useEffect(() => { ref.current?.focus(); ref.current?.select() }, [])
    return (
        <textarea
            ref={ref}
            defaultValue={initial}
            placeholder={placeholder}
            onBlur={(e) => onSave(e.target.value)}
            onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); (e.target as HTMLTextAreaElement).blur() }
                else if (e.key === 'Escape') onCancel()
            }}
            rows={2}
            style={st.inlineTextarea}
        />
    )
}

function FechasEditor({
    inicio, fin, onSave, onCancel,
}: {
    inicio: string | null
    fin: string | null
    onSave: (a: string, b: string) => void
    onCancel: () => void
}) {
    const [a, setA] = useState(inicio ?? '')
    const [b, setB] = useState(fin ?? '')
    return (
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <input type="date" value={a} onChange={(e) => setA(e.target.value)} style={st.deadlineInput} />
            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>→</span>
            <input type="date" value={b} onChange={(e) => setB(e.target.value)} style={st.deadlineInput} />
            <button onClick={() => onSave(a, b)} style={st.confirmYesXs}>Guardar</button>
            <button onClick={onCancel} style={st.confirmNoXs}>Cancelar</button>
        </div>
    )
}

// ─── Add forms ───────────────────────────────────────────────────────────────

function AddTemaForm({ eventoId, faseId, onDone }: { eventoId: string; faseId: string; onDone: (newTemaId?: string) => void }) {
    const [nombre, setNombre] = useState('')
    const [, startTr] = useTransition()
    const ref = useRef<HTMLInputElement>(null)
    useEffect(() => { ref.current?.focus() }, [])

    function submit() {
        const v = nombre.trim()
        if (!v) { onDone(); return }
        startTr(async () => {
            const id = await createTema(faseId, eventoId, { nombre: v })
            onDone(id)
        })
    }

    return (
        <div style={{ padding: '0.85rem 0.5rem', borderTop: '1px dashed var(--color-border)' }}>
            <input
                ref={ref}
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                onBlur={submit}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); submit() }
                    else if (e.key === 'Escape') onDone()
                }}
                placeholder="Nombre del nuevo tema y Enter…"
                style={{ ...st.inlineInput, fontSize: '0.95rem', fontWeight: 600 }}
            />
        </div>
    )
}

function AddTareaForm({ eventoId, temaId, onDone }: { eventoId: string; temaId: string; onDone: () => void }) {
    const [nombre, setNombre] = useState('')
    const [, startTr] = useTransition()
    const ref = useRef<HTMLInputElement>(null)
    useEffect(() => { ref.current?.focus() }, [])

    function submit() {
        const v = nombre.trim()
        if (!v) { onDone(); return }
        startTr(async () => {
            await createTarea(temaId, eventoId, { nombre: v })
            onDone()
        })
    }

    return (
        <div style={{ padding: '0.4rem 0.75rem 0.4rem 1.7rem' }}>
            <input
                ref={ref}
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                onBlur={submit}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); submit() }
                    else if (e.key === 'Escape') onDone()
                }}
                placeholder="Nombre de la nueva tarea…"
                style={{ ...st.inlineInput, fontSize: '0.9rem' }}
            />
        </div>
    )
}

function AddAcuerdoForm({ eventoId, temaId, onDone }: { eventoId: string; temaId: string; onDone: () => void }) {
    const [texto, setTexto] = useState('')
    const [, startTr] = useTransition()
    const ref = useRef<HTMLInputElement>(null)
    useEffect(() => { ref.current?.focus() }, [])

    function submit() {
        const v = texto.trim()
        if (!v) { onDone(); return }
        startTr(async () => {
            await createAcuerdo(temaId, eventoId, v)
            onDone()
        })
    }

    return (
        <div style={{ padding: '0.5rem 0' }}>
            <input
                ref={ref}
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                onBlur={submit}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); submit() }
                    else if (e.key === 'Escape') onDone()
                }}
                placeholder="Acuerdo nuevo…"
                style={{ ...st.inlineInput, fontSize: '0.9rem' }}
            />
        </div>
    )
}

function AddFaseRow({ eventoId, fases }: { eventoId: string; fases: Fase[] }) {
    const [open, setOpen] = useState(false)
    const [nombre, setNombre] = useState('')
    const [, startTr] = useTransition()

    function submit() {
        const v = nombre.trim()
        if (!v) { setOpen(false); setNombre(''); return }
        startTr(async () => {
            await createFase(eventoId, { nombre: v })
            setOpen(false); setNombre('')
        })
    }

    if (!open) {
        return (
            <button onClick={() => setOpen(true)} style={st.addFaseBtn}>+ Agregar etapa</button>
        )
    }
    void fases
    return (
        <div className="card" style={{ padding: '1.25rem' }}>
            <input
                autoFocus
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                onBlur={submit}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); submit() }
                    else if (e.key === 'Escape') { setOpen(false); setNombre('') }
                }}
                placeholder="Nombre de la etapa…"
                style={{ ...st.inlineInput, fontSize: '1.1rem', fontWeight: 600 }}
            />
        </div>
    )
}

// ─── Styles (mockup parity) ──────────────────────────────────────────────────

const st: Record<string, React.CSSProperties> = {
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
        position: 'relative',
        flexWrap: 'wrap',
    },
    faseHeaderRight: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
        paddingBottom: '2px',
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
        cursor: 'pointer',
    },
    faseDesc: {
        fontSize: '0.875rem',
        color: 'var(--color-text-muted)',
        marginTop: '0.4rem',
        lineHeight: 1.55,
        maxWidth: '620px',
        cursor: 'pointer',
        minHeight: '1.25rem',
    },
    faseDates: {
        fontFamily: 'var(--font-mono, monospace)',
        fontSize: '0.8rem',
        color: 'var(--color-text-muted)',
        letterSpacing: '0.02em',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
    },
    faseDeleteBtn: {
        background: 'none', border: 'none', cursor: 'pointer',
        color: 'var(--color-text-muted)',
        fontSize: '1.2rem', lineHeight: 1, padding: '0.1rem 0.45rem',
        borderRadius: '4px',
    },
    faseDragHandle: {
        cursor: 'grab',
        fontSize: '1.1rem',
        color: 'var(--color-text-muted)',
        opacity: 0.4,
        flexShrink: 0,
        lineHeight: 1,
        userSelect: 'none',
        padding: '0.2rem 0.4rem',
        alignSelf: 'flex-start',
        marginTop: '0.2rem',
    },
    addFaseBtn: {
        padding: '0.85rem 1.25rem',
        background: 'transparent',
        border: '1px dashed var(--color-gold)',
        color: 'var(--color-gold-dark)',
        fontFamily: 'var(--font-mono, monospace)',
        fontSize: '0.78rem',
        borderRadius: '8px',
        cursor: 'pointer',
        textAlign: 'center',
    },
    addInline: {
        display: 'block',
        margin: '0.5rem 0 0.75rem',
        padding: '0.5rem 0.5rem',
        background: 'transparent',
        border: 'none',
        color: 'var(--color-gold-dark)',
        fontSize: '0.78rem',
        fontFamily: 'var(--font-mono, monospace)',
        cursor: 'pointer',
        textAlign: 'left',
    },
    addInlineSm: {
        display: 'block',
        margin: '0.4rem 0 0',
        padding: '0.3rem 0',
        background: 'transparent',
        border: 'none',
        color: 'var(--color-gold-dark)',
        fontSize: '0.75rem',
        fontFamily: 'var(--font-mono, monospace)',
        cursor: 'pointer',
        textAlign: 'left',
    },
    temasList: {
        display: 'flex',
        flexDirection: 'column',
    },
    tema: {},
    temaRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.85rem',
        padding: '1.1rem 0.5rem',
        userSelect: 'none',
    },
    temaDragHandle: {
        cursor: 'grab', fontSize: '0.95rem',
        color: 'var(--color-text-muted)', opacity: 0.4,
        flexShrink: 0, lineHeight: 1, userSelect: 'none',
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
        minHeight: '1rem',
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
        cursor: 'pointer',
        flexShrink: 0,
    },
    deadlineInput: {
        fontFamily: 'var(--font-mono, monospace)',
        fontSize: '0.75rem',
        padding: '0.25rem 0.5rem',
        borderRadius: '6px',
        border: '1px solid var(--color-gold)',
        background: 'var(--color-white)',
    },
    chevronBtn: {
        background: 'none', border: 'none', cursor: 'pointer',
        color: 'var(--color-text-muted)', padding: '0.1rem',
        display: 'flex', alignItems: 'center', flexShrink: 0,
    },
    chevron: { transition: 'transform 0.2s ease' },
    temaDeleteBtn: {
        background: 'none', border: 'none', cursor: 'pointer',
        color: 'var(--color-text-muted)',
        fontSize: '1.1rem', lineHeight: 1, padding: '0.1rem 0.4rem',
        borderRadius: '4px', flexShrink: 0,
    },
    deleteConfirmInline: {
        display: 'flex', gap: '0.25rem', alignItems: 'center',
    },
    confirmYes: {
        fontSize: '0.72rem', padding: '0.3rem 0.65rem',
        background: 'var(--color-error)', color: 'white',
        border: 'none', borderRadius: '4px', cursor: 'pointer',
    },
    confirmNo: {
        fontSize: '0.72rem', padding: '0.3rem 0.65rem',
        background: 'transparent', color: 'var(--color-text-muted)',
        border: '1px solid var(--color-border)', borderRadius: '4px', cursor: 'pointer',
    },
    confirmYesXs: {
        fontSize: '0.65rem', padding: '0.15rem 0.4rem',
        background: 'var(--color-error)', color: 'white',
        border: 'none', borderRadius: '3px', cursor: 'pointer',
    },
    confirmNoXs: {
        fontSize: '0.65rem', padding: '0.15rem 0.4rem',
        background: 'transparent', color: 'var(--color-text-muted)',
        border: '1px solid var(--color-border)', borderRadius: '3px', cursor: 'pointer',
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
        flexShrink: 0,
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
        padding: '0.5rem 0.5rem 1.5rem 1.75rem',
    },
    sectionLabel: {
        fontFamily: 'var(--font-mono, monospace)',
        fontSize: '0.7rem',
        fontWeight: 500,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'var(--color-text-muted)',
        marginBottom: '0.85rem',
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
    tareasTimeline: {
        position: 'relative',
    },
    tarea: {
        display: 'grid',
        gridTemplateColumns: '0.85rem 1.2rem 1fr auto',
        gap: '0.6rem',
        alignItems: 'center',
        padding: '0.32rem 0.4rem',
        borderRadius: '6px',
    },
    tareaDragHandle: {
        cursor: 'grab', fontSize: '0.8rem',
        color: 'var(--color-text-muted)', opacity: 0.35,
        userSelect: 'none', lineHeight: 1,
    },
    tareaNode: {
        width: '16px', height: '16px',
        border: '1.5px solid #D6D0C2',
        background: 'var(--color-white)',
        borderRadius: '50%',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative',
        flexShrink: 0,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
    },
    tareaNodeEnCurso: {
        borderColor: 'var(--color-gold)',
    },
    tareaNodeDot: {
        width: '8px', height: '8px',
        background: 'var(--color-gold)',
        borderRadius: '50%',
    },
    tareaNodeCompletada: {
        borderColor: '#4B7C5C',
        background: '#4B7C5C',
    },
    tareaNodeCheck: {
        color: 'white', fontSize: '0.65rem', fontWeight: 700, lineHeight: 1,
    },
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
    tareaDeleteBtn: {
        background: 'none', border: 'none', cursor: 'pointer',
        color: 'var(--color-text-muted)',
        fontSize: '0.95rem', lineHeight: 1, padding: '0.1rem 0.35rem',
        borderRadius: '4px', flexShrink: 0,
    },
    acuerdo: {
        display: 'grid',
        gridTemplateColumns: '60px 1fr auto',
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
        flexShrink: 0,
    },
    acuerdoText: { color: 'var(--color-text)' },
    cotizacion: {
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto auto',
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
        transition: 'background 0.15s, color 0.15s',
        lineHeight: 1,
    },
    inlineInput: {
        width: '100%',
        background: 'var(--color-cream)',
        border: '1px solid var(--color-gold)',
        borderRadius: '4px',
        padding: '0.3rem 0.5rem',
        fontFamily: 'var(--font-sans)',
        color: 'var(--color-text)',
        outline: 'none',
    },
    inlineTextarea: {
        width: '100%',
        background: 'var(--color-cream)',
        border: '1px solid var(--color-gold)',
        borderRadius: '4px',
        padding: '0.3rem 0.5rem',
        fontFamily: 'var(--font-sans)',
        fontSize: '0.85rem',
        color: 'var(--color-text)',
        outline: 'none',
        resize: 'vertical',
        marginTop: '0.2rem',
    },
}

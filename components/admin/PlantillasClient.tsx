'use client'

import { useState, useTransition, useRef, useEffect, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import {
    updatePlantillaFase,
    createPlantillaFase,
    deletePlantillaFase,
    updatePlantillaTarea,
    createPlantillaTarea,
    deletePlantillaTarea,
    reorderPlantillaFases,
    reorderPlantillaTareas,
    createCustomPlantilla,
    deleteCustomPlantilla,
    updatePlantillaNombreDisplay,
} from '@/app/(admin)/plantillas/actions'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlantillaTarea {
    id: string
    nombre: string
    tipo: string | null
    meses_antes: number | null
    orden: number
}

interface PlantillaFase {
    id: string
    nombre: string
    descripcion: string | null
    orden: number
    tareas: PlantillaTarea[]
}

const BASE_TIPOS_EVENTO = [
    { value: 'boda', defaultLabel: '💍 Boda' },
    { value: 'quince', defaultLabel: '🌸 Quinceañera' },
    { value: 'cumple', defaultLabel: '🎂 Cumpleaños' },
    { value: 'baby_shower', defaultLabel: '🍼 Baby Shower' },
]

// ─── Custom plantillas dropdown ────────────────────────────────────────────────

function CustomDropdown({
    customTipos,
    tipoActivo,
    isCustomSelected,
    open,
    onToggle,
    onClose,
    onSelect,
    onEdit,
    onDelete,
}: {
    customTipos: { value: string; label: string }[]
    tipoActivo: string
    isCustomSelected: boolean
    open: boolean
    onToggle: () => void
    onClose: () => void
    onSelect: (tipo: string) => void
    onEdit: (t: { value: string; label: string }) => void
    onDelete: (t: { value: string; label: string }) => void
}) {
    const ref = useRef<HTMLDivElement>(null)
    const selected = customTipos.find((c) => c.value === tipoActivo)

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose()
        }
        if (open) document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [open, onClose])

    return (
        <div ref={ref} className="plantillas-custom-dropdown">
            <button
                type="button"
                role="tab"
                aria-selected={isCustomSelected}
                aria-expanded={open}
                aria-haspopup="listbox"
                className={`plantilla-tab-pill plantillas-dropdown-trigger ${isCustomSelected ? 'plantilla-tab-pill--active' : ''} ${open ? 'plantilla-tab-pill--dropdown-open' : ''}`}
                onClick={onToggle}
            >
                <span>{selected ? selected.label : 'Mis plantillas'}</span>
                <span style={{ fontSize: '0.65rem', opacity: 0.9 }}>▾</span>
            </button>
            {open && (
                <div className="plantillas-dropdown-menu" role="listbox">
                    {customTipos.map((t) => {
                        const isActive = tipoActivo === t.value
                        return (
                            <div
                                key={t.value}
                                role="option"
                                aria-selected={isActive}
                                className={`plantillas-dropdown-item ${isActive ? 'plantillas-dropdown-item--active' : ''}`}
                                onClick={() => onSelect(t.value)}
                            >
                                <span style={{ flex: 1 }}>{t.label}</span>
                                <button
                                    type="button"
                                    className="tab-icon"
                                    onClick={(e) => { e.stopPropagation(); onEdit(t) }}
                                    title="Renombrar"
                                    aria-label="Renombrar"
                                >
                                    ✏️
                                </button>
                                <button
                                    type="button"
                                    className="tab-icon tab-icon--trash"
                                    onClick={(e) => { e.stopPropagation(); onDelete(t) }}
                                    title="Eliminar plantilla"
                                    aria-label="Eliminar plantilla"
                                >
                                    🗑
                                </button>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

const TIPOS_TAREA = ['reunion', 'entregable', 'decision']
const TIPO_LABELS: Record<string, string> = {
    reunion: '💬 Reunión',
    entregable: '📦 Entregable',
    decision: '⚡ Decisión',
}

// ─── Main component ───────────────────────────────────────────────────────────

const TIPOS_BASE = ['boda', 'quince', 'cumple', 'baby_shower']

export function PlantillasClient({
    fasesPorTipo,
    customTipos = [],
    baseTipoDisplayNames,
}: {
    fasesPorTipo: Record<string, PlantillaFase[]>
    customTipos?: { value: string; label: string }[]
    initialTipo?: string
    baseTipoDisplayNames?: Record<string, string>
}) {
    const searchParams = useSearchParams()
    const router = useRouter()
    const tipoActivo = useMemo(() => {
        const t = searchParams.get('tipo') ?? 'boda'
        return (TIPOS_BASE.includes(t) || t in fasesPorTipo) ? t : 'boda'
    }, [searchParams, fasesPorTipo])
    const [fases, setFases] = useState<PlantillaFase[]>(() => fasesPorTipo[tipoActivo] ?? [])
    useEffect(() => {
        setFases(fasesPorTipo[tipoActivo] ?? [])
    }, [fasesPorTipo, tipoActivo])
    const [globalError, setGlobalError] = useState<string | null>(null)
    const [, startReorder] = useTransition()
    const [showNewModal, setShowNewModal] = useState(false)
    const [newNombre, setNewNombre] = useState('')
    const [creating, setCreating] = useState(false)
    const [localCustomTipos, setLocalCustomTipos] = useState(customTipos)
    const [confirmDeleteCustom, setConfirmDeleteCustom] = useState<string | null>(null)
    const [editingTipo, setEditingTipo] = useState<string | null>(null)
    const [editNombreTipo, setEditNombreTipo] = useState('')
    const [savingNombreTipo, setSavingNombreTipo] = useState(false)
    const [customDropdownOpen, setCustomDropdownOpen] = useState(false)

    function changeTipo(tipo: string) {
        setGlobalError(null)
        router.push(`/plantillas?tipo=${encodeURIComponent(tipo)}`)
    }

    function getBaseTipoLabel(value: string) {
        const override = baseTipoDisplayNames?.[value]
        if (override) return override
        const base = BASE_TIPOS_EVENTO.find((t) => t.value === value)
        return base?.defaultLabel ?? value
    }

    function startEditingTipo(tipo: string, label: string) {
        setEditingTipo(tipo)
        setEditNombreTipo(label)
    }

    async function saveNombreTipo() {
        const tipo = editingTipo
        const nombre = editNombreTipo.trim()
        if (!tipo || !nombre) {
            setEditingTipo(null)
            return
        }
        setSavingNombreTipo(true)
        const res = await updatePlantillaNombreDisplay(tipo, nombre)
        setSavingNombreTipo(false)
        if (res?.error) {
            setGlobalError(res.error)
            return
        }
        // Action redirects on success; if no redirect (edge case), close editor
        setEditingTipo(null)
    }

    async function handleCreateCustom() {
        const nombre = newNombre.trim()
        if (!nombre) return
        setCreating(true)
        const res = await createCustomPlantilla(nombre)
        setCreating(false)
        if ('error' in res && res.error) {
            setGlobalError(res.error)
        } else {
            setShowNewModal(false)
            setNewNombre('')
            // Action redirects on success to new plantilla
        }
    }

    async function handleDeleteCustom(tipo: string) {
        setConfirmDeleteCustom(tipo)
    }

    async function executeDeleteCustom() {
        const tipo = confirmDeleteCustom
        if (!tipo) return
        setConfirmDeleteCustom(null)
        const res = await deleteCustomPlantilla(tipo)
        if (res?.error) {
            setGlobalError(res.error)
        } else {
            setLocalCustomTipos((prev) => prev.filter((t) => t.value !== tipo))
            // Action redirects to /plantillas?tipo=boda on success
        }
    }

    // ── Drag end handler ──────────────────────────────────────────────────────

    function handleDragEnd(result: DropResult) {
        const { destination, source, type } = result
        if (!destination) return
        if (destination.droppableId === source.droppableId && destination.index === source.index) return

        if (type === 'FASE') {
            // Reorder fases
            const reordered = Array.from(fases)
            const [moved] = reordered.splice(source.index, 1)
            reordered.splice(destination.index, 0, moved)

            // Optimistic update
            const withNewOrden = reordered.map((f, i) => ({ ...f, orden: i + 1 }))
            setFases(withNewOrden)

            // Persist to DB
            startReorder(async () => {
                const res = await reorderPlantillaFases(withNewOrden.map((f) => ({ id: f.id, orden: f.orden })))
                if (res?.error) setGlobalError(res.error)
            })
        } else if (type === 'TAREA') {
            // source.droppableId = faseId
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
                const res = await reorderPlantillaTareas(tareasConOrden.map((t) => ({ id: t.id, orden: t.orden })))
                if (res?.error) setGlobalError(res.error)
            })
        }
    }

    // ── Inline tarea updater (to avoid full reload for tarea changes) ──────────

    function updateTareaInState(faseId: string, tareaId: string, patch: Partial<PlantillaTarea>) {
        setFases((prev) =>
            prev.map((f) =>
                f.id !== faseId
                    ? f
                    : { ...f, tareas: f.tareas.map((t) => (t.id === tareaId ? { ...t, ...patch } : t)) }
            )
        )
    }

    function removeTareaFromState(faseId: string, tareaId: string) {
        setFases((prev) =>
            prev.map((f) =>
                f.id !== faseId ? f : { ...f, tareas: f.tareas.filter((t) => t.id !== tareaId) }
            )
        )
    }

    return (
        <div style={st.wrapper}>
            {globalError && <div className="alert-error">{globalError}</div>}

            {/* Type selector — base pills + custom dropdown + Nueva */}
            <div className="plantillas-tabs-row" role="tablist">
                {/* Base plantillas — always visible pills */}
                {BASE_TIPOS_EVENTO.map((t) => {
                    const label = getBaseTipoLabel(t.value)
                    const isActive = tipoActivo === t.value
                    return (
                        <div
                            key={t.value}
                            role="tab"
                            aria-selected={isActive}
                            className={`plantilla-tab-pill ${isActive ? 'plantilla-tab-pill--active' : ''}`}
                            onClick={() => { changeTipo(t.value); setCustomDropdownOpen(false) }}
                        >
                            <span>{label}</span>
                            <button
                                type="button"
                                className="tab-icon"
                                onClick={(e) => { e.stopPropagation(); startEditingTipo(t.value, label) }}
                                title="Renombrar plantilla"
                                aria-label="Renombrar plantilla"
                            >
                                ✏️
                            </button>
                        </div>
                    )
                })}

                {/* Custom plantillas — dropdown "Mis plantillas ▾" */}
                {localCustomTipos.length > 0 && (
                    <CustomDropdown
                        customTipos={localCustomTipos}
                        tipoActivo={tipoActivo}
                        isCustomSelected={localCustomTipos.some((c) => c.value === tipoActivo)}
                        open={customDropdownOpen}
                        onToggle={() => setCustomDropdownOpen((v) => !v)}
                        onClose={() => setCustomDropdownOpen(false)}
                        onSelect={(tipo) => { changeTipo(tipo); setCustomDropdownOpen(false) }}
                        onEdit={(t) => { setCustomDropdownOpen(false); startEditingTipo(t.value, t.label) }}
                        onDelete={(t) => { setCustomDropdownOpen(false); handleDeleteCustom(t.value) }}
                    />
                )}

                {/* Nueva — always visible */}
                <div
                    role="tab"
                    className="plantilla-tab-pill plantilla-tab-pill--new"
                    onClick={() => { setShowNewModal(true); setCustomDropdownOpen(false) }}
                >
                    + Nueva
                </div>
            </div>

            {/* Inline editor for plantilla name */}
            {editingTipo && (
                <div style={st.renameRow}>
                    <input
                        className="form-input"
                        value={editNombreTipo}
                        onChange={(e) => setEditNombreTipo(e.target.value)}
                        placeholder="Nombre de la plantilla"
                        style={{ maxWidth: '260px' }}
                    />
                    <button
                        className="btn-ghost"
                        style={st.smallBtn}
                        type="button"
                        onClick={() => { setEditingTipo(null); setEditNombreTipo('') }}
                        disabled={savingNombreTipo}
                    >
                        Cancelar
                    </button>
                    <button
                        className="btn-gold"
                        style={st.smallBtn}
                        type="button"
                        onClick={saveNombreTipo}
                        disabled={savingNombreTipo || !editNombreTipo.trim()}
                    >
                        {savingNombreTipo ? 'Guardando…' : 'Guardar nombre'}
                    </button>
                </div>
            )}

            {/* New template modal */}
            {showNewModal && (
                <div style={st.modalOverlay} onClick={() => setShowNewModal(false)}>
                    <div style={st.modal} onClick={(e) => e.stopPropagation()}>
                        <h3 style={st.modalTitle}>Nueva plantilla</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                            Dale un nombre descriptivo a tu plantilla custom.
                        </p>
                        <input
                            className="form-input"
                            placeholder="Ej: Despedida de Soltera"
                            value={newNombre}
                            onChange={(e) => setNewNombre(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreateCustom()}
                            autoFocus
                            style={{ marginBottom: '1rem' }}
                        />
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button
                                className="btn-ghost"
                                onClick={() => { setShowNewModal(false); setNewNombre('') }}
                            >Cancelar</button>
                            <button
                                className="btn-primary"
                                onClick={handleCreateCustom}
                                disabled={creating || !newNombre.trim()}
                            >{creating ? 'Creando…' : 'Crear plantilla'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Info banner */}
            <div style={st.infoBanner}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                Los cambios aquí solo afectan eventos futuros. Podés arrastrar las fases y tareas para reordenarlas.
            </div>

            {/* Fases — draggable */}
            <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="fases-list" type="FASE">
                    {(provided) => (
                        <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            style={st.fasesList}
                        >
                            {fases.length === 0 && (
                                <div className="card" style={st.emptyFases}>
                                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>No hay fases para este tipo de evento. Agregá la primera.</p>
                                </div>
                            )}

                            {fases.map((fase, index) => (
                                <Draggable key={fase.id} draggableId={fase.id} index={index}>
                                    {(drag, snapshot) => (
                                        <div
                                            ref={drag.innerRef}
                                            {...drag.draggableProps}
                                            style={{
                                                ...drag.draggableProps.style,
                                                opacity: snapshot.isDragging ? 0.85 : 1,
                                            }}
                                        >
                                            <FaseEditor
                                                fase={fase}
                                                tipoEvento={tipoActivo}
                                                dragHandleProps={drag.dragHandleProps}
                                                onError={setGlobalError}
                                                onTareaUpdate={(tareaId, patch) => updateTareaInState(fase.id, tareaId, patch)}
                                                onTareaRemove={(tareaId) => removeTareaFromState(fase.id, tareaId)}
                                            />
                                        </div>
                                    )}
                                </Draggable>
                            ))}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            </DragDropContext>

            {/* Add fase */}
            <AddFaseForm
                tipoEvento={tipoActivo}
                onError={setGlobalError}
            />

            {/* Confirm delete custom plantilla modal */}
            <ConfirmModal
                isOpen={confirmDeleteCustom !== null}
                title="¿Eliminar plantilla?"
                message="Esta acción eliminará todas las fases y tareas asociadas. No se puede deshacer."
                confirmLabel="Eliminar"
                danger
                onConfirm={executeDeleteCustom}
                onCancel={() => setConfirmDeleteCustom(null)}
            />
        </div>
    )
}

// ─── FaseEditor ───────────────────────────────────────────────────────────────

function FaseEditor({
    fase,
    tipoEvento,
    dragHandleProps,
    onError,
    onTareaUpdate,
    onTareaRemove,
}: {
    fase: PlantillaFase
    tipoEvento: string
    dragHandleProps: React.HTMLAttributes<HTMLElement> | null | undefined
    onError: (e: string) => void
    onTareaUpdate: (tareaId: string, patch: Partial<PlantillaTarea>) => void
    onTareaRemove: (tareaId: string) => void
}) {
    const [editingFase, setEditingFase] = useState(false)
    const [nombre, setNombre] = useState(fase.nombre)
    const [descripcion, setDescripcion] = useState(fase.descripcion ?? '')
    const [isPending, startTransition] = useTransition()
    const [showDeleteModal, setShowDeleteModal] = useState(false)

    function saveFase() {
        startTransition(async () => {
            const res = await updatePlantillaFase(fase.id, { nombre, descripcion: descripcion || undefined }, tipoEvento)
            if (res?.error) onError(res.error)
            else setEditingFase(false)
            // On success, action redirects
        })
    }

    function handleDelete() {
        setShowDeleteModal(true)
    }

    function executeDelete() {
        setShowDeleteModal(false)
        startTransition(async () => {
            const res = await deletePlantillaFase(fase.id, tipoEvento)
            if (res?.error) onError(res.error)
            // On success, action redirects
        })
    }

    return (
        <div className="card" style={st.faseCard}>
            {/* Fase header */}
            <div style={st.faseHeader}>
                {/* Drag handle */}
                <div
                    {...(dragHandleProps ?? {})}
                    style={st.dragHandle}
                    title="Arrastrar para reordenar"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" opacity="0.4">
                        <circle cx="9" cy="5" r="1.5" /><circle cx="15" cy="5" r="1.5" />
                        <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
                        <circle cx="9" cy="19" r="1.5" /><circle cx="15" cy="19" r="1.5" />
                    </svg>
                </div>

                {editingFase ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <input
                            className="form-input"
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            placeholder="Nombre de la fase"
                            style={{ fontSize: '0.9rem' }}
                        />
                        <input
                            className="form-input"
                            value={descripcion}
                            onChange={(e) => setDescripcion(e.target.value)}
                            placeholder="Descripción (opcional)"
                            style={{ fontSize: '0.85rem' }}
                        />
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className="btn-ghost" style={st.smallBtn} onClick={() => setEditingFase(false)}>Cancelar</button>
                            <button className="btn-gold" style={st.smallBtn} onClick={saveFase} disabled={isPending}>
                                {isPending ? '...' : 'Guardar fase'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div style={{ flex: 1 }}>
                            <p style={st.faseNombre}>{fase.nombre}</p>
                            {fase.descripcion && <p style={st.faseDesc}>{fase.descripcion}</p>}
                        </div>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <button className="btn-ghost" style={st.smallBtn} onClick={() => setEditingFase(true)}>Editar</button>
                            <button
                                className="btn-ghost"
                                style={{ ...st.smallBtn, color: 'var(--color-error)', borderColor: 'rgba(200,75,75,0.2)' }}
                                onClick={handleDelete}
                                disabled={isPending}
                            >
                                Eliminar
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* Tareas — draggable within phase */}
            <div style={st.tareasSection}>
                <p style={st.tareasLabel}>Tareas ({fase.tareas.length})</p>
                <Droppable droppableId={fase.id} type="TAREA">
                    {(provided) => (
                        <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            style={st.tareasList}
                        >
                            {fase.tareas.map((t, idx) => (
                                <Draggable key={t.id} draggableId={t.id} index={idx}>
                                    {(drag, snapshot) => (
                                        <div
                                            ref={drag.innerRef}
                                            {...drag.draggableProps}
                                            style={{
                                                ...drag.draggableProps.style,
                                                opacity: snapshot.isDragging ? 0.85 : 1,
                                            }}
                                        >
                                            <TareaEditor
                                                tarea={t}
                                                tipoEvento={tipoEvento}
                                                dragHandleProps={drag.dragHandleProps}
                                                onError={onError}
                                                onUpdated={(patch) => onTareaUpdate(t.id, patch)}
                                                onRemoved={() => onTareaRemove(t.id)}
                                            />
                                        </div>
                                    )}
                                </Draggable>
                            ))}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
                <AddTareaForm faseId={fase.id} tipoEvento={tipoEvento} onError={onError} />
            </div>

            {/* Confirm delete fase modal */}
            <ConfirmModal
                isOpen={showDeleteModal}
                title="¿Eliminar fase?"
                message={`Se eliminarán la fase "${fase.nombre}" y todas sus tareas. Esta acción no se puede deshacer.`}
                confirmLabel="Eliminar"
                danger
                onConfirm={executeDelete}
                onCancel={() => setShowDeleteModal(false)}
            />
        </div>
    )
}

// ─── TareaEditor ──────────────────────────────────────────────────────────────

function TareaEditor({
    tarea: t,
    tipoEvento,
    dragHandleProps,
    onError,
    onUpdated,
    onRemoved,
}: {
    tarea: PlantillaTarea
    tipoEvento: string
    dragHandleProps: React.HTMLAttributes<HTMLElement> | null | undefined
    onError: (e: string) => void
    onUpdated: (patch: Partial<PlantillaTarea>) => void
    onRemoved: () => void
}) {
    const [editing, setEditing] = useState(false)
    const [nombre, setNombre] = useState(t.nombre)
    const [tipo, setTipo] = useState(t.tipo ?? 'decision')
    const [meses, setMeses] = useState(t.meses_antes?.toString() ?? '')
    const [isPending, startTransition] = useTransition()

    function save() {
        startTransition(async () => {
            const mesesVal = meses !== '' ? parseInt(meses) : null
            const res = await updatePlantillaTarea(t.id, { nombre, tipo, meses_antes: mesesVal }, tipoEvento)
            if (res?.error) onError(res.error)
            else { setEditing(false); onUpdated({ nombre, tipo, meses_antes: mesesVal }) }
            // On success, action redirects (inline update is optimistic for UX)
        })
    }

    function handleDelete() {
        startTransition(async () => {
            const res = await deletePlantillaTarea(t.id, tipoEvento)
            if (res?.error) onError(res.error)
            else onRemoved()
            // On success, action redirects
        })
    }

    if (editing) {
        return (
            <div style={st.tareaEditorRow}>
                <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="form-input" style={{ width: '130px', fontSize: '0.78rem', padding: '0.35rem 0.5rem' }}>
                    {TIPOS_TAREA.map((tp) => (
                        <option key={tp} value={tp}>{TIPO_LABELS[tp]}</option>
                    ))}
                </select>
                <input
                    className="form-input"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Nombre de la tarea"
                    style={{ flex: 1, fontSize: '0.85rem' }}
                />
                <input
                    className="form-input"
                    type="number"
                    value={meses}
                    onChange={(e) => setMeses(e.target.value)}
                    placeholder="días antes"
                    style={{ width: '90px', fontSize: '0.78rem', padding: '0.35rem 0.5rem' }}
                />
                <button className="btn-ghost" style={st.smallBtn} onClick={() => setEditing(false)}>✕</button>
                <button className="btn-gold" style={st.smallBtn} onClick={save} disabled={isPending}>
                    {isPending ? '...' : '✓'}
                </button>
            </div>
        )
    }

    return (
        <div style={st.tareaRow}>
            {/* Drag handle */}
            <div
                {...(dragHandleProps ?? {})}
                style={st.dragHandleSm}
                title="Arrastrar para reordenar"
            >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" opacity="0.35">
                    <circle cx="9" cy="5" r="1.5" /><circle cx="15" cy="5" r="1.5" />
                    <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
                    <circle cx="9" cy="19" r="1.5" /><circle cx="15" cy="19" r="1.5" />
                </svg>
            </div>
            <span style={st.tipoChip}>{TIPO_LABELS[t.tipo ?? ''] ?? '•'}</span>
            <span style={{ flex: 1, fontSize: '0.85rem' }}>{t.nombre}</span>
            {t.meses_antes !== null && (
                <span style={st.mesesChip}>{t.meses_antes}d antes</span>
            )}
            <button className="btn-ghost" style={st.iconBtn} onClick={() => setEditing(true)}>✏</button>
            <button
                className="btn-ghost"
                style={{ ...st.iconBtn, color: 'var(--color-error)' }}
                onClick={handleDelete}
                disabled={isPending}
            >✕</button>
        </div>
    )
}

// ─── AddTareaForm ─────────────────────────────────────────────────────────────

function AddTareaForm({ faseId, tipoEvento, onError }: { faseId: string; tipoEvento: string; onError: (e: string) => void }) {
    const [show, setShow] = useState(false)
    const [nombre, setNombre] = useState('')
    const [tipo, setTipo] = useState('decision')
    const [meses, setMeses] = useState('')
    const [isPending, startTransition] = useTransition()

    function submit() {
        if (!nombre.trim()) return
        startTransition(async () => {
            const res = await createPlantillaTarea(faseId, nombre.trim(), tipo, meses !== '' ? parseInt(meses) : null, tipoEvento)
            if (res?.error) onError(res.error)
            else { setNombre(''); setMeses(''); setShow(false) }
            // On success, action redirects
        })
    }

    if (!show) {
        return (
            <button className="btn-ghost" style={{ ...st.smallBtn, alignSelf: 'flex-start', marginTop: '0.5rem' }} onClick={() => setShow(true)}>
                + Agregar tarea
            </button>
        )
    }

    return (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.5rem', flexWrap: 'wrap' }}>
            <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="form-input" style={{ width: '130px', fontSize: '0.78rem', padding: '0.35rem 0.5rem' }}>
                {TIPOS_TAREA.map((tp) => <option key={tp} value={tp}>{TIPO_LABELS[tp]}</option>)}
            </select>
            <input className="form-input" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre de la tarea" style={{ flex: 1, minWidth: '150px', fontSize: '0.85rem' }} />
            <input className="form-input" type="number" value={meses} onChange={(e) => setMeses(e.target.value)} placeholder="días antes" style={{ width: '90px', fontSize: '0.78rem', padding: '0.35rem 0.5rem' }} />
            <button className="btn-ghost" style={st.smallBtn} onClick={() => setShow(false)}>Cancelar</button>
            <button className="btn-gold" style={st.smallBtn} onClick={submit} disabled={isPending || !nombre.trim()}>
                {isPending ? '...' : 'Agregar'}
            </button>
        </div>
    )
}

// ─── AddFaseForm ──────────────────────────────────────────────────────────────

function AddFaseForm({ tipoEvento, onError }: { tipoEvento: string; onError: (e: string) => void }) {
    const [show, setShow] = useState(false)
    const [nombre, setNombre] = useState('')
    const [descripcion, setDescripcion] = useState('')
    const [isPending, startTransition] = useTransition()

    function submit() {
        if (!nombre.trim()) return
        startTransition(async () => {
            const res = await createPlantillaFase(tipoEvento, nombre.trim(), descripcion.trim())
            if (res?.error) onError(res.error)
            else { setNombre(''); setDescripcion(''); setShow(false) }
            // On success, action redirects
        })
    }

    if (!show) {
        return (
            <button className="btn-gold" onClick={() => setShow(true)} style={{ alignSelf: 'flex-start' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                Agregar fase
            </button>
        )
    }

    return (
        <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <p style={st.faseNombre}>Nueva fase</p>
            <input className="form-input" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre de la fase" />
            <input className="form-input" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Descripción (opcional)" />
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button className="btn-ghost" onClick={() => setShow(false)}>Cancelar</button>
                <button className="btn-gold" onClick={submit} disabled={isPending || !nombre.trim()}>
                    {isPending ? 'Guardando...' : 'Crear fase'}
                </button>
            </div>
        </div>
    )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

type Styles = Record<string, React.CSSProperties>

const st: Styles = {
    wrapper: { display: 'flex', flexDirection: 'column', gap: '1rem' },
    infoBanner: { display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.7rem 1rem', backgroundColor: 'rgba(107,124,92,0.08)', border: '1px solid rgba(107,124,92,0.2)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', color: 'var(--color-olive)', lineHeight: 1.5 },
    fasesList: { display: 'flex', flexDirection: 'column', gap: '0.85rem' },
    faseCard: { padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' },
    faseHeader: { display: 'flex', alignItems: 'flex-start', gap: '0.65rem' },
    dragHandle: { cursor: 'grab', display: 'flex', alignItems: 'center', paddingTop: '0.25rem', flexShrink: 0, color: 'var(--color-text-muted)' },
    dragHandleSm: { cursor: 'grab', display: 'flex', alignItems: 'center', flexShrink: 0, color: 'var(--color-text-muted)' },
    faseNombre: { fontFamily: 'var(--font-serif)', fontSize: '1rem', fontWeight: 600, color: 'var(--color-text)' },
    faseDesc: { fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.15rem' },
    tareasSection: { display: 'flex', flexDirection: 'column', gap: '0.35rem', paddingTop: '0.5rem', borderTop: '1px solid var(--color-border)' },
    tareasLabel: { fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-muted)', marginBottom: '0.15rem' },
    tareasList: { display: 'flex', flexDirection: 'column', gap: '0.2rem' },
    tareaRow: { display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.5rem', borderRadius: 'var(--radius-sm)', background: 'var(--color-cream)' },
    tareaEditorRow: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0', flexWrap: 'wrap' },
    tipoChip: { fontSize: '0.72rem', color: 'var(--color-text-muted)', flexShrink: 0 },
    mesesChip: { fontSize: '0.7rem', color: 'var(--color-text-muted)', backgroundColor: 'var(--color-cream-dark)', padding: '0.15rem 0.45rem', borderRadius: '20px', whiteSpace: 'nowrap', flexShrink: 0 },
    iconBtn: { fontSize: '0.7rem', padding: '0.2rem 0.45rem', flexShrink: 0 },
    smallBtn: { fontSize: '0.78rem', padding: '0.35rem 0.75rem' },
    emptyFases: { padding: '2rem', textAlign: 'center' },
    modalOverlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 },
    modal: { backgroundColor: 'white', borderRadius: 'var(--radius)', padding: '2rem', width: '100%', maxWidth: '400px', boxShadow: '0 8px 40px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column', gap: '0.75rem' },
    modalTitle: { fontFamily: 'var(--font-serif)', fontSize: '1.2rem', fontWeight: 600, color: 'var(--color-text)' },
    renameRow: { marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' },
}

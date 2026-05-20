'use client'

import { useMemo, useState, useTransition, useEffect, useRef, type CSSProperties } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
    saveVariante,
    createVariante,
    duplicateVariante,
    deleteVariante,
    updateSimulacionNombre,
} from '@/app/(admin)/simulador/actions'
import { VariantePromptModal } from '@/components/admin/simulador/VariantePromptModal'

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

interface ItemState {
    proveedor_id: string | null
    incluido: boolean
}

interface VarianteData {
    id: string
    nombre: string
    cantidad_invitados: number
    items: Record<string, ItemState>
}

interface Props {
    simulador: { id: string; nombre: string }
    variantes: VarianteData[]
    rubros: Rubro[]
}

// ─── Paleta donut ───────────────────────────────────────────────────────────

const PIE_COLORS = [
    '#C9A84C', '#6B7C5C', '#A8893A', '#8A9C75', '#B89968',
    '#7D6952', '#E2C97E', '#4A5C3B', '#A39D8E', '#BDA87F',
    '#9AA67D', '#8B6F4E', '#D4C9A8',
]

// ─── Componente ─────────────────────────────────────────────────────────────

export function SimuladorClient({ simulador, variantes: initialVariantes, rubros }: Props) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()

    const [nombreSim, setNombreSim] = useState(simulador.nombre)
    const [variantes, setVariantes] = useState(initialVariantes)
    const [activeId, setActiveId] = useState(initialVariantes[0]?.id ?? '')
    const [dashboardMode, setDashboardMode] = useState(false)
    const [renamingVariante, setRenamingVariante] = useState(false)
    const [promptModal, setPromptModal] = useState<
        | { mode: 'create'; defaultName: string }
        | { mode: 'duplicate'; sourceId: string; defaultName: string }
        | null
    >(null)
    const [renameValue, setRenameValue] = useState('')
    const [savedAt, setSavedAt] = useState<Date | null>(null)
    const [tooltip, setTooltip] = useState<{
        prov: string; desc: string; x: number; y: number
    } | null>(null)

    // Sincronizar al refresh del server (post-acciones)
    const lastInitialIdRef = useRef<string>('')
    useEffect(() => {
        const signature = `${simulador.nombre}|${initialVariantes.map(v => v.id).join(',')}`
        if (lastInitialIdRef.current !== signature) {
            setNombreSim(simulador.nombre)
            setVariantes(initialVariantes)
            // Si la activa todavía existe, mantenerla; si no, primera
            const stillExists = initialVariantes.some(v => v.id === activeId)
            if (!stillExists && initialVariantes.length > 0) {
                setActiveId(initialVariantes[0].id)
            }
            lastInitialIdRef.current = signature
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [simulador.nombre, initialVariantes])

    const active = variantes.find(v => v.id === activeId) ?? variantes[0]
    const initialActive = initialVariantes.find(v => v.id === activeId)

    const updateActive = (patch: Partial<VarianteData>) => {
        setVariantes(prev => prev.map(v => v.id === active.id ? { ...v, ...patch } : v))
    }
    const setItem = (rubroId: string, patch: Partial<ItemState>) => {
        if (!active) return
        const nextItems = {
            ...active.items,
            [rubroId]: { ...active.items[rubroId], ...patch },
        }
        updateActive({ items: nextItems })
    }

    // ─── Cálculos para la variante activa ───────────────────────────────────

    const { totalsByRubro, total } = useMemo(() => {
        const totals: Record<string, number> = {}
        let acc = 0
        if (!active) return { totalsByRubro: totals, total: 0 }
        for (const r of rubros) {
            const it = active.items[r.id]
            if (!it?.incluido || !it.proveedor_id) {
                totals[r.id] = 0
                continue
            }
            const prov = r.proveedores.find(p => p.id === it.proveedor_id)
            if (!prov) {
                totals[r.id] = 0
                continue
            }
            const monto = r.tipo === 'var' ? prov.precio * active.cantidad_invitados : prov.precio
            totals[r.id] = monto
            acc += monto
        }
        return { totalsByRubro: totals, total: acc }
    }, [rubros, active])

    const referenciaMedia = useMemo(() => {
        if (!active) return 0
        return rubros.reduce((sum, r) => {
            if (r.opcional) return sum
            const provs = [...r.proveedores].sort((a, b) => a.orden - b.orden)
            const mid = provs[Math.floor((provs.length - 1) / 2)]
            if (!mid) return sum
            return sum + (r.tipo === 'var' ? mid.precio * active.cantidad_invitados : mid.precio)
        }, 0)
    }, [rubros, active])

    const delta = total - referenciaMedia
    const deltaPct = referenciaMedia > 0 ? (delta / referenciaMedia) * 100 : 0

    // ─── Dirty detection ────────────────────────────────────────────────────

    const isVarianteDirty = (v: VarianteData) => {
        const init = initialVariantes.find(iv => iv.id === v.id)
        if (!init) return true
        if (v.nombre !== init.nombre) return true
        if (v.cantidad_invitados !== init.cantidad_invitados) return true
        for (const r of rubros) {
            const cur = v.items[r.id]
            const ini = init.items[r.id]
            if (!ini || cur.proveedor_id !== ini.proveedor_id || cur.incluido !== ini.incluido) return true
        }
        return false
    }

    const dirtyVariantes = useMemo(
        () => variantes.filter(isVarianteDirty),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [variantes, initialVariantes, rubros]
    )
    const nombreSimDirty = nombreSim !== simulador.nombre
    const isDirty = dirtyVariantes.length > 0 || nombreSimDirty

    // ─── Save ───────────────────────────────────────────────────────────────

    const handleSave = () => {
        startTransition(async () => {
            if (nombreSimDirty) {
                await updateSimulacionNombre(simulador.id, nombreSim)
            }
            for (const v of dirtyVariantes) {
                await saveVariante(v.id, {
                    nombre: v.nombre,
                    cantidad_invitados: v.cantidad_invitados,
                    items: rubros.map(r => ({
                        rubro_id: r.id,
                        proveedor_id: v.items[r.id].proveedor_id,
                        incluido: v.items[r.id].incluido,
                    })),
                })
            }
            setSavedAt(new Date())
            router.refresh()
        })
    }

    // ─── Tab actions ────────────────────────────────────────────────────────

    const confirmIfDirty = () => {
        if (isDirty) {
            return window.confirm('Tenés cambios sin guardar. ¿Continuar y descartar?')
        }
        return true
    }

    const handleNewVariante = () => {
        if (!confirmIfDirty()) return
        setPromptModal({
            mode: 'create',
            defaultName: `Variante ${variantes.length + 1}`,
        })
    }

    const handleDuplicate = () => {
        if (!active) return
        if (!confirmIfDirty()) return
        setPromptModal({
            mode: 'duplicate',
            sourceId: active.id,
            defaultName: `${active.nombre} (copia)`,
        })
    }

    const handlePromptSubmit = (nombre: string) => {
        if (!promptModal) return
        const config = promptModal
        setPromptModal(null)
        startTransition(async () => {
            const newId =
                config.mode === 'create'
                    ? await createVariante(simulador.id, nombre)
                    : await duplicateVariante(config.sourceId, nombre)
            router.refresh()
            setActiveId(newId)
        })
    }

    const handleDeleteVariante = () => {
        if (!active) return
        if (variantes.length <= 1) {
            window.alert('Una simulación necesita al menos una variante.')
            return
        }
        if (!window.confirm(`¿Borrar la variante "${active.nombre}"?`)) return
        startTransition(async () => {
            await deleteVariante(active.id)
            const remaining = variantes.filter(v => v.id !== active.id)
            setActiveId(remaining[0]?.id ?? '')
            router.refresh()
        })
    }

    const startRename = () => {
        if (!active) return
        setRenameValue(active.nombre)
        setRenamingVariante(true)
    }
    const commitRename = () => {
        const trimmed = renameValue.trim()
        if (trimmed && active) {
            updateActive({ nombre: trimmed })
        }
        setRenamingVariante(false)
    }
    const cancelRename = () => setRenamingVariante(false)

    const switchTab = (id: string) => {
        if (id === active?.id && !dashboardMode) return
        setRenamingVariante(false)
        setDashboardMode(false)
        setActiveId(id)
    }
    const switchToDashboard = () => {
        setRenamingVariante(false)
        setDashboardMode(true)
    }

    // ─── Tooltip helpers ────────────────────────────────────────────────────

    const showTooltip = (e: React.MouseEvent, prov: string, desc: string | null) => {
        setTooltip({
            prov,
            desc: desc ?? 'Sin descripción cargada para este proveedor.',
            x: e.clientX,
            y: e.clientY,
        })
    }
    const moveTooltip = (e: React.MouseEvent) => {
        setTooltip(t => t ? { ...t, x: e.clientX, y: e.clientY } : null)
    }
    const hideTooltip = () => setTooltip(null)

    // ─── Formato ────────────────────────────────────────────────────────────

    const fmt = (n: number) => 'USD ' + Math.round(n).toLocaleString('es-AR')
    const fmtDelta = (n: number) => {
        const sign = n > 0 ? '+' : n < 0 ? '−' : ''
        return sign + 'USD ' + Math.abs(Math.round(n)).toLocaleString('es-AR')
    }

    if (!active) {
        return <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>Sin variantes.</div>
    }

    let optionalDividerShown = false

    return (
        <>
            {/* Header */}
            <div style={styles.headerRow}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <Link href="/simulador" style={styles.back}>← Simulaciones</Link>
                    <div style={styles.eyebrow}>Admin · Simulador</div>
                    <input
                        type="text"
                        value={nombreSim}
                        onChange={(e) => setNombreSim(e.target.value)}
                        placeholder="Nombre de la simulación"
                        style={styles.nombreInput}
                    />
                </div>
                <div style={styles.saveCluster}>
                    {savedAt && !isDirty && !isPending && (
                        <span style={styles.savedLabel}>
                            Guardado {savedAt.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    )}
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={!isDirty || isPending}
                        className="btn-gold"
                        style={styles.saveBtn}
                    >
                        {isPending ? 'Guardando…' : 'Guardar'}
                    </button>
                </div>
            </div>

            {/* Tab bar */}
            <div style={styles.tabBar}>
                <div style={styles.tabsRow}>
                    {variantes.map((v) => {
                        const isActive = !dashboardMode && v.id === active.id
                        const dirty = isVarianteDirty(v)
                        return (
                            <button
                                key={v.id}
                                type="button"
                                onClick={() => switchTab(v.id)}
                                style={{
                                    ...styles.tab,
                                    ...(isActive ? styles.tabActive : {}),
                                }}
                                title={v.nombre}
                            >
                                {isActive && renamingVariante ? (
                                    <input
                                        type="text"
                                        value={renameValue}
                                        onChange={(e) => setRenameValue(e.target.value)}
                                        onBlur={commitRename}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') commitRename()
                                            else if (e.key === 'Escape') cancelRename()
                                        }}
                                        autoFocus
                                        style={styles.tabRenameInput}
                                    />
                                ) : (
                                    <>
                                        <span>{v.nombre}</span>
                                        {dirty && <span style={styles.dirtyDot} title="Cambios sin guardar" />}
                                    </>
                                )}
                            </button>
                        )
                    })}
                    <button
                        type="button"
                        onClick={handleNewVariante}
                        style={styles.newTabBtn}
                        title="Nueva variante"
                        disabled={isPending}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                    </button>

                    {variantes.length > 1 && (
                        <button
                            type="button"
                            onClick={switchToDashboard}
                            style={{
                                ...styles.tab,
                                ...styles.tabDashboard,
                                ...(dashboardMode ? styles.tabDashboardActive : {}),
                            }}
                            title="Comparar todas las variantes"
                        >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="3" width="7" height="9" />
                                <rect x="14" y="3" width="7" height="5" />
                                <rect x="14" y="12" width="7" height="9" />
                                <rect x="3" y="16" width="7" height="5" />
                            </svg>
                            Dashboard
                        </button>
                    )}
                </div>
                <div style={{ ...styles.tabActions, visibility: dashboardMode ? 'hidden' : 'visible' }}>
                    <button
                        type="button"
                        onClick={startRename}
                        className="btn-ghost"
                        style={styles.tabActionBtn}
                        title="Renombrar variante"
                        disabled={isPending || renamingVariante}
                    >
                        Renombrar
                    </button>
                    <button
                        type="button"
                        onClick={handleDuplicate}
                        className="btn-ghost"
                        style={styles.tabActionBtn}
                        title="Duplicar variante"
                        disabled={isPending}
                    >
                        Duplicar
                    </button>
                    <button
                        type="button"
                        onClick={handleDeleteVariante}
                        className="btn-ghost"
                        style={styles.tabActionBtn}
                        title="Borrar variante"
                        disabled={isPending || variantes.length <= 1}
                    >
                        Borrar
                    </button>
                </div>
            </div>

            {dashboardMode ? (
                <DashboardComparativo variantes={variantes} rubros={rubros} />
            ) : (
            <>
            {/* Invitados */}
            <div className="card" style={styles.controlsCard}>
                <label htmlFor="invitados" style={styles.controlsLabel}>
                    Cantidad de invitados
                </label>
                <input
                    id="invitados"
                    type="number"
                    min={80}
                    max={500}
                    step={1}
                    value={active.cantidad_invitados}
                    onChange={(e) => {
                        const v = parseInt(e.target.value)
                        if (Number.isNaN(v)) return
                        updateActive({ cantidad_invitados: v })
                    }}
                    onBlur={(e) => {
                        const v = parseInt(e.target.value) || 80
                        updateActive({ cantidad_invitados: Math.max(80, v) })
                    }}
                    style={styles.invitadosInput}
                />
                <span style={styles.minNote}>MÍN. 80 PERSONAS</span>
            </div>

            {/* Total + donut */}
            <div className="card" style={styles.totalCard}>
                <div style={{ minWidth: 0 }}>
                    <div style={styles.eyebrow}>💰 Presupuesto de la variante</div>
                    <div style={styles.totalAmount}>{fmt(total)}</div>
                    <div style={styles.totalPerGuest}>
                        {active.cantidad_invitados > 0 ? fmt(total / active.cantidad_invitados) : '—'} por invitado
                    </div>
                    <DeltaBadge delta={delta} deltaPct={deltaPct} fmtDelta={fmtDelta} />
                </div>
                <DonutChart
                    rubros={rubros}
                    totalsByRubro={totalsByRubro}
                    total={total}
                />
            </div>

            {/* Rubros */}
            <div className="card" style={styles.rubrosCard}>
                <div style={styles.rubrosHeader}>
                    <div style={styles.eyebrow}>📋 Rubros</div>
                </div>
                {rubros.map((r) => {
                    const it = active.items[r.id]
                    const provs = [...r.proveedores].sort((a, b) => a.orden - b.orden)
                    const showDivider = r.opcional && !optionalDividerShown
                    if (showDivider) optionalDividerShown = true

                    return (
                        <div key={r.id}>
                            {showDivider && (
                                <div style={styles.optionalsDivider}>
                                    <span style={styles.optionalsDividerLabel}>
                                        ✚ Opcionales — tildá para incluir
                                    </span>
                                </div>
                            )}
                            <RubroRow
                                rubro={r}
                                proveedores={provs}
                                item={it}
                                monto={totalsByRubro[r.id]}
                                onChange={(patch) => setItem(r.id, patch)}
                                onShowTooltip={showTooltip}
                                onMoveTooltip={moveTooltip}
                                onHideTooltip={hideTooltip}
                                fmt={fmt}
                            />
                        </div>
                    )
                })}
            </div>

            </>
            )}

            {/* Modal de crear/duplicar variante */}
            {promptModal && (
                <VariantePromptModal
                    title={promptModal.mode === 'create' ? 'Nueva variante' : 'Duplicar variante'}
                    subtitle={
                        promptModal.mode === 'create'
                            ? 'Dale un nombre para identificarla. Ej: "Económica", "Premium", "Opción cliente".'
                            : 'Vamos a copiar la variante actual con sus invitados, proveedores y opcionales.'
                    }
                    initialValue={promptModal.defaultName}
                    submitLabel={promptModal.mode === 'create' ? 'Crear variante' : 'Duplicar'}
                    onSubmit={handlePromptSubmit}
                    onClose={() => setPromptModal(null)}
                />
            )}

            {/* Tooltip */}
            {tooltip && (
                <div
                    style={{
                        ...styles.tooltip,
                        left: Math.min(tooltip.x + 14, window.innerWidth - 300),
                        top: Math.min(tooltip.y + 14, window.innerHeight - 100),
                    }}
                >
                    <div style={styles.tooltipProv}>{tooltip.prov}</div>
                    <div>{tooltip.desc}</div>
                </div>
            )}
        </>
    )
}

// ─── Dashboard comparativo ──────────────────────────────────────────────────

function DashboardComparativo({
    variantes,
    rubros,
}: {
    variantes: VarianteData[]
    rubros: Rubro[]
}) {
    const fmt = (n: number) => 'USD ' + Math.round(n).toLocaleString('es-AR')
    const fmtDelta = (n: number) => {
        const sign = n > 0 ? '+' : n < 0 ? '−' : ''
        return sign + 'USD ' + Math.abs(Math.round(n)).toLocaleString('es-AR')
    }

    // Pre-calcular por variante
    const calcs = variantes.map((v) => {
        const totalsByRubro: Record<string, number> = {}
        let total = 0
        for (const r of rubros) {
            const it = v.items[r.id]
            if (!it?.incluido || !it.proveedor_id) {
                totalsByRubro[r.id] = 0
                continue
            }
            const prov = r.proveedores.find((p) => p.id === it.proveedor_id)
            if (!prov) {
                totalsByRubro[r.id] = 0
                continue
            }
            const monto = r.tipo === 'var' ? prov.precio * v.cantidad_invitados : prov.precio
            totalsByRubro[r.id] = monto
            total += monto
        }
        const referenciaMedia = rubros.reduce((sum, r) => {
            if (r.opcional) return sum
            const provs = [...r.proveedores].sort((a, b) => a.orden - b.orden)
            const mid = provs[Math.floor((provs.length - 1) / 2)]
            if (!mid) return sum
            return sum + (r.tipo === 'var' ? mid.precio * v.cantidad_invitados : mid.precio)
        }, 0)
        return { variante: v, totalsByRubro, total, referenciaMedia }
    })

    // Rango de precios por rubro (para escalar la barra de nivel de gama)
    const rangoPorRubro = new Map<string, { min: number; max: number }>()
    for (const r of rubros) {
        if (r.proveedores.length === 0) continue
        const precios = r.proveedores.map((p) => p.precio)
        rangoPorRubro.set(r.id, {
            min: Math.min(...precios),
            max: Math.max(...precios),
        })
    }

    return (
        <div style={styles.dashGrid}>
            {calcs.map(({ variante: v, totalsByRubro, total, referenciaMedia }, idx) => {
                const delta = total - referenciaMedia
                const deltaPct = referenciaMedia > 0 ? (delta / referenciaMedia) * 100 : 0
                const rubrosOrdenados = [...rubros].sort((a, b) => totalsByRubro[b.id] - totalsByRubro[a.id])
                const colorAccent = DASH_COLORS[idx % DASH_COLORS.length]

                return (
                    <div key={v.id} className="card" style={styles.dashCard}>
                        <div style={{ ...styles.dashCardAccent, background: colorAccent }} />
                        <div style={styles.dashCardHeader}>
                            <span style={styles.dashVariantBadge}>Variante</span>
                            <h3 style={styles.dashVariantName}>{v.nombre}</h3>
                        </div>

                        <div style={styles.dashTotalBlock}>
                            <div style={styles.dashTotal}>{fmt(total)}</div>
                            <div style={styles.dashSub}>
                                {v.cantidad_invitados > 0
                                    ? `${fmt(total / v.cantidad_invitados)} · ${v.cantidad_invitados} invitados`
                                    : '—'}
                            </div>
                            <DeltaBadge delta={delta} deltaPct={deltaPct} fmtDelta={fmtDelta} />
                        </div>

                        <div style={styles.dashSectionTitle}>Rubros · proveedor elegido · nivel de gama</div>
                        <div style={styles.dashBars}>
                            {rubrosOrdenados.map((r) => {
                                const monto = totalsByRubro[r.id]
                                const pctOfTotal = total > 0 ? (monto / total) * 100 : 0
                                const included = monto > 0
                                const it = v.items[r.id]
                                const prov = it?.proveedor_id
                                    ? r.proveedores.find((p) => p.id === it.proveedor_id)
                                    : null

                                // Nivel de gama: posición del proveedor dentro del rango del rubro
                                const rango = rangoPorRubro.get(r.id)
                                const singleOption = !rango || rango.min === rango.max
                                let levelPct = 0
                                if (included && prov && rango) {
                                    if (singleOption) levelPct = 100
                                    else levelPct = ((prov.precio - rango.min) / (rango.max - rango.min)) * 100
                                }
                                // Marca verde sutil cuando elegiste el mínimo del rubro
                                const isMinimo = included && !singleOption && levelPct === 0

                                return (
                                    <div
                                        key={r.id}
                                        style={{
                                            ...styles.dashBarRow,
                                            opacity: included ? 1 : 0.35,
                                        }}
                                        title={
                                            included && rango
                                                ? singleOption
                                                    ? `${r.nombre}: única opción disponible`
                                                    : `${r.nombre}: nivel ${levelPct.toFixed(0)}% (rango USD ${rango.min.toLocaleString('es-AR')} – ${rango.max.toLocaleString('es-AR')})`
                                                : undefined
                                        }
                                    >
                                        <div style={styles.dashBarLabelCell}>
                                            <span style={styles.dashBarRubro}>{r.nombre}</span>
                                            <span style={styles.dashBarProv}>
                                                {prov?.nombre ?? '—'}
                                            </span>
                                        </div>
                                        <div style={styles.dashBarTrack}>
                                            <div
                                                style={{
                                                    ...styles.dashBarFill,
                                                    width: isMinimo
                                                        ? '6%'
                                                        : `${included ? levelPct : 0}%`,
                                                    background: singleOption
                                                        ? 'var(--color-text-muted)'
                                                        : isMinimo
                                                            ? 'var(--color-olive-light)'
                                                            : colorAccent,
                                                    opacity: singleOption ? 0.35 : 1,
                                                }}
                                            />
                                        </div>
                                        <span style={styles.dashBarValue}>
                                            {included ? fmt(monto) : '—'}
                                        </span>
                                        <span style={styles.dashBarPct}>
                                            {included ? `${pctOfTotal.toFixed(0)}%` : ''}
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

const DASH_COLORS = ['#C9A84C', '#6B7C5C', '#A8893A', '#8A9C75', '#B89968', '#7D6952']

// ─── Sub-componentes ────────────────────────────────────────────────────────

function DeltaBadge({ delta, deltaPct, fmtDelta }: {
    delta: number; deltaPct: number; fmtDelta: (n: number) => string
}) {
    let bg = '#EFECE2'
    let color = 'var(--color-text-muted)'
    let txt = 'EN LA MEDIA'

    if (Math.abs(deltaPct) >= 0.5) {
        if (delta > 0) {
            bg = '#F1E6E6'; color = '#8B4A4A'
            txt = `${fmtDelta(delta)}  ·  +${deltaPct.toFixed(1)}% sobre la media`
        } else {
            bg = '#E8EBD9'; color = 'var(--color-olive)'
            txt = `${fmtDelta(delta)}  ·  ${deltaPct.toFixed(1)}% bajo la media`
        }
    }

    return (
        <span style={{
            display: 'inline-block', marginTop: '0.85rem', padding: '0.3rem 0.75rem',
            borderRadius: 999, fontFamily: 'var(--font-mono, monospace)', fontSize: '0.7rem',
            fontWeight: 500, letterSpacing: '0.02em', background: bg, color,
        }}>
            {txt}
        </span>
    )
}

function DonutChart({ rubros, totalsByRubro, total }: {
    rubros: Rubro[]; totalsByRubro: Record<string, number>; total: number
}) {
    const items = rubros
        .map((r, idx) => ({
            rubro: r.nombre,
            monto: totalsByRubro[r.id],
            color: PIE_COLORS[idx % PIE_COLORS.length],
        }))
        .filter(it => it.monto > 0)

    if (items.length === 0 || total <= 0) {
        return <div style={{ width: 130, height: 130 }} />
    }

    const cx = 50, cy = 50, r = 42, rInner = 24
    let angleAcum = -Math.PI / 2
    const slices: { d: string; color: string; rubro: string; monto: number }[] = []
    items.forEach(item => {
        const sliceAngle = (item.monto / total) * Math.PI * 2
        const a1 = angleAcum, a2 = angleAcum + sliceAngle
        const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1)
        const x2 = cx + r * Math.cos(a2), y2 = cy + r * Math.sin(a2)
        const xi1 = cx + rInner * Math.cos(a1), yi1 = cy + rInner * Math.sin(a1)
        const xi2 = cx + rInner * Math.cos(a2), yi2 = cy + rInner * Math.sin(a2)
        const largeArc = sliceAngle > Math.PI ? 1 : 0
        slices.push({
            d: `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${rInner} ${rInner} 0 ${largeArc} 0 ${xi1} ${yi1} Z`,
            color: item.color, rubro: item.rubro, monto: item.monto,
        })
        angleAcum = a2
    })

    const sorted = [...items].sort((a, b) => b.monto - a.monto)

    return (
        <div style={styles.chartWrap}>
            <svg viewBox="0 0 100 100" width={130} height={130}>
                {slices.map((s, i) => (
                    <path key={i} d={s.d} fill={s.color}>
                        <title>{s.rubro}: USD {Math.round(s.monto).toLocaleString('es-AR')} ({((s.monto / total) * 100).toFixed(1)}%)</title>
                    </path>
                ))}
            </svg>
            <div style={styles.legend}>
                {sorted.map(it => (
                    <div key={it.rubro} style={styles.legendItem}>
                        <span style={{ ...styles.legendSwatch, background: it.color }} />
                        <span style={styles.legendName}>{it.rubro}</span>
                        <span style={styles.legendPct}>{((it.monto / total) * 100).toFixed(1)}%</span>
                    </div>
                ))}
            </div>
        </div>
    )
}

function RubroRow({
    rubro, proveedores, item, monto,
    onChange, onShowTooltip, onMoveTooltip, onHideTooltip, fmt,
}: {
    rubro: Rubro
    proveedores: Proveedor[]
    item: ItemState
    monto: number
    onChange: (patch: Partial<ItemState>) => void
    onShowTooltip: (e: React.MouseEvent, prov: string, desc: string | null) => void
    onMoveTooltip: (e: React.MouseEvent) => void
    onHideTooltip: () => void
    fmt: (n: number) => string
}) {
    const enabled = item.incluido
    const curIdx = Math.max(0, proveedores.findIndex(p => p.id === item.proveedor_id))
    const max = proveedores.length - 1
    const cur = proveedores[curIdx]
    const minPrecio = Math.min(...proveedores.map(p => p.precio))
    const maxPrecio = Math.max(...proveedores.map(p => p.precio))
    const unidad = rubro.tipo === 'var' ? '/inv.' : ''
    const pct = max === 0 ? 50 : (curIdx / max) * 100

    return (
        <div style={{ ...styles.rubro, opacity: enabled ? 1 : 0.35 }}>
            <div style={styles.rubroCheckCell}>
                {rubro.opcional ? (
                    <input
                        type="checkbox"
                        checked={enabled}
                        onChange={(e) => onChange({ incluido: e.target.checked })}
                        style={styles.checkbox}
                    />
                ) : null}
            </div>
            <div style={styles.rubroInfo}>
                <span style={styles.rubroName}>{rubro.nombre}</span>
                <span style={styles.rubroPrice}>
                    {enabled
                        ? fmt(monto)
                        : <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>—</span>}
                </span>
                <span style={styles.rubroTipo}>
                    {rubro.tipo === 'var' ? 'Por invitado' : 'Fijo'}
                </span>
            </div>
            <div style={{ minWidth: 0, pointerEvents: enabled ? 'auto' : 'none' }}>
                {proveedores.length > 1 ? (
                    <div style={styles.sliderWrap}>
                        <div style={styles.sliderTrackContainer}>
                            <div
                                style={{
                                    ...styles.sliderBadge,
                                    left: `${pct}%`,
                                    transform: `translateX(-${pct}%)`,
                                }}
                            >
                                {cur?.nombre ?? ''}
                            </div>
                            <input
                                type="range"
                                min={0}
                                max={max}
                                step={1}
                                value={curIdx}
                                onChange={(e) => onChange({ proveedor_id: proveedores[parseInt(e.target.value)].id })}
                                onMouseEnter={(e) => onShowTooltip(e, cur?.nombre ?? '', cur?.descripcion ?? null)}
                                onMouseMove={onMoveTooltip}
                                onMouseLeave={onHideTooltip}
                                style={styles.range}
                            />
                            <div style={styles.sliderMarks}>
                                {proveedores.map((_, i) => {
                                    const mpct = max === 0 ? 50 : (i / max) * 100
                                    const active = i === curIdx
                                    return (
                                        <span key={i} style={{
                                            ...styles.mark, left: `${mpct}%`,
                                            opacity: active ? 0 : 0.5,
                                        }} />
                                    )
                                })}
                            </div>
                        </div>
                        <div style={styles.sliderBelow}>
                            <span style={styles.sliderSideLabel}>
                                USD {minPrecio.toLocaleString('es-AR')}{unidad}
                            </span>
                            <span style={styles.sliderSideLabel}>
                                USD {maxPrecio.toLocaleString('es-AR')}{unidad}
                            </span>
                        </div>
                    </div>
                ) : (
                    <div
                        style={styles.singleOption}
                        onMouseEnter={(e) => onShowTooltip(e, cur?.nombre ?? '', cur?.descripcion ?? null)}
                        onMouseMove={onMoveTooltip}
                        onMouseLeave={onHideTooltip}
                    >
                        {cur?.nombre ?? ''}
                    </div>
                )}
            </div>
        </div>
    )
}

// ─── Estilos ────────────────────────────────────────────────────────────────

const styles: Record<string, CSSProperties> = {
    back: {
        display: 'inline-block',
        fontSize: '0.8rem',
        color: 'var(--color-gold-dark)',
        textDecoration: 'none',
        fontWeight: 500,
        marginBottom: '0.85rem',
    },
    eyebrow: {
        fontFamily: 'var(--font-mono, monospace)',
        fontSize: '0.7rem',
        fontWeight: 500,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'var(--color-gold-dark)',
        marginBottom: '0.5rem',
    },
    headerRow: {
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: '1rem',
        paddingBottom: '1.25rem',
        borderBottom: '1px solid var(--color-border)',
    },
    nombreInput: {
        fontFamily: 'var(--font-serif)',
        fontSize: '1.6rem',
        fontWeight: 600,
        color: 'var(--color-text)',
        background: 'transparent',
        border: 'none',
        outline: 'none',
        padding: '0.1rem 0',
        width: '100%',
    },
    saveCluster: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        flexShrink: 0,
    },
    savedLabel: {
        fontFamily: 'var(--font-mono, monospace)',
        fontSize: '0.7rem',
        color: 'var(--color-text-muted)',
    },
    saveBtn: {
        paddingInline: '1.25rem',
    },
    // Tabs
    tabBar: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.75rem',
        borderBottom: '1px solid var(--color-border)',
        paddingBottom: '0.5rem',
        flexWrap: 'wrap',
    },
    tabsRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.25rem',
        flexWrap: 'wrap',
        flex: 1,
        minWidth: 0,
    },
    tab: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        padding: '0.45rem 0.95rem',
        background: 'transparent',
        border: '1px solid transparent',
        borderRadius: 'var(--radius-sm)',
        cursor: 'pointer',
        fontFamily: 'var(--font-sans)',
        fontSize: '0.85rem',
        fontWeight: 500,
        color: 'var(--color-text-muted)',
        transition: 'background 0.15s, color 0.15s, border-color 0.15s',
        maxWidth: 200,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    tabActive: {
        background: 'var(--color-gold)',
        color: 'white',
        borderColor: 'var(--color-gold)',
        fontWeight: 600,
    },
    tabRenameInput: {
        background: 'transparent',
        border: 'none',
        outline: 'none',
        color: 'white',
        fontFamily: 'inherit',
        fontSize: 'inherit',
        fontWeight: 'inherit',
        padding: 0,
        margin: 0,
        width: 140,
    },
    dirtyDot: {
        display: 'inline-block',
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: '#C84B4B',
    },
    newTabBtn: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 32,
        height: 32,
        background: 'transparent',
        border: '1px dashed var(--color-gold)',
        color: 'var(--color-gold)',
        borderRadius: 'var(--radius-sm)',
        cursor: 'pointer',
    },
    tabActions: {
        display: 'flex',
        gap: '0.3rem',
        flexShrink: 0,
    },
    tabActionBtn: {
        fontSize: '0.75rem',
        padding: '0.4rem 0.7rem',
    },
    // Resto igual al original
    controlsCard: {
        padding: '1.1rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
    },
    controlsLabel: {
        fontSize: '0.85rem',
        color: 'var(--color-text-muted)',
        fontWeight: 500,
    },
    invitadosInput: {
        fontFamily: 'var(--font-sans)',
        fontSize: '1.1rem',
        fontWeight: 600,
        padding: '0.5rem 0.85rem',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-sm)',
        width: 110,
        color: 'var(--color-text)',
        background: 'var(--color-cream)',
        outline: 'none',
    },
    minNote: {
        fontFamily: 'var(--font-mono, monospace)',
        fontSize: '0.7rem',
        color: 'var(--color-text-muted)',
        marginLeft: 'auto',
        letterSpacing: '0.05em',
    },
    totalCard: {
        padding: '1.8rem 1.75rem 1.6rem',
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gap: '1.75rem',
        alignItems: 'center',
    },
    totalAmount: {
        fontSize: '2.5rem',
        fontWeight: 700,
        letterSpacing: '-0.02em',
        lineHeight: 1,
        fontVariantNumeric: 'tabular-nums',
        fontFamily: 'var(--font-serif)',
        color: 'var(--color-text)',
    },
    totalPerGuest: {
        fontFamily: 'var(--font-mono, monospace)',
        fontSize: '0.8rem',
        color: 'var(--color-text-muted)',
        marginTop: '0.6rem',
    },
    chartWrap: {
        display: 'flex',
        alignItems: 'center',
        gap: '1.1rem',
    },
    legend: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
        maxHeight: 130,
        overflowY: 'auto',
        paddingRight: '0.25rem',
        minWidth: 140,
    },
    legendItem: {
        display: 'grid',
        gridTemplateColumns: '10px 1fr auto',
        alignItems: 'center',
        gap: '0.4rem',
        fontSize: '0.7rem',
        color: 'var(--color-text-muted)',
        lineHeight: 1.3,
    },
    legendSwatch: {
        width: 10,
        height: 10,
        borderRadius: 2,
    },
    legendName: {
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        color: 'var(--color-text)',
    },
    legendPct: {
        fontFamily: 'var(--font-mono, monospace)',
        fontSize: '0.65rem',
        color: 'var(--color-text-muted)',
        fontVariantNumeric: 'tabular-nums',
    },
    rubrosCard: {
        padding: 0,
        overflow: 'hidden',
    },
    rubrosHeader: {
        padding: '1.1rem 1.5rem 0.85rem',
        borderBottom: '1px solid var(--color-border)',
    },
    rubro: {
        padding: '0.85rem 1.5rem',
        borderBottom: '1px solid var(--color-border)',
        display: 'grid',
        gridTemplateColumns: '24px 220px 1fr',
        alignItems: 'center',
        gap: '1rem',
        transition: 'opacity 0.2s',
    },
    rubroCheckCell: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkbox: {
        width: 16,
        height: 16,
        cursor: 'pointer',
        accentColor: 'var(--color-gold)',
    },
    rubroInfo: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.1rem',
        minWidth: 0,
    },
    rubroName: {
        fontSize: '0.95rem',
        fontWeight: 600,
        color: 'var(--color-text)',
    },
    rubroPrice: {
        fontVariantNumeric: 'tabular-nums',
        fontWeight: 500,
        fontSize: '0.9rem',
        color: 'var(--color-text-muted)',
    },
    rubroTipo: {
        fontFamily: 'var(--font-mono, monospace)',
        fontSize: '0.65rem',
        color: 'var(--color-text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
    },
    sliderWrap: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.4rem',
        padding: '1.1rem 0.25rem 0.25rem',
    },
    sliderBelow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 0.25rem',
    },
    sliderSideLabel: {
        fontFamily: 'var(--font-mono, monospace)',
        fontSize: '0.7rem',
        color: 'var(--color-text-muted)',
        whiteSpace: 'nowrap',
        fontVariantNumeric: 'tabular-nums',
    },
    sliderTrackContainer: {
        position: 'relative',
        padding: 0,
    },
    range: {
        width: '100%',
        accentColor: 'var(--color-gold)',
        margin: 0,
        position: 'relative',
        zIndex: 2,
        height: 4,
        display: 'block',
    },
    sliderBadge: {
        position: 'absolute',
        bottom: 16,
        background: 'var(--color-gold)',
        color: 'white',
        padding: '0.2rem 0.55rem',
        borderRadius: 6,
        fontSize: '0.7rem',
        fontWeight: 600,
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        maxWidth: 200,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        zIndex: 3,
        transition: 'left 0.05s linear, transform 0.05s linear',
    },
    sliderMarks: {
        position: 'absolute',
        top: '50%',
        left: 8,
        right: 8,
        height: 0,
        pointerEvents: 'none',
        zIndex: 1,
    },
    mark: {
        position: 'absolute',
        top: -6,
        width: 2,
        height: 12,
        background: 'var(--color-olive-light)',
        borderRadius: 1,
        transform: 'translateX(-50%)',
    },
    singleOption: {
        padding: '0.4rem 0',
        fontFamily: 'var(--font-mono, monospace)',
        fontSize: '0.7rem',
        color: 'var(--color-text-muted)',
        cursor: 'help',
    },
    optionalsDivider: {
        padding: '0.7rem 1.5rem',
        background: 'var(--color-cream-dark)',
        borderTop: '1px solid var(--color-border)',
        borderBottom: '1px solid var(--color-border)',
    },
    optionalsDividerLabel: {
        fontFamily: 'var(--font-mono, monospace)',
        fontSize: '0.65rem',
        color: 'var(--color-text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        fontWeight: 500,
    },
    tooltip: {
        position: 'fixed',
        zIndex: 1000,
        maxWidth: 280,
        padding: '0.6rem 0.85rem',
        background: 'var(--color-text)',
        color: 'var(--color-cream)',
        fontSize: '0.75rem',
        lineHeight: 1.5,
        borderRadius: 'var(--radius-sm)',
        boxShadow: 'var(--shadow-md)',
        pointerEvents: 'none',
    },
    tooltipProv: {
        fontFamily: 'var(--font-mono, monospace)',
        fontSize: '0.65rem',
        color: 'var(--color-gold-light)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: '0.25rem',
        fontWeight: 500,
    },
    // Dashboard tab y comparativo
    tabDashboard: {
        marginLeft: '0.4rem',
        border: '1px dashed var(--color-olive)',
        color: 'var(--color-olive)',
        background: 'transparent',
        gap: '0.4rem',
    },
    tabDashboardActive: {
        background: 'var(--color-olive)',
        color: 'white',
        borderColor: 'var(--color-olive)',
        borderStyle: 'solid',
        fontWeight: 600,
    },
    dashGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
        gap: '1rem',
    },
    dashCard: {
        position: 'relative',
        padding: '1.25rem 1.25rem 1.1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        overflow: 'hidden',
    },
    dashCardAccent: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 3,
    },
    dashCardHeader: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.1rem',
    },
    dashVariantBadge: {
        fontFamily: 'var(--font-mono, monospace)',
        fontSize: '0.6rem',
        fontWeight: 500,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'var(--color-text-muted)',
    },
    dashVariantName: {
        fontFamily: 'var(--font-serif)',
        fontSize: '1.15rem',
        fontWeight: 600,
        color: 'var(--color-text)',
        margin: 0,
        lineHeight: 1.2,
    },
    dashTotalBlock: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.3rem',
        paddingBottom: '0.85rem',
        borderBottom: '1px solid var(--color-border)',
    },
    dashTotal: {
        fontFamily: 'var(--font-serif)',
        fontSize: '1.85rem',
        fontWeight: 700,
        letterSpacing: '-0.02em',
        lineHeight: 1,
        fontVariantNumeric: 'tabular-nums',
        color: 'var(--color-text)',
    },
    dashSub: {
        fontFamily: 'var(--font-mono, monospace)',
        fontSize: '0.7rem',
        color: 'var(--color-text-muted)',
    },
    dashSectionTitle: {
        fontFamily: 'var(--font-mono, monospace)',
        fontSize: '0.65rem',
        fontWeight: 500,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: 'var(--color-text-muted)',
    },
    dashBars: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.35rem',
    },
    dashBarRow: {
        display: 'grid',
        gridTemplateColumns: 'minmax(110px, 1fr) 1.2fr auto auto',
        alignItems: 'center',
        gap: '0.5rem',
        fontSize: '0.72rem',
    },
    dashBarLabelCell: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.05rem',
        minWidth: 0,
    },
    dashBarRubro: {
        color: 'var(--color-text)',
        fontWeight: 500,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    dashBarProv: {
        fontFamily: 'var(--font-mono, monospace)',
        fontSize: '0.62rem',
        color: 'var(--color-text-muted)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    dashBarTrack: {
        position: 'relative',
        height: 6,
        background: 'var(--color-cream-dark)',
        borderRadius: 3,
        overflow: 'hidden',
    },
    dashBarFill: {
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        borderRadius: 3,
        transition: 'width 0.2s',
    },
    dashBarValue: {
        fontFamily: 'var(--font-mono, monospace)',
        fontSize: '0.7rem',
        color: 'var(--color-text)',
        fontVariantNumeric: 'tabular-nums',
        textAlign: 'right',
    },
    dashBarPct: {
        fontFamily: 'var(--font-mono, monospace)',
        fontSize: '0.65rem',
        color: 'var(--color-text-muted)',
        fontVariantNumeric: 'tabular-nums',
        textAlign: 'right',
        minWidth: 28,
    },
}

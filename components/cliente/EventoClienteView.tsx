'use client'

import { useState } from 'react'
import { ProgresoClienteTab } from './ProgresoClienteTab'
import { PresupuestoClienteTab } from './PresupuestoClienteTab'
import { DashboardTab } from '@/components/admin/evento/DashboardTab'
import { AcuerdosTab } from '@/components/admin/evento/AcuerdosTab'
import { PlannerCard } from './PlannerCard'

// ─── Types (exported so sub-components can import them) ───────────────────────

export interface EventoCliente {
    id: string
    nombre: string
    tipo_evento: string
    fecha_evento: string
    presupuesto_usd: number | null
    tipo_cambio: number | null
    mostrar_dashboard_cliente: boolean
    mostrar_acuerdos_cliente: boolean
    fases: {
        id: string
        nombre: string
        descripcion: string | null
        fecha_inicio: string | null
        fecha_fin: string | null
        position: number
        temas: {
            id: string
            nombre: string
            descripcion: string | null
            position: number
            tareas: {
                id: string
                nombre: string
                estado: string
                position: number
            }[]
            acuerdos: { id: string; texto: string; created_at: string }[]
            cotizaciones: { id: string; proveedor: string; link: string; position: number; created_at: string }[]
        }[]
    }[]
    rubros: {
        id: string
        nombre: string
        estado: string
        proveedor: string | null
        monto_original: number | null
        moneda: string
        tipo_cambio_propio: number | null
        sena_pct: number | null
        orden: number
        notas: string | null
        costo_total: number | null
        descripcion_servicio: string | null
        pagos_proveedor: {
            id: string
            monto: number
            moneda: string
            tipo_cambio_snapshot: number | null
            fecha: string
            realizado: boolean
            descripcion: string | null
            created_at: string
        }[]
    }[]
    planner: {
        nombre: string
        email: string | null
        telefono: string | null
        foto_url?: string | null
    } | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TIPO_SUBTITLE: Record<string, string> = {
    boda: 'La Boda de',
    quince: 'Los 15 de',
    cumple: 'El Cumple de',
    baby_shower: 'El Baby Shower de',
}

function diasRestantes(fecha: string): number {
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const target = new Date(fecha + 'T00:00:00')
    return Math.ceil((target.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
}

function calcProgresoTotal(fases: EventoCliente['fases']): { total: number; completadas: number } {
    let total = 0
    let completadas = 0
    for (const f of fases) {
        for (const tema of f.temas) {
            for (const t of tema.tareas) {
                total++
                if (t.estado === 'completada') completadas++
            }
        }
    }
    return { total, completadas }
}

function faseVencida(fase: EventoCliente['fases'][number]): boolean {
    if (!fase.fecha_fin) return false
    const tareas = fase.temas.flatMap((t) => t.tareas)
    const total = tareas.length
    const done = tareas.filter((t) => t.estado === 'completada').length
    if (total > 0 && done === total) return false
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
    return new Date(fase.fecha_fin + 'T12:00:00') < hoy
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EventoClienteView({ evento }: { evento: EventoCliente }) {
    const [tab, setTab] = useState<'progreso' | 'presupuesto' | 'dashboard' | 'acuerdos'>('progreso')

    const dias = diasRestantes(evento.fecha_evento)
    const { total, completadas } = calcProgresoTotal(evento.fases)
    const pct = total > 0 ? Math.round((completadas / total) * 100) : 0
    const subtitle = TIPO_SUBTITLE[evento.tipo_evento] ?? 'El evento de'
    const fechaLabel = new Date(evento.fecha_evento + 'T12:00:00').toLocaleDateString('es-AR', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    })

    return (
        <main style={st.main}>
            <div style={st.container}>

                <header style={st.header}>
                    <img src="/logo.svg" alt="TMP Eventos" style={{ height: '56px', width: 'auto', marginBottom: '0.5rem' }} />

                    <p style={st.ornament}>✦</p>

                    <p style={st.subtitle}>{subtitle}</p>
                    <h1 style={st.title}>{evento.nombre}</h1>

                    <p style={st.fechaLabel}>{fechaLabel}</p>

                    <div style={st.statsRow}>
                        <div style={st.statChip}>
                            <span style={st.statValue}>{dias > 0 ? dias : 0}</span>
                            <span style={st.statLabel}>{dias === 1 ? 'día' : 'días'} restantes</span>
                        </div>

                        <div style={st.statDivider} />

                        <div style={st.statChip}>
                            <span style={st.statValue}>{pct}%</span>
                            <span style={st.statLabel}>avance ({completadas}/{total})</span>
                        </div>
                    </div>

                    {total > 0 && (
                        <div style={st.progressWrap}>
                            <div style={{ display: 'flex', gap: '3px', height: '6px' }}>
                                {evento.fases.map((fase) => {
                                    const tareasFase = fase.temas.flatMap((t) => t.tareas)
                                    const ft = tareasFase.length
                                    const fc = tareasFase.filter((t) => t.estado === 'completada').length
                                    const fp = ft === 0 ? 0 : Math.round((fc / ft) * 100)
                                    const vencida = faseVencida(fase)
                                    const fillBg = vencida
                                        ? '#EF4444'
                                        : fp === 100
                                            ? '#7C8B70'
                                            : fp > 0
                                                ? '#C9A84C'
                                                : '#D1D5DB'
                                    const trackBg = ft === 0 || fp === 0 ? '#D1D5DB' : '#E5E7EB'
                                    return (
                                        <div
                                            key={fase.id}
                                            title={`${fase.nombre}: ${fp}%${vencida ? ' ⚠ etapa vencida' : ''}`}
                                            style={{ flex: 1, backgroundColor: trackBg, borderRadius: '99px', overflow: 'hidden', position: 'relative' }}
                                        >
                                            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${fp}%`, backgroundColor: fillBg, borderRadius: '99px', transition: 'width 0.3s ease, background-color 0.3s ease' }} />
                                        </div>
                                    )
                                })}
                            </div>
                            <div style={{ display: 'flex', gap: '3px', marginTop: '4px' }}>
                                {evento.fases.map((fase, idx) => (
                                    <div
                                        key={fase.id}
                                        title={fase.nombre}
                                        style={{ flex: 1, minWidth: 0, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.62rem', color: '#6B7280', lineHeight: 1, fontFamily: 'var(--font-mono, monospace)', letterSpacing: '0.04em' }}
                                    >
                                        E{idx + 1}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div style={st.headerDivider} />
                </header>

                {evento.planner && (
                    <PlannerCard
                        nombre={evento.planner.nombre}
                        email={evento.planner.email}
                        telefono={evento.planner.telefono}
                        foto_url={evento.planner.foto_url}
                        compact
                    />
                )}

                <div style={st.tabRow}>
                    <button
                        onClick={() => setTab('progreso')}
                        style={{ ...st.tabBtn, ...(tab === 'progreso' ? st.tabActive : {}) }}
                    >
                        📋 Progreso
                    </button>
                    <button
                        onClick={() => setTab('presupuesto')}
                        style={{ ...st.tabBtn, ...(tab === 'presupuesto' ? st.tabActive : {}) }}
                    >
                        💰 Presupuesto
                    </button>
                    {evento.mostrar_dashboard_cliente && (
                        <button
                            onClick={() => setTab('dashboard')}
                            style={{ ...st.tabBtn, ...(tab === 'dashboard' ? st.tabActive : {}) }}
                        >
                            📊 Dashboard
                        </button>
                    )}
                    {evento.mostrar_acuerdos_cliente && (
                        <button
                            onClick={() => setTab('acuerdos')}
                            style={{ ...st.tabBtn, ...(tab === 'acuerdos' ? st.tabActive : {}) }}
                        >
                            📝 Acuerdos
                        </button>
                    )}
                </div>

                <div style={st.content}>
                    {tab === 'progreso' && (
                        <ProgresoClienteTab fases={evento.fases} />
                    )}
                    {tab === 'dashboard' && evento.mostrar_dashboard_cliente && (
                        <DashboardTab
                            rubros={evento.rubros}
                            presupuestoUsd={evento.presupuesto_usd}
                            tipoCambioInicial={evento.tipo_cambio}
                            fechaEvento={evento.fecha_evento}
                        />
                    )}
                    {tab === 'presupuesto' && (
                        <PresupuestoClienteTab
                            rubros={evento.rubros}
                            presupuestoUsd={evento.presupuesto_usd}
                            tipoCambioInicial={evento.tipo_cambio}
                            fechaEvento={evento.fecha_evento}
                        />
                    )}
                    {tab === 'acuerdos' && evento.mostrar_acuerdos_cliente && (
                        <AcuerdosTab fases={evento.fases} />
                    )}
                </div>

                <footer style={st.footer}>
                    <p><img src="/logo.svg" alt="TMP Eventos" style={{ height: '28px', width: 'auto', opacity: 0.6 }} /></p>
                </footer>

            </div>
        </main>
    )
}

const st: Record<string, React.CSSProperties> = {
    main: {
        minHeight: '100vh',
        backgroundColor: 'var(--color-cream)',
        padding: '2rem 1rem',
    },
    container: {
        maxWidth: '720px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
    },
    header: {
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.5rem',
    },
    ornament: {
        fontSize: '1.2rem',
        color: 'var(--color-gold)',
        opacity: 0.6,
        marginBottom: '0.25rem',
    },
    subtitle: {
        fontFamily: 'var(--font-serif)',
        fontSize: '1rem',
        color: 'var(--color-text-muted)',
        fontStyle: 'italic',
        letterSpacing: '0.02em',
    },
    title: {
        fontFamily: 'var(--font-serif)',
        fontSize: 'clamp(1.8rem, 5vw, 2.8rem)',
        fontWeight: 600,
        color: 'var(--color-text)',
        letterSpacing: '-0.01em',
        lineHeight: 1.2,
    },
    fechaLabel: {
        fontSize: '0.85rem',
        color: 'var(--color-text-muted)',
        textTransform: 'capitalize',
        letterSpacing: '0.03em',
    },
    statsRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '1.5rem',
        marginTop: '0.5rem',
    },
    statChip: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.1rem',
    },
    statValue: {
        fontFamily: 'var(--font-serif)',
        fontSize: '1.6rem',
        fontWeight: 700,
        color: 'var(--color-gold-dark)',
        lineHeight: 1.1,
    },
    statLabel: {
        fontSize: '0.72rem',
        fontWeight: 500,
        textTransform: 'uppercase',
        letterSpacing: '0.07em',
        color: 'var(--color-text-muted)',
    },
    statDivider: {
        width: '1px',
        height: '36px',
        backgroundColor: 'var(--color-border)',
    },
    progressWrap: { width: '100%', maxWidth: '340px' },
    headerDivider: { width: '48px', height: '1.5px', backgroundColor: 'var(--color-gold)', opacity: 0.4, marginTop: '0.75rem' },
    tabRow: {
        display: 'flex',
        gap: '0.5rem',
        backgroundColor: 'var(--color-cream-dark)',
        padding: '0.3rem',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border)',
    },
    tabBtn: {
        flex: 1,
        padding: '0.55rem 1rem',
        border: 'none',
        backgroundColor: 'transparent',
        borderRadius: 'calc(var(--radius-md) - 3px)',
        fontFamily: 'var(--font-sans)',
        fontSize: '0.875rem',
        fontWeight: 500,
        color: 'var(--color-text-muted)',
        cursor: 'pointer',
        transition: 'all 0.18s ease',
    },
    tabActive: {
        backgroundColor: 'var(--color-white)',
        color: 'var(--color-text)',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
    },
    content: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
    footer: {
        textAlign: 'center',
        padding: '1.5rem 0 0.5rem',
        fontSize: '0.75rem',
        color: 'var(--color-text-muted)',
        opacity: 0.6,
        letterSpacing: '0.08em',
    },
}

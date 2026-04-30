import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase'
import { EventCard, type EventoConStats } from '@/components/admin/EventCard'

async function signOut() {
    'use server'
    const supabase = await createServerSupabaseClient()
    await supabase.auth.signOut()
    redirect('/login')
}

interface TareaRow { id: string; estado: string }
interface TemaRow { id: string; tareas: TareaRow[] | null }
interface FaseRow { nombre: string; position: number; temas: TemaRow[] | null }
interface EventoRow {
    id: string
    nombre: string
    tipo_evento: string
    fecha_evento: string
    token_acceso: string
    planners: { nombre: string } | { nombre: string }[] | null
    fases: FaseRow[] | null
}

export default async function DashboardPage() {
    const supabase = await createServerSupabaseClient()

    const { data: eventosRaw } = await supabase
        .from('eventos')
        .select(`
      id,
      nombre,
      tipo_evento,
      fecha_evento,
      token_acceso,
      planners ( nombre ),
      fases (
        nombre,
        position,
        temas (
          id,
          tareas ( id, estado )
        )
      )
    `)
        .order('fecha_evento', { ascending: true })

    const eventos = (eventosRaw ?? []) as EventoRow[]

    // Fetch custom template display names to resolve labels for custom_* tipos
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: customPlantillasRaw } = await (supabase as any)
        .from('plantillas_fases')
        .select('tipo_evento, es_custom, nombre_display')
        .eq('es_custom', true)

    const customLabelByTipo = new Map<string, string>()
    for (const row of customPlantillasRaw ?? []) {
        const tipo = row.tipo_evento as string
        if (!customLabelByTipo.has(tipo) && row.nombre_display) {
            customLabelByTipo.set(tipo, row.nombre_display as string)
        }
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const eventosConStats: EventoConStats[] = eventos.map((e) => {
        const fechaEvento = new Date(e.fecha_evento + 'T12:00:00')
        const diasRestantes = Math.round(
            (fechaEvento.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        )

        const todasTareas: TareaRow[] = (e.fases ?? []).flatMap(
            (f) => (f.temas ?? []).flatMap((t) => t.tareas ?? [])
        )
        const totalTareas = todasTareas.length
        const tareasCompletadas = todasTareas.filter((t) => t.estado === 'completada').length
        const porcentajeAvance =
            totalTareas > 0 ? Math.round((tareasCompletadas / totalTareas) * 100) : 0

        const plannerNombre =
            e.planners && !Array.isArray(e.planners)
                ? (e.planners as { nombre: string }).nombre
                : null

        const fasesStats = (e.fases ?? [])
            .sort((a, b) => a.position - b.position)
            .map((f) => {
                const tareasFase = (f.temas ?? []).flatMap((t) => t.tareas ?? [])
                return {
                    nombre: f.nombre,
                    total: tareasFase.length,
                    completadas: tareasFase.filter((t) => t.estado === 'completada').length,
                }
            })

        const tipoEventoDisplay =
            e.tipo_evento.startsWith('custom_') ? customLabelByTipo.get(e.tipo_evento) ?? null : null

        return {
            id: e.id,
            nombre: e.nombre,
            tipo_evento: e.tipo_evento,
            fecha_evento: e.fecha_evento,
            token_acceso: e.token_acceso,
            diasRestantes,
            porcentajeAvance,
            totalTareas,
            tareasCompletadas,
            plannerNombre,
            fases: fasesStats,
            tipoEventoDisplay,
        }
    })

    return (
        <main style={styles.main}>
            <div style={styles.container}>
                {/* Header */}
                <div style={styles.header}>
                    <div style={styles.headerLeft}>
                        <span style={styles.headerIcon}>✦</span>
                        <h1 style={styles.title}>TMP Eventos</h1>
                    </div>
                    <form action={signOut}>
                        <button type="submit" className="btn-ghost" style={styles.signOutBtn}>
                            Cerrar sesión
                        </button>
                    </form>
                </div>

                {/* Quick nav */}
                <div style={styles.quickNav}>
                    <Link href="/planners" style={styles.quickNavLink}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                        Planners
                    </Link>
                    <Link href="/plantillas" style={styles.quickNavLink}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="9" x2="15" y2="9" /><line x1="9" y1="13" x2="15" y2="13" /><line x1="9" y1="17" x2="12" y2="17" />
                        </svg>
                        Plantillas
                    </Link>
                </div>

                {/* Toolbar */}
                <div style={styles.toolbar}>
                    <div>
                        <p style={styles.subtitle}>
                            {eventosConStats.length === 0
                                ? 'No hay eventos creados aún'
                                : `${eventosConStats.length} evento${eventosConStats.length !== 1 ? 's' : ''}`}
                        </p>
                    </div>
                    <Link href="/eventos/nuevo" className="btn-gold" style={styles.newBtn}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Nuevo evento
                    </Link>
                </div>

                {/* Events list */}
                {eventosConStats.length === 0 ? (
                    <div className="card" style={styles.emptyState}>
                        <div style={styles.emptyIcon}>📅</div>
                        <h2 style={styles.emptyTitle}>Sin eventos aún</h2>
                        <p style={styles.emptyText}>
                            Creá tu primer evento y el sistema copiará las plantillas automáticamente.
                        </p>
                        <Link href="/eventos/nuevo" className="btn-gold" style={{ marginTop: '0.5rem' }}>
                            Crear primer evento
                        </Link>
                    </div>
                ) : (
                    <div style={styles.eventsList}>
                        {eventosConStats.map((evento) => (
                            <EventCard key={evento.id} evento={evento} />
                        ))}
                    </div>
                )}
            </div>
        </main>
    )
}

const styles: Record<string, React.CSSProperties> = {
    main: {
        minHeight: '100vh',
        padding: '2rem 1.5rem',
        backgroundColor: 'var(--color-cream)',
    },
    container: {
        maxWidth: '860px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: '1.25rem',
        borderBottom: '1px solid var(--color-border)',
    },
    headerLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
    },
    headerIcon: {
        color: 'var(--color-gold)',
        fontSize: '1rem',
    },
    title: {
        fontFamily: 'var(--font-serif)',
        fontSize: '1.5rem',
        fontWeight: 600,
        color: 'var(--color-text)',
    },
    signOutBtn: {
        fontSize: '0.8rem',
    },
    quickNav: {
        display: 'flex',
        gap: '0.5rem',
        flexWrap: 'wrap' as const,
    },
    quickNavLink: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        fontSize: '0.8rem',
        fontWeight: 500,
        padding: '0.4rem 0.9rem',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-sm)',
        color: 'var(--color-text-muted)',
        backgroundColor: 'var(--color-white)',
        textDecoration: 'none',
        transition: 'border-color 0.15s, color 0.15s',
    },
    toolbar: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    subtitle: {
        fontSize: '0.875rem',
        color: 'var(--color-text-muted)',
    },
    newBtn: {
        gap: '0.4rem',
        paddingInline: '1.25rem',
    },
    eventsList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
    },
    emptyState: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '3rem 2rem',
        textAlign: 'center',
    },
    emptyIcon: {
        fontSize: '3rem',
    },
    emptyTitle: {
        fontFamily: 'var(--font-serif)',
        fontSize: '1.35rem',
        fontWeight: 500,
    },
    emptyText: {
        fontSize: '0.9rem',
        color: 'var(--color-text-muted)',
        maxWidth: '340px',
    },
}

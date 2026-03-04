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

export default async function PlannerDashboardPage() {
    const supabase = await createServerSupabaseClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    // Find planner record by user_id
    const { data: planner } = await db
        .from('planners')
        .select('id, nombre')
        .eq('user_id', user.id)
        .maybeSingle() as { data: { id: string; nombre: string } | null }

    if (!planner) {
        // Planner account not linked yet — show a friendly message
        return (
            <main style={styles.main}>
                <div style={styles.container}>
                    <div style={styles.header}>
                        <div style={styles.headerLeft}>
                            <span style={styles.headerIcon}>✦</span>
                            <h1 style={styles.title}>Event Planner</h1>
                        </div>
                        <form action={signOut}>
                            <button type="submit" className="btn-ghost" style={styles.signOutBtn}>
                                Cerrar sesión
                            </button>
                        </form>
                    </div>
                    <div className="card" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⏳</div>
                        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', marginBottom: '0.5rem' }}>
                            Tu cuenta aún no está vinculada
                        </h2>
                        <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', maxWidth: '360px', margin: '0 auto' }}>
                            Tu email ({user.email}) no coincide con ningún planner registrado.
                            Pedile al administrador que registre tu cuenta como planner.
                        </p>
                    </div>
                </div>
            </main>
        )
    }

    // Fetch only events assigned to this planner
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: eventos } = await (supabase as any)
        .from('eventos')
        .select(`
      id,
      nombre,
      tipo_evento,
      fecha_evento,
      token_acceso,
      planners ( nombre ),
      fases (
        tareas ( id, completada )
      )
    `)
        .eq('planner_id', planner.id)
        .order('fecha_evento', { ascending: true })

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    type EventoRow = {
        id: string; nombre: string; tipo_evento: string; fecha_evento: string
        token_acceso: string
        planners: { nombre: string } | null
        fases: { tareas: { id: string; completada: boolean }[] | null }[] | null
    }
    const eventosList = (eventos ?? []) as EventoRow[]

    const eventosConStats: EventoConStats[] = eventosList.map((e) => {
        const fechaEvento = new Date(e.fecha_evento + 'T12:00:00')
        const diasRestantes = Math.round(
            (fechaEvento.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        )
        const todasTareas = (e.fases ?? []).flatMap(
            (f) => f.tareas ?? []
        )
        const totalTareas = todasTareas.length
        const tareasCompletadas = todasTareas.filter(
            (t: { id: string; completada: boolean }) => t.completada
        ).length
        const porcentajeAvance = totalTareas > 0 ? Math.round((tareasCompletadas / totalTareas) * 100) : 0
        const plannerNombre =
            e.planners && !Array.isArray(e.planners)
                ? (e.planners as { nombre: string }).nombre
                : null

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
        }
    })

    return (
        <main style={styles.main}>
            <div style={styles.container}>
                {/* Header */}
                <div style={styles.header}>
                    <div style={styles.headerLeft}>
                        <span style={styles.headerIcon}>✦</span>
                        <div>
                            <h1 style={styles.title}>Event Planner</h1>
                            <p style={styles.plannerName}>Hola, {planner.nombre}</p>
                        </div>
                    </div>
                    <form action={signOut}>
                        <button type="submit" className="btn-ghost" style={styles.signOutBtn}>
                            Cerrar sesión
                        </button>
                    </form>
                </div>

                {/* Toolbar */}
                <div style={styles.toolbar}>
                    <p style={styles.subtitle}>
                        {eventosConStats.length === 0
                            ? 'No tenés eventos asignados aún'
                            : `${eventosConStats.length} evento${eventosConStats.length !== 1 ? 's' : ''} asignado${eventosConStats.length !== 1 ? 's' : ''}`}
                    </p>
                </div>

                {/* Events list */}
                {eventosConStats.length === 0 ? (
                    <div className="card" style={styles.emptyState}>
                        <div style={styles.emptyIcon}>📅</div>
                        <h2 style={styles.emptyTitle}>Sin eventos asignados</h2>
                        <p style={styles.emptyText}>
                            El administrador aún no te asignó ningún evento.
                        </p>
                    </div>
                ) : (
                    <div style={styles.eventsList}>
                        {eventosConStats.map((evento) => (
                            <EventCard
                                key={evento.id}
                                evento={evento}
                                href={`/planner/eventos/${evento.id}`}
                                canDelete={false}
                            />
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
        gap: '0.65rem',
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
        lineHeight: 1.1,
    },
    plannerName: {
        fontSize: '0.8rem',
        color: 'var(--color-text-muted)',
        marginTop: '0.1rem',
    },
    signOutBtn: {
        fontSize: '0.8rem',
    },
    toolbar: {
        display: 'flex',
        alignItems: 'center',
    },
    subtitle: {
        fontSize: '0.875rem',
        color: 'var(--color-text-muted)',
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
    emptyIcon: { fontSize: '3rem' },
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

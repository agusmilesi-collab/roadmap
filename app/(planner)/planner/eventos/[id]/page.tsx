import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase'
import { EventoDetailClient } from '@/components/admin/evento/EventoDetailClient'

interface Props {
    params: Promise<{ id: string }>
}

export default async function PlannerEventoPage({ params }: Props) {
    const { id } = await params
    const supabase = await createServerSupabaseClient()

    // Verify that the authenticated user is a planner assigned to this event
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    // Find this planner's record
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: planner } = await (supabase as any)
        .from('planners')
        .select('id, nombre')
        .eq('user_id', user.id)
        .maybeSingle() as { data: { id: string; nombre: string } | null }

    if (!planner) redirect('/planner/dashboard')

    // Fetch the event
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: eventoRaw } = await (supabase as any)
        .from('eventos')
        .select(`
      id,
      nombre,
      tipo_evento,
      fecha_evento,
      presupuesto_usd,
      tipo_cambio,
      token_acceso,
      planner_id,
      planners ( nombre, email, telefono ),
      fases (
        id, nombre, descripcion, orden,
        tareas (
          id, nombre, fecha, estado, tipo, resumen, completada, orden,
          acuerdos ( id, texto, created_at )
        )
      ),
      rubros (
        id, nombre, estado, proveedor, monto_original, moneda,
        tipo_cambio_propio, sena_pct, fecha_decision, fecha_sena, notas, orden
      )
    `)
        .eq('id', id)
        .single()

    type EventoRow = {
        id: string; nombre: string; tipo_evento: string; fecha_evento: string
        presupuesto_usd: number | null; tipo_cambio: number | null
        token_acceso: string; planner_id: string | null
        planners: { nombre: string; email: string; telefono: string | null } | null
        fases: {
            id: string; nombre: string; descripcion: string | null; orden: number
            tareas: {
                id: string; nombre: string; fecha: string | null; estado: string
                tipo: string | null; resumen: string | null; completada: boolean; orden: number
                acuerdos: { id: string; texto: string; created_at: string }[]
            }[]
        }[]
        rubros: {
            id: string; nombre: string; estado: string; proveedor: string | null
            monto_original: number | null; moneda: string; tipo_cambio_propio: number | null
            sena_pct: number | null; fecha_decision: string | null; fecha_sena: string | null
            notas: string | null; orden: number
        }[]
    }
    const evento = eventoRaw as EventoRow | null

    // If event not found OR doesn't belong to this planner → redirect (not 404)
    if (!evento || evento.planner_id !== planner.id) {
        redirect('/planner/dashboard')
    }

    // Sort fases and tasks by orden, dedup
    const seenFases = new Set<string>()
    const fasesSorted = [...(evento.fases ?? [])]
        .sort((a, b) => a.orden - b.orden)
        .filter((f) => { if (seenFases.has(f.id)) return false; seenFases.add(f.id); return true })
    const fasesConTareas = fasesSorted.map((f) => ({
        ...f,
        tareas: [...(f.tareas ?? [])].sort((a, b) => a.orden - b.orden),
    }))

    const seenRubros = new Set<string>()
    const rubrosSorted = [...(evento.rubros ?? [])]
        .sort((a, b) => a.orden - b.orden)
        .filter((r) => { if (seenRubros.has(r.id)) return false; seenRubros.add(r.id); return true })

    const plannerInfo = evento.planners && !Array.isArray(evento.planners)
        ? (evento.planners as { nombre: string; email: string; telefono: string | null })
        : null

    return (
        <main style={styles.main}>
            {/* Breadcrumb */}
            <div style={styles.breadcrumb}>
                <Link href="/planner/dashboard" style={styles.breadcrumbLink}>← Mis eventos</Link>
                <span style={styles.breadcrumbSep}>/</span>
                <span style={styles.breadcrumbCurrent}>{evento.nombre}</span>
            </div>

            <EventoDetailClient
                evento={{
                    id: evento.id,
                    nombre: evento.nombre,
                    tipo_evento: evento.tipo_evento,
                    fecha_evento: evento.fecha_evento,
                    presupuesto_usd: evento.presupuesto_usd,
                    tipo_cambio: evento.tipo_cambio,
                    token_acceso: evento.token_acceso,
                    planner: plannerInfo,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    fases: fasesConTareas as any,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    rubros: rubrosSorted as any,
                }}
                allPlanners={[]}
                plannerId={null}
                canChangePlanner={false}
            />
        </main>
    )
}

const styles: Record<string, React.CSSProperties> = {
    main: {
        minHeight: '100vh',
        backgroundColor: 'var(--color-cream)',
        padding: '1.5rem',
    },
    breadcrumb: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        fontSize: '0.85rem',
        maxWidth: '980px',
        margin: '0 auto 1.5rem',
    },
    breadcrumbLink: {
        color: 'var(--color-gold)',
        textDecoration: 'none',
        fontWeight: 500,
    },
    breadcrumbSep: { color: 'var(--color-border)' },
    breadcrumbCurrent: { color: 'var(--color-text-muted)' },
}

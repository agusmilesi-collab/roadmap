import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase'
import { EventoDetailClient } from '@/components/admin/evento/EventoDetailClient'

interface Props {
    params: Promise<{ id: string }>
}

interface EventoDetailRow {
    id: string
    nombre: string
    tipo_evento: string
    fecha_evento: string
    presupuesto_usd: number | null
    tipo_cambio: number | null
    token_acceso: string
    planner_id: string | null
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
        costo_total: number | null; descripcion_servicio: string | null
        pagos_proveedor: {
            id: string; rubro_id: string; monto: number; moneda: string
            tipo_cambio_snapshot: number | null; fecha: string
            realizado: boolean; descripcion: string | null; created_at: string
        }[]
    }[]
}

export default async function EventoDetailPage({ params }: Props) {
    const { id } = await params
    const supabase = await createServerSupabaseClient()

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
        tipo_cambio_propio, sena_pct, fecha_decision, fecha_sena, notas, orden,
        costo_total, descripcion_servicio,
        pagos_proveedor (
          id, rubro_id, monto, moneda, tipo_cambio_snapshot, fecha, realizado, descripcion, created_at
        )
      )
    `)
        .eq('id', id)
        .single()

    const evento = eventoRaw as EventoDetailRow | null
    if (!evento) notFound()

    // Sort fases and tasks by orden, dedup by id (guard against duplicate DB rows)
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
        .sort((a, b) => {
            // orden = 0 means never manually sorted → treat as Infinity, tiebreak alphabetically
            const ao = a.orden === 0 ? Infinity : a.orden
            const bo = b.orden === 0 ? Infinity : b.orden
            if (ao !== bo) return ao < bo ? -1 : 1
            return a.nombre.localeCompare(b.nombre, 'es')
        })
        .filter((r) => { if (seenRubros.has(r.id)) return false; seenRubros.add(r.id); return true })
        .map((r) => ({
            ...r,
            pagos_proveedor: [...(r.pagos_proveedor ?? [])].sort(
                (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            ),
        }))

    const planner = evento.planners && !Array.isArray(evento.planners)
        ? (evento.planners as { nombre: string; email: string; telefono: string | null })
        : null

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allPlanners = await (supabase as any)
        .from('planners')
        .select('id, nombre')
        .order('nombre')
        .then((r: { data: { id: string; nombre: string }[] | null }) => r.data ?? [])

    return (
        <main style={styles.main}>
            {/* Breadcrumb */}
            <div style={styles.breadcrumb}>
                <Link href="/dashboard" style={styles.breadcrumbLink}>← Dashboard</Link>
                <span style={styles.breadcrumbSep}>/</span>
                <span style={styles.breadcrumbCurrent}>{evento.nombre}</span>
            </div>

            <EventoDetailClient
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                evento={{
                    id: evento.id,
                    nombre: evento.nombre,
                    tipo_evento: evento.tipo_evento,
                    fecha_evento: evento.fecha_evento,
                    presupuesto_usd: evento.presupuesto_usd,
                    tipo_cambio: evento.tipo_cambio,
                    token_acceso: evento.token_acceso,
                    planner,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    fases: fasesConTareas as any,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    rubros: rubrosSorted as any,
                }}
                allPlanners={allPlanners}
                plannerId={evento.planner_id ?? null}
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
        marginBottom: '1.5rem',
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

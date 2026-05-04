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

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: planner } = await (supabase as any)
        .from('planners')
        .select('id, nombre')
        .eq('user_id', user.id)
        .maybeSingle() as { data: { id: string; nombre: string } | null }

    if (!planner) redirect('/planner/dashboard')

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
      mostrar_dashboard_cliente,
      mostrar_acuerdos_cliente,
      planners ( nombre, email, telefono ),
      fases (
        id, nombre, descripcion, fecha_inicio, fecha_fin, position,
        temas (
          id, nombre, descripcion, position,
          tareas ( id, nombre, estado, position ),
          acuerdos ( id, texto, created_at ),
          cotizaciones ( id, proveedor, link, position, created_at )
        )
      ),
      rubros (
        id, nombre, estado, proveedor, monto_original, moneda,
        tipo_cambio_propio, sena_pct, fecha_decision, fecha_sena, notas, orden,
        costo_total, descripcion_servicio,
        pagos_proveedor (
          id, rubro_id, monto, moneda, tipo_cambio_snapshot, fecha, realizado, descripcion, created_at,
          tipo, devuelto, fecha_devolucion
        )
      )
    `)
        .eq('id', id)
        .single()

    type EventoRow = {
        id: string; nombre: string; tipo_evento: string; fecha_evento: string
        presupuesto_usd: number | null; tipo_cambio: number | null
        token_acceso: string; planner_id: string | null
        mostrar_dashboard_cliente: boolean; mostrar_acuerdos_cliente: boolean
        planners: { nombre: string; email: string; telefono: string | null } | null
        fases: {
            id: string; nombre: string; descripcion: string | null
            fecha_inicio: string | null; fecha_fin: string | null; position: number
            temas: {
                id: string; nombre: string; descripcion: string | null
                position: number
                tareas: { id: string; nombre: string; estado: string; position: number }[]
                acuerdos: { id: string; texto: string; created_at: string }[]
                cotizaciones: { id: string; proveedor: string; link: string; position: number; created_at: string }[]
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
                tipo: 'cuota' | 'sena' | 'deposito_garantia'
                devuelto: boolean; fecha_devolucion: string | null
            }[]
        }[]
    }
    const evento = eventoRaw as EventoRow | null

    if (!evento || evento.planner_id !== planner.id) {
        redirect('/planner/dashboard')
    }

    const seenFases = new Set<string>()
    const fasesSorted = [...(evento.fases ?? [])]
        .sort((a, b) => a.position - b.position)
        .filter((f) => { if (seenFases.has(f.id)) return false; seenFases.add(f.id); return true })
    const fasesConTemas = fasesSorted.map((f) => ({
        ...f,
        temas: [...(f.temas ?? [])]
            .sort((a, b) => a.position - b.position)
            .map((t) => ({
                ...t,
                tareas: [...(t.tareas ?? [])].sort((a, b) => a.position - b.position),
                acuerdos: [...(t.acuerdos ?? [])].sort(
                    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                ),
                cotizaciones: [...(t.cotizaciones ?? [])].sort((a, b) => a.position - b.position),
            })),
    }))

    function rubroStatusGroup(r: { estado: string; proveedor: string | null }): number {
        if (r.estado === 'completado') return 0
        if (r.estado === 'señado') return 1
        if (r.proveedor) return 2
        return 3
    }

    const seenRubros = new Set<string>()
    const rubrosSorted = [...(evento.rubros ?? [])]
        .sort((a, b) => {
            const ag = rubroStatusGroup(a), bg = rubroStatusGroup(b)
            if (ag !== bg) return ag - bg
            return a.nombre.localeCompare(b.nombre, 'es')
        })
        .filter((r) => { if (seenRubros.has(r.id)) return false; seenRubros.add(r.id); return true })
        .map((r) => ({
            ...r,
            pagos_proveedor: [...(r.pagos_proveedor ?? [])].sort(
                (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            ),
        }))

    const plannerInfo = evento.planners && !Array.isArray(evento.planners)
        ? (evento.planners as { nombre: string; email: string; telefono: string | null })
        : null

    return (
        <main style={styles.main}>
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
                    mostrar_dashboard_cliente: evento.mostrar_dashboard_cliente ?? true,
                    mostrar_acuerdos_cliente: evento.mostrar_acuerdos_cliente ?? true,
                    planner: plannerInfo,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    fases: fasesConTemas as any,
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

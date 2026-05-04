import type { Metadata } from 'next'
import { createServerSupabaseClient } from '@/lib/supabase'
import { EventoClienteView } from '@/components/cliente/EventoClienteView'
import { NotFoundPage } from '@/components/cliente/NotFoundPage'

interface Props {
    params: Promise<{ token: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { token } = await params
    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
        .from('eventos')
        .select('nombre, tipo_evento')
        .eq('token_acceso', token)
        .single() as { data: { nombre: string; tipo_evento: string } | null }

    if (!data) return { title: 'Evento no encontrado — TMP Eventos' }

    const TIPO_SUBTITLE: Record<string, string> = {
        boda: 'La Boda de',
        quince: 'Los 15 de',
        cumple: 'El Cumple de',
        baby_shower: 'El Baby Shower de',
    }
    const subtitle = TIPO_SUBTITLE[data.tipo_evento] ?? 'El evento de'

    return {
        title: `${subtitle} ${data.nombre} — TMP Eventos`,
    }
}

interface EventoClienteRow {
    id: string
    nombre: string
    tipo_evento: string
    fecha_evento: string
    presupuesto_usd: number | null
    tipo_cambio: number | null
    mostrar_dashboard_cliente: boolean
    mostrar_acuerdos_cliente: boolean
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
        sena_pct: number | null; orden: number; notas: string | null
        costo_total: number | null; descripcion_servicio: string | null
        pagos_proveedor: {
            id: string; monto: number; moneda: string; tipo_cambio_snapshot: number | null
            fecha: string; realizado: boolean; descripcion: string | null; created_at: string
        }[]
    }[]
}

export default async function EventoClientePage({ params }: Props) {
    const { token } = await params
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
                tipo_cambio_propio, sena_pct, orden, notas,
                costo_total, descripcion_servicio,
                pagos_proveedor (
                    id, monto, moneda, tipo_cambio_snapshot, fecha, realizado, descripcion, created_at,
                    tipo, devuelto, fecha_devolucion
                )
            )
        `)
        .eq('token_acceso', token)
        .single()

    const evento = eventoRaw as EventoClienteRow | null

    if (!evento) {
        return <NotFoundPage />
    }

    const seenFases = new Set<string>()
    const fasesSorted = [...(evento.fases ?? [])]
        .sort((a, b) => a.position - b.position)
        .filter((f) => {
            if (seenFases.has(f.id)) return false
            seenFases.add(f.id)
            return true
        })
        .map((f) => ({
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

    const seenRubros = new Set<string>()
    const rubrosSorted = [...(evento.rubros ?? [])]
        .sort((a, b) => a.orden - b.orden)
        .filter((r) => {
            if (seenRubros.has(r.id)) return false
            seenRubros.add(r.id)
            return true
        })
        .map((r) => ({
            ...r,
            pagos_proveedor: [...(r.pagos_proveedor ?? [])].sort(
                (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            ),
        }))

    const planner = evento.planners && !Array.isArray(evento.planners)
        ? (evento.planners as { nombre: string; email: string; telefono: string | null })
        : null

    return (
        <EventoClienteView
            evento={{
                id: evento.id,
                nombre: evento.nombre,
                tipo_evento: evento.tipo_evento,
                fecha_evento: evento.fecha_evento,
                presupuesto_usd: evento.presupuesto_usd,
                tipo_cambio: evento.tipo_cambio,
                mostrar_dashboard_cliente: evento.mostrar_dashboard_cliente ?? true,
                mostrar_acuerdos_cliente: evento.mostrar_acuerdos_cliente ?? true,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                fases: fasesSorted as any,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                rubros: rubrosSorted as any,
                planner: planner ? {
                    nombre: planner.nombre,
                    email: planner.email,
                    telefono: planner.telefono,
                    foto_url: null,
                } : null,
            }}
        />
    )
}

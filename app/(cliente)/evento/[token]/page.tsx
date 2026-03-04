import type { Metadata } from 'next'
import { createServerSupabaseClient } from '@/lib/supabase'
import { EventoClienteView } from '@/components/cliente/EventoClienteView'
import { NotFoundPage } from '@/components/cliente/NotFoundPage'

interface Props {
    params: Promise<{ token: string }>
}

// Generate dynamic page title
export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { token } = await params
    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
        .from('eventos')
        .select('nombre, tipo_evento')
        .eq('token_acceso', token)
        .single() as { data: { nombre: string; tipo_evento: string } | null }

    if (!data) return { title: 'Evento no encontrado — Event Planner' }

    const TIPO_SUBTITLE: Record<string, string> = {
        boda: 'La Boda de',
        quince: 'Los 15 de',
        cumple: 'El Cumple de',
        baby_shower: 'El Baby Shower de',
    }
    const subtitle = TIPO_SUBTITLE[data.tipo_evento] ?? 'El evento de'

    return {
        title: `${subtitle} ${data.nombre} — Event Planner`,
    }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface EventoClienteRow {
    id: string
    nombre: string
    tipo_evento: string
    fecha_evento: string
    presupuesto_usd: number | null
    tipo_cambio: number | null
    planners: { nombre: string; email: string; telefono: string | null } | null
    fases: {
        id: string; nombre: string; descripcion: string | null; orden: number
        tareas: {
            id: string; nombre: string; tipo: string | null; fecha: string | null
            estado: string; completada: boolean; resumen: string | null; orden: number
            acuerdos: { id: string; texto: string }[]
        }[]
    }[]
    rubros: {
        id: string; nombre: string; estado: string; proveedor: string | null
        monto_original: number | null; moneda: string; sena_pct: number | null
        orden: number; notas: string | null
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
            planners ( nombre, email, telefono ),
            fases (
                id, nombre, descripcion, orden,
                tareas (
                    id, nombre, tipo, fecha, estado, completada, resumen, orden,
                    acuerdos ( id, texto )
                )
            ),
            rubros (
                id, nombre, estado, proveedor, monto_original, moneda,
                sena_pct, orden, notas
            )
        `)
        .eq('token_acceso', token)
        .single()

    const evento = eventoRaw as EventoClienteRow | null

    if (!evento) {
        return <NotFoundPage />
    }

    // ── Sort & deduplicate fases by (id) ────────────────────────────────────
    const seenFases = new Set<string>()
    const fasesSorted = [...(evento.fases ?? [])]
        .sort((a, b) => a.orden - b.orden)
        .filter((f) => {
            if (seenFases.has(f.id)) return false
            seenFases.add(f.id)
            return true
        })
        .map((f) => ({
            ...f,
            tareas: [...(f.tareas ?? [])].sort((a, b) => a.orden - b.orden),
        }))

    const seenRubros = new Set<string>()
    const rubrosSorted = [...(evento.rubros ?? [])]
        .sort((a, b) => a.orden - b.orden)
        .filter((r) => {
            if (seenRubros.has(r.id)) return false
            seenRubros.add(r.id)
            return true
        })

    const planner = evento.planners && !Array.isArray(evento.planners)
        ? (evento.planners as { nombre: string; email: string; telefono: string | null })
        : null

    return (
        <EventoClienteView
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            evento={{
                id: evento.id,
                nombre: evento.nombre,
                tipo_evento: evento.tipo_evento,
                fecha_evento: evento.fecha_evento,
                presupuesto_usd: evento.presupuesto_usd,
                tipo_cambio: evento.tipo_cambio,
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

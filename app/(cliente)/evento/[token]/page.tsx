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
    const { data } = await supabase
        .from('eventos')
        .select('nombre, tipo_evento')
        .eq('token_acceso', token)
        .single()

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

export default async function EventoClientePage({ params }: Props) {
    const { token } = await params
    const supabase = await createServerSupabaseClient()

    const { data: evento } = await supabase
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
            evento={{
                id: evento.id,
                nombre: evento.nombre,
                tipo_evento: evento.tipo_evento,
                fecha_evento: evento.fecha_evento,
                presupuesto_usd: evento.presupuesto_usd,
                tipo_cambio: evento.tipo_cambio,
                fases: fasesSorted,
                rubros: rubrosSorted,
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

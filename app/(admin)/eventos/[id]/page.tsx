import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase'
import { EventoDetailClient } from '@/components/admin/evento/EventoDetailClient'

interface Props {
    params: Promise<{ id: string }>
}

export default async function EventoDetailPage({ params }: Props) {
    const { id } = await params
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
      token_acceso,
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
        sena_pct, fecha_decision, fecha_sena, notas, orden
      )
    `)
        .eq('id', id)
        .single()

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
        .sort((a, b) => a.orden - b.orden)
        .filter((r) => { if (seenRubros.has(r.id)) return false; seenRubros.add(r.id); return true })

    const planner = evento.planners && !Array.isArray(evento.planners)
        ? (evento.planners as { nombre: string; email: string; telefono: string | null })
        : null

    return (
        <main style={styles.main}>
            {/* Breadcrumb */}
            <div style={styles.breadcrumb}>
                <Link href="/dashboard" style={styles.breadcrumbLink}>← Dashboard</Link>
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
                    planner,
                    fases: fasesConTareas,
                    rubros: rubrosSorted,
                }}
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

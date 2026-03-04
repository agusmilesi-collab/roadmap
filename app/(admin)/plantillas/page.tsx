import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase'
import { PlantillasClient } from '@/components/admin/PlantillasClient'

export const metadata = { title: 'Plantillas — Event Planner' }

const TIPOS = ['boda', 'quince', 'cumple', 'baby_shower']

export default async function PlantillasPage() {
    const supabase = await createServerSupabaseClient()

    // Fetch all plantillas_fases with their tareas for all tipos at once
    const { data: allFases } = await supabase
        .from('plantillas_fases')
        .select(`
            id, nombre, descripcion, orden, tipo_evento,
            plantillas_tareas ( id, nombre, tipo, meses_antes, orden )
        `)
        .order('orden')

    // Group by tipo_evento and deduplicate by nombre+orden (guard against bad DB data)
    const fasesPorTipo: Record<string, { id: string; nombre: string; descripcion: string | null; orden: number; tareas: { id: string; nombre: string; tipo: string | null; meses_antes: number | null; orden: number }[] }[]> = {}

    for (const tipo of TIPOS) {
        const seenKeys = new Set<string>()
        fasesPorTipo[tipo] = (allFases ?? [])
            .filter((f) => {
                if (f.tipo_evento !== tipo) return false
                const key = `${f.nombre}__${f.orden}`
                if (seenKeys.has(key)) return false
                seenKeys.add(key)
                return true
            })
            .map((f) => ({
                id: f.id,
                nombre: f.nombre,
                descripcion: f.descripcion,
                orden: f.orden,
                tareas: [...(f.plantillas_tareas ?? [])].sort((a, b) => a.orden - b.orden),
            }))
    }

    return (
        <main style={st.main}>
            <div style={st.container}>
                {/* Header */}
                <div style={st.header}>
                    <div style={st.headerLeft}>
                        <Link href="/dashboard" style={st.backLink}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <polyline points="15 18 9 12 15 6" />
                            </svg>
                            Dashboard
                        </Link>
                        <div style={st.titleGroup}>
                            <span style={st.headerIcon}>✦</span>
                            <h1 style={st.title}>Plantillas de eventos</h1>
                        </div>
                    </div>
                </div>

                <p style={st.subtitle}>
                    Editá las fases y tareas base por tipo de evento. Estos cambios se aplican solo a eventos futuros.
                </p>

                <PlantillasClient fasesPorTipo={fasesPorTipo} />
            </div>
        </main>
    )
}

const st: Record<string, React.CSSProperties> = {
    main: { minHeight: '100vh', padding: '2rem 1.5rem', backgroundColor: 'var(--color-cream)' },
    container: { maxWidth: '860px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' },
    header: { paddingBottom: '1rem', borderBottom: '1px solid var(--color-border)' },
    headerLeft: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
    backLink: { display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', color: 'var(--color-text-muted)', textDecoration: 'none' },
    titleGroup: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
    headerIcon: { color: 'var(--color-gold)', fontSize: '1rem' },
    title: { fontFamily: 'var(--font-serif)', fontSize: '1.6rem', fontWeight: 600, color: 'var(--color-text)' },
    subtitle: { fontSize: '0.875rem', color: 'var(--color-text-muted)', marginTop: '-0.5rem' },
}

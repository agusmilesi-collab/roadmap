import Link from 'next/link'
import { Suspense } from 'react'
import { createServerSupabaseClient } from '@/lib/supabase'
import { PlantillasClient } from '@/components/admin/PlantillasClient'

export const metadata = { title: 'Plantillas — TMP Eventos' }

const TIPOS_BASE = ['boda', 'quince', 'cumple', 'baby_shower']

interface PlantillaTareaRow {
    id: string
    nombre: string
    position: number
}
interface PlantillaTemaRow {
    id: string
    nombre: string
    descripcion: string | null
    position: number
    plantillas_tareas: PlantillaTareaRow[]
}
interface PlantillaFaseRow {
    id: string
    nombre: string
    descripcion: string | null
    meses_antes_inicio: number
    meses_antes_fin: number
    position: number
    tipo_evento: string
    es_custom: boolean | null
    nombre_display: string | null
    plantillas_temas: PlantillaTemaRow[]
}

export default async function PlantillasPage() {
    const supabase = await createServerSupabaseClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: allFasesRaw } = await (supabase as any)
        .from('plantillas_fases')
        .select(`
            id, nombre, descripcion, meses_antes_inicio, meses_antes_fin, position,
            tipo_evento, es_custom, nombre_display,
            plantillas_temas (
                id, nombre, descripcion, position,
                plantillas_tareas ( id, nombre, position )
            )
        `)
        .order('position')

    const allFases = (allFasesRaw ?? []) as PlantillaFaseRow[]

    function buildFasesForTipo(tipo: string): PlantillaFaseRow[] {
        const seenKeys = new Set<string>()
        return allFases
            .filter((f) => {
                if (f.tipo_evento !== tipo) return false
                const key = `${f.nombre}__${f.position}`
                if (seenKeys.has(key)) return false
                seenKeys.add(key)
                return true
            })
            .sort((a, b) => a.position - b.position)
            .map((f) => ({
                ...f,
                plantillas_temas: [...(f.plantillas_temas ?? [])]
                    .sort((a, b) => a.position - b.position)
                    .map((t) => ({
                        ...t,
                        plantillas_tareas: [...(t.plantillas_tareas ?? [])].sort((a, b) => a.position - b.position),
                    })),
            }))
    }

    const fasesPorTipo: Record<string, PlantillaFaseRow[]> = {}
    for (const tipo of TIPOS_BASE) {
        fasesPorTipo[tipo] = buildFasesForTipo(tipo)
    }

    const seenCustomTipos = new Set<string>()
    const customTipos: { value: string; label: string }[] = []
    for (const f of allFases) {
        if (f.es_custom && !seenCustomTipos.has(f.tipo_evento)) {
            seenCustomTipos.add(f.tipo_evento)
            customTipos.push({ value: f.tipo_evento, label: f.nombre_display ?? f.tipo_evento })
            fasesPorTipo[f.tipo_evento] = buildFasesForTipo(f.tipo_evento)
        }
    }

    const baseTipoDisplayNames: Record<string, string> = {}
    for (const f of allFases) {
        if (!f.es_custom && f.nombre_display && TIPOS_BASE.includes(f.tipo_evento)) {
            baseTipoDisplayNames[f.tipo_evento] = f.nombre_display
        }
    }

    return (
        <main style={st.main}>
            <div style={st.container}>
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
                    Editá las fases, temas y tareas base por tipo de evento. Estos cambios se aplican solo a eventos futuros.
                </p>

                <Suspense fallback={<div style={{ padding: '2rem', color: 'var(--color-text-muted)' }}>Cargando…</div>}>
                    <PlantillasClient
                        fasesPorTipo={fasesPorTipo}
                        customTipos={customTipos}
                        baseTipoDisplayNames={baseTipoDisplayNames}
                    />
                </Suspense>
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

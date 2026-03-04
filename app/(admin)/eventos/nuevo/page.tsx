import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase'
import { NuevoEventoForm } from '@/components/admin/NuevoEventoForm'
import type { Planner } from '@/lib/types'

export default async function NuevoEventoPage() {
    const supabase = await createServerSupabaseClient()

    const { data: planners } = await supabase
        .from('planners')
        .select('id, nombre, email, telefono, foto_url, bio_corta, created_at')
        .order('nombre')

    // Fetch distinct custom plantillas
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: customFases } = await (supabase as any)
        .from('plantillas_fases')
        .select('tipo_evento, nombre_display')
        .eq('es_custom', true)
        .order('nombre_display')

    type CustomFaseRow = { tipo_evento: string; nombre_display: string | null }
    const seenCustom = new Set<string>()
    const customTipos: { value: string; label: string }[] = []
    for (const f of (customFases ?? []) as CustomFaseRow[]) {
        if (!seenCustom.has(f.tipo_evento)) {
            seenCustom.add(f.tipo_evento)
            customTipos.push({ value: f.tipo_evento, label: f.nombre_display ?? f.tipo_evento })
        }
    }

    return (
        <main style={styles.main}>
            <div style={styles.container}>
                {/* Breadcrumb */}
                <nav style={styles.breadcrumb}>
                    <Link href="/dashboard" style={styles.breadcrumbLink}>
                        ← Dashboard
                    </Link>
                    <span style={styles.breadcrumbSep}>/</span>
                    <span style={styles.breadcrumbCurrent}>Nuevo evento</span>
                </nav>

                {/* Header */}
                <div>
                    <h1 style={styles.pageTitle}>Crear nuevo evento</h1>
                    <p style={styles.pageSubtitle}>
                        Las fases, tareas y rubros se copiarán automáticamente desde las plantillas.
                    </p>
                </div>

                {/* Form card */}
                <div className="card" style={styles.formCard}>
                    <NuevoEventoForm planners={(planners ?? []) as Planner[]} customTipos={customTipos} />
                </div>
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
        maxWidth: '640px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
    },
    breadcrumb: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        fontSize: '0.85rem',
    },
    breadcrumbLink: {
        color: 'var(--color-gold)',
        textDecoration: 'none',
        fontWeight: 500,
    },
    breadcrumbSep: {
        color: 'var(--color-border)',
    },
    breadcrumbCurrent: {
        color: 'var(--color-text-muted)',
    },
    pageTitle: {
        fontFamily: 'var(--font-serif)',
        fontSize: '1.75rem',
        fontWeight: 600,
        color: 'var(--color-text)',
        marginBottom: '0.35rem',
    },
    pageSubtitle: {
        fontSize: '0.875rem',
        color: 'var(--color-text-muted)',
    },
    formCard: {
        padding: '2rem',
    },
}

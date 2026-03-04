import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase'
import { PlannersClient } from '@/components/admin/PlannersClient'

export const metadata = { title: 'Planners — Event Planner' }

export default async function PlannersPage() {
    const supabase = await createServerSupabaseClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: planners } = await (supabase as any)
        .from('planners')
        .select('id, nombre, email, telefono, bio_corta, foto_url')
        .order('nombre') as { data: { id: string; nombre: string; email: string | null; telefono: string | null; bio_corta: string | null; foto_url: string | null }[] | null }

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
                            <h1 style={st.title}>Planners</h1>
                        </div>
                    </div>
                </div>

                <p style={st.subtitle}>
                    Gestioná el equipo de planners. Los planners pueden ser asignados a eventos al crearlos.
                </p>

                <PlannersClient planners={planners ?? []} />
            </div>
        </main>
    )
}

const st: Record<string, React.CSSProperties> = {
    main: { minHeight: '100vh', padding: '2rem 1.5rem', backgroundColor: 'var(--color-cream)' },
    container: { maxWidth: '760px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' },
    header: { paddingBottom: '1rem', borderBottom: '1px solid var(--color-border)' },
    headerLeft: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
    backLink: { display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', color: 'var(--color-text-muted)', textDecoration: 'none' },
    titleGroup: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
    headerIcon: { color: 'var(--color-gold)', fontSize: '1rem' },
    title: { fontFamily: 'var(--font-serif)', fontSize: '1.6rem', fontWeight: 600, color: 'var(--color-text)' },
    subtitle: { fontSize: '0.875rem', color: 'var(--color-text-muted)', marginTop: '-0.5rem' },
}

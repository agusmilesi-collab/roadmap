import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase'

export default async function SimuladorPage() {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    return (
        <main style={styles.main}>
            <div style={styles.container}>
                <Link href="/dashboard" style={styles.back}>← Dashboard</Link>
                <div className="card" style={styles.card}>
                    <div style={styles.eyebrow}>Admin</div>
                    <h1 style={styles.title}>Simulador</h1>
                    <p style={styles.desc}>
                        Próximamente. Definí qué tiene que simular esta herramienta y
                        lo construimos juntos.
                    </p>
                </div>
            </div>
        </main>
    )
}

const styles: Record<string, React.CSSProperties> = {
    main: {
        minHeight: '100vh',
        backgroundColor: 'var(--color-cream)',
        padding: '2rem 1.5rem',
    },
    container: {
        maxWidth: '720px',
        margin: '0 auto',
    },
    back: {
        display: 'inline-block',
        fontSize: '0.85rem',
        color: 'var(--color-gold-dark)',
        textDecoration: 'none',
        marginBottom: '1.25rem',
        fontWeight: 500,
    },
    card: {
        padding: '2.5rem 2rem',
        textAlign: 'center',
    },
    eyebrow: {
        fontFamily: 'var(--font-mono, monospace)',
        fontSize: '0.7rem',
        fontWeight: 500,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'var(--color-gold-dark)',
        marginBottom: '0.4rem',
    },
    title: {
        fontFamily: 'var(--font-serif)',
        fontSize: '2rem',
        fontWeight: 600,
        margin: '0 0 0.85rem',
        color: 'var(--color-text)',
    },
    desc: {
        fontSize: '0.95rem',
        color: 'var(--color-text-muted)',
        margin: 0,
        lineHeight: 1.6,
    },
}

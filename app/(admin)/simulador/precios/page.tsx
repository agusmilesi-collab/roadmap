import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase'
import { ListaPreciosClient } from '@/components/admin/simulador/ListaPreciosClient'

interface RubroRow {
    id: string
    nombre: string
    tipo: 'fijo' | 'var'
    opcional: boolean
    orden: number
    proveedores: {
        id: string
        nombre: string
        precio: number
        descripcion: string | null
        orden: number
    }[]
}

export default async function ListaPreciosPage() {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    const { data: rubrosRaw } = await db
        .from('simulador_rubros')
        .select(`
            id, nombre, tipo, opcional, orden,
            proveedores:simulador_proveedores(id, nombre, precio, descripcion, orden)
        `)
        .order('orden')

    const rubros = ((rubrosRaw ?? []) as RubroRow[])
        .map((r) => ({
            ...r,
            proveedores: [...r.proveedores].sort((a, b) => a.orden - b.orden),
        }))
        .sort((a, b) => a.orden - b.orden)

    return (
        <main style={styles.main}>
            <div style={styles.container}>
                <Link href="/simulador" style={styles.back}>← Simulaciones</Link>

                <div style={styles.header}>
                    <div>
                        <div style={styles.eyebrow}>Admin · Simulador</div>
                        <h1 style={styles.title}>Lista de precios</h1>
                        <p style={styles.subtitle}>
                            Rubros, proveedores y precios base. Arrastrá los rubros para reordenar. Los cambios no afectan simulaciones ya guardadas.
                        </p>
                    </div>
                </div>

                <ListaPreciosClient rubros={rubros} />
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
        maxWidth: 900,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
    },
    back: {
        display: 'inline-block',
        fontSize: '0.85rem',
        color: 'var(--color-gold-dark)',
        textDecoration: 'none',
        fontWeight: 500,
    },
    header: {
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: '1rem',
        paddingBottom: '1.25rem',
        borderBottom: '1px solid var(--color-border)',
    },
    eyebrow: {
        fontFamily: 'var(--font-mono, monospace)',
        fontSize: '0.7rem',
        fontWeight: 500,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'var(--color-gold-dark)',
        marginBottom: '0.35rem',
    },
    title: {
        fontFamily: 'var(--font-serif)',
        fontSize: '1.75rem',
        fontWeight: 600,
        color: 'var(--color-text)',
        marginBottom: '0.35rem',
    },
    subtitle: {
        fontSize: '0.875rem',
        color: 'var(--color-text-muted)',
        maxWidth: 540,
    },
}

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase'
import { SimulacionListItem } from '@/components/admin/simulador/SimulacionListItem'
import { NuevaSimulacionButton } from '@/components/admin/simulador/NuevaSimulacionButton'

interface VarianteRow {
    cantidad_invitados: number
    orden: number
    items: {
        incluido: boolean
        proveedor: { precio: number } | null
        rubro: { tipo: 'fijo' | 'var' } | null
    }[]
}

interface SimulacionRow {
    id: string
    nombre: string
    updated_at: string
    variantes: VarianteRow[]
}

export default async function SimuladorPage() {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    const [{ data: rows }, { data: lastRubro }, { data: lastProv }] = await Promise.all([
        db
            .from('simuladores')
            .select(`
                id,
                nombre,
                updated_at,
                variantes:simulador_variantes(
                    cantidad_invitados,
                    orden,
                    items:simulador_items(
                        incluido,
                        proveedor:simulador_proveedores(precio),
                        rubro:simulador_rubros(tipo)
                    )
                )
            `)
            .order('updated_at', { ascending: false }),
        db.from('simulador_rubros').select('updated_at').order('updated_at', { ascending: false }).limit(1).maybeSingle(),
        db.from('simulador_proveedores').select('updated_at').order('updated_at', { ascending: false }).limit(1).maybeSingle(),
    ])

    const preciosUpdatedAt: string | null = (() => {
        const fechas = [lastRubro?.updated_at, lastProv?.updated_at].filter(Boolean) as string[]
        if (fechas.length === 0) return null
        return fechas.reduce((max, cur) => (cur > max ? cur : max))
    })()

    const simulaciones = ((rows ?? []) as SimulacionRow[]).map((s) => {
        const totales = s.variantes.map((v) =>
            v.items.reduce((sum, it) => {
                if (!it.incluido || !it.proveedor || !it.rubro) return sum
                const monto = it.rubro.tipo === 'var'
                    ? it.proveedor.precio * v.cantidad_invitados
                    : it.proveedor.precio
                return sum + monto
            }, 0)
        )
        const cantVariantes = s.variantes.length
        const totalMin = cantVariantes > 0 ? Math.min(...totales) : 0
        const totalMax = cantVariantes > 0 ? Math.max(...totales) : 0
        const invitadosMin = cantVariantes > 0 ? Math.min(...s.variantes.map((v) => v.cantidad_invitados)) : 0
        const invitadosMax = cantVariantes > 0 ? Math.max(...s.variantes.map((v) => v.cantidad_invitados)) : 0
        return {
            id: s.id,
            nombre: s.nombre,
            updated_at: s.updated_at,
            cantVariantes,
            totalMin,
            totalMax,
            invitadosMin,
            invitadosMax,
        }
    })

    return (
        <main style={styles.main}>
            <div style={styles.container}>
                <Link href="/dashboard" style={styles.back}>← Dashboard</Link>

                <div style={styles.header}>
                    <div>
                        <div style={styles.eyebrow}>Admin</div>
                        <h1 style={styles.title}>Simulador de presupuesto</h1>
                        <p style={styles.subtitle}>
                            {simulaciones.length === 0
                                ? 'No tenés simulaciones guardadas.'
                                : `${simulaciones.length} simulación${simulaciones.length !== 1 ? 'es' : ''} guardada${simulaciones.length !== 1 ? 's' : ''}.`}
                        </p>
                        {preciosUpdatedAt && (
                            <p style={styles.preciosLegend}>
                                Precios actualizados:{' '}
                                <span style={styles.preciosDate}>
                                    {new Date(preciosUpdatedAt).toLocaleDateString('es-AR', {
                                        day: '2-digit',
                                        month: 'long',
                                        year: 'numeric',
                                    })}
                                </span>
                            </p>
                        )}
                    </div>
                    <div style={styles.headerActions}>
                        <Link href="/simulador/precios" className="btn-ghost" style={styles.catalogoLink}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                            </svg>
                            Lista de precios
                        </Link>
                        <NuevaSimulacionButton />
                    </div>
                </div>

                {simulaciones.length === 0 ? (
                    <div className="card" style={styles.emptyState}>
                        <div style={styles.emptyIcon}>📊</div>
                        <h2 style={styles.emptyTitle}>Sin simulaciones</h2>
                        <p style={styles.emptyText}>
                            Creá una simulación para armar un presupuesto de evento ajustando proveedores por rubro.
                        </p>
                    </div>
                ) : (
                    <div style={styles.list}>
                        {simulaciones.map((s) => (
                            <SimulacionListItem key={s.id} simulacion={s} />
                        ))}
                    </div>
                )}
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
        maxWidth: '860px',
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
    },
    preciosLegend: {
        fontFamily: 'var(--font-mono, monospace)',
        fontSize: '0.7rem',
        color: 'var(--color-text-muted)',
        letterSpacing: '0.04em',
        marginTop: '0.45rem',
    },
    preciosDate: {
        color: 'var(--color-gold-dark)',
        fontWeight: 600,
    },
    headerActions: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
    },
    catalogoLink: {
        fontSize: '0.8rem',
        padding: '0.5rem 0.9rem',
        gap: '0.4rem',
    },
    list: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
    },
    emptyState: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '3rem 2rem',
        textAlign: 'center',
    },
    emptyIcon: {
        fontSize: '3rem',
    },
    emptyTitle: {
        fontFamily: 'var(--font-serif)',
        fontSize: '1.35rem',
        fontWeight: 500,
    },
    emptyText: {
        fontSize: '0.9rem',
        color: 'var(--color-text-muted)',
        maxWidth: '340px',
    },
}

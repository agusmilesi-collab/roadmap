import { notFound, redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase'
import { SimuladorClient } from '@/components/admin/simulador/SimuladorClient'

interface Props {
    params: Promise<{ id: string }>
}

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

interface VarianteRow {
    id: string
    nombre: string
    cantidad_invitados: number
    orden: number
    items: {
        rubro_id: string
        proveedor_id: string | null
        incluido: boolean
    }[]
}

interface SimRow {
    id: string
    nombre: string
    variantes: VarianteRow[]
}

export default async function SimuladorDetallePage({ params }: Props) {
    const { id } = await params

    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    const [{ data: simRaw }, { data: rubrosRaw }] = await Promise.all([
        db
            .from('simuladores')
            .select(`
                id,
                nombre,
                variantes:simulador_variantes(
                    id, nombre, cantidad_invitados, orden,
                    items:simulador_items(rubro_id, proveedor_id, incluido)
                )
            `)
            .eq('id', id)
            .single(),
        db
            .from('simulador_rubros')
            .select(`
                id, nombre, tipo, opcional, orden,
                proveedores:simulador_proveedores(id, nombre, precio, descripcion, orden)
            `)
            .order('orden'),
    ])

    if (!simRaw) notFound()

    const sim = simRaw as SimRow
    const rubros = ((rubrosRaw ?? []) as RubroRow[])
        .map((r) => ({
            ...r,
            proveedores: [...r.proveedores].sort((a, b) => a.orden - b.orden),
        }))
        .sort((a, b) => a.orden - b.orden)

    // Construir estado inicial por variante: para cada variante, mapa rubro_id → ItemState.
    // Si falta algún item (ej. rubro nuevo creado post-variante), inicializar default.
    const variantes = [...sim.variantes]
        .sort((a, b) => a.orden - b.orden)
        .map((v) => {
            const itemsByRubro: Record<string, { proveedor_id: string | null; incluido: boolean }> = {}
            for (const r of rubros) {
                const existing = v.items.find((it) => it.rubro_id === r.id)
                if (existing) {
                    itemsByRubro[r.id] = {
                        proveedor_id: existing.proveedor_id,
                        incluido: existing.incluido,
                    }
                } else {
                    itemsByRubro[r.id] = {
                        proveedor_id: r.proveedores[0]?.id ?? null,
                        incluido: !r.opcional,
                    }
                }
            }
            return {
                id: v.id,
                nombre: v.nombre,
                cantidad_invitados: v.cantidad_invitados,
                items: itemsByRubro,
            }
        })

    return (
        <main style={{ minHeight: '100vh', padding: '2rem 1.5rem', backgroundColor: 'var(--color-cream)' }}>
            <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <SimuladorClient
                    simulador={{ id: sim.id, nombre: sim.nombre }}
                    variantes={variantes}
                    rubros={rubros}
                />
            </div>
        </main>
    )
}

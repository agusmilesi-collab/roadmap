'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase'

// ─── Helpers ────────────────────────────────────────────────────────────────

interface SaveItem {
    rubro_id: string
    proveedor_id: string | null
    incluido: boolean
}

async function createDefaultItemsForVariante(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    db: any,
    variante_id: string
) {
    const { data: rubros } = await db
        .from('simulador_rubros')
        .select('id, opcional, proveedores:simulador_proveedores(id, orden)')
        .order('orden')

    if (!rubros || rubros.length === 0) return

    const items = rubros.map((r: {
        id: string
        opcional: boolean
        proveedores: { id: string; orden: number }[]
    }) => {
        const provs = (r.proveedores ?? []).slice().sort((a, b) => a.orden - b.orden)
        return {
            variante_id,
            rubro_id: r.id,
            proveedor_id: provs[0]?.id ?? null,
            incluido: !r.opcional,
        }
    })
    await db.from('simulador_items').insert(items)
}

// ─── Simulación (contenedor) ────────────────────────────────────────────────

export async function createSimulacion(formData: FormData) {
    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    const nombre = (formData.get('nombre') as string)?.trim()
    if (!nombre) throw new Error('El nombre de la simulación es obligatorio')

    // 1. Crear simulador
    const { data: sim, error: simError } = await db
        .from('simuladores')
        .insert({ nombre })
        .select('id')
        .single()
    if (simError || !sim) throw new Error(simError?.message ?? 'Error al crear la simulación')

    // 2. Crear primera variante
    const { data: variante, error: vError } = await db
        .from('simulador_variantes')
        .insert({
            simulador_id: sim.id,
            nombre: 'Variante 1',
            cantidad_invitados: 120,
            orden: 10,
        })
        .select('id')
        .single()
    if (vError || !variante) throw new Error(vError?.message ?? 'Error al crear la variante')

    // 3. Items default para la variante
    await createDefaultItemsForVariante(db, variante.id)

    redirect(`/simulador/${sim.id}`)
}

export async function updateSimulacionNombre(id: string, nombre: string) {
    const trimmed = nombre.trim()
    if (!trimmed) throw new Error('El nombre es obligatorio')
    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    const { error } = await db
        .from('simuladores')
        .update({ nombre: trimmed, updated_at: new Date().toISOString() })
        .eq('id', id)
    if (error) throw new Error(error.message)
    revalidatePath('/simulador')
    revalidatePath(`/simulador/${id}`)
}

export async function deleteSimulacion(id: string) {
    const supabase = await createServerSupabaseClient()
    const { error } = await supabase.from('simuladores').delete().eq('id', id)
    if (error) throw new Error(error.message)
    revalidatePath('/simulador')
}

// ─── Variantes ──────────────────────────────────────────────────────────────

export async function createVariante(simulador_id: string, nombre: string) {
    const trimmed = nombre.trim()
    if (!trimmed) throw new Error('El nombre de la variante es obligatorio')

    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    const { data: maxRow } = await db
        .from('simulador_variantes')
        .select('orden')
        .eq('simulador_id', simulador_id)
        .order('orden', { ascending: false })
        .limit(1)
        .maybeSingle()
    const orden = (maxRow?.orden ?? 0) + 10

    const { data: v, error } = await db
        .from('simulador_variantes')
        .insert({ simulador_id, nombre: trimmed, cantidad_invitados: 120, orden })
        .select('id')
        .single()
    if (error || !v) throw new Error(error?.message ?? 'Error al crear la variante')

    await createDefaultItemsForVariante(db, v.id)

    revalidatePath(`/simulador/${simulador_id}`)
    return v.id as string
}

export async function duplicateVariante(varianteId: string, nuevoNombre: string) {
    const trimmed = nuevoNombre.trim()
    if (!trimmed) throw new Error('El nombre es obligatorio')

    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    // Cargar variante origen + items
    const { data: src, error: srcError } = await db
        .from('simulador_variantes')
        .select('simulador_id, cantidad_invitados, items:simulador_items(rubro_id, proveedor_id, incluido)')
        .eq('id', varianteId)
        .single()
    if (srcError || !src) throw new Error(srcError?.message ?? 'Variante origen no encontrada')

    // Calcular nuevo orden (al final)
    const { data: maxRow } = await db
        .from('simulador_variantes')
        .select('orden')
        .eq('simulador_id', src.simulador_id)
        .order('orden', { ascending: false })
        .limit(1)
        .maybeSingle()
    const orden = (maxRow?.orden ?? 0) + 10

    // Crear nueva variante
    const { data: newV, error: insError } = await db
        .from('simulador_variantes')
        .insert({
            simulador_id: src.simulador_id,
            nombre: trimmed,
            cantidad_invitados: src.cantidad_invitados,
            orden,
        })
        .select('id')
        .single()
    if (insError || !newV) throw new Error(insError?.message ?? 'Error al duplicar')

    // Copiar items
    if (src.items && src.items.length > 0) {
        const rows = src.items.map((it: SaveItem) => ({
            variante_id: newV.id,
            rubro_id: it.rubro_id,
            proveedor_id: it.proveedor_id,
            incluido: it.incluido,
        }))
        await db.from('simulador_items').insert(rows)
    }

    revalidatePath(`/simulador/${src.simulador_id}`)
    return newV.id as string
}

export async function deleteVariante(varianteId: string) {
    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    // Guard: no permitir borrar la última variante
    const { data: variante } = await db
        .from('simulador_variantes')
        .select('simulador_id')
        .eq('id', varianteId)
        .single()
    if (!variante) throw new Error('Variante no encontrada')

    const { count } = await db
        .from('simulador_variantes')
        .select('id', { count: 'exact', head: true })
        .eq('simulador_id', variante.simulador_id)
    if ((count ?? 0) <= 1) {
        throw new Error('No podés borrar la única variante de una simulación')
    }

    const { error } = await db.from('simulador_variantes').delete().eq('id', varianteId)
    if (error) throw new Error(error.message)

    revalidatePath('/simulador')
    revalidatePath(`/simulador/${variante.simulador_id}`)
}

export async function reorderVariantes(simuladorId: string, orderedIds: string[]) {
    if (orderedIds.length === 0) return
    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    await Promise.all(
        orderedIds.map((id, idx) =>
            db.from('simulador_variantes').update({ orden: (idx + 1) * 10 }).eq('id', id)
        )
    )

    revalidatePath(`/simulador/${simuladorId}`)
}

export async function saveVariante(
    varianteId: string,
    payload: { nombre: string; cantidad_invitados: number; items: SaveItem[] }
) {
    const nombre = payload.nombre.trim()
    if (!nombre) throw new Error('El nombre de la variante es obligatorio')

    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    const { data: variante } = await db
        .from('simulador_variantes')
        .select('simulador_id')
        .eq('id', varianteId)
        .single()
    if (!variante) throw new Error('Variante no encontrada')

    const { error: updError } = await db
        .from('simulador_variantes')
        .update({
            nombre,
            cantidad_invitados: Math.max(80, Math.round(payload.cantidad_invitados)),
            updated_at: new Date().toISOString(),
        })
        .eq('id', varianteId)
    if (updError) throw new Error(updError.message)

    // Reemplazar items
    const { error: delError } = await db
        .from('simulador_items')
        .delete()
        .eq('variante_id', varianteId)
    if (delError) throw new Error(delError.message)

    if (payload.items.length > 0) {
        const rows = payload.items.map((it) => ({
            variante_id: varianteId,
            rubro_id: it.rubro_id,
            proveedor_id: it.proveedor_id,
            incluido: it.incluido,
        }))
        const { error: insError } = await db.from('simulador_items').insert(rows)
        if (insError) throw new Error(insError.message)
    }

    // Tocar updated_at del simulador padre
    await db
        .from('simuladores')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', variante.simulador_id)

    revalidatePath('/simulador')
    revalidatePath(`/simulador/${variante.simulador_id}`)
}

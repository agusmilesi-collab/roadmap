'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase'

// ─── Rubros ─────────────────────────────────────────────────────────────────

export async function createRubro(formData: FormData) {
    const nombre = (formData.get('nombre') as string)?.trim()
    const tipo = formData.get('tipo') as 'fijo' | 'var'
    const opcional = formData.get('opcional') === 'on'

    if (!nombre) throw new Error('El nombre del rubro es obligatorio')
    if (tipo !== 'fijo' && tipo !== 'var') throw new Error('Tipo inválido')

    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    const { data: maxRow } = await db
        .from('simulador_rubros')
        .select('orden')
        .order('orden', { ascending: false })
        .limit(1)
        .maybeSingle()
    const orden = (maxRow?.orden ?? 0) + 10

    const { error } = await db
        .from('simulador_rubros')
        .insert({ nombre, tipo, opcional, orden })
    if (error) throw new Error(error.message)
    revalidatePath('/simulador/precios')
    revalidatePath('/simulador')
}

export async function updateRubro(
    id: string,
    payload: { nombre: string; tipo: 'fijo' | 'var'; opcional: boolean; orden: number }
) {
    const nombre = payload.nombre.trim()
    if (!nombre) throw new Error('El nombre del rubro es obligatorio')

    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    const { error } = await db
        .from('simulador_rubros')
        .update({
            nombre,
            tipo: payload.tipo,
            opcional: payload.opcional,
            orden: payload.orden,
        })
        .eq('id', id)
    if (error) throw new Error(error.message)
    revalidatePath('/simulador/precios')
    revalidatePath('/simulador')
}

export async function deleteRubro(id: string) {
    const supabase = await createServerSupabaseClient()
    const { error } = await supabase.from('simulador_rubros').delete().eq('id', id)
    if (error) throw new Error(error.message)
    revalidatePath('/simulador/precios')
    revalidatePath('/simulador')
}

export async function reorderRubros(orderedIds: string[]) {
    if (orderedIds.length === 0) return
    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    // Reasigna orden con steps de 10 según la posición en el array.
    // Updates individuales (volumen bajo, ~15 rubros típicos).
    await Promise.all(
        orderedIds.map((id, idx) =>
            db.from('simulador_rubros').update({ orden: (idx + 1) * 10 }).eq('id', id)
        )
    )

    revalidatePath('/simulador/precios')
    revalidatePath('/simulador')
}

// ─── Proveedores ────────────────────────────────────────────────────────────

export async function createProveedor(formData: FormData) {
    const rubro_id = formData.get('rubro_id') as string
    const nombre = (formData.get('nombre') as string)?.trim()
    const precioRaw = formData.get('precio') as string
    const descripcion = ((formData.get('descripcion') as string) ?? '').trim() || null

    if (!rubro_id) throw new Error('Rubro requerido')
    if (!nombre) throw new Error('El nombre del proveedor es obligatorio')
    const precio = Number(precioRaw)
    if (!Number.isFinite(precio) || precio < 0) throw new Error('Precio inválido')

    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    const { data: maxRow } = await db
        .from('simulador_proveedores')
        .select('orden')
        .eq('rubro_id', rubro_id)
        .order('orden', { ascending: false })
        .limit(1)
        .maybeSingle()
    const orden = (maxRow?.orden ?? 0) + 10

    const { error } = await db
        .from('simulador_proveedores')
        .insert({ rubro_id, nombre, precio, descripcion, orden })
    if (error) throw new Error(error.message)
    revalidatePath('/simulador/precios')
    revalidatePath('/simulador')
}

export async function updateProveedor(
    id: string,
    payload: {
        nombre: string
        precio: number
        descripcion: string | null
        orden: number
    }
) {
    const nombre = payload.nombre.trim()
    if (!nombre) throw new Error('El nombre del proveedor es obligatorio')
    if (!Number.isFinite(payload.precio) || payload.precio < 0) {
        throw new Error('Precio inválido')
    }

    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    const { error } = await db
        .from('simulador_proveedores')
        .update({
            nombre,
            precio: payload.precio,
            descripcion: payload.descripcion?.trim() || null,
            orden: payload.orden,
        })
        .eq('id', id)
    if (error) throw new Error(error.message)
    revalidatePath('/simulador/precios')
    revalidatePath('/simulador')
}

export async function deleteProveedor(id: string) {
    const supabase = await createServerSupabaseClient()
    const { error } = await supabase.from('simulador_proveedores').delete().eq('id', id)
    if (error) throw new Error(error.message)
    revalidatePath('/simulador/precios')
    revalidatePath('/simulador')
}

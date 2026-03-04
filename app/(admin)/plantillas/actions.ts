'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase'

// ─── Update fase name/description ────────────────────────────────────────────

export async function updatePlantillaFase(id: string, data: { nombre?: string; descripcion?: string }) {
    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('plantillas_fases').update(data).eq('id', id)
    if (error) return { error: error.message }
    revalidatePath('/plantillas')
    return { success: true }
}

// ─── Add new fase to template ────────────────────────────────────────────────

export async function createPlantillaFase(tipo_evento: string, nombre: string, descripcion: string) {
    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    const { data: existing } = await db
        .from('plantillas_fases')
        .select('orden')
        .eq('tipo_evento', tipo_evento)
        .order('orden', { ascending: false })
        .limit(1)

    const nextOrden = existing && existing.length > 0 ? (existing[0].orden ?? 0) + 1 : 1

    const { error } = await db
        .from('plantillas_fases')
        .insert({ tipo_evento, nombre, descripcion: descripcion || null, orden: nextOrden })

    if (error) return { error: error.message }
    revalidatePath('/plantillas')
    return { success: true }
}

// ─── Delete fase from template ────────────────────────────────────────────────

export async function deletePlantillaFase(id: string) {
    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    await db.from('plantillas_tareas').delete().eq('plantilla_fase_id', id)
    const { error } = await db.from('plantillas_fases').delete().eq('id', id)
    if (error) return { error: error.message }
    revalidatePath('/plantillas')
    return { success: true }
}

// ─── Update tarea in template ─────────────────────────────────────────────────

export async function updatePlantillaTarea(id: string, data: { nombre?: string; tipo?: string; meses_antes?: number | null }) {
    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('plantillas_tareas').update(data).eq('id', id)
    if (error) return { error: error.message }
    revalidatePath('/plantillas')
    return { success: true }
}

// ─── Add tarea to fase ────────────────────────────────────────────────────────

export async function createPlantillaTarea(
    plantilla_fase_id: string,
    nombre: string,
    tipo: string,
    meses_antes: number | null
) {
    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    const { data: existing } = await db
        .from('plantillas_tareas')
        .select('orden')
        .eq('plantilla_fase_id', plantilla_fase_id)
        .order('orden', { ascending: false })
        .limit(1)

    const nextOrden = existing && existing.length > 0 ? (existing[0].orden ?? 0) + 1 : 1

    const { error } = await db
        .from('plantillas_tareas')
        .insert({ plantilla_fase_id, nombre, tipo, meses_antes, orden: nextOrden })

    if (error) return { error: error.message }
    revalidatePath('/plantillas')
    return { success: true }
}

// ─── Delete tarea from template ───────────────────────────────────────────────

export async function deletePlantillaTarea(id: string) {
    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('plantillas_tareas').delete().eq('id', id)
    if (error) return { error: error.message }
    revalidatePath('/plantillas')
    return { success: true }
}

// ─── Reorder fases ────────────────────────────────────────────────────────────

export async function reorderPlantillaFases(items: { id: string; orden: number }[]) {
    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    const results = await Promise.all(
        items.map(({ id, orden }) => db.from('plantillas_fases').update({ orden }).eq('id', id))
    )
    const err = results.find((r: { error: unknown }) => r.error)
    if (err?.error) return { error: (err.error as { message: string }).message }
    revalidatePath('/plantillas')
    return { success: true }
}

// ─── Reorder tareas within a fase ────────────────────────────────────────────

export async function reorderPlantillaTareas(items: { id: string; orden: number }[]) {
    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    const results = await Promise.all(
        items.map(({ id, orden }) => db.from('plantillas_tareas').update({ orden }).eq('id', id))
    )
    const err = results.find((r: { error: unknown }) => r.error)
    if (err?.error) return { error: (err.error as { message: string }).message }
    revalidatePath('/plantillas')
    return { success: true }
}

// ─── Create custom plantilla ──────────────────────────────────────────────────

export async function createCustomPlantilla(nombre: string) {
    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    // Build a URL-safe slug from the display name
    const slug = nombre
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip accents
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '')
    const tipo_evento = `custom_${slug}_${Date.now()}`

    // Insert a seed fase so the tipo_evento exists and is discoverable
    const { error } = await db.from('plantillas_fases').insert({
        tipo_evento,
        nombre: 'Primera fase',
        descripcion: null,
        orden: 1,
        es_custom: true,
        nombre_display: nombre,
    })

    if (error) return { error: error.message }
    revalidatePath('/plantillas')
    return { success: true, tipo_evento, nombre_display: nombre }
}

// ─── Delete custom plantilla (all its fases + tareas) ────────────────────────

export async function deleteCustomPlantilla(tipo_evento: string) {
    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    // Fetch all fase IDs for this tipo
    const { data: fases } = await db
        .from('plantillas_fases')
        .select('id')
        .eq('tipo_evento', tipo_evento)

    if (fases && fases.length > 0) {
        const ids = fases.map((f: { id: string }) => f.id)
        await db.from('plantillas_tareas').delete().in('plantilla_fase_id', ids)
        await db.from('plantillas_fases').delete().in('id', ids)
    }

    revalidatePath('/plantillas')
    return { success: true }
}

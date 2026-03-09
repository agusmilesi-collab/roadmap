'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase'

// ─── Update fase name/description ────────────────────────────────────────────

export async function updatePlantillaFase(id: string, data: { nombre?: string; descripcion?: string }, tipoEvento: string) {
    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('plantillas_fases').update(data).eq('id', id)
    if (error) return { error: error.message }
    revalidatePath('/plantillas')
    redirect(`/plantillas?tipo=${encodeURIComponent(tipoEvento)}`)
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
    redirect(`/plantillas?tipo=${encodeURIComponent(tipo_evento)}`)
}

// ─── Delete fase from template ────────────────────────────────────────────────

export async function deletePlantillaFase(id: string, tipoEvento: string) {
    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    await db.from('plantillas_tareas').delete().eq('plantilla_fase_id', id)
    const { error } = await db.from('plantillas_fases').delete().eq('id', id)
    if (error) return { error: error.message }
    revalidatePath('/plantillas')
    redirect(`/plantillas?tipo=${encodeURIComponent(tipoEvento)}`)
}

// ─── Update tarea in template ─────────────────────────────────────────────────

export async function updatePlantillaTarea(id: string, data: { nombre?: string; tipo?: string; meses_antes?: number | null }, tipoEvento: string) {
    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('plantillas_tareas').update(data).eq('id', id)
    if (error) return { error: error.message }
    revalidatePath('/plantillas')
    redirect(`/plantillas?tipo=${encodeURIComponent(tipoEvento)}`)
}

// ─── Add tarea to fase ────────────────────────────────────────────────────────

export async function createPlantillaTarea(
    plantilla_fase_id: string,
    nombre: string,
    tipo: string,
    meses_antes: number | null,
    tipoEvento: string
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
    redirect(`/plantillas?tipo=${encodeURIComponent(tipoEvento)}`)
}

// ─── Delete tarea from template ───────────────────────────────────────────────

export async function deletePlantillaTarea(id: string, tipoEvento: string) {
    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('plantillas_tareas').delete().eq('id', id)
    if (error) return { error: error.message }
    revalidatePath('/plantillas')
    redirect(`/plantillas?tipo=${encodeURIComponent(tipoEvento)}`)
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
    redirect(`/plantillas?tipo=${encodeURIComponent(tipo_evento)}`)
}

// ─── Update display name for a plantilla type (base or custom) ────────────────

export async function updatePlantillaNombreDisplay(tipo_evento: string, nombre_display: string) {
    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    const { error } = await db
        .from('plantillas_fases')
        .update({ nombre_display })
        .eq('tipo_evento', tipo_evento)

    if (error) return { error: error.message }
    revalidatePath('/plantillas')
    redirect(`/plantillas?tipo=${encodeURIComponent(tipo_evento)}`)
}

// ─── Import plantilla from CSV (returns tipo_evento, no redirect) ─────────────

export async function importPlantillaCSV(
    nombre: string,
    fases: Array<{
        nombre: string
        descripcion: string | null
        orden: number
        tareas: Array<{
            nombre: string
            tipo: string
            diasAntes: number | null
            orden: number
        }>
    }>
): Promise<{ tipo_evento: string } | { error: string }> {
    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    const slug = nombre
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '')
    const tipo_evento = `custom_${slug}_${Date.now()}`

    for (const fase of fases) {
        const { data: faseRow, error: faseErr } = await db
            .from('plantillas_fases')
            .insert({
                tipo_evento,
                nombre: fase.nombre,
                descripcion: fase.descripcion || null,
                orden: fase.orden,
                es_custom: true,
                nombre_display: nombre,
            })
            .select('id')
            .single()

        if (faseErr || !faseRow) return { error: faseErr?.message ?? 'Error creando fase' }

        for (const tarea of fase.tareas) {
            const { error: tareaErr } = await db.from('plantillas_tareas').insert({
                plantilla_fase_id: faseRow.id,
                nombre: tarea.nombre,
                tipo: tarea.tipo,
                meses_antes: tarea.diasAntes,
                orden: tarea.orden,
            })
            if (tareaErr) return { error: tareaErr.message }
        }
    }

    revalidatePath('/plantillas')
    return { tipo_evento }
}

// ─── Delete custom plantilla (all its fases + tareas) ────────────────────────

export async function deleteCustomPlantilla(tipo_evento: string): Promise<{ error: string } | void> {
    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    // Fetch all fase IDs for this tipo
    const { data: fases, error: fetchError } = await db
        .from('plantillas_fases')
        .select('id')
        .eq('tipo_evento', tipo_evento)

    if (fetchError) return { error: fetchError.message }

    if (fases && fases.length > 0) {
        const ids = fases.map((f: { id: string }) => f.id)
        const { error: delTareasError } = await db.from('plantillas_tareas').delete().in('plantilla_fase_id', ids)
        if (delTareasError) return { error: delTareasError.message }
        const { error: delFasesError } = await db.from('plantillas_fases').delete().in('id', ids)
        if (delFasesError) return { error: delFasesError.message }
    }

    revalidatePath('/plantillas')
    redirect('/plantillas?tipo=boda')
}

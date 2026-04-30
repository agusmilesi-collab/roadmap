'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase'

// ─── Plantilla Fase ──────────────────────────────────────────────────────────

export async function updatePlantillaFase(
    id: string,
    data: Partial<{ nombre: string; descripcion: string | null; meses_antes_inicio: number; meses_antes_fin: number }>,
    tipoEvento: string
) {
    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('plantillas_fases').update(data).eq('id', id)
    if (error) return { error: error.message }
    revalidatePath('/plantillas')
    redirect(`/plantillas?tipo=${encodeURIComponent(tipoEvento)}`)
}

export async function createPlantillaFase(
    tipo_evento: string,
    nombre: string,
    descripcion: string,
    meses_antes_inicio: number,
    meses_antes_fin: number
) {
    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    const { data: existing } = await db
        .from('plantillas_fases')
        .select('position')
        .eq('tipo_evento', tipo_evento)
        .order('position', { ascending: false })
        .limit(1)

    const nextPosition = existing && existing.length > 0 ? (existing[0].position ?? 0) + 1 : 1

    const { error } = await db
        .from('plantillas_fases')
        .insert({
            tipo_evento,
            nombre,
            descripcion: descripcion || null,
            meses_antes_inicio,
            meses_antes_fin,
            position: nextPosition,
        })

    if (error) return { error: error.message }
    revalidatePath('/plantillas')
    redirect(`/plantillas?tipo=${encodeURIComponent(tipo_evento)}`)
}

export async function deletePlantillaFase(id: string, tipoEvento: string) {
    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    const { error } = await db.from('plantillas_fases').delete().eq('id', id)
    if (error) return { error: error.message }
    revalidatePath('/plantillas')
    redirect(`/plantillas?tipo=${encodeURIComponent(tipoEvento)}`)
}

export async function reorderPlantillaFases(items: { id: string; position: number }[]) {
    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    const results = await Promise.all(
        items.map(({ id, position }) => db.from('plantillas_fases').update({ position }).eq('id', id))
    )
    const err = results.find((r: { error: unknown }) => r.error)
    if (err?.error) return { error: (err.error as { message: string }).message }
    revalidatePath('/plantillas')
    return { success: true }
}

// ─── Plantilla Tema ──────────────────────────────────────────────────────────

export async function createPlantillaTema(
    plantilla_fase_id: string,
    nombre: string,
    descripcion: string,
    tipoEvento: string
) {
    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    const { data: existing } = await db
        .from('plantillas_temas')
        .select('position')
        .eq('plantilla_fase_id', plantilla_fase_id)
        .order('position', { ascending: false })
        .limit(1)

    const nextPosition = existing && existing.length > 0 ? (existing[0].position ?? 0) + 1 : 1

    const { error } = await db
        .from('plantillas_temas')
        .insert({
            plantilla_fase_id,
            nombre,
            descripcion: descripcion || null,
            position: nextPosition,
        })

    if (error) return { error: error.message }
    revalidatePath('/plantillas')
    redirect(`/plantillas?tipo=${encodeURIComponent(tipoEvento)}`)
}

export async function updatePlantillaTema(
    id: string,
    data: Partial<{ nombre: string; descripcion: string | null }>,
    tipoEvento: string
) {
    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('plantillas_temas').update(data).eq('id', id)
    if (error) return { error: error.message }
    revalidatePath('/plantillas')
    redirect(`/plantillas?tipo=${encodeURIComponent(tipoEvento)}`)
}

export async function deletePlantillaTema(id: string, tipoEvento: string) {
    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('plantillas_temas').delete().eq('id', id)
    if (error) return { error: error.message }
    revalidatePath('/plantillas')
    redirect(`/plantillas?tipo=${encodeURIComponent(tipoEvento)}`)
}

export async function reorderPlantillaTemas(items: { id: string; position: number }[]) {
    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    const results = await Promise.all(
        items.map(({ id, position }) => db.from('plantillas_temas').update({ position }).eq('id', id))
    )
    const err = results.find((r: { error: unknown }) => r.error)
    if (err?.error) return { error: (err.error as { message: string }).message }
    revalidatePath('/plantillas')
    return { success: true }
}

// ─── Plantilla Tarea ─────────────────────────────────────────────────────────

export async function createPlantillaTarea(
    plantilla_tema_id: string,
    nombre: string,
    tipoEvento: string
) {
    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    const { data: existing } = await db
        .from('plantillas_tareas')
        .select('position')
        .eq('plantilla_tema_id', plantilla_tema_id)
        .order('position', { ascending: false })
        .limit(1)

    const nextPosition = existing && existing.length > 0 ? (existing[0].position ?? 0) + 1 : 1

    const { error } = await db
        .from('plantillas_tareas')
        .insert({ plantilla_tema_id, nombre, position: nextPosition })

    if (error) return { error: error.message }
    revalidatePath('/plantillas')
    redirect(`/plantillas?tipo=${encodeURIComponent(tipoEvento)}`)
}

export async function updatePlantillaTarea(
    id: string,
    data: Partial<{ nombre: string }>,
    tipoEvento: string
) {
    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('plantillas_tareas').update(data).eq('id', id)
    if (error) return { error: error.message }
    revalidatePath('/plantillas')
    redirect(`/plantillas?tipo=${encodeURIComponent(tipoEvento)}`)
}

export async function deletePlantillaTarea(id: string, tipoEvento: string) {
    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('plantillas_tareas').delete().eq('id', id)
    if (error) return { error: error.message }
    revalidatePath('/plantillas')
    redirect(`/plantillas?tipo=${encodeURIComponent(tipoEvento)}`)
}

export async function reorderPlantillaTareas(items: { id: string; position: number }[]) {
    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    const results = await Promise.all(
        items.map(({ id, position }) => db.from('plantillas_tareas').update({ position }).eq('id', id))
    )
    const err = results.find((r: { error: unknown }) => r.error)
    if (err?.error) return { error: (err.error as { message: string }).message }
    revalidatePath('/plantillas')
    return { success: true }
}

// ─── Custom plantillas ────────────────────────────────────────────────────────

export async function createCustomPlantilla(nombre: string) {
    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    const slug = nombre
        .toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '')
    const tipo_evento = `custom_${slug}_${Date.now()}`

    const { error } = await db.from('plantillas_fases').insert({
        tipo_evento,
        nombre: 'Primera fase',
        descripcion: null,
        meses_antes_inicio: 6,
        meses_antes_fin: 3,
        position: 1,
        es_custom: true,
        nombre_display: nombre,
    })

    if (error) return { error: error.message }
    revalidatePath('/plantillas')
    redirect(`/plantillas?tipo=${encodeURIComponent(tipo_evento)}`)
}

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

export async function deleteCustomPlantilla(tipo_evento: string): Promise<{ error: string } | void> {
    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    const { data: fases, error: fetchError } = await db
        .from('plantillas_fases')
        .select('id')
        .eq('tipo_evento', tipo_evento)

    if (fetchError) return { error: fetchError.message }

    if (fases && fases.length > 0) {
        const { error: delFasesError } = await db
            .from('plantillas_fases')
            .delete()
            .in('id', fases.map((f: { id: string }) => f.id))
        if (delFasesError) return { error: delFasesError.message }
    }

    revalidatePath('/plantillas')
    redirect('/plantillas?tipo=boda')
}

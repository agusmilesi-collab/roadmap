'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase'
import type { EstadoTarea, TipoTarea, EstadoRubro, Moneda } from '@/lib/types'

function revalidate(eventoId: string) {
    revalidatePath(`/eventos/${eventoId}`)
}

// ─── Fases ────────────────────────────────────────────────────────────────────

export async function createFase(
    eventoId: string,
    nombre: string,
    descripcion: string
) {
    const supabase = await createServerSupabaseClient()
    const { data: last } = await supabase
        .from('fases')
        .select('orden')
        .eq('evento_id', eventoId)
        .order('orden', { ascending: false })
        .limit(1)
        .maybeSingle()

    await supabase.from('fases').insert({
        evento_id: eventoId,
        nombre,
        descripcion: descripcion || null,
        orden: (last?.orden ?? 0) + 1,
    })
    revalidate(eventoId)
}

export async function updateFase(
    id: string,
    eventoId: string,
    data: { nombre: string; descripcion: string | null }
) {
    const supabase = await createServerSupabaseClient()
    await supabase.from('fases').update(data).eq('id', id)
    revalidate(eventoId)
}

export async function deleteFase(id: string, eventoId: string) {
    const supabase = await createServerSupabaseClient()
    await supabase.from('fases').delete().eq('id', id)
    revalidate(eventoId)
}

// ─── Tareas ───────────────────────────────────────────────────────────────────

export async function createTarea(
    faseId: string,
    eventoId: string,
    data: { nombre: string; tipo: TipoTarea; fecha?: string | null }
) {
    const supabase = await createServerSupabaseClient()
    const { data: last } = await supabase
        .from('tareas')
        .select('orden')
        .eq('fase_id', faseId)
        .order('orden', { ascending: false })
        .limit(1)
        .maybeSingle()

    await supabase.from('tareas').insert({
        fase_id: faseId,
        nombre: data.nombre,
        tipo: data.tipo,
        fecha: data.fecha ?? null,
        estado: 'pendiente' as EstadoTarea,
        completada: false,
        orden: (last?.orden ?? 0) + 1,
        resumen: null,
    })
    revalidate(eventoId)
}

export async function updateTarea(
    id: string,
    eventoId: string,
    data: {
        nombre?: string
        estado?: EstadoTarea
        tipo?: TipoTarea
        fecha?: string | null
        resumen?: string | null
        completada?: boolean
    }
) {
    const supabase = await createServerSupabaseClient()
    // Sync completada with estado
    const update = { ...data }
    if (update.estado === 'completada') update.completada = true
    else if (update.estado === 'pendiente' || update.estado === 'en_curso') update.completada = false
    await supabase.from('tareas').update(update).eq('id', id)
    revalidate(eventoId)
}

export async function deleteTarea(id: string, eventoId: string) {
    const supabase = await createServerSupabaseClient()
    await supabase.from('tareas').delete().eq('id', id)
    revalidate(eventoId)
}

// ─── Acuerdos ─────────────────────────────────────────────────────────────────

export async function createAcuerdo(
    tareaId: string,
    eventoId: string,
    texto: string
) {
    const supabase = await createServerSupabaseClient()
    await supabase.from('acuerdos').insert({ tarea_id: tareaId, texto })
    revalidate(eventoId)
}

export async function deleteAcuerdo(id: string, eventoId: string) {
    const supabase = await createServerSupabaseClient()
    await supabase.from('acuerdos').delete().eq('id', id)
    revalidate(eventoId)
}

// ─── Rubros ───────────────────────────────────────────────────────────────────

export async function createRubro(eventoId: string, nombre: string) {
    const supabase = await createServerSupabaseClient()
    const { data: last } = await supabase
        .from('rubros')
        .select('orden')
        .eq('evento_id', eventoId)
        .order('orden', { ascending: false })
        .limit(1)
        .maybeSingle()

    await supabase.from('rubros').insert({
        evento_id: eventoId,
        nombre,
        estado: 'pendiente' as EstadoRubro,
        moneda: 'USD' as Moneda,
        orden: (last?.orden ?? 0) + 1,
        proveedor: null,
        monto_original: null,
        sena_pct: null,
        fecha_decision: null,
        fecha_sena: null,
        notas: null,
    })
    revalidate(eventoId)
}

export async function updateRubro(
    id: string,
    eventoId: string,
    data: Partial<{
        nombre: string
        estado: EstadoRubro
        proveedor: string | null
        monto_original: number | null
        moneda: Moneda
        sena_pct: number | null
        fecha_decision: string | null
        fecha_sena: string | null
        notas: string | null
    }>
) {
    const supabase = await createServerSupabaseClient()
    await supabase.from('rubros').update(data).eq('id', id)
    revalidate(eventoId)
}

export async function deleteRubro(id: string, eventoId: string) {
    const supabase = await createServerSupabaseClient()
    await supabase.from('rubros').delete().eq('id', id)
    revalidate(eventoId)
}

// ─── Evento ───────────────────────────────────────────────────────────────────

export async function updateTipoCambio(eventoId: string, tipoCambio: number) {
    const supabase = await createServerSupabaseClient()
    await supabase.from('eventos').update({ tipo_cambio: tipoCambio }).eq('id', eventoId)
    revalidate(eventoId)
}

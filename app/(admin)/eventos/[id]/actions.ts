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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: last } = await (supabase as any)
        .from('fases')
        .select('orden')
        .eq('evento_id', eventoId)
        .order('orden', { ascending: false })
        .limit(1)
        .maybeSingle()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('fases').insert({
        evento_id: eventoId,
        nombre,
        descripcion: descripcion || null,
        orden: (last?.orden ?? 0) + 1,
    })
    revalidate(eventoId)
}

// Insert a new fase at a specific position — shifts existing fases if inserting before one
export async function createFaseEnPosicion(
    eventoId: string,
    nombre: string,
    descripcion: string,
    posicion: string,             // 'end' or a faseId to insert before
    fasesOrdenadas: { id: string; orden: number }[]
) {
    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    if (posicion === 'end') {
        const maxOrden = fasesOrdenadas.reduce((m, f) => Math.max(m, f.orden), 0)
        await db.from('fases').insert({
            evento_id: eventoId,
            nombre,
            descripcion: descripcion || null,
            orden: maxOrden + 1,
        })
    } else {
        const target = fasesOrdenadas.find((f) => f.id === posicion)
        if (!target) {
            const maxOrden = fasesOrdenadas.reduce((m, f) => Math.max(m, f.orden), 0)
            await db.from('fases').insert({
                evento_id: eventoId, nombre,
                descripcion: descripcion || null, orden: maxOrden + 1,
            })
        } else {
            const insertOrden = target.orden
            const fasesToShift = fasesOrdenadas.filter((f) => f.orden >= insertOrden)
            for (const f of fasesToShift) {
                await db.from('fases').update({ orden: f.orden + 1 }).eq('id', f.id)
            }
            await db.from('fases').insert({
                evento_id: eventoId,
                nombre,
                descripcion: descripcion || null,
                orden: insertOrden,
            })
        }
    }
    revalidate(eventoId)
}

export async function updateFase(
    id: string,
    eventoId: string,
    data: { nombre: string; descripcion: string | null }
) {
    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('fases').update(data).eq('id', id)
    revalidate(eventoId)
}

export async function deleteFase(id: string, eventoId: string) {
    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('fases').delete().eq('id', id)
    revalidate(eventoId)
}

// ─── Tareas ───────────────────────────────────────────────────────────────────

export async function createTarea(
    faseId: string,
    eventoId: string,
    data: { nombre: string; tipo: TipoTarea; fecha?: string | null }
) {
    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    const { data: last } = await db
        .from('tareas')
        .select('orden')
        .eq('fase_id', faseId)
        .order('orden', { ascending: false })
        .limit(1)
        .maybeSingle()

    await db.from('tareas').insert({
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
    const update = { ...data }
    if (update.estado === 'completada') update.completada = true
    else if (update.estado === 'pendiente' || update.estado === 'en_curso') update.completada = false
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('tareas').update(update).eq('id', id)
    revalidate(eventoId)
}

export async function deleteTarea(id: string, eventoId: string) {
    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('tareas').delete().eq('id', id)
    revalidate(eventoId)
}

export async function reorderFases(eventoId: string, items: { id: string; orden: number }[]) {
    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    await Promise.all(items.map(({ id, orden }) => db.from('fases').update({ orden }).eq('id', id)))
    revalidate(eventoId)
}

export async function reorderTareas(eventoId: string, items: { id: string; orden: number }[]) {
    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    await Promise.all(items.map(({ id, orden }) => db.from('tareas').update({ orden }).eq('id', id)))
    revalidate(eventoId)
}


// ─── Acuerdos ─────────────────────────────────────────────────────────────────

export async function createAcuerdo(
    tareaId: string,
    eventoId: string,
    texto: string
) {
    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('acuerdos').insert({ tarea_id: tareaId, texto })
    revalidate(eventoId)
}

export async function deleteAcuerdo(id: string, eventoId: string) {
    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('acuerdos').delete().eq('id', id)
    revalidate(eventoId)
}

// ─── Rubros ───────────────────────────────────────────────────────────────────

export async function createRubro(eventoId: string, nombre: string) {
    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    const { data: last } = await db
        .from('rubros')
        .select('orden')
        .eq('evento_id', eventoId)
        .order('orden', { ascending: false })
        .limit(1)
        .maybeSingle()

    await db.from('rubros').insert({
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
        tipo_cambio_propio: number | null
        sena_pct: number | null
        fecha_decision: string | null
        fecha_sena: string | null
        notas: string | null
    }>
) {
    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('rubros').update(data).eq('id', id)
    revalidate(eventoId)
}

export async function deleteRubro(id: string, eventoId: string) {
    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('rubros').delete().eq('id', id)
    revalidate(eventoId)
}

// ─── Evento ───────────────────────────────────────────────────────────────────

export async function updateTipoCambio(eventoId: string, tipoCambio: number) {
    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('eventos').update({ tipo_cambio: tipoCambio }).eq('id', eventoId)
    revalidate(eventoId)
}

export async function updateEvento(
    eventoId: string,
    data: Partial<{ nombre: string; planner_id: string | null; fecha_evento: string }>
) {
    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('eventos').update(data).eq('id', eventoId)
    revalidatePath('/dashboard')
    revalidate(eventoId)
}

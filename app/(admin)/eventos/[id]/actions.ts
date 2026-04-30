'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase'
import type { EstadoTarea, EstadoRubro, Moneda } from '@/lib/types'

function revalidate(eventoId: string) {
    revalidatePath(`/eventos/${eventoId}`)
    revalidatePath(`/planner/eventos/${eventoId}`)
}

// ─── Fases ────────────────────────────────────────────────────────────────────

export async function createFase(
    eventoId: string,
    data: { nombre: string; descripcion?: string | null; fecha_inicio?: string | null; fecha_fin?: string | null }
) {
    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    const { data: last } = await db
        .from('fases')
        .select('position')
        .eq('evento_id', eventoId)
        .order('position', { ascending: false })
        .limit(1)
        .maybeSingle()

    await db.from('fases').insert({
        evento_id: eventoId,
        nombre: data.nombre,
        descripcion: data.descripcion ?? null,
        fecha_inicio: data.fecha_inicio ?? null,
        fecha_fin: data.fecha_fin ?? null,
        position: (last?.position ?? 0) + 1,
    })
    revalidate(eventoId)
}

export async function updateFase(
    id: string,
    eventoId: string,
    data: Partial<{ nombre: string; descripcion: string | null; fecha_inicio: string | null; fecha_fin: string | null }>
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

export async function reorderFases(
    eventoId: string,
    items: { id: string; position: number }[]
) {
    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    await Promise.all(items.map(({ id, position }) => db.from('fases').update({ position }).eq('id', id)))
    revalidate(eventoId)
}

// ─── Temas ────────────────────────────────────────────────────────────────────

export async function createTema(
    faseId: string,
    eventoId: string,
    data: { nombre: string; descripcion?: string | null }
) {
    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    const { data: last } = await db
        .from('temas')
        .select('position')
        .eq('fase_id', faseId)
        .order('position', { ascending: false })
        .limit(1)
        .maybeSingle()

    const { data: inserted } = await db.from('temas').insert({
        fase_id: faseId,
        nombre: data.nombre,
        descripcion: data.descripcion ?? null,
        position: (last?.position ?? 0) + 1,
    }).select('id').single()

    revalidate(eventoId)
    return inserted?.id as string | undefined
}

export async function updateTema(
    id: string,
    eventoId: string,
    data: Partial<{ nombre: string; descripcion: string | null }>
) {
    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('temas').update(data).eq('id', id)
    revalidate(eventoId)
}

export async function deleteTema(id: string, eventoId: string) {
    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('temas').delete().eq('id', id)
    revalidate(eventoId)
}

export async function reorderTemas(
    eventoId: string,
    items: { id: string; position: number }[]
) {
    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    await Promise.all(items.map(({ id, position }) => db.from('temas').update({ position }).eq('id', id)))
    revalidate(eventoId)
}

// ─── Tareas ───────────────────────────────────────────────────────────────────

export async function createTarea(
    temaId: string,
    eventoId: string,
    data: { nombre: string }
) {
    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    const { data: last } = await db
        .from('tareas')
        .select('position')
        .eq('tema_id', temaId)
        .order('position', { ascending: false })
        .limit(1)
        .maybeSingle()

    const { data: inserted } = await db.from('tareas').insert({
        tema_id: temaId,
        nombre: data.nombre,
        estado: 'pendiente' as EstadoTarea,
        position: (last?.position ?? 0) + 1,
    }).select('id').single()

    revalidate(eventoId)
    return inserted?.id as string | undefined
}

export async function updateTarea(
    id: string,
    eventoId: string,
    data: Partial<{ nombre: string; estado: EstadoTarea; tema_id: string }>
) {
    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('tareas').update(data).eq('id', id)
    revalidate(eventoId)
}

export async function deleteTarea(id: string, eventoId: string) {
    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('tareas').delete().eq('id', id)
    revalidate(eventoId)
}

export async function reorderTareas(
    eventoId: string,
    items: { id: string; position: number }[]
) {
    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    await Promise.all(items.map(({ id, position }) => db.from('tareas').update({ position }).eq('id', id)))
    revalidate(eventoId)
}

// ─── Acuerdos ─────────────────────────────────────────────────────────────────

export async function createAcuerdo(
    temaId: string,
    eventoId: string,
    texto: string
) {
    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('acuerdos').insert({ tema_id: temaId, texto })
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
    await db.from('rubros').insert({
        evento_id: eventoId,
        nombre,
        estado: 'pendiente' as EstadoRubro,
        moneda: 'USD' as Moneda,
        orden: 0,
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
        costo_total: number | null
        descripcion_servicio: string | null
    }>
) {
    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('rubros').update(data).eq('id', id)
    revalidate(eventoId)
}

export async function reorderRubros(eventoId: string, items: { id: string; orden: number }[]) {
    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    await Promise.all(items.map(({ id, orden }) => db.from('rubros').update({ orden }).eq('id', id)))
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
    data: Partial<{ nombre: string; planner_id: string | null; fecha_evento: string; presupuesto_usd: number | null; tipo_cambio: number | null }>
) {
    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('eventos').update(data).eq('id', eventoId)
    revalidatePath('/dashboard')
    revalidate(eventoId)
}

// ─── Pagos proveedor ──────────────────────────────────────────────────────────

export async function createPago(
    rubroId: string,
    eventoId: string,
    data: {
        monto: number
        moneda: Moneda
        fecha: string
        descripcion?: string | null
    }
) {
    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('pagos_proveedor').insert({
        rubro_id: rubroId,
        monto: data.monto,
        moneda: data.moneda,
        fecha: data.fecha,
        descripcion: data.descripcion ?? null,
        realizado: false,
    })
    revalidate(eventoId)
}

export async function updatePago(
    id: string,
    eventoId: string,
    data: Partial<{
        monto: number
        moneda: Moneda
        fecha: string
        realizado: boolean
        tipo_cambio_snapshot: number | null
        descripcion: string | null
    }>
) {
    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('pagos_proveedor').update(data).eq('id', id)
    revalidate(eventoId)
}

export async function deletePago(id: string, eventoId: string) {
    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('pagos_proveedor').delete().eq('id', id)
    revalidate(eventoId)
}

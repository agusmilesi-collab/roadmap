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
    data: Partial<{
        nombre: string
        planner_id: string | null
        fecha_evento: string
        presupuesto_usd: number | null
        tipo_cambio: number | null
        mostrar_dashboard_cliente: boolean
        mostrar_acuerdos_cliente: boolean
    }>
) {
    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('eventos').update(data).eq('id', eventoId)
    revalidatePath('/dashboard')
    revalidate(eventoId)
}

// ─── Pagos proveedor ──────────────────────────────────────────────────────────

// Recalcula el estado del rubro a partir de sus pagos.
// Solo SUBE de nivel — nunca degrada (respeta overrides manuales del usuario).
//   - Hay >=1 pago realizado (cuota/seña) y saldo cubierto → 'completado'
//   - Hay >=1 pago realizado (cuota/seña)                 → mínimo 'señado'
//   - Sin pagos realizados                                → no toca el estado
// Los depósitos en garantía NO cuentan para el saldo (son retornables).
const NIVEL_ESTADO: Record<string, number> = {
    pendiente: 0,
    en_proceso: 1,
    decidido: 2,
    señado: 3,
    completado: 4,
}
async function recalcularEstadoRubro(rubroId: string) {
    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    const { data: rubro } = await db
        .from('rubros')
        .select(`
            id, estado, costo_total, monto_original, moneda, tipo_cambio_propio,
            pagos_proveedor ( monto, moneda, tipo_cambio_snapshot, realizado, tipo )
        `)
        .eq('id', rubroId)
        .maybeSingle()
    if (!rubro) return

    const costoBase = rubro.costo_total ?? rubro.monto_original
    if (!costoBase) return

    const tcRubro: number = rubro.tipo_cambio_propio ?? 0
    function toUSD(monto: number, moneda: string, tcSnap: number | null): number {
        if (moneda === 'USD') return monto
        const tc = tcSnap && tcSnap > 0 ? tcSnap : tcRubro
        return tc > 0 ? monto / tc : 0
    }
    const costoUSD = toUSD(costoBase, rubro.moneda, null)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pagos = ((rubro.pagos_proveedor ?? []) as any[]).filter(p => p.tipo !== 'deposito_garantia')
    const realizadosUSD = pagos
        .filter(p => p.realizado)
        .reduce((sum, p) => sum + toUSD(p.monto, p.moneda, p.tipo_cambio_snapshot), 0)
    const hayRealizados = pagos.some(p => p.realizado)

    let candidato: string = rubro.estado
    if (hayRealizados && costoUSD > 0 && realizadosUSD >= costoUSD - 0.5) {
        candidato = 'completado'
    } else if (hayRealizados) {
        candidato = 'señado'
    }

    // Solo aplicar si sube de nivel (nunca degrada)
    const nivelActual = NIVEL_ESTADO[rubro.estado] ?? 0
    const nivelCandidato = NIVEL_ESTADO[candidato] ?? 0
    if (nivelCandidato > nivelActual) {
        await db.from('rubros').update({ estado: candidato }).eq('id', rubroId)
    }
}

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
    await recalcularEstadoRubro(rubroId)
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
    const db = supabase as any
    // Necesitamos el rubro_id para recalcular después
    const { data: pago } = await db
        .from('pagos_proveedor')
        .select('rubro_id')
        .eq('id', id)
        .maybeSingle()
    await db.from('pagos_proveedor').update(data).eq('id', id)
    if (pago?.rubro_id) await recalcularEstadoRubro(pago.rubro_id)
    revalidate(eventoId)
}

export async function deletePago(id: string, eventoId: string) {
    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    const { data: pago } = await db
        .from('pagos_proveedor')
        .select('rubro_id')
        .eq('id', id)
        .maybeSingle()
    await db.from('pagos_proveedor').delete().eq('id', id)
    if (pago?.rubro_id) await recalcularEstadoRubro(pago.rubro_id)
    revalidate(eventoId)
}

// ─── Depósitos en garantía ───────────────────────────────────────────────────
// Un depósito es un pago_proveedor con tipo='deposito_garantia'.
// Reutiliza toda la infraestructura de pagos: aparece en cashflow, queries, etc.

export async function createDeposito(
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
        tipo: 'deposito_garantia',
        monto: data.monto,
        moneda: data.moneda,
        fecha: data.fecha,
        descripcion: data.descripcion ?? null,
        realizado: false,
        devuelto: false,
    })
    revalidate(eventoId)
}

export async function updateDeposito(
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

export async function marcarDevuelto(
    id: string,
    eventoId: string,
    fechaDevolucion: string
) {
    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('pagos_proveedor').update({
        devuelto: true,
        fecha_devolucion: fechaDevolucion,
    }).eq('id', id)
    revalidate(eventoId)
}

export async function desmarcarDevuelto(id: string, eventoId: string) {
    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('pagos_proveedor').update({
        devuelto: false,
        fecha_devolucion: null,
    }).eq('id', id)
    revalidate(eventoId)
}

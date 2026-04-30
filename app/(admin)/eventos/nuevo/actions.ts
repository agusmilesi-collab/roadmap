'use server'

import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase'
import type { TipoEvento } from '@/lib/types'

export async function createEvento(formData: FormData) {
    const supabase = await createServerSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    const nombre = formData.get('nombre') as string
    const tipo_evento = formData.get('tipo_evento') as TipoEvento
    const fecha_evento = formData.get('fecha_evento') as string
    const presupuesto_usd = formData.get('presupuesto_usd')
        ? Number(formData.get('presupuesto_usd'))
        : null
    const tipo_cambio = formData.get('tipo_cambio')
        ? Number(formData.get('tipo_cambio'))
        : null
    const planner_id = formData.get('planner_id') as string | null

    // ── 1. Insert evento ──────────────────────────────────────────────────────
    const token_acceso = crypto.randomUUID()
    const { data: evento, error: eventoError } = await db
        .from('eventos')
        .insert({
            nombre,
            tipo_evento,
            fecha_evento,
            presupuesto_usd,
            tipo_cambio,
            planner_id: planner_id || null,
            token_acceso,
        })
        .select('id')
        .single()

    if (eventoError || !evento) {
        throw new Error(eventoError?.message ?? 'Error al crear el evento')
    }

    const eventoId = evento.id

    // ── 2. Fetch plantillas_fases for this tipo_evento ────────────────────────
    const { data: plantillasFases } = await db
        .from('plantillas_fases')
        .select('id, nombre, descripcion, meses_antes_inicio, meses_antes_fin, position')
        .eq('tipo_evento', tipo_evento)
        .order('position')

    if (plantillasFases && plantillasFases.length > 0) {
        const seenFaseKeys = new Set<string>()
        const uniqueFases = plantillasFases.filter((pf: { nombre: string; position: number }) => {
            const key = `${pf.nombre}::${pf.position}`
            if (seenFaseKeys.has(key)) return false
            seenFaseKeys.add(key)
            return true
        })

        for (const pf of uniqueFases) {
            const fechaInicio = subtractMonths(fecha_evento, pf.meses_antes_inicio)
            const fechaFin = subtractMonths(fecha_evento, pf.meses_antes_fin)

            // ── 3. Insert fase ──────────────────────────────────────────────────
            const { data: fase, error: faseError } = await db
                .from('fases')
                .insert({
                    evento_id: eventoId,
                    nombre: pf.nombre,
                    descripcion: pf.descripcion,
                    fecha_inicio: fechaInicio,
                    fecha_fin: fechaFin,
                    position: pf.position,
                })
                .select('id')
                .single()

            if (faseError || !fase) continue

            // ── 4. Fetch plantillas_temas for this fase ─────────────────────────
            const { data: plantillasTemas } = await db
                .from('plantillas_temas')
                .select('id, nombre, descripcion, position')
                .eq('plantilla_fase_id', pf.id)
                .order('position')

            if (plantillasTemas && plantillasTemas.length > 0) {
                for (const pt of plantillasTemas) {
                    const { data: tema, error: temaError } = await db
                        .from('temas')
                        .insert({
                            fase_id: fase.id,
                            nombre: pt.nombre,
                            descripcion: pt.descripcion,
                            position: pt.position,
                        })
                        .select('id')
                        .single()

                    if (temaError || !tema) continue

                    // ── 5. Insert tareas ────────────────────────────────────────
                    const { data: plantillasTareas } = await db
                        .from('plantillas_tareas')
                        .select('nombre, position')
                        .eq('plantilla_tema_id', pt.id)
                        .order('position')

                    if (plantillasTareas && plantillasTareas.length > 0) {
                        const tareas = plantillasTareas.map((pta: { nombre: string; position: number }) => ({
                            tema_id: tema.id,
                            nombre: pta.nombre,
                            estado: 'pendiente' as const,
                            position: pta.position,
                        }))
                        await db.from('tareas').insert(tareas)
                    }
                }
            }
        }
    }

    // ── 6. Fetch plantillas_rubros & insert rubros ────────────────────────────
    const { data: plantillasRubros } = await db
        .from('plantillas_rubros')
        .select('nombre, sena_pct_default, dias_antes_decision, moneda_default, orden')
        .eq('tipo_evento', tipo_evento)
        .order('orden')

    if (plantillasRubros && plantillasRubros.length > 0) {
        const seenRubroKeys = new Set<string>()
        const uniqueRubros = plantillasRubros.filter((pr: { nombre: string; orden: number }) => {
            const key = `${pr.nombre}::${pr.orden}`
            if (seenRubroKeys.has(key)) return false
            seenRubroKeys.add(key)
            return true
        })

        const hoy = new Date()
        const rubros = uniqueRubros.map((pr: {
            nombre: string; moneda_default: string; sena_pct_default: number | null
            orden: number; dias_antes_decision?: number | null
        }) => ({
            evento_id: eventoId,
            nombre: pr.nombre,
            estado: 'pendiente' as const,
            moneda: pr.moneda_default,
            sena_pct: pr.sena_pct_default,
            orden: pr.orden,
            fecha_decision: clampDate(subtractDays(fecha_evento, pr.dias_antes_decision ?? null), hoy, fecha_evento),
            proveedor: null,
            monto_original: null,
            fecha_sena: null,
            notas: null,
        }))
        await db.from('rubros').insert(rubros)
    }

    redirect('/dashboard')
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function toDateOnly(d: Date): string {
    return d.toISOString().split('T')[0]
}

function subtractMonths(fechaIso: string, months: number): string {
    const d = new Date(fechaIso + 'T12:00:00')
    d.setMonth(d.getMonth() - months)
    return toDateOnly(d)
}

function subtractDays(fechaIso: string, days: number | null): string | null {
    if (days == null) return null
    const d = new Date(fechaIso + 'T12:00:00')
    d.setDate(d.getDate() - days)
    return toDateOnly(d)
}

function clampDate(date: string | null, hoy: Date, fechaEvento: string): string | null {
    if (!date) return null
    const d = new Date(date + 'T12:00:00')
    const minDate = new Date(hoy); minDate.setHours(0, 0, 0, 0)
    const maxDate = new Date(fechaEvento + 'T12:00:00')
    if (d < minDate) return toDateOnly(minDate)
    if (d > maxDate) return toDateOnly(maxDate)
    return date
}

'use server'

import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase'
import type { TipoEvento } from '@/lib/types'

export async function createEvento(formData: FormData) {
    const supabase = await createServerSupabaseClient()

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
    const { data: evento, error: eventoError } = await supabase
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
    const { data: plantillasFases } = await supabase
        .from('plantillas_fases')
        .select('id, nombre, descripcion, orden')
        .eq('tipo_evento', tipo_evento)
        .order('orden')

    if (plantillasFases && plantillasFases.length > 0) {
        // Deduplicate template phases by (nombre, orden) in case of duplicate DB rows
        const seenFaseKeys = new Set<string>()
        const uniqueFases = plantillasFases.filter((pf) => {
            const key = `${pf.nombre}::${pf.orden}`
            if (seenFaseKeys.has(key)) return false
            seenFaseKeys.add(key)
            return true
        })

        for (const pf of uniqueFases) {
            // ── 3. Insert fase ──────────────────────────────────────────────────
            const { data: fase, error: faseError } = await supabase
                .from('fases')
                .insert({
                    evento_id: eventoId,
                    nombre: pf.nombre,
                    descripcion: pf.descripcion,
                    orden: pf.orden,
                })
                .select('id')
                .single()

            if (faseError || !fase) continue

            // ── 4. Fetch & insert plantillas_tareas for this fase ────────────────
            const { data: plantillasTareas } = await supabase
                .from('plantillas_tareas')
                .select('nombre, tipo, meses_antes, orden')
                .eq('plantilla_fase_id', pf.id)
                .order('orden')

            if (plantillasTareas && plantillasTareas.length > 0) {
                const tareas = plantillasTareas.map((pt) => ({
                    fase_id: fase.id,
                    nombre: pt.nombre,
                    tipo: pt.tipo,
                    orden: pt.orden,
                    estado: 'pendiente' as const,
                    completada: false,
                    fecha: calcularFechaDesde(fecha_evento, pt.meses_antes, 'dias'),
                    resumen: null,
                }))
                await supabase.from('tareas').insert(tareas)
            }
        }
    }

    // ── 5. Fetch plantillas_rubros & insert rubros ────────────────────────────
    const { data: plantillasRubros } = await supabase
        .from('plantillas_rubros')
        .select('nombre, sena_pct_default, dias_antes_decision, moneda_default, orden')
        .eq('tipo_evento', tipo_evento)
        .order('orden')

    if (plantillasRubros && plantillasRubros.length > 0) {
        // Deduplicate by (nombre, orden) in case of duplicate rows in templates table
        const seenRubroKeys = new Set<string>()
        const uniqueRubros = plantillasRubros.filter((pr) => {
            const key = `${pr.nombre}::${pr.orden}`
            if (seenRubroKeys.has(key)) return false
            seenRubroKeys.add(key)
            return true
        })

        const rubros = uniqueRubros.map((pr) => ({
            evento_id: eventoId,
            nombre: pr.nombre,
            estado: 'pendiente' as const,
            moneda: pr.moneda_default,
            sena_pct: pr.sena_pct_default,
            orden: pr.orden,
            fecha_decision: calcularFechaDesde(fecha_evento, (pr as { dias_antes_decision?: number | null }).dias_antes_decision ?? null, 'dias'),
            proveedor: null,
            monto_original: null,
            fecha_sena: null,
            notas: null,
        }))
        await supabase.from('rubros').insert(rubros)
    }

    redirect('/dashboard')
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function calcularFechaDesde(
    fechaEvento: string,
    cantidad: number | null,
    unidad: 'dias' | 'meses' = 'meses'
): string | null {
    if (!cantidad) return null
    const d = new Date(fechaEvento)
    if (unidad === 'meses') {
        d.setMonth(d.getMonth() - cantidad)
    } else {
        d.setDate(d.getDate() - cantidad)
    }
    return d.toISOString().split('T')[0]
}

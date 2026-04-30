// Aplica la plantilla del tipo_evento a un evento existente.
// Solo agrega fases/temas/tareas. NO toca rubros (asume que ya están bien).
//
// Uso:
//   node scripts/aplicar-plantilla.mjs <evento-id>             (aplica)
//   node scripts/aplicar-plantilla.mjs <evento-id> --dry-run   (solo log)

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const text = fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8')
for (const line of text.split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq < 0) continue
    const k = t.slice(0, eq).trim()
    let v = t.slice(eq + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    if (!process.env[k]) process.env[k] = v
}

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const eventoId = args.find(a => !a.startsWith('--'))
if (!eventoId) { console.error('Falta evento-id'); process.exit(1) }

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } }
)

// 1. Get evento + check fases existentes
const { data: evento, error: errE } = await supabase
    .from('eventos')
    .select('id, nombre, tipo_evento, fecha_evento, fases(id)')
    .eq('id', eventoId)
    .maybeSingle()
if (errE || !evento) { console.error('✖ Evento no existe:', errE?.message); process.exit(1) }

console.log(`\n→ ${evento.nombre} (${evento.tipo_evento}, ${evento.fecha_evento})`)
console.log(`  Fases existentes: ${evento.fases?.length ?? 0}`)

if ((evento.fases?.length ?? 0) > 0) {
    console.error(`✖ El evento ya tiene fases. Cancelo para no duplicar.`)
    console.error(`  Si querés reaplicar: borrá las fases primero o aplicá manualmente lo que falta.`)
    process.exit(1)
}

// 2. Get plantilla
const { data: pFases, error: errPF } = await supabase
    .from('plantillas_fases')
    .select('id, nombre, descripcion, meses_antes_inicio, meses_antes_fin, position')
    .eq('tipo_evento', evento.tipo_evento)
    .order('position')
if (errPF) { console.error('✖', errPF.message); process.exit(1) }
if (!pFases || pFases.length === 0) {
    console.error(`✖ No hay plantilla para tipo '${evento.tipo_evento}'`)
    process.exit(1)
}
console.log(`  Plantilla: ${pFases.length} etapas`)

const dedup = new Set()
const uniqueFases = pFases.filter(f => {
    const k = `${f.nombre}::${f.position}`
    if (dedup.has(k)) return false
    dedup.add(k); return true
})

function subMonths(iso, m) {
    const d = new Date(iso + 'T12:00:00')
    d.setMonth(d.getMonth() - m)
    return d.toISOString().slice(0, 10)
}

let totalFases = 0, totalTemas = 0, totalTareas = 0

for (const pf of uniqueFases) {
    const inicio = subMonths(evento.fecha_evento, pf.meses_antes_inicio)
    const fin = subMonths(evento.fecha_evento, pf.meses_antes_fin)
    console.log(`\n  E${pf.position} ${pf.nombre} · ${inicio} → ${fin}`)

    // Insert fase
    let faseId = null
    if (!dryRun) {
        const { data: f, error: errF } = await supabase
            .from('fases')
            .insert({
                evento_id: eventoId,
                nombre: pf.nombre,
                descripcion: pf.descripcion,
                fecha_inicio: inicio,
                fecha_fin: fin,
                position: pf.position,
            })
            .select('id')
            .single()
        if (errF || !f) { console.error(`    ✖ ${errF?.message}`); continue }
        faseId = f.id
    }
    totalFases++

    const { data: pTemas } = await supabase
        .from('plantillas_temas')
        .select('id, nombre, descripcion, position')
        .eq('plantilla_fase_id', pf.id)
        .order('position')
    for (const pt of (pTemas ?? [])) {
        console.log(`      • ${pt.nombre}`)
        let temaId = null
        if (!dryRun) {
            const { data: t, error: errT } = await supabase
                .from('temas')
                .insert({
                    fase_id: faseId,
                    nombre: pt.nombre,
                    descripcion: pt.descripcion,
                    position: pt.position,
                })
                .select('id')
                .single()
            if (errT || !t) { console.error(`        ✖ ${errT?.message}`); continue }
            temaId = t.id
        }
        totalTemas++

        const { data: pTareas } = await supabase
            .from('plantillas_tareas')
            .select('nombre, position')
            .eq('plantilla_tema_id', pt.id)
            .order('position')
        if (pTareas && pTareas.length > 0) {
            if (!dryRun) {
                const tareas = pTareas.map(pta => ({
                    tema_id: temaId,
                    nombre: pta.nombre,
                    estado: 'pendiente',
                    position: pta.position,
                }))
                const { error: errTar } = await supabase.from('tareas').insert(tareas)
                if (errTar) console.error(`        ✖ tareas: ${errTar.message}`)
            }
            totalTareas += pTareas.length
        }
    }
}

console.log(`\n${dryRun ? '(dry-run) ' : ''}Total: ${totalFases} fases · ${totalTemas} temas · ${totalTareas} tareas`)

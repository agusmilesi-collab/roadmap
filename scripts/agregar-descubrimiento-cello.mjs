// Para Nico y Mati únicamente:
// 1. Crear etapa "Descubrimiento" como E1 (renumerar las existentes)
//    con tema "Conocernos y definir la visión" y 4 tareas completadas
// 2. Agregar tarea "Contratación de Violín y Celo" en Entretenimiento (E2 actual = E3 nuevo)
// (Esto NO toca la plantilla boda, solo el evento.)

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

const eventoId = '58a419a3-e057-4825-a1cc-a0f5f769e815'
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } }
)

// ─── 1. Renumerar fases existentes (+1) y crear "Descubrimiento" como position 1
const { data: fasesActuales } = await supabase
    .from('fases')
    .select('id, nombre, position')
    .eq('evento_id', eventoId)
    .order('position')

console.log('→ Renumerando fases existentes...')
// Renumerar de mayor a menor para evitar choques de unique constraints
const sorted = [...(fasesActuales ?? [])].sort((a, b) => b.position - a.position)
for (const f of sorted) {
    const newPos = f.position + 1
    const { error } = await supabase.from('fases').update({ position: newPos }).eq('id', f.id)
    if (error) console.error(`  ✖ ${f.nombre}: ${error.message}`)
    else console.log(`  ✓ ${f.nombre}: ${f.position} → ${newPos}`)
}

// Crear fase Descubrimiento
console.log('\n→ Creando etapa "Descubrimiento"...')
const { data: descFase, error: errF } = await supabase
    .from('fases')
    .insert({
        evento_id: eventoId,
        nombre: 'Descubrimiento',
        descripcion: 'Conocernos y definir la visión',
        fecha_inicio: '2026-02-19',
        fecha_fin: '2026-02-25',
        position: 1,
    })
    .select('id')
    .single()
if (errF || !descFase) { console.error('✖', errF?.message); process.exit(1) }
console.log(`  ✓ etapa creada: ${descFase.id}`)

// Crear tema
const { data: tema, error: errT } = await supabase
    .from('temas')
    .insert({
        fase_id: descFase.id,
        nombre: 'Conocernos y definir la visión',
        descripcion: null,
        position: 1,
    })
    .select('id')
    .single()
if (errT || !tema) { console.error('✖', errT?.message); process.exit(1) }

// Crear 4 tareas completadas
const tareasDesc = [
    { nombre: 'Reunión inicial de briefing', position: 1 },
    { nombre: 'Propuesta de concepto creativo', position: 2 },
    { nombre: 'Aprobación del concepto', position: 3 },
    { nombre: 'Pago de seña', position: 4 },
]
for (const ta of tareasDesc) {
    const { error: errTar } = await supabase.from('tareas').insert({
        tema_id: tema.id,
        nombre: ta.nombre,
        estado: 'completada',
        position: ta.position,
    })
    if (errTar) console.error(`  ✖ ${ta.nombre}: ${errTar.message}`)
    else console.log(`  ✓ tarea completada: ${ta.nombre}`)
}

// ─── 2. Agregar tarea "Contratación de Violín y Celo" en Entretenimiento
console.log('\n→ Agregando tarea de Cello a Entretenimiento...')
const { data: temaEntre } = await supabase
    .from('temas')
    .select('id, fase:fases!inner(evento_id)')
    .eq('fase.evento_id', eventoId)
    .eq('nombre', 'Entretenimiento')
    .maybeSingle()
if (!temaEntre) {
    console.error('✖ No se encontró el tema Entretenimiento')
    process.exit(1)
}

// Position al final
const { data: maxPos } = await supabase
    .from('tareas')
    .select('position')
    .eq('tema_id', temaEntre.id)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle()
const nextPos = (maxPos?.position ?? 0) + 1

const { error: errCello } = await supabase.from('tareas').insert({
    tema_id: temaEntre.id,
    nombre: 'Contratación de Violín y Celo',
    estado: 'pendiente',
    position: nextPos,
})
if (errCello) console.error('✖', errCello.message)
else console.log(`  ✓ tarea agregada: Contratación de Violín y Celo (pendiente)`)

console.log('\n✓ Listo.')

// Ajusta el progreso de Nico y Mati: 2 varones, no hay temas "Look novia".
// 1. Borrar tema "Look novia: vestido" + tareas
// 2. Borrar tema "Look novia: beauty (make-up & hair)" + tareas
// 3. Renombrar "Traje novio" → "Trajes"

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

// Fetch fases del evento con temas
const { data: fases, error } = await supabase
    .from('fases')
    .select('id, nombre, temas(id, nombre)')
    .eq('evento_id', eventoId)
if (error) { console.error('✖', error.message); process.exit(1) }

const temasABorrar = []
let temaTrajeId = null

for (const f of fases ?? []) {
    for (const t of f.temas ?? []) {
        if (t.nombre === 'Look novia: vestido' || t.nombre === 'Look novia: beauty (make-up & hair)') {
            temasABorrar.push(t.id)
            console.log(`  → borrar tema: ${t.nombre} (${t.id})`)
        } else if (t.nombre === 'Traje novio') {
            temaTrajeId = t.id
            console.log(`  → renombrar tema: ${t.nombre} → Trajes (${t.id})`)
        }
    }
}

// Delete temas (cascade borra tareas)
if (temasABorrar.length > 0) {
    const { error: errD } = await supabase.from('temas').delete().in('id', temasABorrar)
    if (errD) console.error('✖ delete:', errD.message)
    else console.log(`✓ ${temasABorrar.length} temas borrados`)
}

// Rename Traje novio → Trajes
if (temaTrajeId) {
    const { error: errU } = await supabase.from('temas').update({ nombre: 'Trajes' }).eq('id', temaTrajeId)
    if (errU) console.error('✖ rename:', errU.message)
    else console.log('✓ Traje novio renombrado a Trajes')
}

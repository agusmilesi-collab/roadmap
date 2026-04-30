// Test directo: inserta un pago en pagos_proveedor y verifica si aparece.
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

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } }
)

// 1) Buscar un rubro real
const eventoId = 'bfee52af-3bbd-49d2-8416-9f902f62746e'
const { data: rubros, error: errR } = await supabase
    .from('rubros')
    .select('id, nombre')
    .eq('evento_id', eventoId)
    .limit(1)
if (errR) { console.error('✖ select rubros:', errR.message); process.exit(1) }
if (!rubros || rubros.length === 0) { console.error(`✖ Sin rubros en evento ${eventoId}`); process.exit(1) }
const rubro = rubros[0]
console.log(`→ Rubro: ${rubro.nombre} (${rubro.id})`)

// 2) Insertar pago como hace createPago
const { data: inserted, error: errI } = await supabase
    .from('pagos_proveedor')
    .insert({
        rubro_id: rubro.id,
        monto: 1.23,  // marker para identificarlo
        moneda: 'USD',
        fecha: new Date().toISOString().slice(0, 10),
        descripcion: 'TEST INSERT desde script',
        realizado: false,
    })
    .select()
if (errI) {
    console.error('✖ insert error:', errI.message)
    console.error('   detail:', errI.details)
    console.error('   hint:', errI.hint)
    process.exit(1)
}
console.log('✓ Insert OK')
console.log('   Insertado:', inserted)

// 3) Leer todos los pagos del rubro y ver si aparece
const { data: pagos, error: errP } = await supabase
    .from('pagos_proveedor')
    .select('id, monto, moneda, descripcion, tipo, devuelto')
    .eq('rubro_id', rubro.id)
console.log(`→ Total pagos en rubro: ${pagos?.length ?? 0}`)
if (pagos) for (const p of pagos) console.log(`   · ${p.monto} ${p.moneda} · tipo=${p.tipo} · ${p.descripcion ?? ''}`)
if (errP) console.error('✖ select error:', errP.message)

// 4) Cleanup: borrar el test
const testId = inserted?.[0]?.id
if (testId) {
    const { error: errD } = await supabase.from('pagos_proveedor').delete().eq('id', testId)
    if (!errD) console.log('✓ Test pago borrado (cleanup)')
}

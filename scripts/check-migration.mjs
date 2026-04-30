// Verifica si los nuevos campos del depósito existen en pagos_proveedor.
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

const { error: errFull } = await supabase
    .from('pagos_proveedor')
    .select('id, tipo, devuelto, fecha_devolucion')
    .limit(1)

if (errFull) {
    console.log('✖ Migration NO aplicada. Faltan columnas en pagos_proveedor.')
    console.log('  Error:', errFull.message)
    process.exit(1)
}
console.log('✓ Migration aplicada. Las columnas tipo, devuelto, fecha_devolucion existen.')

// Probar también si el evento existe
const eventoId = 'bfee52af-3bbd-49d2-8416-9f902f62746e'
const { data, error } = await supabase
    .from('eventos')
    .select('id, nombre')
    .eq('id', eventoId)
    .maybeSingle()

if (error) {
    console.log('✖ Error consultando evento:', error.message)
} else if (!data) {
    console.log(`✖ Evento ${eventoId} no existe en DB.`)
} else {
    console.log(`✓ Evento existe: ${data.nombre}`)
}

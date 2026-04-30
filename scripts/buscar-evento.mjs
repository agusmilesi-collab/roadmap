// Busca eventos por nombre y muestra estado básico (fases, rubros).
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

const query = process.argv[2] ?? ''
if (!query) { console.error('Uso: node scripts/buscar-evento.mjs <texto-en-nombre>'); process.exit(1) }

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } }
)

const { data, error } = await supabase
    .from('eventos')
    .select('id, nombre, tipo_evento, fecha_evento, fases(id), rubros(id)')
    .ilike('nombre', `%${query}%`)

if (error) { console.error('✖', error.message); process.exit(1) }
if (!data || data.length === 0) { console.log(`Sin resultados para "${query}".`); process.exit(0) }

console.log(`\nResultados para "${query}":\n`)
for (const e of data) {
    console.log(`  ${e.nombre}`)
    console.log(`    id: ${e.id}`)
    console.log(`    tipo: ${e.tipo_evento} · fecha: ${e.fecha_evento}`)
    console.log(`    fases: ${e.fases?.length ?? 0} · rubros: ${e.rubros?.length ?? 0}`)
    console.log()
}

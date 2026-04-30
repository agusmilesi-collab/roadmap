// Aplica la lógica de recalcularEstadoRubro a TODOS los rubros de un evento.
// Si solo querés un evento puntual, pasalo como argumento. Sin args: todos.
//
// Uso:
//   node scripts/sync-estados-rubros.mjs                          (todos los eventos)
//   node scripts/sync-estados-rubros.mjs <evento-id>              (uno solo)
//   node scripts/sync-estados-rubros.mjs --dry-run                (no aplica, solo log)

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
const eventoIdArg = args.find(a => !a.startsWith('--'))

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } }
)

let q = supabase.from('rubros').select(`
    id, nombre, estado, costo_total, monto_original, moneda, tipo_cambio_propio,
    pagos_proveedor ( id, monto, moneda, tipo_cambio_snapshot, realizado, tipo )
`)
if (eventoIdArg) q = q.eq('evento_id', eventoIdArg)

const { data: rubros, error } = await q
if (error) { console.error('✖', error.message); process.exit(1) }

// Solo SUBE de nivel; nunca degrada
const NIVEL = { pendiente: 0, en_proceso: 1, decidido: 2, señado: 3, completado: 4 }

let cambiados = 0
for (const rubro of rubros) {
    const costoBase = rubro.costo_total ?? rubro.monto_original
    if (!costoBase) continue
    const tcRubro = rubro.tipo_cambio_propio ?? 0
    const toUSD = (m, mn, ts) => mn === 'USD' ? m : (ts && ts > 0 ? m / ts : (tcRubro > 0 ? m / tcRubro : 0))
    const costoUSD = toUSD(costoBase, rubro.moneda, null)
    const pagos = (rubro.pagos_proveedor ?? []).filter(p => p.tipo !== 'deposito_garantia')
    const realizadosUSD = pagos.filter(p => p.realizado).reduce((s, p) => s + toUSD(p.monto, p.moneda, p.tipo_cambio_snapshot), 0)
    const hayRealizados = pagos.some(p => p.realizado)

    let candidato = rubro.estado
    if (hayRealizados && costoUSD > 0 && realizadosUSD >= costoUSD - 0.5) candidato = 'completado'
    else if (hayRealizados) candidato = 'señado'

    if ((NIVEL[candidato] ?? 0) > (NIVEL[rubro.estado] ?? 0)) {
        cambiados++
        console.log(`  ${rubro.nombre}: ${rubro.estado} → ${candidato}`)
        if (!dryRun) {
            const { error: errU } = await supabase.from('rubros').update({ estado: candidato }).eq('id', rubro.id)
            if (errU) console.error(`    ✖ ${errU.message}`)
        }
    }
}

console.log(`\n${dryRun ? '(dry-run) ' : ''}${cambiados} rubro${cambiados === 1 ? '' : 's'} actualizado${cambiados === 1 ? '' : 's'}.`)

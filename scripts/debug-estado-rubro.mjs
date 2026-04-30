// Replica la lógica de recalcularEstadoRubro para depurar.
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

const eventoId = 'bfee52af-3bbd-49d2-8416-9f902f62746e'

const { data: rubros, error } = await supabase
    .from('rubros')
    .select(`
        id, nombre, estado, proveedor, costo_total, monto_original, moneda, tipo_cambio_propio,
        pagos_proveedor ( id, monto, moneda, tipo_cambio_snapshot, realizado, tipo, descripcion )
    `)
    .eq('evento_id', eventoId)

if (error) { console.error('✖', error.message); process.exit(1) }

console.log(`\nEvento ${eventoId} — ${rubros.length} rubros:\n`)
for (const rubro of rubros) {
    const costoBase = rubro.costo_total ?? rubro.monto_original
    const tcRubro = rubro.tipo_cambio_propio ?? 0
    function toUSD(monto, moneda, tcSnap) {
        if (moneda === 'USD') return monto
        const tc = tcSnap && tcSnap > 0 ? tcSnap : tcRubro
        return tc > 0 ? monto / tc : 0
    }
    const costoUSD = costoBase ? toUSD(costoBase, rubro.moneda, null) : 0
    const pagos = (rubro.pagos_proveedor ?? []).filter(p => p.tipo !== 'deposito_garantia')
    const realizadosUSD = pagos.filter(p => p.realizado).reduce((s, p) => s + toUSD(p.monto, p.moneda, p.tipo_cambio_snapshot), 0)
    const hayRealizados = pagos.some(p => p.realizado)

    let nuevoEstado = rubro.estado
    if (hayRealizados && costoUSD > 0 && realizadosUSD >= costoUSD - 0.5) nuevoEstado = 'completado'
    else if (hayRealizados) nuevoEstado = 'señado'

    const cambia = nuevoEstado !== rubro.estado ? `→ ${nuevoEstado}` : '✓'
    console.log(`  ${rubro.nombre} [${rubro.estado}] ${cambia}`)
    console.log(`    costo: ${costoBase} ${rubro.moneda} (≈ USD ${costoUSD.toFixed(2)}) · realizadosUSD ${realizadosUSD.toFixed(2)}`)
    if (pagos.length === 0) console.log(`    sin pagos`)
    for (const p of pagos) {
        console.log(`    ${p.realizado ? '✓' : '○'} ${p.monto} ${p.moneda} · tipo=${p.tipo} · "${p.descripcion ?? ''}"`)
    }
    console.log()
}

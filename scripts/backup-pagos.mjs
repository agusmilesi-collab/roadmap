// Backup de pagos a proveedores por evento.
//
// Uso:
//   node scripts/backup-pagos.mjs
//
// Genera dos archivos en /backups con timestamp:
//   - pagos-YYYY-MM-DD.json  → estructura jerárquica completa (backup fiel)
//   - pagos-YYYY-MM-DD.csv   → una fila por pago (auditoría visual)
//
// Lee credenciales de .env.local. Prefiere SERVICE_ROLE si existe.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

// ─── Cargar .env.local ──────────────────────────────────────────────────────
function loadEnvLocal() {
    const envPath = path.join(ROOT, '.env.local')
    if (!fs.existsSync(envPath)) {
        console.error('✖ .env.local no encontrado en', envPath)
        process.exit(1)
    }
    const text = fs.readFileSync(envPath, 'utf8')
    for (const line of text.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const eq = trimmed.indexOf('=')
        if (eq < 0) continue
        const key = trimmed.slice(0, eq).trim()
        let value = trimmed.slice(eq + 1).trim()
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1)
        }
        if (!process.env[key]) process.env[key] = value
    }
}
loadEnvLocal()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('✖ Falta NEXT_PUBLIC_SUPABASE_URL o key (service-role o anon) en .env.local')
    process.exit(1)
}

const usingServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY
console.log(`→ Conectando a ${SUPABASE_URL} (${usingServiceRole ? 'service-role' : 'anon'} key)`)

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false },
})

// ─── Fetch ──────────────────────────────────────────────────────────────────
async function fetchData() {
    const { data, error } = await supabase
        .from('eventos')
        .select(`
            id, nombre, tipo_evento, fecha_evento, presupuesto_usd, tipo_cambio, planner_id, created_at,
            planners ( nombre, email ),
            rubros (
                id, nombre, estado, proveedor, monto_original, moneda,
                tipo_cambio_propio, sena_pct, fecha_decision, fecha_sena,
                notas, orden, costo_total, descripcion_servicio,
                pagos_proveedor (
                    id, monto, moneda, tipo_cambio_snapshot, fecha,
                    realizado, descripcion, created_at
                )
            )
        `)
        .order('fecha_evento', { ascending: true })

    if (error) {
        console.error('✖ Error consultando Supabase:', error.message)
        process.exit(1)
    }
    return data ?? []
}

// ─── CSV writer ─────────────────────────────────────────────────────────────
function csvEscape(value) {
    if (value === null || value === undefined) return ''
    const str = String(value)
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`
    }
    return str
}

function buildCsv(eventos) {
    const headers = [
        'evento_id', 'evento_nombre', 'evento_fecha', 'tipo_evento', 'planner',
        'rubro_id', 'rubro_nombre', 'proveedor', 'rubro_estado',
        'rubro_monto_original', 'rubro_moneda', 'rubro_costo_total',
        'rubro_sena_pct', 'rubro_fecha_decision', 'rubro_fecha_sena',
        'pago_id', 'pago_fecha', 'pago_monto', 'pago_moneda',
        'pago_tipo_cambio', 'pago_realizado', 'pago_descripcion', 'pago_created_at',
    ]
    const rows = [headers.map(csvEscape).join(',')]

    let pagosCount = 0
    let rubrosSinPagos = 0

    for (const evt of eventos) {
        const plannerName = evt.planners?.nombre ?? ''
        const rubros = evt.rubros ?? []
        if (rubros.length === 0) {
            // evento sin rubros — registramos una línea vacía para no perderlo del backup
            rows.push([
                evt.id, evt.nombre, evt.fecha_evento, evt.tipo_evento, plannerName,
                '', '', '', '', '', '', '', '', '', '',
                '', '', '', '', '', '', '', '',
            ].map(csvEscape).join(','))
            continue
        }
        for (const r of rubros) {
            const pagos = r.pagos_proveedor ?? []
            if (pagos.length === 0) {
                rubrosSinPagos++
                rows.push([
                    evt.id, evt.nombre, evt.fecha_evento, evt.tipo_evento, plannerName,
                    r.id, r.nombre, r.proveedor, r.estado,
                    r.monto_original, r.moneda, r.costo_total,
                    r.sena_pct, r.fecha_decision, r.fecha_sena,
                    '', '', '', '', '', '', '', '',
                ].map(csvEscape).join(','))
                continue
            }
            for (const p of pagos) {
                pagosCount++
                rows.push([
                    evt.id, evt.nombre, evt.fecha_evento, evt.tipo_evento, plannerName,
                    r.id, r.nombre, r.proveedor, r.estado,
                    r.monto_original, r.moneda, r.costo_total,
                    r.sena_pct, r.fecha_decision, r.fecha_sena,
                    p.id, p.fecha, p.monto, p.moneda,
                    p.tipo_cambio_snapshot, p.realizado, p.descripcion, p.created_at,
                ].map(csvEscape).join(','))
            }
        }
    }

    return { csv: rows.join('\n') + '\n', pagosCount, rubrosSinPagos }
}

// ─── Main ───────────────────────────────────────────────────────────────────
async function main() {
    const eventos = await fetchData()

    const today = new Date().toISOString().slice(0, 10)
    const outDir = path.join(ROOT, 'backups')
    fs.mkdirSync(outDir, { recursive: true })

    const jsonPath = path.join(outDir, `pagos-${today}.json`)
    fs.writeFileSync(jsonPath, JSON.stringify(eventos, null, 2), 'utf8')

    const { csv, pagosCount, rubrosSinPagos } = buildCsv(eventos)
    const csvPath = path.join(outDir, `pagos-${today}.csv`)
    fs.writeFileSync(csvPath, csv, 'utf8')

    const totalRubros = eventos.reduce((acc, e) => acc + (e.rubros?.length ?? 0), 0)

    console.log('')
    console.log(`✓ Backup completado para ${eventos.length} eventos`)
    console.log(`  • ${totalRubros} rubros (${rubrosSinPagos} sin pagos)`)
    console.log(`  • ${pagosCount} pagos`)
    console.log('')
    console.log(`  JSON → ${path.relative(ROOT, jsonPath)}`)
    console.log(`  CSV  → ${path.relative(ROOT, csvPath)}`)
}

main().catch((err) => {
    console.error('✖ Error inesperado:', err)
    process.exit(1)
})

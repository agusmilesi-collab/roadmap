// Marca tareas del evento de Nico y Mati según el PDF que envió el cliente.
//
// Mapeo PDF → nuestra plantilla, con criterio:
//   COMPLETADA del PDF → todas las sub-tareas del tema correspondiente
//                        marcadas como 'completada', excepto las que el PDF
//                        explícitamente deja en otro estado.
//   EN CURSO            → 'en_curso'
//   VENCIDA / PENDIENTE → quedan en 'pendiente' (default).

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
const dryRun = process.argv.includes('--dry-run')

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } }
)

// Updates a aplicar: [tema_nombre, tarea_nombre_partial, estado]
// Para que matchee el partial: incluyo solo una palabra distintiva.
const updates = [
    // PDF: "Visita y selección de venue" COMPLETADA
    ['Ceremonias', 'Definir localidad de la ceremonia', 'completada'],

    // PDF: "Selección de catering" COMPLETADA
    ['Catering', 'Listar 3 proveedores candidatos', 'completada'],
    ['Catering', 'Pedir presupuestos', 'completada'],
    ['Catering', 'Decidir y firmar contrato', 'completada'],
    // PDF: "Prueba de menú" EN CURSO
    ['Catering', 'Realizar degustaciones', 'en_curso'],

    // PDF: "Contratación de barra" COMPLETADA
    ['Barra / Bebidas', 'Evaluar proveedores de barra', 'completada'],
    ['Barra / Bebidas', 'Definir carta', 'completada'],
    ['Barra / Bebidas', 'Firmar contrato', 'completada'],

    // PDF: "Definición de fotografía y video" COMPLETADA
    ['Fotografía & Video', 'Investigar referencias de estilo', 'completada'],
    ['Fotografía & Video', 'Reunión con candidatos', 'completada'],
    ['Fotografía & Video', 'Definir cobertura', 'completada'],
    // Save the date NO se menciona explícitamente → queda pendiente

    // PDF: "Selección de música (DJ / banda)" COMPLETADA
    ['DJ / Musicalización', 'Investigar DJs candidatos', 'completada'],
    ['DJ / Musicalización', 'Reunión con candidato elegido', 'completada'],
    ['DJ / Musicalización', 'Firmar contrato', 'completada'],

    // PDF: "Envío de invitaciones" COMPLETADA
    ['Papelería & gráfica', 'Brief al diseñador', 'completada'],
    ['Papelería & gráfica', 'Aprobar invitación', 'completada'],
    ['Invitaciones', 'Aprobar diseño final', 'completada'],
    ['Invitaciones', 'Imprimir', 'completada'],
    ['Invitaciones', 'Enviar', 'completada'],

    // PDF: "Selección de trajes" EN CURSO
    ['Look novia: vestido', 'Primera prueba', 'completada'],
    ['Look novia: vestido', 'Ajustes intermedios', 'en_curso'],
    ['Traje novio', 'Elegir traje', 'completada'],
    ['Traje novio', 'Ajustes', 'en_curso'],

    // PDF: VENCIDAS y PENDIENTES no requieren cambio (default 'pendiente')
    //   - Cronograma maestro · Contratación Violin/Celo · Tecnica · Ambientación · Hoteleria
    //   - Confirmacion lista de invitados · Prueba trajes final · Coordinación decoración
    //   - Cronograma hora a hora · Reunión cierre · Día del evento
]

// Fetch tareas del evento
const { data: fases, error } = await supabase
    .from('fases')
    .select(`
        id, nombre,
        temas ( id, nombre, tareas ( id, nombre, estado ) )
    `)
    .eq('evento_id', eventoId)
    .order('position')

if (error) { console.error('✖', error.message); process.exit(1) }

let aplicados = 0
let noEncontrados = 0

for (const [temaName, tareaPartial, target] of updates) {
    let found = false
    for (const f of fases ?? []) {
        for (const t of f.temas ?? []) {
            if (t.nombre !== temaName) continue
            for (const ta of t.tareas ?? []) {
                if (!ta.nombre.includes(tareaPartial)) continue
                found = true
                if (ta.estado === target) {
                    console.log(`  · ${temaName} / ${ta.nombre} ya está en ${target}`)
                    break
                }
                console.log(`  ✓ ${temaName} / ${ta.nombre}: ${ta.estado} → ${target}`)
                if (!dryRun) {
                    const { error: errU } = await supabase
                        .from('tareas')
                        .update({ estado: target })
                        .eq('id', ta.id)
                    if (errU) console.error(`    ✖ ${errU.message}`)
                    else aplicados++
                } else {
                    aplicados++
                }
                break
            }
            break
        }
    }
    if (!found) {
        console.error(`  ✖ NO encontrada: tema='${temaName}' tarea~='${tareaPartial}'`)
        noEncontrados++
    }
}

console.log(`\n${dryRun ? '(dry-run) ' : ''}${aplicados} tareas actualizadas. ${noEncontrados} no encontradas.`)

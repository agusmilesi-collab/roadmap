// Cálculos derivados del presupuesto.
//
// Fuente única de verdad para Dashboard y Presupuesto. Todos los gráficos del
// Dashboard se arman a partir de estos cálculos — cero data nueva en el modelo.

export type EstadoRubroLike = 'pendiente' | 'en_proceso' | 'decidido' | 'señado' | 'completado'
export type TipoPagoLike = 'cuota' | 'sena' | 'deposito_garantia'

export interface PagoLike {
    id: string
    monto: number
    moneda: string
    tipo_cambio_snapshot: number | null
    fecha: string
    realizado: boolean
    descripcion: string | null
    tipo?: TipoPagoLike   // optional para retrocompatibilidad si la migration aún no corrió
    devuelto?: boolean
    fecha_devolucion?: string | null
}

export interface RubroLike {
    id: string
    nombre: string
    estado: string
    proveedor: string | null
    monto_original: number | null
    moneda: string
    tipo_cambio_propio: number | null
    sena_pct: number | null
    costo_total: number | null
    descripcion_servicio?: string | null
    pagos_proveedor?: PagoLike[]
}

// ─── Utilidades de conversión ────────────────────────────────────────────────

export function toUSD(monto: number, moneda: string, tcSnap: number | null | undefined, tcFallback: number): number {
    if (moneda === 'USD') return monto
    const tc = tcSnap && tcSnap > 0 ? tcSnap : tcFallback
    return tc > 0 ? monto / tc : 0
}

export function rubroCostoUSD(r: RubroLike, tc: number): number {
    const base = r.costo_total ?? r.monto_original
    if (base == null) return 0
    return toUSD(base, r.moneda, r.tipo_cambio_propio, tc)
}

// ─── Agrupación de rubros: Pendiente / Señado / Cerrado ──────────────────────

export type GrupoRubro = 'pendiente' | 'señado' | 'cerrado'

export function grupoDeRubro(estado: string): GrupoRubro {
    if (estado === 'completado') return 'cerrado'
    if (estado === 'señado') return 'señado'
    return 'pendiente'
}

export function agruparRubros<T extends RubroLike>(rubros: T[]): Record<GrupoRubro, T[]> {
    const out: Record<GrupoRubro, T[]> = { pendiente: [], señado: [], cerrado: [] }
    for (const r of rubros) out[grupoDeRubro(r.estado)].push(r)
    return out
}

// ─── KPIs ────────────────────────────────────────────────────────────────────

export interface KPIs {
    asignadoUSD: number
    pagadoUSD: number
    aPagarUSD: number
    depositosActivosUSD: number  // depósitos pagados pendientes de devolución
    pctAsignado: number
    pendientesCount: number
}

export function calcKPIs(rubros: RubroLike[], tc: number, presupuestoTotalUSD: number): KPIs {
    const asignadoUSD = rubros.reduce((sum, r) => sum + rubroCostoUSD(r, tc), 0)

    let pagadoUSD = 0
    let depositosActivosUSD = 0
    let pendientesCount = 0

    for (const r of rubros) {
        for (const p of r.pagos_proveedor ?? []) {
            const usd = toUSD(p.monto, p.moneda, p.tipo_cambio_snapshot, tc)
            if (p.tipo === 'deposito_garantia') {
                if (p.realizado && !p.devuelto) depositosActivosUSD += usd
                if (p.realizado) pagadoUSD += usd
                else pendientesCount += 1
                continue
            }
            if (p.realizado) pagadoUSD += usd
            else pendientesCount += 1
        }
    }

    const aPagarUSD = Math.max(0, asignadoUSD - pagadoUSD)
    const pctAsignado = presupuestoTotalUSD > 0
        ? Math.min(100, Math.round((asignadoUSD / presupuestoTotalUSD) * 100))
        : 0

    return { asignadoUSD, pagadoUSD, aPagarUSD, depositosActivosUSD, pctAsignado, pendientesCount }
}

// ─── Distribución (donut) ────────────────────────────────────────────────────

export interface DistribucionItem {
    rubroId: string
    nombre: string
    proveedor: string | null
    montoUSD: number
    pct: number
    color: string
}

export const DISTRIBUCION_COLORS = [
    '#C9A84C', '#7C8B70', '#7B5EA7', '#4C8AC9', '#C97A2A',
    '#5B8DA0', '#A87C56', '#8A6DAE', '#C96B8A', '#6B9B7A',
]

export function calcDistribucion(rubros: RubroLike[], tc: number): DistribucionItem[] {
    const items = rubros.map((r, i) => ({
        rubroId: r.id,
        nombre: r.nombre,
        proveedor: r.proveedor,
        montoUSD: rubroCostoUSD(r, tc),
        color: DISTRIBUCION_COLORS[i % DISTRIBUCION_COLORS.length],
    }))
    const total = items.reduce((s, x) => s + x.montoUSD, 0)
    return items
        .filter(x => x.montoUSD > 0)
        .map(x => ({ ...x, pct: total > 0 ? (x.montoUSD / total) * 100 : 0 }))
        .sort((a, b) => b.montoUSD - a.montoUSD)
}

// ─── Cashflow semanal (stack por proveedor + devoluciones) ───────────────────

export type SegmentoCashflowKind = 'realizado' | 'pendiente' | 'devolucion_esperada' | 'devolucion_realizada'

export interface CashflowSegmento {
    rubroId: string
    rubroNombre: string
    proveedor: string | null
    color: string
    montoUSD: number
    kind: SegmentoCashflowKind
}

export interface CashflowSemana {
    weekStart: Date            // lunes de la semana
    label: string              // "5 ene"
    isToday: boolean
    isEvento: boolean
    segmentos: CashflowSegmento[]
    totalUSD: number
}

function startOfWeek(d: Date): Date {
    const out = new Date(d)
    const day = (out.getDay() + 6) % 7  // lunes=0
    out.setDate(out.getDate() - day)
    out.setHours(0, 0, 0, 0)
    return out
}

function isSameWeek(a: Date, b: Date): boolean {
    return startOfWeek(a).getTime() === startOfWeek(b).getTime()
}

function formatWeekLabel(d: Date): string {
    const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
    return `${d.getDate()} ${meses[d.getMonth()]}`
}

export function calcCashflowSemanal(
    rubros: RubroLike[],
    tc: number,
    fechaEvento: string,
    weeksBefore = 8,
    weeksAfter = 1,
): CashflowSemana[] {
    // Mapear cada pago a su semana
    type Entry = { fecha: Date; segmento: CashflowSegmento }
    const entries: Entry[] = []

    rubros.forEach((r, idx) => {
        const color = DISTRIBUCION_COLORS[idx % DISTRIBUCION_COLORS.length]
        for (const p of r.pagos_proveedor ?? []) {
            const usd = toUSD(p.monto, p.moneda, p.tipo_cambio_snapshot, tc)
            if (usd <= 0) continue

            // Pago normal (cuota/seña/depósito que aún no se devolvió)
            const fechaPago = new Date(p.fecha + 'T12:00:00')
            const kindPago: SegmentoCashflowKind = p.realizado ? 'realizado' : 'pendiente'
            entries.push({
                fecha: fechaPago,
                segmento: { rubroId: r.id, rubroNombre: r.nombre, proveedor: r.proveedor, color, montoUSD: usd, kind: kindPago },
            })

            // Devolución de depósito → entrada positiva en su semana
            if (p.tipo === 'deposito_garantia' && p.realizado) {
                if (p.devuelto && p.fecha_devolucion) {
                    entries.push({
                        fecha: new Date(p.fecha_devolucion + 'T12:00:00'),
                        segmento: { rubroId: r.id, rubroNombre: r.nombre, proveedor: r.proveedor, color, montoUSD: usd, kind: 'devolucion_realizada' },
                    })
                } else {
                    // Esperado retorno: 2 semanas después del evento
                    const expected = new Date(fechaEvento + 'T12:00:00')
                    expected.setDate(expected.getDate() + 14)
                    entries.push({
                        fecha: expected,
                        segmento: { rubroId: r.id, rubroNombre: r.nombre, proveedor: r.proveedor, color, montoUSD: usd, kind: 'devolucion_esperada' },
                    })
                }
            }
        }
    })

    // Construir array de semanas centrado en hoy, con weeksBefore atrás y weeksAfter adelante del evento
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const evento = new Date(fechaEvento + 'T12:00:00')

    const minDate = startOfWeek(today)
    minDate.setDate(minDate.getDate() - weeksBefore * 7)
    const maxDate = startOfWeek(evento)
    maxDate.setDate(maxDate.getDate() + (weeksAfter + 2) * 7) // +2 semanas extra para devoluciones

    // Si hay entries fuera de ese rango, ampliar
    for (const e of entries) {
        const ws = startOfWeek(e.fecha)
        if (ws < minDate) minDate.setTime(ws.getTime())
        if (ws > maxDate) maxDate.setTime(ws.getTime())
    }

    const semanas: CashflowSemana[] = []
    const cursor = new Date(minDate)
    while (cursor <= maxDate) {
        const weekStart = new Date(cursor)
        const segmentos = entries
            .filter(e => isSameWeek(e.fecha, weekStart))
            .map(e => e.segmento)
            .sort((a, b) => a.rubroNombre.localeCompare(b.rubroNombre, 'es'))

        const totalUSD = segmentos.reduce((s, x) => s + x.montoUSD, 0)
        semanas.push({
            weekStart,
            label: formatWeekLabel(weekStart),
            isToday: isSameWeek(today, weekStart),
            isEvento: isSameWeek(evento, weekStart),
            segmentos,
            totalUSD,
        })
        cursor.setDate(cursor.getDate() + 7)
    }

    // Recortar semanas vacías al inicio y al final (manteniendo today y evento)
    let firstNonEmpty = semanas.findIndex(s => s.segmentos.length > 0 || s.isToday || s.isEvento)
    let lastNonEmpty = semanas.length - 1
    while (lastNonEmpty > 0 && semanas[lastNonEmpty].segmentos.length === 0 && !semanas[lastNonEmpty].isEvento) lastNonEmpty--
    if (firstNonEmpty < 0) firstNonEmpty = 0
    return semanas.slice(firstNonEmpty, lastNonEmpty + 1)
}

// ─── Próximos pagos ──────────────────────────────────────────────────────────

export interface ProximoPago {
    id: string
    rubroId: string
    rubroNombre: string
    proveedor: string | null
    fecha: string
    monto: number       // monto en su moneda original
    moneda: string      // moneda en la que hay que pagar
    montoUSD: number    // equivalente USD para totales/orden
    descripcion: string | null
    tipo: TipoPagoLike
    isDeposito: boolean
}

export function calcProximosPagos(rubros: RubroLike[], tc: number, limit = 5): ProximoPago[] {
    const out: ProximoPago[] = []
    for (const r of rubros) {
        for (const p of r.pagos_proveedor ?? []) {
            if (p.realizado) continue
            out.push({
                id: p.id,
                rubroId: r.id,
                rubroNombre: r.nombre,
                proveedor: r.proveedor,
                fecha: p.fecha,
                monto: p.monto,
                moneda: p.moneda,
                montoUSD: toUSD(p.monto, p.moneda, p.tipo_cambio_snapshot, tc),
                descripcion: p.descripcion,
                tipo: (p.tipo ?? 'cuota') as TipoPagoLike,
                isDeposito: p.tipo === 'deposito_garantia',
            })
        }
    }
    return out
        .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
        .slice(0, limit)
}

// ─── Alertas ─────────────────────────────────────────────────────────────────

export interface Alerta {
    severidad: 'warning' | 'error'
    titulo: string
    mensaje: string
}

export function calcAlertas(rubros: RubroLike[], tc: number, presupuestoTotalUSD: number): Alerta[] {
    const out: Alerta[] = []
    const asignadoUSD = rubros.reduce((s, r) => s + rubroCostoUSD(r, tc), 0)

    if (presupuestoTotalUSD > 0 && asignadoUSD > presupuestoTotalUSD) {
        const exceso = asignadoUSD - presupuestoTotalUSD
        out.push({
            severidad: 'error',
            titulo: 'Presupuesto excedido',
            mensaje: `El asignado total (USD ${Math.round(asignadoUSD).toLocaleString('es-AR')}) supera al presupuesto en USD ${Math.round(exceso).toLocaleString('es-AR')}.`,
        })
    }

    // Rubros donde los pagos proyectados (todos, realizados o no) superan el costo
    for (const r of rubros) {
        const costo = rubroCostoUSD(r, tc)
        if (costo <= 0) continue
        const proyectado = (r.pagos_proveedor ?? [])
            .filter(p => p.tipo !== 'deposito_garantia') // depósitos no cuentan como gasto
            .reduce((s, p) => s + toUSD(p.monto, p.moneda, p.tipo_cambio_snapshot, tc), 0)
        if (proyectado > costo + 0.5) {
            out.push({
                severidad: 'warning',
                titulo: `${r.nombre}: pagos exceden el costo`,
                mensaje: `Pagos proyectados USD ${Math.round(proyectado).toLocaleString('es-AR')} sobre costo USD ${Math.round(costo).toLocaleString('es-AR')}.`,
            })
        }
    }

    return out
}

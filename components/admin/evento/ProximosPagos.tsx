'use client'

import type { ProximoPago } from '@/lib/presupuestoMetrics'

interface Props {
    pagos: ProximoPago[]
    formatAmount?: (usd: number) => string  // opcional, no usado: el monto se muestra en moneda original
}

const MESES_SHORT = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']

function fmt(n: number) {
    return n.toLocaleString('es-AR', { maximumFractionDigits: 0 })
}

export function ProximosPagos({ pagos }: Props) {
    if (pagos.length === 0) {
        return (
            <div style={{
                padding: '1.5rem',
                textAlign: 'center',
                color: 'var(--color-text-muted)',
                fontSize: '0.85rem',
                fontStyle: 'italic',
            }}>
                Sin pagos pendientes.
            </div>
        )
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {pagos.map(p => {
                const date = new Date(p.fecha + 'T12:00:00')
                const day = date.getDate().toString().padStart(2, '0')
                const month = MESES_SHORT[date.getMonth()]
                const dias = Math.round((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                const isUrgent = dias <= 14
                const isVencido = dias < 0

                return (
                    <div
                        key={p.id}
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '60px 1fr auto',
                            gap: '0.85rem',
                            alignItems: 'center',
                            padding: '0.65rem 0.8rem',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid',
                            borderColor: isVencido
                                ? 'var(--color-error)'
                                : isUrgent
                                    ? '#D97706'
                                    : 'var(--color-border)',
                            background: isVencido
                                ? 'rgba(198,40,40,0.04)'
                                : isUrgent
                                    ? 'rgba(217,119,6,0.04)'
                                    : 'var(--color-white)',
                        }}
                    >
                        <div style={{
                            fontFamily: 'var(--font-mono, monospace)',
                            fontSize: '0.72rem',
                            color: 'var(--color-gold-dark)',
                            textAlign: 'center',
                            textTransform: 'uppercase',
                            lineHeight: 1.2,
                        }}>
                            <span style={{ display: 'block', fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text)' }}>
                                {day}
                            </span>
                            {month}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem', minWidth: 0 }}>
                            <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                                {p.isDeposito && <span title="Depósito en garantía" style={{ marginRight: '0.35rem' }}>🔒</span>}
                                {p.rubroNombre}
                                {p.proveedor ? <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}> · {p.proveedor}</span> : null}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                {p.descripcion ?? (p.isDeposito ? 'Depósito en garantía' : 'Pago pendiente')}
                                {' · '}
                                {isVencido ? `vencido hace ${Math.abs(dias)} días` : dias === 0 ? 'hoy' : `en ${dias} días`}
                            </span>
                        </div>
                        <span style={{
                            fontWeight: 700,
                            color: isVencido ? 'var(--color-error)' : '#D97706',
                            fontFamily: 'var(--font-serif)',
                            whiteSpace: 'nowrap',
                        }}>
                            {p.moneda} {fmt(p.monto)}
                        </span>
                    </div>
                )
            })}
        </div>
    )
}

'use client'

import type { Alerta } from '@/lib/presupuestoMetrics'

interface Props {
    alertas: Alerta[]
}

export function BannerAlerta({ alertas }: Props) {
    if (alertas.length === 0) return null

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {alertas.map((a, i) => {
                const isError = a.severidad === 'error'
                const accentColor = isError ? 'var(--color-error)' : '#D97706'
                const bgColor = isError ? 'rgba(198,40,40,0.06)' : 'rgba(217,119,6,0.06)'
                const borderColor = isError ? 'rgba(198,40,40,0.25)' : 'rgba(217,119,6,0.25)'
                const textColor = isError ? '#8B1F1F' : '#8B5A06'

                return (
                    <div
                        key={i}
                        style={{
                            background: bgColor,
                            border: `1px solid ${borderColor}`,
                            borderLeft: `4px solid ${accentColor}`,
                            borderRadius: 'var(--radius-md)',
                            padding: '0.85rem 1.1rem',
                            display: 'flex',
                            gap: '0.85rem',
                            alignItems: 'flex-start',
                        }}
                    >
                        <span style={{
                            flexShrink: 0,
                            width: 22, height: 22,
                            borderRadius: '50%',
                            background: accentColor,
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            marginTop: 1,
                        }}>!</span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', minWidth: 0 }}>
                            <strong style={{ fontSize: '0.85rem', color: accentColor, fontWeight: 700 }}>
                                {a.titulo}
                            </strong>
                            <span style={{ fontSize: '0.85rem', color: textColor, fontWeight: 500, lineHeight: 1.45 }}>
                                {a.mensaje}
                            </span>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

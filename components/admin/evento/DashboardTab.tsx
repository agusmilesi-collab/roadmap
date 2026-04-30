'use client'

import { useState, useEffect, useMemo } from 'react'
import { DonutChart, DonutLegend } from './DonutChart'
import { CashflowSemanalChart, CashflowSemanalLegend } from './CashflowSemanalChart'
import { ProximosPagos } from './ProximosPagos'
import { BannerAlerta } from './BannerAlerta'
import {
    calcKPIs, calcDistribucion, calcCashflowSemanal,
    calcProximosPagos, calcAlertas,
    type RubroLike,
} from '@/lib/presupuestoMetrics'

interface Props {
    rubros: RubroLike[]
    presupuestoUsd: number | null
    tipoCambioInicial: number | null
    fechaEvento: string
}

function fmt(n: number, decimals = 0) {
    return n.toLocaleString('es-AR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

async function fetchDolarBlue(): Promise<number | null> {
    try {
        const res = await fetch('https://dolarapi.com/v1/dolares/blue', { cache: 'no-store' })
        const data = await res.json()
        return typeof data.venta === 'number' ? data.venta : null
    } catch { return null }
}

export function DashboardTab({ rubros, presupuestoUsd, tipoCambioInicial, fechaEvento }: Props) {
    const [tcBlue, setTcBlue] = useState<number>(tipoCambioInicial ?? 0)
    const [tcLoading, setTcLoading] = useState(true)
    const [showARS, setShowARS] = useState(false)

    useEffect(() => {
        fetchDolarBlue().then(val => {
            if (val !== null) setTcBlue(val)
            setTcLoading(false)
        })
    }, [])

    const tc = tcBlue > 0 ? tcBlue : 1
    const totalUSD = presupuestoUsd ?? 0

    const kpis = useMemo(() => calcKPIs(rubros, tc, totalUSD), [rubros, tc, totalUSD])
    const distribucion = useMemo(() => calcDistribucion(rubros, tc), [rubros, tc])
    const cashflow = useMemo(() => calcCashflowSemanal(rubros, tc, fechaEvento), [rubros, tc, fechaEvento])
    const proximos = useMemo(() => calcProximosPagos(rubros, tc, 5), [rubros, tc])
    const alertas = useMemo(() => calcAlertas(rubros, tc, totalUSD), [rubros, tc, totalUSD])

    const fmtAmt = (usd: number, decimals = 0) =>
        showARS ? `ARS ${fmt(usd * tc, decimals)}` : `USD ${fmt(usd, decimals)}`

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Banner alertas */}
            <BannerAlerta alertas={alertas} />

            {/* Estado financiero · KPIs */}
            <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                    <div>
                        <p style={st.cardEyebrow}>Estado financiero</p>
                        <p style={st.tcInfo}>
                            <span style={{ ...st.tcDot, backgroundColor: tcLoading ? '#D1D5DB' : '#22C55E' }} />
                            TC blue (dolarapi.com): <strong style={{ color: 'var(--color-text)' }}>$ {fmt(tc)} ARS/USD</strong>
                        </p>
                    </div>
                    <CurrencyToggle showARS={showARS} setShowARS={setShowARS} />
                </div>

                <div style={st.kpiGrid}>
                    <KPI label="Presupuesto total" value={fmtAmt(totalUSD)} secondary={`${rubros.length} rubros`} />
                    <KPI label="Asignado" value={fmtAmt(kpis.asignadoUSD)} secondary={`${kpis.pctAsignado}% del total`} variant="gold" />
                    <KPI label="Pagado" value={fmtAmt(kpis.pagadoUSD)} variant="green" />
                    <KPI
                        label="A pagar"
                        value={fmtAmt(kpis.aPagarUSD)}
                        secondary={`${kpis.pendientesCount} pago${kpis.pendientesCount === 1 ? '' : 's'} pendiente${kpis.pendientesCount === 1 ? '' : 's'}`}
                        variant="warn"
                    />
                </div>

                {totalUSD > 0 && (
                    <>
                        <div style={st.progressTrack}>
                            <div style={{ ...st.progressFill, width: `${kpis.pctAsignado}%`, background: kpis.asignadoUSD > totalUSD ? 'var(--color-error)' : 'linear-gradient(90deg, var(--color-olive), var(--color-gold))' }} />
                        </div>
                        <div style={st.progressMeta}>
                            <span>USD 0</span>
                            <span>{fmtAmt(kpis.asignadoUSD)} asignado</span>
                            <span>{fmtAmt(totalUSD)} total</span>
                        </div>
                    </>
                )}

                {kpis.depositosActivosUSD > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: '#2E7D32', padding: '0.4rem 0.7rem', background: 'rgba(46,125,50,0.06)', borderRadius: 'var(--radius-sm)', alignSelf: 'flex-start' }}>
                        <span>🔒</span>
                        Depósitos en garantía activos: <strong>{fmtAmt(kpis.depositosActivosUSD)}</strong>
                        <span style={{ color: 'var(--color-text-muted)' }}>· retornables al finalizar el evento</span>
                    </div>
                )}
            </div>

            {/* Distribución (donut) */}
            {distribucion.length > 0 && (
                <div className="card" style={{ padding: '1.25rem' }}>
                    <p style={st.cardEyebrow}>Distribución del gasto</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem', alignItems: 'center', marginTop: '0.85rem' }}
                         className="donut-grid">
                        <DonutChart
                            items={distribucion}
                            centerValue={fmtAmt(kpis.asignadoUSD)}
                            centerLabel="Asignado"
                        />
                        <DonutLegend items={distribucion} formatAmount={fmtAmt} />
                    </div>
                </div>
            )}

            {/* Cashflow */}
            {cashflow.length > 0 && (
                <div className="card" style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
                        <p style={st.cardEyebrow}>Cashflow de pagos</p>
                        <span style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>
                            {cashflow.length} semanas
                        </span>
                    </div>
                    <CashflowSemanalChart semanas={cashflow} formatAmount={fmtAmt} />
                    <CashflowSemanalLegend />
                </div>
            )}

            {/* Próximos pagos */}
            <div className="card" style={{ padding: '1.25rem' }}>
                <p style={{ ...st.cardEyebrow, marginBottom: '0.85rem' }}>Próximos pagos</p>
                <ProximosPagos pagos={proximos} formatAmount={fmtAmt} />
            </div>
        </div>
    )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function CurrencyToggle({ showARS, setShowARS }: { showARS: boolean; setShowARS: (v: boolean) => void }) {
    return (
        <div style={{ display: 'flex', borderRadius: '20px', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
            {(['USD', 'ARS'] as const).map(cur => (
                <button
                    key={cur}
                    type="button"
                    onClick={() => setShowARS(cur === 'ARS')}
                    style={{
                        padding: '0.28rem 0.9rem',
                        border: 'none',
                        cursor: 'pointer',
                        fontFamily: 'var(--font-sans)',
                        fontWeight: 600,
                        fontSize: '0.78rem',
                        backgroundColor: (cur === 'ARS') === showARS ? 'var(--color-gold)' : 'transparent',
                        color: (cur === 'ARS') === showARS ? 'white' : 'var(--color-text-muted)',
                        transition: 'background-color 0.15s, color 0.15s',
                    }}
                >{cur}</button>
            ))}
        </div>
    )
}

function KPI({ label, value, secondary, variant }: {
    label: string; value: string; secondary?: string; variant?: 'gold' | 'green' | 'warn'
}) {
    const valueColor =
        variant === 'gold' ? 'var(--color-gold-dark)' :
        variant === 'green' ? '#2E7D32' :
        variant === 'warn' ? '#D97706' :
        'var(--color-text)'
    return (
        <div style={{
            padding: '0.95rem 1rem',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-cream)',
            border: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.18rem',
        }}>
            <span style={{ fontSize: '0.66rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)' }}>
                {label}
            </span>
            <span style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', fontWeight: 700, lineHeight: 1.15, color: valueColor }}>
                {value}
            </span>
            {secondary && <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{secondary}</span>}
        </div>
    )
}

const st: Record<string, React.CSSProperties> = {
    cardEyebrow: {
        fontSize: '0.72rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: 'var(--color-text-muted)',
        margin: 0,
    },
    tcInfo: {
        fontSize: '0.74rem',
        color: 'var(--color-text-muted)',
        margin: '0.25rem 0 0',
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
    },
    tcDot: {
        width: 7, height: 7, borderRadius: '50%',
    },
    kpiGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '0.65rem',
    },
    progressTrack: {
        height: 8,
        background: 'var(--color-cream-dark)',
        borderRadius: 99,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 99,
        transition: 'width 0.5s ease',
    },
    progressMeta: {
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '0.72rem',
        color: 'var(--color-text-muted)',
        marginTop: '0.45rem',
        fontFamily: 'var(--font-mono, monospace)',
    },
}

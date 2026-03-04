// Read-only Presupuesto tab for the client view

interface Rubro {
    id: string
    nombre: string
    estado: string
    proveedor: string | null
    monto_original: number | null
    moneda: string
    sena_pct: number | null
    orden: number
    notas: string | null
}

interface Props {
    rubros: Rubro[]
    presupuestoUsd: number | null
    tipoCambio: number | null
}

const ESTADO_LABELS: Record<string, string> = {
    pendiente: 'Pendiente',
    en_proceso: 'En proceso',
    decidido: 'Decidido',
    señado: 'Señado',
    completado: 'Completado',
}

const ESTADO_STYLES: Record<string, React.CSSProperties> = {
    pendiente: { backgroundColor: 'rgba(120,120,120,0.08)', color: '#888' },
    en_proceso: { backgroundColor: 'rgba(201,168,76,0.15)', color: 'var(--color-gold-dark)' },
    decidido: { backgroundColor: 'rgba(107,124,92,0.15)', color: 'var(--color-olive)' },
    señado: { backgroundColor: 'rgba(138,109,174,0.15)', color: '#7B5EA7' },
    completado: { backgroundColor: 'rgba(40,167,69,0.12)', color: '#2E7D32' },
}

function fmt(n: number, decimals = 0) {
    return n.toLocaleString('es-AR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

export function PresupuestoClienteTab({ rubros, presupuestoUsd, tipoCambio }: Props) {
    const tc = (tipoCambio ?? 0) > 0 ? tipoCambio! : 1

    function montoUSD(r: Rubro) {
        if (!r.monto_original) return 0
        return r.moneda === 'USD' ? r.monto_original : r.monto_original / tc
    }

    const comprometido = rubros
        .filter((r) => r.estado !== 'pendiente')
        .reduce((sum, r) => sum + montoUSD(r), 0)

    const totalUSD = presupuestoUsd ?? 0
    const disponible = totalUSD - comprometido
    const pct = totalUSD > 0 ? Math.min(100, Math.round((comprometido / totalUSD) * 100)) : 0

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Tipo de cambio (display only) */}
            {tipoCambio && tipoCambio > 0 && (
                <div style={st.tcRow}>
                    <span style={st.tcLabel}>Tipo de cambio</span>
                    <span style={st.tcValue}>1 USD = {fmt(tipoCambio)} ARS</span>
                </div>
            )}

            {/* Summary cards */}
            <div style={st.grid}>
                <SummaryCard
                    label="Presupuesto total"
                    value={`USD ${fmt(totalUSD)}`}
                    sub={tipoCambio ? `ARS ${fmt(totalUSD * tc)}` : undefined}
                    color="var(--color-text)"
                />
                <SummaryCard
                    label="Comprometido"
                    value={`USD ${fmt(comprometido)}`}
                    sub={`${pct}% del total`}
                    color={comprometido > totalUSD ? 'var(--color-error)' : 'var(--color-gold-dark)'}
                />
                <SummaryCard
                    label="Disponible"
                    value={`USD ${fmt(Math.max(0, disponible))}`}
                    sub={disponible < 0 ? '⚠ Excedido' : undefined}
                    color={disponible < 0 ? 'var(--color-error)' : 'var(--color-olive)'}
                />
            </div>

            {/* Budget bar */}
            {totalUSD > 0 && (
                <div style={st.bar}>
                    <div style={{
                        ...st.barFill,
                        width: `${pct}%`,
                        backgroundColor: comprometido > totalUSD ? 'var(--color-error)' : 'var(--color-gold)',
                    }} />
                </div>
            )}

            {/* Rubros */}
            {rubros.length === 0 ? (
                <div style={st.empty}>No hay rubros definidos para este evento.</div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {/* Column headers */}
                    <div style={st.colHeaders}>
                        <span style={{ flex: 2 }}>Rubro</span>
                        <span>Estado</span>
                        <span>Proveedor</span>
                        <span style={{ textAlign: 'right' }}>Monto</span>
                        <span style={{ textAlign: 'right' }}>Equiv. USD</span>
                    </div>

                    {rubros.map((r) => {
                        const usd = montoUSD(r)
                        return (
                            <div key={r.id} style={st.rubroRow}>
                                <span style={{ flex: 2, fontWeight: 500, fontSize: '0.88rem' }}>{r.nombre}</span>
                                <span style={{ ...st.badge, ...ESTADO_STYLES[r.estado] }}>
                                    {ESTADO_LABELS[r.estado] ?? r.estado}
                                </span>
                                <span style={st.muted}>{r.proveedor || '—'}</span>
                                <span style={{ ...st.muted, textAlign: 'right', fontWeight: 500, whiteSpace: 'nowrap' }}>
                                    {r.monto_original ? `${fmt(r.monto_original)} ${r.moneda}` : '—'}
                                </span>
                                <span style={{ ...st.muted, textAlign: 'right', whiteSpace: 'nowrap' }}>
                                    {r.monto_original ? `USD ${fmt(usd, 0)}` : '—'}
                                </span>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

function SummaryCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
    return (
        <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-muted)' }}>{label}</span>
            <span style={{ fontSize: '1.1rem', fontWeight: 700, color, fontFamily: 'var(--font-serif)' }}>{value}</span>
            {sub && <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{sub}</span>}
        </div>
    )
}

const st: Record<string, React.CSSProperties> = {
    tcRow: { display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.5rem' },
    tcLabel: { fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)' },
    tcValue: { fontSize: '0.88rem', fontWeight: 600, color: 'var(--color-text)', padding: '0.25rem 0.65rem', backgroundColor: 'rgba(201,168,76,0.08)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(201,168,76,0.2)' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' },
    bar: { height: '8px', backgroundColor: 'var(--color-cream-dark)', borderRadius: '99px', overflow: 'hidden' },
    barFill: { height: '100%', borderRadius: '99px', transition: 'width 0.4s ease' },
    empty: { padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.9rem', fontStyle: 'italic' },
    colHeaders: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0 1rem', fontSize: '0.67rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)' },
    rubroRow: { display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem' },
    badge: { fontSize: '0.67rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0.15rem 0.5rem', borderRadius: '20px', whiteSpace: 'nowrap' },
    muted: { fontSize: '0.8rem', color: 'var(--color-text-muted)', minWidth: '70px' },
}

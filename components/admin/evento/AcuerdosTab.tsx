'use client'

// Vista read-only de todos los acuerdos del evento.
// Toma los datos directamente del árbol de fases → temas → acuerdos
// (los acuerdos se crean/editan desde la pestaña Progreso).

interface AcuerdoLite {
    id: string
    texto: string
    created_at: string
}

interface TemaLite {
    id: string
    nombre: string
    acuerdos?: AcuerdoLite[]
}

interface FaseLite {
    id: string
    nombre: string
    temas?: TemaLite[]
}

interface Props {
    fases: FaseLite[]
}

const MESES_LARGO = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

interface TemaConAcuerdos {
    temaId: string
    temaNombre: string
    acuerdos: AcuerdoLite[]
}

interface FaseConAcuerdos {
    faseId: string
    faseNombre: string
    faseIdx: number
    temas: TemaConAcuerdos[]
    totalAcuerdos: number
}

function groupAcuerdos(fases: FaseLite[]): { grupos: FaseConAcuerdos[]; total: number } {
    let total = 0
    const grupos: FaseConAcuerdos[] = fases
        .map((f, idx) => {
            const temas: TemaConAcuerdos[] = (f.temas ?? [])
                .map((t) => {
                    // Cronológico DESC dentro del tema (último acuerdo arriba)
                    const acuerdos = [...(t.acuerdos ?? [])].sort(
                        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                    )
                    return { temaId: t.id, temaNombre: t.nombre, acuerdos }
                })
                .filter(t => t.acuerdos.length > 0)
            const totalEtapa = temas.reduce((s, t) => s + t.acuerdos.length, 0)
            total += totalEtapa
            return {
                faseId: f.id,
                faseNombre: f.nombre,
                faseIdx: idx,
                temas,
                totalAcuerdos: totalEtapa,
            }
        })
        .filter(g => g.totalAcuerdos > 0)
    return { grupos, total }
}

function formatFecha(iso: string): { dia: string; mes: string; anio: string; relativo: string } {
    const d = new Date(iso)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const diff = Math.round((today.getTime() - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / (1000 * 60 * 60 * 24))
    let relativo: string
    if (diff === 0) relativo = 'Hoy'
    else if (diff === 1) relativo = 'Ayer'
    else if (diff < 7) relativo = `Hace ${diff} días`
    else if (diff < 30) relativo = `Hace ${Math.round(diff / 7)} semana${Math.round(diff / 7) === 1 ? '' : 's'}`
    else relativo = ''
    return {
        dia: String(d.getDate()).padStart(2, '0'),
        mes: MESES_LARGO[d.getMonth()].slice(0, 3).toUpperCase(),
        anio: String(d.getFullYear()),
        relativo,
    }
}

export function AcuerdosTab({ fases }: Props) {
    const { grupos, total } = groupAcuerdos(fases)

    if (total === 0) {
        return (
            <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                Aún no se registraron acuerdos en este evento.<br />
                <span style={{ fontSize: '0.78rem' }}>Los acuerdos se cargan desde la pestaña Progreso, dentro de cada tema.</span>
            </div>
        )
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Header estilo Progreso */}
            <div className="card" style={{ padding: '1.75rem 2rem 1.5rem' }}>
                <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.7rem', fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-gold-dark)' }}>
                    Acuerdos
                </div>
                <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: '1.375rem', fontWeight: 600, margin: '0.25rem 0 0.4rem', color: 'var(--color-text)', letterSpacing: '-0.015em', lineHeight: 1.2 }}>
                    Compromisos asumidos
                </h2>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.55 }}>
                    Decisiones tomadas durante el proceso, organizadas por etapa y tema.
                    {' · '}<strong style={{ color: 'var(--color-text)' }}>{total}</strong> acuerdo{total === 1 ? '' : 's'} registrado{total === 1 ? '' : 's'}.
                </p>
            </div>

            {/* Grupos por etapa */}
            {grupos.map(grupo => (
                <div key={grupo.faseId} className="card" style={{ padding: '1.5rem 2rem' }}>
                    {/* Header de etapa */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', paddingBottom: '0.85rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--color-border)', flexWrap: 'wrap' }}>
                        <span style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            minWidth: 32, height: 26, padding: '0 0.55rem', borderRadius: 99,
                            background: 'rgba(201,168,76,0.14)', color: 'var(--color-gold-dark)',
                            fontFamily: 'var(--font-mono, monospace)', fontSize: '0.72rem',
                            fontWeight: 700, letterSpacing: '0.06em',
                        }}>
                            E{grupo.faseIdx + 1}
                        </span>
                        <h3 style={{ margin: 0, fontFamily: 'var(--font-sans)', fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-text)', flex: 1, minWidth: 0 }}>
                            {grupo.faseNombre}
                        </h3>
                        <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.72rem', color: 'var(--color-text-faint)' }}>
                            {grupo.totalAcuerdos} acuerdo{grupo.totalAcuerdos === 1 ? '' : 's'}
                        </span>
                    </div>

                    {/* Temas dentro de la etapa */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {grupo.temas.map(tema => (
                            <div key={tema.temaId}>
                                <h4 style={{
                                    margin: '0 0 0.65rem',
                                    fontSize: '0.78rem',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.07em',
                                    color: 'var(--color-text)',
                                }}>
                                    {tema.temaNombre}
                                </h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                    {tema.acuerdos.map(a => {
                                        const f = formatFecha(a.created_at)
                                        return (
                                            <div
                                                key={a.id}
                                                style={{
                                                    display: 'grid',
                                                    gridTemplateColumns: '70px 1fr',
                                                    gap: '0.85rem',
                                                    padding: '0.5rem 0',
                                                }}
                                            >
                                                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
                                                    <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.05em', color: 'var(--color-gold-dark)', textTransform: 'uppercase' }}>
                                                        {f.dia} {f.mes}
                                                    </span>
                                                    <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.65rem', color: 'var(--color-text-faint)' }}>
                                                        {f.anio}
                                                    </span>
                                                </div>
                                                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-text)', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                                                    {a.texto}
                                                </p>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    )
}

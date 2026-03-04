// PlannerCard — read-only contact card for the assigned planner

interface PlannerCardProps {
    nombre: string
    email: string | null
    telefono: string | null
    foto_url?: string | null
    compact?: boolean
}

export function PlannerCard({ nombre, email, telefono, foto_url, compact = false }: PlannerCardProps) {
    const initials = nombre
        .split(' ')
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase()

    const avatarSize = compact ? '38px' : '56px'
    const avatarFontSize = compact ? '0.85rem' : '1.1rem'

    return (
        <div className="card" style={{ ...st.card, padding: compact ? '0.85rem 1.25rem' : '1.5rem', gap: compact ? '0.6rem' : '1rem' }}>
            <p style={st.label}>Tu planner</p>

            <div style={{ ...st.inner, gap: compact ? '0.75rem' : '1rem' }}>
                {/* Avatar */}
                {foto_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={foto_url} alt={nombre} style={{ ...st.avatar, width: avatarSize, height: avatarSize }} />
                ) : (
                    <div style={{ ...st.avatarFallback, width: avatarSize, height: avatarSize, fontSize: avatarFontSize }}>
                        {initials}
                    </div>
                )}

                {/* Info */}
                <div style={{ ...st.info, gap: compact ? '0.2rem' : '0.35rem' }}>
                    <p style={{ ...st.nombre, fontSize: compact ? '0.9rem' : '1.05rem' }}>{nombre}</p>

                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        {telefono && (
                            <a href={`tel:${telefono}`} style={st.contactLink}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.6a16 16 0 0 0 6.29 6.29l.96-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                                </svg>
                                {telefono}
                            </a>
                        )}

                        {email && (
                            <a href={`mailto:${email}`} style={st.contactLink}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="2" y="4" width="20" height="16" rx="2" />
                                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                                </svg>
                                {email}
                            </a>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

const st: Record<string, React.CSSProperties> = {
    card: {
        display: 'flex',
        flexDirection: 'column',
    },
    label: {
        fontSize: '0.68rem',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: 'var(--color-gold-dark)',
    },
    inner: {
        display: 'flex',
        alignItems: 'center',
    },
    avatar: {
        borderRadius: '50%',
        objectFit: 'cover' as const,
        border: '2px solid var(--color-border)',
        flexShrink: 0,
    },
    avatarFallback: {
        borderRadius: '50%',
        backgroundColor: 'var(--color-gold)',
        color: 'white',
        fontFamily: 'var(--font-serif)',
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    info: {
        display: 'flex',
        flexDirection: 'column',
    },
    nombre: {
        fontFamily: 'var(--font-serif)',
        fontWeight: 600,
        color: 'var(--color-text)',
    },
    contactLink: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        fontSize: '0.8rem',
        color: 'var(--color-text-muted)',
        textDecoration: 'none',
        transition: 'color 0.15s',
    },
}

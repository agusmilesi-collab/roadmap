// Elegant 404 / invalid token page
export function NotFoundPage() {
    return (
        <main style={st.main}>
            <div style={st.container}>
                {/* Decorative top */}
                <div style={st.ornament}>✦</div>

                <h1 style={st.heading}>Lo sentimos</h1>

                <p style={st.body}>
                    El enlace que seguiste no corresponde a ningún evento activo.
                    Es posible que el link haya cambiado o ya no esté disponible.
                </p>

                <div style={st.divider} />

                <p style={st.hint}>
                    Si creés que esto es un error, contactá a tu planner para que te envíe el link correcto.
                </p>
            </div>
        </main>
    )
}

const st: Record<string, React.CSSProperties> = {
    main: {
        minHeight: '100vh',
        backgroundColor: 'var(--color-cream)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
    },
    container: {
        maxWidth: '480px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1rem',
    },
    ornament: {
        fontSize: '2rem',
        color: 'var(--color-gold)',
        opacity: 0.5,
        marginBottom: '0.25rem',
    },
    heading: {
        fontFamily: 'var(--font-serif)',
        fontSize: '2rem',
        fontWeight: 400,
        color: 'var(--color-text)',
        letterSpacing: '-0.01em',
    },
    body: {
        fontSize: '0.95rem',
        color: 'var(--color-text-muted)',
        lineHeight: 1.7,
    },
    divider: {
        width: '40px',
        height: '1px',
        backgroundColor: 'var(--color-gold)',
        opacity: 0.4,
        margin: '0.25rem 0',
    },
    hint: {
        fontSize: '0.82rem',
        color: 'var(--color-text-muted)',
        fontStyle: 'italic',
        lineHeight: 1.6,
    },
}

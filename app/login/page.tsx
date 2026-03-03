'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    async function handleSubmit(e: FormEvent) {
        e.preventDefault()
        setError(null)
        setLoading(true)

        const supabase = createClient()
        const { error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (authError) {
            setError('Email o contraseña incorrectos. Verificá tus datos e intentá de nuevo.')
            setLoading(false)
            return
        }

        router.push('/dashboard')
        router.refresh()
    }

    return (
        <main style={styles.main}>
            <div style={styles.container}>
                {/* Logo / brand */}
                <div style={styles.brand}>
                    <span style={styles.brandIcon}>✦</span>
                    <h1 style={styles.brandName}>Event Planner</h1>
                    <p style={styles.brandTagline}>Panel de administración</p>
                </div>

                {/* Card */}
                <div className="card" style={styles.card}>
                    <h2 style={styles.cardTitle}>Iniciar sesión</h2>
                    <p style={styles.cardSubtitle}>Accedé con tu cuenta de organizador</p>

                    <form onSubmit={handleSubmit} style={styles.form} noValidate>
                        <div className="form-group">
                            <label htmlFor="email" className="form-label">
                                Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                className="form-input"
                                placeholder="tu@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoComplete="email"
                                autoFocus
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="password" className="form-label">
                                Contraseña
                            </label>
                            <input
                                id="password"
                                type="password"
                                className="form-input"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                autoComplete="current-password"
                            />
                        </div>

                        {error && (
                            <div className="alert-error" role="alert">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="btn-gold"
                            style={styles.submitBtn}
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <span style={styles.spinner} aria-hidden="true" />
                                    Ingresando…
                                </>
                            ) : (
                                'Ingresar'
                            )}
                        </button>
                    </form>
                </div>

                <p style={styles.footer}>
                    Solo el organizador tiene acceso a este panel.
                </p>
            </div>
        </main>
    )
}

const styles: Record<string, React.CSSProperties> = {
    main: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--color-cream)',
        padding: '2rem 1rem',
    },
    container: {
        width: '100%',
        maxWidth: '420px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1.75rem',
    },
    brand: {
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.35rem',
    },
    brandIcon: {
        fontSize: '1.75rem',
        color: 'var(--color-gold)',
        lineHeight: 1,
    },
    brandName: {
        fontFamily: 'var(--font-serif)',
        fontSize: '2rem',
        fontWeight: 600,
        color: 'var(--color-text)',
        letterSpacing: '-0.01em',
    },
    brandTagline: {
        fontFamily: 'var(--font-sans)',
        fontSize: '0.825rem',
        color: 'var(--color-text-muted)',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
    },
    card: {
        width: '100%',
    },
    cardTitle: {
        fontFamily: 'var(--font-serif)',
        fontSize: '1.35rem',
        fontWeight: 500,
        color: 'var(--color-text)',
        marginBottom: '0.25rem',
    },
    cardSubtitle: {
        fontFamily: 'var(--font-sans)',
        fontSize: '0.875rem',
        color: 'var(--color-text-muted)',
        marginBottom: '1.75rem',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1.1rem',
    },
    submitBtn: {
        marginTop: '0.5rem',
        width: '100%',
        padding: '0.8rem',
        fontSize: '0.95rem',
    },
    spinner: {
        display: 'inline-block',
        width: '14px',
        height: '14px',
        border: '2px solid rgba(255,255,255,0.3)',
        borderTopColor: 'white',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
    },
    footer: {
        fontSize: '0.775rem',
        color: 'var(--color-text-muted)',
        textAlign: 'center',
    },
}

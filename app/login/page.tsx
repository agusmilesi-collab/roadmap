'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { loginAction } from './actions'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [googleLoading, setGoogleLoading] = useState(false)

    async function handleGoogleLogin() {
        setError(null)
        setGoogleLoading(true)
        const supabase = createClient()
        const { error: oauthError } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        })
        if (oauthError) {
            setError(oauthError.message)
            setGoogleLoading(false)
        }
        // On success the browser is redirected to Google — no further handling needed
    }

    async function handleSubmit(e: FormEvent) {
        e.preventDefault()
        setError(null)
        setLoading(true)

        const result = await loginAction(email, password)

        if (result.error) {
            setError(result.error)
            setLoading(false)
            return
        }

        router.push(result.redirect ?? '/dashboard')
        router.refresh()
    }

    return (
        <main style={styles.main}>
            <div style={styles.container}>
                {/* Logo / brand */}
                <div style={styles.brand}>
                    <img src="/logo.svg" alt="TMP Eventos" style={{ height: '64px', width: 'auto', marginBottom: '0.25rem' }} />
                    <h1 style={styles.brandName}>
                        <span style={styles.brandIcon}>✦</span> TMP Eventos
                    </h1>
                    <p style={styles.brandTagline}>Panel de gestión</p>
                </div>

                {/* Card */}
                <div className="card" style={styles.card}>
                    <h2 style={styles.cardTitle}>Iniciar sesión</h2>
                    <p style={styles.cardSubtitle}>Ingresá con tu cuenta</p>

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
                            disabled={loading || googleLoading}
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

                    {/* Separator */}
                    <div style={styles.separator}>
                        <span style={styles.separatorLine} />
                        <span style={styles.separatorText}>o</span>
                        <span style={styles.separatorLine} />
                    </div>

                    {/* Google OAuth */}
                    <button
                        type="button"
                        style={styles.googleBtn}
                        onClick={handleGoogleLogin}
                        disabled={loading || googleLoading}
                    >
                        {googleLoading ? (
                            <>
                                <span style={{ ...styles.spinner, borderColor: 'rgba(0,0,0,0.15)', borderTopColor: '#555' }} aria-hidden="true" />
                                Redirigiendo…
                            </>
                        ) : (
                            <>
                                <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                                    <path fill="#4285F4" d="M46.14 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h12.44c-.54 2.9-2.16 5.36-4.6 7.01v5.82h7.44c4.36-4.01 6.86-9.92 6.86-16.84z" />
                                    <path fill="#34A853" d="M24 48c6.24 0 11.47-2.07 15.3-5.6l-7.44-5.82c-2.07 1.39-4.72 2.21-7.86 2.21-6.04 0-11.16-4.08-12.99-9.56H3.36v6.01C7.18 42.56 15.02 48 24 48z" />
                                    <path fill="#FBBC05" d="M11.01 29.23A14.43 14.43 0 0 1 10.5 24c0-1.82.31-3.58.51-5.23v-6.01H3.36A23.97 23.97 0 0 0 0 24c0 3.87.92 7.53 2.56 10.77l7.45-5.54z" />
                                    <path fill="#EA4335" d="M24 9.5c3.4 0 6.45 1.17 8.85 3.46l6.63-6.63C35.45 2.48 30.22 0 24 0 15.02 0 7.18 5.44 3.36 13.23l7.65 5.54C12.84 13.58 17.96 9.5 24 9.5z" />
                                </svg>
                                Continuar con Google
                            </>
                        )}
                    </button>
                </div>
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
    separator: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        margin: '1.25rem 0 0',
    },
    separatorLine: {
        flex: 1,
        height: '1px',
        backgroundColor: 'var(--color-border)',
    },
    separatorText: {
        fontSize: '0.78rem',
        color: 'var(--color-text-muted)',
        letterSpacing: '0.05em',
        textTransform: 'uppercase' as const,
        flexShrink: 0,
    },
    googleBtn: {
        marginTop: '0.75rem',
        width: '100%',
        padding: '0.75rem',
        fontSize: '0.92rem',
        fontWeight: 500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.65rem',
        backgroundColor: 'white',
        color: '#374151',
        border: '1px solid #D1D5DB',
        borderRadius: 'var(--radius-sm)',
        cursor: 'pointer',
        transition: 'border-color 0.15s, box-shadow 0.15s',
    },
}

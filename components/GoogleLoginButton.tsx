'use client'

import { createBrowserClient } from '@supabase/ssr'
import { useState } from 'react'

export default function GoogleLoginButton({
    disabled,
}: {
    disabled?: boolean
}) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function handleGoogleLogin() {
        setError(null)
        setLoading(true)
        const supabase = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)

        const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        })

        console.log('data:', data)
        console.log('error:', oauthError)

        if (oauthError) {
            setError(oauthError.message)
            setLoading(false)
        }
        // On success the browser is navigated to Google — nothing else to do
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={disabled || loading}
                style={btnStyle}
            >
                {loading ? (
                    <>
                        <span style={spinnerStyle} aria-hidden="true" />
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
            {error && (
                <p style={{ fontSize: '0.82rem', color: '#B91C1C', textAlign: 'center' }}>
                    {error}
                </p>
            )}
        </div>
    )
}

const btnStyle: React.CSSProperties = {
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
}

const spinnerStyle: React.CSSProperties = {
    display: 'inline-block',
    width: '14px',
    height: '14px',
    border: '2px solid rgba(0,0,0,0.12)',
    borderTopColor: '#555',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
}

'use client'

import { useState, useRef, useEffect } from 'react'
import { createSimulacion } from '@/app/(admin)/simulador/actions'

export function NuevaSimulacionButton() {
    const [open, setOpen] = useState(false)
    const [nombre, setNombre] = useState('')
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (open) {
            // Focus al input cuando se abre
            setTimeout(() => inputRef.current?.focus(), 50)
            // Bloquear scroll del body mientras está abierto
            document.body.style.overflow = 'hidden'
            return () => {
                document.body.style.overflow = ''
            }
        }
    }, [open])

    const close = () => {
        setOpen(false)
        setNombre('')
    }

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="btn-gold"
                style={{ gap: '0.4rem', paddingInline: '1.25rem' }}
            >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Nueva simulación
            </button>

            {open && (
                <div
                    style={styles.overlay}
                    onClick={close}
                    onKeyDown={(e) => {
                        if (e.key === 'Escape') close()
                    }}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="bienvenido-title"
                >
                    <form
                        action={createSimulacion}
                        onClick={(e) => e.stopPropagation()}
                        style={styles.modal}
                    >
                        <button
                            type="button"
                            onClick={close}
                            style={styles.closeBtn}
                            aria-label="Cerrar"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>

                        <div style={styles.logoWrap}>
                            <span style={styles.logo} aria-hidden>✦</span>
                            <span style={styles.brand}>TMP Eventos</span>
                        </div>

                        <h2 id="bienvenido-title" style={styles.title}>
                            Bienvenido
                        </h2>
                        <p style={styles.subtitle}>
                            Empecemos por darle un nombre a esta simulación.
                        </p>

                        <label htmlFor="nueva-sim-nombre" style={styles.label}>
                            Nombre de la simulación
                        </label>
                        <input
                            ref={inputRef}
                            id="nueva-sim-nombre"
                            type="text"
                            name="nombre"
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            placeholder="Ej: Boda Juan & María"
                            required
                            minLength={1}
                            maxLength={120}
                            style={styles.input}
                            onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                    e.preventDefault()
                                    close()
                                }
                            }}
                        />

                        <div style={styles.actions}>
                            <button
                                type="button"
                                onClick={close}
                                className="btn-ghost"
                                style={styles.cancelBtn}
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="btn-gold"
                                disabled={nombre.trim().length === 0}
                                style={styles.createBtn}
                            >
                                Crear simulación
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </>
    )
}

const styles: Record<string, React.CSSProperties> = {
    overlay: {
        position: 'fixed',
        inset: 0,
        background: 'rgba(44, 44, 44, 0.55)',
        backdropFilter: 'blur(3px)',
        WebkitBackdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        zIndex: 1000,
        animation: 'fadeIn 0.15s ease-out',
    },
    modal: {
        position: 'relative',
        background: 'var(--color-white)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)',
        padding: '2.75rem 2.25rem 2rem',
        width: '100%',
        maxWidth: 440,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.45rem',
        border: '1px solid var(--color-border)',
    },
    closeBtn: {
        position: 'absolute',
        top: '0.85rem',
        right: '0.85rem',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 32,
        height: 32,
        background: 'transparent',
        border: 'none',
        borderRadius: 'var(--radius-sm)',
        cursor: 'pointer',
        color: 'var(--color-text-muted)',
    },
    logoWrap: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.55rem',
        marginBottom: '0.85rem',
    },
    logo: {
        fontSize: '2.25rem',
        color: 'var(--color-gold)',
        lineHeight: 1,
    },
    brand: {
        fontFamily: 'var(--font-serif)',
        fontSize: '1.05rem',
        fontWeight: 500,
        letterSpacing: '0.01em',
        color: 'var(--color-text)',
    },
    title: {
        fontFamily: 'var(--font-serif)',
        fontSize: '1.85rem',
        fontWeight: 600,
        color: 'var(--color-text)',
        textAlign: 'center',
        margin: 0,
        lineHeight: 1.15,
    },
    subtitle: {
        fontSize: '0.9rem',
        color: 'var(--color-text-muted)',
        textAlign: 'center',
        margin: '0 0 1.5rem',
        lineHeight: 1.5,
    },
    label: {
        fontSize: '0.75rem',
        fontWeight: 500,
        color: 'var(--color-text-muted)',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        marginBottom: '0.4rem',
    },
    input: {
        fontFamily: 'var(--font-sans)',
        fontSize: '1rem',
        padding: '0.75rem 0.95rem',
        border: '1.5px solid var(--color-border)',
        borderRadius: 'var(--radius-sm)',
        background: 'var(--color-cream)',
        outline: 'none',
        color: 'var(--color-text)',
        transition: 'border-color 0.2s, box-shadow 0.2s',
    },
    actions: {
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: '0.5rem',
        marginTop: '1.75rem',
    },
    cancelBtn: {
        fontSize: '0.85rem',
        padding: '0.6rem 1rem',
    },
    createBtn: {
        fontSize: '0.9rem',
        padding: '0.7rem 1.4rem',
    },
}

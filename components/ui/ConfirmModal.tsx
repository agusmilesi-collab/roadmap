'use client'

import React from 'react'

interface ConfirmModalProps {
    isOpen: boolean
    title: string
    message: string
    confirmLabel?: string
    cancelLabel?: string
    danger?: boolean
    onConfirm: () => void
    onCancel: () => void
}

export function ConfirmModal({
    isOpen,
    title,
    message,
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    danger = true,
    onConfirm,
    onCancel,
}: ConfirmModalProps) {
    if (!isOpen) return null

    return (
        <div style={st.overlay} onClick={onCancel}>
            <div style={st.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
                <h3 style={st.title}>{title}</h3>
                <p style={st.message}>{message}</p>
                <div style={st.actions}>
                    <button
                        className="btn-ghost"
                        onClick={onCancel}
                        style={st.cancelBtn}
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={onConfirm}
                        style={danger ? st.dangerBtn : st.confirmBtn}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    )
}

const st: Record<string, React.CSSProperties> = {
    overlay: {
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        backdropFilter: 'blur(2px)',
    },
    modal: {
        backgroundColor: 'white',
        borderRadius: 'var(--radius)',
        padding: '1.75rem 2rem',
        width: '100%',
        maxWidth: '380px',
        boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
    },
    title: {
        fontFamily: 'var(--font-serif)',
        fontSize: '1.15rem',
        fontWeight: 600,
        color: 'var(--color-text)',
        margin: 0,
    },
    message: {
        fontSize: '0.875rem',
        color: 'var(--color-text-muted)',
        margin: 0,
        lineHeight: 1.5,
    },
    actions: {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '0.5rem',
        paddingTop: '0.5rem',
    },
    cancelBtn: {
        fontSize: '0.875rem',
    },
    dangerBtn: {
        padding: '0.5rem 1.1rem',
        backgroundColor: '#DC2626',
        color: 'white',
        border: 'none',
        borderRadius: 'var(--radius-sm)',
        fontSize: '0.875rem',
        fontWeight: 600,
        cursor: 'pointer',
        fontFamily: 'var(--font-sans)',
        transition: 'background-color 0.15s',
    },
    confirmBtn: {
        padding: '0.5rem 1.1rem',
        backgroundColor: 'var(--color-gold)',
        color: 'white',
        border: 'none',
        borderRadius: 'var(--radius-sm)',
        fontSize: '0.875rem',
        fontWeight: 600,
        cursor: 'pointer',
        fontFamily: 'var(--font-sans)',
    },
}

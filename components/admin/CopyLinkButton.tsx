'use client'

import { useState } from 'react'

interface CopyLinkButtonProps {
    token: string
    compact?: boolean
}

export function CopyLinkButton({ token, compact }: CopyLinkButtonProps) {
    const [copied, setCopied] = useState(false)

    async function handleCopy() {
        const url = `${window.location.origin}/evento/${token}`
        try {
            await navigator.clipboard.writeText(url)
        } catch {
            const ta = document.createElement('textarea')
            ta.value = url
            document.body.appendChild(ta)
            ta.select()
            document.execCommand('copy')
            document.body.removeChild(ta)
        }
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <button
            onClick={handleCopy}
            className="btn-ghost"
            style={{
                fontSize: compact ? '0.75rem' : '0.78rem',
                padding: compact ? '0.28rem 0' : '0.35rem 0.75rem',
                gap: compact ? '0.3rem' : '0.35rem',
                width: compact ? '108px' : undefined,
                justifyContent: compact ? 'center' : undefined,
                color: copied ? 'var(--color-olive)' : undefined,
                borderColor: copied ? 'var(--color-olive-light)' : undefined,
            }}
            title="Copiar link del cliente"
        >
            {copied ? (
                <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                    </svg>
                    ¡Copiado!
                </>
            ) : (
                <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </svg>
                    Link cliente
                </>
            )}
        </button>
    )
}

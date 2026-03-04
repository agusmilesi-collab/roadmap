// Public (cliente) layout — no auth required
export default function ClienteLayout({ children }: { children: React.ReactNode }) {
    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-cream)' }}>
            {children}
        </div>
    )
}

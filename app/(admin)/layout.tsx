import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase'

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    // Secondary auth check (middleware is the primary guard)
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-cream)' }}>
            {children}
        </div>
    )
}

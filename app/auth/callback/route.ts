import { createServerSupabaseClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(',').map((e) => e.trim()) ?? []

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')

    if (code) {
        const supabase = await createServerSupabaseClient()
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error && data.user) {
            const user = data.user

            // Auto-link planner if needed (same logic as email/password login)
            if (user.email && !ADMIN_EMAILS.includes(user.email)) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { data: planner } = await (supabase as any)
                    .from('planners')
                    .select('id, user_id')
                    .eq('email', user.email)
                    .maybeSingle() as { data: { id: string; user_id: string | null } | null }

                if (planner && !planner.user_id) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    await (supabase as any)
                        .from('planners')
                        .update({ user_id: user.id })
                        .eq('id', planner.id)
                }
            }

            const destination = ADMIN_EMAILS.includes(user.email ?? '') ? '/dashboard' : '/planner/dashboard'
            return NextResponse.redirect(`${origin}${destination}`)
        }
    }

    // On error fall back to login with a hint
    return NextResponse.redirect(`${origin}/login?error=oauth`)
}

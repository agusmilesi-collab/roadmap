'use server'

import { createServerSupabaseClient } from '@/lib/supabase'

const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(',').map((e) => e.trim()) ?? []

export async function loginAction(
    email: string,
    password: string
): Promise<{ redirect?: string; error?: string }> {
    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error || !data.user) {
        return { error: 'Email o contraseña incorrectos. Verificá tus datos e intentá de nuevo.' }
    }

    const user = data.user

    // If this user is a planner (not admin), auto-link their auth user_id to planners table
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

    // Determine redirect
    const redirectPath = ADMIN_EMAILS.includes(user.email ?? '') ? '/dashboard' : '/planner/dashboard'
    return { redirect: redirectPath }
}


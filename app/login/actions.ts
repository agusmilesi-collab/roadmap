'use server'

import { createServerSupabaseClient } from '@/lib/supabase'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? ''

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
    if (user.email !== ADMIN_EMAIL && user.email) {
        const { data: planner } = await supabase
            .from('planners')
            .select('id, user_id')
            .eq('email', user.email)
            .maybeSingle()

        if (planner && !planner.user_id) {
            await supabase
                .from('planners')
                .update({ user_id: user.id })
                .eq('id', planner.id)
        }
    }

    // Determine redirect
    const redirect = user.email === ADMIN_EMAIL ? '/dashboard' : '/planner/dashboard'
    return { redirect }
}

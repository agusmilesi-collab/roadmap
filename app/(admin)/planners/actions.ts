'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase'

// ─── Create planner ───────────────────────────────────────────────────────────

export async function createPlanner(formData: FormData) {
    const supabase = await createServerSupabaseClient()

    const nombre = (formData.get('nombre') as string).trim()
    const email = (formData.get('email') as string).trim() || null
    const telefono = (formData.get('telefono') as string).trim() || null
    const bio_corta = (formData.get('bio_corta') as string).trim() || null
    const foto_url = (formData.get('foto_url') as string).trim() || null

    if (!nombre) return { error: 'El nombre es requerido' }

    const { error } = await supabase
        .from('planners')
        .insert({ nombre, email, telefono, bio_corta, foto_url })

    if (error) return { error: error.message }

    revalidatePath('/planners')
    return { success: true }
}

// ─── Update planner ───────────────────────────────────────────────────────────

export async function updatePlanner(id: string, formData: FormData) {
    const supabase = await createServerSupabaseClient()

    const nombre = (formData.get('nombre') as string).trim()
    const email = (formData.get('email') as string).trim() || null
    const telefono = (formData.get('telefono') as string).trim() || null
    const bio_corta = (formData.get('bio_corta') as string).trim() || null
    const foto_url = (formData.get('foto_url') as string).trim() || null

    if (!nombre) return { error: 'El nombre es requerido' }

    const { error } = await supabase
        .from('planners')
        .update({ nombre, email, telefono, bio_corta, foto_url })
        .eq('id', id)

    if (error) return { error: error.message }

    revalidatePath('/planners')
    return { success: true }
}

// ─── Delete planner ───────────────────────────────────────────────────────────

export async function deletePlanner(id: string) {
    const supabase = await createServerSupabaseClient()

    const { error } = await supabase
        .from('planners')
        .delete()
        .eq('id', id)

    if (error) return { error: error.message }

    revalidatePath('/planners')
    return { success: true }
}

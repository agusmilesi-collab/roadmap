'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function deleteEvento(id: string) {
    const supabase = await createServerSupabaseClient()
    const { error } = await supabase.from('eventos').delete().eq('id', id)
    if (error) throw new Error(error.message)
    revalidatePath('/dashboard')
}

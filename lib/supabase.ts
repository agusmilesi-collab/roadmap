import { createBrowserClient, createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import type { Database } from './types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// ─── Browser client (Client Components) ──────────────────────────────────────
export function createClient() {
    return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
}

// ─── Server client (Server Components / Server Actions) ───────────────────────
// `cookies` is imported dynamically so this module stays safe to import from
// Client Components — the dynamic import is only evaluated on the server.
export async function createServerSupabaseClient() {
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
        cookies: {
            getAll() {
                return cookieStore.getAll()
            },
            setAll(cookiesToSet) {
                try {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        cookieStore.set(name, value, options)
                    )
                } catch {
                    // Server Component — cookies can't be set from here; middleware handles it
                }
            },
        },
    })
}

// ─── Middleware client ────────────────────────────────────────────────────────
export function createMiddlewareClient(
    request: NextRequest,
    response: NextResponse
) {
    return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
        cookies: {
            getAll() {
                return request.cookies.getAll()
            },
            setAll(cookiesToSet) {
                cookiesToSet.forEach(({ name, value }) =>
                    request.cookies.set(name, value)
                )
                cookiesToSet.forEach(({ name, value, options }) =>
                    response.cookies.set(name, value, options)
                )
            },
        },
    })
}

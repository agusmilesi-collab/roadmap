import { NextRequest, NextResponse } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? ''

// Paths that require ADMIN role
const ADMIN_PREFIXES = ['/dashboard', '/eventos', '/planners', '/plantillas']
// Paths that require any authenticated user (planner role)
const PLANNER_PREFIXES = ['/planner']

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl
    const response = NextResponse.next({ request })

    const supabase = createMiddlewareClient(request, response)

    // Refresh session — must call getUser() not getSession() as per @supabase/ssr docs
    const { data: { user } } = await supabase.auth.getUser()

    const isAdminPath = ADMIN_PREFIXES.some((p) => pathname.startsWith(p))
    const isPlannerPath = PLANNER_PREFIXES.some((p) => pathname.startsWith(p))
    const isLoginPage = pathname === '/login'

    const isAdmin = !!user && user.email === ADMIN_EMAIL
    const isAuthenticated = !!user

    // ── Not authenticated ──────────────────────────────────────────────────────
    if ((isAdminPath || isPlannerPath) && !isAuthenticated) {
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('redirectTo', pathname)
        return NextResponse.redirect(loginUrl)
    }

    // ── Wrong role: non-admin trying to access admin paths ─────────────────────
    if (isAdminPath && isAuthenticated && !isAdmin) {
        return NextResponse.redirect(new URL('/planner/dashboard', request.url))
    }

    // ── Wrong role: admin trying to access planner paths ──────────────────────
    if (isPlannerPath && isAdmin) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // ── Already authenticated on login page → redirect by role ────────────────
    if (isLoginPage && isAuthenticated) {
        const dest = isAdmin ? '/dashboard' : '/planner/dashboard'
        return NextResponse.redirect(new URL(dest, request.url))
    }

    return response
}

export const config = {
    matcher: [
        /*
         * Match all request paths EXCEPT:
         * - _next/static (static files)
         * - _next/image (image optimization)
         * - favicon.ico
         * - public folder assets
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}

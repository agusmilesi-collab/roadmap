import { NextRequest, NextResponse } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase'

const ADMIN_PATHS = ['/dashboard', '/eventos', '/planners', '/plantillas']

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl
    const response = NextResponse.next({ request })

    const supabase = createMiddlewareClient(request, response)

    // Refresh session — must call getUser() not getSession() as per @supabase/ssr docs
    const { data: { user } } = await supabase.auth.getUser()

    const isAdminPath = ADMIN_PATHS.some((p) => pathname.startsWith(p))
    const isLoginPage = pathname === '/login'

    // Not authenticated → redirect to login for admin routes
    if (isAdminPath && !user) {
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('redirectTo', pathname)
        return NextResponse.redirect(loginUrl)
    }

    // Already authenticated → skip login page
    if (isLoginPage && user) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
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

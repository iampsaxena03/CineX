import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { isValidSession, ADMIN_COOKIE } from '@/lib/auth'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const adminCookie = request.cookies.get(ADMIN_COOKIE)

  // Protect frontend Admin pages (excluding the login page itself)
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin-login')) {
    if (!adminCookie) {
      return NextResponse.redirect(new URL('/admin-login', request.url))
    }

    const valid = await isValidSession(adminCookie.value)
    if (!valid) {
      return NextResponse.redirect(new URL('/admin-login', request.url))
    }
  }

  // Protect backend Admin API routes (excluding the auth route)
  if (pathname.startsWith('/api/admin') && !pathname.startsWith('/api/admin/auth')) {
    if (!adminCookie) {
      return NextResponse.json({ error: 'Unauthorized Access' }, { status: 401 })
    }

    const valid = await isValidSession(adminCookie.value)
    if (!valid) {
      return NextResponse.json({ error: 'Unauthorized Access' }, { status: 401 })
    }
  }

  return NextResponse.next()
}

// Specify the paths the middleware should apply to
export const config = {
  matcher: [
    /*
     * Match all request paths starting with:
     * - admin (frontend)
     * - api/admin (backend APIs)
     */
    '/admin/:path*',
    '/api/admin/:path*'
  ],
}

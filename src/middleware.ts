import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only protect /admin routes (not /admin-login)
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin-login')) {
    const token = request.cookies.get('cinex_admin_session')?.value

    if (!token) {
      return NextResponse.redirect(new URL('/admin-login', request.url))
    }
    
    // Note: We can't check in-memory sessions from middleware (runs on edge)
    // The session check happens in the API routes. The presence of the cookie
    // is enough for the initial gate; API calls will reject expired sessions.
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}

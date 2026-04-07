import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { isValidSession } from '@/lib/auth'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only protect /admin routes (not /admin-login)
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin-login')) {
    const token = request.cookies.get('cinex_admin_session')?.value

    if (!token) {
      return NextResponse.redirect(new URL('/admin-login', request.url))
    }
    
    // Verify the JWT so that invalid/expired sessions are blocked at Edge
    const valid = await isValidSession(token)
    if (!valid) {
      return NextResponse.redirect(new URL('/admin-login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}

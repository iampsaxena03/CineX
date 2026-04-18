import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { isValidSessionFull, ADMIN_COOKIE } from '@/lib/auth'

// In-memory rate limiting for login attempts
const loginAttempts = new Map<string, { count: number; resetAt: number }>()
const MAX_LOGIN_ATTEMPTS = 5
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000 // 15 minutes

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('cf-connecting-ip') ||       // Cloudflare
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    '0.0.0.0'
  )
}

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = loginAttempts.get(ip)

  if (!entry || now > entry.resetAt) {
    return false
  }

  return entry.count >= MAX_LOGIN_ATTEMPTS
}

function recordLoginAttempt(ip: string): void {
  const now = Date.now()
  const entry = loginAttempts.get(ip)

  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
  } else {
    entry.count++
  }
}

// Periodically clean stale entries (runs passively)
function cleanupRateLimits(): void {
  const now = Date.now()
  for (const [ip, entry] of loginAttempts.entries()) {
    if (now > entry.resetAt) loginAttempts.delete(ip)
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ─── HTTPS Enforcement ───
  if (
    process.env.NODE_ENV !== 'development' &&
    request.headers.get('x-forwarded-proto') === 'http' &&
    !request.nextUrl.hostname.includes('localhost') &&
    !request.nextUrl.hostname.includes('127.0.0.1') &&
    !request.nextUrl.hostname.includes('0.0.0.0') &&
    !request.nextUrl.hostname.includes('192.168.')
  ) {
    const httpsUrl = request.nextUrl.clone()
    httpsUrl.protocol = 'https:'
    return NextResponse.redirect(httpsUrl)
  }

  // Clean stale rate limit entries
  if (loginAttempts.size > 100) cleanupRateLimits()

  // ─── Rate limit login attempts ───
  if (pathname === '/api/admin/auth' && request.method === 'POST') {
    const ip = getClientIp(request)
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Too many login attempts. Try again in 15 minutes.' },
        { status: 429 }
      )
    }
    recordLoginAttempt(ip)
    return NextResponse.next()
  }

  // ─── Allow auth check/logout endpoints ───
  if (pathname.startsWith('/api/admin/auth')) {
    return NextResponse.next()
  }

  // ─── Allow the login page itself ───
  if (pathname.startsWith('/admin-login')) {
    return NextResponse.next()
  }

  // ─── Get the session cookie ───
  const adminCookie = request.cookies.get(ADMIN_COOKIE)

  // ─── Protect frontend Admin pages ───
  if (pathname.startsWith('/admin')) {
    if (!adminCookie) {
      return NextResponse.redirect(new URL('/admin-login', request.url))
    }

    const valid = await isValidSessionFull(adminCookie.value)
    if (!valid) {
      // Clear the expired cookie
      const response = NextResponse.redirect(new URL('/admin-login', request.url))
      response.cookies.delete(ADMIN_COOKIE)
      return response
    }
  }

  // ─── Protect backend Admin API routes ───
  if (pathname.startsWith('/api/admin')) {
    if (!adminCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const valid = await isValidSessionFull(adminCookie.value)
    if (!valid) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 })
    }
  }

  // ─── Add security headers to ALL responses ───
  const response = NextResponse.next()

  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}

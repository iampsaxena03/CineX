import { NextResponse } from 'next/server'
import { ADMIN_COOKIE, isValidSessionFull } from '@/lib/auth'

/**
 * Defense-in-depth auth guard for admin API routes.
 * Call at the top of every admin API route handler.
 * Returns null if authenticated, or a 401 NextResponse if not.
 *
 * Usage:
 *   const authError = await requireAdmin(request)
 *   if (authError) return authError
 */
export async function requireAdmin(request: Request): Promise<NextResponse | null> {
  try {
    // Extract cookie from request header
    const cookieHeader = request.headers.get('cookie') || ''
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map(c => {
        const [key, ...val] = c.trim().split('=')
        return [key, val.join('=')]
      })
    )

    const token = cookies[ADMIN_COOKIE]
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const valid = await isValidSessionFull(token)
    if (!valid) {
      return NextResponse.json(
        { error: 'Session expired or revoked' },
        { status: 401 }
      )
    }

    return null // Authenticated ✓
  } catch {
    return NextResponse.json(
      { error: 'Authentication error' },
      { status: 401 }
    )
  }
}

import { NextResponse } from 'next/server'
import {
  validateCredentials,
  createSession,
  isValidSessionFull,
  revokeSession,
  revokeAllSessions,
  ADMIN_COOKIE,
  SESSION_COOKIE_OPTIONS,
} from '@/lib/auth'

// POST: Login
export async function POST(request: Request) {
  try {
    const { username, password } = await request.json()

    if (!validateCredentials(username, password)) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Create session in DB and get JWT
    const token = await createSession()

    const response = NextResponse.json({ success: true })
    response.cookies.set(ADMIN_COOKIE, token, SESSION_COOKIE_OPTIONS)

    return response
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

// GET: Check session validity
export async function GET(request: Request) {
  const cookieHeader = request.headers.get('cookie') || ''
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const [key, ...val] = c.trim().split('=')
      return [key, val.join('=')]
    })
  )

  const token = cookies[ADMIN_COOKIE]
  if (!token) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }

  const valid = await isValidSessionFull(token)
  if (!valid) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }

  return NextResponse.json({ authenticated: true })
}

// DELETE: Logout current device
export async function DELETE(request: Request) {
  const cookieHeader = request.headers.get('cookie') || ''
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const [key, ...val] = c.trim().split('=')
      return [key, val.join('=')]
    })
  )

  const token = cookies[ADMIN_COOKIE]
  if (token) {
    await revokeSession(token)
  }

  const response = NextResponse.json({ success: true })
  response.cookies.delete(ADMIN_COOKIE)
  return response
}

// PUT: Logout from ALL devices
export async function PUT() {
  const revokedCount = await revokeAllSessions()

  const response = NextResponse.json({
    success: true,
    message: `Logged out from all devices. ${revokedCount} session(s) revoked.`,
    revokedCount,
  })
  response.cookies.delete(ADMIN_COOKIE)
  return response
}

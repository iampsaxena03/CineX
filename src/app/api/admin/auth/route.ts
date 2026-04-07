import { NextResponse } from 'next/server'
import { validateCredentials, generateSessionToken, isValidSession, ADMIN_COOKIE } from '@/lib/auth'

// POST: Login
export async function POST(request: Request) {
  try {
    const { username, password } = await request.json()
    
    if (!validateCredentials(username, password)) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const token = await generateSessionToken()

    const response = NextResponse.json({ success: true })
    response.cookies.set(ADMIN_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    })

    return response
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

// GET: Check session
export async function GET(request: Request) {
  const cookieHeader = request.headers.get('cookie') || ''
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const [key, ...val] = c.trim().split('=')
      return [key, val.join('=')]
    })
  )
  
  const token = cookies[ADMIN_COOKIE]
  const valid = token ? await isValidSession(token) : false
  if (!valid) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }

  return NextResponse.json({ authenticated: true })
}

// DELETE: Logout
export async function DELETE(request: Request) {
  const cookieHeader = request.headers.get('cookie') || ''
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const [key, ...val] = c.trim().split('=')
      return [key, val.join('=')]
    })
  )
  
  // We just delete the cookie stateless
  const response = NextResponse.json({ success: true })
  response.cookies.delete(ADMIN_COOKIE)
  return response
}

import { NextResponse } from 'next/server'
import { validatePassword, generateSessionToken, createSession, isValidSession, deleteSession, ADMIN_COOKIE } from '@/lib/admin'

// POST: Login
export async function POST(request: Request) {
  try {
    const { password } = await request.json()
    
    if (!validatePassword(password)) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }

    const token = generateSessionToken()
    createSession(token)

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
  if (!token || !isValidSession(token)) {
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
  
  const token = cookies[ADMIN_COOKIE]
  if (token) deleteSession(token)

  const response = NextResponse.json({ success: true })
  response.cookies.delete(ADMIN_COOKIE)
  return response
}

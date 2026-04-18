import { SignJWT, jwtVerify } from 'jose'
import { prisma } from '@/lib/admin'

// Session cookie name
export const ADMIN_COOKIE = 'cinex_admin_session'

// Session duration: 3 hours
const SESSION_DURATION_HOURS = 3
const SESSION_DURATION_MS = SESSION_DURATION_HOURS * 60 * 60 * 1000
const SESSION_DURATION_SECONDS = SESSION_DURATION_HOURS * 60 * 60

// Get Secret — NEVER use a fallback in production
export const getJwtSecretKey = () => {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set. Cannot proceed without a secure secret key.')
  }
  return new TextEncoder().encode(secret)
}

// Validate admin credentials — NEVER use fallback credentials
export function validateCredentials(username?: string, password?: string): boolean {
  const adminUsername = process.env.ADMIN_USERNAME
  const adminPassword = process.env.ADMIN_PASSWORD
  if (!adminUsername || !adminPassword) {
    console.error('ADMIN_USERNAME or ADMIN_PASSWORD env vars are not set.')
    return false
  }
  // Constant-time-ish comparison to avoid timing attacks
  if (username?.length !== adminUsername.length || password?.length !== adminPassword.length) {
    return false
  }
  let mismatch = 0
  for (let i = 0; i < adminUsername.length; i++) {
    mismatch |= adminUsername.charCodeAt(i) ^ (username?.charCodeAt(i) ?? 0)
  }
  for (let i = 0; i < adminPassword.length; i++) {
    mismatch |= adminPassword.charCodeAt(i) ^ (password?.charCodeAt(i) ?? 0)
  }
  return mismatch === 0
}

// Hash a token using SHA-256 (for DB storage — never store raw JWT)
export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// Generate JWT Session token — 3 hour expiry
export async function generateSessionToken(): Promise<string> {
  const token = await new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_HOURS}h`)
    .sign(getJwtSecretKey())
  return token
}

// Validate JWT token signature + expiry only (no DB — for proxy layer)
export async function isValidSession(token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey())
    return payload.role === 'admin'
  } catch {
    return false
  }
}

// Full validation: JWT + DB session check (for route handlers)
export async function isValidSessionFull(token: string): Promise<boolean> {
  try {
    // 1. Verify JWT signature & expiry
    const { payload } = await jwtVerify(token, getJwtSecretKey())
    if (payload.role !== 'admin') return false

    // 2. Check session exists in DB (not revoked)
    const tokenH = await hashToken(token)
    const session = await prisma.adminSession.findUnique({
      where: { tokenHash: tokenH }
    })
    if (!session) return false

    // 3. Check DB-level expiry
    if (new Date() > session.expiresAt) {
      // Cleanup expired session
      await prisma.adminSession.delete({ where: { id: session.id } }).catch(() => {})
      return false
    }

    return true
  } catch {
    return false
  }
}

// Create a session in DB and return the JWT
export async function createSession(): Promise<string> {
  // Clean up expired sessions first
  await cleanExpiredSessions()

  const token = await generateSessionToken()
  const tokenH = await hashToken(token)
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS)

  await prisma.adminSession.create({
    data: {
      tokenHash: tokenH,
      expiresAt,
    }
  })

  return token
}

// Revoke a single session
export async function revokeSession(token: string): Promise<void> {
  try {
    const tokenH = await hashToken(token)
    await prisma.adminSession.delete({ where: { tokenHash: tokenH } })
  } catch {
    // Session may already be deleted
  }
}

// Revoke ALL sessions (log out from all devices)
export async function revokeAllSessions(): Promise<number> {
  const result = await prisma.adminSession.deleteMany({})
  return result.count
}

// Clean up expired sessions from DB
export async function cleanExpiredSessions(): Promise<void> {
  await prisma.adminSession.deleteMany({
    where: { expiresAt: { lt: new Date() } }
  })
}

// Session cookie options for consistent use
export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true, // Always true — site is on cinexp.site via Cloudflare HTTPS
  sameSite: 'strict' as const,
  maxAge: SESSION_DURATION_SECONDS,
  path: '/',
}

// Get session duration in hours (for UI display)
export const SESSION_DURATION_DISPLAY = `${SESSION_DURATION_HOURS} hours`

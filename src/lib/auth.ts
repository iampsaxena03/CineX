import { SignJWT, jwtVerify } from 'jose'

// Session cookie name
export const ADMIN_COOKIE = 'cinex_admin_session'

// Get Secret
export const getJwtSecretKey = () => {
  const secret = process.env.JWT_SECRET || 'fallback_secret_key_if_missing_123'
  return new TextEncoder().encode(secret)
}

// Validate admin credentials
export function validateCredentials(username?: string, password?: string): boolean {
  const adminUsername = process.env.ADMIN_USERNAME || 'whoareyou'
  const adminPassword = process.env.ADMIN_PASSWORD || 'mynameisjoker@8449'
  return username === adminUsername && password === adminPassword
}

// Generate JWT Session token
export async function generateSessionToken(): Promise<string> {
  const token = await new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h') // Expires after 24 hours
    .sign(getJwtSecretKey())
  return token
}

export async function isValidSession(token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey())
    return payload.role === 'admin'
  } catch (error) {
    return false
  }
}

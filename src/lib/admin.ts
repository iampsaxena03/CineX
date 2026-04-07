import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

// Prisma client singleton for admin operations (Prisma v7 requires driver adapter)
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function createPrismaClient() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma || createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Session cookie name
export const ADMIN_COOKIE = 'cinex_admin_session'

// Validate admin password
export function validatePassword(password: string): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD
  if (!adminPassword) return false
  return password === adminPassword
}

// Generate a simple session token
export function generateSessionToken(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  for (let i = 0; i < 64; i++) {
    token += chars[Math.floor(Math.random() * chars.length)]
  }
  return token
}

// In-memory session store (simple, resets on server restart)
const sessions = new Map<string, { createdAt: number }>()

export function createSession(token: string) {
  sessions.set(token, { createdAt: Date.now() })
}

export function isValidSession(token: string): boolean {
  const session = sessions.get(token)
  if (!session) return false
  // Expire after 24 hours
  const ONE_DAY = 24 * 60 * 60 * 1000
  if (Date.now() - session.createdAt > ONE_DAY) {
    sessions.delete(token)
    return false
  }
  return true
}

export function deleteSession(token: string) {
  sessions.delete(token)
}

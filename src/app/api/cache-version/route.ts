import { NextResponse } from 'next/server'
import { prisma } from '@/lib/admin'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Public endpoint — no auth required.
 * Returns the current CACHE_BUST_VERSION from AppSettings.
 * Clients compare this against their locally stored version
 * and clear localStorage when it changes.
 */
export async function GET() {
  try {
    const setting = await prisma.appSettings.findUnique({
      where: { key: 'CACHE_BUST_VERSION' },
    })
    return NextResponse.json(
      { version: setting?.value ?? '0' },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    )
  } catch {
    return NextResponse.json({ version: '0' })
  }
}

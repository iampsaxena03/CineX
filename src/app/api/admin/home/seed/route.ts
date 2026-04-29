import { NextResponse } from 'next/server'
import { prisma } from '@/lib/admin'
import { requireAdmin } from '@/lib/guard'

// Default maxItems for each section type
const TYPE_DEFAULTS: Record<string, number> = {
  top10: 10,
  trending: 6,
  countdown: 10,
  continue_watching: 20,
  recommended: 20,
  latest: 6,
  custom: 6,
}

// Seed default home sections if they don't exist, and fix maxItems for existing ones
const DEFAULT_SECTIONS = [
  { key: 'continue_watching', title: 'Continue Watching', type: 'continue_watching', order: 0 },
  { key: 'top_10', title: 'Top 10 in India Today', type: 'top10', order: 1 },
  { key: 'trending', title: 'Trending Now', type: 'trending', order: 2 },
  { key: 'recommended', title: 'Recommended for You', type: 'recommended', order: 3 },
]

export async function POST(request: Request) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  try {
    let created = 0
    let updated = 0
    for (const section of DEFAULT_SECTIONS) {
      const expectedMax = TYPE_DEFAULTS[section.type] ?? 20
      const existing = await prisma.homeSection.findUnique({
        where: { key: section.key }
      })
      if (!existing) {
        await prisma.homeSection.create({
          data: {
            key: section.key,
            title: section.title,
            type: section.type,
            order: section.order,
            visible: true,
            autoFill: true,
            maxItems: expectedMax,
          }
        })
        created++
      }
      // Note: We intentionally do NOT reset maxItems for existing sections.
      // The admin may have changed it via the "Visible titles on site" control.
    }
    return NextResponse.json({ success: true, created, updated, message: `${created} created, ${updated} fixed` })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json({ error: 'Failed to seed sections' }, { status: 500 })
  }
}

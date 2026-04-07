import { NextResponse } from 'next/server'
import { prisma } from '@/lib/admin'

// GET: List all media items that have download links
export async function GET() {
  try {
    const mediaPosts = await prisma.mediaPost.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 20,
      include: {
        _count: { select: { downloadLinks: true } },
        seasons: {
          include: {
            _count: { select: { episodes: true } }
          }
        }
      }
    })

    return NextResponse.json({ mediaPosts })
  } catch (error) {
    console.error('Media list error:', error)
    return NextResponse.json({ error: 'Failed to fetch media' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/admin'

// GET: Fetch all sections ordered
export async function GET() {
  try {
    const sections = await prisma.homeSection.findMany({
      orderBy: { order: 'asc' },
      include: {
        items: { orderBy: { position: 'asc' } },
        _count: { select: { items: true } }
      }
    })
    return NextResponse.json({ sections })
  } catch (error) {
    console.error('Sections GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch sections' }, { status: 500 })
  }
}

// Default visible counts per section type
const TYPE_DEFAULTS: Record<string, number> = {
  top10: 10, trending: 6, countdown: 10, latest: 6, custom: 6,
}

// POST: Create a new section
export async function POST(request: Request) {
  try {
    const { title, type, key } = await request.json()

    if (!title || !type || !key) {
      return NextResponse.json({ error: 'title, type, and key required' }, { status: 400 })
    }

    // Get next order number
    const maxOrder = await prisma.homeSection.aggregate({ _max: { order: true } })
    const newOrder = (maxOrder._max.order ?? -1) + 1

    const section = await prisma.homeSection.create({
      data: {
        title,
        type,
        key,
        order: newOrder,
        maxItems: TYPE_DEFAULTS[type] ?? 6,
      }
    })

    return NextResponse.json({ section })
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'A section with this key already exists' }, { status: 409 })
    }
    console.error('Sections POST error:', error)
    return NextResponse.json({ error: 'Failed to create section' }, { status: 500 })
  }
}

// PUT: Update sections (reorder, visibility, settings)
export async function PUT(request: Request) {
  try {
    const { sections } = await request.json()

    if (!Array.isArray(sections)) {
      return NextResponse.json({ error: 'sections array required' }, { status: 400 })
    }

    // Update each section's order and visibility
    await Promise.all(
      sections.map((s: any, index: number) =>
        prisma.homeSection.update({
          where: { id: s.id },
          data: {
            order: index,
            visible: s.visible ?? true,
            title: s.title,
            autoFill: s.autoFill ?? true,
            maxItems: s.maxItems ?? 20,
          }
        })
      )
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Sections PUT error:', error)
    return NextResponse.json({ error: 'Failed to update sections' }, { status: 500 })
  }
}

// DELETE: Remove a section
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const sectionId = searchParams.get('id')

  if (!sectionId) {
    return NextResponse.json({ error: 'Section ID required' }, { status: 400 })
  }

  try {
    await prisma.homeSection.delete({ where: { id: sectionId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Section DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete section' }, { status: 500 })
  }
}

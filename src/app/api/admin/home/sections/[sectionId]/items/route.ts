import { NextResponse } from 'next/server'
import { prisma } from '@/lib/admin'
import { requireAdmin } from '@/lib/guard'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'

// GET: Fetch items for a section
export async function GET(
  request: Request,
  { params }: { params: Promise<{ sectionId: string }> }
) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  const { sectionId } = await params

  try {
    const items = await prisma.homeSectionItem.findMany({
      where: { sectionId },
      orderBy: { position: 'asc' }
    })
    return NextResponse.json({ items })
  } catch (error) {
    console.error('Items GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 })
  }
}

// POST: Add item to section
export async function POST(
  request: Request,
  { params }: { params: Promise<{ sectionId: string }> }
) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  const { sectionId } = await params

  try {
    const body = await request.json()
    const schema = z.object({
      tmdbId: z.coerce.number().int().positive(),
      mediaType: z.enum(['movie', 'tv']),
      position: z.coerce.number().int().nonnegative().optional().nullable(),
      preferredStream: z.string().optional().nullable(),
    })

    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.format() }, { status: 400 })
    }
    const { tmdbId, mediaType, position, preferredStream } = parsed.data

    // Auto-assign position if not provided
    let pos = position
    if (pos === undefined || pos === null) {
      const max = await prisma.homeSectionItem.aggregate({
        where: { sectionId },
        _max: { position: true }
      })
      pos = (max._max.position ?? -1) + 1
    }

    // If position exists, shift items
    await prisma.homeSectionItem.updateMany({
      where: { sectionId, position: { gte: pos } },
      data: { position: { increment: 1 } }
    })

    const item = await prisma.homeSectionItem.create({
      data: {
        tmdbId,
        mediaType,
        position: pos,
        preferredStream: preferredStream || null,
        sectionId,
      }
    })

    revalidatePath('/')
    return NextResponse.json({ item })
  } catch (error: any) {
    console.error('Items POST error:', error)
    return NextResponse.json({ error: 'Failed to add item' }, { status: 500 })
  }
}

// PUT: Batch update items for a section
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ sectionId: string }> }
) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  const { sectionId } = await params

  try {
    const body = await request.json()
    const schema = z.object({
      items: z.array(z.object({
        tmdbId: z.coerce.number().int().positive(),
        mediaType: z.enum(['movie', 'tv']),
        position: z.coerce.number().int().nonnegative(),
        preferredStream: z.string().optional().nullable(),
      }))
    })

    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.format() }, { status: 400 })
    }
    const { items } = parsed.data

    // Delete all items and re-create in exact provided positions
    await prisma.homeSectionItem.deleteMany({ where: { sectionId } })

    if (items.length > 0) {
      await prisma.homeSectionItem.createMany({
        data: items.map((item: any) => ({
          tmdbId: item.tmdbId,
          mediaType: item.mediaType,
          position: item.position,
          preferredStream: item.preferredStream || null,
          sectionId,
        }))
      })
    }

    revalidatePath('/')
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Items PUT error:', error)
    return NextResponse.json({ error: 'Failed to batch update items' }, { status: 500 })
  }
}

// DELETE: Remove item
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ sectionId: string }> }
) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  const { sectionId } = await params
  const { searchParams } = new URL(request.url)
  const itemId = searchParams.get('itemId')

  if (!itemId) {
    return NextResponse.json({ error: 'itemId required' }, { status: 400 })
  }

  try {
    await prisma.homeSectionItem.delete({ where: { id: itemId } })

    // Re-normalize positions
    const remaining = await prisma.homeSectionItem.findMany({
      where: { sectionId },
      orderBy: { position: 'asc' }
    })

    await Promise.all(
      remaining.map((item: any, index: number) =>
        prisma.homeSectionItem.update({
          where: { id: item.id },
          data: { position: index }
        })
      )
    )

    revalidatePath('/')
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Items DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 })
  }
}

// PATCH: Update item (e.g. preferredStream)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ sectionId: string }> }
) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  const { sectionId } = await params
  
  try {
    const { itemId, preferredStream } = await request.json()

    if (!itemId) {
      return NextResponse.json({ error: 'itemId required' }, { status: 400 })
    }

    const updated = await prisma.homeSectionItem.update({
      where: { id: itemId, sectionId },
      data: { preferredStream: preferredStream || null }
    })

    revalidatePath('/')
    return NextResponse.json({ item: updated })
  } catch (error) {
    console.error('Items PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 })
  }
}

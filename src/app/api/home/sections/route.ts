import { NextResponse } from 'next/server'
import { prisma } from '@/lib/admin'

// Public API: Get visible home sections with their items
export async function GET() {
  try {
    const sections = await prisma.homeSection.findMany({
      where: { visible: true },
      orderBy: { order: 'asc' },
      include: {
        items: { orderBy: { position: 'asc' } }
      }
    })
    return NextResponse.json({ sections })
  } catch (error) {
    console.error('Public home sections error:', error)
    return NextResponse.json({ sections: [] })
  }
}

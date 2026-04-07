import { NextResponse } from 'next/server'
import { prisma } from '@/lib/admin'
import { revalidatePath } from 'next/cache'

export async function POST(request: Request) {
  try {
    const { action } = await request.json()

    switch (action) {
      case 'revalidate_home':
        revalidatePath('/')
        return NextResponse.json({ success: true, message: 'Home page cache cleared' })

      case 'revalidate_all':
        revalidatePath('/', 'layout')
        return NextResponse.json({ success: true, message: 'All page caches cleared' })

      case 'reset_home_layout':
        await prisma.homeSectionItem.deleteMany({})
        await prisma.homeSection.deleteMany({})
        return NextResponse.json({ success: true, message: 'Home layout reset' })

      case 'delete_all_downloads':
        await prisma.downloadLink.deleteMany({})
        return NextResponse.json({ success: true, message: 'All download links deleted' })

      case 'db_stats':
        const [mediaCount, downloadCount, sectionCount, itemCount] = await Promise.all([
          prisma.mediaPost.count(),
          prisma.downloadLink.count(),
          prisma.homeSection.count(),
          prisma.homeSectionItem.count(),
        ])
        return NextResponse.json({
          success: true,
          stats: { mediaCount, downloadCount, sectionCount, itemCount }
        })

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Settings action error:', error)
    return NextResponse.json({ error: 'Action failed' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/admin'

// GET: Fetch download links for a specific tmdbId + type
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const tmdbId = searchParams.get('tmdbId')
  const type = searchParams.get('type')

  if (!tmdbId || !type) {
    return NextResponse.json({ error: 'tmdbId and type required' }, { status: 400 })
  }

  try {
    const mediaPost = await prisma.mediaPost.findUnique({
      where: { tmdbId: parseInt(tmdbId) },
      include: {
        downloadLinks: { orderBy: { createdAt: 'asc' } },
        seasons: {
          orderBy: { seasonNumber: 'asc' },
          include: {
            episodes: {
              orderBy: { episodeNumber: 'asc' },
              include: {
                downloadLinks: { orderBy: { createdAt: 'asc' } }
              }
            }
          }
        }
      }
    })

    return NextResponse.json({ mediaPost })
  } catch (error) {
    console.error('Downloads GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch downloads' }, { status: 500 })
  }
}

// POST: Create/update download links
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { tmdbId, type, links, episodeLinks } = body

    if (!tmdbId || !type) {
      return NextResponse.json({ error: 'tmdbId and type required' }, { status: 400 })
    }

    // Upsert the media post
    const mediaPost = await prisma.mediaPost.upsert({
      where: { tmdbId: parseInt(tmdbId) },
      create: { tmdbId: parseInt(tmdbId), type },
      update: { type },
    })

    // Handle movie-level download links
    if (links && Array.isArray(links)) {
      // Delete existing movie-level links
      await prisma.downloadLink.deleteMany({
        where: { mediaPostId: mediaPost.id, episodeId: null }
      })

      // Create new links
      if (links.length > 0) {
        await prisma.downloadLink.createMany({
          data: links.map((link: any) => ({
            quality: link.quality,
            label: link.label,
            size: link.size,
            url: link.url,
            mediaPostId: mediaPost.id,
          }))
        })
      }
    }

    // Handle episode-level download links
    if (episodeLinks && typeof episodeLinks === 'object') {
      for (const [seasonNum, episodes] of Object.entries(episodeLinks) as [string, any][]) {
        // Upsert season
        const season = await prisma.season.upsert({
          where: {
            mediaPostId_seasonNumber: {
              mediaPostId: mediaPost.id,
              seasonNumber: parseInt(seasonNum),
            }
          },
          create: {
            seasonNumber: parseInt(seasonNum),
            mediaPostId: mediaPost.id,
          },
          update: {},
        })

        for (const [epNum, epLinks] of Object.entries(episodes) as [string, any][]) {
          // Upsert episode
          const episode = await prisma.episode.upsert({
            where: {
              seasonId_episodeNumber: {
                seasonId: season.id,
                episodeNumber: parseInt(epNum),
              }
            },
            create: {
              episodeNumber: parseInt(epNum),
              seasonId: season.id,
            },
            update: {},
          })

          // Delete existing episode links
          await prisma.downloadLink.deleteMany({
            where: { episodeId: episode.id }
          })

          // Create new links
          if (Array.isArray(epLinks) && epLinks.length > 0) {
            await prisma.downloadLink.createMany({
              data: epLinks.map((link: any) => ({
                quality: link.quality,
                label: link.label,
                size: link.size,
                url: link.url,
                episodeId: episode.id,
              }))
            })
          }
        }
      }
    }

    return NextResponse.json({ success: true, mediaPostId: mediaPost.id })
  } catch (error) {
    console.error('Downloads POST error:', error)
    return NextResponse.json({ error: 'Failed to save downloads' }, { status: 500 })
  }
}

// DELETE: Remove specific download links or all for a media post
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const linkId = searchParams.get('linkId')
  const tmdbId = searchParams.get('tmdbId')

  try {
    if (linkId) {
      await prisma.downloadLink.delete({ where: { id: linkId } })
    } else if (tmdbId) {
      const mediaPost = await prisma.mediaPost.findUnique({
        where: { tmdbId: parseInt(tmdbId) }
      })
      if (mediaPost) {
        await prisma.downloadLink.deleteMany({ where: { mediaPostId: mediaPost.id } })
      }
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Downloads DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}

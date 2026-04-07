import { NextResponse } from 'next/server'
import { prisma } from '@/lib/admin'

// Public API: Get download links for a media item (used by public site)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const tmdbId = searchParams.get('tmdbId')
  const type = searchParams.get('type')
  const season = searchParams.get('season')
  const episode = searchParams.get('episode')

  if (!tmdbId) {
    return NextResponse.json({ links: [] })
  }

  try {
    const mediaPost = await prisma.mediaPost.findUnique({
      where: { tmdbId: parseInt(tmdbId) },
      include: {
        downloadLinks: { orderBy: { createdAt: 'asc' } },
        seasons: {
          include: {
            episodes: {
              include: {
                downloadLinks: { orderBy: { createdAt: 'asc' } }
              }
            }
          }
        }
      }
    })

    if (!mediaPost) {
      return NextResponse.json({ links: [], episodeLinks: [] })
    }

    // Movie-level links
    const movieLinks = mediaPost.downloadLinks || []

    // If requesting specific episode
    if (season && episode) {
      const s = mediaPost.seasons.find(s => s.seasonNumber === parseInt(season))
      const ep = s?.episodes.find(e => e.episodeNumber === parseInt(episode))
      const epLinks = ep?.downloadLinks || []
      return NextResponse.json({ links: movieLinks, episodeLinks: epLinks })
    }

    return NextResponse.json({ links: movieLinks })
  } catch (error) {
    console.error('Public downloads error:', error)
    return NextResponse.json({ links: [] })
  }
}

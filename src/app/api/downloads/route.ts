import { NextResponse } from 'next/server'
import { prisma } from '@/lib/admin'

const ASIAN_COUNTRIES = [
  'IN', 'PK', 'BD', 'LK', 'NP', 'ID', 'MY', 'PH', 'SG', 'TH', 'VN', 
  'CN', 'JP', 'KR', 'TW', 'HK', 'MM', 'KH', 'LA', 'BN', 'MO', 'MV', 
  'BT', 'AF', 'IR'
]

async function getShortenedLink(originalUrl: string, region: 'asia' | 'global') {
  try {
    // 1. Check cache
    const cached = await prisma.shortenedLink.findUnique({
      where: {
        originalUrl_region: {
          originalUrl,
          region
        }
      }
    })

    if (cached) {
      return cached.shortUrl
    }

    let shortUrl = originalUrl

    // 2. Query respective Shortener API
    if (region === 'asia') {
      const apiToken = process.env.GPLINKS_API_TOKEN
      if (apiToken) {
        // GPlinks API endpoint format=text
        const url = `https://api.gplinks.com/api?api=${apiToken}&url=${encodeURIComponent(originalUrl)}&format=text`
        const res = await fetch(url, { cache: 'no-store' })
        if (res.ok) {
          const text = await res.text()
          if (text && text.startsWith('http')) shortUrl = text.trim()
        } else {
          console.error('[Shortener] GPlinks API failed:', res.status, await res.text())
        }
      } else {
        console.warn('[Shortener] GPLINKS_API_TOKEN is missing in environment variables.')
      }
    } else {
      const apiToken = process.env.EXEIO_API_TOKEN
      if (apiToken) {
        // Exe.io API endpoint format=text
        const url = `https://exe.io/api?api=${apiToken}&url=${encodeURIComponent(originalUrl)}&format=text`
        const res = await fetch(url, { cache: 'no-store' })
        if (res.ok) {
          const text = await res.text()
          if (text && text.startsWith('http')) shortUrl = text.trim()
        } else {
          console.error('[Shortener] Exe.io API failed:', res.status, await res.text())
        }
      } else {
        console.warn('[Shortener] EXEIO_API_TOKEN is missing in environment variables.')
      }
    }

    // 3. Save to Cache if shortened successfully
    if (shortUrl !== originalUrl && shortUrl.length > 0) {
      await prisma.shortenedLink.create({
        data: {
          originalUrl,
          region,
          shortUrl
        }
      })
    }

    return shortUrl
  } catch (error) {
    console.error(`Shortener API error for ${region}:`, error)
    return originalUrl
  }
}

// Public API: Get download links for a media item (used by public site)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const tmdbId = searchParams.get('tmdbId')
  const type = searchParams.get('type')
  const season = searchParams.get('season')
  const episode = searchParams.get('episode')

  if (!tmdbId) {
    return NextResponse.json({ links: [], episodeLinks: [] })
  }

  // Determine Region from Request Headers (Geolocated by Vercel)
  const country = request.headers.get('x-vercel-ip-country') || 'US'
  const region = ASIAN_COUNTRIES.includes(country) ? 'asia' : 'global'

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

    let movieLinks: any[] = []
    let episodeLinks: any[] = []

    if (mediaPost) {
      movieLinks = mediaPost.downloadLinks || []
      
      // If requesting specific episode
      if (season && episode) {
        const s = mediaPost.seasons.find(s => s.seasonNumber === parseInt(season))
        const ep = s?.episodes.find(e => e.episodeNumber === parseInt(episode))
        episodeLinks = ep?.downloadLinks || []
      }
    }

    // Handle Fallbacks for missing admin download links
    const isMovie = type === 'movie' || (!type && !season && !episode)
    const isTvEpisode = type === 'tv' && season && episode

    if ((isMovie && movieLinks.length === 0) || (isTvEpisode && episodeLinks.length === 0)) {
      // Check if URL shortener is globally enabled (defaults to true)
      const setting = await prisma.appSettings.findUnique({ where: { key: 'SHORTENER_ENABLED' } })
      const isShortenerEnabled = setting?.value !== "false"

      if (isMovie && movieLinks.length === 0) {
        const originalUrl = `https://dl.vidsrc.vip/movie/${tmdbId}`
        const shortUrl = isShortenerEnabled ? await getShortenedLink(originalUrl, region) : originalUrl
        movieLinks.push({
          id: `mirror-movie-${tmdbId}`,
          quality: "Max",
          label: isShortenerEnabled ? "High-Speed Mirror" : "Direct Mirror",
          size: "",
          url: shortUrl
        })
      } else if (isTvEpisode && episodeLinks.length === 0) {
        const originalUrl = `https://dl.vidsrc.vip/tv/${tmdbId}/${season}/${episode}`
        const shortUrl = isShortenerEnabled ? await getShortenedLink(originalUrl, region) : originalUrl
        episodeLinks.push({
          id: `mirror-tv-${tmdbId}-${season}-${episode}`,
          quality: "Max",
          label: isShortenerEnabled ? "High-Speed Mirror" : "Direct Mirror",
          size: "",
          url: shortUrl
        })
      }
    }

    return NextResponse.json({ links: movieLinks, episodeLinks })
  } catch (error) {
    console.error('Public downloads error:', error)
    return NextResponse.json({ links: [], episodeLinks: [] })
  }
}

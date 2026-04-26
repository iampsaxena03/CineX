import { NextResponse } from 'next/server'
import { prisma } from '@/lib/admin'
import { getDetails } from '@/lib/tmdb'
import { searchMovieBox, getMovieBoxDetails, getMovieBoxDownloadSources } from '@/lib/moviebox'

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

  // Determine Region from Request Headers (Geolocated by Cloudflare/Vercel)
  const country = request.headers.get('cf-ipcountry') || request.headers.get('x-vercel-ip-country') || 'US'
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

    const noAdminMovieLinks = isMovie && movieLinks.length === 0;
    const noAdminEpisodeLinks = isTvEpisode && episodeLinks.length === 0;

    if (noAdminMovieLinks || noAdminEpisodeLinks) {
      // 1. Fetch from MovieBox API
      try {
        let titleToSearch: string | undefined;
        if (!titleToSearch) {
          const tmdbData = await getDetails(type === 'tv' ? 'tv' : 'movie', tmdbId);
          titleToSearch = type === 'tv' ? (tmdbData as any)?.name : (tmdbData as any)?.title;
        }

        if (titleToSearch) {
          const searchResults = await searchMovieBox(titleToSearch, type as 'movie' | 'tv');
          const match = searchResults.find((r: any) => r.title?.toLowerCase() === titleToSearch?.toLowerCase()) || searchResults[0];

          if (match && match.subjectId) {
            const mboxDetails = await getMovieBoxDetails(match.subjectId);
            if (mboxDetails && mboxDetails.detailPath) {
              const fetchS = season ? parseInt(season as string) : 0;
              const fetchE = episode ? parseInt(episode as string) : 0;
              const result = await getMovieBoxDownloadSources(match.subjectId, mboxDetails.detailPath, fetchS, fetchE);
              const safeTitle = titleToSearch?.replace(/[^a-zA-Z0-9]/g, '_') || 'CineXP_Title';

              // Build subtitle proxy URL if available
              let subtitleProxyUrl = '';
              if (result.subtitle && result.subtitle.url) {
                const subFilename = `${safeTitle}_CineXP.srt`;
                subtitleProxyUrl = `/api/proxy/moviebox?url=${encodeURIComponent(result.subtitle.url)}&filename=${encodeURIComponent(subFilename)}&cb=${Date.now()}`;
              }

              result.sources.forEach((s: any) => {
                const linkObj = {
                  id: `moviebox-${s.id}`,
                  quality: s.quality + 'p',
                  label: s.quality + 'p',
                  size: s.size ? (parseInt(s.size) / (1024 * 1024)).toFixed(0) + ' MB' : '',
                  url: s.directUrl, // DIRECT url to prevent Vercel bandwidth billing
                  subtitleUrl: subtitleProxyUrl || undefined,
                  isMoviebox: true
                };

                if (isTvEpisode) {
                  episodeLinks.push(linkObj);
                } else {
                  movieLinks.push(linkObj);
                }
              });
            }
          }
        }
      } catch (error) {
        console.error('[Downloads Route] MovieBox fetch failed:', error);
      }

      // 2. Fetch from Vidsrc VIP (Original Fallback)
      // Check if URL shortener is globally enabled (defaults to true)
      const setting = await prisma.appSettings.findUnique({ where: { key: 'SHORTENER_ENABLED' } })
      const isShortenerEnabled = setting?.value !== "false"

      if (noAdminMovieLinks) {
        const originalUrl = `https://dl.vidsrc.vip/movie/${tmdbId}`
        const shortUrl = isShortenerEnabled ? await getShortenedLink(originalUrl, region) : originalUrl
        movieLinks.push({
          id: `mirror-movie-${tmdbId}`,
          quality: "Max",
          label: isShortenerEnabled ? "High-Speed Mirror" : "Direct Mirror",
          size: "",
          url: shortUrl
        })
      } else if (noAdminEpisodeLinks) {
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

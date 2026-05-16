import { NextResponse } from 'next/server'
import { prisma } from '@/lib/admin'
import { getDetails } from '@/lib/tmdb'
import { searchMovieBox, getMovieBoxDetails, getMovieBoxDownloadSources } from '@/lib/moviebox'


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
                subtitleProxyUrl = `https://cinexp-proxy.renelclark.workers.dev/?url=${encodeURIComponent(result.subtitle.url)}&filename=${encodeURIComponent(subFilename)}`;
              }

              result.sources.forEach((s: any) => {
                const filenameToUse = `${safeTitle}_CineXP_${s.quality}p.mp4`;
                const proxyUrl = `https://cinexp-proxy.renelclark.workers.dev/?url=${encodeURIComponent(s.directUrl)}&filename=${encodeURIComponent(filenameToUse)}`;

                const linkObj = {
                  id: `moviebox-${s.id}`,
                  quality: s.quality + 'p',
                  label: s.quality + 'p',
                  size: s.size ? (parseInt(s.size) / (1024 * 1024)).toFixed(0) + ' MB' : '',
                  url: proxyUrl, // Restored proxy to inject Referer headers (CDN requires them)
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
      if (noAdminMovieLinks) {
        movieLinks.push({
          id: `mirror-movie-${tmdbId}`,
          quality: "Max",
          label: "Direct Mirror",
          size: "",
          url: `https://dl.vidsrc.vip/movie/${tmdbId}`
        })
      } else if (noAdminEpisodeLinks) {
        episodeLinks.push({
          id: `mirror-tv-${tmdbId}-${season}-${episode}`,
          quality: "Max",
          label: "Direct Mirror",
          size: "",
          url: `https://dl.vidsrc.vip/tv/${tmdbId}/${season}/${episode}`
        })
      }
    }

    return NextResponse.json({ links: movieLinks, episodeLinks })
  } catch (error) {
    console.error('Public downloads error:', error)
    return NextResponse.json({ links: [], episodeLinks: [] })
  }
}

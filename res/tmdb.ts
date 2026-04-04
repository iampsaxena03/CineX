const TMDB_BASE = 'https://api.tmdb.org/3'
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p'

function getApiKey() {
  return process.env.TMDB_API_KEY || ''
}

export function getImageUrl(path: string | null | undefined, size: string = 'w500'): string {
  if (!path) return ''
  return `${TMDB_IMAGE_BASE}/${size}${path}`
}

export function getBackdropUrl(path: string | null | undefined): string {
  return getImageUrl(path, 'original')
}

export interface TMDBMovie {
  id: number
  title: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  release_date: string
  vote_average: number
  vote_count: number
  genre_ids?: number[]
  genres?: { id: number; name: string }[]
  runtime?: number
  tagline?: string
}

export interface TMDBTVShow {
  id: number
  name: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  first_air_date: string
  vote_average: number
  vote_count: number
  genre_ids?: number[]
  genres?: { id: number; name: string }[]
  number_of_seasons?: number
  seasons?: TMDBSeason[]
  tagline?: string
}

export interface TMDBSeason {
  id: number
  season_number: number
  name: string
  episode_count: number
  air_date: string | null
}

export interface TMDBCredits {
  cast: {
    id: number
    name: string
    character: string
    profile_path: string | null
    order: number
  }[]
  crew: {
    id: number
    name: string
    job: string
    department: string
    profile_path: string | null
  }[]
}

export interface TMDBVideo {
  key: string
  site: string
  type: string
  name: string
}

interface TMDBSearchResult<T> {
  page: number
  results: T[]
  total_pages: number
  total_results: number
}

async function tmdbFetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T | null> {
  const apiKey = getApiKey()
  if (!apiKey || apiKey === 'your_tmdb_api_key_here') return null

  const url = new URL(`${TMDB_BASE}${endpoint}`)
  url.searchParams.set('api_key', apiKey)
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value))

  try {
    const res = await fetch(url.toString(), { next: { revalidate: 3600 } })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function searchMovies(query: string): Promise<TMDBMovie[]> {
  const data = await tmdbFetch<TMDBSearchResult<TMDBMovie>>('/search/movie', { query })
  return data?.results || []
}

export async function searchTVShows(query: string): Promise<TMDBTVShow[]> {
  const data = await tmdbFetch<TMDBSearchResult<TMDBTVShow>>('/search/tv', { query })
  return data?.results || []
}

export async function getMovieDetails(tmdbId: number): Promise<TMDBMovie | null> {
  return tmdbFetch<TMDBMovie>(`/movie/${tmdbId}`, { append_to_response: 'credits,videos' })
}

export async function getTVDetails(tmdbId: number): Promise<TMDBTVShow | null> {
  return tmdbFetch<TMDBTVShow>(`/tv/${tmdbId}`, { append_to_response: 'credits,videos' })
}

export async function getMovieCredits(tmdbId: number): Promise<TMDBCredits | null> {
  return tmdbFetch<TMDBCredits>(`/movie/${tmdbId}/credits`)
}

export async function getTVCredits(tmdbId: number): Promise<TMDBCredits | null> {
  return tmdbFetch<TMDBCredits>(`/tv/${tmdbId}/credits`)
}

export async function getMovieVideos(tmdbId: number): Promise<TMDBVideo[]> {
  const data = await tmdbFetch<{ results: TMDBVideo[] }>(`/movie/${tmdbId}/videos`)
  return data?.results || []
}

export async function getTVVideos(tmdbId: number): Promise<TMDBVideo[]> {
  const data = await tmdbFetch<{ results: TMDBVideo[] }>(`/tv/${tmdbId}/videos`)
  return data?.results || []
}

export async function getTrendingMovies(): Promise<TMDBMovie[]> {
  const data = await tmdbFetch<TMDBSearchResult<TMDBMovie>>('/trending/movie/week')
  return data?.results || []
}

export async function getTrendingTV(): Promise<TMDBTVShow[]> {
  const data = await tmdbFetch<TMDBSearchResult<TMDBTVShow>>('/trending/tv/week')
  return data?.results || []
}

export async function getPopularMovies(page = 1): Promise<TMDBMovie[]> {
  const data = await tmdbFetch<TMDBSearchResult<TMDBMovie>>('/movie/popular', { page: String(page) })
  return data?.results || []
}

export async function getPopularTVShows(page = 1): Promise<TMDBTVShow[]> {
  const data = await tmdbFetch<TMDBSearchResult<TMDBTVShow>>('/tv/popular', { page: String(page) })
  return data?.results || []
}

export async function getTopRatedMovies(page = 1): Promise<TMDBMovie[]> {
  const data = await tmdbFetch<TMDBSearchResult<TMDBMovie>>('/movie/top_rated', { page: String(page) })
  return data?.results || []
}

export async function getTopRatedTVShows(page = 1): Promise<TMDBTVShow[]> {
  const data = await tmdbFetch<TMDBSearchResult<TMDBTVShow>>('/tv/top_rated', { page: String(page) })
  return data?.results || []
}

export const GENRE_MAP: Record<number, string> = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy',
  80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family',
  14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
  9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi', 10770: 'TV Movie',
  53: 'Thriller', 10752: 'War', 37: 'Western',
  10759: 'Action & Adventure', 10762: 'Kids', 10763: 'News',
  10764: 'Reality', 10765: 'Sci-Fi & Fantasy', 10766: 'Soap',
  10767: 'Talk', 10768: 'War & Politics',
}

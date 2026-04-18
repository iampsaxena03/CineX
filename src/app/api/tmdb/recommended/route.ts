import { NextRequest, NextResponse } from 'next/server';

const TMDB_BASE = 'https://api.tmdb.org/3';

function getApiKey() {
  return process.env.TMDB_API_KEY || '';
}

interface TMDBResult {
  id: number;
  media_type?: string;
  title?: string;
  name?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  vote_count: number;
  popularity: number;
  genre_ids?: number[];
  release_date?: string;
  first_air_date?: string;
  overview?: string;
}

/**
 * GET /api/tmdb/recommended?seeds=movie:123,tv:456
 * 
 * Fetches TMDB recommendations for each seed title, deduplicates,
 * applies quality filters, and returns the top results.
 */
export async function GET(req: NextRequest) {
  const apiKey = getApiKey();
  if (!apiKey) {
    return NextResponse.json({ results: [] });
  }

  const seedsParam = req.nextUrl.searchParams.get('seeds') || '';
  const excludeParam = req.nextUrl.searchParams.get('exclude') || '';

  // Parse seeds: "movie:123,tv:456"
  const seeds = seedsParam
    .split(',')
    .filter(Boolean)
    .map(s => {
      const [type, idStr] = s.split(':');
      return { type: type as 'movie' | 'tv', id: parseInt(idStr, 10) };
    })
    .filter(s => !isNaN(s.id) && (s.type === 'movie' || s.type === 'tv'));

  if (seeds.length === 0) {
    return NextResponse.json({ results: [] });
  }

  // Build exclusion set (things the user already watched)
  const excludeIds = new Set<number>();
  excludeParam.split(',').filter(Boolean).forEach(id => {
    const num = parseInt(id, 10);
    if (!isNaN(num)) excludeIds.add(num);
  });
  // Also exclude the seed titles themselves
  seeds.forEach(s => excludeIds.add(s.id));

  // Fetch TMDB recommendations for each seed (limit to 6 seeds for perf)
  const activeSeedCount = Math.min(seeds.length, 6);
  const fetches = seeds.slice(0, activeSeedCount).map(async (seed) => {
    try {
      const url = `${TMDB_BASE}/${seed.type}/${seed.id}/recommendations?api_key=${apiKey}&page=1`;
      const res = await fetch(url, { next: { revalidate: 3600 } });
      if (!res.ok) return [];
      const data = await res.json();
      return (data.results || []).map((r: TMDBResult) => ({
        ...r,
        media_type: seed.type,
      }));
    } catch {
      return [];
    }
  });

  const allResults = (await Promise.all(fetches)).flat() as (TMDBResult & { media_type: string })[];

  // Deduplicate, filter, and score
  const seen = new Set<number>();
  const candidates: (TMDBResult & { media_type: string; score: number })[] = [];

  for (const item of allResults) {
    if (!item.id || seen.has(item.id) || excludeIds.has(item.id)) continue;
    if (!item.poster_path) continue; // Must have a poster

    // Quality floor: decent vote count and rating
    const voteCount = item.vote_count || 0;
    const voteAvg = item.vote_average || 0;
    if (voteCount < 50 || voteAvg < 5.5) continue;

    seen.add(item.id);

    // Composite score: popularity weighted + quality bonus
    const popularityScore = Math.log10(Math.max(item.popularity || 1, 1)) * 10;
    const qualityScore = voteAvg * 2;
    const voteBonus = Math.min(Math.log10(voteCount) * 3, 12);
    const score = popularityScore + qualityScore + voteBonus;

    candidates.push({ ...item, score });
  }

  // Sort by composite score descending
  candidates.sort((a, b) => b.score - a.score);

  // Return top 18
  const results = candidates.slice(0, 18).map(({ score, ...item }) => item);

  return NextResponse.json({ results });
}

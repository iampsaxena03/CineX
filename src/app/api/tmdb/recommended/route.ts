import { NextRequest, NextResponse } from 'next/server';
import { getSimilar, getLatestHype, TMDBMediaItem } from '@/lib/tmdb';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const seeds: { id: string | number; type: 'movie' | 'tv' }[] = body.seeds || [];
    const limit: number = body.limit || 12;

    if (!seeds || seeds.length === 0) {
      const hype = await getLatestHype('IN');
      return NextResponse.json({ results: hype.slice(0, limit) });
    }

    // Fetch similarities for all seeds in parallel
    const promises = seeds.map(seed => getSimilar(seed.type, seed.id, 20));
    const multipleResults = await Promise.all(promises);

    const seedIds = new Set(seeds.map(s => String(s.id)));
    const scoreMap = new Map<string, { item: TMDBMediaItem, score: number }>();

    multipleResults.forEach((results) => {
      results.forEach((item, index) => {
        // Skip items that the user has already watched/saved (they are in the seeds)
        if (seedIds.has(String(item.id))) return;

        const key = `${item.media_type}-${item.id}`;
        // Base score plus positional bonus. 
        // Index 0 gets +1.0, index 19 gets +0.05
        const bonus = 1 + ((20 - index) * 0.05);

        if (scoreMap.has(key)) {
          const existing = scoreMap.get(key)!;
          existing.score += bonus;
          // Compounding boost: if an item is recommended by MULTIPLE different seeds, 
          // we amplify its score! This surfaces true cross-recommendations.
          existing.score *= 1.2; 
        } else {
          scoreMap.set(key, { item, score: bonus });
        }
      });
    });

    const sortedResults = Array.from(scoreMap.values())
      .sort((a, b) => b.score - a.score)
      .map(entry => entry.item)
      .slice(0, limit);

    // Fallback if the algorithm produced no results
    if (sortedResults.length === 0) {
      const hype = await getLatestHype('IN');
      return NextResponse.json({ results: hype.slice(0, limit) });
    }

    return NextResponse.json({ results: sortedResults });
  } catch (err: any) {
    console.error('TMDB recommended fetch error:', err?.message ?? err);
    return NextResponse.json(
      { error: 'Failed to fetch recommendations', detail: err?.message },
      { status: 500 }
    );
  }
}

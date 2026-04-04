import { NextRequest, NextResponse } from 'next/server';

const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
// api.tmdb.org (short domain) is NOT blocked in India — api.themoviedb.org IS blocked
const BASE_URL = 'https://api.tmdb.org/3';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const pathStr = path.join('/');

  // Forward any extra query params from the client (e.g. page, query, append_to_response)
  const { searchParams } = new URL(request.url);
  searchParams.set('api_key', TMDB_API_KEY!);

  const tmdbUrl = `${BASE_URL}/${pathStr}?${searchParams.toString()}`;

  try {
    const res = await fetch(tmdbUrl);

    if (!res.ok) {
      const text = await res.text();
      console.error(`TMDB error ${res.status} for ${tmdbUrl}:`, text);
      return NextResponse.json(
        { error: `TMDB returned ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (err: any) {
    console.error('TMDB proxy fetch error:', err?.message ?? err);
    return NextResponse.json(
      { error: 'Failed to fetch from TMDB', detail: err?.message },
      { status: 500 }
    );
  }
}

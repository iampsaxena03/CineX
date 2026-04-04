import { NextResponse } from 'next/server';
import { getMoreReels } from '@/lib/reels';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');

  try {
    const reels = await getMoreReels(page);
    return NextResponse.json(reels);
  } catch (err) {
    console.error('Reels API error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

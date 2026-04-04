import { NextResponse } from 'next/server';
import { getVideosFromServer } from '@/lib/tmdb';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const type = searchParams.get('type') || 'movie';

  if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

  try {
    const videos = await getVideosFromServer(type, id);
    if (videos.length > 0) {
      return NextResponse.json({ videos });
    }
    return NextResponse.json({ error: 'No video found' }, { status: 404 });
  } catch (err) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}



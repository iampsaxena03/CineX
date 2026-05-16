import { NextResponse } from 'next/server';
import { createToken } from '@/lib/download-token';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { url, title, quality, size, poster } = body;

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const token = createToken({
      u: url,
      t: title || 'Media Download',
      q: quality || 'Download',
      s: size || '',
      p: poster || ''
    });

    return NextResponse.json({ token });
  } catch (error) {
    console.error('[Download Create API] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

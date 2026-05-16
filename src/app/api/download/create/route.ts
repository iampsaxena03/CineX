import { NextRequest, NextResponse } from 'next/server';
import { createDownloadToken } from '@/lib/download-token';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, title, quality, size, poster } = body;

    if (!url) {
      return NextResponse.json({ error: 'Missing download URL' }, { status: 400 });
    }

    const token = createDownloadToken({
      u: url,
      t: title || 'CineXP Download',
      q: quality || 'HD',
      s: size || '',
      p: poster || ''
    });

    return NextResponse.json({ success: true, token });
  } catch (err) {
    console.error('[API] Download create error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

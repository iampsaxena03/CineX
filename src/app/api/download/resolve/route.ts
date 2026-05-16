import { NextRequest, NextResponse } from 'next/server';
import { verifyDownloadToken } from '@/lib/download-token';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  }

  const meta = verifyDownloadToken(token);

  if (!meta) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 410 });
  }

  return NextResponse.json({
    success: true,
    url: meta.u,
    title: meta.t,
    quality: meta.q,
    size: meta.s
  });
}

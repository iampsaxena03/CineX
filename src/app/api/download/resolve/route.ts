import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/download-token';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Token is required' }, { status: 400 });
  }

  const data = verifyToken(token);

  if (!data) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 410 });
  }

  return NextResponse.json({
    url: data.u,
    title: data.t,
    quality: data.q,
    size: data.s,
    poster: data.p,
    subtitleUrl: data.sub
  });
}

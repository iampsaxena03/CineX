import { NextResponse } from 'next/server';
import { getPostedHistory, addPostedHistory } from '@/lib/telegram-history';

export async function GET(request: Request) {
  try {
    const secret = request.headers.get('x-bot-secret');
    const envSecret = (process.env.CRON_SECRET || "").replace(/"/g, "");
    if (secret !== envSecret) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const historySet = await getPostedHistory();
    const history = Array.from(historySet);
    
    return NextResponse.json({ history });
  } catch (error) {
    console.error("GET /api/telegram/history Error:", error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const secret = request.headers.get('x-bot-secret');
    const envSecret = (process.env.CRON_SECRET || "").replace(/"/g, "");
    if (secret !== envSecret) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    if (!body.uid) {
      return new NextResponse('Missing uid', { status: 400 });
    }

    await addPostedHistory(body.uid);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/telegram/history Error:", error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

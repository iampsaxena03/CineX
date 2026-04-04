import { NextResponse } from 'next/server';
import { getTrending } from '@/lib/tmdb';

export const revalidate = 0; // Don't cache this route

export async function GET() {
  try {
    // Get trending items to pick from
    const trending = await getTrending('IN');
    
    if (!trending || trending.length === 0) {
      return NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'));
    }

    // Pick a random item
    const randomItem = trending[Math.floor(Math.random() * trending.length)];
    const mediaType = randomItem.media_type === 'tv' ? 'tv' : 'movie';
    const id = randomItem.id;

    // Redirect directly to the media page
    // Note: In an API route we need absolute URL for redirect, or we can just return the path for a client-side push.
    // It is often safer for client-side push to just return JSON and let the client route, since absolute URL requires knowing the host.
    // However, since we are doing `router.push('/api/tmdb/random')` it's better to just return the json and handle it in a client function.
    // Wait, the dock onClick takes a function. We can just do:
    // `onClick: async () => { const res = await fetch('/api/tmdb/random'); const data = await res.json(); router.push(data.url); }`
    
    return NextResponse.json({ url: `/media/${mediaType}/${id}` });
  } catch (error) {
    console.error('Randomizer error:', error);
    return NextResponse.json({ url: '/' }); // Fallback to home
  }
}

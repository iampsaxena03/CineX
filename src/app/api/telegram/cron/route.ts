import { NextResponse } from 'next/server';
import { getPostedHistory, addPostedHistory } from '@/lib/telegram-history';
import { 
  getHomepageItems, 
  fetchTMDBDetails, 
  getIndiaPopular, 
  getWorldwideTrending, 
  formatTelegramCaption, 
  postToTelegram 
} from '@/lib/telegram-bot';

export const maxDuration = 30; // Max execution time for Vercel Hobby limits

export async function GET(request: Request) {
  // Optional cron security check using Vercel's standard env variable
  const authHeader = request.headers.get('authorization');
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const history = await getPostedHistory();
    const selectedItems: any[] = [];
    
    console.log("Checking Homepage...");
    const homepageItems = await getHomepageItems();
    for (const item of homepageItems) {
      if (selectedItems.length >= 3) break;
      const uid = `${item.type}_${item.id}`;
      // Skip if already posted
      if (!history.has(uid)) {
        const data = await fetchTMDBDetails(item.type, item.id);
        if (data && data.poster_path) {
          selectedItems.push({ type: item.type, id: item.id, data, uid });
          // Add to local history instantly to avoid double loop dupes
          history.add(uid);
        }
      }
    }

    if (selectedItems.length < 3) {
      console.log("Checking India Popular...");
      const indiaItems = await getIndiaPopular();
      for (const item of indiaItems) {
        if (selectedItems.length >= 3) break;
        const uid = `movie_${item.id}`;
        if (!history.has(uid) && item.poster_path) {
          selectedItems.push({ type: 'movie', id: item.id, data: item, uid });
          history.add(uid);
        }
      }
    }

    if (selectedItems.length < 3) {
      console.log("Checking Worldwide Trending...");
      const worldItems = await getWorldwideTrending();
      for (const item of worldItems) {
        if (selectedItems.length >= 3) break;
        const type = item.media_type || 'movie';
        const uid = `${type}_${item.id}`;
        if (!history.has(uid) && item.poster_path) {
          selectedItems.push({ type, id: item.id, data: item, uid });
          history.add(uid);
        }
      }
    }

    const postedIds: string[] = [];
    
    for (const item of selectedItems) {
      const posterUrl = `https://image.tmdb.org/t/p/w600_and_h900_bestv2${item.data.poster_path}`;
      const caption = formatTelegramCaption(item.type, item.data);
      
      const success = await postToTelegram(posterUrl, caption);
      if (success) {
        await addPostedHistory(item.uid);
        postedIds.push(item.uid);
      }
      
      // Delay before next post to respect Telegram rate limits
      await new Promise(r => setTimeout(r, 1500));
    }

    return NextResponse.json({ 
      success: true, 
      posted: postedIds,
      message: postedIds.length === 0 ? "No new items found" : "Posts sent to telegram"
    });
    
  } catch (error) {
    console.error("Cron Error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

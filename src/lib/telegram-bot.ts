const TELEGRAM_BOT_TOKEN = (process.env.TELEGRAM_BOT_TOKEN || "").replace(/"/g, "");
const TELEGRAM_CHANNEL_ID = (process.env.TELEGRAM_CHANNEL_ID || "@cine_xp").replace(/"/g, "");
const TMDB_API_KEY = (process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY || "").replace(/"/g, "");

export const CINEXP_BASE_URL = "https://cinexp.site";

export async function getHomepageItems(): Promise<{ type: string; id: string }[]> {
  try {
    const res = await fetch(CINEXP_BASE_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      },
      // Ensure we don't hit Next.js cached pages
      cache: 'no-store'
    });
    const html = await res.text();
    
    const items: { type: string; id: string }[] = [];
    const regex = /href="\/media\/(movie|tv)\/(\d+)[^"]*"/g;
    let match;
    const seen = new Set<string>();

    while ((match = regex.exec(html)) !== null) {
      const type = match[1];
      const id = match[2];
      const key = `${type}_${id}`;
      if (!seen.has(key)) {
        seen.add(key);
        items.push({ type, id });
      }
    }
    return items;
  } catch (e) {
    console.error("Failed to scrape homepage:", e);
    return [];
  }
}

export async function fetchTMDBDetails(type: string, id: string) {
  const res = await fetch(`https://api.tmdb.org/3/${type}/${id}?api_key=${TMDB_API_KEY}`);
  if (!res.ok) return null;
  return res.json();
}

export async function getIndiaPopular() {
  const res = await fetch(`https://api.tmdb.org/3/movie/popular?api_key=${TMDB_API_KEY}&region=IN`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.results || [];
}

export async function getWorldwideTrending() {
  const res = await fetch(`https://api.tmdb.org/3/trending/movie/day?api_key=${TMDB_API_KEY}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.results || [];
}

export function formatTelegramCaption(type: string, movie: any) {
  const title = (movie.title || movie.original_title || movie.name || "").trim();
  const releaseDate = (movie.release_date || movie.first_air_date || "N/A").substring(0, 4);
  const rating = movie.vote_average || 0;
  const watchLink = `${CINEXP_BASE_URL}/media/${type}/${movie.id}`;

  return `🎬 <b>${title}</b> (${releaseDate})

⭐ <b>Rating:</b> ${rating.toFixed(1)}/10
💿 <b>Quality:</b> 1080p, 720p, 480p [HD]
🎙️ <b>Language:</b> Hindi + English (Dual Audio)

📥 <b>Watch / Download Full Movie HD:</b>
👉 <a href='${watchLink}'>Click here to watch on CineXP</a>

🍿 <i>Join our channel for daily updates!</i>`;
}

export async function postToTelegram(imageUrl: string, caption: string) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error("Missing TELEGRAM_BOT_TOKEN inside process.env");
    return false;
  }
  
  const apiUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`;
  
  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHANNEL_ID,
        photo: imageUrl,
        caption: caption,
        parse_mode: "HTML"
      })
    });
    
    if (res.ok) {
      console.log("Successfully posted to Telegram!");
      return true;
    } else {
      console.error("Failed to post to Telegram:", await res.text());
      return false;
    }
  } catch (error) {
    console.error("Error posting to Telegram API:", error);
    return false;
  }
}

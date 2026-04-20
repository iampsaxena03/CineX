import { NextResponse } from 'next/server';
import { fetchTMDBDetails, formatTelegramCaption, postToTelegram } from '@/lib/telegram-bot';
import { addPostedHistory } from '@/lib/telegram-history';

export async function POST(request: Request) {
  try {
    const update = await request.json();

    // Ensure it's a message
    if (!update.message || !update.message.text) {
      return NextResponse.json({ ok: true }); // Acknowledge to stop Telegram from retrying
    }

    const text = update.message.text.trim();
    const chatId = update.message.chat.id;
    const botToken = (process.env.TELEGRAM_BOT_TOKEN || "").replace(/"/g, "");

    // Helper to send message back to the sender
    const reply = async (msg: string) => {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: "Markdown" })
      });
    };

    if (text.startsWith("/start") || text.startsWith("/help")) {
      await reply("🤖 *CineXP Auto-Poster Bot (Vercel Serverless)*\n\nI automatically post 3 movies to your channel twice a day.\n\n*Commands:*\n`/post movie <id>` - Force post a movie (e.g. `/post movie 299534`)\n`/post tv <id>` - Force post a TV show");
      return NextResponse.json({ ok: true });
    }

    if (text.startsWith("/post ")) {
      const parts = text.split(" ");
      if (parts.length !== 3) {
        await reply("⚠️ Invalid format! Use: `/post [movie|tv] [tmdb_id]`");
        return NextResponse.json({ ok: true });
      }

      const mType = parts[1].toLowerCase();
      const mId = parts[2];

      if (mType !== 'movie' && mType !== 'tv') {
        await reply("⚠️ Type must be either 'movie' or 'tv'.");
        return NextResponse.json({ ok: true });
      }

      await reply(`🔍 Fetching ${mType} ID ${mId} from TMDB...`);

      const data = await fetchTMDBDetails(mType, mId);
      if (!data || !data.poster_path) {
        await reply("❌ Could not find that ID on TMDB or it has no poster.");
        return NextResponse.json({ ok: true });
      }

      const posterUrl = `https://image.tmdb.org/t/p/w600_and_h900_bestv2${data.poster_path}`;
      const caption = formatTelegramCaption(mType, data);

      const success = await postToTelegram(posterUrl, caption);
      
      if (success) {
        await reply("✅ Successfully posted to the channel!");
        // Save to DB so cron jobs don't repeat it accidentally later
        await addPostedHistory(`${mType}_${mId}`);
      } else {
        await reply("❌ Failed to post. Ensure TELEGRAM_BOT_TOKEN and TELEGRAM_CHANNEL_ID are in Vercel.");
      }
    }

    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error("Webhook Error:", error);
    // Always return ok:true to Telegram so it doesn't endlessly retry the webhook on error
    return NextResponse.json({ ok: true });
  }
}

import { getMoreReels } from "@/lib/reels";
import TrailerFeedClient from "@/components/TrailerFeedClient";
import type { Metadata } from 'next';

export const revalidate = 0; // Dynamic for randomness

export const metadata: Metadata = {
  title: 'Reels | CineXP',
  description: 'TikTok-style infinite scroll for movie clips and trailers.',
};

export default async function FeedPage() {
  const randomPage = Math.floor(Math.random() * 20) + 1;
  const initialReels = await getMoreReels(randomPage);

  return (
    <div style={{ backgroundColor: "#000", height: "100vh", overflow: "hidden" }}>
      <TrailerFeedClient initialReels={initialReels} initialPage={randomPage} />
    </div>
  );
}


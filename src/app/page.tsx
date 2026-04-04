
import { getLatestHype, getImageUrl, getUpcomingMovies, type TMDBMediaItem } from "@/lib/tmdb";
import Aurora from "@/components/ui/Aurora";
import MediaCard from "@/components/MediaCard";
import ContinueWatchingRow from "@/components/ContinueWatchingRow";
import CountdownRow from "@/components/CountdownRow";

export const revalidate = 3600;

export default async function HomePage() {
  const [latest, upcoming] = await Promise.all([
    getLatestHype('IN'),
    getUpcomingMovies('IN')
  ]);

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      {/* Aurora Background */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        <Aurora
          colorStops={["#1c0436", "#6c1b9b", "#9d00ff"]}
          blend={0.5}
          amplitude={1.2}
          speed={0.5}
        />
      </div>

      <div className="page-wrapper container" style={{ position: "relative", zIndex: 1 }}>
        {/* Hero */}
        <div style={{ textAlign: "center", padding: "4rem 0 6rem" }}>
          <h1
            style={{
              fontSize: "clamp(2.5rem, 6vw, 5rem)",
              fontWeight: 700,
              marginBottom: "1rem",
              background: "linear-gradient(135deg, #fff 30%, var(--accent))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              lineHeight: 1.1,
            }}
          >
            Welcome to CineX!
          </h1>
        </div>

        {/* Continue Watching */}
        <ContinueWatchingRow />

        {/* Coming Soon Countdown */}
        <CountdownRow upcoming={upcoming} />

        {/* Trending Grid */}
        <section>
          <h2 style={{ fontSize: "1.6rem", fontWeight: 600, marginBottom: "1.5rem" }}>
            <span style={{ color: "var(--primary)" }}>✨</span> Latest Releases
          </h2>

          {latest.length === 0 ? (
            <div style={{ textAlign: "center", padding: "4rem", opacity: 0.5 }}>
              <p>Could not load latest releases. Please try again later.</p>
            </div>
          ) : (
            <div className="grid">
              {latest.map((item: TMDBMediaItem, index: number) => {
                return (
                  <MediaCard 
                    key={`${item.media_type}-${item.id}`} 
                    item={item} 
                    stagger={index % 6 * 0.05} // Stagger only per row for performance
                  />
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

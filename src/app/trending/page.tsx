import { getTrending, type TMDBMediaItem } from "@/lib/tmdb";
import Aurora from "@/components/ui/Aurora";
import MediaCard from "@/components/MediaCard";
import Top10Row from "@/components/ui/Top10Row";

export const revalidate = 3600;

export const metadata = {
  title: 'Trending | CineX',
  description: 'See what is hot and trending right now on CineX.',
};

export default async function TrendingPage() {
  const trending = await getTrending('IN');

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      {/* Aurora Background */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        <Aurora
          colorStops={["#3a0ca3", "#f72585", "#7209b7"]}
          blend={0.5}
          amplitude={1.2}
          speed={0.5}
        />
      </div>

      <div className="page-wrapper container" style={{ position: "relative", zIndex: 1, paddingBottom: "100px" }}>
        {/* Header */}
        <div style={{ textAlign: "center", padding: "4rem 0 3rem" }}>
          <h1
            style={{
              fontSize: "clamp(2rem, 5vw, 4rem)",
              fontWeight: 700,
              marginBottom: "1rem",
              background: "linear-gradient(135deg, #fff 30%, var(--accent))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              lineHeight: 1.1,
            }}
          >
            Trending Now
          </h1>
          <p style={{ fontSize: "1.15rem", maxWidth: 520, margin: "0 auto", opacity: 0.7, lineHeight: 1.7 }}>
            The most popular movies and series this week.
          </p>
        </div>

        {/* Top 10 Styling Row */}
        {trending.length >= 10 && <Top10Row items={trending} />}

        {/* Trending Grid */}
        <section>
          {trending.length === 0 ? (
            <div style={{ textAlign: "center", padding: "4rem", opacity: 0.5 }}>
              <p>Could not load trending content. Please try again later.</p>
            </div>
          ) : (
            <div className="grid">
              {trending.map((item: TMDBMediaItem, index: number) => {
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

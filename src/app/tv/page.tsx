import { getPopularTVShows, type TMDBMediaItem } from "@/lib/tmdb";
import Aurora from "@/components/ui/Aurora";
import MediaCard from "@/components/MediaCard";

export const revalidate = 3600;

export const metadata = {
  title: 'TV Series | CineXP',
  description: 'Browse the most popular TV series and web shows on CineXP.',
};

export default async function TVSeriesPage() {
  const series = await getPopularTVShows(1, 'IN');

  const tvItems: TMDBMediaItem[] = series.map(s => ({ ...s, media_type: 'tv' }));

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      {/* Aurora Background */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        <Aurora
          colorStops={["#005f73", "#0a9396", "#94d2bd"]}
          blend={0.5}
          amplitude={1.3}
          speed={0.6}
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
              background: "linear-gradient(135deg, #fff 30%, #48cae4)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              lineHeight: 1.1,
            }}
          >
            Popular Series
          </h1>
          <p style={{ fontSize: "1.15rem", maxWidth: 520, margin: "0 auto", opacity: 0.7, lineHeight: 1.7 }}>
            Binge-worthy narratives and acclaimed television shows.
          </p>
        </div>

        {/* Series Grid */}
        <section>
          {tvItems.length === 0 ? (
            <div style={{ textAlign: "center", padding: "4rem", opacity: 0.5 }}>
              <p>Could not load TV series. Please try again later.</p>
            </div>
          ) : (
            <div className="grid">
              {tvItems.map((item: TMDBMediaItem, index: number) => {
                return (
                  <MediaCard 
                    key={`${item.media_type}-${item.id}`} 
                    item={item} 
                    stagger={index % 6 * 0.05}
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

import { getPopularMovies, type TMDBMediaItem } from "@/lib/tmdb";
import MediaCard from "@/components/MediaCard";



export const metadata = {
  title: 'Movies | CineXP',
  description: 'Discover popular and highly rated movies on CineXP.',
};

export default async function MoviesPage() {
  const movies = await getPopularMovies(1, 'IN');

  const movieItems: TMDBMediaItem[] = movies.map(m => ({ ...m, media_type: 'movie' }));

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>


      <div className="page-wrapper container" style={{ position: "relative", zIndex: 1, paddingBottom: "100px" }}>
        {/* Header */}
        <div style={{ textAlign: "center", padding: "4rem 0 3rem" }}>
          <h1
            style={{
              fontSize: "clamp(2rem, 5vw, 4rem)",
              fontWeight: 700,
              marginBottom: "1rem",
              background: "linear-gradient(135deg, #fff 30%, #e85d04)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              lineHeight: 1.1,
            }}
          >
            Popular Movies
          </h1>
          <p style={{ fontSize: "1.15rem", maxWidth: 520, margin: "0 auto", opacity: 0.7, lineHeight: 1.7 }}>
            A curated list of blockbusters and cinematic masterpieces.
          </p>
        </div>

        {/* Movies Grid */}
        <section>
          {movieItems.length === 0 ? (
            <div style={{ textAlign: "center", padding: "4rem", opacity: 0.5 }}>
              <p>Could not load movies. Please try again later.</p>
            </div>
          ) : (
            <div className="grid">
              {movieItems.map((item: TMDBMediaItem, index: number) => {
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

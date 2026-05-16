import Link from "next/link";
import { getTrending, getMediaById, getUpcomingMovies, getBackdropUrl, getImageUrl, type TMDBMediaItem, type TMDBMovie } from "@/lib/tmdb";
import { generateSlug } from "@/lib/utils";

export const revalidate = 3600;
import MediaCard from "@/components/MediaCard";
import ContinueWatchingRow from "@/components/ContinueWatchingRow";
import RecommendedRow from "@/components/RecommendedRow";
import Top10Row from "@/components/ui/Top10Row";
import CountdownRow from "@/components/CountdownRow";
import AdSlot from "@/components/ads/AdSlot";
import HomeSearchBar from "@/components/HomeSearchBar";
import { prisma } from "@/lib/admin";



interface SectionItem {
  tmdbId: number
  mediaType: string
  position: number
  preferredStream?: string | null
}

interface Section {
  key: string
  title: string
  type: string
  order: number
  visible: boolean
  autoFill: boolean
  maxItems: number
  items: SectionItem[]
}

const DEFAULT_SECTION_CONFIG = [
  { key: 'continue_watching', title: 'Continue Watching', type: 'continue_watching', order: 0 },
  { key: 'top_10', title: 'Top 10 in India Today', type: 'top10', order: 1 },
  { key: 'trending', title: 'Trending Now', type: 'trending', order: 2 },
  { key: 'recommended', title: 'Recommended for You', type: 'recommended', order: 3 },
];

export default async function HomePage() {
  let dbSections: Section[] = [];
  try {
    const raw = await prisma.homeSection.findMany({
      where: { visible: true },
      orderBy: { order: 'asc' },
      include: { items: { orderBy: { position: 'asc' } } }
    });
    dbSections = raw as unknown as Section[];
  } catch (e) {
    console.error('Failed to fetch home sections:', e);
  }

  const sections: Section[] = dbSections.length > 0
    ? dbSections
    : DEFAULT_SECTION_CONFIG.map(s => ({
        ...s, visible: true, autoFill: true,
        maxItems: s.type === 'top10' ? 10 : 6, items: []
      }));

  // Collect ALL admin-selected tmdbIds across ALL sections
  const allAdminItems: { tmdbId: number; mediaType: string; preferredStream?: string | null }[] = [];
  sections.forEach(s => s.items.forEach(item => {
    allAdminItems.push({ tmdbId: item.tmdbId, mediaType: item.mediaType, preferredStream: item.preferredStream });
  }));

  // Check if we need upcoming movies
  const needsUpcoming = sections.some(s => s.type === 'countdown' && s.visible);

  // Fetch trending + upcoming + resolve all admin picks in parallel
  const [trending, upcoming, ...resolvedAdminItems] = await Promise.all([
    getTrending('IN'),
    needsUpcoming ? getUpcomingMovies('IN') : Promise.resolve([]),
    ...allAdminItems.map(a => getMediaById(a.tmdbId, a.mediaType))
  ]);

  // Build lookup: tmdbId -> TMDBMediaItem
  const tmdbLookup = new Map<number, TMDBMediaItem>();
  trending.forEach(item => tmdbLookup.set(item.id, item));
  resolvedAdminItems.forEach((item, index) => {
    if (item) {
      item.preferredStream = allAdminItems[index].preferredStream;
      tmdbLookup.set(item.id, item);
    }
  });

  const heroSection = sections.find((section) => {
    const key = section.key?.toLowerCase() || "";
    const type = section.type?.toLowerCase() || "";
    const title = section.title?.toLowerCase() || "";
    return key === "hero" || type === "hero" || title.includes("hero");
  });

  const heroPick = heroSection?.items
    .map((item) => tmdbLookup.get(item.tmdbId))
    .find(Boolean) || trending[0];

  return (
    <div className="public-page">
      <div className="page-wrapper container home-container">
        {heroPick && <FeaturedHero item={heroPick} />}

        <div className="home-search-hero">
          <HomeSearchBar />
        </div>

        {sections.map((section, sectionIndex) => {
          if (!section.visible) return null;
          if (section === heroSection || section.type === 'hero') return null;

          const sectionContent = (() => {
            if (section.type === 'continue_watching') {
              return <ContinueWatchingRow key={section.key} />;
            }

            if (section.type === 'top10') {
              return (
                <Top10Section
                  key={section.key}
                  section={section}
                  tmdbLookup={tmdbLookup}
                  trendingData={trending}
                />
              );
            }


            // Coming Soon — horizontal slider with countdown overlays
            if (section.type === 'countdown') {
              return (
                <ComingSoonSection
                  key={section.key}
                  section={section}
                  tmdbLookup={tmdbLookup}
                  upcomingData={upcoming as TMDBMovie[]}
                />
              );
            }

            if (section.type === 'recommended') {
              return <RecommendedRow key={section.key} />;
            }

            // ALL other types (trending, latest, custom) — grid with visible limit
            return (
              <GridSection
                key={section.key}
                section={section}
                tmdbLookup={tmdbLookup}
                trendingData={trending}
              />
            );
          })();

          return (
            <div key={section.key}>
              {sectionContent}
              {/* Compact 320x50 banner ad after Top 10 */}
              {sectionIndex === 1 && <AdSlot variant="slim" />}
              {/* Square banner ad after Trending */}
              {sectionIndex === 2 && <AdSlot variant="banner" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FeaturedHero({ item }: { item: TMDBMediaItem }) {
  const mediaType = item.media_type === "tv" ? "tv" : "movie";
  const title = (item as any).title || (item as any).name || "Featured";
  const year = ((item as any).release_date || (item as any).first_air_date || "").slice(0, 4);
  const href = `/media/${mediaType}/${generateSlug(item.id, title)}`;
  const backdropUrl = item.backdrop_path ? getBackdropUrl(item.backdrop_path) : "";
  const posterUrl = item.poster_path ? getImageUrl(item.poster_path, "w342") : "";
  const rating = typeof (item as any).vote_average === "number" ? (item as any).vote_average.toFixed(1) : "";

  return (
    <section className="home-hero" aria-label="Featured title">
      {backdropUrl && <img className="home-hero-backdrop" src={backdropUrl} alt="" fetchPriority="high" />}
      <div className="home-hero-shade" />
      <div className="home-hero-content">
        {posterUrl && (
          <div className="home-hero-poster">
            <img src={posterUrl} alt="" fetchPriority="high" />
          </div>
        )}
        <div className="home-hero-copy">
          <span className="eyebrow">Featured</span>
          <h1>{title}</h1>
          <div className="home-hero-meta">
            {year && <span>{year}</span>}
            <span>{mediaType === "tv" ? "Series" : "Movie"}</span>
            {rating && Number(rating) > 0 && <span>{rating}/10</span>}
          </div>
          {(item as any).overview && <p>{(item as any).overview}</p>}
          <Link href={href} className="watch-now-btn">Watch Now</Link>
        </div>
      </div>
    </section>
  );
}

// ─── Top 10 Section ──────────────────────────────────────────────

function Top10Section({ section, tmdbLookup, trendingData }: {
  section: Section
  tmdbLookup: Map<number, TMDBMediaItem>
  trendingData: TMDBMediaItem[]
}) {
  const limit = section.maxItems || 10;
  const finalItems: TMDBMediaItem[] = [];
  const usedIds = new Set<number>();

  for (const adminItem of section.items) {
    if (finalItems.length >= limit) break;
    const resolved = tmdbLookup.get(adminItem.tmdbId);
    if (resolved) { finalItems.push(resolved); usedIds.add(resolved.id); }
  }

  // Fill remaining up to maxItems from trending
  if (section.autoFill) {
    for (const item of trendingData) {
      if (finalItems.length >= limit) break;
      if (!usedIds.has(item.id)) { finalItems.push(item); usedIds.add(item.id); }
    }
  }

  if (finalItems.length === 0) return null;
  return <Top10Row items={finalItems} title={section.title} maxItems={limit} />;
}

// ─── Coming Soon Section (horizontal slider like Top 10) ─────────

function ComingSoonSection({ section, tmdbLookup, upcomingData }: {
  section: Section
  tmdbLookup: Map<number, TMDBMediaItem>
  upcomingData: TMDBMovie[]
}) {
  const adminPicks: TMDBMovie[] = [];
  const usedIds = new Set<number>();

  // Admin picks first
  for (const adminItem of section.items) {
    const resolved = tmdbLookup.get(adminItem.tmdbId);
    if (resolved) {
      adminPicks.push(resolved as unknown as TMDBMovie);
      usedIds.add(resolved.id);
    }
  }

  // Auto-fill with TMDB upcoming (skip dupes), up to maxItems
  const limit = section.maxItems || 10;
  const allItems = [...adminPicks];
  if (section.autoFill) {
    for (const item of upcomingData) {
      if (allItems.length >= limit) break;
      if (!usedIds.has(item.id)) {
        allItems.push(item);
        usedIds.add(item.id);
      }
    }
  }

  if (allItems.length === 0) return null;

  // Use the existing CountdownRow component (already has horizontal layout + countdown overlays)
  return <CountdownRow upcoming={allItems} />;
}

// ─── Grid Section (trending, latest, custom) ─────────────────────

const SECTION_ICONS: Record<string, string> = {
  trending: '🔥',
  latest: '✨',
  custom: '🎬',
};

function GridSection({ section, tmdbLookup, trendingData }: {
  section: Section
  tmdbLookup: Map<number, TMDBMediaItem>
  trendingData: TMDBMediaItem[]
}) {
  const finalItems: TMDBMediaItem[] = [];
  const usedIds = new Set<number>();

  // Admin picks first
  for (const adminItem of section.items) {
    const resolved = tmdbLookup.get(adminItem.tmdbId);
    if (resolved) { finalItems.push(resolved); usedIds.add(resolved.id); }
  }

  // Auto-fill with trending (skip dupes), up to maxItems
  const limit = section.maxItems || 6;
  if (section.autoFill) {
    for (const item of trendingData) {
      if (finalItems.length >= limit) break;
      if (usedIds.has(item.id)) continue;
      finalItems.push(item);
      usedIds.add(item.id);
    }
  }

  if (finalItems.length === 0) return null;

  // Apply visible limit (maxItems controls how many are shown on the site)
  const visibleItems = finalItems.slice(0, section.maxItems);
  const icon = SECTION_ICONS[section.type] || '🎬';

  return (
    <section className="content-section">
      <h2 className="section-title">
        <span style={{ color: "var(--primary)" }}>{icon}</span> {section.title}
      </h2>
      <div className="grid">
        {visibleItems.map((item: TMDBMediaItem, index: number) => (
          <MediaCard
            key={`${item.media_type}-${item.id}`}
            item={item}
            stagger={index % 6 * 0.05}
          />
        ))}
      </div>
    </section>
  );
}

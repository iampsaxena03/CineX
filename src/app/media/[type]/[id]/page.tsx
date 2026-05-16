import { getDetails, getImageUrl, getBackdropUrl, getSimilar } from "@/lib/tmdb";
import { getAdSettings } from "@/lib/settings";

import type { Metadata, ResolvingMetadata } from "next";
import MediaInteractive from "@/components/MediaInteractive";
import MediaCard from "@/components/MediaCard";
import HistoryTracker from "@/components/HistoryTracker";
import AdSlot from "@/components/ads/AdSlot";
import Link from "next/link";
import { VscArrowLeft } from "react-icons/vsc";
import { Suspense } from "react";


export const dynamicParams = true;
export const maxDuration = 60;
export const revalidate = 604800; // 7 days — safety net for pages added post-deploy

export async function generateStaticParams() {
  try {
    const { prisma } = await import('@/lib/admin');
    // Prebuild ALL enabled SEOPages — reads from DB (0 TMDB calls)
    const pages = await prisma.sEOPage.findMany({
      where: { enabled: true },
      orderBy: { addedAt: 'desc' },
    });
    return pages.map(page => ({
      type: page.mediaType as 'movie' | 'tv',
      id: page.slug,
    }));
  } catch (err) {
    console.error("Error in generateStaticParams:", err);
    return [];
  }
}

export async function generateMetadata(
  { params }: { params: Promise<{ type: "movie" | "tv"; id: string }> },
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { type, id: rawId } = await params;
  const id = rawId.split("-")[0];
  const details = await getDetails(type, id);
  if (!details) {
    return {
      title: "CineXP — Stream Free Movies & TV",
      description: "Watch the latest movies and TV shows online free in HD on CineXP.",
    };
  }

  const baseTitle = (details as any).title || (details as any).name;
  const year = ((details as any).release_date || (details as any).first_air_date || "").split("-")[0];
  const typeText = type === "movie" ? "Movie" : "TV Show";
  
  // SEO Optimized Titles and Descriptions for streaming sites
  const title = `Watch ${baseTitle} ${year ? `(${year}) ` : ''}Online Free HD`;
  const overview = `Watch ${baseTitle} full ${typeText.toLowerCase()} online for free in HD. ${details.overview || "Stream the best movies and TV shows on CineXP."}`;
  
  const posterUrl = getImageUrl(details.poster_path, "w500");
  const url = `https://www.cinexp.site/media/${type}/${rawId}`;

  return {
    title,
    description: overview,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description: overview,
      url,
      images: [
        {
          url: 'https://www.cinexp.site/og-rect-v2.png',
          width: 1200,
          height: 630,
          alt: 'CineXP - Premium Streaming',
        },
        {
          url: 'https://www.cinexp.site/og-square-v2.png',
          width: 800,
          height: 800,
          alt: 'CineXP - Premium Streaming',
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: overview,
      images: ['https://www.cinexp.site/og-rect-v2.png'],
    },
  };
}

export default async function MediaPage({
  params,
}: {
  params: Promise<{ type: "movie" | "tv"; id: string }>;
}) {
  const { type, id: rawId } = await params;
  const id = rawId.split("-")[0];

  const [details, similar, adSettings] = await Promise.all([
    getDetails(type, id),
    getSimilar(type, id),
    getAdSettings()
  ]);

  if (!details) {
    return (
      <div className="page-wrapper container" style={{ paddingTop: "20vh", textAlign: "center" }}>
        <h1>Content Temporarily Unavailable</h1>
        <p style={{ opacity: 0.7 }}>We&apos;re having trouble loading this title. Please try again in a moment.</p>
        <Link href="/">Browse Available Titles</Link>
      </div>
    );
  }

  const title = (details as any).title || (details as any).name;
  const year = ((details as any).release_date || (details as any).first_air_date || "").split("-")[0];
  const backdropUrl = getBackdropUrl(details.backdrop_path);
  const posterUrl = getImageUrl(details.poster_path, "w500");
  const seasons = (details as any).seasons as any[] | undefined;

  // Comprehensive Indian content detection — covers all Indian languages, not just Hindi
  const INDIAN_LANGUAGES = ['hi', 'ta', 'te', 'ml', 'kn', 'bn', 'mr', 'pa', 'gu', 'or', 'as', 'ur', 'bh', 'sa'];
  const origLang = (details as any).original_language || '';
  const originCountries: string[] = (details as any).origin_country || [];
  const prodCountries: { iso_3166_1: string }[] = (details as any).production_countries || [];
  const isIndian =
    originCountries.includes('IN') ||
    INDIAN_LANGUAGES.includes(origLang) ||
    prodCountries.some((c: any) => c.iso_3166_1 === 'IN');
  const industry = isIndian ? 'bollywood' : 'hollywood';

  const historyItem = {
    id: String(id),
    type,
    title,
    poster_path: details.poster_path,
    backdrop_path: details.backdrop_path,
  };

  const jsonLd: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": type === "movie" ? "Movie" : "TVSeries",
    name: title,
    image: posterUrl,
    description: details.overview || `Watch ${title} online for free in HD on CineXP.`,
    dateCreated: year,
    url: `https://www.cinexp.site/media/${type}/${rawId}`,
  };

  // Enrich with aggregateRating if TMDB has votes
  if (details.vote_average > 0 && details.vote_count > 0) {
    jsonLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: details.vote_average.toFixed(1),
      bestRating: "10",
      ratingCount: details.vote_count,
    };
  }

  // Enrich with genre list
  if (details.genres && details.genres.length > 0) {
    jsonLd.genre = details.genres.map((g: any) => g.name);
  }

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://www.cinexp.site",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: type === "movie" ? "Movies" : "TV Shows",
        item: `https://www.cinexp.site/${type === "movie" ? "movies" : "tv"}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: title,
        item: `https://www.cinexp.site/media/${type}/${rawId}`,
      },
    ],
  };

  return (
    <div style={{ minHeight: "100vh" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <HistoryTracker item={historyItem} />
      
      {/* Cinematic Backdrop */}
      {backdropUrl && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundImage: `url(${backdropUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center top",
            zIndex: 0,
            opacity: 0.12,
          }}
        />
      )}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "linear-gradient(to bottom, rgba(4,1,10,0.5) 0%, #04010a 65%)",
          zIndex: 0,
          pointerEvents: "none",
        }}
      />

      <div className="page-wrapper container" style={{ position: "relative", zIndex: 1, paddingBottom: "5rem" }}>
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            marginBottom: "2.5rem",
            opacity: 0.6,
            fontSize: "0.95rem",
          }}
        >
          <VscArrowLeft size={18} /> Back to Browse
        </Link>

        {/* Media Header */}
        <div style={{ display: "flex", gap: "2.5rem", marginBottom: "3.5rem", flexWrap: "wrap", alignItems: "flex-start" }}>
          {/* Poster */}
          {posterUrl && (
            <div
              style={{
                width: "clamp(160px, 18vw, 250px)",
                flexShrink: 0,
                borderRadius: "14px",
                overflow: "hidden",
                boxShadow: "0 12px 50px rgba(157,0,255,0.4)",
                border: "1px solid rgba(157,0,255,0.25)",
              }}
            >
              <img 
                src={posterUrl} 
                alt={title} 
                width={250} 
                height={375} 
                fetchPriority="high"
                style={{ width: "100%", height: "auto", display: "block" }} 
              />
            </div>
          )}

          {/* Info */}
          <div style={{ flex: 1, minWidth: "260px" }}>
            <h1 style={{ fontSize: "clamp(1.8rem, 4vw, 3rem)", fontWeight: 700, marginBottom: "0.75rem", lineHeight: 1.15 }}>
              {title}
            </h1>

            <div style={{ display: "flex", gap: "0.6rem", marginBottom: "1.5rem", flexWrap: "wrap", alignItems: "center" }}>
              {year && (
                <span style={{ padding: "0.2rem 0.7rem", border: "1px solid var(--primary)", borderRadius: "6px", fontSize: "0.85rem", color: "var(--accent)" }}>
                  {year}
                </span>
              )}
              {details.vote_average > 0 && (
                <span style={{ fontSize: "0.95rem" }}>⭐ {details.vote_average.toFixed(1)}</span>
              )}
              {(details as any).runtime > 0 && (
                <span style={{ opacity: 0.65, fontSize: "0.9rem" }}>{(details as any).runtime} min</span>
              )}
              {(details as any).number_of_seasons && (
                <span style={{ opacity: 0.65, fontSize: "0.9rem" }}>
                  {(details as any).number_of_seasons} Season{(details as any).number_of_seasons > 1 ? "s" : ""}
                </span>
              )}
              <span style={{ padding: "0.15rem 0.6rem", background: "var(--primary)", borderRadius: "4px", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.08em" }}>
                {type.toUpperCase()}
              </span>
            </div>

            <p style={{ fontSize: "1.05rem", lineHeight: 1.8, marginBottom: "1.75rem", maxWidth: "700px", opacity: 0.85 }}>
              {details.overview || `Watch ${title}${year ? ` (${year})` : ''} full ${type === 'movie' ? 'movie' : 'TV show'} online for free in HD. Stream the latest and best content on CineXP — no sign-up required.`}
            </p>

            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {details.genres?.map((g: any) => (
                <span
                  key={g.id}
                  style={{
                    padding: "0.35rem 0.9rem",
                    background: "rgba(157,0,255,0.12)",
                    border: "1px solid rgba(157,0,255,0.25)",
                    borderRadius: "20px",
                    fontSize: "0.85rem",
                    color: "var(--accent)",
                  }}
                >
                  {g.name}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Interactive: Season picker + Player + Downloads */}
        <Suspense fallback={
          <div style={{
            aspectRatio: '16/9', width: '100%', background: '#0a0510',
            borderRadius: '16px', display: 'flex', alignItems: 'center',
            justifyContent: 'center', border: '1px solid rgba(157,0,255,0.15)'
          }}>
            <div style={{ textAlign: 'center', opacity: 0.7 }}>
              <p style={{ fontSize: '1.1rem', fontWeight: 500 }}>Loading player stream...</p>
              <p style={{ fontSize: '0.85rem', marginTop: '0.5rem', opacity: 0.6 }}>
                {title} — Stream free in HD on CineXP
              </p>
            </div>
          </div>
        }>
          <MediaInteractive 
            id={id} 
            type={type} 
            imdbId={(details as any).external_ids?.imdb_id} 
            seasons={seasons} 
            title={title} 
            posterUrl={posterUrl} 
            year={year}
            industry={industry}
            adPostersEnabled={adSettings.postersEnabled}
          />
        </Suspense>

        {/* Ad between player and recommendations */}
        {adSettings.postersEnabled && (
          <AdSlot />
        )}

        {/* Similar / Recommended Content */}
        {similar.length > 0 && (
          <div style={{ marginTop: "3rem" }}>
            <h2 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "1.5rem" }}>You Might Also Like</h2>
            <div className="grid">
              {similar.map((item, index) => (
                <MediaCard key={`${item.media_type}-${item.id}`} item={item} stagger={index * 0.05} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

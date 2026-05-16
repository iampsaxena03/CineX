"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { VscClose, VscSearch } from "react-icons/vsc";
import { getImageUrl, type TMDBMediaItem } from "@/lib/tmdb";
import { generateSlug } from "@/lib/utils";

type Props = {
  compact?: boolean;
  hidden?: boolean;
};

export default function HomeSearchBar({ compact = false, hidden = false }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TMDBMediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();

    if (!q) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const res = await fetch(`/api/tmdb/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        if (!controller.signal.aborted) {
          setResults(Array.isArray(data.results) ? data.results.slice(0, 6) : []);
        }
      } catch (err: any) {
        if (err?.name !== "AbortError") setResults([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 220);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const q = query.trim();
    if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <form
      className={`home-search ${compact ? "home-search-compact" : ""} ${hidden ? "home-search-hidden" : ""}`}
      onSubmit={submit}
      role="search"
    >
      <VscSearch className="home-search-icon" aria-hidden />
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search movies, series..."
        aria-label="Search movies and series"
      />
      {query && (
        <button
          type="button"
          className="home-search-clear"
          onClick={() => {
            setQuery("");
            setResults([]);
          }}
          aria-label="Clear search"
        >
          <VscClose />
        </button>
      )}

      {(query.trim() || loading) && (
        <div className="home-search-dropdown">
          {loading && <div className="home-search-state">Searching...</div>}
          {!loading && results.length === 0 && (
            <div className="home-search-state">No results found</div>
          )}
          {!loading &&
            results.map((item) => {
              const mediaType = item.media_type === "tv" ? "tv" : "movie";
              const title = (item as any).title || (item as any).name || "Untitled";
              const year = ((item as any).release_date || (item as any).first_air_date || "").slice(0, 4);

              return (
                <Link
                  key={`${mediaType}-${item.id}`}
                  href={`/media/${mediaType}/${generateSlug(item.id, title)}`}
                  className="home-search-result"
                  onClick={() => setQuery("")}
                >
                  <span className="home-search-poster">
                    {item.poster_path ? (
                      <img src={getImageUrl(item.poster_path, "w185")} alt="" loading="lazy" />
                    ) : (
                      <span />
                    )}
                  </span>
                  <span className="home-search-copy">
                    <strong>{title}</strong>
                    <small>{[mediaType === "tv" ? "Series" : "Movie", year].filter(Boolean).join(" | ")}</small>
                  </span>
                </Link>
              );
            })}
        </div>
      )}
    </form>
  );
}

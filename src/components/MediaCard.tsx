"use client";

import React, { useRef, useState, MouseEvent, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";

import { getImageUrl, type TMDBMediaItem } from "@/lib/tmdb";
import { generateSlug } from "@/lib/utils";
import ScrollReveal from "@/components/ui/ScrollReveal";
import ContextMenu from "./ui/ContextMenu";
import useLongPress from "@/hooks/useLongPress";

interface MediaCardProps {
  item: TMDBMediaItem;
  stagger?: number;
  showRemoveHistory?: boolean;
}

/**
 * MediaCard: A client-side card wrapper that handles the 
 * scroll-reveal and an interactive 3D tilt effect on hover.
 */
const MediaCard: React.FC<MediaCardProps> = ({ item, stagger = 0, showRemoveHistory = false }) => {
  const mediaType = item.media_type === "tv" ? "tv" : "movie";
  const title = (item as any).title || (item as any).name;
  const year = ((item as any).release_date || (item as any).first_air_date || "").split("-")[0];

  const cardRef = useRef<HTMLAnchorElement>(null);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [transform, setTransform] = useState("perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)");
  const [transition, setTransition] = useState("transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease");
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [showTrailer, setShowTrailer] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number } | null>(null);
  const [canHover, setCanHover] = useState(false);

  useEffect(() => {
    // Check if the device actually supports hover (i.e., has a mouse/cursor)
    const hoverMediaQuery = window.matchMedia("(hover: hover)");
    setCanHover(hoverMediaQuery.matches);
  }, []);

  const handleMouseMove = (e: MouseEvent<HTMLAnchorElement>) => {
    if (!cardRef.current || !canHover) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Calculate rotation (-10 to 10 degrees)
    const rotateX = ((y - centerY) / centerY) * -10;
    const rotateY = ((x - centerX) / centerX) * 10;
    
    setTransform(`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`);
    setTransition("transform 0.1s ease-out, border-color 0.3s ease, box-shadow 0.3s ease");
  };

  const handleMouseEnter = () => {
    if (!canHover) return; // Don't trigger trailer on non-hover devices
    
    hoverTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/tmdb/video?id=${item.id}&type=${mediaType}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.key) {
          setTrailerKey(data.key);
          setShowTrailer(true);
        }
      } catch (e) {
        console.error("Failed to fetch trailer overlay");
      }
    }, 2000);
  };

  const handleMouseLeave = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setShowTrailer(false);
    
    setTransform("perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)");
    setTransition("transform 0.4s ease-out, border-color 0.3s ease, box-shadow 0.3s ease");
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const longPressProps = useLongPress((e) => {
    const touch = e.touches ? e.touches[0] : e;
    setContextMenu({ x: touch.clientX, y: touch.clientY });
  });

  return (
    <ScrollReveal stagger={stagger}>
      <div 
        className="card-wrapper"
        onContextMenu={handleContextMenu}
        {...longPressProps}
        style={{ 
          position: 'relative',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none'
        }}
      >
        <Link
          href={item.preferredStream ? `/media/${mediaType}/${generateSlug(item.id, title)}?stream=${item.preferredStream}` : `/media/${mediaType}/${generateSlug(item.id, title)}`}
          key={`${item.media_type}-${item.id}`}
          className="card"
          ref={cardRef}
          onMouseEnter={handleMouseEnter}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{ transform, transition }}
        >
        <div className="card-image-wrapper" style={{ position: "relative" }}>
          {showTrailer && trailerKey && (
            <iframe
              src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=1&controls=0&loop=1&playlist=${trailerKey}&modestbranding=1&playsinline=1`}
              style={{
                position: "absolute",
                top: 0,
                left: "-50%",
                width: "200%",
                height: "100%",
                border: "none",
                zIndex: 10,
                pointerEvents: "none",
                objectFit: "cover"
              }}
              allow="autoplay; encrypted-media; picture-in-picture"
              title="Mini Trailer"
            />
          )}
          {item.poster_path ? (
            <img
              src={getImageUrl(item.poster_path, "w342")}
              alt={title}
              loading="lazy"
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div className="placeholder">No Image</div>
          )}
        </div>
        <div className="card-info">
          <h3>{title}</h3>
          <p>{year}</p>
        </div>
        </Link>

        <ContextMenu
          x={contextMenu?.x || 0}
          y={contextMenu?.y || 0}
          isOpen={!!contextMenu}
          onClose={() => setContextMenu(null)}
          showRemoveHistory={showRemoveHistory}
          item={{
            id: item.id,
            title: title,
            type: mediaType,
            poster_path: item.poster_path || null,
            backdrop_path: item.backdrop_path || null,
          }}
        />
      </div>
    </ScrollReveal>
  );
};

export default MediaCard;

"use client";

import React, { useState } from "react";
import Link from "next/link";

import { getImageUrl, type TMDBMediaItem } from "@/lib/tmdb";
import { generateSlug } from "@/lib/utils";
import ContextMenu from "./ui/ContextMenu";
import useLongPress from "@/hooks/useLongPress";

interface MediaCardProps {
  item: TMDBMediaItem;
  stagger?: number;
  showRemoveHistory?: boolean;
  priority?: boolean;
}

/**
 * MediaCard: A client-side card wrapper that handles the 
 * scroll-reveal and an interactive 3D tilt effect on hover.
 */
const MediaCard: React.FC<MediaCardProps> = ({ item, stagger = 0, showRemoveHistory = false, priority = false }) => {
  const mediaType = item.media_type === "tv" ? "tv" : "movie";
  const title = (item as any).title || (item as any).name;
  const year = ((item as any).release_date || (item as any).first_air_date || "").split("-")[0];

  const [contextMenu, setContextMenu] = useState<{ x: number, y: number } | null>(null);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const longPressProps = useLongPress((e) => {
    const touch = e.touches ? e.touches[0] : e;
    setContextMenu({ x: touch.clientX, y: touch.clientY });
  });

  return (
    <>
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
          style={{ display: "block", transition: "transform 0.2s ease-out" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
        <div className="card-image-wrapper" style={{ position: "relative" }}>
          {item.poster_path ? (
            <img
              src={getImageUrl(item.poster_path, "w342")}
              alt={title}
              loading={priority ? "eager" : "lazy"}
              fetchPriority={priority ? "high" : "auto"}
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
    </>
  );
};

export default MediaCard;

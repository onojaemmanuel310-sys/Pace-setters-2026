"use client";

import { useEffect } from "react";

interface LightboxProps {
  isOpen: boolean;
  imageUrl: string;
  caption?: string | null;
  authorName?: string | null;
  date?: string | null;
  onClose: () => void;
}

export function Lightbox({
  isOpen,
  imageUrl,
  caption,
  authorName,
  date,
  onClose,
}: LightboxProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "auto";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="lightbox-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="lightbox-container" onClick={(e) => e.stopPropagation()}>
        <button
          className="lightbox-close"
          onClick={onClose}
          aria-label="Close image viewer"
        >
          ✕
        </button>

        <div className="lightbox-media">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={caption || "PACE SETTERS 2026 Yearbook Photograph"}
            className="lightbox-img"
          />
        </div>

        {(caption || authorName || date) && (
          <div className="lightbox-details">
            {caption && <p className="lightbox-caption">{caption}</p>}
            <div className="lightbox-meta">
              {authorName && (
                <span className="lightbox-author">Uploaded by {authorName}</span>
              )}
              {date && (
                <span className="lightbox-date">
                  {new Date(date).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

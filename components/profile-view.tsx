"use client";

import { useState } from "react";
import Link from "next/link";
import { Lightbox } from "./lightbox";
import {
  GraduateProfile,
  GraduatePhoto,
  GraduateAchievement,
  GraduateMemory,
} from "@/lib/supabase/types";

interface ProfileViewProps {
  profile: GraduateProfile;
  photos: GraduatePhoto[];
  achievements: GraduateAchievement[];
  memories: GraduateMemory[];
  isOwner: boolean;
  isAdmin: boolean;
  matricNumber?: string | null;
}

export function ProfileView({
  profile,
  photos,
  achievements,
  memories,
  isOwner,
  isAdmin,
  matricNumber,
}: ProfileViewProps) {
  const [activeTab, setActiveTab] = useState<"photos" | "achievements" | "memories">("photos");
  const [selectedPhoto, setSelectedPhoto] = useState<GraduatePhoto | null>(null);

  const canViewMatric =
    Boolean(matricNumber) &&
    (profile.privacy_settings?.show_matric || isOwner || isAdmin);

  const canViewPhone =
    Boolean(profile.phone) &&
    (profile.privacy_settings?.show_phone || isOwner || isAdmin);

  function getInitials(name: string): string {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  return (
    <div className="profile-page-shell">
      {/* Profile Header Banner */}
      <section className="profile-banner-hero">
        <div className="wrap profile-banner-content">
          <div className="profile-avatar-container">
            {profile.profile_photo_url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={profile.profile_photo_url}
                alt={profile.full_name}
                className="profile-main-avatar"
              />
            ) : (
              <div className="profile-initials-crest">
                <span>{getInitials(profile.full_name)}</span>
              </div>
            )}
            <span className="profile-status-dot-badge" title="Verified Graduate">
              ✓
            </span>
          </div>

          <div className="profile-header-info">
            <div className="eyebrow">PACE SETTER · CLASS OF 2026</div>
            <h1 className="profile-display-name">{profile.full_name}</h1>
            <p className="profile-dept-lead">{profile.department}</p>

            <div className="profile-meta-tags">
              {canViewMatric && (
                <span className="meta-tag gold">
                  Matric: {matricNumber}
                </span>
              )}
              {canViewPhone && (
                <span className="meta-tag">
                  📞 {profile.phone}
                </span>
              )}
              <span className="meta-tag verified-tag">
                ✓ Verified Graduate
              </span>
            </div>

            {profile.bio && (
              <p className="profile-bio-text">&ldquo;{profile.bio}&rdquo;</p>
            )}

            {isOwner && (
              <div className="profile-owner-actions">
                <Link href="/dashboard" className="button-gold-sm">
                  ✏ Edit Profile & Privacy
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Tabs Navigation */}
      <section className="profile-tabs-section wrap">
        <div className="profile-tabs-bar">
          <button
            className={activeTab === "photos" ? "tab-btn active" : "tab-btn"}
            onClick={() => setActiveTab("photos")}
            type="button"
          >
            Photos ({photos.length})
          </button>
          <button
            className={activeTab === "achievements" ? "tab-btn active" : "tab-btn"}
            onClick={() => setActiveTab("achievements")}
            type="button"
          >
            Honors & Achievements ({achievements.length})
          </button>
          <button
            className={activeTab === "memories" ? "tab-btn active" : "tab-btn"}
            onClick={() => setActiveTab("memories")}
            type="button"
          >
            Stories & Memories ({memories.length})
          </button>
        </div>

        {/* Tab 1: Graduation Photos */}
        {activeTab === "photos" && (
          <div className="profile-tab-content">
            {photos.length > 0 ? (
              <div className="yearbook-masonry-grid">
                {photos.map((photo) => (
                  <figure
                    className="yearbook-photo-card"
                    key={photo.id}
                    onClick={() => setSelectedPhoto(photo)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.image_url}
                      alt={photo.caption || "Graduation photo"}
                      className="yearbook-img"
                    />
                    {photo.caption && (
                      <figcaption className="photo-card-overlay">
                        <div className="overlay-text">
                          <p className="caption-text">{photo.caption}</p>
                        </div>
                      </figcaption>
                    )}
                  </figure>
                ))}
              </div>
            ) : (
              <div className="empty-state-panel">
                <div className="empty-state-icon">📷</div>
                <h3>No Photos Published</h3>
                <p>
                  {profile.full_name} has not published any graduation photographs yet.
                </p>
                {isOwner && (
                  <Link href="/dashboard" className="button-gold-sm">
                    Upload Your Photos ↗
                  </Link>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Achievements */}
        {activeTab === "achievements" && (
          <div className="profile-tab-content">
            {achievements.length > 0 ? (
              <div className="achievements-grid">
                {achievements.map((ach) => (
                  <article className="achievement-card" key={ach.id}>
                    <div className="achievement-card-header">
                      <span className="achievement-badge">{ach.category}</span>
                      <span className="achievement-date">
                        {new Date(ach.created_at).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                        })}
                      </span>
                    </div>
                    <h3 className="achievement-title">{ach.title}</h3>
                    <p className="achievement-desc">{ach.description}</p>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state-panel">
                <div className="empty-state-icon">🎖</div>
                <h3>No Achievements Listed</h3>
                <p>
                  No honors or milestones recorded for this graduate yet.
                </p>
                {isOwner && (
                  <Link href="/dashboard" className="button-gold-sm">
                    Add An Achievement ↗
                  </Link>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Memories */}
        {activeTab === "memories" && (
          <div className="profile-tab-content">
            {memories.length > 0 ? (
              <div className="memories-cards-grid">
                {memories.map((mem) => (
                  <article className="memory-card" key={mem.id}>
                    <div className="memory-card-top">
                      <span className="memory-category-tag">{mem.category}</span>
                      <span className="memory-date">
                        {new Date(mem.created_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    {mem.photo_url && (
                      <div className="memory-card-img-wrap">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={mem.photo_url}
                          alt={mem.title}
                          className="memory-card-img"
                        />
                      </div>
                    )}
                    <h3 className="memory-title">{mem.title}</h3>
                    <p className="memory-story">{mem.content}</p>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state-panel">
                <div className="empty-state-icon">📖</div>
                <h3>No Memories Penned</h3>
                <p>
                  {profile.full_name} has not authored any class memories yet.
                </p>
                {isOwner && (
                  <Link href="/dashboard" className="button-gold-sm">
                    Write a Memory ↗
                  </Link>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Lightbox for full size photo */}
      {selectedPhoto && (
        <Lightbox
          isOpen={Boolean(selectedPhoto)}
          imageUrl={selectedPhoto.image_url}
          caption={selectedPhoto.caption}
          authorName={profile.full_name}
          date={selectedPhoto.created_at}
          onClose={() => setSelectedPhoto(null)}
        />
      )}
    </div>
  );
}

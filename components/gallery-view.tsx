"use client";

import { useEffect, useState } from "react";
import { Lightbox } from "./lightbox";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { GraduatePhoto } from "@/lib/supabase/types";

interface GalleryViewProps {
  initialPhotos: GraduatePhoto[];
}

export function GalleryView({ initialPhotos }: GalleryViewProps) {
  const [photos, setPhotos] = useState<GraduatePhoto[]>(initialPhotos);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [isApproved, setIsApproved] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Lightbox State
  const [activePhoto, setActivePhoto] = useState<GraduatePhoto | null>(null);

  // Upload Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    try {
      const supabase = createClient();
      supabase.auth.getUser().then(async ({ data }) => {
        if (data.user) {
          setUser({ id: data.user.id, email: data.user.email });

          // Check if approved graduate
          const { data: reg } = await supabase
            .from("graduate_registrations")
            .select("approval_status")
            .eq("user_id", data.user.id)
            .maybeSingle();

          setIsApproved(reg?.approval_status === "approved");

          // Check if admin
          const { data: role } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", data.user.id)
            .maybeSingle();

          setIsAdmin(role?.role === "admin");
        }
      });
    } catch {
      // Graceful fallback
    }
  }, []);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    setUploadMessage(null);
    if (!e.target.files || e.target.files.length === 0) return;
    const selected = e.target.files[0];

    // Validate type
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!validTypes.includes(selected.type)) {
      setUploadMessage({
        text: "Please select a valid image file (JPEG, PNG, or WebP).",
        type: "error",
      });
      return;
    }

    // Validate size (max 10MB)
    if (selected.size > 10 * 1024 * 1024) {
      setUploadMessage({
        text: "Image file size must be less than 10MB.",
        type: "error",
      });
      return;
    }

    setFile(selected);
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !user) return;
    if (!isApproved) {
      setUploadMessage({
        text: "Only approved graduates can upload photographs. Your registration is still pending verification.",
        type: "error",
      });
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(15);
      const supabase = createClient();

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;

      setUploadProgress(40);
      const { error: storageError } = await supabase.storage
        .from("yearbook_photos")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (storageError) throw storageError;

      setUploadProgress(75);
      const { data: urlData } = supabase.storage
        .from("yearbook_photos")
        .getPublicUrl(fileName);

      const imageUrl = urlData.publicUrl;

      // Insert record in graduate_photos
      const { data: newPhotoRecord, error: insertError } = await supabase
        .from("graduate_photos")
        .insert([
          {
            user_id: user.id,
            storage_path: fileName,
            image_url: imageUrl,
            caption: caption.trim() || null,
            is_approved: true,
            is_removed: false,
          },
        ])
        .select("*, graduate_profiles(full_name, department)")
        .single();

      if (insertError) throw insertError;

      setUploadProgress(100);
      setUploadMessage({
        text: "Photograph uploaded successfully! It is now live in the gallery.",
        type: "success",
      });

      if (newPhotoRecord) {
        setPhotos([newPhotoRecord, ...photos]);
      }

      // Reset form
      setFile(null);
      setCaption("");
      setTimeout(() => {
        setIsUploadModalOpen(false);
        setUploadProgress(0);
        setUploadMessage(null);
      }, 1500);
    } catch (err: unknown) {
      console.error("Upload error:", err);
      setUploadMessage({
        text:
          err instanceof Error
            ? err.message
            : "Upload failed. Please ensure storage bucket 'yearbook_photos' is created.",
        type: "error",
      });
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDelete(photoId: string, storagePath: string) {
    if (!confirm("Are you sure you want to remove this photograph?")) return;
    try {
      const supabase = createClient();

      // Soft delete from DB
      const { error: dbError } = await supabase
        .from("graduate_photos")
        .update({ is_removed: true })
        .eq("id", photoId);

      if (dbError) throw dbError;

      // Delete from storage if possible
      await supabase.storage.from("yearbook_photos").remove([storagePath]);

      setPhotos(photos.filter((p) => p.id !== photoId));
      if (activePhoto?.id === photoId) setActivePhoto(null);
    } catch (err) {
      console.error("Delete error:", err);
      alert("Failed to delete photograph. Please try again.");
    }
  }

  return (
    <div className="gallery-view-container">
      {/* Top Banner / Upload Bar */}
      <div className="gallery-header-row">
        <div>
          <p className="gallery-count-text">
            Preserving <strong>{photos.length}</strong> official graduation
            moments
          </p>
        </div>

        {user && isApproved ? (
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="button-gold-sm"
            type="button"
          >
            + Upload Graduation Photo
          </button>
        ) : user ? (
          <div className="pending-upload-pill">
            ⏳ Membership verification pending (photo uploads unlock upon approval)
          </div>
        ) : (
          <a href="/login" className="button-outline-sm">
            Sign In to Upload Photos ↗
          </a>
        )}
      </div>

      {/* Photo Grid */}
      {photos.length > 0 ? (
        <div className="yearbook-masonry-grid">
          {photos.map((photo) => {
            const isOwner = user?.id === photo.user_id;
            const canDelete = isOwner || isAdmin;

            return (
              <figure
                className="yearbook-photo-card"
                key={photo.id}
                onClick={() => setActivePhoto(photo)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.image_url}
                  alt={photo.caption || "PACE SETTERS 2026 Graduation Photograph"}
                  loading="lazy"
                  className="yearbook-img"
                />

                <figcaption className="photo-card-overlay">
                  <div className="overlay-text">
                    <p className="caption-text">
                      {photo.caption || "A PACE SETTERS memory"}
                    </p>
                    <small className="author-text">
                      {photo.graduate_profiles?.full_name || "Graduate"} •{" "}
                      {photo.graduate_profiles?.department || "PACE SETTERS"}
                    </small>
                  </div>

                  {canDelete && (
                    <button
                      className="delete-photo-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(photo.id, photo.storage_path);
                      }}
                      title="Delete this photo"
                      type="button"
                    >
                      🗑
                    </button>
                  )}
                </figcaption>
              </figure>
            );
          })}
        </div>
      ) : (
        <div className="empty-gallery-box">
          <div className="empty-icon">📷</div>
          <h3>The Yearbook Gallery Awaits</h3>
          <p>
            No graduation photos have been published yet. Be among the first
            approved graduates to capture your memory in our digital archive!
          </p>
          {user && isApproved && (
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="button-gold"
              type="button"
            >
              Upload First Photograph ↗
            </button>
          )}
        </div>
      )}

      {/* Lightbox Component */}
      {activePhoto && (
        <Lightbox
          isOpen={Boolean(activePhoto)}
          imageUrl={activePhoto.image_url}
          caption={activePhoto.caption}
          authorName={
            activePhoto.graduate_profiles?.full_name
              ? `${activePhoto.graduate_profiles.full_name} (${activePhoto.graduate_profiles.department})`
              : null
          }
          date={activePhoto.created_at}
          onClose={() => setActivePhoto(null)}
        />
      )}

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div
          className="modal-backdrop"
          onClick={() => !isUploading && setIsUploadModalOpen(false)}
        >
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-header">
              <h3>Upload Graduation Photo</h3>
              <button
                className="close-modal-btn"
                onClick={() => !isUploading && setIsUploadModalOpen(false)}
                disabled={isUploading}
                type="button"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpload} className="upload-modal-form">
              <div className="form-field">
                <label htmlFor="photo_file">Select Photo (JPEG, PNG, WebP — Max 10MB)</label>
                <input
                  id="photo_file"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileSelect}
                  required
                  disabled={isUploading}
                />
              </div>

              <div className="form-field">
                <label htmlFor="photo_caption">Caption or Memory (Optional)</label>
                <textarea
                  id="photo_caption"
                  rows={3}
                  maxLength={300}
                  placeholder="Share a story, quote, or memory related to this photo..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  disabled={isUploading}
                />
              </div>

              {isUploading && (
                <div className="progress-bar-wrapper">
                  <div
                    className="progress-fill"
                    style={{ width: `${uploadProgress}%` }}
                  />
                  <span className="progress-text">Uploading: {uploadProgress}%</span>
                </div>
              )}

              {uploadMessage && (
                <div className={`message-banner ${uploadMessage.type}`}>
                  {uploadMessage.text}
                </div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="button-outline-sm"
                  onClick={() => setIsUploadModalOpen(false)}
                  disabled={isUploading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="button-gold"
                  disabled={!file || isUploading}
                >
                  {isUploading ? "Uploading..." : "Publish to Gallery ↗"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

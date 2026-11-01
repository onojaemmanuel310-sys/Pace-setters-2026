"use client";

import { useEffect, useState } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { GraduateMemory } from "@/lib/supabase/types";

interface MemoriesViewProps {
  initialMemories: GraduateMemory[];
}

const CATEGORIES = [
  "All",
  "General",
  "Graduation Story",
  "Class Event",
  "Appreciation",
  "Milestone",
  "Lesson Learned",
  "Friendship",
] as const;

export function MemoriesView({ initialMemories }: MemoriesViewProps) {
  const [memories, setMemories] = useState<GraduateMemory[]>(initialMemories);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [isApproved, setIsApproved] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<GraduateMemory["category"]>("General");
  const [photoUrl, setPhotoUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    try {
      const supabase = createClient();
      supabase.auth.getUser().then(async ({ data }) => {
        if (data.user) {
          setUser({ id: data.user.id });

          const { data: reg } = await supabase
            .from("graduate_registrations")
            .select("approval_status")
            .eq("user_id", data.user.id)
            .maybeSingle();

          setIsApproved(reg?.approval_status === "approved");

          const { data: role } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", data.user.id)
            .maybeSingle();

          setIsAdmin(role?.role === "admin");
        }
      });
    } catch {
      // Fallback
    }
  }, []);

  const filteredMemories = memories.filter((m) => {
    if (activeCategory === "All") return true;
    return m.category === activeCategory;
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!isApproved) {
      setStatusMessage({
        text: "Only approved graduates can publish memories. Your verification is pending.",
        type: "error",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      setStatusMessage(null);
      const supabase = createClient();

      const { data: newMemory, error } = await supabase
        .from("graduate_memories")
        .insert([
          {
            user_id: user.id,
            title: title.trim(),
            content: content.trim(),
            category,
            photo_url: photoUrl.trim() || null,
            moderation_status: "approved",
          },
        ])
        .select("*, graduate_profiles(full_name, department)")
        .single();

      if (error) throw error;

      setStatusMessage({
        text: "Memory shared successfully! It is now part of our class archive.",
        type: "success",
      });

      if (newMemory) {
        setMemories([newMemory, ...memories]);
      }

      setTitle("");
      setContent("");
      setPhotoUrl("");
      setTimeout(() => {
        setIsModalOpen(false);
        setStatusMessage(null);
      }, 1400);
    } catch (err: unknown) {
      console.error("Memory submission error:", err);
      setStatusMessage({
        text: err instanceof Error ? err.message : "Failed to save memory.",
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(memoryId: string) {
    if (!confirm("Are you sure you want to delete this memory?")) return;
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("graduate_memories")
        .delete()
        .eq("id", memoryId);

      if (error) throw error;
      setMemories(memories.filter((m) => m.id !== memoryId));
    } catch (err) {
      console.error("Delete memory error:", err);
      alert("Failed to delete memory.");
    }
  }

  return (
    <div className="memories-container">
      {/* Category Pills & Action Header */}
      <div className="memories-nav-row">
        <div className="category-scroll-pills">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={activeCategory === cat ? "cat-pill active" : "cat-pill"}
              onClick={() => setActiveCategory(cat)}
              type="button"
            >
              {cat}
            </button>
          ))}
        </div>

        {user && isApproved ? (
          <button
            onClick={() => setIsModalOpen(true)}
            className="button-gold-sm"
            type="button"
          >
            + Share a Memory
          </button>
        ) : user ? (
          <span className="pending-upload-pill">
            Membership verification pending
          </span>
        ) : (
          <a href="/login" className="button-outline-sm">
            Sign In to Share ↗
          </a>
        )}
      </div>

      {/* Memories Grid */}
      {filteredMemories.length > 0 ? (
        <div className="memories-cards-grid">
          {filteredMemories.map((item) => {
            const isOwner = user?.id === item.user_id;
            const canDelete = isOwner || isAdmin;

            return (
              <article className="memory-card" key={item.id}>
                <div className="memory-card-top">
                  <span className="memory-category-tag">{item.category}</span>
                  <span className="memory-date">
                    {new Date(item.created_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>

                {item.photo_url && (
                  <div className="memory-card-img-wrap">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.photo_url}
                      alt={item.title}
                      className="memory-card-img"
                    />
                  </div>
                )}

                <h3 className="memory-title">{item.title}</h3>
                <p className="memory-story">{item.content}</p>

                <div className="memory-card-foot">
                  <div className="memory-author-block">
                    <span className="author-icon">✍</span>
                    <div>
                      <strong>
                        {item.graduate_profiles?.full_name || "Pace Setter"}
                      </strong>
                      <small>
                        {item.graduate_profiles?.department || "Class of 2026"}
                      </small>
                    </div>
                  </div>

                  {canDelete && (
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="delete-item-btn"
                      title="Delete memory"
                      type="button"
                    >
                      🗑
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty-state-panel">
          <div className="empty-state-icon">📖</div>
          <h3>No Memories in this Category</h3>
          <p>
            No stories have been shared under &ldquo;{activeCategory}&rdquo; yet.
            Be the first to leave a lasting footprint in our class chronicle.
          </p>
          {user && isApproved && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="button-gold-sm"
              type="button"
            >
              Share First Memory ↗
            </button>
          )}
        </div>
      )}

      {/* Share Memory Modal */}
      {isModalOpen && (
        <div
          className="modal-backdrop"
          onClick={() => !isSubmitting && setIsModalOpen(false)}
        >
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-header">
              <h3>Share a Class Memory</h3>
              <button
                className="close-modal-btn"
                onClick={() => !isSubmitting && setIsModalOpen(false)}
                disabled={isSubmitting}
                type="button"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="memory-modal-form">
              <div className="form-field">
                <label htmlFor="mem_title">Story Title</label>
                <input
                  id="mem_title"
                  type="text"
                  required
                  maxLength={150}
                  placeholder="e.g. Our Final Exam Defense or Project Week"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              <div className="form-field">
                <label htmlFor="mem_cat">Category</label>
                <select
                  id="mem_cat"
                  value={category}
                  onChange={(e) =>
                    setCategory(e.target.value as GraduateMemory["category"])
                  }
                  className="filter-select"
                  disabled={isSubmitting}
                >
                  <option value="General">General</option>
                  <option value="Graduation Story">Graduation Story</option>
                  <option value="Class Event">Class Event</option>
                  <option value="Appreciation">Appreciation</option>
                  <option value="Milestone">Milestone</option>
                  <option value="Lesson Learned">Lesson Learned</option>
                  <option value="Friendship">Friendship</option>
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="mem_story">Your Story / Message</label>
                <textarea
                  id="mem_story"
                  rows={5}
                  required
                  maxLength={3000}
                  placeholder="Recount the moments, feelings, humor, or gratitude that shaped our university years..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              <div className="form-field">
                <label htmlFor="mem_photo">Optional Photo URL</label>
                <input
                  id="mem_photo"
                  type="url"
                  placeholder="https://... (Optional link to photo)"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              {statusMessage && (
                <div className={`message-banner ${statusMessage.type}`}>
                  {statusMessage.text}
                </div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="button-outline-sm"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="button-gold"
                  disabled={!title || !content || isSubmitting}
                >
                  {isSubmitting ? "Preserving..." : "Share Memory ↗"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

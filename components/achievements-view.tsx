"use client";

import { useEffect, useState } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { GraduateAchievement } from "@/lib/supabase/types";

interface AchievementsViewProps {
  initialAchievements: GraduateAchievement[];
}

const CATEGORIES = [
  "All",
  "Academic",
  "Career",
  "Certification",
  "Business",
  "Award",
  "Community Service",
  "Other",
] as const;

export function AchievementsView({ initialAchievements }: AchievementsViewProps) {
  const [achievements, setAchievements] = useState<GraduateAchievement[]>(initialAchievements);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [isApproved, setIsApproved] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<GraduateAchievement["category"]>("Academic");
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

  const filteredAchievements = achievements.filter((a) => {
    if (activeCategory === "All") return true;
    return a.category === activeCategory;
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!isApproved) {
      setStatusMessage({
        text: "Only approved graduates can submit achievements.",
        type: "error",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      setStatusMessage(null);
      const supabase = createClient();

      const { data: newAch, error } = await supabase
        .from("graduate_achievements")
        .insert([
          {
            user_id: user.id,
            title: title.trim(),
            description: description.trim(),
            category,
            moderation_status: "approved",
          },
        ])
        .select("*, graduate_profiles(full_name, department)")
        .single();

      if (error) throw error;

      setStatusMessage({
        text: "Achievement submitted successfully! It is now listed on the honors wall.",
        type: "success",
      });

      if (newAch) {
        setAchievements([newAch, ...achievements]);
      }

      setTitle("");
      setDescription("");
      setTimeout(() => {
        setIsModalOpen(false);
        setStatusMessage(null);
      }, 1400);
    } catch (err: unknown) {
      console.error("Achievement submission error:", err);
      setStatusMessage({
        text: err instanceof Error ? err.message : "Submission failed.",
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(achId: string) {
    if (!confirm("Are you sure you want to delete this achievement record?")) return;
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("graduate_achievements")
        .delete()
        .eq("id", achId);

      if (error) throw error;
      setAchievements(achievements.filter((a) => a.id !== achId));
    } catch (err) {
      console.error("Delete achievement error:", err);
      alert("Failed to delete achievement.");
    }
  }

  return (
    <div className="achievements-container">
      {/* Category Pills & Action Header */}
      <div className="achievements-nav-row">
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
            + Post an Achievement
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

      {/* Achievements Grid */}
      {filteredAchievements.length > 0 ? (
        <div className="achievements-grid">
          {filteredAchievements.map((item) => {
            const isOwner = user?.id === item.user_id;
            const canDelete = isOwner || isAdmin;

            return (
              <article className="achievement-card" key={item.id}>
                <div className="achievement-card-header">
                  <span className="achievement-badge">{item.category}</span>
                  <span className="achievement-date">
                    {new Date(item.created_at).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                    })}
                  </span>
                </div>

                <h3 className="achievement-title">{item.title}</h3>
                <p className="achievement-desc">{item.description}</p>

                <div className="achievement-card-footer">
                  <div className="graduate-signature">
                    <span className="medal-icon">🎖</span>
                    <div>
                      <strong>
                        {item.graduate_profiles?.full_name || "PACE SETTER"}
                      </strong>
                      <small>
                        {item.graduate_profiles?.department || "Graduate"}
                      </small>
                    </div>
                  </div>

                  {canDelete && (
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="delete-item-btn"
                      title="Remove achievement"
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
          <div className="empty-state-icon">🏆</div>
          <h3>Honors Wall Awaiting Submissions</h3>
          <p>
            No achievements have been recorded in the &ldquo;{activeCategory}&rdquo; category.
            Celebrate your academic, professional, or entrepreneurial milestones with your set.
          </p>
          {user && isApproved && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="button-gold-sm"
              type="button"
            >
              Submit First Milestone ↗
            </button>
          )}
        </div>
      )}

      {/* Post Achievement Modal */}
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
              <h3>Submit an Accomplishment or Milestone</h3>
              <button
                className="close-modal-btn"
                onClick={() => !isSubmitting && setIsModalOpen(false)}
                disabled={isSubmitting}
                type="button"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="achievement-modal-form">
              <div className="form-field">
                <label htmlFor="ach_title">Title of Achievement</label>
                <input
                  id="ach_title"
                  type="text"
                  required
                  maxLength={150}
                  placeholder="e.g. Best Graduating Student, PMP Certification, Startup Launch"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              <div className="form-field">
                <label htmlFor="ach_cat">Category</label>
                <select
                  id="ach_cat"
                  value={category}
                  onChange={(e) =>
                    setCategory(e.target.value as GraduateAchievement["category"])
                  }
                  className="filter-select"
                  disabled={isSubmitting}
                >
                  <option value="Academic">Academic</option>
                  <option value="Career">Career</option>
                  <option value="Certification">Certification</option>
                  <option value="Business">Business</option>
                  <option value="Award">Award</option>
                  <option value="Community Service">Community Service</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="ach_desc">Details & Impact</label>
                <textarea
                  id="ach_desc"
                  rows={4}
                  required
                  maxLength={2000}
                  placeholder="Describe your achievement, the awarding institution, or the impact of your venture..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
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
                  disabled={!title || !description || isSubmitting}
                >
                  {isSubmitting ? "Submitting..." : "Submit Achievement ↗"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

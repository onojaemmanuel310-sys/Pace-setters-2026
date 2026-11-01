"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  GraduateRegistration,
  GraduateProfile,
  GraduatePhoto,
  GraduateMemory,
} from "@/lib/supabase/types";

interface AdminDashboardViewProps {
  initialRegistrations: GraduateRegistration[];
  initialProfiles: GraduateProfile[];
  initialPhotos: GraduatePhoto[];
  initialMemories: GraduateMemory[];
  adminUserId: string;
}

export function AdminDashboardView({
  initialRegistrations,
  initialProfiles,
  initialPhotos,
  initialMemories,
  adminUserId,
}: AdminDashboardViewProps) {
  const [registrations, setRegistrations] = useState<GraduateRegistration[]>(
    initialRegistrations
  );
  const [profiles, setProfiles] = useState<GraduateProfile[]>(initialProfiles);
  const [photos, setPhotos] = useState<GraduatePhoto[]>(initialPhotos);
  const [memories, setMemories] = useState<GraduateMemory[]>(initialMemories);

  const [activeTab, setActiveTab] = useState<
    "overview" | "registrations" | "graduates" | "photos" | "memories"
  >("overview");

  const [filterStatus, setFilterStatus] = useState<string>("pending");
  const [searchRegQuery, setSearchRegQuery] = useState("");

  // Rejection Modal State
  const [rejectingReg, setRejectingReg] = useState<GraduateRegistration | null>(
    null
  );
  const [rejectionReason, setRejectionReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Stats calculation
  const totalRegistrations = registrations.length;
  const pendingCount = registrations.filter(
    (r) => r.approval_status === "pending"
  ).length;
  const approvedCount = registrations.filter(
    (r) => r.approval_status === "approved"
  ).length;
  const rejectedCount = registrations.filter(
    (r) => r.approval_status === "rejected"
  ).length;

  async function handleApprove(reg: GraduateRegistration) {
    if (
      !confirm(
        `Approve registration for ${reg.full_name} (${reg.matric_number})?`
      )
    )
      return;

    try {
      setIsProcessing(true);
      const supabase = createClient();

      const { error: regError } = await supabase
        .from("graduate_registrations")
        .update({
          approval_status: "approved",
          rejection_reason: null,
          reviewed_by: adminUserId,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", reg.id);

      if (regError) throw regError;

      // Ensure public profile is approved
      await supabase
        .from("graduate_profiles")
        .update({ is_approved: true, updated_at: new Date().toISOString() })
        .eq("user_id", reg.user_id);

      // Log in audit table
      await supabase.from("admin_audit_logs").insert([
        {
          administrator_id: adminUserId,
          action: "APPROVE_MEMBERSHIP",
          target_user_id: reg.user_id,
          details: {
            full_name: reg.full_name,
            matric_number: reg.matric_number,
          },
        },
      ]);

      // Update state
      setRegistrations(
        registrations.map((r) =>
          r.id === reg.id ? { ...r, approval_status: "approved" } : r
        )
      );

      setProfiles(
        profiles.map((p) =>
          p.user_id === reg.user_id ? { ...p, is_approved: true } : p
        )
      );
    } catch (err) {
      console.error("Approve error:", err);
      alert("Failed to approve registration.");
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleRejectSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rejectingReg) return;

    try {
      setIsProcessing(true);
      const supabase = createClient();

      const { error } = await supabase
        .from("graduate_registrations")
        .update({
          approval_status: "rejected",
          rejection_reason: rejectionReason.trim() || "Matriculation record could not be confirmed.",
          reviewed_by: adminUserId,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", rejectingReg.id);

      if (error) throw error;

      // Disallow public profile
      await supabase
        .from("graduate_profiles")
        .update({ is_approved: false, updated_at: new Date().toISOString() })
        .eq("user_id", rejectingReg.user_id);

      await supabase.from("admin_audit_logs").insert([
        {
          administrator_id: adminUserId,
          action: "REJECT_MEMBERSHIP",
          target_user_id: rejectingReg.user_id,
          details: {
            full_name: rejectingReg.full_name,
            matric_number: rejectingReg.matric_number,
            reason: rejectionReason,
          },
        },
      ]);

      setRegistrations(
        registrations.map((r) =>
          r.id === rejectingReg.id
            ? {
                ...r,
                approval_status: "rejected",
                rejection_reason: rejectionReason,
              }
            : r
        )
      );

      setProfiles(
        profiles.map((p) =>
          p.user_id === rejectingReg.user_id ? { ...p, is_approved: false } : p
        )
      );

      setRejectingReg(null);
      setRejectionReason("");
    } catch (err) {
      console.error("Reject error:", err);
      alert("Failed to record rejection.");
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleSuspend(reg: GraduateRegistration) {
    if (!confirm(`Suspend membership for ${reg.full_name}?`)) return;
    try {
      setIsProcessing(true);
      const supabase = createClient();

      await supabase
        .from("graduate_registrations")
        .update({ approval_status: "suspended", updated_at: new Date().toISOString() })
        .eq("id", reg.id);

      await supabase
        .from("graduate_profiles")
        .update({ is_approved: false, updated_at: new Date().toISOString() })
        .eq("user_id", reg.user_id);

      setRegistrations(
        registrations.map((r) =>
          r.id === reg.id ? { ...r, approval_status: "suspended" } : r
        )
      );
    } catch (err) {
      console.error("Suspend error:", err);
      alert("Failed to suspend membership.");
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleRemovePhoto(photoId: string) {
    if (!confirm("Are you sure you want to remove this photo as an administrator?"))
      return;
    try {
      const supabase = createClient();
      await supabase
        .from("graduate_photos")
        .update({ is_removed: true })
        .eq("id", photoId);

      setPhotos(photos.filter((p) => p.id !== photoId));
    } catch (err) {
      console.error("Admin photo removal error:", err);
      alert("Failed to remove photo.");
    }
  }

  async function handleRemoveMemory(memId: string) {
    if (!confirm("Are you sure you want to delete this memory?")) return;
    try {
      const supabase = createClient();
      await supabase.from("graduate_memories").delete().eq("id", memId);
      setMemories(memories.filter((m) => m.id !== memId));
    } catch (err) {
      console.error("Admin memory removal error:", err);
      alert("Failed to delete memory.");
    }
  }

  const filteredRegistrations = registrations.filter((r) => {
    const matchesStatus =
      filterStatus === "all" || r.approval_status === filterStatus;
    const q = searchRegQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      r.full_name.toLowerCase().includes(q) ||
      r.matric_number.toLowerCase().includes(q) ||
      r.department.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q);

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="admin-console-wrapper">
      <div className="admin-header-row">
        <div>
          <div className="eyebrow">ADMINISTRATIVE CONTROL CONSOLE</div>
          <h1>PACE SETTERS 2026 Governance</h1>
          <p className="admin-lead-desc">
            Review pending graduate credentials, enforce matriculation integrity,
            moderate yearbook content, and maintain class records.
          </p>
        </div>

        <div className="admin-badge-box">
          <span className="badge-gold">Verified Administrator Access</span>
        </div>
      </div>

      {/* Stats Summary Bar */}
      <div className="admin-stats-grid">
        <div className="stat-card">
          <span className="stat-label">Total Applications</span>
          <strong className="stat-num">{totalRegistrations}</strong>
        </div>
        <div className="stat-card highlight-amber">
          <span className="stat-label">Pending Verification</span>
          <strong className="stat-num">{pendingCount}</strong>
        </div>
        <div className="stat-card highlight-green">
          <span className="stat-label">Approved Members</span>
          <strong className="stat-num">{approvedCount}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">Rejected / Suspended</span>
          <strong className="stat-num">{rejectedCount}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">Yearbook Photos</span>
          <strong className="stat-num">{photos.length}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">Recorded Memories</span>
          <strong className="stat-num">{memories.length}</strong>
        </div>
      </div>

      {/* Tabs */}
      <div className="admin-tabs-nav">
        <button
          className={activeTab === "overview" ? "adm-tab active" : "adm-tab"}
          onClick={() => setActiveTab("overview")}
          type="button"
        >
          Overview
        </button>
        <button
          className={activeTab === "registrations" ? "adm-tab active" : "adm-tab"}
          onClick={() => setActiveTab("registrations")}
          type="button"
        >
          Membership Queue ({pendingCount} Pending)
        </button>
        <button
          className={activeTab === "graduates" ? "adm-tab active" : "adm-tab"}
          onClick={() => setActiveTab("graduates")}
          type="button"
        >
          Graduate Profiles ({profiles.length})
        </button>
        <button
          className={activeTab === "photos" ? "adm-tab active" : "adm-tab"}
          onClick={() => setActiveTab("photos")}
          type="button"
        >
          Photo Moderation ({photos.length})
        </button>
        <button
          className={activeTab === "memories" ? "adm-tab active" : "adm-tab"}
          onClick={() => setActiveTab("memories")}
          type="button"
        >
          Memories Moderation ({memories.length})
        </button>
      </div>

      {/* TAB 1: Overview */}
      {activeTab === "overview" && (
        <div className="admin-tab-panel">
          <div className="admin-overview-columns">
            <div className="overview-pane">
              <h3>Action Items Requiring Attention</h3>
              {pendingCount > 0 ? (
                <div className="pending-alert-box">
                  <p>
                    There are <strong>{pendingCount}</strong> graduate
                    registrations awaiting credential review and matriculation
                    verification.
                  </p>
                  <button
                    onClick={() => {
                      setActiveTab("registrations");
                      setFilterStatus("pending");
                    }}
                    className="button-gold-sm"
                    type="button"
                  >
                    Open Verification Queue →
                  </button>
                </div>
              ) : (
                <p className="text-muted">
                  ✓ The membership verification queue is completely clear.
                </p>
              )}
            </div>

            <div className="overview-pane">
              <h3>Quick Moderation Controls</h3>
              <p className="text-muted">
                Administrators possess trusted oversight powers. Modifying
                records or revoking status takes immediate effect across the
                entire application and database.
              </p>
              <div className="quick-links-group">
                <Link href="/directory" className="text-gold-underline">
                  Browse Public Class Directory ↗
                </Link>
                <Link href="/gallery" className="text-gold-underline">
                  Inspect Public Yearbook Gallery ↗
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Membership Queue */}
      {activeTab === "registrations" && (
        <div className="admin-tab-panel">
          <div className="admin-filter-bar">
            <div className="search-box-sm">
              <input
                type="search"
                placeholder="Search by name, matric no, email, or dept..."
                value={searchRegQuery}
                onChange={(e) => setSearchRegQuery(e.target.value)}
              />
            </div>

            <div className="filter-pill-group">
              <button
                className={filterStatus === "pending" ? "pill-btn active" : "pill-btn"}
                onClick={() => setFilterStatus("pending")}
                type="button"
              >
                Pending ({pendingCount})
              </button>
              <button
                className={filterStatus === "approved" ? "pill-btn active" : "pill-btn"}
                onClick={() => setFilterStatus("approved")}
                type="button"
              >
                Approved ({approvedCount})
              </button>
              <button
                className={filterStatus === "rejected" ? "pill-btn active" : "pill-btn"}
                onClick={() => setFilterStatus("rejected")}
                type="button"
              >
                Rejected ({rejectedCount})
              </button>
              <button
                className={filterStatus === "all" ? "pill-btn active" : "pill-btn"}
                onClick={() => setFilterStatus("all")}
                type="button"
              >
                All Records ({totalRegistrations})
              </button>
            </div>
          </div>

          <div className="admin-table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Graduate Name</th>
                  <th>Department</th>
                  <th>Matriculation No.</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Applied On</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRegistrations.length > 0 ? (
                  filteredRegistrations.map((reg) => (
                    <tr key={reg.id}>
                      <td>
                        <strong>{reg.full_name}</strong>
                      </td>
                      <td>{reg.department}</td>
                      <td>
                        <span className="mono-matric">{reg.matric_number}</span>
                      </td>
                      <td>{reg.email}</td>
                      <td>
                        <span className={`status-badge-inline ${reg.approval_status}`}>
                          {reg.approval_status.toUpperCase()}
                        </span>
                        {reg.rejection_reason && (
                          <div className="reason-subtext">
                            Reason: {reg.rejection_reason}
                          </div>
                        )}
                      </td>
                      <td>
                        {new Date(reg.created_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td>
                        <div className="table-action-buttons">
                          {reg.approval_status !== "approved" && (
                            <button
                              onClick={() => handleApprove(reg)}
                              className="approve-action-btn"
                              disabled={isProcessing}
                              type="button"
                            >
                              Approve
                            </button>
                          )}

                          {reg.approval_status === "pending" && (
                            <button
                              onClick={() => setRejectingReg(reg)}
                              className="reject-action-btn"
                              disabled={isProcessing}
                              type="button"
                            >
                              Reject
                            </button>
                          )}

                          {reg.approval_status === "approved" && (
                            <button
                              onClick={() => handleSuspend(reg)}
                              className="suspend-action-btn"
                              disabled={isProcessing}
                              type="button"
                            >
                              Suspend
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="table-empty-cell">
                      No registrations match the selected criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Graduate Profiles */}
      {activeTab === "graduates" && (
        <div className="admin-tab-panel">
          <div className="graduates-admin-grid">
            {profiles.map((p) => (
              <div className="admin-profile-card" key={p.id}>
                <div>
                  <h4>{p.full_name}</h4>
                  <p className="text-muted">{p.department}</p>
                  <span
                    className={`status-badge-inline ${
                      p.is_approved ? "approved" : "pending"
                    }`}
                  >
                    {p.is_approved ? "Public Profile" : "Hidden"}
                  </span>
                </div>
                <div className="card-foot-links">
                  <Link
                    href={`/profiles/${p.user_id}`}
                    className="button-text-sm"
                  >
                    View Live Profile ↗
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: Photos Moderation */}
      {activeTab === "photos" && (
        <div className="admin-tab-panel">
          <div className="admin-photo-moderation-grid">
            {photos.map((p) => (
              <div className="admin-photo-tile" key={p.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.image_url} alt={p.caption || "Photo"} />
                <div className="tile-details">
                  <p className="tile-caption">{p.caption || "No caption"}</p>
                  <small>
                    Uploader: {p.graduate_profiles?.full_name || "Member"}
                  </small>
                  <button
                    onClick={() => handleRemovePhoto(p.id)}
                    className="delete-pill-btn"
                    type="button"
                  >
                    Remove Photo
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: Memories Moderation */}
      {activeTab === "memories" && (
        <div className="admin-tab-panel">
          <div className="admin-memories-list">
            {memories.map((m) => (
              <div className="admin-memory-row" key={m.id}>
                <div>
                  <span className="memory-category-tag">{m.category}</span>
                  <h4>{m.title}</h4>
                  <p>{m.content}</p>
                  <small>
                    By: {m.graduate_profiles?.full_name || "Graduate"} (
                    {m.graduate_profiles?.department || "PACE SETTER"})
                  </small>
                </div>
                <button
                  onClick={() => handleRemoveMemory(m.id)}
                  className="delete-pill-btn"
                  type="button"
                >
                  Delete Story
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rejection Reason Modal */}
      {rejectingReg && (
        <div
          className="modal-backdrop"
          onClick={() => !isProcessing && setRejectingReg(null)}
        >
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-header">
              <h3>Reject Registration</h3>
              <button
                className="close-modal-btn"
                onClick={() => setRejectingReg(null)}
                disabled={isProcessing}
                type="button"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRejectSubmit} className="reject-modal-form">
              <p>
                Rejecting registration for <strong>{rejectingReg.full_name}</strong> (
                {rejectingReg.matric_number}).
              </p>

              <div className="form-field">
                <label htmlFor="rej_reason">Reason for Rejection (Optional but recommended)</label>
                <textarea
                  id="rej_reason"
                  rows={3}
                  placeholder="e.g. Matriculation number could not be matched against official faculty graduating list."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  disabled={isProcessing}
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="button-outline-sm"
                  onClick={() => setRejectingReg(null)}
                  disabled={isProcessing}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="reject-action-btn"
                  disabled={isProcessing}
                >
                  {isProcessing ? "Processing..." : "Confirm Rejection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

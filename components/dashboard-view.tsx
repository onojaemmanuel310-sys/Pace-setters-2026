"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  GraduateProfile,
  GraduateRegistration,
  GraduatePhoto,
  GraduateMemory,
} from "@/lib/supabase/types";

interface DashboardViewProps {
  registration: GraduateRegistration;
  profile: GraduateProfile;
  photos: GraduatePhoto[];
  memories: GraduateMemory[];
}

export function DashboardView({
  registration,
  profile: initialProfile,
  photos: initialPhotos,
  memories: initialMemories,
}: DashboardViewProps) {
  const [activeTab, setActiveTab] = useState<
    "overview" | "edit-profile" | "my-photos" | "my-memories" | "account"
  >("overview");

  const [profile, setProfile] = useState<GraduateProfile>(initialProfile);
  const [photos, setPhotos] = useState<GraduatePhoto[]>(initialPhotos);
  const [memories, setMemories] = useState<GraduateMemory[]>(initialMemories);

  // Edit Profile State
  const [fullName, setFullName] = useState(profile.full_name || "");
  const [department, setDepartment] = useState(profile.department || "");
  const [bio, setBio] = useState(profile.bio || "");
  const [phone, setPhone] = useState(profile.phone || "");
  const [profilePhotoUrl, setProfilePhotoUrl] = useState(
    profile.profile_photo_url || ""
  );
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [showPhone, setShowPhone] = useState(
    Boolean(profile.privacy_settings?.show_phone)
  );
  const [showMatric, setShowMatric] = useState(
    Boolean(profile.privacy_settings?.show_matric)
  );
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  // Upload Photo State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCaption, setUploadCaption] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  // Password Change State
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);

  const isApproved = registration.approval_status === "approved";
  const isPending = registration.approval_status === "pending";
  const isRejected = registration.approval_status === "rejected";

  // Calculate profile completion percentage
  const completionPercentage = [
    Boolean(profile.full_name),
    Boolean(profile.department),
    Boolean(profile.bio),
    Boolean(profile.profile_photo_url),
    photos.length > 0,
  ].filter(Boolean).length * 20;

  async function handleAvatarFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setProfileMsg({
        text: "Please select an image file (PNG, JPG, or WEBP).",
        type: "error",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setProfileMsg({
        text: "Image size must be less than 5MB.",
        type: "error",
      });
      return;
    }

    try {
      setAvatarUploading(true);
      setProfileMsg(null);
      const supabase = createClient();

      const fileExt = file.name.split(".").pop();
      const fileName = `${profile.user_id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl;
      setProfilePhotoUrl(publicUrl);

      // Immediately save avatar to profile
      const { data, error: updateError } = await supabase
        .from("graduate_profiles")
        .update({ profile_photo_url: publicUrl })
        .eq("user_id", profile.user_id)
        .select()
        .single();

      if (updateError) throw updateError;
      setProfile(data);

      setProfileMsg({
        text: "Profile picture uploaded and saved successfully!",
        type: "success",
      });
    } catch (err: unknown) {
      console.error("Avatar upload error:", err);
      let errorMsg = "Failed to upload photo from gallery.";
      if (err && typeof err === "object") {
        if ("message" in err && typeof (err as { message: unknown }).message === "string") {
          errorMsg = (err as { message: string }).message;
        } else if ("error" in err && typeof (err as { error: unknown }).error === "string") {
          errorMsg = (err as { error: string }).error;
        }
      }
      setProfileMsg({
        text: `Upload failed: ${errorMsg}`,
        type: "error",
      });
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSavingProfile(true);
      setProfileMsg(null);
      const supabase = createClient();

      const updatedData = {
        full_name: fullName.trim(),
        department: department.trim(),
        bio: bio.trim() || null,
        phone: phone.trim() || null,
        profile_photo_url: profilePhotoUrl.trim() || null,
        privacy_settings: {
          show_phone: showPhone,
          show_matric: showMatric,
        },
      };

      const { data, error } = await supabase
        .from("graduate_profiles")
        .update(updatedData)
        .eq("user_id", profile.user_id)
        .select()
        .single();

      if (error) throw error;

      setProfile(data);
      setProfileMsg({
        text: "Profile updated successfully!",
        type: "success",
      });
    } catch (err: unknown) {
      console.error("Profile save error:", err);
      setProfileMsg({
        text: err instanceof Error ? err.message : "Failed to update profile.",
        type: "error",
      });
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleUploadPhoto(e: React.FormEvent) {
    e.preventDefault();
    if (!uploadFile) return;
    if (!isApproved) {
      setUploadMsg({
        text: "Your membership must be approved before you can upload photos.",
        type: "error",
      });
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(20);
      const supabase = createClient();

      const fileExt = uploadFile.name.split(".").pop();
      const fileName = `${profile.user_id}/${Date.now()}.${fileExt}`;

      setUploadProgress(50);
      const { error: storageError } = await supabase.storage
        .from("yearbook_photos")
        .upload(fileName, uploadFile, { upsert: false });

      if (storageError) throw storageError;

      setUploadProgress(80);
      const { data: urlData } = supabase.storage
        .from("yearbook_photos")
        .getPublicUrl(fileName);

      const { data: newPhoto, error: insertError } = await supabase
        .from("graduate_photos")
        .insert([
          {
            user_id: profile.user_id,
            storage_path: fileName,
            image_url: urlData.publicUrl,
            caption: uploadCaption.trim() || null,
            is_approved: true,
            is_removed: false,
          },
        ])
        .select()
        .single();

      if (insertError) throw insertError;

      setUploadProgress(100);
      setUploadMsg({
        text: "Photo uploaded to yearbook gallery successfully!",
        type: "success",
      });

      if (newPhoto) {
        setPhotos([newPhoto, ...photos]);
      }

      setUploadFile(null);
      setUploadCaption("");
    } catch (err: unknown) {
      console.error("Upload error:", err);
      setUploadMsg({
        text: err instanceof Error ? err.message : "Upload failed.",
        type: "error",
      });
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDeletePhoto(photoId: string, storagePath: string) {
    if (!confirm("Are you sure you want to delete this photo?")) return;
    try {
      const supabase = createClient();
      await supabase
        .from("graduate_photos")
        .update({ is_removed: true })
        .eq("id", photoId);

      await supabase.storage.from("yearbook_photos").remove([storagePath]);
      setPhotos(photos.filter((p) => p.id !== photoId));
    } catch (err) {
      console.error("Delete photo error:", err);
      alert("Failed to delete photo.");
    }
  }

  async function handleDeleteMemory(memoryId: string) {
    if (!confirm("Are you sure you want to delete this memory?")) return;
    try {
      const supabase = createClient();
      await supabase.from("graduate_memories").delete().eq("id", memoryId);
      setMemories(memories.filter((m) => m.id !== memoryId));
    } catch (err) {
      console.error("Delete memory error:", err);
      alert("Failed to delete memory.");
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) {
      setPasswordMsg({
        text: "New password must be at least 8 characters long.",
        type: "error",
      });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordMsg({
        text: "Passwords do not match.",
        type: "error",
      });
      return;
    }

    try {
      setChangingPassword(true);
      setPasswordMsg(null);
      const supabase = createClient();

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setPasswordMsg({
        text: "Password updated successfully!",
        type: "success",
      });
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err: unknown) {
      setPasswordMsg({
        text: err instanceof Error ? err.message : "Password change failed.",
        type: "error",
      });
    } finally {
      setChangingPassword(false);
    }
  }

  return (
    <div className="dashboard-wrapper">
      {/* Welcome Banner */}
      <div className="dashboard-hero-card">
        <div className="dashboard-welcome">
          <div className="eyebrow">PACE SETTER PORTAL</div>
          <h1>Welcome, {profile.full_name.split(" ")[0]}</h1>
          <p className="welcome-subtext">
            Matriculation: <strong>{registration.matric_number}</strong> • Department:{" "}
            <strong>{profile.department}</strong>
          </p>
        </div>

        {/* Verification Status Pill */}
        <div className="dashboard-status-box">
          {isApproved && (
            <div className="status-badge verified">
              <span className="status-dot green" />
              <strong>Verified Graduate</strong>
              <small>All community & photo features unlocked</small>
            </div>
          )}

          {isPending && (
            <div className="status-badge pending">
              <span className="status-dot amber" />
              <strong>Pending Administrator Verification</strong>
              <small>Public listing & gallery uploads unlock upon review</small>
            </div>
          )}

          {isRejected && (
            <div className="status-badge rejected">
              <span className="status-dot red" />
              <strong>Registration Not Approved</strong>
              <small>
                Reason: {registration.rejection_reason || "Contact department admin."}
              </small>
            </div>
          )}
        </div>
      </div>

      {/* Profile Completion Meter */}
      <div className="completion-card">
        <div className="completion-header">
          <span>Profile Strength: {completionPercentage}%</span>
          <span className="gold-text">
            {completionPercentage === 100
              ? "All Set!"
              : `${5 - completionPercentage / 20} item(s) remaining`}
          </span>
        </div>
        <div className="completion-track">
          <div
            className="completion-fill"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </div>

      {/* Dashboard Tabs Bar */}
      <div className="dashboard-tabs">
        <button
          className={activeTab === "overview" ? "dash-tab active" : "dash-tab"}
          onClick={() => setActiveTab("overview")}
          type="button"
        >
          Overview
        </button>
        <button
          className={activeTab === "edit-profile" ? "dash-tab active" : "dash-tab"}
          onClick={() => setActiveTab("edit-profile")}
          type="button"
        >
          Edit Profile
        </button>
        <button
          className={activeTab === "my-photos" ? "dash-tab active" : "dash-tab"}
          onClick={() => setActiveTab("my-photos")}
          type="button"
        >
          My Photos ({photos.length})
        </button>
        <button
          className={activeTab === "my-memories" ? "dash-tab active" : "dash-tab"}
          onClick={() => setActiveTab("my-memories")}
          type="button"
        >
          My Memories ({memories.length})
        </button>
        <button
          className={activeTab === "account" ? "dash-tab active" : "dash-tab"}
          onClick={() => setActiveTab("account")}
          type="button"
        >
          Account Settings
        </button>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === "overview" && (
        <div className="dash-tab-panel">
          <div className="dash-overview-grid">
            <div className="overview-card">
              <h3>Public Profile</h3>
              <p>
                {isApproved
                  ? "Your profile is active and publicly visible in the Class Directory."
                  : "Your profile is hidden from the public directory until an administrator verifies your matriculation number."}
              </p>
              {isApproved && (
                <Link
                  href={`/profiles/${profile.user_id}`}
                  className="button-gold-sm"
                >
                  View My Public Profile ↗
                </Link>
              )}
            </div>

            <div className="overview-card">
              <h3>Yearbook Photos</h3>
              <p>You have published {photos.length} photograph(s) to the shared gallery.</p>
              <button
                onClick={() => setActiveTab("my-photos")}
                className="button-outline-sm"
                type="button"
              >
                Manage Photos
              </button>
            </div>

            <div className="overview-card">
              <h3>Class Memories</h3>
              <p>You have recorded {memories.length} memorable story/experience(s).</p>
              <button
                onClick={() => setActiveTab("my-memories")}
                className="button-outline-sm"
                type="button"
              >
                View Memories
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Edit Profile */}
      {activeTab === "edit-profile" && (
        <div className="dash-tab-panel">
          <form onSubmit={handleSaveProfile} className="profile-edit-form">
            <div className="form-grid-2">
              <div className="form-field">
                <label htmlFor="p_fullName">Full Name</label>
                <input
                  id="p_fullName"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={savingProfile}
                />
              </div>

              <div className="form-field">
                <label htmlFor="p_department">Department</label>
                <input
                  id="p_department"
                  type="text"
                  required
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  disabled={savingProfile}
                />
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-field">
                <label htmlFor="p_phone">Phone Number (Optional)</label>
                <input
                  id="p_phone"
                  type="tel"
                  placeholder="+234..."
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={savingProfile}
                />
              </div>

              <div className="form-field">
                <label>Profile Picture / Portrait</label>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
                  {profilePhotoUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={profilePhotoUrl}
                      alt="Avatar Preview"
                      style={{
                        width: "68px",
                        height: "68px",
                        borderRadius: "50%",
                        objectFit: "cover",
                        border: "2px solid var(--gold-champagne)",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "68px",
                        height: "68px",
                        borderRadius: "50%",
                        backgroundColor: "#1f1f1f",
                        border: "2px dashed #444",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "1.5rem",
                      }}
                    >
                      👤
                    </div>
                  )}

                  <label
                    style={{
                      cursor: avatarUploading ? "not-allowed" : "pointer",
                      padding: "0.6rem 1.2rem",
                      backgroundColor: "var(--gold-champagne, #D6B56D)",
                      color: "#0B0B0B",
                      fontWeight: 600,
                      borderRadius: "6px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      fontSize: "0.9rem",
                    }}
                  >
                    {avatarUploading ? "Uploading..." : "📷 Choose from Gallery"}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarFileSelect}
                      disabled={avatarUploading || savingProfile}
                      style={{ display: "none" }}
                    />
                  </label>

                  <small style={{ color: "#888", display: "block", width: "100%" }}>
                    Choose any photo from your phone or PC (Max 5MB). Uploads automatically!
                  </small>
                </div>
              </div>
            </div>

            <div className="form-field">
              <label htmlFor="p_bio">Biography, Favorite Quote, or Future Aspirations</label>
              <textarea
                id="p_bio"
                rows={4}
                maxLength={500}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                disabled={savingProfile}
              />
            </div>

            {/* Privacy Controls */}
            <div className="privacy-card">
              <h4>Profile Privacy Controls</h4>
              <p className="privacy-desc">
                Choose which optional details are visible to public visitors on your profile:
              </p>

              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={showMatric}
                  onChange={(e) => setShowMatric(e.target.checked)}
                />
                <span>Display my matriculation number on my public profile</span>
              </label>

              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={showPhone}
                  onChange={(e) => setShowPhone(e.target.checked)}
                />
                <span>Display my phone number on my public profile</span>
              </label>
            </div>

            {profileMsg && (
              <div className={`message-banner ${profileMsg.type}`}>
                {profileMsg.text}
              </div>
            )}

            <button
              type="submit"
              className="button button-gold form-button"
              disabled={savingProfile}
            >
              {savingProfile ? "Saving Profile..." : "Save Profile Changes"}
            </button>
          </form>
        </div>
      )}

      {/* Tab 3: My Photos */}
      {activeTab === "my-photos" && (
        <div className="dash-tab-panel">
          {/* Upload Box (Only if approved) */}
          {isApproved ? (
            <div className="upload-box-card">
              <h3>Add Graduation Photograph</h3>
              <form onSubmit={handleUploadPhoto} className="upload-inline-form">
                <div className="form-field">
                  <label htmlFor="upload_f">Choose File (JPEG, PNG, WebP — Max 10MB)</label>
                  <input
                    id="upload_f"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    required
                    disabled={isUploading}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="upload_c">Caption</label>
                  <input
                    id="upload_c"
                    type="text"
                    maxLength={300}
                    placeholder="Brief description or memory"
                    value={uploadCaption}
                    onChange={(e) => setUploadCaption(e.target.value)}
                    disabled={isUploading}
                  />
                </div>

                {isUploading && (
                  <div className="progress-bar-wrapper">
                    <div
                      className="progress-fill"
                      style={{ width: `${uploadProgress}%` }}
                    />
                    <span>Uploading: {uploadProgress}%</span>
                  </div>
                )}

                {uploadMsg && (
                  <div className={`message-banner ${uploadMsg.type}`}>
                    {uploadMsg.text}
                  </div>
                )}

                <button
                  type="submit"
                  className="button-gold-sm"
                  disabled={!uploadFile || isUploading}
                >
                  {isUploading ? "Uploading..." : "Upload to Gallery ↗"}
                </button>
              </form>
            </div>
          ) : (
            <div className="setup-banner">
              ⏳ Photo uploads are locked while your registration is pending verification.
              Once your matriculation number is approved by an administrator, this form will activate.
            </div>
          )}

          {/* User's Photos List */}
          <div className="my-photos-grid">
            {photos.map((p) => (
              <div className="my-photo-item" key={p.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.image_url} alt={p.caption || "My photo"} />
                <div className="my-photo-caption">
                  <p>{p.caption || "No caption"}</p>
                  <button
                    onClick={() => handleDeletePhoto(p.id, p.storage_path)}
                    className="delete-pill-btn"
                    type="button"
                  >
                    Delete Photo
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: My Memories */}
      {activeTab === "my-memories" && (
        <div className="dash-tab-panel">
          <div className="my-memories-list">
            {memories.length > 0 ? (
              memories.map((m) => (
                <div className="my-memory-item" key={m.id}>
                  <div>
                    <span className="memory-category-tag">{m.category}</span>
                    <h4>{m.title}</h4>
                    <p>{m.content}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteMemory(m.id)}
                    className="delete-pill-btn"
                    type="button"
                  >
                    Remove
                  </button>
                </div>
              ))
            ) : (
              <p className="muted">You haven&apos;t shared any class memories yet.</p>
            )}
          </div>
        </div>
      )}

      {/* Tab 5: Account Settings */}
      {activeTab === "account" && (
        <div className="dash-tab-panel">
          <form onSubmit={handleChangePassword} className="profile-edit-form">
            <h3>Change Password</h3>
            <div className="form-field">
              <label htmlFor="new_pass">New Password (Min 8 characters)</label>
              <input
                id="new_pass"
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={changingPassword}
              />
            </div>

            <div className="form-field">
              <label htmlFor="conf_new_pass">Confirm New Password</label>
              <input
                id="conf_new_pass"
                type="password"
                required
                minLength={8}
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                disabled={changingPassword}
              />
            </div>

            {passwordMsg && (
              <div className={`message-banner ${passwordMsg.type}`}>
                {passwordMsg.text}
              </div>
            )}

            <button
              type="submit"
              className="button button-gold form-button"
              disabled={changingPassword}
            >
              {changingPassword ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

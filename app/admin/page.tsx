import { redirect } from "next/navigation";
import { AdminDashboardView } from "@/components/admin-dashboard-view";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import {
  GraduateRegistration,
  GraduateProfile,
  GraduatePhoto,
  GraduateMemory,
} from "@/lib/supabase/types";

export const metadata = {
  title: "Administrator Console | PACE SETTERS 2026",
  description:
    "Secure administrative management for PACE SETTERS 2026 graduation records and moderation.",
};

export const revalidate = 0;

export default async function AdminPage() {
  if (!isSupabaseConfigured()) {
    redirect("/login");
  }

  const supabase = await createClient();

  // 1. Authenticate user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 2. Strict Server-side Admin Role Verification
  const { data: roleRecord } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (roleRecord?.role !== "admin") {
    return (
      <div className="wrap forbidden-shell">
        <div className="empty-state-panel">
          <div className="empty-state-icon">🔒</div>
          <h2>Restricted Access</h2>
          <p>
            You are signed in as <strong>{user.email}</strong>, but this account
            does not hold verified administrator privileges for PACE SETTERS
            2026.
          </p>
          <p className="text-muted mt-2">
            Administrator permissions must be assigned securely directly within
            Supabase. If you are the set administrator, run the provided SQL
            statement in your Supabase SQL Editor.
          </p>
          <div className="mt-4">
            <a href="/dashboard" className="button button-gold-sm">
              Return to Member Dashboard ↗
            </a>
          </div>
        </div>
      </div>
    );
  }

  // 3. Admin is verified! Fetch full governance data:
  // All registrations
  const { data: allRegs } = await supabase
    .from("graduate_registrations")
    .select("*")
    .order("created_at", { ascending: false });

  // All profiles
  const { data: allProfiles } = await supabase
    .from("graduate_profiles")
    .select("*")
    .order("created_at", { ascending: false });

  // Photos for moderation
  const { data: allPhotos } = await supabase
    .from("graduate_photos")
    .select("*, graduate_profiles(full_name, department)")
    .eq("is_removed", false)
    .order("created_at", { ascending: false });

  // Memories for moderation
  const { data: allMemories } = await supabase
    .from("graduate_memories")
    .select("*, graduate_profiles(full_name, department)")
    .order("created_at", { ascending: false });

  return (
    <div className="admin-page-container wrap">
      <AdminDashboardView
        initialRegistrations={(allRegs || []) as GraduateRegistration[]}
        initialProfiles={(allProfiles || []) as GraduateProfile[]}
        initialPhotos={(allPhotos || []) as unknown as GraduatePhoto[]}
        initialMemories={(allMemories || []) as unknown as GraduateMemory[]}
        adminUserId={user.id}
      />
    </div>
  );
}

import { notFound } from "next/navigation";
import { ProfileView } from "@/components/profile-view";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import {
  GraduateProfile,
  GraduatePhoto,
  GraduateAchievement,
  GraduateMemory,
} from "@/lib/supabase/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const revalidate = 0;

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  if (!isSupabaseConfigured()) {
    return { title: "Graduate Profile | PACE SETTERS 2026" };
  }
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("graduate_profiles")
      .select("full_name, department")
      .or(`user_id.eq.${id},id.eq.${id}`)
      .maybeSingle();

    if (data) {
      return {
        title: `${data.full_name} (${data.department}) | PACE SETTERS 2026`,
        description: `View the official graduation profile and memories of ${data.full_name}.`,
      };
    }
  } catch {
    // Fallback
  }
  return { title: "Graduate Profile | PACE SETTERS 2026" };
}

export default async function ProfilePage({ params }: PageProps) {
  const { id } = await params;

  if (!isSupabaseConfigured()) {
    return notFound();
  }

  try {
    const supabase = await createClient();

    // 1. Fetch current logged-in user (to determine ownership / admin permissions)
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    let isAdmin = false;
    if (currentUser) {
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", currentUser.id)
        .maybeSingle();
      isAdmin = roleData?.role === "admin";
    }

    // 2. Fetch graduate profile by user_id or profile id
    const { data: profileData, error: profileError } = await supabase
      .from("graduate_profiles")
      .select("*")
      .or(`user_id.eq.${id},id.eq.${id}`)
      .maybeSingle();

    if (profileError || !profileData) {
      return notFound();
    }

    const profile = profileData as GraduateProfile;
    const isOwner = currentUser?.id === profile.user_id;

    // If profile is not approved, only owner or admin can view
    if (!profile.is_approved && !isOwner && !isAdmin) {
      return (
        <div className="wrap pending-profile-notice">
          <div className="empty-state-panel">
            <div className="empty-state-icon">⏳</div>
            <h2>Profile Verification Pending</h2>
            <p>
              This graduate profile is currently undergoing administrative
              matriculation verification. It will become publicly visible once
              approved.
            </p>
          </div>
        </div>
      );
    }

    // 3. Fetch matriculation number if permitted
    let matricNumber: string | null = null;
    const { data: regData } = await supabase
      .from("graduate_registrations")
      .select("matric_number")
      .eq("user_id", profile.user_id)
      .maybeSingle();
    if (regData) matricNumber = regData.matric_number;

    // 4. Fetch photos
    const { data: photosData } = await supabase
      .from("graduate_photos")
      .select("*")
      .eq("user_id", profile.user_id)
      .eq("is_removed", false)
      .eq("is_approved", true)
      .order("created_at", { ascending: false });

    // 5. Fetch achievements
    const { data: achData } = await supabase
      .from("graduate_achievements")
      .select("*")
      .eq("user_id", profile.user_id)
      .eq("moderation_status", "approved")
      .order("created_at", { ascending: false });

    // 6. Fetch memories
    const { data: memData } = await supabase
      .from("graduate_memories")
      .select("*")
      .eq("user_id", profile.user_id)
      .eq("moderation_status", "approved")
      .order("created_at", { ascending: false });

    return (
      <ProfileView
        profile={profile}
        photos={(photosData || []) as GraduatePhoto[]}
        achievements={(achData || []) as GraduateAchievement[]}
        memories={(memData || []) as GraduateMemory[]}
        isOwner={isOwner}
        isAdmin={isAdmin}
        matricNumber={matricNumber}
      />
    );
  } catch (err) {
    console.error("Profile page load error:", err);
    return notFound();
  }
}

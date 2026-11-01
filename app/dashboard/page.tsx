import { redirect } from "next/navigation";
import { DashboardView } from "@/components/dashboard-view";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import {
  GraduateProfile,
  GraduateRegistration,
  GraduatePhoto,
  GraduateMemory,
} from "@/lib/supabase/types";

export const metadata = {
  title: "Member Dashboard | PACE SETTERS 2026",
  description: "Manage your graduate profile, yearbook photos, and memories.",
};

export const revalidate = 0;

export default async function DashboardPage() {
  if (!isSupabaseConfigured()) {
    redirect("/login");
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 1. Fetch Registration record
  const { data: regData } = await supabase
    .from("graduate_registrations")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  // If no registration record exists, build a fallback registration
  const registration: GraduateRegistration = regData || {
    id: user.id,
    user_id: user.id,
    full_name: (user.user_metadata?.full_name as string) || "Graduate",
    department: (user.user_metadata?.department as string) || "Not Specified",
    matric_number: (user.user_metadata?.matric_number as string) || "PENDING",
    email: user.email || "",
    approval_status: "pending",
    created_at: user.created_at,
    updated_at: user.created_at,
  };

  // 2. Fetch Profile record
  const { data: profileData } = await supabase
    .from("graduate_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  const profile: GraduateProfile = profileData || {
    id: user.id,
    user_id: user.id,
    full_name: registration.full_name,
    department: registration.department,
    bio: (user.user_metadata?.bio as string) || null,
    phone: (user.user_metadata?.phone as string) || null,
    privacy_settings: {
      show_phone: false,
      show_matric: false,
    },
    is_approved: registration.approval_status === "approved",
    created_at: user.created_at,
    updated_at: user.created_at,
  };

  // 3. Fetch User Photos
  const { data: photosData } = await supabase
    .from("graduate_photos")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_removed", false)
    .order("created_at", { ascending: false });

  // 4. Fetch User Memories
  const { data: memoriesData } = await supabase
    .from("graduate_memories")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="dashboard-page-container wrap">
      <DashboardView
        registration={registration}
        profile={profile}
        photos={(photosData || []) as GraduatePhoto[]}
        memories={(memoriesData || []) as GraduateMemory[]}
      />
    </div>
  );
}

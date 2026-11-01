import { DirectoryView } from "@/components/directory-view";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { GraduateProfile } from "@/lib/supabase/types";

export const metadata = {
  title: "Class Directory | PACE SETTERS 2026",
  description:
    "Browse and search the verified graduate directory of the Class of 2026.",
};

export const revalidate = 0;

export default async function DirectoryPage() {
  let initialProfiles: GraduateProfile[] = [];
  let departments: string[] = [];

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("graduate_profiles")
        .select("*")
        .eq("is_approved", true)
        .order("full_name", { ascending: true });

      if (!error && data) {
        initialProfiles = data as GraduateProfile[];
        const deptSet = new Set(
          initialProfiles.map((p) => p.department).filter(Boolean)
        );
        departments = Array.from(deptSet).sort();
      }
    } catch (err) {
      console.warn("Directory data fetch error:", err);
    }
  }

  return (
    <div className="directory-page-container wrap">
      <div className="page-header-block">
        <div className="eyebrow">THE ARCHIVE OF LEADERS</div>
        <h1>
          Class <em>Directory</em>
        </h1>
        <p className="page-header-subtext">
          Search verified graduates of PACE SETTERS 2026, filter by department,
          and explore classmate profiles.
        </p>
      </div>

      <DirectoryView
        initialProfiles={initialProfiles}
        departments={departments}
      />
    </div>
  );
}

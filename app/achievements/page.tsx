import { AchievementsView } from "@/components/achievements-view";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { GraduateAchievement } from "@/lib/supabase/types";

export const metadata = {
  title: "Class Achievements & Milestones | PACE SETTERS 2026",
  description:
    "Celebrating academic honors, certifications, business ventures, and career milestones of PACE SETTERS 2026.",
};

export const revalidate = 0;

export default async function AchievementsPage() {
  let achievements: GraduateAchievement[] = [];

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("graduate_achievements")
        .select("*, graduate_profiles(full_name, department)")
        .eq("moderation_status", "approved")
        .order("created_at", { ascending: false });

      if (!error && data) {
        achievements = data as unknown as GraduateAchievement[];
      }
    } catch (err) {
      console.warn("Achievements data fetch warning:", err);
    }
  }

  return (
    <div className="achievements-page-container wrap">
      <div className="page-header-block">
        <div className="eyebrow">WALL OF DISTINCTION</div>
        <h1>
          Achievements & <em>Milestones</em>
        </h1>
        <p className="page-header-subtext">
          Documenting our academic triumphs, global certifications, enterprise
          launches, and community leadership.
        </p>
      </div>

      <AchievementsView initialAchievements={achievements} />
    </div>
  );
}

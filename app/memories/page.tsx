import { MemoriesView } from "@/components/memories-view";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { GraduateMemory } from "@/lib/supabase/types";

export const metadata = {
  title: "Our Memories | PACE SETTERS 2026",
  description:
    "Stories, milestones, lessons learned, and appreciation messages from the graduating class.",
};

export const revalidate = 0;

export default async function MemoriesPage() {
  let memories: GraduateMemory[] = [];

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("graduate_memories")
        .select("*, graduate_profiles(full_name, department)")
        .eq("moderation_status", "approved")
        .order("created_at", { ascending: false });

      if (!error && data) {
        memories = data as unknown as GraduateMemory[];
      }
    } catch (err) {
      console.warn("Memories data fetch warning:", err);
    }
  }

  return (
    <div className="memories-page-container wrap">
      <div className="page-header-block">
        <div className="eyebrow">THE CHRONICLE OF OUR YEARS</div>
        <h1>
          Our <em>Memories</em>
        </h1>
        <p className="page-header-subtext">
          Preserving the laughter, the late nights, the gratitude, and the
          unforgettable bonds that defined our university experience.
        </p>
      </div>

      <MemoriesView initialMemories={memories} />
    </div>
  );
}

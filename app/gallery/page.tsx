import { GalleryView } from "@/components/gallery-view";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { GraduatePhoto } from "@/lib/supabase/types";

export const metadata = {
  title: "Graduation Yearbook Gallery | PACE SETTERS 2026",
  description:
    "Explore the official graduation photographs and visual memories of PACE SETTERS 2026.",
};

export const revalidate = 0;

export default async function GalleryPage() {
  let photos: GraduatePhoto[] = [];

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("graduate_photos")
        .select("*, graduate_profiles(full_name, department)")
        .eq("is_removed", false)
        .eq("is_approved", true)
        .order("created_at", { ascending: false });

      if (!error && data) {
        photos = data as unknown as GraduatePhoto[];
      }
    } catch (err) {
      console.warn("Gallery data fetch warning:", err);
    }
  }

  return (
    <div className="gallery-page-container wrap">
      <div className="page-header-block">
        <div className="eyebrow">VISUAL HERITAGE</div>
        <h1>
          Yearbook <em>Gallery</em>
        </h1>
        <p className="page-header-subtext">
          A timeless collection of convocation portraits, departmental moments,
          and shared smiles from the Class of 2026.
        </p>
      </div>

      <GalleryView initialPhotos={photos} />
    </div>
  );
}

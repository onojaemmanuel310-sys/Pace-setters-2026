import Link from "next/link";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { GraduateProfile, GraduateMemory } from "@/lib/supabase/types";

export const revalidate = 0; // Fresh database statistics

export default async function HomePage() {
  let approvedGraduatesCount = 0;
  let departmentsCount = 0;
  let photosCount = 0;
  let memoriesCount = 0;
  let featuredGraduates: GraduateProfile[] = [];
  let previewMemories: GraduateMemory[] = [];
  let isConfigured = false;

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      isConfigured = true;

      // 1. Approved graduates count
      const { count: gradCount } = await supabase
        .from("graduate_profiles")
        .select("*", { count: "exact", head: true })
        .eq("is_approved", true);
      approvedGraduatesCount = gradCount || 0;

      // 2. Distinct departments count
      const { data: deptData } = await supabase
        .from("graduate_profiles")
        .select("department")
        .eq("is_approved", true);
      if (deptData) {
        const uniqueDepts = new Set(deptData.map((d) => d.department).filter(Boolean));
        departmentsCount = uniqueDepts.size;
      }

      // 3. Graduation photographs count
      const { count: photoCount } = await supabase
        .from("graduate_photos")
        .select("*", { count: "exact", head: true })
        .eq("is_removed", false)
        .eq("is_approved", true);
      photosCount = photoCount || 0;

      // 4. Shared memories count
      const { count: memCount } = await supabase
        .from("graduate_memories")
        .select("*", { count: "exact", head: true })
        .eq("moderation_status", "approved");
      memoriesCount = memCount || 0;

      // 5. Featured graduates (up to 6)
      const { data: gradData } = await supabase
        .from("graduate_profiles")
        .select("*")
        .eq("is_approved", true)
        .order("created_at", { ascending: false })
        .limit(6);
      if (gradData) featuredGraduates = gradData as GraduateProfile[];

      // 6. Preview memories (up to 3)
      const { data: memData } = await supabase
        .from("graduate_memories")
        .select("*, graduate_profiles(full_name, department)")
        .eq("moderation_status", "approved")
        .order("created_at", { ascending: false })
        .limit(3);
      if (memData) previewMemories = memData as unknown as GraduateMemory[];
    } catch (err) {
      console.warn("Supabase load notice:", err);
    }
  }

  function getInitials(name: string): string {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  return (
    <div className="homepage-content">
      {/* SECTION B: Hero Section */}
      <section className="hero wrap" id="home">
        <div className="hero-grid">
          <div className="hero-text-col">
            <div className="eyebrow">
              <span className="eyebrow-line" /> THE GRADUATING CLASS OF 2026
            </div>
            <h1>
              PACE SETTERS <span className="gold-text">2026</span>
            </h1>
            <p className="hero-copy">
              Celebrating our journey, preserving our memories, and connecting a
              generation of leaders.
            </p>
            <div className="hero-actions">
              <Link className="button button-gold" href="/directory">
                Explore the Class <span>→</span>
              </Link>
              <Link className="button button-outline" href="/signup">
                Join the Community ↗
              </Link>
            </div>
            <div className="hero-note">
              <span className="status-dot" /> ONE CLASS. ONE LEGACY. ENDLESS POSSIBILITIES.
            </div>
          </div>

          <div className="hero-visual-col">
            <div className="yearbook-frame-placeholder">
              <div className="frame-inner-border">
                <div className="placeholder-crest">
                  <span className="crest-year">2026</span>
                  <span className="crest-title">PACE SETTERS</span>
                  <p className="frame-caption">
                    Official Graduation Photography Frame
                    <br />
                    <small>(Awaiting Class Convocation Portrait)</small>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Ticker Motto */}
      <section className="ticker" aria-label="Class motto">
        <div>
          OUR JOURNEY <b>✳</b> OUR LEADERS <b>✳</b> OUR MEMORIES <b>✳</b> OUR LEGACY <b>✳</b> PACE SETTERS 2026 <b>✳</b> ENDLESS POSSIBILITIES <b>✳</b>
        </div>
      </section>

      {/* SECTION C: Class Highlights (Live Database Statistics) */}
      <section className="stats-section wrap">
        <div className="stats-box-grid">
          <div className="stat-highlight-item">
            <span className="stat-number">{approvedGraduatesCount}</span>
            <span className="stat-title">Approved Graduates</span>
            <p className="stat-desc">
              {approvedGraduatesCount === 0
                ? "Verification queue active"
                : "Verified class leaders"}
            </p>
          </div>

          <div className="stat-highlight-item">
            <span className="stat-number">{departmentsCount}</span>
            <span className="stat-title">Departments</span>
            <p className="stat-desc">
              {departmentsCount === 0
                ? "Spanning all faculties"
                : "Distinct academic disciplines"}
            </p>
          </div>

          <div className="stat-highlight-item">
            <span className="stat-number">{photosCount}</span>
            <span className="stat-title">Graduation Photos</span>
            <p className="stat-desc">
              {photosCount === 0
                ? "Gallery ready for uploads"
                : "Preserved yearbook moments"}
            </p>
          </div>

          <div className="stat-highlight-item">
            <span className="stat-number">{memoriesCount}</span>
            <span className="stat-title">Shared Memories</span>
            <p className="stat-desc">
              {memoriesCount === 0
                ? "First stories being penned"
                : "Enduring class milestones"}
            </p>
          </div>
        </div>

        {!isConfigured && (
          <div className="setup-banner mt-4">
            ℹ Database integration notice: Connect your Supabase project in <code>.env.local</code> to pull live metrics.
          </div>
        )}
      </section>

      {/* SECTION D: Featured Graduates */}
      <section className="featured-graduates wrap" id="featured">
        <div className="section-heading">
          <div>
            <div className="eyebrow">THE VOICES BEHIND THE SET</div>
            <h2>
              Meet Our <em>Pace Setters</em>
            </h2>
          </div>
          <Link className="text-link" href="/directory">
            Browse All Graduates ↗
          </Link>
        </div>

        {featuredGraduates.length > 0 ? (
          <div className="graduate-grid">
            {featuredGraduates.map((grad) => (
              <article className="graduate-card" key={grad.id}>
                <div className="card-media">
                  {grad.profile_photo_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={grad.profile_photo_url}
                      alt={grad.full_name}
                      className="card-avatar-img"
                    />
                  ) : (
                    <div className="card-initials-placeholder">
                      <span>{getInitials(grad.full_name)}</span>
                    </div>
                  )}
                  <span className="class-badge">CLASS OF 2026</span>
                </div>
                <div className="card-body">
                  <h3 className="card-name">{grad.full_name}</h3>
                  <p className="card-dept">{grad.department}</p>
                  {grad.bio && (
                    <p className="card-bio">
                      {grad.bio.length > 90
                        ? `${grad.bio.slice(0, 90)}...`
                        : grad.bio}
                    </p>
                  )}
                  <div className="card-actions">
                    <Link
                      href={`/profiles/${grad.user_id}`}
                      className="button-profile-gold"
                    >
                      View Profile <span>↗</span>
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state-panel">
            <div className="empty-state-icon">🎓</div>
            <h3>Profiles Awaiting Verification</h3>
            <p>
              Approved graduate profiles will appear here. Submit your registration
              with your matriculation number to take your place in the Class of
              2026 directory.
            </p>
            <Link className="button button-gold-sm" href="/signup">
              Submit Your Registration ↗
            </Link>
          </div>
        )}
      </section>

      {/* SECTION E: Community Invitation */}
      <section className="manifesto" id="community-invite">
        <div className="wrap manifesto-inner">
          <div className="eyebrow">PERMANENT DIGITAL HERITAGE</div>
          <h2>
            We came as students.<br />
            <em>We leave as a legacy.</em>
          </h2>
          <p>
            The PACE SETTERS 2026 portal is more than an event souvenir — it is a
            lasting digital community. Register your profile, safeguard your
            graduation photographs in our verified archive, and maintain contact
            with your classmates as we build careers across the globe.
          </p>
          <div className="hero-actions">
            <Link className="button button-gold" href="/signup">
              Register as a Graduate ↗
            </Link>
            <Link className="button button-outline" href="/gallery">
              Explore Yearbook Gallery ↓
            </Link>
          </div>
        </div>
      </section>

      {/* SECTION F: Memories Preview */}
      <section className="memories-preview-section wrap">
        <div className="section-heading">
          <div>
            <div className="eyebrow">CHRONICLES OF OUR JOURNEY</div>
            <h2>
              Class <em>Memories</em> & Milestones
            </h2>
          </div>
          <Link className="text-link" href="/memories">
            View All Memories ↗
          </Link>
        </div>

        {previewMemories.length > 0 ? (
          <div className="memories-cards-grid">
            {previewMemories.map((mem) => (
              <article className="memory-card" key={mem.id}>
                <div className="memory-card-top">
                  <span className="memory-category-tag">{mem.category}</span>
                  <span className="memory-date">
                    {new Date(mem.created_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <h3 className="memory-title">{mem.title}</h3>
                <p className="memory-story">{mem.content}</p>
                <div className="memory-card-foot">
                  <small className="author-text">
                    By {mem.graduate_profiles?.full_name || "Pace Setter"} (
                    {mem.graduate_profiles?.department || "Class of 2026"})
                  </small>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state-panel">
            <div className="empty-state-icon">📖</div>
            <h3>Stories Waiting to be Penned</h3>
            <p>
              Shared memories from our lecture halls, group study sessions, and
              graduation celebrations will be spotlighted here.
            </p>
            <Link className="button button-gold-sm" href="/signup">
              Join & Share Your Story ↗
            </Link>
          </div>
        )}
      </section>

      {/* SECTION About Setters */}
      <section className="about-section wrap" id="about">
        <div className="about-grid">
          <div>
            <div className="eyebrow">ABOUT THE SET</div>
            <h2>
              Defining <em>Excellence</em> Since Day One
            </h2>
            <p className="about-lead">
              The PACE SETTERS 2026 set is recognized for academic rigor, creative
              resilience, and camaraderie. Through rigorous coursework, campus
              leadership, and unforgettable milestones, our class has set the
              benchmark for future sets.
            </p>
          </div>
          <div className="about-values-box">
            <div className="value-item">
              <span className="value-gold">01</span>
              <h4>Academic Distinction</h4>
              <p>Committed to intellectual leadership and professional rigor.</p>
            </div>
            <div className="value-item">
              <span className="value-gold">02</span>
              <h4>Lifelong Brotherhood & Sisterhood</h4>
              <p>Friendships forged in university halls that stand the test of time.</p>
            </div>
            <div className="value-item">
              <span className="value-gold">03</span>
              <h4>Global Impact</h4>
              <p>Stepping boldly into diverse industries as trailblazers and innovators.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

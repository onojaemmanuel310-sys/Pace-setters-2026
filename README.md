# PACE SETTERS 2026: DIGITAL YEARBOOK & GRADUATE COMMUNITY

> **Tagline:** *"One Class. One Legacy. Endless Possibilities."*  
> **Brand Palette:** Sophisticated Black (`#0B0B0B`, `#171717`) and Champagne Gold (`#D6B56D`, `#E8D7A5`, `#F8F5ED`)

---

## 1. Project Overview

**PACE SETTERS 2026** is a production-minded digital graduation yearbook and online graduate community designed to preserve the memories, identities, achievements, and friendships of our graduating set in a permanent digital home.

### Key Capabilities Built:
- **Homepage:** Featuring our class hero, dynamic live database statistics (approved graduates, departments represented, graduation photos, shared memories), featured graduate profiles, community invitation, and memories preview.
- **Searchable Class Directory (`/directory`):** Real-time search by name, keywords, or bio, department dropdown filter, alphabetical (A–Z) navigation, responsive graduate cards with initials badges, and pagination.
- **Reusable Dynamic Profiles (`/profiles/[id]`):** Generated dynamically for each graduate from database records. Supports avatar/photo, biography, graduation photos, achievements, and memories while respecting individual privacy settings (hiding or displaying phone numbers and matriculation numbers).
- **Graduation Yearbook Gallery (`/gallery`):** Publicly viewable high-resolution gallery, accessible lightbox modal viewer, and authenticated direct uploads with real-time progress bars for approved members.
- **Memories Archive (`/memories`):** Categorized story archive (Graduation Stories, Class Events, Appreciation, Milestones, Lessons Learned, Friendship) with member submissions and moderation.
- **Achievements & Honors Wall (`/achievements`):** Academic honors, professional certifications, career milestones, and enterprise ventures showcase.
- **Secure Registration (`/signup`):** Full graduate self-registration with duplicate matriculation number checks, Supabase Auth integration, and an enforced `pending` approval queue.
- **Member Dashboard (`/dashboard`):** Real-time verification status banner, profile completion meter, profile editor with privacy toggles, photo management, memories management, and password settings.
- **Administrator Console (`/admin`):** Strictly secured server-side governance dashboard. Enables one-click approvals, rejections with customizable reasons, account suspension, photo/memory moderation, and real-time database auditing.

---

## 2. Folder & File Structure

```text
PACE-SETTERS-2026/
├── app/
│   ├── achievements/
│   │   └── page.tsx           # Class achievements wall & submission modal
│   ├── admin/
│   │   └── page.tsx           # Secure administrator governance dashboard
│   ├── dashboard/
│   │   └── page.tsx           # Member dashboard & verification status
│   ├── directory/
│   │   └── page.tsx           # Searchable class directory & filters
│   ├── forgot-password/
│   │   └── page.tsx           # Password recovery workflow
│   ├── gallery/
│   │   └── page.tsx           # Yearbook gallery & lightbox
│   ├── login/
│   │   └── page.tsx           # Graduate login portal
│   ├── memories/
│   │   └── page.tsx           # Memories archive & story submission
│   ├── profiles/
│   │   └── [id]/page.tsx      # Dynamic reusable profile page template
│   ├── signup/
│   │   └── page.tsx           # Graduate registration form
│   ├── globals.css            # Luxury black & champagne gold styling
│   ├── layout.tsx             # Root layout with global Navbar & Footer
│   └── page.tsx               # Homepage with live stats & hero
├── components/
│   ├── achievements-view.tsx  # Achievements client component & modal
│   ├── admin-dashboard-view.tsx# Admin review queue, tables & moderation
│   ├── dashboard-view.tsx     # Member dashboard client controller
│   ├── directory-view.tsx     # Search, department & alphabetical filter
│   ├── footer.tsx             # Brand footer & guidelines
│   ├── gallery-view.tsx       # Photo gallery with upload progress
│   ├── lightbox.tsx           # Accessible full-size image viewer
│   ├── login-form.tsx         # Authentication handler
│   ├── memories-view.tsx      # Memories client archive
│   ├── navbar.tsx             # Responsive header with mobile drawer
│   ├── profile-view.tsx       # Reusable graduate profile template
│   └── signup-form.tsx        # Registration form with duplicate checks
├── lib/
│   └── supabase/
│       ├── client.ts          # Browser Supabase client
│       ├── server.ts          # Server-side Supabase client (cookies)
│       └── types.ts           # TypeScript database schemas & interfaces
├── supabase/
│   └── schema.sql             # Complete PostgreSQL schema, triggers & RLS
├── legacy_prototype/          # Preserved early prototype assets
├── .env.example               # Environment variables template
├── .env.local                 # Local environment configuration file
├── package.json               # Next.js 15, React 19, Supabase dependencies
└── tsconfig.json              # TypeScript configuration
```

---

## 3. Quick Start Guide (How to Run the Application)

Open your terminal in the project directory (`c:\Users\EMMANUEL ONOJA\Desktop\Mabel`) and run:

### Step 1: Install Dependencies (Already Completed)
```bash
npm install
```

### Step 2: Start the Development Server
```bash
npm run dev
```

### Step 3: View the Website in Your Browser
Open [http://localhost:3000](http://localhost:3000) in Google Chrome, Microsoft Edge, or Firefox.

To create a production build and verify all routes at any time:
```bash
npm run build
```

---

## 4. Supabase Setup & Fixing the HTTP 401 Error

### Why the Earlier Registration Failed (HTTP 401 Diagnostic)
1. **Invalid API Key Format**: In `register.js`, an unsupported key string (`sb_publishable_...`) was used instead of the standard Supabase JSON Web Token (**anon public key**, which starts with `eyJ...`). PostgREST rejected the request because it could not verify the JWT signature.
2. **Missing Database Table**: The database did not have the `graduate_registrations` table created.
3. **Unauthenticated Direct Insert**: The earlier script attempted to insert rows directly into a database table without registering an authenticated user via `supabase.auth.signUp()`.

### How to Configure Supabase Correctly:

#### A. Configure Environment Variables (`.env.local`)
1. Open `.env.local` in your project folder.
2. Log into your [Supabase Dashboard](https://supabase.com/dashboard).
3. Select your project (`ibnxjgkmmkcszntknroh`).
4. Navigate to **Project Settings** (gear icon on bottom left) > **API**.
5. Copy the **Project URL** and paste it into `NEXT_PUBLIC_SUPABASE_URL`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://ibnxjgkmmkcszntknroh.supabase.co
   ```
6. Under **Project API Keys**, locate the key labeled **`anon` `public`** (this is a long string starting with `eyJhbGciOiJIUzI1NiIsIn...`). Copy it and paste it into `NEXT_PUBLIC_SUPABASE_ANON_KEY`:
   ```env
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
> [!IMPORTANT]
> Never put your `service_role` secret key into `.env.local` or client code. Only use the `anon` `public` key.

---

## 5. Running the Database Migrations (SQL)

1. In your [Supabase Dashboard](https://supabase.com/dashboard), click on **SQL Editor** in the left sidebar.
2. Click **New query**.
3. Open the file `supabase/schema.sql` from this project.
4. Copy its entire contents, paste them into the SQL Editor, and click **Run**.

This will automatically create:
- `user_roles`
- `graduate_registrations`
- `graduate_profiles`
- `graduate_photos`
- `graduate_memories`
- `graduate_achievements`
- `admin_audit_logs`
- Automated signup triggers (`on_auth_user_created_pace_setter`)
- Automated status sync triggers (`on_registration_status_changed`)
- Row Level Security (RLS) policies on all tables
- Storage buckets (`yearbook_photos` and `avatars`)

---

## 6. Configuring Supabase Storage

1. In your Supabase Dashboard, click on **Storage** in the left sidebar.
2. Verify that two buckets exist:
   - `yearbook_photos` (Set to **Public**)
   - `avatars` (Set to **Public**)
3. If they were not created automatically by the SQL script, click **New bucket**, name it `yearbook_photos`, check the box **Public bucket**, and click **Save bucket**. Repeat for `avatars`.

---

## 7. How to Assign the First Administrator

Because administrative privileges should never be granted from the browser, assign your admin role safely via Supabase:

1. Register your account on the website at `http://localhost:3000/signup`.
2. In the Supabase Dashboard, click on **Authentication > Users** and find your email address. Copy your **User UID** (a UUID like `123e4567-e89b-12d3-a456-426614174000`).
3. Open the **SQL Editor** in Supabase and run this command (replace with your UID):

```sql
-- 1. Grant Administrator Role
insert into public.user_roles (user_id, role)
values ('YOUR-USER-UUID-HERE', 'admin')
on conflict (user_id) do update set role = 'admin';

-- 2. Approve your own registration immediately
update public.graduate_registrations
set approval_status = 'approved', reviewed_at = now()
where user_id = 'YOUR-USER-UUID-HERE';

update public.graduate_profiles
set is_approved = true
where user_id = 'YOUR-USER-UUID-HERE';
```

4. Now log into the website. You will see the **Admin** button in the navigation bar and can access `http://localhost:3000/admin`.

---

## 8. Verification & Acceptance Testing Workflow

Follow these steps to test all functionality:

1. **Registration Test (`/signup`):**
   - Register as a student (e.g. `Amaka Bello`, Matric `U2022/ACC/001`, Email `amaka@example.com`).
   - Notice the pending message: *"Your matriculation number is awaiting verification by the administrator."*
2. **Duplicate Protection Test:**
   - Attempt to register again using the same matriculation number `U2022/ACC/001`.
   - The form immediately blocks submission and warns of the duplicate matriculation number.
3. **Pending Access Control Test:**
   - Log in as the new user and go to `/dashboard`.
   - The status banner clearly shows **"Pending Administrator Verification"**.
   - Photo upload is locked, and the user does **not** appear in the public `/directory`.
4. **Admin Approval Test (`/admin`):**
   - Log in with your admin account and navigate to `/admin`.
   - Open the **Membership Queue** tab.
   - Click **Approve** on the pending registration.
5. **Approved Privilege Test:**
   - Refresh the student's dashboard. The status badge turns to **"Verified Graduate"**.
   - The graduate can now upload graduation photos with captions and progress bars.
   - The graduate now appears immediately on the homepage, in the Class Directory (`/directory`), and has a live public profile at `/profiles/[id]`.
6. **Gallery & Lightbox Test (`/gallery`):**
   - View the gallery as a public visitor.
   - Click any photograph to open the high-resolution lightbox with caption and graduate name.
   - The photo owner or administrator can delete photos.

---

## 9. Adding Future Features Without Rebuilding Profiles

Every graduate profile is generated dynamically by `app/profiles/[id]/page.tsx` based on their `user_id`. When you want to add new sections in the future (such as project defense papers, LinkedIn links, or convocation awards):
1. Add the column to the database (e.g., `alter table public.graduate_profiles add column linkedin_url text;`).
2. Add the field to the interface in `lib/supabase/types.ts`.
3. Add the UI element in `components/profile-view.tsx` and the input in `components/dashboard-view.tsx`.
All existing and future graduates will instantly gain the feature without creating individual files.

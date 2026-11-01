"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export function SignupForm() {
  const [formData, setFormData] = useState({
    fullName: "",
    department: "",
    matricNumber: "",
    email: "",
    phone: "",
    bio: "",
    password: "",
    confirmPassword: "",
  });

  const [busy, setBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    text: string;
    type: "success" | "error" | "info";
  } | null>(null);

  const departmentsList = [
    "Accounting",
    "Banking & Finance",
    "Business Administration",
    "Computer Science",
    "Economics",
    "Mass Communication",
    "Marketing",
    "Public Administration",
    "Political Science",
    "Sociology",
    "Other",
  ];

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatusMessage(null);

    // Validation
    if (formData.password.length < 8) {
      setStatusMessage({
        text: "Password must be at least 8 characters in length.",
        type: "error",
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setStatusMessage({
        text: "Password confirmation does not match.",
        type: "error",
      });
      return;
    }

    if (!isSupabaseConfigured()) {
      setStatusMessage({
        text: "Supabase credentials are not yet configured in .env.local. Please see setup instructions.",
        type: "info",
      });
      return;
    }

    try {
      setBusy(true);
      const supabase = createClient();

      const cleanMatric = formData.matricNumber.trim().toUpperCase();
      const cleanEmail = formData.email.trim().toLowerCase();

      // 1. Duplicate check on matriculation number in graduate_registrations
      const { data: existingReg, error: checkError } = await supabase
        .from("graduate_registrations")
        .select("id, matric_number, email")
        .or(`matric_number.eq.${cleanMatric},email.eq.${cleanEmail}`)
        .maybeSingle();

      if (!checkError && existingReg) {
        if (existingReg.matric_number === cleanMatric) {
          throw new Error(
            `A registration with matriculation number "${cleanMatric}" already exists. Please log in or contact the administrator.`
          );
        }
        if (existingReg.email === cleanEmail) {
          throw new Error(
            `An account with email "${cleanEmail}" is already registered. Please proceed to the login page.`
          );
        }
      }

      // 2. Call Supabase Auth to create secure user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName.trim(),
            department: formData.department.trim(),
            matric_number: cleanMatric,
            phone: formData.phone.trim() || null,
            bio: formData.bio.trim() || null,
          },
        },
      });

      if (authError) throw authError;

      // 3. Fallback: if database trigger is not yet configured, create registration record directly
      if (authData.user) {
        await supabase
          .from("graduate_registrations")
          .upsert([
            {
              user_id: authData.user.id,
              full_name: formData.fullName.trim(),
              department: formData.department.trim(),
              matric_number: cleanMatric,
              email: cleanEmail,
              phone: formData.phone.trim() || null,
              bio: formData.bio.trim() || null,
              approval_status: "pending",
            },
          ], { onConflict: "user_id" });

        await supabase
          .from("graduate_profiles")
          .upsert([
            {
              user_id: authData.user.id,
              full_name: formData.fullName.trim(),
              department: formData.department.trim(),
              bio: formData.bio.trim() || null,
              phone: formData.phone.trim() || null,
              is_approved: false,
            },
          ], { onConflict: "user_id" });
      }

      setStatusMessage({
        text: "Registration submitted successfully! Your matriculation number is awaiting verification by the administrator. You may now log in to view your application status.",
        type: "success",
      });

      setFormData({
        fullName: "",
        department: "",
        matricNumber: "",
        email: "",
        phone: "",
        bio: "",
        password: "",
        confirmPassword: "",
      });
    } catch (err: unknown) {
      console.error("Registration error:", err);
      setStatusMessage({
        text:
          err instanceof Error
            ? err.message
            : "An unexpected error occurred during registration. Please verify your connection.",
        type: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="auth-form-body">
      <div className="form-field">
        <label htmlFor="fullName">FULL NAME *</label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          required
          minLength={3}
          placeholder="e.g. Chukwuma Judith Adeleke"
          value={formData.fullName}
          onChange={handleChange}
          disabled={busy}
        />
      </div>

      <div className="form-grid-2">
        <div className="form-field">
          <label htmlFor="department">DEPARTMENT *</label>
          <select
            id="department"
            name="department"
            required
            value={formData.department}
            onChange={handleChange}
            disabled={busy}
            className="filter-select"
          >
            <option value="">Select your department</option>
            {departmentsList.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="matricNumber">MATRICULATION NUMBER *</label>
          <input
            id="matricNumber"
            name="matricNumber"
            type="text"
            required
            placeholder="e.g. U2022/ACC/104"
            value={formData.matricNumber}
            onChange={handleChange}
            disabled={busy}
          />
        </div>
      </div>

      <div className="form-grid-2">
        <div className="form-field">
          <label htmlFor="email">EMAIL ADDRESS *</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={formData.email}
            onChange={handleChange}
            disabled={busy}
          />
        </div>

        <div className="form-field">
          <label htmlFor="phone">PHONE NUMBER (OPTIONAL)</label>
          <input
            id="phone"
            name="phone"
            type="tel"
            placeholder="+234 800 000 0000"
            value={formData.phone}
            onChange={handleChange}
            disabled={busy}
          />
        </div>
      </div>

      <div className="form-grid-2">
        <div className="form-field">
          <label htmlFor="password">PASSWORD (MIN 8 CHARACTERS) *</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="••••••••"
            value={formData.password}
            onChange={handleChange}
            disabled={busy}
          />
        </div>

        <div className="form-field">
          <label htmlFor="confirmPassword">CONFIRM PASSWORD *</label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="••••••••"
            value={formData.confirmPassword}
            onChange={handleChange}
            disabled={busy}
          />
        </div>
      </div>

      <div className="form-field">
        <label htmlFor="bio">BIOGRAPHY & ASPIRATIONS (OPTIONAL)</label>
        <textarea
          id="bio"
          name="bio"
          rows={3}
          maxLength={500}
          placeholder="Share your favorite university memories, motto, or future ambitions..."
          value={formData.bio}
          onChange={handleChange}
          disabled={busy}
        />
      </div>

      <button
        type="submit"
        className="button button-gold form-button"
        disabled={busy}
      >
        {busy ? "Submitting Registration..." : "Submit Registration for Verification ↗"}
      </button>

      {statusMessage && (
        <div className={`form-message-banner ${statusMessage.type}`} role="status">
          <p>{statusMessage.text}</p>
          {statusMessage.type === "success" && (
            <div className="mt-3">
              <Link href="/login" className="text-gold-underline">
                Proceed to Login Page →
              </Link>
            </div>
          )}
        </div>
      )}
    </form>
  );
}

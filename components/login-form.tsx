"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage("");

    if (!isSupabaseConfigured()) {
      setErrorMessage(
        "Supabase credentials are not yet configured in .env.local. Please check your setup."
      );
      return;
    }

    try {
      setBusy(true);
      const supabase = createClient();

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) throw error;

      if (data.user) {
        // Check if admin
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id)
          .maybeSingle();

        if (roleData?.role === "admin") {
          router.push("/admin");
        } else {
          router.push("/dashboard");
        }
        router.refresh();
      }
    } catch (err: unknown) {
      console.error("Login error:", err);
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Invalid email or password. Please verify your credentials."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="auth-form-body">
      <div className="form-field">
        <label htmlFor="login_email">EMAIL ADDRESS</label>
        <input
          id="login_email"
          type="email"
          required
          autoComplete="email"
          placeholder="your.email@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={busy}
        />
      </div>

      <div className="form-field">
        <div className="field-label-row">
          <label htmlFor="login_password">PASSWORD</label>
          <Link href="/forgot-password" className="forgot-password-link">
            Forgot password?
          </Link>
        </div>
        <input
          id="login_password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={busy}
        />
      </div>

      <button
        type="submit"
        className="button button-gold form-button"
        disabled={busy}
      >
        {busy ? "Authenticating..." : "Sign In to Portal ↗"}
      </button>

      {errorMessage && (
        <div className="form-message-banner error" role="alert">
          <p>{errorMessage}</p>
        </div>
      )}
    </form>
  );
}

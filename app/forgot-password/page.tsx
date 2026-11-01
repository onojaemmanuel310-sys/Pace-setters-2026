"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (!isSupabaseConfigured()) {
      setMessage({
        text: "Supabase credentials are not configured yet.",
        type: "error",
      });
      return;
    }

    try {
      setBusy(true);
      setMessage(null);
      const supabase = createClient();

      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        {
          redirectTo: `${window.location.origin}/dashboard`,
        }
      );

      if (error) throw error;

      setMessage({
        text: "Password recovery email sent! Check your inbox for instructions to reset your password.",
        type: "success",
      });
      setEmail("");
    } catch (err: unknown) {
      console.error("Reset password error:", err);
      setMessage({
        text:
          err instanceof Error
            ? err.message
            : "Failed to send reset email. Please try again.",
        type: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-header-block">
          <div className="eyebrow">
            <span className="eyebrow-line" /> ACCOUNT SECURITY
          </div>
          <h1>
            Reset <em>Password</em>
          </h1>
          <p className="auth-subtitle">
            Enter your registered email address and we will send you a secure
            password recovery link.
          </p>
        </div>

        <form onSubmit={handleReset} className="auth-form-body">
          <div className="form-field">
            <label htmlFor="reset_email">EMAIL ADDRESS</label>
            <input
              id="reset_email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
            />
          </div>

          <button
            type="submit"
            className="button button-gold form-button"
            disabled={busy}
          >
            {busy ? "Sending Link..." : "Send Password Reset Link ↗"}
          </button>

          {message && (
            <div className={`form-message-banner ${message.type}`} role="status">
              <p>{message.text}</p>
            </div>
          )}
        </form>

        <div className="auth-footer-prompt">
          <p>
            Remember your credentials?{" "}
            <Link href="/login" className="text-gold-link">
              Back to login →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

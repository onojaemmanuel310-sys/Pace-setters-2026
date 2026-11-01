import Link from "next/link";
import { LoginForm } from "@/components/login-form";

export const metadata = {
  title: "Member Login | PACE SETTERS 2026",
  description: "Sign in to your PACE SETTERS 2026 graduate portal.",
};

export default function LoginPage() {
  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-header-block">
          <div className="eyebrow">
            <span className="eyebrow-line" /> GRADUATE PORTAL
          </div>
          <h1>
            Welcome <em>Back</em>
          </h1>
          <p className="auth-subtitle">
            Sign in to check your verification status, upload graduation
            photographs, or edit your public profile.
          </p>
        </div>

        <LoginForm />

        <div className="auth-footer-prompt">
          <p>
            Graduating in 2026 and not yet registered?{" "}
            <Link href="/signup" className="text-gold-link">
              Submit registration ↗
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

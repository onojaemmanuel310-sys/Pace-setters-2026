import Link from "next/link";
import { SignupForm } from "@/components/signup-form";

export const metadata = {
  title: "Graduate Registration | PACE SETTERS 2026",
  description:
    "Register your official profile and matriculation credentials to join PACE SETTERS 2026.",
};

export default function SignupPage() {
  return (
    <div className="auth-shell">
      <div className="auth-card-wide">
        <div className="auth-header-block">
          <div className="eyebrow">
            <span className="eyebrow-line" /> OFFICIAL VERIFICATION
          </div>
          <h1>
            Join the <em>Legacy</em>
          </h1>
          <p className="auth-subtitle">
            Register your profile as a graduating student. Your matriculation
            credentials will be submitted for verification by the set executives
            before public listing.
          </p>
        </div>

        <SignupForm />

        <div className="auth-footer-prompt">
          <p>
            Already registered?{" "}
            <Link href="/login" className="text-gold-link">
              Sign in to your member portal →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

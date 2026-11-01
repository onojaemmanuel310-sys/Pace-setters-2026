"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    try {
      const supabase = createClient();
      supabase.auth.getUser().then(async ({ data }) => {
        if (data.user) {
          setUser({ id: data.user.id, email: data.user.email });
          const { data: roleData } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", data.user.id)
            .maybeSingle();
          if (roleData?.role === "admin") {
            setIsAdmin(true);
          }
        }
      });

      const { data: authListener } = supabase.auth.onAuthStateChange(
        async (_event, session) => {
          if (session?.user) {
            setUser({ id: session.user.id, email: session.user.email });
            const { data: roleData } = await supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", session.user.id)
              .maybeSingle();
            setIsAdmin(roleData?.role === "admin");
          } else {
            setUser(null);
            setIsAdmin(false);
          }
        }
      );

      return () => {
        authListener.subscription.unsubscribe();
      };
    } catch {
      // Graceful fallback if Supabase is unconfigured
    }
  }, []);

  async function handleSignOut() {
    if (!isSupabaseConfigured()) return;
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      window.location.href = "/";
    } catch (err) {
      console.error("Sign out error:", err);
    }
  }

  return (
    <header className="site-header">
      <div className="wrap nav-container">
        <Link className="brand-wordmark" href="/">
          PACE SETTERS <span className="gold-text">2026</span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="desktop-nav">
          <Link href="/">Home</Link>
          <Link href="/directory">Class Directory</Link>
          <Link href="/gallery">Yearbook Gallery</Link>
          <Link href="/memories">Memories</Link>
          <Link href="/achievements">Achievements</Link>
          <Link href="/#about">About</Link>
        </nav>

        {/* Action Controls */}
        <div className="nav-actions">
          {user ? (
            <div className="auth-pill-group">
              <Link className="button-gold-subtle" href="/dashboard">
                My Dashboard
              </Link>
              {isAdmin && (
                <Link className="button-admin-pill" href="/admin">
                  Admin
                </Link>
              )}
              <button
                onClick={handleSignOut}
                className="button-text-sm"
                type="button"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="auth-pill-group">
              <Link className="button-login-outline" href="/login">
                Login
              </Link>
              <Link className="button-gold-sm" href="/signup">
                Join Community
              </Link>
            </div>
          )}

          {/* Mobile Menu Hamburger */}
          <button
            className="mobile-toggle"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={isOpen}
          >
            <span className={isOpen ? "bar open" : "bar"} />
            <span className={isOpen ? "bar open" : "bar"} />
            <span className={isOpen ? "bar open" : "bar"} />
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {isOpen && (
        <div className="mobile-drawer" onClick={() => setIsOpen(false)}>
          <div className="mobile-drawer-content" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-drawer-head">
              <span className="brand-wordmark">
                PACE SETTERS <span className="gold-text">2026</span>
              </span>
              <button
                className="close-drawer"
                onClick={() => setIsOpen(false)}
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>
            <nav className="mobile-nav-links">
              <Link href="/" onClick={() => setIsOpen(false)}>
                Home
              </Link>
              <Link href="/directory" onClick={() => setIsOpen(false)}>
                Class Directory
              </Link>
              <Link href="/gallery" onClick={() => setIsOpen(false)}>
                Yearbook Gallery
              </Link>
              <Link href="/memories" onClick={() => setIsOpen(false)}>
                Memories
              </Link>
              <Link href="/achievements" onClick={() => setIsOpen(false)}>
                Achievements
              </Link>
              <Link href="/#about" onClick={() => setIsOpen(false)}>
                About
              </Link>
              <hr className="divider-gold" />
              {user ? (
                <>
                  <Link href="/dashboard" onClick={() => setIsOpen(false)}>
                    Dashboard
                  </Link>
                  {isAdmin && (
                    <Link href="/admin" onClick={() => setIsOpen(false)}>
                      Administrator Console
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      handleSignOut();
                    }}
                    className="mobile-logout-btn"
                  >
                    Log Out
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={() => setIsOpen(false)}>
                    Sign In
                  </Link>
                  <Link
                    href="/signup"
                    className="button-gold-mobile"
                    onClick={() => setIsOpen(false)}
                  >
                    Join the Community
                  </Link>
                </>
              )}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}

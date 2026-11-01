import Link from "next/link";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="wrap footer-grid">
        <div className="footer-brand">
          <Link className="brand-wordmark" href="/">
            PACE SETTERS <span className="gold-text">2026</span>
          </Link>
          <p className="tagline">
            &ldquo;One Class. One Legacy. Endless Possibilities.&rdquo;
          </p>
          <p className="footer-desc">
            The permanent digital home, yearbook, and graduate community for the
            Class of 2026. Preserving our achievements, memories, and connections
            across generations.
          </p>
        </div>

        <div className="footer-col">
          <h4>Explore</h4>
          <ul>
            <li><Link href="/">Home</Link></li>
            <li><Link href="/directory">Class Directory</Link></li>
            <li><Link href="/gallery">Yearbook Gallery</Link></li>
            <li><Link href="/memories">Our Memories</Link></li>
            <li><Link href="/achievements">Class Achievements</Link></li>
          </ul>
        </div>

        <div className="footer-col">
          <h4>Community</h4>
          <ul>
            <li><Link href="/signup">Graduate Registration</Link></li>
            <li><Link href="/login">Member Login</Link></li>
            <li><Link href="/dashboard">Member Portal</Link></li>
            <li><Link href="/#about">About the Set</Link></li>
          </ul>
        </div>

        <div className="footer-col">
          <h4>Guidelines & Contact</h4>
          <p className="footer-subtext">
            For matriculation inquiries, verification requests, or official
            announcements, reach out to the class executives.
          </p>
          <div className="footer-badges">
            <span className="badge-gold">Class of Distinction</span>
            <span className="badge-gold">Verified Archive</span>
          </div>
        </div>
      </div>

      <div className="footer-bottom wrap">
        <p>© 2026 PACE SETTERS. All rights reserved. Designed for elegance & timeless preservation.</p>
        <div className="footer-legal">
          <span>Community Standards</span>
          <span>•</span>
          <span>Privacy & Verification</span>
        </div>
      </div>
    </footer>
  );
}

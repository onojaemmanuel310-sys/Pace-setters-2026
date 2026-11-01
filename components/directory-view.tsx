"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { GraduateProfile } from "@/lib/supabase/types";

interface DirectoryViewProps {
  initialProfiles: GraduateProfile[];
  departments: string[];
}

export function DirectoryView({
  initialProfiles,
  departments,
}: DirectoryViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState("all");
  const [selectedLetter, setSelectedLetter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  const filteredProfiles = useMemo(() => {
    return initialProfiles.filter((profile) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        profile.full_name.toLowerCase().includes(q) ||
        profile.department.toLowerCase().includes(q) ||
        (profile.bio && profile.bio.toLowerCase().includes(q));

      const matchesDept =
        selectedDept === "all" || profile.department === selectedDept;

      const matchesLetter =
        selectedLetter === "all" ||
        profile.full_name
          .trim()
          .toUpperCase()
          .startsWith(selectedLetter);

      return matchesSearch && matchesDept && matchesLetter;
    });
  }, [initialProfiles, searchQuery, selectedDept, selectedLetter]);

  const totalPages = Math.ceil(filteredProfiles.length / pageSize) || 1;
  const paginatedProfiles = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProfiles.slice(start, start + pageSize);
  }, [filteredProfiles, currentPage]);

  function handleReset() {
    setSearchQuery("");
    setSelectedDept("all");
    setSelectedLetter("all");
    setCurrentPage(1);
  }

  function getInitials(name: string): string {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  return (
    <div className="directory-wrapper">
      {/* Search & Filter Controls */}
      <div className="directory-controls">
        <div className="search-box">
          <span className="search-icon" aria-hidden="true">🔍</span>
          <input
            type="search"
            placeholder="Search graduates by name, department, or keywords..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            aria-label="Search graduates"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="clear-search-btn"
              type="button"
            >
              ✕
            </button>
          )}
        </div>

        <div className="filter-dropdown-container">
          <select
            value={selectedDept}
            onChange={(e) => {
              setSelectedDept(e.target.value);
              setCurrentPage(1);
            }}
            aria-label="Filter by department"
            className="filter-select"
          >
            <option value="all">All Departments ({departments.length})</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Alphabetical Browse Bar */}
      <div className="alphabet-bar" role="group" aria-label="Browse alphabetically">
        <button
          className={selectedLetter === "all" ? "letter-btn active" : "letter-btn"}
          onClick={() => {
            setSelectedLetter("all");
            setCurrentPage(1);
          }}
          type="button"
        >
          ALL
        </button>
        {alphabet.map((letter) => (
          <button
            key={letter}
            className={selectedLetter === letter ? "letter-btn active" : "letter-btn"}
            onClick={() => {
              setSelectedLetter(letter);
              setCurrentPage(1);
            }}
            type="button"
          >
            {letter}
          </button>
        ))}
      </div>

      {/* Results Count & Filter Indicators */}
      <div className="results-header">
        <p className="results-count">
          Showing <strong>{filteredProfiles.length}</strong> approved graduate
          {filteredProfiles.length === 1 ? "" : "s"}
          {selectedDept !== "all" && ` in ${selectedDept}`}
          {selectedLetter !== "all" && ` starting with "${selectedLetter}"`}
        </p>

        {(searchQuery || selectedDept !== "all" || selectedLetter !== "all") && (
          <button onClick={handleReset} className="reset-filter-link" type="button">
            Reset all filters
          </button>
        )}
      </div>

      {/* Directory Grid */}
      {paginatedProfiles.length > 0 ? (
        <div className="graduate-grid">
          {paginatedProfiles.map((graduate) => (
            <article className="graduate-card" key={graduate.id}>
              <div className="card-media">
                {graduate.profile_photo_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={graduate.profile_photo_url}
                    alt={graduate.full_name}
                    className="card-avatar-img"
                  />
                ) : (
                  <div className="card-initials-placeholder">
                    <span>{getInitials(graduate.full_name)}</span>
                  </div>
                )}
                <span className="class-badge">CLASS OF 2026</span>
              </div>

              <div className="card-body">
                <h3 className="card-name">{graduate.full_name}</h3>
                <p className="card-dept">{graduate.department}</p>
                {graduate.bio && (
                  <p className="card-bio">
                    {graduate.bio.length > 95
                      ? `${graduate.bio.slice(0, 95)}...`
                      : graduate.bio}
                  </p>
                )}

                <div className="card-actions">
                  <Link
                    href={`/profiles/${graduate.user_id}`}
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
          <h3>No Classmates Found</h3>
          <p>
            No approved graduates matched your search criteria. Try modifying your
            spelling or clearing active filters.
          </p>
          <button onClick={handleReset} className="button-gold-sm" type="button">
            View All Classmates
          </button>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="pagination-wrapper">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="pagination-btn"
            type="button"
          >
            ← Previous
          </button>

          <span className="pagination-indicator">
            Page {currentPage} of {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="pagination-btn"
            type="button"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

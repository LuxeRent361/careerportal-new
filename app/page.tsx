"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const categories = [
  {
    title: "Government Jobs",
    count: "Recruitment",
    href: "/jobs",
    symbol: "G",
  },
  {
    title: "Private Jobs",
    count: "Opportunities",
    href: "/private-jobs",
    symbol: "P",
  },
  {
    title: "Results",
    count: "Latest results",
    href: "/results",
    symbol: "R",
  },
  {
    title: "Admit Cards",
    count: "Download",
    href: "/admit-card",
    symbol: "A",
  },
  {
    title: "Exams",
    count: "Notifications",
    href: "/exam",
    symbol: "E",
  },
  {
    title: "Education",
    count: "Guidance",
    href: "/education",
    symbol: "Ed",
  },
];

const navigation = [
  { title: "Jobs", href: "/jobs" },
  { title: "Private", href: "/private-jobs" },
  { title: "Exams", href: "/exam" },
  { title: "Results", href: "/results" },
  { title: "Admit Cards", href: "/admit-card" },
  { title: "Education", href: "/education" },
];

const jobs = [
  {
    code: "SSC",
    title: "SSC CGL 2026 Recruitment",
    organization: "Staff Selection Commission",
    tags: ["Graduate", "Central Govt.", "Online"],
    deadline: "View notification",
  },
  {
    code: "RRB",
    title: "RRB NTPC Recruitment 2026",
    organization: "Railway Recruitment Board",
    tags: ["Graduate", "Railway", "Multiple Posts"],
    deadline: "View notification",
  },
  {
    code: "UPSC",
    title: "UPSC Civil Services Examination",
    organization: "Union Public Service Commission",
    tags: ["Graduate", "All India", "Civil Services"],
    deadline: "View notification",
  },
  {
    code: "CTET",
    title: "CTET 2026 Examination",
    organization: "Central Board of Secondary Education",
    tags: ["Teaching", "Education", "Online"],
    deadline: "View notification",
  },
];

const featured = [
  {
    title: "Latest recruitment notifications",
    meta: "Government Jobs",
  },
  {
    title: "Recently released examination results",
    meta: "Results",
  },
  {
    title: "Admit cards and examination schedules",
    meta: "Admit Card",
  },
  {
    title: "Important exam notifications",
    meta: "Exams",
  },
];

const updates = [
  {
    type: "RESULT",
    date: "Latest",
    title: "Latest Government Exam Results",
    description:
      "Find recently released results, merit lists and official result information.",
    href: "/results",
  },
  {
    type: "ADMIT CARD",
    date: "Latest",
    title: "Admit Card & Exam Updates",
    description:
      "Check examination schedules and official admit card information.",
    href: "/admit-card",
  },
  {
    type: "EDUCATION",
    date: "Guide",
    title: "Education & Career Guidance",
    description:
      "Explore useful education information, courses and career resources.",
    href: "/education",
  },
];

function SearchIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function MenuIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg
        width="19"
        height="19"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M6 6l12 12" />
        <path d="M18 6 6 18" />
      </svg>
    );
  }

  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </svg>
  );
}

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const searchHref = searchValue.trim()
    ? `/search?q=${encodeURIComponent(searchValue.trim())}`
    : "/search";

  return (
    <main>
      {/* =========================================
          HEADER
      ========================================= */}
      <header className="site-header">
        <div className="container-main header-inner">
          <Link
            href="/"
            className="brand"
            onClick={closeMobileMenu}
            aria-label="CareerPortal Home"
          >
            <div className="brand-mark">CP</div>

            <div>
              <div className="brand-name">
                Career<span>Portal</span>
              </div>

              <div className="brand-subtitle">
                Career intelligence platform
              </div>
            </div>
          </Link>

          {/* Desktop navigation */}
          <nav className="desktop-nav" aria-label="Main navigation">
            {navigation.map((item) => (
              <Link href={item.href} key={item.href}>
                {item.title}
              </Link>
            ))}
          </nav>

          <div className="header-actions">
            <Link
              href="/search"
              className="header-search"
              aria-label="Search CareerPortal"
            >
              <SearchIcon />
            </Link>

            <Link href="/login" className="header-login">
              Login
            </Link>

            {/* Mobile menu button */}
            <button
              type="button"
              className="mobile-menu-button"
              aria-label={
                mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"
              }
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((current) => !current)}
            >
              <MenuIcon open={mobileMenuOpen} />
            </button>
          </div>
        </div>

        {/* Mobile navigation */}
        {mobileMenuOpen && (
          <>
            <button
              type="button"
              className="mobile-menu-overlay"
              aria-label="Close navigation menu"
              onClick={closeMobileMenu}
            />

            <div className="mobile-menu-panel">
              <div className="mobile-menu-header">
                <div>
                  <div className="mobile-menu-title">Explore CareerPortal</div>
                  <div className="mobile-menu-subtitle">
                    Jobs, exams, results & education
                  </div>
                </div>

                <Link
                  href="/login"
                  className="mobile-login-button"
                  onClick={closeMobileMenu}
                >
                  Login
                </Link>
              </div>

              <nav
                className="mobile-nav"
                aria-label="Mobile navigation"
              >
                {navigation.map((item, index) => (
                  <Link
                    href={item.href}
                    key={item.href}
                    className="mobile-nav-link"
                    onClick={closeMobileMenu}
                  >
                    <span className={`mobile-nav-icon mobile-nav-icon-${index + 1}`}>
                      {index + 1}
                    </span>

                    <span>{item.title}</span>

                    <ArrowIcon />
                  </Link>
                ))}
              </nav>

              <div className="mobile-menu-categories">
                <div className="mobile-menu-small-title">
                  Quick access
                </div>

                <div className="mobile-category-grid">
                  <Link
                    href="/jobs"
                    onClick={closeMobileMenu}
                    className="mobile-category-item"
                  >
                    Government Jobs
                  </Link>

                  <Link
                    href="/private-jobs"
                    onClick={closeMobileMenu}
                    className="mobile-category-item"
                  >
                    Private Jobs
                  </Link>

                  <Link
                    href="/results"
                    onClick={closeMobileMenu}
                    className="mobile-category-item"
                  >
                    Results
                  </Link>

                  <Link
                    href="/admit-card"
                    onClick={closeMobileMenu}
                    className="mobile-category-item"
                  >
                    Admit Cards
                  </Link>
                </div>
              </div>
            </div>
          </>
        )}
      </header>

      {/* =========================================
          HERO
      ========================================= */}
      <section className="hero">
        <div className="container-main hero-grid">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="eyebrow-dot" />
              Your career, better informed
            </div>

            <h1 className="hero-title">
              Find the right
              <span className="accent"> opportunity.</span>
            </h1>

            <p className="hero-description">
              Discover government jobs, private opportunities, exams,
              results, admit cards and education updates through one
              focused career platform.
            </p>

            <form
              className="hero-search"
              onSubmit={(event) => {
                event.preventDefault();
                window.location.href = searchHref;
              }}
            >
              <div className="hero-search-field">
                <SearchIcon />

                <input
                  type="search"
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder="Search jobs, exams, results or organizations"
                  aria-label="Search CareerPortal"
                />
              </div>

              <button type="submit" className="hero-search-button">
                Search
              </button>
            </form>

            <div className="hero-meta">
              <span>Government Jobs</span>
              <span>Private Jobs</span>
              <span>Results</span>
              <span>Exams</span>
            </div>
          </div>

          <div className="hero-visual" aria-hidden="true">
            <div className="hero-orbit" />

            <div className="dashboard-card">
              <div className="dashboard-top">
                <div className="dashboard-label">
                  CareerPortal / Live updates
                </div>

                <div className="live-pill">UPDATED</div>
              </div>

              <div className="dashboard-title">
                Latest opportunities
              </div>

              <div className="dashboard-line" />

              <div className="mini-job">
                <div className="mini-logo">SSC</div>

                <div className="mini-job-content">
                  <div className="mini-job-title">
                    SSC CGL 2026
                  </div>

                  <div className="mini-job-meta">
                    Graduate · Central Government
                  </div>
                </div>

                <div className="mini-status">NEW</div>
              </div>

              <div className="mini-job">
                <div className="mini-logo">RRB</div>

                <div className="mini-job-content">
                  <div className="mini-job-title">
                    RRB NTPC 2026
                  </div>

                  <div className="mini-job-meta">
                    Railway · Multiple Posts
                  </div>
                </div>

                <div className="mini-status">NEW</div>
              </div>

              <div className="mini-job">
                <div className="mini-logo">UP</div>

                <div className="mini-job-content">
                  <div className="mini-job-title">
                    Civil Services Examination
                  </div>

                  <div className="mini-job-meta">
                    UPSC · Graduate
                  </div>
                </div>

                <div className="mini-status">VIEW</div>
              </div>
            </div>

            <div className="floating-card">
              <div className="floating-card-label">
                One platform
              </div>

              <div className="floating-card-number">06+</div>

              <div className="floating-card-text">
                major career information categories
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================
          QUICK CATEGORIES
      ========================================= */}
      <section className="quick-section">
        <div className="container-main">
          <div className="quick-grid">
            {categories.map((category) => (
              <Link
                href={category.href}
                key={category.title}
                className="quick-item"
              >
                <div className="quick-icon">
                  {category.symbol}
                </div>

                <div className="quick-title">
                  {category.title}
                </div>

                <div className="quick-count">
                  {category.count}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================
          GOVERNMENT JOBS
      ========================================= */}
      <section className="jobs-section section-space">
        <div className="container-main">
          <div className="section-heading-row">
            <div>
              <div className="eyebrow">
                <span className="eyebrow-dot" />
                Government recruitment
              </div>

              <h2 className="section-title">
                Latest government opportunities
              </h2>

              <p className="section-description">
                Browse recruitment information in a clean format with
                organization, eligibility and application details.
              </p>
            </div>

            <Link href="/jobs" className="view-all">
              View all jobs →
            </Link>
          </div>

          <div className="jobs-layout">
            <div className="job-list">
              {jobs.map((job) => (
                <Link
                  href="/jobs"
                  className="job-card"
                  key={job.title}
                >
                  <div className="company-logo">
                    {job.code}
                  </div>

                  <div className="job-main-content">
                    <div className="job-title">
                      {job.title}
                    </div>

                    <div className="job-org">
                      {job.organization}
                    </div>

                    <div className="job-tags">
                      {job.tags.map((tag) => (
                        <span className="job-tag" key={tag}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="job-side">
                    <div className="job-deadline-label">
                      Application
                    </div>

                    <div className="job-deadline">
                      {job.deadline}
                    </div>

                    <span className="job-arrow">
                      <ArrowIcon />
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            <aside className="featured-panel">
              <div className="featured-kicker">
                CareerPortal focus
              </div>

              <h3 className="featured-title">
                Important career information, without the clutter.
              </h3>

              <p className="featured-text">
                A focused place to discover recruitment, examination,
                result and education updates.
              </p>

              <div className="featured-items">
                {featured.map((item) => (
                  <Link
                    href="/jobs"
                    className="featured-item"
                    key={item.title}
                  >
                    <div className="featured-item-title">
                      {item.title}
                    </div>

                    <div className="featured-item-meta">
                      {item.meta}
                    </div>
                  </Link>
                ))}
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* =========================================
          RESULTS / ADMIT CARD / EDUCATION
      ========================================= */}
      <section className="content-section section-space">
        <div className="container-main">
          <div className="section-heading-row">
            <div>
              <div className="eyebrow">
                <span className="eyebrow-dot" />
                More career updates
              </div>

              <h2 className="section-title">
                Stay ahead of what matters
              </h2>

              <p className="section-description">
                Results, admit cards and education resources are
                organized separately so visitors can quickly find
                what they need.
              </p>
            </div>
          </div>

          <div className="content-grid">
            {updates.map((update) => (
              <Link
                href={update.href}
                className="content-card"
                key={update.title}
              >
                <div className="content-card-top">
                  <span className="content-type">
                    {update.type}
                  </span>

                  <span className="content-date">
                    {update.date}
                  </span>
                </div>

                <h3>{update.title}</h3>

                <p>{update.description}</p>

                <span className="content-link">
                  Explore section <ArrowIcon />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================
          STATS
      ========================================= */}
      <section className="stats-section">
        <div className="container-main">
          <div className="stats-grid">
            <div className="stat">
              <div className="stat-number">01</div>
              <div className="stat-label">
                Unified career platform
              </div>
            </div>

            <div className="stat">
              <div className="stat-number">06+</div>
              <div className="stat-label">
                Core information sections
              </div>
            </div>

            <div className="stat">
              <div className="stat-number">24/7</div>
              <div className="stat-label">
                Information discovery
              </div>
            </div>

            <div className="stat">
              <div className="stat-number">1</div>
              <div className="stat-label">
                Simple search experience
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================
          CTA
      ========================================= */}
      <section className="cta-section">
        <div className="container-main">
          <div className="cta-box">
            <h2>
              One place for your next career move.
            </h2>

            <p>
              Explore jobs, examinations, results, admit cards and
              education resources through CareerPortal.
            </p>

            <Link href="/jobs" className="cta-button">
              Explore opportunities
            </Link>
          </div>
        </div>
      </section>

      {/* =========================================
          FOOTER
      ========================================= */}
      <footer className="site-footer">
        <div className="container-main">
          <div className="footer-grid">
            <div>
              <Link
                href="/"
                className="brand"
                onClick={closeMobileMenu}
              >
                <div className="brand-mark">CP</div>

                <div>
                  <div
                    className="brand-name"
                    style={{ color: "white" }}
                  >
                    Career<span>Portal</span>
                  </div>

                  <div className="brand-subtitle">
                    Career intelligence platform
                  </div>
                </div>
              </Link>

              <p className="footer-brand-text">
                A modern platform for discovering government jobs,
                private opportunities, examinations, results, admit
                cards and education resources.
              </p>
            </div>

            <div>
              <div className="footer-heading">Explore</div>

              <div className="footer-links">
                <Link href="/jobs">Government Jobs</Link>
                <Link href="/private-jobs">Private Jobs</Link>
                <Link href="/exam">Exams</Link>
                <Link href="/results">Results</Link>
              </div>
            </div>

            <div>
              <div className="footer-heading">Resources</div>

              <div className="footer-links">
                <Link href="/admit-card">Admit Cards</Link>
                <Link href="/education">Education</Link>
                <Link href="/search">Search</Link>
                <Link href="/about">About</Link>
              </div>
            </div>

            <div>
              <div className="footer-heading">Information</div>

              <div className="footer-links">
                <Link href="/privacy">Privacy</Link>
                <Link href="/terms">Terms</Link>
                <Link href="/contact">Contact</Link>
                <Link href="/disclaimer">Disclaimer</Link>
              </div>
            </div>
          </div>

          <div className="footer-bottom">
            <span>
              © {new Date().getFullYear()} CareerPortal
            </span>

            <span>
              Jobs · Exams · Results · Education
            </span>
          </div>
        </div>
      </footer>
    </main>
  );
}
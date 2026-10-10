"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import "./home-enhancements.css";

const categories = [
  { title: "Government Jobs", description: "Latest recruitment notifications", href: "/jobs", icon: "▣", number: "01" },
  { title: "Private Jobs", description: "Companies & private opportunities", href: "/private-jobs", icon: "◆", number: "02" },
  { title: "Government Exams", description: "Exam notifications & details", href: "/exam", icon: "◈", number: "03" },
  { title: "Results", description: "Latest exam results", href: "/results", icon: "✓", number: "04" },
  { title: "Admit Cards", description: "Download hall tickets", href: "/admit-cards", icon: "▤", number: "05" },
  { title: "Education", description: "Courses, careers & guidance", href: "/education", icon: "◇", number: "06" },
];

const jobs = [
  { title: "SSC CGL 2026", organization: "Staff Selection Commission", location: "All India", qualification: "Graduate", deadline: "Check official notice", tag: "SSC", href: "/jobs" },
  { title: "RRB NTPC 2026", organization: "Railway Recruitment Board", location: "All India", qualification: "12th / Graduate", deadline: "Check official notice", tag: "RAILWAY", href: "/jobs" },
  { title: "UPSC Civil Services", organization: "Union Public Service Commission", location: "All India", qualification: "Graduate", deadline: "Check official notice", tag: "UPSC", href: "/jobs" },
  { title: "CTET 2026", organization: "Central Board of Secondary Education", location: "All India", qualification: "12th / Graduate", deadline: "Check official notice", tag: "TEACHING", href: "/exam" },
];

const updates = [
  { type: "RESULT", title: "Latest Government Exam Results", text: "Find examination results and official result links.", href: "/results" },
  { type: "ADMIT CARD", title: "Admit Card & Exam Updates", text: "Check hall tickets, examination dates and download links.", href: "/admit-cards" },
  { type: "EXAM", title: "Upcoming Government Exams", text: "Explore exam details, eligibility and important dates.", href: "/exam" },
  { type: "PRIVATE JOB", title: "Private Job Opportunities", text: "Explore company openings and private-sector opportunities.", href: "/private-jobs" },
];

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="m16.5 16.5 4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return <span className="cp-check-icon" aria-hidden="true">✓</span>;
}

export default function HomePage() {
  const [search, setSearch] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("careerportal-theme");
      const enabled = saved === "dark";
      setDarkMode(enabled);
      document.documentElement.dataset.cpTheme = enabled ? "dark" : "light";
    } catch {
      document.documentElement.dataset.cpTheme = "light";
    }
  }, []);

  function toggleTheme() {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.dataset.cpTheme = next ? "dark" : "light";
    try {
      window.localStorage.setItem("careerportal-theme", next ? "dark" : "light");
    } catch {
      // Theme still works for the current page if storage is unavailable.
    }
  }

  const suggestions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return [];

    const jobMatches = jobs
      .filter((job) =>
        `${job.title} ${job.organization} ${job.tag} ${job.qualification}`
          .toLowerCase()
          .includes(query)
      )
      .map((job) => ({ title: job.title, detail: job.organization, href: job.href, type: "JOB" }));

    const categoryMatches = categories
      .filter((category) => category.title.toLowerCase().includes(query))
      .map((category) => ({ title: category.title, detail: category.description, href: category.href, type: "SECTION" }));

    return [...jobMatches, ...categoryMatches].slice(0, 5);
  }, [search]);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = search.trim();
    window.location.href = query ? `/search?q=${encodeURIComponent(query)}` : "/search";
  }

  const activeUpdate = updates[activeSlide % updates.length];

  return (
    <main className="cp-home">
      <div className="cp-theme-bar">
        <span><span className="cp-live-dot" /> CareerPortal Updates</span>
        <button className="cp-theme-toggle" type="button" onClick={toggleTheme} aria-label="Toggle light and dark mode">
          <span aria-hidden="true">{darkMode ? "☀" : "☾"}</span>
          {darkMode ? "Light mode" : "Dark mode"}
        </button>
      </div>

      {/* ANNOUNCEMENT */}
      <section className="cp-announcement">
        <div className="cp-wide cp-announcement-inner">
          <span className="cp-live-dot" />
          <strong>CareerPortal Updates</strong>
          <span>Jobs, exams, results, admit cards & education</span>
          <Link href="/jobs">Explore opportunities <ArrowIcon /></Link>
        </div>
      </section>

      {/* TRENDING SLIDER */}
      <section className="cp-trending cp-wide" aria-label="Trending updates">
        <div className="cp-trending-label"><span className="cp-pulse-dot" /> TRENDING</div>
        <Link href={activeUpdate.href} className="cp-trending-content" key={activeUpdate.title}>
          <span className="cp-trending-type">{activeUpdate.type}</span>
          <strong>{activeUpdate.title}</strong>
          <span className="cp-trending-description">{activeUpdate.text}</span>
          <ArrowIcon />
        </Link>
        <div className="cp-slider-controls">
          <button type="button" onClick={() => setActiveSlide((activeSlide + updates.length - 1) % updates.length)} aria-label="Previous update">‹</button>
          <span>{activeSlide + 1}/{updates.length}</span>
          <button type="button" onClick={() => setActiveSlide((activeSlide + 1) % updates.length)} aria-label="Next update">›</button>
        </div>
      </section>

      {/* HERO */}
      <section className="cp-hero">
        <div className="cp-hero-grid-bg" />
        <div className="cp-wide cp-hero-inner">
          <div className="cp-hero-copy">
            <div className="cp-eyebrow"><span className="cp-eyebrow-dot" /> INDIA&apos;S CAREER INFORMATION PLATFORM</div>
            <h1>Find your next <span>opportunity.</span></h1>
            <p className="cp-hero-description">
              Discover government jobs, private jobs, exams, results, admit cards and useful education resources — all in one place.
            </p>

            <form className="cp-search-box" onSubmit={handleSearch}>
              <div className="cp-search-icon"><SearchIcon /></div>
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => window.setTimeout(() => setShowSuggestions(false), 150)}
                placeholder="Search SSC, UPSC, Railway, results..."
                aria-label="Search CareerPortal"
                autoComplete="off"
              />
              <button type="submit">Search <ArrowIcon /></button>

              {showSuggestions && search.trim() && (
                <div className="cp-search-suggestions">
                  <div className="cp-suggestion-heading">Quick results</div>
                  {suggestions.length ? suggestions.map((item) => (
                    <Link href={item.href} key={`${item.type}-${item.title}`} className="cp-suggestion">
                      <span className="cp-suggestion-icon"><SearchIcon /></span>
                      <span><strong>{item.title}</strong><small>{item.detail}</small></span>
                      <span className="cp-suggestion-type">{item.type}</span>
                    </Link>
                  )) : (
                    <div className="cp-no-suggestions">No matching homepage items. Press Search to search the website.</div>
                  )}
                  <button className="cp-search-all" type="submit">Search the website <ArrowIcon /></button>
                </div>
              )}
            </form>

            <div className="cp-hero-trust">
              <span><CheckIcon /> Official-source focused</span>
              <span><CheckIcon /> Easy to understand</span>
              <span><CheckIcon /> Mobile friendly</span>
            </div>
            <div className="cp-hero-links">
              <span>Popular:</span>
              <Link href="/jobs">SSC</Link>
              <Link href="/jobs">Railway</Link>
              <Link href="/jobs">UPSC</Link>
              <Link href="/exam">Teaching</Link>
            </div>
          </div>

          {/* DECORATIVE DASHBOARD */}
          <div className="cp-hero-visual">
            <div className="cp-orbit cp-orbit-one" />
            <div className="cp-orbit cp-orbit-two" />
            <div className="cp-3d-card cp-main-dashboard">
              <div className="cp-dashboard-head">
                <div><span>CAREERPORTAL</span><strong>Opportunity Center</strong></div>
                <div className="cp-dashboard-menu">•••</div>
              </div>
              <div className="cp-dashboard-stats">
                <div><small>JOBS</small><strong>Explore</strong><span>Recruitment</span></div>
                <div><small>EXAMS</small><strong>Prepare</strong><span>Exam updates</span></div>
                <div><small>RESULTS</small><strong>Check</strong><span>Latest results</span></div>
              </div>
              <div className="cp-mini-title"><span>Explore opportunities</span><Link href="/jobs">View all ↗</Link></div>
              {jobs.slice(0, 3).map((job, index) => (
                <Link href={job.href} className="cp-mini-job" key={job.title}>
                  <div className={`cp-mini-logo ${["blue", "green", "purple"][index]}`}>{job.tag.slice(0, 3)}</div>
                  <div><strong>{job.title}</strong><span>{job.organization}</span></div>
                  <b>›</b>
                </Link>
              ))}
              <div className="cp-dashboard-footer"><span className="cp-secure"><span /> Explore official information</span><span>CareerPortal</span></div>
            </div>
            <div className="cp-floating-card cp-floating-top"><div className="cp-floating-icon">✓</div><div><strong>Stay informed</strong><span>Check official sources</span></div></div>
            <div className="cp-floating-card cp-floating-bottom"><strong>06</strong><span>Career sections</span><small>One portal, more choices</small></div>
            <div className="cp-3d-ring"><span /></div>
          </div>
        </div>
        <div className="cp-hero-bottom"><div className="cp-wide cp-hero-bottom-grid"><span>Explore by category</span><div /><span>Scroll to discover ↓</span></div></div>
      </section>

      {/* CATEGORIES */}
      <section className="cp-section cp-category-section">
        <div className="cp-wide">
          <div className="cp-section-heading">
            <div><span className="cp-kicker">EXPLORE CAREERPORTAL</span><h2>Everything you need, in one place.</h2><p>Quickly jump to the section you are looking for.</p></div>
            <Link href="/search" className="cp-outline-button">Search everything <ArrowIcon /></Link>
          </div>
          <div className="cp-category-grid">
            {categories.map((category) => (
              <Link href={category.href} key={category.title} className="cp-category-card cp-tilt-card">
                <div className="cp-category-number">{category.number}</div>
                <div className="cp-category-icon">{category.icon}</div>
                <div className="cp-category-content"><h3>{category.title}</h3><p>{category.description}</p></div>
                <div className="cp-category-arrow"><ArrowIcon /></div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* JOBS */}
      <section className="cp-section cp-jobs-section">
        <div className="cp-wide">
          <div className="cp-section-heading">
            <div><span className="cp-kicker">LATEST OPPORTUNITIES</span><h2>Government jobs worth checking.</h2><p>Explore recruitment information and opportunities matching your qualification.</p></div>
            <Link href="/jobs" className="cp-text-button">View all jobs <ArrowIcon /></Link>
          </div>
          <div className="cp-jobs-layout">
            <div className="cp-jobs-grid">
              {jobs.map((job, index) => (
                <Link href={job.href} className="cp-job-card cp-tilt-card" key={job.title}>
                  <div className="cp-job-top"><div className={`cp-job-logo job-${index + 1}`}>{job.tag.slice(0, 3)}</div><span className="cp-job-badge"><span className="cp-pulse-dot" />{job.tag}</span></div>
                  <h3>{job.title}</h3>
                  <p className="cp-job-org">{job.organization}</p>
                  <div className="cp-job-details"><span>⌖ {job.location}</span><span>▣ {job.qualification}</span></div>
                  <div className="cp-job-bottom"><span>{job.deadline}</span><span className="cp-job-open">Open <ArrowIcon /></span></div>
                </Link>
              ))}
            </div>
            <aside className="cp-feature-card">
              <div className="cp-feature-glow" />
              <span className="cp-feature-kicker">CAREER TIP</span>
              <h3>Don&apos;t apply only for one opportunity.</h3>
              <p>Build a preparation routine and keep checking relevant recruitment, exam and result updates.</p>
              <div className="cp-feature-list">
                <div><CheckIcon /> Track important dates</div>
                <div><CheckIcon /> Read the official notification</div>
                <div><CheckIcon /> Verify eligibility before applying</div>
              </div>
              <Link href="/education" className="cp-feature-button">Explore career guidance <ArrowIcon /></Link>
            </aside>
          </div>
        </div>
      </section>

      {/* UPDATES */}
      <section className="cp-section cp-updates-section">
        <div className="cp-wide">
          <div className="cp-section-heading"><div><span className="cp-kicker">LATEST UPDATES</span><h2>Stay ahead of important updates.</h2><p>Use the dedicated sections to find the information you need.</p></div></div>
          <div className="cp-update-grid">
            {updates.map((item, index) => (
              <Link href={item.href} key={item.type} className="cp-update-card cp-tilt-card">
                <div className={`cp-update-number n-${index + 1}`}>0{index + 1}</div>
                <div className="cp-update-content"><span>{item.type}</span><h3>{item.title}</h3><p>{item.text}</p><strong>Explore section <ArrowIcon /></strong></div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* SLIDER */}
      <section className="cp-section cp-showcase-section">
        <div className="cp-wide">
          <div className="cp-section-heading"><div><span className="cp-kicker">QUICK ACCESS</span><h2>Explore more on CareerPortal.</h2><p>Swipe on mobile or use the arrows to browse important sections.</p></div></div>
          <div className="cp-category-slider">
            {categories.map((category) => (
              <Link href={category.href} key={category.title} className="cp-slider-card">
                <span>{category.number}</span><strong>{category.title}</strong><small>{category.description}</small><ArrowIcon />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="cp-stats-section">
        <div className="cp-wide"><div className="cp-stats-shell">
          <div className="cp-stats-intro"><span className="cp-kicker">YOUR CAREER HUB</span><h2>One platform.<br />Multiple possibilities.</h2><p>From finding a vacancy to understanding an exam, CareerPortal brings useful career information together.</p></div>
          <div className="cp-stat-grid">
            <div className="cp-stat"><strong>06</strong><span>Career sections</span></div>
            <div className="cp-stat"><strong>24/7</strong><span>Access to information</span></div>
            <div className="cp-stat"><strong>Mobile</strong><span>Responsive experience</span></div>
            <div className="cp-stat"><strong>Official</strong><span>Verify before applying</span></div>
          </div>
        </div></div>
      </section>

      {/* TRUST */}
      <section className="cp-section cp-trust-section">
        <div className="cp-wide"><div className="cp-trust-layout">
          <div><span className="cp-kicker">IMPORTANT</span><h2>Always verify before <span>you apply.</span></h2><p>CareerPortal is an independent information platform. For application dates, eligibility, fees and other important details, always verify the information with the official authority or notification.</p></div>
          <div className="cp-trust-points">
            <div><CheckIcon /><div><strong>Official source first</strong><span>Check the original notification.</span></div></div>
            <div><CheckIcon /><div><strong>Check eligibility</strong><span>Confirm qualification and age requirements.</span></div></div>
            <div><CheckIcon /><div><strong>Check important dates</strong><span>Never rely on outdated information.</span></div></div>
          </div>
        </div></div>
      </section>

      {/* FINAL CTA */}
      <section className="cp-final-cta">
        <div className="cp-cta-grid-bg" />
        <div className="cp-wide cp-final-cta-inner">
          <div><span className="cp-kicker cp-kicker-light">START EXPLORING</span><h2>Your next opportunity<br />could be one search away.</h2><p>Explore jobs, exams, results, admit cards and education resources on CareerPortal.</p></div>
          <div className="cp-final-actions"><Link href="/jobs" className="cp-white-button">Explore Jobs <ArrowIcon /></Link><Link href="/education" className="cp-dark-outline-button">Career Guidance <ArrowIcon /></Link></div>
        </div>
      </section>
    </main>
  );
}
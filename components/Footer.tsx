import Link from "next/link";

const exploreLinks = [
  ["Government Jobs", "/jobs"],
  ["Private Jobs", "/private-jobs"],
  ["Government Exams", "/exam"],
  ["Results", "/results"],
  ["Admit Cards", "/admit-cards"],
  ["Education", "/education"],
];

const companyLinks = [
  ["About", "/about"],
  ["Contact", "/contact"],
  ["Privacy Policy", "/privacy"],
  ["Terms", "/terms"],
  ["Disclaimer", "/disclaimer"],
];

const usefulLinks = [
  ["Search", "/search"],
  ["Career Guidance", "/education"],
  ["Latest Jobs", "/jobs"],
  ["Exam Updates", "/exam"],
];

export default function Footer() {
  return (
    <footer className="cp-footer">
      <div className="cp-footer-main">
        <div className="cp-wide">
          <div className="cp-footer-grid">
            {/* Brand */}
            <div className="cp-footer-brand">
              <Link href="/" className="cp-footer-logo">
                <span className="cp-footer-logo-mark">CP</span>

                <span className="cp-footer-logo-text">
                  Career<span>Portal</span>
                </span>
              </Link>

              <p className="cp-footer-description">
                CareerPortal is an independent career information platform
                helping students and job seekers discover government jobs,
                private jobs, examinations, results, admit cards and education
                resources.
              </p>

              <p className="cp-footer-note">
                Important: Information can change when the relevant authority
                publishes a new notification. Always verify eligibility,
                dates, fees and other important details through the official
                website or notification.
              </p>
            </div>

            {/* Explore */}
            <div className="cp-footer-column">
              <h3>Explore</h3>

              <div className="cp-footer-links">
                {exploreLinks.map(([label, href]) => (
                  <Link href={href} key={href}>
                    {label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Company */}
            <div className="cp-footer-column">
              <h3>Company</h3>

              <div className="cp-footer-links">
                {companyLinks.map(([label, href]) => (
                  <Link href={href} key={href}>
                    {label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Useful */}
            <div className="cp-footer-column">
              <h3>Useful</h3>

              <div className="cp-footer-links">
                {usefulLinks.map(([label, href]) => (
                  <Link href={href} key={href}>
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="cp-footer-bottom">
        <div className="cp-wide cp-footer-bottom-inner">
          <p>
            © {new Date().getFullYear()} CareerPortal. All rights reserved.
          </p>

          <p>
            Independent information platform · Verify important details with
            official sources.
          </p>
        </div>
      </div>
    </footer>
  );
}
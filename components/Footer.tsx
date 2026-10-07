import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-6 lg:px-8">

        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">

          <div className="lg:col-span-2">
            <Link
              href="/"
              className="inline-flex items-center gap-3"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-xs font-black">
                CP
              </span>

              <span className="text-2xl font-black">
                Career<span className="text-blue-400">Portal</span>
              </span>
            </Link>

            <p className="mt-5 max-w-xl text-sm leading-7 text-slate-400">
              CareerPortal is an independent information platform
              helping students and job seekers discover government
              jobs, private jobs, examinations, results, admit cards
              and education resources.
            </p>

            <p className="mt-4 max-w-xl text-xs leading-6 text-slate-500">
              Information may change when the relevant authority
              publishes a new notification. Always verify important
              details through the official website or notification.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-black text-white">
              Explore
            </h3>

            <div className="mt-4 grid gap-3 text-sm text-slate-400">
              <Link className="hover:text-white" href="/jobs">
                Government Jobs
              </Link>

              <Link className="hover:text-white" href="/private-jobs">
                Private Jobs
              </Link>

              <Link className="hover:text-white" href="/exam">
                Government Exams
              </Link>

              <Link className="hover:text-white" href="/results">
                Results
              </Link>

              <Link className="hover:text-white" href="/admit-cards">
                Admit Cards
              </Link>

              <Link className="hover:text-white" href="/education">
                Education
              </Link>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-black text-white">
              Company
            </h3>

            <div className="mt-4 grid gap-3 text-sm text-slate-400">
              <Link className="hover:text-white" href="/about">
                About
              </Link>

              <Link className="hover:text-white" href="/contact">
                Contact
              </Link>

              <Link className="hover:text-white" href="/privacy">
                Privacy Policy
              </Link>

              <Link className="hover:text-white" href="/terms">
                Terms
              </Link>

              <Link className="hover:text-white" href="/disclaimer">
                Disclaimer
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} CareerPortal. All rights reserved.
          </p>

          <p>
            Independent information platform • Verify important details with official sources.
          </p>
        </div>
      </div>
    </footer>
  );
}
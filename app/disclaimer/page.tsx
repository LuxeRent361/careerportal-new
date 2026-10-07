import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Disclaimer | CareerPortal",
  description:
    "Read the CareerPortal disclaimer regarding jobs, exams, results and external links.",
};

export default function DisclaimerPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
            Disclaimer
          </h1>

          <p className="mt-3 text-sm text-slate-500">
            Last updated: October 2026
          </p>
        </div>
      </section>

      <article className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="space-y-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <section>
            <h2 className="text-lg font-extrabold text-slate-900">
              Informational Purpose
            </h2>

            <p className="mt-3 text-sm leading-7 text-slate-600">
              CareerPortal is an informational platform. Content published
              on the website is intended to help users discover career,
              recruitment, examination, result, admit card and education
              information.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-extrabold text-slate-900">
              Government Affiliation
            </h2>

            <p className="mt-3 text-sm leading-7 text-slate-600">
              CareerPortal is not a government department and should not be
              considered an official government website unless a particular
              page explicitly identifies an official organization.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-extrabold text-slate-900">
              Verification
            </h2>

            <p className="mt-3 text-sm leading-7 text-slate-600">
              Users should verify all important information directly from
              the official notification or official website before applying
              for any job, examination or other opportunity.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-extrabold text-slate-900">
              External Links
            </h2>

            <p className="mt-3 text-sm leading-7 text-slate-600">
              Some pages may contain links to external websites. CareerPortal
              does not control those websites and is not responsible for
              their content, availability or policies.
            </p>
          </section>

          <section className="rounded-2xl bg-blue-50 p-5">
            <p className="text-sm font-semibold leading-7 text-slate-700">
              Always check the latest official notification before making
              decisions related to applications, examinations, fees,
              eligibility or recruitment.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
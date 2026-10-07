import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us | CareerPortal",
  description:
    "Contact CareerPortal for questions, corrections, suggestions and general website enquiries.",
};

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-blue-700">
            Contact CareerPortal
          </span>

          <h1 className="mt-5 text-3xl font-extrabold text-slate-900 sm:text-4xl">
            We would like to hear from you
          </h1>

          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
            For corrections, suggestions, feedback or general enquiries,
            please contact the CareerPortal team.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-extrabold text-slate-900">
              General Enquiries
            </h2>

            <p className="mt-3 text-sm leading-7 text-slate-600">
              If you have a question about our website, content or
              services, you can reach out to us.
            </p>

            <div className="mt-6 rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Email
              </p>

              <p className="mt-1 text-sm font-bold text-slate-800">
                support@careerportal.space
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-extrabold text-slate-900">
              Content Correction
            </h2>

            <p className="mt-3 text-sm leading-7 text-slate-600">
              If you notice incorrect, outdated or incomplete information,
              please mention the page title and the specific information
              that needs correction.
            </p>

            <div className="mt-6 rounded-2xl bg-blue-50 p-4">
              <p className="text-sm font-semibold leading-6 text-slate-700">
                Please verify important recruitment information from the
                official organization before applying.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
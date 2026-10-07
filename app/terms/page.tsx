import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions | CareerPortal",
  description:
    "Read the terms and conditions for using CareerPortal.",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
            Terms & Conditions
          </h1>

          <p className="mt-3 text-sm text-slate-500">
            Last updated: October 2026
          </p>
        </div>
      </section>

      <article className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="space-y-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <Section
            title="1. Use of Website"
            text="CareerPortal provides informational content related to jobs, examinations, results, admit cards and education. Users are expected to use the website only for lawful purposes."
          />

          <Section
            title="2. Information Accuracy"
            text="We make reasonable efforts to present useful and accurate information, but users should always verify important dates, eligibility, fees, vacancies and other recruitment details through the relevant official notification or organization website."
          />

          <Section
            title="3. External Websites"
            text="CareerPortal may provide links to external websites. We do not control those websites and are not responsible for their availability, content, policies or services."
          />

          <Section
            title="4. Intellectual Property"
            text="Website design, branding and original content created for CareerPortal may be protected by applicable intellectual property laws. Users may not reproduce or misuse protected material without appropriate permission."
          />

          <Section
            title="5. Changes"
            text="CareerPortal may update website content, features and these terms from time to time. Continued use of the website after changes indicates acceptance of the updated terms."
          />

          <Section
            title="6. Contact"
            text="For questions about these terms, please use the contact information provided on the Contact Us page."
          />
        </div>
      </article>
    </main>
  );
}

function Section({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <section>
      <h2 className="text-lg font-extrabold text-slate-900">
        {title}
      </h2>

      <p className="mt-3 text-sm leading-7 text-slate-600">
        {text}
      </p>
    </section>
  );
}
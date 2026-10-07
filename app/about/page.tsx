import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us | CareerPortal",
  description:
    "Learn about CareerPortal, a platform for jobs, exams, results, admit cards and education information.",
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-blue-700">
            About CareerPortal
          </span>

          <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Helping people find career opportunities and useful updates
          </h1>

          <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600">
            CareerPortal is an information platform designed to make
            career-related updates easier to discover and understand.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="grid gap-6 md:grid-cols-2">
          <InfoCard
            title="Government Jobs"
            text="Find recruitment opportunities with important dates, eligibility information, vacancies and official links."
          />

          <InfoCard
            title="Exams"
            text="Stay informed about upcoming examinations, applications and important examination updates."
          />

          <InfoCard
            title="Results & Admit Cards"
            text="Access published result and admit card information along with relevant official links."
          />

          <InfoCard
            title="Education"
            text="Explore useful education information, academic opportunities and learning resources."
          />
        </div>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-2xl font-extrabold text-slate-900">
            Our Approach
          </h2>

          <div className="mt-5 space-y-4 text-sm leading-7 text-slate-600">
            <p>
              We aim to organize career information in a simple,
              readable and useful format.
            </p>

            <p>
              Whenever official links are available, users are encouraged
              to verify important information directly with the concerned
              organization before taking any action.
            </p>

            <p>
              CareerPortal is an information platform and does not
              represent a government department, examination authority or
              private employer unless explicitly stated.
            </p>
          </div>
        </section>
      </section>
    </main>
  );
}

function InfoCard({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 font-extrabold text-blue-700">
        CP
      </div>

      <h2 className="mt-5 text-lg font-extrabold text-slate-900">
        {title}
      </h2>

      <p className="mt-2 text-sm leading-6 text-slate-600">
        {text}
      </p>
    </article>
  );
}
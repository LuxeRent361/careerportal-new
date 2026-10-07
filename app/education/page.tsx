import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Education Updates | CareerPortal",
  description:
    "Explore education updates, courses, admissions, eligibility and useful academic information on CareerPortal.",
};

type Education = {
  id: string;
  title: string | null;
  organization: string | null;
  category: string | null;
  description: string | null;
  qualification: string | null;
  official_website: string | null;
  expiry_date: string | null;
  is_published: boolean | null;
};

export default async function EducationPage() {
  const supabase = await createClient();
  const today = new Date().toISOString();

  const { data, error } = await supabase
    .from("education")
    .select("*")
    .eq("is_published", true)
    .or(`expiry_date.is.null,expiry_date.gte.${today}`)
    .order("created_at", { ascending: false });

  const educationItems = (data ?? []) as Education[];

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <span className="inline-flex rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-blue-700">
            Education & Learning
          </span>

          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
            Education Updates
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
            Explore useful education information, courses, admissions,
            qualifications and academic opportunities.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
            <h2 className="font-bold text-red-800">
              Unable to load education updates
            </h2>

            <p className="mt-2 text-sm text-red-700">
              Please try again later.
            </p>
          </div>
        ) : educationItems.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
              🎓
            </div>

            <h2 className="mt-5 text-xl font-extrabold text-slate-900">
              No education updates available
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              New education information will appear here when it is
              published.
            </p>

            <Link
              href="/"
              className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
            >
              Back to Home
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                Learn & Grow
              </p>

              <h2 className="mt-1 text-2xl font-extrabold text-slate-900">
                Latest Education Information
              </h2>
            </div>

            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {educationItems.map((item) => (
                <article
                  key={item.id}
                  className="group flex flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
                      {item.category || "Education"}
                    </span>

                    <span className="text-xl">🎓</span>
                  </div>

                  <h3 className="mt-5 text-lg font-extrabold leading-snug text-slate-900 transition group-hover:text-blue-700">
                    {item.title || "Education Information"}
                  </h3>

                  {item.organization && (
                    <p className="mt-2 text-sm font-semibold text-slate-600">
                      {item.organization}
                    </p>
                  )}

                  {item.qualification && (
                    <div className="mt-4 rounded-xl bg-slate-50 p-3">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        Eligibility
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-700">
                        {item.qualification}
                      </p>
                    </div>
                  )}

                  {item.description && (
                    <p className="mt-4 line-clamp-4 text-sm leading-6 text-slate-500">
                      {item.description}
                    </p>
                  )}

                  <div className="mt-auto pt-6">
                    {item.official_website ? (
                      <a
                        href={item.official_website}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="block rounded-xl bg-blue-600 px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-blue-700"
                      >
                        Visit Official Website ↗
                      </a>
                    ) : (
                      <Link
                        href="/"
                        className="block rounded-xl border border-slate-200 px-4 py-3 text-center text-sm font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                      >
                        Explore CareerPortal
                      </Link>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
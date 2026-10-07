import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Search | CareerPortal",
  description:
    "Search government jobs, private jobs, exams, results, admit cards and education updates on CareerPortal.",
};

type SearchItem = {
  id: string;
  title: string | null;
  organization: string | null;
  category: string | null;
  description: string | null;
  kind: "Job" | "Exam" | "Result" | "Education";
};

function getQuery(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const query = getQuery(params.q).trim();

  let items: SearchItem[] = [];
  let errorMessage = "";

  if (query) {
    const supabase = await createClient();
    const search = `%${query}%`;
    const today = new Date().toISOString();

    const [jobsResponse, examsResponse, resultsResponse, educationResponse] =
      await Promise.all([
        supabase
          .from("jobs")
          .select(
            "id,title,organization,category,description"
          )
          .eq("is_published", true)
          .or(`expiry_date.is.null,expiry_date.gte.${today}`)
          .or(
            `title.ilike.${search},organization.ilike.${search},category.ilike.${search},description.ilike.${search}`
          )
          .limit(20),

        supabase
          .from("exams")
          .select(
            "id,title,organization,category,description"
          )
          .eq("is_published", true)
          .or(`expiry_date.is.null,expiry_date.gte.${today}`)
          .or(
            `title.ilike.${search},organization.ilike.${search},category.ilike.${search},description.ilike.${search}`
          )
          .limit(20),

        supabase
          .from("results")
          .select(
            "id,title,organization,category,description"
          )
          .eq("is_published", true)
          .or(`expiry_date.is.null,expiry_date.gte.${today}`)
          .or(
            `title.ilike.${search},organization.ilike.${search},category.ilike.${search},description.ilike.${search}`
          )
          .limit(20),

        supabase
          .from("education")
          .select(
            "id,title,organization,category,description"
          )
          .eq("is_published", true)
          .or(`expiry_date.is.null,expiry_date.gte.${today}`)
          .or(
            `title.ilike.${search},organization.ilike.${search},category.ilike.${search},description.ilike.${search}`
          )
          .limit(20),
      ]);

    const responses = [
      jobsResponse,
      examsResponse,
      resultsResponse,
      educationResponse,
    ];

    const failed = responses.find((response) => response.error);

    if (failed?.error) {
      errorMessage =
        "Some search results could not be loaded. Please try again.";
    }

    items = [
      ...(jobsResponse.data ?? []).map((item) => ({
        ...item,
        kind: "Job" as const,
      })),

      ...(examsResponse.data ?? []).map((item) => ({
        ...item,
        kind: "Exam" as const,
      })),

      ...(resultsResponse.data ?? []).map((item) => ({
        ...item,
        kind: "Result" as const,
      })),

      ...(educationResponse.data ?? []).map((item) => ({
        ...item,
        kind: "Education" as const,
      })),
    ] as SearchItem[];
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <span className="inline-flex rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-blue-700">
            CareerPortal Search
          </span>

          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Search CareerPortal
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
            Search across jobs, exams, results and education information.
          </p>

          <form
            action="/search"
            method="GET"
            className="mt-7 flex flex-col gap-3 sm:flex-row"
          >
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Search SSC CGL, Railway, UPSC, Result..."
              className="min-h-12 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />

            <button
              type="submit"
              className="min-h-12 rounded-xl bg-blue-600 px-7 text-sm font-bold text-white transition hover:bg-blue-700"
            >
              Search
            </button>
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        {!query ? (
          <div className="rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
              🔎
            </div>

            <h2 className="mt-5 text-xl font-extrabold text-slate-900">
              What are you looking for?
            </h2>

            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
              Try searching for an organization, exam name, job category,
              recruitment or result.
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {["SSC", "UPSC", "Railway", "Banking", "Teaching"].map(
                (suggestion) => (
                  <Link
                    key={suggestion}
                    href={`/search?q=${encodeURIComponent(suggestion)}`}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                  >
                    {suggestion}
                  </Link>
                )
              )}
            </div>
          </div>
        ) : errorMessage ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
            <h2 className="font-bold text-red-800">
              Search problem
            </h2>

            <p className="mt-2 text-sm text-red-700">
              {errorMessage}
            </p>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
              🔍
            </div>

            <h2 className="mt-5 text-xl font-extrabold text-slate-900">
              No results found
            </h2>

            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
              We couldn't find anything matching{" "}
              <strong className="text-slate-700">
                "{query}"
              </strong>
              .
            </p>

            <Link
              href="/search"
              className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700"
            >
              Try Another Search
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                  Search Results
                </p>

                <h2 className="mt-1 text-2xl font-extrabold text-slate-900">
                  Results for "{query}"
                </h2>
              </div>

              <span className="rounded-full bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm ring-1 ring-slate-200">
                {items.length} found
              </span>
            </div>

            <div className="space-y-4">
              {items.map((item) => (
                <SearchCard key={`${item.kind}-${item.id}`} item={item} />
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function SearchCard({ item }: { item: SearchItem }) {
  const href =
    item.kind === "Job"
      ? `/jobs/${item.id}`
      : item.kind === "Exam"
        ? `/exam`
        : item.kind === "Result"
          ? `/results`
          : `/education`;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md">
      <div className="flex items-start gap-4">
        <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-lg sm:flex">
          {item.kind === "Job"
            ? "💼"
            : item.kind === "Exam"
              ? "📝"
              : item.kind === "Result"
                ? "📊"
                : "🎓"}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">
              {item.kind}
            </span>

            {item.category && (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                {item.category}
              </span>
            )}
          </div>

          <h3 className="mt-3 text-lg font-extrabold text-slate-900">
            {item.title || `${item.kind} Information`}
          </h3>

          {item.organization && (
            <p className="mt-1 text-sm font-semibold text-slate-600">
              {item.organization}
            </p>
          )}

          {item.description && (
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
              {item.description}
            </p>
          )}

          <Link
            href={href}
            className="mt-4 inline-flex text-sm font-bold text-blue-600 hover:text-blue-700"
          >
            View information →
          </Link>
        </div>
      </div>
    </article>
  );
}
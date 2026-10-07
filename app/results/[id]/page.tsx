import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Result = {
  id: string;
  title?: string | null;
  organization?: string | null;
  category?: string | null;
  description?: string | null;
  result_date?: string | null;
  qualification?: string | null;
  result_url?: string | null;
  official_website?: string | null;
  notification_url?: string | null;
  expiry_date?: string | null;
  status?: string | null;
  is_published?: boolean | null;
};

export default async function ResultDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("results")
    .select("*")
    .eq("id", id)
    .eq("is_published", true)
    .single();

  if (error || !data) {
    notFound();
  }

  const result = data as Result;

  const title = result.title || "Examination Result";
  const organization = result.organization || "Examination Authority";

  return (
    <div className="min-h-screen bg-slate-50">
      

      <main>
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
            <Link
              href="/results"
              className="text-sm font-semibold text-blue-600 hover:text-blue-800"
            >
              ← Back to Results
            </Link>

            <div className="mt-7 grid gap-8 lg:grid-cols-[1fr_320px]">
              <div>
                <div className="flex flex-wrap gap-2">
                  {result.category && (
                    <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
                      {result.category}
                    </span>
                  )}

                  <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                    {result.status || "Published"}
                  </span>
                </div>

                <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
                  {title}
                </h1>

                <p className="mt-4 text-lg font-semibold text-slate-700">
                  {organization}
                </p>

                <p className="mt-3 max-w-3xl leading-7 text-slate-600">
                  Check result information, result date and official result
                  links for this examination.
                </p>
              </div>

              <div className="rounded-3xl border border-blue-100 bg-blue-50 p-6">
                <p className="text-sm font-bold uppercase tracking-wide text-blue-700">
                  Result Date
                </p>

                <p className="mt-3 text-2xl font-extrabold text-slate-950">
                  {formatDate(result.result_date)}
                </p>

                <p className="mt-2 text-sm text-slate-600">
                  Official result publication date
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-10 sm:py-14">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
              <div className="space-y-8">
                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                  <SectionHeading title="Result Overview" />

                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <Info label="Result" value={title} />
                    <Info label="Organization" value={organization} />
                    <Info label="Category" value={result.category} />
                    <Info
                      label="Result Date"
                      value={formatDate(result.result_date)}
                    />
                    <Info
                      label="Qualification"
                      value={result.qualification}
                    />
                    <Info
                      label="Status"
                      value={result.status || "Published"}
                    />
                  </div>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                  <SectionHeading title="About This Result" />

                  <p className="mt-6 whitespace-pre-line leading-8 text-slate-600">
                    {result.description ||
                      "Result information is available through the official source linked on this page."}
                  </p>
                </section>

                <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 sm:p-8">
                  <h2 className="font-bold text-slate-950">
                    Important Verification Notice
                  </h2>

                  <p className="mt-2 text-sm leading-7 text-slate-700">
                    Always verify result information through the official
                    examination authority before relying on it for admission,
                    recruitment or any other purpose.
                  </p>
                </section>
              </div>

              <aside className="space-y-6">
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-bold text-slate-950">
                    Official Links
                  </h2>

                  <div className="mt-5 space-y-3">
                    {result.result_url && (
                      <ExternalLink
                        href={result.result_url}
                        label="Check Result"
                        primary
                      />
                    )}

                    {result.notification_url && (
                      <ExternalLink
                        href={result.notification_url}
                        label="Official Notification"
                      />
                    )}

                    {result.official_website && (
                      <ExternalLink
                        href={result.official_website}
                        label="Official Website"
                      />
                    )}

                    {!result.result_url &&
                      !result.notification_url &&
                      !result.official_website && (
                        <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                          Official links are not available at the moment.
                        </p>
                      )}
                  </div>
                </div>

                <div className="rounded-3xl bg-blue-600 p-6">
                  <h2 className="text-xl font-bold text-white">
                    More Results
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-blue-100">
                    Explore other published results on CareerPortal.
                  </p>

                  <Link
                    href="/results"
                    className="mt-5 inline-flex w-full justify-center rounded-xl bg-white px-4 py-3 text-sm font-bold text-blue-700"
                  >
                    View All Results
                  </Link>
                </div>
              </aside>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function SectionHeading({ title }: { title: string }) {
  return (
    <div className="border-b border-slate-100 pb-4">
      <h2 className="text-xl font-bold text-slate-950 sm:text-2xl">
        {title}
      </h2>
    </div>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-slate-900">
        {value || "Not specified"}
      </p>
    </div>
  );
}

function ExternalLink({
  href,
  label,
  primary = false,
}: {
  href: string;
  label: string;
  primary?: boolean;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex w-full justify-center rounded-xl px-4 py-3 text-sm font-bold ${
        primary
          ? "bg-blue-600 text-white hover:bg-blue-700"
          : "border border-slate-200 text-slate-800 hover:bg-blue-50 hover:text-blue-700"
      }`}
    >
      {label} ↗
    </a>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "Not specified";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}
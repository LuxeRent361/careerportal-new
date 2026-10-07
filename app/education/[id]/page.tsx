import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Education = {
  id: string;
  title?: string | null;
  name?: string | null;
  category?: string | null;
  course?: string | null;
  qualification?: string | null;
  organization?: string | null;
  institution?: string | null;
  description?: string | null;
  content?: string | null;
  eligibility?: string | null;
  duration?: string | null;
  official_website?: string | null;
  source_url?: string | null;
  url?: string | null;
  expiry_date?: string | null;
  status?: string | null;
  is_published?: boolean | null;
};

export default async function EducationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("education")
    .select("*")
    .eq("id", id)
    .eq("is_published", true)
    .single();

  if (error || !data) {
    notFound();
  }

  const item = data as Education;

  const title = item.title || item.name || "Education Information";
  const institution =
    item.organization || item.institution || "Educational Institution";

  const description =
    item.description ||
    item.content ||
    "Detailed education information is available below.";

  const sourceUrl = item.source_url || item.url;

  return (
    <div className="min-h-screen bg-slate-50">
      

      <main>
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
            <Link
              href="/education"
              className="text-sm font-semibold text-blue-600 hover:text-blue-800"
            >
              ← Back to Education
            </Link>

            <div className="mt-7 grid gap-8 lg:grid-cols-[1fr_320px]">
              <div>
                <div className="flex flex-wrap gap-2">
                  {item.category && (
                    <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
                      {item.category}
                    </span>
                  )}

                  {item.status && (
                    <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                      {item.status}
                    </span>
                  )}
                </div>

                <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
                  {title}
                </h1>

                <p className="mt-4 text-lg font-semibold text-slate-700">
                  {institution}
                </p>

                <p className="mt-3 max-w-3xl leading-7 text-slate-600">
                  Explore course, qualification, eligibility and official
                  information related to this education opportunity.
                </p>
              </div>

              <div className="rounded-3xl border border-blue-100 bg-blue-50 p-6">
                <p className="text-sm font-bold uppercase tracking-wide text-blue-700">
                  Course
                </p>

                <p className="mt-3 text-2xl font-extrabold text-slate-950">
                  {item.course || "Not specified"}
                </p>

                <p className="mt-2 text-sm text-slate-600">
                  Course or programme information
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
                  <SectionHeading title="Course Overview" />

                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <Info label="Course" value={item.course} />
                    <Info label="Category" value={item.category} />
                    <Info label="Institution" value={institution} />
                    <Info
                      label="Qualification"
                      value={item.qualification}
                    />
                    <Info label="Duration" value={item.duration} />
                    <Info label="Status" value={item.status} />
                  </div>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                  <SectionHeading title="About This Programme" />

                  <p className="mt-6 whitespace-pre-line leading-8 text-slate-600">
                    {description}
                  </p>
                </section>

                {item.eligibility && (
                  <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                    <SectionHeading title="Eligibility" />

                    <p className="mt-6 whitespace-pre-line leading-8 text-slate-600">
                      {item.eligibility}
                    </p>
                  </section>
                )}

                <section className="rounded-3xl border border-blue-100 bg-blue-50 p-6 sm:p-8">
                  <h2 className="text-xl font-bold text-slate-950">
                    Important Information
                  </h2>

                  <p className="mt-3 text-sm leading-7 text-slate-700">
                    Course eligibility, admission dates, fees, duration and
                    other requirements can vary by institution and academic
                    session. Always verify the latest details from the
                    relevant official institution or authority.
                  </p>
                </section>
              </div>

              <aside className="space-y-6">
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-bold text-slate-950">
                    Official Information
                  </h2>

                  <div className="mt-5 space-y-3">
                    {sourceUrl && (
                      <ExternalLink
                        href={sourceUrl}
                        label="View Official Information"
                        primary
                      />
                    )}

                    {item.official_website && (
                      <ExternalLink
                        href={item.official_website}
                        label="Official Website"
                      />
                    )}

                    {!sourceUrl && !item.official_website && (
                      <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                        Official information link is not available at the
                        moment.
                      </p>
                    )}
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-bold text-slate-950">
                    Quick Details
                  </h2>

                  <div className="mt-5 space-y-4">
                    <SidebarInfo label="Course" value={item.course} />
                    <SidebarInfo label="Category" value={item.category} />
                    <SidebarInfo
                      label="Qualification"
                      value={item.qualification}
                    />
                    <SidebarInfo
                      label="Duration"
                      value={item.duration}
                    />
                  </div>
                </div>

                <div className="rounded-3xl bg-blue-600 p-6">
                  <h2 className="text-xl font-bold text-white">
                    More Education
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-blue-100">
                    Explore more education information available on
                    CareerPortal.
                  </p>

                  <Link
                    href="/education"
                    className="mt-5 inline-flex w-full justify-center rounded-xl bg-white px-4 py-3 text-sm font-bold text-blue-700"
                  >
                    View Education
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

function SidebarInfo({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold text-slate-900">
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
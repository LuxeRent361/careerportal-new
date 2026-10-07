import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

import {
  getCurrentAdmin,
  getCurrentUser,
} from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

type SettingRow = {
  id: string;
  setting_key: string;
  setting_value: string | null;
};

function getSetting(
  settings: SettingRow[],
  key: string,
  fallback = ""
) {
  return (
    settings.find((item) => item.setting_key === key)
      ?.setting_value ?? fallback
  );
}

async function saveHomepageSettings(formData: FormData) {
  "use server";

  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/admin/homepage");
  }

  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/profile");
  }

  const supabase = createAdminClient();

  const fields = [
    "homepage_title",
    "homepage_description",
    "homepage_hero_badge",
    "homepage_primary_button_text",
    "homepage_primary_button_url",
    "homepage_secondary_button_text",
    "homepage_secondary_button_url",
    "homepage_jobs_title",
    "homepage_jobs_description",
    "homepage_exams_title",
    "homepage_exams_description",
    "homepage_results_title",
    "homepage_results_description",
    "homepage_admit_cards_title",
    "homepage_admit_cards_description",
    "homepage_education_title",
    "homepage_education_description",
    "homepage_private_jobs_title",
    "homepage_private_jobs_description",
  ];

  for (const key of fields) {
    const value = String(formData.get(key) || "").trim();

    const { data: existing } = await supabase
      .from("site_settings")
      .select("id")
      .eq("setting_key", key)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("site_settings")
        .update({
          setting_value: value,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (error) {
        redirect(
          `/admin/homepage?error=${encodeURIComponent(
            error.message
          )}`
        );
      }
    } else {
      const { error } = await supabase
        .from("site_settings")
        .insert({
          setting_key: key,
          setting_value: value,
        });

      if (error) {
        redirect(
          `/admin/homepage?error=${encodeURIComponent(
            error.message
          )}`
        );
      }
    }
  }

  await supabase.from("activity_logs").insert({
    actor_user_id: user.id,
    actor_email: user.email,
    action: "update",
    entity_type: "homepage",
    entity_id: null,
    description: "Updated homepage settings",
    metadata: {
      settings_updated: fields,
    },
  });

  redirect("/admin/homepage?saved=1");
}

export default async function HomepageAdminPage({
  searchParams,
}: {
  searchParams: Promise<{
    saved?: string;
    error?: string;
  }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/admin/homepage");
  }

  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/profile");
  }

  const params = await searchParams;

  const supabase = createAdminClient();

  const [
    { data: settings, error: settingsError },
    { count: jobsCount },
    { count: examsCount },
    { count: resultsCount },
    { count: admitCardsCount },
    { count: educationCount },
    { count: privateJobsCount },
  ] = await Promise.all([
    supabase
      .from("site_settings")
      .select("id,setting_key,setting_value")
      .order("setting_key"),

    supabase
      .from("jobs")
      .select("*", { count: "exact", head: true })
      .eq("is_published", true),

    supabase
      .from("exams")
      .select("*", { count: "exact", head: true })
      .eq("is_published", true),

    supabase
      .from("results")
      .select("*", { count: "exact", head: true })
      .eq("is_published", true),

    supabase
      .from("admit_cards")
      .select("*", { count: "exact", head: true })
      .eq("is_published", true),

    supabase
      .from("education")
      .select("*", { count: "exact", head: true })
      .eq("is_published", true),

    supabase
      .from("private_jobs")
      .select("*", { count: "exact", head: true })
      .eq("is_published", true),
  ]);

  if (settingsError) {
    throw new Error(settingsError.message);
  }

  const rows = (settings ?? []) as SettingRow[];

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-600">
            Content Management
          </p>

          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
            Homepage
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Manage the main homepage headings, descriptions, buttons and
            section titles from one place.
          </p>
        </div>

        <Link
          href="/"
          target="_blank"
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-extrabold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          View Live Homepage ↗
        </Link>
      </div>

      {params.saved && (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
          Homepage settings saved successfully.
        </div>
      )}

      {params.error && (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {params.error}
        </div>
      )}

      <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <ContentStat
          label="Government Jobs"
          value={jobsCount ?? 0}
          icon="💼"
          href="/admin/jobs"
        />

        <ContentStat
          label="Exams"
          value={examsCount ?? 0}
          icon="📝"
          href="/admin/exams"
        />

        <ContentStat
          label="Results"
          value={resultsCount ?? 0}
          icon="🏆"
          href="/admin/results"
        />

        <ContentStat
          label="Admit Cards"
          value={admitCardsCount ?? 0}
          icon="🎫"
          href="/admin/admit-cards"
        />

        <ContentStat
          label="Education"
          value={educationCount ?? 0}
          icon="🎓"
          href="/admin/education"
        />

        <ContentStat
          label="Private Jobs"
          value={privateJobsCount ?? 0}
          icon="🏢"
          href="/admin/private-jobs"
        />
      </div>

      <form
        action={saveHomepageSettings}
        className="mt-8 space-y-6"
      >
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <SectionHeader
            eyebrow="Hero Section"
            title="Homepage Hero"
            description="These settings control the main heading and buttons visible at the top of the homepage."
          />

          <div className="mt-6 grid gap-5">
            <Field
              label="Hero Badge"
              name="homepage_hero_badge"
              defaultValue={getSetting(
                rows,
                "homepage_hero_badge",
                "CAREER & EDUCATION PORTAL"
              )}
              placeholder="CAREER & EDUCATION PORTAL"
            />

            <Field
              label="Homepage Title"
              name="homepage_title"
              defaultValue={getSetting(
                rows,
                "homepage_title",
                "Find Government Jobs, Exams & Career Opportunities"
              )}
              placeholder="Enter homepage title"
            />

            <TextArea
              label="Homepage Description"
              name="homepage_description"
              rows={4}
              defaultValue={getSetting(
                rows,
                "homepage_description",
                "Get the latest government jobs, private jobs, exams, results, admit cards and education information."
              )}
              placeholder="Enter homepage description"
            />
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <Field
              label="Primary Button Text"
              name="homepage_primary_button_text"
              defaultValue={getSetting(
                rows,
                "homepage_primary_button_text",
                "Latest Government Jobs"
              )}
              placeholder="Latest Government Jobs"
            />

            <Field
              label="Primary Button URL"
              name="homepage_primary_button_url"
              defaultValue={getSetting(
                rows,
                "homepage_primary_button_url",
                "/jobs"
              )}
              placeholder="/jobs"
            />

            <Field
              label="Secondary Button Text"
              name="homepage_secondary_button_text"
              defaultValue={getSetting(
                rows,
                "homepage_secondary_button_text",
                "Explore Exams"
              )}
              placeholder="Explore Exams"
            />

            <Field
              label="Secondary Button URL"
              name="homepage_secondary_button_url"
              defaultValue={getSetting(
                rows,
                "homepage_secondary_button_url",
                "/exam"
              )}
              placeholder="/exam"
            />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <SectionHeader
            eyebrow="Government Jobs"
            title="Jobs Section"
            description="Control the heading and supporting description of the government jobs section."
          />

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <Field
              label="Section Title"
              name="homepage_jobs_title"
              defaultValue={getSetting(
                rows,
                "homepage_jobs_title",
                "Latest Government Jobs"
              )}
              placeholder="Latest Government Jobs"
            />

            <TextArea
              label="Section Description"
              name="homepage_jobs_description"
              rows={3}
              defaultValue={getSetting(
                rows,
                "homepage_jobs_description",
                "Explore the latest government recruitment opportunities and important application details."
              )}
              placeholder="Section description"
            />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <SectionHeader
            eyebrow="Exams"
            title="Exams Section"
            description="Control the exam section content displayed on the homepage."
          />

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <Field
              label="Section Title"
              name="homepage_exams_title"
              defaultValue={getSetting(
                rows,
                "homepage_exams_title",
                "Latest Exams"
              )}
              placeholder="Latest Exams"
            />

            <TextArea
              label="Section Description"
              name="homepage_exams_description"
              rows={3}
              defaultValue={getSetting(
                rows,
                "homepage_exams_description",
                "Stay updated with important competitive examinations and their schedules."
              )}
              placeholder="Section description"
            />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <SectionHeader
            eyebrow="Results"
            title="Results Section"
            description="Control the result section heading and supporting text."
          />

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <Field
              label="Section Title"
              name="homepage_results_title"
              defaultValue={getSetting(
                rows,
                "homepage_results_title",
                "Latest Results"
              )}
              placeholder="Latest Results"
            />

            <TextArea
              label="Section Description"
              name="homepage_results_description"
              rows={3}
              defaultValue={getSetting(
                rows,
                "homepage_results_description",
                "Find recently published examination results and important result links."
              )}
              placeholder="Section description"
            />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <SectionHeader
            eyebrow="Admit Cards"
            title="Admit Card Section"
            description="Control the homepage admit card section."
          />

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <Field
              label="Section Title"
              name="homepage_admit_cards_title"
              defaultValue={getSetting(
                rows,
                "homepage_admit_cards_title",
                "Latest Admit Cards"
              )}
              placeholder="Latest Admit Cards"
            />

            <TextArea
              label="Section Description"
              name="homepage_admit_cards_description"
              rows={3}
              defaultValue={getSetting(
                rows,
                "homepage_admit_cards_description",
                "Get the latest admit card and hall ticket information for upcoming examinations."
              )}
              placeholder="Section description"
            />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <SectionHeader
            eyebrow="Education"
            title="Education Section"
            description="Control the education and career guidance section."
          />

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <Field
              label="Section Title"
              name="homepage_education_title"
              defaultValue={getSetting(
                rows,
                "homepage_education_title",
                "Education & Career Guidance"
              )}
              placeholder="Education & Career Guidance"
            />

            <TextArea
              label="Section Description"
              name="homepage_education_description"
              rows={3}
              defaultValue={getSetting(
                rows,
                "homepage_education_description",
                "Explore courses, eligibility, career options and useful education information."
              )}
              placeholder="Section description"
            />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <SectionHeader
            eyebrow="Private Jobs"
            title="Private Jobs Section"
            description="Control the private employment section shown on the homepage."
          />

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <Field
              label="Section Title"
              name="homepage_private_jobs_title"
              defaultValue={getSetting(
                rows,
                "homepage_private_jobs_title",
                "Latest Private Jobs"
              )}
              placeholder="Latest Private Jobs"
            />

            <TextArea
              label="Section Description"
              name="homepage_private_jobs_description"
              rows={3}
              defaultValue={getSetting(
                rows,
                "homepage_private_jobs_description",
                "Discover private-sector career opportunities from companies and organizations."
              )}
              placeholder="Section description"
            />
          </div>
        </section>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="rounded-xl bg-blue-50 px-4 py-3 text-xs font-semibold leading-5 text-blue-700">
            Changes are saved to the existing website settings table and
            recorded in Activity Logs.
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/admin"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-extrabold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </Link>

            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-7 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-blue-700"
            >
              Save Homepage Settings
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="border-b border-slate-100 pb-5">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-blue-600">
        {eyebrow}
      </p>

      <h2 className="mt-2 text-xl font-extrabold text-slate-900">
        {title}
      </h2>

      <p className="mt-1 text-sm leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-extrabold text-slate-700">
        {label}
      </span>

      <input
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white"
      />
    </label>
  );
}

function TextArea({
  label,
  name,
  rows,
  defaultValue,
  placeholder,
}: {
  label: string;
  name: string;
  rows: number;
  defaultValue: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-extrabold text-slate-700">
        {label}
      </span>

      <textarea
        name={name}
        rows={rows}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium leading-6 text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white"
      />
    </label>
  );
}

function ContentStat({
  label,
  value,
  icon,
  href,
}: {
  label: string;
  value: number;
  icon: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <span className="text-xl">{icon}</span>

        <span className="text-2xl font-extrabold text-slate-900">
          {value}
        </span>
      </div>

      <p className="mt-3 text-xs font-extrabold uppercase tracking-wide text-slate-500">
        {label}
      </p>
    </Link>
  );
}
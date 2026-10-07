import Link from "next/link";
import { redirect } from "next/navigation";

import {
  getCurrentAdmin,
  getCurrentUser,
} from "@/lib/auth/admin";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type CountCardProps = {
  title: string;
  count: number;
  href: string;
  description: string;
};

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/admin");
  }

  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/profile");
  }

  const supabase = await createClient();

  const [
    jobsResult,
    examsResult,
    resultsResult,
    admitCardsResult,
    educationResult,
    testimonialsResult,
    usersResult,
  ] = await Promise.all([
    supabase
      .from("jobs")
      .select("id", { count: "exact", head: true }),

    supabase
      .from("exams")
      .select("id", { count: "exact", head: true }),

    supabase
      .from("results")
      .select("id", { count: "exact", head: true }),

    supabase
      .from("admit_cards")
      .select("id", { count: "exact", head: true }),

    supabase
      .from("education")
      .select("id", { count: "exact", head: true }),

    supabase
      .from("testimonials")
      .select("id", { count: "exact", head: true }),

    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true }),
  ]);

  const jobsCount = jobsResult.count ?? 0;
  const examsCount = examsResult.count ?? 0;
  const resultsCount = resultsResult.count ?? 0;
  const admitCardsCount = admitCardsResult.count ?? 0;
  const educationCount = educationResult.count ?? 0;
  const testimonialsCount = testimonialsResult.count ?? 0;
  const usersCount = usersResult.count ?? 0;

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Admin Header */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                <span className="h-2 w-2 rounded-full bg-blue-600" />
                ADMIN CONTROL CENTER
              </div>

              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                Welcome back,{" "}
                {admin.full_name ||
                  admin.email.split("@")[0] ||
                  "Admin"}
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Manage your complete CareerPortal website from one place.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
              >
                View Website
              </Link>

              <Link
                href="/admin/settings"
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"
              >
                Website Settings
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Admin Identity */}
        <section className="mb-8 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-white p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-lg font-extrabold text-white shadow-sm">
                {admin.email.charAt(0).toUpperCase()}
              </div>

              <div>
                <p className="text-sm font-bold text-slate-900">
                  {admin.email}
                </p>

                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
                  {admin.role === "superadmin" ||
                  admin.role === "super_admin"
                    ? "Super Admin"
                    : "Admin"}
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-100">
              <p className="text-xs font-semibold text-slate-400">
                Account Status
              </p>
              <p className="mt-1 flex items-center gap-2 text-sm font-bold text-emerald-600">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Active & Authorized
              </p>
            </div>
          </div>
        </section>

        {/* Overview */}
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-extrabold text-slate-900">
              Website Overview
            </h2>
            <p className="text-sm text-slate-500">
              Current content available in your database.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <CountCard
              title="Government Jobs"
              count={jobsCount}
              href="/admin/jobs"
              description="Manage job listings"
            />

            <CountCard
              title="Exams"
              count={examsCount}
              href="/admin/exams"
              description="Manage exam notices"
            />

            <CountCard
              title="Results"
              count={resultsCount}
              href="/admin/results"
              description="Manage results"
            />

            <CountCard
              title="Admit Cards"
              count={admitCardsCount}
              href="/admin/admit-cards"
              description="Manage admit cards"
            />

            <CountCard
              title="Education"
              count={educationCount}
              href="/admin/education"
              description="Manage education content"
            />

            <CountCard
              title="Users"
              count={usersCount}
              href="/admin/users"
              description="Manage registered users"
            />

            <CountCard
              title="Testimonials"
              count={testimonialsCount}
              href="/admin/testimonials"
              description="Review user feedback"
            />

            <CountCard
              title="Import Queue"
              count={0}
              href="/admin/import-queue"
              description="Review source imports"
            />
          </div>
        </section>

        {/* Main Controls */}
        <section className="mt-10">
          <div className="mb-4">
            <h2 className="text-lg font-extrabold text-slate-900">
              Content Management
            </h2>

            <p className="text-sm text-slate-500">
              Add, edit, publish and manage website content.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <AdminAction
              title="Government Jobs"
              description="Create, edit, publish and remove government job notifications."
              href="/admin/jobs"
              icon="💼"
            />

            <AdminAction
              title="Private Jobs"
              description="Manage private and company job opportunities."
              href="/admin/private-jobs"
              icon="🏢"
            />

            <AdminAction
              title="Exams"
              description="Manage exam notifications, dates and official links."
              href="/admin/exams"
              icon="📝"
            />

            <AdminAction
              title="Results"
              description="Publish and manage examination results."
              href="/admin/results"
              icon="📊"
            />

            <AdminAction
              title="Admit Cards"
              description="Manage admit card releases and download links."
              href="/admin/admit-cards"
              icon="🎫"
            />

            <AdminAction
              title="Education"
              description="Manage courses, admissions and educational information."
              href="/admin/education"
              icon="🎓"
            />
          </div>
        </section>

        {/* Automation */}
        <section className="mt-10">
          <div className="mb-4">
            <h2 className="text-lg font-extrabold text-slate-900">
              Automation & Sources
            </h2>

            <p className="text-sm text-slate-500">
              Monitor official sources and review automatically discovered
              content.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <AdminAction
              title="Source Monitoring"
              description="Check official sources and monitor source health."
              href="/admin/sources"
              icon="🌐"
            />

            <AdminAction
              title="Import Queue"
              description="Review, approve, reject and publish discovered content."
              href="/admin/import-queue"
              icon="📥"
            />

            <AdminAction
              title="Monitoring History"
              description="See source runs, successes, failures and errors."
              href="/admin/sources/history"
              icon="📈"
            />
          </div>
        </section>

        {/* Administration */}
        <section className="mt-10">
          <div className="mb-4">
            <h2 className="text-lg font-extrabold text-slate-900">
              Administration
            </h2>

            <p className="text-sm text-slate-500">
              Control users, website behaviour, notifications and security.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <AdminAction
              title="Users"
              description="View registered users and manage account activity."
              href="/admin/users"
              icon="👥"
            />

            <AdminAction
              title="Admin Access"
              description="Manage authorized admin accounts and roles."
              href="/admin/admin-users"
              icon="🔐"
            />

            <AdminAction
              title="Activity Logs"
              description="Track important administrative actions and system events."
              href="/admin/logs"
              icon="📋"
            />

            <AdminAction
              title="Notifications"
              description="View new source alerts and important admin notifications."
              href="/admin/notifications"
              icon="🔔"
            />

            <AdminAction
              title="Website Settings"
              description="Control website configuration and maintenance mode."
              href="/admin/settings"
              icon="⚙️"
            />

            <AdminAction
              title="Homepage Control"
              description="Manage homepage sections, featured content and visibility."
              href="/admin/homepage"
              icon="🏠"
            />
          </div>
        </section>

        {/* Super Admin */}
        {(admin.role === "super_admin" ||
          admin.role === "superadmin") && (
          <section className="mt-10">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wider text-amber-700">
                    Super Admin
                  </p>

                  <h2 className="mt-1 text-lg font-extrabold text-slate-900">
                    Full website control is enabled
                  </h2>

                  <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
                    Your authorized account can manage website content,
                    administrators, source automation, settings and other
                    protected operations.
                  </p>
                </div>

                <Link
                  href="/admin/admin-users"
                  className="inline-flex shrink-0 items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
                >
                  Manage Admin Access
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Quick Links */}
        <section className="mt-10">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-lg font-extrabold text-slate-900">
                Quick Actions
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Frequently used admin operations.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/admin/jobs/new"
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700"
              >
                + Add Job
              </Link>

              <Link
                href="/admin/exams/new"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                + Add Exam
              </Link>

              <Link
                href="/admin/results/new"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                + Add Result
              </Link>

              <Link
                href="/admin/admit-cards/new"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                + Add Admit Card
              </Link>

              <Link
                href="/admin/education/new"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                + Add Education
              </Link>

              <Link
                href="/admin/sources"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Check Sources
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function CountCard({
  title,
  count,
  href,
  description,
}: CountCardProps) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-slate-700">
            {title}
          </p>

          <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
            {count}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {description}
          </p>
        </div>

        <span className="text-lg text-slate-300 transition group-hover:text-blue-500">
          →
        </span>
      </div>
    </Link>
  );
}

function AdminAction({
  title,
  description,
  href,
  icon,
}: {
  title: string;
  description: string;
  href: string;
  icon: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xl">
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-extrabold text-slate-900">
              {title}
            </h3>

            <span className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-blue-600">
              →
            </span>
          </div>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            {description}
          </p>
        </div>
      </div>
    </Link>
  );
}
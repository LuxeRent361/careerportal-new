import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "./LogoutButton";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const fullName =
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] ||
    "CareerPortal User";

  const firstLetter = fullName.charAt(0).toUpperCase();

  const memberSince = new Date(user.created_at).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <main className="bg-slate-50">
      {/* Profile Hero */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-blue-600 text-3xl font-extrabold text-white shadow-sm">
              {firstLetter}
            </div>

            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-blue-600">
                My Account
              </p>

              <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">
                {fullName}
              </h1>

              <p className="mt-1 text-sm text-slate-500">{user.email}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
            {/* Main */}
            <div className="space-y-6">
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <div className="flex flex-col gap-4 border-b border-slate-100 pb-6 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-extrabold tracking-widest text-blue-600">
                      ACCOUNT
                    </p>

                    <h2 className="mt-1 text-2xl font-extrabold text-slate-900">
                      Your Profile
                    </h2>
                  </div>

                  <span className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Active
                  </span>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <InfoCard label="Full Name" value={fullName} />

                  <InfoCard
                    label="Email Address"
                    value={user.email || "Not available"}
                  />

                  <InfoCard
                    label="Account Status"
                    value="Verified account"
                  />

                  <InfoCard label="Member Since" value={memberSince} />
                </div>
              </section>

              {/* Explore */}
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <div>
                  <p className="text-xs font-extrabold tracking-widest text-blue-600">
                    EXPLORE
                  </p>

                  <h2 className="mt-1 text-2xl font-extrabold text-slate-900">
                    CareerPortal Sections
                  </h2>
                </div>

                <div className="mt-6 divide-y divide-slate-100">
                  <ProfileLink
                    href="/jobs"
                    icon="💼"
                    title="Government Jobs"
                    description="Latest government recruitment"
                  />

                  <ProfileLink
                    href="/private-jobs"
                    icon="🏢"
                    title="Private Jobs"
                    description="Private and corporate opportunities"
                  />

                  <ProfileLink
                    href="/exam"
                    icon="📝"
                    title="Exams"
                    description="Upcoming exams and notifications"
                  />

                  <ProfileLink
                    href="/results"
                    icon="🏆"
                    title="Results"
                    description="Latest exam results"
                  />

                  <ProfileLink
                    href="/admit-cards"
                    icon="🎫"
                    title="Admit Cards"
                    description="Latest admit card information"
                  />

                  <ProfileLink
                    href="/education"
                    icon="🎓"
                    title="Education"
                    description="Courses and educational updates"
                  />
                </div>
              </section>
            </div>

            {/* Sidebar */}
            <aside className="space-y-6">
              <section className="rounded-3xl bg-blue-600 p-6 text-white shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-xl">
                  🚀
                </div>

                <h3 className="mt-5 text-xl font-extrabold">
                  Build Your Career
                </h3>

                <p className="mt-2 text-sm leading-6 text-blue-100">
                  Stay connected with the latest jobs, exams, results and
                  education opportunities.
                </p>

                <Link
                  href="/jobs"
                  className="mt-5 inline-flex rounded-xl bg-white px-4 py-2.5 text-sm font-extrabold text-blue-600 transition hover:bg-blue-50"
                >
                  Explore Opportunities
                </Link>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-xl">
                  🔐
                </div>

                <h3 className="mt-5 text-xl font-extrabold text-slate-900">
                  Account Security
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Keep your account secure by protecting your email and using
                  a strong password.
                </p>

                <Link
                  href="/forgot-password"
                  className="mt-5 inline-flex text-sm font-extrabold text-blue-600 hover:text-blue-700"
                >
                  Reset Password →
                </Link>
              </section>

              <LogoutButton />
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-bold text-slate-800">
        {value}
      </p>
    </div>
  );
}

function ProfileLink({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 py-4 transition hover:bg-slate-50"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-lg">
        {icon}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-sm font-extrabold text-slate-900">
          {title}
        </span>

        <span className="mt-0.5 block text-xs text-slate-500">
          {description}
        </span>
      </span>

      <span className="text-lg font-bold text-slate-300">→</span>
    </Link>
  );
}
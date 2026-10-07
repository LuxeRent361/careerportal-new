import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

import {
  getCurrentAdmin,
  getCurrentUser,
} from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase environment variables are missing.");
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export default async function AdminUsersPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/admin/admin-users");
  }

  const currentAdmin = await getCurrentAdmin();

  if (!currentAdmin) {
    redirect("/profile");
  }

  const supabase = createAdminClient();

  const { data: admins, error } = await supabase
    .from("admin_users")
    .select(
      "id,email,full_name,role,is_active,created_at,updated_at"
    )
    .order("created_at", {
      ascending: false,
    });

  const items = admins ?? [];

  const total = items.length;

  const active = items.filter(
    (item) => item.is_active === true
  ).length;

  const inactive = items.filter(
    (item) => item.is_active === false
  ).length;

  const superAdmins = items.filter(
    (item) =>
      item.role === "super_admin" ||
      item.role === "superadmin"
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-blue-600">
            System
          </p>

          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Admin Access
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Manage administrators who can access the CareerPortal
            control center.
          </p>
        </div>

        <Link
          href="/admin/admin-users/new"
          className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-sm transition hover:bg-blue-700"
        >
          + Add Administrator
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Admins"
          value={total}
          icon="🛡️"
        />

        <StatCard
          label="Active"
          value={active}
          icon="✅"
        />

        <StatCard
          label="Inactive"
          value={inactive}
          icon="⛔"
        />

        <StatCard
          label="Super Admins"
          value={superAdmins}
          icon="👑"
        />
      </div>

      {/* Error */}
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          Unable to load administrators: {error.message}
        </div>
      ) : null}

      {/* Table */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Administrators
              </h2>

              <p className="mt-1 text-xs font-medium text-slate-500">
                Users with administrative access to CareerPortal.
              </p>
            </div>

            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-700">
              {total} admins
            </span>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
              🛡️
            </div>

            <h3 className="mt-4 text-base font-extrabold text-slate-900">
              No administrators found
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Add your first administrator to manage the
              CareerPortal control center.
            </p>

            <Link
              href="/admin/admin-users/new"
              className="mt-5 inline-flex rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-blue-700"
            >
              + Add Administrator
            </Link>
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[850px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left">
                    <th className="px-5 py-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      Administrator
                    </th>

                    <th className="px-5 py-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      Role
                    </th>

                    <th className="px-5 py-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      Status
                    </th>

                    <th className="px-5 py-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      Created
                    </th>

                    <th className="px-5 py-3 text-right text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {items.map((admin) => (
                    <tr
                      key={admin.id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-extrabold text-blue-700">
                            {getInitial(
                              admin.full_name,
                              admin.email
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-extrabold text-slate-800">
                              {admin.full_name ||
                                "Administrator"}
                            </p>

                            <p className="mt-0.5 truncate text-xs font-medium text-slate-500">
                              {admin.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <RoleBadge role={admin.role} />
                      </td>

                      <td className="px-5 py-4">
                        {admin.is_active ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-extrabold text-emerald-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-extrabold text-red-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                            Inactive
                          </span>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-xs font-semibold text-slate-500">
                        {formatDate(admin.created_at)}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/admin/admin-users/${admin.id}`}
                          className="inline-flex rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-600 transition hover:bg-slate-50 hover:text-blue-700"
                        >
                          Manage
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="divide-y divide-slate-100 md:hidden">
              {items.map((admin) => (
                <div
                  key={admin.id}
                  className="p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-extrabold text-blue-700">
                        {getInitial(
                          admin.full_name,
                          admin.email
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-extrabold text-slate-800">
                          {admin.full_name ||
                            "Administrator"}
                        </p>

                        <p className="truncate text-xs text-slate-500">
                          {admin.email}
                        </p>
                      </div>
                    </div>

                    <RoleBadge role={admin.role} />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4">
                    <div>
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                        Status
                      </p>

                      <p className="mt-1 text-xs font-bold text-slate-700">
                        {admin.is_active
                          ? "Active"
                          : "Inactive"}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                        Created
                      </p>

                      <p className="mt-1 text-xs font-bold text-slate-700">
                        {formatDate(admin.created_at)}
                      </p>
                    </div>
                  </div>

                  <Link
                    href={`/admin/admin-users/${admin.id}`}
                    className="mt-4 inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-extrabold text-slate-600 hover:bg-slate-50"
                  >
                    Manage Administrator
                  </Link>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Security note */}
      <section className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-lg shadow-sm">
            🔐
          </div>

          <div>
            <h3 className="text-sm font-extrabold text-blue-900">
              Administrator security
            </h3>

            <p className="mt-1 text-xs leading-6 text-blue-800/80">
              Only users whose email exists in the admin_users
              table with an active administrator role can access
              the admin control center.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
          {label}
        </p>

        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-lg">
          {icon}
        </span>
      </div>

      <p className="mt-4 text-2xl font-extrabold text-slate-900">
        {value}
      </p>
    </div>
  );
}

function RoleBadge({
  role,
}: {
  role: string;
}) {
  const isSuper =
    role === "super_admin" ||
    role === "superadmin";

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-extrabold ${
        isSuper
          ? "bg-purple-50 text-purple-700"
          : "bg-blue-50 text-blue-700"
      }`}
    >
      {isSuper ? "Super Admin" : "Administrator"}
    </span>
  );
}

function getInitial(
  name: string | null,
  email: string
) {
  const value =
    name?.trim() ||
    email.trim() ||
    "A";

  return value.charAt(0).toUpperCase();
}

function formatDate(value: string | null) {
  if (!value) {
    return "Date unavailable";
  }

  try {
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
    }).format(new Date(value));
  } catch {
    return value;
  }
}
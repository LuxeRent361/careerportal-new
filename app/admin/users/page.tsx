import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

import {
  getCurrentAdmin,
  getCurrentUser,
} from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type AuthUser = {
  id: string;
  email?: string | null;
  created_at?: string;
  last_sign_in_at?: string | null;
  email_confirmed_at?: string | null;
  banned_until?: string | null;
};

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

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getInitials(name: string | null, email: string | null) {
  const source = (name || email || "U").trim();

  if (!source) return "U";

  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return (
      parts[0].charAt(0) + parts[1].charAt(0)
    ).toUpperCase();
  }

  return source.charAt(0).toUpperCase();
}

function isConfirmed(user: AuthUser) {
  return Boolean(user.email_confirmed_at);
}

function isBanned(user: AuthUser) {
  if (!user.banned_until) return false;

  const bannedUntil = new Date(user.banned_until);

  return (
    !Number.isNaN(bannedUntil.getTime()) &&
    bannedUntil.getTime() > Date.now()
  );
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
  }>;
}) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login?next=/admin/users");
  }

  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/profile");
  }

  const params = await searchParams;

  const supabase = createAdminClient();

  const [
    profilesResult,
    authUsersResult,
    adminUsersResult,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id,full_name,phone,avatar_url,created_at,updated_at"
      )
      .order("created_at", { ascending: false }),

    supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    }),

    supabase
      .from("admin_users")
      .select("id,email,full_name,role,is_active"),
  ]);

  if (profilesResult.error) {
    throw new Error(profilesResult.error.message);
  }

  if (authUsersResult.error) {
    throw new Error(authUsersResult.error.message);
  }

  if (adminUsersResult.error) {
    throw new Error(adminUsersResult.error.message);
  }

  const profiles = (profilesResult.data || []) as Profile[];

  const authUsers = (authUsersResult.data?.users ||
    []) as AuthUser[];

  const adminUsers = adminUsersResult.data || [];

  const profileMap = new Map(
    profiles.map((profile) => [
      profile.id,
      profile,
    ])
  );

  const adminEmailSet = new Set(
    adminUsers
      .filter((item) => item.is_active)
      .map((item) =>
        String(item.email || "")
          .trim()
          .toLowerCase()
      )
  );

  const query = String(params.q || "")
    .trim()
    .toLowerCase();

  const statusFilter = String(
    params.status || ""
  ).trim();

  let users = authUsers.map((user) => {
    const profile = profileMap.get(user.id);

    const email = String(user.email || "").trim();

    return {
      ...user,
      profile,
      email,
      isAdmin: adminEmailSet.has(
        email.toLowerCase()
      ),
      confirmed: isConfirmed(user),
      banned: isBanned(user),
    };
  });

  if (query) {
    users = users.filter((user) => {
      const searchable = [
        user.email,
        user.profile?.full_name,
        user.profile?.phone,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    });
  }

  if (statusFilter === "confirmed") {
    users = users.filter((user) => user.confirmed);
  }

  if (statusFilter === "unconfirmed") {
    users = users.filter((user) => !user.confirmed);
  }

  if (statusFilter === "admin") {
    users = users.filter((user) => user.isAdmin);
  }

  if (statusFilter === "banned") {
    users = users.filter((user) => user.banned);
  }

  const totalUsers = authUsers.length;

  const confirmedUsers = authUsers.filter(
    (user) => isConfirmed(user)
  ).length;

  const unconfirmedUsers =
    totalUsers - confirmedUsers;

  const bannedUsers = authUsers.filter(
    (user) => isBanned(user)
  ).length;

  const activeAdmins = authUsers.filter((user) =>
    adminEmailSet.has(
      String(user.email || "")
        .trim()
        .toLowerCase()
    )
  ).length;

  return (
    <div className="mx-auto max-w-7xl">
      {/* Header */}
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-600">
            System
          </p>

          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
            Users
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            View and monitor registered CareerPortal users,
            account verification and administrator access.
          </p>
        </div>

        <Link
          href="/admin/admin-users"
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-extrabold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          Manage Admin Access
        </Link>
      </div>

      {/* Stats */}
      <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Users"
          value={totalUsers}
          icon="👥"
        />

        <StatCard
          label="Confirmed"
          value={confirmedUsers}
          icon="✓"
        />

        <StatCard
          label="Unconfirmed"
          value={unconfirmedUsers}
          icon="✉"
        />

        <StatCard
          label="Admin Accounts"
          value={activeAdmins}
          icon="🛡️"
        />
      </div>

      {bannedUsers > 0 && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-100 text-sm">
              ⚠
            </span>

            <div>
              <p className="text-sm font-extrabold text-red-800">
                {bannedUsers} banned user
                {bannedUsers === 1 ? "" : "s"}
              </p>

              <p className="mt-0.5 text-xs font-medium text-red-700/80">
                Review banned accounts from Supabase authentication
                controls if necessary.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <form
          method="GET"
          className="grid gap-3 lg:grid-cols-[1fr_190px_auto]"
        >
          <input
            type="text"
            name="q"
            defaultValue={params.q || ""}
            placeholder="Search email, name or phone..."
            className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white"
          />

          <select
            name="status"
            defaultValue={params.status || ""}
            className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:bg-white"
          >
            <option value="">All Users</option>
            <option value="confirmed">
              Confirmed
            </option>
            <option value="unconfirmed">
              Unconfirmed
            </option>
            <option value="admin">
              Admin Accounts
            </option>
            <option value="banned">
              Banned
            </option>
          </select>

          <div className="flex gap-2">
            <button
              type="submit"
              className="inline-flex h-11 flex-1 items-center justify-center rounded-xl bg-blue-600 px-6 text-sm font-extrabold text-white hover:bg-blue-700"
            >
              Search
            </button>

            <Link
              href="/admin/users"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-extrabold text-slate-600 hover:bg-slate-50"
            >
              Reset
            </Link>
          </div>
        </form>
      </section>

      {/* Users */}
      <section className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-extrabold text-slate-900">
            Registered Users
          </h2>

          <p className="mt-1 text-xs font-medium text-slate-500">
            Showing {users.length} of {totalUsers} registered users
          </p>
        </div>

        {users.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
              👥
            </div>

            <h3 className="mt-4 text-base font-extrabold text-slate-900">
              No users found
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Try changing your search or filter.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[1050px]">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200 text-left">
                    <th className="px-5 py-3 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                      User
                    </th>

                    <th className="px-5 py-3 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                      Contact
                    </th>

                    <th className="px-5 py-3 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                      Account
                    </th>

                    <th className="px-5 py-3 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                      Last Sign In
                    </th>

                    <th className="px-5 py-3 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                      Joined
                    </th>

                    <th className="px-5 py-3 text-right text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                      ID
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {users.map((user) => {
                    const name =
                      user.profile?.full_name ||
                      "Unnamed User";

                    const initials = getInitials(
                      user.profile?.full_name || null,
                      user.email || null
                    );

                    return (
                      <tr
                        key={user.id}
                        className="hover:bg-slate-50/70"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            {user.profile?.avatar_url ? (
                              <img
                                src={
                                  user.profile.avatar_url
                                }
                                alt={name}
                                className="h-10 w-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-extrabold text-blue-700">
                                {initials}
                              </div>
                            )}

                            <div className="min-w-0">
                              <p className="truncate text-sm font-extrabold text-slate-900">
                                {name}
                              </p>

                              <p className="mt-0.5 max-w-[250px] truncate text-xs font-medium text-slate-500">
                                {user.email ||
                                  "No email"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div>
                            <p className="text-sm font-semibold text-slate-700">
                              {user.profile?.phone ||
                                "No phone"}
                            </p>

                            <p className="mt-1 text-[10px] font-medium text-slate-400">
                              {user.profile
                                ? "Profile available"
                                : "No profile record"}
                            </p>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-1.5">
                            {user.confirmed ? (
                              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-extrabold text-emerald-700">
                                Confirmed
                              </span>
                            ) : (
                              <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-extrabold text-amber-700">
                                Unconfirmed
                              </span>
                            )}

                            {user.isAdmin && (
                              <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-extrabold text-blue-700">
                                Admin
                              </span>
                            )}

                            {user.banned && (
                              <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[10px] font-extrabold text-red-700">
                                Banned
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-4 text-xs font-semibold text-slate-500">
                          {formatDate(
                            user.last_sign_in_at
                          )}
                        </td>

                        <td className="px-5 py-4 text-xs font-semibold text-slate-500">
                          {formatDate(
                            user.created_at
                          )}
                        </td>

                        <td className="px-5 py-4 text-right">
                          <span
                            title={user.id}
                            className="inline-block max-w-[120px] truncate rounded-lg bg-slate-100 px-2 py-1 font-mono text-[9px] text-slate-500"
                          >
                            {user.id}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="divide-y divide-slate-100 lg:hidden">
              {users.map((user) => {
                const name =
                  user.profile?.full_name ||
                  "Unnamed User";

                const initials = getInitials(
                  user.profile?.full_name || null,
                  user.email || null
                );

                return (
                  <article
                    key={user.id}
                    className="p-4 sm:p-5"
                  >
                    <div className="flex items-start gap-3">
                      {user.profile?.avatar_url ? (
                        <img
                          src={
                            user.profile.avatar_url
                          }
                          alt={name}
                          className="h-11 w-11 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-extrabold text-blue-700">
                          {initials}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="truncate text-sm font-extrabold text-slate-900">
                              {name}
                            </h3>

                            <p className="mt-1 truncate text-xs font-medium text-slate-500">
                              {user.email ||
                                "No email"}
                            </p>
                          </div>

                          {user.isAdmin && (
                            <span className="shrink-0 rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-[9px] font-extrabold text-blue-700">
                              ADMIN
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
                          Phone
                        </p>

                        <p className="mt-1 truncate text-xs font-bold text-slate-700">
                          {user.profile?.phone ||
                            "Not added"}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
                          Status
                        </p>

                        <div className="mt-1">
                          {user.banned ? (
                            <span className="text-xs font-extrabold text-red-600">
                              Banned
                            </span>
                          ) : user.confirmed ? (
                            <span className="text-xs font-extrabold text-emerald-600">
                              Confirmed
                            </span>
                          ) : (
                            <span className="text-xs font-extrabold text-amber-600">
                              Unconfirmed
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 rounded-xl border border-slate-100 bg-white p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
                            Last Sign In
                          </p>

                          <p className="mt-1 text-xs font-semibold text-slate-600">
                            {formatDate(
                              user.last_sign_in_at
                            )}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
                            Joined
                          </p>

                          <p className="mt-1 text-xs font-semibold text-slate-600">
                            {formatDate(
                              user.created_at
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </section>

      {/* Information */}
      <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-5">
        <div className="flex gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-sm">
            ℹ
          </span>

          <div>
            <h3 className="text-sm font-extrabold text-blue-900">
              User management
            </h3>

            <p className="mt-1 text-xs leading-5 text-blue-800/80">
              This page is a secure overview of registered
              authentication users. Administrator permissions are
              managed separately from{" "}
              <Link
                href="/admin/admin-users"
                className="font-extrabold underline"
              >
                Admin Access
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
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
      <div className="flex items-center justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-lg">
          {icon}
        </span>

        <span className="text-2xl font-extrabold text-slate-900">
          {value}
        </span>
      </div>

      <p className="mt-4 text-xs font-extrabold uppercase tracking-wide text-slate-500">
        {label}
      </p>
    </div>
  );
}
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
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

export default async function AdminUserEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/admin/admin-users");
  }

  const currentAdmin = await getCurrentAdmin();

  if (!currentAdmin) {
    redirect("/profile");
  }

  const { id } = await params;
  const query = await searchParams;

  const supabase = createAdminClient();

  const { data: adminUser, error } = await supabase
    .from("admin_users")
    .select(
      "id,email,full_name,role,is_active,created_at,updated_at"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error(
      "Load administrator error:",
      error
    );
  }

  if (!adminUser) {
    notFound();
  }

  const isSuperAdmin =
    currentAdmin.role === "super_admin" ||
    currentAdmin.role === "superadmin";

  const isEditingSelf =
    currentAdmin.id === adminUser.id;

  async function updateAdmin(formData: FormData) {
    "use server";

    const loggedInUser = await getCurrentUser();

    if (!loggedInUser) {
      redirect(
        `/login?next=/admin/admin-users/${id}`
      );
    }

    const loggedInAdmin = await getCurrentAdmin();

    if (!loggedInAdmin) {
      redirect("/profile");
    }

    const canManage =
      loggedInAdmin.role === "super_admin" ||
      loggedInAdmin.role === "superadmin";

    if (!canManage) {
      redirect(
        `/admin/admin-users/${id}?error=permission`
      );
    }

    const email = String(
      formData.get("email") || ""
    )
      .trim()
      .toLowerCase();

    const fullName = String(
      formData.get("full_name") || ""
    ).trim();

    const role = String(
      formData.get("role") || "admin"
    ).trim();

    const isActive =
      String(formData.get("is_active")) === "true";

    if (!email) {
      redirect(
        `/admin/admin-users/${id}?error=email-required`
      );
    }

    if (!isValidEmail(email)) {
      redirect(
        `/admin/admin-users/${id}?error=invalid-email`
      );
    }

    if (
      role !== "admin" &&
      role !== "super_admin" &&
      role !== "superadmin"
    ) {
      redirect(
        `/admin/admin-users/${id}?error=invalid-role`
      );
    }

    const adminClient = createAdminClient();

    const { data: duplicate } = await adminClient
      .from("admin_users")
      .select("id")
      .ilike("email", email)
      .neq("id", id)
      .maybeSingle();

    if (duplicate) {
      redirect(
        `/admin/admin-users/${id}?error=email-exists`
      );
    }

    /*
     * Prevent the currently logged-in administrator from
     * accidentally disabling their own account.
     */
    if (
      loggedInAdmin.id === id &&
      !isActive
    ) {
      redirect(
        `/admin/admin-users/${id}?error=self-disable`
      );
    }

    const { data, error } = await adminClient
      .from("admin_users")
      .update({
        email,
        full_name: fullName || null,
        role,
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(
        "id,email,full_name,role,is_active"
      )
      .single();

    if (error) {
      console.error(
        "Update administrator error:",
        error
      );

      redirect(
        `/admin/admin-users/${id}?error=${encodeURIComponent(
          error.message
        )}`
      );
    }

    await adminClient.from("activity_logs").insert({
      actor_user_id: loggedInUser.id,
      actor_email: loggedInUser.email,
      action: "admin_updated",
      entity_type: "admin_user",
      entity_id: data.id,
      description:
        `Administrator ${data.email} was updated.`,
      metadata: {
        email: data.email,
        role: data.role,
        is_active: data.is_active,
      },
    });

    redirect(
      `/admin/admin-users/${id}?success=updated`
    );
  }

  async function deleteAdmin() {
    "use server";

    const loggedInUser = await getCurrentUser();

    if (!loggedInUser) {
      redirect("/login?next=/admin/admin-users");
    }

    const loggedInAdmin = await getCurrentAdmin();

    if (!loggedInAdmin) {
      redirect("/profile");
    }

    const canManage =
      loggedInAdmin.role === "super_admin" ||
      loggedInAdmin.role === "superadmin";

    if (!canManage) {
      redirect(
        `/admin/admin-users/${id}?error=permission`
      );
    }

    if (loggedInAdmin.id === id) {
      redirect(
        `/admin/admin-users/${id}?error=self-delete`
      );
    }

    const adminClient = createAdminClient();

    const { data: targetAdmin } = await adminClient
      .from("admin_users")
      .select("id,email,full_name,role")
      .eq("id", id)
      .maybeSingle();

    if (!targetAdmin) {
      redirect("/admin/admin-users");
    }

    const { error } = await adminClient
      .from("admin_users")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(
        "Delete administrator error:",
        error
      );

      redirect(
        `/admin/admin-users/${id}?error=${encodeURIComponent(
          error.message
        )}`
      );
    }

    await adminClient.from("activity_logs").insert({
      actor_user_id: loggedInUser.id,
      actor_email: loggedInUser.email,
      action: "admin_deleted",
      entity_type: "admin_user",
      entity_id: id,
      description:
        `Administrator ${
          targetAdmin.email
        } was removed from CareerPortal.`,
      metadata: {
        email: targetAdmin.email,
        role: targetAdmin.role,
      },
    });

    redirect(
      "/admin/admin-users?success=deleted"
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-blue-600">
            Admin Access
          </p>

          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Manage Administrator
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Update administrator access, role and account status.
          </p>
        </div>

        <Link
          href="/admin/admin-users"
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-600 hover:bg-slate-50"
        >
          ← Back
        </Link>
      </div>

      {/* Messages */}
      {query.success === "updated" ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
          Administrator updated successfully.
        </div>
      ) : null}

      {query.error ? (
        <ErrorMessage error={query.error} />
      ) : null}

      {!isSuperAdmin ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm font-extrabold text-amber-800">
            Super Admin access required
          </p>

          <p className="mt-1 text-xs leading-6 text-amber-700">
            Only Super Admins can modify administrator accounts.
          </p>
        </div>
      ) : null}

      {/* Profile summary */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-xl font-extrabold text-blue-700">
            {getInitial(
              adminUser.full_name,
              adminUser.email
            )}
          </div>

          <div className="min-w-0">
            <h2 className="truncate text-lg font-extrabold text-slate-900">
              {adminUser.full_name ||
                "Administrator"}
            </h2>

            <p className="mt-1 truncate text-sm text-slate-500">
              {adminUser.email}
            </p>

            <div className="mt-2 flex flex-wrap gap-2">
              <RoleBadge role={adminUser.role} />

              {adminUser.is_active ? (
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
            </div>
          </div>
        </div>
      </section>

      {/* Edit form */}
      <form
        action={updateAdmin}
        className="space-y-6"
      >
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-base font-extrabold text-slate-900">
              Administrator Details
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Update the administrator's access information.
            </p>
          </div>

          <div className="grid gap-5 p-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label
                htmlFor="email"
                className="mb-2 block text-xs font-extrabold text-slate-700"
              >
                Email Address *
              </label>

              <input
                id="email"
                name="email"
                type="email"
                required
                defaultValue={adminUser.email}
                disabled={!isSuperAdmin}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50 disabled:cursor-not-allowed disabled:bg-slate-50"
              />
            </div>

            <div>
              <label
                htmlFor="full_name"
                className="mb-2 block text-xs font-extrabold text-slate-700"
              >
                Full Name
              </label>

              <input
                id="full_name"
                name="full_name"
                type="text"
                defaultValue={
                  adminUser.full_name || ""
                }
                disabled={!isSuperAdmin}
                placeholder="Administrator Name"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 disabled:cursor-not-allowed disabled:bg-slate-50"
              />
            </div>

            <div>
              <label
                htmlFor="role"
                className="mb-2 block text-xs font-extrabold text-slate-700"
              >
                Role *
              </label>

              <select
                id="role"
                name="role"
                defaultValue={adminUser.role}
                disabled={!isSuperAdmin}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 disabled:cursor-not-allowed disabled:bg-slate-50"
              >
                <option value="admin">
                  Administrator
                </option>

                <option value="super_admin">
                  Super Admin
                </option>

                <option value="superadmin">
                  Super Admin (Legacy)
                </option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="mb-2 block text-xs font-extrabold text-slate-700">
                Account Status
              </label>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="radio"
                    name="is_active"
                    value="true"
                    defaultChecked={
                      adminUser.is_active === true
                    }
                    disabled={!isSuperAdmin}
                    className="h-4 w-4 accent-blue-600"
                  />

                  <span>
                    <span className="block text-sm font-extrabold text-slate-800">
                      Active
                    </span>

                    <span className="block text-xs text-slate-500">
                      Administrator can access admin areas.
                    </span>
                  </span>
                </label>

                <label className="mt-4 flex cursor-pointer items-center gap-3">
                  <input
                    type="radio"
                    name="is_active"
                    value="false"
                    defaultChecked={
                      adminUser.is_active === false
                    }
                    disabled={!isSuperAdmin}
                    className="h-4 w-4 accent-blue-600"
                  />

                  <span>
                    <span className="block text-sm font-extrabold text-slate-800">
                      Inactive
                    </span>

                    <span className="block text-xs text-slate-500">
                      Administrator will lose admin access.
                    </span>
                  </span>
                </label>
              </div>
            </div>
          </div>
        </section>

        {/* Metadata */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-extrabold text-slate-900">
            Account Information
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <InfoBox
              label="Administrator ID"
              value={adminUser.id}
            />

            <InfoBox
              label="Created"
              value={formatDateTime(
                adminUser.created_at
              )}
            />

            <InfoBox
              label="Last Updated"
              value={formatDateTime(
                adminUser.updated_at
              )}
            />

            <InfoBox
              label="Current Session"
              value={
                isEditingSelf
                  ? "This is your account"
                  : "Another administrator"
              }
            />
          </div>
        </section>

        {/* Actions */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <div />

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/admin/admin-users"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-extrabold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={!isSuperAdmin}
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Save Changes
            </button>
          </div>
        </div>
      </form>

      {/* Delete */}
      {isSuperAdmin && !isEditingSelf ? (
        <section className="rounded-2xl border border-red-200 bg-white shadow-sm">
          <div className="border-b border-red-100 px-5 py-4">
            <h2 className="text-base font-extrabold text-red-700">
              Danger Zone
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Permanently remove this administrator from
              CareerPortal.
            </p>
          </div>

          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-extrabold text-slate-800">
                Delete administrator
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                This removes the admin_users record. It does not
                delete the user's Supabase Auth account.
              </p>
            </div>

            <form action={deleteAdmin}>
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-extrabold text-red-700 transition hover:bg-red-100 sm:w-auto"
              >
                Delete Administrator
              </button>
            </form>
          </div>
        </section>
      ) : null}

      {isEditingSelf ? (
        <section className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-lg shadow-sm">
              🔐
            </div>

            <div>
              <h3 className="text-sm font-extrabold text-blue-900">
                Your administrator account
              </h3>

              <p className="mt-1 text-xs leading-6 text-blue-800/80">
                You cannot delete or deactivate the administrator
                account that is currently being used for this
                session.
              </p>
            </div>
          </div>
        </section>
      ) : null}
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

function InfoBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-1 break-all text-xs font-bold text-slate-700">
        {value}
      </p>
    </div>
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

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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

function formatDateTime(value: string | null) {
  if (!value) {
    return "Date unavailable";
  }

  try {
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function ErrorMessage({
  error,
}: {
  error: string;
}) {
  const messages: Record<string, string> = {
    permission:
      "You do not have permission to manage administrator accounts.",
    "email-required":
      "Email address is required.",
    "invalid-email":
      "Please enter a valid email address.",
    "invalid-role":
      "Invalid administrator role.",
    "already-exists":
      "An administrator with this email already exists.",
    "email-exists":
      "Another administrator already uses this email address.",
    "self-disable":
      "You cannot deactivate your own administrator account.",
    "self-delete":
      "You cannot delete your own administrator account.",
  };

  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
      {messages[error] || error}
    </div>
  );
}
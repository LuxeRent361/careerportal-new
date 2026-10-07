import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

import {
  getCurrentAdmin,
  getCurrentUser,
} from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

type Testimonial = {
  id: string;
  name: string;
  role: string | null;
  message: string;
  rating: number | null;
  avatar_url: string | null;
  status: string;
  created_at: string | null;
  updated_at: string | null;
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

function formatDate(value: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
  }).format(date);
}

function normalizeStatus(status: string | null) {
  return String(status || "pending").toLowerCase();
}

function statusLabel(status: string | null) {
  const value = normalizeStatus(status);

  if (value === "approved") return "Approved";
  if (value === "rejected") return "Rejected";
  if (value === "pending") return "Pending";

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function statusClasses(status: string | null) {
  const value = normalizeStatus(status);

  if (value === "approved") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (value === "rejected") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
}

async function updateStatus(formData: FormData) {
  "use server";

  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/admin/testimonials");
  }

  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/profile");
  }

  const id = String(formData.get("id") || "").trim();
  const status = String(formData.get("status") || "").trim();

  if (!id) {
    redirect(
      "/admin/testimonials?error=Testimonial%20ID%20is%20missing"
    );
  }

  if (!["pending", "approved", "rejected"].includes(status)) {
    redirect(
      "/admin/testimonials?error=Invalid%20testimonial%20status"
    );
  }

  const supabase = createAdminClient();

  const { data: testimonial, error: fetchError } = await supabase
    .from("testimonials")
    .select("id,name,status")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !testimonial) {
    redirect(
      `/admin/testimonials?error=${encodeURIComponent(
        fetchError?.message || "Testimonial not found"
      )}`
    );
  }

  const { error } = await supabase
    .from("testimonials")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    redirect(
      `/admin/testimonials?error=${encodeURIComponent(
        error.message
      )}`
    );
  }

  await supabase.from("activity_logs").insert({
    actor_user_id: user.id,
    actor_email: user.email,
    action: "status_update",
    entity_type: "testimonial",
    entity_id: id,
    description: `Changed testimonial status for ${testimonial.name} to ${status}.`,
    metadata: {
      previous_status: testimonial.status,
      new_status: status,
    },
  });

  redirect("/admin/testimonials?saved=1");
}

async function deleteTestimonial(formData: FormData) {
  "use server";

  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/admin/testimonials");
  }

  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/profile");
  }

  const id = String(formData.get("id") || "").trim();

  if (!id) {
    redirect(
      "/admin/testimonials?error=Testimonial%20ID%20is%20missing"
    );
  }

  const supabase = createAdminClient();

  const { data: testimonial } = await supabase
    .from("testimonials")
    .select("id,name")
    .eq("id", id)
    .maybeSingle();

  if (!testimonial) {
    redirect(
      "/admin/testimonials?error=Testimonial%20not%20found"
    );
  }

  const { error } = await supabase
    .from("testimonials")
    .delete()
    .eq("id", id);

  if (error) {
    redirect(
      `/admin/testimonials?error=${encodeURIComponent(
        error.message
      )}`
    );
  }

  await supabase.from("activity_logs").insert({
    actor_user_id: user.id,
    actor_email: user.email,
    action: "delete",
    entity_type: "testimonial",
    entity_id: id,
    description: `Deleted testimonial from ${testimonial.name}.`,
  });

  redirect("/admin/testimonials?deleted=1");
}

export default async function TestimonialsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    rating?: string;
    saved?: string;
    deleted?: string;
    error?: string;
  }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/admin/testimonials");
  }

  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/profile");
  }

  const params = await searchParams;
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("testimonials")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const testimonials = (data || []) as Testimonial[];

  const query = String(params.q || "").trim().toLowerCase();
  const statusFilter = String(params.status || "").trim();
  const ratingFilter = String(params.rating || "").trim();

  let filtered = [...testimonials];

  if (query) {
    filtered = filtered.filter((testimonial) =>
      [
        testimonial.name,
        testimonial.role,
        testimonial.message,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }

  if (statusFilter) {
    filtered = filtered.filter(
      (testimonial) =>
        normalizeStatus(testimonial.status) === statusFilter
    );
  }

  if (ratingFilter) {
    const rating = Number(ratingFilter);

    if (!Number.isNaN(rating)) {
      filtered = filtered.filter(
        (testimonial) =>
          testimonial.rating === rating
      );
    }
  }

  const approved = testimonials.filter(
    (testimonial) =>
      normalizeStatus(testimonial.status) === "approved"
  ).length;

  const pending = testimonials.filter(
    (testimonial) =>
      normalizeStatus(testimonial.status) === "pending"
  ).length;

  const rejected = testimonials.filter(
    (testimonial) =>
      normalizeStatus(testimonial.status) === "rejected"
  ).length;

  const rated = testimonials.filter(
    (testimonial) =>
      typeof testimonial.rating === "number"
  );

  const averageRating =
    rated.length > 0
      ? (
          rated.reduce(
            (sum, testimonial) =>
              sum + Number(testimonial.rating || 0),
            0
          ) / rated.length
        ).toFixed(1)
      : "0.0";

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-600">
            Content Management
          </p>

          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
            Testimonials
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Manage user feedback, ratings and testimonials displayed
            across CareerPortal.
          </p>
        </div>

        <Link
          href="/admin/testimonials/new"
          className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-blue-700"
        >
          + Add Testimonial
        </Link>
      </div>

      {params.saved && (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
          Testimonial updated successfully.
        </div>
      )}

      {params.deleted && (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
          Testimonial deleted successfully.
        </div>
      )}

      {params.error && (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          {params.error}
        </div>
      )}

      <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Testimonials"
          value={testimonials.length}
          icon="💬"
        />

        <StatCard
          label="Approved"
          value={approved}
          icon="✓"
        />

        <StatCard
          label="Pending"
          value={pending}
          icon="⏳"
        />

        <StatCard
          label="Average Rating"
          value={averageRating}
          icon="★"
        />
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-extrabold uppercase tracking-wide text-slate-400">
            Rejected
          </p>

          <p className="mt-2 text-2xl font-extrabold text-red-600">
            {rejected}
          </p>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
          <p className="text-xs font-extrabold uppercase tracking-wide text-blue-500">
            Rated Testimonials
          </p>

          <p className="mt-2 text-2xl font-extrabold text-blue-700">
            {rated.length}
          </p>
        </div>
      </div>

      <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <form
          method="GET"
          className="grid gap-3 lg:grid-cols-[1fr_180px_160px_auto]"
        >
          <input
            name="q"
            defaultValue={params.q || ""}
            placeholder="Search name, role or testimonial..."
            className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
          />

          <select
            name="status"
            defaultValue={params.status || ""}
            className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:bg-white"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>

          <select
            name="rating"
            defaultValue={params.rating || ""}
            className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:bg-white"
          >
            <option value="">All Ratings</option>
            <option value="5">5 Stars</option>
            <option value="4">4 Stars</option>
            <option value="3">3 Stars</option>
            <option value="2">2 Stars</option>
            <option value="1">1 Star</option>
          </select>

          <div className="flex gap-2">
            <button
              type="submit"
              className="inline-flex h-11 flex-1 items-center justify-center rounded-xl bg-blue-600 px-5 text-sm font-extrabold text-white hover:bg-blue-700"
            >
              Filter
            </button>

            <Link
              href="/admin/testimonials"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-extrabold text-slate-600 hover:bg-slate-50"
            >
              Reset
            </Link>
          </div>
        </form>
      </section>

      <section className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-extrabold text-slate-900">
            Testimonial Listings
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Showing {filtered.length} of {testimonials.length} testimonials
          </p>
        </div>

        {filtered.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
              💬
            </div>

            <h3 className="mt-4 text-base font-extrabold text-slate-900">
              No testimonials found
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Add a testimonial or change your search filters.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[1100px]">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200 text-left">
                    <th className="px-5 py-3 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                      Person
                    </th>

                    <th className="px-5 py-3 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                      Testimonial
                    </th>

                    <th className="px-5 py-3 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                      Rating
                    </th>

                    <th className="px-5 py-3 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                      Status
                    </th>

                    <th className="px-5 py-3 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                      Created
                    </th>

                    <th className="px-5 py-3 text-right text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filtered.map((testimonial) => (
                    <tr
                      key={testimonial.id}
                      className="hover:bg-slate-50/70"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {testimonial.avatar_url ? (
                            <img
                              src={testimonial.avatar_url}
                              alt={testimonial.name}
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-extrabold text-blue-700">
                              {testimonial.name
                                .charAt(0)
                                .toUpperCase()}
                            </div>
                          )}

                          <div className="min-w-0">
                            <p className="truncate text-sm font-extrabold text-slate-900">
                              {testimonial.name}
                            </p>

                            <p className="mt-0.5 truncate text-xs font-semibold text-slate-400">
                              {testimonial.role || "Role not specified"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <p className="max-w-[350px] truncate text-sm font-medium leading-6 text-slate-600">
                          {testimonial.message}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <Rating
                          rating={testimonial.rating}
                        />
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-extrabold ${statusClasses(
                            testimonial.status
                          )}`}
                        >
                          {statusLabel(testimonial.status)}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-xs font-semibold text-slate-500">
                        {formatDate(testimonial.created_at)}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/admin/testimonials/${testimonial.id}`}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-700 hover:bg-slate-50"
                          >
                            Edit
                          </Link>

                          {normalizeStatus(
                            testimonial.status
                          ) !== "approved" && (
                            <form action={updateStatus}>
                              <input
                                type="hidden"
                                name="id"
                                value={testimonial.id}
                              />

                              <input
                                type="hidden"
                                name="status"
                                value="approved"
                              />

                              <button
                                type="submit"
                                className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-extrabold text-emerald-700"
                              >
                                Approve
                              </button>
                            </form>
                          )}

                          <form action={deleteTestimonial}>
                            <input
                              type="hidden"
                              name="id"
                              value={testimonial.id}
                            />

                            <button
                              type="submit"
                              className="rounded-lg bg-red-50 px-3 py-2 text-xs font-extrabold text-red-700"
                            >
                              Delete
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-slate-100 lg:hidden">
              {filtered.map((testimonial) => (
                <article
                  key={testimonial.id}
                  className="p-4 sm:p-5"
                >
                  <div className="flex items-start gap-3">
                    {testimonial.avatar_url ? (
                      <img
                        src={testimonial.avatar_url}
                        alt={testimonial.name}
                        className="h-11 w-11 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-extrabold text-blue-700">
                        {testimonial.name
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-extrabold text-slate-900">
                            {testimonial.name}
                          </h3>

                          <p className="mt-1 text-xs font-semibold text-slate-500">
                            {testimonial.role ||
                              "Role not specified"}
                          </p>
                        </div>

                        <span
                          className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${statusClasses(
                            testimonial.status
                          )}`}
                        >
                          {statusLabel(testimonial.status)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl bg-slate-50 p-4">
                    <p className="text-sm leading-6 text-slate-600">
                      “{testimonial.message}”
                    </p>

                    <div className="mt-3 flex items-center justify-between">
                      <Rating
                        rating={testimonial.rating}
                      />

                      <span className="text-[10px] font-semibold text-slate-400">
                        {formatDate(testimonial.created_at)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <Link
                      href={`/admin/testimonials/${testimonial.id}`}
                      className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-extrabold text-slate-700"
                    >
                      Edit
                    </Link>

                    <form action={updateStatus}>
                      <input
                        type="hidden"
                        name="id"
                        value={testimonial.id}
                      />

                      <input
                        type="hidden"
                        name="status"
                        value={
                          normalizeStatus(
                            testimonial.status
                          ) === "approved"
                            ? "pending"
                            : "approved"
                        }
                      />

                      <button
                        type="submit"
                        className="w-full rounded-xl bg-blue-50 px-3 py-2.5 text-xs font-extrabold text-blue-700"
                      >
                        {normalizeStatus(
                          testimonial.status
                        ) === "approved"
                          ? "Pending"
                          : "Approve"}
                      </button>
                    </form>

                    <form action={deleteTestimonial}>
                      <input
                        type="hidden"
                        name="id"
                        value={testimonial.id}
                      />

                      <button
                        type="submit"
                        className="w-full rounded-xl bg-red-50 px-3 py-2.5 text-xs font-extrabold text-red-700"
                      >
                        Delete
                      </button>
                    </form>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
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
  value: number | string;
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

function Rating({
  rating,
}: {
  rating: number | null;
}) {
  const value =
    typeof rating === "number"
      ? Math.max(0, Math.min(5, rating))
      : 0;

  return (
    <div className="flex items-center gap-1">
      <span className="text-sm tracking-wide text-amber-500">
        {"★".repeat(value)}
        <span className="text-slate-200">
          {"★".repeat(5 - value)}
        </span>
      </span>

      <span className="ml-1 text-xs font-extrabold text-slate-500">
        {rating ?? "—"}
      </span>
    </div>
  );
}
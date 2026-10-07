import Link from "next/link";
import { notFound, redirect } from "next/navigation";
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

async function updateTestimonial(formData: FormData) {
  "use server";

  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/profile");
  }

  const id = String(formData.get("id") || "").trim();

  const name = String(formData.get("name") || "").trim();

  const role =
    String(formData.get("role") || "").trim() || null;

  const message = String(
    formData.get("message") || ""
  ).trim();

  const avatarUrl =
    String(formData.get("avatar_url") || "").trim() ||
    null;

  const ratingValue = String(
    formData.get("rating") || ""
  ).trim();

  const status =
    String(formData.get("status") || "pending").trim() ||
    "pending";

  if (!id) {
    redirect(
      "/admin/testimonials?error=Testimonial%20ID%20is%20missing"
    );
  }

  if (!name) {
    redirect(
      `/admin/testimonials/${id}?error=Name%20is%20required`
    );
  }

  if (!message) {
    redirect(
      `/admin/testimonials/${id}?error=Testimonial%20message%20is%20required`
    );
  }

  if (!["pending", "approved", "rejected"].includes(status)) {
    redirect(
      `/admin/testimonials/${id}?error=Invalid%20status`
    );
  }

  let rating: number | null = null;

  if (ratingValue) {
    const parsedRating = Number(ratingValue);

    if (
      !Number.isInteger(parsedRating) ||
      parsedRating < 1 ||
      parsedRating > 5
    ) {
      redirect(
        `/admin/testimonials/${id}?error=Rating%20must%20be%20between%201%20and%205`
      );
    }

    rating = parsedRating;
  }

  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("testimonials")
    .select("id,name,status")
    .eq("id", id)
    .maybeSingle();

  if (!existing) {
    redirect(
      "/admin/testimonials?error=Testimonial%20not%20found"
    );
  }

  const { error } = await supabase
    .from("testimonials")
    .update({
      name,
      role,
      message,
      rating,
      avatar_url: avatarUrl,
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    redirect(
      `/admin/testimonials/${id}?error=${encodeURIComponent(
        error.message
      )}`
    );
  }

  await supabase.from("activity_logs").insert({
    actor_user_id: user.id,
    actor_email: user.email,
    action: "update",
    entity_type: "testimonial",
    entity_id: id,
    description: `Updated testimonial from ${name}.`,
    metadata: {
      previous_status: existing.status,
      new_status: status,
      rating,
    },
  });

  redirect(`/admin/testimonials/${id}?saved=1`);
}

async function deleteTestimonial(formData: FormData) {
  "use server";

  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
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
      `/admin/testimonials/${id}?error=${encodeURIComponent(
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

export default async function EditTestimonialPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    error?: string;
    saved?: string;
    created?: string;
  }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/profile");
  }

  const { id } = await params;
  const query = await searchParams;

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("testimonials")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    notFound();
  }

  const testimonial = data as Testimonial;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-600">
            Content Management
          </p>

          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
            Edit Testimonial
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Update feedback, rating, person details and approval status.
          </p>
        </div>

        <Link
          href="/admin/testimonials"
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          ← Back to Testimonials
        </Link>
      </div>

      {query.saved && (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
          Testimonial updated successfully.
        </div>
      )}

      {query.created && (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
          Testimonial created successfully.
        </div>
      )}

      {query.error && (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          {query.error}
        </div>
      )}

      <form
        action={updateTestimonial}
        className="mt-7 space-y-6"
      >
        <input
          type="hidden"
          name="id"
          value={testimonial.id}
        />

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <SectionHeader
            eyebrow="Personal Information"
            title="Person Details"
            description="Update the person information associated with this testimonial."
          />

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <Field
              label="Name"
              name="name"
              required
              defaultValue={testimonial.name}
            />

            <Field
              label="Role / Occupation"
              name="role"
              defaultValue={testimonial.role || ""}
            />

            <div className="md:col-span-2">
              <Field
                label="Avatar URL"
                name="avatar_url"
                type="url"
                defaultValue={
                  testimonial.avatar_url || ""
                }
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <SectionHeader
            eyebrow="Feedback"
            title="Testimonial Content"
            description="Edit the complete testimonial message."
          />

          <div className="mt-6">
            <TextArea
              label="Message"
              name="message"
              required
              rows={10}
              defaultValue={testimonial.message}
            />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <SectionHeader
            eyebrow="Review"
            title="Rating & Status"
            description="Manage the testimonial rating and moderation status."
          />

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <SelectField
              label="Rating"
              name="rating"
              defaultValue={
                testimonial.rating
                  ? String(testimonial.rating)
                  : ""
              }
              options={[
                ["", "No Rating"],
                ["5", "★★★★★ — 5 Stars"],
                ["4", "★★★★☆ — 4 Stars"],
                ["3", "★★★☆☆ — 3 Stars"],
                ["2", "★★☆☆☆ — 2 Stars"],
                ["1", "★☆☆☆☆ — 1 Star"],
              ]}
            />

            <SelectField
              label="Status"
              name="status"
              defaultValue={
                testimonial.status || "pending"
              }
              options={[
                ["pending", "Pending"],
                ["approved", "Approved"],
                ["rejected", "Rejected"],
              ]}
            />
          </div>

          <div className="mt-6 rounded-xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                  Current Rating
                </p>

                <p className="mt-2 text-lg tracking-widest text-amber-500">
                  {testimonial.rating
                    ? "★".repeat(testimonial.rating)
                    : "☆☆☆☆☆"}
                </p>
              </div>

              <div className="text-right">
                <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                  Current Status
                </p>

                <p className="mt-2 text-sm font-extrabold text-slate-700">
                  {testimonial.status || "Pending"}
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            formAction={deleteTestimonial}
            type="submit"
            className="inline-flex h-12 items-center justify-center rounded-xl bg-red-50 px-6 text-sm font-extrabold text-red-700 hover:bg-red-100"
          >
            Delete Testimonial
          </button>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/admin/testimonials"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-6 text-sm font-extrabold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </Link>

            <button
              type="submit"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-blue-600 px-7 text-sm font-extrabold text-white hover:bg-blue-700"
            >
              Save Changes
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
  defaultValue = "",
  placeholder,
  required = false,
  type = "text",
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-extrabold text-slate-700">
        {label}

        {required && (
          <span className="ml-1 text-red-500">*</span>
        )}
      </span>

      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
      />
    </label>
  );
}

function SelectField({
  label,
  name,
  options,
  defaultValue = "",
}: {
  label: string;
  name: string;
  options: [string, string][];
  defaultValue?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-extrabold text-slate-700">
        {label}
      </span>

      <select
        name={name}
        defaultValue={defaultValue}
        className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:bg-white"
      >
        {options.map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextArea({
  label,
  name,
  required = false,
  rows,
  defaultValue,
}: {
  label: string;
  name: string;
  required?: boolean;
  rows: number;
  defaultValue: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-extrabold text-slate-700">
        {label}

        {required && (
          <span className="ml-1 text-red-500">*</span>
        )}
      </span>

      <textarea
        name={name}
        required={required}
        rows={rows}
        defaultValue={defaultValue}
        className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium leading-6 text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
      />
    </label>
  );
}
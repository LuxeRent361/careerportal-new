"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
const router = useRouter();

const [password, setPassword] = useState("");
const [confirmPassword, setConfirmPassword] = useState("");

const [showPassword, setShowPassword] = useState(false);
const [showConfirmPassword, setShowConfirmPassword] = useState(false);

const [loading, setLoading] = useState(false);
const [error, setError] = useState("");
const [success, setSuccess] = useState("");

async function handleSubmit(
e: React.FormEvent<HTMLFormElement>
) {
e.preventDefault();

setError("");
setSuccess("");

if (password.length < 6) {
  setError("Password must be at least 6 characters.");
  return;
}

if (password !== confirmPassword) {
  setError("Passwords do not match.");
  return;
}

setLoading(true);

try {
  const supabase = createClient();

  const { error: updateError } =
    await supabase.auth.updateUser({
      password,
    });

  if (updateError) {
    setError(updateError.message);
    return;
  }

  setSuccess(
    "Password updated successfully. Redirecting to login..."
  );

  window.setTimeout(() => {
    router.replace("/login");
  }, 1800);
} catch {
  setError(
    "Unable to update your password. Please try again."
  );
} finally {
  setLoading(false);
}

}

return (
<main className="min-h-[calc(100vh-4rem)] bg-slate-50 px-4 py-10 sm:px-6 lg:py-14">
<div className="mx-auto grid max-w-6xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl lg:grid-cols-2">

    {/* Left Section */}
    <section className="relative hidden overflow-hidden bg-blue-600 p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
      <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10" />
      <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-white/10" />

      <div className="relative z-10">
        <Link
          href="/"
          className="inline-flex items-center gap-3"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-sm font-extrabold text-blue-600 shadow-sm">
            CP
          </span>

          <span className="text-xl font-extrabold tracking-tight">
            CareerPortal
          </span>
        </Link>

        <div className="mt-20">
          <span className="inline-flex rounded-full bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-blue-50">
            Account Security
          </span>

          <h1 className="mt-6 text-4xl font-extrabold leading-tight xl:text-5xl">
            Create a new
            <br />
            secure
            <br />
            password.
          </h1>

          <p className="mt-6 max-w-md text-sm leading-7 text-blue-100 xl:text-base">
            Choose a strong password that helps keep your
            CareerPortal account protected.
          </p>
        </div>
      </div>

      <div className="relative z-10 mt-12 rounded-2xl border border-white/10 bg-white/10 p-5">
        <p className="text-sm font-semibold text-white">
          Password security tips
        </p>

        <ul className="mt-3 space-y-2 text-sm text-blue-100">
          <li>• Use at least 6 characters</li>
          <li>• Avoid easily guessed passwords</li>
          <li>• Never share your password with anyone</li>
        </ul>
      </div>
    </section>

    {/* Form Section */}
    <section className="p-6 sm:p-10 lg:p-12 xl:p-14">
      <div className="mx-auto max-w-md">

        {/* Mobile Logo */}
        <Link
          href="/"
          className="mb-10 inline-flex items-center gap-2 lg:hidden"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-sm font-extrabold text-white">
            CP
          </span>

          <span className="text-lg font-extrabold text-slate-900">
            CareerPortal
          </span>
        </Link>

        <div className="mb-8">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-xl">
            🔐
          </div>

          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Set new password
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Create a new secure password for your CareerPortal
            account.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium leading-6 text-red-700"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium leading-6 text-emerald-700"
          >
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* New Password */}
          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-bold text-slate-700"
            >
              New password
            </label>

            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Minimum 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword((value) => !value)
                }
                aria-label={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-bold text-slate-500 transition hover:bg-slate-100 hover:text-blue-600"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-2 block text-sm font-bold text-slate-700"
            >
              Confirm new password
            </label>

            <div className="relative">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={
                  showConfirmPassword
                    ? "text"
                    : "password"
                }
                autoComplete="new-password"
                placeholder="Re-enter your new password"
                value={confirmPassword}
                onChange={(e) =>
                  setConfirmPassword(e.target.value)
                }
                required
                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />

              <button
                type="button"
                onClick={() =>
                  setShowConfirmPassword(
                    (value) => !value
                  )
                }
                aria-label={
                  showConfirmPassword
                    ? "Hide password"
                    : "Show password"
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-bold text-slate-500 transition hover:bg-slate-100 hover:text-blue-600"
              >
                {showConfirmPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {/* Password requirement */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Password requirement
            </p>

            <p
              className={`mt-2 text-sm font-semibold ${
                password.length >= 6
                  ? "text-emerald-600"
                  : "text-slate-500"
              }`}
            >
              {password.length >= 6 ? "✓" : "•"} At least
              6 characters
            </p>

            <p
              className={`mt-1 text-sm font-semibold ${
                password &&
                confirmPassword &&
                password === confirmPassword
                  ? "text-emerald-600"
                  : "text-slate-500"
              }`}
            >
              {password &&
              confirmPassword &&
              password === confirmPassword
                ? "✓"
                : "•"}{" "}
              Passwords must match
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex h-12 w-full items-center justify-center rounded-xl bg-blue-600 px-5 text-sm font-extrabold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Updating password...
              </>
            ) : (
              "Update password"
            )}
          </button>
        </form>

        <Link
          href="/login"
          className="mt-6 block text-center text-sm font-semibold text-slate-500 transition hover:text-blue-600"
        >
          ← Back to Sign in
        </Link>

        <Link
          href="/"
          className="mt-3 block text-center text-sm font-semibold text-slate-500 transition hover:text-blue-600"
        >
          Back to CareerPortal
        </Link>
      </div>
    </section>
  </div>
</main>

);
}
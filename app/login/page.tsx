"use client";

import Link from "next/link";
import {
  FormEvent,
  Suspense,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const supabase = createClient();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) return;

    setLoading(true);
    setErrorMessage("");

    try {
      const cleanEmail = email.trim().toLowerCase();

      if (!cleanEmail || !password) {
        setErrorMessage("Email aur password dono enter karein.");
        setLoading(false);
        return;
      }

      // 1. Login
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      if (!data.user || !data.session) {
        setErrorMessage("Login session create nahi ho saka.");
        setLoading(false);
        return;
      }

      // 2. Give Supabase a moment to finish browser session storage.
      await new Promise((resolve) => setTimeout(resolve, 300));

      // 3. Ask server where this user should go.
      const response = await fetch("/api/auth/redirect", {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      });

      const destinationData = await response.json();

      // 4. If ?next= exists, respect it only for non-admin users.
      const next = searchParams.get("next");

      if (
        next &&
        next.startsWith("/") &&
        !next.startsWith("//") &&
        !destinationData.isAdmin
      ) {
        window.location.href = next;
        return;
      }

      // 5. Admin -> /admin
      // 6. Normal user -> /profile
      if (destinationData.isAdmin) {
        window.location.href = "/admin";
        return;
      }

      window.location.href = "/profile";
    } catch (error) {
      console.error("Login error:", error);

      setErrorMessage(
        "Login ke baad redirect nahi ho saka. Please dobara try karein."
      );

      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto grid min-h-screen max-w-7xl lg:grid-cols-2">
        {/* Left */}
        <section className="hidden bg-blue-600 px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between">
          <div>
            <Link href="/" className="inline-flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-sm font-extrabold text-blue-600">
                CP
              </div>

              <div>
                <div className="text-xl font-extrabold">CareerPortal</div>

                <div className="text-xs text-blue-100">
                  Jobs • Exams • Results • Education
                </div>
              </div>
            </Link>
          </div>

          <div className="max-w-xl">
            <div className="mb-5 inline-flex rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-blue-50">
              Welcome back
            </div>

            <h1 className="text-5xl font-extrabold leading-tight">
              Continue your CareerPortal journey.
            </h1>

            <p className="mt-6 text-lg leading-8 text-blue-100">
              Government jobs, private jobs, exams, results, admit cards and
              education information — all in one place.
            </p>
          </div>

          <p className="text-sm text-blue-100">
            © {new Date().getFullYear()} CareerPortal
          </p>
        </section>

        {/* Right */}
        <section className="flex items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-md">
            <div className="mb-8 lg:hidden">
              <Link href="/" className="inline-flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-sm font-extrabold text-white">
                  CP
                </div>

                <div className="text-lg font-extrabold text-slate-900">
                  CareerPortal
                </div>
              </Link>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div>
                <p className="text-sm font-bold text-blue-600">ACCOUNT</p>

                <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
                  Welcome back
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Apne CareerPortal account mein login karein.
                </p>
              </div>

              {errorMessage && (
                <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium leading-6 text-red-700">
                  {errorMessage}
                </div>
              )}

              <form onSubmit={handleLogin} className="mt-7 space-y-5">
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-bold text-slate-700"
                  >
                    Email Address
                  </label>

                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label
                      htmlFor="password"
                      className="block text-sm font-bold text-slate-700"
                    >
                      Password
                    </label>

                    <Link
                      href="/forgot-password"
                      className="text-sm font-bold text-blue-600 hover:text-blue-700"
                    >
                      Forgot Password?
                    </Link>
                  </div>

                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl bg-blue-600 px-5 py-3.5 text-sm font-extrabold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Signing in..." : "Sign In"}
                </button>
              </form>

              <div className="my-7 flex items-center gap-4">
                <div className="h-px flex-1 bg-slate-200" />

                <span className="text-xs font-semibold text-slate-400">
                  OR
                </span>

                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <p className="text-center text-sm text-slate-500">
                Account nahi hai?{" "}
                <Link
                  href="/signup"
                  className="font-extrabold text-blue-600 hover:text-blue-700"
                >
                  Create Account
                </Link>
              </p>
            </div>

            <p className="mt-6 text-center text-xs leading-5 text-slate-400">
              By continuing, you agree to CareerPortal&apos;s{" "}
              <Link
                href="/terms"
                className="font-semibold text-slate-500 hover:text-blue-600"
              >
                Terms
              </Link>{" "}
              and{" "}
              <Link
                href="/privacy"
                className="font-semibold text-slate-500 hover:text-blue-600"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

function LoginLoading() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-5 py-10">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mx-auto h-10 w-32 animate-pulse rounded-xl bg-slate-200" />

          <div className="mx-auto mt-8 h-8 w-48 animate-pulse rounded-lg bg-slate-200" />

          <div className="mt-3 h-4 w-full animate-pulse rounded bg-slate-100" />

          <div className="mt-8 space-y-4">
            <div className="h-14 animate-pulse rounded-2xl bg-slate-100" />
            <div className="h-14 animate-pulse rounded-2xl bg-slate-100" />
            <div className="h-14 animate-pulse rounded-2xl bg-slate-200" />
          </div>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoading />}>
      <LoginForm />
    </Suspense>
  );
}
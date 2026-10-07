"use client";

import Link from "next/link";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const adminMode = searchParams.get("admin") === "1";

  useEffect(() => {
    if (searchParams.get("registered") === "1") {
      setError("");
    }
  }, [searchParams]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (loginError) {
      setError("Email या password गलत है।");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/destination", {
        cache: "no-store",
      });

      const data = await response.json();

      router.replace(data.destination || "/");
      router.refresh();
    } catch {
      router.replace("/");
      router.refresh();
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">CareerPortal</div>

        <h1>{adminMode ? "Admin Sign In" : "Welcome Back"}</h1>

        <p className="auth-subtitle">
          {adminMode
            ? "Authorized administrators can sign in here."
            : "Sign in to your CareerPortal account."}
        </p>

        <form onSubmit={handleLogin} className="auth-form">
          <label htmlFor="email">Email</label>

          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />

          <label htmlFor="password">Password</label>

          <div className="auth-password">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />

            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button className="auth-primary" disabled={loading} type="submit">
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        <div className="auth-links">
          <Link href="/auth/forgot-password">Forgot password?</Link>

          <span>
            New here? <Link href="/auth/signup">Create Account</Link>
          </span>
        </div>

        <Link className="auth-back" href="/">
          ← Back to CareerPortal
        </Link>
      </div>
    </main>
  );
}

function LoginLoading() {
  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">CareerPortal</div>

        <h1>Welcome Back</h1>

        <p className="auth-subtitle">Loading sign in...</p>

        <div className="auth-form">
          <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
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
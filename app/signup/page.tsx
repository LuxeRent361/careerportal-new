"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSignup(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setLoading(false);

    if (data.session) {
      window.location.href = "/profile";
      return;
    }

    setSuccess(
      "Account created successfully. Please check your email to verify your account."
    );
  }

  return (
    <main className="cp-auth-page">
      <div className="cp-auth-container">

        <section className="cp-auth-intro">
          <Link href="/" className="cp-auth-logo">
            <span className="cp-logo-mark">CP</span>
            <span>CareerPortal</span>
          </Link>

          <div className="cp-auth-badge">
            <span>✦</span>
            Your Career Starts Here
          </div>

          <h1>
            Create your
            <br />
            <strong>CareerPortal</strong>
            <br />
            account.
          </h1>

          <p>
            Join CareerPortal to stay updated with government jobs,
            private jobs, exams, results, admit cards and education
            opportunities.
          </p>

          <div className="cp-auth-features">
            <div>
              <span>✓</span>
              Latest job opportunities
            </div>
            <div>
              <span>✓</span>
              Exam & result updates
            </div>
            <div>
              <span>✓</span>
              Personalized profile
            </div>
          </div>
        </section>

        <section className="cp-login-card">
          <div className="cp-login-heading">
            <span className="cp-card-icon">👤</span>
            <div>
              <h2>Create account</h2>
              <p>Register your CareerPortal account</p>
            </div>
          </div>

          {error && <div className="cp-form-error">{error}</div>}

          {success && (
            <div className="cp-form-success">{success}</div>
          )}

          <form onSubmit={handleSignup} className="cp-login-form">

            <div className="cp-form-group">
              <label htmlFor="fullName">Full name</label>
              <div className="cp-input-wrapper">
                <span className="cp-input-icon">👤</span>
                <input
                  id="fullName"
                  type="text"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="cp-form-group">
              <label htmlFor="signupEmail">Email address</label>
              <div className="cp-input-wrapper">
                <span className="cp-input-icon">✉</span>
                <input
                  id="signupEmail"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="cp-form-group">
              <label htmlFor="signupPassword">Password</label>

              <div className="cp-input-wrapper">
                <span className="cp-input-icon">🔒</span>

                <input
                  id="signupPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />

                <button
                  type="button"
                  className="cp-show-password"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div className="cp-form-group">
              <label htmlFor="confirmPassword">Confirm password</label>

              <div className="cp-input-wrapper">
                <span className="cp-input-icon">🔐</span>

                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />

                <button
                  type="button"
                  className="cp-show-password"
                  onClick={() =>
                    setShowConfirmPassword(!showConfirmPassword)
                  }
                >
                  {showConfirmPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="cp-login-button"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="cp-spinner" />
                  Creating account...
                </>
              ) : (
                "Create account →"
              )}
            </button>
          </form>

          <div className="cp-divider">
            <span>Already have an account?</span>
          </div>

          <div className="cp-signup-box">
            <span>Welcome back?</span>
            <Link href="/login">Sign in</Link>
          </div>

          <Link href="/" className="cp-back-home">
            ← Back to CareerPortal
          </Link>
        </section>
      </div>
    </main>
  );
}
"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function validatePassword(password: string) {
  if (password.length < 8) return "Password कम से कम 8 characters का होना चाहिए।";
  if (!/[A-Z]/.test(password)) return "Password में कम से कम 1 uppercase letter होना चाहिए।";
  if (!/[a-z]/.test(password)) return "Password में कम से कम 1 lowercase letter होना चाहिए।";
  if (!/[0-9]/.test(password)) return "Password में कम से कम 1 number होना चाहिए।";
  if (!/[^A-Za-z0-9]/.test(password)) return "Password में कम से कम 1 special character होना चाहिए।";
  return "";
}

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const cleanEmail = email.trim().toLowerCase();
    const passwordError = validatePassword(password);

    if (!cleanEmail) return setError("Email डालें।");
    if (passwordError) return setError(passwordError);
    if (password !== confirm) return setError("Password और Confirm Password match नहीं कर रहे हैं।");

    setLoading(true);

    const { data, error: signupError } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: { data: { full_name: cleanEmail.split("@")[0] } },
    });

    if (signupError) {
      setError(
        signupError.message.toLowerCase().includes("already registered")
          ? "यह email पहले से registered है। Sign In करें।"
          : signupError.message
      );
      setLoading(false);
      return;
    }

    if (data.session) {
      router.replace("/");
      router.refresh();
      return;
    }

    setSuccess("Account बन गया है। अब अपने email और password से Sign In करें।");
    setPassword("");
    setConfirm("");
    setLoading(false);
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">CareerPortal</div>
        <h1>Create Account</h1>
        <p className="auth-subtitle">Create your free CareerPortal account.</p>

        <form onSubmit={handleSignup} className="auth-form">
          <label htmlFor="signup-email">Email</label>
          <input id="signup-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />

          <label htmlFor="signup-password">Password</label>
          <div className="auth-password">
            <input id="signup-password" type={showPassword ? "text" : "password"} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Create a strong password" required />
            <button type="button" onClick={() => setShowPassword((v) => !v)}>{showPassword ? "Hide" : "Show"}</button>
          </div>

          <div className="password-rules">
            <strong>Password requirements</strong>
            <br />• Minimum 8 characters
            <br />• 1 uppercase letter
            <br />• 1 lowercase letter
            <br />• 1 number
            <br />• 1 special character
          </div>

          <label htmlFor="confirm-password">Confirm Password</label>
          <div className="auth-password">
            <input id="confirm-password" type={showConfirm ? "text" : "password"} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Enter password again" required />
            <button type="button" onClick={() => setShowConfirm((v) => !v)}>{showConfirm ? "Hide" : "Show"}</button>
          </div>

          {error && <div className="auth-error">{error}</div>}
          {success && <div className="auth-success">{success}</div>}

          <button className="auth-primary" disabled={loading} type="submit">
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <div className="auth-links">
          <span>Already have an account? <Link href="/auth/login">Sign In</Link></span>
        </div>

        <Link className="auth-back" href="/">← Back to CareerPortal</Link>
      </div>
    </main>
  );
}

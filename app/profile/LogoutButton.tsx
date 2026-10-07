"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);

    const supabase = createClient();

    await supabase.auth.signOut();

    window.location.href = "/";
  }

  return (
    <button
      type="button"
      className="cp-profile-logout"
      onClick={handleLogout}
      disabled={loading}
    >
      <span>↪</span>
      {loading ? "Signing out..." : "Sign out"}
    </button>
  );
}
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

export type AdminRole = "admin" | "super_admin" | "superadmin";

export type AdminUser = {
  id: string;
  email: string;
  full_name?: string | null;
  role: AdminRole;
  is_active: boolean;
};

function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase service role environment variables are missing.");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Returns the currently logged-in Supabase user.
 */
export async function getCurrentUser() {
  const supabase = await createServerClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

/**
 * Checks whether the currently logged-in user
 * exists in admin_users and is active.
 */
export async function getCurrentAdmin(): Promise<AdminUser | null> {
  const user = await getCurrentUser();

  if (!user?.email) {
    return null;
  }

  const email = user.email.trim().toLowerCase();

  const adminSupabase = createServiceClient();

  const { data, error } = await adminSupabase
    .from("admin_users")
    .select("id,email,full_name,role,is_active")
    .ilike("email", email)
    .eq("is_active", true)
    .in("role", ["admin", "super_admin", "superadmin"])
    .maybeSingle();

  if (error) {
    console.error("Admin verification error:", error);
    return null;
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    email: data.email,
    full_name: data.full_name ?? null,
    role: data.role as AdminRole,
    is_active: data.is_active,
  };
}

/**
 * Returns true when the logged-in user is an active admin.
 */
export async function isCurrentAdmin() {
  const admin = await getCurrentAdmin();
  return Boolean(admin);
}

/**
 * Returns true when the logged-in user is a Super Admin.
 */
export async function isCurrentSuperAdmin() {
  const admin = await getCurrentAdmin();

  if (!admin) {
    return false;
  }

  return (
    admin.role === "super_admin" ||
    admin.role === "superadmin"
  );
}
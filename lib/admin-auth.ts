import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export type AdminUser = {
  id: string;
  email: string;
  role: string;
  active: boolean;
};

export async function getCurrentAdmin(): Promise<AdminUser | null> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user?.email) {
      return null;
    }

    const email = user.email.trim().toLowerCase();

    const adminClient = createSupabaseAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { data, error } = await adminClient
      .from("admin_users")
      .select("id,email,role,active")
      .ilike("email", email)
      .eq("active", true)
      .in("role", ["admin", "super_admin", "superadmin"])
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      email: data.email,
      role: data.role,
      active: data.active,
    };
  } catch (error) {
    console.error("getCurrentAdmin error:", error);
    return null;
  }
}

export async function isCurrentUserAdmin(): Promise<boolean> {
  const admin = await getCurrentAdmin();
  return Boolean(admin);
}
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

async function isAuthorizedAdmin(
  request: NextRequest
): Promise<boolean> {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll() {},
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return false;
    }

    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey) {
      return false;
    }

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const email = user.email.trim().toLowerCase();

    const { data: admin } = await adminClient
      .from("admin_users")
      .select("id,email,role,is_active")
      .ilike("email", email)
      .eq("is_active", true)
      .in("role", [
        "admin",
        "super_admin",
        "superadmin",
      ])
      .maybeSingle();

    return Boolean(admin);
  } catch (error) {
    console.error("Maintenance admin check failed:", error);
    return false;
  }
}

async function isMaintenanceEnabled(): Promise<boolean> {
  try {
    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey) {
      return false;
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { data, error } = await supabase
      .from("site_settings")
      .select("setting_value")
      .eq("setting_key", "maintenance_mode")
      .maybeSingle();

    if (error) {
      console.error(
        "Maintenance setting check failed:",
        error
      );

      return false;
    }

    return data?.setting_value === "true";
  } catch (error) {
    console.error(
      "Maintenance mode check failed:",
      error
    );

    return false;
  }
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  /*
   * Keep Supabase authentication cookies refreshed.
   */
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(
            ({ name, value, options }) => {
              request.cookies.set(name, value);

              response.cookies.set(
                name,
                value,
                {
                  ...options,
                  path: "/",
                }
              );
            }
          );
        },
      },
    }
  );

  await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  /*
   * These routes must always remain accessible.
   */
  const bypassRoutes = [
    "/maintenance",
    "/admin",
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
    "/auth",
    "/api/auth",
    "/_next",
    "/favicon.ico",
  ];

  const shouldBypass = bypassRoutes.some(
    (route) =>
      pathname === route ||
      pathname.startsWith(`${route}/`)
  );

  if (shouldBypass) {
    return response;
  }

  /*
   * Admins can continue using the website while
   * maintenance mode is enabled.
   */
  const maintenanceEnabled =
    await isMaintenanceEnabled();

  if (maintenanceEnabled) {
    const admin = await isAuthorizedAdmin(request);

    if (!admin) {
      const maintenanceUrl =
        request.nextUrl.clone();

      maintenanceUrl.pathname = "/maintenance";
      maintenanceUrl.search = "";

      return NextResponse.redirect(
        maintenanceUrl
      );
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
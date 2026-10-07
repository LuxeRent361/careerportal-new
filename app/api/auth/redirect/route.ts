import { NextResponse } from "next/server";
import { getCurrentAdmin, getCurrentUser } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user?.email) {
      return NextResponse.json({
        isLoggedIn: false,
        isAdmin: false,
        role: null,
        destination: "/login",
      });
    }

    const admin = await getCurrentAdmin();

    if (admin) {
      return NextResponse.json({
        isLoggedIn: true,
        isAdmin: true,
        role: admin.role,
        email: admin.email,
        destination: "/admin",
      });
    }

    return NextResponse.json({
      isLoggedIn: true,
      isAdmin: false,
      role: null,
      email: user.email,
      destination: "/profile",
    });
  } catch (error) {
    console.error("Auth redirect error:", error);

    return NextResponse.json({
      isLoggedIn: false,
      isAdmin: false,
      role: null,
      destination: "/login",
    });
  }
}
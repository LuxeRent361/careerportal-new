
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentAdmin, getCurrentUser } from "@/lib/auth/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase server environment variables are missing.");
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function authorize() {
  const user = await getCurrentUser();

  if (!user) {
    return {
      error: NextResponse.json(
        { error: "Please log in first." },
        { status: 401 }
      ),
    };
  }

  const admin = await getCurrentAdmin();

  if (!admin) {
    return {
      error: NextResponse.json(
        { error: "Admin access required." },
        { status: 403 }
      ),
    };
  }

  return { error: null };
}

export async function GET() {
  try {
    const auth = await authorize();
    if (auth.error) return auth.error;

    const supabase = getSupabase();

    const { data, error } = await supabase
      .from("cp_import_queue")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ items: data ?? [] });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not load import queue.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await authorize();
    if (auth.error) return auth.error;

    const body = await request.json();
    const id = typeof body.id === "string" ? body.id.trim() : "";
    const action = body.action;

    if (!id || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "A valid item ID and action are required." },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    const { data: existing, error: findError } = await supabase
      .from("cp_import_queue")
      .select("id, status")
      .eq("id", id)
      .maybeSingle();

    if (findError) {
      return NextResponse.json(
        { error: findError.message },
        { status: 500 }
      );
    }

    if (!existing) {
      return NextResponse.json(
        { error: "Queue item not found." },
        { status: 404 }
      );
    }

    if (existing.status === "published") {
      return NextResponse.json(
        { error: "This item is already published." },
        { status: 409 }
      );
    }

    const nextStatus = action === "approve" ? "approved" : "rejected";

    const { data, error } = await supabase
      .from("cp_import_queue")
      .update({ status: nextStatus })
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      item: data,
      message:
        action === "approve"
          ? "Approved for review. This item has NOT been published."
          : "Item rejected.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not update queue item.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

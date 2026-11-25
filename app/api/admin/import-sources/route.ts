
import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import {
  getCurrentAdmin,
  getCurrentUser,
} from "@/lib/auth/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CONTENT_TYPES = [
  "job",
  "exam",
  "result",
  "admit_card",
  "answer_key",
  "syllabus",
  "important_notice",
  "education_admission",
] as const;

const SECTORS = [
  "Central Government",
  "State Government",
  "Railway",
  "Banking",
  "Insurance",
  "Defence",
  "Police & Security",
  "Education",
  "Health & Medical",
  "PSU",
  "Courts",
  "Ministry & Department",
  "Research & Science",
  "Private Jobs",
  "Private Education",
  "Other",
] as const;

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase server configuration is missing.");
  }

  return createSupabaseClient(url, key, {
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
      allowed: false,
      status: 401,
      message: "Please log in first.",
    };
  }

  const admin = await getCurrentAdmin();

  if (!admin) {
    return {
      allowed: false,
      status: 403,
      message: "Administrator access required.",
    };
  }

  return { allowed: true, status: 200, message: "OK" };
}

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function validHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function validContentType(value: string): boolean {
  return CONTENT_TYPES.includes(
    value as (typeof CONTENT_TYPES)[number]
  );
}

function validSector(value: string): boolean {
  return SECTORS.includes(value as (typeof SECTORS)[number]);
}

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    { success: false, error: message },
    { status }
  );
}

// GET: List registered sources.
export async function GET() {
  try {
    const auth = await authorize();

    if (!auth.allowed) {
      return errorResponse(auth.message, auth.status);
    }

    const supabase = getServiceClient();

    const { data, error } = await supabase
      .from("cp_sources")
      .select("*")
      .order("institution_name", { ascending: true })
      .limit(1000);

    if (error) {
      console.error("Import sources GET error:", error.message);
      return errorResponse("Could not load import sources.", 500);
    }

    return NextResponse.json({
      success: true,
      count: data?.length ?? 0,
      sources: data ?? [],
    });
  } catch (error) {
    console.error("Import sources GET failed:", error);
    return errorResponse("Unexpected server error.", 500);
  }
}

// POST: Register a new official source.
export async function POST(request: Request) {
  try {
    const auth = await authorize();

    if (!auth.allowed) {
      return errorResponse(auth.message, auth.status);
    }

    let body: Record<string, unknown>;

    try {
      body = await request.json();
    } catch {
      return errorResponse("Request body must be valid JSON.", 400);
    }

    const institutionName = clean(body.institution_name);
    const sourceName = clean(body.source_name);
    const sector = clean(body.sector) || "Other";
    const officialUrl = clean(body.official_url);
    const contentType = clean(body.content_type) || "important_notice";

    if (!institutionName || !sourceName || !officialUrl) {
      return errorResponse(
        "Institution name, source name and official URL are required.",
        400
      );
    }

    if (!validHttpUrl(officialUrl)) {
      return errorResponse("Enter a valid HTTP or HTTPS URL.", 400);
    }

    if (!validContentType(contentType)) {
      return errorResponse("Unsupported content category.", 400);
    }

    if (!validSector(sector)) {
      return errorResponse("Unsupported sector.", 400);
    }

    const supabase = getServiceClient();

    const { data, error } = await supabase
      .from("cp_sources")
      .insert({
        institution_name: institutionName,
        source_name: sourceName,
        sector,
        official_url: officialUrl,
        content_type: contentType,
        is_active: body.is_active !== false,
        updated_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (error) {
      console.error("Import source insert error:", error.message);
      return errorResponse(
        error.code === "23505"
          ? "This source may already exist."
          : "Could not save the source. Check the database error in server logs.",
        500
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Official source registered.",
        source: data,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Import source POST failed:", error);
    return errorResponse("Unexpected server error.", 500);
  }
}

// PATCH: Update an existing source.
export async function PATCH(request: Request) {
  try {
    const auth = await authorize();

    if (!auth.allowed) {
      return errorResponse(auth.message, auth.status);
    }

    let body: Record<string, unknown>;

    try {
      body = await request.json();
    } catch {
      return errorResponse("Request body must be valid JSON.", 400);
    }

    const id = clean(body.id);

    if (!id) {
      return errorResponse("Source ID is required.", 400);
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.institution_name !== undefined) {
      const value = clean(body.institution_name);
      if (!value) {
        return errorResponse("Institution name cannot be empty.", 400);
      }
      updates.institution_name = value;
    }

    if (body.source_name !== undefined) {
      const value = clean(body.source_name);
      if (!value) {
        return errorResponse("Source name cannot be empty.", 400);
      }
      updates.source_name = value;
    }

    if (body.official_url !== undefined) {
      const value = clean(body.official_url);
      if (!validHttpUrl(value)) {
        return errorResponse("Enter a valid HTTP or HTTPS URL.", 400);
      }
      updates.official_url = value;
    }

    if (body.sector !== undefined) {
      const value = clean(body.sector);
      if (!validSector(value)) {
        return errorResponse("Unsupported sector.", 400);
      }
      updates.sector = value;
    }

    if (body.content_type !== undefined) {
      const value = clean(body.content_type);
      if (!validContentType(value)) {
        return errorResponse("Unsupported content category.", 400);
      }
      updates.content_type = value;
    }

    if (body.is_active !== undefined) {
      if (typeof body.is_active !== "boolean") {
        return errorResponse("is_active must be true or false.", 400);
      }
      updates.is_active = body.is_active;
    }

    const supabase = getServiceClient();

    const { data, error } = await supabase
      .from("cp_sources")
      .update(updates)
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (error) {
      console.error("Import source update error:", error.message);
      return errorResponse("Could not update the source.", 500);
    }

    if (!data) {
      return errorResponse("Source not found.", 404);
    }

    return NextResponse.json({
      success: true,
      message: "Source updated.",
      source: data,
    });
  } catch (error) {
    console.error("Import source PATCH failed:", error);
    return errorResponse("Unexpected server error.", 500);
  }
}

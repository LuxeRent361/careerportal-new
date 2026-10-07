import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import {
  getCurrentAdmin,
  getCurrentUser,
} from "@/lib/auth/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SourceConfig = {
  code: string;
  name: string;
  url: string;
};

const SOURCES: Record<string, SourceConfig> = {
  SSC: {
    code: "SSC",
    name: "Staff Selection Commission",
    url: "https://ssc.gov.in/",
  },

  UPSC: {
    code: "UPSC",
    name: "Union Public Service Commission",
    url: "https://upsc.gov.in/",
  },

  RRB: {
    code: "RRB",
    name: "Railway Recruitment Board",
    url: "https://www.rrbcdg.gov.in/",
  },

  SBI: {
    code: "SBI",
    name: "State Bank of India",
    url: "https://sbi.co.in/web/careers",
  },

  AICTE: {
    code: "AICTE",
    name: "All India Council for Technical Education",
    url: "https://www.aicte-india.org/",
  },

  LIC: {
    code: "LIC",
    name: "Life Insurance Corporation of India",
    url: "https://licindia.in/careers",
  },
};

const ALLOWED_SOURCES = Object.keys(SOURCES);

const REQUEST_TIMEOUT = 15000;

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase environment variables are missing."
    );
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function checkOfficialSource(
  source: SourceConfig
) {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT);

  const startedAt = Date.now();

  try {
    const response = await fetch(source.url, {
      method: "GET",
      redirect: "follow",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",

        "User-Agent":
          "CareerPortalBot/1.0 (+https://careerportal.space/)",
      },
    });

    const elapsed = Date.now() - startedAt;

    return {
      success: response.ok,
      statusCode: response.status,
      statusText: response.statusText,
      responseTime: elapsed,
      finalUrl: response.url || source.url,
    };
  } catch (error) {
    const elapsed = Date.now() - startedAt;

    if (
      error instanceof Error &&
      error.name === "AbortError"
    ) {
      return {
        success: false,
        statusCode: null,
        statusText: "Request timed out",
        responseTime: elapsed,
        finalUrl: source.url,
      };
    }

    return {
      success: false,
      statusCode: null,
      statusText:
        error instanceof Error
          ? error.message
          : "Source request failed",
      responseTime: elapsed,
      finalUrl: source.url,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required.",
        },
        {
          status: 401,
        }
      );
    }

    const admin = await getCurrentAdmin();

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          error: "Administrator access required.",
        },
        {
          status: 403,
        }
      );
    }

    let body: {
      source?: string;
    };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid JSON request.",
        },
        {
          status: 400,
        }
      );
    }

    const sourceCode = String(
      body.source || ""
    )
      .trim()
      .toUpperCase();

    if (!sourceCode) {
      return NextResponse.json(
        {
          success: false,
          error: "Source code is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!ALLOWED_SOURCES.includes(sourceCode)) {
      return NextResponse.json(
        {
          success: false,
          error: `Unsupported source: ${sourceCode}`,
        },
        {
          status: 400,
        }
      );
    }

    const source = SOURCES[sourceCode];

    const result =
      await checkOfficialSource(source);

    /*
     * Important:
     *
     * A source returning 403, 404, 429, timeout, etc.
     * is treated as a source-level failure.
     *
     * It does NOT create a server 500 error.
     *
     * This prevents one external source from breaking
     * the complete CareerPortal monitoring system.
     */

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,

          source: {
            code: source.code,
            name: source.name,
            url: source.url,
          },

          status: "failed",

          found: 0,
          created: 0,
          failed: 0,

          statusCode: result.statusCode,
          statusText: result.statusText,
          responseTime: result.responseTime,

          message:
            `${source.name} is currently unreachable or ` +
            `returned HTTP ${result.statusCode ?? "an error"}. ` +
            `No content was imported.`,
        },
        {
          status: 200,
        }
      );
    }

    /*
     * At this stage we only verify that the official source
     * is reachable.
     *
     * We intentionally DO NOT create fake jobs/exams/results.
     * Actual source extraction/import will be connected to
     * the existing import system separately.
     */

    let adminClient;

    try {
      adminClient = createAdminClient();
    } catch (error) {
      console.error(
        "Admin client creation error:",
        error
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Server configuration is incomplete. Supabase service role key is missing.",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * Record a lightweight activity entry.
     *
     * Failure to write the activity log must NOT make the
     * source check itself fail.
     */

    try {
      await adminClient
        .from("activity_logs")
        .insert({
          actor_user_id: user.id,
          actor_email: user.email,
          action: "source_check",
          entity_type: "source",
          entity_id: source.code,
          description:
            `${source.name} source availability checked successfully.`,
          metadata: {
            source_code: source.code,
            source_url: source.url,
            status_code: result.statusCode,
            response_time: result.responseTime,
          },
        });
    } catch (logError) {
      console.error(
        "Activity log write failed:",
        logError
      );
    }

    return NextResponse.json(
      {
        success: true,

        source: {
          code: source.code,
          name: source.name,
          url: source.url,
        },

        status: "success",

        /*
         * No fake discovered content.
         * These values mean that this request only performed
         * an official-source availability check.
         */
        found: 0,
        created: 0,
        failed: 0,

        statusCode: result.statusCode,
        statusText: result.statusText,
        responseTime: result.responseTime,
        finalUrl: result.finalUrl,

        message:
          `${source.name} is reachable. ` +
          `No content was imported during this availability check.`,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "Source check unexpected error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unexpected source check error.",
      },
      {
        status: 500,
      }
    );
  }
}
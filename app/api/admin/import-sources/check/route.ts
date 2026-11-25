
import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { getCurrentAdmin, getCurrentUser } from "@/lib/auth/admin";

export const runtime = "nodejs";
export const maxDuration = 60;

type ContentType =
  | "exam"
  | "result"
  | "admit_card"
  | "answer_key"
  | "syllabus";

type Candidate = {
  title: string;
  url: string;
  content_type: ContentType;
  fingerprint: string;
  publication_date: string;
};

const MAX_HTML_BYTES = 5_000_000;
const MAX_PAGES = 8;
const MAX_CANDIDATES = 150;
const THREE_MONTHS_MS = 92 * 24 * 60 * 60 * 1000;

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase environment variables are missing.");
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function authorize() {
  const user = await getCurrentUser();
  if (!user) return false;
  return Boolean(await getCurrentAdmin());
}

function cleanText(value: string) {
  return value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function parsePublicationDate(value: string): Date | null {
  const text = value.trim();
  if (!text) return null;

  const iso = text.match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
  if (iso) {
    const date = new Date(
      Number(iso[1]),
      Number(iso[2]) - 1,
      Number(iso[3])
    );
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const indian = text.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](20\d{2})\b/);
  if (indian) {
    const date = new Date(
      Number(indian[3]),
      Number(indian[2]) - 1,
      Number(indian[1])
    );
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const monthDate = text.match(
    /\b(\d{1,2})\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(20\d{2})\b/i
  );

  if (monthDate) {
    const date = new Date(`${monthDate[1]} ${monthDate[2]} ${monthDate[3]}`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
}

function isRecentDate(date: Date) {
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - 3);

  return date >= cutoff && date <= now;
}

function extractPublicationDate(html: string, title: string): Date | null {
  const metaTags = html.match(/<meta\b[^>]*>/gi) || [];

  for (const tag of metaTags) {
    const content = tag.match(/\bcontent=["']([^"']+)["']/i)?.[1] || "";
    const key =
      tag.match(/\b(?:name|property|itemprop)=["']([^"']+)["']/i)?.[1] || "";

    if (
      /date|published|created|modified|dc\.date/i.test(key)
    ) {
      const date = parsePublicationDate(content);
      if (date) return date;
    }
  }

  const timeTags = html.match(/<time\b[^>]*>/gi) || [];

  for (const tag of timeTags) {
    const value =
      tag.match(/\bdatetime=["']([^"']+)["']/i)?.[1] || "";
    const date = parsePublicationDate(value);
    if (date) return date;
  }

  const text = cleanText(html).slice(0, 30000);
  const datePatterns = [
    /\b(?:published|publication date|notice date|date of issue|issued on|dated)\s*[:\-]?\s*(\d{1,2}[\/.-]\d{1,2}[\/.-]20\d{2})/i,
    /\b(?:published|publication date|notice date|date of issue|issued on|dated)\s*[:\-]?\s*(20\d{2}[\/.-]\d{1,2}[\/.-]\d{1,2})/i,
    /\b(?:published|publication date|notice date|date of issue|issued on|dated)\s*[:\-]?\s*(\d{1,2}\s+[A-Za-z]+\s+20\d{2})/i,
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const date = parsePublicationDate(match[1]);
      if (date) return date;
    }
  }

  return parsePublicationDate(title);
}

function classifyNotice(value: string): ContentType | null {
  const text = value.toLowerCase().replace(/[_-]+/g, " ");

  if (/\b(result|results|merit list|cut.?off|score ?card|final selection|selection list|marks list|rank list)\b/.test(text)) {
    return "result";
  }

  if (/\b(admit card|hall ticket|e admission certificate|call letter|exam city|city intimation|intimation slip)\b/.test(text)) {
    return "admit_card";
  }

  if (/\b(answer key|answer keys|response sheet|objection tracker|provisional answers?)\b/.test(text)) {
    return "answer_key";
  }

  if (/\b(syllabus|exam pattern|examination scheme|course of examination)\b/.test(text)) {
    return "syllabus";
  }

  if (/\b(recruitment|vacanc(?:y|ies)|apply online|application form|employment notice|exam notification|advertisement no\.?|direct recruitment|recruitment notice|exam calendar|exam date|examination date|date sheet|timetable|exam schedule|written examination schedule|revised exam date)\b/.test(text)) {
    return "exam";
  }

  return null;
}

function usefulTitle(title: string) {
  const normalized = title.toLowerCase().replace(/\s+/g, " ").trim();

  if (normalized.length < 5 || normalized.length > 300) return false;

  const ignored = [
    "home", "homepage", "about us", "contact us", "login",
    "register", "accessibility", "privacy policy", "sitemap",
    "feedback", "help", "search", "view all", "read more",
    "click here", "download", "notification", "notifications",
    "important notice", "notice", "notices", "announcements",
    "press release", "tenders", "latest news", "latest updates",
  ];

  return !ignored.includes(normalized);
}

function fingerprintFor(url: string, title: string) {
  const normalizedUrl = url.split("#")[0].replace(/\/+$/, "").toLowerCase();
  const normalizedTitle = title.toLowerCase().replace(/\s+/g, " ").trim();

  return createHash("sha256")
    .update(`${normalizedUrl}|${normalizedTitle}`)
    .digest("hex");
}

function isPublicHost(hostname: string) {
  const host = hostname.toLowerCase();

  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.startsWith("127.") ||
    host.startsWith("10.") ||
    host.startsWith("192.168.") ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host)
  ) {
    return false;
  }

  return true;
}

function parseHttpUrl(value: string, base?: string) {
  try {
    const url = new URL(value, base);

    if (!["http:", "https:"].includes(url.protocol)) return null;
    if (url.username || url.password) return null;
    if (!isPublicHost(url.hostname)) return null;

    url.hash = "";
    return url;
  } catch {
    return null;
  }
}

function isAllowedOfficialUrl(candidate: URL, sourceUrl: URL) {
  const host = candidate.hostname.toLowerCase();
  const sourceHost = sourceUrl.hostname.toLowerCase();

  return (
    host === sourceHost ||
    host.endsWith(`.${sourceHost}`) ||
    host.endsWith(".gov.in") ||
    host.endsWith(".nic.in") ||
    host.endsWith(".ac.in") ||
    host.endsWith(".edu.in")
  );
}

async function fetchPage(initialUrl: string, sourceUrl: URL) {
  let current = parseHttpUrl(initialUrl);

  if (!current || !isAllowedOfficialUrl(current, sourceUrl)) {
    throw new Error("URL is not an allowed official source URL.");
  }

  for (let attempt = 0; attempt <= 4; attempt++) {
    const response = await fetch(current.toString(), {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(15000),
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; CareerPortalBot/1.0)",
        Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
      },
      cache: "no-store",
    });

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) throw new Error("Redirect location missing.");

      const next = parseHttpUrl(location, current.toString());

      if (!next || !isAllowedOfficialUrl(next, sourceUrl)) {
        throw new Error("Redirected outside allowed official domains.");
      }

      current = next;
      continue;
    }

    if (!response.ok) {
      throw new Error(`Official website returned HTTP ${response.status}.`);
    }

    const type = (response.headers.get("content-type") || "").toLowerCase();

    if (!type.includes("text/html") && !type.includes("application/xhtml+xml")) {
      return { url: current.toString(), type, html: "" };
    }

    const html = (await response.text()).slice(0, MAX_HTML_BYTES);
    return { url: current.toString(), type, html };
  }

  throw new Error("Too many redirects.");
}

function readAttributes(raw: string) {
  const attributes: Record<string, string> = {};
  const pattern = /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;

  let match: RegExpExecArray | null;

  while ((match = pattern.exec(raw)) !== null) {
    attributes[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? "";
  }

  return attributes;
}

function filenameTitle(url: URL) {
  let filename = url.pathname.split("/").filter(Boolean).pop() || "";

  try {
    filename = decodeURIComponent(filename);
  } catch {}

  return filename
    .replace(/\.pdf$/i, "")
    .replace(/[._-]+/g, " ")
    .replace(/\b\d{8,}\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractAnchors(html: string, baseUrl: string) {
  const links: Array<{ title: string; url: string }> = [];
  const pattern = /<a\b([^>]*)>([\s\S]*?)<\/a\s*>/gi;

  let match: RegExpExecArray | null;

  while ((match = pattern.exec(html)) !== null) {
    const attributes = readAttributes(match[1] || "");
    const href = attributes.href || attributes["data-href"] || "";

    if (!href || /^(javascript:|mailto:|tel:|data:)/i.test(href)) continue;

    const url = parseHttpUrl(href, baseUrl);
    if (!url || !isAllowedOfficialUrl(url, new URL(baseUrl))) continue;

    const title = cleanText(
      match[2] || attributes.title || attributes["aria-label"] || ""
    );

    links.push({ title, url: url.toString() });
  }

  return links;
}

function discoverLinks(html: string, pageUrl: string) {
  const candidates = new Map<string, Candidate>();
  const crawlUrls: string[] = [];
  const links = extractAnchors(html, pageUrl);
  const pageHost = new URL(pageUrl).hostname.toLowerCase();

  for (const link of links) {
    const url = new URL(link.url);
    const title = link.title || filenameTitle(url);
    const combined = `${title} ${url.pathname} ${url.search}`;

    const isPdf = /\.pdf$/i.test(url.pathname);

    if (
      url.hostname.toLowerCase() === pageHost &&
      /\b(recruitment|career|vacancy|result|admit.?card|answer.?key|syllabus|examination|exam.?calendar)\b/i.test(combined) &&
      !isPdf &&
      crawlUrls.length < MAX_PAGES
    ) {
      crawlUrls.push(url.toString());
    }

    const type = classifyNotice(combined);
    if (!type) continue;

    const date = isPdf ? parsePublicationDate(title) : null;

    // For PDF links, only accept an explicit date in the filename/title.
    // For HTML links, the date will be checked on the linked page.
    if (isPdf && (!date || !isRecentDate(date))) continue;

    if (!usefulTitle(title)) continue;

    const fingerprint = fingerprintFor(url.toString(), title);

    candidates.set(fingerprint, {
      title,
      url: url.toString(),
      content_type: type,
      fingerprint,
      publication_date: date ? date.toISOString().slice(0, 10) : "",
    });

    if (candidates.size >= MAX_CANDIDATES) break;
  }

  return {
    candidates: Array.from(candidates.values()),
    crawlUrls: [...new Set(crawlUrls)],
  };
}

export async function POST(request: Request) {
  let runId: string | null = null;
  let sourceId: string | null = null;
  let supabase: ReturnType<typeof getSupabase> | null = null;

  try {
    if (!(await authorize())) {
      return NextResponse.json(
        { success: false, error: "Admin access required." },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    sourceId = typeof body.source_id === "string" ? body.source_id : null;

    if (!sourceId) {
      return NextResponse.json(
        { success: false, error: "source_id is required." },
        { status: 400 }
      );
    }

    supabase = getSupabase();

    const { data: source, error: sourceError } = await supabase
      .from("cp_sources")
      .select("*")
      .eq("id", sourceId)
      .eq("is_active", true)
      .maybeSingle();

    if (sourceError) throw new Error(sourceError.message);
    if (!source) {
      return NextResponse.json(
        { success: false, error: "Active source not found." },
        { status: 404 }
      );
    }

    const sourceUrl = parseHttpUrl(source.official_url);
    if (!sourceUrl) throw new Error("Saved source URL is invalid.");

    const { data: run, error: runError } = await supabase
      .from("cp_import_runs")
      .insert({
        source_id: source.id,
        status: "running",
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (runError || !run) {
      throw new Error(runError?.message || "Could not create import run.");
    }

    runId = run.id;

    const firstPage = await fetchPage(sourceUrl.toString(), sourceUrl);
    if (!firstPage.html) {
      throw new Error("Source did not return an HTML page.");
    }

    const discoveredMap = new Map<string, Candidate>();
    const firstResults = discoverLinks(firstPage.html, firstPage.url);

    for (const item of firstResults.candidates) {
      discoveredMap.set(item.fingerprint, item);
    }

    const crawlList = firstResults.crawlUrls.slice(0, MAX_PAGES);
    const pageErrors: string[] = [];

    for (const pageUrl of crawlList) {
      try {
        const page = await fetchPage(pageUrl, sourceUrl);
        if (!page.html) continue;

        const results = discoverLinks(page.html, page.url);

        for (const item of results.candidates) {
          discoveredMap.set(item.fingerprint, item);
        }
      } catch (error) {
        pageErrors.push(
          `${new URL(pageUrl).pathname}: ${
            error instanceof Error ? error.message : "Page scan failed"
          }`
        );
      }
    }

    const discovered = Array.from(discoveredMap.values()).slice(0, MAX_CANDIDATES);

    const accepted: Candidate[] = [];
    let skippedNoDate = 0;
    let skippedOldDate = 0;

    for (const item of discovered) {
      try {
        const page = await fetchPage(item.url, sourceUrl);

        if (!page.html) {
          skippedNoDate++;
          continue;
        }

        const date = extractPublicationDate(page.html, item.title);

        if (!date) {
          skippedNoDate++;
          continue;
        }

        if (!isRecentDate(date)) {
          skippedOldDate++;
          continue;
        }

        accepted.push({
          ...item,
          publication_date: date.toISOString().slice(0, 10),
        });
      } catch {
        skippedNoDate++;
      }
    }

    const existingFingerprints = new Set<string>();
    const existingUrls = new Set<string>();

    for (let i = 0; i < accepted.length; i += 50) {
      const batch = accepted.slice(i, i + 50);

      const [fingerprints, urls] = await Promise.all([
        supabase
          .from("cp_import_queue")
          .select("fingerprint")
          .in("fingerprint", batch.map((item) => item.fingerprint)),
        supabase
          .from("cp_import_queue")
          .select("official_url")
          .in("official_url", batch.map((item) => item.url)),
      ]);

      if (fingerprints.error) throw new Error(fingerprints.error.message);
      if (urls.error) throw new Error(urls.error.message);

      for (const row of fingerprints.data || []) {
        if (row.fingerprint) existingFingerprints.add(row.fingerprint);
      }

      for (const row of urls.data || []) {
        if (row.official_url) existingUrls.add(row.official_url);
      }
    }

    const newItems = accepted.filter(
      (item) =>
        !existingFingerprints.has(item.fingerprint) &&
        !existingUrls.has(item.url)
    );

    let importedCount = 0;

    for (let i = 0; i < newItems.length; i += 50) {
      const batch = newItems.slice(i, i + 50);

      const rows = batch.map((item) => ({
        source_id: source.id,
        run_id: runId,
        title: item.title,
        institution_name: source.institution_name,
        content_type: item.content_type,
        official_url: item.url,
        notification_url: item.url,
        pdf_url: /\.pdf(?:$|[?#])/i.test(item.url) ? item.url : null,
        fingerprint: item.fingerprint,
        status: "pending",
        raw_content: item.title,
        extracted_data: {
          discovery_method: "official_html_crawl_date_checked",
          source_name: source.source_name,
          source_url: source.official_url,
          publication_date: item.publication_date,
          discovered_from: firstPage.url,
          discovered_at: new Date().toISOString(),
          review_required: true,
          details_extracted: false,
        },
      }));

      const { data, error } = await supabase
        .from("cp_import_queue")
        .insert(rows)
        .select("id");

      if (error) throw new Error(error.message);
      importedCount += data?.length || 0;
    }

    const finishedAt = new Date().toISOString();
    const duplicateCount = accepted.length - importedCount;
    const hasErrors = pageErrors.length > 0;

    const { error: finishError } = await supabase
      .from("cp_import_runs")
      .update({
        status: hasErrors ? "partial" : "completed",
        found_count: discovered.length,
        imported_count: importedCount,
        duplicate_count: duplicateCount,
        error_count: pageErrors.length,
        error_message: pageErrors.length ? pageErrors.join("\n").slice(0, 2000) : null,
        finished_at: finishedAt,
      })
      .eq("id", runId);

    if (finishError) throw new Error(finishError.message);

    await supabase
      .from("cp_sources")
      .update({
        last_checked_at: finishedAt,
        last_status: hasErrors ? "partial" : "completed",
        last_error: pageErrors.length ? pageErrors.join("\n").slice(0, 2000) : null,
        updated_at: finishedAt,
      })
      .eq("id", source.id);

    return NextResponse.json({
      success: true,
      message: "Official source scan completed.",
      source: source.source_name,
      run_id: runId,
      pages_scanned: 1 + crawlList.length,
      found_count: discovered.length,
      date_verified_count: accepted.length,
      imported_count: importedCount,
      duplicate_count: duplicateCount,
      skipped_no_publication_date: skippedNoDate,
      skipped_older_than_three_months: skippedOldDate,
      page_errors: pageErrors,
      note: "Only notices with a verified recent publication date are queued. All records remain pending review and are never auto-published.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected import error.";

    if (supabase && runId) {
      await supabase
        .from("cp_import_runs")
        .update({
          status: "failed",
          error_count: 1,
          error_message: message.slice(0, 2000),
          finished_at: new Date().toISOString(),
        })
        .eq("id", runId);
    }

    if (supabase && sourceId) {
      const finishedAt = new Date().toISOString();

      await supabase
        .from("cp_sources")
        .update({
          last_checked_at: finishedAt,
          last_status: "failed",
          last_error: message.slice(0, 2000),
          updated_at: finishedAt,
        })
        .eq("id", sourceId);
    }

    return NextResponse.json(
      { success: false, error: message, run_id: runId },
      { status: 500 }
    );
  }
}

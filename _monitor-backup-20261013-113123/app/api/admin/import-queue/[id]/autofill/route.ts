
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentAdmin, getCurrentUser } from "@/lib/auth/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Data = Record<string, unknown>;

const MAX_BYTES = 12 * 1024 * 1024;
const TIMEOUT_MS = 15000;

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase environment variables are missing.");
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function obj(value: unknown): Data {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Data;
  }

  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);

      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Data;
      }
    } catch {
      // Ignore invalid JSON.
    }
  }

  return {};
}

function text(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") {
    return String(value).trim();
  }

  return "";
}

function flatten(value: Data, depth = 0): Data {
  if (depth >= 5) return value;

  const nested: Data = {};

  for (const key of [
    "data",
    "content",
    "item",
    "notice",
    "result",
    "record",
    "attributes",
    "payload",
    "normalized_content",
    "content_data",
  ]) {
    Object.assign(nested, flatten(obj(value[key]), depth + 1));
  }

  return { ...nested, ...value };
}

function safePublicUrl(input: unknown): string {
  try {
    const url = new URL(text(input));

    if (!["https:", "http:"].includes(url.protocol)) return "";
    if (url.username || url.password) return "";

    const host = url.hostname.toLowerCase();

    if (
      host === "localhost" ||
      host.endsWith(".localhost") ||
      host.endsWith(".local") ||
      host === "::1" ||
      host === "0.0.0.0" ||
      host === "169.254.169.254" ||
      host.startsWith("127.") ||
      host.startsWith("10.") ||
      host.startsWith("192.168.") ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    ) {
      return "";
    }

    return url.toString();
  } catch {
    return "";
  }
}

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, number: string) =>
      String.fromCharCode(Number(number))
    )
    .replace(/&#x([0-9a-f]+);/gi, (_, number: string) =>
      String.fromCharCode(parseInt(number, 16))
    );
}

function cleanHtml(html: string): string {
  return decodeEntities(
    html
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, " ")
      .replace(/<(br|\/p|\/div|\/tr|\/li|\/h[1-6]|\/section|\/article|\/main)\b[^>]*>/gi, "\n")
      .replace(/<\/td\s*>/gi, " | ")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractMainHtml(html: string): {
  text: string;
  title: string;
  mainFound: boolean;
} {
  const title =
    html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "";

  const h1 =
    html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "";

  // Prefer a genuine article/main region over the full webpage.
  const selectors = [
    /<article\b[^>]*>([\s\S]*?)<\/article\s*>/i,
    /<main\b[^>]*>([\s\S]*?)<\/main\s*>/i,
    /<[^>]+\bid=["'](?:main-content|content|notice-content|article-content|page-content)["'][^>]*>([\s\S]*?)<\/[^>]+>/i,
    /<[^>]+\brole=["']main["'][^>]*>([\s\S]*?)<\/[^>]+>/i,
  ];

  let selected = "";

  for (const pattern of selectors) {
    const match = html.match(pattern);

    if (match?.[1] && cleanHtml(match[1]).length > 120) {
      selected = match[1];
      break;
    }
  }

  // Some government websites do not use semantic article/main tags.
  // In that case, remove common navigation and footer regions first.
  if (!selected) {
    selected = html
      .replace(/<nav\b[^>]*>[\s\S]*?<\/nav\s*>/gi, " ")
      .replace(/<header\b[^>]*>[\s\S]*?<\/header\s*>/gi, " ")
      .replace(/<footer\b[^>]*>[\s\S]*?<\/footer\s*>/gi, " ")
      .replace(/<aside\b[^>]*>[\s\S]*?<\/aside\s*>/gi, " ");
  }

  return {
    text: cleanHtml(selected),
    title: cleanHtml(h1 || title).slice(0, 300),
    mainFound: Boolean(
      selectors.some((pattern) => pattern.test(html))
    ),
  };
}

function isGenericListing(title: string, body: string): boolean {
  const normalizedTitle = title
    .toLowerCase()
    .replace(/[|–—-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const genericTitles = [
    /^advertisements?$/,
    /^notices?$/,
    /^latest news$/,
    /^news and updates$/,
    /^notifications?$/,
    /^recruitment$/,
    /^careers?$/,
    /^results?$/,
    /^tenders?$/,
    /^circulars?$/,
    /^announcements?$/,
    /^all notifications$/,
    /^all advertisements$/,
  ];

  if (genericTitles.some((pattern) => pattern.test(normalizedTitle))) {
    return true;
  }

  const genericPhrases = [
    "see our complete list of advertisements",
    "view all advertisements",
    "list of advertisements",
    "latest announcements",
    "view all notifications",
  ];

  const normalizedBody = body.toLowerCase();

  return genericPhrases.some((phrase) =>
    normalizedBody.slice(0, 1800).includes(phrase)
  );
}

function getLabeled(
  lines: string[],
  patterns: RegExp[],
  max = 1200
): string {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (!match) continue;

      const sameLine = (match[1] || "")
        .trim()
        .replace(/^[:：\-–\s]+/, "");

      if (
        sameLine &&
        !/^(details|click here|read more|view details)$/i.test(sameLine)
      ) {
        return sameLine.slice(0, max);
      }

      for (let j = i + 1; j <= Math.min(i + 2, lines.length - 1); j++) {
        const next = lines[j].trim();

        if (
          next &&
          next.length < 700 &&
          !/^(important dates|eligibility|application fee|selection process)\s*:?$/i.test(
            next
          )
        ) {
          return next.slice(0, max);
        }
      }
    }
  }

  return "";
}

const DATE =
  String.raw`(\d{1,2}[/-]\d{1,2}[/-]\d{4}|\d{4}-\d{2}-\d{2}|\d{1,2}\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4})`;

function getDate(lines: string[], patterns: RegExp[]): string {
  const found = getLabeled(lines, patterns, 500);
  return found.match(new RegExp(DATE, "i"))?.[1] || "";
}

function extractFields(
  raw: string,
  item: Data,
  flat: Data,
  mainTitle: string
): Data {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const fields: Data = {};

  const put = (key: string, value: unknown) => {
    const result = text(value);
    if (result) fields[key] = result;
  };

  put("title", text(item.title) || mainTitle || text(flat.headline));

  put(
    "organization",
    getLabeled(lines, [
      /(?:name of the )?(?:organization|organisation|department|recruiting body)\s*[:：\-–]?\s*(.*)/i,
      /विभाग\s*[:：\-–]?\s*(.*)/i,
    ])
  );

  put(
    "post_name",
    getLabeled(lines, [
      /(?:name of post|post name|name of the post|designation)\s*[:：\-–]?\s*(.*)/i,
    ])
  );

  put(
    "total_vacancies",
    getLabeled(lines, [
      /(?:total\s+)?(?:number\s+of\s+)?vacancies\s*[:：\-–]?\s*(.*)/i,
      /total\s+(?:number\s+of\s+)?posts\s*[:：\-–]?\s*(.*)/i,
      /no\.?\s+of\s+(?:posts|vacancies)\s*[:：\-–]?\s*(.*)/i,
      /कुल\s+(?:पद|रिक्तियां|रिक्तियाँ)\s*[:：\-–]?\s*(.*)/i,
    ])
  );

  put(
    "qualification",
    getLabeled(lines, [
      /(?:educational|essential|minimum) qualification\s*[:：\-–]?\s*(.*)/i,
      /eligibility criteria\s*[:：\-–]?\s*(.*)/i,
      /शैक्षणिक योग्यता\s*[:：\-–]?\s*(.*)/i,
    ])
  );

  put(
    "eligibility",
    getLabeled(lines, [/eligibility(?: criteria)?\s*[:：\-–]?\s*(.*)/i])
  );

  put(
    "age_limit",
    getLabeled(lines, [
      /(?:age limit|age criteria|age requirement)\s*[:：\-–]?\s*(.*)/i,
      /आयु सीमा\s*[:：\-–]?\s*(.*)/i,
    ])
  );

  put(
    "age_relaxation",
    getLabeled(lines, [/age relaxation\s*[:：\-–]?\s*(.*)/i])
  );

  put(
    "salary",
    getLabeled(lines, [
      /(?:salary|pay scale|pay level|remuneration)\s*[:：\-–]?\s*(.*)/i,
      /वेतन(?:मान)?\s*[:：\-–]?\s*(.*)/i,
    ])
  );

  put(
    "application_fee",
    getLabeled(lines, [
      /(?:application|examination|registration|exam) fee(?: details)?\s*[:：\-–]?\s*(.*)/i,
      /आवेदन शुल्क\s*[:：\-–]?\s*(.*)/i,
    ])
  );

  put(
    "application_start",
    getDate(lines, [
      /(?:application|registration)\s+(?:start|starting|begin)\s+date\s*[:：\-–]?\s*(.*)/i,
      /online application starts?\s*[:：\-–]?\s*(.*)/i,
      /आवेदन प्रारंभ(?: तिथि)?\s*[:：\-–]?\s*(.*)/i,
    ])
  );

  put(
    "last_date",
    getDate(lines, [
      /(?:last|closing|end) date(?: to apply| of application| for application)?\s*[:：\-–]?\s*(.*)/i,
      /application deadline\s*[:：\-–]?\s*(.*)/i,
      /आवेदन की अंतिम तिथि\s*[:：\-–]?\s*(.*)/i,
    ])
  );

  put(
    "exam_date",
    getDate(lines, [
      /(?:tentative )?exam(?:ination)? date\s*[:：\-–]?\s*(.*)/i,
      /परीक्षा तिथि\s*[:：\-–]?\s*(.*)/i,
    ])
  );

  put("result_date", getDate(lines, [/result date\s*[:：\-–]?\s*(.*)/i]));

  put(
    "admit_card_date",
    getDate(lines, [
      /(?:admit card|hall ticket) (?:release|download|available) date\s*[:：\-–]?\s*(.*)/i,
    ])
  );

  put(
    "publication_date",
    getDate(lines, [
      /(?:notification|advertisement|notice|publication) date\s*[:：\-–]?\s*(.*)/i,
      /जारी करने की तिथि\s*[:：\-–]?\s*(.*)/i,
    ])
  );

  put(
    "selection_process",
    getLabeled(lines, [
      /selection process\s*[:：\-–]?\s*(.*)/i,
      /चयन प्रक्रिया\s*[:：\-–]?\s*(.*)/i,
    ])
  );

  put("exam_pattern", getLabeled(lines, [/exam pattern\s*[:：\-–]?\s*(.*)/i]));

  put(
    "how_to_apply",
    getLabeled(lines, [
      /(?:how to apply|application procedure|apply online)\s*[:：\-–]?\s*(.*)/i,
    ], 2000)
  );

  put(
    "required_documents",
    getLabeled(lines, [
      /(?:required documents|documents required)\s*[:：\-–]?\s*(.*)/i,
    ], 1500)
  );

  put(
    "important_dates",
    getLabeled(lines, [/important dates\s*[:：\-–]?\s*(.*)/i], 1500)
  );

  put(
    "instructions",
    getLabeled(lines, [
      /(?:important instructions|general instructions)\s*[:：\-–]?\s*(.*)/i,
    ], 1500)
  );

  put(
    "job_location",
    getLabeled(lines, [
      /(?:place|location) of posting\s*[:：\-–]?\s*(.*)/i,
      /job location\s*[:：\-–]?\s*(.*)/i,
    ])
  );

  put(
    "job_type",
    getLabeled(lines, [/((?:job|employment) type)\s*[:：\-–]?\s*(.*)/i])
  );

  put("education_level", getLabeled(lines, [/education level\s*[:：\-–]?\s*(.*)/i]));
  put("duration", getLabeled(lines, [/(?:course )?duration\s*[:：\-–]?\s*(.*)/i]));
  put("fees", getLabeled(lines, [/(?:course )?fees\s*[:：\-–]?\s*(.*)/i]));
  put("career_scope", getLabeled(lines, [/career scope\s*[:：\-–]?\s*(.*)/i]));

  // Keep the main notice text, not the complete navigation-heavy webpage.
  if (raw.trim()) {
    fields.description = raw.trim().slice(0, 12000);
  }

  put("content_type", text(flat.content_type) || text(item.content_type) || text(item.item_type));
  put("category", text(flat.category) || text(flat.category_name));

  return fields;
}

async function readSource(url: string) {
  const safe = safePublicUrl(url);

  if (!safe) {
    throw new Error("Official source URL is missing or blocked.");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    let current = safe;
    let response: Response | null = null;

    for (let i = 0; i < 4; i++) {
      response = await fetch(current, {
        signal: controller.signal,
        redirect: "manual",
        cache: "no-store",
        headers: {
          "User-Agent": "CareerPortalBot/1.0 (+https://careerportal.space/)",
          Accept: "text/html,application/pdf,text/plain,*/*;q=0.5",
        },
      });

      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");

        if (!location) {
          throw new Error("Official source redirect has no destination.");
        }

        const next = safePublicUrl(new URL(location, current).toString());

        if (!next) {
          throw new Error("Official source redirected to a blocked address.");
        }

        current = next;
        continue;
      }

      break;
    }

    if (!response?.ok) {
      throw new Error(`Official source returned HTTP ${response?.status ?? "unknown"}.`);
    }

    const length = Number(response.headers.get("content-length") || 0);

    if (length > MAX_BYTES) {
      throw new Error("Source file exceeds the 12 MB limit.");
    }

    const bytes = Buffer.from(await response.arrayBuffer());

    if (bytes.length > MAX_BYTES) {
      throw new Error("Source file exceeds the 12 MB limit.");
    }

    const contentType = (response.headers.get("content-type") || "").toLowerCase();

    const isPdf =
      contentType.includes("pdf") ||
      new URL(current).pathname.toLowerCase().endsWith(".pdf") ||
      bytes.subarray(0, 5).toString() === "%PDF-";

    if (isPdf) {
      let bodyText = "";

      try {
        const pdfModule = await import("pdf-parse");

const PDFParse = pdfModule.PDFParse;

const parser = new PDFParse({
  data: new Uint8Array(bytes),
});

try {
  const parsed = await parser.getText();
  bodyText = parsed.text || "";
} finally {
  await parser.destroy();
}
      } catch {
        throw new Error(
          "PDF text extraction failed. Scanned/image PDFs need OCR; no fake data was filled."
        );
      }

      if (bodyText.trim().length < 40) {
        throw new Error(
          "This PDF has too little extractable text. It may be scanned and require OCR."
        );
      }

      return {
        url: current,
        text: bodyText.slice(0, 250000),
        title: "",
        applyUrl: "",
        isPdf: true,
        isGenericListing: false,
      };
    }

    if (
      !contentType.includes("html") &&
      !contentType.includes("text")
    ) {
      throw new Error("Source is neither a readable HTML page nor a supported PDF.");
    }

    const html = bytes.toString("utf8");
    const main = extractMainHtml(html);

    if (!main.text || main.text.length < 80) {
      throw new Error(
        "Readable notice content was not found. This page may require a different official notice URL."
      );
    }

    if (isGenericListing(main.title, main.text)) {
      throw new Error(
        "This is a general listing page, not an individual notice. Open the specific official notice or PDF and try again."
      );
    }

    let applyUrl = "";

    const anchors =
      html.match(/<a\b[^>]*href=["'][^"']+["'][^>]*>[\s\S]*?<\/a>/gi) || [];

    for (const anchor of anchors) {
      const label = cleanHtml(anchor);

      if (!/\b(apply|registration|online application)\b/i.test(label)) {
        continue;
      }

      const href = anchor.match(/href=["']([^"']+)["']/i)?.[1];

      if (!href) continue;

      const candidate = safePublicUrl(new URL(href, current).toString());

      if (candidate) {
        applyUrl = candidate;
        break;
      }
    }

    return {
      url: current,
      text: main.text.slice(0, 250000),
      title: main.title,
      applyUrl,
      isPdf: false,
      isGenericListing: false,
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const admin = await getCurrentAdmin();

    if (!user || !admin) {
      return NextResponse.json(
        { success: false, error: "Admin access required." },
        { status: 403 }
      );
    }

    const { id } = await context.params;

    if (!id || id.length > 200) {
      return NextResponse.json(
        { success: false, error: "Invalid queue record ID." },
        { status: 400 }
      );
    }

    const supabase = db();

    const { data: item, error } = await supabase
      .from("content_import_queue")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw new Error(error.message);

    if (!item) {
      return NextResponse.json(
        { success: false, error: "Import Queue record not found." },
        { status: 404 }
      );
    }

    const combined = {
      ...obj(item.raw_content),
      ...obj(item.metadata),
      ...obj(item.payload),
      ...obj(item.content_data),
      ...obj(item.normalized_content),
    };

    const flat = flatten(combined);

    const candidates = [
      item.source_url,
      flat.notification_url,
      flat.document_url,
      flat.pdf_url,
      flat.official_url,
      flat.url,
      flat.official_website,
      flat.source_homepage,
    ]
      .map(safePublicUrl)
      .filter(Boolean);

    const sourceUrl = candidates[0];

    if (!sourceUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "No readable official notice/PDF URL was found for this record.",
        },
        { status: 422 }
      );
    }

    const source = await readSource(sourceUrl);

    const fields = extractFields(
      source.text,
      item as Data,
      flat,
      source.title
    );

    if (source.applyUrl) fields.apply_url = source.applyUrl;

    const homepage = safePublicUrl(flat.official_website || flat.source_homepage);

    if (homepage) fields.official_website = homepage;

    if (
      source.isPdf ||
      new URL(source.url).pathname.toLowerCase().endsWith(".pdf")
    ) {
      fields.notification_url = source.url;
    } else if (safePublicUrl(item.source_url)) {
      fields.notification_url = safePublicUrl(item.source_url);
    }

    if (!Object.keys(fields).length) {
      return NextResponse.json(
        {
          success: false,
          error: "The source opened, but no reliable supported fields were found.",
          sourceUrl: source.url,
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      sourceUrl: source.url,
      fields,
      extractedCharacters: source.text.length,
      extractionMethod: source.isPdf ? "pdf-text" : "main-html-text",
      message:
        "Fields extracted from the source content. Review and save them before publishing.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Auto Fill failed.";

    console.error("Import Queue Auto Fill error:", message);

    return NextResponse.json(
      {
        success: false,
        error: message.includes("aborted")
          ? "Official source timed out after 15 seconds."
          : message,
      },
      { status: 500 }
    );
  }
}

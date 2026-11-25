
"use client";

import { useState } from "react";

type Props = {
  id: string;
};

type ApiResponse = {
  success?: boolean;
  fields?: Record<string, unknown>;
  message?: string;
  error?: string;
  extractedCharacters?: number;
  extractionMethod?: string;
  sourceUrl?: string;
  pdfPages?: number;
};

const aliases: Record<string, string> = {
  headline: "title",
  post_title: "title",
  name: "title",
  notice_title: "title",
  department_name: "organization",
  organisation: "organization",
  company_name: "organization",
  recruiting_organization: "organization",
  position: "post_name",
  designation: "post_name",
  post: "post_name",

  vacancies: "total_vacancies",
  total_posts: "total_vacancies",
  number_of_vacancies: "total_vacancies",
  no_of_vacancies: "total_vacancies",
  vacancy: "total_vacancies",

  educational_qualification: "qualification",
  education_qualification: "qualification",
  essential_qualification: "qualification",
  minimum_qualification: "qualification",
  age_limit: "age_limit",
  agelimit: "age_limit",
  age_relaxation: "age_relaxation",
  pay_scale: "salary",
  salary_details: "salary",
  remuneration: "salary",

  fee: "application_fee",
  exam_fee: "application_fee",
  application_fees: "application_fee",
  start_date: "application_start",
  application_start_date: "application_start",
  registration_start_date: "application_start",
  end_date: "last_date",
  last_date_to_apply: "last_date",
  lastdate: "last_date",
  application_deadline: "last_date",

  admit_card_release_date: "admit_card_date",
  admit_card_download_date: "admit_card_date",
  hall_ticket_date: "admit_card_date",
  release_date: "publication_date",

  application_url: "apply_url",
  apply_online_url: "apply_url",
  pdf_url: "notification_url",
  official_pdf_url: "notification_url",
  notification_pdf: "notification_url",
  official_url: "official_website",
  website: "official_website",
  source_url: "source_url",

  summary: "description",
  details: "description",
  body: "description",
  notice_text: "description",
  documents_required: "required_documents",

  answerkeyurl: "answer_key_url",
  admitcardurl: "admit_card_url",
  course_duration: "duration",
  course_fees: "fees",
  exam_name: "exam_name",
  exam_date: "exam_date",
  result_date: "result_date",
  publication_date: "publication_date",
  notification_date: "publication_date",
  objection_start: "objection_start_date",
  objection_last_date: "objection_last_date",
  answer_key_release_date: "answer_key_date",
  syllabus_pdf_url: "syllabus_url",
  location: "job_location",
};

function toText(value: unknown): string {
  if (typeof value === "string") return value.trim();

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map(toText).filter(Boolean).join("\n");
  }

  if (value && typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }

  return "";
}

function normalizeKey(key: string): string {
  const normalized = key
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[\s-]+/g, "_")
    .toLowerCase();

  return aliases[normalized] || normalized;
}

function normalizeOption(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function parseDate(value: string): string {
  const input = value.trim();

  const iso = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    return makeIsoDate(
      Number(iso[1]),
      Number(iso[2]),
      Number(iso[3])
    );
  }

  // DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
  const numeric = input.match(
    /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/
  );

  if (numeric) {
    return makeIsoDate(
      Number(numeric[3]),
      Number(numeric[2]),
      Number(numeric[1])
    );
  }

  const months: Record<string, number> = {
    jan: 1,
    january: 1,
    feb: 2,
    february: 2,
    mar: 3,
    march: 3,
    apr: 4,
    april: 4,
    may: 5,
    jun: 6,
    june: 6,
    jul: 7,
    july: 7,
    aug: 8,
    august: 8,
    sep: 9,
    sept: 9,
    september: 9,
    oct: 10,
    october: 10,
    nov: 11,
    november: 11,
    dec: 12,
    december: 12,
  };

  // 5 October 2026
  const dayFirst = input.match(
    /^(\d{1,2})\s+([A-Za-z]+)\s*,?\s+(\d{4})$/
  );

  if (dayFirst) {
    const month = months[dayFirst[2].toLowerCase()];
    if (!month) return "";

    return makeIsoDate(
      Number(dayFirst[3]),
      month,
      Number(dayFirst[1])
    );
  }

  // October 5, 2026
  const monthFirst = input.match(
    /^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/
  );

  if (monthFirst) {
    const month = months[monthFirst[1].toLowerCase()];
    if (!month) return "";

    return makeIsoDate(
      Number(monthFirst[3]),
      month,
      Number(monthFirst[2])
    );
  }

  return "";
}

function makeIsoDate(
  year: number,
  month: number,
  day: number
): string {
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

function dispatchChange(control: Element): void {
  control.dispatchEvent(new Event("input", { bubbles: true }));
  control.dispatchEvent(new Event("change", { bubbles: true }));
}

export default function AutoFillButton({ id }: Props) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  async function runAutoFill() {
    setLoading(true);
    setMessage("");
    setError(false);

    try {
      const response = await fetch(
        `/api/admin/import-queue/${encodeURIComponent(id)}/autofill`,
        {
          method: "POST",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
        }
      );

      const result = (await response.json().catch(() => ({}))) as ApiResponse;

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
            result.message ||
            `Auto Fill failed (HTTP ${response.status}).`
        );
      }

      const form = document.getElementById(
        "content-details-form"
      ) as HTMLFormElement | null;

      if (!form) {
        throw new Error(
          "Content Details form नहीं मिला। Page reload करके दोबारा कोशिश करें।"
        );
      }

      const fields =
        result.fields && typeof result.fields === "object"
          ? result.fields
          : {};

      const extraBox = form.elements.namedItem(
        "extra_details_json"
      ) as HTMLTextAreaElement | null;

      let extra: Record<string, unknown> = {};

      try {
        const existing = extraBox?.value.trim();
        extra = existing ? JSON.parse(existing) : {};

        if (
          !extra ||
          typeof extra !== "object" ||
          Array.isArray(extra)
        ) {
          extra = {};
        }
      } catch {
        throw new Error(
          "Extra Source Details (JSON) में invalid JSON है। पहले उसे ठीक करें या खाली करें।"
        );
      }

      let filled = 0;
      let preserved = 0;
      let unmatched = 0;

      for (const [originalKey, rawValue] of Object.entries(fields)) {
        const value = toText(rawValue);
        if (!value) continue;

        const key = normalizeKey(originalKey);

        // पूरा notice description अलग से सुरक्षित रखें।
        if (
          key === "official_notice_pdf_links" ||
          key === "source_url" ||
          key === "official_url" ||
          key === "url"
        ) {
          if (key === "official_notice_pdf_links" && !(key in extra)) {
            extra[key] = rawValue;
          }
        }

        const element = form.elements.namedItem(key);

        if (!element) {
          if (!(key in extra)) extra[key] = rawValue;
          unmatched++;
          continue;
        }

        const controls =
          element instanceof RadioNodeList
            ? Array.from(element)
            : [element];

        let didFill = false;
        let wasAlreadyFilled = false;

        for (const control of controls) {
          if (
            !(
              control instanceof HTMLInputElement ||
              control instanceof HTMLTextAreaElement ||
              control instanceof HTMLSelectElement
            )
          ) {
            continue;
          }

          // पहले से भरी हुई जानकारी को overwrite न करें।
          if (control.value.trim()) {
            wasAlreadyFilled = true;
            continue;
          }

          if (control instanceof HTMLSelectElement) {
            const target = normalizeOption(value);

            const options = Array.from(control.options).filter(
              (option) => option.value !== ""
            );

            const exact = options.find(
              (option) =>
                normalizeOption(option.value) === target ||
                normalizeOption(option.text) === target
            );

            const partial =
              exact ||
              options.find((option) => {
                const optionValue = normalizeOption(option.value);
                const optionText = normalizeOption(option.text);

                return (
                  optionValue.startsWith(target) ||
                  optionText.startsWith(target) ||
                  (target.length > 3 &&
                    (target.startsWith(optionValue) ||
                      target.startsWith(optionText)))
                );
              });

            if (partial) {
              control.value = partial.value;
              dispatchChange(control);
              didFill = true;
            } else {
              if (!(key in extra)) extra[key] = rawValue;
              unmatched++;
            }

            continue;
          }

          if (
            control instanceof HTMLInputElement &&
            control.type === "date"
          ) {
            const parsed = parseDate(value);

            if (!parsed) {
              if (!(key in extra)) extra[key] = rawValue;
              unmatched++;
              continue;
            }

            control.value = parsed;
          } else if (
            control instanceof HTMLInputElement &&
            (control.type === "checkbox" || control.type === "radio")
          ) {
            const normalized = value.toLowerCase();
            const checked = [
              "true",
              "yes",
              "1",
              "available",
              "required",
            ].includes(normalized);

            control.checked = checked;
          } else {
            control.value = value;
          }

          dispatchChange(control);
          didFill = true;
        }

        if (didFill) {
          filled++;
        } else if (wasAlreadyFilled) {
          preserved++;
        }
      }

      if (extraBox) {
        extraBox.value = JSON.stringify(extra, null, 2);
        dispatchChange(extraBox);
      }

      const method = result.extractionMethod
        ? `\nExtraction: ${result.extractionMethod}`
        : "";

      const source = result.sourceUrl
        ? `\nSource URL: ${result.sourceUrl}`
        : "";

      const pages =
        typeof result.pdfPages === "number" && result.pdfPages > 0
          ? `\nPDF pages: ${result.pdfPages}`
          : "";

      setMessage(
        `Auto Fill पूरा हुआ। ${filled} fields भरी गईं। ${preserved} पहले से भरी fields सुरक्षित रहीं। ${unmatched} जानकारी Extra Source Details में रखी गई।${method}${pages}${source}\n\nअब सभी fields जाँचें और Save Content Details दबाएँ।`
      );
    } catch (caught) {
      setError(true);
      setMessage(
        caught instanceof Error
          ? caught.message
          : "Auto Fill के दौरान अज्ञात त्रुटि हुई।"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={runAutoFill}
        disabled={loading}
        className="inline-flex items-center justify-center rounded-xl bg-blue-700 px-5 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading
          ? "Official Notice पढ़ रहा है…"
          : "Auto Fill from Official Notice / PDF"}
      </button>

      {message && (
        <p
          role="status"
          className={`mt-3 whitespace-pre-wrap break-words rounded-lg p-3 text-sm leading-6 ${
            error
              ? "border border-red-200 bg-red-50 text-red-800"
              : "border border-blue-200 bg-white text-blue-950"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}

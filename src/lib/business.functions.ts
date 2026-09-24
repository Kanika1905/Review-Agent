import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { AiError, callAiJson } from "./ai.server";
import type { Database } from "@/integrations/supabase/types";

export type ReviewQuestion = {
  id: string;
  question: string;
  keywords: string[];
};

export type BusinessRecord = {
  id: string;
  slug: string;
  website_url: string | null;
  name: string;
  logo_url: string | null;
  category: string | null;
  location: string | null;
  services: string[];
  place_id: string | null;
  review_url: string | null;
  questions: ReviewQuestion[];
  published: boolean;
};

export const REVIEW_URL_PREFIX = "https://search.google.com/local/writereview?placeid=";

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

function slugify(value: string) {
  const base = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `${base || "business"}-${Math.random().toString(36).slice(2, 7)}`;
}

function absoluteUrl(candidate: string | undefined, base: string) {
  if (!candidate) return null;
  try {
    return new URL(candidate, base).toString();
  } catch {
    return null;
  }
}

function extractFromHtml(html: string, base: string) {
  const meta = (property: string) => {
    const re = new RegExp(
      `<meta[^>]+(?:property|name)=["']${property}["'][^>]*content=["']([^"']+)["']`,
      "i",
    );
    const alt = new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${property}["']`,
      "i",
    );
    return re.exec(html)?.[1] ?? alt.exec(html)?.[1];
  };

  // Prefer larger, higher-quality touch icons over the tiny default favicon.
  const appleTouchIcon =
    /<link[^>]+rel=["']apple-touch-icon(?:-precomposed)?["'][^>]*href=["']([^"']+)["']/i.exec(
      html,
    )?.[1] ??
    /<link[^>]+href=["']([^"']+)["'][^>]*rel=["']apple-touch-icon(?:-precomposed)?["']/i.exec(
      html,
    )?.[1];

  // An <img> the page itself calls out as the logo (class/id/alt containing "logo").
  // Works regardless of file extension — .png, .jpg, .svg, .webp, etc.
  const logoImgTag =
    /<img[^>]+(?:class|id)=["'][^"']*logo[^"']*["'][^>]*src=["']([^"']+)["']/i.exec(html)?.[1] ??
    /<img[^>]+src=["']([^"']+)["'][^>]*(?:class|id)=["'][^"']*logo[^"']*["']/i.exec(html)?.[1] ??
    /<img[^>]+alt=["'][^"']*logo[^"']*["'][^>]*src=["']([^"']+)["']/i.exec(html)?.[1] ??
    /<img[^>]+src=["']([^"']+)["'][^>]*alt=["'][^"']*logo[^"']*["']/i.exec(html)?.[1];

  const linkIcon =
    /<link[^>]+rel=["'](?:icon|shortcut icon)["'][^>]*href=["']([^"']+)["']/i.exec(html)?.[1] ??
    /<link[^>]+href=["']([^"']+)["'][^>]*rel=["'](?:icon|shortcut icon)["']/i.exec(html)?.[1];


  const logo =
    absoluteUrl(meta("og:image"), base) ??
    absoluteUrl(meta("twitter:image"), base) ??
    absoluteUrl(logoImgTag, base) ??
    absoluteUrl(appleTouchIcon, base) ??
    absoluteUrl(linkIcon, base);

  const placeId =
    /placeid=([A-Za-z0-9_-]{15,})/i.exec(html)?.[1] ??
    /place_id[=:"']+\s*([A-Za-z0-9_-]{15,})/i.exec(html)?.[1] ??
    null;

  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 12000);

  const title = /<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1]?.trim() ?? "";

  return { logo, placeId, text, title, description: meta("description") ?? "" };
}

const AnalyzeInput = z.object({ url: z.string().min(4) });

type AiBusiness = {
  name: string;
  category: string;
  location: string;
  services: string[];
  questions: Array<{ question: string; keywords: string[] }>;
};

export const analyzeWebsite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AnalyzeInput.parse(input))
  .handler(async ({ data }) => {
    let target = data.url.trim();
    if (!/^https?:\/\//i.test(target)) target = `https://${target}`;

    let html = "";
    try {
      const res = await fetch(target, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; ReviewAgent/1.0)" },
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      html = await res.text();
    } catch {
      throw new Error("That website could not be opened. Check the address and try again.");
    }

    const { logo, placeId, text, title, description } = extractFromHtml(html, target);

    let ai: AiBusiness;
    try {
      ai = await callAiJson<AiBusiness>({
        system: [
          "You analyse a business website and prepare a short review questionnaire.",
          "Use ONLY facts present in the supplied page content. Never invent a name, location, service or claim.",
          "If a field is genuinely unknown, return an empty string for it.",
          "Return strict JSON with this shape:",
          '{"name":string,"category":string,"location":string,"services":string[],',
          '"questions":[{"question":string,"keywords":string[]}]}',
          "Give 3 or 4 questions, each specific to this kind of business, each with 4 to 8 short lowercase keyword options (1-3 words).",
          "Do not include an 'overall experience' question; that is added separately.",
        ].join(" "),
        user: `URL: ${target}\nTitle: ${title}\nMeta description: ${description}\n\nPage content:\n${text}`,
      });
    } catch (error) {
      if (error instanceof AiError) throw new Error(error.message);
      throw error;
    }

    const questions: ReviewQuestion[] = (ai.questions ?? [])
      .filter((q) => q?.question && Array.isArray(q.keywords))
      .slice(0, 4)
      .map((q, i) => ({
        id: `q${i + 1}`,
        question: q.question,
        keywords: q.keywords.filter(Boolean).slice(0, 8),
      }));

    return {
      website_url: target,
      name: ai.name || title,
      logo_url: logo,
      category: ai.category || "",
      location: ai.location || "",
      services: (ai.services ?? []).filter(Boolean).slice(0, 12),
      place_id: placeId,
      review_url: placeId ? `${REVIEW_URL_PREFIX}${placeId}` : "",
      questions,
    };
  });

export const listMyBusinesses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("businesses")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as BusinessRecord[];
  });

const SaveInput = z.object({
  id: z.string().uuid().optional(),
  website_url: z.string().optional().default(""),
  name: z.string().min(1, "Business name is required"),
  logo_url: z.string().optional().default(""),
  category: z.string().optional().default(""),
  location: z.string().optional().default(""),
  services: z.array(z.string()).default([]),
  place_id: z.string().optional().default(""),
  questions: z
    .array(z.object({ id: z.string(), question: z.string(), keywords: z.array(z.string()) }))
    .default([]),
  published: z.boolean().default(false),
});

export const saveBusiness = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SaveInput.parse(input))
  .handler(async ({ data, context }) => {
    const placeId = data.place_id.trim();
    if (data.published && !placeId) {
      throw new Error("A Google Place ID is needed before publishing the review page.");
    }

    const row = {
      owner_id: context.userId,
      website_url: data.website_url || null,
      name: data.name.trim(),
      logo_url: data.logo_url || null,
      category: data.category || null,
      location: data.location || null,
      services: data.services,
      place_id: placeId || null,
      review_url: placeId ? `${REVIEW_URL_PREFIX}${placeId}` : null,
      questions: data.questions,
      published: data.published,
    };

    if (data.id) {
      const { data: updated, error } = await context.supabase
        .from("businesses")
        .update(row)
        .eq("id", data.id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return updated as unknown as BusinessRecord;
    }

    const { data: inserted, error } = await context.supabase
      .from("businesses")
      .insert({ ...row, slug: slugify(row.name) })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return inserted as unknown as BusinessRecord;
  });

  const DeleteInput = z.object({ id: z.string().uuid() });

export const deleteBusiness = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => DeleteInput.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("businesses")
      .delete()
      .eq("id", data.id)
      .eq("owner_id", context.userId);
    if (error) throw new Error(error.message);
    return { id: data.id };
  });

export const getPublishedBusiness = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ slug: z.string().min(1) }).parse(input))
  .handler(async ({ data }) => {
    const { data: row, error } = await publicClient()
      .from("businesses")
      .select("id, slug, name, logo_url, category, location, services, place_id, review_url, questions")
      .eq("slug", data.slug)
      .eq("published", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (row ?? null) as unknown as Omit<BusinessRecord, "published" | "website_url"> | null;
  });

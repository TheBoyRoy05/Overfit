// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from "jsr:@supabase/supabase-js@2/cors";

function getJobBoardProvider(url: string): "workday" | "unknown" {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (
      host.includes(".myworkdayjobs.com") ||
      host.includes(".myworkdaysite.com") ||
      host.includes("workday.com")
    ) {
      return "workday";
    }
  } catch {
    /* invalid url */
  }
  return "unknown";
}

function extractFromHtml(html: string): { description: string | null; title: string | null } {
  let description: string | null = null;
  let title: string | null = null;

  // 1. Try meta tags: name="description" or property="og:description" (attribute order flexible)
  const descPatterns = [
    /<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]+content=["']([^"']*)["']/i,
    /<meta[^>]+content=["']([^"']*)["'][^>]+(?:name|property)=["'](?:description|og:description)["']/i,
  ];
  for (const re of descPatterns) {
    const m = html.match(re);
    if (m?.[1]?.trim()) {
      description = m[1].trim();
      break;
    }
  }

  const titlePatterns = [
    /<meta[^>]+(?:name|property)=["'](?:title|og:title)["'][^>]+content=["']([^"']*)["']/i,
    /<meta[^>]+content=["']([^"']*)["'][^>]+(?:name|property)=["'](?:title|og:title)["']/i,
  ];
  for (const re of titlePatterns) {
    const m = html.match(re);
    if (m?.[1]?.trim()) {
      title = m[1].trim();
      break;
    }
  }

  // 2. Fallback: JSON-LD JobPosting schema
  if (!description || !title) {
    const ldJsonMatch = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
    if (ldJsonMatch) {
      for (const block of ldJsonMatch) {
        const jsonMatch = block.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
        const jsonStr = jsonMatch?.[1]?.trim();
        if (!jsonStr) continue;
        try {
          const data = JSON.parse(jsonStr);
          const items = Array.isArray(data) ? data : data["@graph"] ? data["@graph"] : [data];
          for (const item of items) {
            if (item?.["@type"] === "JobPosting") {
              if (!description && item.description) {
                description = typeof item.description === "string" ? item.description : item.description?.[0] ?? null;
              }
              if (!title && item.title) {
                title = typeof item.title === "string" ? item.title : item.title?.[0] ?? null;
              }
              if (description && title) break;
            }
          }
        } catch {
          /* invalid JSON */
        }
      }
    }
  }

  return { description, title };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  let body: { url?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  const url = body.url?.trim();
  if (!url) {
    return new Response(
      JSON.stringify({ error: "URL is required" }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  const provider = getJobBoardProvider(url);
  if (provider === "unknown") {
    return new Response(
      JSON.stringify({ error: "Unsupported job board. Only Workday URLs are supported." }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: `Failed to fetch: ${res.status} ${res.statusText}` }),
        { status: 502, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const html = await res.text();
    const { description, title } = extractFromHtml(html);

    if (!description) {
      return new Response(
        JSON.stringify({ error: "Could not find job description on this page." }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ description, title }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch URL";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

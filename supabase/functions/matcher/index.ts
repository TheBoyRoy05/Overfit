// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import buildPrompt from "./prompt.ts";

const OPENROUTER_API = "https://openrouter.ai/api/v1/chat/completions";
const TRINITY_MODEL = "arcee-ai/trinity-large-preview:free";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { "Content-Type": "application/json" } }
    );
  }

  const apiKey = Deno.env.get("LLM_KEY");
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "LLM_KEY is not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: { job_description?: string; user_metadata?: unknown };
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { job_description: jobDescription, user_metadata: userMetadata } = body;
  if (!jobDescription || !userMetadata) {
    return new Response(
      JSON.stringify({
        error: "Missing required fields: job_description and user_metadata",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const prompt = buildPrompt(jobDescription, userMetadata as { profile?: unknown; resume?: unknown });

  try {
    const response = await fetch(OPENROUTER_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: TRINITY_MODEL,
        messages: [{ role: "user", content: prompt }],
        stream: false,
        max_tokens: 8192,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return new Response(
        JSON.stringify({
          error: "OpenRouter API error",
          details: errText,
          status: response.status,
        }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content ?? "";

    return new Response(
      JSON.stringify({ result: text }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: "Failed to call LLM",
        details: err instanceof Error ? err.message : String(err),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

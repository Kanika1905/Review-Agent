/**
 * Server-only helper for talking to the Lovable AI Gateway.
 * The API key is read at call time and never leaves the server.
 */

//const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
//const GATEWAY_URL = "https://api.groq.com/openai/v1/chat/completions";
//const MODEL = "google/gemini-3.7-flash";
//const MODEL = "openai/gpt-oss-120b";
const GATEWAY_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const MODEL = "gemini-3.5-flash-lite";

export class AiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function callAiJson<T>(args: {
  system: string;
  user: string;
  maxTokens?: number;
}): Promise<T> {
  //const key = process.env["LOVABLE_API_KEY"];
  //const key = process.env["GROQ_API_KEY"];
  const key = process.env["GEMINI_API_KEY"];
  if (!key) throw new AiError(401, "AI is not configured for this app yet.");

  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: MODEL,
      response_format: { type: "json_object" },
      max_tokens: args.maxTokens ?? 4000,
      messages: [
        { role: "system", content: args.system },
        { role: "user", content: args.user },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let message = text;
    try {
      const parsed = JSON.parse(text) as { error?: { message?: string }; message?: string };
      message = parsed.error?.message ?? parsed.message ?? text;
    } catch {
      /* keep raw text */
    }
    if (res.status === 402) {
      message = message || "AI credits are exhausted. Add credits to keep generating.";
    } else if (res.status === 429) {
      message = message || "Too many requests right now. Please try again in a moment.";
    } else if (!message) {
      message = "The AI service could not complete this request.";
    }
    throw new AiError(res.status, message);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
    };
  };
  if (data.usage) {
    console.log(
      `[ai usage] prompt=${data.usage.prompt_tokens} completion=${data.usage.completion_tokens} total_tokens=${data.usage.total_tokens}`,
    );
  }
  const content = data.choices?.[0]?.message?.content ?? "";
  const cleaned = content
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw new AiError(500, "The AI response could not be read. Please try again.");
  }
}

import { createOpenAI } from "@ai-sdk/openai";
import { APICallError, streamText } from "ai";

const MODEL = "openai/gpt-6-astra";

/** Streams a one-shot Responses call and returns parsed JSON from the final text. */
export async function askJson<T>(instructions: string, prompt: string): Promise<T> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("AI is not configured.");
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
  let text: string;
  try {
    const result = streamText({
      model: provider.responses(MODEL),
      instructions,
      messages: [{ role: "user", content: prompt }],
      providerOptions: {
        openai: {
          store: false,
          forceReasoning: true,
          reasoningEffort: "low",
          reasoningSummary: "auto",
          include: ["reasoning.encrypted_content"],
        },
      },
    });
    text = await result.text;
  } catch (e) {
    const err = APICallError.isInstance(e) ? e : (e as { cause?: unknown })?.cause;
    if (APICallError.isInstance(err)) {
      if (err.statusCode === 429) throw new Error("Too many requests right now. Please wait a moment and try again.");
      if (err.statusCode === 402) throw new Error("AI credits have run out. Add credits in your workspace billing settings.");
      if (err.statusCode === 403) throw new Error("AI access is blocked for this workspace.");
    }
    console.error(e);
    throw new Error("The AI tutor could not respond. Please try again.");
  }
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("The AI tutor returned an unexpected answer. Please try again.");
  return JSON.parse(match[0]) as T;
}

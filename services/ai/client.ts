const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-4.1-mini";

export class AiServiceUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiServiceUnavailableError";
  }
}

export function isAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

interface StructuredResponseOptions {
  systemPrompt: string;
  userInput: string;
  jsonSchema: Record<string, unknown>;
  schemaName: string;
}

/**
 * Calls the OpenAI Responses API with a strict JSON schema so the model can
 * only return data in the exact shape our domain types expect — this is what
 * keeps the "understanding" step from producing free-form, unverifiable text.
 * Throws AiServiceUnavailableError if no API key is configured; callers are
 * expected to fall back to a deterministic path rather than block the user.
 */
export async function requestStructuredCompletion<T>(
  options: StructuredResponseOptions,
): Promise<T> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new AiServiceUnavailableError("OPENAI_API_KEY is not configured.");
  }

  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? DEFAULT_MODEL,
      input: [
        { role: "system", content: options.systemPrompt },
        { role: "user", content: options.userInput },
      ],
      text: {
        format: {
          type: "json_schema",
          name: options.schemaName,
          strict: true,
          schema: options.jsonSchema,
        },
      },
    }),
  });

  if (!response.ok) {
    throw new AiServiceUnavailableError(
      `OpenAI request failed with status ${response.status}.`,
    );
  }

  const data = (await response.json()) as {
    output_text?: string;
    output?: Array<{ content?: Array<{ text?: string }> }>;
  };

  const rawText =
    data.output_text ?? data.output?.[0]?.content?.[0]?.text ?? null;

  if (!rawText) {
    throw new AiServiceUnavailableError("OpenAI response did not include text output.");
  }

  return JSON.parse(rawText) as T;
}

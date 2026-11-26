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
  // Any OpenAI-compatible provider (Mistral, Gemini, Groq, a local Ollama …) works by setting OPENAI_BASE_URL.
  const baseUrl = process.env.OPENAI_BASE_URL?.replace(/\/+$/, "");
  if (baseUrl) return requestChatCompletion<T>(options, apiKey, baseUrl);

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

/**
 * Chat-completions flavour used by OpenAI-compatible providers. Asks for strict
 * JSON-schema output and, if the provider rejects that, retries in plain JSON
 * mode with the schema spelled out in the prompt.
 */
async function requestChatCompletion<T>(
  options: StructuredResponseOptions,
  apiKey: string,
  baseUrl: string,
): Promise<T> {
  const model = process.env.OPENAI_MODEL ?? DEFAULT_MODEL;
  const call = (responseFormat: Record<string, unknown>, system: string) =>
    fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: options.userInput },
        ],
        response_format: responseFormat,
      }),
    });

  let response = await call(
    {
      type: "json_schema",
      json_schema: { name: options.schemaName, strict: true, schema: options.jsonSchema },
    },
    options.systemPrompt,
  );
  if (response.status === 400 || response.status === 422) {
    response = await call(
      { type: "json_object" },
      `${options.systemPrompt}\n\nReturn ONLY a JSON object that matches this JSON schema, with no other text:\n${JSON.stringify(options.jsonSchema)}`,
    );
  }
  if (!response.ok) {
    throw new AiServiceUnavailableError(`AI provider request failed with status ${response.status}.`);
  }
  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new AiServiceUnavailableError("AI provider response had no content.");
  return JSON.parse(text) as T;
}

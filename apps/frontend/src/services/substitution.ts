/**
 * Groq-powered ingredient substitution. Uses same API key as recipe generation.
 */

const GROQ_MODEL = 'llama-3.1-8b-instant';
const MAX_TOKENS = 150;

export interface SubstitutionResult {
  substitute: string;
  reason: string;
}

export async function fetchSubstitution(
  recipeName: string,
  ingredientName: string
): Promise<SubstitutionResult | null> {
  const apiKey = import.meta.env['VITE_GROQ_API_KEY'] as string | undefined;
  if (!apiKey) return null;

  const prompt = `You are a cooking assistant. The user is making ${recipeName} but is missing ${ingredientName}.
Suggest ONE ingredient substitute. Reply ONLY with a JSON object, no markdown:
{"substitute": "name", "reason": "one sentence why it works"}`;

  const url = 'https://api.groq.com/openai/v1/chat/completions';
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          {
            role: 'system',
            content: 'Reply only with valid JSON. No markdown, no code fences.',
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: MAX_TOKENS,
        temperature: 0.4,
        response_format: { type: 'json_object' as const },
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return null;
    const parsed = JSON.parse(content) as unknown;
    if (
      !parsed ||
      typeof (parsed as SubstitutionResult).substitute !== 'string' ||
      typeof (parsed as SubstitutionResult).reason !== 'string'
    ) {
      return null;
    }
    return parsed as SubstitutionResult;
  } catch {
    return null;
  }
}

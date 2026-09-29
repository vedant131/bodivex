// AI fitness blueprint. Plain Web-standard handler (Request -> Response): runs on Supabase
// Edge Functions (Deno) today and ports to any serverless runtime.
// Talks to any OpenAI-compatible chat API, so the model is swappable without code changes:
//   AI_BASE_URL  e.g. http://host.docker.internal:11434/v1 (Ollama, open models) or any hosted provider
//   AI_API_KEY   provider key (blank for Ollama)
//   AI_MODEL     e.g. llama3.1 / qwen2.5
// Not configured → { blueprint: null } and the app uses its built-in plan.

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const reply = (body: unknown) => new Response(JSON.stringify(body), { headers: { ...cors, 'Content-Type': 'application/json' } });

  const base = Deno.env.get('AI_BASE_URL');
  const model = Deno.env.get('AI_MODEL');
  if (!base || !model) return reply({ blueprint: null });

  const { age, gender, weight, height, fitnessLevel, goals } = await req.json().catch(() => ({}));
  const prompt = `You are a fitness advisor for an Indian personal-trainer marketplace.
User: age ${Number(age)}, ${String(gender)}, ${Number(weight)}kg, ${Number(height)}cm, level ${String(fitnessLevel)}.
Goals: ${(Array.isArray(goals) ? goals : []).map(String).join(', ')}.
Return ONLY JSON: {"trainerType": string, "recommendedStyle": string, "estimatedTimeline": string,
"additionalNotes": string, "recommendedFilters": {"specializations": string[], "sessionPreference": "online"|"offline"|"both", "minExperience": number}}`;

  try {
    const key = Deno.env.get('AI_API_KEY');
    const res = await fetch(`${base.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(key && { Authorization: `Bearer ${key}` }) },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const text = (await res.json()).choices?.[0]?.message?.content;
    return reply({ blueprint: text ? JSON.parse(text) : null });
  } catch (e) {
    console.warn('AI failed, client will use fallback', (e as Error).message);
    return reply({ blueprint: null });
  }
});

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface GatewayRequest {
  provider: {
    id: string;
    baseUrl: string;
    model: string;
    authKind: string;
  };
  credential: string;
  customBaseUrl?: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body: GatewayRequest = await req.json();

    if (!body.credential) {
      return new Response(JSON.stringify({ error: "No credential provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return new Response(JSON.stringify({ error: "No messages provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const baseUrl = body.customBaseUrl || body.provider.baseUrl;
    const model = body.provider.model;
    const credential = body.credential;
    const providerId = body.provider.id;

    // Route to the correct provider endpoint
    const result = await routeToProvider(providerId, baseUrl, model, credential, body);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message.includes("401") || message.includes("403") ? 401
      : message.includes("429") ? 429
      : message.includes("500") || message.includes("502") || message.includes("503") ? 502
      : 500;

    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function routeToProvider(
  providerId: string,
  baseUrl: string,
  model: string,
  credential: string,
  body: GatewayRequest,
): Promise<{ content: string; model: string; provider: string }> {
  // Most providers are OpenAI-compatible — use /chat/completions
  const openaiCompatible = new Set([
    "openai-key", "openai-login", "openrouter", "groq", "deepseek", "mistral",
    "together-ai", "fireworks", "deepinfra", "nebius", "baseten", "chutes",
    "nvidia-nim", "hugging-face", "scaleway", "302-ai", "cortecs",
    "openai-compatible", "xai-grok", "perplexity", "cerebras",
    "kimi-moonshot", "moonshot-ai", "zai-glm", "minimax",
  ]);

  if (openaiCompatible.has(providerId)) {
    return await callOpenAICompatible(baseUrl, model, credential, body);
  }

  // Anthropic uses a different API shape
  if (providerId === "anthropic-key" || providerId === "anthropic-login") {
    return await callAnthropic(baseUrl, model, credential, body);
  }

  // Gemini uses a different API shape
  if (providerId === "gemini-key" || providerId === "gemini-login") {
    return await callGemini(baseUrl, model, credential, body);
  }

  // Antigravity — assume OpenAI-compatible
  if (providerId === "antigravity-login") {
    return await callOpenAICompatible(baseUrl, model, credential, body);
  }

  // Fallback: try OpenAI-compatible
  return await callOpenAICompatible(baseUrl, model, credential, body);
}

async function callOpenAICompatible(
  baseUrl: string,
  model: string,
  credential: string,
  body: GatewayRequest,
): Promise<{ content: string; model: string; provider: string }> {
  const url = `${baseUrl.replace(/\/$/, "")}/chat/completions`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${credential}`,
  };

  // OpenRouter requires these headers
  if (body.provider.id === "openrouter") {
    headers["HTTP-Referer"] = "https://hooke.app";
    headers["X-Title"] = "Hooke";
  }

  const payload: Record<string, unknown> = {
    model,
    messages: body.messages,
    temperature: body.temperature ?? 0.7,
    max_tokens: body.maxTokens ?? 2048,
  };

  const resp = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`${resp.status}: ${errText}`);
  }

  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content ?? "";

  return { content, model: data.model ?? model, provider: body.provider.id };
}

async function callAnthropic(
  baseUrl: string,
  model: string,
  credential: string,
  body: GatewayRequest,
): Promise<{ content: string; model: string; provider: string }> {
  const url = `${baseUrl.replace(/\/$/, "")}/messages`;

  // Anthropic separates system prompt from messages
  const systemMsg = body.messages.find((m) => m.role === "system");
  const chatMessages = body.messages.filter((m) => m.role !== "system");

  const payload: Record<string, unknown> = {
    model,
    max_tokens: body.maxTokens ?? 2048,
    messages: chatMessages.map((m) => ({ role: m.role, content: m.content })),
  };
  if (systemMsg) payload.system = systemMsg.content;

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": credential,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`${resp.status}: ${errText}`);
  }

  const data = await resp.json();
  const content = data.content?.[0]?.text ?? "";

  return { content, model, provider: body.provider.id };
}

async function callGemini(
  baseUrl: string,
  model: string,
  credential: string,
  body: GatewayRequest,
): Promise<{ content: string; model: string; provider: string }> {
  const url = `${baseUrl.replace(/\/$/, "")}/v1beta/models/${model}:generateContent?key=${credential}`;

  const systemMsg = body.messages.find((m) => m.role === "system");
  const chatMessages = body.messages.filter((m) => m.role !== "system");

  const payload: Record<string, unknown> = {
    contents: chatMessages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
    generationConfig: {
      temperature: body.temperature ?? 0.7,
      maxOutputTokens: body.maxTokens ?? 2048,
    },
  };
  if (systemMsg) {
    payload.systemInstruction = { parts: [{ text: systemMsg.content }] };
  }

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`${resp.status}: ${errText}`);
  }

  const data = await resp.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  return { content, model, provider: body.provider.id };
}

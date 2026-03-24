// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Cleexe Edge Function: ai-proxy
// Routes AI requests to Claude, Grok, or Flux based on model parameter.
// API keys stay server-side — client only needs Supabase auth.
// Flux is served through the xAI (Grok) API.
//
// Deploy: supabase functions deploy ai-proxy
// Secrets:
//   supabase secrets set CLAUDE_API_KEY=sk-ant-...
//   supabase secrets set GROK_API_KEY=xai-...
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Accept both naming conventions for backward compat
const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY') || Deno.env.get('ANTHROPIC_API_KEY') || '';
const GROK_API_KEY = Deno.env.get('GROK_API_KEY') || Deno.env.get('XAI_API_KEY') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

interface RequestBody {
  model: 'claude-4-opus' | 'grok-4' | 'flux-1';
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  task?: string;
}

const ENDPOINTS = {
  claude: 'https://api.anthropic.com/v1/messages',
  grok:   'https://api.x.ai/v1/chat/completions',
  // Flux served through xAI — same endpoint, different model param
};

const MODEL_ENDPOINTS: Record<string, string> = {
  'claude-4-opus': ENDPOINTS.claude,
  'grok-4':        ENDPOINTS.grok,
  'flux-1':        ENDPOINTS.grok,  // Flux via Grok/xAI
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ── Rate limiting per user (in-memory, resets on cold start) ────────────────

const userBuckets: Record<string, { count: number; resetAt: number }> = {};
const USER_RATE_LIMIT = 30;
const USER_RATE_WINDOW_MS = 60_000;

function checkUserRate(userId: string): boolean {
  const now = Date.now();
  const bucket = userBuckets[userId];

  if (!bucket || now > bucket.resetAt) {
    userBuckets[userId] = { count: 1, resetAt: now + USER_RATE_WINDOW_MS };
    return true;
  }

  if (bucket.count >= USER_RATE_LIMIT) return false;
  bucket.count++;
  return true;
}

// ── Provider-specific request builders ──────────────────────────────────────

async function callClaude(body: RequestBody): Promise<string> {
  if (!CLAUDE_API_KEY) throw new Error('CLAUDE_API_KEY not set — run: supabase secrets set CLAUDE_API_KEY=sk-ant-...');

  const res = await fetch(ENDPOINTS.claude, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: body.maxTokens || 500,
      temperature: body.temperature ?? 0.7,
      system: body.systemPrompt || 'You are a supportive personal growth coach for the Cleexe app. Be concise, warm, and actionable.',
      messages: [{ role: 'user', content: body.prompt }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => 'unknown');
    throw new Error(`Claude API ${res.status}: ${errText}`);
  }

  const data = await res.json();
  return data.content?.[0]?.text || '';
}

async function callGrok(body: RequestBody, modelOverride?: string): Promise<string> {
  if (!GROK_API_KEY) throw new Error('GROK_API_KEY not set — run: supabase secrets set GROK_API_KEY=xai-...');

  const res = await fetch(ENDPOINTS.grok, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROK_API_KEY}`,
    },
    body: JSON.stringify({
      model: modelOverride || 'grok-4',
      max_tokens: body.maxTokens || 500,
      temperature: body.temperature ?? 0.8,
      messages: [
        {
          role: 'system',
          content: body.systemPrompt || 'You are a witty, brutally honest growth coach for the Cleexe app. Be funny but motivational.',
        },
        { role: 'user', content: body.prompt },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => 'unknown');
    throw new Error(`${modelOverride || 'Grok'} API ${res.status}: ${errText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

async function callFlux(body: RequestBody): Promise<string> {
  // Flux is served through xAI's API with the flux-1 model identifier
  return callGrok(body, 'flux-1');
}

// ── Main handler ────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return jsonResponse({ error: 'Missing authorization' }, 401);

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return jsonResponse({ error: 'Unauthorized' }, 401);

    // Rate limit
    if (!checkUserRate(user.id)) {
      return jsonResponse({ error: 'Rate limit exceeded. Try again in a minute.' }, 429);
    }

    // Parse body
    const body = (await req.json()) as RequestBody;
    const { model, prompt } = body;

    if (!prompt || typeof prompt !== 'string') {
      return jsonResponse({ error: 'prompt is required' }, 400);
    }

    if (!model || !MODEL_ENDPOINTS[model]) {
      return jsonResponse({ error: `Invalid model. Use: ${Object.keys(MODEL_ENDPOINTS).join(', ')}` }, 400);
    }

    // Route to provider
    let content: string;
    const started = Date.now();

    switch (model) {
      case 'claude-4-opus':
        content = await callClaude(body);
        break;
      case 'grok-4':
        content = await callGrok(body);
        break;
      case 'flux-1':
        content = await callFlux(body);
        break;
      default:
        return jsonResponse({ error: 'Unknown model' }, 400);
    }

    const elapsed = Date.now() - started;

    // Log usage for billing/analytics
    try {
      await supabase.from('ai_usage').insert({
        user_id: user.id,
        model,
        task: body.task || 'direct',
        prompt_chars: prompt.length,
        response_chars: content.length,
        latency_ms: elapsed,
      });
    } catch (_e) {
      // ai_usage table may not exist yet — non-critical
    }

    return jsonResponse({
      content,
      model,
      task: body.task || 'direct',
      latency_ms: elapsed,
    });
  } catch (err) {
    console.error('[ai-proxy] Error:', err);
    const message = err instanceof Error ? err.message : String(err);

    const isProviderError = message.includes('API') && /4\d\d|5\d\d/.test(message);

    return jsonResponse(
      { error: isProviderError ? 'AI provider temporarily unavailable' : message },
      isProviderError ? 502 : 500
    );
  }
});

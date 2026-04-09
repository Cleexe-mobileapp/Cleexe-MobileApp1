// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Cleexe Edge Function: grok-center
// Sends the user's 12 onboarding answers + current profile to Grok and returns
// a structured JSON update for the Growth Journey screen.
//
// Deploy:  supabase functions deploy grok-center
// Secret:  supabase secrets set GROK_API_KEY=xai-...
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GROK_API_KEY = Deno.env.get('GROK_API_KEY') || Deno.env.get('XAI_API_KEY') || '';
const GROK_ENDPOINT = 'https://api.x.ai/v1/chat/completions';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const SYSTEM_PROMPT = `You are Grok, a wise, encouraging life transformation coach for the Cleexe app.
You receive a user's 12 onboarding answers, their current profile, and recent activity data.

Generate a JSON response with EXACTLY this shape (no markdown, no backticks, only raw JSON):
{
  "positivityScore": <number 0-100>,
  "focusArea": "<string — the user's primary focus area>",
  "insight": "<1-2 sentence warm motivational message>",
  "progressBoost": [<number>, <number>, <number>],
  "streak": <number>,
  "consistency": <number 0-100>,
  "suggestedMicroSteps": ["<step1>", "<step2>"]
}

Rules:
- progressBoost is an array of integers (5-30) — one per active goal, representing how many % to add.
- suggestedMicroSteps: 2 short, specific, actionable tips the user can do today.
- Keep tone warm, realistic, and culturally sensitive (family, balance, community).
- If data is sparse, make reasonable assumptions and still return valid JSON.
- Output ONLY valid JSON. No explanation, no markdown.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing authorization' }, 401);

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return json({ error: 'Unauthorized' }, 401);

    // Parse body
    const { onboardingAnswers, currentProfile, recentCheckIns } = await req.json();

    const userPrompt = `
User's 12 onboarding answers: ${JSON.stringify(onboardingAnswers || {})}
Current profile: ${JSON.stringify(currentProfile || {})}
Recent check-ins: ${JSON.stringify(recentCheckIns || [])}

Generate the personalized Growth Journey update JSON now.`;

    if (!GROK_API_KEY) {
      // No API key — return smart fallback so the app still works
      console.warn('[grok-center] GROK_API_KEY not set, returning fallback');
      return json({
        positivityScore: (currentProfile?.positivityScore ?? 10) + 5,
        focusArea: currentProfile?.focusArea || 'Mindfulness',
        progressBoost: [15 + Math.floor(Math.random() * 15), 10 + Math.floor(Math.random() * 20), 12 + Math.floor(Math.random() * 18)],
        insight: "You're building strong momentum. Small consistent steps create big transformations.",
        streak: (currentProfile?.streak ?? 0) + 1,
        consistency: currentProfile?.consistency ?? 89,
        suggestedMicroSteps: ['Add one 5-minute breathing break today', "Review your 'why' from onboarding"],
      });
    }

    // Call Grok
    const started = Date.now();

    const grokRes = await fetch(GROK_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'grok-4',
        max_tokens: 800,
        temperature: 0.7,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!grokRes.ok) {
      const errText = await grokRes.text().catch(() => 'unknown');
      console.error(`[grok-center] Grok API ${grokRes.status}: ${errText}`);
      throw new Error(`Grok API ${grokRes.status}`);
    }

    const grokData = await grokRes.json();
    const raw = grokData.choices?.[0]?.message?.content || '';
    const elapsed = Date.now() - started;

    // Parse the AI response — strip any accidental markdown fences
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    let aiResponse: Record<string, unknown>;

    try {
      aiResponse = JSON.parse(cleaned);
    } catch {
      console.error('[grok-center] Failed to parse Grok response:', raw);
      aiResponse = {
        positivityScore: (currentProfile?.positivityScore ?? 10) + 5,
        focusArea: currentProfile?.focusArea || 'Mindfulness',
        progressBoost: [20, 25, 15],
        insight: raw.slice(0, 200) || "You're on the right track — keep pushing!",
        streak: (currentProfile?.streak ?? 0) + 1,
        consistency: currentProfile?.consistency ?? 89,
        suggestedMicroSteps: ['Focus on your highest-streak habit first', 'Take a short walk after lunch'],
      };
    }

    // Log usage (non-critical)
    try {
      await supabase.from('ai_usage').insert({
        user_id: user.id,
        model: 'grok-4',
        task: 'grok-center',
        prompt_chars: userPrompt.length,
        response_chars: raw.length,
        latency_ms: elapsed,
      });
    } catch {
      // table may not exist yet
    }

    return json(aiResponse);
  } catch (err) {
    console.error('[grok-center] Error:', err);

    // Always return a usable fallback
    return json({
      positivityScore: 15,
      focusArea: 'Mindfulness',
      progressBoost: [20, 25, 15],
      insight: "You're building strong momentum. Small consistent steps create big transformations.",
      streak: 1,
      consistency: 89,
      suggestedMicroSteps: ['Start with your easiest habit first tomorrow morning', "Review your 'why' from onboarding"],
    });
  }
});

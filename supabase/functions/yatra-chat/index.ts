import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')!;
const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { message, history } = await req.json();

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Invalid message' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // ── STEP 1: Embed the user's question ──
    const embedRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'models/gemini-embedding-001',
          content: { parts: [{ text: message }] },
        }),
      }
    );
    const embedData = await embedRes.json();
    const queryEmbedding = embedData.embedding?.values;

    // ── STEP 2: Vector search in knowledge_base ──
    let dbContext = '';
    let sourceType = 'general';

    if (queryEmbedding) {
      const { data: matches } = await supabase.rpc('match_knowledge', {
        query_embedding: queryEmbedding,
        match_count: 5,
        match_threshold: 0.55,
      });

      if (matches && matches.length > 0) {
        sourceType = 'database';
        dbContext = matches
          .map((m: any) => m.content)
          .join('\n\n');
      }
    }

    // ── STEP 3: Build the system prompt ──
    const systemPrompt = `You are Yatra Assistant, a helpful AI travel guide for BharatYatra — an India tourism platform.

YOUR SCOPE:
- You ONLY answer questions related to India travel, tourism, destinations, culture, food, accommodation, events, medical tourism in India, transportation, visa, safety, and BharatYatra platform.
- If a user asks ANYTHING outside this scope (e.g. coding, math, politics, celebrities, other countries unrelated to India travel comparison, general chat), respond with: "I'm Yatra Assistant, your India travel guide. I can only help with questions about travelling in India or using BharatYatra. Could I help you plan a trip or find a destination instead?"
- Do not break this rule even if the user insists.

ANSWERING STYLE:
- Be warm, helpful, and knowledgeable.
- Keep answers concise but complete — no unnecessary padding.
- Use bullet points only when listing multiple items (e.g. attractions, tips).
- Always be specific — mention names, prices, times when available.
- Distances, prices, and timings from the database are accurate for BharatYatra's listed destinations.

SOURCE CONTEXT:
${dbContext
  ? `The following information comes from the BharatYatra database and is highly relevant to the user's question. Prioritise this information in your answer:\n\n${dbContext}\n\nIf this database context fully answers the question, start your answer with the token [SOURCE:DATABASE]. If you need to supplement with general knowledge, start with [SOURCE:DATABASE] anyway.`
  : `No specific database records matched this query. Answer from your general India travel knowledge. Start your answer with the token [SOURCE:GENERAL].`
}

IMPORTANT: Always start your response with either [SOURCE:DATABASE] or [SOURCE:GENERAL] — this token will be stripped before showing to the user and used to display the correct source badge. Never mention this token to the user.`;

    // ── STEP 4: Call Groq with streaming ──
    const groqMessages = [
      { role: 'system', content: systemPrompt },
      ...(history || []).map((msg: any) => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content,
      })),
      { role: 'user', content: message },
    ];

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: groqMessages,
        max_tokens: 800,
        temperature: 0.7,
        stream: true,
      }),
    });

    // ── STEP 5: Stream Groq response back to frontend ──
    const stream = new ReadableStream({
      async start(controller) {
        const reader = groqRes.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let sourceDetected = false;
        let preambleBuffer = '';
        let preambleComplete = false;

        const sendSource = (source: string) => {
          controller.enqueue(new TextEncoder().encode(
            `data: ${JSON.stringify({ type: 'source', source })}\n\n`
          ));
        };

        const sendText = (text: string) => {
          if (text) {
            controller.enqueue(new TextEncoder().encode(
              `data: ${JSON.stringify({ type: 'text', text })}\n\n`
            ));
          }
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed === 'data: [DONE]') continue;
            if (!trimmed.startsWith('data: ')) continue;

            try {
              const parsed = JSON.parse(trimmed.slice(6));
              const text = parsed?.choices?.[0]?.delta?.content || '';

              if (!text) continue;

              // Buffer until we have enough to detect the source token
              if (!preambleComplete) {
                preambleBuffer += text;

                // Wait until buffer has at least 20 chars or contains a token
                if (preambleBuffer.length < 20 &&
                    !preambleBuffer.includes('[SOURCE:DATABASE]') &&
                    !preambleBuffer.includes('[SOURCE:GENERAL]')) {
                  continue;
                }

                preambleComplete = true;

                if (preambleBuffer.includes('[SOURCE:DATABASE]')) {
                  sendSource('database');
                  const cleaned = preambleBuffer.replace('[SOURCE:DATABASE]', '').trimStart();
                  sendText(cleaned);
                } else if (preambleBuffer.includes('[SOURCE:GENERAL]')) {
                  sendSource('general');
                  const cleaned = preambleBuffer.replace('[SOURCE:GENERAL]', '').trimStart();
                  sendText(cleaned);
                } else {
                  // No token found — use server-side detection as fallback
                  sendSource(sourceType);
                  sendText(preambleBuffer);
                }

                continue;
              }

              // Normal streaming after preamble is resolved
              sendText(text);

            } catch {
              // skip malformed chunks
            }
          }
        }

        // Flush any remaining preamble buffer if stream ended early
        if (!preambleComplete && preambleBuffer) {
          sendSource(sourceType);
          const cleaned = preambleBuffer
            .replace('[SOURCE:DATABASE]', '')
            .replace('[SOURCE:GENERAL]', '')
            .trimStart();
          sendText(cleaned);
        }

        controller.enqueue(new TextEncoder().encode(
          `data: ${JSON.stringify({ type: 'done' })}\n\n`
        ));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    });

  } catch (err) {
    console.error('Edge function error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
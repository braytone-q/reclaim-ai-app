import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  let body;
  try {
    body = await req.json();
  } catch (_) {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const messageRaw = body?.message;
  if (!messageRaw || typeof messageRaw !== "string") {
    return new Response(JSON.stringify({ error: "Message is required." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const message = messageRaw.toLowerCase();

  const responses: Record<string, string> = {
    hello: "Hello there! How can I assist you with your case today?",
    hi: "Hello there! How can I assist you with your case today?",
    "digital safety":
      "Digital safety is crucial. I can guide you to our resources on securing your accounts, identifying scams, and protecting your privacy.",
    "legal rights":
      "Understanding your legal rights is key. I can point you to information about digital evidence and harassment reporting.",
    evidence:
      "Collecting evidence properly is vital. I can show you how to preserve valid digital evidence.",
    thanks:
      "You're welcome! Let me know if there’s anything else I can support you with.",
    "thank you":
      "You're welcome! Let me know if there’s anything else I can support you with.",
  };

  let reply = "I'm not sure how to answer that yet. Try keywords like: digital safety, legal rights, or evidence.";

  for (const key in responses) {
    if (message.includes(key)) {
      reply = responses[key];
      break;
    }
  }

  return new Response(JSON.stringify({ reply }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

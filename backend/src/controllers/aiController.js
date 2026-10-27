import { z } from "zod";
import env from "../config/env.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { answerLocally, assistantReplies } from "../services/assistant.js";

export const chatSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string().max(4000),
      }),
    )
    .max(40)
    .default([]),
  homeData: z.record(z.unknown()).optional(),
  userRole: z.string().max(30).optional(),
});

const SYSTEM_PROMPT = `You are E-wange AI, a smart home assistant made by Elonda. Execute commands instantly and give clear, helpful responses. If asked who made you or who created you, always say you were made by Elonda.

RULES:
- NEVER ask confirmation. Execute immediately.
- Keep responses between 30-50 words - not too short, not too long.
- Use one or two emojis per response naturally.
- For device commands, include the ACTION block and a friendly confirmation with brief context.
- For status queries, give the reading with a short helpful comment.
- Be conversational but concise. No unnecessary filler.
- No follow-up questions.

DEVICE CONTROL (append to response):
:::ACTION:::{"key":"<firebase_key>","value":"<new_value>"}:::END:::

Keys & values:
- lamp: "ON"/"OFF"
- fan: "ON"/"OFF"
- curtains: "Open"/"Closed"/"Partial"
- water_pump: "ON"/"OFF"
- parking_gate: "Open"/"Closed"
- buzzer: "ON"/"OFF"

ROLE ACCESS:
- Admin: can control devices
- Viewer: status queries only, refuse control politely`;

const RATE_LIMIT_MESSAGE = "⏳ I'm getting a lot of requests right now. Please give me a moment and try again.";
const ERROR_MESSAGE =
  "⚠️ I couldn't reach my language model just now, but I can still run commands and read sensors. Try “status” or “turn on the lamp”.";

function buildContext(homeData = {}, userRole = "viewer") {
  const door = homeData.main_door || {};

  return `CURRENT HOME STATE:
- Main Door: ${door.door_state || "—"} (Access: ${door.access || "—"}, User: ${door.user_name || "—"})
- Lamp: ${homeData.lamp || "—"}
- Fan: ${homeData.fan || "—"}
- Curtains: ${homeData.curtains || "—"}
- Temperature: ${homeData.temperature || 0}°C
- Humidity: ${homeData.humidity || 0}%
- Gas Sensor: ${homeData.gas || "—"}
- Parking Gate: ${homeData.parking?.gate || homeData.parking_gate || "—"}
- Buzzer: ${homeData.buzzer || "—"}

USER ROLE: ${userRole}
${
  userRole !== "admin"
    ? "NOTE: This user is a VIEWER and cannot control devices. Only answer status queries."
    : "This user is an ADMIN and can control devices."
}`;
}

function startStream(res) {
  res.status(200);
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();
}

/** Sends one assistant message in the SSE shape the chat widget expects. */
function streamText(res, text) {
  startStream(res);
  res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`);
  res.write("data: [DONE]\n\n");
  res.end();
}

function sseChunk(content) {
  return `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`;
}

/**
 * Chat assistant endpoint.
 *
 * 1. Local intent engine → instant device control and sensor answers.
 * 2. Optional OpenAI-compatible LLM for open-ended questions.
 * 3. Always responds with a stream (never a hard error), so the widget keeps
 *    working when the provider is missing, rate limited or offline.
 */
export const chat = asyncHandler(async (req, res) => {
  const { messages = [], homeData, userRole = "viewer" } = req.body;

  const local = answerLocally({ messages, homeData, userRole });
  if (local) {
    return streamText(res, local.text);
  }

  if (!env.aiApiKey) {
    return streamText(res, assistantReplies.FALLBACK);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  let upstream;
  try {
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.aiApiKey}`,
    };

    // OpenRouter uses these for app attribution (optional, but recommended).
    if (env.aiApiBase.includes("openrouter.ai")) {
      headers["HTTP-Referer"] = env.clientOrigin[0] || "http://localhost:8080";
      headers["X-Title"] = "E-wange";
    }

    upstream = await fetch(`${env.aiApiBase}/chat/completions`, {
      method: "POST",
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        model: env.aiModel,
        stream: true,
        temperature: 0.5,
        max_tokens: 400,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "system", content: buildContext(homeData, userRole) },
          ...messages.slice(-12),
        ],
      }),
    });
  } catch (error) {
    console.error("[ai] provider unreachable:", error.message);
    return streamText(res, ERROR_MESSAGE);
  } finally {
    clearTimeout(timeout);
  }

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => "");
    console.error("[ai] provider error:", upstream.status, detail.slice(0, 300));

    if (upstream.status === 429) {
      return streamText(res, RATE_LIMIT_MESSAGE);
    }

    return streamText(res, ERROR_MESSAGE);
  }

  startStream(res);

  let cancelled = false;
  req.on("close", () => {
    cancelled = true;
  });

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  let wrote = false;

  try {
    while (!cancelled) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      if (chunk) {
        wrote = true;
        res.write(chunk);
      }
    }
  } catch (error) {
    console.error("[ai] stream interrupted:", error.message);
  } finally {
    reader.cancel().catch(() => {});
  }

  if (!cancelled) {
    if (!wrote) res.write(sseChunk(ERROR_MESSAGE));
    if (!res.writableEnded) {
      res.write("data: [DONE]\n\n");
      res.end();
    }
  }
});

export default { chat };

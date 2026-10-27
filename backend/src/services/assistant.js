/**
 * Local intent engine for the dashboard assistant.
 *
 * Runs before any external LLM so device commands and sensor questions are
 * answered instantly, deterministically and without an API key. Returns a
 * complete reply (including `:::ACTION:::` blocks) or `null` when the message
 * needs an LLM / fallback.
 */

const CONTROL_DEVICES = {
  lamp: { label: "lamp", emoji: "💡", on: "ON", off: "OFF" },
  fan: { label: "fan", emoji: "🌀", on: "ON", off: "OFF" },
  curtains: { label: "curtains", emoji: "🪟", on: "Open", off: "Closed", partial: "Partial" },
  water_pump: { label: "water pump", emoji: "💧", on: "ON", off: "OFF" },
  parking_gate: { label: "gate", emoji: "🚗", on: "Open", off: "Closed" },
  buzzer: { label: "buzzer", emoji: "🔔", on: "ON", off: "OFF" },
};

const FALLBACK =
  "🤔 I didn't quite catch that. I can control the lamp, fan, curtains, pump, gate and buzzer, and report temperature, humidity, gas, door and parking status. Try “turn on the lamp”, “is the gate open?” or “status”.";

const HELP = `Here's what I can do:
- 💡 Switch the lamp, fan, curtains, water pump, gate or buzzer on/off
- 🌡️ Report temperature, humidity, gas, door and parking status
- 🏠 Give a full home summary

Try “turn on the fan”, “is the gate open?” or “status”.`;

const num = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const gate = (home) => home?.parking?.gate ?? home?.parking_gate ?? "—";
const slot = (home, key) => home?.parking?.[key]?.status ?? "—";

const isOpen = (value) => {
  const text = String(value ?? "").toLowerCase();
  return text === "open" || text === "on" || text === "true" || text === "1";
};

function detectDevices(text) {
  const found = [];

  if (/\b(water\s*pump|pump)\b/.test(text)) found.push("water_pump");
  if (/\b(parking\s*gate|gate|barrier)\b/.test(text)) found.push("parking_gate");
  if (/\bcurtains?|blinds\b/.test(text)) found.push("curtains");
  if (/\blamps?|lights?|bulbs?\b/.test(text)) found.push("lamp");
  if (/\bfans?\b/.test(text)) found.push("fan");
  if (/\bbuzzer|siren|alarm\b/.test(text)) found.push("buzzer");

  return found;
}

function deviceState(key, home) {
  switch (key) {
    case "lamp":
      return home?.lamp ?? "—";
    case "fan":
      return home?.fan ?? "—";
    case "curtains":
      return home?.curtains ?? "—";
    case "water_pump":
      return home?.water_pump ?? "—";
    case "parking_gate":
      return gate(home);
    case "buzzer":
      return home?.buzzer ?? "—";
    default:
      return "—";
  }
}

function action(key, value) {
  return `:::ACTION:::${JSON.stringify({ key, value })}:::END:::`;
}

function polarityOf(text, device) {
  if (device === "curtains" && /\b(partial|half|halfway)\b/.test(text)) return "partial";
  if (/\b(off|stop|disable|deactivate|close|lower|shut)\b/.test(text)) return "off";
  if (/\b(on|start|enable|activate|open|raise)\b/.test(text)) return "on";
  return null;
}

function controlledReply(devices, mode, home) {
  const changes = [];

  for (const key of devices) {
    const device = CONTROL_DEVICES[key];
    const next =
      mode === "toggle" ? (isOpen(deviceState(key, home)) ? device.off : device.on) : device[mode];

    if (!next) continue;
    changes.push({ key, device, next });
  }

  if (changes.length === 0) return null;

  const blocks = changes.map(({ key, next }) => action(key, next)).join("");

  if (changes.length === 1) {
    const { device, next } = changes[0];
    if (next === "Partial") return { text: `${device.emoji} Curtains set to partial.${blocks}` };
    const verb = device.label === "curtains" ? "are" : "is";
    return { text: `${device.emoji} The ${device.label} ${verb} now ${next}.${blocks}` };
  }

  const summary = changes.map(({ device, next }) => `${device.label} ${next}`).join(", ");
  return { text: `✅ Done — ${summary}.${blocks}` };
}

function temperatureReply(home) {
  const temperature = num(home?.temperature);
  const humidity = num(home?.humidity);
  const comment =
    temperature >= 30
      ? "It's warm — the fan might help."
      : temperature <= 18
        ? "It's on the cool side."
        : "That's a comfortable range.";

  return `🌡️ Currently ${temperature}°C with ${humidity}% humidity. ${comment}`;
}

function humidityReply(home) {
  const humidity = num(home?.humidity);
  const comment =
    humidity >= 70 ? "Quite humid — ventilation would help." : humidity <= 35 ? "Fairly dry in there." : "Comfortable humidity.";

  return `💧 Humidity is ${humidity}%. ${comment}`;
}

function gasReply(home) {
  const gas = String(home?.gas ?? "").toUpperCase();
  const gasValue = num(home?.gasValue);
  const safe = gas === "NO" || gas === "" || gas === "—" || gasValue <= 500;

  return safe
    ? `✅ Gas sensor is clear (level ${gasValue}). No leak detected.`
    : `⚠️ Gas detected! Reading: ${home?.gas || gasValue}. Ventilate the area and check the sensor.`;
}

function doorReply(home) {
  const door = home?.main_door || {};
  const user = door.user_name ? ` Last access by ${door.user_name}.` : "";
  return `🚪 Main door is ${door.door_state || "—"} (${door.access || "—"}).${user}`;
}

function parkingReply(home) {
  const gateValue = gate(home);
  return `🅿️ Slot 1: ${slot(home, "slot1")}, slot 2: ${slot(home, "slot2")}. Gate is ${gateValue}.`;
}

function deviceStatusReply(devices, home) {
  if (devices.length === 1) {
    const device = CONTROL_DEVICES[devices[0]];
    if (devices[0] === "parking_gate") return `🚗 The parking gate is ${gate(home)}.`;
    return `${device.emoji} The ${device.label} is ${deviceState(devices[0], home)}.`;
  }

  const lines = devices.map((key) => {
    const device = CONTROL_DEVICES[key];
    return `${device.emoji} ${device.label}: ${deviceState(key, home)}`;
  });

  return lines.join(" · ");
}

function summaryReply(home) {
  const temperature = num(home?.temperature);
  const humidity = num(home?.humidity);
  const gas = String(home?.gas ?? "").toUpperCase();
  const gasSafe = gas === "NO" || gas === "" || gas === "—" || num(home?.gasValue) <= 500;

  return `🏠 Home status: ${temperature}°C, ${humidity}% humidity. Gas is ${gasSafe ? "safe" : "ALERT"}. Door ${home?.main_door?.door_state || "—"}, gate ${gate(home)}. Lamp ${home?.lamp ?? "—"}, fan ${home?.fan ?? "—"}, pump ${home?.water_pump ?? "—"}.`;
}

function greetingReply() {
  return "👋 Hi! I'm E-wange AI. Ask me for a reading or tell me to switch something on — try “status”, “temperature” or “turn on the lamp”.";
}

function identityReply() {
  return "🤖 I'm E-wange AI, the smart-home assistant built by Elonda. I run your devices and report live sensor readings.";
}

function thanksReply() {
  return "You're welcome! 😊 Anything else I can do around the house?";
}

function timeReply() {
  return `🕒 It's ${new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} on ${new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })}.`;
}

/**
 * @param {{ messages?: {role: string, content: string}[], homeData?: object, userRole?: string }} input
 * @returns {{ text: string } | null}
 */
export function answerLocally({ messages = [], homeData = {}, userRole = "viewer" } = {}) {
  const raw = messages[messages.length - 1]?.content;
  if (typeof raw !== "string" || !raw.trim()) return null;

  const text = raw
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^\w\s?.!,-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const home = homeData || {};
  const devices = detectDevices(text);
  const isAdmin = userRole === "admin";
  const politeRequest = /^(can|could|would|will)\s+you\b/.test(text);
  const isQuestion =
    !politeRequest && (text.endsWith("?") || /^(is|are|was|were|do|does|did|what|how|when|where|why|who|which|show|tell|give|status|list)\b/.test(text));

  const controlVerb = /\b(turn|switch|put|set|flip|toggle|open|close|raise|lower|start|stop|enable|disable|activate|deactivate|shut)\b/.test(text);
  const everything = /\b(everything|all)\b/.test(text) && /\b(on|off)\b/.test(text) && !isQuestion;

  // --- Device control -------------------------------------------------------
  if ((devices.length > 0 && controlVerb && !isQuestion) || everything) {
    if (!isAdmin) {
      return { text: "🔒 Viewers can check status, but only an admin can control devices." };
    }

    const targets = everything && devices.length === 0 ? ["lamp", "fan", "water_pump", "curtains"] : devices;
    const mode = /\b(off|stop|disable|close|shut)\b/.test(text) ? "off" : "on";
    const wantsToggle = /\b(toggle|flip)\b/.test(text);

    if (wantsToggle) {
      return controlledReply(targets, "toggle", home);
    }

    if (!everything && !polarityOf(text, targets[0])) {
      return { text: "🤔 Do you want that on or off? Try “turn on the lamp” or “turn off the fan”." };
    }

    if (targets.includes("curtains") && /\b(partial|half|halfway)\b/.test(text)) {
      return controlledReply(["curtains"], "partial", home) ?? { text: "🪟 Curtains set to partial." };
    }

    return controlledReply(targets, mode, home);
  }

  // --- Status questions -----------------------------------------------------
  // Explanations ("why does humidity matter?", "tell me about the gas sensor")
  // are not status lookups — hand them to the LLM when one is configured.
  const wantsExplanation =
    /\b(why|explain|tell me about|importance of|benefits? of|what causes|define|meaning of)\b/.test(text);
  if (wantsExplanation && devices.length === 0 && !controlVerb && !everything) return null;

  if (devices.length > 0) {
    return { text: deviceStatusReply(devices, home) };
  }

  if (/\b(temp|temperature|hot|warm|cold|cool)\b/.test(text)) return { text: temperatureReply(home) };
  if (/\b(humidity|humid|damp|dry)\b/.test(text)) return { text: humidityReply(home) };
  if (/\b(gas|leak)\b/.test(text)) return { text: gasReply(home) };
  if (/\b(door|entrance|entry)\b/.test(text)) return { text: doorReply(home) };
  if (/\b(parking|slots?|available)\b/.test(text)) return { text: parkingReply(home) };

  const asksSummary =
    /\b(status|summary|overview|everything ok|all good|how is (the )?(house|home)|whats happening|what is happening)\b/.test(text);
  if (asksSummary) return { text: summaryReply(home) };

  // --- Small talk -----------------------------------------------------------
  if (/\b(who|what)\s+(are|made|built|created)\s+(you|u)\b/.test(text) || /\byour\s+name\b/.test(text)) {
    return { text: identityReply() };
  }
  if (/\b(who|what)\s+made\s+(you|u)\b/.test(text) || /\bwho\s+(built|created)\s+(you|u)\b/.test(text)) {
    return { text: identityReply() };
  }
  if (/\b(help|commands|capabilities|what can you do|how do i use)\b/.test(text)) return { text: HELP };
  if (/^(hi|hello|hey|yo|hiya|good morning|good afternoon|good evening)\b/.test(text)) return { text: greetingReply() };
  if (/\b(thanks|thank you|thx|appreciate)\b/.test(text)) return { text: thanksReply() };
  if (/\b(how are you|how you doing|are you there|are you awake)\b/.test(text)) {
    return { text: "😊 I'm online and watching the house. What would you like me to do?" };
  }
  if (/\b(what time|the time|current time)\b/.test(text) || /\b(today|what day|the date)\b/.test(text)) {
    return { text: timeReply() };
  }

  // Not a known intent: let the LLM answer, or use the fallback in the caller.
  return null;
}

export const assistantReplies = { FALLBACK };
export default { answerLocally };

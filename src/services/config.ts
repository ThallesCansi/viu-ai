/**
 * Runtime configuration for swapping mock adapters with real integrations.
 *
 * In VS Code, set these in `.env`:
 *   VITE_USE_MOCK_MARKET_SIGNALS=false
 *   VITE_USE_MOCK_AGENT=false
 *   VITE_USE_MOCK_CALENDAR=false
 *   VITE_USE_MOCK_VOICE=false
 *   VITE_API_BASE_URL=http://localhost:8787
 *
 * Every flag defaults to `true` so the hackathon demo always runs.
 */

const flag = (key: string, fallback = true) => {
  const raw = (import.meta.env as Record<string, string | undefined>)[key];
  return raw === undefined ? fallback : raw !== "false";
};

export const config = {
  apiBaseUrl:
    (import.meta.env as Record<string, string | undefined>)["VITE_API_BASE_URL"] ?? "/api",
  useMockMarketSignals: flag("VITE_USE_MOCK_MARKET_SIGNALS"),
  useMockAgent: flag("VITE_USE_MOCK_AGENT"),
  useMockCalendar: flag("VITE_USE_MOCK_CALENDAR"),
  // The ElevenLabs agent is public, so real voice works without any secret.
  // Default to the real voice service even when no .env file is present (published builds).
  useMockVoice: flag("VITE_USE_MOCK_VOICE", false),
  elevenLabsAgentId:
    (import.meta.env as Record<string, string | undefined>)["VITE_ELEVENLABS_AGENT_ID"] ??
    "agent_2301kzh07enpe3zt2ph7mbznsxf7",
} as const;

/**
 * Future HTTP surface the mock services stand in for.
 * Kept here so backend developers have a single reference point.
 */
export const API_ROUTES = {
  intelligenceStatus: "GET /api/intelligence/status",
  metrics: "GET /api/metrics",
  signals: "GET /api/signals",
  createInvestigation: "POST /api/investigations",
  investigation: "GET /api/investigations/:id",
  investigationEvents: "GET /api/investigations/:id/events",
  availability: "POST /api/calendar/availability",
  meetings: "POST /api/calendar/meetings",
  voiceSession: "GET /api/voice/session",
  decisions: "POST /api/decisions",
  actions: "POST /api/actions",
} as const;

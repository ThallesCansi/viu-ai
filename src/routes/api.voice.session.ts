import { createFileRoute } from "@tanstack/react-router";

import {
  DEFAULT_ELEVENLABS_AGENT_ID,
  ElevenLabsSessionError,
  getVoiceSessionAuthorization,
} from "@/server/elevenlabs-session.server";

export const Route = createFileRoute("/api/voice/session")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const authorization = await getVoiceSessionAuthorization({
            agentId: process.env["VITE_ELEVENLABS_AGENT_ID"] ?? DEFAULT_ELEVENLABS_AGENT_ID,
            ...(process.env["ELEVENLABS_API_KEY"]
              ? { apiKey: process.env["ELEVENLABS_API_KEY"] }
              : {}),
          });
          return Response.json(authorization, {
            headers: { "cache-control": "no-store" },
          });
        } catch (error) {
          console.error(error);
          const message =
            error instanceof ElevenLabsSessionError
              ? error.message
              : "Voice session authorization is unavailable.";
          return Response.json({ error: message }, { status: 502 });
        }
      },
    },
  },
});

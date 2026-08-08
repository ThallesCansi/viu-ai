import { createFileRoute } from "@tanstack/react-router";

import { AgentConfigurationError, runInvestigation } from "@/server/investigation-agent.server";
import { createInvestigationRequestSchema } from "@/types/investigation-api";

export const Route = createFileRoute("/api/investigations")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await parseRequestBody(request);
        const input = createInvestigationRequestSchema.safeParse(body);
        if (!input.success) {
          return Response.json(
            { error: "Invalid investigation request.", issues: input.error.issues },
            { status: 400 },
          );
        }

        try {
          const result = await runInvestigation({
            ...(input.data.objective ? { objective: input.data.objective } : {}),
            signal: request.signal,
          });
          return Response.json(result, { status: 201 });
        } catch (error) {
          console.error(error);
          if (error instanceof AgentConfigurationError) {
            return Response.json({ error: error.message }, { status: 503 });
          }
          return Response.json(
            { error: "The autonomous investigation could not be completed." },
            { status: 502 },
          );
        }
      },
    },
  },
});

async function parseRequestBody(request: Request): Promise<unknown> {
  const text = await request.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

import { config } from "@/services/config";
import {
  createInvestigationResponseSchema,
  type CreateInvestigationResponse,
} from "@/types/investigation-api";

const OBJECTIVE =
  "Investigate the detected business anomaly, gather sufficient evidence, and produce an actionable business investigation.";

export async function createRemoteInvestigation(): Promise<CreateInvestigationResponse> {
  const baseUrl = config.apiBaseUrl.replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/investigations`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ objective: OBJECTIVE }),
  });

  const payload = (await response.json()) as unknown;
  if (!response.ok) {
    const message = extractErrorMessage(payload);
    throw new Error(message ?? `Investigation request failed with status ${response.status}.`);
  }
  return createInvestigationResponseSchema.parse(payload) as CreateInvestigationResponse;
}

function extractErrorMessage(payload: unknown) {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof payload.error === "string"
  ) {
    return payload.error;
  }
  return null;
}

export const DEFAULT_ELEVENLABS_AGENT_ID = "agent_2301kzh07enpe3zt2ph7mbznsxf7";

export type VoiceSessionAuthorization =
  { authorization: "public"; agentId: string } | { authorization: "signed_url"; signedUrl: string };

export class ElevenLabsSessionError extends Error {}

export async function getVoiceSessionAuthorization(
  options: {
    agentId?: string;
    apiKey?: string;
    fetchImpl?: typeof fetch;
  } = {},
): Promise<VoiceSessionAuthorization> {
  const agentId = options.agentId ?? DEFAULT_ELEVENLABS_AGENT_ID;
  const apiKey = options.apiKey?.trim();

  if (!apiKey) {
    return { authorization: "public", agentId };
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const url = new URL("https://api.elevenlabs.io/v1/convai/conversation/get-signed-url");
  url.searchParams.set("agent_id", agentId);
  const response = await fetchImpl(url, {
    method: "GET",
    headers: { "xi-api-key": apiKey },
  });

  if (!response.ok) {
    throw new ElevenLabsSessionError(
      `ElevenLabs session authorization failed with HTTP ${response.status}.`,
    );
  }

  const payload = (await response.json()) as { signed_url?: unknown };
  if (typeof payload.signed_url !== "string" || !payload.signed_url) {
    throw new ElevenLabsSessionError("ElevenLabs did not return a signed URL.");
  }

  return { authorization: "signed_url", signedUrl: payload.signed_url };
}

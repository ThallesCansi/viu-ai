import { describe, expect, it, vi } from "vitest";

import { getVoiceSessionAuthorization } from "@/server/elevenlabs-session.server";

describe("getVoiceSessionAuthorization", () => {
  it("returns the configured agent ID for public access without contacting ElevenLabs", async () => {
    const fetchMock = vi.fn();
    const result = await getVoiceSessionAuthorization({
      agentId: "agent-public",
      fetchImpl: fetchMock,
    });

    expect(result).toEqual({ authorization: "public", agentId: "agent-public" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses the server key for a short-lived signed URL without returning that key", async () => {
    const fetchMock = vi.fn(async (..._arguments: Parameters<typeof fetch>) =>
      Response.json({ signed_url: "wss://api.elevenlabs.io/signed/temporary" }),
    );
    const result = await getVoiceSessionAuthorization({
      agentId: "agent-private",
      apiKey: "server-secret",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    expect(result).toEqual({
      authorization: "signed_url",
      signedUrl: "wss://api.elevenlabs.io/signed/temporary",
    });
    expect(JSON.stringify(result)).not.toContain("server-secret");
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toEqual({ "xi-api-key": "server-secret" });
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("agent_id=agent-private");
  });

  it("does not expose provider response details when authorization fails", async () => {
    const fetchMock = vi.fn(async (..._arguments: Parameters<typeof fetch>) =>
      Response.json({ detail: "bad key" }, { status: 401 }),
    );

    await expect(
      getVoiceSessionAuthorization({
        apiKey: "server-secret",
        fetchImpl: fetchMock as unknown as typeof fetch,
      }),
    ).rejects.toThrow("HTTP 401");
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";

import { buildPresentationDeck, buildVoiceMeetingContext } from "@/services/presentation";
import { MockVoiceService } from "@/services/mock/support-services";
import type { Investigation } from "@/types";

const investigation: Investigation = {
  id: "inv-mock-voice",
  title: "Mock Voice Review",
  status: "investigation_complete",
  detectedAt: "now",
  anomaly: { title: "Test anomaly", summary: "A test anomaly." },
  metrics: { salesChangePct: -2, negativeSignalChangePct: 5, totalSignals: 10 },
  hypothesis: "A test hypothesis.",
  languageQualifier: "correlation",
  confidence: 60,
  urgency: { score: 50, level: "medium" },
  summary: "A deterministic mock summary.",
  clusters: [],
  evidence: [],
  recommendation: "Review the evidence.",
  decisionRequired: true,
};

afterEach(() => vi.useRealTimers());

describe("MockVoiceService", () => {
  it("remains a deterministic, fully usable fallback", async () => {
    vi.useFakeTimers();
    const service = new MockVoiceService();
    const deck = buildPresentationDeck(investigation);
    const snapshots: string[] = [];
    const stages: number[] = [];
    service.subscribe((snapshot) => snapshots.push(snapshot.state));

    const result = await service.startSession({
      context: buildVoiceMeetingContext({ investigation, presentation: deck }),
      getPresentation: () => deck,
      onStageChange: (stage) => stages.push(stage),
    });
    await vi.advanceTimersByTimeAsync(1_000);

    expect(result.sessionId).toBe("voice-mock-1");
    expect(snapshots).toContain("speaking");
    expect(stages[0]).toBe(0);

    await service.stopSession();
    expect(snapshots.at(-1)).toBe("ready");
  });
});

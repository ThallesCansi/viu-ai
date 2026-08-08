import { describe, expect, it } from "vitest";

import { evidenceSignals, topicClusters } from "@/data/demo";
import {
  buildDetailedMeetingContext,
  buildPresentationDeck,
  buildSlideStructure,
  buildVoiceMeetingContext,
  changePresentationSlide,
  clampPresentationStage,
  getSlideNavigation,
  normalizePresentationSlideNumber,
} from "@/services/presentation";
import type { Investigation, PresentationDeck } from "@/types";

const investigation: Investigation = {
  id: "inv-test",
  title: "Onboarding Risk Review",
  status: "investigation_complete",
  detectedAt: "2026-08-08T12:00:00Z",
  anomaly: { title: "Sales anomaly", summary: "Sales and customer signals changed together." },
  metrics: { salesChangePct: -11, negativeSignalChangePct: 36, totalSignals: 142 },
  hypothesis: "Onboarding verification is the strongest suspected contributor.",
  languageQualifier: "probable_contributor",
  confidence: 84,
  urgency: { score: 82, level: "high" },
  summary: "Onboarding complaints overlap with the commercial decline.",
  clusters: topicClusters,
  evidence: evidenceSignals.slice(0, 3),
  recommendation: "Test a simplified verification experience.",
  decisionRequired: true,
};

const pricingDeck: PresentationDeck = {
  id: "deck-pricing",
  title: "Pricing Risk Review",
  summary: "Pricing objections increased while upgrade conversion declined.",
  slides: [
    { id: "pricing-1", title: "Commercial change", headline: "Upgrade conversion declined." },
    { id: "pricing-2", title: "Pricing evidence", headline: "Customers question plan clarity." },
    { id: "pricing-3", title: "Decision", headline: "Test clearer plan packaging." },
  ],
};

describe("presentation adapter", () => {
  it("builds a grounded deck from the Investigation contract", () => {
    const deck = buildPresentationDeck(investigation);

    expect(deck.slides).toHaveLength(4);
    expect(JSON.stringify(deck)).toContain("-11%");
    expect(JSON.stringify(deck)).toContain("+36%");
    expect(deck.slides[1]?.evidenceIds).toEqual(investigation.evidence.map((item) => item.id));
    expect(JSON.stringify(deck)).toContain(investigation.hypothesis);
    expect(JSON.stringify(deck)).toContain(investigation.recommendation);
  });

  it("builds detailed context from actual metrics, evidence, URLs, and limitations", () => {
    const context = buildDetailedMeetingContext({
      investigation,
      presentation: buildPresentationDeck(investigation),
    });

    expect(context).toContain("sales change -11%");
    expect(context).toContain(evidenceSignals[0]?.url);
    expect(context).toContain(`engagement=${evidenceSignals[0]?.engagement}`);
    expect(context).toContain("causality has not been established");
  });

  it("derives all voice variables and slide structure from a different three-slide deck", () => {
    const pricingInvestigation: Investigation = {
      ...investigation,
      id: "inv-pricing",
      title: "Pricing Risk Review",
      summary: pricingDeck.summary,
      metrics: { salesChangePct: -7, negativeSignalChangePct: 19, totalSignals: 48 },
      hypothesis: "Pricing clarity may be contributing to lower upgrade conversion.",
      recommendation: "Test clearer plan packaging.",
    };
    const context = buildVoiceMeetingContext({
      investigation: pricingInvestigation,
      presentation: pricingDeck,
      company: "Different Co",
    });

    expect(getSlideNavigation(pricingDeck)).toHaveLength(3);
    expect(context.numero_slides).toBe(3);
    expect(context.resumo_executivo).toBe(pricingDeck.summary);
    expect(context.estrutura_slides.split("\n")).toEqual([
      "1 - Commercial change: Upgrade conversion declined.",
      "2 - Pricing evidence: Customers question plan clarity.",
      "3 - Decision: Test clearer plan packaging.",
    ]);
    expect(buildSlideStructure(pricingDeck)).toBe(context.estrutura_slides);
    expect(context.contexto_detalhado).toContain("Pricing Risk Review");
    expect(Object.keys(context).sort()).toEqual(
      [
        "empresa",
        "estrutura_slides",
        "contexto_detalhado",
        "numero_slides",
        "objetivo_reuniao",
        "resumo_executivo",
      ].sort(),
    );
  });

  it("enforces dynamic navigation bounds and validates change_slide", () => {
    const selected: number[] = [];

    expect(clampPresentationStage(-1, 3)).toBe(0);
    expect(clampPresentationStage(3, 3)).toBe(2);
    expect(
      changePresentationSlide({ slide_number: 3 }, pricingDeck, (stage) => selected.push(stage)),
    ).toBe("Slide 3 displayed");
    expect(selected).toEqual([2]);
    expect(
      changePresentationSlide({ slide_number: "3" }, pricingDeck, (stage) => selected.push(stage)),
    ).toBe("Slide 3 displayed");
    expect(selected).toEqual([2, 2]);
    expect(changePresentationSlide({ slide_number: 4 }, pricingDeck, () => undefined)).toBe(
      "Invalid slide number. This presentation has 3 slides.",
    );
    for (const invalid of [3.5, "3.5", Number.NaN, 0, "0", -1, "-1", "NaN", "3e0"]) {
      expect(changePresentationSlide({ slide_number: invalid }, pricingDeck, () => undefined)).toBe(
        "Invalid slide number. This presentation has 3 slides.",
      );
    }
    expect(normalizePresentationSlideNumber(3)).toBe(3);
    expect(normalizePresentationSlideNumber("3")).toBe(3);
  });
});

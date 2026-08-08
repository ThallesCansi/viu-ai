import raw from "@/data/guaco-investigation.json";
import type { Investigation, PresentationDeck, VoiceMeetingContext } from "@/types";

/**
 * Fixed, reliable GUA.CO hackathon demo dataset.
 * Social evidence is public (Gorilla export); internal sales figures are simulated.
 * The Decision Room renders these slides verbatim — do not derive them.
 */
export const guacoInvestigation = raw.investigation as Investigation;
export const guacoPresentation = raw.presentation as PresentationDeck;
export const guacoVoiceContext = raw.voiceMeetingContext as VoiceMeetingContext;

export interface GuacoDecisionPlan {
  owner: string;
  primaryMetric: string;
  secondaryMetrics: string[];
  durationDays: number;
  durationLabel: string;
  proposedAction: string;
}

export const guacoDecisionPlan = raw.decisionPlan as GuacoDecisionPlan;

export const GUACO_INVESTIGATION_ID = guacoInvestigation.id;

export function isGuacoInvestigation(investigation: { id: string }): boolean {
  return investigation.id === GUACO_INVESTIGATION_ID;
}

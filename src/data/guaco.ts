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

export const GUACO_INVESTIGATION_ID = guacoInvestigation.id;

export function isGuacoInvestigation(investigation: { id: string }): boolean {
  return investigation.id === GUACO_INVESTIGATION_ID;
}

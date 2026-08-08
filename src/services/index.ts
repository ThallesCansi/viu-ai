/**
 * Service registry — the single seam between UI and backend.
 *
 * Swap a mock for a real adapter here (Gorilla, Open Agent Loops + Featherless,
 * Google Calendar, ElevenLabs) without touching any component.
 */
import { config } from "./config";
import { mockAgentService } from "./mock/agent";
import {
  mockBusinessMetricsService,
  mockCompanyDirectoryService,
  mockMarketSignalsService,
} from "./mock/data-services";
import { mockActionService, mockCalendarService, mockVoiceService } from "./mock/support-services";

export const marketSignalsService = config.useMockMarketSignals
  ? mockMarketSignalsService
  : mockMarketSignalsService; // TODO: gorillaMarketSignalsService

export const businessMetricsService = mockBusinessMetricsService; // TODO: warehouse adapter

export const agentService = config.useMockAgent ? mockAgentService : mockAgentService; // TODO: openAgentLoopsService

export const calendarService = config.useMockCalendar ? mockCalendarService : mockCalendarService; // TODO: googleCalendarService

export const voiceService = config.useMockVoice ? mockVoiceService : mockVoiceService; // TODO: elevenLabsVoiceService

export const companyDirectoryService = mockCompanyDirectoryService;

export const actionService = mockActionService;

export * from "./types";
export { config, API_ROUTES } from "./config";

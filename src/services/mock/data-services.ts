import { baselineMetrics, evidenceSignals } from "@/data/demo";
import type {
  BusinessMetricsService,
  CompanyDirectoryService,
  MarketSignalsService,
} from "@/services/types";
import { directory } from "@/data/demo";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Gorilla adapter stand-in. */
export const mockMarketSignalsService: MarketSignalsService = {
  async searchSignals(query?: string) {
    await delay(400);
    if (!query) return evidenceSignals;
    const q = query.toLowerCase();
    return evidenceSignals.filter(
      (s) => s.text.toLowerCase().includes(q) || s.topic?.toLowerCase().includes(q),
    );
  },
};

export const mockBusinessMetricsService: BusinessMetricsService = {
  async getMetrics() {
    await delay(200);
    return baselineMetrics;
  },
};

export const mockCompanyDirectoryService: CompanyDirectoryService = {
  async getRelevantPeople() {
    await delay(300);
    return directory;
  },
};

import type {
  BusinessMetric,
  CompanyPerson,
  IntegrationStatus,
  MarketSignal,
  TopicCluster,
  TranscriptLine,
} from "@/types";

/**
 * Single, centralized demo scenario for Acme SaaS.
 * Replaced by real data once marketSignalsService / businessMetricsService
 * are pointed at Gorilla and the internal warehouse.
 */

export const WORKSPACE = {
  company: "Acme SaaS",
  agentName: "Market Intelligence Agent",
} as const;

export const SALES_PREVIOUS = 100000;
export const SALES_CURRENT = 89000;

export const baselineMetrics: BusinessMetric[] = [
  {
    id: "sales",
    name: "Sales",
    value: SALES_CURRENT,
    formattedValue: "$89K",
    previousValue: SALES_PREVIOUS,
    changePct: -11,
    trend: "down",
    status: "critical",
  },
  {
    id: "signals",
    name: "Customer Signals",
    value: 142,
    formattedValue: "142",
    trend: "up",
    changePct: 18,
    status: "attention",
  },
  {
    id: "negative",
    name: "Negative Sentiment",
    value: 47,
    formattedValue: "47%",
    changePct: 36,
    trend: "up",
    status: "critical",
  },
  {
    id: "investigations",
    name: "Open Investigations",
    value: 0,
    formattedValue: "0",
    trend: "stable",
    status: "healthy",
  },
];

export const topicClusters: TopicCluster[] = [
  {
    topic: "Onboarding Friction",
    count: 27,
    changePct: 210,
    sentiment: "negative",
    relevanceScore: 0.94,
  },
  { topic: "Pricing", count: 11, changePct: 12, sentiment: "negative", relevanceScore: 0.51 },
  { topic: "Performance", count: 8, changePct: 4, sentiment: "negative", relevanceScore: 0.38 },
  {
    topic: "Feature Requests",
    count: 6,
    changePct: -3,
    sentiment: "neutral",
    relevanceScore: 0.22,
  },
];

export const evidenceSignals: MarketSignal[] = [
  {
    id: "sig-1",
    source: "reddit",
    author: "u/devops_maria",
    text: "The new verification step makes setup much harder than before. We almost gave up during onboarding.",
    url: "https://reddit.com/r/saas/comments/onboarding-verification",
    createdAt: "Today, 09:41",
    sentiment: "negative",
    sentimentScore: -0.82,
    topic: "Onboarding Friction",
    engagement: 143,
    relevance: 0.96,
  },
  {
    id: "sig-2",
    source: "x",
    author: "@jhaddock",
    text: "Loved the product but the latest onboarding flow is incredibly frustrating.",
    url: "https://x.com/jhaddock/status/1829",
    createdAt: "Today, 10:12",
    sentiment: "negative",
    sentimentScore: -0.74,
    topic: "Onboarding Friction",
    engagement: 89,
    relevance: 0.91,
  },
  {
    id: "sig-3",
    source: "linkedin",
    author: "Clara Whitfield · Ops Director",
    text: "Our team struggled to get through the verification step during setup.",
    url: "https://linkedin.com/posts/clara-whitfield-onboarding",
    createdAt: "Today, 08:55",
    sentiment: "negative",
    sentimentScore: -0.68,
    topic: "Onboarding Friction",
    engagement: 61,
    relevance: 0.88,
  },
  {
    id: "sig-4",
    source: "support",
    author: "Ticket #40218",
    text: "Customer could not complete identity verification and requested a manual workaround before trial expiry.",
    createdAt: "Today, 11:02",
    sentiment: "negative",
    sentimentScore: -0.7,
    topic: "Onboarding Friction",
    engagement: 12,
    relevance: 0.85,
  },
  {
    id: "sig-5",
    source: "support",
    author: "Ticket #40233",
    text: "Three SMB trials stalled at the verification screen this week. Same pattern as yesterday.",
    createdAt: "Today, 11:34",
    sentiment: "negative",
    sentimentScore: -0.66,
    topic: "Onboarding Friction",
    engagement: 8,
    relevance: 0.83,
  },
  {
    id: "sig-6",
    source: "reddit",
    author: "u/ledger_sam",
    text: "Pricing tiers still feel confusing for smaller teams, but support has been responsive.",
    url: "https://reddit.com/r/saas/comments/pricing-tiers",
    createdAt: "Today, 07:18",
    sentiment: "negative",
    sentimentScore: -0.31,
    topic: "Pricing",
    engagement: 44,
    relevance: 0.42,
  },
  {
    id: "sig-7",
    source: "x",
    author: "@ninaqops",
    text: "Dashboard load times got a bit slower after the last release.",
    url: "https://x.com/ninaqops/status/9921",
    createdAt: "Yesterday, 18:20",
    sentiment: "negative",
    sentimentScore: -0.4,
    topic: "Performance",
    engagement: 27,
    relevance: 0.36,
  },
  {
    id: "sig-8",
    source: "linkedin",
    author: "Tomás Reyes · Founder",
    text: "Would love a bulk import option — otherwise the platform has been solid for us.",
    createdAt: "Yesterday, 16:05",
    sentiment: "neutral",
    sentimentScore: 0.05,
    topic: "Feature Requests",
    engagement: 33,
    relevance: 0.2,
  },
];

export const directory: CompanyPerson[] = [
  {
    id: "p1",
    name: "Marina Costa",
    role: "Head of Product",
    department: "Product",
    required: true,
    available: true,
    reason: "Owns product prioritization and the onboarding experience.",
  },
  {
    id: "p2",
    name: "Pedro Lima",
    role: "Product Designer",
    department: "Design",
    required: true,
    available: true,
    reason: "Responsible for the affected onboarding flow.",
  },
  {
    id: "p3",
    name: "Ana Souza",
    role: "Customer Success Lead",
    department: "Customer Success",
    required: true,
    available: true,
    reason: "Represents recurring customer issues and retention impact.",
  },
  {
    id: "p4",
    name: "Engineering Lead",
    role: "Engineering Lead",
    department: "Engineering",
    required: false,
    available: true,
    reason: "Implementation may be required after the product decision.",
  },
];

export const meetingAgenda = [
  "Business anomaly",
  "Customer evidence",
  "Primary hypothesis",
  "Business impact",
  "Proposed action",
  "Decision",
];

export const HYPOTHESIS =
  "The new verification step is introducing onboarding friction and may be contributing to lower conversion.";

export const INVESTIGATION_SUMMARY =
  "Customer complaints are increasingly concentrated around the new verification step introduced during onboarding. The timing overlaps with the observed decline in sales performance.";

export const HEADLINE_FINDING =
  "New onboarding verification flow is the strongest suspected contributor to the observed decline.";

export const RECOMMENDATION =
  "Review the onboarding verification flow and evaluate a rollback or controlled experiment with a simplified experience.";

export const RECOMMENDATION_REASON =
  "The issue combines significant commercial impact with a concentrated increase in customer friction and requires a cross-functional product decision.";

export const PROPOSED_ACTION =
  "Run a 14-day experiment removing mandatory verification from the initial SMB onboarding flow.";

export const followUpChecklist = [
  "Decision documented",
  "Product experiment created",
  "Pedro assigned as owner",
  "Success metric registered",
  "Follow-up scheduled",
  "Market monitoring updated",
];

export const demoTranscript: TranscriptLine[] = [
  {
    id: "t1",
    speaker: "agent",
    text: "I called this meeting because I detected a meaningful change across customer and business signals. Sales declined eleven percent while negative customer sentiment increased thirty-six percent. My investigation found that the strongest emerging issue is related to the new onboarding verification step.",
  },
  { id: "t2", speaker: "user", text: "Why do you think onboarding is the main issue?" },
  {
    id: "t3",
    speaker: "agent",
    text: "Among the conversations analyzed, onboarding represents the largest emerging negative cluster. Twenty-seven relevant signals mention onboarding friction, compared with eleven related to pricing and eight related to performance.",
  },
];

export const integrations: IntegrationStatus[] = [
  {
    id: "gorilla",
    name: "Gorilla",
    category: "Market Intelligence",
    description: "External market and customer conversation retrieval.",
    status: "ready",
    group: "agent",
  },
  {
    id: "featherless",
    name: "Featherless AI",
    category: "LLM Inference",
    description: "Model inference for signal analysis and brief generation.",
    status: "ready",
    group: "agent",
  },
  {
    id: "oal",
    name: "Open Agent Loops",
    category: "Agent Orchestration",
    description: "Autonomous loop execution, tool calling and event streaming.",
    status: "ready",
    group: "agent",
  },
  {
    id: "elevenlabs",
    name: "ElevenLabs",
    category: "Voice Agent",
    description: "Realtime voice presentation of the decision brief.",
    status: "ready_to_connect",
    group: "agent",
  },
  {
    id: "gcal",
    name: "Google Calendar",
    category: "Scheduling",
    description: "Availability lookup and decision meeting creation.",
    status: "ready_to_connect",
    group: "agent",
  },
  {
    id: "sales",
    name: "Sales Data",
    category: "Internal business metrics",
    description: "Revenue, conversion and pipeline metrics.",
    status: "demo_dataset",
    group: "internal",
  },
  {
    id: "reddit",
    name: "Reddit",
    category: "External source",
    description: "Community conversations via Gorilla.",
    status: "connected",
    group: "sources",
  },
  {
    id: "x",
    name: "X",
    category: "External source",
    description: "Public posts via Gorilla.",
    status: "connected",
    group: "sources",
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    category: "External source",
    description: "Professional posts via Gorilla.",
    status: "connected",
    group: "sources",
  },
  {
    id: "crm",
    name: "CRM",
    category: "Internal source",
    description: "Accounts, trials and pipeline stages.",
    status: "connected",
    group: "internal",
  },
  {
    id: "support",
    name: "Support",
    category: "Internal source",
    description: "Ticket volume and topic classification.",
    status: "connected",
    group: "internal",
  },
  ...["Salesforce", "HubSpot", "Zendesk", "Intercom", "Slack", "Linear", "Jira"].map((name) => ({
    id: name.toLowerCase(),
    name,
    category: "Planned connector",
    description: "Not implemented for the hackathon build.",
    status: "unavailable" as const,
    group: "future" as const,
  })),
];

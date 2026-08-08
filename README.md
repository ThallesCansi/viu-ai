# VIU AI

Build a complete, polished hackathon-ready web application called:

VIU AI

Tagline:

Autonomous Market Intelligence

Core product thesis:

Companies already have social listening, BI dashboards, customer support systems and analytics, but important changes are still detected too late and humans still need to investigate what happened, why it matters and who should act.

VIU AI is an autonomous Market Intelligence AI Agent.

It continuously monitors external market/customer signals and internal business metrics.

When it detects an important anomaly, it autonomously:

1. Detects the anomaly.

2. Investigates external and internal data.

3. Builds a probable explanation.

4. Assesses confidence and urgency.

5. Collects supporting evidence.

6. Determines whether human intervention is required.

7. Identifies the right decision makers.

8. Finds meeting availability.

9. Prepares a Decision Brief.

10. Creates a decision meeting.

11. Presents the investigation through a voice AI agent.

12. Captures the decision.

13. Executes or tracks follow-up actions.

The product must feel like an autonomous employee operating inside the company, NOT like a traditional dashboard.

This is a hackathon project.

The most important requirement is a coherent, visually impressive end-to-end demo.

Do not overbuild.

==================================================

CORE ARCHITECTURAL PRINCIPLE

==================================================

The frontend will initially operate with mock services.

Later, developers will open the project in VS Code and replace the mock adapters with real integrations.

The planned production architecture is:

Frontend:

Lovable / React / TypeScript

Agent backend:

Node.js / TypeScript

Agent orchestration:

Open Agent Loops

LLM inference:

Featherless AI

External market intelligence:

Gorilla API

Internal company data:

CRM / Sales / Customer Support connectors

For the hackathon, these may initially use demo datasets.

Scheduling:

Google Calendar API

Voice:

ElevenLabs

IMPORTANT:

Do NOT implement complex agent logic directly inside React components.

Do NOT make the frontend responsible for agent reasoning.

Instead, build a clean service and event abstraction that can later receive real agent events.

==================================================

APPLICATION DESIGN

==================================================

Build a premium B2B enterprise AI application.

Visual references:

Linear

Vercel

Stripe

modern AI operations dashboards

cyber/intelligence command centers, but subtle and enterprise-oriented

Style:

- dark neutral background

- clean typography

- strong hierarchy

- subtle borders

- minimal gradients

- high information density without clutter

- premium enterprise feeling

- modern AI product

- restrained animation

- avoid excessive glassmorphism

- avoid playful visuals

- avoid generic admin-template appearance

Accent usage:

Green:

healthy / connected / complete

Amber:

attention / investigation

Red:

high urgency / critical business risk

Blue or violet:

AI / analysis / active agent states

The interface language must be English.

Desktop-first.

Optimize for a laptop screen used during a live hackathon presentation.

==================================================

NO AUTHENTICATION

==================================================

Do not build authentication.

Assume the user is already inside the Acme SaaS workspace.

The initial workspace is:

Acme SaaS

Agent:

Market Intelligence Agent

==================================================

GLOBAL NAVIGATION

==================================================

Persistent left sidebar.

Logo:

VIU AI

Subtitle:

Autonomous Market Intelligence

Navigation:

Intelligence

Investigations

Decisions

Agent Activity

Integrations

At the bottom:

Market Intelligence Agent

● Active

Small text:

Operating autonomously

Top navigation bar:

Acme SaaS

Market Intelligence Agent

LIVE indicator

Agent status

Settings icon

==================================================

CORE TYPES

==================================================

Create clear reusable TypeScript models.

Create:

AgentStatus

Values:

monitoring

anomaly_detected

investigating

investigation_complete

decision_required

scheduling

meeting_ready

presenting

awaiting_decision

executing_action

monitoring_outcome

Create:

BusinessMetric

{

  id: string,

  name: string,

  value: number,

  formattedValue: string,

  previousValue?: number,

  changePct?: number,

  trend: "up" | "down" | "stable",

  status: "healthy" | "attention" | "critical"

}

Create:

MarketSignal

{

  id: string,

  source: "reddit" | "x" | "linkedin" | "support" | "other",

  author?: string,

  text: string,

  url?: string,

  createdAt?: string,

  sentiment: "positive" | "negative" | "neutral",

  sentimentScore?: number,

  topic?: string,

  engagement?: number,

  relevance?: number

}

Create:

TopicCluster

{

  topic: string,

  count: number,

  changePct?: number,

  sentiment: "positive" | "negative" | "neutral",

  relevanceScore?: number

}

Create:

Investigation

{

  id: string,

  title: string,

  status: AgentStatus,

  anomaly: {

    title: string,

    summary: string

  },

  metrics: {

    salesChangePct: number,

    negativeSignalChangePct: number,

    totalSignals: number

  },

  hypothesis: string,

  languageQualifier:

    "possible_cause" |

    "probable_contributor" |

    "correlation" |

    "insufficient_evidence",

  confidence: number,

  urgency: {

    score: number,

    level: "low" | "medium" | "high"

  },

  summary: string,

  clusters: TopicCluster[],

  evidence: MarketSignal[],

  recommendation: string,

  decisionRequired: boolean

}

Create:

CompanyPerson

{

  id: string,

  name: string,

  role: string,

  department: string,

  avatar?: string,

  required: boolean,

  available: boolean,

  reason: string

}

Create:

DecisionMeeting

{

  id: string,

  title: string,

  investigationId: string,

  attendees: CompanyPerson[],

  date: string,

  startTime: string,

  durationMinutes: number,

  agenda: string[],

  calendarStatus:

    "not_created" |

    "creating" |

    "created" |

    "failed"

}

Create:

AgentEvent

{

  id: string,

  timestamp: string,

  type:

    "monitoring_tick" |

    "signal_received" |

    "anomaly_detected" |

    "investigation_started" |

    "tool_call_started" |

    "tool_call_completed" |

    "finding_created" |

    "confidence_updated" |

    "decision_required" |

    "people_selected" |

    "availability_found" |

    "meeting_created" |

    "voice_started" |

    "decision_recorded" |

    "action_created" |

    "monitoring_resumed",

  title: string,

  description?: string,

  tool?: {

    name: string,

    provider?: string

  },

  metadata?: Record<string, unknown>

}

IMPORTANT:

AgentEvent is used to visualize what the autonomous agent is doing.

Never expose hidden reasoning or chain-of-thought.

Only expose observable actions such as:

"Searching market conversations"

"Sales data retrieved"

"27 onboarding-related signals found"

"Confidence updated to 84%"

"Meeting creation requested"

==================================================

SERVICE ABSTRACTION

==================================================

Create a /services or /adapters architecture.

Create interfaces or mock service implementations for:

marketSignalsService

businessMetricsService

agentService

calendarService

voiceService

companyDirectoryService

actionService

Example conceptual functions:

marketSignalsService.searchSignals()

businessMetricsService.getMetrics()

agentService.startInvestigation()

agentService.subscribeToEvents()

agentService.getInvestigation()

calendarService.findAvailability()

calendarService.createMeeting()

voiceService.startSession()

voiceService.stopSession()

voiceService.sendContext()

companyDirectoryService.getRelevantPeople()

actionService.createFollowUp()

All components must consume these services instead of importing mock data directly.

Create mock implementations now.

Design this architecture so we can later replace:

marketSignalsService

with Gorilla API

agentService

with Open Agent Loops + Featherless

calendarService

with Google Calendar

voiceService

with ElevenLabs

without rebuilding the UI.

==================================================

API-READY ARCHITECTURE

==================================================

Prepare the application conceptually for these future endpoints:

GET /api/intelligence/status

GET /api/metrics

GET /api/signals

POST /api/investigations

GET /api/investigations/:id

GET /api/investigations/:id/events

POST /api/calendar/availability

POST /api/calendar/meetings

POST /api/voice/session

POST /api/decisions

POST /api/actions

Do not require these endpoints to exist now.

Mock them through the service layer.

==================================================

SCREEN 1

INTELLIGENCE

==================================================

This is the home screen.

Its purpose is NOT simply showing analytics.

It must communicate:

“An autonomous AI agent is currently watching the business.”

Header:

Market Intelligence

Subtitle:

VIU AI continuously monitors customer, market and business signals and investigates meaningful changes automatically.

Agent status card:

Market Intelligence Agent

● LIVE

Status:

Monitoring

Last cycle:

a few seconds ago

Next automatic scan:

in 2 minutes

Show four main metrics:

Sales

$89K

↓ 11%

Customer Signals

142

Negative Sentiment

47%

↑ 36%

Open Investigations

0 initially

Create a section:

SIGNAL SOURCES

Cards:

Gorilla

External intelligence

Reddit

Connected

X

Connected

LinkedIn

Connected

Internal Business Data

Sales

Connected

CRM

Connected

Support

Connected

These integrations are mock statuses for now.

==================================================

AGENT ACTIVITY FEED

==================================================

On the Intelligence screen create an important panel:

LIVE AGENT ACTIVITY

This should feel like an operations feed.

Example normal state:

12:04:11

Monitoring market signals

12:04:14

96 new conversations evaluated

12:04:15

No meaningful anomaly detected

12:06:11

New monitoring cycle started

During demo:

12:07:05

Market anomaly detected

12:07:06

Cross-referencing internal business metrics

12:07:07

Sales decline confirmed: -11%

12:07:08

Autonomous investigation started

Make new entries animate subtly into the feed.

==================================================

DEMO CONTROL

==================================================

Create a discreet button:

Demo Mode

It can open a small side panel.

Available actions:

Reset Scenario

Trigger Market Anomaly

Start Investigation

Complete Investigation

Find Decision Makers

Schedule Meeting

Open Decision Room

Approve Decision

Run Full Demo

RUN FULL DEMO is especially important.

When clicked, simulate the entire workflow automatically with reasonable delays.

This exists only to guarantee a reliable live demonstration.

Do not visually emphasize Demo Mode in the main UI.

==================================================

ANOMALY STATE

==================================================

When the anomaly occurs:

Show a prominent event card:

EMERGING BUSINESS RISK

Sales performance

↓ 11%

Negative customer signals

↑ 36%

142 market conversations evaluated

Text:

“VIU AI detected an unusual change across internal and external signals.”

Status:

Investigating automatically

The user must NOT need to click a button to start the investigation.

Autonomy must be visually obvious.

==================================================

SCREEN 2

INVESTIGATIONS

==================================================

Create a list of investigations.

Current active investigation:

Onboarding Friction

HIGH PRIORITY

Status:

Investigating

Detected:

Today, 12:07 PM

Metrics:

Sales

-11%

Negative signals

+36%

Confidence

Calculating

Clicking opens the investigation detail.

==================================================

INVESTIGATION DETAIL

==================================================

Header:

Autonomous Investigation

Onboarding Friction

Status indicator:

INVESTIGATING

Create a step timeline:

✓ Business anomaly detected

✓ Sales decline confirmed

✓ Market conversations retrieved

✓ Negative conversations clustered

● Evaluating dominant topics

○ Comparing timing with business metrics

○ Building hypothesis

○ Assessing confidence

○ Determining required action

As mock events occur, advance this timeline automatically.

==================================================

TOOL ACTIVITY

==================================================

Create a section:

AGENT TOOLS

This is important because it visually demonstrates a real autonomous agent architecture.

Example cards/events:

Gorilla

search_market_signals

Status:

Complete

Result:

142 relevant conversations

Sales Data

get_sales_metrics

Status:

Complete

Result:

Sales -11%

Gorilla

search_market_signals

Query:

"onboarding verification friction"

Status:

Complete

Result:

27 strongly related conversations

Company Directory

get_relevant_people

Initially:

Waiting

IMPORTANT:

Do not show model chain-of-thought.

Show only tool usage, inputs at a high level, results and observable decisions.

==================================================

TOPIC CLUSTERS

==================================================

Show:

Dominant Customer Topics

Onboarding Friction

27 signals

HIGH RELEVANCE

Pricing

11 signals

Performance

8 signals

Feature Requests

6 signals

Use a clear horizontal visualization.

Onboarding should visually dominate.

==================================================

INVESTIGATION COMPLETE STATE

==================================================

Transition automatically to:

INVESTIGATION COMPLETE

HIGH PRIORITY

Main statement:

“New onboarding verification flow is the strongest suspected contributor to the observed decline.”

Use careful language.

Do NOT state definitive causality.

Show:

Sales change

-11%

Negative signal change

+36%

Related conversations

27

Confidence

84%

Urgency

82 / 100

Add a small note:

“Correlation detected. Causality has not been established.”

==================================================

WHAT WE FOUND

==================================================

Create:

What VIU AI Found

“Customer complaints are increasingly concentrated around the new verification step introduced during onboarding. The timing overlaps with the observed decline in sales performance.”

Then:

Primary hypothesis

“The new verification step is introducing onboarding friction and may be contributing to lower conversion.”

Confidence:

84%

==================================================

SUPPORTING EVIDENCE

==================================================

Show realistic evidence cards.

Reddit

“The new verification step makes setup much harder than before. We almost gave up during onboarding.”

Negative

Onboarding

Engagement

143

X

“Loved the product but the latest onboarding flow is incredibly frustrating.”

Negative

Onboarding

Engagement

89

LinkedIn

“Our team struggled to get through the verification step during setup.”

Negative

Onboarding

Engagement

61

Buttons:

View source

Show all evidence

Later these cards will be populated by Gorilla results.

==================================================

RECOMMENDATION

==================================================

Create a strong recommendation card:

AGENT RECOMMENDATION

“Review the onboarding verification flow and evaluate a rollback or controlled experiment with a simplified experience.”

Urgency:

HIGH

Decision Required:

YES

Reason:

“The issue combines significant commercial impact with a concentrated increase in customer friction and requires a cross-functional product decision.”

The system should automatically continue to decision preparation.

==================================================

SCREEN 3

DECISION PREPARATION

==================================================

Title:

Preparing Business Decision

Subtitle:

“VIU AI determined that human judgment is required and is preparing a decision meeting.”

Show live autonomous actions:

Selecting required decision makers...

Checking organizational responsibilities...

Checking calendar availability...

Preparing decision brief...

Then display selected people:

Marina Costa

Head of Product

Required

Reason:

“Owns product prioritization and the onboarding experience.”

Available

Pedro Lima

Product Designer

Required

Reason:

“Responsible for the affected onboarding flow.”

Available

Ana Souza

Customer Success Lead

Required

Reason:

“Represents recurring customer issues and retention impact.”

Available

Engineering Lead

Not invited yet

Reason:

“Implementation may be required after the product decision.”

This distinction is important.

The agent must appear intelligent about WHO needs to participate.

==================================================

SCHEDULING

==================================================

Show:

Common availability found

Today

3:30 PM – 3:50 PM

20 minutes

Meeting:

Decision Review — Onboarding Friction

Participants:

Marina

Pedro

Ana

Agenda:

1. Business anomaly

2. Customer evidence

3. Primary hypothesis

4. Business impact

5. Proposed action

6. Decision

Automatically simulate meeting creation.

Status sequence:

Checking calendars...

Time found

Creating calendar event...

✓ Meeting created

Later calendarService will call Google Calendar.

==================================================

SCREEN 4

DECISION ROOM

==================================================

This is the hero screen of the entire application.

It must look excellent when projected during a live demo.

Full-width presentation-oriented experience.

Header:

DECISION ROOM

Onboarding Friction

Top right:

VIU AI Agent

● Presenting

Top metrics:

Sales

↓ 11%

Negative Signals

↑ 36%

Confidence

84%

Urgency

HIGH

Main presentation area.

The presentation has four stages:

1. WHAT CHANGED?

“Sales declined 11% while negative customer sentiment increased 36%.”

2. WHAT CUSTOMERS ARE SAYING

Show evidence and topic clustering.

3. WHAT WE FOUND

“27 relevant conversations are concentrated around onboarding friction, particularly the new verification step.”

4. RECOMMENDATION

“Evaluate a simplified onboarding flow through a controlled experiment or rollback.”

Allow manual navigation between stages.

Also allow the voice agent state to automatically change the active stage later.

==================================================

VOICE AGENT

==================================================

Create a persistent voice interface.

VIU AI Agent

States:

Ready

Speaking

Listening

Thinking

Create:

microphone button

animated audio waveform

live transcript area

Mock transcript:

VIU AI Agent:

“I called this meeting because I detected a meaningful change across customer and business signals. Sales declined eleven percent while negative customer sentiment increased thirty-six percent. My investigation found that the strongest emerging issue is related to the new onboarding verification step.”

User:

“Why do you think onboarding is the main issue?”

VIU AI Agent:

“Among the conversations analyzed, onboarding represents the largest emerging negative cluster. Twenty-seven relevant signals mention onboarding friction, compared with eleven related to pricing and eight related to performance.”

IMPORTANT:

Create a reusable VoiceAgent component.

Do not couple it directly to ElevenLabs.

Use voiceService.

Later developers will replace voiceService with ElevenLabs.

==================================================

EVIDENCE DRAWER

==================================================

Button:

Show Supporting Evidence

Open a large drawer.

Display:

source

post

sentiment

topic

engagement

relevance

source URL

Group by:

Reddit

X

LinkedIn

Support

This is important for agent auditability.

==================================================

DECISION CAPTURE

==================================================

After the presentation show:

DECISION REQUIRED

Proposed action:

“Run a 14-day experiment removing mandatory verification from the initial SMB onboarding flow.”

Owner:

Pedro Lima

Primary metric:

Onboarding completion rate

Secondary metrics:

Trial conversion

Negative onboarding sentiment

Duration:

14 days

Actions:

Approve

Modify

Reject

When user approves:

show:

DECISION APPROVED

Then trigger autonomous follow-up events.

==================================================

FOLLOW-UP ACTION

==================================================

Show:

VIU AI is executing the decision.

Animated checklist:

✓ Decision documented

✓ Product experiment created

✓ Pedro assigned as owner

✓ Success metric registered

✓ Follow-up scheduled

✓ Market monitoring updated

Then:

Monitoring will continue automatically.

Next decision checkpoint:

14 days

==================================================

SCREEN 5

DECISIONS

==================================================

Create a decision history page.

Show one decision:

Onboarding Experiment

Status:

Active

Triggered by:

Market anomaly

Decision:

Simplify onboarding verification

Owner:

Pedro Lima

Created:

Today

Follow-up:

14 days

Metrics monitored:

Onboarding completion

Trial conversion

Customer sentiment

==================================================

SCREEN 6

AGENT ACTIVITY

==================================================

Create a full agent audit page.

This page must show observable agent execution history.

Timeline example:

Market monitoring cycle started

Gorilla queried

142 conversations retrieved

Sales metrics retrieved

Business anomaly confirmed

Investigation started

Onboarding cluster identified

Additional evidence requested

Confidence updated to 84%

Decision required

Company directory queried

3 decision makers selected

Calendar availability checked

Meeting created

Decision approved

Follow-up action created

Allow filtering by:

All

Tools

Decisions

External Data

Actions

This should make the agent feel real and auditable.

==================================================

SCREEN 7

INTEGRATIONS

==================================================

Create integration cards.

ACTIVE / HACKATHON

Gorilla

Market Intelligence

Status: Ready

Featherless AI

LLM Inference

Status: Ready

Open Agent Loops

Agent Orchestration

Status: Ready

ElevenLabs

Voice Agent

Status: Ready to connect

Google Calendar

Scheduling

Status: Ready to connect

Sales Data

Internal business metrics

Status: Demo Dataset

FUTURE

Salesforce

HubSpot

Zendesk

Intercom

Slack

Linear

Jira

Do not implement these future integrations.

==================================================

DEMO DATA

==================================================

Seed exactly one strong demo scenario.

Company:

Acme SaaS

Internal metric:

Previous sales:

100000

Current sales:

89000

Change:

-11%

External intelligence:

142 relevant conversations

67 negative conversations

Negative signal increase:

+36%

Topic clusters:

Onboarding:

27

Pricing:

11

Performance:

8

Feature Requests:

6

Investigation:

Hypothesis:

“The newly introduced onboarding verification step is creating friction and may be contributing to lower conversion.”

Confidence:

84%

Urgency:

82

Urgency level:

HIGH

Recommendation:

“Review the onboarding verification flow and test a simplified experience.”

Decision:

“Run a 14-day experiment removing mandatory verification from the initial SMB onboarding flow.”

==================================================

AUTONOMY UX

==================================================

The most important UX principle:

Do not make the user manually trigger every step.

Most transitions must appear autonomous.

The user should primarily:

1. Observe.

2. Inspect evidence when desired.

3. Join the decision meeting.

4. Question the agent.

5. Approve or modify a business decision.

Everything before the business decision should feel like work performed automatically by the agent.

==================================================

DEMO FLOW

==================================================

The full demo should visually tell this story:

MONITORING

↓

ANOMALY DETECTED

↓

AUTONOMOUS INVESTIGATION

↓

GORILLA TOOL USED

↓

SALES DATA CHECKED

↓

ONBOARDING CLUSTER IDENTIFIED

↓

CONFIDENCE 84%

↓

HIGH URGENCY

↓

HUMAN DECISION REQUIRED

↓

RIGHT PEOPLE SELECTED

↓

CALENDAR AVAILABILITY FOUND

↓

DECISION MEETING CREATED

↓

AI PRESENTS FINDINGS

↓

HUMAN QUESTIONS AI

↓

DECISION APPROVED

↓

FOLLOW-UP EXECUTED

↓

MONITORING CONTINUES

Build the UI around making this flow understandable without requiring technical explanation.

==================================================

LOADING AND FAILURE STATES

==================================================

Create realistic loading states.

Also create simple failure states for future integrations.

Examples:

Gorilla unavailable

Calendar temporarily unavailable

Voice unavailable

The app should degrade gracefully.

Do not allow one failed integration to destroy the demo flow.

==================================================

DEMO FALLBACK ARCHITECTURE

==================================================

Create an environment/config concept that later developers can use:

USE_MOCK_MARKET_SIGNALS=true

USE_MOCK_AGENT=true

USE_MOCK_CALENDAR=true

USE_MOCK_VOICE=true

The frontend architecture must make it easy to switch between mock and real implementations.

The hackathon demo must remain usable even if an external API fails.

==================================================

IMPORTANT PRODUCT LANGUAGE

==================================================

Avoid:

“AI found the cause.”

Prefer:

“Strongest suspected contributor.”

“Primary hypothesis.”

“Correlation detected.”

“Confidence 84%.”

“Evidence suggests.”

This prevents the product from making unjustified causal claims.

==================================================

DO NOT BUILD

==================================================

Do not build:

authentication

billing

complex settings

multiple workspaces

chatbot homepage

generic admin dashboard

complex charts

multiple demo scenarios

real CRM integration

real Jira integration

real Salesforce integration

complex user management

PowerPoint generation

video avatar

social posting

==================================================

QUALITY REQUIREMENTS

==================================================

Use reusable components.

Use TypeScript.

Keep business logic out of presentation components.

Centralize mock data.

Centralize service abstractions.

Organize folders clearly.

Keep the project easy to understand when opened in VS Code.

The final result must feel like a coherent product, not a collection of disconnected hackathon screens.

Prioritize:

1. End-to-end story

2. Excellent UI

3. Clear autonomous agent activity

4. Decision Room

5. Auditability

6. Easy backend integration

Build the complete application now.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/d33f80d5-c3dd-4128-ad20-cc96a819e735).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

# VIU AI

VIU AI is an autonomous Market Intelligence AI Agent built for the Hack2L
AI Agents Hackathon. It monitors external customer/market signals and internal
business metrics, investigates meaningful anomalies, produces an evidence-backed
hypothesis, and brings the right humans into a decision workflow.

The hackathon goal is a reliable end-to-end demonstration of a real agent making
tool-use decisions. Optimize for a coherent working vertical slice, auditability,
and graceful fallback—not production-scale infrastructure.

## Required demo flow

Monitoring → anomaly detected → autonomous investigation → market signals and
sales metrics checked → evidence cross-referenced → primary hypothesis,
confidence, and urgency produced → human decision need determined → decision
makers selected → meeting scheduled → Decision Brief presented → human decision
captured → follow-up executed or monitored → monitoring resumes.

For the first real vertical slice, the frontend calls `POST /api/investigations`.
Open Agent Loops runs a Featherless-backed agent that decides whether to call the
Gorilla-backed `search_market_signals()` and fake `get_sales_metrics()` tools and
must gather validated evidence from both categories before concluding. Gorilla
keeps a deterministic fallback; ElevenLabs presents the derived, structured
Decision Room deck with a mock voice fallback. Google Calendar remains unintegrated.

## Current architecture

- React 19 and strict TypeScript on TanStack Start/TanStack Router.
- Vite, Nitro, Tailwind CSS 4, Radix/shadcn-style primitives, and React Query.
- Routes are file-based in `src/routes`; `src/routeTree.gen.ts` is generated.
- Client agent state uses `useSyncExternalStore` via `src/state/useAgent.ts`.
- The timer-driven demo agent and mock adapters live under `src/services/mock`.
- Shared UI-facing domain contracts live in `src/types/index.ts` and
  `src/services/types.ts`.
- Central demo fixtures live in `src/data/demo.ts`.
- `src/server.ts` and `src/start.ts` provide server/SSR infrastructure; the
  investigation API is stateless, with no database or authentication.

## Important directories

- `src/routes/` — pages and TanStack Start server routes.
- `src/components/layout/` — application shell and Demo Mode controls.
- `src/components/viu/` — VIU AI presentation components.
- `src/components/ui/` — reusable UI primitives; avoid unnecessary edits.
- `src/state/` — browser-side agent snapshot subscription.
- `src/services/` — service contracts, registry, HTTP adapters, and mocks.
- `src/services/mock/` — deterministic demo fallback providers.
- `src/server/` — server-only agent runtime, tools, and integrations when added.
- `src/data/` — centralized demo fixtures.
- `src/types/` — shared domain models.

## Commands

Use npm on the hackathon machine. `package-lock.json` is the npm lockfile; legacy
Lovable/Bun files may remain, but Bun must not be required for local development.

```sh
npm install
npm run dev
npm run build
npm run lint
npm test
```

Focused backend tests use Vitest and deterministic model clients. Add test
coverage with new backend behavior and keep provider-backed live checks manual.

## Architectural boundaries

- Keep React components presentation-focused; business and agent logic belongs
  in state/services/server modules.
- Preserve the existing UI and domain shapes. Avoid large refactors and visual
  redesigns unless explicitly requested.
- External systems must sit behind service or agent-tool abstractions.
- Agent orchestration and credentialed provider calls are server-only.
- Never expose API secrets to browser bundles or use a `VITE_` prefix for secrets.
- Featherless and Gorilla credentials must remain server-side.
- Use TanStack Start server routes for `/api/*`; do not add a separate Express
  server for the initial slice.
- Do not add a database unless persistence becomes demonstrably necessary.
- Keep browser state and API responses mapped to the existing `Investigation`,
  `ToolCall`, and `AgentEvent` contracts.
- Never edit `src/routeTree.gen.ts` manually.

## Integration locations

- Open Agent Loops: server-only agent runner under `src/server/`.
- Featherless: server-only model adapter/configuration used by the agent runner.
- Gorilla: bounded start-and-poll provider behind the server-side
  `search_market_signals` tool, with explicit provenance and mock fallback.
- Internal metrics: implementation behind `get_sales_metrics`.
- Google Calendar: server-side calendar service/tool behind the existing contract.
- ElevenLabs: `VoiceService` starts the browser conversation from a public agent
  ID or a short-lived signed URL returned by `GET /api/voice/session`; never ship
  its secret to the browser. Voice receives a deck and grounded context, and is
  not the investigation or slide-generation engine.
- Frontend HTTP calls: adapters under `src/services/http/`, not page components.

## Business and observability rules

- The agent must choose its evidence tools; application code must not pre-call
  both tools and pretend that the model chose them.
- Cross-reference internal and external evidence before presenting a strong
  hypothesis.
- Report a primary hypothesis, confidence, urgency, recommendation, and whether
  human judgment is required.
- Never claim causation when evidence only establishes correlation. Prefer
  “primary hypothesis,” “suspected contributor,” and “evidence suggests.”
- Never expose chain-of-thought, hidden reasoning, or reasoning-token streams.
- Agent UI may show only observable actions: tool calls, tool results,
  observations, cited evidence, confidence changes, conclusions, and decisions.
- Preserve source provenance and make failures explicit rather than fabricating
  successful integrations.

## Do not build

- Authentication, billing, user/workspace management, or complex settings.
- A database, queue, or separate backend service for the first vertical slice.
- Further Calendar or ElevenLabs knowledge-base/document ingestion work unless
  explicitly requested.
- CRM, Jira, Salesforce, social posting, PowerPoint, or video-avatar features.
- Multiple demo scenarios, generic dashboards, or broad UI refactors.
- Browser-side calls to credentialed LLM or data-provider APIs.

## Hackathon reliability

- Keep all mock providers available as deterministic demo fallback.
- Bound agent runs with timeouts, cancellation, step limits, and validated output.
- Degrade gracefully when an external provider fails; one failed integration must
  not make the demo unusable.
- Prefer a synchronous, stateless first investigation endpoint over polling,
  queues, streaming infrastructure, or persistence.
- Keep changes small, typed, testable, and easy to revert.
- Before handoff, run build, lint, relevant tests, and a manual full-demo pass.

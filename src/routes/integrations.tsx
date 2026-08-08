import { createFileRoute } from "@tanstack/react-router";
import { integrations } from "@/data/demo";
import { Chip, SectionLabel } from "@/components/viu/primitives";
import type { IntegrationStatus } from "@/types";

export const Route = createFileRoute("/integrations")({
  head: () => ({
    meta: [
      { title: "Integrations — VIU AI" },
      {
        name: "description",
        content:
          "Agent stack and data connectors powering VIU AI: Gorilla, Featherless AI, Open Agent Loops, ElevenLabs and Google Calendar.",
      },
      { property: "og:title", content: "Integrations — VIU AI" },
      {
        property: "og:description",
        content: "Connectors and agent infrastructure behind VIU AI.",
      },
    ],
  }),
  component: IntegrationsPage,
});

const statusChip: Record<
  IntegrationStatus["status"],
  { label: string; tone: "ok" | "warn" | "agent" | "muted" | "danger" }
> = {
  ready: { label: "Ready", tone: "ok" },
  connected: { label: "Connected", tone: "ok" },
  ready_to_connect: { label: "Ready to connect", tone: "warn" },
  demo_dataset: { label: "Demo dataset", tone: "agent" },
  unavailable: { label: "Planned", tone: "muted" },
};

function Card({ item }: { item: IntegrationStatus }) {
  const chip = statusChip[item.status];
  return (
    <div className="panel flex flex-col gap-1.5 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[14px] font-semibold">{item.name}</span>
        <Chip tone={chip.tone}>{chip.label}</Chip>
      </div>
      <div className="text-[12px] text-muted-foreground">{item.category}</div>
      <p className="mt-1 text-[12px] text-muted-foreground">{item.description}</p>
    </div>
  );
}

function IntegrationsPage() {
  const active = integrations.filter((i) => i.group !== "future");
  const future = integrations.filter((i) => i.group === "future");

  return (
    <div className="mx-auto max-w-[1200px] px-8 py-7">
      <header className="mb-6">
        <h1 className="text-[22px] font-semibold tracking-tight">Integrations</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Adapters are swapped in the service layer — the UI never changes. Mock adapters keep the
          demo running when an external API is unavailable.
        </p>
      </header>

      <SectionLabel className="mb-3">Active · hackathon</SectionLabel>
      <div className="mb-8 grid grid-cols-3 gap-4">
        {active.map((i) => (
          <Card key={i.id} item={i} />
        ))}
      </div>

      <SectionLabel className="mb-3">Future connectors</SectionLabel>
      <div className="grid grid-cols-4 gap-3">
        {future.map((i) => (
          <div
            key={i.id}
            className="rounded-lg border border-dashed border-border px-4 py-3 text-[13px] text-muted-foreground"
          >
            {i.name}
          </div>
        ))}
      </div>
    </div>
  );
}

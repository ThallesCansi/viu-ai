import { Link, useRouterState } from "@tanstack/react-router";
import { Activity, BrainCircuit, GitBranch, Plug, Radar, ScrollText } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusDot } from "@/components/viu/primitives";
import { WORKSPACE } from "@/data/demo";
import { useAgent } from "@/state/useAgent";

const nav = [
  { to: "/", label: "Intelligence", icon: Radar, exact: true },
  { to: "/investigations", label: "Investigations", icon: GitBranch, exact: false },
  { to: "/decisions", label: "Decisions", icon: ScrollText, exact: false },
  { to: "/activity", label: "Agent Activity", icon: Activity, exact: false },
  { to: "/integrations", label: "Integrations", icon: Plug, exact: false },
] as const;

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { status } = useAgent();

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-md border border-agent/40 bg-agent-soft">
          <BrainCircuit className="h-4 w-4 text-agent" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-tight text-sidebar-foreground">VIU AI</div>
          <div className="text-[10px] tracking-wide text-muted-foreground">
            Autonomous Market Intelligence
          </div>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-3 py-2">
        {nav.map((item) => {
          const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="m-3 rounded-md border border-sidebar-border bg-surface p-3">
        <div className="text-[12px] font-medium text-sidebar-foreground">{WORKSPACE.agentName}</div>
        <div className="mt-1.5 flex items-center gap-2">
          <StatusDot tone="ok" pulse />
          <span className="text-[11px] font-semibold tracking-wide text-ok uppercase">Active</span>
        </div>
        <div className="mt-1 text-[11px] text-muted-foreground">
          {status === "monitoring" ? "Operating autonomously" : "Operating autonomously"}
        </div>
      </div>
    </aside>
  );
}

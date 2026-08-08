import { useSyncExternalStore } from "react";
import { agentService } from "@/services";
import type { AgentSnapshot } from "@/services/types";

const serverSnapshot = agentService.getSnapshot();

/** Subscribes React to the agent engine. All agent logic lives in the service layer. */
export function useAgent(): AgentSnapshot {
  return useSyncExternalStore(
    (cb) => agentService.subscribe(cb),
    () => agentService.getSnapshot(),
    () => serverSnapshot,
  );
}

export { agentService };

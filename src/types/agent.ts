import type { AgentPatch, PatchOperation } from "../agent/patchProtocol";

export type AgentStatus = "idle" | "thinking" | "applying" | "failed";

export interface ChatMessage {
  id: string;
  actor: "user" | "agent" | "system";
  content: string;
  createdAt: number;
}

export interface PatchLogEntry {
  id: string;
  patchId: string;
  description: string;
  operations: PatchOperation[];
  status: "committed" | "rolled_back";
  createdAt: number;
}

export interface AgentRuntimeState {
  status: AgentStatus;
  messages: ChatMessage[];
  activeOperations: PatchOperation[];
  currentPatch?: AgentPatch;
  currentPatchId?: string;
  currentPatchDescription?: string;
  error?: string;
}

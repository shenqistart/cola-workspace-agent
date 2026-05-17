import { produce } from "immer";
import { create } from "zustand";
import { applyPatchOperation } from "../agent/patchApplier";
import type { AgentPatch, PatchOperation } from "../agent/patchProtocol";
import { describeOperation } from "../agent/patchProtocol";
import { validateAgentPatch } from "../agent/patchValidator";
import { createMockAgentPatch } from "../agent/mockAgent";
import type { AgentRuntimeState, ChatMessage, PatchLogEntry } from "../types/agent";
import type { CanvasSnapshot, Point } from "../types/canvas";
import type { Transaction } from "../types/history";
import { cloneSnapshot } from "../utils/diff";
import { createId } from "../utils/ids";
import { createEmptyCanvasSnapshot } from "../utils/layout";
import { now, wait } from "../utils/time";

interface CanvasStoreActions {
  submitUserMessage: (content: string) => Promise<void>;
  applyAgentPatchWithRollback: (patch: AgentPatch) => Promise<void>;
  dragBlock: (id: string, position: Point) => void;
  selectBlock: (ids: string[]) => void;
  undo: () => void;
  redo: () => void;
  resetDemo: () => void;
}

export interface CanvasStoreState extends CanvasStoreActions {
  canvas: CanvasSnapshot;
  agent: AgentRuntimeState;
  undoStack: Transaction[];
  redoStack: Transaction[];
  pendingTransaction?: Transaction;
  patchLog: PatchLogEntry[];
}

const initialAgentState: AgentRuntimeState = {
  status: "idle",
  messages: [
    {
      id: "system_intro",
      actor: "system",
      content: "输入自然语言指令，Agent 会以结构化 Patch 增量更新工作区。",
      createdAt: now(),
    },
  ],
  activeOperations: [],
};

function createInitialState(): Pick<
  CanvasStoreState,
  "canvas" | "agent" | "undoStack" | "redoStack" | "pendingTransaction" | "patchLog"
> {
  return {
    canvas: createEmptyCanvasSnapshot(),
    agent: cloneAgentState(initialAgentState),
    undoStack: [],
    redoStack: [],
    pendingTransaction: undefined,
    patchLog: [],
  };
}

export const useCanvasStore = create<CanvasStoreState>((set, get) => {
  const write = (recipe: (draft: CanvasStoreState) => void) => {
    set(produce<CanvasStoreState>(recipe));
  };

  const addMessage = (message: ChatMessage) => {
    write((state) => {
      state.agent.messages.push(message);
    });
  };

  return {
    ...createInitialState(),

    submitUserMessage: async (content: string) => {
      const trimmedContent = content.trim();
      if (!trimmedContent) {
        return;
      }

      addMessage({
        id: createId("message_user"),
        actor: "user",
        content: trimmedContent,
        createdAt: now(),
      });

      write((state) => {
        state.agent.status = "thinking";
        state.agent.error = undefined;
        state.agent.currentPatch = undefined;
        state.agent.currentPatchId = undefined;
        state.agent.currentPatchDescription = undefined;
        state.agent.activeOperations = [];
      });

      try {
        const patch = await createMockAgentPatch(trimmedContent, cloneSnapshot(get().canvas));
        addMessage({
          id: createId("message_agent"),
          actor: "agent",
          content: patch.summary ?? patch.description,
          createdAt: now(),
        });
        if (patch.operations.length === 0) {
          write((state) => {
            state.agent.status = "idle";
            state.agent.currentPatch = undefined;
            state.agent.currentPatchId = undefined;
            state.agent.currentPatchDescription = undefined;
            state.agent.activeOperations = [];
          });
          return;
        }
        await get().applyAgentPatchWithRollback(patch);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown agent error";
        write((state) => {
          state.agent.status = "failed";
          state.agent.error = message;
        });
        addMessage({
          id: createId("message_agent_error"),
          actor: "agent",
          content: `执行失败：${message}`,
          createdAt: now(),
        });
      }
    },

    applyAgentPatchWithRollback: async (patch: AgentPatch) => {
      const before = cloneSnapshot(get().canvas);
      const pending: Transaction = {
        id: createId("tx_agent"),
        before,
        after: before,
        source: "agent",
        label: patch.description,
        createdAt: now(),
      };

      write((state) => {
        state.pendingTransaction = pending;
        state.agent.status = "applying";
        state.agent.currentPatch = patch;
        state.agent.currentPatchId = patch.id;
        state.agent.currentPatchDescription = patch.description;
        state.agent.activeOperations = [];
        state.agent.error = undefined;
      });

      try {
        const validation = validateAgentPatch(patch, before);
        if (!validation.ok) {
          throw new Error(validation.errors.join("\n"));
        }

        for (const operation of patch.operations) {
          const nextCanvas = applyPatchOperation(get().canvas, operation, "agent");
          write((state) => {
            state.agent.activeOperations.push(operation);
            state.canvas = nextCanvas;
          });
          await wait(getStreamDelayMs());
        }

        const after = cloneSnapshot(get().canvas);
        write((state) => {
          const transaction = {
            ...pending,
            after,
          };

          state.pendingTransaction = undefined;
          state.undoStack.push(transaction);
          state.redoStack = [];
          state.patchLog.unshift({
            id: createId("patch_log"),
            patchId: patch.id,
            description: patch.description,
            operations: patch.operations,
            status: "committed",
            createdAt: now(),
          });
          state.agent.status = "idle";
          state.agent.currentPatch = undefined;
          state.agent.activeOperations = [];
          state.agent.currentPatchId = undefined;
          state.agent.currentPatchDescription = undefined;
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown patch error";
        write((state) => {
          state.canvas = before;
          state.pendingTransaction = undefined;
          state.patchLog.unshift({
            id: createId("patch_log"),
            patchId: patch.id,
            description: patch.description,
            operations: patch.operations,
            status: "rolled_back",
            createdAt: now(),
          });
          state.agent.status = "failed";
          state.agent.error = message;
          state.agent.activeOperations = [];
          state.agent.currentPatch = patch;
          state.agent.currentPatchId = patch.id;
          state.agent.currentPatchDescription = patch.description;
        });
        throw error;
      }
    },

    dragBlock: (id: string, position: Point) => {
      const before = cloneSnapshot(get().canvas);
      const block = before.blocks[id];
      const label = block && "label" in block ? `移动 ${block.label}` : `移动 ${id}`;
      const operation: PatchOperation = {
        op: "moveBlock",
        id,
        position,
        source: "user",
        forceMove: true,
      };
      const after = applyPatchOperation(before, operation, "user");

      write((state) => {
        state.canvas = after;
        state.undoStack.push({
          id: createId("tx_user"),
          before,
          after,
          source: "user",
          label,
          createdAt: now(),
        });
        state.redoStack = [];
      });
    },

    selectBlock: (ids: string[]) => {
      const currentIds = get().canvas.selectedBlockIds;
      if (areStringArraysEqual(currentIds, ids)) {
        return;
      }

      write((state) => {
        state.canvas.selectedBlockIds = ids;
      });
    },

    undo: () => {
      const transaction = get().undoStack.at(-1);
      if (!transaction) {
        return;
      }

      write((state) => {
        state.canvas = cloneSnapshot(transaction.before);
        state.undoStack.pop();
        state.redoStack.push(transaction);
        state.agent.status = "idle";
        state.agent.error = undefined;
      });
    },

    redo: () => {
      const transaction = get().redoStack.at(-1);
      if (!transaction) {
        return;
      }

      write((state) => {
        state.canvas = cloneSnapshot(transaction.after);
        state.redoStack.pop();
        state.undoStack.push(transaction);
        state.agent.status = "idle";
        state.agent.error = undefined;
      });
    },

    resetDemo: () => {
      write((state) => {
        const nextState = createInitialState();
        state.canvas = nextState.canvas;
        state.agent = nextState.agent;
        state.undoStack = nextState.undoStack;
        state.redoStack = nextState.redoStack;
        state.pendingTransaction = nextState.pendingTransaction;
        state.patchLog = nextState.patchLog;
      });
    },
  };
});

function cloneAgentState(state: AgentRuntimeState): AgentRuntimeState {
  return structuredClone(state);
}

function getStreamDelayMs() {
  return import.meta.env.MODE === "test" ? 0 : 260;
}

function areStringArraysEqual(left: string[], right: string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export { describeOperation };

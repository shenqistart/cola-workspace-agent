import { beforeEach, describe, expect, it } from "vitest";
import { applyAgentPatch } from "../agent/patchApplier";
import { createMockAgentPatch } from "../agent/mockAgent";
import type { AgentPatch } from "../agent/patchProtocol";
import { useCanvasStore } from "../store/useCanvasStore";
import { createEmptyCanvasSnapshot, createFlowNode } from "../utils/layout";

describe("agent patch transaction history", () => {
  beforeEach(() => {
    useCanvasStore.getState().resetDemo();
  });

  it("can undo and redo an applied agent patch", async () => {
    const node = createFlowNode({
      id: "node_test_start",
      label: "开始",
      semanticRole: "start",
      branchKey: "registration",
      position: { x: 80, y: 80 },
    });

    const patch: AgentPatch = {
      id: "patch_test_create",
      description: "Create a test node",
      baseVersion: 0,
      affectedBlockIds: [node.id],
      operations: [{ op: "createBlock", block: node }],
      createdAt: Date.now(),
    };

    await useCanvasStore.getState().applyAgentPatchWithRollback(patch);

    expect(useCanvasStore.getState().canvas.blocks[node.id]).toBeDefined();
    expect(useCanvasStore.getState().undoStack).toHaveLength(1);

    useCanvasStore.getState().undo();
    expect(useCanvasStore.getState().canvas.blocks[node.id]).toBeUndefined();
    expect(useCanvasStore.getState().redoStack).toHaveLength(1);

    useCanvasStore.getState().redo();
    expect(useCanvasStore.getState().canvas.blocks[node.id]).toBeDefined();
    expect(useCanvasStore.getState().undoStack).toHaveLength(1);
  });

  it("applies the phone retry patch without deleting the completion node", async () => {
    const initial = createEmptyCanvasSnapshot();
    const registrationPatch = await createMockAgentPatch(
      "帮我画一个用户注册的流程图，包含邮箱验证和手机验证两条路径",
      initial,
    );
    const registrationSnapshot = applyAgentPatch(initial, registrationPatch);

    const phonePatch = await createMockAgentPatch(
      "把手机验证那条路径加一个短信发送失败的重试逻辑",
      registrationSnapshot,
    );
    const result = applyAgentPatch(registrationSnapshot, phonePatch);

    expect(result.blocks.node_complete).toBeDefined();
    expect(result.blocks.node_sms_failed_decision).toBeDefined();
    expect(result.blocks.node_sms_retry).toBeDefined();
    expect(result.blocks.edge_phone_complete).toBeUndefined();
  });
});

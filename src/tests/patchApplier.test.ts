import { beforeEach, describe, expect, it } from "vitest";
import { applyAgentPatch, applyPatchOperation } from "../agent/patchApplier";
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

  it("does not move the email branch when inserting phone retry logic", async () => {
    const initial = createEmptyCanvasSnapshot();
    const registrationPatch = await createMockAgentPatch(
      "帮我画一个用户注册的流程图，包含邮箱验证和手机验证两条路径",
      initial,
    );
    const registrationSnapshot = applyAgentPatch(initial, registrationPatch);
    const emailBefore = registrationSnapshot.blocks.node_email_verify;

    const phonePatch = await createMockAgentPatch(
      "把手机验证那条路径加一个短信发送失败的重试逻辑",
      registrationSnapshot,
    );
    const result = applyAgentPatch(registrationSnapshot, phonePatch);
    const emailAfter = result.blocks.node_email_verify;

    expect(phonePatch.operations.some((operation) => operation.op === "updateBlock")).toBe(
      false,
    );
    expect(emailBefore?.type).toBe("flowNode");
    expect(emailAfter?.type).toBe("flowNode");
    if (emailBefore?.type !== "flowNode" || emailAfter?.type !== "flowNode") return;
    expect(emailAfter.position).toEqual(emailBefore.position);
    expect(emailAfter.positionSource).toBe(emailBefore.positionSource);
  });

  it("keeps a user-dragged phone node position during phone branch insertAfter", async () => {
    const initial = createEmptyCanvasSnapshot();
    const registrationPatch = await createMockAgentPatch(
      "帮我画一个用户注册的流程图，包含邮箱验证和手机验证两条路径",
      initial,
    );
    const registrationSnapshot = applyAgentPatch(initial, registrationPatch);
    const draggedSnapshot = applyPatchOperation(
      registrationSnapshot,
      {
        op: "moveBlock",
        id: "node_phone_verify",
        position: { x: 1180, y: 420 },
        source: "user",
        forceMove: true,
      },
      "user",
    );

    const phonePatch = await createMockAgentPatch(
      "把手机验证那条路径加一个短信发送失败的重试逻辑",
      draggedSnapshot,
    );
    const result = applyAgentPatch(draggedSnapshot, phonePatch);
    const phoneNode = result.blocks.node_phone_verify;

    expect(phoneNode?.type).toBe("flowNode");
    if (phoneNode?.type !== "flowNode") return;
    expect(phoneNode.position).toEqual({ x: 1180, y: 420 });
    expect(phoneNode.positionSource).toBe("user");
  });

  it("rolls back invalid patches without adding undo history", async () => {
    const patch = await createMockAgentPatch(
      "测试失败回滚",
      useCanvasStore.getState().canvas,
    );

    await expect(
      useCanvasStore.getState().applyAgentPatchWithRollback(patch),
    ).rejects.toThrow('anchorId "node_missing_anchor" does not exist');

    const state = useCanvasStore.getState();
    expect(state.canvas.blocks.node_rollback_probe).toBeUndefined();
    expect(state.pendingTransaction).toBeUndefined();
    expect(state.undoStack).toHaveLength(0);
    expect(state.patchLog[0]?.status).toBe("rolled_back");
    expect(state.agent.status).toBe("failed");
  });

  it("shows rollback failure reason in chat for invalid mock instruction", async () => {
    await useCanvasStore.getState().submitUserMessage("测试失败回滚");

    const state = useCanvasStore.getState();
    expect(state.undoStack).toHaveLength(0);
    expect(state.patchLog[0]?.status).toBe("rolled_back");
    expect(state.agent.messages.at(-1)?.content).toContain("执行失败");
  });
});

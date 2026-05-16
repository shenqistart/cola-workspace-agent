import { describe, expect, it } from "vitest";
import { applyAgentPatch } from "../agent/patchApplier";
import type { AgentPatch } from "../agent/patchProtocol";
import { createEmptyCanvasSnapshot, createFlowNode } from "../utils/layout";

describe("layout conflict resolution", () => {
  it("preserves a user-dragged node position when an agent update includes position", () => {
    const snapshot = createEmptyCanvasSnapshot();
    const phoneNode = createFlowNode({
      id: "node_phone_verify",
      label: "手机验证",
      description: "user moved this node",
      semanticRole: "action",
      branchKey: "phone",
      position: { x: 1200, y: 360 },
    });
    phoneNode.positionSource = "user";
    snapshot.blocks[phoneNode.id] = phoneNode;
    snapshot.blockOrder.push(phoneNode.id);
    snapshot.manualLayoutMap[phoneNode.id] = {
      blockId: phoneNode.id,
      position: phoneNode.position,
      updatedAt: Date.now(),
      updatedBy: "user",
    };

    const patch: AgentPatch = {
      id: "patch_try_overwrite",
      description: "Agent tries to move phone branch",
      baseVersion: snapshot.version,
      affectedBlockIds: [phoneNode.id],
      operations: [
        {
          op: "updateBlock",
          id: phoneNode.id,
          patch: {
            position: { x: 420, y: 88 },
            positionSource: "agent",
          },
        },
        {
          op: "moveBlock",
          id: phoneNode.id,
          position: { x: 320, y: 120 },
          source: "agent",
        },
      ],
      createdAt: Date.now(),
    };

    const result = applyAgentPatch(snapshot, patch);
    const resultNode = result.blocks[phoneNode.id];

    expect(resultNode?.type).toBe("flowNode");
    if (resultNode?.type !== "flowNode") return;
    expect(resultNode.position).toEqual({ x: 1200, y: 360 });
    expect(resultNode.positionSource).toBe("user");
  });
});

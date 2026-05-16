import { describe, expect, it } from "vitest";
import type { AgentPatch } from "../agent/patchProtocol";
import { validateAgentPatch } from "../agent/patchValidator";
import { createEmptyCanvasSnapshot, createFlowEdge, createFlowNode } from "../utils/layout";

describe("patch validator", () => {
  it("accepts createBlock, createEdge, and insertAfter when references are valid", () => {
    const snapshot = createEmptyCanvasSnapshot();
    const start = createFlowNode({
      id: "node_start",
      label: "开始",
      semanticRole: "start",
      position: { x: 0, y: 0 },
    });
    snapshot.blocks[start.id] = start;
    snapshot.blockOrder.push(start.id);

    const next = createFlowNode({
      id: "node_next",
      label: "下一步",
      semanticRole: "action",
      position: { x: 260, y: 0 },
    });
    const edge = createFlowEdge({
      id: "edge_start_next",
      source: start.id,
      target: next.id,
    });

    const patch: AgentPatch = {
      id: "patch_valid_insert",
      description: "Valid insert",
      baseVersion: snapshot.version,
      affectedBlockIds: [next.id, edge.id],
      operations: [
        {
          op: "insertAfter",
          anchorId: start.id,
          blocks: [next],
          edges: [edge],
          layoutScope: "local",
        },
      ],
      createdAt: Date.now(),
    };

    expect(validateAgentPatch(patch, snapshot)).toEqual({ ok: true });
  });

  it("rejects edges with missing source or target nodes", () => {
    const snapshot = createEmptyCanvasSnapshot();
    const start = createFlowNode({
      id: "node_start",
      label: "开始",
      semanticRole: "start",
      position: { x: 0, y: 0 },
    });
    snapshot.blocks[start.id] = start;
    snapshot.blockOrder.push(start.id);

    const patch: AgentPatch = {
      id: "patch_invalid_edge",
      description: "Invalid edge",
      baseVersion: snapshot.version,
      affectedBlockIds: ["edge_missing"],
      operations: [
        {
          op: "createEdge",
          edge: createFlowEdge({
            id: "edge_missing",
            source: start.id,
            target: "node_missing",
          }),
        },
      ],
      createdAt: Date.now(),
    };

    const result = validateAgentPatch(patch, snapshot);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join("\n")).toContain('edge target "node_missing" does not exist');
    }
  });
});

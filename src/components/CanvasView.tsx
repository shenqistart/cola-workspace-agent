import { useEffect, useMemo, useRef } from "react";
import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  type ReactFlowInstance,
  type Edge,
  type Node,
} from "@xyflow/react";
import { CanvasNode, type WorkspaceNodeData } from "./CanvasNode";
import { useCanvasStore } from "../store/useCanvasStore";
import { isFlowEdgeBlock, isFlowNodeBlock } from "../types/canvas";

const nodeTypes = {
  workspaceNode: CanvasNode,
};

export function CanvasView() {
  const canvas = useCanvasStore((state) => state.canvas);
  const dragBlock = useCanvasStore((state) => state.dragBlock);
  const selectBlock = useCanvasStore((state) => state.selectBlock);
  const flowInstanceRef = useRef<ReactFlowInstance<Node<WorkspaceNodeData>, Edge> | null>(
    null,
  );

  const nodes = useMemo<Node<WorkspaceNodeData>[]>(
    () =>
      canvas.blockOrder
        .map((id) => canvas.blocks[id])
        .filter(isFlowNodeBlock)
        .map((block) => ({
          id: block.id,
          type: "workspaceNode",
          position: block.position,
          data: { block },
          selected: canvas.selectedBlockIds.includes(block.id),
        })),
    [canvas],
  );

  const edges = useMemo<Edge[]>(
    () =>
      canvas.blockOrder
        .map((id) => canvas.blocks[id])
        .filter(isFlowEdgeBlock)
        .map((edge) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          label: edge.label,
          animated: edge.animated,
          markerEnd: { type: MarkerType.ArrowClosed },
          className: edge.semanticRole === "failure" ? "text-[#ba5a4a]" : undefined,
          style: {
            stroke:
              edge.semanticRole === "retry"
                ? "#d58b31"
                : edge.semanticRole === "failure"
                  ? "#c95f52"
                  : "#59789f",
          },
        })),
    [canvas],
  );

  useEffect(() => {
    if (nodes.length === 0) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      flowInstanceRef.current?.fitView({ padding: 0.14, duration: 280 });
    });

    return () => cancelAnimationFrame(frame);
  }, [nodes.length, edges.length]);

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={1.6}
        onInit={(instance) => {
          flowInstanceRef.current = instance;
        }}
        onNodeClick={(_, node) => selectBlock([node.id])}
        onPaneClick={() => selectBlock([])}
        onNodeDragStop={(_, node) => {
          dragBlock(node.id, node.position);
        }}
        onSelectionChange={({ nodes: selectedNodes }) => {
          selectBlock(selectedNodes.map((node) => node.id));
        }}
      >
        <Background color="#c8d3e0" gap={22} />
        <Controls position="bottom-left" />
        <MiniMap
          position="bottom-right"
          pannable
          zoomable
          nodeStrokeWidth={3}
          nodeColor={(node) => {
            const block = (node.data as WorkspaceNodeData | undefined)?.block;
            if (block?.semanticRole === "success") return "#75ad7b";
            if (block?.semanticRole === "decision") return "#c9a65b";
            if (block?.semanticRole === "warning") return "#d39d65";
            return "#81a5d4";
          }}
        />
      </ReactFlow>
    </div>
  );
}

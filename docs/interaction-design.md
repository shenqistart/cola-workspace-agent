# Interaction Design

Cola Workspace Agent is organized around one interview-friendly path: the user asks for a registration flow, manually adjusts a node, then asks the Agent to extend one branch without destroying their layout.

## Layout

- Header: project identity, Agent status, undo, redo, reset.
- Left panel: chat messages, example prompts, and request input.
- Center workspace: React Flow graph with pan, zoom, drag, Controls, and MiniMap.
- Right panel: selected block inspector, transaction timeline, and active patch preview.

## Core Behaviors

- Node selection updates the Inspector.
- Node drag commits a user transaction on drag stop.
- Agent operations stream one by one to make patch application visible.
- Timeline separates committed patches from user move transactions.
- Patch Preview shows the active patch id, description, and applied operations.

## Visual Language

Node color and icon choices map to semantic roles: start, input, decision, action, warning, and success. The workspace uses React Flow edges for relationships and DOM-rendered nodes for readable content.

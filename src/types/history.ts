import type { CanvasSnapshot } from "./canvas";

export type TransactionSource = "agent" | "user" | "system";

export interface Transaction {
  id: string;
  before: CanvasSnapshot;
  after: CanvasSnapshot;
  source: TransactionSource;
  label: string;
  createdAt: number;
}

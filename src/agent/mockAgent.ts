import type { CanvasSnapshot, FlowNodeBlock } from "../types/canvas";
import { createId } from "../utils/ids";
import { createFlowEdge, createFlowNode } from "../utils/layout";
import { now } from "../utils/time";
import type { AgentPatch, PatchOperation } from "./patchProtocol";

const initialInstruction =
  "帮我画一个用户注册的流程图，包含邮箱验证和手机验证两条路径";
const phoneRetryInstruction = "把手机验证那条路径加一个短信发送失败的重试逻辑";
const emailExpiryInstruction = "把邮箱验证路径加一个验证码过期判断";
const rollbackTestInstruction = "测试失败回滚";

export const examplePrompts = [
  initialInstruction,
  phoneRetryInstruction,
  emailExpiryInstruction,
  rollbackTestInstruction,
];

export async function createMockAgentPatch(
  prompt: string,
  snapshot: CanvasSnapshot,
): Promise<AgentPatch> {
  const normalizedPrompt = prompt.trim();

  if (normalizedPrompt.includes("测试失败回滚")) {
    return createRollbackTestPatch(snapshot);
  }

  if (
    normalizedPrompt.includes("注册") ||
    normalizedPrompt.includes("流程图") ||
    Object.keys(snapshot.blocks).length === 0
  ) {
    return createRegistrationFlowPatch(snapshot);
  }

  if (normalizedPrompt.includes("手机") || normalizedPrompt.includes("短信")) {
    return createPhoneRetryPatch(snapshot);
  }

  if (normalizedPrompt.includes("邮箱") || normalizedPrompt.includes("验证码")) {
    return createEmailExpiryPatch(snapshot);
  }

  return createUnsupportedPatch(snapshot, normalizedPrompt);
}

function createRegistrationFlowPatch(snapshot: CanvasSnapshot): AgentPatch {
  const nodes = [
    createFlowNode({
      id: "node_start",
      semanticId: "registration.start",
      label: "开始注册",
      description: "用户打开注册入口并填写基础信息",
      semanticRole: "start",
      branchKey: "registration",
      position: { x: 60, y: 120 },
    }),
    createFlowNode({
      id: "node_email_input",
      semanticId: "registration.email_input",
      label: "填写邮箱与密码",
      description: "收集账号凭证，准备验证身份",
      semanticRole: "input",
      branchKey: "registration",
      position: { x: 280, y: 120 },
    }),
    createFlowNode({
      id: "node_choose_method",
      semanticId: "registration.choose_method",
      label: "选择验证方式",
      description: "用户选择邮箱验证或手机验证",
      semanticRole: "decision",
      branchKey: "registration",
      position: { x: 500, y: 120 },
    }),
    createFlowNode({
      id: "node_email_verify",
      semanticId: "registration.email_verify",
      label: "邮箱验证",
      description: "发送邮件验证码并等待用户确认",
      semanticRole: "action",
      branchKey: "email",
      position: { x: 740, y: 28 },
    }),
    createFlowNode({
      id: "node_phone_verify",
      semanticId: "registration.phone_verify",
      label: "手机验证",
      description: "发送短信验证码并完成手机号校验",
      semanticRole: "action",
      branchKey: "phone",
      position: { x: 740, y: 220 },
    }),
    createFlowNode({
      id: "node_complete",
      semanticId: "registration.complete",
      label: "注册完成",
      description: "账号创建成功，进入欢迎页",
      semanticRole: "success",
      branchKey: "registration",
      position: { x: 980, y: 120 },
    }),
  ].filter((node) => !snapshot.blocks[node.id]);

  const edges = [
    createFlowEdge({
      id: "edge_start_email_input",
      source: "node_start",
      target: "node_email_input",
      semanticRole: "primary",
      branchKey: "registration",
      animated: true,
    }),
    createFlowEdge({
      id: "edge_email_input_choose",
      source: "node_email_input",
      target: "node_choose_method",
      semanticRole: "primary",
      branchKey: "registration",
      animated: true,
    }),
    createFlowEdge({
      id: "edge_choose_email",
      source: "node_choose_method",
      target: "node_email_verify",
      label: "邮箱路径",
      semanticRole: "branch",
      branchKey: "email",
      animated: true,
    }),
    createFlowEdge({
      id: "edge_choose_phone",
      source: "node_choose_method",
      target: "node_phone_verify",
      label: "手机路径",
      semanticRole: "branch",
      branchKey: "phone",
      animated: true,
    }),
    createFlowEdge({
      id: "edge_email_complete",
      source: "node_email_verify",
      target: "node_complete",
      label: "验证通过",
      semanticRole: "primary",
      branchKey: "email",
      animated: true,
    }),
    createFlowEdge({
      id: "edge_phone_complete",
      source: "node_phone_verify",
      target: "node_complete",
      label: "验证通过",
      semanticRole: "primary",
      branchKey: "phone",
      animated: true,
    }),
  ].filter((edge) => !snapshot.blocks[edge.id]);

  return {
    id: createId("patch_registration"),
    description: "生成用户注册双验证路径流程图",
    baseVersion: snapshot.version,
    affectedBlockIds: [...nodes.map((node) => node.id), ...edges.map((edge) => edge.id)],
    operations: [
      ...nodes.map((block) => ({ op: "createBlock" as const, block })),
      ...edges.map((edge) => ({ op: "createEdge" as const, edge })),
    ],
    createdAt: now(),
    summary: "已生成包含邮箱验证和手机验证的注册流程图。",
  };
}

function createPhoneRetryPatch(snapshot: CanvasSnapshot): AgentPatch {
  const phoneNode = findNode(snapshot, "node_phone_verify");
  const anchor = phoneNode?.position ?? { x: 740, y: 220 };

  if (snapshot.blocks.node_sms_failed_decision || snapshot.blocks.node_sms_retry) {
    return createNoOpPatch(
      snapshot,
      "手机验证分支已包含短信发送失败重试逻辑",
      "该分支已经包含对应逻辑，无需重复添加。",
    );
  }

  const failedDecision = createFlowNode({
    id: "node_sms_failed_decision",
    semanticId: "registration.phone.sms_failed_decision",
    label: "短信发送失败？",
    description: "判断短信验证码是否发送失败",
    semanticRole: "decision",
    branchKey: "phone",
    position: { x: anchor.x + 240, y: anchor.y + 16 },
  });

  const retryNode = createFlowNode({
    id: "node_sms_retry",
    semanticId: "registration.phone.sms_retry",
    label: "重新发送短信",
    description: "限制频率后再次发送短信验证码",
    semanticRole: "warning",
    branchKey: "phone",
    position: { x: anchor.x + 240, y: anchor.y + 158 },
  });

  const phoneBlocks = [failedDecision, retryNode].filter(
    (block) => !snapshot.blocks[block.id],
  );
  const phoneEdges = [
    createFlowEdge({
      id: "edge_phone_sms_failed",
      source: "node_phone_verify",
      target: "node_sms_failed_decision",
      label: "发送结果",
      semanticRole: "primary",
      branchKey: "phone",
      animated: true,
    }),
    createFlowEdge({
      id: "edge_sms_failed_retry",
      source: "node_sms_failed_decision",
      target: "node_sms_retry",
      label: "失败",
      semanticRole: "failure",
      branchKey: "phone",
      animated: true,
    }),
    createFlowEdge({
      id: "edge_sms_retry_phone",
      source: "node_sms_retry",
      target: "node_phone_verify",
      label: "重试",
      semanticRole: "retry",
      branchKey: "phone",
      animated: true,
    }),
    createFlowEdge({
      id: "edge_sms_failed_complete",
      source: "node_sms_failed_decision",
      target: "node_complete",
      label: "成功",
      semanticRole: "primary",
      branchKey: "phone",
      animated: true,
    }),
  ].filter((edge) => !snapshot.blocks[edge.id]);

  const operations: PatchOperation[] = [];
  if (snapshot.blocks.edge_phone_complete) {
    operations.push({ op: "deleteEdge", id: "edge_phone_complete" });
  }
  operations.push({
    op: "insertAfter",
    anchorId: "node_phone_verify",
    blocks: phoneBlocks,
    edges: phoneEdges,
    layoutScope: "branch",
  });

  return {
    id: createId("patch_phone_retry"),
    description: "为手机验证分支插入短信发送失败重试逻辑",
    baseVersion: snapshot.version,
    affectedBlockIds: [
      "node_phone_verify",
      "node_sms_failed_decision",
      "node_sms_retry",
    ],
    operations,
    createdAt: now(),
    summary: "已在手机验证分支局部插入短信失败判断和重试节点。",
  };
}

function createEmailExpiryPatch(snapshot: CanvasSnapshot): AgentPatch {
  const emailNode = findNode(snapshot, "node_email_verify");
  const anchor = emailNode?.position ?? { x: 740, y: 28 };

  if (snapshot.blocks.node_email_code_expired || snapshot.blocks.node_email_resend_code) {
    return createNoOpPatch(
      snapshot,
      "邮箱验证分支已包含验证码过期判断",
      "该分支已经包含对应逻辑，无需重复添加。",
    );
  }

  const expiryDecision = createFlowNode({
    id: "node_email_code_expired",
    semanticId: "registration.email.code_expired",
    label: "验证码过期？",
    description: "检查邮箱验证码是否仍在有效期内",
    semanticRole: "decision",
    branchKey: "email",
    position: { x: anchor.x + 240, y: anchor.y - 12 },
  });

  const resendNode = createFlowNode({
    id: "node_email_resend_code",
    semanticId: "registration.email.resend_code",
    label: "重新发送验证码",
    description: "验证码过期时重新发送邮件验证码",
    semanticRole: "warning",
    branchKey: "email",
    position: { x: anchor.x + 240, y: anchor.y - 150 },
  });

  const emailBlocks = [expiryDecision, resendNode].filter(
    (block) => !snapshot.blocks[block.id],
  );
  const emailEdges = [
    createFlowEdge({
      id: "edge_email_expiry_check",
      source: "node_email_verify",
      target: "node_email_code_expired",
      label: "校验有效期",
      semanticRole: "primary",
      branchKey: "email",
      animated: true,
    }),
    createFlowEdge({
      id: "edge_email_expired_resend",
      source: "node_email_code_expired",
      target: "node_email_resend_code",
      label: "已过期",
      semanticRole: "failure",
      branchKey: "email",
      animated: true,
    }),
    createFlowEdge({
      id: "edge_email_resend_back",
      source: "node_email_resend_code",
      target: "node_email_verify",
      label: "重新验证",
      semanticRole: "retry",
      branchKey: "email",
      animated: true,
    }),
    createFlowEdge({
      id: "edge_email_expiry_complete",
      source: "node_email_code_expired",
      target: "node_complete",
      label: "有效",
      semanticRole: "primary",
      branchKey: "email",
      animated: true,
    }),
  ].filter((edge) => !snapshot.blocks[edge.id]);

  const operations: PatchOperation[] = [];
  if (snapshot.blocks.edge_email_complete) {
    operations.push({ op: "deleteEdge", id: "edge_email_complete" });
  }
  operations.push({
    op: "insertAfter",
    anchorId: "node_email_verify",
    blocks: emailBlocks,
    edges: emailEdges,
    layoutScope: "branch",
  });

  return {
    id: createId("patch_email_expiry"),
    description: "为邮箱验证分支插入验证码过期判断",
    baseVersion: snapshot.version,
    affectedBlockIds: [
      "node_email_verify",
      "node_email_code_expired",
      "node_email_resend_code",
      "node_complete",
    ],
    operations,
    createdAt: now(),
    summary: "已在邮箱验证分支局部插入验证码过期判断。",
  };
}

function createUnsupportedPatch(
  snapshot: CanvasSnapshot,
  prompt: string,
): AgentPatch {
  return createNoOpPatch(snapshot, "记录暂不支持的指令", `暂不支持该指令：${prompt}`);
}

function createRollbackTestPatch(snapshot: CanvasSnapshot): AgentPatch {
  return {
    id: createId("patch_invalid_anchor"),
    description: "测试失败回滚",
    baseVersion: snapshot.version,
    affectedBlockIds: ["node_rollback_probe"],
    operations: [
      {
        op: "insertAfter",
        anchorId: "node_missing_anchor",
        blocks: [
          createFlowNode({
            id: "node_rollback_probe",
            semanticId: "rollback.probe",
            label: "不应出现的回滚节点",
            description: "该节点用于验证 invalid patch 会被回滚",
            semanticRole: "error",
            position: { x: 420, y: 420 },
          }),
        ],
        edges: [],
        layoutScope: "local",
      },
    ],
    createdAt: now(),
    summary: "将提交一个非法 anchor patch，用于演示失败回滚。",
  };
}

function createNoOpPatch(
  snapshot: CanvasSnapshot,
  description: string,
  summary: string,
): AgentPatch {
  return {
    id: createId("patch_noop"),
    description,
    baseVersion: snapshot.version,
    affectedBlockIds: [],
    operations: [],
    createdAt: now(),
    summary,
  };
}

function findNode(snapshot: CanvasSnapshot, id: string): FlowNodeBlock | undefined {
  const block = snapshot.blocks[id];
  return block?.type === "flowNode" ? block : undefined;
}

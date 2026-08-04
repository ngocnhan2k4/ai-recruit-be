import { CONTEXT_KEYS, setContext } from "@/common/stores/context.store";

export type AuditContextInput = {
  targetId?: string | null;
  organizationId?: string | null;
  data?: Record<string, unknown>;
};

export function setAuditContext(input: AuditContextInput): void {
  if (input.targetId !== undefined) {
    setContext(CONTEXT_KEYS.AUDIT_TARGET_ID, input.targetId);
  }
  if (input.organizationId !== undefined) {
    setContext(CONTEXT_KEYS.AUDIT_ORGANIZATION_ID, input.organizationId);
  }
  if (input.data !== undefined) {
    setContext(CONTEXT_KEYS.AUDIT_DATA, input.data);
  }
}

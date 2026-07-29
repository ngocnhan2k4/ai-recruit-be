import { createHash } from "crypto";

export function buildCandidateBriefFingerprint(value: unknown): string {
  const stableJson = JSON.stringify(sortObject(value));
  return createHash("sha256").update(stableJson).digest("hex");
}

function sortObject(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortObject);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, sortObject(item)]),
    );
  }

  return value;
}

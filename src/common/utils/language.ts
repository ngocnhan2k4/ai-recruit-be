export const DEFAULT_LANGUAGE_CODE = "vi";
export const SUPPORTED_LANGUAGE_CODES = ["vi", "en"] as const;

const SUPPORTED_LANGUAGE_SET = new Set<string>(SUPPORTED_LANGUAGE_CODES);

function parseAcceptLanguage(input: string): Array<{
  code: string;
  quality: number;
  order: number;
}> {
  return input
    .split(",")
    .map((segment, order) => {
      const trimmed = segment.trim().toLowerCase();
      if (!trimmed) {
        return null;
      }

      const [languageTag, ...params] = trimmed.split(";");
      const baseCode = languageTag.split("-")[0]?.trim();
      if (!baseCode || baseCode === "*") {
        return null;
      }

      const qualityParam = params.find((param) =>
        param.trim().startsWith("q="),
      );
      const parsedQuality = qualityParam
        ? Number(qualityParam.trim().slice(2))
        : 1;

      return {
        code: baseCode,
        quality: Number.isFinite(parsedQuality) ? parsedQuality : 0,
        order,
      };
    })
    .filter((item): item is { code: string; quality: number; order: number } =>
      Boolean(item),
    )
    .sort((a, b) => b.quality - a.quality || a.order - b.order);
}

export function normalizeLanguageCode(input?: string | null): string {
  if (!input) {
    return DEFAULT_LANGUAGE_CODE;
  }

  const normalized = input.trim().toLowerCase();
  if (!normalized) {
    return DEFAULT_LANGUAGE_CODE;
  }

  for (const candidate of parseAcceptLanguage(normalized)) {
    if (SUPPORTED_LANGUAGE_SET.has(candidate.code)) {
      return candidate.code;
    }
  }

  return DEFAULT_LANGUAGE_CODE;
}

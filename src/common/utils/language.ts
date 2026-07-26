import {
  DEFAULT_LANGUAGE_CODE,
  SUPPORTED_LANGUAGE_SET,
} from "../constants/translation";

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
  return parseSupportedLanguageCode(input) ?? DEFAULT_LANGUAGE_CODE;
}

const toSingleValue = (value?: string | string[] | null): string | undefined =>
  Array.isArray(value) ? value.join(",") : (value ?? undefined);

export function resolveExplicitRequestLanguage(input?: {
  queryLang?: string | string[] | null;
  acceptLanguage?: string | string[] | null;
}): string | undefined {
  const queryLang = toSingleValue(input?.queryLang)?.trim();
  if (queryLang) {
    return parseSupportedLanguageCode(queryLang) ?? undefined;
  }

  const acceptLanguage = toSingleValue(input?.acceptLanguage);
  if (acceptLanguage) {
    return parseSupportedLanguageCode(acceptLanguage) ?? undefined;
  }

  return undefined;
}

/* Convert the query lang or accept language to a single value and normalize it
 * @param input - The query lang or accept language: vi, en, vi-VN, en-US, etc.
 * @returns The normalized language code: vi, en, etc.
 */
export function resolveRequestLanguage(input?: {
  queryLang?: string | string[] | null;
  acceptLanguage?: string | string[] | null;
}): string {
  return resolveExplicitRequestLanguage(input) ?? DEFAULT_LANGUAGE_CODE;
}

export function buildLanguagePriority(
  requestLanguage: string,
  fallbackLanguage: string,
): string[] {
  return [requestLanguage, fallbackLanguage].filter(
    (value, index, array) => value && array.indexOf(value) === index,
  );
}

export function parseSupportedLanguageCode(
  input?: string | null,
): string | null {
  if (!input) {
    return null;
  }

  const normalized = input.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  for (const candidate of parseAcceptLanguage(normalized)) {
    if (SUPPORTED_LANGUAGE_SET.has(candidate.code)) {
      return candidate.code;
    }
  }

  return null;
}

const VIETNAMESE_CHARACTER_PATTERN =
  /[ăâđêôơưáàảãạắằẳẵặấầẩẫậéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/i;

export function inferSupportedLanguageFromText(
  input?: string | null,
): "vi" | "en" {
  return input && VIETNAMESE_CHARACTER_PATTERN.test(input) ? "vi" : "en";
}

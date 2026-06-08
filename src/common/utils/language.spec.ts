import {
  buildLanguagePriority,
  normalizeLanguageCode,
  parseSupportedLanguageCode,
  resolveRequestLanguage,
} from "./language";
import { CONTEXT_KEYS, runContext, setContext } from "../stores/context.store";
import { getFallbackLanguage, getRequestLanguage } from "./context";
import { DEFAULT_LANGUAGE_CODE } from "../constants/translation";

describe("normalizeLanguageCode", () => {
  it("falls back to Vietnamese when input is missing or empty", () => {
    expect(normalizeLanguageCode()).toBe(DEFAULT_LANGUAGE_CODE);
    expect(normalizeLanguageCode("   ")).toBe(DEFAULT_LANGUAGE_CODE);
    expect(normalizeLanguageCode(null)).toBe(DEFAULT_LANGUAGE_CODE);
  });

  it("normalizes regional locale tags to supported base languages", () => {
    expect(normalizeLanguageCode("en-US")).toBe("en");
    expect(normalizeLanguageCode("vi-VN")).toBe("vi");
  });

  it("honors quality values in Accept-Language headers", () => {
    expect(normalizeLanguageCode("vi;q=0.8,en;q=0.9")).toBe("en");
    expect(normalizeLanguageCode("fr-FR,vi;q=0.7,en;q=0.6")).toBe("vi");
  });

  it("falls back to Vietnamese for unsupported languages", () => {
    expect(normalizeLanguageCode("fr-FR")).toBe(DEFAULT_LANGUAGE_CODE);
    expect(normalizeLanguageCode("ja-JP,ko-KR")).toBe(DEFAULT_LANGUAGE_CODE);
  });
});

describe("parseSupportedLanguageCode", () => {
  it("returns null for missing or unsupported languages", () => {
    expect(parseSupportedLanguageCode()).toBeNull();
    expect(parseSupportedLanguageCode("   ")).toBeNull();
    expect(parseSupportedLanguageCode("fr-FR")).toBeNull();
  });

  it("returns a supported base language when present", () => {
    expect(parseSupportedLanguageCode("en-US")).toBe("en");
    expect(parseSupportedLanguageCode("vi-VN")).toBe("vi");
    expect(parseSupportedLanguageCode("fr-FR,en;q=0.9")).toBe("en");
  });
});

describe("buildLanguagePriority", () => {
  it("returns request language before fallback", () => {
    expect(buildLanguagePriority("en", "vi")).toEqual(["en", "vi"]);
  });

  it("deduplicates when request and fallback are the same", () => {
    expect(buildLanguagePriority("vi", "vi")).toEqual(["vi"]);
  });

  it("filters out empty language codes", () => {
    expect(buildLanguagePriority("", "vi")).toEqual(["vi"]);
    expect(buildLanguagePriority("en", "")).toEqual(["en"]);
  });
});

describe("resolveRequestLanguage", () => {
  it("prioritizes query lang over accept-language header", () => {
    expect(
      resolveRequestLanguage({
        queryLang: "en-US",
        acceptLanguage: "vi-VN",
      }),
    ).toBe("en");
  });

  it("falls back to accept-language header when query lang is missing", () => {
    expect(
      resolveRequestLanguage({
        acceptLanguage: "en-US,vi;q=0.9",
      }),
    ).toBe("en");
  });

  it("falls back to Vietnamese when no language source is provided", () => {
    expect(resolveRequestLanguage()).toBe(DEFAULT_LANGUAGE_CODE);
  });
});

describe("request language context", () => {
  it("reads normalized values from async local storage", () => {
    runContext(() => {
      setContext(CONTEXT_KEYS.REQUEST_LANGUAGE, "en");
      setContext(CONTEXT_KEYS.FALLBACK_LANGUAGE, "vi");

      expect(getRequestLanguage()).toBe("en");
      expect(getFallbackLanguage()).toBe("vi");
    });
  });

  it("falls back to default language outside request context", () => {
    expect(getRequestLanguage()).toBe(DEFAULT_LANGUAGE_CODE);
    expect(getFallbackLanguage()).toBe(DEFAULT_LANGUAGE_CODE);
  });
});

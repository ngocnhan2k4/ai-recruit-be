import {
  DEFAULT_LANGUAGE_CODE,
  normalizeLanguageCode,
  parseSupportedLanguageCode,
  resolveLanguageContext,
} from "./language";
import { runWithContext } from "./context";

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

describe("resolveLanguageContext", () => {
  it("uses explicit values when provided", () => {
    expect(
      resolveLanguageContext({
        requestLanguage: "en-US",
        fallbackLanguage: "vi-VN",
      }),
    ).toEqual({
      requestLanguage: "en",
      fallbackLanguage: "vi",
    });
  });

  it("falls back to async local storage values", () => {
    runWithContext(
      {
        requestLanguage: "en",
        fallbackLanguage: "vi",
      },
      () => {
        expect(resolveLanguageContext()).toEqual({
          requestLanguage: "en",
          fallbackLanguage: "vi",
        });
      },
    );
  });
});

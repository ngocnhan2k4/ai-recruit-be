import { DEFAULT_LANGUAGE_CODE, normalizeLanguageCode } from "./language";

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

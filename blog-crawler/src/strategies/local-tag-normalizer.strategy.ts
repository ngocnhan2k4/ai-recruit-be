import { ITagNormalizer } from "../interfaces/tag-normalizer.interface";
import { TAG_MAP, IGNORED_TAGS } from "../services/tags.data";

export class LocalTagNormalizer implements ITagNormalizer {
  async normalize(rawTag: string): Promise<string | null> {
    if (!rawTag) return null;
    const clean = rawTag
      .toLowerCase()
      .trim()
      .replace(/['"“”‘’]/g, "");
    if (!clean || IGNORED_TAGS.has(clean)) {
      return null;
    }
    if (TAG_MAP[clean]) {
      return TAG_MAP[clean];
    }
    return clean;
  }
}

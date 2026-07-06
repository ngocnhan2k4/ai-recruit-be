export interface ITagNormalizer {
  normalize(rawTag: string): Promise<string | null>;
}

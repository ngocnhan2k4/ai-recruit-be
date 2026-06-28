export function truncateContent(content: string, fraction = 1 / 3): string {
  if (!content) return "";
  const paragraphs = content.split(/\n\n+/);
  const keepCount = Math.max(1, Math.ceil(paragraphs.length * fraction));
  return paragraphs.slice(0, keepCount).join("\n\n");
}

export const slugify = (text: string): string => {
  if (!text) return "";
  return text
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s-]+/g, "-");
};

export const generateSlug = (text: string): string => {
  const baseSlug = slugify(text);
  const shortTime = Date.now().toString(36).slice(-5);
  return `${baseSlug}-${shortTime}`;
};

export function getSimilarity(s1: string, s2: string): number {
  const len1 = s1.length;
  const len2 = s2.length;
  const max = Math.max(len1, len2);
  if (max === 0) return 1.0;
  const matrix: number[][] = [];
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + 1
        );
      }
    }
  }
  return (max - matrix[len1][len2]) / max;
}

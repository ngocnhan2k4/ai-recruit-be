export const generateUsername = (name: string, suffix?: number): string => {
  let username = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  username = username.replace(/\s+/g, ".");

  username = username.replace(/[^a-z0-9.]/g, "");

  if (suffix !== undefined) {
    username = `${username}${suffix}`;
  }

  return username;
};

export function slugify(text: string, separator: string, suffix?: number): string {
  let slug = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, separator)
    .replace(/^-+|-+$/g, "");

  if (suffix !== undefined) {
    slug = `${slug}${suffix}`;
  }

  return slug;
}

import { ProviderEnumType } from "@/core";

export const normalizeProvider = (providerId: string): ProviderEnumType => {
  if (providerId.includes("password")) return "email";
  if (providerId.includes("google")) return "google";
  if (providerId.includes("facebook")) return "facebook";
  if (providerId.includes("github")) return "github";
  return "email";
};

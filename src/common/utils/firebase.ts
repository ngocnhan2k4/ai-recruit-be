import { ProviderEnum } from "@/core";

export const normalizeProvider = (providerId: string): ProviderEnum => {
  if (providerId.includes("password")) return ProviderEnum.EMAIL;
  if (providerId.includes("google")) return ProviderEnum.GOOGLE;
  if (providerId.includes("facebook")) return ProviderEnum.FACEBOOK;
  if (providerId.includes("github")) return ProviderEnum.GITHUB;
  return ProviderEnum.EMAIL;
};

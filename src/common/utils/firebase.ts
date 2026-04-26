import { ProviderEnum } from "@/core";

export const normalizeProvider = (providerId: string): ProviderEnum => {
  if (providerId.includes("password")) return ProviderEnum.EMAIL;
  if (providerId.includes("google")) return ProviderEnum.GOOGLE;
  if (providerId.includes("facebook")) return ProviderEnum.FACEBOOK;
  if (providerId.includes("github")) return ProviderEnum.GITHUB;
  return ProviderEnum.EMAIL;
};

export const getFirebaseProviderKey = (providerId: ProviderEnum): string => {
  if (providerId === ProviderEnum.GOOGLE) return "google.com";
  if (providerId === ProviderEnum.FACEBOOK) return "facebook.com";
  if (providerId === ProviderEnum.GITHUB) return "github.com";
  return "password";
};

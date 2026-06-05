export const DEFAULT_VND_PER_USD = 25_000;

export const convertVndToUsd = (
  priceVnd: number,
  vndPerUsd: number = DEFAULT_VND_PER_USD,
): number => {
  if (vndPerUsd <= 0) {
    throw new Error("VND per USD rate must be positive");
  }

  return Math.round((priceVnd / vndPerUsd) * 100) / 100;
};

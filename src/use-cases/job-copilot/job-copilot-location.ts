interface ProvinceLike {
  name: string;
}

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const LOCATION_ALIASES: Record<string, string> = {
  hcm: "hochiminh",
  sg: "hochiminh",
  saigon: "hochiminh",
};

const normalizeLocation = (value: string) => {
  const normalized = normalize(value)
    .replace(/^thanhpho/, "")
    .replace(/^tp/, "")
    .replace(/city$/, "");
  return LOCATION_ALIASES[normalized] ?? normalized;
};

export const findMatchingProvince = <T extends ProvinceLike>(
  value: string,
  provinces: T[],
): T | undefined => {
  const normalizedValue = normalizeLocation(value);
  if (!normalizedValue) return undefined;

  return provinces.find((province) => {
    const candidate = normalizeLocation(province.name);
    return (
      candidate === normalizedValue ||
      candidate.includes(normalizedValue) ||
      normalizedValue.includes(candidate)
    );
  });
};

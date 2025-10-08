export const convertDateToStr = (d: Date | string) => {
  const date = d instanceof Date ? d : new Date(d);
  return date.toISOString().split("T")[0];
};

export function getCurrentWeekNumber(startDate: Date | null): number {
  if (!startDate) {
    return 1;
  }
  const now = new Date();
  const diffMs = now.getTime() - startDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const weekNumber = Math.floor(diffDays / 7) + 1;
  return weekNumber > 0 ? weekNumber : 1;
}

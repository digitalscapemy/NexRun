export function formatRepcSchedule(
  repcDate: string | null | undefined,
  repcTime: string | null | undefined,
): string | undefined {
  const date = repcDate?.trim();
  if (!date) return undefined;
  const time = repcTime?.trim();
  return time ? `${date}, ${time}` : date;
}

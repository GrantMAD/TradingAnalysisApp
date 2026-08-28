export function parseProviderDateTime(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(trimmed)
    ? `${trimmed.replace(' ', 'T')}Z`
    : trimmed;
  const milliseconds = Date.parse(normalized);

  return Number.isFinite(milliseconds) ? milliseconds / 1000 : null;
}

export function formatMarketTimestamp(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return 'Unknown';

  const date = typeof value === 'number' ? new Date(value * 1000) : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';

  const formatted = date.toLocaleString(undefined, {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return `${formatted} (local time)`;
}

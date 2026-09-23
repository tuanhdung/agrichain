// "2026-08-12T08:15:53.000Z" -> "12/08/2026 15:15" (giờ địa phương) — port
// nguyên văn formatDateTime() trong js/vat-tu.js.
export function formatDateTime(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

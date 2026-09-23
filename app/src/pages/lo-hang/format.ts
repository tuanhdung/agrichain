// Port formatDate()/formatArea() của js/lo-hang.js gốc nguyên văn.
export function formatDate(value: string | null): string {
  if (!value) return 'Chưa đặt';
  const parts = value.split('-');
  if (parts.length !== 3) return value;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function formatArea(value: number | null): string {
  const num = Number(value);
  if (!num) return '0 ha';
  return `${num} ha`;
}

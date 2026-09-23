// Port debounce() nhỏ trong js/vat-tu.js gốc (setTimeout/clearTimeout thuần,
// không thêm thư viện ngoài) — dùng cho ô tìm kiếm.
import { useEffect, useRef } from 'react';

export function useDebouncedCallback<Args extends unknown[]>(
  fn: (...args: Args) => void,
  wait: number
): (...args: Args) => void {
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const timerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    },
    []
  );

  return (...args: Args) => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => fnRef.current(...args), wait);
  };
}

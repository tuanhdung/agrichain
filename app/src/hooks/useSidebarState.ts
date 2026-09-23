// Port đúng 2 key localStorage của setupSidebar()/setupNavSections()
// (js/app-shell.js gốc) — GIỮ NGUYÊN tên key để sidebar của app/ và sidebar
// của 15 trang .html còn lại nhớ CHUNG 1 trạng thái thu gọn/mở nhóm (cùng
// origin, cùng localStorage) — người dùng thu gọn sidebar ở nong-trai.html
// rồi bấm sang Vật tư (SPA) vẫn thấy sidebar thu gọn y hệt, không bị "giật"
// về mặc định.
import { useCallback, useState } from 'react';

const SIDEBAR_COLLAPSED_KEY = 'agrichain:sidebarCollapsed';
const SIDEBAR_SECTIONS_KEY = 'agrichain:sidebarSections';

function readJson<T>(key: string, fallback: T): T {
  try {
    const text = window.localStorage.getItem(key);
    return text === null ? fallback : (JSON.parse(text) as T);
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Bỏ qua — xem ghi chú ở js/app-shell.js gốc (localStorage có thể không
    // dùng được ở chế độ ẩn danh...), mất tính năng nhớ trạng thái chứ không
    // chặn sidebar hoạt động.
  }
}

export function useSidebarCollapsed() {
  const [collapsed, setCollapsedState] = useState<boolean>(() => !!readJson(SIDEBAR_COLLAPSED_KEY, false));

  const setCollapsed = useCallback((value: boolean) => {
    setCollapsedState(value);
    writeJson(SIDEBAR_COLLAPSED_KEY, value);
  }, []);

  return [collapsed, setCollapsed] as const;
}

// Mặc định MỌI nhóm đều mở — chỉ áp trạng thái đã lưu khi giá trị là `false`
// rõ ràng, khớp đúng setupNavSections() gốc.
export function useSidebarSections() {
  const [sections, setSectionsState] = useState<Record<string, boolean>>(() =>
    readJson(SIDEBAR_SECTIONS_KEY, {})
  );

  const setSectionOpen = useCallback((id: string, open: boolean) => {
    setSectionsState((prev) => {
      const next = { ...prev, [id]: open };
      writeJson(SIDEBAR_SECTIONS_KEY, next);
      return next;
    });
  }, []);

  const isOpen = useCallback((id: string) => sections[id] !== false, [sections]);

  return { isOpen, setSectionOpen };
}

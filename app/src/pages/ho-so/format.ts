// Port initials() của js/app-shell.js gốc — Sidebar.tsx/UserMenu.tsx/
// pages/tai-khoan/format.ts đều tự có bản riêng y hệt (đúng quy ước "mỗi
// trang tự chứa JS riêng" của dự án, không đủ nhiều chỗ dùng để đáng tách
// thành hook/util dùng chung).
export function initials(fullName: string): string {
  if (!fullName) return '?';
  return fullName
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
}

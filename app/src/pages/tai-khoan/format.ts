// Port initials() của js/app-shell.js gốc ("Tổ chức Tess" -> "TT") — dùng
// cho avatar trong bảng người dùng. Sidebar.tsx cũng tự có 1 bản inline y hệt
// cho avatar CỦA CHÍNH người đang đăng nhập — không tách hook dùng chung theo
// đúng quy ước "mỗi trang tự chứa JS riêng" của dự án (2 chỗ dùng không đủ
// nhiều để đáng tách).
export function initials(fullName: string): string {
  if (!fullName) return '?';
  return fullName
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
}

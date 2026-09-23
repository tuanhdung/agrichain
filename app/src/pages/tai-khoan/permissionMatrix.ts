// Port PREFIX_ORDER/PREFIX_LABELS/PREFIX_ICONS/ACTIONS/permissionPrefix()/
// actionFromCode()/groupPermissions() của js/tai-khoan.js gốc — logic THUẦN
// (không đụng DOM), tách riêng khỏi PermissionModal.tsx để dễ đọc/test.
//
// GET /permissions trả về ĐÃ NHÓM SẴN theo group_name, NHƯNG backend gộp
// chung "roles.*" và "users.*" vào 1 group_name duy nhất ("Quản lý đơn vị",
// đã xác nhận qua dữ liệu thật) — nếu hiển thị thẳng theo group_name thì 1 ô
// (nhóm x hành động) sẽ chứa 2 mã quyền (VD "roles.view" và "users.view" cùng
// rơi vào ô "Xem" của "Quản lý đơn vị"), phá vỡ giả định "1 checkbox = 1 mã
// quyền". Bỏ qua hẳn group_name, tự nhóm lại theo TIỀN TỐ mã quyền (phần
// trước dấu "." đầu tiên) để luôn ra đúng 1 mã quyền/ô.
import type { Permission, PermissionGroup } from '../../api';

export const PREFIX_ORDER = ['batches', 'farms', 'certifications', 'seasons', 'supplies', 'logs', 'workflow_templates', 'roles', 'users'];

export const PREFIX_LABELS: Record<string, string> = {
  batches: 'Lô hàng',
  farms: 'Nông trại',
  certifications: 'Chứng nhận',
  seasons: 'Mùa vụ',
  supplies: 'Vật tư',
  logs: 'Nhật ký',
  workflow_templates: 'Mẫu quy trình',
  roles: 'Vai trò',
  users: 'Người dùng'
};

// Tên icon KHÔNG có tiền tố "icon-" (khớp quy ước <Icon name=.../> của
// app/src/icons.tsx, khác biến gốc trong js/tai-khoan.js).
export const PREFIX_ICONS: Record<string, string> = {
  batches: 'warehouse',
  farms: 'seedling',
  certifications: 'qr-code',
  seasons: 'calendar',
  supplies: 'box',
  logs: 'file-text',
  workflow_templates: 'workflow',
  roles: 'shield-check',
  users: 'user'
};

export const ACTIONS: { key: 'view' | 'add' | 'edit' | 'delete'; label: string }[] = [
  { key: 'view', label: 'Xem' },
  { key: 'add', label: 'Thêm' },
  { key: 'edit', label: 'Sửa' },
  { key: 'delete', label: 'Xoá' }
];

export function permissionPrefix(code: string): string {
  const dot = code.indexOf('.');
  return dot === -1 ? code : code.slice(0, dot);
}

// Đã xác nhận qua dữ liệu thật: hậu tố mã quyền luôn đúng 1 trong 4 từ
// add/edit/view/delete (khớp thẳng key của ACTIONS).
export function actionFromCode(code: string): string | null {
  const dot = code.indexOf('.');
  return dot === -1 ? null : code.slice(dot + 1);
}

export interface MatrixGroup {
  prefix: string;
  name: string;
  icon: string;
  permissions: Permission[];
}

export function groupPermissions(groupsFromApi: PermissionGroup[] | null | undefined): MatrixGroup[] {
  const flat: Permission[] = [];
  (groupsFromApi || []).forEach((g) => {
    flat.push(...(g.permissions || []));
  });

  const byPrefix: Record<string, Permission[]> = {};
  flat.forEach((perm) => {
    const prefix = permissionPrefix(perm.code);
    if (!byPrefix[prefix]) byPrefix[prefix] = [];
    byPrefix[prefix].push(perm);
  });

  const prefixes = Object.keys(byPrefix);
  const known = prefixes.filter((p) => PREFIX_ORDER.includes(p)).sort((a, b) => PREFIX_ORDER.indexOf(a) - PREFIX_ORDER.indexOf(b));
  const unknown = prefixes.filter((p) => !PREFIX_ORDER.includes(p)).sort();

  return [...known, ...unknown].map((prefix) => {
    const perms = byPrefix[prefix];
    return {
      prefix,
      name: PREFIX_LABELS[prefix] || perms[0]?.group_name || prefix,
      icon: PREFIX_ICONS[prefix] || 'shield-check',
      permissions: perms
    };
  });
}

/** Mã quyền của group tại đúng 1 hành động — undefined nếu nhóm này không có
 *  quyền cho hành động đó (ô sẽ hiện checkbox disabled). */
export function permissionAt(group: MatrixGroup, actionKey: string): Permission | undefined {
  return group.permissions.find((p) => actionFromCode(p.code) === actionKey);
}

/** Mọi mã quyền THẬT SỰ được render thành 1 checkbox trong lưới (khớp
 *  `managedCodes` gốc — CHỈ tính permission khớp đúng 1 trong 4 ACTIONS,
 *  không phải mọi permission có mặt trong `groups`, xem ghi chú
 *  `handlePermissionSave()` gốc). */
export function computeManagedCodes(groups: MatrixGroup[]): Set<string> {
  const codes = new Set<string>();
  groups.forEach((group) => {
    ACTIONS.forEach((action) => {
      const perm = permissionAt(group, action.key);
      if (perm) codes.add(perm.code);
    });
  });
  return codes;
}

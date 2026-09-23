// Port modal "Nhường quyền quản trị" (transfer-admin-modal) + phần tương ứng
// của js/tai-khoan.js (openTransferAdminModal/populateTransferAdminTargets/
// populateTransferAdminRoles/handleTransferAdminSubmit) — POST
// /users/{id}/transfer-admin. Chỉ mở được khi vai trò CHÍNH người đăng nhập
// là is_system=true (nút mở nằm ở TaiKhoanPage.tsx, xem refreshOrgAdminFlag()).
import { useEffect, useState, type FormEvent, type RefObject } from 'react';
import { Icon } from '../../icons';
import { api, ApiError } from '../../api';
import type { OrgUser, Role } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ToastProvider';
import { PasswordField } from '../../components/PasswordField';

interface TransferAdminModalProps {
  dialogRef: RefObject<HTMLDialogElement>;
  openToken: number;
  onClose: () => void;
}

interface FormValues {
  targetUserId: string;
  newRoleId: string;
  password: string;
}

const EMPTY_VALUES: FormValues = { targetUserId: '', newRoleId: '', password: '' };

// Ánh xạ field lỗi backend (details.field, khớp TransferAdminRequest thật) —
// "password" sai KHÔNG đi qua đường này (backend trả 401 riêng, xem
// handleSubmit() bên dưới), vẫn giữ trong map để phòng hờ giống bản gốc.
const FIELD_MAP: Record<string, keyof FormValues> = {
  new_role_id_for_current_admin: 'newRoleId',
  password: 'password'
};

type ListStatus = 'loading' | 'ready' | 'error';

export function TransferAdminModal({ dialogRef, openToken, onClose }: TransferAdminModalProps) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({});
  const [targets, setTargets] = useState<OrgUser[]>([]);
  const [targetsStatus, setTargetsStatus] = useState<ListStatus>('loading');
  const [roles, setRoles] = useState<Role[]>([]);
  const [rolesStatus, setRolesStatus] = useState<ListStatus>('loading');
  const [submitting, setSubmitting] = useState(false);

  // Reset form + tải lại MỚI danh sách người nhận/vai trò mỗi lần modal thật
  // sự mở — khớp openTransferAdminModal() gốc. Guard `dialogRef.current
  // ?.open` + dependency `openToken`: cùng lý do đã ghi ở UserModal.tsx.
  useEffect(() => {
    if (!dialogRef.current?.open || !user) return;
    setValues(EMPTY_VALUES);
    setErrors({});

    // Danh sách người nhận: user CÙNG Đơn vị (GET /users tự lọc theo Đơn vị
    // của người gọi), đang is_active, KHÔNG gồm chính mình. page_size: 100
    // (mức tối đa backend cho phép) thay vì phân trang 10/trang như bảng
    // chính — đây là 1 select chọn nhanh, không phải danh sách để duyệt trang.
    setTargetsStatus('loading');
    api.users
      .list({ is_active: true, page_size: 100 })
      .then((data) => {
        setTargets((data.items || []).filter((u) => u.id !== user.id));
        setTargetsStatus('ready');
      })
      .catch((err: unknown) => {
        setTargetsStatus('error');
        showToast(err instanceof ApiError ? err.message : 'Không tải được danh sách người dùng.');
      });

    // Vai trò mới cho CHÍNH người đang nhường — loại bỏ vai trò is_system vì
    // không có ý nghĩa "chuyển sang chính vai trò mình sắp nhường đi".
    setRolesStatus('loading');
    api.roles
      .list()
      .then((list) => {
        setRoles(list.filter((role) => !role.is_system));
        setRolesStatus('ready');
      })
      .catch((err: unknown) => {
        setRolesStatus('error');
        showToast(err instanceof ApiError ? err.message : 'Không tải được vai trò.');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ chạy lại theo openToken (mở modal), không phải mỗi lần user/showToast đổi tham chiếu
  }, [openToken]);

  function setField<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function validate(): boolean {
    const next: Partial<Record<keyof FormValues, string>> = {};
    if (!values.targetUserId) next.targetUserId = 'Chọn người nhận quyền quản trị.';
    if (!values.newRoleId) next.newRoleId = 'Chọn vai trò mới cho bạn.';
    if (!values.password) next.password = 'Nhập mật khẩu hiện tại để xác nhận.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!user || !validate()) return;

    setSubmitting(true);
    try {
      await api.users.transferAdmin(values.targetUserId, {
        new_role_id_for_current_admin: Number(values.newRoleId),
        password: values.password
      });
    } catch (err) {
      setSubmitting(false);
      const apiErr = err instanceof ApiError ? err : null;
      // Sai mật khẩu xác nhận -> 401 UNAUTHORIZED (KHÔNG phải 403) — xem
      // transfer_admin() trong agrichain-api.
      if (apiErr?.status === 401) {
        setErrors((prev) => ({ ...prev, password: apiErr.message }));
        return;
      }
      const rawField = apiErr?.details?.field as string | undefined;
      const field = rawField ? FIELD_MAP[rawField] : undefined;
      if (field) {
        setErrors((prev) => ({ ...prev, [field]: apiErr!.message }));
        return;
      }
      // 403 (tự thao tác chính mình — không nên xảy ra vì đã loại chính
      // mình khỏi danh sách người nhận, xử lý phòng hờ) và 409 (VD Đơn vị
      // mất admin cuối cùng...) đều hiện qua toast, dùng đúng message tiếng
      // Việt thật từ backend, không tự bịa thông báo.
      showToast(apiErr?.message ?? 'Có lỗi xảy ra, vui lòng thử lại.');
      return;
    }

    // ⚠️ QUAN TRỌNG — KHÔNG được bỏ qua bước đăng nhập lại ngầm này: JWT
    // permissions lấy thẳng từ payload token lúc CẤP, không tự cập nhật nếu
    // chỉ gọi lại /auth/me (route đó đọc role_name mới từ DB nhưng permissions
    // vẫn là mảng CŨ trong token hiện tại) — xem CLAUDE.md gốc mục "Trang
    // tai-khoan.html". Backend cũng đã tự thu hồi refresh token của người
    // gọi ngay trong transfer_admin(), nên đây còn là cách DUY NHẤT để có
    // token mới hợp lệ, không chỉ là "làm cho chắc".
    try {
      await api.auth.login(user.email, values.password, api.isRemembered());
    } catch {
      // Nhường quyền ĐÃ THÀNH CÔNG dù bước đăng nhập lại tự động này lỗi
      // (mạng chập chờn...) — KHÔNG coi đây là lỗi của thao tác nhường
      // quyền, vẫn tiếp tục đóng modal + tải lại trang bên dưới.
      showToast(
        'Đã nhường quyền quản trị, nhưng không tự làm mới được phiên đăng nhập — đăng nhập lại nếu giao diện có gì bất thường.'
      );
    }

    onClose();
    // Tải lại TOÀN TRANG (không tự tay cập nhật từng phần DOM/state) — để
    // sidebar, ma trận quyền, chính nút "Nhường quyền quản trị" đều tự vẽ
    // lại đúng theo phiên MỚI, khớp global.location.reload() gốc.
    window.location.reload();
  }

  return (
    <dialog className="modal modal--sm" ref={dialogRef} aria-labelledby="transfer-admin-modal-title">
      <form className="modal__form" onSubmit={handleSubmit} noValidate>
        <div className="modal__header">
          <Icon name="shield-check" />
          <h2 className="modal__title" id="transfer-admin-modal-title">
            Nhường quyền quản trị
          </h2>
          <button type="button" className="modal__close" aria-label="Đóng" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="modal__body">
          <div className="notice notice--danger" style={{ marginBottom: 'var(--space-4)' }}>
            <Icon name="shield-check" className="icon--sm" />
            <span>Sau khi xác nhận, bạn sẽ mất quyền Quản trị Đơn vị.</span>
          </div>

          <div className="field">
            <label className="label" htmlFor="transfer-admin-target">
              Người nhận quyền quản trị
            </label>
            <select
              className="select"
              id="transfer-admin-target"
              aria-invalid={errors.targetUserId ? 'true' : undefined}
              disabled={targetsStatus !== 'ready'}
              value={values.targetUserId}
              onChange={(e) => setField('targetUserId', e.target.value)}
            >
              {targetsStatus === 'loading' && <option value="">Đang tải danh sách người dùng...</option>}
              {targetsStatus === 'error' && <option value="">Không tải được danh sách người dùng</option>}
              {targetsStatus === 'ready' && !targets.length && <option value="">Không có người dùng nào khác để nhường quyền</option>}
              {targetsStatus === 'ready' && targets.length > 0 && (
                <>
                  <option value="">-- Chọn người nhận --</option>
                  {targets.map((target) => (
                    <option key={target.id} value={target.id}>
                      {target.full_name} ({target.email})
                    </option>
                  ))}
                </>
              )}
            </select>
            {errors.targetUserId && <p className="field__error">{errors.targetUserId}</p>}
          </div>

          <div className="field">
            <label className="label" htmlFor="transfer-admin-role">
              Vai trò mới cho bạn sau khi nhường
            </label>
            <select
              className="select"
              id="transfer-admin-role"
              aria-invalid={errors.newRoleId ? 'true' : undefined}
              disabled={rolesStatus !== 'ready'}
              value={values.newRoleId}
              onChange={(e) => setField('newRoleId', e.target.value)}
            >
              {rolesStatus === 'loading' && <option value="">Đang tải vai trò...</option>}
              {rolesStatus === 'error' && <option value="">Không tải được vai trò</option>}
              {rolesStatus === 'ready' && !roles.length && <option value="">Chưa có vai trò nào khác — tạo vai trò mới trước</option>}
              {rolesStatus === 'ready' && roles.length > 0 && (
                <>
                  <option value="">-- Chọn vai trò mới cho bạn --</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </>
              )}
            </select>
            {errors.newRoleId && <p className="field__error">{errors.newRoleId}</p>}
          </div>

          <div className="field">
            <label className="label" htmlFor="transfer-admin-password">
              Mật khẩu hiện tại của bạn
            </label>
            {/* KHÔNG có danh sách điều kiện mật khẩu — đây là xác nhận mật
                khẩu HIỆN TẠI (không phải đặt mật khẩu mới), khớp HTML gốc. */}
            <PasswordField
              id="transfer-admin-password"
              autoComplete="current-password"
              showRules={false}
              value={values.password}
              invalid={!!errors.password}
              onChange={(value) => setField('password', value)}
            />
            <p className="field__hint">Xác nhận lại danh tính của bạn trước khi thực hiện thao tác này.</p>
            {errors.password && <p className="field__error">{errors.password}</p>}
          </div>
        </div>

        <div className="modal__footer">
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            Huỷ
          </button>
          <button type="submit" className="btn btn--danger" disabled={submitting}>
            {submitting ? 'Đang xử lý...' : 'Xác nhận nhường quyền'}
          </button>
        </div>
      </form>
    </dialog>
  );
}

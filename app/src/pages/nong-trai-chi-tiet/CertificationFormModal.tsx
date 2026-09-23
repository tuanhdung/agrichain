// Port modal "Thêm/Sửa chứng nhận nông trại" (cert-modal) + phần tương ứng
// của js/nong-trai-chi-tiet.js (openCertModal/validateCert/handleCertSubmit).
// Markup/class giữ NGUYÊN (.modal, .modal__form, .form-grid, .field,
// .field__error, .field__hint).
//
// ⚠️ CỐ TÌNH KHÔNG giới hạn dung lượng/kiểm MIME cho tệp đính kèm — đã xác
// nhận với người dùng (2026-09-23): bản gốc chỉ có `accept="image/*,.pdf"`
// trên input (gợi ý trình duyệt, KHÔNG enforce bằng JS), không có giới hạn
// 2MB nào (giới hạn đó chỉ áp dụng cho ẢNH NHẬT KÝ mùa vụ — MAX_LOG_IMAGE_BYTES,
// thuộc Bước 3, khác hẳn tệp chứng nhận) — giữ đúng hành vi gốc, không tự
// thêm validate ngoài phạm vi.
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import type { RefObject } from 'react';
import { Icon } from '../../icons';
import { api, ApiError } from '../../api';
import type { Certification, CertificationPayload } from '../../api';
import { useToast } from '../../components/ToastProvider';
import { CERT_STATUSES } from './constants';

export type CertModalMode = 'create' | 'edit';

interface CertificationFormModalProps {
  dialogRef: RefObject<HTMLDialogElement>;
  mode: CertModalMode;
  cert: Certification | null;
  farmId: string;
  // openCount của useDialog() — bắt buộc effect nạp lại form chạy lại đúng 1
  // lần/lần mở THẬT, kể cả khi `cert`/`mode` không đổi giá trị so với lần mở
  // trước (VD 2 lần bấm "Thêm mới" liên tiếp) — cùng lớp bug đã vá ở
  // /nong-trai (bản đồ Leaflet) và /tai-khoan (modal Thêm người dùng).
  openToken: number;
  onClose: () => void;
  onSaved: () => void;
}

interface FieldErrors {
  name?: string;
  code?: string;
  issuer?: string;
  status?: string;
  issue_date?: string;
  expiry_date?: string;
  note?: string;
  file?: string;
}

// Ánh xạ tên field backend trả về trong lỗi (details.field) sang đúng field
// lỗi trên form — khớp certFieldNodeFor() gốc (file_url/file_name đều rơi về
// ô "Tệp tin").
const FIELD_MAP: Record<string, keyof FieldErrors> = {
  name: 'name',
  code: 'code',
  issuer: 'issuer',
  status: 'status',
  issue_date: 'issue_date',
  expiry_date: 'expiry_date',
  note: 'note',
  file_url: 'file',
  file_name: 'file'
};

interface SelectedFile {
  name: string;
  dataUrl: string;
}

export function CertificationFormModal({ dialogRef, mode, cert, farmId, openToken, onClose, onSaved }: CertificationFormModalProps) {
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [issuer, setIssuer] = useState('');
  const [status, setStatus] = useState(CERT_STATUSES[0].key);
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [note, setNote] = useState('');

  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [fileRemoved, setFileRemoved] = useState(false);
  // Nội dung tệp hiện có (file_url thật, từ api.certifications.get()) — danh
  // sách chỉ có metadata (file_name), phải tải riêng chi tiết để biết tệp cũ
  // có thật sự tồn tại không, dùng cho cả link "Xem tệp" lẫn logic "giữ
  // nguyên tệp cũ" khi lưu. detailLoading chặn submit sớm trước khi biết
  // chắc, khớp existingCertFileUrl/certDetailLoading gốc.
  const [existingFileUrl, setExistingFileUrl] = useState<string | null>(null);
  const [existingFileName, setExistingFileName] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setErrors({});
    setSelectedFile(null);
    setFileRemoved(false);
    setExistingFileUrl(null);
    setExistingFileName(null);
    setDetailLoading(false);

    if (cert) {
      setName(cert.name);
      setCode(cert.code);
      setIssuer(cert.issuer);
      setStatus(cert.status);
      setIssueDate(cert.issue_date);
      setExpiryDate(cert.expiry_date);
      setNote(cert.note || '');

      if (cert.file_name) {
        setDetailLoading(true);
        api.certifications
          .get(cert.id)
          .then((detail) => {
            setExistingFileUrl(detail.file_url || null);
            setExistingFileName(detail.file_name || null);
          })
          .catch((err: unknown) => {
            showToast(err instanceof ApiError ? err.message : 'Có lỗi xảy ra, vui lòng thử lại.');
          })
          .finally(() => setDetailLoading(false));
      }
    } else {
      setName('');
      setCode('');
      setIssuer('');
      setStatus(CERT_STATUSES[0].key);
      setIssueDate('');
      setExpiryDate('');
      setNote('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- openToken buộc effect chạy lại đúng 1 lần/lần mở thật (xem ghi chú prop openToken ở trên), showToast không cần theo dõi
  }, [cert, mode, openToken]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedFile({ name: file.name, dataUrl: String(reader.result) });
      setFileRemoved(false);
    };
    reader.readAsDataURL(file);
  }

  function handleRemoveFile() {
    setSelectedFile(null);
    setFileRemoved(true);
  }

  function validate(): boolean {
    const nextErrors: FieldErrors = {};
    if (!name.trim()) nextErrors.name = 'Nhập tên chứng nhận.';
    if (!code.trim()) nextErrors.code = 'Nhập mã chứng nhận.';
    if (!issuer.trim()) nextErrors.issuer = 'Nhập cơ quan cấp.';
    if (!issueDate) nextErrors.issue_date = 'Chọn ngày cấp.';
    if (!expiryDate) nextErrors.expiry_date = 'Chọn ngày hết hạn.';

    // Lúc sửa, tệp cũ vẫn còn hiệu lực nếu chưa bấm "Gỡ tệp" — không bắt chọn
    // lại tệp mới mỗi lần sửa, chỉ bắt buộc lúc chưa có tệp nào cả.
    const hasFile = !!selectedFile || (!fileRemoved && !!existingFileUrl);
    if (!hasFile) nextErrors.file = 'Chọn tệp đính kèm.';

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (detailLoading) {
      showToast('Đang tải thông tin tệp đính kèm, thử lại sau giây lát.');
      return;
    }
    if (!validate()) return;

    const record: CertificationPayload = {
      name: name.trim(),
      code: code.trim(),
      issuer: issuer.trim(),
      status,
      issue_date: issueDate,
      expiry_date: expiryDate,
      note: note.trim() || null
    };

    if (selectedFile) {
      // Chọn tệp mới — thay thế tệp cũ (nếu có).
      record.file_name = selectedFile.name;
      record.file_url = selectedFile.dataUrl;
    } else if (fileRemoved) {
      // Bấm "Gỡ tệp" — CertificationUpdate: gửi null để gỡ tệp đính kèm.
      record.file_name = null;
      record.file_url = null;
    }
    // Không đổi/không gỡ: không gửi file_name/file_url — PATCH giữ nguyên tệp
    // cũ. POST (tạo mới) thì đơn giản là không có tệp nào cả (validate() đã
    // chặn trường hợp tạo mới không chọn tệp).

    setSubmitting(true);
    const request =
      mode === 'edit' && cert ? api.certifications.update(cert.id, record) : api.certifications.create({ ...record, farm_id: farmId });

    request
      .then(() => {
        onClose();
        onSaved();
        showToast(mode === 'edit' ? 'Đã lưu thay đổi.' : 'Đã thêm chứng nhận.');
      })
      .catch((err: unknown) => {
        const apiErr = err instanceof ApiError ? err : null;
        const backendField = apiErr?.details?.field as string | undefined;
        const mapped = backendField ? FIELD_MAP[backendField] : undefined;
        if (mapped) {
          setErrors((prev) => ({ ...prev, [mapped]: apiErr!.message }));
        } else {
          showToast(apiErr?.message ?? 'Có lỗi xảy ra, vui lòng thử lại.');
        }
      })
      .finally(() => setSubmitting(false));
  }

  const title = mode === 'edit' ? 'Sửa chứng nhận' : 'Thêm chứng nhận mới';
  const submitLabel = submitting ? 'Đang lưu...' : mode === 'edit' ? 'Lưu thay đổi' : 'Lưu chứng nhận';
  const showExistingFileHint = !selectedFile && !fileRemoved && !!existingFileUrl;

  return (
    <dialog className="modal" ref={dialogRef} aria-labelledby="cert-modal-title">
      <form className="modal__form" onSubmit={handleSubmit} noValidate>
        <div className="modal__header">
          <Icon name="qr-code" />
          <h2 className="modal__title" id="cert-modal-title">
            {title}
          </h2>
          <button type="button" className="modal__close" aria-label="Đóng" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="modal__body">
          <div className="form-grid">
            <div className="field">
              <label className="label" htmlFor="cert-name">
                Tên
              </label>
              <input
                className="input"
                type="text"
                id="cert-name"
                value={name}
                aria-invalid={errors.name ? 'true' : undefined}
                onChange={(e) => setName(e.target.value)}
              />
              {errors.name && <p className="field__error">{errors.name}</p>}
            </div>

            <div className="field">
              <label className="label" htmlFor="cert-code">
                Mã
              </label>
              <input
                className="input"
                type="text"
                id="cert-code"
                value={code}
                aria-invalid={errors.code ? 'true' : undefined}
                onChange={(e) => setCode(e.target.value)}
              />
              {errors.code && <p className="field__error">{errors.code}</p>}
            </div>

            <div className="field">
              <label className="label" htmlFor="cert-issuer">
                Cơ quan cấp
              </label>
              <input
                className="input"
                type="text"
                id="cert-issuer"
                value={issuer}
                aria-invalid={errors.issuer ? 'true' : undefined}
                onChange={(e) => setIssuer(e.target.value)}
              />
              {errors.issuer && <p className="field__error">{errors.issuer}</p>}
            </div>

            <div className="field">
              <label className="label" htmlFor="cert-status">
                Trạng thái
              </label>
              <select className="select" id="cert-status" value={status} onChange={(e) => setStatus(e.target.value)}>
                {CERT_STATUSES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label className="label" htmlFor="cert-issue-date">
                Ngày cấp
              </label>
              <input
                className="input"
                type="date"
                id="cert-issue-date"
                value={issueDate}
                aria-invalid={errors.issue_date ? 'true' : undefined}
                onChange={(e) => setIssueDate(e.target.value)}
              />
              {errors.issue_date && <p className="field__error">{errors.issue_date}</p>}
            </div>

            <div className="field">
              <label className="label" htmlFor="cert-expiry-date">
                Ngày hết hạn
              </label>
              <input
                className="input"
                type="date"
                id="cert-expiry-date"
                value={expiryDate}
                aria-invalid={errors.expiry_date ? 'true' : undefined}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
              {errors.expiry_date && <p className="field__error">{errors.expiry_date}</p>}
            </div>

            <div className="field form-grid__full">
              <label className="label" htmlFor="cert-file">
                Tệp tin
              </label>
              <input
                className="input"
                type="file"
                id="cert-file"
                accept="image/*,.pdf"
                aria-invalid={errors.file ? 'true' : undefined}
                onChange={handleFileChange}
              />
              {showExistingFileHint && (
                <p className="field__hint">
                  Tệp hiện tại:{' '}
                  <a href={existingFileUrl ?? '#'} target="_blank" rel="noopener">
                    {existingFileName || 'Xem tệp'}
                  </a>{' '}
                  <button type="button" className="btn btn--ghost btn--sm" onClick={handleRemoveFile}>
                    Gỡ tệp
                  </button>
                </p>
              )}
              {errors.file && <p className="field__error">{errors.file}</p>}
            </div>

            <div className="field form-grid__full">
              <label className="label" htmlFor="cert-note">
                Ghi chú
              </label>
              <textarea className="textarea" id="cert-note" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="modal__footer">
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            Hủy
          </button>
          <button type="submit" className="btn btn--primary" disabled={submitting}>
            {submitLabel}
          </button>
        </div>
      </form>
    </dialog>
  );
}

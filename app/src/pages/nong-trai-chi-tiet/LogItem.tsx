// Port logItem() (js/nong-trai-chi-tiet.js gốc) — markup/class giữ NGUYÊN
// (.log-item.log-item--<color>, .log-item__icon/__body/__head/__title/
// __time/__field/__section-label/__supplies/__images/__images-note/__actions).
import { useState } from 'react';
import { Icon } from '../../icons';
import { activityIconName, activityTypeOf } from '../../enums';
import { api, ApiError } from '../../api';
import type { Log, LogImageDetail, LogSystemRow } from '../../api';
import { useToast } from '../../components/ToastProvider';
import { formatDateTimeLocal } from './format';

interface LogItemProps {
  log: Log | LogSystemRow;
  isPlatformAdminMode: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (log: Log) => void;
  onDelete: (log: Log) => void;
}

export function LogItem({ log, isPlatformAdminMode, canEdit, canDelete, onEdit, onDelete }: LogItemProps) {
  const { showToast } = useToast();
  const activity = activityTypeOf(log.activity_type);

  // Danh sách chỉ trả METADATA ảnh (không có nội dung) — chỉ gọi
  // api.logs.get() khi người dùng thật sự bấm "Xem ảnh", không tải trước cho
  // toàn bộ danh sách, khớp bản gốc.
  const [loadedImages, setLoadedImages] = useState<LogImageDetail[] | null>(null);
  const [loadingImages, setLoadingImages] = useState(false);

  function handleViewImages() {
    setLoadingImages(true);
    api.logs
      .get(log.id)
      .then((detail) => {
        setLoadedImages(detail.images || []);
      })
      .catch((err: unknown) => {
        showToast(err instanceof ApiError ? err.message : 'Có lỗi xảy ra, vui lòng thử lại.');
      })
      .finally(() => setLoadingImages(false));
  }

  return (
    <div className={`log-item log-item--${activity.color} detail-log-item`}>
      <div className="log-item__icon">
        <Icon name={activityIconName(activity)} />
      </div>

      <div className="log-item__body">
        <div className="log-item__head">
          <span className="log-item__title">{activity.label}</span>
          <span className="log-item__time">{formatDateTimeLocal(log.performed_at)}</span>
        </div>

        <div className="log-item__field">
          <Icon name="user" className="icon--sm" />
          <span>Thực hiện bởi: {log.performed_by || '—'}</span>
        </div>
        {log.weather && (
          <div className="log-item__field">
            <Icon name="sun" className="icon--sm" />
            <span>Điều kiện thời tiết: {log.weather}</span>
          </div>
        )}
        {log.description && (
          <div className="log-item__field">
            <Icon name="file-text" className="icon--sm" />
            <span>Mô tả: {log.description}</span>
          </div>
        )}

        {log.supplies && log.supplies.length > 0 && (
          <>
            <div className="log-item__section-label">
              <Icon name="box" className="icon--sm" />
              <span>Sử dụng vật tư</span>
            </div>
            <div className="log-item__supplies">
              {log.supplies.map((supply, index) => (
                <span key={index} className="badge badge--neutral">
                  {supply.name} - {supply.quantity} {supply.unit}
                  {supply.method ? ` (${supply.method})` : ''}
                </span>
              ))}
            </div>
          </>
        )}

        {log.images && log.images.length > 0 && (
          <>
            <div className="log-item__section-label">
              <Icon name="image" className="icon--sm" />
              <span>Hình ảnh hiện trường ({log.images.length})</span>
            </div>
            <div className="log-item__images">
              {isPlatformAdminMode ? (
                // GET /logs/{id} lọc theo Đơn vị của người gọi — platform_admin
                // sẽ luôn nhận 404 với nhật ký thuộc Đơn vị khác. Hiện ghi chú
                // tĩnh thay vì 1 nút dẫn tới lỗi, khớp bản gốc.
                <p className="log-item__images-note">Không xem được nội dung ảnh ở chế độ Quản trị hệ thống.</p>
              ) : loadedImages ? (
                loadedImages.map((image, index) => <img key={index} src={image.url} alt={image.name} />)
              ) : (
                <button type="button" className="btn btn--outline btn--sm" disabled={loadingImages} onClick={handleViewImages}>
                  {loadingImages ? 'Đang tải...' : 'Xem ảnh'}
                </button>
              )}
            </div>
          </>
        )}

        <div className="log-item__actions">
          {canEdit && (
            <button type="button" className="icon-btn" aria-label="Sửa nhật ký" data-tooltip="Chỉnh sửa" onClick={() => onEdit(log)}>
              <Icon name="pencil" />
            </button>
          )}
          {canDelete && (
            <button type="button" className="icon-btn icon-btn--danger" aria-label="Xoá nhật ký" data-tooltip="Xoá" onClick={() => onDelete(log)}>
              <Icon name="trash" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

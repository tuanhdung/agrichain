// Port templateCard() (js/mau-quy-trinh.js gốc) — markup/class giữ NGUYÊN
// (.card.card--hover, .card__header/__title/__subtitle/__body/__footer,
// .icon-btn/.icon-btn--danger).
import { Icon } from '../../icons';
import type { WorkflowTemplate, WorkflowTemplateSystemRow } from '../../api';
import './template-card.css';

interface TemplateCardProps {
  template: WorkflowTemplate | WorkflowTemplateSystemRow;
  isPlatformAdminMode: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onOpenEdit: (template: WorkflowTemplate) => void;
  onOpenDelete: (template: WorkflowTemplate) => void;
}

export function TemplateCard({ template, isPlatformAdminMode, canEdit, canDelete, onOpenEdit, onOpenDelete }: TemplateCardProps) {
  const organizationName = 'organization_name' in template ? template.organization_name : null;
  const stepCount = template.steps?.length ?? 0;

  // platform_admin: nút này LUÔN hiện (đổi hẳn sang icon con mắt) và mở
  // ĐÚNG modal Thêm/Sửa nhưng ở chế độ chỉ xem — cách duy nhất để xem đủ
  // steps[] của 1 mẫu quy trình, vì thẻ chỉ hiện tên/mô tả/số bước. Business
  // vẫn theo đúng quyền workflow_templates.edit như cũ.
  const showEdit = isPlatformAdminMode || canEdit;

  return (
    <div className="card card--hover template-card">
      <div className="card__header">
        <h2 className="card__title">{template.name}</h2>
        <p className="card__subtitle">{stepCount} bước thực hiện</p>
        {isPlatformAdminMode && <p className="card__subtitle">Đơn vị sở hữu: {organizationName || '—'}</p>}
      </div>

      <div className="card__body">{template.description || 'Chưa có mô tả.'}</div>

      <div className="card__footer">
        {showEdit && (
          <button
            type="button"
            className="icon-btn"
            aria-label={`${isPlatformAdminMode ? 'Xem chi tiết' : 'Sửa'} ${template.name}`}
            data-tooltip={isPlatformAdminMode ? 'Xem chi tiết' : 'Sửa'}
            onClick={() => onOpenEdit(template)}
          >
            <Icon name={isPlatformAdminMode ? 'eye' : 'pencil'} />
          </button>
        )}
        {canDelete && (
          <button
            type="button"
            className="icon-btn icon-btn--danger"
            aria-label={`Xoá ${template.name}`}
            data-tooltip="Xoá"
            onClick={() => onOpenDelete(template)}
          >
            <Icon name="trash" />
          </button>
        )}
      </div>
    </div>
  );
}

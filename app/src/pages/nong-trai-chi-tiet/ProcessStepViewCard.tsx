// Port processStepViewCard() (js/nong-trai-chi-tiet.js gốc) — 1 bước trong
// checklist "Quy trình mùa vụ" (đã áp dụng). Markup/class giữ NGUYÊN
// (.workflow-checklist__item/__rail/__dot/__line/__card/__head/__step-title/
// __activity/__instruction/__waiting/__done-note).
import { Icon } from '../../icons';
import { activityIconName, activityTypeOf } from '../../enums';
import type { WorkflowStep } from '../../api';

interface ProcessStepViewCardProps {
  step: WorkflowStep;
  index: number;
  isCurrent: boolean;
  isPlatformAdminMode: boolean;
  onStartCompletion: (step: WorkflowStep) => void;
}

export function ProcessStepViewCard({ step, index, isCurrent, isPlatformAdminMode, onStartCompletion }: ProcessStepViewCardProps) {
  const activity = activityTypeOf(step.activity_type);

  return (
    <div className="workflow-checklist__item">
      <div className="workflow-checklist__rail">
        <span className={`workflow-checklist__dot${step.done ? ' workflow-checklist__dot--done' : ''}`}></span>
        <div className="workflow-checklist__line"></div>
      </div>

      <div className="workflow-checklist__card">
        <div className="workflow-checklist__head">
          <strong className="workflow-checklist__step-title">
            Bước {index + 1}: {step.name}
          </strong>
          {step.require_qr && <span className="badge badge--success">Yêu cầu sinh QR</span>}
          <span className={`badge ${step.done ? 'badge--success' : 'badge--warning'}`}>{step.done ? 'Hoàn thành' : 'Đang chờ'}</span>
        </div>

        <div className={`workflow-checklist__activity workflow-checklist__activity--${activity.color}`}>
          <Icon name={activityIconName(activity)} />
          <span>{activity.label}</span>
        </div>

        {step.instruction && <p className="workflow-checklist__instruction">{step.instruction}</p>}

        {step.done ? (
          <div className="workflow-checklist__done-note">
            <Icon name="check-circle" />
            <span>Đã ghi nhật ký &amp; hoàn thành</span>
          </div>
        ) : isCurrent && !isPlatformAdminMode ? (
          <button type="button" className="btn btn--primary btn--sm" onClick={() => onStartCompletion(step)}>
            <Icon name="check-circle" className="icon--sm" />
            Ghi nhật ký &amp; hoàn thành
          </button>
        ) : (
          <div className="workflow-checklist__waiting">
            <Icon name="clock" />
            <span>Chờ đến lượt thực hiện</span>
          </div>
        )}
      </div>
    </div>
  );
}

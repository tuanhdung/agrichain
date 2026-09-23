// Port modal "Xem chi tiết mùa vụ" (season-view-modal) — ĐỦ 4 tab: "Thông
// tin", "Timeline mùa vụ" (Bước 3), "Lô hàng" (Bước 4), "Quy trình mùa vụ"
// (Bước 5 — ĐÂY). Markup/class giữ NGUYÊN (.season-view-code,
// .season-view-stats/__stat/__label/__value, .tabs, .tab-panel-header,
// .log-list, .process-apply*, .process-detail__*, .workflow-checklist__*).
//
// Quy trình mùa vụ (workflow_steps) là phần LỒNG CHÉO nhất trang: hoàn thành
// 1 bước phải mở lại CHÍNH LogFormModal của tab "Timeline mùa vụ" (điền sẵn
// activity_type/instruction), và nếu bước yêu cầu QR thì sau đó mở tiếp
// CHÍNH BatchFormModal của tab "Lô hàng" — vì vậy toàn bộ state điều phối
// (`completingStepId`/`pendingQrStepId`, tương đương biến module-scope cùng
// tên trong js/nong-trai-chi-tiet.js gốc) đặt Ở ĐÂY (component cha sở hữu cả
// 2 modal đó), KHÔNG đặt trong 1 component "ProcessTab" con riêng — tránh
// phải xuyên state Log/BatchFormModal qua thêm 1 tầng prop không cần thiết.
import { useEffect, useState } from 'react';
import type { RefObject } from 'react';
import { Icon } from '../../icons';
import { api, ApiError } from '../../api';
import type { Batch, BatchSystemRow, Log, LogSystemRow, Season, Supply, WorkflowStep, WorkflowTemplate } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { usePermission } from '../../hooks/usePermission';
import { useDialog } from '../../hooks/useDialog';
import { useToast } from '../../components/ToastProvider';
import { useConfirm } from '../../components/ConfirmDialogProvider';
import { activityTypeOf } from '../../enums';
import { seasonStatusOf } from './constants';
import { formatArea, formatDate, formatDateTimeLocal } from './format';
import { fetchAllSystemPages } from './systemPaging';
import { LogItem } from './LogItem';
import { LogFormModal, type LogModalMode } from './LogFormModal';
import { BatchCard } from './BatchCard';
import { BatchFormModal, type BatchModalMode } from './BatchFormModal';
import { ProcessStepViewCard } from './ProcessStepViewCard';
import { ProcessStepEditorModal } from './ProcessStepEditorModal';

type SeasonViewTab = 'info' | 'timeline' | 'batches' | 'process';
type LogsViewState = 'loading' | 'data' | 'empty' | 'error';
type BatchesViewState = 'loading' | 'data' | 'empty' | 'error';

interface ProcessRetryNotice {
  message: string;
  stepId: string;
  logId: string;
}

interface SeasonViewModalProps {
  dialogRef: RefObject<HTMLDialogElement>;
  season: Season | null;
  // Mã nông trại của mùa vụ đang xem — chỉ dùng để gợi ý mã lô hàng tiếp theo
  // (suggestBatchCode() gốc: "<mã nông trại>-<mã mùa vụ>-NNN"), season không
  // tự mang theo field này.
  farmCode: string;
  supplies: Supply[];
  openToken: number;
  onClose: () => void;
  // Mọi thao tác liên quan quy trình (áp dụng mẫu/tạo rỗng/hoàn thành bước/
  // gắn lô hàng/tuỳ biến bước) đều PATCH /seasons/{id} rồi cần cập nhật lại
  // `season` mà trang cha (NongTraiChiTietPage.tsx) đang giữ — modal này
  // không tự giữ bản sao season riêng, khớp `currentViewedSeason = updated`
  // gốc (biến module-scope, đọc/ghi từ nhiều hàm khác nhau).
  onSeasonUpdated: (updated: Season) => void;
}

export function SeasonViewModal({ dialogRef, season, farmCode, supplies, openToken, onClose, onSeasonUpdated }: SeasonViewModalProps) {
  const { isPlatformAdmin } = useAuth();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const canAddLog = usePermission('logs.add');
  const canEditLog = usePermission('logs.edit');
  const canDeleteLog = usePermission('logs.delete');

  const [tab, setTab] = useState<SeasonViewTab>('info');

  const [logs, setLogs] = useState<(Log | LogSystemRow)[]>([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsView, setLogsView] = useState<LogsViewState>('loading');
  const [logsErrorMessage, setLogsErrorMessage] = useState('');

  const logModal = useDialog<HTMLDialogElement>();
  const [logModalMode, setLogModalMode] = useState<LogModalMode>('create');
  const [editingLog, setEditingLog] = useState<Log | null>(null);

  const [batches, setBatches] = useState<(Batch | BatchSystemRow)[]>([]);
  const [batchesView, setBatchesView] = useState<BatchesViewState>('loading');
  const [batchesErrorMessage, setBatchesErrorMessage] = useState('');

  const batchModal = useDialog<HTMLDialogElement>();
  const [batchModalMode, setBatchModalMode] = useState<BatchModalMode>('create');
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);

  // --- Quy trình mùa vụ (tab "Quy trình mùa vụ") ----------------------------
  const [workflowTemplates, setWorkflowTemplates] = useState<WorkflowTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [applyingTemplate, setApplyingTemplate] = useState(false);
  const [processRetryNotice, setProcessRetryNotice] = useState<ProcessRetryNotice | null>(null);

  // Bước đang được hoàn tất qua "Ghi nhật ký & hoàn thành" (khác null khi
  // LogFormModal đang mở CHO MỤC ĐÍCH NÀY) — dùng ở onSaved của LogFormModal
  // để biết có cần completeWorkflowStep() không. PHẢI xoá sạch mỗi khi
  // LogFormModal đóng vì bất kỳ lý do gì (xem closeLogModal() bên dưới),
  // tránh hoàn thành nhầm bước ở lần thêm nhật ký kế tiếp không liên quan —
  // khớp completingStepId gốc.
  const [completingStepId, setCompletingStepId] = useState<string | null>(null);
  // Prefill activity_type/instruction cho LogFormModal khi mở từ luồng trên —
  // tách riêng khỏi completingStepId vì LogFormModal cần đọc TÊN/HƯỚNG DẪN
  // của bước, không chỉ id.
  const [logPrefill, setLogPrefill] = useState<{ activityType: string; description: string } | null>(null);

  // Bước đang chờ gắn lô hàng sau khi hoàn thành (require_qr: true) — khác
  // null khi BatchFormModal đang mở CHO MỤC ĐÍCH NÀY. Cùng lý do PHẢI xoá
  // sạch khi BatchFormModal đóng — khớp pendingQrStepId gốc.
  const [pendingQrStepId, setPendingQrStepId] = useState<string | null>(null);

  const stepEditorModal = useDialog<HTMLDialogElement>();

  function loadLogs(seasonId: string) {
    setLogsView('loading');

    // platform_admin: cùng lý do renderCertifications()/renderSeasons() ở
    // NongTraiChiTietPage.tsx — GET /logs org-scoped 403 với dữ liệu Đơn vị
    // khác, đọc GET /system/logs rồi tự lọc theo season_id ở client.
    const request = isPlatformAdmin
      ? fetchAllSystemPages(api.system.logs.list).then((items) => {
          const filtered = items.filter((item) => item.season_id === seasonId);
          return { items: filtered, total: filtered.length };
        })
      : api.logs.list({ season_id: seasonId, page_size: 100 });

    request
      .then((data) => {
        // Mới thực hiện gần đây nhất lên đầu, khớp renderSeasonLogs() gốc.
        const items = (data.items || []).slice().sort((a, b) => String(b.performed_at).localeCompare(String(a.performed_at)));
        setLogs(items);
        setLogsTotal(data.total || items.length);
        setLogsView(items.length ? 'data' : 'empty');
      })
      .catch((err: unknown) => {
        setLogsErrorMessage(err instanceof ApiError ? err.message : 'Có lỗi xảy ra, vui lòng thử lại.');
        setLogsView('error');
      });
  }

  function loadBatches(seasonId: string) {
    setBatchesView('loading');

    // platform_admin: cùng lý do loadLogs() ở trên — GET /batches org-scoped
    // 403 với dữ liệu Đơn vị khác, đọc GET /system/batches rồi tự lọc theo
    // season_id ở client.
    const request = isPlatformAdmin
      ? fetchAllSystemPages(api.system.batches.list).then((items) => items.filter((item) => item.season_id === seasonId))
      : api.batches.list({ season_id: seasonId, page_size: 100 }).then((data) => data.items || []);

    request
      .then((items) => {
        setBatches(items);
        setBatchesView(items.length ? 'data' : 'empty');
      })
      .catch((err: unknown) => {
        setBatchesErrorMessage(err instanceof ApiError ? err.message : 'Có lỗi xảy ra, vui lòng thử lại.');
        setBatchesView('error');
      });
  }

  // Reset về tab "Thông tin" + nạp lại nhật ký/lô hàng MỖI LẦN mở modal thật
  // (kể cả xem lại ĐÚNG mùa vụ vừa đóng trước đó) — khớp openSeasonViewModal()
  // gốc luôn gọi resetSeasonViewTabs() + renderSeasonLogs() + loadBatches()
  // không điều kiện.
  //
  // ⚠️ Khoá theo `season?.id` (KHÔNG phải object `season`): mọi thao tác ở
  // tab "Quy trình mùa vụ" (áp dụng mẫu/hoàn thành bước/...) đều PATCH rồi
  // gọi `onSeasonUpdated(updated)` — season CÙNG id nhưng ĐỔI tham chiếu
  // object. Nếu effect này khoá theo object `season`, mỗi lần cập nhật quy
  // trình sẽ vô tình kích hoạt lại — nhảy tab về "Thông tin" + tải lại nhật
  // ký/lô hàng không cần thiết, phá luồng người dùng đang thao tác ở tab
  // "Quy trình mùa vụ".
  useEffect(() => {
    setTab('info');
    if (season) {
      loadLogs(season.id);
      loadBatches(season.id);
    } else {
      setLogs([]);
      setLogsTotal(0);
      setLogsView('loading');
      setBatches([]);
      setBatchesView('loading');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- openToken buộc effect chạy lại đúng 1 lần/lần mở thật, kể cả xem lại đúng mùa vụ cũ; season đọc qua closure, cố tình KHÔNG theo dõi object reference (xem ghi chú trên)
  }, [season?.id, isPlatformAdmin, openToken]);

  // Nạp danh sách mẫu quy trình CHỈ khi mở modal lúc mùa vụ CHƯA áp dụng quy
  // trình nào (workflow_steps === null) — khớp renderSeasonProcess() gốc chỉ
  // gọi fillProcessTemplateSelect() trong đúng nhánh đó, và CHỈ khi không
  // phải platform_admin (GET /workflow-templates đòi quyền
  // workflow_templates.view mà platform_admin không có, 403 vô ích nếu gọi).
  useEffect(() => {
    setSelectedTemplateId('');
    if (!season || isPlatformAdmin || season.workflow_steps) {
      setWorkflowTemplates([]);
      return;
    }
    api.workflowTemplates
      .list({ page_size: 100 })
      .then((data) => setWorkflowTemplates(data.items || []))
      .catch((err: unknown) => {
        showToast(`Không tải được danh sách mẫu quy trình: ${err instanceof ApiError ? err.message : 'Có lỗi xảy ra.'}`);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ nạp lại theo season/openToken, showToast không cần theo dõi
  }, [season?.id, isPlatformAdmin, openToken]);

  // Gợi ý mã lô hàng tiếp theo của CHÍNH mùa vụ đang xem — dạng
  // <mã nông trại>-<mã mùa vụ>-001, chỉ gợi ý, sửa được — khớp
  // suggestBatchCode() gốc.
  function suggestedBatchCode(): string {
    const seq = String(batches.length + 1).padStart(3, '0');
    return `${farmCode}-${season?.code ?? ''}-${seq}`;
  }

  // closeBatchModal()/closeLogModal() (KHÔNG phải batchModal.close()/
  // logModal.close() trần) — mọi chỗ đóng 2 modal đó (nút Huỷ/X, VÀ sau khi
  // lưu thành công, vì LogFormModal/BatchFormModal tự gọi `onClose()` trước
  // `onSaved()`) đều phải đi qua đây để xoá sạch completingStepId/
  // pendingQrStepId — khớp closeSeasonLogModal()/closeBatchModal() gốc.
  function closeBatchModal() {
    batchModal.close();
    setPendingQrStepId(null);
  }

  function closeLogModal() {
    logModal.close();
    setCompletingStepId(null);
  }

  function openCreateBatch() {
    setBatchModalMode('create');
    setEditingBatch(null);
    batchModal.open();
  }

  function openEditBatch(batch: Batch) {
    setBatchModalMode('edit');
    setEditingBatch(batch);
    batchModal.open();
  }

  async function handleDeleteBatch(batch: Batch) {
    if (!season) return;
    const confirmed = await confirm(`Xoá lô hàng "${batch.code}"? Hành động này không thể hoàn tác.`);
    if (!confirmed) return;
    try {
      await api.batches.remove(batch.id);
      loadBatches(season.id);
      showToast('Đã xoá lô hàng.');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Có lỗi xảy ra, vui lòng thử lại.');
    }
  }

  function openCreateLog() {
    setLogModalMode('create');
    setEditingLog(null);
    setLogPrefill(null);
    logModal.open();
  }

  function openEditLog(log: Log) {
    setLogModalMode('edit');
    setEditingLog(log);
    setLogPrefill(null);
    logModal.open();
  }

  async function handleDeleteLog(log: Log) {
    if (!season) return;
    const activity = activityTypeOf(log.activity_type);
    const confirmed = await confirm(
      `Xoá nhật ký "${activity.label}" ngày ${formatDateTimeLocal(log.performed_at)}? Hành động này không thể hoàn tác.`
    );
    if (!confirmed) return;
    try {
      await api.logs.remove(log.id);
      loadLogs(season.id);
      showToast('Đã xoá nhật ký.');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Có lỗi xảy ra, vui lòng thử lại.');
    }
  }

  /* --- Quy trình mùa vụ ---------------------------------------------------- */

  function applyWorkflowTemplate() {
    if (!season || !selectedTemplateId) return;
    const template = workflowTemplates.find((t) => t.id === selectedTemplateId);
    if (!template) return;

    // Chụp (snapshot) steps[] của mẫu — KHÔNG tự sinh `id` (backend tự cấp
    // UUID thật khi bỏ trống, xem WorkflowStep trong api/seasons.ts), khớp
    // cloneTemplateSteps() gốc.
    const clonedSteps: WorkflowStep[] = (template.steps || []).map((step) => ({
      name: step.name || '',
      activity_type: step.activity_type,
      instruction: step.instruction || '',
      require_qr: !!step.require_qr,
      require_supply: !!step.require_supply,
      supply_id: step.supply_id || null,
      require_image: !!step.require_image,
      done: false,
      completed_at: null,
      log_id: null,
      batch_id: null
    }));

    setApplyingTemplate(true);
    api.seasons
      .update(season.id, {
        workflow_template_id: template.id,
        workflow_template_name: template.name,
        workflow_steps: clonedSteps
      })
      .then((updated) => {
        onSeasonUpdated(updated);
        showToast('Đã áp dụng mẫu quy trình.');
      })
      .catch((err: unknown) => {
        showToast(err instanceof ApiError ? err.message : 'Có lỗi xảy ra, vui lòng thử lại.');
      })
      .finally(() => setApplyingTemplate(false));
  }

  function createEmptyWorkflow() {
    if (!season) return;
    api.seasons
      .update(season.id, { workflow_template_id: null, workflow_template_name: 'Quy trình tự tạo', workflow_steps: [] })
      .then((updated) => {
        onSeasonUpdated(updated);
        stepEditorModal.open(); // danh sách đang rỗng — mở luôn để tự thêm bước, khớp createEmptyWorkflow() gốc
      })
      .catch((err: unknown) => {
        showToast(err instanceof ApiError ? err.message : 'Có lỗi xảy ra, vui lòng thử lại.');
      });
  }

  // Bước "tới lượt" duy nhất trong checklist: bước CHƯA hoàn thành ĐẦU TIÊN
  // theo đúng thứ tự mảng — khớp currentActionableStepId() gốc.
  function currentActionableStepId(steps: WorkflowStep[]): string | null {
    for (const step of steps) {
      if (!step.done) return step.id ?? null;
    }
    return null;
  }

  function startStepCompletion(step: WorkflowStep) {
    if (!step.id) return;
    setCompletingStepId(step.id);
    setLogPrefill({ activityType: step.activity_type, description: step.instruction || '' });
    setLogModalMode('create');
    setEditingLog(null);
    logModal.open();
  }

  // ⚠️ Gửi `workflow_steps[].done` — backend hiện vẫn dùng `status`
  // ('pending'/'completed'), đây là BUG backend đang chờ sửa (xem ghi chú ở
  // WorkflowStep trong api/seasons.ts và CLAUDE.md gốc). Cho tới khi backend
  // sửa xong, PATCH này có thể "thành công" nhưng KHÔNG thực sự đổi trạng
  // thái bước phía server — chưa kiểm chứng được đầu-cuối, chỉ mới đúng theo
  // hợp đồng dữ liệu đã chốt. Cứ viết đúng theo `done`, không tự ý đổi lại.
  function completeWorkflowStep(stepId: string, logId: string) {
    if (!season) return;
    const steps = (season.workflow_steps || []).map((s) => ({ ...s }));
    const step = steps.find((s) => s.id === stepId);
    if (!step) return;

    step.done = true;
    step.completed_at = new Date().toISOString();
    step.log_id = logId;

    setProcessRetryNotice(null);
    api.seasons
      .update(season.id, { workflow_steps: steps })
      .then((updated) => {
        onSeasonUpdated(updated);
        showToast(`Đã hoàn thành bước "${step.name}".`);

        if (step.require_qr) {
          setPendingQrStepId(step.id ?? null);
          setBatchModalMode('create');
          setEditingBatch(null);
          batchModal.open();
        }
      })
      .catch((err: unknown) => {
        // Nhật ký ĐÃ tạo thành công trước khi gọi hàm này — không được để
        // trạng thái nửa vời trong im lặng: log tồn tại thật nhưng bước chưa
        // được đánh dấu hoàn thành. Hiện banner có nút thử lại ĐÚNG lệnh
        // PATCH này, không phải toast tự biến mất, khớp bản gốc.
        setProcessRetryNotice({ message: err instanceof ApiError ? err.message : 'Có lỗi xảy ra, vui lòng thử lại.', stepId, logId });
      });
  }

  function linkBatchToStep(stepId: string, batchId: string) {
    if (!season) return;
    const steps = (season.workflow_steps || []).map((s) => ({ ...s }));
    const step = steps.find((s) => s.id === stepId);
    if (step) step.batch_id = batchId;

    api.seasons
      .update(season.id, { workflow_steps: steps })
      .then((updated) => {
        onSeasonUpdated(updated);
      })
      .catch((err: unknown) => {
        showToast(`Không lưu được liên kết lô hàng vào bước quy trình: ${err instanceof ApiError ? err.message : 'Có lỗi xảy ra.'}`);
      });
  }

  if (!season) {
    // Chưa từng mở modal lần nào — vẫn phải render <dialog> (ref cần gắn sẵn
    // để lần gọi open() đầu tiên hoạt động), nhưng khỏi render phần thân dựa
    // trên dữ liệu chưa có.
    return (
      <dialog className="modal" ref={dialogRef} aria-labelledby="season-view-title">
        <div className="modal__header">
          <h2 className="modal__title" id="season-view-title">
            Mùa vụ
          </h2>
        </div>
      </dialog>
    );
  }

  const status = seasonStatusOf(season.status);

  return (
    <>
      <dialog className="modal" ref={dialogRef} aria-labelledby="season-view-title">
        <div className="modal__header">
          <Icon name="seedling" />
          <h2 className="modal__title" id="season-view-title">
            {season.name}
          </h2>
          <span className={`badge ${status.badge}`}>{status.label}</span>
          <button type="button" className="modal__close" aria-label="Đóng" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="modal__body">
          <p className="season-view-code">Mã: {season.code}</p>

          <div className="season-view-stats">
            <div className="season-view-stat">
              <Icon name="calendar" className="icon--sm" />
              <span className="season-view-stat__label">Bắt đầu</span>
              <strong className="season-view-stat__value">{formatDate(season.start_date)}</strong>
            </div>
            <div className="season-view-stat">
              <Icon name="calendar" className="icon--sm" />
              <span className="season-view-stat__label">Kết thúc</span>
              <strong className="season-view-stat__value">{formatDate(season.end_date)}</strong>
            </div>
            <div className="season-view-stat">
              <Icon name="chart-bar" className="icon--sm" />
              <span className="season-view-stat__label">Diện tích dự kiến</span>
              <strong className="season-view-stat__value">{formatArea(season.planned_area)}</strong>
            </div>
            <div className="season-view-stat">
              <Icon name="chart-bar" className="icon--sm" />
              <span className="season-view-stat__label">Diện tích thực tế</span>
              <strong className="season-view-stat__value">{formatArea(season.actual_area)}</strong>
            </div>
          </div>

          <div className="tabs" role="tablist" style={{ marginTop: 'var(--space-5)' }}>
            <button
              type="button"
              className={`tabs__tab${tab === 'info' ? ' is-active' : ''}`}
              role="tab"
              aria-selected={tab === 'info'}
              onClick={() => setTab('info')}
            >
              <Icon name="shield-check" className="icon--sm" />
              Thông tin
            </button>
            <button
              type="button"
              className={`tabs__tab${tab === 'timeline' ? ' is-active' : ''}`}
              role="tab"
              aria-selected={tab === 'timeline'}
              onClick={() => setTab('timeline')}
            >
              <Icon name="calendar" className="icon--sm" />
              Timeline mùa vụ
            </button>
            <button
              type="button"
              className={`tabs__tab${tab === 'batches' ? ' is-active' : ''}`}
              role="tab"
              aria-selected={tab === 'batches'}
              onClick={() => setTab('batches')}
            >
              <Icon name="box" className="icon--sm" />
              Lô hàng
            </button>
            <button
              type="button"
              className={`tabs__tab${tab === 'process' ? ' is-active' : ''}`}
              role="tab"
              aria-selected={tab === 'process'}
              onClick={() => setTab('process')}
            >
              <Icon name="tractor" className="icon--sm" />
              Quy trình mùa vụ
            </button>
          </div>

          {tab === 'info' && (
            <div className="tabs__panel" role="tabpanel">
              <div className="form-grid">
                <div className="view-field">
                  <span className="label">Ngày bắt đầu</span>
                  <span>{formatDate(season.start_date)}</span>
                </div>
                <div className="view-field">
                  <span className="label">Ngày kết thúc</span>
                  <span>{formatDate(season.end_date)}</span>
                </div>
                <div className="view-field">
                  <span className="label">Diện tích kế hoạch</span>
                  <span>{formatArea(season.planned_area)}</span>
                </div>
                <div className="view-field">
                  <span className="label">Diện tích thực tế</span>
                  <span>{formatArea(season.actual_area)}</span>
                </div>
                <div className="view-field">
                  <span className="label">Trạng thái</span>
                  <span>
                    <span className={`badge ${status.badge}`}>{status.label}</span>
                  </span>
                </div>
                <div className="view-field form-grid__full">
                  <span className="label">Ghi chú</span>
                  <span>{season.note || '—'}</span>
                </div>
              </div>
            </div>
          )}

          {tab === 'timeline' && (
            <div className="tabs__panel" role="tabpanel">
              <div className="tab-panel-header">
                <div>
                  <h2 className="tab-panel-header__title">Nhật ký mùa vụ</h2>
                  <p className="tab-panel-header__meta">
                    Tổng số: <strong>{logsTotal}</strong> nhật ký
                  </p>
                </div>
                {canAddLog && (
                  <button type="button" className="btn btn--primary btn--sm" onClick={openCreateLog}>
                    <Icon name="plus" className="icon--sm" />
                    Thêm mới
                  </button>
                )}
              </div>

              {logsView === 'loading' && (
                <div className="async-state">
                  <span className="spinner spinner--lg"></span>
                  <p className="async-state__title">Đang tải danh sách nhật ký...</p>
                </div>
              )}

              {logsView === 'error' && (
                <div className="async-state async-state--error">
                  <Icon name="x-circle" className="icon--lg" />
                  <p className="async-state__title">Không tải được danh sách nhật ký</p>
                  <p className="async-state__desc">{logsErrorMessage}</p>
                  <button type="button" className="btn btn--outline btn--sm" onClick={() => loadLogs(season.id)}>
                    Thử lại
                  </button>
                </div>
              )}

              {logsView === 'data' && (
                <div className="log-list">
                  {logs.map((log) => (
                    <LogItem
                      key={log.id}
                      log={log}
                      isPlatformAdminMode={isPlatformAdmin}
                      canEdit={canEditLog}
                      canDelete={canDeleteLog}
                      onEdit={openEditLog}
                      onDelete={handleDeleteLog}
                    />
                  ))}
                </div>
              )}

              {logsView === 'empty' && (
                <div className="empty-state">
                  <Icon name="calendar" className="icon--lg" />
                  <p className="empty-state__title">Chưa có nhật ký nào</p>
                  <p className="empty-state__desc">Các hoạt động canh tác ghi nhận cho mùa vụ này sẽ hiển thị tại đây.</p>
                </div>
              )}
            </div>
          )}

          {tab === 'batches' && (
            <div className="tabs__panel" role="tabpanel">
              <div className="tab-panel-header">
                <div>
                  <h2 className="tab-panel-header__title">Danh sách lô hàng</h2>
                  <p className="tab-panel-header__meta">
                    Tổng số: <strong>{batches.length}</strong> lô hàng
                  </p>
                </div>
                {/* KHÔNG gate theo quyền — nút này ở bản gốc không có
                    data-requires-permission nào, chỉ ẩn hẳn với platform_admin
                    (bọc tay bên dưới), khớp CLAUDE.md gốc mục "Quản trị hệ
                    thống (platform_admin)". */}
                {!isPlatformAdmin && (
                  <button type="button" className="btn btn--primary btn--sm" onClick={openCreateBatch}>
                    <Icon name="plus" className="icon--sm" />
                    Thêm mới
                  </button>
                )}
              </div>

              {batchesView === 'loading' && (
                <div className="async-state">
                  <span className="spinner spinner--lg"></span>
                  <p className="async-state__title">Đang tải danh sách lô hàng...</p>
                </div>
              )}

              {batchesView === 'error' && (
                <div className="async-state async-state--error">
                  <Icon name="x-circle" className="icon--lg" />
                  <p className="async-state__title">Không tải được danh sách lô hàng</p>
                  <p className="async-state__desc">{batchesErrorMessage}</p>
                  <button type="button" className="btn btn--outline btn--sm" onClick={() => loadBatches(season.id)}>
                    Thử lại
                  </button>
                </div>
              )}

              {batchesView === 'data' && (
                <div className="grid grid--3">
                  {batches.map((batch) => (
                    <BatchCard key={batch.id} batch={batch} isPlatformAdminMode={isPlatformAdmin} onEdit={openEditBatch} onDelete={handleDeleteBatch} />
                  ))}
                </div>
              )}

              {batchesView === 'empty' && (
                <div className="empty-state">
                  <Icon name="box" className="icon--lg" />
                  <p className="empty-state__title">Chưa có lô hàng</p>
                  <p className="empty-state__desc">Các lô hàng thu hoạch từ mùa vụ này sẽ hiển thị tại đây.</p>
                </div>
              )}
            </div>
          )}

          {tab === 'process' && (
            <div className="tabs__panel" role="tabpanel">
              {!season.workflow_steps ? (
                // Chưa áp dụng quy trình nào — khớp #process-empty gốc.
                <div className="empty-state">
                  <Icon name="workflow" className="icon--lg" />
                  <p className="empty-state__title">Chưa Áp Dụng Quy Trình Cho Mùa Vụ</p>
                  <p className="empty-state__desc">
                    Mùa vụ này hiện tại đang sử dụng chế độ ghi nhật ký tự do. Bạn có thể chọn một trong các Mẫu Quy Trình đã thiết
                    kế sẵn dưới đây để bắt đầu kiểm soát sản xuất.
                  </p>

                  {/* platform_admin: ẩn hẳn khối áp dụng mẫu — khớp
                      CLAUDE.md gốc mục "Quản trị hệ thống (platform_admin)". */}
                  {!isPlatformAdmin && (
                    <>
                      <div className="process-apply">
                        <select className="select" value={selectedTemplateId} onChange={(e) => setSelectedTemplateId(e.target.value)}>
                          <option value="">Chọn mẫu quy trình áp dụng</option>
                          {workflowTemplates.map((template) => (
                            <option key={template.id} value={template.id}>
                              {template.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="btn btn--primary"
                          disabled={!selectedTemplateId || applyingTemplate}
                          onClick={applyWorkflowTemplate}
                        >
                          Áp dụng
                        </button>
                      </div>
                      <p className="process-apply__hint">
                        Hoặc bạn có thể tự thiết lập nhanh quy trình bằng cách bấm{' '}
                        <button type="button" className="link-button" onClick={createEmptyWorkflow}>
                          Tạo quy trình rỗng
                        </button>{' '}
                        để tự thêm từng bước.
                      </p>
                    </>
                  )}
                </div>
              ) : (
                // Đã áp dụng — hiện checklist các bước, khớp [data-process-detail] gốc.
                <div>
                  <div className="process-detail__header">
                    <h2 className="process-detail__title">Checklist Quy Trình: {season.workflow_template_name || 'Quy trình tự tạo'}</h2>
                    {!isPlatformAdmin && (
                      <button type="button" className="btn btn--outline btn--sm" onClick={() => stepEditorModal.open()}>
                        <Icon name="pencil" className="icon--sm" />
                        Tuỳ biến bước quy trình
                      </button>
                    )}
                  </div>

                  {processRetryNotice && (
                    <div className="notice notice--danger" style={{ marginBottom: 'var(--space-4)' }}>
                      <Icon name="x-circle" className="icon--sm" />
                      <span>
                        Đã ghi nhật ký nhưng CHƯA cập nhật được trạng thái bước quy trình — {processRetryNotice.message}
                      </span>
                      <button
                        type="button"
                        className="btn btn--outline btn--sm"
                        onClick={() => completeWorkflowStep(processRetryNotice.stepId, processRetryNotice.logId)}
                      >
                        Thử lại cập nhật trạng thái bước
                      </button>
                    </div>
                  )}

                  <div>
                    {season.workflow_steps.length === 0 ? (
                      <p className="workflow-checklist__empty">Quy trình này chưa có bước nào — bấm &quot;Tuỳ biến bước quy trình&quot; để thêm.</p>
                    ) : (
                      (() => {
                        const currentId = currentActionableStepId(season.workflow_steps);
                        return season.workflow_steps.map((step, index) => (
                          <ProcessStepViewCard
                            key={step.id ?? index}
                            step={step}
                            index={index}
                            isCurrent={!!step.id && step.id === currentId}
                            isPlatformAdminMode={isPlatformAdmin}
                            onStartCompletion={startStepCompletion}
                          />
                        ));
                      })()
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal__footer">
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            Đóng
          </button>
        </div>
      </dialog>

      <LogFormModal
        dialogRef={logModal.ref}
        mode={logModalMode}
        log={editingLog}
        seasonId={season.id}
        supplies={supplies}
        prefillActivityType={logPrefill?.activityType}
        prefillDescription={logPrefill?.description}
        completingStepId={completingStepId}
        openToken={logModal.openCount}
        onClose={closeLogModal}
        onSaved={(savedLog) => {
          // Chụp lại TRƯỚC — closeLogModal() (đã chạy bên trong LogFormModal
          // trước khi gọi onSaved) đã lên lịch xoá completingStepId, nhưng
          // biến đọc qua closure ở đây vẫn giữ đúng giá trị tại thời điểm
          // render này, khớp cách bản gốc chụp `stepToComplete` TRƯỚC khi gọi
          // closeSeasonLogModal().
          const stepToComplete = completingStepId;
          loadLogs(season.id);
          if (stepToComplete) completeWorkflowStep(stepToComplete, savedLog.id);
        }}
      />

      <BatchFormModal
        dialogRef={batchModal.ref}
        mode={batchModalMode}
        batch={editingBatch}
        seasonId={season.id}
        seasonCode={season.code}
        suggestedCode={suggestedBatchCode()}
        existingBatches={batches}
        openToken={batchModal.openCount}
        onClose={closeBatchModal}
        onSaved={(savedBatch) => {
          const stepForQr = pendingQrStepId;
          loadBatches(season.id);
          if (stepForQr) linkBatchToStep(stepForQr, savedBatch.id);
        }}
      />

      <ProcessStepEditorModal
        dialogRef={stepEditorModal.ref}
        seasonId={season.id}
        steps={season.workflow_steps || []}
        supplies={supplies}
        openToken={stepEditorModal.openCount}
        onClose={stepEditorModal.close}
        onSaved={onSeasonUpdated}
      />
    </>
  );
}

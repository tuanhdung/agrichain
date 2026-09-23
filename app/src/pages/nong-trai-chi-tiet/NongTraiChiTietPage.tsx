// Port nong-trai-chi-tiet.html + js/nong-trai-chi-tiet.js — trang chi tiết 1
// nông trại, đọc mã qua query string ?ma= (business, org-scoped, qua
// api.farms.list({q})) HOẶC ?id= (platform_admin, xem nút "Xem chi tiết" ở
// FarmCard.tsx của /nong-trai — GET /farms/{id} là route public-read, không
// lọc theo Đơn vị, vì mã nông trại có thể TRÙNG giữa các Đơn vị khác nhau).
//
// Migrate theo 5 BƯỚC — CẢ 5 BƯỚC đã code xong (Thông tin, Chứng nhận, Lịch
// sử mùa vụ + Timeline, Lô hàng, Quy trình mùa vụ — modal "Xem chi tiết mùa
// vụ" trong SeasonViewModal.tsx đủ cả 4 tab con) — xem app/CLAUDE.md mục
// "Trang /nong-trai-chi-tiet" để biết đầy đủ lý do trang gốc chỉ có ĐÚNG 3
// tab ở CẤP TRANG (4 tab con nằm trong modal, 1 tầng lồng sâu hơn).
// ⚠️ CHƯA được xác nhận qua checklist test tay riêng (rủi ro cao nhất toàn
// trang, người dùng sẽ test kỹ trước khi coi trang này là hoàn tất/migrate
// xong) — KHÔNG tự ý coi đây là trang thứ 9 đã migrate cho tới khi có xác
// nhận đó.
import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Icon } from '../../icons';
import { api, ApiError } from '../../api';
import type { Certification, CertificationSystemRow, Farm, Season, SeasonSystemRow, Supply } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { usePermission } from '../../hooks/usePermission';
import { useDialog } from '../../hooks/useDialog';
import { useToast } from '../../components/ToastProvider';
import { useConfirm } from '../../components/ConfirmDialogProvider';
import { FarmDetailMap } from './FarmDetailMap';
import { CertificationCard } from './CertificationCard';
import { CertificationFormModal, type CertModalMode } from './CertificationFormModal';
import { SeasonCard } from './SeasonCard';
import { SeasonFormModal, type SeasonModalMode } from './SeasonFormModal';
import { SeasonViewModal } from './SeasonViewModal';
import { fetchAllSystemPages } from './systemPaging';
import { formatDate, formatArea } from './format';
import './view-detail.css';

type ViewState = 'loading' | 'not-found' | 'data';
type FarmTab = 'info' | 'certifications' | 'seasons';

type CertsView = 'loading' | 'data' | 'empty' | 'error';
type SeasonsView = 'loading' | 'data' | 'empty' | 'error';

export function NongTraiChiTietPage() {
  const { isPlatformAdmin } = useAuth();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const canAddCert = usePermission('certifications.add');
  const canEditCert = usePermission('certifications.edit');
  const canDeleteCert = usePermission('certifications.delete');
  const canAddSeason = usePermission('seasons.add');
  const canEditSeason = usePermission('seasons.edit');
  const canDeleteSeason = usePermission('seasons.delete');

  const [searchParams] = useSearchParams();
  const idParam = searchParams.get('id');
  const maParam = searchParams.get('ma') || '';

  const [view, setView] = useState<ViewState>('loading');
  const [notFoundTitle, setNotFoundTitle] = useState('Không tìm thấy nông trại');
  const [farm, setFarm] = useState<Farm | null>(null);
  const [tab, setTab] = useState<FarmTab>('info');

  // --- Chứng nhận nông trại (tab "Chứng nhận nông trại") -------------------
  const [certs, setCerts] = useState<(Certification | CertificationSystemRow)[]>([]);
  const [certsTotal, setCertsTotal] = useState(0);
  const [certsView, setCertsView] = useState<CertsView>('loading');
  const [certsErrorMessage, setCertsErrorMessage] = useState('');

  const certModal = useDialog<HTMLDialogElement>();
  const [certModalMode, setCertModalMode] = useState<CertModalMode>('create');
  const [editingCert, setEditingCert] = useState<Certification | null>(null);

  // Nạp chứng nhận ngay khi nông trại tải xong, KHÔNG chờ người dùng bấm vào
  // tab — khớp showFarm() gốc gọi renderCertifications() ngay sau khi có dữ
  // liệu nông trại, để số "Tổng số" trên tiêu đề tab luôn đúng kể cả trước
  // khi người dùng từng bấm vào tab đó.
  const loadCertifications = useCallback(() => {
    if (!farm) return;
    setCertsView('loading');
    const farmId = farm.id;

    // platform_admin: GET /certifications org-scoped 403 với dữ liệu Đơn vị
    // khác — đọc GET /system/certifications (nhìn xuyên mọi Đơn vị) rồi tự
    // lọc lại theo farm_id ở client, vì route đó không có tham số lọc này.
    const request = isPlatformAdmin
      ? fetchAllSystemPages(api.system.certifications.list).then((items) => {
          const filtered = items.filter((item) => item.farm_id === farmId);
          return { items: filtered, total: filtered.length };
        })
      : api.certifications.list({ farm_id: farmId, page_size: 100 });

    request
      .then((data) => {
        const items = data.items || [];
        setCerts(items);
        setCertsTotal(data.total || items.length);
        setCertsView(items.length ? 'data' : 'empty');
      })
      .catch((err: unknown) => {
        setCertsErrorMessage(err instanceof ApiError ? err.message : 'Có lỗi xảy ra, vui lòng thử lại.');
        setCertsView('error');
      });
  }, [farm, isPlatformAdmin]);

  useEffect(() => {
    loadCertifications();
  }, [loadCertifications]);

  function openCreateCert() {
    setCertModalMode('create');
    setEditingCert(null);
    certModal.open();
  }

  function openEditCert(cert: Certification) {
    setCertModalMode('edit');
    setEditingCert(cert);
    certModal.open();
  }

  // Tải chi tiết (kèm nội dung tệp) rồi mở tab mới — khớp openCertFile() gốc.
  function openCertFile(certId: string) {
    api.certifications
      .get(certId)
      .then((detail) => {
        if (!detail.file_url) {
          showToast('Chứng nhận này chưa có tệp đính kèm.');
          return;
        }
        window.open(detail.file_url, '_blank', 'noopener');
      })
      .catch((err: unknown) => {
        showToast(err instanceof ApiError ? err.message : 'Có lỗi xảy ra, vui lòng thử lại.');
      });
  }

  async function handleDeleteCert(cert: Certification) {
    const confirmed = await confirm(`Xoá chứng nhận "${cert.name}"? Hành động này không thể hoàn tác.`);
    if (!confirmed) return;
    try {
      await api.certifications.remove(cert.id);
      loadCertifications();
      showToast('Đã xoá chứng nhận.');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Có lỗi xảy ra, vui lòng thử lại.');
    }
  }

  // --- Lịch sử mùa vụ (tab "Lịch sử mùa vụ") --------------------------------
  const [seasons, setSeasons] = useState<(Season | SeasonSystemRow)[]>([]);
  const [seasonsTotal, setSeasonsTotal] = useState(0);
  const [seasonsView, setSeasonsView] = useState<SeasonsView>('loading');
  const [seasonsErrorMessage, setSeasonsErrorMessage] = useState('');

  const seasonModal = useDialog<HTMLDialogElement>();
  const [seasonModalMode, setSeasonModalMode] = useState<SeasonModalMode>('create');
  const [editingSeason, setEditingSeason] = useState<Season | null>(null);

  const seasonViewModal = useDialog<HTMLDialogElement>();
  const [viewedSeason, setViewedSeason] = useState<Season | null>(null);

  // Mọi thao tác ở tab "Quy trình mùa vụ" (SeasonViewModal.tsx, Bước 5) PATCH
  // /seasons/{id} rồi cần cập nhật lại season đang xem — khớp
  // `currentViewedSeason = updated` gốc (biến module-scope, không có state
  // React nào để "sở hữu" nó ngoài đây).
  function handleSeasonUpdated(updated: Season) {
    setViewedSeason(updated);
  }

  // Vật tư dùng cho dropdown trong form nhật ký (tab "Timeline mùa vụ" của
  // modal xem mùa vụ) — tải 1 lần lúc trang khởi động, KHÔNG tải lại mỗi lần
  // mở modal (danh sách vật tư hiếm khi đổi trong 1 phiên làm việc), khớp
  // loadSupplyOptions() gốc. platform_admin bỏ qua (GET /supplies đòi quyền
  // supplies.view mà platform_admin không có, form nhật ký cũng ẩn hẳn với
  // chế độ này — xem Bước 5).
  const [availableSupplies, setAvailableSupplies] = useState<Supply[]>([]);

  useEffect(() => {
    if (isPlatformAdmin) return;
    api.supplies
      .list({ page_size: 100 })
      .then((data) => setAvailableSupplies(data.items || []))
      .catch((err: unknown) => {
        showToast(`Không tải được danh sách vật tư: ${err instanceof ApiError ? err.message : 'Có lỗi xảy ra.'}`);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ chạy lại theo isPlatformAdmin, không phải mỗi lần showToast đổi tham chiếu
  }, [isPlatformAdmin]);

  const loadSeasons = useCallback(() => {
    if (!farm) return;
    setSeasonsView('loading');
    const farmId = farm.id;

    // platform_admin: cùng lý do loadCertifications() ở trên — GET /seasons
    // org-scoped 403 với dữ liệu Đơn vị khác, đọc GET /system/seasons rồi tự
    // lọc lại theo farm_id ở client.
    const request = isPlatformAdmin
      ? fetchAllSystemPages(api.system.seasons.list).then((items) => {
          const filtered = items.filter((item) => item.farm_id === farmId);
          return { items: filtered, total: filtered.length };
        })
      : api.seasons.list({ farm_id: farmId, page_size: 100 });

    request
      .then((data) => {
        const items = data.items || [];
        setSeasons(items);
        setSeasonsTotal(data.total || items.length);
        setSeasonsView(items.length ? 'data' : 'empty');
      })
      .catch((err: unknown) => {
        setSeasonsErrorMessage(err instanceof ApiError ? err.message : 'Có lỗi xảy ra, vui lòng thử lại.');
        setSeasonsView('error');
      });
  }, [farm, isPlatformAdmin]);

  useEffect(() => {
    loadSeasons();
  }, [loadSeasons]);

  // Gợi ý mã mùa vụ tiếp theo của CHÍNH nông trại đang xem — MV01, MV02...
  // chỉ là gợi ý, backend tự kiểm tra trùng mã thật, khớp suggestSeasonCode() gốc.
  function suggestedSeasonCode(): string {
    const seq = String(seasonsTotal + 1);
    return `MV${seq.length < 2 ? `0${seq}` : seq}`;
  }

  function openCreateSeason() {
    setSeasonModalMode('create');
    setEditingSeason(null);
    seasonModal.open();
  }

  function openEditSeason(season: Season) {
    setSeasonModalMode('edit');
    setEditingSeason(season);
    seasonModal.open();
  }

  function openViewSeason(season: Season) {
    setViewedSeason(season);
    seasonViewModal.open();
  }

  async function handleDeleteSeason(season: Season) {
    const confirmed = await confirm(`Xoá mùa vụ "${season.name}"? Hành động này không thể hoàn tác.`);
    if (!confirmed) return;
    try {
      // Backend chặn (409) nếu mùa vụ đã có nhật ký hoạt động — hiện đúng lỗi
      // đó, không giả vờ đã xoá thành công, khớp deleteSeason() gốc.
      await api.seasons.remove(season.id);
      loadSeasons();
      showToast('Đã xoá mùa vụ.');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Có lỗi xảy ra, vui lòng thử lại.');
    }
  }

  useEffect(() => {
    setView('loading');
    setFarm(null);
    setTab('info');
    // Dọn dữ liệu chứng nhận/mùa vụ của nông trại CŨ ngay lúc bắt đầu đổi
    // ?ma=/?id= — tránh loadCertifications()/loadSeasons() (chỉ chạy lại khi
    // `farm` đổi SANG bản ghi mới, effect riêng bên trên) hiện nhầm dữ liệu
    // cũ trong lúc chờ nông trại mới tải xong.
    setCerts([]);
    setCertsTotal(0);
    setCertsView('loading');
    setSeasons([]);
    setSeasonsTotal(0);
    setSeasonsView('loading');

    // platform_admin mở qua ?id=<UUID thật> (nút "Xem chi tiết" ở
    // FarmCard.tsx) — GET /farms/{id} public-read, không lọc theo Đơn vị,
    // khớp loadFarmById() gốc. Luồng business giữ ?ma=<mã>, org-scoped.
    if (idParam) {
      api.farms
        .get(idParam)
        .then((data) => {
          setFarm(data);
          setView('data');
        })
        .catch(() => {
          setNotFoundTitle('Không tìm thấy nông trại với ID đã cho.');
          setView('not-found');
        });
      return;
    }

    // GET /farms không có endpoint "tìm theo code", chỉ có `q` (tìm kiếm tự
    // do) — tải kèm lọc gần đúng rồi tự so khớp CHÍNH XÁC (không phân biệt
    // hoa/thường) ở client, khớp loadFarmByCode() gốc.
    api.farms
      .list({ q: maParam, page_size: 100 })
      .then((data) => {
        const found = (data.items || []).find((item) => item.code.toLowerCase() === maParam.trim().toLowerCase());
        if (!found) {
          setNotFoundTitle(`Không tìm thấy nông trại có mã "${maParam}"`);
          setView('not-found');
          return;
        }
        setFarm(found);
        setView('data');
      })
      .catch((err: unknown) => {
        setNotFoundTitle(`Không tải được thông tin nông trại: ${err instanceof ApiError ? err.message : 'Có lỗi xảy ra.'}`);
        setView('not-found');
      });
  }, [idParam, maParam]);

  return (
    <>
      <nav className="breadcrumb" aria-label="Đường dẫn">
        <Link className="breadcrumb__link" to="/nong-trai">
          <Icon name="chart-bar" className="icon--sm" />
          Vận hành
        </Link>
        <span className="breadcrumb__sep" aria-hidden="true">
          /
        </span>
        <Link className="breadcrumb__link" to="/nong-trai">
          Nông trại
        </Link>
        <span className="breadcrumb__sep" aria-hidden="true">
          /
        </span>
        <span className="breadcrumb__current" aria-current="page">
          {view === 'data' && farm ? farm.name : 'Không tìm thấy'}
        </span>
      </nav>

      {view === 'loading' && (
        <div className="async-state">
          <span className="spinner spinner--lg"></span>
          <p className="async-state__title">Đang tải thông tin nông trại...</p>
        </div>
      )}

      {view === 'not-found' && (
        <div className="empty-state">
          <Icon name="seedling" className="icon--lg" />
          <p className="empty-state__title">{notFoundTitle}</p>
          <p className="empty-state__desc">Nông trại này có thể đã bị xoá, hoặc đường dẫn không đúng.</p>
          <Link className="btn btn--primary" to="/nong-trai">
            Quay lại danh sách nông trại
          </Link>
        </div>
      )}

      {view === 'data' && farm && (
        <div>
          <div className="page-header">
            <div className="page-header__icon">
              <Icon name="seedling" className="icon--lg" />
            </div>
            <div className="page-header__text">
              <h1 className="page-header__title">{farm.name}</h1>
              <p className="page-header__meta">
                Mã: <strong>{farm.code}</strong>
              </p>
            </div>
          </div>

          <FarmDetailMap farm={farm} />

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
              className={`tabs__tab${tab === 'certifications' ? ' is-active' : ''}`}
              role="tab"
              aria-selected={tab === 'certifications'}
              onClick={() => setTab('certifications')}
            >
              <Icon name="qr-code" className="icon--sm" />
              Chứng nhận nông trại
            </button>
            <button
              type="button"
              className={`tabs__tab${tab === 'seasons' ? ' is-active' : ''}`}
              role="tab"
              aria-selected={tab === 'seasons'}
              onClick={() => setTab('seasons')}
            >
              <Icon name="seedling" className="icon--sm" />
              Lịch sử mùa vụ
            </button>
          </div>

          {tab === 'info' && (
            <div className="tabs__panel" role="tabpanel">
              <div className="form-grid">
                <div className="view-field">
                  <span className="label">Diện tích</span>
                  <span>{formatArea(farm.area)}</span>
                </div>
                <div className="view-field">
                  <span className="label">Địa chỉ</span>
                  <span>{farm.address || '—'}</span>
                </div>
                <div className="view-field">
                  <span className="label">Phường/Xã</span>
                  <span>{farm.ward || '—'}</span>
                </div>
                <div className="view-field">
                  <span className="label">Tỉnh/Thành phố</span>
                  <span>{farm.province || '—'}</span>
                </div>
                <div className="view-field">
                  <span className="label">Ngày bắt đầu</span>
                  <span>{formatDate(farm.start_date)}</span>
                </div>
                <div className="view-field">
                  <span className="label">Mã vùng trồng quốc gia</span>
                  <span>{farm.national_puc || '—'}</span>
                </div>
                <div className="view-field">
                  <span className="label">Mã vùng trồng quốc tế</span>
                  <span>{farm.international_puc || '—'}</span>
                </div>
                <div className="view-field form-grid__full">
                  <span className="label">Mô tả</span>
                  <span>{farm.description || '—'}</span>
                </div>
              </div>
            </div>
          )}

          {tab === 'certifications' && (
            <div className="tabs__panel" role="tabpanel">
              <div className="tab-panel-header">
                <div>
                  <h2 className="tab-panel-header__title">Danh sách chứng nhận</h2>
                  <p className="tab-panel-header__meta">
                    Tổng số: <strong>{certsTotal}</strong> chứng nhận nông trại
                  </p>
                </div>
                {canAddCert && (
                  <button type="button" className="btn btn--primary btn--sm" onClick={openCreateCert}>
                    <Icon name="plus" className="icon--sm" />
                    Thêm mới
                  </button>
                )}
              </div>

              {certsView === 'loading' && (
                <div className="async-state">
                  <span className="spinner spinner--lg"></span>
                  <p className="async-state__title">Đang tải danh sách chứng nhận...</p>
                </div>
              )}

              {certsView === 'error' && (
                <div className="async-state async-state--error">
                  <Icon name="x-circle" className="icon--lg" />
                  <p className="async-state__title">Không tải được danh sách chứng nhận</p>
                  <p className="async-state__desc">{certsErrorMessage}</p>
                  <button type="button" className="btn btn--outline btn--sm" onClick={loadCertifications}>
                    Thử lại
                  </button>
                </div>
              )}

              {certsView === 'data' && (
                <div className="grid grid--3">
                  {certs.map((cert) => (
                    <CertificationCard
                      key={cert.id}
                      cert={cert}
                      isPlatformAdminMode={isPlatformAdmin}
                      canEdit={canEditCert}
                      canDelete={canDeleteCert}
                      onOpenEdit={openEditCert}
                      onOpenDelete={handleDeleteCert}
                      onOpenFile={openCertFile}
                    />
                  ))}
                </div>
              )}

              {certsView === 'empty' && (
                <div className="empty-state">
                  <Icon name="qr-code" className="icon--lg" />
                  <p className="empty-state__title">Chưa có chứng nhận nào</p>
                  <p className="empty-state__desc">Các chứng nhận (VietGAP, hữu cơ...) của nông trại này sẽ hiển thị tại đây.</p>
                </div>
              )}
            </div>
          )}

          {tab === 'seasons' && (
            <div className="tabs__panel" role="tabpanel">
              <div className="tab-panel-header">
                <div>
                  <h2 className="tab-panel-header__title">Lịch sử mùa vụ</h2>
                  <p className="tab-panel-header__meta">
                    Tổng số: <strong>{seasonsTotal}</strong> mùa vụ
                  </p>
                </div>
                {canAddSeason && (
                  <button type="button" className="btn btn--primary btn--sm" onClick={openCreateSeason}>
                    <Icon name="plus" className="icon--sm" />
                    Thêm mới
                  </button>
                )}
              </div>

              {seasonsView === 'loading' && (
                <div className="async-state">
                  <span className="spinner spinner--lg"></span>
                  <p className="async-state__title">Đang tải danh sách mùa vụ...</p>
                </div>
              )}

              {seasonsView === 'error' && (
                <div className="async-state async-state--error">
                  <Icon name="x-circle" className="icon--lg" />
                  <p className="async-state__title">Không tải được danh sách mùa vụ</p>
                  <p className="async-state__desc">{seasonsErrorMessage}</p>
                  <button type="button" className="btn btn--outline btn--sm" onClick={loadSeasons}>
                    Thử lại
                  </button>
                </div>
              )}

              {seasonsView === 'data' && (
                <div className="grid grid--3">
                  {seasons.map((season) => (
                    <SeasonCard
                      key={season.id}
                      season={season}
                      canEdit={canEditSeason}
                      canDelete={canDeleteSeason}
                      onView={openViewSeason}
                      onEdit={openEditSeason}
                      onDelete={handleDeleteSeason}
                    />
                  ))}
                </div>
              )}

              {seasonsView === 'empty' && (
                <div className="empty-state">
                  <Icon name="seedling" className="icon--lg" />
                  <p className="empty-state__title">Chưa có lịch sử mùa vụ</p>
                  <p className="empty-state__desc">Các mùa vụ đã ghi nhận cho nông trại này sẽ hiển thị tại đây.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {view === 'data' && farm && (
        <>
          <CertificationFormModal
            dialogRef={certModal.ref}
            mode={certModalMode}
            cert={editingCert}
            farmId={farm.id}
            openToken={certModal.openCount}
            onClose={certModal.close}
            onSaved={loadCertifications}
          />

          <SeasonFormModal
            dialogRef={seasonModal.ref}
            mode={seasonModalMode}
            season={editingSeason}
            farmId={farm.id}
            suggestedCode={suggestedSeasonCode()}
            openToken={seasonModal.openCount}
            onClose={seasonModal.close}
            onSaved={loadSeasons}
          />

          <SeasonViewModal
            dialogRef={seasonViewModal.ref}
            season={viewedSeason}
            farmCode={farm.code}
            supplies={availableSupplies}
            openToken={seasonViewModal.openCount}
            onClose={seasonViewModal.close}
            onSeasonUpdated={handleSeasonUpdated}
          />
        </>
      )}
    </>
  );
}

// Port ĐÚNG ho-so.html + js/ho-so.js — trang thứ 6 migrate, đơn giản hơn hẳn
// các trang trước (self-service, không CRUD người khác, không RBAC). Đọc
// dữ liệu ban đầu THẲNG từ AuthContext (user đã có sẵn từ lúc đăng nhập/lúc
// /auth/me chạy) — KHÔNG gọi API riêng để load, khớp renderProfile() gốc
// đọc api.getUser().
//
// Trang ĐẦU TIÊN trong app/ dùng tabs (.tabs/.tabs__tab/.tabs__panel) —
// setupTabs() của js/app-shell.js gốc CHƯA có bản port dùng chung nào (ghi
// nhận sẵn trong app/CLAUDE.md mục "Nợ kỹ thuật": "port khi trang sau cần,
// đừng port khống trước") — chỉ 2 tab cố định, tự quản lý bằng 1 state cục
// bộ thay vì dựng hook/component tabs dùng chung (chưa có trang thứ 2 nào
// cần tới để đáng tách).
import { useState } from 'react';
import { Icon } from '../../icons';
import { useAuth } from '../../context/AuthContext';
import { ProfileInfoForm } from './ProfileInfoForm';
import { SecurityForm } from './SecurityForm';
import { initials } from './format';
import './profile-card.css';

type TabKey = 'info' | 'security';

export function HoSoPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('info');

  const displayName = user?.full_name || user?.email || '';

  return (
    <>
      <nav className="breadcrumb" aria-label="Đường dẫn">
        <span className="breadcrumb__current" aria-current="page">
          Hồ sơ
        </span>
      </nav>

      <div className="profile-layout">
        {/* Thông tin tóm tắt */}
        <div className="card profile-card">
          <div className="profile-card__avatar">
            <span className="avatar">{initials(displayName)}</span>
          </div>
          <h1 className="profile-card__name">{displayName}</h1>
          <p className="profile-card__email">@{user?.email}</p>
          {/* role_name đọc THẲNG từ UserOut thật (VD "Quản trị viên", "Nông
              dân") — không tự tính/suy đoán, khớp bản gốc. */}
          <span className="badge badge--info">{user?.role_name || 'Người dùng'}</span>

          <hr className="profile-card__divider" />

          <div className="profile-card__row">
            <Icon name="mail" className="icon--sm" />
            <span>{user?.email}</span>
          </div>
          {user?.phone && (
            <div className="profile-card__row">
              <Icon name="phone" className="icon--sm" />
              <span>{user.phone}</span>
            </div>
          )}
        </div>

        {/* Chỉnh sửa */}
        <div className="card">
          <div className="tabs" role="tablist">
            <button
              type="button"
              className={`tabs__tab${activeTab === 'info' ? ' is-active' : ''}`}
              role="tab"
              aria-selected={activeTab === 'info'}
              onClick={() => setActiveTab('info')}
            >
              <Icon name="user" className="icon--sm" />
              Thông tin cá nhân
            </button>
            <button
              type="button"
              className={`tabs__tab${activeTab === 'security' ? ' is-active' : ''}`}
              role="tab"
              aria-selected={activeTab === 'security'}
              onClick={() => setActiveTab('security')}
            >
              <Icon name="shield-check" className="icon--sm" />
              Bảo mật
            </button>
          </div>

          <div className="tabs__panel" role="tabpanel" hidden={activeTab !== 'info'}>
            <ProfileInfoForm />
          </div>

          <div className="tabs__panel" role="tabpanel" hidden={activeTab !== 'security'}>
            <SecurityForm />
          </div>
        </div>
      </div>
    </>
  );
}

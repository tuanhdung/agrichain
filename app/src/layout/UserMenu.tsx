// Port setupUserMenu() (js/app-shell.js gốc) — mở/đóng .user-menu__panel,
// đóng khi bấm ra ngoài/Esc/bấm lại avatar. 3 mục: Hồ sơ (route THẬT /ho-so,
// đã migrate 2026-09-23 — xem app/CLAUDE.md mục "Trang /ho-so"), Về trang
// giới thiệu (index.html, site tĩnh), Đăng xuất.
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../icons';
import { useAuth } from '../context/AuthContext';
import { mainSiteUrl } from '../api/config';

export function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    function onClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        toggleRef.current?.focus();
      }
    }
    document.addEventListener('click', onClickOutside);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('click', onClickOutside);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const name = user?.full_name || user?.email || '';
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');

  return (
    <div className="user-menu" ref={menuRef}>
      <button
        type="button"
        className="user-menu__toggle"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Menu tài khoản"
        ref={toggleRef}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((prev) => !prev);
        }}
      >
        <span className="app-topbar__user" aria-hidden="true">
          {initials || '?'}
        </span>
      </button>
      <div className="user-menu__panel" hidden={!open}>
        <p className="user-menu__greeting">
          Xin chào, <strong>{name}</strong>
        </p>
        <Link className="user-menu__item" to="/ho-so" onClick={() => setOpen(false)}>
          <Icon name="user" className="icon--sm" />
          Hồ sơ
        </Link>
        <a className="user-menu__item" href={mainSiteUrl('index.html')}>
          <Icon name="corner-up-left" className="icon--sm" />
          Về trang giới thiệu
        </a>
        <button type="button" className="user-menu__item user-menu__item--danger" onClick={() => logout()}>
          <Icon name="log-out" className="icon--sm" />
          Đăng xuất
        </button>
      </div>
    </div>
  );
}

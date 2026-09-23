// Dùng lại ĐÚNG icons/sprite.svg gốc của dự án (không copy) — import kèm hậu
// tố `?url` để Vite coi đây là asset tĩnh: dev thì đọc thẳng từ đĩa (cần
// server.fs.allow trỏ ra ngoài app/, xem vite.config.ts), build thì Vite tự
// copy file vào dist/assets kèm hash, KHÔNG cần publicDir/copy tay — xem
// app/CLAUDE.md mục "Icon sprite".
import spriteUrl from '../../icons/sprite.svg?url';
import brandMarkUrl from '../../icons/exabyte-icon-only-transparent.png?url';

export const SPRITE_URL = spriteUrl;

// Cùng cơ chế `?url` như sprite ở trên — logo công ty (app-topbar__brand-mark)
// PHẢI bundle qua Vite chứ không được để đường dẫn tương đối trỏ sang site
// tĩnh: 2 domain khác origin nhau (xem app/CLAUDE.md mục "Giả định host"),
// 1 ảnh tĩnh không nên phụ thuộc site kia còn sống hay không chỉ để hiện logo.
export const BRAND_MARK_URL = brandMarkUrl;

type IconProps = {
  /** Tên icon trong sprite, KHÔNG kèm tiền tố "icon-" (vd "box", "pencil"). */
  name: string;
  /** Thêm class ngoài "icon" — vd "icon--sm", "icon--lg" (xem components.css). */
  className?: string;
  'aria-hidden'?: boolean;
};

/** Tương đương <svg class="icon ..."><use href="icons/sprite.svg#icon-x"></use></svg>
 *  ở các trang .html cũ — dùng lại ĐÚNG class "icon"/"icon--sm"/"icon--lg" của
 *  components.css, không tự ý thêm style riêng. */
export function Icon({ name, className, ...rest }: IconProps) {
  return (
    <svg className={className ? `icon ${className}` : 'icon'} aria-hidden={rest['aria-hidden'] ?? true}>
      <use href={`${SPRITE_URL}#icon-${name}`} />
    </svg>
  );
}

// Test cho js/agriverse-cart.js (giỏ hàng DÙNG CHUNG của các trang AgriVerse, site tĩnh không có build step) và
// js/agriverse-wholesale.js (hộp thoại "Tính Sỉ"). 2 file là IIFE gắn vào window.AgriChain, nên nạp lại bằng cách
// đọc mã nguồn rồi eval trong jsdom — mỗi test nạp mới để trạng thái trong closure không rò sang test khác.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const JS_DIR = resolve(__dirname, '../../../js');
const CART_SRC = readFileSync(resolve(JS_DIR, 'agriverse-cart.js'), 'utf-8');
const WHOLESALE_SRC = readFileSync(resolve(JS_DIR, 'agriverse-wholesale.js'), 'utf-8');

interface CartItem { id: string; name: string; price: number; wholesale: number | null; moq: number; stock: number | null; img: string; qty: number; selected: boolean }
interface CartApi {
  items(): CartItem[];
  add(p: Record<string, unknown>, qty?: number): { ok: boolean; limited: boolean };
  setQty(id: string, qty: number): void;
  remove(id: string): void;
  removeMany(ids: string[]): void;
  toggle(id: string): void;
  unitPrice(i: CartItem): number;
  totals(): { lines: number; quantity: number; selectedLines: number; subtotal: number; shipping: number; total: number };
  init(): Promise<void>;
  clearLocal(): void;
}

const serverRow = (id: string, quantity: number, extra: Record<string, unknown> = {}) => ({
  product_id: id, quantity, selected: true, name: 'SP ' + id, unit: 'Gói',
  retail_price: 100000, wholesale_price: null, moq: 1, stock: 50, thumbnail_url: '', ...extra
});

const apiMock = {
  loggedIn: false,
  cart: { get: vi.fn(), replace: vi.fn() }
};

// Mỗi lần nạp module lại gắn thêm listener lên cùng 1 window → ghi lại để gỡ sau mỗi test (tránh các lần nạp cũ vẫn bắn)
const attached: [string, EventListenerOrEventListenerObject][] = [];
for (const target of [window, document] as (Window | Document)[]) {
  const original = target.addEventListener.bind(target);
  target.addEventListener = ((type: string, listener: EventListenerOrEventListenerObject, opts?: unknown) => {
    attached.push([type, listener]);
    original(type, listener, opts as boolean);
  }) as typeof target.addEventListener;
}

function detachListeners() {
  for (const [type, listener] of attached.splice(0)) {
    window.removeEventListener(type, listener);
    document.removeEventListener(type, listener);
  }
}

function loadCart(): CartApi {
  const w = window as unknown as { AgriChain?: Record<string, unknown> };
  w.AgriChain = {
    api: {
      isLoggedIn: () => apiMock.loggedIn,
      getUser: () => (apiMock.loggedIn ? { id: 'u1' } : null),
      cart: apiMock.cart
    }
  };
  // eslint-disable-next-line no-new-func
  new Function(CART_SRC).call(window);
  return (w.AgriChain as { cart: CartApi }).cart;
}

beforeEach(() => {
  localStorage.clear();
  apiMock.loggedIn = false;
  apiMock.cart.get.mockReset();
  apiMock.cart.replace.mockReset();
  apiMock.cart.get.mockResolvedValue({ items: [] });
  apiMock.cart.replace.mockImplementation((items: { product_id: string; quantity: number }[]) =>
    Promise.resolve({ items: items.map((i) => serverRow(i.product_id, i.quantity)) })
  );
});

afterEach(() => {
  detachListeners();
  vi.useRealTimers();
});

const product = (over: Record<string, unknown> = {}) => ({ id: 'p1', name: 'Gạo', price: 100000, wholesale: 90000, moq: 10, stock: 50, img: '', ...over });

describe('giỏ hàng — thao tác cục bộ', () => {
  it('thêm cùng sản phẩm thì cộng dồn, không tạo dòng mới', () => {
    const cart = loadCart();
    cart.add(product());
    cart.add(product(), 2);
    expect(cart.items()).toHaveLength(1);
    expect(cart.items()[0].qty).toBe(3);
  });

  it('số lượng bị chặn ở tồn kho và báo limited', () => {
    const cart = loadCart();
    const result = cart.add(product({ stock: 3 }), 10);
    expect(cart.items()[0].qty).toBe(3);
    expect(result.limited).toBe(true);
  });

  it('thiếu id sản phẩm: không thêm', () => {
    const cart = loadCart();
    expect(cart.add({ name: 'x', price: 1 }).ok).toBe(false);
    expect(cart.items()).toHaveLength(0);
  });

  it('giá sỉ chỉ áp dụng khi số lượng đạt MOQ', () => {
    const cart = loadCart();
    cart.add(product(), 9);
    expect(cart.unitPrice(cart.items()[0])).toBe(100000);
    cart.setQty('p1', 10);
    expect(cart.unitPrice(cart.items()[0])).toBe(90000);
  });

  it('phí vận chuyển: 30.000đ dưới 500.000đ, miễn phí từ 500.000đ, 0 khi không chọn món nào', () => {
    const cart = loadCart();
    cart.add(product({ wholesale: null }), 4); // 400.000
    expect(cart.totals()).toMatchObject({ subtotal: 400000, shipping: 30000, total: 430000 });
    cart.setQty('p1', 5); // 500.000
    expect(cart.totals()).toMatchObject({ subtotal: 500000, shipping: 0, total: 500000 });
    cart.toggle('p1');
    expect(cart.totals()).toMatchObject({ subtotal: 0, shipping: 0, selectedLines: 0 });
  });

  it('lines đếm số loại sản phẩm, quantity đếm tổng số lượng', () => {
    const cart = loadCart();
    cart.add(product({ id: 'a' }), 5);
    cart.add(product({ id: 'b' }), 2);
    expect(cart.totals()).toMatchObject({ lines: 2, quantity: 7 });
  });

  it('setQty về 0 thì xoá dòng; removeMany chỉ xoá các món chỉ định', () => {
    const cart = loadCart();
    cart.add(product({ id: 'a' }));
    cart.add(product({ id: 'b' }));
    cart.add(product({ id: 'c' }));
    cart.setQty('a', 0);
    cart.removeMany(['b']);
    expect(cart.items().map((i) => i.id)).toEqual(['c']);
  });

  it('bỏ qua dòng giỏ cũ không có id sản phẩm khi đọc localStorage', () => {
    localStorage.setItem('agriverse:cart', JSON.stringify([{ name: 'cũ', price: 1, qty: 2 }, { id: 'ok', name: 'ok', price: 5, qty: 1 }]));
    const cart = loadCart();
    expect(cart.items().map((i) => i.id)).toEqual(['ok']);
  });
});

describe('giỏ hàng — đồng bộ máy chủ khi đã đăng nhập', () => {
  beforeEach(() => {
    apiMock.loggedIn = true;
  });

  it('thay đổi được đẩy lên sau 400ms (gộp nhiều thao tác) rồi xoá cờ dirty', async () => {
    vi.useFakeTimers();
    const cart = loadCart();
    cart.add(product({ wholesale: null }));
    cart.add(product({ wholesale: null }));
    expect(apiMock.cart.replace).not.toHaveBeenCalled();
    expect(localStorage.getItem('agriverse:cart:dirty')).toBe('1');

    await vi.advanceTimersByTimeAsync(400);

    expect(apiMock.cart.replace).toHaveBeenCalledTimes(1);
    expect(apiMock.cart.replace.mock.calls[0][0]).toEqual([{ product_id: 'p1', quantity: 2, selected: true }]);
    expect(localStorage.getItem('agriverse:cart:dirty')).toBeNull();
  });

  it('LỖI ĐÃ VÁ: rời trang trước khi kịp đẩy → trang sau KHÔNG ghi đè giỏ ở máy bằng giỏ máy chủ (đang rỗng)', async () => {
    // Trang A: thêm hàng rồi rời trang trong 400ms (không đẩy được) — cờ dirty + giỏ ở máy còn nguyên
    localStorage.setItem('agriverse:cart', JSON.stringify([{ id: 'p1', name: 'Gạo', price: 100000, qty: 5, selected: true }]));
    localStorage.setItem('agriverse:cart:merged:u1', '1');
    localStorage.setItem('agriverse:cart:dirty', '1');
    apiMock.cart.get.mockResolvedValue({ items: [] }); // máy chủ chưa biết gì về hàng vừa thêm

    // Trang B: tải lại
    const cart = loadCart();
    await cart.init();

    expect(apiMock.cart.replace).toHaveBeenCalledTimes(1); // đẩy giỏ ở máy lên TRƯỚC
    expect(cart.items().map((i) => [i.id, i.qty])).toEqual([['p1', 5]]);
  });

  it('không dirty + đã gộp: máy chủ là nguồn sự thật', async () => {
    localStorage.setItem('agriverse:cart', JSON.stringify([{ id: 'old', name: 'cũ', price: 1, qty: 1, selected: true }]));
    localStorage.setItem('agriverse:cart:merged:u1', '1');
    apiMock.cart.get.mockResolvedValue({ items: [serverRow('srv', 3)] });

    const cart = loadCart();
    await cart.init();

    expect(cart.items().map((i) => [i.id, i.qty])).toEqual([['srv', 3]]);
  });

  it('lần đầu đăng nhập: gộp giỏ máy với giỏ máy chủ, cùng sản phẩm lấy số lượng lớn hơn', async () => {
    localStorage.setItem('agriverse:cart', JSON.stringify([
      { id: 'a', name: 'A', price: 1, qty: 2, selected: true },
      { id: 'b', name: 'B', price: 1, qty: 7, selected: true }
    ]));
    apiMock.cart.get.mockResolvedValue({ items: [serverRow('a', 5)] });

    const cart = loadCart();
    await cart.init();

    const byId = Object.fromEntries(cart.items().map((i) => [i.id, i.qty]));
    expect(byId).toEqual({ a: 5, b: 7 });
    expect(localStorage.getItem('agriverse:cart:merged:u1')).toBe('1');
  });

  it('mất mạng khi tải giỏ: giữ giỏ cục bộ', async () => {
    localStorage.setItem('agriverse:cart', JSON.stringify([{ id: 'a', name: 'A', price: 1, qty: 2, selected: true }]));
    apiMock.cart.get.mockRejectedValue(new Error('network'));
    const cart = loadCart();
    await cart.init();
    expect(cart.items()).toHaveLength(1);
  });

  it('rời trang khi còn thay đổi chưa đẩy: gửi ngay bằng keepalive', async () => {
    const cart = loadCart();
    cart.add(product({ wholesale: null }));
    window.dispatchEvent(new Event('pagehide'));
    expect(apiMock.cart.replace).toHaveBeenCalledTimes(1);
    expect(apiMock.cart.replace.mock.calls[0][1]).toEqual({ keepalive: true });
  });

  it('clearLocal (đăng xuất): xoá giỏ, cờ dirty và cờ đã gộp ở máy', () => {
    const cart = loadCart();
    cart.add(product());
    localStorage.setItem('agriverse:cart:merged:u1', '1');
    cart.clearLocal();
    expect(cart.items()).toHaveLength(0);
    expect(localStorage.getItem('agriverse:cart')).toBeNull();
    expect(localStorage.getItem('agriverse:cart:dirty')).toBeNull();
    expect(localStorage.getItem('agriverse:cart:merged:u1')).toBeNull();
  });
});

describe('hộp thoại Tính Sỉ', () => {
  function loadWholesale() {
    const cart = loadCart();
    // eslint-disable-next-line no-new-func
    new Function(WHOLESALE_SRC).call(window);
    const w = (window as unknown as { AgriChain: { wholesale: { open(p: unknown, cb?: (r: unknown, p: unknown, q: number) => void): void } } }).AgriChain;
    return { cart, open: w.wholesale.open };
  }
  const text = (id: string) => document.getElementById(id)?.textContent ?? '';

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  const prod = { id: 'p1', name: 'Hạt giống xà lách', price: 13000, wholesale: 12000, moq: 10, unit: 'Gói', stock: 100, img: '', origin: 'Việt Nam' };

  it('mở sẵn ở đúng ngưỡng sỉ: giá sỉ, tổng tiền và khoản tiết kiệm', () => {
    const { open } = loadWholesale();
    open(prod);
    expect((document.getElementById('ws-qty') as HTMLInputElement).value).toBe('10');
    expect(text('ws-kind')).toContain('SỈ');
    expect(text('ws-total')).toBe('120.000 đ');
    expect(text('ws-tip')).toContain('10.000 đ'); // (13.000 - 12.000) * 10
    expect(text('ws-tip')).toContain('7.7%');
  });

  it('dưới ngưỡng: giá lẻ và gợi ý mua thêm bao nhiêu để được giá sỉ', () => {
    const { open } = loadWholesale();
    open(prod);
    (document.getElementById('ws-minus') as HTMLButtonElement).click(); // 9
    expect(text('ws-kind')).toBe('GIÁ BÁN LẺ');
    expect(text('ws-total')).toBe('117.000 đ');
    expect(text('ws-tip')).toContain('Mua thêm 1 Gói');
  });

  it('số lượng bị chặn ở tồn kho', () => {
    const { open } = loadWholesale();
    open({ ...prod, stock: 12 });
    (document.getElementById('ws-plus') as HTMLButtonElement).click();
    (document.getElementById('ws-plus') as HTMLButtonElement).click();
    (document.getElementById('ws-plus') as HTMLButtonElement).click();
    expect((document.getElementById('ws-qty') as HTMLInputElement).value).toBe('12');
    expect((document.getElementById('ws-plus') as HTMLButtonElement).disabled).toBe(true);
  });

  it('"Thêm vào giỏ" thêm ĐÚNG số lượng đã tính, đóng hộp thoại và gọi callback', () => {
    const { cart, open } = loadWholesale();
    const onAdded = vi.fn();
    open(prod, onAdded);
    (document.getElementById('ws-add') as HTMLButtonElement).click();

    expect(cart.items()).toMatchObject([{ id: 'p1', qty: 10 }]);
    expect(onAdded).toHaveBeenCalledTimes(1);
    expect(document.getElementById('wholesale-modal')?.classList.contains('hidden')).toBe(true);
  });
});

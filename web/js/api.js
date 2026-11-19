// Phần dùng chung (DELETE gửi id trong body vì backend đọc req.body): gọi API, đăng nhập, định dạng, thông báo, modal
(function () {
  const BASE = (window.API_BASE || 'http://localhost:8003').replace(/\/$/, '');
  const KEY = 'ecom_auth';

  const Auth = {
    get() { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { return null; } },
    set(v) { localStorage.setItem(KEY, JSON.stringify(v)); },
    clear() { localStorage.removeItem(KEY); },
    get token() { const a = this.get(); return a && a.accessToken; },
    get user() { const a = this.get(); return a && a.user; },
    isAdmin() { const u = this.user; return !!u && (u.roleId === 'R1' || u.roleId === 'R4'); }
  };

  function qs(params) {
    const p = new URLSearchParams();
    Object.keys(params || {}).forEach(k => { if (params[k] !== undefined && params[k] !== null) p.append(k, params[k]); });
    const s = p.toString();
    return s ? '?' + s : '';
  }

  async function call(method, path, data) {
    const opt = { method, headers: {} };
    if (Auth.token) opt.headers.Authorization = 'Bearer ' + Auth.token;
    let url = BASE + path;
    if (method === 'GET') {
      url += qs(data);
    } else {
      opt.headers['Content-Type'] = 'application/json';
      opt.body = JSON.stringify(data || {});
    }
    let res;
    try { res = await fetch(url, opt); }
    catch (e) { throw new Error('Không kết nối được backend (' + BASE + '). Hãy chạy "npm start" và kiểm tra config.js'); }
    let json = null;
    try { json = await res.json(); } catch (e) { /* không phải JSON */ }
    if (!json) throw new Error('Backend trả về dữ liệu không hợp lệ (HTTP ' + res.status + ')');
    if (res.status === 401 || res.status === 403 || json.refresh) {
      if (Auth.token) { Auth.clear(); }
      throw new Error(json.errMessage || json.message || 'Phiên đăng nhập hết hạn, hãy đăng nhập lại');
    }
    if (json.errCode !== undefined && json.errCode !== 0) {
      const e = new Error(json.errMessage || ('Lỗi ' + json.errCode));
      e.errCode = json.errCode; e.data = json; throw e;
    }
    return json;
  }
  const api = {
    get: (p, d) => call('GET', p, d), post: (p, d) => call('POST', p, d),
    put: (p, d) => call('PUT', p, d), del: (p, d) => call('DELETE', p, d)
  };

  const esc = s => String(s === null || s === undefined ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const money = n => (Number(n) || 0).toLocaleString('vi-VN') + '₫';
  const dateStr = d => { if (!d) return ''; const x = new Date(d); return isNaN(x) ? '' : x.toLocaleString('vi-VN'); };

  function toast(msg, type) {
    let box = document.querySelector('.toast');
    if (!box) { box = document.createElement('div'); box.className = 'toast'; document.body.appendChild(box); }
    const el = document.createElement('div');
    el.className = type === 'e' ? 'e' : type === 'o' ? 'o' : '';
    el.textContent = msg; box.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  }
  const ok = m => toast(m, 'o');
  const fail = e => toast(e && e.message ? e.message : String(e), 'e');

  function modal(title, html, onMount) {
    const bg = document.createElement('div');
    bg.className = 'modal-bg';
    bg.innerHTML = '<div class="modal"><div class="row sb"><h3>' + esc(title) + '</h3><button class="btn ghost sm" data-x>✕</button></div><div data-body>' + html + '</div></div>';
    const close = () => bg.remove();
    bg.addEventListener('mousedown', e => { if (e.target === bg) close(); });
    bg.querySelector('[data-x]').onclick = close;
    document.body.appendChild(bg);
    if (onMount) onMount(bg.querySelector('[data-body]'), close);
    return close;
  }

  // Thu nhỏ ảnh trước khi gửi (ảnh được lưu dạng chuỗi base64 trong DB)
  function readImage(file, max) {
    max = max || 800;
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onerror = () => reject(new Error('Không đọc được ảnh'));
      fr.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('File không phải ảnh'));
        img.onload = () => {
          const r = Math.min(1, max / Math.max(img.width, img.height));
          const c = document.createElement('canvas');
          c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL('image/jpeg', 0.82));
        };
        img.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }

  const STATUS = { S3: 'Chờ xác nhận', S4: 'Đã xác nhận', S5: 'Đang giao', S6: 'Hoàn thành', S7: 'Đã hủy' };
  const statusPill = c => '<span class="pill ' + String(c || '').toLowerCase() + '">' + esc(STATUS[c] || c || '') + '</span>';
  const PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="#eef0f2"/><text x="200" y="210" font-size="22" fill="#9ca3af" text-anchor="middle" font-family="sans-serif">Chưa có ảnh</text></svg>');
  const img = s => (s && String(s).indexOf('data:') === 0) || (s && /^https?:/.test(s)) ? s : PLACEHOLDER;

  // Tính giá giảm của voucher. typeVoucher code chứa "percent" => theo %, ngược lại => số tiền
  function voucherDiscount(v, subtotal) {
    if (!v) return 0;
    const t = v.typeVoucherOfVoucherData || {};
    const code = String((t.typeVoucherData && t.typeVoucherData.code) || t.typeVoucher || '').toLowerCase();
    if (t.minValue && subtotal < Number(t.minValue)) return 0;
    let d = /percent|phan|%/.test(code) ? subtotal * Number(t.value || 0) / 100 : Number(t.value || 0);
    if (t.maxValue && d > Number(t.maxValue)) d = Number(t.maxValue);
    return Math.max(0, Math.min(d, subtotal));
  }

  window.App = { api, Auth, esc, money, dateStr, toast, ok, fail, modal, readImage, STATUS, statusPill, img, PLACEHOLDER, voucherDiscount, BASE };
})();

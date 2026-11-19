// Giao diện cửa hàng (khách hàng). Router theo hash: #/products, #/product/1 ...
(function () {
  const { api, Auth, esc, money, dateStr, ok, fail, modal, img, statusPill, voucherDiscount } = App;
  const $app = document.getElementById('app');
  const AVATAR = 'data:image/gif;base64,R0lGODlhAQABAIAAAMLCwgAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==';
  const S = (window.S = {});
  let cache = { products: null, cats: null, brands: null };

  // ---------- helpers ----------
  const route = () => {
    const h = location.hash.replace(/^#/, '') || '/';
    const [path, q] = h.split('?');
    return { parts: path.split('/').filter(Boolean), q: Object.fromEntries(new URLSearchParams(q || '')) };
  };
  const go = h => { location.hash = h; };
  const loading = () => { $app.innerHTML = '<div class="empty">Đang tải...</div>'; };
  const needLogin = () => { if (!Auth.user) { ok('Hãy đăng nhập trước'); go('/login'); return true; } return false; };
  const firstImg = p => { const d = (p.productDetail || [])[0]; return d && d.productImage && d.productImage[0] ? d.productImage[0].image : ''; };
  const pOrig = p => { const d = (p.productDetail || [])[0]; return d ? Number(d.originalPrice) : 0; };
  const pPrice = p => { const d = (p.productDetail || [])[0]; return d ? Number(d.discountPrice) : 0; };

  async function loadProducts(force) {
    if (cache.products && !force) return cache.products;
    // Lấy hết rồi lọc/phân trang ở trình duyệt (tránh lỗi limit/offset=0 của backend)
    const r = await api.get('/api/get-all-product-user', { keyword: '', categoryId: 'ALL', brandId: 'ALL' });
    cache.products = (r.data || []).filter(p => p.statusId === 'S1');
    return cache.products;
  }
  async function loadCodes(type) {
    try { return (await api.get('/api/get-all-code', { type })).data || []; } catch (e) { return []; }
  }
  function productCard(p) {
    const o = pOrig(p), pr = pPrice(p), off = o > pr && o > 0 ? Math.round((o - pr) / o * 100) : 0;
    return `<a class="pcard" href="#/product/${p.id}">
      ${off ? `<span class="tag">-${off}%</span>` : ''}
      <div class="im" style="background-image:url('${img(firstImg(p))}')"></div>
      <div class="bd"><div class="nm">${esc(p.name)}</div>
      <div class="small muted">${esc((p.brandData || {}).value || '')}</div>
      <div><span class="price">${money(pr)}</span>${o > pr ? `<span class="old">${money(o)}</span>` : ''}</div></div></a>`;
  }
  const CAT_ICON = [[/cpu|vi xử lý|processor/i, '🧠'], [/vga|card|gpu/i, '🎮'], [/ram|bộ nhớ/i, '💾'], [/ssd|hdd|ổ cứng|lưu trữ/i, '💽'], [/main|bo mạch/i, '🔌'],
    [/nguồn|psu/i, '⚡'], [/case|vỏ|tản|cooling/i, '🧊'], [/laptop|máy tính xách tay/i, '💻'], [/màn hình|monitor/i, '🖥️'], [/bàn phím|keyboard/i, '⌨️'],
    [/chuột|mouse/i, '🖱️'], [/tai nghe|headphone|âm thanh|loa/i, '🎧'], [/mạng|router|wifi/i, '📡'], [/phụ kiện/i, '🔧']];
  const catIcon = n => { const m = CAT_ICON.find(x => x[0].test(n || '')); return m ? m[1] : '📦'; };

  // ---------- thanh điều hướng ----------
  async function renderNav() {
    const u = Auth.user;
    let cartCount = 0;
    if (u) { try { cartCount = ((await api.get('/api/get-all-shopcart-by-userId', { id: u.id })).data || []).length; } catch (e) { /* bỏ qua */ } }
    document.getElementById('navRight').innerHTML = `
      ${u ? `<a href="#/account" title="Tài khoản">👤 ${esc(u.firstName || u.lastName || u.email)}</a>
        ${Auth.isAdmin() ? '<a href="admin.html">Quản trị</a>' : ''}<a href="#" onclick="S.logout();return false">Thoát</a>`
      : '<a href="#/login">Đăng nhập</a><a class="btn sm" href="#/register">Đăng ký</a>'}
      <a href="#/cart">🛒 Giỏ hàng${cartCount ? `<span class="badge">${cartCount}</span>` : ''}</a>`;
    if (!cache.cats) cache.cats = await loadCodes('CATEGORY');
    document.getElementById('catmenu').innerHTML = cache.cats.map(c => `<a href="#/products?cat=${encodeURIComponent(c.code)}">${catIcon(c.value)} ${esc(c.value)}</a>`).join('') + '<a href="#/products">Tất cả sản phẩm →</a>';
  }
  document.getElementById('sf').onsubmit = e => { e.preventDefault(); const q = document.getElementById('sq').value.trim(); go('/products' + (q ? '?q=' + encodeURIComponent(q) : '')); };
  S.logout = () => { Auth.clear(); renderNav(); go('/'); };

  // ---------- trang chủ ----------
  async function pageHome() {
    loading();
    const [banners, all, cats] = await Promise.all([
      api.get('/api/get-all-banner', { keyword: '' }).then(r => r.data || []).catch(() => []),
      loadProducts(true).catch(() => []),
      cache.cats || loadCodes('CATEGORY')
    ]);
    cache.cats = cats;
    const ban = banners.filter(b => b.statusId === undefined || b.statusId === 'S1');
    const off = p => { const o = pOrig(p), pr = pPrice(p); return o > pr && o > 0 ? (o - pr) / o : 0; };
    const deals = all.filter(p => off(p) > 0).sort((a, b) => off(b) - off(a)).slice(0, 10);
    const newest = [...all].sort((a, b) => b.id - a.id).slice(0, 8);
    const hot = [...all].sort((a, b) => (b.view || 0) - (a.view || 0)).slice(0, 8);
    const slides = ban.length ? ban.map(b => `<div class="slide" style="background-image:url('${img(b.image)}')"><div class="cap"><h2>${esc(b.name)}</h2><div>${esc(b.description || '')}</div></div></div>`)
      : [`<div class="slide defbanner"><div><h1>Linh kiện PC · Laptop<br>Đồ công nghệ chính hãng</h1><p>Build PC theo nhu cầu - Giá tốt - Bảo hành rõ ràng</p><a class="btn" style="background:#fde047;color:#7c2d12;border-color:#fde047" href="#/products">Mua sắm ngay</a></div><div class="big">🖥️</div></div>`];
    const sec = (t, list, more) => list.length ? `<div class="secthead"><h2>${t}</h2>${more ? '<a href="#/products">Xem tất cả →</a>' : ''}</div><div class="grid g4">${list.map(productCard).join('')}</div>` : '';
    $app.innerHTML = `
      <div class="slider" id="slider">${slides.join('')}${slides.length > 1 ? `<div class="dots">${slides.map(() => '<i></i>').join('')}</div>` : ''}</div>
      <div class="perkcards"><div><b>✔ Chính hãng</b>Xuất VAT đầy đủ</div><div><b>🚚 Giao nhanh</b>Toàn quốc, kiểm tra hàng</div><div><b>🔧 Hỗ trợ build PC</b>Tư vấn cấu hình miễn phí</div><div><b>🛡️ Bảo hành</b>Đổi trả rõ ràng</div></div>
      ${deals.length ? `<div class="deal"><div class="dh"><h2>Deal hot giảm sốc</h2><span>Giá tốt hôm nay</span></div><div class="row2">${deals.map(productCard).join('')}</div></div>` : ''}
      ${cats.length ? `<div class="secthead"><h2>Danh mục nổi bật</h2></div><div class="cats">${cats.map(c => `<a href="#/products?cat=${encodeURIComponent(c.code)}"><i>${catIcon(c.value)}</i>${esc(c.value)}</a>`).join('')}</div>` : ''}
      ${sec('Sản phẩm bán chạy', hot, true)}${sec('Hàng mới về', newest, false)}
      ${!all.length ? '<div class="empty card" style="margin-top:20px">Chưa có sản phẩm nào. Vào <a href="admin.html">trang quản trị</a> để thêm.</div>' : ''}`;
    const sl = document.getElementById('slider'), items = sl.querySelectorAll('.slide'), dots = sl.querySelectorAll('.dots i');
    let i = 0; const show = n => { i = n; items.forEach((e, k) => e.classList.toggle('on', k === n)); dots.forEach((e, k) => e.classList.toggle('on', k === n)); };
    show(0); dots.forEach((d, k) => d.onclick = () => show(k));
    S._timer && clearInterval(S._timer);
    if (items.length > 1) S._timer = setInterval(() => { if (!document.body.contains(sl)) return clearInterval(S._timer); show((i + 1) % items.length); }, 4500);
  }

  // ---------- danh sách sản phẩm ----------
  async function pageProducts(q) {
    loading();
    const [all, cats, brands] = await Promise.all([loadProducts(), cache.cats || loadCodes('CATEGORY'), cache.brands || loadCodes('BRAND')]);
    cache.cats = cats; cache.brands = brands;
    const f = { q: q.q || '', cat: q.cat || '', brand: q.brand || '', sort: q.sort || '', page: +q.page || 1 };
    let list = all.filter(p => (!f.q || p.name.toLowerCase().includes(f.q.toLowerCase())) && (!f.cat || p.categoryId === f.cat) && (!f.brand || p.brandId === f.brand));
    if (f.sort === 'price') list.sort((a, b) => pPrice(a) - pPrice(b));
    if (f.sort === 'price-desc') list.sort((a, b) => pPrice(b) - pPrice(a));
    if (f.sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
    const per = 12, pages = Math.max(1, Math.ceil(list.length / per));
    f.page = Math.min(f.page, pages);
    const opt = (arr, v) => arr.map(c => `<option value="${esc(c.code)}" ${v === c.code ? 'selected' : ''}>${esc(c.value)}</option>`).join('');
    $app.innerHTML = `<h1>Sản phẩm</h1>
      <div class="filters">
        <input id="fq" placeholder="Tìm theo tên..." value="${esc(f.q)}" style="min-width:220px">
        <select id="fc"><option value="">Tất cả danh mục</option>${opt(cats, f.cat)}</select>
        <select id="fb"><option value="">Tất cả thương hiệu</option>${opt(brands, f.brand)}</select>
        <select id="fs"><option value="">Mặc định</option><option value="price" ${f.sort === 'price' ? 'selected' : ''}>Giá tăng dần</option><option value="price-desc" ${f.sort === 'price-desc' ? 'selected' : ''}>Giá giảm dần</option><option value="name" ${f.sort === 'name' ? 'selected' : ''}>Tên A-Z</option></select>
        <button class="btn" id="fgo">Lọc</button></div>
      <div class="muted small" style="margin-bottom:8px">${list.length} sản phẩm</div>
      ${list.length ? `<div class="grid g4">${list.slice((f.page - 1) * per, f.page * per).map(productCard).join('')}</div>` : '<div class="empty card">Không có sản phẩm phù hợp</div>'}
      <div class="pager">${Array.from({ length: pages }, (_, i) => `<button class="${i + 1 === f.page ? 'on' : ''}" data-p="${i + 1}">${i + 1}</button>`).join('')}</div>`;
    const apply = page => {
      const p = new URLSearchParams({ q: $v('fq'), cat: $v('fc'), brand: $v('fb'), sort: $v('fs'), page: page || 1 });
      [...p.keys()].forEach(k => { if (!p.get(k)) p.delete(k); });
      go('/products?' + p.toString());
    };
    document.getElementById('fgo').onclick = () => apply(1);
    document.getElementById('fq').onkeydown = e => { if (e.key === 'Enter') apply(1); };
    $app.querySelectorAll('.pager button').forEach(b => b.onclick = () => apply(b.dataset.p));
  }
  const $v = id => document.getElementById(id).value.trim();

  // ---------- chi tiết sản phẩm ----------
  async function pageProduct(id) {
    loading();
    const r = await api.get('/api/get-detail-product-by-id', { id });
    const p = r.data;
    if (!p || !p.productDetail || !p.productDetail.length) { $app.innerHTML = '<div class="empty card">Sản phẩm chưa có phiên bản nào</div>'; return; }
    let reviews = [];
    try { reviews = ((await api.get('/api/get-all-review-by-productId', { id })).data || []).filter(x => +x.star > 0); } catch (e) { /* chưa có */ }
    const st = { d: 0, size: null, qty: 1, imgI: 0 };
    const draw = () => {
      const d = p.productDetail[st.d], images = d.productImage || [], sizes = d.productDetailSize || [];
      const sz = sizes.find(s => s.id === st.size);
      $app.innerHTML = `<div class="grid g2" style="margin-top:20px">
        <div><img class="mainimg" src="${img(images[st.imgI] && images[st.imgI].image)}">
          <div class="thumbs">${images.map((im, i) => `<img src="${img(im.image)}" class="${i === st.imgI ? 'on' : ''}" data-i="${i}">`).join('')}</div></div>
        <div class="card">
          <h1 style="margin-top:0">${esc(p.name)}</h1>
          <div class="muted small">${esc((p.brandData || {}).value || '')} · ${esc((p.categoryData || {}).value || '')} · ${p.view || 0} lượt xem</div>
          <div style="margin:12px 0;font-size:24px"><span class="price">${money(d.discountPrice)}</span>${+d.originalPrice > +d.discountPrice ? `<span class="old">${money(d.originalPrice)}</span>` : ''}</div>
          <label>Phiên bản</label><div>${p.productDetail.map((x, i) => `<span class="opt ${i === st.d ? 'on' : ''}" data-d="${i}">${esc(x.nameDetail)}</span>`).join('')}</div>
          <label>Cấu hình / dung lượng</label><div>${sizes.length ? sizes.map(s => `<span class="opt ${s.id === st.size ? 'on' : ''} ${s.stock <= 0 ? 'off' : ''}" data-s="${s.id}">${esc((s.sizeData || {}).value || s.sizeId)}${s.stock <= 0 ? ' (hết)' : ''}</span>`).join('') : '<span class="muted">Chưa có</span>'}</div>
          ${sz ? `<div class="small muted">Còn ${sz.stock} sản phẩm${sz.width ? ` · ${sz.width}×${sz.height}` : ''}${sz.weight ? ` · ${sz.weight}g` : ''}</div>` : ''}
          <label>Số lượng</label>
          <div class="qty"><button data-q="-1">−</button><input id="qty" value="${st.qty}"><button data-q="1">+</button></div>
          <div style="margin-top:16px"><button class="btn" id="add" ${sz ? '' : 'disabled'}>Thêm vào giỏ hàng</button></div>
          ${d.description ? `<p class="muted">${esc(d.description)}</p>` : ''}
        </div></div>
        ${p.contentHTML ? `<h2>Mô tả</h2><div class="card prose">${p.contentHTML}</div>` : ''}
        <h2>Đánh giá (${reviews.length})</h2>
        <div class="card">${reviews.length ? reviews.map(rv => `<div style="border-bottom:1px solid var(--bd);padding:8px 0">
          <b>${esc(((rv.user || {}).firstName || '') + ' ' + ((rv.user || {}).lastName || '')).trim() || 'Khách'}</b> <span style="color:#f59e0b">${'★'.repeat(+rv.star || 0)}${'☆'.repeat(5 - (+rv.star || 0))}</span>
          <span class="muted small">${dateStr(rv.createdAt)}</span><div>${esc(rv.content)}</div></div>`).join('') : '<div class="muted">Chưa có đánh giá</div>'}
          ${Auth.user ? `<div style="margin-top:12px"><label>Viết đánh giá</label><div class="row"><select id="rs" style="width:100px">${[5, 4, 3, 2, 1].map(n => `<option>${n}</option>`).join('')}</select><input id="rc" class="grow" placeholder="Nhận xét của bạn"><button class="btn" id="rsend">Gửi</button></div></div>` : '<div class="small muted" style="margin-top:8px"><a href="#/login">Đăng nhập</a> để đánh giá</div>'}
        </div>`;
      $app.querySelectorAll('[data-d]').forEach(e => e.onclick = () => { st.d = +e.dataset.d; st.size = null; st.imgI = 0; draw(); });
      $app.querySelectorAll('[data-s]').forEach(e => e.onclick = () => { const s = sizes.find(x => x.id === +e.dataset.s); if (s.stock > 0) { st.size = s.id; st.qty = Math.min(st.qty, s.stock); draw(); } });
      $app.querySelectorAll('.thumbs img').forEach(e => e.onclick = () => { st.imgI = +e.dataset.i; draw(); });
      $app.querySelectorAll('[data-q]').forEach(e => e.onclick = () => { st.qty = Math.max(1, (+document.getElementById('qty').value || 1) + +e.dataset.q); if (sz) st.qty = Math.min(st.qty, sz.stock); draw(); });
      document.getElementById('qty').onchange = e => { st.qty = Math.max(1, +e.target.value || 1); };
      document.getElementById('add').onclick = async () => {
        if (needLogin()) return;
        try {
          st.qty = Math.max(1, +document.getElementById('qty').value || 1);
          await api.post('/api/add-shopcart', { userId: Auth.user.id, productdetailsizeId: st.size, quantity: st.qty });
          ok('Đã thêm vào giỏ hàng'); renderNav();
        } catch (e) { fail(e); }
      };
      const rs = document.getElementById('rsend');
      if (rs) rs.onclick = async () => {
        try {
          await api.post('/api/create-new-review', { productId: p.id, userId: Auth.user.id, star: +$v('rs'), content: $v('rc') });
          ok('Đã gửi đánh giá'); pageProduct(id);
        } catch (e) { fail(e); }
      };
    };
    draw();
  }

  // ---------- giỏ hàng ----------
  async function loadCart() { return (await api.get('/api/get-all-shopcart-by-userId', { id: Auth.user.id })).data || []; }
  const cartLine = c => ({ id: c.id, sizeId: c.productdetailsizeId, qty: +c.quantity, price: +((c.productDetail || {}).discountPrice || 0),
    name: (c.productData || {}).name || '', variant: (c.productDetail || {}).nameDetail || '', size: ((c.productdetailsizeData || {}).sizeData || {}).value || '',
    image: (c.productDetailImage && c.productDetailImage[0] && c.productDetailImage[0].image) || '' });

  async function pageCart() {
    if (needLogin()) return;
    loading();
    const lines = (await loadCart()).map(cartLine);
    const total = lines.reduce((s, l) => s + l.price * l.qty, 0);
    $app.innerHTML = `<h1>Giỏ hàng</h1>` + (lines.length ? `<div class="tw"><table><tr><th></th><th>Sản phẩm</th><th>Đơn giá</th><th>Số lượng</th><th>Thành tiền</th><th></th></tr>
      ${lines.map(l => `<tr><td><img class="thumb" src="${img(l.image)}"></td><td><b>${esc(l.name)}</b><div class="small muted">${esc(l.variant)} · ${esc(l.size)}</div></td>
      <td>${money(l.price)}</td><td><div class="qty"><button data-m="${l.id}" data-s="${l.sizeId}" data-n="${l.qty - 1}">−</button><input value="${l.qty}" readonly><button data-m="${l.id}" data-s="${l.sizeId}" data-n="${l.qty + 1}">+</button></div></td>
      <td class="price">${money(l.price * l.qty)}</td><td><button class="btn red sm" data-del="${l.id}">Xóa</button></td></tr>`).join('')}</table></div>
      <div class="row sb" style="margin-top:16px"><a href="#/products">← Tiếp tục mua</a><div><span class="muted">Tạm tính:</span> <b class="price" style="font-size:20px">${money(total)}</b> <a class="btn" href="#/checkout">Thanh toán</a></div></div>`
      : '<div class="empty card">Giỏ hàng trống. <a href="#/products">Mua sắm ngay</a></div>');
    $app.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => { try { await api.del('/api/delete-item-shopcart', { id: b.dataset.del }); renderNav(); pageCart(); } catch (e) { fail(e); } });
    $app.querySelectorAll('[data-m]').forEach(b => b.onclick = async () => {
      const n = +b.dataset.n; if (n < 1) return;
      try { await api.post('/api/add-shopcart', { userId: Auth.user.id, productdetailsizeId: +b.dataset.s, quantity: n, type: 'UPDATE_QUANTITY' }); pageCart(); }
      catch (e) { fail(e); }
    });
  }

  // ---------- thanh toán ----------
  async function pageCheckout() {
    if (needLogin()) return;
    loading();
    const [cart, addrs, ships, myV] = await Promise.all([
      loadCart(),
      api.get('/api/get-all-address-user', { userId: Auth.user.id }).then(r => r.data || []),
      api.get('/api/get-all-typeship', { keyword: '' }).then(r => r.data || []).catch(() => []),
      api.get('/api/get-all-voucher-by-userid', { id: Auth.user.id }).then(r => r.data || []).catch(() => [])
    ]);
    const lines = cart.map(cartLine);
    if (!lines.length) { go('/cart'); return; }
    const sub = lines.reduce((s, l) => s + l.price * l.qty, 0);
    const vouchers = myV.map(x => x.voucherData).filter(Boolean);
    $app.innerHTML = `<h1>Thanh toán</h1><div class="grid g2">
      <div class="card"><h3>Giao hàng</h3>
        <label>Địa chỉ nhận hàng</label>
        ${addrs.length ? `<select id="ad">${addrs.map(a => `<option value="${a.id}">${esc(a.shipName)} · ${esc(a.shipPhonenumber)} · ${esc(a.shipAdress)}</option>`).join('')}</select>` : '<div class="err">Chưa có địa chỉ. <a href="#/account">Thêm địa chỉ</a></div>'}
        <label>Phương thức vận chuyển</label>
        ${ships.length ? `<select id="sh">${ships.map(s => `<option value="${s.id}" data-p="${s.price}">${esc(s.type)} (${money(s.price)})</option>`).join('')}</select>` : '<div class="err">Chưa có phương thức vận chuyển (admin cần tạo).</div>'}
        <label>Voucher</label>
        <select id="vc"><option value="">Không dùng</option>${vouchers.map(v => `<option value="${v.id}">${esc(v.codeVoucher)}</option>`).join('')}</select>
        <div class="small muted">Chưa có voucher? <a href="#/vouchers">Lưu voucher</a></div>
        <label>Ghi chú</label><textarea id="nt"></textarea>
        <label>Thanh toán</label><div class="opt on">Thanh toán khi nhận hàng (COD)</div>
      </div>
      <div class="card"><h3>Đơn hàng</h3>
        ${lines.map(l => `<div class="row sb small"><span>${esc(l.name)} (${esc(l.variant)}/${esc(l.size)}) × ${l.qty}</span><span>${money(l.price * l.qty)}</span></div>`).join('')}
        <hr><div class="row sb"><span>Tạm tính</span><span id="t1">${money(sub)}</span></div>
        <div class="row sb"><span>Phí vận chuyển</span><span id="t2"></span></div>
        <div class="row sb"><span>Giảm giá</span><span id="t3"></span></div>
        <div class="row sb" style="font-size:18px"><b>Tổng cộng</b><b class="price" id="t4"></b></div>
        <button class="btn" id="place" style="width:100%;margin-top:12px" ${addrs.length && ships.length ? '' : 'disabled'}>Đặt hàng</button>
      </div></div>`;
    const calc = () => {
      const sh = document.getElementById('sh'), ship = sh ? +sh.selectedOptions[0].dataset.p : 0;
      const v = vouchers.find(x => String(x.id) === document.getElementById('vc').value);
      const disc = voucherDiscount(v, sub);
      document.getElementById('t2').textContent = money(ship); document.getElementById('t3').textContent = '-' + money(disc);
      document.getElementById('t4').textContent = money(sub + ship - disc);
    };
    ['sh', 'vc'].forEach(i => { const e = document.getElementById(i); if (e) e.onchange = calc; }); calc();
    document.getElementById('place').onclick = async (ev) => {
      ev.target.disabled = true;
      try {
        const vid = $v('vc');
        await api.post('/api/create-new-order', {
          userId: Auth.user.id, addressUserId: +$v('ad'), typeShipId: +$v('sh'), voucherId: vid ? +vid : null,
          isPaymentOnlien: 0, note: $v('nt'),
          arrDataShopCart: lines.map(l => ({ productId: l.sizeId, quantity: l.qty, realPrice: l.price }))
        });
        ok('Đặt hàng thành công!'); renderNav(); go('/orders');
      } catch (e) { fail(e); ev.target.disabled = false; }
    };
  }

  // ---------- đơn hàng của tôi ----------
  async function pageOrders() {
    if (needLogin()) return;
    loading();
    const r = await api.get('/api/get-all-order-by-user', { userId: Auth.user.id });
    const orders = [];
    (r.data || []).forEach(a => (a.order || []).forEach(o => orders.push({ ...o, addr: a })));
    orders.sort((a, b) => b.id - a.id);
    $app.innerHTML = `<h1>Đơn hàng của tôi</h1>` + (orders.length ? orders.map(o => {
      const items = o.orderDetail || [];
      const sub = items.reduce((s, i) => s + i.quantity * i.realPrice, 0);
      const ship = Number((o.typeShipData || {}).price || 0);
      const disc = voucherDiscount(o.voucherData && o.voucherData.id ? { ...o.voucherData, typeVoucherOfVoucherData: o.voucherData.typeVoucherOfVoucherData } : null, sub);
      return `<div class="card" style="margin-bottom:14px"><div class="row sb"><b>Đơn #${o.id}</b>${statusPill(o.statusId)}</div>
        <div class="small muted">${dateStr(o.createdAt)} · ${esc(o.addr.shipName)} · ${esc(o.addr.shipAdress)}</div>
        ${items.map(i => `<div class="row" style="margin-top:8px"><img class="thumb" src="${img(i.productImage && i.productImage[0] && i.productImage[0].image)}">
          <div class="grow"><a href="#/product/${(i.product || {}).id}">${esc((i.product || {}).name)}</a><div class="small muted">${esc((i.productDetail || {}).nameDetail)} · ${esc(((i.productDetailSize || {}).sizeData || {}).value)} × ${i.quantity}</div></div>
          <div>${money(i.realPrice * i.quantity)}</div></div>`).join('')}
        <hr><div class="row sb"><span class="muted small">Ship ${money(ship)}${disc ? ' · Giảm ' + money(disc) : ''}</span><b>Tổng: <span class="price">${money(sub + ship - disc)}</span></b></div>
        ${o.statusId === 'S3' ? `<button class="btn red sm" data-cancel="${o.id}" style="margin-top:8px">Hủy đơn</button>` : ''}</div>`;
    }).join('') : '<div class="empty card">Bạn chưa có đơn hàng nào</div>');
    $app.querySelectorAll('[data-cancel]').forEach(b => b.onclick = async () => {
      if (!confirm('Hủy đơn hàng này?')) return;
      try { await api.put('/api/update-status-order', { id: +b.dataset.cancel, statusId: 'S7', dataOrder: { orderDetail: [] } }); ok('Đã hủy đơn'); pageOrders(); } catch (e) { fail(e); }
    });
  }

  // ---------- voucher ----------
  const toDate = x => { const n = Number(x); return new Date(isNaN(n) ? x : n); };
  async function pageVouchers() {
    loading();
    const r = await api.get('/api/get-all-voucher', {});
    const now = Date.now();
    const list = (r.data || []).filter(v => !v.toDate || toDate(v.toDate).getTime() + 86400000 > now);
    $app.innerHTML = `<h1>Voucher</h1>` + (list.length ? `<div class="grid g4">${list.map(v => {
      const t = v.typeVoucherOfVoucherData || {}, tc = String((t.typeVoucherData || {}).code || '').toLowerCase();
      const left = (v.amount || 0) - (v.usedAmount || 0);
      return `<div class="card"><b style="font-size:18px;color:var(--c)">${esc(v.codeVoucher)}</b>
        <div>Giảm ${/percent|phan|%/.test(tc) ? t.value + '%' : money(t.value)}${t.maxValue ? ` (tối đa ${money(t.maxValue)})` : ''}</div>
        <div class="small muted">Đơn từ ${money(t.minValue || 0)} · Còn ${left} lượt</div>
        <div class="small muted">HSD: ${v.toDate ? toDate(v.toDate).toLocaleDateString('vi-VN') : '—'}</div>
        <button class="btn sm" style="margin-top:8px" data-save="${v.id}" ${left <= 0 ? 'disabled' : ''}>Lưu voucher</button></div>`;
    }).join('')}</div>` : '<div class="empty card">Chưa có voucher</div>');
    $app.querySelectorAll('[data-save]').forEach(b => b.onclick = async () => {
      if (needLogin()) return;
      try { await api.post('/api/save-user-voucher', { userId: Auth.user.id, voucherId: +b.dataset.save }); ok('Đã lưu voucher'); } catch (e) { fail(e); }
    });
  }

  // ---------- tin tức ----------
  async function pageBlog(id) {
    loading();
    if (id) {
      const b = (await api.get('/api/get-detail-blog', { id })).data;
      $app.innerHTML = `<p><a href="#/blog">← Tin tức</a></p><h1>${esc(b.title)}</h1><div class="muted small">${dateStr(b.createdAt)}</div>
        <img src="${img(b.image)}" style="max-width:100%;border-radius:12px;margin:12px 0"><div class="card prose">${b.contentHTML || ''}</div>`;
      return;
    }
    const list = (await api.get('/api/get-all-blog', { keyword: '', subjectId: '' })).data || [];
    $app.innerHTML = `<h1>Tin tức</h1>` + (list.length ? `<div class="grid g4">${list.map(b => `<a class="pcard" href="#/blog/${b.id}"><div class="im" style="background-image:url('${img(b.image)}')"></div><div class="bd"><div class="nm">${esc(b.title)}</div><div class="small muted">${esc(b.shortdescription || '')}</div></div></a>`).join('')}</div>` : '<div class="empty card">Chưa có bài viết</div>');
  }

  // ---------- tài khoản ----------
  async function pageAccount() {
    if (needLogin()) return;
    loading();
    const [me, addrs] = await Promise.all([
      api.get('/api/get-detail-user-by-id', { id: Auth.user.id }).then(r => r.data || {}).catch(() => Auth.user),
      api.get('/api/get-all-address-user', { userId: Auth.user.id }).then(r => r.data || [])
    ]);
    $app.innerHTML = `<h1>Tài khoản</h1><div class="grid g2">
      <div class="card"><h3>Thông tin</h3><div>${esc(me.firstName || '')} ${esc(me.lastName || '')}</div><div class="muted">${esc(me.email)}</div><div class="muted">${esc(me.phonenumber || '')}</div>
        <h3 style="margin-top:20px">Đổi mật khẩu</h3><input id="op" type="password" placeholder="Mật khẩu cũ"><div style="height:8px"></div><input id="np" type="password" placeholder="Mật khẩu mới"><div style="height:8px"></div><button class="btn" id="cp">Đổi mật khẩu</button></div>
      <div class="card"><h3>Sổ địa chỉ</h3>
        ${addrs.map(a => `<div class="row sb" style="border-bottom:1px solid var(--bd);padding:8px 0"><div><b>${esc(a.shipName)}</b> · ${esc(a.shipPhonenumber)}<div class="small muted">${esc(a.shipAdress)} · ${esc(a.shipEmail)}</div></div><button class="btn red sm" data-da="${a.id}">Xóa</button></div>`).join('') || '<div class="muted">Chưa có địa chỉ</div>'}
        <h3 style="margin-top:16px">Thêm địa chỉ</h3>
        <input id="an" placeholder="Tên người nhận"><div style="height:8px"></div><input id="ap" placeholder="Số điện thoại"><div style="height:8px"></div>
        <input id="ae" placeholder="Email" value="${esc(me.email || '')}"><div style="height:8px"></div><input id="aa" placeholder="Địa chỉ"><div style="height:8px"></div><button class="btn" id="aadd">Thêm</button></div></div>`;
    document.getElementById('aadd').onclick = async () => {
      try { await api.post('/api/create-new-address-user', { userId: Auth.user.id, shipName: $v('an'), shipPhonenumber: $v('ap'), shipEmail: $v('ae'), shipAdress: $v('aa') }); ok('Đã thêm địa chỉ'); pageAccount(); } catch (e) { fail(e); }
    };
    $app.querySelectorAll('[data-da]').forEach(b => b.onclick = async () => { try { await api.del('/api/delete-address-user', { id: b.dataset.da }); pageAccount(); } catch (e) { fail(e); } });
    document.getElementById('cp').onclick = async () => {
      try { await api.post('/api/changepassword', { id: Auth.user.id, oldpassword: document.getElementById('op').value, password: document.getElementById('np').value }); ok('Đã đổi mật khẩu'); } catch (e) { fail(e); }
    };
  }

  // ---------- đăng nhập / đăng ký ----------
  function pageLogin() {
    $app.innerHTML = `<div class="card" style="max-width:420px;margin:40px auto"><h1 style="margin-top:0">Đăng nhập</h1>
      <label>Email</label><input id="em" type="email"><label>Mật khẩu</label><input id="pw" type="password">
      <div style="margin-top:16px"><button class="btn" id="go" style="width:100%">Đăng nhập</button></div>
      <p class="small muted">Chưa có tài khoản? <a href="#/register">Đăng ký</a></p></div>`;
    const submit = async () => {
      try {
        const r = await api.post('/api/login', { email: $v('em'), password: document.getElementById('pw').value });
        Auth.set({ user: r.user, accessToken: r.accessToken });
        ok('Xin chào ' + (r.user.firstName || r.user.email)); await renderNav(); go('/');
      } catch (e) { fail(e); }
    };
    document.getElementById('go').onclick = submit;
    document.getElementById('pw').onkeydown = e => { if (e.key === 'Enter') submit(); };
  }
  function pageRegister() {
    $app.innerHTML = `<div class="card" style="max-width:460px;margin:40px auto"><h1 style="margin-top:0">Đăng ký</h1>
      <div class="grid g2"><div><label>Họ</label><input id="fn"></div><div><label>Tên</label><input id="ln"></div></div>
      <label>Email</label><input id="em" type="email"><label>Số điện thoại</label><input id="ph">
      <label>Giới tính</label><select id="ge"><option value="G1">Nam</option><option value="G2">Nữ</option><option value="G3">Khác</option></select>
      <label>Mật khẩu</label><input id="pw" type="password">
      <div style="margin-top:16px"><button class="btn" id="go" style="width:100%">Tạo tài khoản</button></div>
      <p class="small muted">Đã có tài khoản? <a href="#/login">Đăng nhập</a></p></div>`;
    document.getElementById('go').onclick = async () => {
      try {
        if (!$v('em') || !document.getElementById('pw').value) throw new Error('Nhập email và mật khẩu');
        await api.post('/api/create-new-user', { firstName: $v('fn'), lastName: $v('ln') || $v('fn') || 'User', email: $v('em'), phonenumber: $v('ph'), genderId: $v('ge'), password: document.getElementById('pw').value, roleId: 'R2', avatar: AVATAR });
        ok('Đăng ký thành công, hãy đăng nhập'); go('/login');
      } catch (e) { fail(e); }
    };
  }

  // ---------- router ----------
  async function render() {
    const { parts, q } = route(), p = parts[0] || '';
    window.scrollTo(0, 0);
    try {
      if (p === '') await pageHome();
      else if (p === 'products') await pageProducts(q);
      else if (p === 'product') await pageProduct(parts[1]);
      else if (p === 'cart') await pageCart();
      else if (p === 'checkout') await pageCheckout();
      else if (p === 'orders') await pageOrders();
      else if (p === 'vouchers') await pageVouchers();
      else if (p === 'blog') await pageBlog(parts[1]);
      else if (p === 'account') await pageAccount();
      else if (p === 'login') pageLogin();
      else if (p === 'register') pageRegister();
      else $app.innerHTML = '<div class="empty card">Không tìm thấy trang</div>';
    } catch (e) {
      $app.innerHTML = `<div class="card" style="margin-top:24px"><h3>Có lỗi xảy ra</h3><div class="err">${esc(e.message)}</div></div>`;
      if (!Auth.token && /đăng nhập/i.test(e.message)) renderNav();
    }
  }
  window.addEventListener('hashchange', render);
  renderNav().then(render);
})();

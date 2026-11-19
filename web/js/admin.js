// Trang quản trị. Hash router: #/dashboard, #/products, #/orders ...
(function () {
  const { api, Auth, esc, money, dateStr, ok, fail, modal, readImage, STATUS, statusPill, img } = App;
  const $root = document.getElementById('root');
  const A = (window.A = {});
  let $main;
  // $(selector[, root]) hoặc $(root, selector)
  const $ = (a, b) => (typeof a === 'string' ? (b || document).querySelector(a) : a.querySelector(b));
  const val = (r, s) => { const e = $(r, s); return e ? e.value.trim() : ''; };
  const opts = (arr, v, k, l) => arr.map(x => `<option value="${esc(x[k])}" ${String(x[k]) === String(v) ? 'selected' : ''}>${esc(x[l])}</option>`).join('');
  const codes = async t => { try { return (await api.get('/api/get-all-code', { type: t })).data || []; } catch (e) { return []; } };
  const fImg = p => { const d = (p.productDetail || [])[0]; return d && d.productImage && d.productImage[0] ? d.productImage[0].image : ''; };

  // ---------- đăng nhập admin ----------
  function loginView() {
    $root.innerHTML = `<div class="card" style="max-width:420px;margin:60px auto"><h1 style="margin-top:0">Đăng nhập quản trị</h1>
      <label>Email</label><input id="em" type="email"><label>Mật khẩu</label><input id="pw" type="password">
      <div style="margin-top:16px"><button class="btn" id="go" style="width:100%">Đăng nhập</button></div>
      <hr><div class="small muted">Chưa có tài khoản admin? <a href="#" id="first">Tạo admin đầu tiên</a> · <a href="index.html">Về cửa hàng</a></div></div>`;
    const submit = async () => {
      try {
        const r = await api.post('/api/login', { email: val($root, '#em'), password: $('#pw').value });
        if (r.user.roleId !== 'R1' && r.user.roleId !== 'R4') throw new Error('Tài khoản này không có quyền quản trị');
        Auth.set({ user: r.user, accessToken: r.accessToken }); start();
      } catch (e) { fail(e); }
    };
    $('#go').onclick = submit; $('#pw').onkeydown = e => { if (e.key === 'Enter') submit(); };
    $('#first').onclick = ev => {
      ev.preventDefault();
      modal('Tạo tài khoản admin', `<label>Email</label><input id="e"><label>Mật khẩu</label><input id="p" type="password"><label>Tên</label><input id="n" value="Admin">
        <div style="margin-top:14px"><button class="btn" id="mk">Tạo</button></div>`, (b, close) => {
        $('#mk', b).onclick = async () => {
          try {
            await api.post('/api/create-new-user', { email: val(b, '#e'), password: $('#p', b).value, firstName: val(b, '#n'), lastName: 'Admin', roleId: 'R1', genderId: 'G1', avatar: 'data:image/gif;base64,R0lGODlhAQABAIAAAMLCwgAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==' });
            ok('Đã tạo admin, hãy đăng nhập'); close();
          } catch (e) { fail(e); }
        };
      });
    };
  }

  // ---------- khung ----------
  const MENU = [['dashboard', '📊 Tổng quan'], ['products', '📦 Sản phẩm'], ['orders', '🧾 Đơn hàng'], ['stock', '🏬 Nhập kho'], ['users', '👥 Người dùng'],
    ['allcodes', '🏷️ Danh mục / Thương hiệu'], ['suppliers', '🚚 Nhà cung cấp'], ['typeship', '🛵 Vận chuyển'], ['vouchers', '🎟️ Voucher'],
    ['banners', '🖼️ Banner'], ['blogs', '📰 Bài viết'], ['setup', '⚙️ Khởi tạo dữ liệu']];
  function shell() {
    const cur = (location.hash.replace(/^#\//, '') || 'dashboard').split('?')[0];
    $root.innerHTML = `<div class="adm"><aside class="side"><div class="brand">mihkoa<span style="color:#fde047">-tech</span> admin</div>
      ${MENU.map(m => `<a href="#/${m[0]}" class="${cur === m[0] ? 'on' : ''}">${m[1]}</a>`).join('')}
      <a href="index.html">← Về cửa hàng</a><a href="#" onclick="A.logout();return false">Đăng xuất (${esc(Auth.user.firstName || Auth.user.email)})</a></aside>
      <main class="main" id="main"></main></div>`;
    $main = document.getElementById('main');
  }
  A.logout = () => { Auth.clear(); loginView(); };

  // ---------- CRUD tổng quát ----------
  async function crud(c) {
    $main.innerHTML = `<div class="row sb"><h1 style="margin:0">${c.title}</h1><div class="row">${c.toolbar || ''}<button class="btn" id="add">+ Thêm mới</button></div></div><div id="tbl" style="margin-top:16px"><div class="empty">Đang tải...</div></div>`;
    const rows = await c.list();
    const render = () => {
      document.getElementById('tbl').innerHTML = rows.length ? `<div class="tw"><table><tr>${c.cols.map(x => `<th>${x.h}</th>`).join('')}<th></th></tr>
        ${rows.map((r, i) => `<tr>${c.cols.map(x => `<td>${x.f(r)}</td>`).join('')}<td class="right" style="white-space:nowrap"><button class="btn ghost sm" data-e="${i}">Sửa</button> <button class="btn red sm" data-d="${i}">Xóa</button></td></tr>`).join('')}</table></div>` : '<div class="empty card">Chưa có dữ liệu</div>';
      document.querySelectorAll('[data-e]').forEach(b => b.onclick = () => form(rows[+b.dataset.e]));
      document.querySelectorAll('[data-d]').forEach(b => b.onclick = async () => {
        if (!confirm('Xóa mục này?')) return;
        try { await api.del(c.del, { id: rows[+b.dataset.d].id }); ok('Đã xóa'); crud(c); } catch (e) { fail(e); }
      });
    };
    const form = async (row) => {
      const extra = c.extra ? await c.extra() : {};
      const html = c.fields.map(f => {
        const v = row ? (row[f.k] === null || row[f.k] === undefined ? '' : row[f.k]) : (f.def || '');
        const o = f.opts ? f.opts(extra) : null;
        let inp;
        if (f.type === 'textarea') inp = `<textarea data-k="${f.k}">${esc(v)}</textarea>`;
        else if (f.type === 'select') inp = `<select data-k="${f.k}"><option value="">-- chọn --</option>${o}</select>`.replace(`value="${esc(v)}"`, `value="${esc(v)}" selected`);
        else if (f.type === 'image') inp = `<input type="file" accept="image/*" data-k="${f.k}" data-img="1"><img class="thumb" style="margin-top:6px;width:90px;height:90px" src="${img(v)}" data-keep="${v ? 1 : ''}">`;
        else if (f.type === 'date') inp = `<input type="date" data-k="${f.k}" value="${v ? new Date(Number(v) || v).toISOString().slice(0, 10) : ''}">`;
        else inp = `<input type="${f.type || 'text'}" data-k="${f.k}" value="${esc(v)}">`;
        return `<label>${f.l}</label>${inp}`;
      }).join('');
      modal(row ? 'Sửa' : 'Thêm mới', html + '<div style="margin-top:14px"><button class="btn" id="sv">Lưu</button></div>', (b, close) => {
        const imgs = {};
        b.querySelectorAll('[data-img]').forEach(inp => inp.onchange = async () => {
          try { imgs[inp.dataset.k] = await readImage(inp.files[0], 700); inp.nextElementSibling.src = imgs[inp.dataset.k]; } catch (e) { fail(e); }
        });
        $('#sv', b).onclick = async () => {
          const d = {};
          c.fields.forEach(f => {
            const el = b.querySelector(`[data-k="${f.k}"]`);
            if (f.type === 'image') d[f.k] = imgs[f.k] || (row ? row[f.k] : '');
            else if (f.type === 'date') d[f.k] = el.value ? String(new Date(el.value).getTime()) : '';
            else d[f.k] = el.value.trim();
          });
          if (c.pre) c.pre(d, row);
          try {
            if (row) await api.put(c.update, { id: row.id, ...d }); else await api.post(c.create, d);
            ok('Đã lưu'); close(); crud(c);
          } catch (e) { fail(e); }
        };
      });
    };
    document.getElementById('add').onclick = () => form(null);
    render();
  }

  // ---------- Tổng quan ----------
  async function pageDashboard() {
    $main.innerHTML = '<h1>Tổng quan</h1><div class="empty">Đang tải...</div>';
    const year = String(new Date().getFullYear());
    const [card, month] = await Promise.all([
      api.get('/api/get-count-card-statistic').then(r => r.data).catch(() => ({})),
      api.get('/api/get-statistic-by-month', { year }).then(r => r.data).catch(() => null)
    ]);
    const vals = month ? month.arrayMonthValue : [], mx = Math.max(1, ...vals);
    $main.innerHTML = `<h1>Tổng quan</h1><div class="stat">
      <div class="card"><span class="muted">Người dùng</span><b>${card.countUser ?? '—'}</b></div>
      <div class="card"><span class="muted">Sản phẩm</span><b>${card.countProduct ?? '—'}</b></div>
      <div class="card"><span class="muted">Đơn hàng (không hủy)</span><b>${card.countOrder ?? '—'}</b></div>
      <div class="card"><span class="muted">Đánh giá</span><b>${card.countReview ?? '—'}</b></div></div>
      <h2>Doanh thu theo tháng năm ${year} (đơn hoàn thành)</h2>
      <div class="card" style="padding-bottom:36px">${month ? `<div class="bars">${vals.map((v, i) => `<div style="height:${Math.round(v / mx * 100)}%" title="${money(v)}"><span>T${i + 1}</span></div>`).join('')}</div>
        <div class="small muted" style="margin-top:28px">Tổng năm: <b>${money(vals.reduce((a, b) => a + b, 0))}</b></div>` : '<div class="muted">Chưa có số liệu</div>'}</div>`;
  }

  // ---------- Sản phẩm ----------
  async function pageProducts() {
    $main.innerHTML = '<div class="row sb"><h1 style="margin:0">Sản phẩm</h1><button class="btn" id="new">+ Thêm sản phẩm</button></div><div id="tbl" style="margin-top:16px"><div class="empty">Đang tải...</div></div>';
    const list = (await api.get('/api/get-all-product-admin', { keyword: '', categoryId: 'ALL', brandId: 'ALL' })).data || [];
    document.getElementById('tbl').innerHTML = list.length ? `<div class="tw"><table><tr><th></th><th>Tên</th><th>Danh mục</th><th>Thương hiệu</th><th>Giá</th><th>Trạng thái</th><th></th></tr>
      ${list.map(p => `<tr><td><img class="thumb" src="${img(fImg(p))}"></td><td><b>${esc(p.name)}</b><div class="small muted">${(p.productDetail || []).length} phiên bản</div></td>
      <td>${esc((p.categoryData || {}).value)}</td><td>${esc((p.brandData || {}).value)}</td><td>${money(p.price)}</td>
      <td>${p.statusId === 'S1' ? '<span class="pill s6">Đang bán</span>' : '<span class="pill s7">Đã ẩn</span>'}</td>
      <td class="right" style="white-space:nowrap"><button class="btn sm" data-v="${p.id}">Phiên bản/Kho</button> <button class="btn ghost sm" data-e="${p.id}">Sửa</button>
      <button class="btn ${p.statusId === 'S1' ? 'red' : 'ghost'} sm" data-t="${p.id}" data-s="${p.statusId}">${p.statusId === 'S1' ? 'Ẩn' : 'Hiện'}</button></td></tr>`).join('')}</table></div>` : '<div class="empty card">Chưa có sản phẩm. Bấm "Thêm sản phẩm". (Nhớ vào "Khởi tạo dữ liệu" trước để có danh mục, thương hiệu, size.)</div>';
    document.getElementById('new').onclick = () => productForm(null);
    document.querySelectorAll('[data-e]').forEach(b => b.onclick = () => productForm(list.find(x => x.id === +b.dataset.e)));
    document.querySelectorAll('[data-v]').forEach(b => b.onclick = () => variantsModal(+b.dataset.v));
    document.querySelectorAll('[data-t]').forEach(b => b.onclick = async () => {
      try { await api.post(b.dataset.s === 'S1' ? '/api/unactive-product' : '/api/active-product', { id: +b.dataset.t }); pageProducts(); } catch (e) { fail(e); }
    });
  }
  async function productForm(p) {
    const [cats, brands, sizes] = await Promise.all([codes('CATEGORY'), codes('BRAND'), codes('SIZE')]);
    const v = k => esc(p ? (p[k] || '') : '');
    const create = !p;
    modal(p ? 'Sửa sản phẩm' : 'Thêm sản phẩm', `<div class="grid g2">
      <div><label>Tên sản phẩm</label><input data-k="name" value="${v('name')}"></div>
      <div><label>Xuất xứ</label><input data-k="madeby" value="${v('madeby')}"></div>
      <div><label>Danh mục</label><select data-k="categoryId"><option value="">-- chọn --</option>${opts(cats, p && p.categoryId, 'code', 'value')}</select></div>
      <div><label>Thương hiệu</label><select data-k="brandId"><option value="">-- chọn --</option>${opts(brands, p && p.brandId, 'code', 'value')}</select></div>
      <div><label>Chất liệu</label><input data-k="material" value="${v('material')}"></div>
      ${create ? `<div><label>Tên phiên bản (vd: Core i5 / Đen...)</label><input data-k="nameDetail" value="Mặc định"></div>
      <div><label>Giá gốc</label><input type="number" data-k="originalPrice"></div><div><label>Giá bán</label><input type="number" data-k="discountPrice"></div>
      <div><label>Dung lượng / Cấu hình</label><select data-k="sizeId">${opts(sizes, '', 'code', 'value')}</select></div><div><label>Cân nặng (g)</label><input type="number" data-k="weight"></div>
      <div><label>Rộng</label><input type="number" data-k="width"></div><div><label>Cao</label><input type="number" data-k="height"></div>
      <div style="grid-column:1/-1"><label>Ảnh</label><input type="file" accept="image/*" id="pimg"><img id="pprev" class="thumb" style="width:90px;height:90px;margin-top:6px"></div>
      <div style="grid-column:1/-1"><label>Mô tả ngắn</label><input data-k="description"></div>` : ''}
      <div style="grid-column:1/-1"><label>Nội dung chi tiết (HTML hoặc chữ thường)</label><textarea data-k="contentHTML">${esc(p ? p.contentHTML || '' : '')}</textarea></div></div>
      <div style="margin-top:14px"><button class="btn" id="sv">Lưu</button></div>`, (b, close) => {
      let image = '';
      const inp = $('#pimg', b);
      if (inp) inp.onchange = async () => { try { image = await readImage(inp.files[0]); $('#pprev', b).src = image; } catch (e) { fail(e); } };
      $('#sv', b).onclick = async () => {
        const d = {}; b.querySelectorAll('[data-k]').forEach(e => d[e.dataset.k] = e.value.trim());
        d.contentMarkdown = d.contentHTML;
        try {
          if (p) await api.put('/api/update-product', { id: p.id, ...d });
          else { if (!image) throw new Error('Hãy chọn ảnh sản phẩm'); await api.post('/api/create-new-product', { ...d, image }); }
          ok('Đã lưu'); close(); pageProducts();
        } catch (e) { fail(e); }
      };
    });
  }
  async function variantsModal(id) {
    const [r, sizes, suppliers] = await Promise.all([api.get('/api/get-detail-product-by-id', { id }), codes('SIZE'), api.get('/api/get-all-supplier', { keyword: '' }).then(x => x.data || []).catch(() => [])]);
    const p = r.data;
    const html = () => `<div class="muted small">Tồn kho = tổng nhập kho − số đã đặt (đơn chưa hủy)</div>
      ${(p.productDetail || []).map(d => `<div class="card" style="margin:10px 0"><div class="row sb"><div><b>${esc(d.nameDetail)}</b> · <span class="price">${money(d.discountPrice)}</span></div>
        <div><button class="btn ghost sm" data-ai="${d.id}">+ Ảnh</button> <button class="btn ghost sm" data-as="${d.id}">+ Size</button></div></div>
        <div class="thumbs">${(d.productImage || []).map(im => `<span style="position:relative"><img src="${img(im.image)}" style="cursor:default"><a href="#" data-di="${im.id}" style="position:absolute;top:0;right:4px;color:#dc2626">✕</a></span>`).join('')}</div>
        <table style="margin-top:8px"><tr><th>Cấu hình</th><th>Tồn kho</th><th></th></tr>${(d.productDetailSize || []).map(s => `<tr><td>${esc((s.sizeData || {}).value || s.sizeId)}</td><td>${s.stock}</td>
        <td class="right"><button class="btn sm" data-in="${s.id}">Nhập kho</button> <button class="btn red sm" data-ds="${s.id}">Xóa</button></td></tr>`).join('') || '<tr><td colspan="3" class="muted">Chưa có cấu hình</td></tr>'}</table></div>`).join('')}
      <button class="btn" id="avar">+ Thêm phiên bản</button>`;
    let close0;
    const open = () => {
      close0 = modal('Phiên bản & kho: ' + p.name, html(), (b) => {
        const reload = async () => { close0(); variantsModal(id); };
        b.querySelectorAll('[data-di]').forEach(a => a.onclick = async e => { e.preventDefault(); try { await api.del('/api/delete-product-detail-image', { id: +a.dataset.di }); reload(); } catch (x) { fail(x); } });
        b.querySelectorAll('[data-ds]').forEach(a => a.onclick = async () => { if (!confirm('Xóa cấu hình này?')) return; try { await api.del('/api/delete-product-detail-size', { id: +a.dataset.ds }); reload(); } catch (x) { fail(x); } });
        b.querySelectorAll('[data-in]').forEach(a => a.onclick = () => receiptForm(+a.dataset.in, suppliers, reload));
        b.querySelectorAll('[data-ai]').forEach(a => a.onclick = () => subForm('Thêm ảnh', `<label>Ảnh</label><input type="file" accept="image/*" id="f"><label>Chú thích</label><input id="c" value="Ảnh">`, async (m) => {
          const f = $('#f', m).files[0]; if (!f) throw new Error('Chọn ảnh'); await api.post('/api/create-product-detail-image', { id: +a.dataset.ai, caption: val(m, '#c') || 'Ảnh', image: await readImage(f) });
        }, reload));
        b.querySelectorAll('[data-as]').forEach(a => a.onclick = () => subForm('Thêm cấu hình', `<label>Dung lượng / Cấu hình</label><select id="z">${opts(sizes, '', 'code', 'value')}</select><div class="grid g3"><div><label>Rộng</label><input id="w" type="number"></div><div><label>Cao</label><input id="h" type="number"></div><div><label>Nặng (g)</label><input id="g" type="number"></div></div>`,
          async (m) => { await api.post('/api/create-product-detail-size', { productdetailId: +a.dataset.as, sizeId: val(m, '#z'), width: val(m, '#w'), height: val(m, '#h'), weight: val(m, '#g') }); }, reload));
        $('#avar', b).onclick = () => subForm('Thêm phiên bản', `<label>Tên phiên bản (vd: Core i5 / Đen...)</label><input id="n"><div class="grid g2"><div><label>Giá gốc</label><input id="o" type="number"></div><div><label>Giá bán</label><input id="d" type="number"></div></div><label>Mô tả</label><input id="s"><label>Ảnh</label><input type="file" accept="image/*" id="f">`,
          async (m) => { const f = $('#f', m).files[0]; if (!f) throw new Error('Chọn ảnh'); await api.post('/api/create-new-product-detail', { id: p.id, nameDetail: val(m, '#n'), originalPrice: val(m, '#o'), discountPrice: val(m, '#d'), description: val(m, '#s'), image: await readImage(f) }); }, reload);
      });
    };
    open();
  }
  function subForm(title, html, action, done) {
    modal(title, html + '<div style="margin-top:14px"><button class="btn" id="ok">Lưu</button></div>', (m, close) => {
      $('#ok', m).onclick = async () => { try { await action(m); ok('Đã lưu'); close(); done && done(); } catch (e) { fail(e); } };
    });
  }
  function receiptForm(sizeId, suppliers, done) {
    if (!suppliers.length) { fail(new Error('Chưa có nhà cung cấp. Hãy thêm ở mục "Nhà cung cấp" trước.')); return; }
    subForm('Nhập kho', `<label>Nhà cung cấp</label><select id="su">${opts(suppliers, '', 'id', 'name')}</select><div class="grid g2"><div><label>Số lượng</label><input id="q" type="number" min="1"></div><div><label>Giá nhập</label><input id="pr" type="number"></div></div>`,
      async (m) => { await api.post('/api/create-new-receipt', { userId: Auth.user.id, supplierId: +val(m, '#su'), productDetailSizeId: sizeId, quantity: +val(m, '#q'), price: +val(m, '#pr') }); }, done);
  }

  // ---------- Đơn hàng ----------
  async function pageOrders() {
    $main.innerHTML = '<h1>Đơn hàng</h1><div id="tbl"><div class="empty">Đang tải...</div></div>';
    const r = await api.get('/api/get-all-order', { statusId: 'ALL' });
    const list = r.data || [];
    document.getElementById('tbl').innerHTML = list.length ? `<div class="tw"><table><tr><th>Mã</th><th>Khách hàng</th><th>Ngày</th><th>Vận chuyển</th><th>Trạng thái</th><th></th></tr>
      ${list.map(o => `<tr><td>#${o.id}</td><td>${esc((o.addressUser || {}).shipName)}<div class="small muted">${esc((o.addressUser || {}).shipPhonenumber)}</div></td><td>${dateStr(o.createdAt)}</td>
      <td>${esc((o.typeShipData || {}).type)}</td><td>${statusPill(o.statusId)}</td><td class="right"><button class="btn ghost sm" data-o="${o.id}">Chi tiết</button></td></tr>`).join('')}</table></div>` : '<div class="empty card">Chưa có đơn hàng</div>';
    document.querySelectorAll('[data-o]').forEach(b => b.onclick = () => orderModal(+b.dataset.o));
  }
  async function orderModal(id) {
    const o = (await api.get('/api/get-detail-order', { id })).data;
    const items = o.orderDetail || [], sub = items.reduce((s, i) => s + i.quantity * i.realPrice, 0), ship = Number((o.typeShipData || {}).price || 0);
    const disc = App.voucherDiscount(o.voucherData && o.voucherData.id ? o.voucherData : null, sub);
    modal('Đơn #' + o.id, `<div>${statusPill(o.statusId)} <span class="muted small">${dateStr(o.createdAt)}</span></div>
      <div style="margin-top:8px"><b>${esc((o.addressUser || {}).shipName)}</b> · ${esc((o.addressUser || {}).shipPhonenumber)}<div class="small muted">${esc((o.addressUser || {}).shipAdress)}</div>${o.note ? `<div class="small">Ghi chú: ${esc(o.note)}</div>` : ''}</div>
      <table style="margin-top:10px">${items.map(i => `<tr><td>${esc((i.product || {}).name)}<div class="small muted">${esc((i.productDetail || {}).nameDetail)} · ${esc(((i.productDetailSize || {}).sizeData || {}).value)}</div></td><td>× ${i.quantity}</td><td class="right">${money(i.realPrice * i.quantity)}</td></tr>`).join('')}</table>
      <div class="right" style="margin-top:8px">Ship ${money(ship)} · Giảm ${money(disc)} · <b>Tổng ${money(sub + ship - disc)}</b></div>
      <label>Cập nhật trạng thái</label><div class="row"><select id="st" class="grow">${Object.keys(STATUS).map(k => `<option value="${k}" ${k === o.statusId ? 'selected' : ''}>${STATUS[k]}</option>`).join('')}</select><button class="btn" id="up">Cập nhật</button></div>`, (b, close) => {
      $('#up', b).onclick = async () => {
        try { await api.put('/api/update-status-order', { id: o.id, statusId: val(b, '#st'), dataOrder: { orderDetail: [] } }); ok('Đã cập nhật'); close(); pageOrders(); } catch (e) { fail(e); }
      };
    });
  }

  // ---------- Người dùng ----------
  async function pageUsers() {
    $main.innerHTML = '<h1>Người dùng</h1><div id="tbl"><div class="empty">Đang tải...</div></div>';
    const list = (await api.get('/api/get-all-user', { keyword: '' })).data || [];
    document.getElementById('tbl').innerHTML = `<div class="tw"><table><tr><th>Họ tên</th><th>Email</th><th>SĐT</th><th>Vai trò</th><th></th></tr>
      ${list.map(u => `<tr><td>${esc(u.firstName)} ${esc(u.lastName)}</td><td>${esc(u.email)}</td><td>${esc(u.phonenumber)}</td><td>${esc((u.roleData || {}).value || u.roleId)}</td>
      <td class="right">${u.id === Auth.user.id ? '' : `<button class="btn red sm" data-d="${u.id}">Xóa</button>`}</td></tr>`).join('')}</table></div>`;
    document.querySelectorAll('[data-d]').forEach(b => b.onclick = async () => { if (!confirm('Xóa người dùng này?')) return; try { await api.del('/api/delete-user', { id: +b.dataset.d }); pageUsers(); } catch (e) { fail(e); } });
  }

  // ---------- Phiếu nhập kho ----------
  async function pageStock() {
    $main.innerHTML = '<h1>Phiếu nhập kho</h1><div class="muted small">Để nhập thêm hàng: vào Sản phẩm → "Phiên bản/Kho" → "Nhập kho" ở từng size.</div><div id="tbl" style="margin-top:12px"><div class="empty">Đang tải...</div></div>';
    const list = (await api.get('/api/get-all-receipt', { keyword: '' })).data || [];
    document.getElementById('tbl').innerHTML = list.length ? `<div class="tw"><table><tr><th>Mã</th><th>Nhà cung cấp</th><th>Người nhập</th><th>Ngày</th><th></th></tr>
      ${list.map(r => `<tr><td>#${r.id}</td><td>${esc((r.supplierData || {}).name)}</td><td>${esc((r.userData || {}).firstName)}</td><td>${dateStr(r.createdAt)}</td><td class="right"><button class="btn red sm" data-d="${r.id}">Xóa</button></td></tr>`).join('')}</table></div>` : '<div class="empty card">Chưa có phiếu nhập</div>';
    document.querySelectorAll('[data-d]').forEach(b => b.onclick = async () => { if (!confirm('Xóa phiếu nhập? Tồn kho sẽ giảm tương ứng.')) return; try { await api.del('/api/delete-receipt', { id: +b.dataset.d }); pageStock(); } catch (e) { fail(e); } });
  }

  // ---------- Danh mục / Thương hiệu / ... ----------
  const CODE_TYPES = [['CATEGORY', 'Danh mục sản phẩm'], ['BRAND', 'Thương hiệu'], ['SIZE', 'Dung lượng / Cấu hình'], ['SUBJECT', 'Chủ đề bài viết'], ['TYPEVOUCHER', 'Loại giảm giá voucher'], ['ROLE', 'Vai trò'], ['GENDER', 'Giới tính']];
  function pageAllcodes(q) {
    const type = q.type || 'CATEGORY';
    return crud({
      title: 'Danh mục & thuộc tính', create: '/api/create-new-all-code', update: '/api/update-all-code', del: '/api/delete-all-code',
      toolbar: `<select id="tp" style="width:auto">${CODE_TYPES.map(t => `<option value="${t[0]}" ${t[0] === type ? 'selected' : ''}>${t[1]}</option>`).join('')}</select>`,
      list: async () => { setTimeout(() => { const s = document.getElementById('tp'); if (s) s.onchange = () => { location.hash = '#/allcodes?type=' + s.value; }; }, 0); return codes(type); },
      cols: [{ h: 'Mã (code)', f: r => esc(r.code) }, { h: 'Tên hiển thị', f: r => esc(r.value) }],
      fields: [{ k: 'value', l: 'Tên hiển thị' }, { k: 'code', l: 'Mã (viết liền, không trùng, vd: C5)' }], pre: d => { d.type = type; }
    });
  }

  const pages = {
    dashboard: pageDashboard, products: pageProducts, orders: pageOrders, users: pageUsers, stock: pageStock, allcodes: pageAllcodes,
    suppliers: () => crud({ title: 'Nhà cung cấp', create: '/api/create-new-supplier', update: '/api/update-supplier', del: '/api/delete-supplier',
      list: async () => (await api.get('/api/get-all-supplier', { keyword: '' })).data || [],
      cols: [{ h: 'Tên', f: r => esc(r.name) }, { h: 'Địa chỉ', f: r => esc(r.address) }, { h: 'SĐT', f: r => esc(r.phonenumber) }, { h: 'Email', f: r => esc(r.email) }],
      fields: [{ k: 'name', l: 'Tên' }, { k: 'address', l: 'Địa chỉ' }, { k: 'phonenumber', l: 'Số điện thoại' }, { k: 'email', l: 'Email' }] }),
    typeship: () => crud({ title: 'Phương thức vận chuyển', create: '/api/create-new-typeship', update: '/api/update-typeship', del: '/api/delete-typeship',
      list: async () => (await api.get('/api/get-all-typeship', { keyword: '' })).data || [],
      cols: [{ h: 'Tên', f: r => esc(r.type) }, { h: 'Phí', f: r => money(r.price) }],
      fields: [{ k: 'type', l: 'Tên phương thức' }, { k: 'price', l: 'Phí (₫)', type: 'number' }] }),
    banners: () => crud({ title: 'Banner', create: '/api/create-new-banner', update: '/api/update-banner', del: '/api/delete-banner',
      list: async () => (await api.get('/api/get-all-banner', { keyword: '' })).data || [],
      cols: [{ h: 'Ảnh', f: r => `<img class="thumb" style="width:90px" src="${img(r.image)}">` }, { h: 'Tên', f: r => esc(r.name) }, { h: 'Mô tả', f: r => esc(r.description) }],
      fields: [{ k: 'name', l: 'Tên' }, { k: 'description', l: 'Mô tả' }, { k: 'image', l: 'Ảnh', type: 'image' }] }),
    blogs: () => crud({ title: 'Bài viết', create: '/api/create-new-blog', update: '/api/update-blog', del: '/api/delete-blog',
      list: async () => (await api.get('/api/get-all-blog', { keyword: '', subjectId: '' })).data || [],
      extra: async () => ({ subjects: await codes('SUBJECT') }),
      cols: [{ h: 'Ảnh', f: r => `<img class="thumb" src="${img(r.image)}">` }, { h: 'Tiêu đề', f: r => esc(r.title) }, { h: 'Chủ đề', f: r => esc((r.subjectData || {}).value) }, { h: 'Ngày', f: r => dateStr(r.createdAt) }],
      fields: [{ k: 'title', l: 'Tiêu đề' }, { k: 'shortdescription', l: 'Mô tả ngắn' }, { k: 'subjectId', l: 'Chủ đề', type: 'select', opts: e => opts(e.subjects, '', 'code', 'value') },
        { k: 'image', l: 'Ảnh', type: 'image' }, { k: 'contentHTML', l: 'Nội dung (HTML hoặc chữ thường)', type: 'textarea' }],
      pre: d => { d.contentMarkdown = d.contentHTML; d.userId = Auth.user.id; } }),
    vouchers: pageVouchers, setup: pageSetup
  };

  // ---------- Voucher (gồm loại voucher) ----------
  async function pageVouchers() {
    $main.innerHTML = `<div class="row sb"><h1 style="margin:0">Voucher</h1><div class="row"><button class="btn ghost" id="tv">Quản lý loại voucher</button><button class="btn" id="nv">+ Thêm voucher</button></div></div><div id="tbl" style="margin-top:16px"></div>`;
    document.getElementById('tv').onclick = () => typeVoucherModal();
    const [r, tvs] = await Promise.all([api.get('/api/get-all-voucher', {}), api.get('/api/get-all-typevoucher', {}).then(x => x.data || []).catch(() => [])]);
    const list = r.data || [];
    const d = x => x ? new Date(Number(x) || x).toLocaleDateString('vi-VN') : '';
    document.getElementById('tbl').innerHTML = list.length ? `<div class="tw"><table><tr><th>Mã</th><th>Giảm</th><th>Từ - đến</th><th>Đã dùng / SL</th><th></th></tr>
      ${list.map(v => { const t = v.typeVoucherOfVoucherData || {}, pc = /percent|phan|%/.test(String((t.typeVoucherData || {}).code || '').toLowerCase());
        return `<tr><td><b>${esc(v.codeVoucher)}</b></td><td>${pc ? t.value + '%' : money(t.value)}${t.maxValue ? ` (tối đa ${money(t.maxValue)})` : ''}</td><td>${d(v.fromDate)} - ${d(v.toDate)}</td><td>${v.usedAmount || 0} / ${v.amount}</td>
        <td class="right"><button class="btn ghost sm" data-e="${v.id}">Sửa</button> <button class="btn red sm" data-d="${v.id}">Xóa</button></td></tr>`; }).join('')}</table></div>` : '<div class="empty card">Chưa có voucher. Tạo "loại voucher" trước, rồi thêm voucher.</div>';
    const form = v => {
      if (!tvs.length) { fail(new Error('Hãy tạo "loại voucher" trước')); return; }
      const dt = x => x ? new Date(Number(x) || x).toISOString().slice(0, 10) : '';
      subForm(v ? 'Sửa voucher' : 'Thêm voucher', `<label>Mã voucher</label><input id="c" value="${esc(v ? v.codeVoucher : '')}"><label>Loại voucher</label><select id="t">${tvs.map(t => `<option value="${t.id}" ${v && v.typeVoucherId === t.id ? 'selected' : ''}>${t.typeVoucher === 'percent' ? t.value + '%' : money(t.value)} (${esc(t.typeVoucher)}, tối thiểu ${money(t.minValue)})</option>`).join('')}</select>
        <div class="grid g3"><div><label>Từ ngày</label><input type="date" id="f" value="${dt(v && v.fromDate)}"></div><div><label>Đến ngày</label><input type="date" id="to" value="${dt(v && v.toDate)}"></div><div><label>Số lượng</label><input type="number" id="a" value="${v ? v.amount : 10}"></div></div>`,
        async m => {
          const body = { codeVoucher: val(m, '#c'), typeVoucherId: +val(m, '#t'), fromDate: String(new Date(val(m, '#f')).getTime()), toDate: String(new Date(val(m, '#to')).getTime()), amount: +val(m, '#a') };
          if (v) await api.put('/api/update-voucher', { id: v.id, ...body }); else await api.post('/api/create-new-voucher', body);
        }, pageVouchers);
    };
    document.getElementById('nv').onclick = () => form(null);
    document.querySelectorAll('[data-e]').forEach(b => b.onclick = () => form(list.find(x => x.id === +b.dataset.e)));
    document.querySelectorAll('[data-d]').forEach(b => b.onclick = async () => { if (!confirm('Xóa voucher?')) return; try { await api.del('/api/delete-voucher', { id: +b.dataset.d }); pageVouchers(); } catch (e) { fail(e); } });
  }
  async function typeVoucherModal() {
    const [tvs, kinds] = await Promise.all([api.get('/api/get-all-typevoucher', {}).then(x => x.data || []), codes('TYPEVOUCHER')]);
    modal('Loại voucher', `<table>${tvs.map(t => `<tr><td>${t.typeVoucher === 'percent' ? t.value + '%' : money(t.value)} <span class="muted small">(${esc(t.typeVoucher)}) · tối thiểu ${money(t.minValue)} · tối đa ${money(t.maxValue)}</span></td><td class="right"><button class="btn red sm" data-d="${t.id}">Xóa</button></td></tr>`).join('') || '<tr><td class="muted">Chưa có</td></tr>'}</table>
      <h3 style="margin-top:14px">Thêm loại mới</h3>
      <label>Kiểu giảm</label><select id="k">${opts(kinds, '', 'code', 'value') || '<option value="percent">percent</option><option value="money">money</option>'}</select>
      <div class="grid g3"><div><label>Giá trị (% hoặc ₫)</label><input id="v" type="number"></div><div><label>Giảm tối đa</label><input id="mx" type="number"></div><div><label>Đơn tối thiểu</label><input id="mn" type="number" value="0"></div></div>
      <div style="margin-top:12px"><button class="btn" id="ad">Thêm</button></div><div class="small muted" style="margin-top:6px">Mã kiểu giảm chứa chữ "percent" sẽ tính theo %, còn lại tính theo số tiền.</div>`, (b, close) => {
      b.querySelectorAll('[data-d]').forEach(x => x.onclick = async () => { try { await api.del('/api/delete-typevoucher', { id: +x.dataset.d }); close(); typeVoucherModal(); } catch (e) { fail(e); } });
      $('#ad', b).onclick = async () => { try { await api.post('/api/create-new-typevoucher', { typeVoucher: val(b, '#k'), value: +val(b, '#v'), maxValue: +val(b, '#mx') || 0, minValue: +val(b, '#mn') || 0 }); ok('Đã thêm'); close(); typeVoucherModal(); } catch (e) { fail(e); } };
    });
  }

  // ---------- Khởi tạo dữ liệu ----------
  const SEED = {
    CATEGORY: [['C1', 'Laptop'], ['C2', 'CPU - Vi xử lý'], ['C3', 'VGA - Card màn hình'], ['C4', 'RAM'], ['C5', 'SSD - HDD'], ['C6', 'Mainboard'], ['C7', 'Nguồn - Case - Tản nhiệt'], ['C8', 'Màn hình'], ['C9', 'Bàn phím - Chuột'], ['C10', 'Tai nghe - Loa'], ['C11', 'Thiết bị mạng'], ['C12', 'Phụ kiện']],
    BRAND: [['B1', 'Intel'], ['B2', 'AMD'], ['B3', 'NVIDIA'], ['B4', 'ASUS'], ['B5', 'MSI'], ['B6', 'Gigabyte'], ['B7', 'Kingston'], ['B8', 'Samsung'], ['B9', 'Dell'], ['B10', 'HP'], ['B11', 'Lenovo'], ['B12', 'Logitech'], ['B13', 'Thương hiệu khác']],
    SIZE: [['SZ-STD', 'Tiêu chuẩn'], ['SZ-8G', '8GB'], ['SZ-16G', '16GB'], ['SZ-32G', '32GB'], ['SZ-256', '256GB'], ['SZ-512', '512GB'], ['SZ-1T', '1TB'], ['SZ-2T', '2TB']],
    'STATUS-ORDER': [['S3', 'Chờ xác nhận'], ['S4', 'Đã xác nhận'], ['S5', 'Đang giao'], ['S6', 'Hoàn thành'], ['S7', 'Đã hủy']],
    STATUS: [['S1', 'Hoạt động'], ['S2', 'Ngừng hoạt động']],
    ROLE: [['R1', 'Admin'], ['R2', 'Khách hàng'], ['R3', 'Shipper'], ['R4', 'Nhân viên']],
    GENDER: [['G1', 'Nam'], ['G2', 'Nữ'], ['G3', 'Khác']],
    TYPEVOUCHER: [['percent', 'Giảm theo %'], ['money', 'Giảm theo số tiền']],
    SUBJECT: [['SUB1', 'Tin công nghệ'], ['SUB2', 'Khuyến mãi']]
  };
  function pageSetup() {
    $main.innerHTML = `<h1>Khởi tạo dữ liệu</h1><div class="card"><p>Database mới tạo đang trống. Bấm nút dưới để thêm các dữ liệu nền cần thiết: danh mục (linh kiện PC, laptop...), thương hiệu, dung lượng, trạng thái đơn hàng, vai trò, giới tính, loại voucher, chủ đề bài viết và 2 phương thức vận chuyển. Dòng nào đã có sẽ được bỏ qua.</p>
      <button class="btn" id="seed">Tạo dữ liệu mẫu</button><pre id="log" class="small muted" style="white-space:pre-wrap"></pre></div>`;
    document.getElementById('seed').onclick = async (ev) => {
      ev.target.disabled = true; const log = document.getElementById('log'); let n = 0, skip = 0;
      try {
        for (const type of Object.keys(SEED)) {
          const have = (await codes(type)).map(x => x.code);
          for (const [code, value] of SEED[type]) {
            if (have.includes(code)) { skip++; continue; }
            await api.post('/api/create-new-all-code', { type, code, value }); n++;
          }
          log.textContent += `✓ ${type}\n`;
        }
        const ships = (await api.get('/api/get-all-typeship', { keyword: '' })).data || [];
        if (!ships.length) { await api.post('/api/create-new-typeship', { type: 'Giao tiêu chuẩn', price: 30000 }); await api.post('/api/create-new-typeship', { type: 'Giao nhanh', price: 50000 }); log.textContent += '✓ Vận chuyển\n'; }
        ok(`Xong: thêm ${n} mục, bỏ qua ${skip} mục đã có`);
      } catch (e) { fail(e); log.textContent += '✗ ' + e.message + '\n'; }
      ev.target.disabled = false;
    };
  }

  // ---------- router ----------
  async function render() {
    if (!Auth.user || !Auth.isAdmin()) return loginView();
    shell();
    const h = location.hash.replace(/^#\//, '') || 'dashboard';
    const [name, qs] = h.split('?'); const q = Object.fromEntries(new URLSearchParams(qs || ''));
    try { await (pages[name] || pageDashboard)(q); }
    catch (e) {
      if (!Auth.token) return loginView();
      $main.innerHTML = `<div class="card"><h3>Có lỗi xảy ra</h3><div class="err">${esc(e.message)}</div></div>`;
    }
  }
  function start() { render(); }
  window.addEventListener('hashchange', () => { if (Auth.user) render(); });
  start();
})();

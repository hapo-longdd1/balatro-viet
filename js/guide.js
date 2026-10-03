'use strict';
// ================= HƯỚNG DẪN CHƠI =================
const GUIDE_SEEN_KEY = 'balatro_vn_guide_seen';

// lá bài mẫu: 'AS' = Át Bích, 'TH' = 10 Cơ; thêm '*' để làm mờ (lá không được tính điểm)
function gCards(list, size = 'micro') {
  const rk = { A: 14, K: 13, Q: 12, J: 11, T: 10 };
  return `<div class="g-cards">${list.split(' ').map((t) => {
    const dim = t.endsWith('*');
    const c = t.replace('*', '');
    const o = c.length > 2 ? JSON.parse(c) : null;
    const card = o || { kind: 'card', rank: rk[c[0]] || +c[0], suit: c[1], bonus: 0 };
    return `<div class="${size}card ${dim ? 'g-dim' : ''}">${UI.cardFace(card)}</div>`;
  }).join('')}</div>`;
}
function gFace(o) { return `<div class="microcard">${UI.faceHTML(o)}</div>`; }
function gCM(c, m, total) {
  return `<div class="g-cm"><span class="chipsbox s">${c}</span><b class="c-mult">X</b><span class="multbox s">${m}</span>${total != null ? `<b>=</b><span class="g-total"><span class="chipico"></span>${total}</span>` : ''}</div>`;
}

const GUIDE = [
  {
    title: 'Mục Tiêu',
    html: () => `
      <p class="g-lead">Balatro là game <b class="c-attn">bài poker</b> kiểu roguelike: đánh các tay bài poker để <b class="c-chips">ghi điểm</b>, vượt qua các <b>Mù</b> và mạnh dần lên nhờ <b>Joker</b>.</p>
      <div class="g-row g-center">
        <div class="g-blind">${UI.blindChip('small', null, 64)}<span>Mù Nhỏ</span></div><span class="g-arrow">➜</span>
        <div class="g-blind">${UI.blindChip('big', null, 64)}<span>Mù Lớn</span></div><span class="g-arrow">➜</span>
        <div class="g-blind">${UI.blindChip('boss', 'hook', 64)}<span>Mù Trùm</span></div>
      </div>
      <p>3 Mù = <b class="c-attn">1 Ante</b>. Mỗi Mù yêu cầu một số điểm tối thiểu, càng về sau càng cao.</p>
      <p>Vượt qua <b class="c-attn">Mù Trùm của Ante 8</b> là <b class="c-attn">CHIẾN THẮNG</b>. Sau đó có thể chơi tiếp chế độ Vô Tận.</p>
      <p>Hết lượt đánh mà chưa đủ điểm là <b class="c-mult">THUA</b> — ván chơi kết thúc, bắt đầu lại từ đầu.</p>`,
  },
  {
    title: 'Cách Ghi Điểm',
    html: () => `
      <p class="g-lead">Chọn tối đa <b>5 lá</b> trên tay rồi bấm <b class="c-chips">Đánh Bài</b>.</p>
      <div class="g-formula"><span class="chipsbox s">Chip</span><b class="c-mult">X</b><span class="multbox s">Nhân</span><b>=</b><span>Điểm</span></div>
      <p><b class="c-chips">Chip</b> = Chip gốc của loại tay bài + giá trị từng lá <b>được tính điểm</b>: lá 2–10 = đúng số, <b>J Q K</b> = 10, <b>Át</b> = 11.</p>
      <p><b class="c-mult">Nhân</b> = hệ số Nhân gốc của loại tay bài, rồi được Joker, Tarot… cộng hoặc <b class="t-x">X</b> nhân thêm.</p>
      <div class="g-example">
        <div class="g-ex-title">Ví dụ: <b class="c-attn">Đôi Át</b></div>
        ${gCards('AS AH 7D* 4C* 2H*', 'mini')}
        <div class="g-ex-calc">(10 + 11 + 11) Chip × 2 Nhân</div>
        ${gCM(32, 2, 64)}
        <div class="g-note">3 lá mờ không thuộc tay Đôi nên <b>không</b> cộng Chip.</div>
      </div>`,
  },
  {
    title: 'Các Tay Bài',
    html: () => {
      const ex = {
        'High Card': 'AS 9D* 7C* 4H* 2S*', 'Pair': 'KH KS 7D* 4C* 2H*', 'Two Pair': '9S 9H 5D 5C 2H*',
        'Three of a Kind': 'QC QD QH 8S* 3D*', 'Straight': '9C 8D 7S 6H 5C', 'Flush': 'KD JD 8D 6D 2D',
        'Full House': 'TS TH TD 4C 4H', 'Four of a Kind': '7S 7H 7D 7C KS*', 'Straight Flush': '9H 8H 7H 6H 5H',
        'Five of a Kind': 'AS AH AD AC AS', 'Flush House': 'QH QH QH 5H 5H', 'Flush Five': '8S 8S 8S 8S 8S',
      };
      const rows = HAND_KEYS.slice().reverse().map((k) => {
        const H0 = HANDS[k];
        return `<div class="g-hand ${H0.secret ? 'secret' : ''}"><div class="g-hn"><b>${H0.vn}</b>${H0.secret ? ' <span class="badge" style="--bc:#8a5cc7">bí mật</span>' : ''}<div class="g-hx">${H0.ex}</div></div>${gCards(ex[k])}${gCM(H0.chips, H0.mult)}</div>`;
      }).join('');
      return `<p class="g-lead">Từ yếu đến mạnh. Số bên phải là <b class="c-chips">Chip</b> × <b class="c-mult">Nhân</b> gốc ở cấp 1 (tăng khi dùng lá <b class="c-planet" style="color:var(--planet)">Hành Tinh</b>).</p><div class="g-hands">${rows}</div>
        <p class="g-note">Sảnh có thể là A-2-3-4-5 hoặc 10-J-Q-K-A, không được vòng qua (K-A-2). Tay bí mật chỉ tạo được khi có lá trùng (vd. nhờ Tarot).</p>`;
    },
  },
  {
    title: 'Lượt Đánh & Bỏ Bài',
    html: () => `
      <div class="g-row g-center">
        <div class="g-stat"><div class="lbl">Lượt đánh</div><div class="v c-chips">4</div></div>
        <div class="g-stat"><div class="lbl">Lượt bỏ</div><div class="v c-mult">3</div></div>
        <div class="g-stat"><div class="lbl">Lá trên tay</div><div class="v c-attn">8</div></div>
      </div>
      <p><b class="c-chips">Đánh Bài</b>: dùng 1 lượt đánh để ghi điểm. Điểm các lượt <b>cộng dồn</b> trong cùng một Mù.</p>
      <p><b class="c-mult">Bỏ Bài</b>: bỏ tối đa 5 lá không cần để rút lá mới. Không ghi điểm, chỉ tốn lượt bỏ.</p>
      <p>Sau mỗi lượt, rút thêm bài cho đủ <b>8 lá</b>. Bấm <b class="c-attn">Hạng</b> / <b class="c-attn">Chất</b> để xếp bài cho dễ nhìn.</p>
      <p>Đủ điểm sớm thì mỗi <b>lượt đánh còn dư</b> được thưởng thêm <b class="c-money">$1</b>.</p>
      <div class="g-tip">💡 Đừng vội đánh! Dùng lượt bỏ để gom tay bài mạnh hơn trước.</div>`,
  },
  {
    title: 'Mù, Tiền & Thẻ Thưởng',
    html: () => `
      <p>Thắng Mù nhận <b class="c-money">tiền thưởng</b>: Mù Nhỏ $3, Mù Lớn $4, Mù Trùm $5.</p>
      <p><b class="c-money">Tiền lãi</b>: cuối mỗi vòng, cứ mỗi <b class="c-money">$5</b> đang giữ được thêm <b class="c-money">$1</b> (tối đa $5). Giữ từ $25 trở lên để lãi tối đa!</p>
      <div class="g-row"><div class="tagico">${TAGS.charm.icon}</div><p>Có thể <b class="c-mult">Bỏ Qua</b> Mù Nhỏ / Mù Lớn để nhận ngay một <b class="c-attn">Thẻ thưởng</b> (gói bài miễn phí, Joker hiếm, tiền…). Đổi lại mất tiền thưởng và lượt ghé cửa hàng.</p></div>
      <div class="g-row">${UI.blindChip('boss', 'goad', 56)}<p><b class="c-mult">Mù Trùm</b> có hiệu ứng gây khó: vô hiệu một chất, úp bài, giảm cấp tay bài… Xem trước ở màn chọn Mù để chuẩn bị.</p></div>
      <div class="g-tip">💡 Lá bị <b class="c-mult">vô hiệu</b> (có dấu ✕ đỏ) vẫn tạo được tay bài nhưng không cộng điểm.</div>`,
  },
  {
    title: 'Cửa Hàng',
    html: () => `
      <p class="g-lead">Sau mỗi Mù được ghé <b class="c-money">Cửa Hàng</b>. Bấm vào món đồ để xem nút Mua.</p>
      <div class="g-shop">
        <div class="g-item">${gFace({ kind: 'joker', key: 'joker', st: {}, s: {} })}<div><b>Joker</b> — hiệu ứng bị động, kích hoạt mỗi lượt đánh. Tối đa <b>5</b> ô. Thứ tự <b>trái → phải</b> rất quan trọng.</div></div>
        <div class="g-item">${gFace({ kind: 'planet', key: 'mercury' })}<div><b style="color:var(--planet)">Hành Tinh</b> — nâng cấp vĩnh viễn một loại tay bài (+Chip, +Nhân).</div></div>
        <div class="g-item">${gFace({ kind: 'tarot', key: 'magician' })}<div><b style="color:var(--tarot)">Tarot</b> — sửa lá bài: đổi chất, tăng hạng, cường hoá, tạo tiền…</div></div>
        <div class="g-item">${gFace({ kind: 'spectral', key: 'aura' })}<div><b style="color:var(--spectral)">Huyền Bí</b> — hiệu ứng cực mạnh nhưng thường kèm cái giá.</div></div>
        <div class="g-item">${gFace({ kind: 'pack', key: 'buffoon_n' })}<div><b>Gói Bài</b> — mở ra chọn 1 trong vài lá (Joker, Tarot, Hành Tinh, lá bài thường…).</div></div>
        <div class="g-item">${gFace({ kind: 'voucher', key: 'grabber' })}<div><b style="color:#f0a37f">Phiếu Ưu Đãi</b> — nâng cấp vĩnh viễn cho cả ván. Mỗi Ante có 1 phiếu.</div></div>
      </div>
      <p><b class="c-green" style="color:var(--green)">Đổi Mới</b> để làm mới hàng (giá tăng dần). Joker/vật phẩm có thể <b>Bán</b> lại lấy một nửa giá.</p>`,
  },
  {
    title: 'Nâng Cấp Lá Bài',
    html: () => {
      const demo = [
        [{ kind: 'card', rank: 14, suit: 'H', enh: 'mult', bonus: 0 }, 'Cường Hoá', 'Đổi lá thành Lá Nhân, Lá Thép, Lá Thủy Tinh, Lá Vàng, Lá May Mắn… (dùng Tarot).'],
        [{ kind: 'card', rank: 13, suit: 'S', ed: 'poly', bonus: 0 }, 'Phiên Bản', 'Ánh Kim (+50 Chip), Ba Chiều (+10 Nhân), Đa Sắc (X1,5 Nhân). Joker cũng có thể có phiên bản.'],
        [{ kind: 'card', rank: 7, suit: 'D', seal: 'red', bonus: 0 }, 'Dấu', 'Dấu Đỏ kích hoạt lại lá, Dấu Vàng cho tiền, Dấu Xanh tạo Hành Tinh, Dấu Tím tạo Tarot.'],
      ];
      return `<p class="g-lead">Bộ bài của bạn thay đổi trong suốt ván: thêm, xoá, cường hoá lá bài để tạo combo.</p>
        <div class="g-shop">${demo.map(([c, t, d]) => `<div class="g-item"><div class="minicard">${UI.cardFace(c)}</div><div><b>${t}</b> — ${d}</div></div>`).join('')}</div>
        <div class="g-tip">💡 Rê chuột (máy tính) hoặc <b>chạm giữ</b> (điện thoại) vào lá bất kỳ để xem nó làm gì. Bấm vào chồng bài ở góc phải để xem cả bộ bài.</div>`;
    },
  },
  {
    title: 'Điều Khiển & Mẹo',
    html: () => `
      <div class="g-two">
        <div class="g-box"><div class="g-bt">🖥️ Máy tính</div>
          <p>Bấm lá để chọn / bỏ chọn</p><p><b class="c-attn">Enter</b> = Đánh Bài</p><p><b class="c-attn">D</b> = Bỏ Bài</p><p><b class="c-attn">Esc</b> = Tuỳ chọn</p><p>Rê chuột để xem thông tin</p><p>Kéo thả để đổi chỗ lá bài / Joker</p></div>
        <div class="g-box"><div class="g-bt">📱 Điện thoại</div>
          <p>Chạm lá để chọn / bỏ chọn</p><p><b class="c-attn">Chạm giữ</b> để xem thông tin</p><p>Chạm Joker để xem mô tả + nút Bán</p><p>Kéo để đổi chỗ</p><p>Chơi được màn hình dọc và ngang</p><p>"Thêm vào màn hình chính" để chơi toàn màn hình</p></div>
      </div>
      <div class="g-tips">
        <div class="g-tip">💡 Chọn <b>1–2 loại tay bài</b> chủ lực và mua Hành Tinh tương ứng để nâng cấp.</div>
        <div class="g-tip">💡 Joker <b class="t-x">X Nhân</b> nên đặt <b>bên phải</b> Joker <b class="c-mult">+Nhân</b> để nhân được nhiều hơn.</div>
        <div class="g-tip">💡 Ante đầu tiên nên ưu tiên mua Joker cộng điểm.</div>
        <div class="g-tip">💡 Bấm <b>Thông Tin Ván</b> để xem cấp các tay bài và Mù Trùm sắp tới.</div>
      </div>`,
  },
];

UI.showGuide = function (page = 0) {
  page = Math.max(0, Math.min(GUIDE.length - 1, page));
  const pg = GUIDE[page];
  const dots = GUIDE.map((g, i) => `<button class="g-dot ${i === page ? 'on' : ''}" data-gp="${i}" title="${g.title}"></button>`).join('');
  const m = this.openOverlay(`<div class="modal-title">Hướng Dẫn <span class="g-pg">${page + 1}/${GUIDE.length}</span></div>
    <div class="g-sub">${pg.title}</div>
    <div class="g-dots">${dots}</div>
    <div class="modal-body guide">${pg.html()}</div>
    <div class="g-nav">
      <button class="btn orange" id="gPrev" ${page === 0 ? 'disabled' : ''}>◀ Trước</button>
      ${page === GUIDE.length - 1 ? '<button class="btn blue" id="gDone">Bắt Đầu Chơi!</button>' : '<button class="btn blue" id="gNext">Tiếp ▶</button>'}
    </div>
    ${this.backBtn('Đóng')}`, 'm-guide');
  this.guidePage = page;
  try { localStorage.setItem(GUIDE_SEEN_KEY, '1'); } catch (e) { /* */ }
  const go = (p) => { SND.play('card'); this.showGuide(p); };
  const prev = $('#gPrev', m), next = $('#gNext', m), done = $('#gDone', m);
  if (prev) prev.onclick = () => go(page - 1);
  if (next) next.onclick = () => go(page + 1);
  if (done) done.onclick = () => { SND.play('win'); this.closeOverlay(); if (!G.run) UI.showNewRun(); };
  $$('[data-gp]', m).forEach((b) => (b.onclick = () => go(+b.dataset.gp)));
  // vuốt trái / phải để chuyển trang trên điện thoại
  const body = $('.guide', m);
  let sx = null, sy = null;
  body.addEventListener('pointerdown', (e) => { sx = e.clientX; sy = e.clientY; });
  body.addEventListener('pointerup', (e) => {
    if (sx == null) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    sx = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) go(page + (dx < 0 ? 1 : -1));
  });
  this.bindClose(m);
  $$('.g-cards .microcard, .g-cards .minicard', m).forEach((el) => el.classList.add('noanim'));
};
function guideSeen() { try { return !!localStorage.getItem(GUIDE_SEEN_KEY); } catch (e) { return true; } }

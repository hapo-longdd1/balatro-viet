'use strict';
// ================= GIAO DIỆN =================
const CW = 108, CH = 150;
const UI = {
  W: 1600, H: 900, scale: 1,
  sprites: new Map(),
  selected: null,
  raised: new Set(),
  hoverUid: null,
  drag: null,
  planetMode: null,
  dispMoney: null,

  init() {
    this.touchMode = false;
    this.game = $('#game');
    this.spr = $('#sprites');
    this.pop = $('#popups');
    this.tip = $('#tooltip');
    this.ov = $('#overlay');
    this.resize();
    window.addEventListener('resize', () => this.resize());
    document.addEventListener('pointermove', (e) => this.onMove(e));
    document.addEventListener('pointerup', (e) => this.onUp(e));
    document.addEventListener('keydown', (e) => this.onKey(e));
    document.addEventListener('pointerdown', (e) => { SND.init(); this.touchMode = e.pointerType !== 'mouse'; }, true);
    document.addEventListener('touchend', () => SND.init(), { passive: true });
    document.addEventListener('gesturestart', (e) => e.preventDefault());
    document.addEventListener('contextmenu', (e) => { if (!e.target.closest('input')) e.preventDefault(); });
    if (window.visualViewport) window.visualViewport.addEventListener('resize', () => this.resize());
    this.ready = true;
    this.game.addEventListener('pointerdown', (e) => {
      if (!e.target.closest('.sprite') && !e.target.closest('.btn') && !e.target.closest('.acts')) {
        if (this.selected) { this.selected = null; this.layout(); }
      }
    });
  },
  safeInsets() {
    let pr = this._probe;
    if (!pr) {
      pr = this._probe = h('div', '');
      pr.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)';
      document.body.appendChild(pr);
    }
    const cs = getComputedStyle(pr);
    return { top: parseFloat(cs.paddingTop) || 0, bottom: parseFloat(cs.paddingBottom) || 0 };
  },
  resize() {
    const vv = window.visualViewport;
    const ins = this.safeInsets();
    const vw = vv ? vv.width : window.innerWidth;
    const vh = (vv ? vv.height : window.innerHeight) - ins.top - ins.bottom;
    const portrait = vh > vw * 1.05;
    const mobile = (window.matchMedia && matchMedia('(pointer: coarse)').matches) || Math.min(vw, vh) < 560;
    document.body.classList.toggle('portrait', portrait);
    document.body.classList.toggle('mobile', !!mobile);
    const W = portrait ? 800 : 1600;
    const H = portrait ? Math.round(Math.max(1500, Math.min(1800, (800 * vh) / vw))) : 900;
    const changed = W !== this.W || H !== this.H || portrait !== this.portrait;
    this.W = W; this.H = H; this.portrait = portrait; this.mobile = !!mobile;
    this.L = this.computeLayout();
    this.game.style.width = W + 'px';
    this.game.style.height = H + 'px';
    this.game.style.setProperty('--H', H + 'px');
    this.scale = Math.min(vw / W, vh / H);
    this.game.style.transform = `translate(${(vw - W * this.scale) / 2}px, ${ins.top + (vh - H * this.scale) / 2}px) scale(${this.scale})`;
    if (changed && this.ready) { this.hideTip(); this.render(); }
  },
  computeLayout() {
    if (!this.portrait) {
      return {
        joker: { x: 372, y: 30, w: 760 }, cons: { x: 1160, y: 30, w: 290 }, hand: { x: 400, y: 560, w: 1000 }, play: { x: 560, y: 320, w: 700 },
        deck: { x: 1474, y: 712 }, shopCards: { x: 660, y: 262, w: 740 }, voucher: { x: 470, y: 600 }, packs: { x: 820, y: 600, w: 520 },
        packItems: { x: 420, y: 300, w: 1000 }, use: { x: 900, y: 330 }, discard: { x: 1720, y: 520 }, blind: { x: 175, y: 120 },
        center: { x: 900, y: 420 }, tags: { x: 1530, y: 260 },
      };
    }
    // Bố cục dọc: HUD trên cùng, Joker, vùng đánh ở giữa, tay bài to ngay trên nút điều khiển
    const H = this.H;
    const handSc = 1.28;
    const handY = H - 150 - 20 - Math.round(75 + 75 * handSc + 10);
    const selTop = handY + 75 - 75 * handSc - 40;
    const playMid = Math.round((596 + selTop) / 2);
    return {
      joker: { x: 14, y: 348, w: 532, sc: 1.24 }, cons: { x: 562, y: 348, w: 226, sc: 1.24 },
      hand: { x: 34, y: handY, w: 732, sc: handSc, lift: 40 },
      play: { x: 30, y: playMid - 75, w: 740, sc: 1.12 }, deck: { x: 676, y: H - 176 },
      shopCards: { x: 50, y: 752, w: 700, sc: 1.16 }, voucher: { x: 98, y: 1048, sc: 1.16 }, packs: { x: 300, y: 1048, w: 456, sc: 1.16 },
      packItems: { x: 20, y: 698, w: 760, sc: 1.2 }, use: { x: 400, y: playMid - 75 }, discard: { x: 960, y: handY }, blind: { x: 190, y: 80 },
      center: { x: 400, y: playMid }, tags: { x: 120, y: 556 },
    };
  },
  toGame(e) {
    const r = this.game.getBoundingClientRect();
    return { x: (e.clientX - r.left) / this.scale, y: (e.clientY - r.top) / this.scale };
  },

  // ---------- Render tổng ----------
  render() {
    const r = G.run;
    document.body.dataset.phase = r ? r.phase : 'menu';
    if (this.hoverUid == null) this.hideTip();
    this.renderSidebar();
    this.renderCenter();
    this.renderControls();
    this.renderAreas();
    this.layout();
  },

  // ---------- Thanh bên trái ----------
  renderSidebar() {
    const sb = $('#sidebar');
    const r = G.run;
    if (!r) { sb.innerHTML = ''; return; }
    let top = '';
    if (r.phase === 'round' || r.phase === 'cashout' || r.phase === 'over') {
      const b = r.blind;
      const bi = b.type === 'boss' ? BOSSES[b.key] : BLIND_INFO[b.type];
      const desc = b.type === 'boss' && !b.disabled ? `<div class="sb-bossdesc">${fmt(bi.desc)}</div>` : '';
      top = `<div class="sb-top" style="--bc:${bi.col}">
        <div class="sb-blindname">${bi.name}</div>
        <div class="sb-blindbody">
          ${this.blindChip(b.type, b.key, 70)}
          <div class="sb-target"><div class="lbl">Cần ít nhất</div>
          <div class="num"><span class="chipico"></span>${fmtNum(b.target)}</div>
          <div class="rew">Thưởng: <span class="t-money">${'$'.repeat(Math.min(b.reward, 10)) || '-'}</span></div></div>
        </div>${desc}</div>`;
    } else if (r.phase === 'shop') {
      top = `<div class="sb-top sb-shop"><div class="sb-shoptitle">CỬA HÀNG</div><div class="sb-shopsub">Cải thiện ván chơi của bạn!</div></div>`;
    } else if (r.phase === 'pack') {
      const P0 = PACKS[r.pack.key];
      top = `<div class="sb-top sb-shop" style="--bc:${PACK_KIND[P0.kind].col}"><div class="sb-shoptitle">${P0.name}</div><div class="sb-shopsub">Chọn ${r.pack.left} lá</div></div>`;
    } else {
      top = `<div class="sb-top sb-shop"><div class="sb-shoptitle">CHỌN MÙ</div><div class="sb-shopsub">Chọn Mù tiếp theo</div></div>`;
    }
    const ante = r.ante;
    sb.innerHTML = `${top}
      <div class="sb-score"><div class="lbl">Điểm<br>Vòng</div><div class="val"><span class="chipico"></span><span id="roundScore">${fmtNum(r.phase === 'round' || r.phase === 'cashout' ? r.score : 0)}</span></div></div>
      <div class="sb-hand">
        <div class="sb-handname"><span id="handName">&nbsp;</span><span id="handLevel"></span></div>
        <div class="sb-cm"><div class="chipsbox" id="chipsBox">0</div><div class="xx">X</div><div class="multbox" id="multBox">0</div></div>
      </div>
      <div class="sb-grid">
        <div class="sb-btns">
          <button class="btn red tall" id="btnInfo">Thông<br>Tin<br>Ván</button>
          <button class="btn green tall" id="btnHelp">Hướng<br>Dẫn</button>
          <button class="btn orange tall" id="btnOpt">Tuỳ<br>Chọn</button>
        </div>
        <div class="sb-stats">
          <div class="row">
            <div class="stat"><div class="lbl">Lượt đánh</div><div class="v c-chips" id="stHands">${r.phase === 'round' || r.phase === 'cashout' ? r.handsLeft : maxHands()}</div></div>
            <div class="stat"><div class="lbl">Lượt bỏ</div><div class="v c-mult" id="stDisc">${r.phase === 'round' || r.phase === 'cashout' ? r.discardsLeft : maxDiscards()}</div></div>
          </div>
          <div class="stat money"><div class="v c-money" id="stMoney">$${this.dispMoney != null ? this.dispMoney : r.money}</div></div>
          <div class="row">
            <div class="stat"><div class="lbl">Ante</div><div class="v c-attn">${ante}<small>/8</small></div></div>
            <div class="stat"><div class="lbl">Vòng</div><div class="v c-attn">${r.round}</div></div>
          </div>
        </div>
      </div>`;
    $('#btnInfo').onclick = () => { SND.play('button'); this.showRunInfo(); };
    $('#btnOpt').onclick = () => { SND.play('button'); this.showOptions(); };
    $('#btnHelp').onclick = () => { SND.play('button'); this.showGuide(); };
    this.updateHandPreview();
  },
  setMoney(v) {
    this.dispMoney = v;
    const el = $('#stMoney');
    if (el) { el.textContent = '$' + v; el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
  },
  setCM(c, m, which) {
    const cb = $('#chipsBox'), mb = $('#multBox');
    if (!cb) return;
    cb.textContent = fmtNum(c);
    mb.textContent = fmtNum(m);
    const b = which === 'c' ? cb : which === 'm' ? mb : null;
    if (b) { b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); }
  },
  setHandLabel(name, level) {
    const n = $('#handName'), l = $('#handLevel');
    if (!n) return;
    n.innerHTML = name || '&nbsp;';
    l.textContent = level ? ` cấp ${level}` : '';
    l.className = level ? 'lvl lv' + Math.min(level, 7) : '';
  },
  updateHandPreview() {
    const r = G.run;
    if (!r || G.busy || this.planetMode) return;
    if (r.phase !== 'round') { this.setHandLabel('', 0); this.setCM(0, 0); return; }
    const sel = r.hand.filter((c) => c.sel);
    if (!sel.length) { this.setHandLabel('', 0); this.setCM(0, 0); return; }
    const e = evalHand(sel);
    const hv = handVals(e.hand);
    const unknown = sel.some((c) => c.faceDown);
    this.setHandLabel(unknown ? '???' : e.disp, unknown ? 0 : hv.level);
    this.setCM(unknown ? '?' : hv.chips, unknown ? '?' : hv.mult);
    if (unknown) { $('#chipsBox').textContent = '?'; $('#multBox').textContent = '?'; }
  },
  showHand(res) {
    const hv = handVals(res.hand);
    this.setHandLabel(res.disp, hv.level);
    this.setCM(hv.chips, hv.mult);
  },
  blindChip(type, key, size = 60) {
    const col = type === 'boss' ? BOSSES[key].col : BLIND_INFO[type].col;
    const lbl = type === 'small' ? 'NHỎ' : type === 'big' ? 'LỚN' : BOSSES[key].name.split(' ').map((w) => w[0]).join('').slice(0, 3).toUpperCase();
    return `<div class="bchip" style="--bc:${col};width:${size}px;height:${size}px;font-size:${size * 0.3}px"><span>${lbl}</span></div>`;
  },

  // ---------- Khu vực giữa ----------
  renderCenter() {
    const c = $('#center');
    const r = G.run;
    c.className = '';
    if (!r) { c.innerHTML = ''; return; }
    if (r.phase === 'blind') return this.renderBlindSelect(c);
    if (r.phase === 'shop') return this.renderShop(c);
    if (r.phase === 'cashout') return this.renderCashout(c);
    if (r.phase === 'pack') return this.renderPack(c);
    c.innerHTML = '';
  },
  renderBlindSelect(c) {
    const r = G.run;
    c.className = 'center-blinds';
    const types = ['small', 'big', 'boss'];
    let html = '<div class="blinds">';
    types.forEach((t, i) => {
      const b = r.blinds[t];
      const key = t === 'boss' ? b.key : null;
      const info = t === 'boss' ? BOSSES[key] : BLIND_INFO[t];
      const st = b.state;
      const target = blindTarget(t, key);
      const reward = blindReward(t, key);
      const stLabel = { select: 'Chọn', current: 'Hiện tại', upcoming: 'Sắp tới', skipped: 'Đã bỏ qua', defeated: 'Đã thắng' }[st];
      let skip = '';
      if (t !== 'boss') {
        const tg = b.tag;
        skip = `<div class="bl-or">hoặc</div><div class="bl-skip ${st === 'select' ? '' : 'dis'}">
          <button class="btn red sm" data-act="skip" ${st === 'select' ? '' : 'disabled'}>Bỏ Qua Mù</button>
          <div class="tagico" data-tag="${t}" title="">${TAGS[tg.key].icon}</div></div>`;
      } else {
        const can = hasV('retcon') || (hasV('directors_cut') && r.anteSt.rerolls < 1);
        skip = `<div class="bl-bossdesc">${fmt(info.desc)}</div>` + (can && st === 'select' ? `<button class="btn green sm" data-act="reroll">Đổi Trùm $10</button>` : '');
      }
      html += `<div class="blind st-${st}" style="--bc:${info.col}">
        <button class="btn ${st === 'select' ? 'orange' : 'grey'} bl-top" data-act="select" ${st === 'select' ? '' : 'disabled'}>${stLabel}</button>
        <div class="bl-name">${info.name}</div>
        ${this.blindChip(t, key, 96)}
        <div class="bl-req"><div class="lbl">Cần ít nhất</div><div class="num"><span class="chipico"></span>${fmtNum(target)}</div>
        <div class="rew">Thưởng: <span class="t-money">${'$'.repeat(Math.min(reward, 10)) || '-'}${reward ? '+' : ''}</span></div></div>
        ${skip}
      </div>`;
    });
    html += '</div>';
    c.innerHTML = html;
    $$('.blind', c).forEach((el, i) => {
      const t = types[i];
      const sel = el.querySelector('[data-act="select"]');
      if (sel) sel.onclick = () => selectBlind();
      const sk = el.querySelector('[data-act="skip"]');
      if (sk) sk.onclick = () => skipBlind();
      const rr = el.querySelector('[data-act="reroll"]');
      if (rr) rr.onclick = () => rerollBoss();
      const tg = el.querySelector('.tagico');
      if (tg) this.bindTip(tg, () => this.tagTip(r.blinds[t].tag));
    });
  },
  renderShop(c) {
    const r = G.run;
    c.className = 'center-shop';
    const rc = rerollCost();
    c.innerHTML = `<div class="shop">
      <div class="shop-btns">
        <button class="btn red big" id="btnNext">Vòng <br>Tiếp</button>
        <button class="btn green big" id="btnReroll" ${canAfford(rc) ? '' : 'disabled'}>Đổi Mới <br><span class="t-money2">$${rc}</span></button>
      </div>
      <div class="shop-slot-cards"></div>
      <div class="shop-bottom"><div class="shop-vslot"><div class="vlabel">PHIẾU ƯU ĐÃI</div></div><div class="shop-pslot"></div></div>
    </div>`;
    $('#btnNext').onclick = () => nextRound();
    $('#btnReroll').onclick = () => reroll();
  },
  renderCashout(c) {
    const r = G.run;
    c.className = 'center-cash';
    const co = r.cashout;
    if (!co) { c.innerHTML = ''; return; }
    let rows = '';
    co.lines.forEach((l, i) => {
      const lab = l.kind === 'blind' ? `<span class="co-blind">${this.blindChip(r.blind.type, r.blind.key, 34)} ${l.label}</span>` : `<span>${l.label.replace(/\[/g, '<span class="dim">(').replace(/\]/g, ')</span>')}</span>`;
      rows += `<div class="co-row" style="animation-delay:${i * 0.15}s">${lab}<span class="co-dots"></span><span class="t-money">${l.kind === 'blind' ? '$'.repeat(Math.min(l.v, 10)) || '-' : '$' + l.v}</span></div>`;
    });
    c.innerHTML = `<div class="cashout">
      <button class="btn orange cash-btn" id="btnCash">Nhận Tiền: <span class="t-money2">$${co.total}</span></button>
      <div class="co-rows">${rows}</div></div>`;
    $('#btnCash').onclick = () => cashOut();
  },
  renderPack(c) {
    const r = G.run;
    const P0 = PACKS[r.pack.key];
    c.className = 'center-pack';
    c.innerHTML = `<div class="packhead" style="--bc:${PACK_KIND[P0.kind].col}"><div class="ph-name">${P0.name}</div><div class="ph-sub">Chọn ${r.pack.left} lá</div>
      <button class="btn grey" id="btnSkipPack">Bỏ Qua</button></div>`;
    $('#btnSkipPack').onclick = () => skipPack();
  },

  // ---------- Nút điều khiển ----------
  renderControls() {
    const ct = $('#controls');
    const r = G.run;
    if (!r || r.phase !== 'round') { ct.innerHTML = ''; ct.style.display = 'none'; return; }
    ct.style.display = '';
    const n = r.hand.filter((c) => c.sel).length;
    ct.innerHTML = `<button class="btn blue ctl" id="btnPlay" ${n && r.handsLeft > 0 ? '' : 'disabled'}>Đánh Bài</button>
      <div class="sortbox"><div class="lbl">Xếp Bài</div><div class="sortbtns"><button class="btn orange sm" id="srtRank">Hạng</button><button class="btn orange sm" id="srtSuit">Chất</button></div></div>
      <button class="btn red ctl" id="btnDisc" ${n && r.discardsLeft > 0 ? '' : 'disabled'}>Bỏ Bài</button>`;
    $('#btnPlay').onclick = () => playHand();
    $('#btnDisc').onclick = () => discardHand();
    $('#srtRank').onclick = () => { SND.play('button'); sortHand('rank'); this.layout(); };
    $('#srtSuit').onclick = () => { SND.play('button'); sortHand('suit'); this.layout(); };
  },
  renderAreas() {
    const r = G.run;
    const ja = $('#joker-area'), ca = $('#cons-area'), dp = $('#deck-pile'), tg = $('#tags');
    if (!r) { [ja, ca, dp, tg].forEach((e) => (e.innerHTML = '')); return; }
    ja.innerHTML = `<div class="area-lbl">${r.jokers.length}/${jokerSlots()}</div>`;
    ca.innerHTML = `<div class="area-lbl">${r.consumables.length}/${consSlots()}</div>`;
    const remain = r.phase === 'round' ? r.draw.length : r.deck.length;
    dp.innerHTML = `<div class="deckstack">${'<div class="cardback back-' + r.deckKey + '"></div>'.repeat(3)}</div><div class="deckcount">${remain}/${r.deck.length}</div>`;
    dp.onclick = () => { SND.play('button'); this.showDeck(); };
    tg.innerHTML = r.tags.map((t) => `<div class="tagico" data-uid="${t.uid}">${TAGS[t.key].icon}</div>`).join('');
    $$('.tagico', tg).forEach((el) => {
      const t = r.tags.find((x) => x.uid == el.dataset.uid);
      this.bindTip(el, () => this.tagTip(t));
    });
  },

  // ---------- Mặt lá bài ----------
  faceHTML(o) {
    if (o.kind === 'card') return this.cardFace(o);
    if (o.kind === 'joker') return this.jokerFace(o);
    if (o.kind === 'tarot' || o.kind === 'planet' || o.kind === 'spectral') return this.consFace(o);
    if (o.kind === 'voucher') return `<div class="face vc"><div class="vc-in"><div class="vc-icon">${VOUCHERS[o.key].icon}</div><div class="vc-name">${VOUCHERS[o.key].name}</div></div></div>`;
    if (o.kind === 'pack') {
      const P0 = PACKS[o.key], K = PACK_KIND[P0.kind];
      const sz = o.key.endsWith('_m') ? 'KHỔNG LỒ' : o.key.endsWith('_j') ? 'LỚN' : '';
      return `<div class="face pk" style="--pc:${K.col};--pc2:${K.col2}"><div class="pk-top">${K.label}</div><div class="pk-icon">${K.icon}</div><div class="pk-size">${sz}</div><div class="pk-crimp"></div></div>`;
    }
    return '<div class="face"></div>';
  },
  backHTML() { return `<div class="face cardback back-${G.run ? G.run.deckKey : 'red'}"></div>`; },
  cardFace(c) {
    if (c.faceDown) return this.backHTML();
    const S0 = SUIT[c.suit];
    let cls = 'face pc';
    if (c.enh) cls += ' enh-' + c.enh;
    if (c.ed) cls += ' ed-' + c.ed;
    let html = '';
    if (c.enh === 'stone') {
      html = '<div class="stone-tex"></div>';
    } else {
      const lbl = RANK_LBL[c.rank];
      const corner = `<b>${lbl}</b><i>${S0.sym}</i>`;
      html += `<div class="corner tl">${corner}</div><div class="corner br">${corner}</div>`;
      html += `<div class="pips">${this.pips(c)}</div>`;
    }
    if (c.enh === 'bonus') html += '<div class="enh-badge">+30</div>';
    if (c.enh === 'mult') html += '<div class="enh-badge m">+4</div>';
    if (c.enh === 'lucky') html += '<div class="enh-badge l">☘</div>';
    if (c.seal) html += `<div class="seal seal-${c.seal}"></div>`;
    if (c.bonus) html += `<div class="perma">+${c.bonus}</div>`;
    if (c.ed) html += '<div class="edfx"></div>';
    if (c.debuff) html += '<div class="debuffx"></div>';
    return `<div class="${cls}" style="--sc:${S0.col}">${html}</div>`;
  },
  pips(c) {
    const s = SUIT[c.suit].sym;
    const P = {
      2: [[50, 20], [50, 80]], 3: [[50, 20], [50, 50], [50, 80]], 4: [[30, 20], [70, 20], [30, 80], [70, 80]],
      5: [[30, 20], [70, 20], [50, 50], [30, 80], [70, 80]], 6: [[30, 20], [70, 20], [30, 50], [70, 50], [30, 80], [70, 80]],
      7: [[30, 20], [70, 20], [50, 35], [30, 50], [70, 50], [30, 80], [70, 80]],
      8: [[30, 20], [70, 20], [50, 35], [30, 50], [70, 50], [50, 65], [30, 80], [70, 80]],
      9: [[30, 18], [70, 18], [30, 39], [70, 39], [50, 50], [30, 61], [70, 61], [30, 82], [70, 82]],
      10: [[30, 18], [70, 18], [50, 29], [30, 39], [70, 39], [30, 61], [70, 61], [50, 71], [30, 82], [70, 82]],
    };
    if (c.rank === 14) return `<div class="pip ace" style="left:50%;top:50%">${s}</div>`;
    if (c.rank >= 11) {
      const g = { 11: '♞', 12: '♛', 13: '♚' }[c.rank];
      return `<div class="facefig"><div class="ff-g">${g}</div><div class="ff-l">${RANK_LBL[c.rank]}</div><div class="ff-s">${s}</div></div>`;
    }
    return P[c.rank].map(([x, y]) => `<div class="pip ${y > 55 ? 'flip' : ''}" style="left:${x}%;top:${y}%">${s}</div>`).join('');
  },
  jokerFace(j) {
    if (j.faceDown) return this.backHTML();
    const d = JOKERS[j.key];
    let h0 = 0;
    for (const ch of j.key) h0 = (h0 * 31 + ch.charCodeAt(0)) % 360;
    let cls = `face jk r${d.rarity}`;
    if (j.ed) cls += ' ed-' + j.ed;
    let st = '';
    if (j.st && j.st.eternal) st += '<div class="stk stk-e" title="Vĩnh Cửu">∞</div>';
    if (j.st && j.st.perishable != null) st += `<div class="stk stk-p">${j.st.perishable}</div>`;
    if (j.st && j.st.rental) st += '<div class="stk stk-r">$</div>';
    return `<div class="${cls}" style="--h:${h0}"><div class="jk-bg"></div><div class="jk-icon">${d.icon}</div><div class="jk-name">${d.name}</div>${st}${j.ed ? '<div class="edfx"></div>' : ''}${j.debuff ? '<div class="debuffx"></div>' : ''}</div>`;
  },
  consFace(c) {
    const d = consDef(c);
    const neg = c.ed === 'negative' ? ' ed-negative' : '';
    if (c.kind === 'tarot') {
      return `<div class="face ts${neg}"><div class="ts-num">${d.num}</div><div class="ts-icon">${d.icon}</div><div class="ts-name">${d.name}</div>${neg ? '<div class="edfx"></div>' : ''}</div>`;
    }
    if (c.kind === 'planet') {
      return `<div class="face pl${neg}"><div class="pl-stars"></div><div class="pl-ball ${d.ring ? 'ring' : ''} ${d.bands ? 'bands' : ''}" style="--p1:${d.col};--p2:${d.col2}"></div><div class="pl-name">${d.name}</div>${neg ? '<div class="edfx"></div>' : ''}</div>`;
    }
    const special = c.key === 'soul' || c.key === 'black_hole' ? ' sp-rare' : '';
    return `<div class="face sp${neg}${special}"><div class="sp-glow"></div><div class="sp-icon">${d.icon}</div><div class="sp-name">${d.name}</div>${neg ? '<div class="edfx"></div>' : ''}</div>`;
  },
  sig(o) {
    if (o.kind === 'card') return [o.rank, o.suit, o.enh, o.ed, o.seal, o.debuff, o.faceDown, o.bonus, G.run && G.run.deckKey].join('|');
    if (o.kind === 'joker') return [o.key, o.ed, o.debuff, o.faceDown, JSON.stringify(o.st)].join('|');
    return [o.kind, o.key, o.ed].join('|');
  },

  // ---------- Sprite & bố cục ----------
  getSprite(o, from, tx, ty) {
    let sp = this.sprites.get(o.uid);
    if (!sp) {
      const el = h('div', 'sprite');
      el.dataset.uid = o.uid;
      el.innerHTML = `<div class="tilt"><div class="jig">${this.faceHTML(o)}</div></div><div class="price"></div><div class="acts"></div>`;
      el.style.setProperty('--d', (Math.random() * 3).toFixed(2) + 's');
      sp = { el, sig: this.sig(o), obj: o, x: 0, y: 0, rot: 0, sc: 1 };
      this.sprites.set(o.uid, sp);
      const f = from || this.L.deck;
      if (from === 'pop') {
        el.classList.add('popin');
        el.style.transition = 'none';
        el.style.transform = `translate(${tx}px,${ty}px)`;
      } else {
        el.style.transition = 'none';
        el.style.transform = `translate(${f.x}px,${f.y}px) rotate(0deg)`;
      }
      this.spr.appendChild(el);
      this.bindSprite(sp);
      void el.offsetWidth;
      el.style.transition = '';
    } else {
      sp.obj = o;
      const s = this.sig(o);
      if (s !== sp.sig) {
        sp.sig = s;
        const jig = sp.el.querySelector('.jig');
        jig.innerHTML = this.faceHTML(o);
      }
    }
    return sp;
  },
  place(o, x, y, opt = {}) {
    const sp = this.getSprite(o, opt.from, x, y);
    sp.placed = true;
    sp.area = opt.area;
    if (this.drag && this.drag.sp === sp) return sp;
    sp.x = x; sp.y = y; sp.rot = opt.rot || 0; sp.sc = opt.sc || 1;
    sp.el.style.transform = `translate(${x}px,${y}px) rotate(${sp.rot}deg) scale(${sp.sc})`;
    sp.el.style.zIndex = opt.z || 10;
    sp.el.style.opacity = '';
    sp.el.classList.toggle('sel', !!opt.sel);
    sp.el.classList.toggle('clickable', !!opt.click);
    // giá
    const pr = sp.el.querySelector('.price');
    if (opt.price != null) { pr.style.display = ''; pr.textContent = '$' + opt.price; } else pr.style.display = 'none';
    // nút hành động
    const acts = sp.el.querySelector('.acts');
    if (this.selected === o.uid && opt.acts && opt.acts.length) {
      acts.innerHTML = '';
      acts.className = 'acts show ' + (opt.actsPos || 'below');
      for (const a of opt.acts) {
        const b = h('button', `btn ${a.col} sm`, a.label);
        if (a.dis) b.disabled = true;
        b.onpointerdown = (e) => e.stopPropagation();
        b.onclick = (e) => { e.stopPropagation(); a.fn(); };
        acts.appendChild(b);
      }
    } else { acts.className = 'acts'; acts.innerHTML = ''; }
    return sp;
  },
  rowPos(n, x, w, gap = 12, sc = 1) {
    if (n <= 0) return [];
    const cw = CW * sc;
    const sp = n > 1 ? Math.min(cw + gap, (w - cw) / (n - 1)) : 0;
    const tot = sp * (n - 1) + cw;
    const sx = x + (w - tot) / 2 + (cw - CW) / 2;
    return Array.from({ length: n }, (_, i) => sx + i * sp);
  },
  layout() {
    const r = G.run;
    for (const sp of this.sprites.values()) sp.placed = false;
    if (r) {
      const sel = this.selected;
      // Joker
      const L = this.L;
      const jx = this.rowPos(r.jokers.length, L.joker.x, L.joker.w, 12, L.joker.sc || 1);
      r.jokers.forEach((j, i) => {
        const acts = [];
        if (r.phase !== 'pack' || true) acts.push({ label: `Bán<br><span class="t-money2">$${sellValue(j)}</span>`, col: 'green', fn: () => sellItem(j), dis: j.st.eternal });
        this.place(j, jx[i], L.joker.y, { area: 'jokers', z: 20 + i, sel: sel === j.uid, acts, click: true, from: 'pop', sc: L.joker.sc });
      });
      // Tiêu hao
      const cx = this.rowPos(r.consumables.length, L.cons.x, L.cons.w, 12, L.cons.sc || 1);
      r.consumables.forEach((c, i) => {
        const selCards = r.hand.filter((x) => x.sel);
        const acts = [
          { label: 'Dùng', col: 'red', fn: () => useCons(c), dis: !canUseCons(c, selCards) },
          { label: `Bán <span class="t-money2">$${sellValue(c)}</span>`, col: 'green', fn: () => sellItem(c) },
        ];
        this.place(c, cx[i], L.cons.y, { area: 'cons', z: 20 + i, sel: sel === c.uid, acts, click: true, from: 'pop', sc: L.cons.sc });
      });
      // Tay bài
      if (r.phase === 'round' || (r.phase === 'pack' && r.hand.length)) {
        const n = r.hand.length;
        const hx = this.rowPos(n, L.hand.x, L.hand.w, 6, L.hand.sc || 1);
        const mid = (n - 1) / 2;
        r.hand.forEach((c, i) => {
          const d = i - mid;
          const rot = n > 1 ? d * Math.min(2.4, 18 / n) : 0;
          const yo = d * d * (n > 1 ? Math.min(2.2, 30 / (n * n) * 4) : 0);
          this.place(c, hx[i], L.hand.y + yo - (c.sel ? L.hand.lift || 32 : 0), { area: 'hand', z: 100 + i, rot, sel: c.sel, click: true, sc: L.hand.sc || 1 });
        });
      }
      // Bài đã đánh
      if (r.phase === 'round' && r.play.length) {
        const px = this.rowPos(r.play.length, L.play.x, L.play.w, 14, L.play.sc || 1);
        r.play.forEach((c, i) => this.place(c, px[i], L.play.y - (this.raised.has(c.uid) ? 26 : 0), { area: 'play', z: 200 + i, sc: L.play.sc }));
      }
      // Cửa hàng
      if (r.phase === 'shop' && r.shop) {
        const s = r.shop;
        const sx = this.rowPos(s.cards.length, L.shopCards.x, L.shopCards.w, 24, L.shopCards.sc || 1);
        s.cards.forEach((it, i) => {
          const acts = [{ label: 'Mua', col: 'blue', fn: () => buyItem(it), dis: !canAfford(it.cost) }];
          if (['tarot', 'planet', 'spectral'].includes(it.kind)) acts.push({ label: 'Mua & Dùng', col: 'red', fn: () => buyItem(it, true), dis: !canAfford(it.cost) || !canUseCons(it, []) });
          this.place(it, sx[i], L.shopCards.y, { area: 'shop', z: 30 + i, price: it.cost, sel: sel === it.uid, acts, click: true, from: { x: this.W + 100, y: L.shopCards.y }, sc: L.shopCards.sc });
        });
        s.vouchers.forEach((v, i) => {
          this.place(v, L.voucher.x + i * (CW + 20), L.voucher.y, { area: 'shop', z: 30, price: v.cost, sel: sel === v.uid, click: true, acts: [{ label: 'Mua', col: 'blue', fn: () => buyItem(v), dis: !canAfford(v.cost) }], actsPos: this.portrait ? 'below' : 'right', from: 'pop', sc: L.voucher.sc });
        });
        const pxs = this.rowPos(s.packs.length, L.packs.x, L.packs.w, 40, L.packs.sc || 1);
        s.packs.forEach((p, i) => {
          this.place(p, pxs[i], L.packs.y, { area: 'shop', z: 30, price: p.cost, sel: sel === p.uid, click: true, acts: [{ label: 'Mở', col: 'blue', fn: () => buyItem(p), dis: !canAfford(p.cost) }], from: { x: this.W + 100, y: L.packs.y }, sc: L.packs.sc });
        });
      }
      // Gói bài
      if (r.phase === 'pack' && r.pack) {
        const it = r.pack.items;
        const px = this.rowPos(it.length, L.packItems.x, L.packItems.w, 24, L.packItems.sc || 1);
        const hasHand = r.hand.length > 0;
        it.forEach((o, i) => {
          const isCons = ['tarot', 'planet', 'spectral'].includes(o.kind);
          const selCards = r.hand.filter((x) => x.sel);
          const acts = [{ label: isCons ? 'Dùng' : 'Chọn', col: isCons ? 'red' : 'green', fn: () => choosePackItem(o), dis: isCons ? !canUseCons(o, selCards) : false }];
          this.place(o, px[i], L.packItems.y, { area: 'pack', z: 40 + i, sel: sel === o.uid, acts, click: true, from: 'pop', sc: L.packItems.sc });
        });
      }
    }
    // sprite không được đặt
    for (const [id, sp] of this.sprites) {
      if (sp.placed) continue;
      if (sp.leaving) continue;
      const o = sp.obj;
      const inDeck = r && o.kind === 'card' && r.deck.includes(o);
      sp.leaving = true;
      sp.el.querySelector('.acts').innerHTML = '';
      sp.el.querySelector('.acts').className = 'acts';
      if (inDeck && r.discard.includes(o)) {
        sp.el.style.transform = `translate(${this.L.discard.x}px,${this.L.discard.y}px) rotate(25deg)`;
      } else if (inDeck) {
        sp.el.style.transform = `translate(${this.L.deck.x}px,${this.L.deck.y}px) rotate(0deg)`;
        sp.el.style.opacity = '0';
      } else {
        sp.el.classList.add('dissolve');
      }
      setTimeout(() => { if (this.sprites.get(id) === sp && sp.leaving) { sp.el.remove(); this.sprites.delete(id); } }, 600);
    }
    // sprite đang rời đi nhưng lại được đặt -> giữ
    for (const sp of this.sprites.values()) if (sp.placed && sp.leaving) { sp.leaving = false; sp.el.classList.remove('dissolve'); }
    if (this.touchMode && !this.lpActive) {
      const s2 = this.selected != null && this.sprites.get(this.selected);
      this.hoverUid = s2 && s2.placed ? this.selected : null;
      if (this.hoverUid == null) this.hideTip();
    }
    if (this.hoverUid != null) this.refreshTip();
  },
  clearHand() { this.raised.clear(); },

  // ---------- Tương tác sprite ----------
  bindSprite(sp) {
    const el = sp.el;
    el.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      if (e.target.closest('.acts')) return;
      e.stopPropagation();
      const p = this.toGame(e);
      this.drag = { sp, sx: p.x, sy: p.y, ox: p.x - sp.x, oy: p.y - sp.y, moved: false, pid: e.pointerId };
      if (e.pointerType !== 'mouse') {
        clearTimeout(this.lpT);
        const d = this.drag;
        this.lpT = setTimeout(() => {
          if (this.drag === d && !d.moved) {
            d.longPress = true;
            this.lpActive = true;
            this.hoverUid = sp.obj.uid;
            this.showTipFor(sp);
            if (navigator.vibrate) try { navigator.vibrate(12); } catch (er) { /* */ }
          }
        }, 380);
      }
    });
    el.addEventListener('pointerenter', (e) => {
      if (e.pointerType !== 'mouse') return;
      if (this.drag && this.drag.moved) return;
      this.hoverUid = sp.obj.uid;
      if (sp.area === 'hand' || sp.area === 'jokers' || sp.area === 'cons' || sp.area === 'shop' || sp.area === 'pack') SND.play('hover');
      this.showTipFor(sp);
    });
    el.addEventListener('pointerleave', (e) => {
      if (e.pointerType !== 'mouse') return;
      if (this.hoverUid === sp.obj.uid) { this.hoverUid = null; this.hideTip(); }
      const t = el.querySelector('.tilt');
      t.style.transform = '';
    });
    el.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      if (this.drag && this.drag.moved) return;
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5, py = (e.clientY - rect.top) / rect.height - 0.5;
      el.querySelector('.tilt').style.transform = `perspective(600px) rotateY(${px * 18}deg) rotateX(${-py * 18}deg) scale(1.06)`;
    });
  },
  onMove(e) {
    const d = this.drag;
    if (!d) return;
    const p = this.toGame(e);
    if (!d.moved && Math.hypot(p.x - d.sx, p.y - d.sy) > 8) {
      const area = d.sp.area;
      if (!['hand', 'jokers', 'cons'].includes(area) || G.busy) return;
      d.moved = true;
      clearTimeout(this.lpT);
      if (d.longPress) { d.longPress = false; this.lpActive = false; this.hoverUid = null; }
      d.sp.el.classList.add('dragging');
      this.hideTip();
    }
    if (!d.moved) return;
    const x = p.x - d.ox, y = p.y - d.oy;
    d.sp.x = x; d.sp.y = y;
    d.sp.el.style.transform = `translate(${x}px,${y}px) rotate(0deg) scale(1.08)`;
    // sắp xếp lại
    const r = G.run;
    const arr = d.sp.area === 'hand' ? r.hand : d.sp.area === 'jokers' ? r.jokers : r.consumables;
    const o = d.sp.obj;
    const idx = arr.indexOf(o);
    if (idx < 0) return;
    let ni = 0;
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] === o) continue;
      const s2 = this.sprites.get(arr[i].uid);
      if (s2 && x + CW / 2 > s2.x + CW / 2) ni++;
    }
    if (ni !== idx) {
      arr.splice(idx, 1);
      arr.splice(ni, 0, o);
      this.layout();
    }
  },
  onUp(e) {
    const d = this.drag;
    if (!d) return;
    this.drag = null;
    clearTimeout(this.lpT);
    if (d.longPress) {
      this.lpActive = false;
      this.hoverUid = null;
      this.hideTip();
      this.layout();
      return;
    }
    if (d.moved) {
      d.sp.el.classList.remove('dragging');
      this.layout();
      if (G.run && G.run.phase === 'round') this.updateHandPreview();
      save();
      return;
    }
    this.clickSprite(d.sp);
  },
  clickSprite(sp) {
    const r = G.run;
    if (!r || G.busy) return;
    const o = sp.obj;
    if (sp.area === 'hand') {
      toggleSelect(o);
      return;
    }
    if (['jokers', 'cons', 'shop', 'pack'].includes(sp.area)) {
      SND.play('select');
      this.selected = this.selected === o.uid ? null : o.uid;
      this.layout();
    }
  },
  onKey(e) {
    const r = G.run;
    if (this.guidePage != null && this.ov.classList.contains('show')) {
      if (e.key === 'ArrowRight') this.showGuide(this.guidePage + 1);
      else if (e.key === 'ArrowLeft') this.showGuide(this.guidePage - 1);
      else if (e.key === 'Escape') this.closeOverlay();
      return;
    }
    if (!r || this.ov.classList.contains('show')) {
      if (e.key === 'Escape' && this.ov.classList.contains('show') && G.run) this.closeOverlay();
      return;
    }
    if (r.phase === 'round') {
      if (e.key === 'Enter') playHand();
      else if (e.key === 'Delete' || e.key === 'Backspace' || e.key.toLowerCase() === 'd') discardHand();
    }
    if (e.key === 'Escape') this.showOptions();
  },
  shake(u) {
    const sp = this.sprites.get(u);
    if (!sp) return;
    const j = sp.el.querySelector('.jig');
    j.classList.remove('shake', 'juggle'); void j.offsetWidth; j.classList.add('shake');
    j.addEventListener('animationend', () => j.classList.remove('shake'), { once: true });
  },
  jiggle(u) {
    const sp = this.sprites.get(u);
    if (!sp) return;
    const j = sp.el.querySelector('.jig');
    j.classList.remove('juggle', 'shake'); void j.offsetWidth; j.classList.add('juggle');
    j.addEventListener('animationend', () => j.classList.remove('juggle'), { once: true });
  },

  // ---------- Tooltip ----------
  showTipFor(sp) {
    const html = this.tipHTML(sp.obj, sp.area);
    if (!html) return;
    this.tip.innerHTML = html;
    this.tip.classList.add('show');
    const k = sp.sc || 1;
    const vx = sp.x + (CW * (1 - k)) / 2, vw = CW * k;
    let hh = CH * k, y = sp.y + (CH * (1 - k)) / 2;
    if (this.selected === sp.obj.uid) {
      const acts = sp.el.querySelector('.acts.show');
      if (acts) {
        if (sp.area === 'jokers' || sp.area === 'cons') hh = CH * k + 10 + acts.offsetHeight;
        else if (sp.area === 'shop') { y -= 34; hh += 34; }
      }
    }
    this.positionTip(vx, y, vw, hh, sp.area);
  },
  refreshTip() {
    const sp = this.sprites.get(this.hoverUid);
    if (sp && !sp.leaving) this.showTipFor(sp); else this.hideTip();
  },
  positionTip(x, y, w, hh, area) {
    const t = this.tip;
    const tw = t.offsetWidth, th = t.offsetHeight;
    let tx = x + w / 2 - tw / 2;
    tx = Math.max(8, Math.min(this.W - tw - 8, tx));
    let ty;
    const below = area === 'jokers' || area === 'cons' || area === 'tag';
    if (below || y - th - 14 < 4) ty = y + hh + 14;
    else ty = y - th - 14;
    if (ty + th > this.H - 4) ty = Math.max(4, y - th - 14);
    if (area === 'hand' || area === 'play') ty = Math.max(4, y - th - 14);
    t.style.transform = `translate(${tx}px,${ty}px)`;
  },
  hideTip() { this.tip.classList.remove('show'); },
  bindTip(el, fn) {
    el.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') return;
      const html = fn();
      if (!html) return;
      this.tip.innerHTML = html;
      this.tip.classList.add('show');
      const gr = this.game.getBoundingClientRect(), r = el.getBoundingClientRect();
      const x = (r.left - gr.left) / this.scale, y = (r.top - gr.top) / this.scale;
      this.positionTip(x, y, r.width / this.scale, r.height / this.scale, y < 300 ? 'tag' : '');
      clearTimeout(this.tipT);
      this.tipT = setTimeout(() => { if (this.hoverUid == null) this.hideTip(); }, 2600);
    });
    el.addEventListener('pointerenter', (e) => {
      if (e.pointerType !== 'mouse') return;
      const html = fn();
      if (!html) return;
      this.tip.innerHTML = html;
      this.tip.classList.add('show');
      const gr = this.game.getBoundingClientRect(), r = el.getBoundingClientRect();
      const x = (r.left - gr.left) / this.scale, y = (r.top - gr.top) / this.scale;
      this.positionTip(x, y, r.width / this.scale, r.height / this.scale, y < 300 ? 'tag' : '');
    });
    el.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') this.hideTip(); });
  },
  tipBox(title, body, badges = [], extra = []) {
    let s = `<div class="tipcard"><div class="tip-title">${title}</div>`;
    if (body) s += `<div class="tip-body">${fmt(body)}</div>`;
    s += `<div class="tip-badges">${badges.map((b) => `<span class="badge" style="--bc:${b[1]}">${b[0]}</span>`).join('')}</div></div>`;
    for (const x of extra) s += `<div class="tipcard sub"><div class="tip-title sm">${x[0]}</div><div class="tip-body">${fmt(x[1])}</div></div>`;
    return s;
  },
  tipHTML(o, area) {
    if (o.kind === 'card') {
      if (o.faceDown) return this.tipBox('???', 'Lá bài úp mặt');
      const ex = [];
      if (o.enh) ex.push([ENH[o.enh].name, ENH[o.enh].desc()]);
      if (o.ed) ex.push([EDITION[o.ed].name, EDITION[o.ed].desc]);
      if (o.seal) ex.push([SEAL[o.seal].name, SEAL[o.seal].desc]);
      let body;
      if (o.enh === 'stone') body = `[c]+${50 + o.bonus}[/] Chip`;
      else body = `[c]+${rankChips(o.rank) + o.bonus}[/] Chip` + (o.bonus ? `\n[d](+${o.bonus} thêm)[/]` : '');
      if (o.debuff) body += '\n[m]Bị vô hiệu[/]';
      const title = o.enh === 'stone' ? 'Lá Đá' : `${RANK_NAME[o.rank]} <span style="color:${SUIT[o.suit].col};filter:brightness(1.6)">${SUIT[o.suit].sym}</span> ${SUIT[o.suit].name}`;
      const badges = [];
      if (o.cost && area === 'shop') badges.push(['Lá Bài', '#7a7a7a']);
      return this.tipBox(title, body, badges, ex);
    }
    if (o.kind === 'joker') {
      if (o.faceDown) return this.tipBox('???', 'Joker bị úp');
      const d = JOKERS[o.key];
      const ex = [];
      if (o.ed) ex.push([EDITION[o.ed].name, EDITION[o.ed].desc]);
      if (o.st.eternal) ex.push(['Vĩnh Cửu', STICKER.eternal.desc]);
      if (o.st.perishable != null) ex.push(['Mau Hỏng', STICKER.perishable.desc(o)]);
      if (o.st.rental) ex.push(['Thuê', STICKER.rental.desc]);
      let body = typeof d.desc === 'function' ? d.desc(o) : d.desc;
      if (o.debuff) body += '\n[m]Bị vô hiệu[/]';
      const badges = [[RARITY[d.rarity].name, RARITY[d.rarity].col]];
      if (area === 'jokers') badges.push([`Bán $${sellValue(o)}`, '#f3b958']);
      return this.tipBox(d.name, body, badges, ex);
    }
    if (['tarot', 'planet', 'spectral'].includes(o.kind)) {
      const d = consDef(o);
      const label = o.kind === 'tarot' ? ['Tarot', UI_COL.tarot] : o.kind === 'planet' ? ['Hành Tinh', UI_COL.planet] : ['Huyền Bí', UI_COL.spectral];
      const ex = o.ed ? [[EDITION.negative.name, '[d]+1[/] ô tiêu hao']] : [];
      if (o.kind === 'planet') ex.unshift([d.sys, `Tay bài: [a]${handVN(d.hand)}[/]`]);
      return this.tipBox(d.name, d.desc(), [label], ex);
    }
    if (o.kind === 'voucher') return this.tipBox(VOUCHERS[o.key].name, VOUCHERS[o.key].desc, [['Phiếu Ưu Đãi', '#c65f3b']]);
    if (o.kind === 'pack') {
      const P0 = PACKS[o.key];
      return this.tipBox(P0.name, PACK_KIND[P0.kind].desc(P0), [['Gói Bài', PACK_KIND[P0.kind].col]]);
    }
    return '';
  },
  tagTip(t) {
    if (!t) return '';
    const d = TAGS[t.key];
    return this.tipBox(d.name, typeof d.desc === 'function' ? d.desc(t) : d.desc, [['Thẻ', '#ff9a00']]);
  },

  // ---------- Popup & hoạt hình sự kiện ----------
  srcPos(src) {
    const L = this.L;
    if (src === 'blind') return { x: L.blind.x, y: L.blind.y };
    if (src === 'center' || src == null) return { x: L.center.x, y: L.center.y, center: true };
    if (src === 'tags') return { x: L.tags.x, y: L.tags.y };
    const sp = this.sprites.get(src);
    if (sp) {
      const k = sp.sc || 1, top = sp.y + (CH * (1 - k)) / 2;
      return { x: sp.x + CW / 2, y: sp.area === 'jokers' || sp.area === 'cons' ? top + CH * k + 4 : top - 6 };
    }
    return { x: L.center.x, y: L.center.y, center: true };
  },
  popup(src, text, cls, big) {
    const p = this.srcPos(src);
    cls = String(cls || '').replace(/^c-/, 'p-');
    const el = h('div', `popup ${cls}${big || p.center ? ' big' : ''}`, text);
    el.style.left = p.x + 'px';
    el.style.top = p.y + 'px';
    this.pop.appendChild(el);
    setTimeout(() => el.remove(), 1100 / Math.max(1, G.settings.speed * 0.7));
  },
  async flushEvents() {
    while (G.ev.length) {
      const e = G.ev.shift();
      await this.playEv(e, 0);
    }
  },
  async playEv(e, p) {
    const D = 300;
    switch (e.t) {
      case 'msg':
        this.popup(e.src, e.text, 'c-' + (e.color || 'attn'), e.big);
        if (e.src != null) this.jiggle(e.src);
        SND.play('msg', p);
        await wait(e.big ? 700 : D);
        break;
      case 'money':
        this.popup(e.src, (e.v > 0 ? '+$' : '-$') + Math.abs(e.v), 'c-money');
        if (e.src) this.jiggle(e.src);
        if (e.jig) this.jiggle(e.jig);
        this.setMoney(e.money != null ? e.money : G.run.money);
        SND.play('money');
        await wait(D);
        break;
      case 'destroy': {
        const sp = this.sprites.get(e.src);
        if (sp) {
          sp.el.classList.add(e.glass ? 'shatter' : 'dissolve');
          sp.leaving = true;
          setTimeout(() => { sp.el.remove(); if (this.sprites.get(e.src) === sp) this.sprites.delete(e.src); }, 700);
        }
        SND.play(e.glass ? 'glass' : 'destroy');
        await wait(450);
        break;
      }
      case 'level': {
        const hv = handVals(e.hand);
        this.setHandLabel(handVN(e.hand), hv.level);
        this.setCM(hv.chips, hv.mult, 'c');
        SND.play('level');
        await wait(500);
        break;
      }
      case 'planetShow': {
        this.planetMode = true;
        const hv = handVals(e.hand);
        this.setHandLabel(handVN(e.hand), hv.level);
        this.setCM(hv.chips, hv.mult);
        await wait(400);
        break;
      }
      case 'useCons': {
        const sp = this.sprites.get(e.src);
        if (sp) {
          sp.el.style.zIndex = 900;
          sp.el.style.transform = `translate(${this.L.use.x - CW / 2}px,${this.L.use.y}px) scale(1.25)`;
          sp.el.classList.add('using');
          await wait(550);
          sp.el.classList.add('dissolve');
          sp.leaving = true;
          setTimeout(() => { sp.el.remove(); if (this.sprites.get(e.src) === sp) this.sprites.delete(e.src); }, 650);
          await wait(250);
        }
        break;
      }
      case 'refresh':
        this.render();
        break;
      default:
        break;
    }
  },
  async hidePlanet() {
    await wait(600);
    this.planetMode = null;
    this.setHandLabel('', 0);
    this.setCM(0, 0);
  },
  async playScore(out) {
    let p = 0;
    const D = 280;
    for (const e of out.ev) {
      switch (e.t) {
        case 'base':
          this.setCM(e.chips, e.mult);
          await wait(250);
          break;
        case 'raise':
          this.raised.add(e.src);
          this.layout();
          await wait(80);
          break;
        case 'chips':
          this.setCM(e.chips, e.mult, 'c');
          this.popup(e.src, '+' + fmtNum(e.v), 'c-chips');
          this.jiggle(e.src); if (e.jig) this.jiggle(e.jig);
          SND.play('chips', p++);
          await wait(D);
          break;
        case 'mult':
          this.setCM(e.chips, e.mult, 'm');
          this.popup(e.src, '+' + fmtNum(e.v) + ' Nhân', 'c-mult');
          this.jiggle(e.src); if (e.jig) this.jiggle(e.jig);
          SND.play('mult', p++);
          await wait(D);
          break;
        case 'xmult':
          this.setCM(e.chips, e.mult, 'm');
          this.popup(e.src, 'X' + fx(e.v) + ' Nhân', 'c-xmult');
          this.jiggle(e.src); if (e.jig) this.jiggle(e.jig);
          SND.play('xmult', p++);
          await wait(D + 60);
          break;
        case 'money':
          this.popup(e.src, (e.v > 0 ? '+$' : '-$') + Math.abs(e.v), 'c-money');
          this.jiggle(e.src); if (e.jig) this.jiggle(e.jig);
          this.setMoney(e.money);
          SND.play('money');
          await wait(D);
          break;
        case 'again':
          this.popup(e.src, 'Lại!', 'c-attn');
          this.jiggle(e.src);
          SND.play('again');
          await wait(D * 0.8);
          break;
        case 'balance':
          this.setCM(e.chips, e.mult, 'c');
          this.popup('center', 'Cân Bằng!', 'c-tarot', true);
          SND.play('xmult');
          await wait(600);
          break;
        default:
          await this.playEv(e, p++);
          if (e.t === 'level') {
            const hv = handVals(G.run.lastHand);
            this.setHandLabel(handVN(G.run.lastHand), hv.level);
            if (e.chips != null) this.setCM(hv.chips, hv.mult);
          }
      }
    }
    this.setCM(out.chips, out.mult);
    // tổng
    const hn = $('#handName');
    if (hn) {
      hn.innerHTML = `<span class="handtotal ${out.total >= G.run.blind.target ? 'fire' : ''}"><span class="chipico"></span>${fmtNum(out.total)}</span>`;
      $('#handLevel').textContent = '';
    }
    SND.play('score');
    await wait(700);
  },
  async countScore(total) {
    const r = G.run;
    const el = $('#roundScore');
    const from = r.score - total, to = r.score;
    const dur = Math.max(250, 700 / G.settings.speed);
    const t0 = performance.now();
    await new Promise((res) => {
      const step = (now) => {
        const k = Math.min(1, (now - t0) / dur);
        const v = Math.floor(from + (to - from) * (1 - Math.pow(1 - k, 3)));
        if (el) el.textContent = fmtNum(v);
        if (Math.random() < 0.4) SND.play('tick');
        if (k < 1) requestAnimationFrame(step); else res();
      };
      requestAnimationFrame(step);
    });
    if (el) el.textContent = fmtNum(to);
    this.setHandLabel('', 0);
    this.setCM(0, 0);
    this.dispMoney = null;
    await wait(200);
  },
  toast(msg) {
    const t = h('div', 'toast', msg);
    this.game.appendChild(t);
    setTimeout(() => t.remove(), 1600);
  },

  // ---------- Nền shader ----------
  setBg() {
    const r = G.run;
    if (!r) return BG.setPalette('menu');
    if (r.phase === 'round' && r.blind) {
      if (r.blind.type === 'boss') return BG.setHex(BOSSES[r.blind.key].col, true);
      return BG.setHex(BLIND_INFO[r.blind.type].col);
    }
    if (r.phase === 'pack' && r.pack) return BG.setHex(PACK_KIND[PACKS[r.pack.key].kind].col);
    BG.setPalette('game');
  },

  // ---------- Overlay / modal ----------
  openOverlay(html, cls = '') {
    this.hideTip();
    this.ov.innerHTML = `<div class="modal ${cls}">${html}</div>`;
    this.ov.classList.add('show');
    return this.ov.firstChild;
  },
  closeOverlay() {
    this.guidePage = null;
    this.hideTip();
    this.ov.classList.remove('show');
    this.ov.innerHTML = '';
    SND.play('button');
  },
  backBtn(label = 'Quay Lại') { return `<button class="btn orange wide" data-close>${label}</button>`; },
  bindClose(m) { $$('[data-close]', m).forEach((b) => (b.onclick = () => this.closeOverlay())); },

  showRunInfo(tab = 'hands') {
    const r = G.run;
    const tabs = [['hands', 'Tay Bài'], ['blinds', 'Mù'], ['vouchers', 'Phiếu'], ['stats', 'Thống Kê']];
    let body = '';
    if (tab === 'hands') {
      body = '<div class="hands-list">';
      for (const k of HAND_KEYS) {
        const H = HANDS[k];
        if (H.secret && r.hands[k].played === 0) continue;
        const hv = handVals(k);
        body += `<div class="hl-row"><span class="hl-lv lv${Math.min(hv.level, 7)}">cấp.${hv.level}</span><span class="hl-name" title="">${H.vn}</span>
          <span class="hl-cm"><span class="chipsbox s">${fmtNum(hv.chips)}</span><b>X</b><span class="multbox s">${fmtNum(hv.mult)}</span></span><span class="hl-n">#${r.hands[k].played}</span></div>`;
      }
      body += '</div>';
    } else if (tab === 'blinds') {
      body = '<div class="ri-blinds">';
      for (const t of ['small', 'big', 'boss']) {
        const key = t === 'boss' ? r.blinds.boss.key : null;
        const info = t === 'boss' ? BOSSES[key] : BLIND_INFO[t];
        body += `<div class="ri-blind" style="--bc:${info.col}">${this.blindChip(t, key, 64)}<div><div class="ri-bn">${info.name}</div><div class="ri-bt">Cần ít nhất <b>${fmtNum(blindTarget(t, key))}</b></div>${t === 'boss' ? `<div class="ri-bd">${fmt(info.desc)}</div>` : ''}</div></div>`;
      }
      body += '</div>';
    } else if (tab === 'vouchers') {
      body = r.vouchers.length ? '<div class="ri-vouchers">' + r.vouchers.map((v) => `<div class="ri-v"><div class="ri-vi">${VOUCHERS[v].icon}</div><div><b>${VOUCHERS[v].name}</b><div>${fmt(VOUCHERS[v].desc)}</div></div></div>`).join('') + '</div>' : '<div class="empty">Chưa đổi Phiếu nào</div>';
    } else {
      const s = r.stats;
      body = `<div class="ri-stats">
        <div><span>Bộ bài</span><b>${DECKS[r.deckKey].name}</b></div>
        <div><span>Mức cược</span><b>${STAKES[r.stake].name}</b></div>
        <div><span>Hạt giống (seed)</span><b>${r.seed}</b></div>
        <div><span>Tay bài cao nhất</span><b>${fmtNum(s.bestHand)}</b></div>
        <div><span>Tay đánh nhiều nhất</span><b>${handVN(mostPlayedHand())}</b></div>
        <div><span>Lá đã đánh</span><b>${s.cardsPlayed}</b></div>
        <div><span>Lá đã bỏ</span><b>${s.cardsDiscarded}</b></div>
        <div><span>Lượt đổi mới</span><b>${s.rerolls}</b></div>
        <div><span>Mù đã bỏ qua</span><b>${s.skips}</b></div>
        <div><span>Tarot đã dùng</span><b>${s.tarots}</b></div>
        <div><span>Số lá trên tay</span><b>${handSize()}</b></div>
      </div>`;
    }
    const m = this.openOverlay(`<div class="modal-title">Thông Tin Ván</div>
      <div class="tabs">${tabs.map(([k, l]) => `<button class="tab ${k === tab ? 'on' : ''}" data-tab="${k}">${l}</button>`).join('')}</div>
      <div class="modal-body">${body}</div>${this.backBtn()}`, 'm-info');
    $$('[data-tab]', m).forEach((b) => (b.onclick = () => { SND.play('button'); this.showRunInfo(b.dataset.tab); }));
    this.bindClose(m);
  },
  showOptions() {
    const s = G.settings;
    const m = this.openOverlay(`<div class="modal-title">Tuỳ Chọn</div>
      <div class="opt-row"><span>Tốc độ game</span><div class="seg">${[0.5, 1, 2, 4].map((v) => `<button class="tab ${s.speed === v ? 'on' : ''}" data-speed="${v}">${String(v).replace('.', ',')}x</button>`).join('')}</div></div>
      <div class="opt-row"><span>Âm thanh</span><div class="seg"><button class="tab ${s.sound ? 'on' : ''}" data-snd="1">Bật</button><button class="tab ${!s.sound ? 'on' : ''}" data-snd="0">Tắt</button></div></div>
      ${canFullscreen() ? `<div class="opt-row"><span>Toàn màn hình</span><div class="seg"><button class="tab" id="optFs">Bật / Tắt</button></div></div>` : ''}
      <div class="opt-row"><span>Hiệu ứng CRT</span><div class="seg"><button class="tab ${s.crt ? 'on' : ''}" data-crt="1">Bật</button><button class="tab ${!s.crt ? 'on' : ''}" data-crt="0">Tắt</button></div></div>
      ${G.run ? `<button class="btn green wide" id="optRules">Hướng Dẫn Chơi</button><button class="btn red wide" id="optNew">Ván Mới</button><button class="btn grey wide" id="optMenu">Về Menu Chính</button>` : ''}
      ${this.backBtn()}`, 'm-opt');
    $$('[data-speed]', m).forEach((b) => (b.onclick = () => { s.speed = +b.dataset.speed; saveSettings(); this.showOptions(); }));
    $$('[data-snd]', m).forEach((b) => (b.onclick = () => { s.sound = b.dataset.snd === '1'; saveSettings(); SND.play('button'); this.showOptions(); }));
    $$('[data-crt]', m).forEach((b) => (b.onclick = () => { s.crt = b.dataset.crt === '1'; saveSettings(); applyCRT(); this.showOptions(); }));
    const fsb = $('#optFs', m);
    if (fsb) fsb.onclick = () => { SND.play('button'); toggleFullscreen(); };
    if (G.run) {
      $('#optNew', m).onclick = () => { SND.play('button'); this.showNewRun(); };
      $('#optMenu', m).onclick = () => { SND.play('button'); save(); this.closeOverlay(); showMenu(); };
      $('#optRules', m).onclick = () => { SND.play('button'); this.showGuide(); };
    }
    this.bindClose(m);
  },
  showDeck() {
    const r = G.run;
    if (!r) return;
    const inPlay = r.phase === 'round';
    let html = '<div class="deckview">';
    for (const s of SUITS) {
      const cards = r.deck.filter((c) => c.suit === s && c.enh !== 'stone').sort((a, b) => b.rank - a.rank);
      if (!cards.length) continue;
      html += `<div class="dv-row"><div class="dv-suit" style="color:${SUIT[s].col}">${SUIT[s].sym}<small>${cards.length}</small></div><div class="dv-cards">`;
      cards.forEach((c) => { const used = inPlay && !r.draw.includes(c); html += `<div class="minicard ${used ? 'used' : ''}" data-uid="${c.uid}">${this.cardFace(Object.assign({}, c, { faceDown: false, debuff: false }))}</div>`; });
      html += '</div></div>';
    }
    const stones = r.deck.filter((c) => c.enh === 'stone');
    if (stones.length) {
      html += `<div class="dv-row"><div class="dv-suit">🪨<small>${stones.length}</small></div><div class="dv-cards">`;
      stones.forEach((c) => { const used = inPlay && !r.draw.includes(c); html += `<div class="minicard ${used ? 'used' : ''}" data-uid="${c.uid}">${this.cardFace(Object.assign({}, c, { faceDown: false, debuff: false }))}</div>`; });
      html += '</div></div>';
    }
    html += '</div>';
    const cnt = (fn) => r.deck.filter(fn).length;
    const sum = `<div class="dv-sum">Tổng: <b>${r.deck.length}</b> lá · Át: ${cnt((c) => c.rank === 14 && c.enh !== 'stone')} · Mặt người: ${cnt((c) => c.rank >= 11 && c.rank <= 13 && c.enh !== 'stone')} · Số: ${cnt((c) => c.rank <= 10 && c.enh !== 'stone')}${inPlay ? ` · Còn trong bộ: <b>${r.draw.length}</b>` : ''}</div>`;
    const m = this.openOverlay(`<div class="modal-title">${DECKS[r.deckKey].name}</div>${sum}<div class="modal-body">${html}</div>${this.backBtn()}`, 'm-deck');
    $$('.minicard', m).forEach((el) => {
      const c = r.deck.find((x) => x.uid == el.dataset.uid);
      this.bindTip(el, () => this.tipHTML(Object.assign({}, c, { faceDown: false }), 'deck'));
    });
    this.bindClose(m);
  },
  showNewRun() {
    const st = this.nr || (this.nr = { deck: 'red', stake: 1 });
    const keys = Object.keys(DECKS);
    const D = DECKS[st.deck];
    const prof = loadProfile();
    const m = this.openOverlay(`<div class="modal-title">Ván Mới</div>
      <div class="nr-deck">
        <button class="btn orange arrow" id="dkPrev">◀</button>
        <div class="nr-deckcard"><div class="face cardback back-${st.deck}" style="--dc:${D.col}"></div></div>
        <div class="nr-info"><div class="nr-name">${D.name}</div><div class="nr-desc">${fmt(D.desc)}</div></div>
        <button class="btn orange arrow" id="dkNext">▶</button>
      </div>
      <div class="nr-stake">
        <button class="btn orange arrow sm" id="skPrev">◀</button>
        <div class="nr-stakeinfo"><div class="stakechip" style="--sc:${STAKES[st.stake].col}"></div><div><div class="nr-sname">${STAKES[st.stake].name}</div><div class="nr-sdesc">${fmt(STAKES[st.stake].desc)}${st.stake > 1 ? '\n<span class="dim">(cộng dồn mọi mức trước)</span>' : ''}</div></div></div>
        <button class="btn orange arrow sm" id="skNext">▶</button>
      </div>
      <div class="nr-seed"><span>Seed (tuỳ chọn):</span><input id="seedIn" maxlength="8" placeholder="Ngẫu nhiên" value="${st.seed || ''}"></div>
      <button class="btn blue wide big" id="nrPlay">CHƠI</button>
      ${this.backBtn()}`, 'm-new');
    const go = (d) => { const i = keys.indexOf(st.deck); st.deck = keys[(i + d + keys.length) % keys.length]; SND.play('card'); this.showNewRun(); };
    $('#dkPrev', m).onclick = () => go(-1);
    $('#dkNext', m).onclick = () => go(1);
    $('#skPrev', m).onclick = () => { st.stake = st.stake <= 1 ? 8 : st.stake - 1; SND.play('button'); this.showNewRun(); };
    $('#skNext', m).onclick = () => { st.stake = st.stake >= 8 ? 1 : st.stake + 1; SND.play('button'); this.showNewRun(); };
    $('#seedIn', m).oninput = (e) => { st.seed = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); };
    $('#nrPlay', m).onclick = () => { SND.play('win'); startRun(st.deck, st.stake, st.seed || null); };
    this.bindClose(m);
  },
  statsBlock() {
    const r = G.run, s = r.stats;
    return `<div class="go-stats">
      <div><span>Tay bài cao nhất</span><b class="c-chips">${fmtNum(s.bestHand)}</b></div>
      <div><span>Tay đánh nhiều nhất</span><b>${handVN(mostPlayedHand())}</b></div>
      <div><span>Lá đã đánh</span><b>${s.cardsPlayed}</b></div>
      <div><span>Lá đã bỏ</span><b>${s.cardsDiscarded}</b></div>
      <div><span>Lượt đổi mới</span><b>${s.rerolls}</b></div>
      <div><span>Ante</span><b class="c-attn">${r.ante}</b></div>
      <div><span>Vòng</span><b class="c-attn">${r.round}</b></div>
      <div><span>Seed</span><b>${r.seed}</b></div>
    </div>`;
  },
  showGameOver() {
    const r = G.run;
    const prof = loadProfile();
    prof.losses++;
    prof.best = Math.max(prof.best, r.stats.bestHand);
    prof.bestAnte = Math.max(prof.bestAnte, r.ante);
    saveProfile(prof);
    const b = r.blind;
    const bi = b.type === 'boss' ? BOSSES[b.key] : BLIND_INFO[b.type];
    const m = this.openOverlay(`<div class="modal-title big c-mult">THUA CUỘC!</div>
      <div class="go-sub">Bị đánh bại bởi ${this.blindChip(b.type, b.key, 40)} <b style="color:${bi.col}">${bi.name}</b></div>
      ${this.statsBlock()}
      <button class="btn blue wide big" id="goNew">Ván Mới</button>
      <button class="btn grey wide" id="goMenu">Menu Chính</button>`, 'm-over');
    $('#goNew', m).onclick = () => { SND.play('button'); this.showNewRun(); };
    $('#goMenu', m).onclick = () => { SND.play('button'); this.closeOverlay(); G.run = null; showMenu(); };
  },
  showWin() {
    const r = G.run;
    const prof = loadProfile();
    prof.wins++;
    prof.best = Math.max(prof.best, r.stats.bestHand);
    prof.stakes[r.deckKey] = Math.max(prof.stakes[r.deckKey] || 0, r.stake);
    saveProfile(prof);
    SND.play('win');
    const m = this.openOverlay(`<div class="modal-title big c-attn win-title">CHIẾN THẮNG!</div>
      <div class="go-sub">Bạn đã đánh bại Ante 8 với ${DECKS[r.deckKey].name} - ${STAKES[r.stake].name}</div>
      ${this.statsBlock()}
      <button class="btn orange wide big" id="wEndless">Chơi Tiếp (Vô Tận)</button>
      <button class="btn blue wide" id="wNew">Ván Mới</button>
      <button class="btn grey wide" id="wMenu">Menu Chính</button>`, 'm-over win');
    $('#wEndless', m).onclick = () => { r.endless = true; this.closeOverlay(); save(); };
    $('#wNew', m).onclick = () => { clearSave(); this.showNewRun(); };
    $('#wMenu', m).onclick = () => { clearSave(); this.closeOverlay(); G.run = null; showMenu(); };
  },
  showCollection(tab = 'jokers') {
    const tabs = [['jokers', 'Joker'], ['tarot', 'Tarot'], ['planet', 'Hành Tinh'], ['spectral', 'Huyền Bí'], ['vouchers', 'Phiếu'], ['tags', 'Thẻ'], ['bosses', 'Mù Trùm'], ['enh', 'Cường Hoá']];
    let items = [];
    if (tab === 'jokers') items = Object.keys(JOKERS).map((k) => ({ uid: 'c' + k, kind: 'joker', key: k, st: {}, s: JOKERS[k].init ? JOKERS[k].init() : {}, extra: 0, cost: JOKERS[k].cost }));
    else if (tab === 'tarot') items = Object.keys(TAROTS).map((k) => ({ uid: 'c' + k, kind: 'tarot', key: k }));
    else if (tab === 'planet') items = Object.keys(PLANETS).map((k) => ({ uid: 'c' + k, kind: 'planet', key: k }));
    else if (tab === 'spectral') items = Object.keys(SPECTRALS).map((k) => ({ uid: 'c' + k, kind: 'spectral', key: k }));
    else if (tab === 'vouchers') items = Object.keys(VOUCHERS).map((k) => ({ uid: 'c' + k, kind: 'voucher', key: k }));
    let grid = '';
    if (tab === 'tags') {
      grid = '<div class="col-list">' + Object.keys(TAGS).map((k) => `<div class="col-li"><div class="tagico">${TAGS[k].icon}</div><div><b>${TAGS[k].name}</b><div>${fmt(typeof TAGS[k].desc === 'function' ? TAGS[k].desc({ hand: 'Pair' }) : TAGS[k].desc)}</div></div></div>`).join('') + '</div>';
    } else if (tab === 'bosses') {
      grid = '<div class="col-list">' + Object.keys(BOSSES).map((k) => `<div class="col-li">${this.blindChip('boss', k, 56)}<div><b style="color:${BOSSES[k].col};filter:brightness(1.3)">${BOSSES[k].name}</b>${BOSSES[k].showdown ? ' <span class="badge" style="--bc:#b26cbb">Trùm Cuối</span>' : ` <span class="dim">(từ Ante ${BOSSES[k].min})</span>`}<div>${fmt(typeof BOSSES[k].desc === 'function' ? BOSSES[k].desc() : BOSSES[k].desc)}</div></div></div>`).join('') + '</div>';
    } else if (tab === 'enh') {
      const demo = [];
      for (const e of Object.keys(ENH)) demo.push({ title: ENH[e].name, desc: ENH[e].desc(), card: { kind: 'card', rank: 14, suit: 'S', enh: e, bonus: 0 } });
      for (const e of ['foil', 'holo', 'poly']) demo.push({ title: EDITION[e].name, desc: EDITION[e].desc, card: { kind: 'card', rank: 13, suit: 'H', ed: e, bonus: 0 } });
      for (const s of Object.keys(SEAL)) demo.push({ title: SEAL[s].name, desc: SEAL[s].desc, card: { kind: 'card', rank: 7, suit: 'D', seal: s, bonus: 0 } });
      grid = '<div class="col-list">' + demo.map((d) => `<div class="col-li"><div class="minicard">${this.cardFace(d.card)}</div><div><b>${d.title}</b><div>${fmt(d.desc)}</div></div></div>`).join('') + '</div>';
    } else {
      grid = '<div class="col-grid">' + items.map((o) => `<div class="col-card" data-uid="${o.uid}">${this.faceHTML(o)}</div>`).join('') + '</div>';
    }
    const m = this.openOverlay(`<div class="modal-title">Bộ Sưu Tập</div>
      <div class="tabs">${tabs.map(([k, l]) => `<button class="tab ${k === tab ? 'on' : ''}" data-tab="${k}">${l}</button>`).join('')}</div>
      <div class="modal-body">${grid}</div>${this.backBtn()}`, 'm-col');
    $$('[data-tab]', m).forEach((b) => (b.onclick = () => { SND.play('button'); this.showCollection(b.dataset.tab); }));
    $$('.col-card', m).forEach((el) => {
      const o = items.find((x) => x.uid === el.dataset.uid);
      this.bindTip(el, () => this.tipHTML(o, 'col'));
    });
    this.bindClose(m);
  },
};

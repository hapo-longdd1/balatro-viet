'use strict';
// ================= TAROT / HÀNH TINH / HUYỀN BÍ =================
const TAROTS = {
  fool: {
    name: 'Kẻ Khờ', num: '0', icon: '🃏',
    desc: () => {
      const l = G.run && G.run.lastCons;
      return 'Tạo lá [t]Tarot[/] hoặc [p]Hành Tinh[/]\ncuối cùng đã dùng trong ván\n[d](Trừ Kẻ Khờ)[/]' + (l ? `\n[a]${consDef(l).name}[/]` : '\n[m]Chưa có[/]');
    },
    can: (sel, c) => !!(G.run.lastCons && consSpaceIf(c) > 0),
    use: () => { const l = G.run.lastCons; createCons(l.kind, l.key); },
  },
  magician: { name: 'Nhà Ảo Thuật', num: 'I', icon: '🎩', max: 2, min: 1, desc: () => 'Cường hoá [a]2[/] lá được chọn\nthành [a]Lá May Mắn[/]', use: (sel) => enhance(sel, 'lucky') },
  high_priestess: {
    name: 'Nữ Tư Tế', num: 'II', icon: '🌙', desc: () => 'Tạo tối đa [a]2[/] lá [p]Hành Tinh[/]\nngẫu nhiên\n[d](Cần chỗ trống)[/]',
    can: (sel, c) => consSpaceIf(c) > 0,
    use: () => { const n = Math.min(2, consSpace()); for (let i = 0; i < n; i++) createCons('planet'); },
  },
  empress: { name: 'Nữ Hoàng', num: 'III', icon: '👸', max: 2, min: 1, desc: () => 'Cường hoá [a]2[/] lá được chọn\nthành [a]Lá Nhân[/]', use: (sel) => enhance(sel, 'mult') },
  emperor: {
    name: 'Hoàng Đế', num: 'IV', icon: '🤴', desc: () => 'Tạo tối đa [a]2[/] lá [t]Tarot[/]\nngẫu nhiên\n[d](Cần chỗ trống)[/]',
    can: (sel, c) => consSpaceIf(c) > 0,
    use: () => { const n = Math.min(2, consSpace()); for (let i = 0; i < n; i++) createCons('tarot'); },
  },
  hierophant: { name: 'Giáo Hoàng', num: 'V', icon: '⛪', max: 2, min: 1, desc: () => 'Cường hoá [a]2[/] lá được chọn\nthành [a]Lá Thưởng[/]', use: (sel) => enhance(sel, 'bonus') },
  lovers: { name: 'Đôi Tình Nhân', num: 'VI', icon: '💕', max: 1, min: 1, desc: () => 'Cường hoá [a]1[/] lá được chọn\nthành [a]Lá Đa Năng[/]', use: (sel) => enhance(sel, 'wild') },
  chariot: { name: 'Cỗ Xe', num: 'VII', icon: '🏇', max: 1, min: 1, desc: () => 'Cường hoá [a]1[/] lá được chọn\nthành [a]Lá Thép[/]', use: (sel) => enhance(sel, 'steel') },
  justice: { name: 'Công Lý', num: 'VIII', icon: '⚖️', max: 1, min: 1, desc: () => 'Cường hoá [a]1[/] lá được chọn\nthành [a]Lá Thủy Tinh[/]', use: (sel) => enhance(sel, 'glass') },
  hermit: {
    name: 'Ẩn Sĩ', num: 'IX', icon: '🏮', desc: () => 'Nhân đôi số tiền\n[d](Tối đa [$]$20[/])[/]',
    use: () => addMoney(Math.max(0, Math.min(20, G.run.money))),
  },
  wheel: {
    name: 'Bánh Xe Số Phận', num: 'X', icon: '🎡', desc: () => `[g]${odds(1)} trên 4[/] khả năng thêm phiên bản\n[c]Ánh Kim[/], [m]Ba Chiều[/] hoặc [x]Đa Sắc[/]\ncho một [a]Joker[/] ngẫu nhiên`,
    can: () => G.run.jokers.some((j) => !j.ed),
    use: () => {
      if (P(1, 4)) {
        const j = pick(G.run.jokers.filter((x) => !x.ed));
        const x = R();
        j.ed = x < 0.5 ? 'foil' : x < 0.85 ? 'holo' : 'poly';
        say(j, EDITION[j.ed].name + '!', 'attn');
      } else say('center', 'Tiếc quá!', 'tarot', true);
    },
  },
  strength: {
    name: 'Sức Mạnh', num: 'XI', icon: '🦁', max: 2, min: 1, desc: () => 'Tăng hạng của tối đa\n[a]2[/] lá được chọn thêm [a]1[/]',
    use: (sel) => sel.forEach((c) => { c.rank = c.rank === 14 ? 2 : c.rank + 1; }),
  },
  hanged_man: { name: 'Người Treo Ngược', num: 'XII', icon: '🙃', max: 2, min: 1, desc: () => 'Phá huỷ tối đa\n[a]2[/] lá được chọn', use: (sel) => destroyCards(sel) },
  death: {
    name: 'Cái Chết', num: 'XIII', icon: '💀', max: 2, min: 2, desc: () => 'Chọn [a]2[/] lá, biến lá [a]bên trái[/]\nthành bản sao của lá [a]bên phải[/]\n[d](Kéo để sắp xếp)[/]',
    use: (sel) => {
      const ord = sel.slice().sort((a, b) => G.run.hand.indexOf(a) - G.run.hand.indexOf(b));
      const [l, rr] = ord;
      Object.assign(l, { rank: rr.rank, suit: rr.suit, enh: rr.enh, ed: rr.ed, seal: rr.seal, bonus: rr.bonus });
    },
  },
  temperance: {
    name: 'Tiết Độ', num: 'XIV', icon: '🍷', desc: () => `Nhận tổng [a]giá bán[/] của mọi\n[a]Joker[/] hiện có\n[d](Tối đa [$]$50[/])[/]` + (G.run ? `\n[d](Hiện tại [$]$${Math.min(50, G.run.jokers.reduce((a, j) => a + sellValue(j), 0))}[/])[/]` : ''),
    use: () => addMoney(Math.min(50, G.run.jokers.reduce((a, j) => a + sellValue(j), 0))),
  },
  devil: { name: 'Ác Quỷ', num: 'XV', icon: '😈', max: 1, min: 1, desc: () => 'Cường hoá [a]1[/] lá được chọn\nthành [a]Lá Vàng[/]', use: (sel) => enhance(sel, 'gold') },
  tower: { name: 'Toà Tháp', num: 'XVI', icon: '🗼', max: 1, min: 1, desc: () => 'Cường hoá [a]1[/] lá được chọn\nthành [a]Lá Đá[/]', use: (sel) => enhance(sel, 'stone') },
  star: { name: 'Ngôi Sao', num: 'XVII', icon: '⭐', max: 3, min: 1, desc: () => 'Đổi tối đa [a]3[/] lá được chọn\nthành chất [D]Rô[/]', use: (sel) => setSuit(sel, 'D') },
  moon: { name: 'Mặt Trăng', num: 'XVIII', icon: '🌜', max: 3, min: 1, desc: () => 'Đổi tối đa [a]3[/] lá được chọn\nthành chất [C]Chuồn[/]', use: (sel) => setSuit(sel, 'C') },
  sun: { name: 'Mặt Trời', num: 'XIX', icon: '☀️', max: 3, min: 1, desc: () => 'Đổi tối đa [a]3[/] lá được chọn\nthành chất [H]Cơ[/]', use: (sel) => setSuit(sel, 'H') },
  judgement: {
    name: 'Phán Xét', num: 'XX', icon: '📯', desc: () => 'Tạo một lá [a]Joker[/]\nngẫu nhiên\n[d](Cần chỗ trống)[/]',
    can: () => jokerSpace() > 0,
    use: () => createJoker({}),
  },
  world: { name: 'Thế Giới', num: 'XXI', icon: '🌍', max: 3, min: 1, desc: () => 'Đổi tối đa [a]3[/] lá được chọn\nthành chất [S]Bích[/]', use: (sel) => setSuit(sel, 'S') },
};

const PLANETS = {
  pluto: { name: 'Sao Diêm Vương', hand: 'High Card', col: '#c9a98b', col2: '#7a5a45', sys: 'Hành tinh lùn' },
  mercury: { name: 'Sao Thuỷ', hand: 'Pair', col: '#b8b8b8', col2: '#6a6a6a', sys: 'Hành tinh' },
  uranus: { name: 'Sao Thiên Vương', hand: 'Two Pair', col: '#9fe3ea', col2: '#3c8f99', sys: 'Hành tinh' },
  venus: { name: 'Sao Kim', hand: 'Three of a Kind', col: '#f1d38e', col2: '#b0863a', sys: 'Hành tinh' },
  saturn: { name: 'Sao Thổ', hand: 'Straight', col: '#e8d39c', col2: '#a4874a', sys: 'Hành tinh', ring: true },
  jupiter: { name: 'Sao Mộc', hand: 'Flush', col: '#e2b58a', col2: '#9a5f36', sys: 'Hành tinh', bands: true },
  earth: { name: 'Trái Đất', hand: 'Full House', col: '#4fa3e8', col2: '#2b7a3a', sys: 'Hành tinh' },
  mars: { name: 'Sao Hoả', hand: 'Four of a Kind', col: '#e0643c', col2: '#8f2f17', sys: 'Hành tinh' },
  neptune: { name: 'Sao Hải Vương', hand: 'Straight Flush', col: '#3f63e0', col2: '#1d2f8a', sys: 'Hành tinh' },
  planet_x: { name: 'Hành Tinh X', hand: 'Five of a Kind', col: '#a06bd0', col2: '#4d2a73', sys: 'Hành tinh?', secret: true },
  ceres: { name: 'Ceres', hand: 'Flush House', col: '#a3a3a3', col2: '#555', sys: 'Hành tinh lùn', secret: true },
  eris: { name: 'Eris', hand: 'Flush Five', col: '#d9d9f0', col2: '#6a6a9a', sys: 'Hành tinh lùn', secret: true },
};
for (const k in PLANETS) {
  const p = PLANETS[k];
  p.desc = () => {
    const H = HANDS[p.hand];
    const lv = G.run ? G.run.hands[p.hand].level : 1;
    return `[d](cấp ${lv})[/] Nâng cấp\n[a]${H.vn}[/]\n[m]+${H.lm}[/] Nhân và\n[c]+${H.lc}[/] Chip`;
  };
  p.use = () => levelUp(p.hand, 1);
}

const SPECTRALS = {
  familiar: {
    name: 'Linh Thú', icon: '🦇', desc: () => 'Phá huỷ [a]1[/] lá ngẫu nhiên trên tay,\nthêm [a]3[/] lá [a]mặt người[/] được\n[a]Cường Hoá[/] ngẫu nhiên lên tay',
    can: () => G.run.hand.length > 0,
    use: () => spectralReplace(1, () => newCard(pick([11, 12, 13]), pick(SUITS), { enh: randEnh() }), 3),
  },
  grim: {
    name: 'Thần Chết', icon: '⚰️', desc: () => 'Phá huỷ [a]1[/] lá ngẫu nhiên trên tay,\nthêm [a]2[/] lá [a]Át[/] được\n[a]Cường Hoá[/] ngẫu nhiên lên tay',
    can: () => G.run.hand.length > 0,
    use: () => spectralReplace(1, () => newCard(14, pick(SUITS), { enh: randEnh() }), 2),
  },
  incantation: {
    name: 'Thần Chú', icon: '📿', desc: () => 'Phá huỷ [a]1[/] lá ngẫu nhiên trên tay,\nthêm [a]4[/] lá [a]số[/] được\n[a]Cường Hoá[/] ngẫu nhiên lên tay',
    can: () => G.run.hand.length > 0,
    use: () => spectralReplace(1, () => newCard(RI(2, 10), pick(SUITS), { enh: randEnh() }), 4),
  },
  talisman: { name: 'Bùa Hộ Mệnh', icon: '🧿', max: 1, min: 1, desc: () => 'Thêm [$]Dấu Vàng[/] vào\n[a]1[/] lá được chọn', use: (sel) => sel.forEach((c) => (c.seal = 'gold')) },
  aura: {
    name: 'Hào Quang', icon: '🌈', max: 1, min: 1, desc: () => 'Thêm phiên bản [c]Ánh Kim[/],\n[m]Ba Chiều[/] hoặc [x]Đa Sắc[/] vào\n[a]1[/] lá được chọn',
    can: (sel) => sel.length === 1 && !sel[0].ed,
    use: (sel) => { const x = R(); sel[0].ed = x < 0.5 ? 'foil' : x < 0.85 ? 'holo' : 'poly'; },
  },
  wraith: {
    name: 'Oan Hồn', icon: '👻', desc: () => 'Tạo một Joker [m]Hiếm[/]\nngẫu nhiên, đặt tiền về [$]$0[/]\n[d](Cần chỗ trống)[/]',
    can: () => jokerSpace() > 0,
    use: () => { createJoker({ rarity: 3 }); if (G.run.money > 0) addMoney(-G.run.money); },
  },
  sigil: {
    name: 'Ấn Chú', icon: '☯️', desc: () => 'Đổi mọi lá trên tay\nthành [a]một chất[/] ngẫu nhiên',
    can: () => G.run.hand.length > 0,
    use: () => setSuit(G.run.hand, pick(SUITS)),
  },
  ouija: {
    name: 'Cầu Cơ', icon: '🪬', desc: () => 'Đổi mọi lá trên tay\nthành [a]một hạng[/] ngẫu nhiên\n[m]-1[/] số lá trên tay',
    can: () => G.run.hand.length > 0,
    use: () => { const rk = pick(RANKS); G.run.hand.forEach((c) => { if (c.enh !== 'stone') c.rank = rk; }); G.run.baseHandSize -= 1; },
  },
  ectoplasm: {
    name: 'Ngoại Chất', icon: '🧪', desc: () => 'Thêm phiên bản [d]Âm Bản[/] vào\nmột [a]Joker[/] ngẫu nhiên,\n[m]-1[/] số lá trên tay',
    can: () => G.run.jokers.some((j) => !j.ed),
    use: () => { const j = pick(G.run.jokers.filter((x) => !x.ed)); j.ed = 'negative'; G.run.baseHandSize -= 1; },
  },
  immolate: {
    name: 'Hoả Táng', icon: '🔥', desc: () => 'Phá huỷ [a]5[/] lá ngẫu nhiên\ntrên tay, nhận [$]$20[/]',
    can: () => G.run.hand.length > 0,
    use: () => { const t = shuffle(G.run.hand.slice()).slice(0, 5); destroyCards(t); addMoney(20); },
  },
  ankh: {
    name: 'Ankh', icon: '☥', desc: () => 'Tạo một bản sao của một\n[a]Joker[/] ngẫu nhiên, phá huỷ\nmọi Joker khác\n[d](Trừ Vĩnh Cửu)[/]',
    can: () => G.run.jokers.length > 0,
    use: () => {
      const r = G.run, t = pick(r.jokers);
      r.jokers.filter((j) => j !== t && !j.st.eternal).forEach((j) => destroyJoker(j));
      const cp = cloneJoker(t);
      if (cp.ed === 'negative') cp.ed = null;
      r.jokers.push(cp);
    },
  },
  deja_vu: { name: 'Déjà Vu', icon: '🔁', max: 1, min: 1, desc: () => 'Thêm [m]Dấu Đỏ[/] vào\n[a]1[/] lá được chọn', use: (sel) => sel.forEach((c) => (c.seal = 'red')) },
  hex: {
    name: 'Bùa Ếm', icon: '🕸️', desc: () => 'Thêm phiên bản [x]Đa Sắc[/] vào\nmột [a]Joker[/] ngẫu nhiên,\nphá huỷ mọi Joker khác\n[d](Trừ Vĩnh Cửu)[/]',
    can: () => G.run.jokers.some((j) => !j.ed),
    use: () => {
      const r = G.run, t = pick(r.jokers.filter((x) => !x.ed));
      t.ed = 'poly';
      r.jokers.filter((j) => j !== t && !j.st.eternal).forEach((j) => destroyJoker(j));
    },
  },
  trance: { name: 'Xuất Thần', icon: '🌀', max: 1, min: 1, desc: () => 'Thêm [c]Dấu Xanh[/] vào\n[a]1[/] lá được chọn', use: (sel) => sel.forEach((c) => (c.seal = 'blue')) },
  medium: { name: 'Đồng Cốt', icon: '🕯️', max: 1, min: 1, desc: () => 'Thêm [t]Dấu Tím[/] vào\n[a]1[/] lá được chọn', use: (sel) => sel.forEach((c) => (c.seal = 'purple')) },
  cryptid: {
    name: 'Sinh Vật Bí Ẩn', icon: '🐉', max: 1, min: 1, desc: () => 'Tạo [a]2[/] bản sao của\n[a]1[/] lá được chọn',
    use: (sel) => addCardsToDeck([copyCard(sel[0]), copyCard(sel[0])], true),
  },
  soul: {
    name: 'Linh Hồn', icon: '💠', hidden: true, desc: () => 'Tạo một Joker\n[t]Huyền Thoại[/]\n[d](Cần chỗ trống)[/]',
    can: () => jokerSpace() > 0,
    use: () => createJoker({ rarity: 4 }),
  },
  black_hole: {
    name: 'Hố Đen', icon: '🕳️', hidden: true, desc: () => 'Nâng cấp mọi\n[a]tay bài[/] thêm [a]1[/] cấp',
    use: () => { for (const k of HAND_KEYS) G.run.hands[k].level += 1; say('center', 'Mọi tay bài +1 cấp!', 'planet', true); },
  },
};

function consDef(c) {
  const k = c.kind;
  if (k === 'tarot') return TAROTS[c.key];
  if (k === 'planet') return PLANETS[c.key];
  if (k === 'spectral') return SPECTRALS[c.key];
  return null;
}
function randEnh() { return pick(['bonus', 'mult', 'wild', 'glass', 'steel', 'stone', 'gold', 'lucky']); }
function spectralReplace(nDestroy, gen, nAdd) {
  const t = shuffle(G.run.hand.slice()).slice(0, nDestroy);
  destroyCards(t);
  const cards = [];
  for (let i = 0; i < nAdd; i++) cards.push(gen());
  addCardsToDeck(cards, true);
}

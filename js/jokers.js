'use strict';
// ================= JOKER =================
// Hook: main, onScored, onHeld, retrig, before, after, onOther, onDiscard, onDiscardCard,
//       destroyCheck, dollars, roundEnd, blindSelect, onReroll, onSell, onAnySell, onPackOpen,
//       onPackSkip, onUse, onAdd, onDestroy, onBoss, shopEnd, onRoundStart
// Thụ động: handSize, hands, discards (số hoặc hàm)
const JOKERS = {};
function DJ(key, name, rarity, cost, icon, desc, o = {}) {
  JOKERS[key] = Object.assign({ key, name, rarity, cost, icon, desc }, o);
}
const cur = (s) => `\n[d](Hiện tại ${s})[/]`;
const rv = () => (G.run && G.run.rv) || { mailRank: 14, castleSuit: 'S', ancientSuit: 'S', idolRank: 14, idolSuit: 'S', todoHand: 'Pair' };
const S = (s) => `[${s}]${SUIT[s].name}[/]`;
function effTxt(e) {
  if (e.chips) return `[c]+${e.chips}[/] Chip`;
  if (e.mult) return `[m]+${e.mult}[/] Nhân`;
  if (e.xmult) return `[x]X${fx(e.xmult)}[/] Nhân`;
  return '';
}

// ---------- Phổ biến cơ bản ----------
DJ('joker', 'Joker', 1, 2, '🃏', '[m]+4[/] Nhân', { main: () => ({ mult: 4 }) });

function suitJ(key, name, icon, suit) {
  DJ(key, name, 1, 5, icon, () => `Các lá ${S(suit)} được đánh\ncho [m]+3[/] Nhân khi tính điểm`, {
    onScored: (c, j, card) => (isSuit(card, suit) ? { mult: 3 } : null),
  });
}
suitJ('greedy', 'Hề Tham Lam', '💎', 'D');
suitJ('lusty', 'Hề Đa Tình', '💋', 'H');
suitJ('wrathful', 'Hề Phẫn Nộ', '😠', 'S');
suitJ('gluttonous', 'Hề Phàm Ăn', '🍗', 'C');

function handJ(key, name, rar, cost, icon, hand, eff) {
  DJ(key, name, rar, cost, icon, () => `${effTxt(eff)} nếu tay bài\nđã đánh chứa\n[a]${handVN(hand)}[/]`, {
    main: (c) => (c.contains[hand] ? eff : null),
  });
}
handJ('jolly', 'Hề Vui Vẻ', 1, 3, '😄', 'Pair', { mult: 8 });
handJ('zany', 'Hề Khùng', 1, 4, '🤪', 'Three of a Kind', { mult: 12 });
handJ('mad', 'Hề Điên', 1, 4, '😡', 'Two Pair', { mult: 10 });
handJ('crazy', 'Hề Dở Hơi', 1, 4, '🌀', 'Straight', { mult: 12 });
handJ('droll', 'Hề Hài Hước', 1, 4, '😏', 'Flush', { mult: 10 });
handJ('sly', 'Hề Ranh Mãnh', 1, 3, '🦊', 'Pair', { chips: 50 });
handJ('wily', 'Hề Láu Cá', 1, 4, '🐺', 'Three of a Kind', { chips: 100 });
handJ('clever', 'Hề Lanh Lợi', 1, 4, '🦉', 'Two Pair', { chips: 80 });
handJ('devious', 'Hề Xảo Quyệt', 1, 4, '😈', 'Straight', { chips: 100 });
handJ('crafty', 'Hề Khôn Khéo', 1, 4, '🛠️', 'Flush', { chips: 80 });
handJ('duo', 'Bộ Đôi', 3, 8, '👫', 'Pair', { xmult: 2 });
handJ('trio', 'Bộ Ba', 3, 8, '🔱', 'Three of a Kind', { xmult: 3 });
handJ('family', 'Gia Đình', 3, 8, '🏠', 'Four of a Kind', { xmult: 4 });
handJ('order', 'Trật Tự', 3, 8, '📐', 'Straight', { xmult: 3 });
handJ('tribe', 'Bộ Lạc', 3, 8, '🛖', 'Flush', { xmult: 2 });

DJ('half', 'Nửa Joker', 1, 5, '🌗', '[m]+20[/] Nhân nếu tay bài\nđã đánh có [a]3[/] lá trở xuống', {
  main: (c) => (c.played.length <= 3 ? { mult: 20 } : null),
});
DJ('stencil', 'Khuôn Hề', 2, 8, '✂️', () => `[x]X1[/] Nhân cho mỗi\nô [a]Joker[/] trống\n[d](Khuôn Hề cũng được tính)[/]` + cur(`[x]X${stencilX()}[/]`), {
  main: () => { const x = stencilX(); return x > 1 ? { xmult: x } : null; }, np: true,
});
DJ('four_fingers', 'Bốn Ngón', 2, 7, '🖐️', 'Mọi [a]Thùng[/] và [a]Sảnh[/]\ncó thể tạo bằng [a]4[/] lá', { passive: true });
DJ('mime', 'Kịch Câm', 2, 5, '🤐', 'Kích hoạt lại mọi hiệu ứng\ncủa lá [a]giữ trên tay[/]', {
  retrig: (c, j, card, area) => (area === 'held' ? 1 : 0),
});
DJ('credit_card', 'Thẻ Tín Dụng', 1, 1, '💳', 'Có thể nợ tới [m]-$20[/]', { passive: true });
DJ('dagger', 'Dao Nghi Lễ', 2, 6, '🗡️', (j) => `Khi chọn [a]Mù[/], phá huỷ Joker\nbên phải và cộng [a]gấp đôi[/]\ngiá bán của nó vào Nhân` + cur(`[m]+${j ? j.s.mult : 0}[/] Nhân`), {
  init: () => ({ mult: 0 }), np: true,
  blindSelect: (c, j) => {
    if (c.bp) return;
    const r = G.run, i = r.jokers.indexOf(j), t = r.jokers[i + 1];
    if (t && !t.st.eternal) {
      const v = 2 * sellValue(t);
      j.s.mult += v;
      destroyJoker(t);
      return { msg: `+${v} Nhân`, color: 'mult' };
    }
  },
  main: (c, j) => (j.s.mult > 0 ? { mult: j.s.mult } : null),
});
DJ('banner', 'Biểu Ngữ', 1, 5, '🏳️', '[c]+30[/] Chip cho mỗi\n[m]lượt bỏ[/] còn lại', {
  main: () => (G.run.discardsLeft > 0 ? { chips: 30 * G.run.discardsLeft } : null),
});
DJ('mystic_summit', 'Đỉnh Huyền Bí', 1, 5, '🏔️', '[m]+15[/] Nhân khi còn\n[a]0[/] lượt bỏ', {
  main: () => (G.run.discardsLeft === 0 ? { mult: 15 } : null),
});
DJ('marble', 'Hề Cẩm Thạch', 2, 6, '🏛️', 'Thêm một [a]Lá Đá[/] vào\nbộ bài khi chọn [a]Mù[/]', {
  blindSelect: () => {
    addCardsToDeck([newCard(pick(RANKS), pick(SUITS), { enh: 'stone' })], false);
    return { msg: '+1 Đá', color: 'attn' };
  },
});
DJ('loyalty', 'Thẻ Thành Viên', 2, 5, '🎫', (j) => `[x]X4[/] Nhân mỗi\n[a]6[/] lượt đánh` + `\n[d](${j && j.s.left === 0 ? 'Sẵn sàng!' : 'Còn ' + (j ? j.s.left : 5) + ' lượt'})[/]`, {
  init: () => ({ left: 5, active: false }), np: true,
  before: (c, j) => {
    if (c.bp) return;
    if (j.s.left === 0) { j.s.active = true; j.s.left = 5; } else { j.s.active = false; j.s.left--; }
  },
  main: (c, j) => (j.s.active ? { xmult: 4 } : null),
});
DJ('eight_ball', 'Bi Số 8', 1, 5, '🎱', () => `[g]${odds(1)} trên 4[/] khả năng mỗi lá [a]8[/]\nđược đánh tạo một lá [t]Tarot[/]\nkhi tính điểm\n[d](Cần chỗ trống)[/]`, {
  onScored: (c, j, card) => {
    if (rid(card) === 8 && P(1, 4) && consSpace() > 0) {
      createCons('tarot');
      return { msg: '+1 Tarot', color: 'tarot' };
    }
  },
});
DJ('misprint', 'In Lỗi', 1, 4, '🖨️', '[m]+0[/] đến [m]+23[/] Nhân', { main: () => ({ mult: RI(0, 23) }) });
DJ('dusk', 'Hoàng Hôn', 2, 5, '🌇', 'Kích hoạt lại mọi lá được\nđánh ở [a]lượt đánh cuối\ncùng[/] của vòng', {
  retrig: (c, j, card, area) => (area === 'play' && c.finalHand ? 1 : 0),
});
DJ('raised_fist', 'Nắm Đấm Giơ Cao', 1, 5, '✊', 'Cộng [a]gấp đôi[/] hạng của lá\n[a]thấp nhất[/] đang giữ trên tay\nvào Nhân', {
  onHeld: (c, j, card) => (card === c.lowestHeld ? { mult: 2 * rankChips(card.rank) } : null),
});
DJ('chaos', 'Chú Hề Hỗn Loạn', 1, 4, '🤡', '[a]1[/] lần đổi mới miễn phí\nmỗi cửa hàng', { passive: true });
DJ('fibonacci', 'Fibonacci', 2, 8, '🐚', 'Mỗi lá [a]Át[/], [a]2[/], [a]3[/], [a]5[/] hoặc [a]8[/]\nđược đánh cho [m]+8[/] Nhân\nkhi tính điểm', {
  onScored: (c, j, card) => ([14, 2, 3, 5, 8].includes(rid(card)) ? { mult: 8 } : null),
});
DJ('steel_joker', 'Hề Thép', 2, 7, '⚙️', () => `Nhận [x]X0,2[/] Nhân cho mỗi\n[a]Lá Thép[/] trong cả bộ bài` + cur(`[x]X${fx(1 + 0.2 * countDeck((x) => x.enh === 'steel'))}[/]`), {
  main: () => { const n = countDeck((x) => x.enh === 'steel'); return n ? { xmult: 1 + 0.2 * n } : null; },
});
DJ('scary_face', 'Mặt Đáng Sợ', 1, 4, '👹', 'Lá [a]mặt người[/] được đánh\ncho [c]+30[/] Chip khi tính điểm', {
  onScored: (c, j, card) => (isFace(card) ? { chips: 30 } : null),
});
DJ('abstract', 'Hề Trừu Tượng', 1, 4, '🎨', () => `[m]+3[/] Nhân cho mỗi\nlá [a]Joker[/]` + cur(`[m]+${G.run ? 3 * G.run.jokers.length : 0}[/] Nhân`), {
  main: () => ({ mult: 3 * G.run.jokers.length }),
});
DJ('delayed', 'Thưởng Muộn', 1, 4, '⏳', 'Nhận [$]$2[/] cho mỗi lượt bỏ\nnếu không bỏ bài nào\ntrong vòng', {
  dollars: () => { const r = G.run; return r.cr.discardsUsed === 0 && r.discardsLeft > 0 ? 2 * r.discardsLeft : 0; },
});
DJ('hack', 'Hack', 2, 6, '💻', 'Kích hoạt lại mỗi lá\n[a]2[/], [a]3[/], [a]4[/] hoặc [a]5[/] được đánh', {
  retrig: (c, j, card, area) => (area === 'play' && [2, 3, 4, 5].includes(rid(card)) ? 1 : 0),
});
DJ('pareidolia', 'Ảo Giác Mặt Người', 2, 5, '👀', 'Mọi lá bài đều được tính\nlà lá [a]mặt người[/]', { passive: true });
DJ('gros_michel', 'Chuối Gros Michel', 1, 5, '🍌', () => `[m]+15[/] Nhân\n[g]${odds(1)} trên 6[/] khả năng lá này\nbị phá huỷ khi hết vòng`, {
  ne: true, np: true,
  main: () => ({ mult: 15 }),
  roundEnd: (c, j) => {
    if (c.bp) return;
    if (P(1, 6)) { G.run.flags.grosGone = true; destroyJoker(j); return { msg: 'Tuyệt chủng!', color: 'mult' }; }
    return { msg: 'An toàn!', color: 'attn' };
  },
});
DJ('even_steven', 'Chẵn Chòi', 1, 4, '⚖️', 'Lá có hạng [a]chẵn[/] được đánh\ncho [m]+4[/] Nhân khi tính điểm\n[d](10, 8, 6, 4, 2)[/]', {
  onScored: (c, j, card) => ([2, 4, 6, 8, 10].includes(rid(card)) ? { mult: 4 } : null),
});
DJ('odd_todd', 'Lẻ Loi', 1, 4, '🎯', 'Lá có hạng [a]lẻ[/] được đánh\ncho [c]+31[/] Chip khi tính điểm\n[d](A, 9, 7, 5, 3)[/]', {
  onScored: (c, j, card) => ([3, 5, 7, 9, 14].includes(rid(card)) ? { chips: 31 } : null),
});
DJ('scholar', 'Học Giả', 1, 4, '🎓', 'Lá [a]Át[/] được đánh cho\n[c]+20[/] Chip và [m]+4[/] Nhân\nkhi tính điểm', {
  onScored: (c, j, card) => (rid(card) === 14 ? { chips: 20, mult: 4 } : null),
});
DJ('business', 'Danh Thiếp', 1, 4, '📇', () => `Lá [a]mặt người[/] được đánh có\n[g]${odds(1)} trên 2[/] khả năng cho [$]$2[/]\nkhi tính điểm`, {
  onScored: (c, j, card) => (isFace(card) && P(1, 2) ? { money: 2 } : null),
});
DJ('supernova', 'Siêu Tân Tinh', 1, 5, '💥', 'Cộng số lần [a]tay bài[/] đã\nđánh được đánh trong ván\nvào Nhân', {
  main: (c) => ({ mult: G.run.hands[c.hand].played }),
});
DJ('ride_bus', 'Đi Xe Buýt', 1, 6, '🚌', (j) => `Nhận [m]+1[/] Nhân cho mỗi lượt\nđánh [a]liên tiếp[/] không có lá\n[a]mặt người[/] được tính điểm` + cur(`[m]+${j ? j.s.mult : 0}[/] Nhân`), {
  init: () => ({ mult: 0 }), np: true,
  before: (c, j) => {
    if (c.bp) return;
    if (c.scoring.some((x) => isFace(x))) { const had = j.s.mult; j.s.mult = 0; return had ? { msg: 'Đặt lại!', color: 'attn' } : null; }
    j.s.mult += 1;
  },
  main: (c, j) => (j.s.mult ? { mult: j.s.mult } : null),
});
DJ('space', 'Hề Vũ Trụ', 2, 5, '🧑‍🚀', () => `[g]${odds(1)} trên 4[/] khả năng nâng cấp\ntay bài đã đánh`, {
  before: (c, j) => { if (P(1, 4)) { levelUp(c.hand, 1); return { msg: 'Lên cấp!', color: 'attn', level: c.hand }; } },
});
DJ('egg', 'Quả Trứng', 1, 4, '🥚', 'Nhận [$]$3[/] giá bán\nkhi hết mỗi vòng', {
  np: true,
  roundEnd: (c, j) => { if (c.bp) return; j.extra += 3; return { msg: 'Giá trị tăng!', color: 'money' }; },
});
DJ('burglar', 'Kẻ Trộm', 2, 6, '🦹', 'Khi chọn [a]Mù[/], nhận\n[c]+3[/] lượt đánh và mất\n[m]toàn bộ[/] lượt bỏ', {
  blindSelect: () => { G.run.handsLeft += 3; G.run.discardsLeft = 0; return { msg: '+3 Lượt đánh', color: 'chips' }; },
});
DJ('blackboard', 'Bảng Đen', 2, 6, '🖤', '[x]X3[/] Nhân nếu mọi lá đang\ngiữ trên tay là [S]Bích[/]\nhoặc [C]Chuồn[/]', {
  main: (c) => (c.held.every((x) => isSuit(x, 'S', { flush: true }) || isSuit(x, 'C', { flush: true })) ? { xmult: 3 } : null),
});
DJ('runner', 'Người Chạy', 1, 5, '🏃', (j) => `Nhận [c]+15[/] Chip nếu tay bài\nđã đánh chứa [a]Sảnh[/]` + cur(`[c]+${j ? j.s.chips : 0}[/] Chip`), {
  init: () => ({ chips: 0 }), np: true,
  before: (c, j) => { if (!c.bp && c.contains.Straight) { j.s.chips += 15; return { msg: 'Nâng cấp!', color: 'chips' }; } },
  main: (c, j) => (j.s.chips ? { chips: j.s.chips } : null),
});
DJ('ice_cream', 'Kem Que', 1, 5, '🍦', (j) => `[c]+${j ? j.s.chips : 100}[/] Chip\n[c]-5[/] Chip cho mỗi lượt đánh`, {
  init: () => ({ chips: 100 }), ne: true, np: true,
  main: (c, j) => ({ chips: j.s.chips }),
  after: (c, j) => {
    if (c.bp) return;
    j.s.chips -= 5;
    if (j.s.chips <= 0) { destroyJoker(j); return { msg: 'Tan chảy!', color: 'chips' }; }
    return { msg: '-5', color: 'chips' };
  },
});
DJ('dna', 'ADN', 3, 8, '🧬', 'Nếu [a]lượt đánh đầu tiên[/] của\nvòng chỉ có [a]1[/] lá, thêm một bản\nsao vĩnh viễn vào bộ bài\nvà rút nó lên tay', {
  before: (c) => {
    if (c.firstHand && c.played.length === 1) {
      const cp = copyCard(c.played[0]);
      addCardsToDeck([cp], true);
      return { msg: 'Sao chép!', color: 'chips' };
    }
  },
});
DJ('splash', 'Té Nước', 1, 3, '💦', 'Mọi lá [a]được đánh[/] đều\nđược tính điểm', { passive: true });
DJ('blue_joker', 'Hề Xanh', 1, 5, '🔵', () => `[c]+2[/] Chip cho mỗi lá còn lại\ntrong [a]bộ bài[/]` + cur(`[c]+${G.run ? 2 * G.run.draw.length : 104}[/] Chip`), {
  main: () => ({ chips: 2 * G.run.draw.length }),
});
DJ('sixth_sense', 'Giác Quan Thứ Sáu', 2, 6, '🔮', 'Nếu [a]lượt đánh đầu tiên[/] của\nvòng là một lá [a]6[/] duy nhất,\nphá huỷ nó và tạo một\nlá [s]Huyền Bí[/]\n[d](Cần chỗ trống)[/]', {
  destroyCheck: (c, j, card) => {
    if (c.firstHand && c.played.length === 1 && rid(card) === 6) {
      if (consSpace() > 0) { createCons('spectral'); }
      return true;
    }
  },
});
DJ('constellation', 'Chòm Sao', 2, 6, '✨', (j) => `Nhận [x]X0,1[/] Nhân mỗi khi\ndùng một lá [p]Hành Tinh[/]` + cur(`[x]X${fx(j ? j.s.x : 1)}[/] Nhân`), {
  init: () => ({ x: 1 }), np: true,
  onUse: (c, j, cons) => { if (!c.bp && cons.kind === 'planet') { j.s.x += 0.1; return { msg: 'Nâng cấp!', color: 'mult' }; } },
  main: (c, j) => (j.s.x > 1 ? { xmult: j.s.x } : null),
});
DJ('hiker', 'Người Leo Núi', 2, 5, '🥾', 'Mỗi lá được đánh nhận\nvĩnh viễn [c]+5[/] Chip\nkhi tính điểm', {
  onScored: (c, j, card) => { card.bonus += 5; return { msg: 'Nâng cấp!', color: 'chips' }; },
});
DJ('faceless', 'Hề Vô Diện', 1, 4, '😶', 'Nhận [$]$5[/] nếu bỏ [a]3[/] lá\n[a]mặt người[/] trở lên cùng lúc', {
  onDiscard: (c, j, cards) => (cards.filter((x) => isFace(x)).length >= 3 ? { money: 5 } : null),
});
DJ('green_joker', 'Hề Xanh Lá', 1, 4, '🟢', (j) => `[m]+1[/] Nhân mỗi lượt đánh\n[m]-1[/] Nhân mỗi lượt bỏ` + cur(`[m]+${j ? j.s.mult : 0}[/] Nhân`), {
  init: () => ({ mult: 0 }), np: true,
  before: (c, j) => { if (!c.bp) { j.s.mult += 1; return { msg: '+1 Nhân', color: 'mult' }; } },
  onDiscard: (c, j) => { if (!c.bp && j.s.mult > 0) { j.s.mult -= 1; return { msg: '-1 Nhân', color: 'mult' }; } },
  main: (c, j) => (j.s.mult ? { mult: j.s.mult } : null),
});
DJ('superposition', 'Chồng Chập', 1, 4, '⚛️', 'Tạo một lá [t]Tarot[/] nếu tay\nbài đã đánh chứa một lá\n[a]Át[/] và một [a]Sảnh[/]\n[d](Cần chỗ trống)[/]', {
  before: (c) => {
    if (c.contains.Straight && c.scoring.some((x) => rid(x) === 14) && consSpace() > 0) {
      createCons('tarot');
      return { msg: '+1 Tarot', color: 'tarot' };
    }
  },
});
DJ('todo', 'Danh Sách Việc', 1, 4, '📝', () => `Nhận [$]$4[/] nếu tay bài là\n[a]${handVN(rv().todoHand)}[/]\n[d](tay bài đổi mỗi vòng)[/]`, {
  before: (c) => (c.hand === rv().todoHand ? { money: 4 } : null),
});
DJ('cavendish', 'Chuối Cavendish', 1, 4, '🍌', () => `[x]X3[/] Nhân\n[g]${odds(1)} trên 1000[/] khả năng lá này\nbị phá huỷ khi hết vòng`, {
  ne: true, np: true,
  main: () => ({ xmult: 3 }),
  roundEnd: (c, j) => {
    if (c.bp) return;
    if (P(1, 1000)) { destroyJoker(j); return { msg: 'Tuyệt chủng!', color: 'mult' }; }
    return { msg: 'An toàn!', color: 'attn' };
  },
});
DJ('card_sharp', 'Cao Thủ Bài', 2, 6, '🎴', '[x]X3[/] Nhân nếu loại tay bài\nđã đánh [a]đã được đánh[/]\ntrong vòng này', {
  main: (c) => (G.run.hands[c.hand].playedRound > 1 ? { xmult: 3 } : null),
});
DJ('red_card', 'Thẻ Đỏ', 1, 5, '🟥', (j) => `Nhận [m]+3[/] Nhân khi bỏ qua\nbất kỳ [a]Gói Bài[/] nào` + cur(`[m]+${j ? j.s.mult : 0}[/] Nhân`), {
  init: () => ({ mult: 0 }), np: true,
  onPackSkip: (c, j) => { if (!c.bp) { j.s.mult += 3; return { msg: '+3 Nhân', color: 'mult' }; } },
  main: (c, j) => (j.s.mult ? { mult: j.s.mult } : null),
});
DJ('madness', 'Điên Loạn', 2, 7, '🌪️', (j) => `Khi chọn [a]Mù Nhỏ[/] hoặc [a]Mù Lớn[/],\nnhận [x]X0,5[/] Nhân và [m]phá huỷ[/]\nmột Joker ngẫu nhiên` + cur(`[x]X${fx(j ? j.s.x : 1)}[/] Nhân`), {
  init: () => ({ x: 1 }), np: true,
  blindSelect: (c, j) => {
    if (c.bp || G.run.blind.type === 'boss') return;
    j.s.x += 0.5;
    const opts = G.run.jokers.filter((x) => x !== j && !x.st.eternal && !x.dying);
    if (opts.length) destroyJoker(pick(opts));
    return { msg: `X${fx(j.s.x)} Nhân`, color: 'mult' };
  },
  main: (c, j) => (j.s.x > 1 ? { xmult: j.s.x } : null),
});
DJ('square', 'Hề Vuông', 1, 4, '🟧', (j) => `Nhận [c]+4[/] Chip nếu tay bài\nđã đánh có đúng [a]4[/] lá` + cur(`[c]+${j ? j.s.chips : 0}[/] Chip`), {
  init: () => ({ chips: 0 }), np: true,
  before: (c, j) => { if (!c.bp && c.played.length === 4) { j.s.chips += 4; return { msg: 'Nâng cấp!', color: 'chips' }; } },
  main: (c, j) => (j.s.chips ? { chips: j.s.chips } : null),
});
DJ('seance', 'Cầu Hồn', 2, 6, '👻', 'Nếu tay bài là\n[a]Thùng Phá Sảnh[/], tạo\nmột lá [s]Huyền Bí[/] ngẫu nhiên\n[d](Cần chỗ trống)[/]', {
  before: (c) => {
    if (c.hand === 'Straight Flush' && consSpace() > 0) { createCons('spectral'); return { msg: '+1 Huyền Bí', color: 'spectral' }; }
  },
});
DJ('riff_raff', 'Đám Đông', 1, 6, '👥', 'Khi chọn [a]Mù[/], tạo\n[a]2[/] Joker [c]Phổ Biến[/]\n[d](Cần chỗ trống)[/]', {
  blindSelect: () => {
    const n = Math.min(2, jokerSpace());
    for (let i = 0; i < n; i++) createJoker({ rarity: 1 });
    return n ? { msg: `+${n} Joker`, color: 'attn' } : null;
  },
});
DJ('vampire', 'Ma Cà Rồng', 2, 7, '🧛', (j) => `Nhận [x]X0,1[/] Nhân cho mỗi lá\n[a]Cường Hoá[/] được tính điểm,\nxoá Cường Hoá của lá đó` + cur(`[x]X${fx(j ? j.s.x : 1)}[/] Nhân`), {
  init: () => ({ x: 1 }), np: true,
  before: (c, j) => {
    if (c.bp) return;
    const t = c.scoring.filter((x) => x.enh && !x.debuff);
    if (!t.length) return;
    t.forEach((x) => (x.enh = null));
    j.s.x += 0.1 * t.length;
    return { msg: `X${fx(j.s.x)} Nhân`, color: 'mult', refresh: true };
  },
  main: (c, j) => (j.s.x > 1 ? { xmult: j.s.x } : null),
});
DJ('shortcut', 'Đường Tắt', 2, 7, '↪️', 'Cho phép tạo [a]Sảnh[/] với\nkhoảng trống [a]1 hạng[/]\n[d](vd: 10 8 6 5 3)[/]', { passive: true });
DJ('hologram', 'Ảnh Ba Chiều', 2, 7, '📀', (j) => `Nhận [x]X0,25[/] Nhân mỗi khi\nmột [a]lá bài thường[/] được\nthêm vào bộ bài` + cur(`[x]X${fx(j ? j.s.x : 1)}[/] Nhân`), {
  init: () => ({ x: 1 }), np: true,
  onAdd: (c, j, cards) => { if (!c.bp) { j.s.x += 0.25 * cards.length; return { msg: 'Nâng cấp!', color: 'mult' }; } },
  main: (c, j) => (j.s.x > 1 ? { xmult: j.s.x } : null),
});
DJ('vagabond', 'Kẻ Lang Thang', 3, 8, '🎒', 'Tạo một lá [t]Tarot[/] nếu đánh\nbài khi có [$]$4[/] trở xuống\n[d](Cần chỗ trống)[/]', {
  main: () => {
    if (G.run.money <= 4 && consSpace() > 0) { createCons('tarot'); return { msg: '+1 Tarot', color: 'tarot' }; }
  },
});
DJ('baron', 'Nam Tước', 3, 8, '🎩', 'Mỗi lá [a]Già[/] đang giữ\ntrên tay cho [x]X1,5[/] Nhân', {
  onHeld: (c, j, card) => (rid(card) === 13 ? { xmult: 1.5 } : null),
});
DJ('cloud9', 'Chín Tầng Mây', 2, 7, '☁️', () => `Nhận [$]$1[/] cho mỗi lá [a]9[/]\ntrong cả bộ bài khi hết vòng` + cur(`[$]$${countDeck((x) => rid(x) === 9)}[/]`), {
  dollars: () => countDeck((x) => rid(x) === 9),
});
DJ('rocket', 'Tên Lửa', 2, 6, '🚀', (j) => `Nhận [$]$${j ? j.s.money : 1}[/] khi hết vòng.\nTiền tăng thêm [$]$2[/] khi\nđánh bại [a]Mù Trùm[/]`, {
  init: () => ({ money: 1 }), np: true,
  dollars: (j) => j.s.money,
  onBoss: (c, j) => { if (!c.bp) { j.s.money += 2; return { msg: 'Nâng cấp!', color: 'money' }; } },
});
DJ('obelisk', 'Tháp Đá', 3, 8, '🗼', (j) => `Nhận [x]X0,2[/] Nhân cho mỗi lượt\nđánh [a]liên tiếp[/] không đánh\ntay bài [a]nhiều nhất[/] của bạn` + cur(`[x]X${fx(j ? j.s.x : 1)}[/] Nhân`), {
  init: () => ({ x: 1 }), np: true,
  before: (c, j) => {
    if (c.bp) return;
    const r = G.run, n = r.hands[c.hand].played;
    let reset = true;
    for (const k of HAND_KEYS) if (k !== c.hand && r.hands[k].played >= n) reset = false;
    if (reset) { const had = j.s.x > 1; j.s.x = 1; return had ? { msg: 'Đặt lại!', color: 'attn' } : null; }
    j.s.x += 0.2;
  },
  main: (c, j) => (j.s.x > 1 ? { xmult: j.s.x } : null),
});
DJ('midas', 'Mặt Nạ Midas', 2, 7, '👑', 'Mọi lá [a]mặt người[/] được đánh\ntrở thành [a]Lá Vàng[/]\nkhi tính điểm', {
  before: (c) => {
    if (c.bp) return;
    const t = c.scoring.filter((x) => isFace(x));
    if (!t.length) return;
    t.forEach((x) => (x.enh = 'gold'));
    return { msg: 'Vàng!', color: 'money', refresh: true };
  },
});
DJ('luchador', 'Đô Vật', 2, 5, '🤼', 'Bán lá này để vô hiệu hoá\nhiệu ứng của [a]Mù Trùm[/]\nhiện tại', {
  ne: true,
  onSell: () => {
    const b = G.run.blind;
    if (G.run.phase === 'round' && b && b.type === 'boss' && !b.disabled) { disableBoss(); return { msg: 'Vô hiệu!', color: 'attn' }; }
  },
});
DJ('photograph', 'Ảnh Chụp', 1, 5, '📷', 'Lá [a]mặt người[/] được đánh\n[a]đầu tiên[/] cho [x]X2[/] Nhân\nkhi tính điểm', {
  onScored: (c, j, card) => (card === c.firstFace ? { xmult: 2 } : null),
});
DJ('gift', 'Thẻ Quà Tặng', 2, 6, '🎁', 'Cộng [$]$1[/] giá bán cho mọi\n[a]Joker[/] và [a]vật phẩm tiêu hao[/]\nkhi hết vòng', {
  roundEnd: (c) => {
    if (c.bp) return;
    G.run.jokers.forEach((x) => (x.extra += 1));
    G.run.consumables.forEach((x) => (x.extra += 1));
    return { msg: 'Giá trị tăng!', color: 'money' };
  },
});
DJ('turtle_bean', 'Đậu Rùa', 2, 6, '🐢', (j) => `[a]+${j ? j.s.h : 5}[/] số lá trên tay,\ngiảm [m]1[/] mỗi vòng`, {
  init: () => ({ h: 5 }), ne: true, np: true,
  handSize: (j) => j.s.h,
  roundEnd: (c, j) => {
    if (c.bp) return;
    j.s.h -= 1;
    if (j.s.h <= 0) { destroyJoker(j); return { msg: 'Ăn hết!', color: 'attn' }; }
    return { msg: '-1', color: 'attn' };
  },
});
DJ('erosion', 'Xói Mòn', 2, 6, '🏜️', () => `[m]+4[/] Nhân cho mỗi lá bài\nthiếu so với [a]${G.run ? G.run.startDeckSize : 52}[/] lá\ntrong cả bộ bài` + cur(`[m]+${erosionN() * 4}[/] Nhân`), {
  main: () => { const n = erosionN(); return n > 0 ? { mult: 4 * n } : null; },
});
DJ('reserved_parking', 'Chỗ Đậu Xe Riêng', 1, 6, '🅿️', () => `Mỗi lá [a]mặt người[/] đang giữ\ntrên tay có [g]${odds(1)} trên 2[/] khả năng\ncho [$]$1[/]`, {
  onHeld: (c, j, card) => (isFace(card) && P(1, 2) ? { money: 1 } : null),
});
DJ('mail_in', 'Hoàn Tiền Qua Thư', 1, 4, '📬', () => `Nhận [$]$5[/] cho mỗi lá\n[a]${RANK_NAME[rv().mailRank]}[/] bị bỏ\n[d](hạng đổi mỗi vòng)[/]`, {
  onDiscardCard: (c, j, card) => (rid(card) === rv().mailRank && !card.debuff ? { money: 5 } : null),
});
DJ('to_the_moon', 'Lên Mặt Trăng', 2, 5, '🌕', 'Nhận thêm [$]$1[/] [a]tiền lãi[/]\ncho mỗi [$]$5[/] bạn có\nkhi hết vòng', { passive: true });
DJ('hallucination', 'Ảo Giác', 1, 4, '🍄', () => `[g]${odds(1)} trên 2[/] khả năng tạo một\nlá [t]Tarot[/] khi mở bất kỳ\n[a]Gói Bài[/] nào\n[d](Cần chỗ trống)[/]`, {
  onPackOpen: () => { if (P(1, 2) && consSpace() > 0) { createCons('tarot'); return { msg: '+1 Tarot', color: 'tarot' }; } },
});
DJ('fortune_teller', 'Thầy Bói', 1, 6, '🧙', () => `[m]+1[/] Nhân cho mỗi lá [t]Tarot[/]\nđã dùng trong ván` + cur(`[m]+${G.run ? G.run.stats.tarots : 0}[/] Nhân`), {
  main: () => (G.run.stats.tarots ? { mult: G.run.stats.tarots } : null),
});
DJ('juggler', 'Người Tung Hứng', 1, 4, '🤹', '[a]+1[/] số lá trên tay', { handSize: 1 });
DJ('drunkard', 'Bợm Nhậu', 1, 4, '🍺', '[m]+1[/] lượt bỏ mỗi vòng', { discards: 1 });
DJ('stone_joker', 'Hề Đá', 2, 6, '🪨', () => `[c]+25[/] Chip cho mỗi\n[a]Lá Đá[/] trong cả bộ bài` + cur(`[c]+${25 * countDeck((x) => x.enh === 'stone')}[/] Chip`), {
  main: () => { const n = countDeck((x) => x.enh === 'stone'); return n ? { chips: 25 * n } : null; },
});
DJ('golden', 'Hề Vàng', 1, 6, '🌟', 'Nhận [$]$4[/] khi hết vòng', { dollars: () => 4 });
DJ('lucky_cat', 'Mèo Thần Tài', 2, 6, '🐱', (j) => `Nhận [x]X0,25[/] Nhân mỗi khi\nmột [a]Lá May Mắn[/]\nkích hoạt [a]thành công[/]` + cur(`[x]X${fx(j ? j.s.x : 1)}[/] Nhân`), {
  init: () => ({ x: 1 }), np: true,
  onScored: (c, j, card) => { if (!c.bp && card.luckyTrig) { j.s.x += 0.25 * card.luckyTrig; return { msg: 'Nâng cấp!', color: 'mult' }; } },
  main: (c, j) => (j.s.x > 1 ? { xmult: j.s.x } : null),
});
DJ('baseball', 'Thẻ Bóng Chày', 3, 8, '⚾', 'Mỗi Joker [g]Không Phổ Biến[/]\ncho [x]X1,5[/] Nhân', {
  onOther: (c, j, other) => (JOKERS[other.key].rarity === 2 ? { xmult: 1.5 } : null),
});
DJ('bull', 'Bò Tót', 2, 6, '🐂', () => `[c]+2[/] Chip cho mỗi [$]$1[/]\nbạn đang có` + cur(`[c]+${G.run ? Math.max(0, 2 * G.run.money) : 0}[/] Chip`), {
  main: () => (G.run.money > 0 ? { chips: 2 * G.run.money } : null),
});
DJ('diet_cola', 'Cola Ăn Kiêng', 2, 6, '🥤', 'Bán lá này để nhận miễn phí\nmột [a]Thẻ Nhân Đôi[/]', {
  ne: true,
  onSell: () => { addTag('double'); return { msg: '+Thẻ', color: 'attn' }; },
});
DJ('trading', 'Thẻ Trao Đổi', 2, 6, '🔄', 'Nếu [a]lượt bỏ đầu tiên[/] của\nvòng chỉ có [a]1[/] lá, phá huỷ\nnó và nhận [$]$3[/]', {
  onDiscard: (c, j, cards) => (c.firstDiscard && cards.length === 1 ? { money: 3, destroy: cards[0] } : null),
});
DJ('flash', 'Thẻ Ghi Nhớ', 2, 5, '⚡', (j) => `Nhận [m]+2[/] Nhân cho mỗi\nlần [a]đổi mới[/] trong cửa hàng` + cur(`[m]+${j ? j.s.mult : 0}[/] Nhân`), {
  init: () => ({ mult: 0 }), np: true,
  onReroll: (c, j) => { if (!c.bp) { j.s.mult += 2; return { msg: '+2 Nhân', color: 'mult' }; } },
  main: (c, j) => (j.s.mult ? { mult: j.s.mult } : null),
});
DJ('popcorn', 'Bỏng Ngô', 1, 5, '🍿', (j) => `[m]+${j ? j.s.mult : 20}[/] Nhân\n[m]-4[/] Nhân mỗi vòng đã chơi`, {
  init: () => ({ mult: 20 }), ne: true, np: true,
  main: (c, j) => ({ mult: j.s.mult }),
  roundEnd: (c, j) => {
    if (c.bp) return;
    j.s.mult -= 4;
    if (j.s.mult <= 0) { destroyJoker(j); return { msg: 'Ăn hết!', color: 'mult' }; }
    return { msg: '-4', color: 'mult' };
  },
});
DJ('spare_trousers', 'Quần Dự Phòng', 2, 6, '👖', (j) => `Nhận [m]+2[/] Nhân nếu tay bài\nđã đánh chứa [a]Thú[/]` + cur(`[m]+${j ? j.s.mult : 0}[/] Nhân`), {
  init: () => ({ mult: 0 }), np: true,
  before: (c, j) => { if (!c.bp && c.contains['Two Pair']) { j.s.mult += 2; return { msg: 'Nâng cấp!', color: 'mult' }; } },
  main: (c, j) => (j.s.mult ? { mult: j.s.mult } : null),
});
DJ('ancient', 'Hề Cổ Đại', 3, 8, '🏺', () => `Mỗi lá ${S(rv().ancientSuit)} được đánh\ncho [x]X1,5[/] Nhân khi tính điểm\n[d](chất đổi mỗi vòng)[/]`, {
  onScored: (c, j, card) => (isSuit(card, rv().ancientSuit) ? { xmult: 1.5 } : null),
});
DJ('ramen', 'Mì Ramen', 2, 6, '🍜', (j) => `[x]X${fx(j ? j.s.x : 2)}[/] Nhân, mất [x]X0,01[/] Nhân\ncho mỗi lá bị bỏ`, {
  init: () => ({ x: 2 }), ne: true, np: true,
  onDiscardCard: (c, j) => {
    if (c.bp) return;
    j.s.x = Math.round((j.s.x - 0.01) * 100) / 100;
    if (j.s.x <= 1) { destroyJoker(j); return { msg: 'Ăn hết!', color: 'mult' }; }
  },
  main: (c, j) => ({ xmult: j.s.x }),
});
DJ('walkie', 'Bộ Đàm', 1, 4, '📻', 'Mỗi lá [a]10[/] hoặc [a]4[/] được\nđánh cho [c]+10[/] Chip và\n[m]+4[/] Nhân khi tính điểm', {
  onScored: (c, j, card) => ([10, 4].includes(rid(card)) ? { chips: 10, mult: 4 } : null),
});
DJ('seltzer', 'Nước Soda', 2, 6, '🫧', (j) => `Kích hoạt lại mọi lá được\nđánh trong [a]${j ? j.s.n : 10}[/] lượt đánh\ntiếp theo`, {
  init: () => ({ n: 10 }), ne: true, np: true,
  retrig: (c, j, card, area) => (area === 'play' ? 1 : 0),
  after: (c, j) => {
    if (c.bp) return;
    j.s.n -= 1;
    if (j.s.n <= 0) { destroyJoker(j); return { msg: 'Hết ga!', color: 'attn' }; }
    return { msg: `-1`, color: 'attn' };
  },
});
DJ('castle', 'Lâu Đài', 2, 6, '🏰', (j) => `Nhận [c]+3[/] Chip cho mỗi lá\n${S(rv().castleSuit)} bị bỏ\n[d](chất đổi mỗi vòng)[/]` + cur(`[c]+${j ? j.s.chips : 0}[/] Chip`), {
  init: () => ({ chips: 0 }), np: true,
  onDiscardCard: (c, j, card) => { if (!c.bp && isSuit(card, rv().castleSuit)) { j.s.chips += 3; return { msg: 'Nâng cấp!', color: 'chips' }; } },
  main: (c, j) => (j.s.chips ? { chips: j.s.chips } : null),
});
DJ('smiley', 'Mặt Cười', 1, 4, '😊', 'Lá [a]mặt người[/] được đánh\ncho [m]+5[/] Nhân khi tính điểm', {
  onScored: (c, j, card) => (isFace(card) ? { mult: 5 } : null),
});
DJ('campfire', 'Lửa Trại', 3, 9, '🏕️', (j) => `Nhận [x]X0,25[/] Nhân cho mỗi lá\nđược [a]bán[/], đặt lại khi\nđánh bại [a]Mù Trùm[/]` + cur(`[x]X${fx(j ? j.s.x : 1)}[/] Nhân`), {
  init: () => ({ x: 1 }), np: true,
  onAnySell: (c, j) => { if (!c.bp) { j.s.x += 0.25; return { msg: 'Nâng cấp!', color: 'mult' }; } },
  onBoss: (c, j) => { if (!c.bp && j.s.x > 1) { j.s.x = 1; return { msg: 'Đặt lại!', color: 'attn' }; } },
  main: (c, j) => (j.s.x > 1 ? { xmult: j.s.x } : null),
});
DJ('golden_ticket', 'Vé Vàng', 1, 5, '🎟️', 'Lá [a]Vàng[/] được đánh\ncho [$]$4[/] khi tính điểm', {
  onScored: (c, j, card) => (card.enh === 'gold' ? { money: 4 } : null),
});
DJ('mr_bones', 'Ông Xương', 2, 5, '💀', 'Ngăn [m]thua cuộc[/] nếu số chip\nđạt ít nhất [a]25%[/] yêu cầu.\n[m]Tự huỷ[/]', { passive: true, ne: true });
DJ('acrobat', 'Diễn Viên Nhào Lộn', 2, 6, '🤸', '[x]X3[/] Nhân ở [a]lượt đánh\ncuối cùng[/] của vòng', {
  main: (c) => (c.finalHand ? { xmult: 3 } : null),
});
DJ('sock_buskin', 'Mặt Nạ Tuồng', 2, 6, '🎭', 'Kích hoạt lại mọi lá\n[a]mặt người[/] được đánh', {
  retrig: (c, j, card, area) => (area === 'play' && isFace(card) ? 1 : 0),
});
DJ('swashbuckler', 'Kiếm Khách', 1, 4, '⚔️', (j) => `Cộng tổng [a]giá bán[/] của mọi\nJoker khác vào Nhân` + cur(`[m]+${swashN(j)}[/] Nhân`), {
  main: (c, j) => { const n = swashN(c.self || j); return n ? { mult: n } : null; },
});
DJ('troubadour', 'Người Hát Rong', 2, 6, '🎻', '[a]+2[/] số lá trên tay,\n[c]-1[/] lượt đánh mỗi vòng', { handSize: 2, hands: -1 });
DJ('certificate', 'Chứng Chỉ', 2, 6, '📜', 'Khi bắt đầu vòng, thêm một\nlá bài ngẫu nhiên có [a]Dấu[/]\nngẫu nhiên lên tay', {
  onRoundStart: () => {
    const card = newCard(pick(RANKS), pick(SUITS), { seal: pick(['gold', 'red', 'blue', 'purple']) });
    addCardsToDeck([card], true);
    return { msg: '+1 Lá', color: 'attn' };
  },
});
DJ('smeared', 'Hề Lem Luốc', 2, 7, '🖌️', '[H]Cơ[/] và [D]Rô[/] được tính là\ncùng chất, [S]Bích[/] và [C]Chuồn[/]\nđược tính là cùng chất', { passive: true });
DJ('throwback', 'Hoài Niệm', 2, 6, '📼', () => `[x]X0,25[/] Nhân cho mỗi [a]Mù[/]\nđã bỏ qua trong ván` + cur(`[x]X${fx(1 + 0.25 * (G.run ? G.run.stats.skips : 0))}[/] Nhân`), {
  main: () => (G.run.stats.skips ? { xmult: 1 + 0.25 * G.run.stats.skips } : null),
});
DJ('hanging_chad', 'Phiếu Bầu Treo', 1, 4, '🗳️', 'Kích hoạt lại lá [a]đầu tiên[/]\nđược tính điểm thêm [a]2[/] lần', {
  retrig: (c, j, card, area) => (area === 'play' && card === c.scoring[0] ? 2 : 0),
});
DJ('rough_gem', 'Đá Quý Thô', 2, 7, '💠', 'Lá [D]Rô[/] được đánh cho\n[$]$1[/] khi tính điểm', {
  onScored: (c, j, card) => (isSuit(card, 'D') ? { money: 1 } : null),
});
DJ('bloodstone', 'Huyết Thạch', 2, 7, '🩸', () => `[g]${odds(1)} trên 2[/] khả năng lá [H]Cơ[/]\nđược đánh cho [x]X1,5[/] Nhân\nkhi tính điểm`, {
  onScored: (c, j, card) => (isSuit(card, 'H') && P(1, 2) ? { xmult: 1.5 } : null),
});
DJ('arrowhead', 'Đầu Mũi Tên', 2, 7, '🏹', 'Lá [S]Bích[/] được đánh cho\n[c]+50[/] Chip khi tính điểm', {
  onScored: (c, j, card) => (isSuit(card, 'S') ? { chips: 50 } : null),
});
DJ('onyx', 'Mã Não Đen', 2, 7, '🖤', 'Lá [C]Chuồn[/] được đánh cho\n[m]+7[/] Nhân khi tính điểm', {
  onScored: (c, j, card) => (isSuit(card, 'C') ? { mult: 7 } : null),
});
DJ('glass_joker', 'Hề Thủy Tinh', 2, 6, '🥃', (j) => `Nhận [x]X0,75[/] Nhân cho mỗi\n[a]Lá Thủy Tinh[/] bị phá huỷ` + cur(`[x]X${fx(j ? j.s.x : 1)}[/] Nhân`), {
  init: () => ({ x: 1 }), np: true,
  onDestroy: (c, j, cards) => {
    const n = cards.filter((x) => x.enh === 'glass').length;
    if (!c.bp && n) { j.s.x += 0.75 * n; return { msg: `X${fx(j.s.x)} Nhân`, color: 'mult' }; }
  },
  main: (c, j) => (j.s.x > 1 ? { xmult: j.s.x } : null),
});
DJ('showman', 'Ông Bầu', 2, 5, '🎠', 'Lá [a]Joker[/], [t]Tarot[/], [p]Hành Tinh[/]\nvà [s]Huyền Bí[/] có thể\nxuất hiện [a]nhiều lần[/]', { passive: true });
DJ('flower_pot', 'Chậu Hoa', 2, 6, '🪴', '[x]X3[/] Nhân nếu tay bài được\ntính điểm có lá [D]Rô[/], [C]Chuồn[/],\n[H]Cơ[/] và [S]Bích[/]', {
  main: (c) => {
    const s = { H: 0, D: 0, S: 0, C: 0 };
    for (const x of c.scoring) {
      if (x.enh === 'wild') continue;
      if (isSuit(x, 'H', { bypass: true }) && !s.H) s.H++;
      else if (isSuit(x, 'D', { bypass: true }) && !s.D) s.D++;
      else if (isSuit(x, 'S', { bypass: true }) && !s.S) s.S++;
      else if (isSuit(x, 'C', { bypass: true }) && !s.C) s.C++;
    }
    for (const x of c.scoring) {
      if (x.enh !== 'wild') continue;
      if (!s.H) s.H++; else if (!s.D) s.D++; else if (!s.S) s.S++; else if (!s.C) s.C++;
    }
    return s.H && s.D && s.S && s.C ? { xmult: 3 } : null;
  },
});
DJ('blueprint', 'Bản Thiết Kế', 3, 10, '📘', (j) => `Sao chép khả năng của\n[a]Joker[/] bên phải` + copyInfo(j, 'right'), { copy: 'right' });
DJ('wee', 'Hề Tí Hon', 3, 8, '🐭', (j) => `Nhận [c]+8[/] Chip khi mỗi lá [a]2[/]\nđược đánh tính điểm` + cur(`[c]+${j ? j.s.chips : 0}[/] Chip`), {
  init: () => ({ chips: 0 }), np: true,
  onScored: (c, j, card) => { if (!c.bp && rid(card) === 2) { j.s.chips += 8; return { msg: 'Nâng cấp!', color: 'chips' }; } },
  main: (c, j) => (j.s.chips ? { chips: j.s.chips } : null),
});
DJ('merry_andy', 'Anh Hề Vui Tính', 2, 7, '🥳', '[m]+3[/] lượt bỏ mỗi vòng\n[a]-1[/] số lá trên tay', { discards: 3, handSize: -1 });
DJ('oops', 'Ối! Toàn Số 6', 2, 4, '🎲', 'Nhân đôi mọi [g]xác suất[/]\n[d](vd: 1 trên 3 -> 2 trên 3)[/]', { passive: true });
DJ('idol', 'Thần Tượng', 2, 6, '🗿', () => `Mỗi lá [a]${RANK_NAME[rv().idolRank]}[/] ${S(rv().idolSuit)} được\nđánh cho [x]X2[/] Nhân khi tính điểm\n[d](lá đổi mỗi vòng)[/]`, {
  onScored: (c, j, card) => (rid(card) === rv().idolRank && isSuit(card, rv().idolSuit) ? { xmult: 2 } : null),
});
DJ('seeing_double', 'Nhìn Đôi', 2, 6, '👯', '[x]X2[/] Nhân nếu tay bài được\ntính điểm có một lá [C]Chuồn[/] và\nmột lá thuộc chất khác', {
  main: (c) => {
    const s = { H: 0, D: 0, S: 0, C: 0 };
    for (const x of c.scoring) {
      if (x.enh === 'wild') continue;
      for (const k of SUITS) if (isSuit(x, k)) s[k]++;
    }
    for (const x of c.scoring) {
      if (x.enh !== 'wild' || x.debuff) continue;
      if (!s.C) s.C++; else if (!s.D) s.D++; else if (!s.S) s.S++; else if (!s.H) s.H++;
    }
    return s.C > 0 && (s.H > 0 || s.D > 0 || s.S > 0) ? { xmult: 2 } : null;
  },
});
DJ('matador', 'Đấu Sĩ Bò', 2, 7, '🐃', 'Nhận [$]$8[/] nếu tay bài\nđã đánh kích hoạt\nhiệu ứng [a]Mù Trùm[/]', {
  after: (c) => (c.bossTriggered ? { money: 8 } : null),
});
DJ('hit_the_road', 'Lên Đường', 3, 8, '🛣️', (j) => `Nhận [x]X0,5[/] Nhân cho mỗi\nlá [a]Bồi[/] bị bỏ trong vòng này` + cur(`[x]X${fx(j ? j.s.x : 1)}[/] Nhân`), {
  init: () => ({ x: 1 }), np: true,
  onDiscardCard: (c, j, card) => { if (!c.bp && rid(card) === 11 && !card.debuff) { j.s.x += 0.5; return { msg: `X${fx(j.s.x)} Nhân`, color: 'mult' }; } },
  roundEnd: (c, j) => { if (!c.bp && j.s.x > 1) { j.s.x = 1; return { msg: 'Đặt lại!', color: 'attn' }; } },
  main: (c, j) => (j.s.x > 1 ? { xmult: j.s.x } : null),
});
DJ('stuntman', 'Diễn Viên Đóng Thế', 3, 7, '🏍️', '[c]+250[/] Chip\n[a]-2[/] số lá trên tay', { main: () => ({ chips: 250 }), handSize: -2 });
DJ('invisible', 'Hề Tàng Hình', 3, 8, '🫥', (j) => `Sau [a]2[/] vòng, bán lá này\nđể [a]nhân bản[/] một Joker\nngẫu nhiên\n[d](Hiện tại ${j ? Math.min(j.s.rounds, 2) : 0}/2)[/]`, {
  init: () => ({ rounds: 0 }), ne: true,
  roundEnd: (c, j) => { if (!c.bp) { j.s.rounds++; if (j.s.rounds === 2) return { msg: 'Sẵn sàng!', color: 'attn' }; } },
  onSell: (c, j) => {
    if (j.s.rounds < 2) return;
    const opts = G.run.jokers.filter((x) => x !== j);
    if (!opts.length) return;
    const t = pick(opts);
    const cp = cloneJoker(t);
    if (cp.ed === 'negative') cp.ed = null;
    G.run.jokers.push(cp);
    return { msg: 'Nhân bản!', color: 'attn' };
  },
});
DJ('brainstorm', 'Động Não', 3, 10, '🧠', (j) => `Sao chép khả năng của\n[a]Joker[/] ngoài cùng bên trái` + copyInfo(j, 'left'), { copy: 'left' });
DJ('satellite', 'Vệ Tinh', 2, 6, '🛰️', () => `Nhận [$]$1[/] khi hết vòng cho\nmỗi lá [p]Hành Tinh[/] khác nhau\nđã dùng trong ván` + cur(`[$]$${G.run ? G.run.stats.planets.length : 0}[/]`), {
  dollars: () => G.run.stats.planets.length,
});
DJ('shoot_moon', 'Bắn Trăng', 1, 5, '🌙', 'Mỗi lá [a]Đầm[/] đang giữ\ntrên tay cho [m]+13[/] Nhân', {
  onHeld: (c, j, card) => (rid(card) === 12 ? { mult: 13 } : null),
});
DJ('drivers', 'Bằng Lái Xe', 3, 7, '🪪', () => `[x]X3[/] Nhân nếu có ít nhất [a]16[/]\nlá [a]Cường Hoá[/] trong cả bộ bài` + cur(`${countDeck((x) => !!x.enh)}`), {
  main: () => (countDeck((x) => !!x.enh) >= 16 ? { xmult: 3 } : null),
});
DJ('cartomancer', 'Thầy Bói Bài', 2, 6, '🔯', 'Tạo một lá [t]Tarot[/]\nkhi chọn [a]Mù[/]\n[d](Cần chỗ trống)[/]', {
  blindSelect: () => { if (consSpace() > 0) { createCons('tarot'); return { msg: '+1 Tarot', color: 'tarot' }; } },
});
DJ('astronomer', 'Nhà Thiên Văn', 2, 8, '🔭', 'Mọi lá [p]Hành Tinh[/] và\n[p]Gói Thiên Thể[/] trong cửa hàng\nđều [g]miễn phí[/]', { passive: true });
DJ('burnt', 'Hề Cháy Xém', 3, 8, '🔥', 'Nâng cấp tay bài của\n[a]lượt bỏ đầu tiên[/] mỗi vòng', {
  onDiscard: (c, j, cards) => {
    if (!c.firstDiscard) return;
    const e = evalHand(cards);
    if (!e) return;
    levelUp(e.hand, 1);
    return { msg: 'Lên cấp!', color: 'attn', level: e.hand };
  },
});
DJ('bootstraps', 'Dây Giày', 2, 7, '👢', () => `[m]+2[/] Nhân cho mỗi [$]$5[/]\nbạn đang có` + cur(`[m]+${G.run ? 2 * Math.max(0, Math.floor(G.run.money / 5)) : 0}[/] Nhân`), {
  main: () => { const n = Math.floor(G.run.money / 5); return n > 0 ? { mult: 2 * n } : null; },
});
// ---------- Huyền thoại ----------
DJ('canio', 'Canio', 4, 20, '😢', (j) => `Nhận [x]X1[/] Nhân khi một lá\n[a]mặt người[/] bị phá huỷ` + cur(`[x]X${fx(j ? j.s.x : 1)}[/] Nhân`), {
  init: () => ({ x: 1 }),
  onDestroy: (c, j, cards) => {
    const n = cards.filter((x) => isFace(x, true)).length;
    if (!c.bp && n) { j.s.x += n; return { msg: `X${fx(j.s.x)} Nhân`, color: 'mult' }; }
  },
  main: (c, j) => (j.s.x > 1 ? { xmult: j.s.x } : null),
});
DJ('triboulet', 'Triboulet', 4, 20, '🤴', 'Mỗi lá [a]Già[/] và [a]Đầm[/] được\nđánh cho [x]X2[/] Nhân\nkhi tính điểm', {
  onScored: (c, j, card) => ([12, 13].includes(rid(card)) ? { xmult: 2 } : null),
});
DJ('yorick', 'Yorick', 4, 20, '☠️', (j) => `Nhận [x]X1[/] Nhân mỗi khi\nbỏ [a]23[/] lá bài\n[d](Còn ${j ? j.s.left : 23})[/]` + cur(`[x]X${fx(j ? j.s.x : 1)}[/] Nhân`), {
  init: () => ({ x: 1, left: 23 }),
  onDiscardCard: (c, j) => {
    if (c.bp) return;
    j.s.left -= 1;
    if (j.s.left <= 0) { j.s.left = 23; j.s.x += 1; return { msg: `X${fx(j.s.x)} Nhân`, color: 'mult' }; }
  },
  main: (c, j) => (j.s.x > 1 ? { xmult: j.s.x } : null),
});
DJ('chicot', 'Chicot', 4, 20, '⚜️', 'Vô hiệu hoá hiệu ứng của\nmọi [a]Mù Trùm[/]', { passive: true });
DJ('perkeo', 'Perkeo', 4, 20, '🧊', 'Tạo một bản sao [d]Âm Bản[/]\ncủa [a]1[/] vật phẩm tiêu hao\nngẫu nhiên khi rời [a]cửa hàng[/]', {
  shopEnd: () => {
    const cs = G.run.consumables;
    if (!cs.length) return;
    const t = pick(cs);
    const cp = Object.assign({}, t, { uid: uid(), ed: 'negative', extra: 0 });
    cs.push(cp);
    return { msg: 'Nhân bản!', color: 'attn' };
  },
});

// ---------- Hàm hỗ trợ ----------
function stencilX() {
  if (!G.run) return 1;
  const r = G.run;
  return Math.max(1, jokerSlots() - r.jokers.length + r.jokers.filter((j) => j.key === 'stencil').length);
}
function erosionN() { return G.run ? Math.max(0, G.run.startDeckSize - G.run.deck.length) : 0; }
function swashN(self) {
  if (!G.run) return 0;
  return G.run.jokers.filter((x) => x !== self).reduce((a, x) => a + sellValue(x), 0);
}
function copyInfo(j, dir) {
  if (!j || !G.run) return '';
  const t = copyTarget(j);
  if (!t) return '\n[m](không tương thích)[/]';
  return `\n[g](tương thích: ${JOKERS[t.key].name})[/]`;
}

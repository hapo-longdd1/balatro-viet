'use strict';
// ================= ENGINE =================
const uid = () => (G.run ? G.run.uid++ : Math.floor(Math.random() * 1e9));

// ---------- Truy vấn trạng thái ----------
const hasJoker = (k) => !!(G.run && G.run.jokers.some((j) => j.key === k && !j.debuff));
const countJoker = (k) => (G.run ? G.run.jokers.filter((j) => j.key === k && !j.debuff).length : 0);
const hasV = (k) => !!(G.run && G.run.vouchers.includes(k));
function odds(n) { return n * Math.pow(2, countJoker('oops')); }
function P(n, d) { return R() < odds(n) / d; }
function rid(c) { return c.enh === 'stone' ? -1 : c.rank; }
function isSuit(c, suit, o = {}) {
  if (o.flush) {
    if (c.enh === 'stone') return false;
    if (c.enh === 'wild' && !c.debuff) return true;
  } else {
    if (c.debuff && !o.bypass) return false;
    if (c.enh === 'stone') return false;
    if (c.enh === 'wild') return true;
  }
  if (hasJoker('smeared')) {
    const red = (s) => s === 'H' || s === 'D';
    if (red(c.suit) === red(suit)) return true;
  }
  return c.suit === suit;
}
function isFace(c, fromBoss) {
  if (c.debuff && !fromBoss) return false;
  if (hasJoker('pareidolia')) return true;
  const id = rid(c);
  return id === 11 || id === 12 || id === 13;
}
function countDeck(fn) { return G.run ? G.run.deck.filter(fn).length : 0; }
function sumJ(prop) {
  let t = 0;
  for (const j of G.run.jokers) {
    if (j.debuff) continue;
    const v = JOKERS[j.key][prop];
    if (v) t += typeof v === 'function' ? v(j) : v;
  }
  return t;
}
function handSize() {
  const r = G.run;
  let n = r.baseHandSize + sumJ('handSize') + r.tempHandSize;
  if (bossActive('manacle')) n -= 1;
  return Math.max(1, n);
}
function maxHands() { return Math.max(1, G.run.baseHands + sumJ('hands')); }
function maxDiscards() { return Math.max(0, G.run.baseDiscards + sumJ('discards')); }
function jokerSlots() { const r = G.run; return r.jokerSlotBase + r.jokers.filter((j) => j.ed === 'negative').length; }
function consSlots() { const r = G.run; return r.consSlotBase + r.consumables.filter((c) => c.ed === 'negative').length; }
function jokerSpace() { return jokerSlots() - G.run.jokers.length; }
function consSpace() { return consSlots() - G.run.consumables.length; }
function consSpaceIf(c) { return consSpace() + (c && G.run.consumables.includes(c) && c.ed !== 'negative' ? 1 : 0); }
function bossActive(k) {
  const r = G.run;
  return !!(r && r.blind && r.blind.type === 'boss' && r.blind.key === k && !r.blind.disabled && (r.phase === 'round'));
}
function sellValue(o) { return Math.max(1, Math.floor((o.cost || 0) / 2)) + (o.extra || 0); }
function mostPlayedHand() {
  if (!G.run) return 'High Card';
  let best = 'High Card', n = -1;
  for (const k of HAND_KEYS) { const p = G.run.hands[k].played; if (p > n) { n = p; best = k; } }
  return best;
}
function handVals(k) {
  const H = HANDS[k], lv = G.run.hands[k].level;
  return { chips: Math.max(0, H.chips + H.lc * (lv - 1)), mult: Math.max(1, H.mult + H.lm * (lv - 1)), level: lv };
}
function debtLimit() { return hasJoker('credit_card') ? -20 : 0; }
function interestCap() { return hasV('money_tree') ? 20 : hasV('seed_money') ? 10 : 5; }

// ---------- Sự kiện (cho UI hoạt hình) ----------
function say(src, text, color = 'attn', big = false) { G.ev.push({ t: 'msg', src: srcId(src), text, color, big }); }
function srcId(s) { return s && typeof s === 'object' ? s.uid : s; }
function addMoney(n, src) {
  if (!n) return;
  G.run.money += n;
  G.ev.push({ t: 'money', v: n, src: srcId(src), money: G.run.money });
}

// ---------- Lá bài ----------
function newCard(rank, suit, o = {}) {
  return { uid: uid(), kind: 'card', rank, suit, enh: o.enh || null, ed: o.ed || null, seal: o.seal || null, bonus: 0, debuff: false, faceDown: false, sel: false };
}
function copyCard(c) { return Object.assign({}, c, { uid: uid(), sel: false, faceDown: false, debuff: false }); }
function buildDeck(key) {
  const d = [];
  if (key === 'erratic') {
    for (let i = 0; i < 52; i++) d.push(newCard(pick(RANKS), pick(SUITS)));
    return d;
  }
  for (const s of SUITS) for (const rk of RANKS) {
    if (key === 'abandoned' && rk >= 11 && rk <= 13) continue;
    let su = s;
    if (key === 'checkered') su = s === 'C' ? 'S' : s === 'D' ? 'H' : s;
    d.push(newCard(rk, su));
  }
  return d;
}
function addCardsToDeck(cards, toHand) {
  const r = G.run;
  for (const c of cards) {
    r.deck.push(c);
    if (toHand && (r.phase === 'round' || r.phase === 'pack')) r.hand.push(c);
    else if (r.phase === 'round') r.draw.splice(Math.floor(R() * (r.draw.length + 1)), 0, c);
  }
  updateDebuffs();
  for (const j of [...r.jokers]) fireJ(j, 'onAdd', jctx(), cards);
}
function destroyCards(cards) {
  const r = G.run;
  if (!cards.length) return;
  for (const c of cards) {
    for (const k of ['deck', 'draw', 'hand', 'play', 'discard']) {
      const i = r[k].indexOf(c);
      if (i >= 0) r[k].splice(i, 1);
    }
    G.ev.push({ t: 'destroy', src: c.uid, glass: c.enh === 'glass' });
  }
  for (const j of [...r.jokers]) fireJ(j, 'onDestroy', jctx(), cards);
}
function enhance(cards, e) { cards.forEach((c) => (c.enh = e)); }
function setSuit(cards, s) { cards.forEach((c) => { if (c.enh !== 'stone') c.suit = s; }); }
function sortHand(mode) {
  const r = G.run;
  if (mode) r.sortMode = mode;
  mode = r.sortMode;
  if (!mode) return;
  const sv = (c) => (c.enh === 'stone' ? -1 : c.rank);
  const so = { S: 0, H: 1, C: 2, D: 3 };
  if (mode === 'rank') r.hand.sort((a, b) => sv(b) - sv(a) || so[a.suit] - so[b.suit]);
  else r.hand.sort((a, b) => (a.enh === 'stone') - (b.enh === 'stone') || so[a.suit] - so[b.suit] || sv(b) - sv(a));
}

// ---------- Joker: tạo / sao chép / phá huỷ ----------
function makeJoker(key, o = {}) {
  const d = JOKERS[key];
  const j = { uid: uid(), kind: 'joker', key, ed: o.ed || null, st: {}, s: d.init ? d.init() : {}, extra: 0, debuff: false, faceDown: false };
  j.cost = o.cost != null ? o.cost : priceOf(d.cost + (j.ed ? EDITION[j.ed].cost : 0));
  return j;
}
function cloneJoker(t) {
  const j = JSON.parse(JSON.stringify(t));
  j.uid = uid();
  j.debuff = false;
  return j;
}
function rollRarity() { const x = R(); return x < 0.7 ? 1 : x < 0.95 ? 2 : 3; }
function jokerPool(rarity, exclude = []) {
  const r = G.run, show = hasJoker('showman');
  return Object.keys(JOKERS).filter((k) => {
    const d = JOKERS[k];
    if (d.rarity !== rarity) return false;
    if (k === 'gros_michel' && r.flags.grosGone) return false;
    if (k === 'cavendish' && !r.flags.grosGone) return false;
    if (!show && (r.jokers.some((j) => j.key === k) || exclude.includes(k))) return false;
    return true;
  });
}
function rollEdition(mod = 1, noNeg = false) {
  const rate = hasV('glow_up') ? 4 : hasV('hone') ? 2 : 1;
  const x = R();
  if (x > 1 - 0.003 * mod && !noNeg) return 'negative';
  if (x > 1 - 0.006 * rate * mod) return 'poly';
  if (x > 1 - 0.02 * rate * mod) return 'holo';
  if (x > 1 - 0.04 * rate * mod) return 'foil';
  return null;
}
function genJoker(o = {}) {
  const rarity = o.rarity || rollRarity();
  const pool = jokerPool(rarity, o.exclude || []);
  const key = o.key || (pool.length ? pick(pool) : 'joker');
  const ed = o.ed !== undefined ? o.ed : o.noEd ? null : rollEdition();
  const j = makeJoker(key, { ed });
  if (o.stickers) applyStickers(j);
  return j;
}
function applyStickers(j) {
  const r = G.run, d = JOKERS[j.key];
  const x = R();
  if (r.stake >= 4 && x > 0.7 && !d.ne) j.st.eternal = true;
  else if (r.stake >= 7 && x > 0.4 && x <= 0.7 && !d.np) j.st.perishable = 5;
  if (r.stake >= 8 && R() > 0.7) { j.st.rental = true; j.cost = 1; }
}
function createJoker(o = {}) {
  const j = genJoker(Object.assign({ noEd: false }, o));
  G.run.jokers.push(j);
  G.ev.push({ t: 'refresh' });
  return j;
}
function destroyJoker(j) {
  const r = G.run;
  const i = r.jokers.indexOf(j);
  if (i < 0) return;
  j.dying = true;
  r.jokers.splice(i, 1);
  G.ev.push({ t: 'destroy', src: j.uid });
}

// ---------- Vật phẩm tiêu hao ----------
function consPool(kind, exclude = []) {
  const r = G.run, show = hasJoker('showman');
  let keys;
  if (kind === 'tarot') keys = Object.keys(TAROTS);
  else if (kind === 'planet') keys = Object.keys(PLANETS).filter((k) => !PLANETS[k].secret || r.hands[PLANETS[k].hand].played > 0);
  else keys = Object.keys(SPECTRALS).filter((k) => !SPECTRALS[k].hidden);
  if (!show) {
    const owned = r.consumables.filter((c) => c.kind === kind).map((c) => c.key).concat(exclude);
    const f = keys.filter((k) => !owned.includes(k));
    if (f.length) keys = f;
  }
  return keys;
}
function makeCons(kind, key, o = {}) {
  key = key || pick(consPool(kind, o.exclude || []));
  const base = kind === 'spectral' ? 4 : 3;
  const c = { uid: uid(), kind, key, ed: o.ed || null, extra: 0 };
  c.cost = priceOf(base + (c.ed ? EDITION[c.ed].cost : 0), kind === 'planet' && hasJoker('astronomer'));
  return c;
}
function createCons(kind, key, o = {}) {
  const c = makeCons(kind, key, o);
  G.run.consumables.push(c);
  G.ev.push({ t: 'refresh' });
  return c;
}
function levelUp(hand, n = 1, silent) {
  const r = G.run;
  r.hands[hand].level = Math.max(1, r.hands[hand].level + n);
  if (!silent) G.ev.push({ t: 'level', hand });
}

// ---------- Gọi hook của Joker (hỗ trợ Bản Thiết Kế / Động Não) ----------
function copyTarget(j) {
  const r = G.run;
  let t = j, depth = 0;
  const seen = new Set();
  while (t && JOKERS[t.key].copy && depth < 20) {
    if (seen.has(t)) return null;
    seen.add(t);
    const i = r.jokers.indexOf(t);
    t = JOKERS[t.key].copy === 'right' ? r.jokers[i + 1] : r.jokers[0];
    depth++;
  }
  if (!t || t === j || JOKERS[t.key].copy) return null;
  if (JOKERS[t.key].passive || JOKERS[t.key].noCopy) return null;
  return t;
}
function jctx(extra) { return Object.assign({ bp: false }, G.cctx || {}, extra || {}); }
function callJ(j, hook, ctx, ...args) {
  if (j.debuff || j.dying) return null;
  let t = j, bp = false;
  if (JOKERS[j.key].copy) {
    t = copyTarget(j);
    bp = true;
    if (!t) return null;
  }
  const d = JOKERS[t.key];
  if (!d[hook]) return null;
  const pb = ctx.bp, ps = ctx.self;
  ctx.bp = bp;
  ctx.self = j;
  let res = null;
  try { res = d[hook](ctx, t, ...args); } catch (e) { console.error(hook, t.key, e); }
  ctx.bp = pb;
  ctx.self = ps;
  return res;
}
// Gọi hook ngoài lúc tính điểm và tạo sự kiện thông báo
function fireJ(j, hook, ctx, ...args) {
  const e = callJ(j, hook, ctx, ...args);
  if (e) applySideEff(j, e);
  return e;
}
function applySideEff(j, e) {
  if (e.money) addMoney(e.money, j);
  if (e.chips) G.ev.push({ t: 'msg', src: j.uid, text: `+${e.chips}`, color: 'chips' });
  if (e.mult) G.ev.push({ t: 'msg', src: j.uid, text: `+${e.mult} Nhân`, color: 'mult' });
  if (e.msg) G.ev.push({ t: 'msg', src: j.uid, text: e.msg, color: e.color || 'attn' });
  if (e.level) G.ev.push({ t: 'level', hand: e.level });
  if (e.refresh) G.ev.push({ t: 'refresh' });
}

// ---------- Đánh giá tay bài ----------
function getStraight(cards, four, shortcut) {
  const need = four ? 4 : 5;
  if (cards.length > 5 || cards.length < need) return null;
  const IDS = {};
  for (const c of cards) {
    const id = rid(c);
    if (id > 1 && id < 15) (IDS[id] = IDS[id] || []).push(c);
  }
  let len = 0, straight = false, skipped = false, t = [];
  for (let j = 1; j <= 14; j++) {
    const k = j === 1 ? 14 : j;
    if (IDS[k]) {
      len++;
      skipped = false;
      for (const v of IDS[k]) t.push(v);
    } else if (shortcut && !skipped && j !== 14) {
      skipped = true;
    } else {
      len = 0;
      skipped = false;
      if (straight) break;
      t = [];
    }
    if (len >= need) straight = true;
  }
  return straight ? [...new Set(t)] : null;
}
function getFlush(cards, four) {
  const need = four ? 4 : 5;
  if (cards.length > 5 || cards.length < need) return null;
  for (const s of SUITS) {
    const f = cards.filter((c) => isSuit(c, s, { flush: true }));
    if (f.length >= need) return f;
  }
  return null;
}
function evalHand(cards) {
  if (!cards || !cards.length) return null;
  const four = hasJoker('four_fingers'), sc = hasJoker('shortcut');
  const groups = {};
  for (const c of cards) if (c.enh !== 'stone') (groups[c.rank] = groups[c.rank] || []).push(c);
  const gl = Object.values(groups).sort((a, b) => b.length - a.length || b[0].rank - a[0].rank);
  const g0 = gl[0] ? gl[0].length : 0, g1 = gl[1] ? gl[1].length : 0;
  const flush = getFlush(cards, four), straight = getStraight(cards, four, sc);
  const fh = g0 >= 3 && g1 >= 2;
  const has = {
    'Flush Five': g0 >= 5 && !!flush,
    'Flush House': fh && !!flush,
    'Five of a Kind': g0 >= 5,
    'Straight Flush': !!flush && !!straight,
    'Four of a Kind': g0 >= 4,
    'Full House': fh,
    'Flush': !!flush,
    'Straight': !!straight,
    'Three of a Kind': g0 >= 3,
    'Two Pair': g0 >= 2 && g1 >= 2,
    'Pair': g0 >= 2,
    'High Card': true,
  };
  const hand = HAND_KEYS.find((k) => has[k]);
  let sc0 = [];
  switch (hand) {
    case 'Flush Five': case 'Five of a Kind': case 'Four of a Kind': case 'Three of a Kind': case 'Pair': sc0 = gl[0]; break;
    case 'Flush House': case 'Full House': case 'Two Pair': sc0 = gl[0].concat(gl[1]); break;
    case 'Straight Flush': sc0 = [...new Set(flush.concat(straight))]; break;
    case 'Flush': sc0 = flush; break;
    case 'Straight': sc0 = straight; break;
    default: {
      let best = null;
      for (const c of cards) if (c.enh !== 'stone' && (!best || c.rank > best.rank)) best = c;
      sc0 = best ? [best] : [];
    }
  }
  const set = new Set(sc0);
  for (const c of cards) if (c.enh === 'stone' || hasJoker('splash')) set.add(c);
  const scoring = cards.filter((c) => set.has(c));
  let disp = handVN(hand);
  if (hand === 'Straight Flush' && scoring.every((c) => [10, 11, 12, 13, 14].includes(rid(c)))) disp = 'Thùng Phá Sảnh Lớn';
  return { hand, scoring, contains: has, disp };
}

// ---------- Mù / Ante ----------
function blindAmount(ante) {
  const sc = G.run.scaling;
  const T = sc === 1 ? [300, 800, 2000, 5000, 11000, 20000, 35000, 50000]
    : sc === 2 ? [300, 900, 2600, 8000, 20000, 36000, 60000, 100000]
      : [300, 1000, 3200, 9000, 25000, 60000, 110000, 200000];
  if (ante < 1) return 100;
  if (ante <= 8) return T[ante - 1];
  const a = T[7], b = 1.6, c = ante - 8, d = 1 + 0.2 * (ante - 8), k = 0.75;
  let amt = Math.floor(a * Math.pow(b + Math.pow(k * c, d), c));
  if (!isFinite(amt)) return amt;
  const p = Math.pow(10, Math.floor(Math.log10(amt) - 1));
  return amt - (amt % p);
}
function blindTarget(type, key) {
  const r = G.run;
  const m = type === 'small' ? 1 : type === 'big' ? 1.5 : BOSSES[key].mult || 2;
  return Math.floor(blindAmount(r.ante) * m * (r.deckKey === 'plasma' ? 2 : 1));
}
function blindReward(type, key) {
  if (type === 'small') return G.run.stake >= 2 ? 0 : 3;
  if (type === 'big') return 4;
  return BOSSES[key].showdown ? 8 : 5;
}
function pickBoss() {
  const r = G.run;
  const showdown = r.ante > 0 && r.ante % 8 === 0;
  const pool = Object.keys(BOSSES).filter((k) => (showdown ? BOSSES[k].showdown : !BOSSES[k].showdown && (BOSSES[k].min || 1) <= Math.max(1, r.ante)));
  let fresh = pool.filter((k) => !r.bossesSeen.includes(k) && k !== (r.blinds && r.blinds.boss && r.blinds.boss.key));
  if (!fresh.length) {
    r.bossesSeen = r.bossesSeen.filter((k) => !pool.includes(k));
    fresh = pool.filter((k) => k !== (r.blinds && r.blinds.boss && r.blinds.boss.key));
    if (!fresh.length) fresh = pool;
  }
  const k = pick(fresh);
  r.bossesSeen.push(k);
  return k;
}
function rollTag() {
  const r = G.run;
  const pool = Object.keys(TAGS).filter((k) => (TAGS[k].min || 1) <= r.ante);
  const key = pick(pool);
  const t = { uid: uid(), kind: 'tag', key };
  if (key === 'orbital') t.hand = pick(HAND_KEYS.filter((h) => !HANDS[h].secret || r.hands[h].played > 0));
  return t;
}
function rollVoucher() {
  const r = G.run;
  const pool = Object.keys(VOUCHERS).filter((k) => !r.vouchers.includes(k) && (!VOUCHERS[k].req || r.vouchers.includes(VOUCHERS[k].req)) && !(r.shop && r.shop.vouchers.some((v) => v.key === k)));
  if (!pool.length) return null;
  const key = pick(pool);
  return { uid: uid(), kind: 'voucher', key, cost: priceOf(10) };
}
function setupAnte() {
  const r = G.run;
  r.blinds = {
    small: { tag: rollTag(), state: 'select' },
    big: { tag: rollTag(), state: 'upcoming' },
    boss: { key: null, state: 'upcoming' },
  };
  r.blinds.boss.key = pickBoss();
  r.blindIdx = 0;
  r.anteSt = { rerolls: 0, played: [] };
  r.anteVoucher = rollVoucher();
}

// ---------- Khởi tạo ván ----------
function newRun(deckKey = 'red', stake = 1, seed) {
  seed = seed || randomSeed();
  G.run = {
    v: 1, seed, rng: hashSeed(seed), uid: 1, deckKey, stake,
    ante: 1, round: 0, blindIdx: 0, money: 4,
    baseHands: 4, baseDiscards: 3, baseHandSize: 8, jokerSlotBase: 5, consSlotBase: 2,
    tempHandSize: 0, scaling: 1,
    hands: {}, deck: [], draw: [], hand: [], play: [], discard: [],
    jokers: [], consumables: [], vouchers: [], tags: [],
    phase: 'blind', blind: null, blinds: null, handsLeft: 0, discardsLeft: 0, score: 0,
    shop: null, pack: null, packQueue: [], cashout: null, sortMode: 'rank',
    stats: { hands: 0, discards: 0, skips: 0, tarots: 0, planets: [], bestHand: 0, rerolls: 0, unusedDiscards: 0, cardsPlayed: 0, cardsDiscarded: 0, bought: 0 },
    flags: { grosGone: false, firstShop: true },
    lastCons: null, bossesSeen: [], anteSt: { rerolls: 0, played: [] }, anteVoucher: null,
    cr: {}, rv: {}, lastHand: null, startDeckSize: 52, won: false, endless: false,
  };
  const r = G.run;
  for (const k of HAND_KEYS) r.hands[k] = { level: 1, played: 0, playedRound: 0 };
  r.deck = buildDeck(deckKey);
  r.startDeckSize = r.deck.length;
  // Bộ bài
  switch (deckKey) {
    case 'red': r.baseDiscards++; break;
    case 'blue': r.baseHands++; break;
    case 'yellow': r.money += 10; break;
    case 'black': r.jokerSlotBase++; r.baseHands--; break;
    case 'magic': redeemVoucher('crystal_ball', true); r.consumables.push(makeCons('tarot', 'fool'), makeCons('tarot', 'fool')); break;
    case 'nebula': redeemVoucher('telescope', true); r.consSlotBase--; break;
    case 'ghost': r.consumables.push(makeCons('spectral', 'hex')); break;
    case 'zodiac': redeemVoucher('tarot_merchant', true); redeemVoucher('planet_merchant', true); redeemVoucher('overstock', true); break;
    case 'painted': r.baseHandSize += 2; r.jokerSlotBase--; break;
  }
  // Mức cược
  if (stake >= 3) r.scaling = 2;
  if (stake >= 5) r.baseDiscards--;
  if (stake >= 6) r.scaling = 3;
  resetRoundVars();
  setupAnte();
}
function resetRoundVars() {
  const r = G.run;
  const real = r.deck.filter((c) => c.enh !== 'stone');
  const rc = real.length ? pick(real) : { rank: 14, suit: 'S' };
  const rc2 = real.length ? pick(real) : { rank: 14, suit: 'S' };
  const suitsNot = (s) => SUITS.filter((x) => x !== s);
  const vis = HAND_KEYS.filter((h) => !HANDS[h].secret || r.hands[h].played > 0);
  r.rv = {
    mailRank: rc.rank,
    castleSuit: real.length ? pick(real).suit : pick(SUITS),
    ancientSuit: pick(r.rv && r.rv.ancientSuit ? suitsNot(r.rv.ancientSuit) : SUITS),
    idolRank: rc2.rank, idolSuit: rc2.suit,
    todoHand: pick(vis.filter((h) => !r.rv || h !== r.rv.todoHand)),
  };
}

// ---------- Giá ----------
function priceOf(base, free) {
  if (free) return 0;
  const disc = hasV('liquidation') ? 50 : hasV('clearance') ? 25 : 0;
  return Math.max(1, Math.floor(((base + 0.5) * (100 - disc)) / 100));
}

// ---------- Vô hiệu (debuff) ----------
function updateDebuffs() {
  const r = G.run;
  if (!r) return;
  const b = r.blind;
  const act = r.phase === 'round' && b && b.type === 'boss' && !b.disabled;
  for (const c of r.deck) {
    let d = false;
    if (act) {
      switch (b.key) {
        case 'club': d = isSuit(c, 'C', { bypass: true }); break;
        case 'goad': d = isSuit(c, 'S', { bypass: true }); break;
        case 'window': d = isSuit(c, 'D', { bypass: true }); break;
        case 'head': d = isSuit(c, 'H', { bypass: true }); break;
        case 'plant': d = isFace(c, true); break;
        case 'pillar': d = r.anteSt.played.includes(c.uid); break;
        case 'leaf': d = !r.cr.leafSold; break;
      }
    }
    c.debuff = d;
  }
  for (const j of r.jokers) j.debuff = !!((j.st.perishable === 0) || (r.cr && r.cr.heartUid === j.uid && bossActive('heart')));
}
function disableBoss() {
  const r = G.run;
  if (!r.blind || r.blind.type !== 'boss') return;
  r.blind.disabled = true;
  if (r.blind.key === 'wall' || r.blind.key === 'vessel') r.blind.target = Math.floor(blindAmount(r.ante) * 2 * (r.deckKey === 'plasma' ? 2 : 1));
  if (r.blind.key === 'needle') { /* giữ nguyên */ }
  r.deck.forEach((c) => { if (r.phase === 'round') c.faceDown = false; });
  r.jokers.forEach((j) => (j.faceDown = false));
  if (r.cr.bellUid) r.cr.bellUid = null;
  updateDebuffs();
  G.ev.push({ t: 'msg', src: 'blind', text: 'Đã vô hiệu!', color: 'attn', big: true });
  G.ev.push({ t: 'refresh' });
}

// ---------- Rút bài ----------
function drawCards(n) {
  const r = G.run;
  const drawn = [];
  for (let i = 0; i < n && r.draw.length; i++) {
    const c = r.draw.pop();
    c.sel = false;
    c.faceDown = false;
    if (r.phase === 'round') {
      if (bossActive('house') && r.cr.handsPlayed === 0 && r.cr.discardsUsed === 0) c.faceDown = true;
      if (bossActive('wheel') && P(1, 7)) c.faceDown = true;
      if (bossActive('mark') && isFace(c, true)) c.faceDown = true;
      if (bossActive('fish') && r.cr.fishFlip) c.faceDown = true;
    }
    r.hand.push(c);
    drawn.push(c);
  }
  updateDebuffs();
  sortHand();
  return drawn;
}
function drawToFull() {
  const r = G.run;
  let n = handSize() - r.hand.length;
  if (bossActive('serpent') && (r.cr.handsPlayed > 0 || r.cr.discardsUsed > 0)) n = 3;
  if (n > 0) drawCards(n);
  bellCheck();
}
function bellCheck() {
  const r = G.run;
  if (!bossActive('bell')) return;
  if (!r.hand.length) return;
  if (!r.cr.bellUid || !r.hand.some((c) => c.uid === r.cr.bellUid)) {
    const c = pick(r.hand);
    r.cr.bellUid = c.uid;
  }
  r.hand.forEach((c) => { if (c.uid === r.cr.bellUid) c.sel = true; });
}

// ================= VÒNG CHƠI =================
async function selectBlind() {
  const r = G.run;
  if (G.busy || r.phase !== 'blind') return;
  G.busy = true;
  SND.play('button');
  const type = ['small', 'big', 'boss'][r.blindIdx];
  r.blinds[type].state = 'current';
  const key = type === 'boss' ? r.blinds.boss.key : null;
  r.blind = { type, key, target: blindTarget(type, key), reward: blindReward(type, key), disabled: false };
  r.phase = 'round';
  r.round++;
  r.score = 0;
  r.cr = { handsPlayed: 0, discardsUsed: 0, handTypes: [], mouthHand: null, fishFlip: false, leafSold: false, heartUid: null, bellUid: null };
  for (const k of HAND_KEYS) r.hands[k].playedRound = 0;
  // tag vòng (Tung hứng)
  r.tempHandSize = 0;
  r.tags = r.tags.filter((t) => { if (t.key === 'juggle') { r.tempHandSize += 3; return false; } return true; });
  if (type === 'boss' && hasJoker('chicot')) r.blind.disabled = true;
  r.handsLeft = maxHands();
  r.discardsLeft = maxDiscards();
  UI.setBg();
  UI.render();
  if (type === 'boss' && !r.blind.disabled) {
    SND.play('boss');
    if (key === 'water') r.discardsLeft = 0;
    if (key === 'needle') r.handsLeft = 1;
    if (key === 'acorn' && r.jokers.length) { r.jokers.forEach((j) => (j.faceDown = true)); shuffle(r.jokers); }
    if (key === 'heart' && r.jokers.length) r.cr.heartUid = pick(r.jokers).uid;
  } else if (type === 'boss' && r.blind.disabled) {
    say('blind', 'Chicot vô hiệu hoá!', 'attn', true);
  }
  // Joker khi chọn mù
  G.cctx = { blindType: type };
  for (const j of [...r.jokers]) fireJ(j, 'blindSelect', jctx());
  // chuẩn bị chồng bài
  r.hand = []; r.play = []; r.discard = [];
  r.draw = shuffle(r.deck.slice());
  r.deck.forEach((c) => { c.sel = false; c.faceDown = false; });
  updateDebuffs();
  await UI.flushEvents();
  UI.render();
  await wait(200);
  drawCards(handSize());
  bellCheck();
  UI.render();
  SND.play('deal');
  await wait(450);
  for (const j of [...r.jokers]) fireJ(j, 'onRoundStart', jctx());
  sortHand();
  await UI.flushEvents();
  UI.render();
  G.cctx = null;
  G.busy = false;
  save();
}

async function skipBlind() {
  const r = G.run;
  if (G.busy || r.phase !== 'blind' || r.blindIdx > 1) return;
  G.busy = true;
  SND.play('button');
  const type = r.blindIdx === 0 ? 'small' : 'big';
  r.blinds[type].state = 'skipped';
  r.stats.skips++;
  const tag = r.blinds[type].tag;
  r.blindIdx++;
  r.blinds[['small', 'big', 'boss'][r.blindIdx]].state = 'select';
  await gainTag(tag);
  UI.render();
  G.busy = false;
  await processPackQueue();
  save();
}

function addTag(key) {
  const t = { uid: uid(), kind: 'tag', key };
  if (key === 'orbital') t.hand = pick(HAND_KEYS.filter((h) => !HANDS[h].secret || G.run.hands[h].played > 0));
  G.run.tags.push(t);
  G.ev.push({ t: 'refresh' });
  return t;
}
async function gainTag(tag) {
  const r = G.run;
  const dup = r.tags.filter((t) => t.key === 'double');
  const copies = [tag];
  if (tag.key !== 'double' && dup.length) {
    r.tags = r.tags.filter((t) => t.key !== 'double');
    for (let i = 0; i < dup.length; i++) copies.push(Object.assign({}, tag, { uid: uid() }));
  }
  for (const t of copies) {
    r.tags.push(t);
    UI.render();
    SND.play('msg');
    await wait(250);
    await triggerTag(t, 'now');
  }
}
async function triggerTag(t, when) {
  const r = G.run;
  const d = TAGS[t.key];
  if (d.when !== when) return false;
  const rm = () => { r.tags = r.tags.filter((x) => x !== t); };
  switch (t.key) {
    case 'boss': rm(); r.blinds.boss.key = pickBoss(); say('center', 'Đổi Trùm!', 'attn', true); break;
    case 'standard': rm(); r.packQueue.push('standard_m'); break;
    case 'charm': rm(); r.packQueue.push('arcana_m'); break;
    case 'meteor': rm(); r.packQueue.push('celestial_m'); break;
    case 'buffoon': rm(); r.packQueue.push('buffoon_m'); break;
    case 'ethereal': rm(); r.packQueue.push('spectral_n'); break;
    case 'handy': rm(); addMoney(r.stats.hands, 'tags'); break;
    case 'garbage': rm(); addMoney(r.stats.unusedDiscards, 'tags'); break;
    case 'speed': rm(); addMoney(5 * r.stats.skips, 'tags'); break;
    case 'economy': rm(); if (r.money > 0) addMoney(Math.min(40, r.money), 'tags'); break;
    case 'topup': { rm(); const n = Math.min(2, jokerSpace()); for (let i = 0; i < n; i++) createJoker({ rarity: 1 }); break; }
    case 'orbital': rm(); levelUp(t.hand, 3); say('center', `${handVN(t.hand)} +3 cấp!`, 'planet', true); break;
    default: return false;
  }
  SND.play('money');
  await UI.flushEvents();
  UI.render();
  return true;
}

// ---------- Chọn lá ----------
function toggleSelect(c) {
  const r = G.run;
  if (G.busy) return;
  if (r.phase === 'round' && r.cr.bellUid === c.uid) { SND.play('error'); UI.shake(c.uid); return; }
  if (c.sel) { c.sel = false; SND.play('deselect'); }
  else {
    const n = r.hand.filter((x) => x.sel).length;
    if (n >= 5) { SND.play('error'); return; }
    c.sel = true;
    SND.play('select');
  }
  UI.render();
}

// ---------- Đánh bài ----------
async function playHand() {
  const r = G.run;
  if (G.busy || r.phase !== 'round') return;
  const sel = r.hand.filter((c) => c.sel);
  if (!sel.length || sel.length > 5 || r.handsLeft <= 0) return;
  G.busy = true;
  SND.play('button');
  UI.selected = null;
  // boss khi nhấn đánh
  if (bossActive('heart') && r.jokers.length > 1) {
    const prev = r.cr.heartUid;
    const opts = r.jokers.filter((j) => j.uid !== prev);
    r.cr.heartUid = pick(opts.length ? opts : r.jokers).uid;
    updateDebuffs();
  }
  r.hand = r.hand.filter((c) => !c.sel);
  r.play = sel;
  sel.forEach((c) => { c.sel = false; });
  r.handsLeft--;
  r.stats.hands++;
  r.stats.cardsPlayed += sel.length;
  UI.render();
  SND.play('card');
  await wait(350);
  // lật bài úp
  if (sel.some((c) => c.faceDown)) { sel.forEach((c) => (c.faceDown = false)); SND.play('flip'); UI.render(); await wait(250); }
  let bossTriggered = false;
  if (bossActive('hook') && r.hand.length) {
    const t = shuffle(r.hand.slice()).slice(0, 2);
    await discardCards(t, true);
    bossTriggered = true;
  }
  if (bossActive('tooth')) { addMoney(-sel.length, 'blind'); bossTriggered = true; }

  const res = evalHand(sel);
  const H = r.hands[res.hand];
  H.played++;
  H.playedRound++;
  r.lastHand = res.hand;
  sel.forEach((c) => { if (!r.anteSt.played.includes(c.uid)) r.anteSt.played.push(c.uid); });
  // tay bài bị cấm
  let notAllowed = false;
  if (bossActive('psychic') && sel.length < 5) notAllowed = true;
  if (bossActive('eye') && r.cr.handTypes.includes(res.hand)) notAllowed = true;
  if (bossActive('mouth') && r.cr.mouthHand && r.cr.mouthHand !== res.hand) notAllowed = true;
  if (bossActive('mouth') && !r.cr.mouthHand) r.cr.mouthHand = res.hand;
  r.cr.handTypes.push(res.hand);
  if (notAllowed) bossTriggered = true;
  if (!notAllowed && bossActive('ox') && res.hand === mostPlayedHandExcluding(res.hand)) {
    bossTriggered = true;
    if (r.money > 0) addMoney(-r.money, 'blind');
  }
  if (!notAllowed && bossActive('arm') && H.level > 1) { levelUp(res.hand, -1); bossTriggered = true; say('blind', 'Giảm cấp!', 'mult'); }
  if (bossActive('flint')) bossTriggered = true;
  r.stats.cardsPlayed;
  UI.showHand(res);
  await UI.flushEvents();

  const out = computeScore(res, { notAllowed, bossTriggered });
  await UI.playScore(out);
  r.score += out.total;
  if (out.total > r.stats.bestHand) r.stats.bestHand = out.total;
  await UI.countScore(out.total);

  // phá huỷ lá (thủy tinh, giác quan thứ 6)
  const ctx = out.ctx;
  const destroy = [];
  if (!notAllowed) {
    for (const c of res.scoring) {
      let d = false;
      for (const j of [...r.jokers]) if (callJ(j, 'destroyCheck', ctx, c)) d = true;
      if (c.enh === 'glass' && !c.debuff && P(1, 4)) d = true;
      if (d) destroy.push(c);
    }
  }
  if (destroy.length) {
    if (destroy.some((c) => c.enh === 'glass')) SND.play('glass');
    destroyCards(destroy);
    await UI.flushEvents();
  }
  // after
  if (!notAllowed) {
    for (const j of [...r.jokers]) fireJ(j, 'after', ctx);
  } else if (bossTriggered) {
    for (const j of [...r.jokers]) if (j.key === 'matador') fireJ(j, 'after', ctx);
  }
  await UI.flushEvents();
  // bỏ các lá đã đánh
  r.discard.push(...r.play);
  r.play = [];
  r.cr.handsPlayed++;
  UI.clearHand();
  UI.render();
  await wait(300);
  if (r.score >= r.blind.target) {
    await endRound(true);
  } else if (r.handsLeft <= 0) {
    await endRound(false);
  } else {
    if (bossActive('fish')) r.cr.fishFlip = true;
    drawToFull();
    r.cr.fishFlip = false;
    UI.render();
    SND.play('deal');
    await wait(300);
    G.busy = false;
    save();
  }
}
function mostPlayedHandExcluding() {
  // Con Bò: tay bài được đánh nhiều nhất (tính trước khi cộng lượt này)
  const r = G.run;
  let best = null, n = -1;
  for (const k of HAND_KEYS) {
    const p = r.hands[k].played - (k === r.lastHand ? 1 : 0);
    if (p > n) { n = p; best = k; }
  }
  return best;
}

// ---------- Tính điểm ----------
function computeScore(res, o) {
  const r = G.run;
  const ev = [];
  let chips = 0, mult = 0;
  const lowest = (() => {
    let t = null;
    for (const c of r.hand) if (c.enh !== 'stone' && (!t || c.rank <= t.rank)) t = c;
    return t;
  })();
  const ctx = {
    bp: false, hand: res.hand, contains: res.contains, played: r.play.slice(), scoring: res.scoring, held: r.hand.slice(),
    firstHand: r.cr.handsPlayed === 0, finalHand: r.handsLeft === 0, bossTriggered: o.bossTriggered,
    firstFace: res.scoring.find((c) => isFace(c)), lowestHeld: lowest && !lowest.debuff ? lowest : null,
  };
  G.cctx = ctx;
  const push = (e) => { e.chips = chips; e.mult = mult; ev.push(e); };
  const apply = (e, src, jig) => {
    if (!e) return false;
    let did = false;
    if (e.chips) { chips += e.chips; push({ t: 'chips', v: e.chips, src, jig }); did = true; }
    if (e.mult) { mult += e.mult; push({ t: 'mult', v: e.mult, src, jig }); did = true; }
    if (e.money) { r.money += e.money; push({ t: 'money', v: e.money, src, jig, money: r.money }); did = true; }
    if (e.xmult && e.xmult !== 1) { mult *= e.xmult; push({ t: 'xmult', v: e.xmult, src, jig }); did = true; }
    if (e.msg) { push({ t: 'msg', text: e.msg, color: e.color || 'attn', src: jig || src }); did = true; }
    if (e.level) push({ t: 'level', hand: e.level });
    if (e.refresh) push({ t: 'refresh' });
    return did;
  };
  // flush G.ev trước đó vào ev
  const drain = () => { while (G.ev.length) { const e = G.ev.shift(); e.chips = chips; e.mult = mult; ev.push(e); } };
  drain();
  if (o.notAllowed) {
    push({ t: 'msg', src: 'blind', text: 'Không được phép!', color: 'mult', big: true });
    G.cctx = null;
    return { chips: 0, mult: 0, total: 0, ev, ctx };
  }
  // trước khi tính
  for (const j of [...r.jokers]) {
    if (j.dying) continue;
    apply(callJ(j, 'before', ctx), j.uid);
    drain();
  }
  // giá trị gốc
  const hv = handVals(res.hand);
  chips = hv.chips; mult = hv.mult;
  if (bossActive('flint')) { chips = Math.max(0, Math.floor(chips / 2 + 0.5)); mult = Math.max(1, Math.floor(mult / 2 + 0.5)); }
  push({ t: 'base' });
  // lá được đánh
  for (const card of res.scoring) {
    push({ t: 'raise', src: card.uid });
    if (card.debuff) { push({ t: 'msg', src: card.uid, text: 'Vô hiệu!', color: 'dark' }); continue; }
    const reps = retriggers(card, 'play', ctx);
    for (let i = 0; i <= reps.length; i++) {
      if (i > 0) push({ t: 'again', src: reps[i - 1] });
      scoreCard(card);
    }
  }
  function scoreCard(card) {
    card.luckyTrig = 0;
    const base = card.enh === 'stone' ? 50 : rankChips(card.rank) + (card.enh === 'bonus' ? 30 : 0);
    apply({ chips: base + card.bonus }, card.uid);
    if (card.enh === 'mult') apply({ mult: 4 }, card.uid);
    if (card.enh === 'lucky' && P(1, 5)) { apply({ mult: 20 }, card.uid); card.luckyTrig++; }
    if (card.seal === 'gold') apply({ money: 3 }, card.uid);
    if (card.enh === 'lucky' && P(1, 15)) { apply({ money: 20 }, card.uid); card.luckyTrig++; }
    if (card.enh === 'glass') apply({ xmult: 2 }, card.uid);
    if (card.ed === 'foil') apply({ chips: 50 }, card.uid);
    if (card.ed === 'holo') apply({ mult: 10 }, card.uid);
    if (card.ed === 'poly') apply({ xmult: 1.5 }, card.uid);
    for (const j of [...r.jokers]) {
      if (j.dying) continue;
      apply(callJ(j, 'onScored', ctx, card), card.uid, j.uid);
      drain();
    }
    card.luckyTrig = 0;
  }
  // lá giữ trên tay
  for (const card of r.hand) {
    if (card.debuff) continue;
    const effs = () => {
      const list = [];
      if (card.enh === 'steel') list.push([{ xmult: 1.5 }, null]);
      for (const j of r.jokers) {
        if (j.dying) continue;
        const e = callJ(j, 'onHeld', ctx, card);
        if (e) list.push([e, j.uid]);
      }
      return list;
    };
    let first = effs();
    if (!first.length) continue;
    const reps = retriggers(card, 'held', ctx);
    for (let i = 0; i <= reps.length; i++) {
      const list = i === 0 ? first : effs();
      if (!list.length) break;
      if (i > 0) push({ t: 'again', src: reps[i - 1] });
      for (const [e, jid] of list) apply(e, card.uid, jid);
      drain();
    }
  }
  // Joker
  for (const j of [...r.jokers]) {
    if (j.dying || !r.jokers.includes(j)) continue;
    if (j.debuff) { push({ t: 'msg', src: j.uid, text: 'Vô hiệu!', color: 'dark' }); continue; }
    if (j.ed === 'foil') apply({ chips: 50 }, j.uid);
    if (j.ed === 'holo') apply({ mult: 10 }, j.uid);
    apply(callJ(j, 'main', ctx), j.uid);
    drain();
    for (const k of r.jokers) {
      if (k === j || k.dying) continue;
      const e = callJ(k, 'onOther', ctx, j);
      if (e) apply(e, k.uid);
    }
    if (j.ed === 'poly') apply({ xmult: 1.5 }, j.uid);
  }
  // Đài thiên văn
  if (hasV('observatory')) {
    for (const c of r.consumables) if (c.kind === 'planet' && PLANETS[c.key].hand === res.hand) apply({ xmult: 1.5 }, c.uid);
  }
  // Plasma
  if (r.deckKey === 'plasma') {
    const avg = Math.floor((chips + mult) / 2);
    chips = avg; mult = avg;
    push({ t: 'balance' });
  }
  G.cctx = null;
  const total = Math.floor(chips * mult);
  return { chips, mult, total, ev, ctx };
}
function retriggers(card, area, ctx) {
  const r = G.run, list = [];
  if (card.seal === 'red') list.push(card.uid);
  for (const j of r.jokers) {
    if (j.dying) continue;
    const n = callJ(j, 'retrig', ctx, card, area) || 0;
    for (let i = 0; i < n; i++) list.push(j.uid);
  }
  return list;
}

// ---------- Bỏ bài ----------
async function discardHand() {
  const r = G.run;
  if (G.busy || r.phase !== 'round') return;
  const sel = r.hand.filter((c) => c.sel);
  if (!sel.length || r.discardsLeft <= 0) return;
  G.busy = true;
  SND.play('button');
  r.discardsLeft--;
  r.stats.discards++;
  await discardCards(sel, false);
  r.cr.discardsUsed++;
  drawToFull();
  UI.render();
  SND.play('deal');
  await wait(300);
  G.busy = false;
  save();
}
async function discardCards(cards, hook) {
  const r = G.run;
  const ctx = jctx({ firstDiscard: !hook && r.cr.discardsUsed === 0, hook });
  r.stats.cardsDiscarded += cards.length;
  const destroy = [];
  // hook toàn bộ
  for (const j of [...r.jokers]) {
    const e = callJ(j, 'onDiscard', ctx, cards);
    if (e) { if (e.destroy) destroy.push(e.destroy); applySideEff(j, e); }
  }
  for (const c of cards) {
    for (const j of [...r.jokers]) fireJ(j, 'onDiscardCard', ctx, c);
    if (c.seal === 'purple' && !c.debuff && consSpace() > 0) { createCons('tarot'); say(c, '+1 Tarot', 'tarot'); }
  }
  r.hand = r.hand.filter((c) => !cards.includes(c));
  cards.forEach((c) => (c.sel = false));
  const keep = cards.filter((c) => !destroy.includes(c));
  r.discard.push(...keep);
  if (destroy.length) destroyCards(destroy);
  SND.play('card');
  UI.render();
  await UI.flushEvents();
  await wait(250);
}

// ---------- Kết thúc vòng ----------
async function endRound(won) {
  const r = G.run;
  if (!won) {
    const bones = r.jokers.find((j) => j.key === 'mr_bones' && !j.debuff);
    if (bones && r.score >= r.blind.target * 0.25) {
      destroyJoker(bones);
      say('center', 'Được Ông Xương cứu!', 'attn', true);
      await UI.flushEvents();
      r.savedByBones = true;
      won = true;
    }
  }
  if (!won) {
    await gameOver();
    return;
  }
  SND.play('win');
  const isBoss = r.blind.type === 'boss';
  const ctx = jctx({ isBoss });
  // lá giữ trên tay khi hết vòng: vàng & dấu xanh
  for (const c of r.hand) {
    if (c.debuff) continue;
    const times = 1 + retriggers(c, 'held', ctx).length;
    if (c.enh === 'gold') for (let i = 0; i < times; i++) addMoney(3, c);
    if (c.seal === 'blue' && r.lastHand) {
      for (let i = 0; i < times; i++) {
        if (consSpace() > 0) {
          const pk = Object.keys(PLANETS).find((k) => PLANETS[k].hand === r.lastHand);
          createCons('planet', pk);
          say(c, '+1 Hành Tinh', 'planet');
        }
      }
    }
  }
  await UI.flushEvents();
  // Joker cuối vòng
  for (const j of [...r.jokers]) fireJ(j, 'roundEnd', ctx);
  if (isBoss) for (const j of [...r.jokers]) fireJ(j, 'onBoss', ctx);
  // nhãn dán
  for (const j of [...r.jokers]) {
    if (j.st.perishable > 0) { j.st.perishable--; if (j.st.perishable === 0) say(j, 'Hỏng!', 'dark'); }
    if (j.st.rental) addMoney(-3, j);
  }
  await UI.flushEvents();
  // tính tiền
  const lines = [];
  const reward = r.savedByBones ? 0 : r.blind.reward;
  if (r.savedByBones) lines.push({ label: 'Được Ông Xương cứu', v: 0, kind: 'blind' });
  else lines.push({ label: r.blind.type === 'boss' ? BOSSES[r.blind.key].name : BLIND_INFO[r.blind.type].name, v: reward, kind: 'blind' });
  const green = r.deckKey === 'green';
  if (r.handsLeft > 0) lines.push({ label: `${r.handsLeft} Lượt đánh còn lại [$${green ? 2 : 1} mỗi lượt]`, v: r.handsLeft * (green ? 2 : 1), kind: 'hands' });
  if (green && r.discardsLeft > 0) lines.push({ label: `${r.discardsLeft} Lượt bỏ còn lại [$1 mỗi lượt]`, v: r.discardsLeft, kind: 'discards' });
  for (const j of r.jokers) {
    if (j.debuff) continue;
    const d = JOKERS[j.key].dollars;
    if (d) { const v = d(j); if (v) lines.push({ label: JOKERS[j.key].name, v, kind: 'joker', uid: j.uid }); }
  }
  if (isBoss) {
    const inv = r.tags.filter((t) => t.key === 'investment');
    if (inv.length) { lines.push({ label: 'Thẻ Đầu Tư', v: 25 * inv.length, kind: 'tag' }); r.tags = r.tags.filter((t) => t.key !== 'investment'); }
  }
  if (!green && r.money > 0) {
    const base = Math.floor(r.money / 5);
    let it = Math.min(base, interestCap());
    it += base * countJoker('to_the_moon');
    if (it > 0) lines.push({ label: `Tiền lãi: $1 mỗi $5 [tối đa $${interestCap()}]`, v: it, kind: 'interest' });
  }
  r.stats.unusedDiscards += r.discardsLeft;
  r.cashout = { lines, total: lines.reduce((a, l) => a + l.v, 0) };
  // trả bài về
  r.blinds[r.blind.type].state = 'defeated';
  r.hand.forEach((c) => (c.sel = false));
  r.discard.push(...r.hand, ...r.play);
  r.hand = []; r.play = [];
  r.deck.forEach((c) => { c.faceDown = false; c.debuff = false; c.sel = false; });
  r.jokers.forEach((j) => (j.faceDown = false));
  r.tempHandSize = 0;
  if (isBoss) {
    r.anteDone = true;
  }
  r.savedByBones = false;
  const winNow = isBoss && r.ante >= 8 && !r.won;
  r.phase = 'cashout';
  UI.render();
  await wait(300);
  if (winNow) {
    r.won = true;
    save();
    UI.showWin();
  }
  G.busy = false;
  save();
}

async function cashOut() {
  const r = G.run;
  if (G.busy || r.phase !== 'cashout') return;
  G.busy = true;
  SND.play('money');
  addMoney(r.cashout.total);
  G.ev = [];
  r.cashout = null;
  resetRoundVars();
  r.blind.state = 'done';
  if (r.anteDone) {
    r.anteDone = false;
    r.ante++;
    if (r.deckKey === 'anaglyph') r.tags.push({ uid: uid(), kind: 'tag', key: 'double' });
    setupAnte();
  } else {
    r.blindIdx++;
    r.blinds[['small', 'big', 'boss'][r.blindIdx]].state = 'select';
  }
  await enterShop();
  G.busy = false;
}

async function gameOver() {
  const r = G.run;
  r.phase = 'over';
  SND.play('lose');
  clearSave();
  UI.render();
  await wait(400);
  UI.showGameOver();
  G.busy = false;
}

// ================= CỬA HÀNG =================
function shopRates() {
  const t = hasV('tarot_tycoon') ? 32 : hasV('tarot_merchant') ? 9.6 : 4;
  const p = hasV('planet_tycoon') ? 32 : hasV('planet_merchant') ? 9.6 : 4;
  return { joker: 20, tarot: t, planet: p, card: hasV('magic_trick') ? 4 : 0, spectral: G.run.deckKey === 'ghost' ? 2 : 0 };
}
function genShopCard(exclude = []) {
  const kind = weighted(shopRates());
  if (kind === 'joker') {
    const j = genJoker({ exclude, stickers: true });
    return j;
  }
  if (kind === 'card') return genPlayingCard(hasV('illusion'), true);
  return makeCons(kind, null, { exclude });
}
function genPlayingCard(fancy, shop) {
  const c = newCard(pick(RANKS), pick(SUITS));
  if (fancy) {
    if (R() < 0.4) c.enh = randEnh();
    c.ed = rollEdition(2, true);
    if (R() < 0.2) c.seal = pick(['gold', 'red', 'blue', 'purple']);
  }
  if (shop) c.cost = priceOf(1 + (c.ed ? EDITION[c.ed].cost : 0) + (c.enh ? 1 : 0) + (c.seal ? 1 : 0));
  return c;
}
function genPack(key) {
  if (!key) {
    const w = {};
    for (const k in PACKS) w[k] = PACKS[k].w;
    key = weighted(w);
  }
  const P0 = PACKS[key];
  return { uid: uid(), kind: 'pack', key, cost: priceOf(P0.cost, P0.kind === 'celestial' && hasJoker('astronomer')) };
}
function rerollBase() { return Math.max(0, 5 - (hasV('reroll_surplus') ? 2 : 0) - (hasV('reroll_glut') ? 2 : 0)); }
async function enterShop() {
  const r = G.run;
  r.phase = 'shop';
  const s = r.shop = { cards: [], vouchers: [], packs: [], rerollCost: rerollBase(), rerollInc: 0, free: countJoker('chaos') };
  const n = 2 + (hasV('overstock') ? 1 : 0) + (hasV('overstock_plus') ? 1 : 0);
  const ex = () => s.cards.filter((x) => x.kind === 'joker' || x.key).map((x) => x.key);
  for (let i = 0; i < n; i++) s.cards.push(genShopCard(ex()));
  if (r.anteVoucher) s.vouchers.push(r.anteVoucher);
  s.packs.push(genPack(r.flags.firstShop ? 'buffoon_n' : null), genPack());
  r.flags.firstShop = false;
  // thẻ khi vào cửa hàng
  for (const t of r.tags.slice()) {
    const d = TAGS[t.key];
    if (d.when !== 'shop') continue;
    let used = true;
    switch (t.key) {
      case 'uncommon': case 'rare': {
        const j = genJoker({ rarity: t.key === 'uncommon' ? 2 : 3, exclude: ex() });
        j.cost = 0; j.free = true; s.cards.unshift(j);
        break;
      }
      case 'negative': case 'foil': case 'holo': case 'poly': {
        let j = s.cards.find((x) => x.kind === 'joker' && !x.ed && !x.free);
        if (!j) { j = genJoker({ exclude: ex(), ed: null }); s.cards.unshift(j); }
        j.ed = t.key; j.cost = 0; j.free = true;
        break;
      }
      case 'voucher': { const v = rollVoucher(); if (v) s.vouchers.push(v); break; }
      case 'coupon': s.cards.forEach((x) => { x.cost = 0; x.free = true; }); s.packs.forEach((x) => (x.cost = 0)); break;
      case 'd6': s.rerollCost = 0; s.d6 = true; break;
      default: used = false;
    }
    if (used) { r.tags = r.tags.filter((x) => x !== t); }
  }
  UI.selected = null;
  UI.setBg();
  UI.render();
  save();
}
function rerollCost() { const s = G.run.shop; return s.free > 0 ? 0 : s.rerollCost; }
async function reroll() {
  const r = G.run, s = r.shop;
  if (G.busy || r.phase !== 'shop') return;
  const cost = rerollCost();
  if (r.money - cost < debtLimit()) { SND.play('error'); return; }
  if (s.free > 0) s.free--;
  else { r.money -= cost; s.rerollCost++; }
  r.stats.rerolls++;
  SND.play('buy');
  s.cards = [];
  const n = 2 + (hasV('overstock') ? 1 : 0) + (hasV('overstock_plus') ? 1 : 0);
  for (let i = 0; i < n; i++) s.cards.push(genShopCard(s.cards.filter((x) => x.key).map((x) => x.key)));
  for (const j of [...r.jokers]) fireJ(j, 'onReroll', jctx());
  UI.selected = null;
  UI.render();
  await UI.flushEvents();
  save();
}
function canAfford(cost) { return G.run.money - cost >= debtLimit(); }
async function buyItem(item, andUse) {
  const r = G.run, s = r.shop;
  if (G.busy) return;
  const cost = item.cost || 0;
  if (!canAfford(cost)) { SND.play('error'); UI.toast('Không đủ tiền!'); return; }
  const k = item.kind;
  if (k === 'joker' && item.ed !== 'negative' && jokerSpace() <= 0) { SND.play('error'); UI.toast('Hết ô Joker!'); return; }
  if (['tarot', 'planet', 'spectral'].includes(k) && !andUse && item.ed !== 'negative' && consSpace() <= 0) { SND.play('error'); UI.toast('Hết ô tiêu hao!'); return; }
  if (andUse && !canUseCons(item, [])) { SND.play('error'); return; }
  G.busy = true;
  const rm = (arr) => { const i = arr.indexOf(item); if (i >= 0) arr.splice(i, 1); };
  r.money -= cost;
  r.stats.bought++;
  SND.play('buy');
  UI.selected = null;
  if (k === 'joker') { rm(s.cards); item.free = false; r.jokers.push(item); if (item.cost === 0) item.cost = priceOf(JOKERS[item.key].cost); }
  else if (k === 'card') { rm(s.cards); item.cost = 0; addCardsToDeck([item], false); }
  else if (k === 'voucher') { rm(s.vouchers); if (r.anteVoucher === item) r.anteVoucher = null; redeemVoucher(item.key); }
  else if (k === 'pack') { rm(s.packs); UI.render(); G.busy = false; await openPack(item.key); return; }
  else {
    rm(s.cards);
    if (andUse) { UI.render(); G.busy = false; await useCons(item, true); G.busy = false; save(); return; }
    r.consumables.push(item);
  }
  UI.render();
  await UI.flushEvents();
  G.busy = false;
  save();
}
function redeemVoucher(key, silent) {
  const r = G.run;
  if (r.vouchers.includes(key)) return;
  r.vouchers.push(key);
  switch (key) {
    case 'crystal_ball': r.consSlotBase++; break;
    case 'grabber': case 'nacho_tong': r.baseHands++; if (r.phase === 'round') r.handsLeft++; break;
    case 'wasteful': case 'recyclomancy': r.baseDiscards++; if (r.phase === 'round') r.discardsLeft++; break;
    case 'antimatter': r.jokerSlotBase++; break;
    case 'paint_brush': case 'palette': r.baseHandSize++; break;
    case 'hieroglyph': r.ante--; r.baseHands--; break;
    case 'petroglyph': r.ante--; r.baseDiscards--; break;
    case 'overstock': case 'overstock_plus':
      if (r.shop && !silent) r.shop.cards.push(genShopCard());
      break;
    case 'clearance': case 'liquidation': if (r.shop) [...r.shop.cards, ...r.shop.packs].forEach((x) => { if (!x.free && x.cost) x.cost = Math.max(1, Math.floor(x.cost * (key === 'clearance' ? 0.75 : 0.67))); }); break;
  }
  if (!silent) { say('center', VOUCHERS[key].name + '!', 'attn', true); }
}
async function sellItem(item) {
  const r = G.run;
  if (G.busy) return;
  if (item.st && item.st.eternal) { SND.play('error'); UI.toast('Lá Vĩnh Cửu không thể bán!'); return; }
  const v = sellValue(item);
  if (item.kind === 'joker') {
    const i = r.jokers.indexOf(item);
    if (i < 0) return;
    G.busy = true;
    fireJ(item, 'onSell', jctx());
    const i2 = r.jokers.indexOf(item);
    if (i2 >= 0) r.jokers.splice(i2, 1);
    if (r.phase === 'round' && bossActive('leaf')) { r.cr.leafSold = true; updateDebuffs(); }
  } else {
    const i = r.consumables.indexOf(item);
    if (i < 0) return;
    G.busy = true;
    r.consumables.splice(i, 1);
  }
  for (const j of [...r.jokers]) fireJ(j, 'onAnySell', jctx(), item);
  SND.play('sell');
  r.money += v;
  UI.selected = null;
  UI.render();
  await UI.flushEvents();
  G.busy = false;
  save();
}
async function nextRound() {
  const r = G.run;
  if (G.busy || r.phase !== 'shop') return;
  G.busy = true;
  SND.play('button');
  for (const j of [...r.jokers]) fireJ(j, 'shopEnd', jctx());
  await UI.flushEvents();
  r.shop = null;
  r.phase = 'blind';
  UI.selected = null;
  UI.setBg();
  UI.render();
  G.busy = false;
  save();
}
async function rerollBoss() {
  const r = G.run;
  if (G.busy || r.phase !== 'blind') return;
  const can = hasV('retcon') || (hasV('directors_cut') && r.anteSt.rerolls < 1);
  if (!can || !canAfford(10)) { SND.play('error'); return; }
  r.money -= 10;
  r.anteSt.rerolls++;
  r.blinds.boss.key = pickBoss();
  SND.play('boss');
  UI.render();
  save();
}

// ================= VẬT PHẨM TIÊU HAO =================
function canUseCons(c, sel) {
  const d = consDef(c);
  if (!d) return false;
  const r = G.run;
  if (c.kind === 'planet') return true;
  const needsCards = d.max != null;
  if (needsCards) {
    if (!(r.phase === 'round' || (r.phase === 'pack' && r.hand.length))) return false;
    if (sel.length < (d.min || 1) || sel.length > d.max) return false;
  }
  if (d.can && !d.can(sel, c)) return false;
  return true;
}
async function useCons(c, fromShop) {
  const r = G.run;
  if (G.busy) return;
  const sel = r.hand.filter((x) => x.sel);
  if (!canUseCons(c, sel)) { SND.play('error'); return; }
  G.busy = true;
  UI.selected = null;
  const i = r.consumables.indexOf(c);
  if (i >= 0) r.consumables.splice(i, 1);
  const d = consDef(c);
  SND.play(c.kind === 'planet' ? 'planet' : 'tarot');
  G.ev.push({ t: 'useCons', src: c.uid, obj: c });
  if (c.kind === 'planet') {
    G.ev.push({ t: 'planetShow', hand: d.hand });
  }
  await UI.flushEvents();
  d.use(sel, c);
  if (c.kind === 'tarot') r.stats.tarots++;
  if (c.kind === 'planet' && !r.stats.planets.includes(c.key)) r.stats.planets.push(c.key);
  if ((c.kind === 'tarot' && c.key !== 'fool') || c.kind === 'planet') r.lastCons = { kind: c.kind, key: c.key };
  for (const j of [...r.jokers]) fireJ(j, 'onUse', jctx(), c);
  if (d.max != null) sel.forEach((x) => (x.sel = false));
  updateDebuffs();
  if (r.phase === 'round') sortHand();
  UI.render();
  await UI.flushEvents();
  if (c.kind === 'planet') await UI.hidePlanet();
  UI.render();
  G.busy = false;
  if (r.phase !== 'pack') save();
}

// ================= GÓI BÀI =================
async function processPackQueue() {
  const r = G.run;
  while (r.packQueue.length && r.phase !== 'pack') {
    const k = r.packQueue.shift();
    await openPack(k);
    await new Promise((res) => (G.packDone = res));
  }
}
async function openPack(key) {
  const r = G.run;
  const P0 = PACKS[key], kind = P0.kind;
  r.pack = { key, items: [], left: P0.choose, ret: r.phase };
  r.phase = 'pack';
  SND.play('open');
  const items = r.pack.items;
  const ex = () => items.map((x) => x.key).filter(Boolean);
  for (let i = 0; i < P0.n; i++) {
    let it;
    if (kind === 'arcana') {
      if (hasV('omen_globe') && R() < 0.2) it = makeCons('spectral', R() < 0.003 ? 'soul' : null, { exclude: ex() });
      else it = R() < 0.003 && !items.some((x) => x.key === 'soul') ? makeCons('spectral', 'soul') : makeCons('tarot', null, { exclude: ex() });
    } else if (kind === 'celestial') {
      if (i === 0 && hasV('telescope')) {
        const mp = mostPlayedHand();
        it = makeCons('planet', Object.keys(PLANETS).find((k) => PLANETS[k].hand === mp));
      } else it = R() < 0.003 && !items.some((x) => x.key === 'black_hole') ? makeCons('spectral', 'black_hole') : makeCons('planet', null, { exclude: ex() });
    } else if (kind === 'spectral') {
      const x = R();
      it = x < 0.003 && !items.some((y) => y.key === 'soul') ? makeCons('spectral', 'soul') : x < 0.006 && !items.some((y) => y.key === 'black_hole') ? makeCons('spectral', 'black_hole') : makeCons('spectral', null, { exclude: ex() });
    } else if (kind === 'buffoon') {
      it = genJoker({ exclude: ex(), stickers: true });
    } else {
      it = genPlayingCard(true, false);
      it.pack = true;
    }
    it.cost = it.kind === 'card' ? 0 : it.cost;
    items.push(it);
  }
  // rút bài lên tay cho arcana / huyền bí
  if (kind === 'arcana' || kind === 'spectral') {
    r.savedDraw = r.draw;
    r.draw = shuffle(r.deck.slice());
    r.hand = [];
    r.deck.forEach((c) => { c.sel = false; c.faceDown = false; c.debuff = false; });
    drawCards(handSize());
  }
  UI.selected = null;
  for (const j of [...r.jokers]) fireJ(j, 'onPackOpen', jctx());
  UI.setBg();
  UI.render();
  await UI.flushEvents();
}
async function choosePackItem(it) {
  const r = G.run, p = r.pack;
  if (G.busy || !p) return;
  const k = it.kind;
  if (k === 'joker') {
    if (it.ed !== 'negative' && jokerSpace() <= 0) { SND.play('error'); UI.toast('Hết ô Joker!'); return; }
    p.items.splice(p.items.indexOf(it), 1);
    r.jokers.push(it);
    SND.play('buy');
  } else if (k === 'card') {
    p.items.splice(p.items.indexOf(it), 1);
    delete it.pack;
    addCardsToDeck([it], false);
    SND.play('buy');
  } else {
    const sel = r.hand.filter((x) => x.sel);
    if (!canUseCons(it, sel)) { SND.play('error'); return; }
    p.items.splice(p.items.indexOf(it), 1);
    await useCons(it);
  }
  UI.selected = null;
  p.left--;
  UI.render();
  await UI.flushEvents();
  if (p.left <= 0 || !p.items.length) { await wait(300); await endPack(false); }
}
async function skipPack() {
  const r = G.run;
  if (G.busy || !r.pack) return;
  for (const j of [...r.jokers]) fireJ(j, 'onPackSkip', jctx());
  await UI.flushEvents();
  await endPack(true);
}
async function endPack() {
  const r = G.run;
  const ret = r.pack.ret;
  r.pack = null;
  r.hand.forEach((c) => (c.sel = false));
  r.hand = [];
  if (r.savedDraw) { r.draw = r.savedDraw; r.savedDraw = null; } else r.draw = [];
  r.phase = ret;
  UI.selected = null;
  UI.setBg();
  UI.render();
  save();
  if (G.packDone) { const f = G.packDone; G.packDone = null; f(); }
}

// ================= LƯU / TẢI =================
const SAVE_KEY = 'balatro_vn_save_v1';
function serialize() {
  const r = G.run;
  const o = Object.assign({}, r);
  for (const k of ['draw', 'hand', 'play', 'discard']) o[k] = r[k].map((c) => c.uid);
  o.savedDraw = r.savedDraw ? r.savedDraw.map((c) => c.uid) : null;
  return JSON.stringify(o);
}
function save() {
  const r = G.run;
  if (!r || r.phase === 'over' || r.phase === 'pack') return;
  try { localStorage.setItem(SAVE_KEY, serialize()); } catch (e) { /* bỏ qua */ }
}
function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* bỏ qua */ } }
function hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } }
function loadSave() {
  try {
    const o = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (!o || !o.deck) return false;
    const by = {};
    o.deck.forEach((c) => (by[c.uid] = c));
    for (const k of ['draw', 'hand', 'play', 'discard']) o[k] = (o[k] || []).map((id) => by[id]).filter(Boolean);
    o.savedDraw = null;
    G.run = o;
    if (o.phase === 'pack') o.phase = 'shop';
    return true;
  } catch (e) { console.error(e); return false; }
}
// thống kê lâu dài
const PROFILE_KEY = 'balatro_vn_profile_v1';
function loadProfile() {
  try { return JSON.parse(localStorage.getItem(PROFILE_KEY)) || { wins: 0, losses: 0, best: 0, bestAnte: 0, stakes: {} }; } catch (e) { return { wins: 0, losses: 0, best: 0, bestAnte: 0, stakes: {} }; }
}
function saveProfile(p) { try { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); } catch (e) { /* */ } }

'use strict';
// ================= KHỞI ĐỘNG / MENU =================
const SETTINGS_KEY = 'balatro_vn_settings';
function loadSettings() {
  let saved = null;
  try { saved = localStorage.getItem(SETTINGS_KEY); } catch (e) { /* */ }
  // mặc định trên điện thoại: tắt CRT cho nhẹ máy
  if (!saved && window.matchMedia && matchMedia('(pointer: coarse)').matches) G.settings.crt = false;
  try { Object.assign(G.settings, JSON.parse(saved || '{}')); } catch (e) { /* */ }
}
function toggleFullscreen() {
  const d = document, el = d.documentElement;
  const fs = d.fullscreenElement || d.webkitFullscreenElement;
  try {
    if (fs) (d.exitFullscreen || d.webkitExitFullscreen).call(d);
    else if (el.requestFullscreen) el.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  } catch (e) { /* */ }
}
const canFullscreen = () => !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen);
function saveSettings() {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(G.settings)); } catch (e) { /* */ }
  if (SND.master) SND.master.gain.value = G.settings.volume;
}
function applyCRT() { document.body.classList.toggle('crt', !!G.settings.crt); }
function clearSprites() {
  for (const sp of UI.sprites.values()) sp.el.remove();
  UI.sprites.clear();
  UI.pop.innerHTML = '';
  UI.hideTip();
}
function showMenu() {
  G.run = null;
  G.busy = false;
  G.ev = [];
  clearSprites();
  UI.selected = null;
  UI.render();
  UI.setBg();
  renderMenu();
  $('#menu').classList.add('show');
}
function renderMenu() {
  const m = $('#menu');
  const prof = loadProfile();
  const logo = 'BALATRO'.split('').map((ch, i) => `<span style="animation-delay:${i * 0.12}s">${ch}</span>`).join('');
  const demo = [
    { kind: 'card', rank: 14, suit: 'S', bonus: 0 },
    { kind: 'joker', key: 'joker', st: {}, s: {}, ed: 'holo' },
    { kind: 'card', rank: 13, suit: 'H', bonus: 0, ed: 'poly' },
  ];
  m.innerHTML = `
    <div class="menu-cards">${demo.map((o, i) => `<div class="menu-card mc${i}">${UI.faceHTML(o)}</div>`).join('')}</div>
    <div class="logo">${logo}</div>
    <div class="logo-sub">♠ PHIÊN BẢN TIẾNG VIỆT ♥</div>
    <div class="menu-btns">
      <button class="btn blue big" id="mPlay">CHƠI</button>
      ${hasSave() ? '<button class="btn green big" id="mCont">TIẾP TỤC</button>' : ''}
      <button class="btn green big" id="mHelp">HƯỚNG DẪN</button>
      <button class="btn orange big" id="mOpt">TUỲ CHỌN</button>
      <button class="btn red big" id="mCol">BỘ SƯU TẬP</button>
    </div>
    <div class="menu-foot">Thắng: <b class="c-attn">${prof.wins}</b> · Thua: <b class="c-mult">${prof.losses}</b> · Tay bài cao nhất: <b class="c-chips">${fmtNum(prof.best)}</b> · Ante xa nhất: <b class="c-attn">${prof.bestAnte}</b></div>`;
  $('#mPlay').onclick = () => { SND.init(); SND.play('button'); UI.showNewRun(); };
  const c = $('#mCont');
  if (c) c.onclick = () => { SND.init(); SND.play('button'); continueRun(); };
  $('#mOpt').onclick = () => { SND.init(); SND.play('button'); UI.showOptions(); };
  $('#mCol').onclick = () => { SND.init(); SND.play('button'); UI.showCollection(); };
  $('#mHelp').onclick = () => { SND.init(); SND.play('button'); UI.showGuide(); };
}
function startRun(deck, stake, seed) {
  UI.ov.classList.remove('show');
  UI.ov.innerHTML = '';
  $('#menu').classList.remove('show');
  clearSprites();
  clearSave();
  G.ev = [];
  G.busy = false;
  newRun(deck, stake, seed);
  UI.dispMoney = null;
  UI.selected = null;
  UI.setBg();
  UI.render();
  save();
  if (!guideSeen()) setTimeout(() => UI.showGuide(), 400);
}
function continueRun() {
  if (!loadSave()) { renderMenu(); return; }
  $('#menu').classList.remove('show');
  clearSprites();
  G.busy = false;
  G.ev = [];
  UI.dispMoney = null;
  UI.setBg();
  UI.render();
}

window.addEventListener('load', () => {
  loadSettings();
  applyCRT();
  BG.init();
  UI.init();
  showMenu();
});

'use strict';
// ================= DỮ LIỆU CƠ BẢN =================
const SUITS = ['S', 'H', 'C', 'D'];
const SUIT = {
  S: { name: 'Bích', sym: '♠', col: '#403995' },
  H: { name: 'Cơ', sym: '♥', col: '#f03464' },
  C: { name: 'Chuồn', sym: '♣', col: '#235955' },
  D: { name: 'Rô', sym: '♦', col: '#f06b3f' },
};
const RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
const RANK_LBL = { 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10', 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
const RANK_NAME = { 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10', 11: 'Bồi', 12: 'Đầm', 13: 'Già', 14: 'Át' };
const rankChips = (r) => (r === 14 ? 11 : r >= 11 ? 10 : r);

// ---------- Tay bài ----------
const HAND_KEYS = ['Flush Five', 'Flush House', 'Five of a Kind', 'Straight Flush', 'Four of a Kind', 'Full House', 'Flush', 'Straight', 'Three of a Kind', 'Two Pair', 'Pair', 'High Card'];
const HANDS = {
  'Flush Five': { vn: 'Ngũ Quý Đồng Chất', chips: 160, mult: 16, lc: 50, lm: 3, secret: true, ex: '5 lá cùng hạng và cùng chất' },
  'Flush House': { vn: 'Cù Lũ Đồng Chất', chips: 140, mult: 14, lc: 40, lm: 4, secret: true, ex: 'Một Sám Cô và một Đôi, tất cả cùng chất' },
  'Five of a Kind': { vn: 'Ngũ Quý', chips: 120, mult: 12, lc: 35, lm: 3, secret: true, ex: '5 lá cùng hạng' },
  'Straight Flush': { vn: 'Thùng Phá Sảnh', chips: 100, mult: 8, lc: 40, lm: 4, ex: '5 lá liên tiếp cùng chất' },
  'Four of a Kind': { vn: 'Tứ Quý', chips: 60, mult: 7, lc: 30, lm: 3, ex: '4 lá cùng hạng' },
  'Full House': { vn: 'Cù Lũ', chips: 40, mult: 4, lc: 25, lm: 2, ex: 'Một Sám Cô và một Đôi' },
  'Flush': { vn: 'Thùng', chips: 35, mult: 4, lc: 15, lm: 2, ex: '5 lá cùng chất' },
  'Straight': { vn: 'Sảnh', chips: 30, mult: 4, lc: 30, lm: 3, ex: '5 lá có hạng liên tiếp' },
  'Three of a Kind': { vn: 'Sám Cô', chips: 30, mult: 3, lc: 20, lm: 2, ex: '3 lá cùng hạng' },
  'Two Pair': { vn: 'Thú', chips: 20, mult: 2, lc: 20, lm: 1, ex: '2 Đôi khác hạng' },
  'Pair': { vn: 'Đôi', chips: 10, mult: 2, lc: 15, lm: 1, ex: '2 lá cùng hạng' },
  'High Card': { vn: 'Mậu Thầu', chips: 5, mult: 1, lc: 10, lm: 1, ex: 'Lá bài cao nhất' },
};
const handVN = (k) => (HANDS[k] ? HANDS[k].vn : k);

// ---------- Cường hoá / Phiên bản / Dấu ----------
const ENH = {
  bonus: { name: 'Lá Thưởng', desc: () => '[c]+30[/] Chip thêm' },
  mult: { name: 'Lá Nhân', desc: () => '[m]+4[/] Nhân' },
  wild: { name: 'Lá Đa Năng', desc: () => 'Được tính là [a]mọi chất[/]' },
  glass: { name: 'Lá Thủy Tinh', desc: () => `[x]X2[/] Nhân\n[g]${odds(1)} trên 4[/] khả năng bị vỡ` },
  steel: { name: 'Lá Thép', desc: () => '[x]X1,5[/] Nhân\nkhi lá này được [a]giữ trên tay[/]' },
  stone: { name: 'Lá Đá', desc: () => '[c]+50[/] Chip\nKhông có hạng hay chất\nLuôn được tính điểm' },
  gold: { name: 'Lá Vàng', desc: () => '[$]$3[/] nếu lá này được\n[a]giữ trên tay[/] khi hết vòng' },
  lucky: { name: 'Lá May Mắn', desc: () => `[g]${odds(1)} trên 5[/] khả năng [m]+20[/] Nhân\n[g]${odds(1)} trên 15[/] khả năng nhận [$]$20[/]` },
};
const EDITION = {
  foil: { name: 'Ánh Kim', desc: '[c]+50[/] Chip', cost: 2 },
  holo: { name: 'Ba Chiều', desc: '[m]+10[/] Nhân', cost: 3 },
  poly: { name: 'Đa Sắc', desc: '[x]X1,5[/] Nhân', cost: 5 },
  negative: { name: 'Âm Bản', desc: '[d]+1[/] ô Joker', cost: 5 },
};
const SEAL = {
  gold: { name: 'Dấu Vàng', desc: 'Nhận [$]$3[/] khi lá này\nđược tính điểm' },
  red: { name: 'Dấu Đỏ', desc: 'Kích hoạt lại lá này [a]1[/] lần' },
  blue: { name: 'Dấu Xanh', desc: 'Tạo lá [p]Hành Tinh[/] của tay bài\n[a]cuối cùng[/] nếu lá này được\n[a]giữ trên tay[/] khi hết vòng\n[d](Cần chỗ trống)[/]' },
  purple: { name: 'Dấu Tím', desc: 'Tạo một lá [t]Tarot[/] khi lá này\nbị [a]bỏ[/]\n[d](Cần chỗ trống)[/]' },
};
const STICKER = {
  eternal: { name: 'Vĩnh Cửu', desc: 'Không thể bán hay phá huỷ' },
  perishable: { name: 'Mau Hỏng', desc: (j) => `Bị vô hiệu sau [a]5[/] vòng\n[d](Còn ${j ? j.st.perishable : 5} vòng)[/]` },
  rental: { name: 'Thuê', desc: 'Mất [$]$3[/] khi hết mỗi vòng' },
};
const RARITY = {
  1: { name: 'Phổ Biến', col: '#009dff' },
  2: { name: 'Không Phổ Biến', col: '#4bc292' },
  3: { name: 'Hiếm', col: '#fe5f55' },
  4: { name: 'Huyền Thoại', col: '#b26cbb' },
};

// ---------- Mù (Blind) ----------
const BLIND_INFO = {
  small: { name: 'Mù Nhỏ', col: '#2a6fb5', mult: 1, reward: 3 },
  big: { name: 'Mù Lớn', col: '#d6971e', mult: 1.5, reward: 4 },
};
const BOSSES = {
  hook: { name: 'Lưỡi Câu', desc: 'Bỏ ngẫu nhiên 2 lá trên tay\nsau mỗi lượt đánh', min: 1, col: '#a84024' },
  ox: { name: 'Con Bò', desc: () => `Đánh tay [a]${handVN(mostPlayedHand())}[/]\nsẽ đặt tiền về [$]$0[/]`, min: 6, col: '#b95b08' },
  house: { name: 'Ngôi Nhà', desc: 'Tay bài đầu tiên được\nrút úp mặt', min: 2, col: '#5186a8' },
  wall: { name: 'Bức Tường', desc: 'Mù cực lớn', min: 2, col: '#8a59a5', mult: 4 },
  wheel: { name: 'Bánh Xe', desc: () => `[g]${odds(1)} trên 7[/] lá bài\nbị rút úp mặt`, min: 2, col: '#50bf7c' },
  arm: { name: 'Cánh Tay', desc: 'Giảm cấp của\ntay bài đã đánh', min: 2, col: '#6865f3' },
  club: { name: 'Cây Chuồn', desc: 'Mọi lá [C]Chuồn[/] bị vô hiệu', min: 1, col: '#9bb36d' },
  fish: { name: 'Con Cá', desc: 'Các lá rút sau mỗi\nlượt đánh bị úp mặt', min: 2, col: '#3e85bd' },
  psychic: { name: 'Nhà Ngoại Cảm', desc: 'Phải đánh đủ 5 lá', min: 1, col: '#efc03c' },
  goad: { name: 'Cây Gậy', desc: 'Mọi lá [S]Bích[/] bị vô hiệu', min: 1, col: '#b95c96' },
  water: { name: 'Dòng Nước', desc: 'Bắt đầu với\n0 lượt bỏ', min: 2, col: '#8fc5dc' },
  window: { name: 'Cửa Sổ', desc: 'Mọi lá [D]Rô[/] bị vô hiệu', min: 1, col: '#a9a295' },
  manacle: { name: 'Còng Tay', desc: '-1 số lá trên tay', min: 1, col: '#575757' },
  eye: { name: 'Con Mắt', desc: 'Không được lặp lại\nloại tay bài trong vòng này', min: 3, col: '#4b71e4' },
  mouth: { name: 'Cái Miệng', desc: 'Chỉ được đánh 1 loại\ntay bài trong vòng này', min: 2, col: '#ae718e' },
  plant: { name: 'Cái Cây', desc: 'Mọi lá mặt người\nbị vô hiệu', min: 4, col: '#709284' },
  serpent: { name: 'Con Rắn', desc: 'Sau khi đánh hoặc bỏ,\nluôn rút đúng 3 lá', min: 5, col: '#439a4f' },
  pillar: { name: 'Cột Trụ', desc: 'Các lá đã đánh trong\nAnte này bị vô hiệu', min: 1, col: '#7e6752' },
  needle: { name: 'Cây Kim', desc: 'Chỉ được đánh 1 lượt', min: 2, col: '#5c6e31', mult: 1 },
  head: { name: 'Cái Đầu', desc: 'Mọi lá [H]Cơ[/] bị vô hiệu', min: 1, col: '#ac9db4' },
  tooth: { name: 'Cái Răng', desc: 'Mất [$]$1[/] cho mỗi\nlá được đánh', min: 3, col: '#b52d2d' },
  flint: { name: 'Đá Lửa', desc: 'Chip và Nhân cơ bản\nbị giảm một nửa', min: 2, col: '#e56a2f' },
  mark: { name: 'Dấu Ấn', desc: 'Mọi lá mặt người\nbị rút úp mặt', min: 2, col: '#6a3847' },
  acorn: { name: 'Quả Sồi Hổ Phách', desc: 'Lật úp và xáo trộn\ntất cả Joker', showdown: true, col: '#fda200' },
  leaf: { name: 'Lá Ngọc Bích', desc: 'Mọi lá bài bị vô hiệu cho\nđến khi bán 1 Joker', showdown: true, col: '#56a786' },
  vessel: { name: 'Bình Tím', desc: 'Mù khổng lồ', showdown: true, col: '#8a71e1', mult: 6 },
  heart: { name: 'Trái Tim Đỏ Thẫm', desc: 'Một Joker ngẫu nhiên bị\nvô hiệu mỗi lượt đánh', showdown: true, col: '#ac3232' },
  bell: { name: 'Chuông Thiên Thanh', desc: 'Luôn bắt buộc chọn\n1 lá bài', showdown: true, col: '#009cfd' },
};

// ---------- Thẻ thưởng (Tag) ----------
const TAGS = {
  uncommon: { name: 'Thẻ Không Phổ Biến', icon: '🟢', when: 'shop', desc: 'Cửa hàng tiếp theo có một\nJoker [g]Không Phổ Biến[/] miễn phí' },
  rare: { name: 'Thẻ Hiếm', icon: '🔴', when: 'shop', desc: 'Cửa hàng tiếp theo có một\nJoker [m]Hiếm[/] miễn phí' },
  negative: { name: 'Thẻ Âm Bản', icon: '⚫', when: 'shop', min: 2, desc: 'Joker phiên bản thường tiếp theo\ntrong cửa hàng miễn phí\nvà trở thành [d]Âm Bản[/]' },
  foil: { name: 'Thẻ Ánh Kim', icon: '🔷', when: 'shop', desc: 'Joker phiên bản thường tiếp theo\ntrong cửa hàng miễn phí\nvà trở thành [c]Ánh Kim[/]' },
  holo: { name: 'Thẻ Ba Chiều', icon: '🔶', when: 'shop', desc: 'Joker phiên bản thường tiếp theo\ntrong cửa hàng miễn phí\nvà trở thành [m]Ba Chiều[/]' },
  poly: { name: 'Thẻ Đa Sắc', icon: '🌈', when: 'shop', desc: 'Joker phiên bản thường tiếp theo\ntrong cửa hàng miễn phí\nvà trở thành [x]Đa Sắc[/]' },
  investment: { name: 'Thẻ Đầu Tư', icon: '💰', when: 'boss', desc: 'Nhận [$]$25[/] sau khi\nđánh bại Mù Trùm' },
  voucher: { name: 'Thẻ Phiếu', icon: '🎟️', when: 'shop', desc: 'Thêm một [a]Phiếu[/]\nvào cửa hàng tiếp theo' },
  boss: { name: 'Thẻ Trùm', icon: '👹', when: 'now', desc: 'Đổi [a]Mù Trùm[/]' },
  standard: { name: 'Thẻ Tiêu Chuẩn', icon: '🂠', when: 'now', min: 2, desc: 'Nhận miễn phí một\n[a]Gói Tiêu Chuẩn Khổng Lồ[/]' },
  charm: { name: 'Thẻ Bùa', icon: '🔮', when: 'now', desc: 'Nhận miễn phí một\n[t]Gói Arcana Khổng Lồ[/]' },
  meteor: { name: 'Thẻ Thiên Thạch', icon: '☄️', when: 'now', min: 2, desc: 'Nhận miễn phí một\n[p]Gói Thiên Thể Khổng Lồ[/]' },
  buffoon: { name: 'Thẻ Hề', icon: '🤡', when: 'now', min: 2, desc: 'Nhận miễn phí một\n[a]Gói Hề Khổng Lồ[/]' },
  handy: { name: 'Thẻ Khéo Tay', icon: '✋', when: 'now', min: 2, desc: () => `Nhận [$]$1[/] cho mỗi [c]lượt đánh[/]\nđã chơi trong ván\n[d](Sẽ nhận $${G.run ? G.run.stats.hands : 0})[/]` },
  garbage: { name: 'Thẻ Rác', icon: '🗑️', when: 'now', min: 2, desc: () => `Nhận [$]$1[/] cho mỗi [m]lượt bỏ[/]\nkhông dùng trong ván\n[d](Sẽ nhận $${G.run ? G.run.stats.unusedDiscards : 0})[/]` },
  ethereal: { name: 'Thẻ Siêu Thực', icon: '👻', when: 'now', min: 2, desc: 'Nhận miễn phí một\n[s]Gói Huyền Bí[/]' },
  coupon: { name: 'Thẻ Giảm Giá', icon: '🏷️', when: 'shop', desc: 'Lá bài và gói bài ban đầu\ntrong cửa hàng tiếp theo\nđều [g]miễn phí[/]' },
  double: { name: 'Thẻ Nhân Đôi', icon: '✌️', when: 'special', desc: 'Nhận một bản sao của\n[a]Thẻ[/] được chọn tiếp theo\n[d](Trừ Thẻ Nhân Đôi)[/]' },
  juggle: { name: 'Thẻ Tung Hứng', icon: '🤹', when: 'round', desc: '[a]+3[/] số lá trên tay\nở vòng tiếp theo' },
  d6: { name: 'Thẻ D6', icon: '🎲', when: 'shop', desc: 'Đổi mới trong cửa hàng\ntiếp theo bắt đầu từ [$]$0[/]' },
  topup: { name: 'Thẻ Bổ Sung', icon: '➕', when: 'now', min: 2, desc: 'Tạo tối đa [a]2[/] Joker\n[c]Phổ Biến[/]\n[d](Cần chỗ trống)[/]' },
  speed: { name: 'Thẻ Tốc Độ', icon: '⏩', when: 'now', desc: () => `Nhận [$]$5[/] cho mỗi Mù\nđã bỏ qua trong ván\n[d](Sẽ nhận $${G.run ? 5 * (G.run.stats.skips + 1) : 5})[/]` },
  orbital: { name: 'Thẻ Quỹ Đạo', icon: '🛸', when: 'now', min: 2, desc: (t) => `Nâng cấp [a]${handVN(t && t.hand ? t.hand : 'Pair')}[/]\nthêm [a]3[/] cấp` },
  economy: { name: 'Thẻ Kinh Tế', icon: '📈', when: 'now', desc: 'Nhân đôi số tiền\n[d](Tối đa +$40)[/]' },
};

// ---------- Phiếu (Voucher) ----------
const VOUCHERS = {
  overstock: { name: 'Hàng Dư', icon: '🏬', desc: '[a]+1[/] ô lá bài\ntrong cửa hàng' },
  overstock_plus: { name: 'Hàng Dư Plus', icon: '🏪', req: 'overstock', desc: '[a]+1[/] ô lá bài\ntrong cửa hàng' },
  clearance: { name: 'Xả Kho', icon: '🏷️', desc: 'Mọi thứ trong cửa hàng\ngiảm [a]25%[/]' },
  liquidation: { name: 'Thanh Lý', icon: '💸', req: 'clearance', desc: 'Mọi thứ trong cửa hàng\ngiảm [a]50%[/]' },
  hone: { name: 'Mài Giũa', icon: '🔪', desc: 'Lá [c]Ánh Kim[/], [m]Ba Chiều[/]\nvà [x]Đa Sắc[/] xuất hiện\n[a]X2[/] thường xuyên hơn' },
  glow_up: { name: 'Lột Xác', icon: '💅', req: 'hone', desc: 'Lá [c]Ánh Kim[/], [m]Ba Chiều[/]\nvà [x]Đa Sắc[/] xuất hiện\n[a]X4[/] thường xuyên hơn' },
  reroll_surplus: { name: 'Đổi Mới Dư Dả', icon: '🔄', desc: 'Đổi mới rẻ hơn [$]$2[/]' },
  reroll_glut: { name: 'Đổi Mới Tràn Lan', icon: '🔁', req: 'reroll_surplus', desc: 'Đổi mới rẻ hơn [$]$2[/]' },
  crystal_ball: { name: 'Quả Cầu Pha Lê', icon: '🔮', desc: '[a]+1[/] ô vật phẩm tiêu hao' },
  omen_globe: { name: 'Quả Cầu Điềm Báo', icon: '🌐', req: 'crystal_ball', desc: 'Lá [s]Huyền Bí[/] có thể xuất hiện\ntrong các [t]Gói Arcana[/]' },
  telescope: { name: 'Kính Viễn Vọng', icon: '🔭', desc: '[p]Gói Thiên Thể[/] luôn chứa\nlá [p]Hành Tinh[/] cho tay bài\nbạn đánh nhiều nhất' },
  observatory: { name: 'Đài Thiên Văn', icon: '🌌', req: 'telescope', desc: 'Lá [p]Hành Tinh[/] trong khu\ntiêu hao cho [x]X1,5[/] Nhân\nvới tay bài tương ứng' },
  grabber: { name: 'Tay Vợt', icon: '🧤', desc: '[c]+1[/] lượt đánh mỗi vòng' },
  nacho_tong: { name: 'Kẹp Nacho', icon: '🌮', req: 'grabber', desc: '[c]+1[/] lượt đánh mỗi vòng' },
  wasteful: { name: 'Hoang Phí', icon: '🗑️', desc: '[m]+1[/] lượt bỏ mỗi vòng' },
  recyclomancy: { name: 'Tái Chế Thuật', icon: '♻️', req: 'wasteful', desc: '[m]+1[/] lượt bỏ mỗi vòng' },
  tarot_merchant: { name: 'Thương Nhân Tarot', icon: '🧳', desc: 'Lá [t]Tarot[/] xuất hiện\n[a]X2[/] thường xuyên hơn\ntrong cửa hàng' },
  tarot_tycoon: { name: 'Trùm Tarot', icon: '🎩', req: 'tarot_merchant', desc: 'Lá [t]Tarot[/] xuất hiện\n[a]X4[/] thường xuyên hơn\ntrong cửa hàng' },
  planet_merchant: { name: 'Thương Nhân Hành Tinh', icon: '🪐', desc: 'Lá [p]Hành Tinh[/] xuất hiện\n[a]X2[/] thường xuyên hơn\ntrong cửa hàng' },
  planet_tycoon: { name: 'Trùm Hành Tinh', icon: '🌠', req: 'planet_merchant', desc: 'Lá [p]Hành Tinh[/] xuất hiện\n[a]X4[/] thường xuyên hơn\ntrong cửa hàng' },
  seed_money: { name: 'Vốn Mồi', icon: '🌱', desc: 'Nâng giới hạn tiền lãi\nmỗi vòng lên [$]$10[/]' },
  money_tree: { name: 'Cây Tiền', icon: '🌳', req: 'seed_money', desc: 'Nâng giới hạn tiền lãi\nmỗi vòng lên [$]$20[/]' },
  blank: { name: 'Phiếu Trắng', icon: '⬜', desc: '[d]Không làm gì cả?[/]' },
  antimatter: { name: 'Phản Vật Chất', icon: '⚛️', req: 'blank', desc: '[d]+1[/] ô Joker' },
  magic_trick: { name: 'Ảo Thuật', icon: '🪄', desc: 'Có thể mua [a]lá bài thường[/]\ntrong cửa hàng' },
  illusion: { name: 'Ảo Ảnh', icon: '🎭', req: 'magic_trick', desc: 'Lá bài thường trong cửa hàng\ncó thể có [a]Cường Hoá[/],\n[a]Phiên Bản[/] và [a]Dấu[/]' },
  hieroglyph: { name: 'Chữ Tượng Hình', icon: '𓂀', desc: '[a]-1[/] Ante,\n[c]-1[/] lượt đánh mỗi vòng' },
  petroglyph: { name: 'Khắc Đá', icon: '🗿', req: 'hieroglyph', desc: '[a]-1[/] Ante,\n[m]-1[/] lượt bỏ mỗi vòng' },
  directors_cut: { name: 'Bản Đạo Diễn', icon: '🎬', desc: 'Đổi Mù Trùm [a]1 lần[/]\nmỗi Ante, [$]$10[/] mỗi lần' },
  retcon: { name: 'Viết Lại Cốt Truyện', icon: '📜', req: 'directors_cut', desc: 'Đổi Mù Trùm\n[a]không giới hạn[/] lần,\n[$]$10[/] mỗi lần' },
  paint_brush: { name: 'Cọ Vẽ', icon: '🖌️', desc: '[a]+1[/] số lá trên tay' },
  palette: { name: 'Bảng Màu', icon: '🎨', req: 'paint_brush', desc: '[a]+1[/] số lá trên tay' },
};

// ---------- Bộ bài ----------
const DECKS = {
  red: { name: 'Bộ Bài Đỏ', col: '#d8423b', desc: '[m]+1[/] lượt bỏ mỗi vòng' },
  blue: { name: 'Bộ Bài Xanh Dương', col: '#3a7bd5', desc: '[c]+1[/] lượt đánh mỗi vòng' },
  yellow: { name: 'Bộ Bài Vàng', col: '#e3b32b', desc: 'Bắt đầu với thêm [$]$10[/]' },
  green: { name: 'Bộ Bài Xanh Lá', col: '#3d9b5a', desc: 'Cuối vòng:\n[$]$2[/] mỗi lượt đánh còn lại\n[$]$1[/] mỗi lượt bỏ còn lại\nKhông được nhận [a]tiền lãi[/]' },
  black: { name: 'Bộ Bài Đen', col: '#2a2a2a', desc: '[d]+1[/] ô Joker\n\n[c]-1[/] lượt đánh mỗi vòng' },
  magic: { name: 'Bộ Bài Phép Thuật', col: '#8a5cc7', desc: 'Bắt đầu với Phiếu\n[t]Quả Cầu Pha Lê[/]\nvà [a]2[/] lá [t]Kẻ Khờ[/]' },
  nebula: { name: 'Bộ Bài Tinh Vân', col: '#5a4aa8', desc: 'Bắt đầu với Phiếu\n[p]Kính Viễn Vọng[/]\n[m]-1[/] ô vật phẩm tiêu hao' },
  ghost: { name: 'Bộ Bài Bóng Ma', col: '#7fa8c9', desc: 'Lá [s]Huyền Bí[/] có thể\nxuất hiện trong cửa hàng\nBắt đầu với lá [s]Bùa Ếm[/]' },
  abandoned: { name: 'Bộ Bài Bỏ Hoang', col: '#6b7d6a', desc: 'Bắt đầu với bộ bài\nkhông có [a]lá mặt người[/]' },
  checkered: { name: 'Bộ Bài Ca Rô', col: '#c43a5e', desc: 'Bắt đầu với 26 lá [S]Bích[/]\nvà 26 lá [H]Cơ[/] trong bộ' },
  zodiac: { name: 'Bộ Bài Hoàng Đạo', col: '#2b4f8a', desc: 'Bắt đầu với\n[t]Thương Nhân Tarot[/],\n[p]Thương Nhân Hành Tinh[/]\nvà [a]Hàng Dư[/]' },
  painted: { name: 'Bộ Bài Sơn Vẽ', col: '#c46a2b', desc: '[a]+2[/] số lá trên tay\n[d]-1[/] ô Joker' },
  anaglyph: { name: 'Bộ Bài Lập Thể', col: '#b84a7a', desc: 'Sau khi đánh bại mỗi\n[a]Mù Trùm[/], nhận một\n[a]Thẻ Nhân Đôi[/]' },
  plasma: { name: 'Bộ Bài Plasma', col: '#6a3bb0', desc: '[a]Cân bằng[/] [c]Chip[/] và [m]Nhân[/]\nkhi tính điểm\n\nMù lớn gấp [a]X2[/]' },
  erratic: { name: 'Bộ Bài Thất Thường', col: '#4a8a8a', desc: 'Mọi hạng và chất\ntrong bộ bài đều\n[a]ngẫu nhiên[/]' },
};
const STAKES = [
  null,
  { name: 'Cược Trắng', col: '#e8e8e8', desc: 'Độ khó cơ bản' },
  { name: 'Cược Đỏ', col: '#e2483d', desc: '[a]Mù Nhỏ[/] không cho tiền thưởng' },
  { name: 'Cược Xanh Lá', col: '#4bc292', desc: 'Điểm yêu cầu tăng [a]nhanh hơn[/]\nmỗi Ante' },
  { name: 'Cược Đen', col: '#3a3a3a', desc: 'Joker trong cửa hàng có thể là\n[a]Vĩnh Cửu[/] (không thể bán)' },
  { name: 'Cược Xanh Dương', col: '#3c85e8', desc: '[m]-1[/] lượt bỏ' },
  { name: 'Cược Tím', col: '#8a5cc7', desc: 'Điểm yêu cầu tăng\n[a]nhanh hơn nữa[/] mỗi Ante' },
  { name: 'Cược Cam', col: '#ff9a00', desc: 'Joker trong cửa hàng có thể là\n[a]Mau Hỏng[/] (vô hiệu sau 5 vòng)' },
  { name: 'Cược Vàng', col: '#f3b958', desc: 'Joker trong cửa hàng có thể là\n[a]Thuê[/] (mất $3 mỗi vòng)' },
];

// ---------- Gói bài ----------
const PACKS = {
  arcana_n: { kind: 'arcana', name: 'Gói Arcana', cost: 4, n: 3, choose: 1, w: 4 },
  arcana_j: { kind: 'arcana', name: 'Gói Arcana Lớn', cost: 6, n: 5, choose: 1, w: 2 },
  arcana_m: { kind: 'arcana', name: 'Gói Arcana Khổng Lồ', cost: 8, n: 5, choose: 2, w: 0.5 },
  celestial_n: { kind: 'celestial', name: 'Gói Thiên Thể', cost: 4, n: 3, choose: 1, w: 4 },
  celestial_j: { kind: 'celestial', name: 'Gói Thiên Thể Lớn', cost: 6, n: 5, choose: 1, w: 2 },
  celestial_m: { kind: 'celestial', name: 'Gói Thiên Thể Khổng Lồ', cost: 8, n: 5, choose: 2, w: 0.5 },
  standard_n: { kind: 'standard', name: 'Gói Tiêu Chuẩn', cost: 4, n: 3, choose: 1, w: 4 },
  standard_j: { kind: 'standard', name: 'Gói Tiêu Chuẩn Lớn', cost: 6, n: 5, choose: 1, w: 2 },
  standard_m: { kind: 'standard', name: 'Gói Tiêu Chuẩn Khổng Lồ', cost: 8, n: 5, choose: 2, w: 0.5 },
  buffoon_n: { kind: 'buffoon', name: 'Gói Hề', cost: 4, n: 2, choose: 1, w: 1.2 },
  buffoon_j: { kind: 'buffoon', name: 'Gói Hề Lớn', cost: 6, n: 4, choose: 1, w: 0.6 },
  buffoon_m: { kind: 'buffoon', name: 'Gói Hề Khổng Lồ', cost: 8, n: 4, choose: 2, w: 0.15 },
  spectral_n: { kind: 'spectral', name: 'Gói Huyền Bí', cost: 4, n: 2, choose: 1, w: 0.6 },
  spectral_j: { kind: 'spectral', name: 'Gói Huyền Bí Lớn', cost: 6, n: 4, choose: 1, w: 0.3 },
  spectral_m: { kind: 'spectral', name: 'Gói Huyền Bí Khổng Lồ', cost: 8, n: 4, choose: 2, w: 0.07 },
};
const PACK_KIND = {
  arcana: { col: '#8a5cc7', col2: '#5b3a91', icon: '🔮', label: 'ARCANA', desc: (p) => `Chọn [a]${p.choose}[/] trong tối đa\n[a]${p.n}[/] lá [t]Tarot[/] để dùng ngay` },
  celestial: { col: '#2a7fc0', col2: '#16416e', icon: '🪐', label: 'THIÊN THỂ', desc: (p) => `Chọn [a]${p.choose}[/] trong tối đa\n[a]${p.n}[/] lá [p]Hành Tinh[/] để dùng ngay` },
  standard: { col: '#c8c8c8', col2: '#7a7a7a', icon: '🂡', label: 'TIÊU CHUẨN', desc: (p) => `Chọn [a]${p.choose}[/] trong tối đa\n[a]${p.n}[/] [a]lá bài thường[/]\nđể thêm vào bộ bài` },
  buffoon: { col: '#e8743b', col2: '#9b3f1a', icon: '🤡', label: 'HỀ', desc: (p) => `Chọn [a]${p.choose}[/] trong tối đa\n[a]${p.n}[/] lá [a]Joker[/]` },
  spectral: { col: '#4584fa', col2: '#1f3f8a', icon: '👻', label: 'HUYỀN BÍ', desc: (p) => `Chọn [a]${p.choose}[/] trong tối đa\n[a]${p.n}[/] lá [s]Huyền Bí[/] để dùng ngay` },
};

const UI_COL = {
  chips: '#009dff', mult: '#fe5f55', money: '#f3b958', green: '#4bc292', tarot: '#a782d1', planet: '#13afce', spectral: '#4584fa', attn: '#ff9a00',
};

/* =========================================================
   온라인 웨딩 홀 · 하객 캐릭터 생성 & 예식장 입장 시뮬레이터
   - 상태 관리(0~8번 입력) / 랜덤 지정석 배정 / 입장 애니메이션
   - 정문 개방 / 말풍선 타이머 / 방명록 팝업
   ========================================================= */
'use strict';

/* ---------------------------------------------------------
   0. 설정 (여기만 바꾸면 됩니다)
   --------------------------------------------------------- */
const CONFIG = {
  // 「← 청첩장으로」 이동 주소. 비워 두면 브라우저 뒤로가기(history.back)를 사용합니다.
  invitationUrl: '',

  // 하객 데이터 저장 키 (지금은 localStorage, 추후 Firebase로 교체 — GuestStore 참고)
  storageKey: 'wedding-hall-guests-v1',

  // 처음 열었을 때 홀이 비어 보이지 않도록 샘플 하객을 넣습니다. 실제 배포 시 false 로 바꾸세요.
  seedDemoGuests: true,

  // 하객 구분별 좌석 방향  (참고 화면대로: 신부측 = 왼쪽 의자, 신랑측 = 오른쪽 의자)
  // 반대로 하고 싶다면 { bride: 'right', groom: 'left' } 로 바꾸면 버튼 문구도 함께 바뀝니다.
  sideLayout: { bride: 'left', groom: 'right' },

  // true = 2.5D(Three.js) 홀 사용. Three.js 를 불러오지 못하면 자동으로 2D 홀로 전환됩니다.
  use3D: true,

  maxNickname: 8,
  maxMessage: 60,
  defaultMessage: '결혼 진심으로 축하드려요!',

  walkSpeed: 190,         // 입장 걷기 속도 (월드 px / 초)
  doorOpenMs: 1250,       // 정문이 열리는 시간
};

/* ---------------------------------------------------------
   1. 마스터 프레임(Master Frame) & 레이어 메타
   - assets/layers/*.png 는 전부 "같은 크기(252×498)의 투명 PNG" 입니다.
     머리·상의·하의·소품이 이미 프레임 안의 제 위치에 그려져 있어서
     position:absolute; inset:0 으로 겹치기만 하면 오차 없이 맞습니다.
   - 하의 허리선은 성별·방향별로 하나의 고정선에 박혀 있고, 상의가 그 위를 덮습니다.
     (베이지 트렌치처럼 기장이 긴 상의도 하의 허리선이 코트 안쪽으로 들어갑니다)
   - META 는 썸네일 크롭 / 발 위치(feet) / 머리 윗선(top) 계산용 bbox 입니다.
   --------------------------------------------------------- */
const FRAME = { W: 252, H: 498, CX: 120, SHOULDER: 162 };   // 어깨(상의 시작) 기준선 y = 162
const META = {"m_front_top0":{"x":28,"y":162,"w":165,"h":145},"m_front_top1":{"x":26,"y":162,"w":165,"h":145},"m_front_top2":{"x":26,"y":162,"w":165,"h":177},"m_front_bottom0":{"x":65,"y":279,"w":101,"h":165,"feet":444,"split":436},"m_front_bottom1":{"x":66,"y":279,"w":101,"h":165,"feet":444,"split":436},"m_front_head0":{"x":64,"y":54,"w":120,"h":120,"top":54},"m_front_head1":{"x":66,"y":54,"w":117,"h":120,"top":54},"m_front_head2":{"x":64,"y":51,"w":120,"h":124,"top":51},"m_front_prop0":{"x":138,"y":281,"w":77,"h":73},"m_back_top0":{"x":53,"y":162,"w":133,"h":151},"m_back_top1":{"x":54,"y":162,"w":133,"h":151},"m_back_top2":{"x":53,"y":162,"w":134,"h":181},"m_back_bottom0":{"x":63,"y":282,"w":116,"h":162,"feet":444,"split":370},"m_back_bottom1":{"x":63,"y":282,"w":111,"h":162,"feet":444,"split":371},"m_back_head0":{"x":60,"y":41,"w":121,"h":130,"top":41},"m_back_head1":{"x":61,"y":43,"w":118,"h":128,"top":43},"m_back_head2":{"x":60,"y":43,"w":120,"h":128,"top":43},"m_back_prop0":{"x":142,"y":286,"w":72,"h":78},"f_front_top0":{"x":23,"y":162,"w":168,"h":152},"f_front_top1":{"x":25,"y":162,"w":170,"h":149},"f_front_top2":{"x":25,"y":162,"w":168,"h":149},"f_front_bottom0":{"x":75,"y":237,"w":96,"h":207,"feet":444,"split":421},"f_front_bottom1":{"x":68,"y":237,"w":96,"h":206,"feet":443,"split":435},"f_front_bottom2":{"x":54,"y":237,"w":137,"h":209,"feet":446,"split":438},"f_front_head0":{"x":60,"y":57,"w":123,"h":114,"top":57},"f_front_head1":{"x":47,"y":63,"w":145,"h":180,"top":63},"f_front_head2":{"x":47,"y":63,"w":145,"h":180,"top":63},"f_front_head3":{"x":63,"y":57,"w":108,"h":114,"top":57},"f_front_head4":{"x":64,"y":55,"w":115,"h":148,"top":55},"f_front_prop0":{"x":134,"y":282,"w":88,"h":109},"f_front_prop1":{"x":132,"y":283,"w":90,"h":112},"f_back_top0":{"x":51,"y":162,"w":138,"h":145},"f_back_top1":{"x":51,"y":162,"w":138,"h":145},"f_back_top2":{"x":51,"y":162,"w":138,"h":145},"f_back_bottom0":{"x":73,"y":255,"w":94,"h":189,"feet":444,"split":416},"f_back_bottom1":{"x":70,"y":255,"w":100,"h":189,"feet":444,"split":347},"f_back_bottom2":{"x":62,"y":255,"w":116,"h":190,"feet":445,"split":401},"f_back_head0":{"x":56,"y":36,"w":129,"h":136,"top":36},"f_back_head1":{"x":41,"y":52,"w":147,"h":192,"top":52},"f_back_head2":{"x":41,"y":52,"w":147,"h":192,"top":52},"f_back_head3":{"x":66,"y":47,"w":108,"h":124,"top":47},"f_back_head4":{"x":63,"y":55,"w":114,"h":147,"top":55},"f_back_prop0":{"x":140,"y":282,"w":76,"h":88},"f_back_prop1":{"x":139,"y":282,"w":79,"h":98},"m_front_head0_glasses":{"x":76,"y":120,"w":86,"h":28},"m_front_head1_glasses":{"x":75,"y":120,"w":86,"h":27},"m_front_head2_glasses":{"x":75,"y":121,"w":85,"h":28},"m_front_watch":{"x":163,"y":269,"w":27,"h":18},"m_back_watch":{"x":163,"y":272,"w":30,"h":20}};
const metaOf = (name) => META[name.replace(/_(light|medium|dark)$/, '')];

/* ---------------------------------------------------------
   2. 커스텀 옵션 정의
   --------------------------------------------------------- */
const SKINS = [
  { id: 'light',  label: '밝은톤',   no: '17호', color: '#f8d8c4' },
  { id: 'medium', label: '중간톤',   no: '21호', color: '#e3af8b' },
  { id: 'dark',   label: '어두운톤', no: '25호', color: '#bf8865' },
];

const OPTIONS = {
  male: {
    hair:   [{ label: '브라운 숏 헤어' }, { label: '블랙 가르마' }, { label: '블랙 숏 헤어' }],
    top:    [{ label: '네이비 수트' }, { label: '차콜 블레이저' }, { label: '베이지 트렌치' }],
    bottom: [{ label: '네이비 수트 + 구두' }, { label: '베이지 치노 + 로퍼' }],
    prop:   [
      { label: '없음', kind: null },
      { label: '가죽 브리프케이스', kind: 'bag', sprite: 0 },
      { label: '손목시계', kind: 'watch' },
      { label: '뿔테안경', kind: 'glasses' },
    ],
  },
  female: {
    hair:   [{ label: '블랙 단발' }, { label: '브라운 웨이브' }, { label: '검정 웨이브' }, { label: '픽시 컷' }, { label: '로우 포니테일' }],
    top:    [{ label: '블랙 트위드' }, { label: '피치 타이 블라우스' }, { label: '베이지 가디건' }],
    bottom: [{ label: '네이비 슬랙스 + 플랫' }, { label: '데님 + 로퍼' }, { label: '플리츠 스커트 + 펌프스' }],
    prop:   [
      { label: '없음', kind: null },
      { label: '블랙 미니백', kind: 'bag', sprite: 0 },
      { label: '브라운 토트백', kind: 'bag', sprite: 1 },
    ],
  },
};

const SIDES = [
  { id: 'bride', label: '신부측 하객' },
  { id: 'groom', label: '신랑측 하객' },
];
const SIDE_NAME = { bride: '신부측', groom: '신랑측' };
const sideDirLabel = (id) => (CONFIG.sideLayout[id] === 'left' ? '왼쪽' : '오른쪽');

/* ---------------------------------------------------------
   3. 예식장 홀 좌표 (chapel-hall.jpg 768×1344 기준 + 하단 광장)
   --------------------------------------------------------- */
const K = 0.24;                                    // 홀 안 캐릭터 배율 (프레임 px → 월드 px)
const WORLD = { W: 768, H: 1500 };
const DOOR = { x0: 304, x1: 465, mid: 385, y0: 1131, y1: 1274, wallTop: 1100 };   // wallTop: 벽 윗면(상인방) 위쪽 경계
const WALK_START = { x: 54, y: 1452 };             // 화면 왼쪽 하단(광장)
const DOOR_FRONT = { x: 385, y: 1306 };            // 정문 바로 앞

/* 의자(가로 4석 × 5열). y0 = 의자 등받이 윗면, y1 = 아랫면 */
const PEWS = {
  left: [
    { x0: 62, x1: 270, y0: 452, y1: 538 },
    { x0: 48, x1: 258, y0: 540, y1: 627 },
    { x0: 36, x1: 258, y0: 632, y1: 724 },
    { x0: 22, x1: 255, y0: 730, y1: 828 },
    { x0: 10, x1: 250, y0: 838, y1: 942 },
  ],
  right: [
    { x0: 497, x1: 707, y0: 452, y1: 538 },
    { x0: 503, x1: 720, y0: 540, y1: 627 },
    { x0: 510, x1: 733, y0: 632, y1: 724 },
    { x0: 515, x1: 746, y0: 730, y1: 828 },
    { x0: 520, x1: 757, y0: 838, y1: 942 },
  ],
};
const SEATS_PER_PEW = 4;
const COVER_TOP = 14;                              // 의자 앞판이 시작되는 높이(등받이 윗모서리). 이 위쪽은 하객이 보임
const SHOULDER_DROP = 4;                            // 어깨선이 의자 등받이 윗면보다 위로 올라오는 정도 (등을 등받이에 밀착)

/* 만석 시 스탠딩석: 홀 뒤쪽 빈 공간 (좌/우 각 6명 × 3줄) */
const STAND = {
  rows: [1060, 1034, 1008],                        // 발 위치 y
  xs: { left: [46, 90, 134, 178, 222, 266], right: [502, 546, 590, 634, 678, 722] },
};

/* z-index: 열이 아래일수록 앞쪽. 하객(짝수) < 의자 앞판(홀수) */
const zGuest = (row) => 20 + row * 2;
const zPew = (row) => 21 + row * 2;

/* ---------------------------------------------------------
   4. 하객 저장소 (localStorage) — Firebase 연동 시 이 객체만 교체하세요
   --------------------------------------------------------- */
const GuestStore = {
  async list() {
    try { return JSON.parse(localStorage.getItem(CONFIG.storageKey) || '[]'); }
    catch (e) { return []; }
  },
  async add(guest) {
    const all = await this.list();
    all.push(guest);
    try { localStorage.setItem(CONFIG.storageKey, JSON.stringify(all)); } catch (e) { /* 용량/사생활 보호 모드 */ }
    return all;
  },
  async replaceAll(list) {
    try { localStorage.setItem(CONFIG.storageKey, JSON.stringify(list)); } catch (e) {}
  },
};

/* ---------------------------------------------------------
   5. 공용 유틸
   --------------------------------------------------------- */
const $ = (sel, root = document) => root.querySelector(sel);
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const gKey = (gender) => (gender === 'male' ? 'm' : 'f');
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/* ---------------------------------------------------------
   6. 캐릭터 조립 — 옷입히기 방식
      같은 크기의 투명 레이어를 아래에서 위로 쌓기만 합니다 (좌표 계산 없음).
      하의 → (뒤쪽 소품) → 상의 → 머리 → 안경 → 손목시계
   --------------------------------------------------------- */
function dollSpec(look, view) {
  const pre = `${gKey(look.gender)}_${view}_`;
  const prop = OPTIONS[look.gender].prop[look.propIdx] || {};
  const names = [`${pre}bottom${look.bottom}`];
  if (prop.kind === 'bag') names.push(`${pre}prop${prop.sprite}`);
  names.push(`${pre}top${look.top}_${look.skin}`);
  names.push(`${pre}head${look.hair}_${look.skin}`);
  if (prop.kind === 'glasses' && view === 'front') names.push(`${pre}head${look.hair}_glasses`);
  if (prop.kind === 'watch') names.push(`${pre}watch`);
  return {
    layers: names.map((n) => `assets/layers/${n}.png`),
    feet: metaOf(`${pre}bottom${look.bottom}`).feet,          // 발바닥 y (프레임 px)
    headTop: metaOf(`${pre}head${look.hair}`).top,            // 머리 윗선 y (프레임 px)
  };
}

function dollHTML(look, view, k, cls = '') {
  const spec = dollSpec(look, view);
  const imgs = spec.layers.map((src, i) => `<img src="${src}" alt="" draggable="false" style="z-index:${i + 1}">`).join('');
  return { html: `<div class="doll ${cls}" style="--k:${k}">${imgs}</div>`, spec };
}

/* ---------------------------------------------------------
   7. 상태 관리 : 0~8번 입력값
   --------------------------------------------------------- */
const state = {
  side: null,          // 0. 구분
  gender: null,        // 1. 성별
  skin: 'light',       // 2. 피부톤
  hair: 0,             // 3. 헤어
  top: 0,              // 4. 상의
  bottom: 0,           // 5. 하의
  propIdx: 0,          // 6. 소품 (0 = 없음)
  nickname: '',        // 7. 닉네임
  message: '',         // 8. 축하 메시지
};
const PREVIEW_K = 0.55;     // 미리보기 박스 = 252×498 마스터 프레임 × 0.55 (고정 크기)
const lookOf = (s) => ({ gender: s.gender, skin: s.skin, hair: s.hair, top: s.top, bottom: s.bottom, propIdx: s.propIdx });

/* ---------------------------------------------------------
   8. 만들기 화면 렌더링
   --------------------------------------------------------- */
const el = {
  app: $('#app'), screenCreate: $('#screenCreate'), screenHall: $('#screenHall'),
  previewDoll: $('#previewDoll'), previewEmpty: $('#previewEmpty'), previewName: $('#previewName'),
  sideChips: $('#sideChips'), genderChips: $('#genderChips'), skinChips: $('#skinChips'),
  hairChips: $('#hairChips'), topChips: $('#topChips'), bottomChips: $('#bottomChips'), propChips: $('#propChips'),
  genderDependent: $('#genderDependent'),
  nick: $('#nickInput'), msg: $('#msgInput'), msgCount: $('#msgCount'),
  form: $('#createForm'), hint: $('#formHint'), enterBtn: $('#enterBtn'),
  hallScroll: $('#hallScroll'), world: $('#world'), door: $('#door'), route: $('#route'),
  pewLayer: $('#pewLayer'), guestLayer: $('#guestLayer'), bubbleLayer: $('#bubbleLayer'),
  btnBack: $('#btnBack'), btnBook: $('#btnBook'), guestCount: $('#guestCount'), toast: $('#toast'),
  modal: $('#bookModal'), bookList: $('#bookList'), bookEmpty: $('#bookEmpty'), bookClose: $('#bookClose'),
};

function pillHTML({ text, pressed, data, inner = '', cls = '' }) {
  return `<button type="button" class="pill ${cls}" aria-pressed="${pressed}" ${data}>${inner || esc(text)}</button>`;
}

function renderSimpleChips() {
  el.sideChips.innerHTML = SIDES.map((s) =>
    `<button type="button" class="side-card" aria-pressed="${state.side === s.id}" data-side="${s.id}">` +
    `<span class="ico">${s.id === 'bride' ? '👰' : '🤵'}</span>${s.label} (${sideDirLabel(s.id)})</button>`
  ).join('');
  el.genderChips.innerHTML = [['female', '여성'], ['male', '남성']].map(([id, t]) => pillHTML({
    text: t, pressed: state.gender === id, data: `data-gender="${id}"`,
  })).join('');
  el.skinChips.innerHTML = SKINS.map((s) => pillHTML({
    pressed: state.skin === s.id, data: `data-skin="${s.id}"`,
    inner: `<span class="dot" style="--sw:${s.color}"></span>${s.label} ${s.no}`,
  })).join('');
}

function renderOptionChips() {
  if (!state.gender) { el.genderDependent.hidden = true; return; }
  el.genderDependent.hidden = false;
  const opts = OPTIONS[state.gender];
  const build = (group, container, selected) => {
    container.innerHTML = opts[group].map((o, i) => pillHTML({
      text: o.label, pressed: selected === i, data: `data-group="${group}" data-idx="${i}"`,
    })).join('');
  };
  build('hair', el.hairChips, state.hair);
  build('top', el.topChips, state.top);
  build('bottom', el.bottomChips, state.bottom);
  build('prop', el.propChips, state.propIdx);
}

function refreshCTA() {
  const ready = !!(state.side && state.gender && state.nickname.trim());
  el.enterBtn.classList.toggle('disabled', !ready);
}

function renderPreview() {
  if (!state.gender) {
    el.previewDoll.innerHTML = '';
    el.previewEmpty.hidden = false;
    el.previewName.hidden = true;
    return;
  }
  el.previewEmpty.hidden = true;
  const pv = dollHTML(lookOf(state), 'front', PREVIEW_K);
  el.previewDoll.innerHTML = pv.html;
  el.previewDoll.parentElement.style.setProperty('--feet-y', `${12 + pv.spec.feet * PREVIEW_K}px`);   // 그림자를 발바닥에 맞춤
  el.previewName.hidden = !state.nickname.trim();
  el.previewName.textContent = state.nickname.trim();
}

function renderAll() { renderSimpleChips(); renderOptionChips(); renderPreview(); refreshCTA(); }

/* 클릭 처리 (이벤트 위임) */
el.screenCreate.addEventListener('click', (e) => {
  const chip = e.target.closest('.pill, .side-card');
  if (!chip) return;
  const d = chip.dataset;
  if (d.side) state.side = d.side;
  else if (d.gender) {
    if (state.gender !== d.gender) { state.gender = d.gender; state.hair = state.top = state.bottom = state.propIdx = 0; }
  }
  else if (d.skin) state.skin = d.skin;
  else if (d.group) state[d.group === 'prop' ? 'propIdx' : d.group] = Number(d.idx);
  el.hint.textContent = '';
  renderAll();
});

el.nick.addEventListener('input', () => {
  state.nickname = el.nick.value.slice(0, CONFIG.maxNickname);
  renderPreview(); refreshCTA();
});
el.msg.addEventListener('input', () => {
  state.message = el.msg.value.slice(0, CONFIG.maxMessage);
  el.msgCount.textContent = state.message.length;
});
el.nick.maxLength = CONFIG.maxNickname;
el.msg.maxLength = CONFIG.maxMessage;

/* 입장 버튼(폼 제출) */
el.form.addEventListener('submit', (e) => {
  e.preventDefault();
  const problems = [];
  if (!state.side) problems.push('0번 구분을 선택해 주세요');
  else if (!state.gender) problems.push('1번 성별을 선택해 주세요');
  else if (!state.nickname.trim()) problems.push('7번 닉네임을 입력해 주세요');
  if (problems.length) {
    el.hint.textContent = problems[0];
    el.enterBtn.classList.remove('shake'); void el.enterBtn.offsetWidth; el.enterBtn.classList.add('shake');
    const target = !state.side ? el.sideChips : !state.gender ? el.genderChips : el.nick;
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  startEntrance();
});
el.form.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') e.preventDefault(); });

/* ---------------------------------------------------------
   9. 좌석 배정 (신랑/신부측 의자 중 비어 있는 랜덤 한 자리, 만석이면 스탠딩)
   --------------------------------------------------------- */
const pewsOf = (side) => (CONFIG.sideLayout[side] === 'left' ? PEWS.left : PEWS.right);
const dirOf = (side) => CONFIG.sideLayout[side];

function assignSeat(side, guests) {
  const mine = guests.filter((g) => g.side === side);
  const taken = new Set(mine.filter((g) => g.seat.type === 'seat').map((g) => `${g.seat.row}-${g.seat.col}`));
  const free = [];
  for (let r = 0; r < 5; r++) for (let c = 0; c < SEATS_PER_PEW; c++) if (!taken.has(`${r}-${c}`)) free.push({ row: r, col: c });
  if (free.length) return { type: 'seat', ...pick(free) };
  return { type: 'stand', idx: mine.filter((g) => g.seat.type === 'stand').length };
}

function seatPoint(side, row, col) {
  const pew = pewsOf(side)[row];
  const inner = pew.x1 - pew.x0 - 40;
  const x = pew.x0 + 20 + (col + 0.5) * (inner / SEATS_PER_PEW);
  return { x, shoulderY: pew.y0 + SHOULDER_DROP, pewTop: pew.y0, z: zGuest(row) };
}

function standPoint(side, idx) {
  const xs = STAND.xs[dirOf(side)];
  const slot = idx % (xs.length * STAND.rows.length);
  const row = Math.floor(slot / xs.length), col = slot % xs.length;
  const lap = Math.floor(idx / (xs.length * STAND.rows.length));          // 자리가 더 모자라면 살짝 어긋나게 겹쳐 서기
  return { x: xs[col] + (row % 2) * 16 + lap * 9, feetY: STAND.rows[row] + lap * 4, z: 40 + Math.round(STAND.rows[row] / 10) };
}

/* ---------------------------------------------------------
   10. 홀 구성 · 하객 배치
   --------------------------------------------------------- */
let hallBuilt = false;
const bubbleByGuest = new Map();

function buildHall() {
  if (hallBuilt) return;
  hallBuilt = true;
  // 의자 앞판 (배경 이미지를 잘라 올려 하객의 하체를 가림)
  const html = [];
  ['left', 'right'].forEach((dir) => PEWS[dir].forEach((p, row) => {
    const cy = p.y0 + COVER_TOP;
    html.push(`<div class="pew-cover" style="left:${p.x0}px;top:${cy}px;width:${p.x1 - p.x0}px;height:${p.y1 - cy}px;background-position:-${p.x0}px -${cy}px;z-index:${zPew(row)}"></div>`);
  }));
  el.pewLayer.innerHTML = html.join('');
}

function fitHall() {
  const w = Math.min(window.innerWidth, 412);
  el.hallScroll.style.setProperty('--s', (w / WORLD.W).toFixed(4));
}
window.addEventListener('resize', fitHall);

/* 말풍선 (닉네임 + 축하 메시지, 10초 노출 → 20초 휴식 무한 반복) */
function addBubble(guest, x, headTopY, { pending = false } = {}) {
  const b = document.createElement('div');
  b.className = 'bubble' + (pending ? ' pending' : '');
  b.style.left = `${clamp(x, 100, WORLD.W - 100)}px`;
  b.style.top = `${headTopY - 8}px`;
  b.innerHTML = `<div class="bubble-box" style="--phase:${guest.phase ?? 0}"><b>${esc(guest.name)}</b><span>${esc(guest.msg)}</span></div>`;
  el.bubbleLayer.appendChild(b);
  bubbleByGuest.set(guest.id, b);
  return b;
}

function placeGuest(guest, { pop = false, pendingBubble = false } = {}) {
  const look = { ...guest.look, gender: guest.gender };
  const { html, spec } = dollHTML(look, 'back', K);
  const wrap = document.createElement('div');
  let left, top, z, headTop;

  if (guest.seat.type === 'seat') {
    const p = seatPoint(guest.side, guest.seat.row, guest.seat.col);
    wrap.className = 'guest seated' + (pop ? ' pop' : '');
    wrap.style.height = `${(FRAME.SHOULDER + 130) * K}px`;                      // 의자 아래로 삐져나오지 않게 상체만
    left = p.x - FRAME.CX * K; top = p.shoulderY - FRAME.SHOULDER * K; z = p.z;
  } else {
    const p = standPoint(guest.side, guest.seat.idx);
    wrap.className = 'guest standing' + (pop ? ' pop' : '');
    left = p.x - FRAME.CX * K; top = p.feetY - spec.feet * K; z = p.z;
  }
  headTop = top + spec.headTop * K;
  wrap.style.cssText += `;left:${left}px;top:${top}px;z-index:${z};width:${FRAME.W * K}px`;
  wrap.dataset.id = guest.id;
  wrap.innerHTML = html;
  el.guestLayer.appendChild(wrap);
  addBubble(guest, left + FRAME.CX * K, headTop, { pending: pendingBubble });
  return wrap;
}

/* ---------------------------------------------------------
   11. 걷기 · 문 열림 · 착석 연출
   --------------------------------------------------------- */
let cameraTarget = null;
function followCamera(feetY) {
  const s = parseFloat(el.hallScroll.style.getPropertyValue('--s')) || 0.536;
  cameraTarget = clamp(feetY * s - el.hallScroll.clientHeight * 0.62, 0, el.hallScroll.scrollHeight);
}
(function cameraLoop() {
  if (cameraTarget !== null) {
    const cur = el.hallScroll.scrollTop;
    const next = cur + (cameraTarget - cur) * 0.12;
    el.hallScroll.scrollTop = Math.abs(cameraTarget - cur) < 1 ? cameraTarget : next;
  }
  requestAnimationFrame(cameraLoop);
})();

/* ---------------------------------------------------------
   걷기 리그(Walk rig)
   - 뒷모습(back): 뒷모습 레이어를 그대로 사용, 두 다리를 번갈아 들어 올리고 몸통이 좌우로 흔들림
   - 옆모습(side): 옆모습 스프라이트가 없어서, 얼굴은 앞모습 + 몸은 뒷모습(팔을 내린 자세)을
     가로로 좁혀(scaleX) 옆을 보는 것처럼 만들고, 두 다리를 앞뒤로 교차(stride)시킵니다.
     진행 방향이 왼쪽이면 좌우 반전합니다.
   - 하의 레이어를 '다리 분리선(split)' 기준으로 엉덩이 / 왼다리 / 오른다리 3조각으로 잘라 움직입니다.
   --------------------------------------------------------- */
const SPLIT_L = (FRAME.CX / FRAME.W * 100).toFixed(2);          // 다리를 가르는 세로 중심선 (%)
function rigHTML(look, mode) {
  const g = gKey(look.gender);
  const pre = `${g}_back_`;
  const prop = OPTIONS[look.gender].prop[look.propIdx] || {};
  const bottom = `${pre}bottom${look.bottom}`;
  const bm = metaOf(bottom);
  const pct = (Math.min(bm.split, bm.feet - 46) / FRAME.H * 100).toFixed(2);   // 다리가 너무 짧으면 조금 더 위에서 분리
  const L = (name, cls, style = '') => `<img class="p ${cls}" src="assets/layers/${name}.png" alt="" draggable="false" style="${style}">`;
  let html = '';
  html += L(bottom, 'hip', `z-index:1;clip-path:inset(0 0 ${(100 - pct).toFixed(2)}% 0)`);
  html += L(bottom, 'legL', `z-index:1;clip-path:inset(${pct}% ${(100 - SPLIT_L).toFixed(2)}% 0 0)`);
  html += L(bottom, 'legR', `z-index:1;clip-path:inset(${pct}% 0 0 ${SPLIT_L}%)`);
  if (prop.kind === 'bag') html += L(`${pre}prop${prop.sprite}`, 'bag', 'z-index:2');
  html += L(`${pre}top${look.top}_${look.skin}`, 'torso', 'z-index:3');
  if (prop.kind === 'watch') html += L(`${pre}watch`, 'torso', 'z-index:4');
  const headView = mode === 'side' ? 'front' : 'back';
  html += L(`${g}_${headView}_head${look.hair}_${look.skin}`, 'head', 'z-index:5');
  if (mode === 'side' && prop.kind === 'glasses') html += L(`${g}_front_head${look.hair}_glasses`, 'head', 'z-index:6');
  return { html: `<div class="rig ${mode}" style="--k:${K}">${html}</div>`, feet: bm.feet };
}

function makeWalker(look) {
  const back = rigHTML(look, 'back'), side = rigHTML(look, 'side');
  const w = document.createElement('div');
  w.className = 'walker';
  w.innerHTML = `<div class="bob">${back.html}${side.html}</div>`;
  w.style.width = `${FRAME.W * K}px`;
  w.style.height = `${FRAME.H * K}px`;
  const rigs = w.querySelectorAll('.rig');
  const feet = back.feet;
  el.guestLayer.appendChild(w);
  const setMode = (mode, dir = 1) => {
    rigs[0].classList.toggle('show', mode === 'back');
    rigs[1].classList.toggle('show', mode === 'side');
    rigs[1].style.setProperty('--dir', dir < 0 ? -1 : 1);
  };
  const place = (x, y) => {                                      // (x, y) = 발 위치
    const top = y - feet * K;
    w.style.left = `${x - FRAME.CX * K}px`;
    w.style.top = `${top}px`;
    // 정문을 "통과": 문틀(상인방) 아래로 들어가며 머리가 가려지고, 벽 두께 구간에서는 잠시 보이지 않다가 홀 쪽에서 나타남
    if (Math.abs(x - DOOR.mid) < 70 && y <= DOOR.y1 && y > DOOR.wallTop) {
      if (y > DOOR.y0) { w.style.clipPath = `inset(${Math.max(0, DOOR.y0 - top)}px 0 0 0)`; w.style.opacity = 1; }
      else { w.style.clipPath = 'inset(0 0 0 0)'; w.style.opacity = 0; }
    } else { w.style.clipPath = ''; w.style.opacity = 1; }
  };
  setMode('side', 1);
  return { w, setMode, place };
}

function walkPath(walker, points, speed) {
  // 가로 이동 = 옆모습(진행 방향으로 좌우 반전), 위로 이동 = 뒷모습
  return new Promise((resolve) => {
    let i = 0, pos = { ...points[0] };
    let last = performance.now();
    walker.w.classList.add('moving');
    const step = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      let dist = speed * dt;
      while (dist > 0 && i < points.length - 1) {
        const to = points[i + 1];
        const dx = to.x - pos.x, dy = to.y - pos.y, len = Math.hypot(dx, dy);
        if (Math.abs(dy) > Math.abs(dx)) walker.setMode('back');
        else walker.setMode('side', Math.sign(dx) || 1);
        if (len <= dist) { pos = { ...to }; dist -= len; i++; }
        else { pos.x += (dx / len) * dist; pos.y += (dy / len) * dist; dist = 0; }
      }
      walker.place(pos.x, pos.y);
      followCamera(pos.y);
      if (i >= points.length - 1) { walker.w.classList.remove('moving'); resolve(); return; }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

async function openDoor() { el.door.classList.add('open'); await sleep(CONFIG.doorOpenMs); }
async function closeDoor() { el.door.classList.remove('open'); }

function showToast(text, ms = 2600) {
  el.toast.textContent = text; el.toast.hidden = false;
  clearTimeout(showToast.t); showToast.t = setTimeout(() => { el.toast.hidden = true; }, ms);
}

let entering = false;
async function startEntrance() {
  if (entering) return;
  entering = true;
  el.enterBtn.disabled = true;

  const existing = await GuestStore.list();
  const guest = {
    id: uid(),
    name: state.nickname.trim().slice(0, CONFIG.maxNickname),
    msg: (state.message.trim() || CONFIG.defaultMessage).slice(0, CONFIG.maxMessage),
    side: state.side,
    gender: state.gender,
    look: { skin: state.skin, hair: state.hair, top: state.top, bottom: state.bottom, propIdx: state.propIdx },
    seat: assignSeat(state.side, existing),                       // 랜덤 지정석 (만석이면 스탠딩)
    phase: 0,
    ts: Date.now(),
  };

  // 화면 전환
  el.screenCreate.classList.remove('active');
  el.screenHall.classList.add('active');
  document.body.classList.add('in-hall');

  // 2.5D 홀 (Three.js) 이 가능하면 그쪽으로, 아니면 아래 2D 홀로 진행
  const use3D = CONFIG.use3D && Hall3D.available();
  el.screenHall.classList.toggle('mode-3d', use3D);
  if (use3D) {
    updateCount(existing.length);
    showToast(`${SIDE_NAME[guest.side]} ${guest.seat.type === 'seat' ? '지정석을 배정받았어요!' : '좌석이 가득 차 스탠딩석으로 안내해 드려요'}`);
    let ok = false;
    try { ok = await Hall3D.run(guest, existing); } catch (e) { console.warn('2.5D 홀 오류 → 2D 홀로 전환', e); }
    if (ok) {
      const all = await GuestStore.add(guest);
      updateCount(all.length);
      showToast(guest.seat.type === 'seat' ? '착석 완료! 두 분의 결혼을 함께 축하해 주세요 💕' : '스탠딩석에 입장했어요. 함께 축하해 주세요 💕', 3200);
      entering = false; el.enterBtn.disabled = false;
      return;
    }
    el.screenHall.classList.remove('mode-3d');
  }

  buildHall(); fitHall();
  el.guestLayer.innerHTML = ''; el.bubbleLayer.innerHTML = ''; bubbleByGuest.clear();
  el.route.classList.remove('hide'); el.door.classList.remove('open');
  updateCount(existing.length);

  // 이미 입장한 하객들
  existing.forEach((g) => placeGuest(g));

  // 카메라를 광장(맨 아래)으로
  el.hallScroll.scrollTop = el.hallScroll.scrollHeight;
  await sleep(450);

  const look = { ...guest.look, gender: guest.gender };
  const walker = makeWalker(look);
  walker.setMode('side', 1); walker.place(WALK_START.x, WALK_START.y);
  showToast(`${SIDE_NAME[guest.side]} ${guest.seat.type === 'seat' ? '지정석을 배정받았어요!' : '좌석이 가득 차 스탠딩석으로 안내해 드려요'}`);
  await sleep(500);

  // ① 화면 왼쪽 하단 → (빨간 화살표) → 정문 앞
  await walkPath(walker, [WALK_START, { x: DOOR.mid, y: WALK_START.y }, DOOR_FRONT], CONFIG.walkSpeed);
  walker.setMode('back'); walker.place(DOOR_FRONT.x, DOOR_FRONT.y);
  await sleep(250);

  // ② 정문이 양옆으로 열림
  el.route.classList.add('hide');
  await openDoor();

  // ③ 문 통과 → 버진로드 → 자리(또는 스탠딩 위치)
  const pts = [DOOR_FRONT, { x: DOOR.mid, y: 1080 }];
  let finalSpot;
  if (guest.seat.type === 'seat') {
    const p = seatPoint(guest.side, guest.seat.row, guest.seat.col);
    const spec = dollSpec(look, 'back');
    const feetY = p.shoulderY + (spec.feet - FRAME.SHOULDER) * K;     // 앉는 순간 어깨선이 그대로 이어지도록
    pts.push({ x: DOOR.mid, y: feetY }, { x: p.x, y: feetY });
    finalSpot = p;
  } else {
    const p = standPoint(guest.side, guest.seat.idx);
    pts.push({ x: DOOR.mid, y: p.feetY }, { x: p.x, y: p.feetY });
    finalSpot = p;
  }
  const passed = walkPath(walker, pts, CONFIG.walkSpeed);
  setTimeout(closeDoor, 2400);                                         // 통과 후 문이 다시 닫힘
  await passed;
  walker.w.classList.remove('moving');
  await sleep(150);

  // ④ 착석(뒷모습) / 스탠딩(뒷모습) + 말풍선 시작
  walker.w.remove();
  placeGuest(guest, { pop: true, pendingBubble: true });
  const b = bubbleByGuest.get(guest.id);
  b.classList.remove('pending');                                       // 도착 직후 10초 노출 → 20초 휴식 반복
  guest.phase = 0;

  const all = await GuestStore.add(guest);
  updateCount(all.length);
  followCamera(guest.seat.type === 'seat' ? finalSpot.shoulderY + 160 : finalSpot.feetY);
  showToast(guest.seat.type === 'seat' ? '착석 완료! 두 분의 결혼을 함께 축하해 주세요 💕' : '스탠딩석에 입장했어요. 함께 축하해 주세요 💕', 3200);
  entering = false;
  el.enterBtn.disabled = false;
}

/* ---------------------------------------------------------
   15. 2.5D 웨딩홀 (Three.js)
   ─ Unity 2.5D 방식 그대로 옮긴 구조 ─
   · 배경(바닥·벽·의자·아치·문)은 3D 오브젝트, 캐릭터는 2D 스프라이트 "빌보드" 입니다.
   · BillboardEffect (LateUpdate): 카메라 forward 의 y 를 0 으로 만들고 그 방향으로 회전
        → 아래 faceCamera() : 캐릭터는 항상 카메라를 보지만 위아래로 기울지 않습니다.
   · CharacterMovement25D: 입력/이동 방향을 카메라 right·forward(y=0) 기준으로 계산
        → 아래 headingToView() : 이동 방향을 카메라 기준 성분으로 바꿔 뒷모습/옆모습을 고르고,
          isMoving 이 true 인 동안에만 걷기 애니메이션을 재생합니다.
   · 카메라: 위에서 45° 로 내려다보는 직교(Orthographic) 카메라 (쿼터뷰)
   --------------------------------------------------------- */
const Hall3D = (() => {
  const U = 1 / 230;                 // 스프라이트 프레임 px → 미터
  const TEX_W = 256, TEX_H = 512;    // 텍스처는 2의 거듭제곱 크기 (밉맵용)
  const STRETCH = 1.22;              // 45° 로 내려다볼 때 세로로 찌그러지는 것 보정
  const PITCH = Math.PI / 4;         // 카메라 내려다보는 각도
  const VIEW_W = 13.8;               // 화면에 보이는 가로 폭(미터)
  const CAM_TARGET = { x: 0, z: 1.0 };
  const HALL = { half: 6.4, zBack: -11, zFront: 10.15 };
  const DOOR_HALF = 1.5;
  const PEW_X0 = 1.9, SEAT_W = 0.95; // 의자: 통로에서 1.9m 떨어져 시작, 한 자리 0.95m
  const START = { x: -5.2, z: 14.6 };// 왼쪽 하단(광장)에서 출발
  const SPEED = 2.7;                 // 걷는 속도 m/s

  let ready = false, failed = false;
  let renderer, scene, camera, container, bubbleLayer;
  let guestRoot, routeGroup, doorL, doorR, shadowGeo, shadowMat;
  const staticBB = [], billboards = [], bubbles = [];
  let doorAmt = 0, doorGoal = 0, walker = null, lastT = 0;
  const imgCache = new Map();
  const M = {};

  const pewZ = (row) => -3 + row * 2;                                 // 0열 = 제단 쪽
  const sideSign = (side) => (CONFIG.sideLayout[side] === 'left' ? -1 : 1);
  const seatWorld = (side, row, col) => ({ x: sideSign(side) * (PEW_X0 + (col + 0.5) * SEAT_W), z: pewZ(row) - 0.1, rowZ: pewZ(row) });
  function standWorld(side, idx) {
    const rows = [9.2, 8.35, 7.5], per = 6, cap = per * rows.length;
    const slot = idx % cap, row = Math.floor(slot / per), col = slot % per, lap = Math.floor(idx / cap);
    return { x: sideSign(side) * (1.8 + col * 0.95 + (row % 2) * 0.4 + lap * 0.25), z: rows[row] + lap * 0.1 };
  }

  /* ---------- 이미지 · 텍스처 도우미 ---------- */
  function loadImg(src) {
    if (!imgCache.has(src)) imgCache.set(src, new Promise((res, rej) => {
      const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('이미지를 불러오지 못했어요: ' + src)); im.src = src;
    }));
    return imgCache.get(src);
  }
  function canvasTex(w, h, draw, rx = 1, ry = 1) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 4;
    return t;
  }
  const noise = (g, w, h, n, col, a, s) => { for (let i = 0; i < n; i++) { g.fillStyle = `rgba(${col},${a})`; g.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * s, 2 + Math.random() * s); } };

  const tileTex = (rx, ry, base, joint) => canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    noise(g, w, h, 240, '190,160,120', 0.08, 10);
    g.strokeStyle = joint; g.lineWidth = 3;
    for (const p of [0, 128]) { g.beginPath(); g.moveTo(p, 0); g.lineTo(p, h); g.stroke(); g.beginPath(); g.moveTo(0, p); g.lineTo(w, p); g.stroke(); }
    g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(10, 10, 48, 6); g.fillRect(138, 138, 48, 6);
  }, rx, ry);

  const carpetTex = (ry) => canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#f8efd9'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#d6a84f'; g.fillRect(6, 0, 4, h); g.fillRect(w - 10, 0, 4, h);
    g.fillStyle = '#e6c98a'; g.fillRect(13, 0, 2, h); g.fillRect(w - 15, 0, 2, h);
    g.fillStyle = '#d6a84f';                                   // 십자 문양
    g.fillRect(w / 2 - 2, h / 2 - 12, 4, 24); g.fillRect(w / 2 - 12, h / 2 - 2, 24, 4);
    g.fillRect(w / 2 - 6, h / 2 - 6, 12, 12); g.fillStyle = '#f8efd9'; g.fillRect(w / 2 - 3, h / 2 - 3, 6, 6);
  }, 1, ry);

  const woodTex = (rx, ry) => canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#7b4b2a'; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 32) { g.fillStyle = 'rgba(40,20,8,.35)'; g.fillRect(x, 0, 3, h); g.fillStyle = 'rgba(255,220,170,.07)'; g.fillRect(x + 5, 0, 8, h); }
    noise(g, w, h, 160, '40,20,8', 0.12, 14);
  }, rx, ry);

  const windowTex = () => canvasTex(128, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.beginPath(); g.moveTo(10, h - 6); g.lineTo(10, 74); g.arc(w / 2, 74, w / 2 - 10, Math.PI, 0); g.lineTo(w - 10, h - 6); g.closePath();
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#fff8dc'); gr.addColorStop(1, '#f0d08a');
    g.fillStyle = gr; g.fill(); g.lineWidth = 9; g.strokeStyle = '#4d2f19'; g.stroke();
    g.lineWidth = 4; g.beginPath(); g.moveTo(w / 2, 12); g.lineTo(w / 2, h - 8); g.moveTo(12, 100); g.lineTo(w - 12, 100); g.moveTo(12, 170); g.lineTo(w - 12, 170); g.stroke();
  });

  const box = (w, h, d, mat, x, y, z, parent) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); (parent || scene).add(m); return m; };
  const cyl = (r1, r2, h, mat, x, y, z, parent, seg = 10) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), mat); m.position.set(x, y, z); (parent || scene).add(m); return m; };
  let flowerGeo;
  function bush(x, y, z, r, n, parent) {
    const g = new THREE.Group(); g.position.set(x, y, z);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, b = Math.random() * Math.PI - Math.PI / 2, rr = r * (0.4 + Math.random() * 0.6);
      const m = new THREE.Mesh(flowerGeo, Math.random() < 0.18 ? M.green : M.white);
      m.position.set(Math.cos(a) * Math.cos(b) * rr, Math.sin(b) * rr * 0.8, Math.sin(a) * Math.cos(b) * rr);
      m.scale.setScalar(r * (0.32 + Math.random() * 0.14)); g.add(m);
    }
    (parent || scene).add(g); return g;
  }
  function candle(x, z, h = 0.34) {
    cyl(0.05, 0.05, h, M.stone, x, h / 2, z, scene, 8);
    const f = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), M.flame); f.position.set(x, h + 0.07, z); scene.add(f);
  }

  /* ---------- 홀 만들기 ---------- */
  function initMaterials() {
    const L = (c, o = {}) => new THREE.MeshLambertMaterial(Object.assign({ color: c }, o));
    M.wood = L(0x7b4b2a); M.woodDark = L(0x4d2f19); M.stone = L(0xf1e8d8); M.white = L(0xfffaf0, { flatShading: true });
    M.green = L(0x5c8a45, { flatShading: true }); M.gold = L(0xd6a84f);
    M.flame = new THREE.MeshBasicMaterial({ color: 0xffd36a }); M.glass = new THREE.MeshBasicMaterial({ color: 0xf6e6c0 });
    M.red = new THREE.MeshBasicMaterial({ color: 0xd83a2e });
    flowerGeo = new THREE.IcosahedronGeometry(1, 0);
  }

  function buildHall() {
    const zc = (HALL.zFront + HALL.zBack) / 2, zl = HALL.zFront - HALL.zBack;
    // 바닥 (식장 내부 / 정문 밖 광장 — 같은 타일로 이어짐)
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(HALL.half * 2, zl), new THREE.MeshLambertMaterial({ map: tileTex(HALL.half, zl / 2, '#efe0c4', 'rgba(150,118,88,.55)') }));
    floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, zc); scene.add(floor);
    const plaza = new THREE.Mesh(new THREE.PlaneGeometry(18, 8.6), new THREE.MeshLambertMaterial({ map: tileTex(9, 4.3, '#ecd9b8', 'rgba(150,118,88,.5)') }));
    plaza.rotation.x = -Math.PI / 2; plaza.position.set(0, -0.001, HALL.zFront + 4.3); scene.add(plaza);
    // 버진로드
    const cl = HALL.zFront - -6.6;
    const carpet = new THREE.Mesh(new THREE.PlaneGeometry(2.4, cl), new THREE.MeshLambertMaterial({ map: carpetTex(cl / 2.4), polygonOffset: true, polygonOffsetFactor: -1 }));
    carpet.rotation.x = -Math.PI / 2; carpet.position.set(0, 0.012, HALL.zFront - cl / 2); scene.add(carpet);

    // 무대(단상) · 제단
    box(8.4, 0.35, 4.2, M.stone, 0, 0.175, -8.9); box(5.2, 0.17, 0.7, M.stone, 0, 0.085, -6.45);
    box(1.8, 0.8, 0.7, M.white, 0, 0.75, -10.2); box(1.84, 0.06, 0.74, M.gold, 0, 1.18, -10.2);
    for (const x of [-1.3, 1.3]) { cyl(0.05, 0.07, 0.7, M.gold, x, 0.7, -10.2, scene, 8); const f = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), M.flame); f.position.set(x, 1.1, -10.2); scene.add(f); }

    // 꽃 아치
    const arch = new THREE.Group(); arch.position.set(0, 0.35, -10.6); scene.add(arch);
    const tor = new THREE.Mesh(new THREE.TorusGeometry(2.0, 0.22, 6, 28, Math.PI), M.green); tor.position.y = 2.2; arch.add(tor);
    for (const x of [-2, 2]) cyl(0.2, 0.22, 2.2, M.green, x, 1.1, 0, arch);
    for (let i = 0; i <= 22; i++) { const t = (i / 22) * Math.PI; bush(Math.cos(t) * 2, 2.2 + Math.sin(t) * 2, 0, 0.5, 6, arch); }
    for (const x of [-2, 2]) for (let y = 0.3; y < 2.3; y += 0.5) bush(x, y, 0, 0.45, 5, arch);

    // 벽 (뒷벽 · 양옆 벽 · 정문 쪽 낮은 벽)
    const wm = (rx, ry) => new THREE.MeshLambertMaterial({ map: woodTex(rx, ry) });
    box(HALL.half * 2 + 0.8, 6.2, 0.3, wm(7, 3), 0, 3.1, HALL.zBack - 0.15);
    for (const s of [-1, 1]) box(0.3, 6.2, zl + 0.3, wm(10, 3), s * (HALL.half + 0.15), 3.1, zc);
    const wt = windowTex(), wmat = new THREE.MeshBasicMaterial({ map: wt, transparent: true });
    for (const x of [-3.9, 0, 3.9]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 3.2), wmat); w.position.set(x, 3.5, HALL.zBack + 0.02); scene.add(w); }
    for (const s of [-1, 1]) for (const z of [-7, -3, 1, 5]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 3.2), wmat); w.position.set(s * (HALL.half - 0.01), 3.4, z); w.rotation.y = -s * Math.PI / 2; scene.add(w); }
    // 정문 벽 : 하객이 뒤에서도 보이도록 낮게, 문틀만 높게
    for (const s of [-1, 1]) { box(4.9, 1.3, 0.35, wm(4, 1), s * 4.1, 0.65, HALL.zFront); box(0.32, 2.5, 0.46, M.woodDark, s * (DOOR_HALF + 0.16), 1.25, HALL.zFront); }
    box(DOOR_HALF * 2 + 0.64, 0.55, 0.46, M.woodDark, 0, 2.55, HALL.zFront);
    const leaf = (sign) => {
      const pivot = new THREE.Group(); pivot.position.set(sign * DOOR_HALF, 0, HALL.zFront); scene.add(pivot);
      const lf = new THREE.Group(); lf.position.x = -sign * 0.75; pivot.add(lf);
      box(1.5, 2.3, 0.1, M.wood, 0, 1.15, 0, lf); box(1.0, 0.7, 0.13, M.woodDark, 0, 0.55, 0, lf);
      box(0.9, 0.85, 0.13, M.glass, 0, 1.68, 0, lf); box(0.05, 0.32, 0.16, M.gold, -sign * 0.6, 1.1, 0, lf);
      return pivot;
    };
    doorL = leaf(-1); doorR = leaf(1);

    // 의자 5열 × 양쪽 (4자리). 등받이가 하객의 하체를 가려 "앉아 있는" 모습이 됩니다
    for (const dir of [-1, 1]) for (let r = 0; r < 5; r++) {
      const z = pewZ(r), len = SEAT_W * 4, cx = dir * (PEW_X0 + len / 2);
      box(len, 0.1, 0.75, M.wood, cx, 0.5, z - 0.05);
      box(len, 0.95, 0.12, M.wood, cx, 0.675, z + 0.38);
      box(len + 0.1, 0.1, 0.16, M.woodDark, cx, 1.2, z + 0.38);
      box(len, 0.45, 0.1, M.woodDark, cx, 0.22, z + 0.34);
      for (const px of [PEW_X0 - 0.09, PEW_X0 + len + 0.09]) box(0.18, 1.28, 0.95, M.woodDark, dir * px, 0.64, z + 0.04);
      // 통로 쪽 꽃 스탠드 + 촛불
      const fx = dir * 1.45, fz = z + 0.05;
      cyl(0.2, 0.25, 0.9, M.stone, fx, 0.45, fz, scene, 10); bush(fx, 1.2, fz, 0.38, 9);
      candle(fx + dir * 0.3, fz + 0.35); candle(fx + dir * 0.3, fz - 0.3, 0.26);
    }
    // 모서리 꽃 스탠드 · 화분
    for (const s of [-1, 1]) {
      for (const [x, z] of [[4.9, -6.1], [4.3, 9.4]]) { cyl(0.3, 0.36, 1.0, M.stone, s * x, 0.5, z); bush(s * x, 1.45, z, 0.55, 14); }
      for (const z of [HALL.zFront + 0.9]) { cyl(0.3, 0.36, 1.0, M.stone, s * 3.1, 0.5, z); bush(s * 3.1, 1.45, z, 0.55, 14); }
      for (const z of [-10.3, 9.6]) { cyl(0.34, 0.28, 0.5, M.woodDark, s * 5.9, 0.25, z); const cone = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.5, 7), M.green); cone.position.set(s * 5.9, 1.2, z); scene.add(cone); }
    }
    // 입장 동선(빨간 화살표) – 바닥에 그린 점선
    routeGroup = new THREE.Group(); scene.add(routeGroup);
    const segs = [[START, { x: 0, z: START.z }], [{ x: 0, z: START.z }, { x: 0, z: 12.3 }]];
    for (const [a, b] of segs) {
      const len = Math.hypot(b.x - a.x, b.z - a.z), n = Math.floor(len / 0.8), ang = Math.atan2(b.x - a.x, b.z - a.z);
      for (let i = 0; i <= n; i++) {
        const t = (i * 0.8) / len, m = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.02, 0.45), M.red);
        m.position.set(a.x + (b.x - a.x) * t, 0.03, a.z + (b.z - a.z) * t); m.rotation.y = ang; routeGroup.add(m);
      }
    }
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.7, 3), M.red); head.rotation.x = -Math.PI / 2; head.position.set(0, 0.04, 11.8); routeGroup.add(head);

    // 조명
    scene.add(new THREE.AmbientLight(0xfff1dc, 0.78));
    const sun = new THREE.DirectionalLight(0xffffff, 0.42); sun.position.set(-6, 14, 9); scene.add(sun);
    shadowGeo = new THREE.CircleGeometry(0.42, 16); shadowMat = new THREE.MeshBasicMaterial({ color: 0x3f2815, transparent: true, opacity: 0.25, depthWrite: false });
    guestRoot = new THREE.Group(); scene.add(guestRoot);
  }

  /* ---------- 스프라이트 빌보드 ---------- */
  function makeBillboard(canvas, feetPx) {
    const tex = new THREE.CanvasTexture(canvas);
    tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter; tex.anisotropy = 4;
    const geo = new THREE.PlaneGeometry(TEX_W * U, TEX_H * U);
    geo.translate((TEX_W / 2 - FRAME.CX) * U, (feetPx - TEX_H / 2) * U, 0);        // 원점 = 발바닥 중앙
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide }));
    mesh.scale.y = STRETCH; billboards.push(mesh);
    return { mesh, tex };
  }
  const newCanvas = () => { const c = document.createElement('canvas'); c.width = TEX_W; c.height = TEX_H; return c; };

  async function staticCanvas(look) {
    const spec = dollSpec(look, 'back');
    const imgs = await Promise.all(spec.layers.map(loadImg));
    const c = newCanvas(), g = c.getContext('2d');
    imgs.forEach((im) => g.drawImage(im, 0, 0));
    return { canvas: c, spec };
  }

  function addBubble(guest, pos, pending) {
    const d = document.createElement('div');
    d.className = 'bubble3d' + (pending ? ' pending' : '');
    d.innerHTML = `<div class="bubble-box" style="--phase:${guest.phase ?? 0}"><b>${esc(guest.name)}</b><span>${esc(guest.msg)}</span></div>`;
    bubbleLayer.appendChild(d);
    const rec = { el: d, pos, id: guest.id }; bubbles.push(rec); return rec;
  }
  function layoutBubbles() {
    if (!container) return;
    const w = container.clientWidth, h = container.clientHeight;
    camera.updateMatrixWorld();
    for (const b of bubbles) {
      const v = b.pos.clone().project(camera);
      b.el.style.left = `${clamp((v.x * 0.5 + 0.5) * w, 70, w - 70)}px`;
      b.el.style.top = `${(-v.y * 0.5 + 0.5) * h - 4}px`;
    }
  }

  async function placeGuest(guest, { pop = false } = {}) {
    const look = { ...guest.look, gender: guest.gender };
    const { canvas, spec } = await staticCanvas(look);
    const bb = makeBillboard(canvas, spec.feet);
    const grp = new THREE.Group(); grp.add(bb.mesh);
    let p;
    if (guest.seat.type === 'seat') p = seatWorld(guest.side, guest.seat.row, guest.seat.col);
    else {
      p = standWorld(guest.side, guest.seat.idx);
      const sh = new THREE.Mesh(shadowGeo, shadowMat); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.02; sh.scale.set(1, 0.7, 1); grp.add(sh);
    }
    grp.position.set(p.x, 0, p.z);
    grp.userData.guestId = guest.id;
    guestRoot.add(grp);
    if (pop) { grp.scale.setScalar(0.01); grp.userData.pop = 0; }
    const headY = (spec.feet - spec.headTop) * U * STRETCH + 0.1;
    addBubble(guest, new THREE.Vector3(p.x, headY, p.z), pop);
    return grp;
  }

  function clearGuests() {
    while (guestRoot.children.length) {
      const g = guestRoot.children[0]; guestRoot.remove(g);
      g.traverse((o) => { if (o.material && o.material.map) o.material.map.dispose(); });
    }
    billboards.length = 0; bubbles.length = 0; bubbleLayer.innerHTML = ''; walker = null;
  }

  /* ---------- 걷는 하객 (뒷모습 / 옆모습 리그) ---------- */
  async function createWalker(look) {
    const g = gKey(look.gender), prop = OPTIONS[look.gender].prop[look.propIdx] || {};
    const P = (n) => loadImg(`assets/layers/${n}.png`);
    const bottomName = `${g}_back_bottom${look.bottom}`, bm = metaOf(bottomName);
    const [bottom, top, headBack, headFront, bag, watch, glasses] = await Promise.all([
      P(bottomName), P(`${g}_back_top${look.top}_${look.skin}`), P(`${g}_back_head${look.hair}_${look.skin}`), P(`${g}_front_head${look.hair}_${look.skin}`),
      prop.kind === 'bag' ? P(`${g}_back_prop${prop.sprite}`) : null,
      prop.kind === 'watch' ? P(`${g}_back_watch`) : null,
      prop.kind === 'glasses' ? P(`${g}_front_head${look.hair}_glasses`) : null,
    ]);
    const canvas = newCanvas(), ctx = canvas.getContext('2d');
    const bb = makeBillboard(canvas, bm.feet);
    const grp = new THREE.Group(); grp.add(bb.mesh);
    const sh = new THREE.Mesh(shadowGeo, shadowMat); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.02; sh.scale.set(1, 0.7, 1); grp.add(sh);
    guestRoot.add(grp);
    const split = Math.min(bm.split, bm.feet - 46);
    const W = FRAME.W, H = FRAME.H, cx = FRAME.CX;
    const w = {
      grp, x: 0, z: 0, mode: 'back', dir: 1, moving: false, path: null, t: 0,
      setPos(x, z) { w.x = x; w.z = z; grp.position.set(x, 0, z); },
      draw(t) {
        const p = w.moving ? (t % 0.56) / 0.56 : 0, side = w.mode === 'side', lift = 9, s = 9;
        const legOff = (q) => {                                    // 다리 한 쪽의 한 주기 동작 (CSS 걷기 키프레임과 동일)
          if (!w.moving) return [0, 0];
          if (!side) return [0, q < 0.25 ? -lift * (q / 0.25) : q < 0.5 ? -lift * (1 - (q - 0.25) / 0.25) : 0];
          if (q < 0.5) return [s - 2 * s * (q / 0.5), 0];
          if (q < 0.75) { const u = (q - 0.5) / 0.25; return [-s + s * u, -lift * u]; }
          const u = (q - 0.75) / 0.25; return [s * u, -lift * (1 - u)];
        };
        ctx.clearRect(0, 0, TEX_W, TEX_H);
        ctx.save();
        if (side) { ctx.translate(cx, 0); ctx.scale(0.72 * w.dir, 1); ctx.translate(-cx, 0); }       // 몸을 좁혀 옆모습처럼
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, split); ctx.clip(); ctx.drawImage(bottom, 0, 0); ctx.restore();   // 엉덩이
        for (const [x0, x1, q] of [[0, cx, p], [cx, W, (p + 0.5) % 1]]) {                               // 왼다리 / 오른다리
          const [dx, dy] = legOff(q);
          ctx.save(); ctx.translate(dx, dy); ctx.beginPath(); ctx.rect(x0, split, x1 - x0, H); ctx.clip(); ctx.drawImage(bottom, 0, 0); ctx.restore();
        }
        const sway = w.moving ? -1.3 * Math.cos(2 * Math.PI * p) * Math.PI / 180 : 0;
        ctx.save(); ctx.translate(cx, H * 0.68); ctx.rotate(sway); ctx.translate(-cx, -H * 0.68);        // 몸통 흔들림
        if (bag) ctx.drawImage(bag, 0, 0);
        ctx.drawImage(top, 0, 0);
        if (watch) ctx.drawImage(watch, 0, 0);
        ctx.restore();
        ctx.save(); ctx.translate(cx, H * 0.32);
        ctx.rotate(w.moving ? 0.8 * Math.cos(2 * Math.PI * p) * Math.PI / 180 : 0);
        if (side) ctx.scale(1.2, 1);
        ctx.translate(-cx, -H * 0.32);
        ctx.drawImage(side ? headFront : headBack, 0, 0);
        if (side && glasses) ctx.drawImage(glasses, 0, 0);
        ctx.restore();
        ctx.restore();
        bb.tex.needsUpdate = true;
        grp.position.y = w.moving ? 0.05 * Math.abs(Math.sin(2 * Math.PI * t / 0.56)) : 0;                // 걸을 때 살짝 통통
      },
    };
    w.draw(0);
    return w;
  }

  /* CharacterMovement25D : 이동 방향을 카메라 right / forward(y=0) 성분으로 바꿔 보여줄 면을 고릅니다 */
  function headingToView(dx, dz) {
    const d = new THREE.Vector3(); camera.getWorldDirection(d); d.y = 0; d.normalize();
    const fwd = d, right = { x: -d.z, z: d.x };                           // cross(forward, up)
    const inputZ = dx * fwd.x + dz * fwd.z, inputX = dx * right.x + dz * right.z;
    if (inputZ > Math.abs(inputX) * 0.9) { walker.mode = 'back'; }        // 카메라에서 멀어짐 → 뒷모습
    else { walker.mode = 'side'; if (Math.abs(inputX) > 0.15) walker.dir = inputX >= 0 ? 1 : -1; }
  }

  function walkTo(pts) {
    return new Promise((resolve) => {
      walker.setPos(pts[0].x, pts[0].z);
      walker.path = { pts, i: 0, resolve };
      walker.moving = true;
    });
  }

  /* BillboardEffect : 카메라가 바라보는 방향(y=0)으로 회전 → 위아래로 기울지 않는 카메라 정면 스프라이트 */
  function faceCamera() {
    const d = new THREE.Vector3(); camera.getWorldDirection(d); d.y = 0;
    if (d.lengthSq() === 0) return;
    const yaw = Math.atan2(-d.x, -d.z);
    for (const m of billboards) m.rotation.y = yaw;
    for (const m of staticBB) m.rotation.y = yaw;
  }

  function update(dt, t) {
    // 정문: 양쪽으로 열림
    const step = dt / (CONFIG.doorOpenMs / 1000);
    doorAmt += Math.sign(doorGoal - doorAmt) * Math.min(Math.abs(doorGoal - doorAmt), step);
    const e = doorAmt * doorAmt * (3 - 2 * doorAmt);
    doorL.rotation.y = e * 1.7; doorR.rotation.y = -e * 1.7;                // 두 문짝이 홀 안쪽으로 열림

    if (walker) {
      const P = walker.path;
      if (P) {
        let dist = SPEED * dt;
        while (dist > 0 && P.i < P.pts.length - 1) {
          const to = P.pts[P.i + 1], dx = to.x - walker.x, dz = to.z - walker.z, len = Math.hypot(dx, dz);
          if (len > 1e-6) headingToView(dx / len, dz / len);
          if (len <= dist) { walker.x = to.x; walker.z = to.z; dist -= len; P.i++; }
          else { walker.x += (dx / len) * dist; walker.z += (dz / len) * dist; dist = 0; }
        }
        walker.grp.position.x = walker.x; walker.grp.position.z = walker.z;
        if (doorGoal === 1 && walker.z < HALL.zFront - 1.1) doorGoal = 0;      // 통과하면 문이 닫힘
        if (P.i >= P.pts.length - 1) { walker.moving = false; walker.path = null; P.resolve(); }
      }
      walker.draw(t);
    }
    for (const g of guestRoot.children) if (g.userData.pop !== undefined) {   // 착석 팝 애니메이션
      g.userData.pop = Math.min(1, g.userData.pop + dt * 5);
      const k = g.userData.pop; g.scale.setScalar(k < 1 ? 1 + Math.sin(k * Math.PI) * 0.12 : 1);
      if (k >= 1) delete g.userData.pop;
    }
    faceCamera();
  }

  function resize() {
    if (!container || !renderer) return;
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    const halfW = VIEW_W / 2, halfH = halfW / (w / h);
    Object.assign(camera, { left: -halfW, right: halfW, top: halfH, bottom: -halfH });
    camera.updateProjectionMatrix();
    const D = 70;
    camera.position.set(CAM_TARGET.x, Math.sin(PITCH) * D, CAM_TARGET.z + Math.cos(PITCH) * D);
    camera.lookAt(CAM_TARGET.x, 0, CAM_TARGET.z);
    camera.updateMatrixWorld();
    layoutBubbles();
  }

  function loop(ms) {
    requestAnimationFrame(loop);
    if (!ready || !container.offsetParent) return;
    const t = ms / 1000, dt = Math.min(0.05, t - lastT || 0.016); lastT = t;
    update(dt, t);
    renderer.render(scene, camera);
  }

  function init() {
    if (ready) return true;
    if (failed || typeof THREE === 'undefined') return false;
    try {
      container = $('#hall3d'); bubbleLayer = $('#bubbles3d');
      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setClearColor(0x3f2815, 1);
      container.insertBefore(renderer.domElement, bubbleLayer);
      scene = new THREE.Scene();
      camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 300);
      initMaterials(); buildHall();
      // 신랑 · 신부 (불투명 100%, 아치보다 작게)
      loadImg('assets/couple.png').then((im) => {
        const c = document.createElement('canvas'); c.width = 512; c.height = 1024;           // 밉맵용 2의 거듭제곱
        const g = c.getContext('2d'); const sc = 512 / im.width; g.drawImage(im, 0, 1024 - im.height * sc, 512, im.height * sc);
        const tex = new THREE.CanvasTexture(c); tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;
        const hM = 1.6, wM = hM * im.width / im.height;
        const geo = new THREE.PlaneGeometry(wM, hM * 1024 / (im.height * sc)); geo.translate(0, geo.parameters.height / 2, 0);
        const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, opacity: 1 }));
        m.scale.y = STRETCH; m.position.set(0, 0.35, -9.0); scene.add(m); staticBB.push(m);
      }).catch((e) => console.warn(e));
      ready = true; resize();
      window.addEventListener('resize', resize);
      requestAnimationFrame(loop);
      return true;
    } catch (e) {
      console.warn('2.5D 홀을 시작하지 못해 2D 홀로 전환합니다:', e);
      failed = true; ready = false; return false;
    }
  }

  const available = () => typeof THREE !== 'undefined' && !failed;

  /* 입장 연출 전체: 광장 → 정문 열림 → 문 통과 → 버진로드 → 자리/스탠딩 */
  async function run(guest, existing) {
    if (!init()) return false;
    resize();
    clearGuests();
    routeGroup.visible = true; doorAmt = 0; doorGoal = 0;
    await Promise.all(existing.map((g) => placeGuest(g)));
    layoutBubbles();
    await sleep(450);

    const look = { ...guest.look, gender: guest.gender };
    walker = await createWalker(look);
    walker.setPos(START.x, START.z); walker.mode = 'side'; walker.dir = 1; walker.draw(0);
    await sleep(500);

    const B = { x: 0, z: 12.3 };
    await walkTo([START, { x: 0, z: START.z }, B]);                         // 왼쪽 하단 → (화살표) → 정문 앞
    walker.mode = 'back'; walker.draw(0);
    await sleep(250);
    routeGroup.visible = false; doorGoal = 1;
    await sleep(CONFIG.doorOpenMs);                                         // 정문이 양쪽으로 열림

    const pts = [B, { x: 0, z: 9.4 }];
    if (guest.seat.type === 'seat') {
      const p = seatWorld(guest.side, guest.seat.row, guest.seat.col), gap = p.rowZ - 0.95;
      pts.push({ x: 0, z: gap }, { x: p.x, z: gap }, { x: p.x, z: p.z });  // 버진로드 → 의자 앞 통로 → 자리로 들어가 앉음
    } else {
      const p = standWorld(guest.side, guest.seat.idx);
      pts.push({ x: 0, z: p.z }, { x: p.x, z: p.z });
    }
    await walkTo(pts);
    await sleep(120);
    guestRoot.remove(walker.grp);
    const bi = billboards.indexOf(walker.grp.children[0]); if (bi >= 0) billboards.splice(bi, 1);
    walker = null;
    await placeGuest(guest, { pop: true });
    layoutBubbles();
    const rec = bubbles.find((b) => b.id === guest.id);
    if (rec) rec.el.classList.remove('pending');                            // 도착 직후 10초 노출 → 20초 휴식 반복
    return true;
  }

  return { available, run };
})();

/* ---------------------------------------------------------
   12. 하단 고정 UI : 청첩장으로 / 하객 방명록
   --------------------------------------------------------- */
function updateCount(n) { el.guestCount.textContent = n; }

el.btnBack.addEventListener('click', (e) => {
  e.preventDefault();
  if (CONFIG.invitationUrl) location.href = CONFIG.invitationUrl;
  else if (history.length > 1) history.back();
  else showToast('CONFIG.invitationUrl 에 청첩장 주소를 넣어 주세요');
});

async function openBook() {
  const list = await GuestStore.list();
  el.bookEmpty.hidden = list.length > 0;
  el.bookList.innerHTML = list.slice().reverse().map((g, i) => {
    const look = { ...g.look, gender: g.gender };
    const avatar = dollHTML(look, 'front', 0.2).html;
    return `<li class="book-item" style="--i:${i}">
      <div class="book-avatar">${avatar}</div>
      <div>
        <div class="book-name">${esc(g.name)}<span class="badge ${g.side}">${SIDE_NAME[g.side]}</span></div>
        <p class="book-msg">${esc(g.msg)}</p>
      </div></li>`;
  }).join('');
  el.modal.hidden = false;
  el.bookList.scrollTop = 0;
}
el.btnBook.addEventListener('click', openBook);
el.bookClose.addEventListener('click', () => { el.modal.hidden = true; });
el.modal.addEventListener('click', (e) => { if (e.target.hasAttribute('data-close')) el.modal.hidden = true; });
window.addEventListener('keydown', (e) => { if (e.key === 'Escape') el.modal.hidden = true; });

/* ---------------------------------------------------------
   13. 샘플 하객 (CONFIG.seedDemoGuests = true 일 때 최초 1회)
   --------------------------------------------------------- */
async function seedDemo() {
  if (!CONFIG.seedDemoGuests) return;
  const cur = await GuestStore.list();
  if (cur.length) return;
  const demo = [
    { name: '민지', msg: '결혼 진심으로 축하해! 행복하게 살아~', side: 'bride', gender: 'female', look: { skin: 'light', hair: 4, top: 0, bottom: 1, propIdx: 1 } },
    { name: '준호', msg: '두 분 오래오래 행복하세요!', side: 'groom', gender: 'male', look: { skin: 'medium', hair: 1, top: 0, bottom: 0, propIdx: 1 } },
    { name: '수아', msg: '오늘 제일 예쁜 신부님 💐', side: 'bride', gender: 'female', look: { skin: 'light', hair: 1, top: 1, bottom: 2, propIdx: 2 } },
    { name: '태민', msg: '축하한다 친구야! 부케는 내가 받는다', side: 'groom', gender: 'male', look: { skin: 'dark', hair: 2, top: 2, bottom: 1, propIdx: 3 } },
    { name: '하은', msg: '사랑 가득한 가정 이루세요', side: 'bride', gender: 'female', look: { skin: 'medium', hair: 0, top: 2, bottom: 0, propIdx: 0 } },
    { name: '도윤', msg: '결혼 축하드립니다 :)', side: 'groom', gender: 'male', look: { skin: 'light', hair: 0, top: 1, bottom: 1, propIdx: 2 } },
  ];
  const list = [];
  demo.forEach((d, i) => {
    list.push({ id: uid() + i, ...d, seat: assignSeat(d.side, list), phase: rand(0, 30), ts: Date.now() - (demo.length - i) * 60000 });
  });
  await GuestStore.replaceAll(list);
}

/* ---------------------------------------------------------
   14. 시작
   --------------------------------------------------------- */
/* 에셋 폴더가 index.html 옆에 없으면 이미지가 전부 깨집니다 → 안내 배너 */
(function checkAssets() {
  const warn = (msg) => {
    if (document.querySelector('.asset-warning')) return;
    const bar = document.createElement('div');
    bar.className = 'asset-warning';
    bar.innerHTML = msg;
    document.body.appendChild(bar);
  };
  const probe = (src, msg) => { const im = new Image(); im.onerror = () => warn(msg); im.src = src; };
  probe('assets/couple.png', '이미지를 찾지 못했어요.<br><b>assets</b> 폴더를 index.html 과 같은 위치에 넣어 주세요.');
  probe('assets/layers/m_front_bottom0.png', '캐릭터 레이어를 찾지 못했어요.<br><b>assets/layers</b> 폴더(PNG 106개)가 있어야 해요.<br>예전 assets 폴더를 지우고 새 zip 의 assets 로 통째로 교체해 주세요.');
})();

(async function init() {
  await seedDemo();
  renderAll();
  fitHall();
  // 기존 하객의 말풍선 위상(phase)이 비어 있으면 무작위로 채워 서로 다른 타이밍에 나오게 함
  const list = await GuestStore.list();
  let dirty = false;
  list.forEach((g) => { if (g.phase === undefined || g.phase === 0) { g.phase = rand(0, 30); dirty = true; } });
  if (dirty) await GuestStore.replaceAll(list);
})();

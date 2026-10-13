'use strict';
(() => {
const VERSION = '1.0.0';
const PREVIEW = !!window.__OUTPERF_PREVIEW;
const KEY = 'outperf.v1';
const SVGNS = 'http://www.w3.org/2000/svg';
const NCOL = 9;
const SUGGESTIONS = [
  ['Révision cours', true, 12], ['Travail projets', true, 8], ['Prépa entretiens', true, 4],
  ['Candidatures & réseau', true, 3], ['Veille marchés', true, 3.5], ['Lecture', true, 4.5],
  ['Sport', false, 6], ['Langues', true, 2], ['Code', true, 5], ['Méditation', false, 1],
];
const DEFAULT_PICK = 7;

/* ================= utils ================= */
const $ = (sel, r = document) => r.querySelector(sel);
const $$ = (sel, r = document) => [...r.querySelectorAll(sel)];
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs) for (const k in attrs) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style') el.style.cssText = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}
function sv(tag, attrs, ...kids) {
  const el = document.createElementNS(SVGNS, tag);
  if (attrs) for (const k in attrs) { if (attrs[k] != null && attrs[k] !== false) el.setAttribute(k, attrs[k]); }
  for (const c of kids.flat()) { if (c != null) el.append(c instanceof Node ? c : document.createTextNode(String(c))); }
  return el;
}
const ICONS = {
  today: '<path d="M12 3v2M12 19v2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M3 12h2M19 12h2M5.6 18.4 7 17M17 7l1.4-1.4"/><circle cx="12" cy="12" r="4"/>',
  chrono: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 13.5V9.5M9.5 2.5h5M18.5 6.5l1.5-1.5"/>',
  stats: '<path d="M4 20V11M10 20V5M16 20v-7M21 20H3"/>',
  journal: '<rect x="4" y="3.5" width="16" height="17" rx="3"/><path d="M8 8.5h8M8 12.5h8M8 16.5h5"/>',
  settings: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2.2"/><circle cx="10" cy="17" r="2.2"/>',
  play: '<path d="M8 5.5v13l10.5-6.5z" fill="currentColor" stroke="none"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  pause: '<path d="M8.5 5.5v13M15.5 5.5v13"/>',
  stop: '<rect x="6.5" y="6.5" width="11" height="11" rx="2" fill="currentColor" stroke="none"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  up: '<path d="M6 14l6-6 6 6"/>',
  down: '<path d="M6 10l6 6 6-6"/>',
  chev: '<path d="M9 6l6 6-6 6"/>',
  chevL: '<path d="M15 6l-6 6 6 6"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  timer: '<circle cx="12" cy="13" r="7.5"/><path d="M12 13l3-3M10 2.5h4"/>',
  hand: '<path d="M5 12h14M12 5v14"/>',
};
function icon(name, size) {
  const s = sv('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' });
  if (size) { s.setAttribute('width', size); s.setAttribute('height', size); }
  s.innerHTML = ICONS[name];
  return s;
}
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pad2 = n => String(n).padStart(2, '0');
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const r1 = n => Math.round(n * 100) / 100;

/* ================= platform: native shell (Capacitor) and configuration ================= */
const CAP = window.Capacitor;
const NATIVE = !!(CAP && typeof CAP.isNativePlatform === 'function' && CAP.isNativePlatform());
const plug = n => (NATIVE && CAP.Plugins && CAP.Plugins[n]) || null;
const CFG = Object.assign({ supabaseUrl: '', supabaseAnonKey: '', privacyUrl: '', termsUrl: '', supportUrl: '', contactEmail: '' }, window.OUTPERF_CONFIG || {});
// Monetisation hook. Version 1 is entirely free; a later version gates chosen features behind isPro()
// and an Apple in-app purchase (App Store guideline 3.1.1).
const isPro = () => true;
function haptic(kind) {
  const H = plug('Haptics'); if (!H) return;
  try {
    if (kind === 'success' || kind === 'warning') H.notification({ type: kind === 'success' ? 'SUCCESS' : 'WARNING' });
    else H.impact({ style: kind === 'heavy' ? 'HEAVY' : kind === 'medium' ? 'MEDIUM' : 'LIGHT' });
  } catch (e) { }
}
function openLink(url) {
  if (!url) return;
  const B = plug('Browser');
  if (B && /^https?:/.test(url)) { B.open({ url }).catch(() => { location.href = url; }); return; }
  const a = h('a', { href: url, target: '_blank', rel: 'noopener' }); document.body.append(a); a.click(); a.remove();
}
const NOTIF_ROUND = 1001, NOTIF_EVENING = [2001, 2002, 2003, 2004, 2005, 2006, 2007];
async function notifAllowed(ask) {
  const LN = plug('LocalNotifications'); if (!LN) return false;
  try {
    let p = await LN.checkPermissions();
    if (p.display === 'granted') return true;
    if (!ask || p.display === 'denied') return false;
    p = await LN.requestPermissions();
    return p.display === 'granted';
  } catch (e) { return false; }
}
async function notifCancel(ids) {
  const LN = plug('LocalNotifications'); if (!LN) return;
  try { await LN.cancel({ notifications: ids.map(id => ({ id })) }); } catch (e) { }
}
async function notifSchedule(list) {
  const LN = plug('LocalNotifications'); if (!LN || !list.length) return;
  try { await LN.schedule({ notifications: list }); } catch (e) { }
}
// End of a round or a break: iOS shows it even when the app is closed.
async function scheduleRoundNotif() {
  await notifCancel([NOTIF_ROUND]);
  const t = S.timer;
  if (!t || t.mode === 'chrono' || !t.dur || !t.runStart) return;
  if (!(await notifAllowed(true))) return;
  const left = t.dur - elapsed(t);
  if (left <= 1000) return;
  const brk = t.mode === 'break';
  notifSchedule([{ id: NOTIF_ROUND, title: brk ? 'Pause terminée' : 'Round terminé', body: brk ? 'On y retourne. Lance le round suivant.' : `${fmtDur(t.dur / 60000)} de ${catName(t.c)} au compteur. Ouvre Outperf pour enchaîner.`, schedule: { at: new Date(Date.now() + left), allowWhileIdle: true }, sound: S.settings.sound ? undefined : null }]);
}
// Evening reminder for the next 7 days. Today's message is written from the live numbers.
const EVENING_LINES = [
  'Ton toi d\'hier a placé la barre. Note tes heures et passe devant.',
  'Une série se construit un soir après l\'autre. Tes heures du jour ?',
  'Discipline du jour : 30 secondes pour noter ce que tu as fait.',
  'Les gens qui avancent mesurent. Saisis tes heures.',
  'Pas d\'heures notées aujourd\'hui ? Il est encore temps.',
  'Objectif du jour : fais mieux qu\'hier. Où en es tu ?',
  'Tes stats n\'attendent que toi. Note ta journée.',
];
let evT = null;
function scheduleEvening(delay) { clearTimeout(evT); evT = setTimeout(scheduleEveningNow, delay == null ? 1500 : delay); }
async function scheduleEveningNow() {
  if (!NATIVE) return;
  await notifCancel(NOTIF_EVENING);
  const st = S.settings;
  if (!st.remind || !(await notifAllowed(false))) return;
  const hh = Math.floor(st.remindAt / 60), mm = st.remindAt % 60, now = Date.now();
  computeLive(); const m = metrics();
  const list = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(); d.setDate(d.getDate() + i); d.setHours(hh, mm, 0, 0);
    if (d.getTime() <= now + 60000) continue;
    let body = EVENING_LINES[(d.getDate() + i) % EVENING_LINES.length];
    if (i === 0) {
      if (m.goal > 0 && m.todayHit) continue;
      if (m.streakAtStake) body = `Ta série de ${m.streakAtStake} jour${m.streakAtStake > 1 ? 's' : ''} est en jeu. Il te manque ${fmtDur(m.goal - m.today)}.`;
      else if (m.yday > m.today) body = `Encore ${fmtDur(m.yday - m.today + 1)} pour battre ton toi d'hier.`;
      else if (m.goal > m.today) body = `Il te manque ${fmtDur(m.goal - m.today)} pour ton objectif du jour.`;
    }
    list.push({ id: NOTIF_EVENING[i], title: 'Outperf', body, schedule: { at: d, allowWhileIdle: true } });
  }
  notifSchedule(list);
}
function setStatusBar(dark) {
  const SB = plug('StatusBar'); if (!SB) return;
  try { SB.setStyle({ style: dark ? 'DARK' : 'LIGHT' }); } catch (e) { }
}

/* ================= dates ================= */
const DOW_S = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const DOW_L = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const MON_S = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const MON_L = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const ymd = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const fromKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d, 12); };
const addDays = (k, n) => { const d = fromKey(k); d.setDate(d.getDate() + n); return ymd(d); };
const dayKey = ts => ymd(new Date(ts - S.settings.dayEnd * 3600000));
const today = () => dayKey(Date.now());
const dow = k => (fromKey(k).getDay() + 6) % 7;
const monday = k => addDays(k, -dow(k));
const monthStart = k => k.slice(0, 8) + '01';
const dim = (y, m) => new Date(y, m + 1, 0).getDate();
function prevMonthSame(k) {
  const d = fromKey(k), y = d.getFullYear(), m = d.getMonth();
  const pm = m === 0 ? 11 : m - 1, py = m === 0 ? y - 1 : y;
  return ymd(new Date(py, pm, Math.min(d.getDate(), dim(py, pm)), 12));
}
const diffDays = (a, b) => Math.round((fromKey(b) - fromKey(a)) / 86400000);
function fmtDate(k, style) {
  const d = fromKey(k);
  if (style === 'long') return `${cap(DOW_L[dow(k)])} ${d.getDate()} ${MON_L[d.getMonth()]}`;
  if (style === 'num') return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`;
  return `${DOW_S[dow(k)]}. ${d.getDate()} ${MON_S[d.getMonth()]}`;
}
function relDay(k) {
  const t = today();
  if (k === t) return "Aujourd'hui";
  if (k === addDays(t, -1)) return 'Hier';
  return fmtDate(k);
}
const hhmm = ts => { const d = new Date(ts); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };

/* ================= formatting ================= */
function fmtDur(min) {
  min = Math.round(min);
  if (min <= 0) return '0\u00a0min';
  const hh = Math.floor(min / 60), mm = min % 60;
  if (!hh) return `${mm}\u00a0min`;
  if (!mm) return `${hh}\u00a0h`;
  return `${hh}\u00a0h\u00a0${pad2(mm)}`;
}
const fmtH = (min, dec = 1) => (min / 60).toFixed(dec).replace('.', ',') + '\u00a0h';
const fmtNum = (v, dec = 1) => Number(v).toFixed(dec).replace('.', ',');
function fmtDelta(min) {
  const r = Math.round(min);
  if (r === 0) return '=';
  return (r > 0 ? '+' : '−') + fmtDur(Math.abs(r));
}
function fmtClock(ms) {
  const t = Math.max(0, Math.floor(ms / 1000));
  const hh = Math.floor(t / 3600), mm = Math.floor(t % 3600 / 60), ss = t % 60;
  return hh ? `${hh}:${pad2(mm)}:${pad2(ss)}` : `${pad2(mm)}:${pad2(ss)}`;
}
const pct = v => Math.round(v * 100) + '\u00a0%';

/* ================= state ================= */
let S;
let memStore = null;
function defaults() {
  return {
    v: 1,
    settings: { goal: 300, dayEnd: 0, grades: [130, 100, 80, 50], presets: [25, 50, 90], theme: 'auto', wake: true, sound: true, lastBackup: 0, onboarded: false, remind: false, remindAt: 21 * 60 },
    cats: [], entries: [], timer: null, tomb: { e: {}, c: {} }, mt: 0,
  };
}
function normalize(o) {
  const d = defaults();
  if (!o || typeof o !== 'object') return d;
  const st = Object.assign(d, o);
  st.settings = Object.assign(defaults().settings, o.settings || {});
  st.cats = Array.isArray(o.cats) ? o.cats.filter(c => c && c.id && typeof c.name === 'string') : [];
  st.entries = Array.isArray(o.entries) ? o.entries.filter(e => e && e.id && /^\d{4}-\d{2}-\d{2}$/.test(e.d) && isFinite(e.m)) : [];
  st.tomb = { e: Object.assign({}, o.tomb && o.tomb.e), c: Object.assign({}, o.tomb && o.tomb.c) };
  if (st.timer && !Array.isArray(st.timer.segs)) st.timer = null;
  return st;
}
async function load() {
  let raw = null;
  const P = plug('Preferences');
  if (P) { try { raw = (await P.get({ key: KEY })).value; } catch (e) { } }
  if (!raw) { try { raw = localStorage.getItem(KEY); } catch (e) { raw = memStore; } }
  if (!raw) return defaults();
  try { return normalize(JSON.parse(raw)); } catch (e) { return defaults(); }
}
// Deleted items leave a dated tombstone so a deletion on one device wins over an older copy elsewhere.
let lastIds = null;
function trackDeletes() {
  const now = Date.now();
  const ce = new Set(S.entries.map(e => e.id)), cc = new Set(S.cats.map(c => c.id));
  if (lastIds) {
    for (const id of lastIds.e) if (!ce.has(id)) S.tomb.e[id] = now;
    for (const id of lastIds.c) if (!cc.has(id)) S.tomb.c[id] = now;
  }
  for (const id in S.tomb.e) if (ce.has(id)) { delete S.tomb.e[id]; const e = S.entries.find(x => x.id === id); if (e) e.u = now; }
  for (const id in S.tomb.c) if (cc.has(id)) { delete S.tomb.c[id]; const c = S.cats.find(x => x.id === id); if (c) c.u = now; }
  lastIds = { e: ce, c: cc };
}
let prefT = null;
function persist() {
  const raw = JSON.stringify(S);
  try { localStorage.setItem(KEY, raw); } catch (e) { memStore = raw; }
  const P = plug('Preferences');
  if (P) { clearTimeout(prefT); prefT = setTimeout(() => P.set({ key: KEY, value: JSON.stringify(S) }).catch(() => { }), 250); }
  IDX = null;
}
function save() {
  trackDeletes();
  S.mt = Date.now();
  persist();
  schedulePush();
  if (NATIVE) scheduleEvening();
}
// Replacing the whole state (restore, example data, reset) must not tombstone the old items.
function replaceState(next) { S = next; lastIds = null; trackDeletes(); persist(); }
const activeCats = () => S.cats.filter(c => !c.archived);
const catById = id => S.cats.find(c => c.id === id);
const catName = id => (catById(id) || { name: 'Catégorie supprimée' }).name;
const catVar = id => { const c = catById(id); return `var(--c${c ? c.color : 8})`; };
function nextColor() {
  const used = S.cats.filter(c => !c.archived).map(c => c.color);
  for (let i = 0; i < 8; i++) if (!used.includes(i)) return i;
  return S.cats.length % 8;
}
function makeCat(name, counts = true, weeklyH = 0) {
  return { id: uid(), name: name.trim().slice(0, 40), color: nextColor(), counts, wg: Math.round(weeklyH * 60), archived: false };
}

/* ================= index & metrics ================= */
let IDX = null;
let LIVE = new Map();
function idx() {
  if (IDX) return IDX;
  const byDay = new Map();
  const cm = new Map(S.cats.map(c => [c.id, c]));
  for (const e of S.entries) {
    let o = byDay.get(e.d);
    if (!o) { o = { work: 0, all: 0, cats: {} }; byDay.set(e.d, o); }
    o.all += e.m; o.cats[e.c] = (o.cats[e.c] || 0) + e.m;
    const c = cm.get(e.c); if (c && c.counts) o.work += e.m;
  }
  let first = null;
  for (const k of byDay.keys()) if (first === null || k < first) first = k;
  IDX = { byDay, first, cm };
  return IDX;
}
function computeLive() {
  LIVE = new Map();
  const t = S.timer;
  if (!t || t.mode === 'break') return;
  const segs = t.segs.slice();
  if (t.runStart) segs.push([t.runStart, Date.now()]);
  const capped = t.mode === 'timer' && t.dur ? trimSegs(segs, t.dur) : segs;
  for (const [d, ms] of splitSegs(capped)) LIVE.set(d, { c: t.c, m: ms / 60000 });
}
function dayData(k) {
  const o = idx().byDay.get(k);
  const l = LIVE.get(k);
  if (!l) return o || { work: 0, all: 0, cats: {} };
  const c = catById(l.c);
  const base = o || { work: 0, all: 0, cats: {} };
  const cats = Object.assign({}, base.cats); cats[l.c] = (cats[l.c] || 0) + l.m;
  return { work: base.work + (c && c.counts ? l.m : 0), all: base.all + l.m, cats };
}
const W = k => dayData(k).work;
function sumW(a, b) { let s = 0; for (let k = a; k <= b; k = addDays(k, 1)) s += W(k); return s; }
function sumCat(c, a, b) { let s = 0; for (let k = a; k <= b; k = addDays(k, 1)) s += dayData(k).cats[c] || 0; return s; }
function firstDay() { const f = idx().first; const t = today(); if (LIVE.size) { for (const k of LIVE.keys()) if (!f || k < f) return k; } return f || t; }
function gradeOf(ratio) {
  const g = S.settings.grades, p = ratio * 100;
  if (p >= g[0]) return 'S'; if (p >= g[1]) return 'A'; if (p >= g[2]) return 'B'; if (p >= g[3]) return 'C'; return 'D';
}
function hasData() { return S.entries.length > 0 || LIVE.size > 0; }

function metrics() {
  const t = today(), goal = S.settings.goal, f = firstDay();
  const y = addDays(t, -1), mon = monday(t), ms = monthStart(t), pms = prevMonthSame(t);
  const m = { t, goal, first: f };
  m.today = W(t); m.yday = W(y);
  m.week = sumW(mon, t); m.weekPrev = sumW(addDays(mon, -7), addDays(t, -7));
  m.month = sumW(ms, t); m.monthPrev = sumW(pms.slice(0, 8) + '01', pms);
  const n7a = Math.max(0, diffDays(f > addDays(t, -7) ? f : addDays(t, -7), y) + 1);
  m.avg7 = n7a > 0 && f <= y ? sumW(addDays(t, -7), y) / n7a : null;
  const pf = addDays(t, -14), pl = addDays(t, -8);
  const n7b = f <= pl ? diffDays(f > pf ? f : pf, pl) + 1 : 0;
  m.avg7Prev = n7b > 0 ? sumW(pf, pl) / n7b : null;
  // 30-day goal rate (today counts only if already hit)
  let hit = 0, n = 0;
  const s30 = f > addDays(t, -29) ? f : addDays(t, -29);
  for (let k = s30; k <= t; k = addDays(k, 1)) {
    const ok = W(k) >= goal && goal > 0;
    if (k === t && !ok) continue;
    n++; if (ok) hit++;
  }
  m.hit30 = hit; m.n30 = n; m.rate30 = n ? hit / n : null;
  // streaks
  let st = 0;
  for (let k = y; k >= f; k = addDays(k, -1)) { if (goal > 0 && W(k) >= goal) st++; else break; }
  m.todayHit = goal > 0 && m.today >= goal;
  m.streak = st + (m.todayHit ? 1 : 0);
  m.streakAtStake = !m.todayHit && st > 0 ? st : 0;
  let best = 0, cur = 0, rec = 0, recDay = null, total = 0, days = 0;
  for (let k = f; k <= t; k = addDays(k, 1)) {
    const v = W(k);
    if (goal > 0 && v >= goal) { cur++; best = Math.max(best, cur); } else cur = 0;
    if (v > rec) { rec = v; recDay = k; }
    total += v;
    if (idx().byDay.has(k) || LIVE.has(k)) days++;
  }
  m.best = best; m.record = rec; m.recordDay = recDay; m.total = total; m.days = days;
  m.ratio = goal > 0 ? m.today / goal : 0;
  m.grade = gradeOf(m.ratio);
  return m;
}

/* ================= timer ================= */
function trimSegs(segs, durMs) {
  const out = []; let left = durMs;
  for (const [a, b] of segs) { if (left <= 0) break; const len = Math.min(b - a, left); out.push([a, a + len]); left -= len; }
  return out;
}
function splitSegs(segs) {
  const out = new Map();
  const off = S.settings.dayEnd * 3600000;
  for (const [a, b] of segs) {
    let cur = a;
    while (cur < b) {
      const d = new Date(cur - off);
      const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0, 0).getTime() + off;
      const end = Math.min(b, next);
      const k = ymd(d);
      out.set(k, (out.get(k) || 0) + (end - cur));
      cur = end;
    }
  }
  return out;
}
function elapsed(t, now = Date.now()) {
  let ms = 0;
  for (const [a, b] of t.segs) ms += b - a;
  if (t.runStart) ms += now - t.runStart;
  return ms;
}
function startTimer(mode, c, durMin) {
  unlockAudio();
  S.timer = { mode, c, segs: [], runStart: Date.now(), dur: durMin ? durMin * 60000 : 0, started: Date.now() };
  save(); wakeOn(); tick(true); haptic('medium'); scheduleRoundNotif();
}
function pauseTimer() {
  const t = S.timer; if (!t || !t.runStart) return;
  t.segs.push([t.runStart, Date.now()]); t.runStart = null; save(); wakeOff(); tick(true); haptic('light'); notifCancel([NOTIF_ROUND]);
}
function resumeTimer() {
  const t = S.timer; if (!t || t.runStart) return;
  unlockAudio(); t.runStart = Date.now(); save(); wakeOn(); tick(true); haptic('light'); scheduleRoundNotif();
}
function finishTimer(opts = {}) {
  const t = S.timer; if (!t) return null;
  const end = opts.endAt || Date.now();
  if (t.runStart) { t.segs.push([t.runStart, end]); t.runStart = null; }
  let segs = t.segs;
  if (t.mode !== 'chrono' && t.dur) segs = trimSegs(segs, t.dur);
  S.timer = null; wakeOff(); notifCancel([NOTIF_ROUND]);
  if (opts.discard || t.mode === 'break') { save(); tick(true); return null; }
  const total = segs.reduce((s, [a, b]) => s + b - a, 0);
  if (total < 60000) { save(); tick(true); if (!opts.silent) toast('Moins d\'une minute : session non enregistrée'); return null; }
  const sid = uid();
  for (const [d, ms] of splitSegs(segs)) {
    S.entries.push({ id: uid(), d, c: t.c, m: r1(ms / 60000), src: t.mode, t: Date.now(), s: segs[0][0], sid });
  }
  save(); tick(true); haptic('success');
  if (!opts.silent) toast(`${fmtDur(total / 60000)} ajoutées à ${catName(t.c)}`, () => { S.entries = S.entries.filter(e => e.sid !== sid); save(); render(); });
  return { sid, total, c: t.c, mode: t.mode, dur: t.dur };
}
function checkTimer(fromBackground) {
  const t = S.timer;
  if (!t || t.mode === 'chrono' || !t.dur || !t.runStart) return;
  const el = elapsed(t);
  if (el < t.dur) return;
  const closed = t.segs.reduce((s, [a, b]) => s + b - a, 0);
  const endAt = t.runStart + (t.dur - closed);
  const mode = t.mode, c = t.c, dur = t.dur;
  const res = finishTimer({ endAt, silent: true });
  if (!fromBackground) beep();
  if (mode === 'break') { toast('Pause terminée. On y retourne.'); render(); return; }
  if (res) roundDone(res, c, dur, fromBackground);
}

let wakeLock = null;
async function wakeOn() {
  if (!S.settings.wake) return;
  const KA = plug('KeepAwake');
  if (KA) { try { await KA.keepAwake(); } catch (e) { } return; }
  if (!('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
  try { wakeLock = await navigator.wakeLock.request('screen'); } catch (e) { wakeLock = null; }
}
function wakeOff() {
  const KA = plug('KeepAwake'); if (KA) { KA.allowSleep().catch(() => { }); return; }
  try { if (wakeLock) wakeLock.release(); } catch (e) { } wakeLock = null;
}

let AC = null;
function unlockAudio() {
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === 'suspended') AC.resume();
    const o = AC.createOscillator(), g = AC.createGain(); g.gain.value = 0.0001; o.connect(g).connect(AC.destination); o.start(); o.stop(AC.currentTime + 0.02);
  } catch (e) { AC = null; }
}
function beep() {
  if (!AC || !S.settings.sound) return;
  try {
    const t0 = AC.currentTime + 0.02;
    [0, 0.32, 0.64, 1.3, 1.62, 1.94].forEach((dt, i) => {
      const o = AC.createOscillator(), g = AC.createGain();
      o.type = 'sine'; o.frequency.value = i < 3 ? 880 : 988;
      g.gain.setValueAtTime(0.0001, t0 + dt);
      g.gain.exponentialRampToValueAtTime(0.35, t0 + dt + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dt + 0.26);
      o.connect(g).connect(AC.destination); o.start(t0 + dt); o.stop(t0 + dt + 0.3);
    });
  } catch (e) { }
}

/* ================= ui primitives ================= */
let toastTimer = null;
function toast(msg, undo) {
  let el = $('#toast');
  if (!el) { el = h('div', { id: 'toast', class: 'toast', role: 'status', 'aria-live': 'polite' }); document.body.append(el); }
  el.replaceChildren(h('span', null, msg));
  if (undo) el.append(h('button', { onclick: () => { undo(); hideToast(); } }, 'Annuler'));
  requestAnimationFrame(() => el.classList.add('in'));
  clearTimeout(toastTimer); toastTimer = setTimeout(hideToast, undo ? 5000 : 3200);
}
function hideToast() { const el = $('#toast'); if (el) el.classList.remove('in'); }

let sheetStack = [];
function openSheet(title, body, opts = {}) {
  hideTip(); hideToast();
  const bd = h('div', { class: 'backdrop' });
  const close = () => {
    bd.classList.remove('in'); sh.classList.remove('in'); bd.style.pointerEvents = 'none'; sh.style.pointerEvents = 'none';
    setTimeout(() => { bd.remove(); sh.remove(); }, 260);
    sheetStack = sheetStack.filter(x => x !== close);
    if (opts.onClose) opts.onClose();
  };
  const sh = h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
    h('div', { class: 'grab' }),
    h('div', { class: 'sheet-h' }, h('h3', null, title), h('button', { class: 'icon-btn', 'aria-label': 'Fermer', onclick: close }, icon('x'))),
    h('div', { class: 'sheet-b' }, typeof body === 'function' ? body(close) : body));
  bd.addEventListener('click', close);
  document.body.append(bd, sh);
  requestAnimationFrame(() => { bd.classList.add('in'); sh.classList.add('in'); });
  sheetStack.push(close);
  return close;
}
function confirmSheet(title, text, okLabel, onOk, danger) {
  openSheet(title, close => [
    h('p', { class: 'muted' }, text),
    h('div', { class: 'btns' },
      h('button', { class: 'btn', onclick: close }, 'Annuler'),
      h('button', { class: 'btn ' + (danger ? 'danger' : 'primary'), onclick: () => { close(); onOk(); } }, okLabel)),
  ]);
}
function toggle(checked, onchange, label) {
  const inp = h('input', { type: 'checkbox', role: 'switch', 'aria-label': label || '' });
  inp.checked = !!checked;
  inp.addEventListener('change', () => onchange(inp.checked));
  return h('label', { class: 'toggle' }, inp, h('i'));
}
function durInput(minutes) {
  const hI = h('input', { class: 'input', type: 'number', inputmode: 'numeric', min: 0, max: 23, 'aria-label': 'Heures', value: Math.floor(minutes / 60) || '' , placeholder: '0' });
  const mI = h('input', { class: 'input', type: 'number', inputmode: 'numeric', min: 0, max: 59, 'aria-label': 'Minutes', value: Math.round(minutes % 60) || '', placeholder: '0' });
  const node = h('div', { class: 'dur-in' }, hI, h('span', null, 'h'), mI, h('span', null, 'min'));
  node.get = () => (parseInt(hI.value || '0', 10) || 0) * 60 + (parseInt(mI.value || '0', 10) || 0);
  return node;
}
function gradeBadge(g, big) { return h('div', { class: `grade g-${g}${big ? ' big' : ''}`, 'aria-label': `Note ${g}` }, g); }

/* tooltip */
let tipEl = null, tipOwner = null;
function showTip(x, y, title, rows, owner) {
  if (!tipEl) { tipEl = h('div', { class: 'tip', role: 'tooltip' }); document.body.append(tipEl); }
  tipEl.replaceChildren(h('div', { class: 'tt' }, title), ...rows.map(r => h('div', { class: 'tr' }, h('span', null, r.color ? h('i', { style: `background:${r.color}` }) : null, r.label), h('b', null, r.value))));
  tipEl.classList.add('in'); tipOwner = owner;
  const w = tipEl.offsetWidth, ht = tipEl.offsetHeight, vw = innerWidth;
  let left = clamp(x - w / 2, 8, vw - w - 8), top = y - ht - 14;
  if (top < 8 + (parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sat')) || 0)) top = y + 18;
  tipEl.style.left = left + 'px'; tipEl.style.top = top + 'px';
}
function hideTip() { if (tipEl) tipEl.classList.remove('in'); if (tipOwner && tipOwner.classList) tipOwner.classList.remove('hl'); tipOwner = null; }
function bindTip(hit, mark, getTip) {
  const show = ev => {
    if (tipOwner && tipOwner !== mark && tipOwner.classList) tipOwner.classList.remove('hl');
    const r = hit.getBoundingClientRect();
    const tp = getTip();
    if (mark && mark.classList) mark.classList.add('hl');
    showTip(r.left + r.width / 2, r.top + (ev && ev.type === 'focus' ? 0 : Math.min(r.height / 2, 40)), tp[0], tp[1], mark || hit);
  };
  hit.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') show(e); });
  hit.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') hideTip(); });
  hit.addEventListener('click', e => { e.stopPropagation(); show(e); });
  hit.addEventListener('focus', show); hit.addEventListener('blur', hideTip);
  hit.setAttribute('tabindex', '0');
}
document.addEventListener('keydown', e => { if (e.key === 'Escape' && sheetStack.length) sheetStack[sheetStack.length - 1](); });
document.addEventListener('pointerdown', e => { if (!e.target.closest || !e.target.closest('.hit')) hideTip(); }, true);
document.addEventListener('scroll', hideTip, { passive: true, capture: true });

/* ================= charts ================= */
function niceScale(maxV) {
  if (!(maxV > 0)) maxV = 1;
  const p = Math.pow(10, Math.floor(Math.log10(maxV / 4)));
  let best = null;
  for (const m of [1, 2, 2.5, 5, 10, 20, 25, 50]) {
    if ((m === 2.5 || m === 25) && p < 10) continue;
    const step = m * p, n = Math.ceil(maxV / step - 1e-9);
    if (n < 2 || n > 6) continue;
    const top = n * step;
    if (!best || top < best.top - 1e-9 || (Math.abs(top - best.top) < 1e-9 && Math.abs(n - 4) < Math.abs(best.n - 4))) best = { step, top, n };
  }
  return best || { step: maxV / 4, top: maxV, n: 4 };
}
function frame(width, height, m, maxV, fmtTick) {
  const svg = sv('svg', { viewBox: `0 0 ${width} ${height}`, width, height, class: 'chart', role: 'img' });
  const box = { x0: m.l, x1: width - m.r, y0: height - m.b, y1: m.t };
  const { step, top, n } = niceScale(maxV);
  const g = sv('g');
  for (let i = 0; i <= n; i++) {
    const v = i * step, y = box.y0 - (v / top) * (box.y0 - box.y1);
    g.append(sv('line', { x1: box.x0, x2: box.x1, y1: y, y2: y, class: i === 0 ? 'base' : 'grid' }));
    g.append(sv('text', { x: box.x0 - 7, y: y + 4, 'text-anchor': 'end', class: 'tick' }, fmtTick ? fmtTick(v) : fmtNum(v, Math.abs(step - Math.round(step)) > 1e-9 ? 1 : 0)));
  }
  svg.append(g);
  box.y = v => box.y0 - (v / top) * (box.y0 - box.y1);
  box.top = top;
  return { svg, box };
}
function colPath(x, y0, w, hh, r = 4) {
  if (hh <= 0.5) return '';
  r = Math.min(r, w / 2, hh); const y = y0 - hh;
  return `M${x},${y0}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y0}Z`;
}
function rowPath(x0, y, len, hh, r = 4) {
  if (len <= 0.5) return '';
  r = Math.min(r, hh / 2, len); const x = x0 + len;
  return `M${x0},${y}H${x - r}Q${x},${y} ${x},${y + r}V${y + hh - r}Q${x},${y + hh} ${x - r},${y + hh}H${x0}Z`;
}
function chartWidth(el) {
  const w = el ? el.getBoundingClientRect().width : 0;
  return Math.max(240, Math.floor(w || Math.min(innerWidth, 560) - 58));
}
const hLabel = v => v >= 10 ? fmtNum(v, 0) : fmtNum(v, 1);

/** columns: data [{label, v (hours), fill, opacity, strong, tip:[title, rows], onPick}] */
function columns(host, data, o = {}) {
  const W0 = chartWidth(host), H0 = o.height || 200;
  const maxV = Math.max(o.goal || 0, ...data.map(d => d.v), o.min || 0.5);
  const { svg, box } = frame(W0, H0, { l: 30, r: 4, t: o.labels ? 20 : 10, b: 24 }, maxV * (o.labels ? 1.1 : 1.02), o.tick);
  const n = data.length, band = (box.x1 - box.x0) / n, bw = Math.min(o.maxBar || 26, Math.max(3, band - (n > 14 ? 2 : 8)));
  const gGoal = sv('g'), gMarks = sv('g'), gLab = sv('g'), gHit = sv('g');
  svg.append(gGoal, gMarks, gLab, gHit);
  data.forEach((d, i) => {
    const x = box.x0 + i * band + (band - bw) / 2;
    const p = colPath(x, box.y0, bw, box.y0 - box.y(d.v), bw < 8 ? 2 : 4);
    const mark = p ? sv('path', { d: p, class: 'mk', style: `fill:${d.fill};${d.opacity != null ? 'opacity:' + d.opacity : ''}` }) : sv('g');
    gMarks.append(mark);
    if (o.labels && d.v > 0) gLab.append(sv('text', { x: x + bw / 2, y: box.y(d.v) - 6, 'text-anchor': 'middle', class: 'lbl' }, o.labelFmt ? o.labelFmt(d) : hLabel(d.v)));
    const showX = o.labelAt ? o.labelAt(i) : true;
    if (showX) gLab.append(sv('text', { x: x + bw / 2, y: box.y0 + 17, 'text-anchor': 'middle', class: d.strong ? 'lbl' : 'tick' }, d.label));
    const hit = sv('rect', { x: box.x0 + i * band, y: box.y1, width: band, height: box.y0 - box.y1 + 22, class: 'hit', 'aria-label': d.tip ? d.tip[0] : d.label });
    gHit.append(hit);
    if (d.onPick) { hit.setAttribute('tabindex', '0'); hit.setAttribute('role', 'button'); hit.addEventListener('click', e => { e.stopPropagation(); d.onPick(); }); hit.addEventListener('keydown', e => { if (e.key === 'Enter') d.onPick(); }); }
    else if (d.tip) bindTip(hit, mark, () => d.tip);
  });
  if (o.goal) { const y = box.y(o.goal); gGoal.append(sv('line', { x1: box.x0, x2: box.x1, y1: y, y2: y, class: 'goal' })); }
  host.replaceChildren(svg);
}
/** grouped columns: current (solid) next to previous period (ghost outline) */
function grouped(host, groups, o = {}) {
  const W0 = chartWidth(host), H0 = o.height || 220;
  const maxV = Math.max(o.goal || 0, ...groups.map(g => Math.max(g.cur || 0, g.prev || 0)), 0.5) * 1.12;
  const { svg, box } = frame(W0, H0, { l: 30, r: 4, t: 18, b: 36 }, maxV);
  const n = groups.length, band = (box.x1 - box.x0) / n;
  const bw = Math.min(18, Math.max(6, (band - 12) / 2));
  const gGoal = sv('g'), gMarks = sv('g'), gLab = sv('g'), gHit = sv('g');
  svg.append(gGoal, gMarks, gLab, gHit);
  groups.forEach((g, i) => {
    const cx = box.x0 + i * band + band / 2;
    const mk = sv('g', { class: 'mk' });
    if (g.prev > 0) mk.append(sv('path', { d: colPath(cx - bw - 1.25, box.y0, bw - 1.5, box.y0 - box.y(g.prev) - 0.75), style: 'fill:var(--ghost-wash);stroke:var(--ghost);stroke-width:1.5' }));
    if (g.cur > 0) {
      mk.append(sv('path', { d: colPath(cx + 1.5, box.y0, bw, box.y0 - box.y(g.cur)), style: `fill:${g.fill}` }));
      gLab.append(sv('text', { x: cx + 1.5 + bw / 2, y: box.y(Math.max(g.cur, g.prev || 0)) - 6, 'text-anchor': 'middle', class: 'lbl' }, hLabel(g.cur)));
    }
    gMarks.append(mk);
    gLab.append(sv('text', { x: cx, y: box.y0 + 16, 'text-anchor': 'middle', class: g.strong ? 'lbl' : 'tick' }, g.l1));
    gLab.append(sv('text', { x: cx, y: box.y0 + 30, 'text-anchor': 'middle', class: g.strong ? 'lbl' : 'tick' }, g.l2));
    const hit = sv('rect', { x: box.x0 + i * band, y: box.y1, width: band, height: box.y0 - box.y1 + 34, class: 'hit', 'aria-label': g.tip[0] });
    gHit.append(hit); bindTip(hit, mk, () => g.tip);
  });
  if (o.goal) { const y = box.y(o.goal); gGoal.append(sv('line', { x1: box.x0, x2: box.x1, y1: y, y2: y, class: 'goal' })); }
  host.replaceChildren(svg);
}
/** horizontal bars: rows [{label, v, pv, fill, tip}] with optional ghost row for the previous period */
function hbars(host, rows) {
  const W0 = chartWidth(host), ghost = rows.some(r => r.pv != null), rowH = ghost ? 42 : 32, H0 = rows.length * rowH + 2;
  const labW = Math.min(124, Math.round(W0 * 0.34));
  const svg = sv('svg', { viewBox: `0 0 ${W0} ${H0}`, width: W0, height: H0, class: 'chart' });
  const maxV = Math.max(0.25, ...rows.map(r => Math.max(r.v, r.pv || 0)));
  const plot = W0 - labW - 62;
  rows.forEach((r, i) => {
    const y = 2 + i * rowH, len = (r.v / maxV) * plot;
    svg.append(sv('text', { x: 0, y: y + 17, class: 'lbl', style: 'font-weight:500' }, r.label.length > 17 ? r.label.slice(0, 16) + '…' : r.label));
    const mk = sv('g', { class: 'mk' });
    mk.append(sv('path', { d: rowPath(labW, y + 5, len, 16) || `M${labW},${y + 5}h2v16h-2Z`, style: `fill:${r.fill}` }));
    if (ghost && r.pv > 0) mk.append(sv('path', { d: rowPath(labW + 0.75, y + 25, (r.pv / maxV) * plot - 0.75, 8, 3), style: 'fill:var(--ghost-wash);stroke:var(--ghost);stroke-width:1.25' }));
    svg.append(mk);
    svg.append(sv('text', { x: labW + len + 7, y: y + 17, class: 'lbl' }, fmtDur(r.v * 60)));
    const hit = sv('rect', { x: 0, y, width: W0, height: rowH, class: 'hit' });
    svg.append(hit); bindTip(hit, mk, () => r.tip);
  });
  host.replaceChildren(svg);
}
/** month race: cumulative hours, this month vs previous month vs objective pace */
function race(host, cur, prev, goalPace, nDays, names) {
  const W0 = chartWidth(host), H0 = 210;
  const lastCur = cur.reduce((a, v, i) => v != null ? i : a, -1);
  const maxV = Math.max(0.5, ...cur.filter(v => v != null), ...prev.filter(v => v != null), goalPace[nDays - 1] || 0) * 1.04;
  const { svg, box } = frame(W0, H0, { l: 34, r: 8, t: 12, b: 24 }, maxV, v => fmtNum(v, 0));
  const X = i => box.x0 + (i / (nDays - 1)) * (box.x1 - box.x0);
  const path = arr => { let d = ''; arr.forEach((v, i) => { if (v == null) return; d += (d ? 'L' : 'M') + X(i).toFixed(1) + ',' + box.y(v).toFixed(1); }); return d; };
  svg.append(sv('path', { d: path(goalPace), fill: 'none', class: 'goal' }));
  const pp = path(prev);
  if (pp) svg.append(sv('path', { d: pp, fill: 'none', style: 'stroke:var(--ghost)', 'stroke-width': 2, 'stroke-linejoin': 'round' }));
  const cp = path(cur);
  if (cp && lastCur >= 0) {
    svg.append(sv('path', { d: cp + `L${X(lastCur).toFixed(1)},${box.y0}L${X(0).toFixed(1)},${box.y0}Z`, style: 'fill:var(--accent);opacity:.12' }));
    svg.append(sv('path', { d: cp, fill: 'none', style: 'stroke:var(--accent)', 'stroke-width': 2.5, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
    svg.append(sv('circle', { cx: X(lastCur), cy: box.y(cur[lastCur]), r: 4.5, style: 'fill:var(--accent);stroke:var(--panel)', 'stroke-width': 2 }));
  }
  [1, 8, 15, 22, 29].filter(d => d <= nDays).forEach(d => svg.append(sv('text', { x: X(d - 1), y: box.y0 + 17, 'text-anchor': 'middle', class: 'tick' }, d)));
  const band = (box.x1 - box.x0) / (nDays - 1);
  for (let i = 0; i < nDays; i++) {
    const hit = sv('rect', { x: X(i) - band / 2, y: box.y1, width: band, height: box.y0 - box.y1, class: 'hit' });
    svg.append(hit);
    bindTip(hit, null, () => [`Jour ${i + 1}`, [
      cur[i] != null ? { color: 'var(--accent)', label: names[0], value: fmtDur(cur[i] * 60) } : null,
      prev[i] != null ? { color: 'var(--ghost)', label: names[1], value: fmtDur(prev[i] * 60) } : null,
      { color: 'var(--muted)', label: 'Rythme objectif', value: fmtDur(goalPace[i] * 60) },
    ].filter(Boolean)]);
  }
  host.replaceChildren(svg);
}
/** calendar heatmap: months as separate blocks, columns Monday to Sunday, weeks read left to right */
function calendar(host, firstMonth, n) {
  const W0 = chartWidth(host), t = today(), goal = S.settings.goal, f = firstDay();
  const perRow = W0 >= 480 ? 4 : 2, gapM = 22, gap = 4;
  const mw = (W0 - gapM * (perRow - 1)) / perRow;
  const cell = Math.min(30, Math.floor((mw - 6 * gap) / 7));
  const gw = 7 * cell + 6 * gap, titleH = 22, headH = 16, gridH = 6 * (cell + gap) - gap, blockH = titleH + headH + gridH;
  const rows = Math.ceil(n / perRow), rowGap = 22;
  const H0 = rows * blockH + (rows - 1) * rowGap + 2;
  const svg = sv('svg', { viewBox: `0 0 ${W0} ${H0}`, width: W0, height: H0, class: 'chart' });
  const off = (mw - gw) / 2;
  for (let m = 0; m < n; m++) {
    const ms = addMonths(firstMonth, m), d0 = fromKey(ms), nd = dim(d0.getFullYear(), d0.getMonth());
    const bx = (m % perRow) * (mw + gapM) + off, by = Math.floor(m / perRow) * (blockH + rowGap);
    let hits = 0;
    for (let i = 0; i < nd; i++) { const k = addDays(ms, i); if (k >= f && k <= t && goal > 0 && W(k) >= goal) hits++; }
    svg.append(sv('text', { x: bx, y: by + 14, class: 'lbl', style: 'font-size:13px' }, `${cap(MON_L[d0.getMonth()])}${d0.getFullYear() !== fromKey(t).getFullYear() ? ' ' + d0.getFullYear() : ''}`));
    if (hits) svg.append(sv('text', { x: bx + gw, y: by + 14, 'text-anchor': 'end', class: 'tick' }, `✓ ${hits}`));
    ['L', 'M', 'M', 'J', 'V', 'S', 'D'].forEach((l, i) => svg.append(sv('text', { x: bx + i * (cell + gap) + cell / 2, y: by + titleH + 10, 'text-anchor': 'middle', class: 'tick', style: 'font-size:10px' }, l)));
    const startDow = dow(ms);
    for (let i = 0; i < nd; i++) {
      const k = addDays(ms, i), pos = startDow + i, r = Math.floor(pos / 7), c = pos % 7;
      const x = bx + c * (cell + gap), y = by + titleH + headH + r * (cell + gap);
      const fut = k > t, v = k < f || fut ? null : W(k);
      const lvl = v == null || v <= 0 ? 0 : goal <= 0 ? 5 : v >= goal ? 5 : v >= goal * 0.75 ? 4 : v >= goal * 0.5 ? 3 : v >= goal * 0.25 ? 2 : 1;
      const style = fut ? 'fill:transparent;stroke:var(--line-2);stroke-width:1' : `fill:var(--h${lvl})${k < f ? ';opacity:.45' : ''}${k === t ? ';stroke:var(--accent);stroke-width:2' : ''}`;
      const rect = sv('rect', { x: x + (fut ? 0.5 : 0), y: y + (fut ? 0.5 : 0), width: cell - (fut ? 1 : 0), height: cell - (fut ? 1 : 0), rx: Math.min(6, cell / 4), class: 'mk', style });
      svg.append(rect);
      if (cell >= 18) svg.append(sv('text', { x: x + cell / 2, y: y + cell / 2 + 3.5, 'text-anchor': 'middle', style: `font-size:${cell >= 24 ? 10 : 9}px;pointer-events:none;fill:${lvl >= 4 && !fut ? '#fff' : 'var(--muted)'};opacity:${fut ? .5 : .9}` }, i + 1));
      const hit = sv('rect', { x: x - gap / 2, y: y - gap / 2, width: cell + gap, height: cell + gap, class: 'hit' });
      svg.append(hit);
      bindTip(hit, rect, () => [fmtDate(k), fut ? [{ label: 'À venir', value: '' }] : k < f ? [{ label: 'Avant ton premier jour', value: '' }] : [{ label: 'Travail', value: fmtDur(v) }, { label: 'Objectif', value: goal ? pct(v / goal) : '–' }]]);
    }
  }
  host.replaceChildren(svg);
}

/* ================= views ================= */
let TAB = 'today';
const LV = {};
const app = () => $('#app');

function runBanner() {
  const t = S.timer;
  if (!t || TAB === 'chrono') return null;
  const label = t.mode === 'break' ? 'Pause' : catName(t.c);
  const clk = h('span', { class: 'rb-c', id: 'rb-clock' });
  const b = h('button', { class: 'runbar', onclick: () => go('chrono') },
    h('span', { class: 'dot' + (t.runStart ? ' blink' : ''), style: `background:${t.mode === 'break' ? 'var(--ghost)' : catVar(t.c)}` }),
    h('span', { class: 'rb-t' }, (t.runStart ? '' : 'En pause : ') + label),
    clk);
  updateBannerClock(clk);
  return b;
}
function updateBannerClock(el) {
  el = el || $('#rb-clock'); const t = S.timer; if (!el || !t) return;
  const e = elapsed(t);
  el.textContent = t.mode === 'chrono' ? fmtClock(e) : fmtClock(Math.max(0, t.dur - e));
}

function faceRow(label, v, max, kind, goal, small) {
  const row = h('div', { class: `fo-row ${kind}${small ? ' fo-sm' : ''}` },
    h('span', { class: 'fo-l' }, label),
    h('div', { class: 'fo-track' }, h('i', { class: 'fo-bar', style: `width:${max > 0 ? clamp(v / max * 100, 0, 100) : 0}%` }), goal ? h('b', { class: 'fo-goal', style: `left:${clamp(goal / max * 100, 0, 100)}%`, title: 'Objectif' }) : null),
    h('span', { class: 'fo-v' }, fmtDur(v)));
  return row;
}
function verdictToday(m) {
  if (!hasData()) return { cls: 'v-neutral', ico: '●', txt: 'Lance un chrono ou ajoute du temps pour démarrer ta première journée.' };
  const d = m.today - m.yday;
  if (m.yday <= 0) return m.today > 0 ? { cls: 'v-good', ico: '▲', txt: `Hier à zéro, tu es déjà devant avec ${fmtDur(m.today)}.` } : { cls: 'v-neutral', ico: '●', txt: 'Hier à zéro. La moindre minute aujourd\'hui te fait gagner.' };
  if (d > 0.5) return { cls: 'v-good', ico: '▲', txt: `Ton toi d'hier est battu de ${fmtDur(d)}.` };
  if (Math.abs(d) <= 0.5) return { cls: 'v-neutral', ico: '●', txt: `Égalité avec hier. Une minute de plus et c'est gagné.` };
  return { cls: 'v-bad', ico: '▼', txt: `Encore ${fmtDur(-d + 1)} pour battre ton toi d'hier (${fmtDur(m.yday)}).` };
}
function verdictGoal(m) {
  if (m.goal <= 0) return null;
  if (m.todayHit) return { cls: 'v-good', ico: '✓', txt: `Objectif atteint (${pct(m.ratio)}). Tout ce qui suit est du bonus.` };
  return { cls: 'v-neutral', ico: '◎', txt: `Encore ${fmtDur(m.goal - m.today)} pour l'objectif de ${fmtDur(m.goal)}.` };
}
function verdictWeek(m) {
  if (m.first > addDays(monday(m.t), -7) && m.weekPrev <= 0) return { cls: 'v-neutral', ico: '●', txt: `Semaine en cours : ${fmtDur(m.week)}. Pas encore de semaine précédente à battre.` };
  const d = m.week - m.weekPrev;
  if (d >= 0) return { cls: 'v-good', ico: '▲', txt: `Semaine : ${fmtDur(d)} d'avance sur la semaine dernière au même jour.` };
  return { cls: 'v-bad', ico: '▼', txt: `Semaine : ${fmtDur(-d)} de retard sur la semaine dernière au même jour.` };
}
const verdictNode = v => v && h('p', { class: `verdict ${v.cls}` }, h('span', { class: 'ico', 'aria-hidden': 'true' }, v.ico), h('span', null, v.txt));

function viewToday() {
  const v = h('div', { class: 'view' });
  const cats = activeCats();
  computeLive();
  const m = metrics();
  const t = m.t;
  // top
  const fill = h('i', { style: `width:${m.goal > 0 ? clamp(m.ratio * 100, 0, 100) : 0}%` });
  const bar = h('div', { class: 'goalbar' + (m.todayHit ? ' done' : ''), role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(m.ratio * 100) }, fill);
  const heroN = h('div', { class: 'hero' }, fmtDur(m.today));
  const heroS = h('p', { class: 'hero-sub' }, m.goal > 0 ? `de travail sur ${fmtDur(m.goal)} visées` : 'de travail aujourd\'hui');
  const gWrap = h('div', { class: 'grade-wrap' }, gradeBadge(hasData() ? m.grade : '–'), h('span', { class: 'grade-cap' }, 'note du jour'));
  v.append(h('div', null, h('div', { class: 'today-top' }, h('div', null, h('p', { class: 'date' }, fmtDate(t, 'long')), heroN, heroS), gWrap), bar));
  Object.assign(LV, { heroN, fill, bar, gWrap });

  // face-off
  const maxD = Math.max(m.today, m.yday, m.goal) * 1.06 || 1;
  const rowY = faceRow("Aujourd'hui", m.today, maxD, 'you' + (m.todayHit ? ' done' : ''), m.goal);
  const rowH = faceRow('Hier', m.yday, maxD, 'ghost', m.goal);
  const vt = verdictNode(verdictToday(m));
  const maxW = Math.max(m.week, m.weekPrev) * 1.06 || 1;
  const maxM = Math.max(m.month, m.monthPrev) * 1.06 || 1;
  const fo = h('section', { class: 'card faceoff', 'aria-label': 'Toi contre toi d\'hier' },
    h('h2', null, 'Toi contre toi d\'hier'),
    h('div', { class: 'fo-group' }, rowY, rowH, vt),
    h('div', { class: 'fo-group' }, h('p', { class: 'fo-title' }, 'Semaine, comparée au même jour de la semaine dernière'),
      faceRow('Cette sem.', m.week, maxW, 'you', 0, true), faceRow('Sem. passée', m.weekPrev, maxW, 'ghost', 0, true)),
    h('div', { class: 'fo-group' }, h('p', { class: 'fo-title' }, 'Mois, comparé au même jour du mois dernier'),
      faceRow('Ce mois', m.month, maxM, 'you', 0, true), faceRow('Mois passé', m.monthPrev, maxM, 'ghost', 0, true)));
  v.append(fo);
  Object.assign(LV, { foWrap: fo });

  // streak
  if (hasData() && m.goal > 0) {
    const st = m.streak;
    let txt;
    if (m.streakAtStake) txt = [h('strong', null, `Série de ${m.streakAtStake} jour${m.streakAtStake > 1 ? 's' : ''} en jeu. `), `Atteins ${fmtDur(m.goal)} aujourd'hui pour passer à ${m.streakAtStake + 1}.`];
    else if (st > 0) txt = [h('strong', null, `Jour${st > 1 ? 's' : ''} d'affilée à l'objectif. `), st >= m.best ? 'C\'est ton record.' : `Record : ${m.best} jours.`];
    else txt = [h('strong', null, 'Aucune série en cours. '), `Atteins ${fmtDur(m.goal)} aujourd'hui pour en lancer une.`];
    v.append(h('div', { class: 'streak' }, h('b', null, String(m.streakAtStake || st)), h('p', null, txt)));
  }

  // backup reminder
  const span = idx().first ? diffDays(idx().first, t) : 0;
  if (!PREVIEW && !session && span >= 7 && Date.now() - (S.settings.lastBackup || 0) > 14 * 86400000) {
    v.append(h('button', { class: 'warnline', onclick: () => exportJSON() }, h('span', null, '⤓'), h('span', null, h('b', null, 'Sauvegarde tes données. '), S.settings.lastBackup ? 'Dernière sauvegarde il y a plus de 14 jours.' : 'Aucune sauvegarde pour l\'instant, un seul fichier suffit.')));
  }

  // categories
  const list = h('div', { class: 'list' });
  const dd = dayData(t);
  if (!cats.length) list.append(h('div', { class: 'empty' }, 'Aucune catégorie active.', h('button', { class: 'btn sm primary', onclick: () => editCat(null) }, 'Créer une catégorie')));
  cats.forEach(c => {
    const running = S.timer && S.timer.c === c.id && S.timer.mode !== 'break';
    const sub = h('span', { class: 'row-s' + (running ? ' live' : '') }, running ? 'Chrono en cours' : `${fmtDur(dd.cats[c.id] || 0)} aujourd'hui${c.counts ? '' : ', hors travail'}`);
    list.append(h('div', { class: 'row' },
      h('span', { class: 'bar-key', style: `background:var(--c${c.color})` }),
      h('button', { class: 'row-main', style: 'text-align:left', onclick: () => quickAdd(c), 'aria-label': `Ajouter du temps à ${c.name}` }, h('span', { class: 'row-t' }, c.name), sub),
      h('button', { class: 'icon-btn', 'aria-label': `Ajouter du temps à ${c.name}`, onclick: () => quickAdd(c) }, icon('plus')),
      h('button', { class: 'icon-btn primary', 'aria-label': `Lancer le chrono pour ${c.name}`, onclick: () => { if (S.timer) { go('chrono'); return; } startTimer('chrono', c.id); go('chrono'); } }, icon('play'))));
  });
  v.append(h('section', { class: 'sec' }, h('div', { class: 'sec-h' }, h('h2', null, 'Ajouter du temps'), h('p', null, 'Touche ▶ pour chronométrer')), list));

  // sessions
  const ents = S.entries.filter(e => e.d === t).sort((a, b) => (b.s || b.t) - (a.s || a.t));
  const sl = h('div', { class: 'list' });
  if (!ents.length) sl.append(h('div', { class: 'empty' }, 'Rien d\'enregistré aujourd\'hui pour l\'instant.'));
  ents.forEach(e => sl.append(entryRow(e)));
  v.append(h('section', { class: 'sec' }, h('div', { class: 'sec-h' }, h('h2', null, 'Sessions du jour'), h('p', null, ents.length ? `${ents.length} entrée${ents.length > 1 ? 's' : ''}` : '')), sl));
  return v;
}
function liveToday() {
  if (!LV.heroN || !document.body.contains(LV.heroN)) return;
  const m = metrics();
  LV.heroN.textContent = fmtDur(m.today);
  LV.fill.style.width = (m.goal > 0 ? clamp(m.ratio * 100, 0, 100) : 0) + '%';
  LV.bar.classList.toggle('done', m.todayHit);
  const g = LV.gWrap.firstChild; g.textContent = m.grade; g.className = `grade g-${m.grade}`;
  const maxD = Math.max(m.today, m.yday, m.goal) * 1.06 || 1;
  const grp = LV.foWrap.querySelector('.fo-group');
  grp.replaceChildren(faceRow("Aujourd'hui", m.today, maxD, 'you' + (m.todayHit ? ' done' : ''), m.goal), faceRow('Hier', m.yday, maxD, 'ghost', m.goal), verdictNode(verdictToday(m)));
}
const SRC = { chrono: 'chrono', timer: 'minuteur', manual: 'ajout manuel', import: 'importé' };
function entryRow(e, withDate) {
  const time = e.s ? hhmm(e.s) : (e.src === 'import' ? '' : hhmm(e.t));
  return h('button', { class: 'ent', onclick: () => editEntry(e) },
    h('span', { class: 'ent-time' }, time),
    h('span', { class: 'dot', style: `background:${catVar(e.c)}` }),
    h('span', { class: 'ent-n' }, catName(e.c), ' ', h('small', null, SRC[e.src] || ''), e.note ? h('small', null, ` · ${e.note}`) : null),
    h('span', { class: 'ent-v' }, fmtDur(e.m)));
}

function addEntry(c, minutes, d, src = 'manual', note) {
  const e = { id: uid(), d: d || today(), c, m: r1(minutes), src, t: Date.now() };
  haptic('light');
  if (note) e.note = note;
  S.entries.push(e); save();
  toast(`${fmtDur(minutes)} ajoutées à ${catName(c)}${e.d !== today() ? ' (' + fmtDate(e.d) + ')' : ''}`, () => { S.entries = S.entries.filter(x => x.id !== e.id); save(); render(); });
  render();
}
function quickAdd(c) {
  openSheet(`Ajouter à ${c.name}`, close => {
    const di = durInput(0);
    const date = h('input', { class: 'input', type: 'date', value: today(), max: today() });
    const note = h('input', { class: 'input', type: 'text', maxlength: 60, placeholder: 'Facultatif' });
    const pick = mins => { const d = date.value || today(); close(); addEntry(c.id, mins, d, 'manual', note.value.trim()); };
    return [
      h('div', { class: 'chips' }, [15, 30, 45, 60, 90, 120].map(mn => h('button', { class: 'chip', onclick: () => pick(mn) }, '+' + fmtDur(mn)))),
      h('label', { class: 'field' }, h('span', null, 'Ou une durée précise'), di),
      h('label', { class: 'field' }, h('span', null, 'Jour'), date),
      h('label', { class: 'field' }, h('span', null, 'Note'), note),
      h('button', { class: 'btn primary wide', onclick: () => { const mn = di.get(); if (mn <= 0) { toast('Indique une durée'); return; } pick(mn); } }, 'Ajouter'),
    ];
  });
}
function editEntry(e) {
  openSheet('Modifier la session', close => {
    let cat = e.c;
    const chips = h('div', { class: 'chips' });
    const drawChips = () => chips.replaceChildren(...S.cats.filter(c => !c.archived || c.id === e.c).map(c => h('button', { class: 'chip' + (c.id === cat ? ' on' : ''), onclick: () => { cat = c.id; drawChips(); } }, h('span', { class: 'dot', style: `background:var(--c${c.color})` }), c.name)));
    drawChips();
    const di = durInput(e.m);
    const date = h('input', { class: 'input', type: 'date', value: e.d, max: today() });
    const note = h('input', { class: 'input', type: 'text', maxlength: 60, value: e.note || '', placeholder: 'Facultatif' });
    return [
      h('div', { class: 'field' }, h('span', null, 'Catégorie'), chips),
      h('label', { class: 'field' }, h('span', null, 'Durée'), di),
      h('label', { class: 'field' }, h('span', null, 'Jour'), date),
      h('label', { class: 'field' }, h('span', null, 'Note'), note),
      h('div', { class: 'btns' },
        h('button', { class: 'btn danger', onclick: () => { close(); const copy = S.entries.slice(); S.entries = S.entries.filter(x => x.id !== e.id); save(); render(); toast('Session supprimée', () => { S.entries = copy; save(); render(); }); } }, 'Supprimer'),
        h('button', { class: 'btn primary', onclick: () => { const mn = di.get(); if (mn <= 0) { toast('Indique une durée'); return; } e.c = cat; e.m = mn; e.d = date.value || e.d; e.u = Date.now(); const n = note.value.trim(); if (n) e.note = n; else delete e.note; save(); close(); render(); toast('Session modifiée'); } }, 'Enregistrer')),
    ];
  });
}

/* ---------- chrono view */
let chronoMode = 'chrono', chronoCat = null, timerMin = null;
function viewChrono() {
  const v = h('div', { class: 'view' });
  const t = S.timer;
  const cats = activeCats();
  if (t) { chronoMode = t.mode === 'break' ? 'timer' : t.mode; chronoCat = t.c; }
  if (!chronoCat || !catById(chronoCat) || catById(chronoCat).archived) chronoCat = cats[0] && cats[0].id;
  if (timerMin == null) timerMin = S.settings.presets[1] || 50;
  v.append(h('h1', { class: 'page-title' }, 'Chrono'));
  const seg = h('div', { class: 'seg', role: 'tablist' },
    ['chrono', 'timer'].map(md => h('button', { class: chronoMode === md ? 'on' : '', role: 'tab', 'aria-selected': chronoMode === md ? 'true' : 'false', disabled: t ? true : null, onclick: () => { chronoMode = md; render(); } }, md === 'chrono' ? 'Chrono' : 'Minuteur')));
  v.append(seg);
  if (!cats.length) { v.append(h('div', { class: 'card empty' }, 'Crée une catégorie pour chronométrer ton temps.', h('button', { class: 'btn sm primary', onclick: () => editCat(null) }, 'Créer une catégorie'))); return v; }
  // category chips
  const chips = h('div', { class: 'chips scroll', role: 'radiogroup', 'aria-label': 'Catégorie' }, cats.map(c => h('button', {
    class: 'chip' + (c.id === chronoCat ? ' on' : ''), role: 'radio', 'aria-checked': c.id === chronoCat ? 'true' : 'false',
    onclick: () => { chronoCat = c.id; if (S.timer && S.timer.mode !== 'break') { S.timer.c = c.id; save(); } render(); },
  }, h('span', { class: 'dot', style: `background:var(--c${c.color})` }), c.name)));
  v.append(h('div', { class: 'sec' }, h('p', { class: 'sec-sub' }, t && t.mode !== 'break' ? 'Le temps ira dans cette catégorie (modifiable en cours de route)' : 'Le temps ira dans cette catégorie'), chips));
  // ring
  const R = 130, C = 2 * Math.PI * R;
  const prg = sv('circle', { cx: 150, cy: 150, r: R, fill: 'none', 'stroke-width': 14, 'stroke-linecap': 'round', class: 'prg', 'stroke-dasharray': C.toFixed(1), 'stroke-dashoffset': C.toFixed(1) });
  const ringSvg = sv('svg', { viewBox: '0 0 300 300', 'aria-hidden': 'true' }, sv('circle', { cx: 150, cy: 150, r: R, fill: 'none', 'stroke-width': 14, class: 'trk' }), prg);
  const clock = h('div', { class: 'clock', role: 'timer', 'aria-live': 'off' });
  const rl = h('div', { class: 'ring-l' });
  const rs = h('div', { class: 'ring-s' });
  const ring = h('div', { class: 'ring' }, ringSvg, h('div', { class: 'ring-c' }, rl, clock, rs));
  v.append(h('div', { class: 'timer-wrap' }, ring));
  Object.assign(LV, { clock, prg, C, rl, rs, ring });
  // presets
  if (!t && chronoMode === 'timer') {
    const pres = S.settings.presets.filter(x => x > 0);
    v.append(h('div', { class: 'sec' },
      h('div', { class: 'chips' }, pres.map(p => h('button', { class: 'chip' + (p === timerMin ? ' on' : ''), onclick: () => { timerMin = p; render(); } }, fmtDur(p)))),
      h('div', { class: 'stepper' },
        h('button', { class: 'icon-btn', 'aria-label': 'Moins 5 minutes', onclick: () => { timerMin = Math.max(5, timerMin - 5); render(); } }, icon('minus')),
        h('span', { class: 'val' }, fmtDur(timerMin)),
        h('button', { class: 'icon-btn', 'aria-label': 'Plus 5 minutes', onclick: () => { timerMin = Math.min(600, timerMin + 5); render(); } }, icon('plus')),
        h('span', { class: 'small muted' }, 'Durée du round'))));
  }
  // controls
  let ctr;
  if (!t) ctr = h('button', { class: 'btn primary wide', style: 'height:58px;font-size:19px', onclick: () => startTimer(chronoMode, chronoCat, chronoMode === 'timer' ? timerMin : 0) }, icon('play', 20), chronoMode === 'timer' ? `Lancer un round de ${fmtDur(timerMin)}` : 'Démarrer');
  else if (t.mode === 'break') ctr = h('div', { class: 'btns' }, h('button', { class: 'btn', onclick: () => finishTimer({ discard: true }) }, 'Passer la pause'), h('button', { class: 'btn primary', onclick: () => { finishTimer({ discard: true }); startTimer('timer', chronoCat, timerMin); } }, 'Round suivant'));
  else ctr = h('div', { class: 'btns' },
    t.runStart ? h('button', { class: 'btn', onclick: pauseTimer }, icon('pause', 18), 'Pause') : h('button', { class: 'btn', onclick: resumeTimer }, icon('play', 18), 'Reprendre'),
    h('button', { class: 'btn primary', onclick: () => { const r = finishTimer(); render(); } }, icon('check', 18), 'Terminer'));
  v.append(ctr);
  if (t && t.mode !== 'break') v.append(h('button', { class: 'btn sm', style: 'align-self:center;background:none;color:var(--muted)', onclick: () => confirmSheet('Annuler la session ?', 'Le temps de cette session ne sera pas enregistré.', 'Annuler la session', () => { finishTimer({ discard: true }); render(); }, true) }, 'Annuler la session sans enregistrer'));
  // options
  const rounds = S.entries.filter(e => e.d === today() && e.src === 'timer').reduce((s, e) => s.add(e.sid || e.id), new Set()).size;
  v.append(h('div', { class: 'list opts' },
    h('div', { class: 'opt' }, h('div', null, h('div', { class: 'opt-t' }, 'Écran toujours allumé'), h('div', { class: 'opt-s' }, 'Pendant que le chrono tourne')), toggle(S.settings.wake, val => { S.settings.wake = val; save(); if (val && S.timer && S.timer.runStart) wakeOn(); else wakeOff(); }, 'Écran toujours allumé')),
    h('div', { class: 'opt' }, h('div', null, h('div', { class: 'opt-t' }, 'Son en fin de round'), h('div', { class: 'opt-s' }, 'Coupé si ton iPhone est en silencieux')), toggle(S.settings.sound, val => { S.settings.sound = val; save(); }, 'Son en fin de round')),
    h('div', { class: 'opt' }, h('div', { class: 'opt-t' }, 'Rounds bouclés aujourd\'hui'), h('b', { class: 'num', style: 'font-size:20px' }, String(rounds)))));
  v.append(h('p', { class: 'note' }, 'Tu peux fermer l\'app : le chrono continue à compter. Si un round se termine pendant ton absence, sa durée est enregistrée à ton retour.'));
  liveChrono();
  return v;
}
function liveChrono() {
  if (!LV.clock || !document.body.contains(LV.clock)) return;
  const t = S.timer;
  const m = metrics();
  let ratio, label, sub, done = false, brk = false;
  if (!t) {
    if (chronoMode === 'timer') { LV.clock.textContent = fmtClock(timerMin * 60000); ratio = 0; label = 'Prêt'; sub = catName(chronoCat); }
    else { LV.clock.textContent = '00:00'; ratio = m.goal ? m.ratio : 0; label = 'Objectif du jour'; sub = `${fmtDur(m.today)} sur ${fmtDur(m.goal)}`; done = m.todayHit; }
    LV.clock.classList.remove('paused');
  } else {
    const e = elapsed(t);
    if (t.mode === 'chrono') { LV.clock.textContent = fmtClock(e); ratio = m.goal ? m.ratio : 0; label = t.runStart ? catName(t.c) : 'En pause'; sub = `Aujourd'hui ${fmtDur(m.today)} sur ${fmtDur(m.goal)}`; done = m.todayHit; }
    else { LV.clock.textContent = fmtClock(Math.max(0, t.dur - e)); ratio = t.dur ? e / t.dur : 0; brk = t.mode === 'break'; label = brk ? 'Pause' : (t.runStart ? catName(t.c) : 'En pause'); sub = brk ? 'Respire, ça repart bientôt' : `Round de ${fmtDur(t.dur / 60000)}, aujourd'hui ${fmtDur(m.today)}`; }
    LV.clock.classList.toggle('paused', !t.runStart);
  }
  LV.prg.setAttribute('stroke-dashoffset', (LV.C * (1 - clamp(ratio, 0, 1))).toFixed(1));
  LV.ring.classList.toggle('done', done); LV.ring.classList.toggle('brk', brk);
  LV.rl.textContent = label; LV.rs.textContent = sub;
}
function roundDone(res, c, dur, fromBackground) {
  render();
  openSheet('Round terminé', close => [
    h('p', { style: 'font-size:17px' }, `${fmtDur(res.total / 60000)} ajoutées à ${catName(c)}.`, fromBackground ? ' Le round s\'est terminé pendant que l\'app était fermée.' : ''),
    h('div', { class: 'btns' },
      h('button', { class: 'btn', onclick: () => { close(); startTimer('break', c, 5); go('chrono'); } }, 'Pause de 5 min'),
      h('button', { class: 'btn primary', onclick: () => { close(); startTimer('timer', c, dur / 60000); go('chrono'); } }, 'Round suivant')),
    h('button', { class: 'btn wide', style: 'background:none;color:var(--muted)', onclick: close }, 'Fermer'),
  ]);
}

/* ---------- stats view */
const dcl = d => d > 0.5 ? 'up' : d < -0.5 ? 'down' : '';
function navBar(o) {
  return h('div', { class: 'pnav' + (o.small ? ' sm' : '') },
    h('button', { class: 'icon-btn', 'aria-label': 'Précédent', disabled: o.canPrev === false ? true : null, onclick: () => { hideTip(); o.onPrev(); } }, icon('chevL')),
    h('div', { class: 'pnav-t' }, h('div', { class: 'pnav-title' }, o.title),
      h('div', { class: 'pnav-sub' }, o.sub ? h('span', null, o.sub) : null, o.onToday ? h('button', { class: 'linkbtn', onclick: () => { hideTip(); o.onToday(); } }, 'Revenir à aujourd\'hui') : null)),
    h('button', { class: 'icon-btn', 'aria-label': 'Suivant', disabled: o.canNext === false ? true : null, onclick: () => { hideTip(); o.onNext(); } }, icon('chev')));
}
function bindSwipe(el, onPrev, onNext, canPrev, canNext) {
  let sx = null, sy = null;
  el.style.touchAction = 'pan-y';
  el.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse') return; sx = e.clientX; sy = e.clientY; });
  el.addEventListener('pointerup', e => {
    if (sx == null) return; const dx = e.clientX - sx, dy = e.clientY - sy; sx = null;
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.4) { hideTip(); if (dx > 0 && canPrev !== false) onPrev(); else if (dx < 0 && canNext !== false) onNext(); }
  });
  el.addEventListener('pointercancel', () => { sx = null; });
}
function chartCard(title, sub, legend, nav) {
  const host = h('div', { class: 'chart-host' });
  const card = h('section', { class: 'chart-card' }, h('div', { class: 'sec-h' }, h('h2', null, title)), nav ? navBar(Object.assign({ small: true }, nav)) : null, sub ? h('p', { class: 'card-sub' }, sub) : null, host, legend ? h('div', { class: 'legend' }, legend) : null);
  if (nav) bindSwipe(card, nav.onPrev, nav.onNext, nav.canPrev, nav.canNext);
  return { card, host };
}
const addMonths = (ms, n) => { const d = fromKey(ms); return ymd(new Date(d.getFullYear(), d.getMonth() + n, 1, 12)); };
const monthName = (ms, short) => { const d = fromKey(ms); return short ? MON_S[d.getMonth()] : MON_L[d.getMonth()]; };
const minNav = () => addMonths(monthStart(today()), -60);
let raceM = null, regEnd = null, wdM = null, yrEnd = null;
function relMonth(ms) {
  const t = fromKey(today()), a = fromKey(ms), n = (t.getFullYear() - a.getFullYear()) * 12 + t.getMonth() - a.getMonth();
  return n === 0 ? 'Ce mois' : n === 1 ? 'Mois dernier' : `Il y a ${n} mois`;
}
const lg = (cls, color, label) => h('span', null, h('i', { class: cls || '', style: color ? (cls === 'ln' ? `border-color:${color}` : `background:${color}`) : '' }), label);
const pending = [];
const weeklyGoal = () => S.cats.filter(c => !c.archived && c.counts).reduce((s, c) => s + (c.wg || 0), 0) || S.settings.goal * 7;

let stMode = 'week', stAnchor = null, stSlide = '';
function periodOf(mode, anchor) {
  if (mode === 'day') return { mode, start: anchor, end: anchor, prevStart: addDays(anchor, -1), prevEnd: addDays(anchor, -1) };
  if (mode === 'week') { const s = monday(anchor); return { mode, start: s, end: addDays(s, 6), prevStart: addDays(s, -7), prevEnd: addDays(s, -1) }; }
  const s = monthStart(anchor), d = fromKey(s);
  return { mode, start: s, end: ymd(new Date(d.getFullYear(), d.getMonth() + 1, 0, 12)), prevStart: ymd(new Date(d.getFullYear(), d.getMonth() - 1, 1, 12)), prevEnd: addDays(s, -1) };
}
function periodCuts(P) {
  const t = today(), cur = P.start <= t && t <= P.end;
  let pCut = P.prevEnd;
  if (cur && P.mode === 'week') pCut = addDays(t, -7);
  if (cur && P.mode === 'month') pCut = prevMonthSame(t);
  return { cur, cut: cur ? t : P.end, pCut };
}
function periodNames(P) {
  const t = today(), a = fromKey(P.start), b = fromKey(P.end);
  if (P.mode === 'day') {
    const n = diffDays(P.start, t);
    return { title: fmtDate(P.start, 'long'), sub: n === 0 ? "Aujourd'hui" : n === 1 ? 'Hier' : `Il y a ${n} jours`, prev: 'la veille', prevShort: 'Veille', cur: 'Ce jour', swipe: 'jour' };
  }
  if (P.mode === 'week') {
    const n = Math.round(diffDays(P.start, monday(t)) / 7);
    return { title: `Du ${a.getDate()} ${MON_S[a.getMonth()]} au ${b.getDate()} ${MON_S[b.getMonth()]}`, sub: n === 0 ? 'Cette semaine' : n === 1 ? 'Semaine dernière' : `Il y a ${n} semaines`, prev: 'la semaine précédente', prevShort: 'Semaine précédente', cur: 'Cette semaine', swipe: 'semaine' };
  }
  const tm = fromKey(t), n = (tm.getFullYear() - a.getFullYear()) * 12 + tm.getMonth() - a.getMonth();
  return { title: `${cap(MON_L[a.getMonth()])} ${a.getFullYear()}`, sub: n === 0 ? 'Ce mois' : n === 1 ? 'Mois dernier' : `Il y a ${n} mois`, prev: 'le mois précédent', prevShort: 'Mois précédent', cur: 'Ce mois', swipe: 'mois' };
}
function shiftPeriod(dir) {
  const P = periodOf(stMode, stAnchor);
  if (dir < 0 && P.start <= minNav()) return;
  const a = P.mode === 'day' ? addDays(P.start, dir) : dir < 0 ? P.prevEnd : addDays(P.end, 1);
  if (a > today()) return;
  stAnchor = a; stSlide = dir < 0 ? 'from-left' : 'from-right'; render();
}
function goalFor(P) { return P.mode === 'day' ? 1 / 7 : P.mode === 'week' ? 1 : (diffDays(P.start, P.end) + 1) / 7; }

function periodCard() {
  const t = today(), goal = S.settings.goal, f = firstDay();
  const P = periodOf(stMode, stAnchor), C = periodCuts(P), N = periodNames(P);
  const tot = sumW(P.start, C.cut), ptot = sumW(P.prevStart, C.pCut), d = tot - ptot;
  const noPrev = P.prevEnd < f, before = P.end < f;
  const canPrev = P.start > minNav(), canNext = !C.cur;
  const nav = navBar({ title: N.title, sub: N.sub, canPrev, canNext, onPrev: () => shiftPeriod(-1), onNext: () => shiftPeriod(1), onToday: C.cur ? null : () => { stAnchor = today(); stSlide = 'from-right'; render(); } });
  const cmpTxt = before ? `Avant ton premier jour suivi (${fmtDate(f)})` : noPrev ? 'Pas encore de période précédente' : `vs ${N.prev}${C.cur && P.mode !== 'day' ? ' au même jour' : ''} (${fmtDur(ptot)})`;
  const total = h('div', { class: 'ptotal' },
    h('div', null, h('div', { class: 'pbig' }, fmtDur(tot)), h('div', { class: 'small muted' }, C.cur && P.mode !== 'day' ? 'de travail jusqu\'ici' : 'de travail')),
    h('div', { class: 'pdelta ' + (noPrev ? '' : dcl(d)) }, noPrev ? null : h('b', null, (d > 0.5 ? '▲ ' : d < -0.5 ? '▼ ' : '') + fmtDelta(d)), h('span', null, cmpTxt)));
  // objective line
  let hitsNode;
  if (P.mode === 'day') {
    const v = W(P.start);
    hitsNode = goal <= 0 ? null : v >= goal ? h('p', { class: 'hits v-good' }, `✓ Objectif atteint (${pct(v / goal)})`) : C.cur ? h('p', { class: 'hits' }, `Encore ${fmtDur(goal - v)} pour l'objectif de ${fmtDur(goal)}`) : h('p', { class: 'hits v-bad' }, `Objectif manqué de ${fmtDur(goal - v)} (${pct(v / goal)})`);
  } else {
    let hits = 0, n = 0; const dots = [];
    for (let k = P.start; k <= P.end; k = addDays(k, 1)) {
      const v = W(k), ok = goal > 0 && v >= goal, done = k < t || ok;
      if (k >= f && k <= t && done) { n++; if (ok) hits++; }
      if (P.mode === 'week') dots.push(h('i', { class: k > t || k < f ? '' : ok ? 'hit' : k === t ? 'now' : 'miss', title: fmtDate(k) }));
    }
    hitsNode = h('div', { class: 'hits' }, P.mode === 'week' ? h('span', { class: 'hdots', 'aria-hidden': 'true' }, dots) : null,
      h('span', null, h('b', null, `${hits} jour${hits > 1 ? 's' : ''}`), ` à l'objectif sur ${n}`));
  }
  // chart
  const host = h('div', { class: 'chart-host' });
  let legend = [];
  if (P.mode === 'week') {
    const groups = [];
    for (let i = 0; i < 7; i++) {
      const k = addDays(P.start, i), kp = addDays(k, -7), fut = k > t;
      const v = fut ? 0 : W(k) / 60, pv = kp >= f ? W(kp) / 60 : 0, ok = goal > 0 && v * 60 >= goal;
      groups.push({ l1: DOW_S[i], l2: String(fromKey(k).getDate()), strong: k === t, cur: v, prev: pv, fill: ok ? 'var(--good)' : 'var(--accent)',
        tip: [fmtDate(k), [{ color: ok ? 'var(--good)' : 'var(--accent)', label: 'Ce jour', value: fut ? '–' : fmtDur(v * 60) }, { color: 'var(--ghost)', label: `${DOW_L[i]} d'avant`, value: fmtDur(pv * 60) }]] });
    }
    pending.push(() => grouped(host, groups, { goal: goal / 60 }));
    legend = [lg('', 'var(--good)', 'Objectif atteint'), lg('', 'var(--accent)', 'Sous l\'objectif'), lg('gh', null, 'Semaine précédente'), lg('dash', null, `Objectif ${fmtDur(goal)}`)];
  } else if (P.mode === 'month') {
    const data = [], nD = diffDays(P.start, P.end) + 1;
    for (let i = 0; i < nD; i++) {
      const k = addDays(P.start, i), fut = k > t, v = fut ? 0 : W(k) / 60, ok = goal > 0 && v * 60 >= goal;
      data.push({ label: String(i + 1), v, strong: k === t, fill: ok ? 'var(--good)' : 'var(--accent)', tip: [fmtDate(k), [{ label: 'Travail', value: fut ? '–' : fmtDur(v * 60) }, { label: 'Objectif', value: goal && !fut ? pct(v * 60 / goal) : '–' }]] });
    }
    pending.push(() => columns(host, data, { goal: goal / 60, height: 190, labelAt: i => [0, 4, 9, 14, 19, 24, 29].includes(i) && i < nD }));
    legend = [lg('', 'var(--good)', 'Objectif atteint'), lg('', 'var(--accent)', 'Sous l\'objectif'), lg('dash', null, `Objectif ${fmtDur(goal)}`)];
  } else {
    const cur = dayData(P.start), prv = P.prevStart >= f ? dayData(P.prevStart) : { cats: {} };
    const rows = S.cats.filter(c => (cur.cats[c.id] || 0) > 0 || (prv.cats[c.id] || 0) > 0)
      .map(c => ({ label: c.name, v: (cur.cats[c.id] || 0) / 60, pv: (prv.cats[c.id] || 0) / 60, fill: `var(--c${c.color})`, tip: [c.name, [{ label: 'Ce jour', value: fmtDur(cur.cats[c.id] || 0) }, { color: 'var(--ghost)', label: 'La veille', value: fmtDur(prv.cats[c.id] || 0) }]] }));
    if (rows.length) { pending.push(() => hbars(host, rows)); legend = []; }
    else host.append(h('p', { class: 'empty' }, 'Rien d\'enregistré ce jour‑là.'));
  }
  // categories table
  const sc = goalFor(P);
  const tb = h('table', { class: 'ctable' }, h('thead', null, h('tr', null, h('th', null, 'Catégorie'), h('th', null, 'Temps'), h('th', null, 'Écart'), h('th', null, 'Objectif'))));
  const body = h('tbody');
  let totW = 0, totP = 0;
  S.cats.filter(c => !c.archived || sumCat(c.id, P.start, C.cut) > 0).forEach(c => {
    const w = sumCat(c.id, P.start, C.cut), p = noPrev ? 0 : sumCat(c.id, P.prevStart, C.pCut), dd = w - p, g = (c.wg || 0) * sc;
    if (c.counts) { totW += w; totP += p; }
    const ratio = g ? w / g : null;
    body.append(h('tr', null,
      h('td', null, h('div', { class: 'cn' }, h('span', { class: 'dot', style: `background:var(--c${c.color})` }), h('span', null, c.name, !c.counts ? h('span', { class: 'tag' }, ' hors travail') : null)),
        g ? h('div', { class: 'mini' }, h('i', { style: `width:${clamp(ratio * 100, 0, 100)}%;background:${ratio >= 1 ? 'var(--good)' : `var(--c${c.color})`}` })) : null),
      h('td', null, fmtDur(w)), h('td', { class: noPrev ? '' : dcl(dd) }, noPrev ? '–' : fmtDelta(dd)), h('td', null, g ? pct(ratio) : '–')));
  });
  const dT = totW - totP, gT = weeklyGoal() * sc;
  body.append(h('tr', { class: 'tot' }, h('td', null, 'Total travail'), h('td', null, fmtDur(totW)), h('td', { class: noPrev ? '' : dcl(dT) }, noPrev ? '–' : fmtDelta(dT)), h('td', null, gT ? pct(totW / gT) : '–')));
  tb.append(body);

  const leg = legend.length ? h('div', { class: 'legend' }, legend) : null;
  const pbody = P.mode === 'day'
    ? h('div', { class: 'pbody ' + stSlide }, total, hitsNode, h('div', { class: 'pdiv' }), h('div', { class: 'sec-h stack' }, h('h2', { style: 'font-size:17px' }, 'Par catégorie'), h('p', null, 'barre fine : la veille')), host, leg)
    : h('div', { class: 'pbody ' + stSlide }, total, hitsNode, host, leg,
    h('div', { class: 'pdiv' }), h('div', { class: 'sec-h stack' }, h('h2', { style: 'font-size:17px' }, 'Par catégorie'), h('p', null, noPrev ? '' : `écart avec ${N.prev}${C.cur && P.mode !== 'day' ? ' au même jour' : ''}`)), h('div', { class: 'tscroll' }, tb));
  stSlide = '';
  const card = h('section', { class: 'card pcard', 'aria-label': 'Analyse par période' }, nav, pbody, h('p', { class: 'swipe-hint' }, `Glisse vers la droite pour voir ${N.prev}`));
  bindSwipe(card, () => shiftPeriod(-1), () => shiftPeriod(1), canPrev, canNext);
  return { card, P };
}
function raceCard() {
  const t = today(), f = firstDay(), goalH = S.settings.goal / 60, curM = monthStart(t);
  if (!raceM || raceM > curM) raceM = curM;
  const ms = raceM;
  const d0 = fromKey(ms), nD = dim(d0.getFullYear(), d0.getMonth());
  const pms = addMonths(ms, -1), pd = fromKey(pms), pnD = dim(pd.getFullYear(), pd.getMonth());
  const hasPrev = addDays(pms, pnD - 1) >= f;
  const cur = [], prev = [], pace = [];
  let a = 0, b = 0;
  for (let i = 0; i < nD; i++) {
    const k = addDays(ms, i);
    if (k <= t) { a += W(k); cur.push(a / 60); } else cur.push(null);
    if (i < pnD && hasPrev) { b += W(addDays(pms, i)); prev.push(b / 60); } else prev.push(null);
    pace.push(goalH * (i + 1));
  }
  const isCur = ms === curM;
  const prevSame = isCur ? sumW(pms, prevMonthSame(t)) : b;
  const mN = monthName(ms), pN = monthName(pms);
  const sub = !hasPrev ? `${fmtDur(a)} de travail, objectif du mois ${fmtDur(goalH * 60 * nD)}.` : `${fmtDur(a)} contre ${fmtDur(prevSame)} ${isCur ? `au même jour en ${pN}` : `en ${pN}`}.`;
  const c = chartCard('La course du mois', sub, [lg('ln', 'var(--accent)', cap(mN)), hasPrev ? lg('ln', 'var(--ghost)', cap(pN)) : null, lg('dash', null, 'Rythme de l\'objectif')], {
    title: `${cap(mN)} ${d0.getFullYear()}`, sub: relMonth(ms), canPrev: ms > minNav(), canNext: ms < curM,
    onPrev: () => { raceM = addMonths(ms, -1); render(); }, onNext: () => { raceM = addMonths(ms, 1); render(); },
  });
  pending.push(() => race(c.host, cur, prev, pace, nD, [cap(mN), cap(pN)]));
  return c.card;
}
function viewStats() {
  const v = h('div', { class: 'view' });
  computeLive();
  v.append(h('h1', { class: 'page-title' }, 'Stats'));
  if (!hasData()) { v.append(h('div', { class: 'card empty' }, 'Tes stats apparaîtront dès ta première session.', h('button', { class: 'btn sm primary', onclick: () => go('chrono') }, 'Lancer un chrono'))); return v; }
  const t = today(), f = firstDay(), goal = S.settings.goal;
  if (!stAnchor || stAnchor > t) stAnchor = t;
  const curM = monthStart(t);
  const P0 = periodOf(stMode, stAnchor), C0 = periodCuts(P0);
  v.append(h('div', { class: 'seg', role: 'tablist', 'aria-label': 'Période' }, [['day', 'Jour'], ['week', 'Semaine'], ['month', 'Mois']].map(([k, l]) => h('button', {
    class: stMode === k ? 'on' : '', role: 'tab', 'aria-selected': stMode === k ? 'true' : 'false',
    onclick: () => { if (stMode === k) return; stAnchor = C0.cur ? t : P0.end; stMode = k; render(); },
  }, l))));
  const { card, P } = periodCard();
  v.append(card);
  v.append(raceCard());
  // regularity: 4 months per page, calendar layout
  {
    if (!regEnd || regEnd > curM) regEnd = curM;
    const first = addMonths(regEnd, -3), last = regEnd;
    let hits = 0, days = 0;
    for (let k = first < monthStart(f) ? monthStart(f) : first; k <= t && k <= addDays(addMonths(last, 1), -1); k = addDays(k, 1)) {
      if (k < f) continue; const ok = goal > 0 && W(k) >= goal; if (k < t || ok) { days++; if (ok) hits++; }
    }
    const fy = fromKey(first).getFullYear(), ly = fromKey(last).getFullYear();
    const title = `${cap(monthName(first, true))}${fy !== ly ? ' ' + fy : ''} à ${monthName(last, true)} ${ly}`;
    const c = chartCard('Régularité', days ? `${hits} jour${hits > 1 ? 's' : ''} à l'objectif sur ${days} suivis. Une case par jour, plus elle est verte, plus tu t'approches de l'objectif.` : 'Une case par jour, plus elle est verte, plus tu t\'approches de l\'objectif.',
      [lg('', 'var(--h0)', 'rien'), lg('', 'var(--h2)', '25 à 49 %'), lg('', 'var(--h4)', '75 à 99 %'), lg('', 'var(--h5)', 'objectif atteint')], {
        title, sub: last === curM ? '4 derniers mois' : '4 mois', canPrev: first > minNav(), canNext: last < curM,
        onPrev: () => { regEnd = addMonths(regEnd, -4); render(); }, onNext: () => { const n = addMonths(regEnd, 4); regEnd = n > curM ? curM : n; render(); },
        onToday: last === curM ? null : () => { regEnd = curM; render(); },
      });
    v.append(c.card); pending.push(() => calendar(c.host, first, 4));
  }
  // weekday averages, month by month
  {
    if (!wdM || wdM > curM) wdM = curM;
    const ms = wdM, me = addDays(addMonths(ms, 1), -1);
    const sums = Array(7).fill(0), cnt = Array(7).fill(0);
    for (let k = ms; k <= me && k < t; k = addDays(k, 1)) { if (k < f) continue; const d = dow(k); sums[d] += W(k); cnt[d]++; }
    const avg = sums.map((x, i) => cnt[i] ? x / cnt[i] : null);
    let minI = -1; avg.forEach((a, i) => { if (a != null && (minI < 0 || a < avg[minI])) minI = i; });
    const data = DOW_S.map((l, i) => ({ label: l, v: (avg[i] || 0) / 60, fill: i === minI ? 'var(--ghost)' : 'var(--accent)', tip: [cap(DOW_L[i]), [{ label: 'Moyenne', value: avg[i] == null ? '–' : fmtDur(avg[i]) }, { label: 'Jours comptés', value: String(cnt[i]) }]] }));
    const c = chartCard('Tes jours de la semaine', minI >= 0 ? `Moyenne par jour de la semaine sur le mois. Ton jour le plus faible : le ${DOW_L[minI]}.` : 'Pas encore de journée complète sur ce mois.',
      [lg('', 'var(--accent)', 'Moyenne'), minI >= 0 ? lg('', 'var(--ghost)', 'Jour le plus faible') : null, lg('dash', null, `Objectif ${fmtDur(goal)}`)], {
        title: `${cap(monthName(ms))} ${fromKey(ms).getFullYear()}`, sub: relMonth(ms), canPrev: ms > minNav(), canNext: ms < curM,
        onPrev: () => { wdM = addMonths(ms, -1); render(); }, onNext: () => { wdM = addMonths(ms, 1); render(); },
        onToday: ms === curM ? null : () => { wdM = curM; render(); },
      });
    v.append(c.card); pending.push(() => columns(c.host, data, { goal: goal / 60, labels: true, labelFmt: d => d.v ? hLabel(d.v) : '' }));
  }
  // 12 months, page by page
  {
    if (!yrEnd || yrEnd > curM) yrEnd = curM;
    const data = [], firstM = addMonths(yrEnd, -11);
    let tot12 = 0;
    for (let i = 0; i < 12; i++) {
      const a = addMonths(firstM, i), b0 = addDays(addMonths(a, 1), -1), b = b0 > t ? t : b0;
      const tot = b < f || a > t ? 0 : sumW(a < f ? f : a, b);
      tot12 += tot;
      data.push({ label: cap(monthName(a, true)).replace('.', '').slice(0, 4), v: tot / 60, strong: a === curM, fill: 'var(--accent)', opacity: a === curM ? 0.6 : null,
        onPick: () => { stMode = 'month'; stAnchor = a; stSlide = ''; render(); app().scrollTop = 0; } });
    }
    const fy = fromKey(firstM).getFullYear(), ly = fromKey(yrEnd).getFullYear();
    const c = chartCard('12 mois', `${fmtDur(tot12)} sur la période. Touche un mois pour l'analyser en détail.`, null, {
      title: `${cap(monthName(firstM, true))} ${fy} à ${monthName(yrEnd, true)} ${ly}`, sub: yrEnd === curM ? '12 derniers mois' : '', canPrev: firstM > minNav(), canNext: yrEnd < curM,
      onPrev: () => { yrEnd = addMonths(yrEnd, -12); render(); }, onNext: () => { const n = addMonths(yrEnd, 12); yrEnd = n > curM ? curM : n; render(); },
      onToday: yrEnd === curM ? null : () => { yrEnd = curM; render(); },
    });
    v.append(c.card); pending.push(() => columns(c.host, data, { labels: true, labelFmt: d => d.v ? fmtNum(d.v, 0) : '', labelAt: i => i % 2 === 1 }));
  }
  return v;
}

/* ---------- journal */
let journalLimit = 45;
const openDays = new Set();
function viewJournal() {
  const v = h('div', { class: 'view' });
  computeLive();
  v.append(h('div', { class: 'today-top', style: 'align-items:center' }, h('h1', { class: 'page-title' }, 'Journal'), h('button', { class: 'btn sm primary', onclick: () => addPastEntry() }, icon('plus', 16), 'Ajouter')));
  const keys = [...new Set(S.entries.map(e => e.d).concat(LIVE.size ? [...LIVE.keys()] : []))].sort().reverse();
  if (!keys.length) { v.append(h('div', { class: 'card empty' }, 'Ton journal est vide. Chaque session apparaîtra ici, jour par jour.')); return v; }
  const goal = S.settings.goal;
  let lastMonth = '';
  keys.slice(0, journalLimit).forEach(k => {
    const mk = k.slice(0, 7);
    if (mk !== lastMonth) { const d = fromKey(k); v.append(h('p', { class: 'month-h' }, `${cap(MON_L[d.getMonth()])} ${d.getFullYear()}`)); lastMonth = mk; }
    const dd = dayData(k);
    const g = gradeOf(goal ? dd.work / goal : 0);
    const stack = h('div', { class: 'stack' }, S.cats.filter(c => dd.cats[c.id] > 0).map(c => h('i', { style: `flex:${dd.cats[c.id]};background:var(--c${c.color})` })));
    const open = openDays.has(k);
    const body = h('div', { class: 'day-body' });
    if (open) S.entries.filter(e => e.d === k).sort((a, b) => (a.s || a.t) - (b.s || b.t)).forEach(e => body.append(entryRow(e)));
    const card = h('div', { class: 'day' },
      h('button', { class: 'day-h', 'aria-expanded': open ? 'true' : 'false', onclick: () => { open ? openDays.delete(k) : openDays.add(k); render(); } },
        gradeBadge(g),
        h('div', { class: 'day-main' }, h('div', { class: 'day-t' }, relDay(k)), stack),
        h('div', { class: 'day-v' }, fmtDur(dd.work), h('small', { class: dd.work >= goal && goal ? 'v-good' : 'muted' }, dd.all > dd.work ? `${fmtDur(dd.all)} au total` : (goal ? pct(dd.work / goal) : '')))),
      open ? body : null);
    v.append(card);
  });
  if (keys.length > journalLimit) v.append(h('button', { class: 'btn wide', onclick: () => { journalLimit += 60; render(); } }, 'Afficher plus de jours'));
  return v;
}
function addPastEntry() {
  const cats = activeCats();
  if (!cats.length) { editCat(null); return; }
  openSheet('Ajouter une session', close => {
    let cat = cats[0].id;
    const chips = h('div', { class: 'chips' });
    const draw = () => chips.replaceChildren(...cats.map(c => h('button', { class: 'chip' + (c.id === cat ? ' on' : ''), onclick: () => { cat = c.id; draw(); } }, h('span', { class: 'dot', style: `background:var(--c${c.color})` }), c.name)));
    draw();
    const di = durInput(60);
    const date = h('input', { class: 'input', type: 'date', value: addDays(today(), -1), max: today() });
    return [
      h('div', { class: 'field' }, h('span', null, 'Catégorie'), chips),
      h('label', { class: 'field' }, h('span', null, 'Durée'), di),
      h('label', { class: 'field' }, h('span', null, 'Jour'), date),
      h('button', { class: 'btn primary wide', onclick: () => { const mn = di.get(); if (mn <= 0) { toast('Indique une durée'); return; } close(); addEntry(cat, mn, date.value || today()); } }, 'Ajouter'),
    ];
  });
}

/* ---------- settings */
function viewSettings() {
  const v = h('div', { class: 'view' });
  const st = S.settings;
  v.append(h('h1', { class: 'page-title' }, 'Réglages'));
  const acct = accountSection(); if (acct) v.append(acct);
  // goals
  const goalVal = h('span', { class: 'val' }, fmtDur(st.goal));
  v.append(h('section', { class: 'sec' }, h('div', { class: 'sec-h' }, h('h2', null, 'Objectif')),
    h('div', { class: 'list opts' },
      h('div', { class: 'opt' }, h('div', null, h('div', { class: 'opt-t' }, 'Travail par jour'), h('div', { class: 'opt-s' }, 'Sert à la note, à la série et à la heatmap')),
        h('div', { class: 'stepper' }, h('button', { class: 'icon-btn', 'aria-label': 'Moins 30 minutes', onclick: () => { st.goal = Math.max(30, st.goal - 30); save(); render(); } }, icon('minus')), goalVal, h('button', { class: 'icon-btn', 'aria-label': 'Plus 30 minutes', onclick: () => { st.goal = Math.min(960, st.goal + 30); save(); render(); } }, icon('plus')))),
      h('div', { class: 'opt' }, h('div', null, h('div', { class: 'opt-t' }, 'Fin de journée'), h('div', { class: 'opt-s' }, 'Le temps fait après minuit compte pour la veille jusqu\'à cette heure')),
        (() => { const s = h('select', { class: 'input', style: 'width:96px', 'aria-label': 'Fin de journée' }, [0, 1, 2, 3, 4, 5].map(x => h('option', { value: x }, x === 0 ? 'Minuit' : `${x} h`))); s.value = st.dayEnd; s.addEventListener('change', () => { st.dayEnd = +s.value; save(); render(); }); return s; })()))));
  // categories
  const list = h('div', { class: 'list' });
  const act = activeCats();
  act.forEach((c, i) => list.append(h('div', { class: 'row' },
    h('span', { class: 'dot', style: `background:var(--c${c.color})` }),
    h('button', { class: 'row-main', style: 'text-align:left', onclick: () => editCat(c) }, h('span', { class: 'row-t' }, c.name), h('span', { class: 'row-s' }, `${c.counts ? 'Compte dans le travail' : 'Hors travail'}${c.wg ? `, objectif ${fmtDur(c.wg)} par semaine` : ''}`)),
    h('button', { class: 'icon-btn ghost', 'aria-label': `Monter ${c.name}`, disabled: i === 0 ? true : null, style: i === 0 ? 'opacity:.25' : '', onclick: () => moveCat(c, -1) }, icon('up')),
    h('button', { class: 'icon-btn ghost', 'aria-label': `Descendre ${c.name}`, disabled: i === act.length - 1 ? true : null, style: i === act.length - 1 ? 'opacity:.25' : '', onclick: () => moveCat(c, 1) }, icon('down')))));
  list.append(h('button', { class: 'row', onclick: () => editCat(null) }, h('span', { class: 'icon-btn primary', style: 'width:32px;height:32px;border-radius:10px' }, icon('plus', 16)), h('span', { class: 'row-t', style: 'color:var(--tint)' }, 'Nouvelle catégorie')));
  const arch = S.cats.filter(c => c.archived);
  v.append(h('section', { class: 'sec' }, h('div', { class: 'sec-h' }, h('h2', null, 'Catégories'), h('p', null, 'Touche pour modifier')), list,
    arch.length ? h('div', { class: 'list' }, arch.map(c => h('button', { class: 'row', onclick: () => editCat(c) }, h('span', { class: 'dot', style: `background:var(--c${c.color});opacity:.5` }), h('span', { class: 'row-main' }, h('span', { class: 'row-t muted' }, c.name), h('span', { class: 'row-s' }, 'Archivée, historique conservé'))))) : null));
  // timer presets
  const presIn = st.presets.map((p, i) => { const inp = h('input', { class: 'input', type: 'number', inputmode: 'numeric', min: 5, max: 600, value: p, style: 'width:76px;text-align:center', 'aria-label': `Durée de round ${i + 1} en minutes` }); inp.addEventListener('change', () => { const x = clamp(parseInt(inp.value, 10) || 0, 5, 600); st.presets[i] = x; inp.value = x; save(); }); return inp; });
  v.append(h('section', { class: 'sec' }, h('div', { class: 'sec-h' }, h('h2', null, 'Minuteur'), h('p', null, 'durées proposées, en minutes')),
    h('div', { class: 'list opts' }, h('div', { class: 'opt' }, h('div', { class: 'opt-t' }, 'Rounds'), h('div', { class: 'btns', style: 'gap:8px' }, presIn)))));
  // grades
  const gl = ['S', 'A', 'B', 'C'];
  v.append(h('section', { class: 'sec' }, h('div', { class: 'sec-h' }, h('h2', null, 'Barème des notes'), h('p', null, '% de l\'objectif du jour')),
    h('div', { class: 'list opts' }, gl.map((g, i) => {
      const inp = h('input', { class: 'input', type: 'number', inputmode: 'numeric', min: 1, max: 300, value: st.grades[i], style: 'width:84px;text-align:center', 'aria-label': `Seuil de la note ${g}` });
      inp.addEventListener('change', () => { const arr = st.grades.slice(); arr[i] = clamp(parseInt(inp.value, 10) || 0, 1, 300); for (let j = 1; j < 4; j++) if (arr[j] > arr[j - 1]) { toast('Les seuils doivent décroître de S à C'); inp.value = st.grades[i]; return; } st.grades = arr; save(); });
      return h('div', { class: 'opt' }, h('div', { style: 'display:flex;align-items:center;gap:12px' }, gradeBadge(g), h('span', { class: 'opt-t' }, 'à partir de')), h('div', { class: 'dur-in' }, inp, h('span', null, '%')));
    }), h('div', { class: 'opt' }, h('div', { style: 'display:flex;align-items:center;gap:12px' }, gradeBadge('D'), h('span', { class: 'opt-t' }, 'en dessous de C'))))));
  const rem = remindersSection(); if (rem) v.append(rem);
  // appearance
  v.append(h('section', { class: 'sec' }, h('div', { class: 'sec-h' }, h('h2', null, 'Apparence')),
    h('div', { class: 'seg' }, [['auto', 'Auto'], ['dark', 'Sombre'], ['light', 'Clair']].map(([k, l]) => h('button', { class: st.theme === k ? 'on' : '', onclick: () => { st.theme = k; save(); applyTheme(); render(); } }, l)))));
  // data
  const lb = st.lastBackup ? `Dernière sauvegarde le ${fmtDate(ymd(new Date(st.lastBackup)))}` : 'Aucune sauvegarde pour l\'instant';
  v.append(h('section', { class: 'sec' }, h('div', { class: 'sec-h' }, h('h2', null, 'Données'), h('p', null, lb)),
    h('div', { class: 'list' },
      setRow('Sauvegarder', 'Un fichier à garder dans Fichiers ou iCloud Drive', exportJSON),
      setRow('Restaurer une sauvegarde', 'Remplace les données de l\'app', importJSON),
      setRow('Exporter pour Excel', 'Un CSV avec une ligne par jour et une colonne par catégorie', exportCSV),
      setRow('Importer depuis Notes ou Excel', 'Colle ton tableau, l\'app reconnaît dates et durées', importTable),
      session ? null : setRow('Charger des données d\'exemple', 'Remplace tout par 10 semaines d\'exemple', () => confirmSheet('Charger l\'exemple ?', 'Tes données actuelles seront remplacées. Fais une sauvegarde avant si besoin.', 'Charger l\'exemple', loadDemo, true)),
      setRow('Tout effacer', session ? 'Efface cet iPhone et te déconnecte' : 'Supprime catégories et sessions', () => confirmSheet('Tout effacer ?', session ? 'Les données de cet iPhone seront effacées et tu seras déconnecté. Ce qui est sauvegardé dans ton compte reste disponible.' : 'Cette action est définitive. Sauvegarde d\'abord si tu veux pouvoir revenir en arrière.', 'Tout effacer', async () => { if (session) await cloudSignOut(); replaceState(defaults()); applyTheme(); TAB = 'today'; render(); onboarding(); }, true), true)),
    h('p', { class: 'note' }, NATIVE
      ? (session ? 'Tes heures sont enregistrées sur cet iPhone et sauvegardées dans ton compte.' : 'Tes heures sont enregistrées uniquement sur cet iPhone. Crée un compte ou fais une sauvegarde régulière pour ne rien perdre.')
      : 'Tes données restent sur ce téléphone, dans l\'app installée sur l\'écran d\'accueil. Elles ne sont pas partagées avec Safari : utilise toujours l\'icône. Supprimer l\'icône efface les données, d\'où l\'intérêt d\'une sauvegarde régulière.')));
  v.append(aboutSection());
  return v;
}
function remindersSection() {
  if (!NATIVE) return null;
  const st = S.settings;
  const sel = h('select', { class: 'input', style: 'width:104px', 'aria-label': 'Heure du rappel', disabled: st.remind ? null : true },
    Array.from({ length: 13 }, (_, i) => 17 * 60 + i * 30).map(m => h('option', { value: m }, `${Math.floor(m / 60)} h ${pad2(m % 60)}`)));
  sel.value = st.remindAt;
  sel.addEventListener('change', () => { st.remindAt = +sel.value; save(); scheduleEvening(0); });
  return h('section', { class: 'sec' }, h('div', { class: 'sec-h' }, h('h2', null, 'Rappels')),
    h('div', { class: 'list opts' },
      h('div', { class: 'opt' }, h('div', null, h('div', { class: 'opt-t' }, 'Rappel du soir'), h('div', { class: 'opt-s' }, 'Seulement si l\'objectif du jour n\'est pas atteint')),
        toggle(st.remind, async v => { if (v && !(await notifAllowed(true))) { toast('Autorise les notifications d\'Outperf dans les Réglages de l\'iPhone'); st.remind = false; render(); return; } st.remind = v; save(); scheduleEvening(0); render(); }, 'Rappel du soir')),
      h('div', { class: 'opt' }, h('div', { class: 'opt-t' }, 'Heure'), sel)));
}
function aboutSection() {
  const rows = [];
  if (CFG.privacyUrl) rows.push(setRow('Politique de confidentialité', 'Ce que l\'app stocke et pourquoi', () => openLink(CFG.privacyUrl)));
  if (CFG.termsUrl) rows.push(setRow('Conditions d\'utilisation', 'Les règles d\'utilisation d\'Outperf', () => openLink(CFG.termsUrl)));
  if (CFG.supportUrl) rows.push(setRow('Aide et contact', CFG.contactEmail || 'Une question, un bug, une idée', () => openLink(CFG.supportUrl)));
  return h('section', { class: 'sec' }, h('div', { class: 'sec-h' }, h('h2', null, 'À propos')), rows.length ? h('div', { class: 'list' }, rows) : null,
    h('p', { class: 'note', style: 'text-align:center' }, `Outperf ${VERSION}`));
}
function setRow(t, s, fn, danger) {
  return h('button', { class: 'row', onclick: fn }, h('span', { class: 'row-main' }, h('span', { class: 'row-t', style: danger ? 'color:var(--bad-ink)' : '' }, t), h('span', { class: 'row-s' }, s)), h('span', { class: 'chev' }, icon('chev', 18)));
}
function moveCat(c, dir) {
  const act = activeCats(); const i = act.indexOf(c), j = i + dir;
  if (j < 0 || j >= act.length) return;
  const other = act[j];
  const a = S.cats.indexOf(c), b = S.cats.indexOf(other);
  [S.cats[a], S.cats[b]] = [S.cats[b], S.cats[a]];
  save(); render();
}
function editCat(c) {
  const isNew = !c;
  const cat = c ? Object.assign({}, c) : makeCat('', true, 0);
  openSheet(isNew ? 'Nouvelle catégorie' : 'Modifier la catégorie', close => {
    const name = h('input', { class: 'input', type: 'text', maxlength: 40, value: cat.name, placeholder: 'Ex. Révision cours' });
    const sugg = isNew ? h('div', { class: 'chips' }, SUGGESTIONS.filter(([n]) => !S.cats.some(x => x.name.toLowerCase() === n.toLowerCase())).slice(0, 6).map(([n, cnt, wg]) => h('button', { class: 'chip', onclick: () => { name.value = n; cat.counts = cnt; cat.wg = wg * 60; drawSw(); tg.querySelector('input').checked = cnt; wgVal.textContent = fmtDur(cat.wg) ; } }, n))) : null;
    const sw = h('div', { class: 'swatches', role: 'radiogroup', 'aria-label': 'Couleur' });
    const drawSw = () => sw.replaceChildren(...Array.from({ length: NCOL }, (_, i) => h('button', { class: 'swatch' + (cat.color === i ? ' on' : ''), style: `background:var(--c${i})`, role: 'radio', 'aria-checked': cat.color === i ? 'true' : 'false', 'aria-label': `Couleur ${i + 1}`, onclick: () => { cat.color = i; drawSw(); } })));
    drawSw();
    const tg = toggle(cat.counts, v2 => { cat.counts = v2; }, 'Compte dans le travail');
    const wgVal = h('span', { class: 'val', style: 'min-width:92px' }, cat.wg ? fmtDur(cat.wg) : 'Aucun');
    const stepWg = d => { cat.wg = clamp((cat.wg || 0) + d, 0, 100 * 60); wgVal.textContent = cat.wg ? fmtDur(cat.wg) : 'Aucun'; };
    const n = S.entries.filter(e => e.c === cat.id).length;
    return [
      h('label', { class: 'field' }, h('span', null, 'Nom'), name),
      sugg,
      h('div', { class: 'field' }, h('span', null, 'Couleur'), sw),
      h('div', { class: 'list opts' },
        h('div', { class: 'opt' }, h('div', null, h('div', { class: 'opt-t' }, 'Compte dans le travail'), h('div', { class: 'opt-s' }, 'Désactive pour le sport ou les loisirs que tu veux juste suivre')), tg),
        h('div', { class: 'opt' }, h('div', { class: 'opt-t' }, 'Objectif par semaine'), h('div', { class: 'stepper' }, h('button', { class: 'icon-btn', 'aria-label': 'Moins 30 minutes', onclick: () => stepWg(-30) }, icon('minus')), wgVal, h('button', { class: 'icon-btn', 'aria-label': 'Plus 30 minutes', onclick: () => stepWg(30) }, icon('plus'))))),
      h('button', { class: 'btn primary wide', onclick: () => {
        const nm = name.value.trim();
        if (!nm) { toast('Donne un nom à la catégorie'); name.focus(); return; }
        if (S.cats.some(x => x.id !== cat.id && x.name.toLowerCase() === nm.toLowerCase())) { toast('Ce nom existe déjà'); return; }
        cat.name = nm.slice(0, 40);
        cat.u = Date.now();
        if (isNew) S.cats.push(cat); else Object.assign(c, cat);
        save(); close(); render(); toast(isNew ? 'Catégorie créée' : 'Catégorie modifiée');
      } }, isNew ? 'Créer la catégorie' : 'Enregistrer'),
      !isNew ? h('div', { class: 'btns' },
        h('button', { class: 'btn', onclick: () => { c.archived = !c.archived; c.u = Date.now(); save(); close(); render(); toast(c.archived ? 'Catégorie archivée' : 'Catégorie réactivée'); } }, c.archived ? 'Réactiver' : 'Archiver'),
        h('button', { class: 'btn danger', onclick: () => { close(); confirmSheet('Supprimer la catégorie ?', n ? `Ses ${n} session${n > 1 ? 's' : ''} seront supprimées aussi. Pour garder l'historique, archive la plutôt.` : 'Elle n\'a aucune session enregistrée.', 'Supprimer', () => { S.cats = S.cats.filter(x => x.id !== c.id); S.entries = S.entries.filter(e => e.c !== c.id); if (S.timer && S.timer.c === c.id) S.timer = null; save(); render(); toast('Catégorie supprimée'); }, true); } }, 'Supprimer')) : null,
      !isNew ? h('p', { class: 'note' }, 'Archiver cache la catégorie des boutons mais garde ses heures dans les stats.') : null,
    ];
  });
}

/* ---------- import / export */
async function shareText(name, mime, text) {
  if (PREVIEW) { toast('Disponible dans l\'app installée sur ton écran d\'accueil'); return false; }
  const FS = plug('Filesystem'), SH = plug('Share');
  if (FS && SH) {
    try {
      const w = await FS.writeFile({ path: name, data: text, directory: 'CACHE', encoding: 'utf8' });
      await SH.share({ title: name, files: [w.uri] });
      return true;
    } catch (e) { if (/cancel/i.test(String(e && e.message))) return false; toast('Export impossible. Réessaie.'); return false; }
  }
  const blob = new Blob([text], { type: mime });
  try {
    const file = new File([blob], name, { type: mime });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: name }); return true; }
  } catch (e) { if (e && e.name === 'AbortError') return false; }
  try {
    const a = h('a', { href: URL.createObjectURL(blob), download: name });
    document.body.append(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
    return true;
  } catch (e) { toast('Export impossible ici'); return false; }
}
async function exportJSON() {
  const ok = await shareText(`outperf-sauvegarde-${today()}.json`, 'application/json', JSON.stringify({ app: 'outperf', v: 1, exported: new Date().toISOString(), data: docOf(S) }));
  if (ok) { S.settings.lastBackup = Date.now(); save(); render(); toast('Sauvegarde créée'); }
}
function pickFile(accept, cb) {
  const inp = h('input', { type: 'file', accept, style: 'display:none' });
  inp.addEventListener('change', () => { const f = inp.files && inp.files[0]; if (f) f.text().then(cb); inp.remove(); });
  document.body.append(inp); inp.click();
}
function importJSON() {
  pickFile('.json,application/json', txt => {
    let o; try { o = JSON.parse(txt); } catch (e) { toast('Fichier illisible'); return; }
    const data = o && o.data ? o.data : o;
    if (!data || !Array.isArray(data.cats) || !Array.isArray(data.entries)) { toast('Ce fichier n\'est pas une sauvegarde Outperf'); return; }
    confirmSheet('Restaurer cette sauvegarde ?', `${data.cats.length} catégories et ${data.entries.length} sessions remplaceront tes données actuelles.`, 'Restaurer', () => { const keep = S.timer; replaceState(Object.assign(normalize(data), { timer: keep })); S.settings.onboarded = true; S.demo = false; save(); applyTheme(); render(); toast('Sauvegarde restaurée'); });
  });
}
function exportCSV() {
  const keys = [...new Set(S.entries.map(e => e.d))].sort();
  if (!keys.length) { toast('Rien à exporter pour l\'instant'); return; }
  const cats = S.cats;
  const q = s => /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  const n = v => (v / 60).toFixed(2).replace('.', ',');
  const lines = [['Date', 'Jour', ...cats.map(c => q(c.name)), 'Total travail', 'Total'].join(';')];
  for (let k = keys[0]; k <= keys[keys.length - 1]; k = addDays(k, 1)) {
    const d = idx().byDay.get(k) || { work: 0, all: 0, cats: {} };
    const dt = fromKey(k);
    lines.push([`${pad2(dt.getDate())}/${pad2(dt.getMonth() + 1)}/${dt.getFullYear()}`, DOW_S[dow(k)], ...cats.map(c => d.cats[c.id] ? n(d.cats[c.id]) : ''), n(d.work), n(d.all)].join(';'));
  }
  shareText(`outperf-${today()}.csv`, 'text/csv', '﻿' + lines.join('\r\n'));
}
function parseDuration(str) {
  let s = String(str || '').trim().toLowerCase().replace(/\s+/g, '').replace(/heures?|hrs?/g, 'h').replace(/minutes?|mins?|mn/g, 'min');
  if (!s || s === '-' || s === '–') return null;
  let m;
  if ((m = s.match(/^(\d+(?:[.,]\d+)?)h(\d{1,2})?(?:min|m)?$/))) return parseFloat(m[1].replace(',', '.')) * 60 + (m[2] ? +m[2] : 0);
  if ((m = s.match(/^(\d+(?:[.,]\d+)?)(?:min|m)$/))) return parseFloat(m[1].replace(',', '.'));
  if ((m = s.match(/^(\d{1,2}):(\d{2})$/))) return +m[1] * 60 + +m[2];
  if ((m = s.match(/^(\d+(?:[.,]\d+)?)$/))) return parseFloat(m[1].replace(',', '.')) * 60;
  return null;
}
function parseDate(str, refYear) {
  const s = String(str || '').trim().toLowerCase();
  let m;
  if ((m = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/))) return ymd(new Date(+m[1], +m[2] - 1, +m[3], 12));
  if ((m = s.match(/(\d{1,2})[\/.\-](\d{1,2})(?:[\/.\-](\d{2,4}))?/))) {
    let y = m[3] ? +m[3] : refYear; if (y < 100) y += 2000;
    const d = +m[1], mo = +m[2];
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    const dt = new Date(y, mo - 1, d, 12);
    if (dt.getDate() !== d) return null;
    let k = ymd(dt);
    if (!m[3] && k > today()) k = ymd(new Date(y - 1, mo - 1, d, 12));
    return k;
  }
  const mi = MON_L.findIndex(n => s.includes(n)) >= 0 ? MON_L.findIndex(n => s.includes(n)) : MON_S.findIndex(n => s.includes(n.replace('.', '')));
  if ((m = s.match(/(\d{1,2})\s*(?:er)?\s*[a-zéû]/)) && mi >= 0) {
    const ym = s.match(/(\d{4})/);
    let k = ymd(new Date(ym ? +ym[1] : refYear, mi, +m[1], 12));
    if (!ym && k > today()) k = ymd(new Date(refYear - 1, mi, +m[1], 12));
    return k;
  }
  return null;
}
const SKIP_COLS = /^(jour|day|total.*|objectif|obj\.?|%.*|note|commentaire|comment|moy.*|streak|série|delta|Δ.*)$/i;
function parseTable(text) {
  const lines = String(text || '').replace(/\r/g, '').split('\n').map(l => l.trim()).filter(l => l && !/^\|?\s*:?-{2,}/.test(l));
  if (!lines.length) return null;
  const sep = lines.some(l => l.includes('\t')) ? '\t' : lines.some(l => l.includes('|')) ? '|' : lines.some(l => l.includes(';')) ? ';' : ',';
  const rows = lines.map(l => { let c = l.split(sep).map(x => x.trim()); if (sep === '|') { if (c[0] === '') c.shift(); if (c[c.length - 1] === '') c.pop(); } return c; });
  const ry = fromKey(today()).getFullYear();
  let hi = rows.findIndex(r => !parseDate(r[0], ry));
  const firstData = rows.findIndex(r => parseDate(r[0], ry));
  if (firstData < 0) return { error: 'Aucune date reconnue en première colonne (ex. 05/10 ou 05/10/2026).' };
  const header = hi >= 0 && hi < firstData ? rows[hi] : null;
  const data = rows.slice(firstData).filter(r => parseDate(r[0], ry));
  let ncol = Math.max(...data.map(r => r.length));
  if (ncol === 1) {
    const DUR = /(\d+(?:[.,]\d+)?\s*h(?:eures?)?\s*\d{0,2}(?:\s*min)?|\d+\s*(?:min|mn)|\d{1,2}:\d{2}|\d+(?:[.,]\d+)?)\s*$/i;
    data.forEach((r, i) => {
      const line = r[0];
      const dm = line.match(/\d{4}-\d{1,2}-\d{1,2}|\d{1,2}[\/.\-]\d{1,2}(?:[\/.\-]\d{2,4})?/);
      const rest = dm ? line.slice(dm.index + dm[0].length) : '';
      const du = rest.match(DUR);
      data[i] = [dm ? dm[0] : line, du ? du[1] : ''];
    });
    ncol = 2;
  }
  const cols = [];
  for (let j = 1; j < ncol; j++) {
    const name = header && header[j] ? header[j] : (ncol === 2 ? 'Travail' : `Colonne ${j + 1}`);
    if (SKIP_COLS.test(name.trim())) continue;
    const vals = data.map(r => parseDuration(r[j]));
    if (!vals.some(v => v != null && v > 0)) continue;
    cols.push({ j, name: name.slice(0, 40) });
  }
  if (!cols.length) return { error: 'Aucune colonne de durées reconnue (ex. 2h30, 1,5 ou 45 min).' };
  const out = [];
  data.forEach(r => { const d = parseDate(r[0], ry); cols.forEach(c => { const v = parseDuration(r[c.j]); if (v && v > 0 && v < 24 * 60) out.push({ d, name: c.name, m: r1(v) }); }); });
  return { cols, rows: out, days: new Set(out.map(o => o.d)).size };
}
function importTable() {
  openSheet('Importer un tableau', close => {
    const ta = h('textarea', { class: 'input', placeholder: 'Date	Révision	Projets	Sport\n05/10	2h30	1h	45min\n06/10	3h	1,5	1h' });
    const prev = h('div', { class: 'note' });
    const repl = toggle(true, () => { }, 'Remplacer les jours importés');
    let parsed = null;
    const upd = () => {
      parsed = parseTable(ta.value);
      if (!ta.value.trim()) { prev.textContent = ''; return; }
      if (!parsed || parsed.error) { prev.textContent = parsed ? parsed.error : ''; prev.style.color = 'var(--bad-ink)'; return; }
      prev.style.color = '';
      const tot = parsed.rows.reduce((s, r) => s + r.m, 0);
      const news = parsed.cols.filter(c => !S.cats.some(x => x.name.toLowerCase() === c.name.toLowerCase())).map(c => c.name);
      prev.textContent = `${parsed.days} jours, ${parsed.cols.length} catégorie${parsed.cols.length > 1 ? 's' : ''} (${parsed.cols.map(c => c.name).join(', ')}), ${fmtH(tot)} au total.${news.length ? ` Nouvelles catégories créées : ${news.join(', ')}.` : ''}`;
    };
    ta.addEventListener('input', upd);
    return [
      h('p', { class: 'muted small' }, 'Dans Notes, copie ton tableau puis colle ici. Première colonne : la date. Les autres : une catégorie par colonne, avec son nom en en-tête. Durées acceptées : 2h30, 1h, 45 min, 1,5 ou 1:30.'),
      ta, prev,
      h('div', { class: 'list opts' }, h('div', { class: 'opt' }, h('div', null, h('div', { class: 'opt-t' }, 'Remplacer ces jours'), h('div', { class: 'opt-s' }, 'Efface ce qui existe déjà sur les dates importées')), repl)),
      h('div', { class: 'btns' }, h('button', { class: 'btn', onclick: () => pickFile('.csv,.tsv,.txt,text/csv,text/plain', t => { ta.value = t; upd(); }) }, 'Choisir un fichier'),
        h('button', { class: 'btn primary', onclick: () => {
          upd();
          if (!parsed || parsed.error) { toast('Rien à importer'); return; }
          const map = {};
          parsed.cols.forEach(c => { let cat = S.cats.find(x => x.name.toLowerCase() === c.name.toLowerCase()); if (!cat) { const sg = SUGGESTIONS.find(s => s[0].toLowerCase() === c.name.toLowerCase()); cat = makeCat(c.name, sg ? sg[1] : !/sport|muscu|gym|boxe|mma|course|run/i.test(c.name), 0); S.cats.push(cat); } map[c.name] = cat.id; });
          const days = new Set(parsed.rows.map(r => r.d));
          if (repl.querySelector('input').checked) S.entries = S.entries.filter(e => !days.has(e.d));
          parsed.rows.forEach(r => S.entries.push({ id: uid(), d: r.d, c: map[r.name], m: r.m, src: 'import', t: Date.now() }));
          S.settings.onboarded = true;
          save(); close(); render(); toast(`${parsed.rows.length} entrées importées sur ${days.size} jours`);
        } }, 'Importer')),
    ];
  });
}

/* ---------- demo */
function loadDemo(silent) {
  const keep = S.settings;
  replaceState(defaults()); S.settings = Object.assign(keep, { onboarded: true }); S.demo = true;
  SUGGESTIONS.slice(0, DEFAULT_PICK).forEach(([n, c, wg]) => S.cats.push(makeCat(n, c, wg)));
  let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const t = today(), base = [150, 90, 35, 25, 30, 30, 60];
  for (let i = 70; i >= 1; i--) {
    const k = addDays(t, -i), we = dow(k) >= 5, trend = 0.75 + (70 - i) / 140;
    if (i > 3 && rnd() < 0.05) continue;
    S.cats.forEach((c, j) => {
      let m = base[j] * trend * (we ? 0.55 : 1) * (0.4 + rnd() * 1.2);
      m = Math.round(m / 5) * 5;
      if (m >= 10) S.entries.push({ id: uid(), d: k, c: c.id, m, src: rnd() < 0.5 ? 'timer' : 'manual', t: fromKey(k).getTime(), s: fromKey(k).getTime() - 3 * 3600000 + j * 3600000 });
    });
  }
  [[0, 95], [1, 50], [4, 25]].forEach(([j, m], n) => S.entries.push({ id: uid(), d: t, c: S.cats[j].id, m, src: 'timer', t: Date.now(), s: Date.now() - (5 - n) * 3600000 }));
  save(); render(); if (silent !== true) toast('Démo chargée');
}

/* ---------- onboarding */
function onboarding() {
  const picked = new Set(SUGGESTIONS.slice(0, DEFAULT_PICK).map(s => s[0]));
  const custom = [];
  let goal = S.settings.goal, step = 0;
  const ov = h('div', { class: 'onb', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Bienvenue' });
  const finishSetup = () => {
    const names = SUGGESTIONS.filter(s => picked.has(s[0])).map(s => [s[0], s[1], s[2]]).concat(custom.map(n => [n, true, 0]));
    if (!names.length) { toast('Choisis au moins une catégorie'); return false; }
    if (!S.cats.length) names.forEach(([n, c, wg]) => S.cats.push(makeCat(n, c, wg)));
    S.settings.goal = goal; save();
    return true;
  };
  const done = () => { S.settings.onboarded = true; save(); ov.remove(); render(); haptic('success'); };
  const next = () => {
    step++;
    if (step === 2 && !NATIVE) step++;
    if (step === 3 && !cloudOn()) step++;
    if (step > 3) { done(); return; }
    draw(); ov.scrollTop = 0;
  };
  const dots = () => h('div', { class: 'onb-dots', 'aria-hidden': 'true' }, [0, 1, 2, 3].filter(i => (i !== 2 || NATIVE) && (i !== 3 || cloudOn())).map(i => h('i', { class: i === step ? 'on' : '' })));
  const draw = () => {
    let body;
    if (step === 0) {
      body = [
        h('div', { class: 'mark', html: markSVG(40) }),
        h('h1', null, 'Bats ton toi d\'hier.'),
        h('p', { class: 'lead' }, 'Outperf mesure chaque heure de travail pour que tu voies, jour après jour, si tu avances vraiment.'),
        h('ul', { class: 'perks' },
          h('li', null, h('b', null, 'Chrono et rounds. '), 'Lance une session en une touche, le temps va dans la bonne catégorie.'),
          h('li', null, h('b', null, 'Toi contre toi. '), 'Chaque jour comparé à la veille, chaque semaine à la précédente.'),
          h('li', null, h('b', null, 'Discipline visible. '), 'Note du jour, séries, calendrier de régularité et stats détaillées.')),
        h('button', { class: 'btn primary wide', style: 'height:56px', onclick: next }, 'Commencer'),
      ];
    } else if (step === 1) {
      const list = h('div', { class: 'list' }, SUGGESTIONS.map(([n, c]) => h('button', { class: 'pick' + (picked.has(n) ? ' on' : ''), 'aria-pressed': picked.has(n) ? 'true' : 'false', onclick: () => { picked.has(n) ? picked.delete(n) : picked.add(n); draw(); } },
        h('span', { class: 'ck' }, icon('check')), h('span', { class: 'row-main' }, h('span', { class: 'row-t' }, n), !c ? h('span', { class: 'row-s' }, 'suivi, hors travail') : null))),
        custom.map((n, i) => h('button', { class: 'pick on', onclick: () => { custom.splice(i, 1); draw(); } }, h('span', { class: 'ck' }, icon('check')), h('span', { class: 'row-main' }, h('span', { class: 'row-t' }, n)))));
      const inp = h('input', { class: 'input', type: 'text', maxlength: 40, placeholder: 'Ta catégorie perso' });
      const addC = () => { const n = inp.value.trim(); if (n && !custom.includes(n) && !SUGGESTIONS.some(s => s[0].toLowerCase() === n.toLowerCase())) { custom.push(n); draw(); } else if (n) { picked.add(SUGGESTIONS.find(s => s[0].toLowerCase() === n.toLowerCase())[0]); draw(); } };
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') addC(); });
      const gv = h('span', { class: 'val' }, fmtDur(goal));
      body = [
        h('h1', { class: 'onb-h2' }, 'Sur quoi tu bosses ?'),
        h('div', { class: 'sec' }, h('div', { class: 'sec-h' }, h('h2', null, 'Tes catégories'), h('p', null, 'modifiables plus tard')), list,
          h('div', { class: 'btns' }, inp, h('button', { class: 'btn sm', style: 'flex:none;height:48px', onclick: addC }, 'Ajouter'))),
        h('div', { class: 'sec' }, h('div', { class: 'sec-h' }, h('h2', null, 'Ton objectif par jour')),
          h('div', { class: 'card', style: 'display:flex;align-items:center;justify-content:space-between;gap:12px' }, h('span', { class: 'muted small' }, 'Heures de travail visées'),
            h('div', { class: 'stepper' }, h('button', { class: 'icon-btn', 'aria-label': 'Moins 30 minutes', onclick: () => { goal = Math.max(30, goal - 30); gv.textContent = fmtDur(goal); } }, icon('minus')), gv, h('button', { class: 'icon-btn', 'aria-label': 'Plus 30 minutes', onclick: () => { goal = Math.min(960, goal + 30); gv.textContent = fmtDur(goal); } }, icon('plus'))))),
        h('button', { class: 'btn primary wide', style: 'height:56px', onclick: () => { if (finishSetup()) next(); } }, 'Continuer'),
        h('button', { class: 'btn wide', style: 'background:none;color:var(--muted)', onclick: () => { S.settings.onboarded = true; replaceState(S); ov.remove(); loadDemo(); } }, 'Explorer d\'abord avec des données d\'exemple'),
        h('button', { class: 'btn wide', style: 'background:none;color:var(--muted);margin-top:-14px', onclick: () => { S.settings.onboarded = true; save(); ov.remove(); render(); setTimeout(importTable, 50); } }, 'Importer un tableau existant'),
      ];
    } else if (step === 2) {
      body = [
        h('h1', { class: 'onb-h2' }, 'Ne casse jamais ta série.'),
        h('p', { class: 'lead' }, 'Un rappel chaque soir à 21 h si tu n\'as pas encore atteint ton objectif, avec ce qu\'il te manque pour battre ton toi d\'hier. Tu peux changer l\'heure dans Réglages.'),
        h('button', { class: 'btn primary wide', style: 'height:56px', onclick: async () => { const ok = await notifAllowed(true); S.settings.remind = ok; save(); if (ok) scheduleEvening(0); next(); } }, 'Activer le rappel du soir'),
        h('button', { class: 'btn wide', style: 'background:none;color:var(--muted)', onclick: next }, 'Plus tard'),
      ];
    } else {
      body = [
        h('h1', { class: 'onb-h2' }, 'Garde ton historique en sécurité.'),
        h('p', { class: 'lead' }, 'Avec un compte gratuit, tes heures sont sauvegardées et te suivent sur un nouvel iPhone. Sans compte, elles restent uniquement sur cet appareil.'),
        h('button', { class: 'btn primary wide', style: 'height:56px', onclick: () => { done(); authSheet('signup'); } }, 'Créer un compte'),
        h('button', { class: 'btn wide', onclick: () => { done(); authSheet('signin'); } }, 'J\'ai déjà un compte'),
        h('button', { class: 'btn wide', style: 'background:none;color:var(--muted)', onclick: done }, 'Continuer sans compte'),
      ];
    }
    ov.replaceChildren(h('div', { class: 'onb-in' }, step > 0 ? dots() : null, ...body));
  };
  draw();
  document.body.append(ov);
}
function markSVG(size) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true"><rect x="12" y="26" width="16" height="28" rx="5" fill="rgba(127,137,158,.18)" stroke="#7F899E" stroke-width="2.5"/><rect x="36" y="10" width="16" height="44" rx="5" fill="#FFB21E"/></svg>`;
}

/* ================= optional account: Supabase auth + cloud sync ================= */
let sb = null, session = null, pushT = null;
const sync = { busy: false, last: 0, error: '' };
const cloudOn = () => !!sb;
const userEmail = () => (session && session.user && session.user.email) || '';
const authStorage = {
  getItem: async k => { const P = plug('Preferences'); if (P) { try { return (await P.get({ key: k })).value; } catch (e) { return null; } } try { return localStorage.getItem(k); } catch (e) { return null; } },
  setItem: async (k, v) => { const P = plug('Preferences'); if (P) { try { await P.set({ key: k, value: v }); } catch (e) { } return; } try { localStorage.setItem(k, v); } catch (e) { } },
  removeItem: async k => { const P = plug('Preferences'); if (P) { try { await P.remove({ key: k }); } catch (e) { } return; } try { localStorage.removeItem(k); } catch (e) { } },
};
async function cloudInit() {
  if (!CFG.supabaseUrl || !CFG.supabaseAnonKey || !window.supabase || PREVIEW) return;
  try {
    sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey, { auth: { storage: authStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
    sb.auth.onAuthStateChange((ev, s) => { session = s; if (ev === 'SIGNED_OUT' && TAB === 'settings') render(); });
    const { data } = await sb.auth.getSession();
    session = data.session;
    if (session) pull();
  } catch (e) { sb = null; }
}
const AUTH_ERRORS = [
  [/invalid login credentials/i, 'Email ou mot de passe incorrect.'],
  [/already registered|already been registered|user already exists/i, 'Un compte existe déjà avec cet email. Connecte toi.'],
  [/password should be at least|weak password/i, 'Mot de passe trop court : 8 caractères minimum.'],
  [/unable to validate email|invalid email|email address .* is invalid/i, 'Adresse email invalide.'],
  [/token has expired|otp.*(expired|invalid)|invalid.*(otp|token)/i, 'Code invalide ou expiré. Demande un nouveau code.'],
  [/rate limit|too many/i, 'Trop de tentatives. Réessaie dans quelques minutes.'],
  [/email not confirmed/i, 'Confirme ton email avec le lien reçu, puis connecte toi.'],
  [/failed to fetch|network|load failed/i, 'Pas de connexion. Vérifie ton réseau et réessaie.'],
];
const authMsg = e => { const m = String((e && (e.message || e.error_description)) || e || ''); const f = AUTH_ERRORS.find(([re]) => re.test(m)); return f ? f[1] : 'Une erreur est survenue. Réessaie.'; };
function dropDemo() { if (S.demo) { S.entries = []; S.demo = false; replaceState(S); } }
async function cloudSignUp(email, password) {
  dropDemo();
  const { data, error } = await sb.auth.signUp({ email, password });
  if (error) throw error;
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) throw new Error('already registered');
  session = data.session;
  if (!session) return 'confirm';
  await pull(); return 'ok';
}
async function cloudSignIn(email, password) {
  dropDemo();
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  session = data.session; await pull();
}
async function cloudResetSend(email) { const { error } = await sb.auth.resetPasswordForEmail(email); if (error) throw error; }
async function cloudResetVerify(email, code, password) {
  const { data, error } = await sb.auth.verifyOtp({ email, token: code, type: 'recovery' });
  if (error) throw error;
  session = data.session;
  const r = await sb.auth.updateUser({ password }); if (r.error) throw r.error;
  await pull();
}
async function cloudSignOut() { clearTimeout(pushT); try { await sb.auth.signOut(); } catch (e) { } session = null; sync.last = 0; }
async function cloudDeleteAccount() {
  const { error } = await sb.rpc('delete_user'); if (error) throw error;
  await cloudSignOut();
}
const docOf = st => ({ v: st.v, settings: st.settings, cats: st.cats, entries: st.entries, tomb: st.tomb, mt: st.mt });
const LOCAL_ONLY = ['theme', 'wake', 'sound', 'remind', 'remindAt', 'lastBackup'];
function mergeDocs(local, remote) {
  const ts = x => (x && (x.u || x.t)) || 0;
  const tomb = { e: Object.assign({}, remote.tomb.e), c: Object.assign({}, remote.tomb.c) };
  for (const k of ['e', 'c']) for (const id in local.tomb[k]) tomb[k][id] = Math.max(tomb[k][id] || 0, local.tomb[k][id]);
  const union = (a, b, tm) => {
    const m = new Map(); a.forEach(x => m.set(x.id, x));
    b.forEach(x => { const y = m.get(x.id); m.set(x.id, !y || ts(x) > ts(y) ? x : y); });
    return [...m.values()].filter(x => !(tm[x.id] && tm[x.id] >= ts(x)));
  };
  const newer = (remote.mt || 0) > (local.mt || 0) ? remote : local, older = newer === remote ? local : remote;
  const cats = union(newer.cats, older.cats, tomb.c);
  const order = new Map(newer.cats.map((c, i) => [c.id, i]));
  cats.sort((a, b) => (order.has(a.id) ? order.get(a.id) : 1e6) - (order.has(b.id) ? order.get(b.id) : 1e6));
  const settings = Object.assign({}, newer.settings);
  LOCAL_ONLY.forEach(k => { settings[k] = local.settings[k]; });
  settings.onboarded = !!(local.settings.onboarded || remote.settings.onboarded);
  let entries = union(local.entries, remote.entries, tomb.e);
  // Same category created on two devices (for example during onboarding): keep one, move the sessions over.
  const byName = new Map(), remap = {}, keepIds = new Set(remote.cats.map(c => c.id));
  const kept = [];
  for (const c of cats) {
    const k = c.name.trim().toLowerCase(), prev = byName.get(k);
    if (!prev) { byName.set(k, c); kept.push(c); continue; }
    const winner = keepIds.has(prev.id) || !keepIds.has(c.id) ? prev : c, loser = winner === prev ? c : prev;
    remap[loser.id] = winner.id; tomb.c[loser.id] = Date.now();
    if (winner !== prev) { kept[kept.indexOf(prev)] = c; byName.set(k, c); }
  }
  if (Object.keys(remap).length) entries = entries.map(e => remap[e.c] ? Object.assign({}, e, { c: remap[e.c], u: Date.now() }) : e);
  return Object.assign({}, local, { settings, cats: kept, entries, tomb, mt: Math.max(local.mt || 0, remote.mt || 0) });
}
async function pull() {
  if (!sb || !session || sync.busy) return;
  sync.busy = true; sync.error = '';
  try {
    const { data, error } = await sb.from('user_data').select('data, updated_at').eq('user_id', session.user.id).maybeSingle();
    if (error) throw error;
    if (data && data.data) {
      const merged = mergeDocs(S, normalize(data.data));
      merged.timer = S.timer;
      replaceState(merged); applyTheme();
    }
    sync.busy = false;
    await push();
  } catch (e) { sync.error = authMsg(e); sync.busy = false; }
  render();
}
async function push() {
  if (!sb || !session) return;
  sync.busy = true;
  try {
    const { error } = await sb.from('user_data').upsert({ user_id: session.user.id, data: docOf(S), updated_at: new Date().toISOString() });
    if (error) throw error;
    sync.last = Date.now(); sync.error = '';
  } catch (e) { sync.error = authMsg(e); }
  sync.busy = false;
  if (TAB === 'settings') render();
}
function schedulePush() { if (!sb || !session) return; clearTimeout(pushT); pushT = setTimeout(push, 2500); }

function authSheet(mode) {
  openSheet(mode === 'signup' ? 'Créer ton compte' : 'Se connecter', close => {
    const email = h('input', { class: 'input', type: 'email', autocomplete: 'email', inputmode: 'email', autocapitalize: 'off', spellcheck: 'false', placeholder: 'toi@exemple.com', id: 'auth-email' });
    const pass = h('input', { class: 'input', type: 'password', autocomplete: mode === 'signup' ? 'new-password' : 'current-password', placeholder: mode === 'signup' ? '8 caractères minimum' : 'Ton mot de passe', id: 'auth-pass' });
    const err = h('p', { class: 'form-err', role: 'alert' });
    const btn = h('button', { class: 'btn primary wide' }, mode === 'signup' ? 'Créer mon compte' : 'Me connecter');
    btn.addEventListener('click', async () => {
      const em = email.value.trim(), pw = pass.value;
      err.textContent = '';
      if (!/^\S+@\S+\.\S+$/.test(em)) { err.textContent = 'Adresse email invalide.'; return; }
      if (mode === 'signup' && pw.length < 8) { err.textContent = 'Mot de passe trop court : 8 caractères minimum.'; return; }
      if (!pw) { err.textContent = 'Indique ton mot de passe.'; return; }
      btn.disabled = true; btn.textContent = 'Un instant…';
      try {
        if (mode === 'signup') {
          const r = await cloudSignUp(em, pw);
          close(); haptic('success');
          toast(r === 'confirm' ? 'Compte créé. Confirme ton email avec le lien reçu, puis connecte toi.' : 'Compte créé. Tes heures sont sauvegardées.');
        } else { await cloudSignIn(em, pw); close(); haptic('success'); toast('Connecté. Tes heures sont synchronisées.'); }
        render();
      } catch (e) { err.textContent = authMsg(e); btn.disabled = false; btn.textContent = mode === 'signup' ? 'Créer mon compte' : 'Me connecter'; haptic('warning'); }
    });
    return [
      h('p', { class: 'muted small' }, 'Ton compte sauvegarde tes catégories et tes heures, et les synchronise entre tes appareils. L\'app reste utilisable sans compte.'),
      h('label', { class: 'field' }, h('span', null, 'Email'), email),
      h('label', { class: 'field' }, h('span', null, 'Mot de passe'), pass),
      err, btn,
      mode === 'signup'
        ? h('p', { class: 'note' }, 'En créant un compte, tu acceptes les ', h('button', { class: 'linkbtn', onclick: () => openLink(CFG.termsUrl) }, 'conditions d\'utilisation'), ' et la ', h('button', { class: 'linkbtn', onclick: () => openLink(CFG.privacyUrl) }, 'politique de confidentialité'), '.')
        : h('button', { class: 'linkbtn', style: 'align-self:center', onclick: () => { close(); resetSheet(email.value.trim()); } }, 'Mot de passe oublié ?'),
      h('button', { class: 'btn wide', style: 'background:none;color:var(--muted)', onclick: () => { close(); authSheet(mode === 'signup' ? 'signin' : 'signup'); } }, mode === 'signup' ? 'J\'ai déjà un compte' : 'Créer un compte'),
    ];
  });
}
function resetSheet(prefill) {
  openSheet('Mot de passe oublié', close => {
    const email = h('input', { class: 'input', type: 'email', autocomplete: 'email', inputmode: 'email', autocapitalize: 'off', value: prefill || '', placeholder: 'toi@exemple.com' });
    const code = h('input', { class: 'input', type: 'text', inputmode: 'numeric', autocomplete: 'one-time-code', maxlength: 10, placeholder: 'Code reçu par email' });
    const pass = h('input', { class: 'input', type: 'password', autocomplete: 'new-password', placeholder: 'Nouveau mot de passe' });
    const err = h('p', { class: 'form-err', role: 'alert' });
    const step2 = h('div', { class: 'sheet-b', hidden: true }, h('label', { class: 'field' }, h('span', null, 'Code'), code), h('label', { class: 'field' }, h('span', null, 'Nouveau mot de passe'), pass));
    const btn = h('button', { class: 'btn primary wide' }, 'Recevoir un code');
    let sent = false;
    btn.addEventListener('click', async () => {
      err.textContent = '';
      const em = email.value.trim();
      if (!/^\S+@\S+\.\S+$/.test(em)) { err.textContent = 'Adresse email invalide.'; return; }
      btn.disabled = true;
      try {
        if (!sent) { await cloudResetSend(em); sent = true; step2.hidden = false; btn.textContent = 'Changer le mot de passe'; toast('Code envoyé. Regarde tes emails.'); }
        else {
          if (pass.value.length < 8) { err.textContent = 'Mot de passe trop court : 8 caractères minimum.'; btn.disabled = false; return; }
          await cloudResetVerify(em, code.value.trim(), pass.value); close(); haptic('success'); toast('Mot de passe changé. Tu es connecté.'); render();
        }
      } catch (e) { err.textContent = authMsg(e); haptic('warning'); }
      btn.disabled = false;
    });
    return [h('p', { class: 'muted small' }, 'Indique ton email : tu recevras un code pour choisir un nouveau mot de passe.'), h('label', { class: 'field' }, h('span', null, 'Email'), email), step2, err, btn];
  });
}
function deleteAccountSheet() {
  openSheet('Supprimer ton compte', close => {
    let wipe = false;
    const err = h('p', { class: 'form-err', role: 'alert' });
    const btn = h('button', { class: 'btn danger wide' }, 'Supprimer définitivement');
    btn.addEventListener('click', async () => {
      btn.disabled = true; err.textContent = '';
      try {
        await cloudDeleteAccount();
        if (wipe) { replaceState(defaults()); applyTheme(); TAB = 'today'; }
        close(); haptic('success'); render(); toast('Compte supprimé.');
        if (wipe) onboarding();
      } catch (e) { err.textContent = authMsg(e); btn.disabled = false; }
    });
    return [
      h('p', null, `Ton compte ${userEmail()} et toutes les données sauvegardées dans le cloud seront supprimés tout de suite. Cette action est définitive.`),
      h('div', { class: 'list opts' }, h('div', { class: 'opt' }, h('div', null, h('div', { class: 'opt-t' }, 'Effacer aussi cet iPhone'), h('div', { class: 'opt-s' }, 'Sinon tes heures restent sur cet appareil, sans compte')), toggle(false, v => { wipe = v; }, 'Effacer aussi cet iPhone'))),
      err, btn,
      h('button', { class: 'btn wide', onclick: close }, 'Annuler'),
    ];
  });
}
function accountSection() {
  if (!cloudOn()) return null;
  if (!session) {
    return h('section', { class: 'sec' }, h('div', { class: 'sec-h' }, h('h2', null, 'Compte')),
      h('div', { class: 'card acct' },
        h('p', null, h('b', null, 'Ne perds jamais tes heures. '), 'Un compte gratuit sauvegarde ton historique et le synchronise sur tous tes appareils.'),
        h('div', { class: 'btns' }, h('button', { class: 'btn primary', onclick: () => authSheet('signup') }, 'Créer un compte'), h('button', { class: 'btn', onclick: () => authSheet('signin') }, 'Se connecter'))));
  }
  const status = sync.busy ? 'Synchronisation…' : sync.error ? sync.error : sync.last ? `Synchronisé à ${hhmm(sync.last)}` : 'Synchronisation en attente';
  return h('section', { class: 'sec' }, h('div', { class: 'sec-h' }, h('h2', null, 'Compte')),
    h('div', { class: 'list' },
      h('div', { class: 'row' }, h('span', { class: 'row-main' }, h('span', { class: 'row-t' }, userEmail()), h('span', { class: 'row-s', style: sync.error ? 'color:var(--bad-ink)' : '' }, status))),
      setRow('Synchroniser maintenant', 'Envoie et récupère tes dernières heures', () => pull()),
      setRow('Se déconnecter', 'Tes heures restent sur cet iPhone', () => confirmSheet('Se déconnecter ?', 'Tes heures restent sur cet iPhone. Reconnecte toi pour les synchroniser à nouveau.', 'Se déconnecter', async () => { await cloudSignOut(); render(); toast('Déconnecté'); })),
      setRow('Supprimer mon compte', 'Efface ton compte et tes données dans le cloud', deleteAccountSheet, true)));
}

/* ================= shell ================= */
const TABS = [['today', "Aujourd'hui"], ['chrono', 'Chrono'], ['stats', 'Stats'], ['journal', 'Journal'], ['settings', 'Réglages']];
function go(tab) { if (tab === 'stats' && TAB !== 'stats') { stAnchor = null; stSlide = ''; raceM = regEnd = wdM = yrEnd = null; } TAB = tab; render(); app().scrollTop = 0; }
function render() {
  computeLive();
  pending.length = 0;
  hideTip();
  const root = app();
  const view = TAB === 'today' ? viewToday() : TAB === 'chrono' ? viewChrono() : TAB === 'stats' ? viewStats() : TAB === 'journal' ? viewJournal() : viewSettings();
  const pv = (PREVIEW || S.demo) && TAB === 'today' ? h('div', { class: 'warnline', style: 'margin-bottom:14px' }, h('span', null, h('b', null, 'Données d\'exemple. '), PREVIEW ? 'Pour suivre tes vraies heures, installe l\'app sur ton écran d\'accueil. ' : 'Explore l\'app, puis repars de zéro pour suivre tes vraies heures. ', h('button', { style: 'color:var(--tint);font-weight:650;font-size:14px', onclick: () => confirmSheet('Repartir de zéro ?', 'Les données d\'exemple seront effacées.', 'Repartir de zéro', () => { replaceState(defaults()); applyTheme(); render(); onboarding(); }) }, 'Repartir de zéro'))) : null;
  root.replaceChildren(h('div', { class: 'app-in' }, ...[runBanner(), pv, view].filter(Boolean)));
  if (TAB === 'chrono') liveChrono();
  const nav = $('#tabs');
  nav.replaceChildren(h('div', { class: 'tabbar-in' }, TABS.map(([k, l]) => h('button', { class: 'tab' + (TAB === k ? ' on' : ''), 'aria-current': TAB === k ? 'page' : null, onclick: () => go(k) }, icon(k), l, k === 'chrono' && S.timer && S.timer.runStart ? h('span', { class: 'pulse', 'aria-label': 'Chrono en cours' }) : null))));
  requestAnimationFrame(() => { pending.splice(0).forEach(fn => { try { fn(); } catch (e) { console.error(e); } }); });
}
let lastDay = null;
function tick(force) {
  computeLive();
  const d = today();
  if (lastDay && d !== lastDay) { lastDay = d; render(); return; }
  lastDay = d;
  if (force) { render(); return; }
  if (S.timer) checkTimer(false);
  if (!S.timer) return;
  updateBannerClock();
  if (TAB === 'chrono') liveChrono();
  if (TAB === 'today') liveToday();
}
let themeByApp = false;
function applyTheme() {
  const th = S.settings.theme;
  if (th === 'auto') { if (themeByApp) document.documentElement.removeAttribute('data-theme'); themeByApp = false; }
  else { document.documentElement.setAttribute('data-theme', th); themeByApp = true; }
  const dark = th === 'dark' || (th === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  const meta = $('meta[name="theme-color"]'); if (meta) meta.setAttribute('content', dark ? '#151A25' : '#FFFFFF');
  setStatusBar(dark);
  fixTopInset();
  fixBottomBand();
}
// On iPad this iPhone app runs in a window whose controls sit in the top left corner, and iOS reports no
// top inset there (an iPhone in portrait always reports one). Leave room so the titles stay clear of them.
function fixTopInset() {
  const root = document.documentElement;
  if (!NATIVE || !document.body) return;
  const p = document.createElement('div');
  p.style.cssText = 'position:fixed;top:0;left:0;width:1px;visibility:hidden;pointer-events:none;padding-top:env(safe-area-inset-top,0px)';
  document.body.appendChild(p);
  const top = parseFloat(getComputedStyle(p).paddingTop) || 0;
  p.remove();
  if (top < 1) root.style.setProperty('--sat', '54px'); else root.style.removeProperty('--sat');
}
// iOS 26 home screen bug: with the old translucent status bar, the web view is cut short by the status bar
// height and iOS paints the missing strip itself under the tab bar. That strip already holds the home
// indicator, so the tab bar must not add its own bottom inset on top of it.
function fixBottomBand() {
  const root = document.documentElement;
  root.style.removeProperty('--sab');
  const standalone = navigator.standalone || matchMedia('(display-mode: standalone)').matches;
  const ts = $('.topsafe'); if (!standalone || !ts) return;
  const sat = ts.getBoundingClientRect().height;
  const portrait = innerHeight > innerWidth, screenH = portrait ? Math.max(screen.height, screen.width) : Math.min(screen.height, screen.width);
  if (sat > 10 && innerHeight <= screenH - sat + 2) root.style.setProperty('--sab', '0px');
}
let rsT = null;
let lastW = innerWidth;
addEventListener('resize', () => { fixTopInset(); fixBottomBand(); clearTimeout(rsT); rsT = setTimeout(() => { if (innerWidth !== lastW) { lastW = innerWidth; if (TAB === 'stats') { const y = app().scrollTop; render(); app().scrollTop = y; } } }, 150); });
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (TAB === 'stats') render(); });
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') { if (NATIVE) scheduleEveningNow(); if (session) { clearTimeout(pushT); push(); } return; }
  if (document.visibilityState === 'visible') {
    if (session) pull();
    const before = S.timer;
    checkTimer(true);
    if (S.timer && S.timer.runStart) wakeOn();
    if (before === S.timer) render();
  }
});
matchMedia('(prefers-color-scheme: dark)').addEventListener && matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { applyTheme(); if (TAB === 'stats') render(); });

async function init() {
  replaceState(await load());
  applyTheme();
  lastDay = today();
  checkTimer(true);
  if (PREVIEW && !S.settings.onboarded && !S.entries.length) loadDemo(true);
  render();
  const SP = plug('SplashScreen'); if (SP) requestAnimationFrame(() => SP.hide({ fadeOutDuration: 250 }).catch(() => { }));
  await cloudInit();
  if (!S.settings.onboarded) onboarding(); else if (session) render();
  setInterval(() => tick(false), 1000);
  if (!NATIVE && navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => { });
  if (!NATIVE && 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost') && !location.hostname.endsWith('claude.ai') && !location.hostname.endsWith('claudeusercontent.com')) {
    navigator.serviceWorker.register('sw.js').catch(() => { });
  }
  if (S.timer && S.timer.runStart) wakeOn();
  if (NATIVE) scheduleEvening(3000);
}
window.__op = { mergeDocs, get session() { return session; }, get sync() { return sync; }, parseDuration, parseDate, parseTable, metrics: () => { computeLive(); return metrics(); }, splitSegs, get S() { return S; }, set S(v) { S = v; save(); render(); }, replaceState: v => { replaceState(v); render(); }, go, render, loadDemo, today, addDays, finishTimer, elapsed };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

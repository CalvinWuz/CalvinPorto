import { pointFree, segmentClear, nearestFree, planRoute } from './route.js';
import { CalvinCatExpressions } from './expressions.js';

// Wajah paket 10 yang posenya diambil dari library; sisanya dihitung controller sendiri
// karena terikat perjalanan, seretan, angin scroll, atau rangkaian marah.
const LIBRARY_POSES = new Set([
  'curious', 'laugh', 'shy', 'surprised', 'thinking', 'mischievous', 'proud', 'focused',
  'bored', 'puzzled', 'sad', 'love', 'wink', 'yawn', 'sneeze', 'determined',
  'greet', 'approve', 'cool', 'flower', 'coffee', 'sleep'
]);
// Skala badan ketika mengintip dari margin pada viewport padat.
const PERCH_SCALE = 0.56;
const HEAD_TAPS = ['wink', 'shy', 'love'];
const BODY_TAPS = ['laugh', 'mischievous', 'surprised'];

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const approach = (a, b, d) => a < b ? Math.min(a + d, b) : Math.max(a - d, b);
const inside = (p, r) => p.x >= r.left && p.x <= r.right && p.y >= r.top && p.y <= r.bottom;
const DEFAULT_STEPS = [
  { id: 'p-cookies', title: '01 · Cookies Risk Analyzer', text: 'Mulai dari masalahnya, lalu lihat keputusan, kontribusi Calvin, dan bukti proyek yang tersedia.' },
  { id: 'p-bisindo', title: '02 · BISINDO', text: 'Berikutnya, prototipe personal untuk menjelajahi pengenalan bahasa isyarat. Perhatikan juga batasan pengujiannya.' },
  { id: 'p-papantulis', title: '03 · PapanTulis', text: 'Di proyek ini, gerakan tangan menjadi cara berinteraksi. Buka rincian untuk melihat proses dan kontribusinya.' },
  { id: 'tentang', title: '04 · Tentang Calvin', text: 'Kenali cara Calvin belajar, menguji, dan menyelesaikan proyek lintas bidang.' },
  { id: 'kontak', title: '05 · Lanjut ngobrol?', text: 'Sampai di akhir tur. Kamu bisa melihat CV atau menghubungi Calvin dari bagian ini.' }
];

/** One viewport-space owner. Layout never depends on this mascot. */
export class Companion {
  constructor({ root, actor, bubble, obstacles = '[data-cat-obstacle]', sections, onNavigate, debug = false } = {}) {
    if (!root) throw new Error('Companion needs a root element.');
    this.root = root;
    this.actor = actor || root.querySelector('.pet-actor');
    if (!this.actor) throw new Error('Companion needs a .pet-actor button.');
    this.bubble = bubble || root.querySelector('.pet-bubble');
    this.obstacleSource = obstacles;
    this.steps = (Array.isArray(sections) ? sections : DEFAULT_STEPS).map(s => typeof s === 'string' ? { id: s.replace(/^#/, ''), title: s.replace(/^#/, ''), text: 'Lihat bagian ini, lalu lanjutkan saat kamu siap.' } : { ...s, id: s.id.replace(/^#/, '') });
    this.onNavigate = onNavigate;
    this.debug = debug;
    this.p = { x: 0, y: 0 }; this.v = { x: 0, y: 0 };
    this.mode = 'rest'; this.expression = 'idle'; this.facing = 'left';
    this.route = []; this.routeGoal = null; this.routeObstacles = []; this.egress = false;
    this.speed = 0; this.phase = 0; this.stride = 0; this.lean = 0;
    this.logical = 0; this.anchor = null; this.previous = 0;
    this.frame = 0; this.timer = 0; this.dirty = true; this.layoutPending = false;
    this.paused = false; this.reduced = false; this.destroyed = false; this.started = false;
    this.listeners = []; this.drag = null; this.suppressClickUntil = 0;
    this.keyboardFocus = false; this.pointerModality = true;
    this.sequence = null; this.sequenceIndex = 0; this.stateUntil = Infinity;
    this.stateStarted = 0; this.stateDuration = 0;
    this.transientUntil = Infinity; this.landAt = 0; this.flightAt = 0;
    this.lastActivity = 0; this.nextStroll = 9000; this.settleAt = Infinity;
    this.lastScrollY = window.scrollY; this.lastScrollReal = performance.now();
    this.scrollVelocity = 0; this.windUntilReal = 0; this.lastWind = false;
    this.tour = { active: false, index: -1 }; this.bubbleView = null;
    this.geometryRevision = 0; this.recoveries = 0; this.routePlans = 0;
    this.wrap = null; this.wrapCount = 0; this.nextWrap = 10500; this.wrapProxy = null;
    this.media = matchMedia('(prefers-reduced-motion: reduce)'); this.reduced = this.media.matches;
    // Lapisan ilustrasi paket 10. Satu-satunya node yang menerima --cat10-*.
    this.skin = root.querySelector('.calvin-cat10') || root.querySelector('.pet-skin');
    this.headTapIndex = 0; this.bodyTapIndex = 0; this.lastTapAt = -Infinity;
    this.holdTimer = 0; this.holdSatisfied = false;
    this.tickle = { travel: 0, until: 0, cooldownUntil: 0 };
    this.nextExploreReaction = 0; this.boredShown = false;
    this.perched = false; this.rawRects = [];
  }

  now() { return this.logical + (this.anchor === null ? 0 : performance.now() - this.anchor); }
  canRun() { return !this.paused && !this.reduced && !document.hidden && !this.destroyed; }
  listen(target, type, handler, options) {
    target.addEventListener(type, handler, options);
    this.listeners.push(() => target.removeEventListener(type, handler, options));
  }

  start() {
    if (this.started || this.destroyed) return this;
    this.started = true;
    this.actor.style.touchAction = 'none';
    this.actor.setAttribute('aria-label', 'Kucing Calvin. Seret untuk bermain, atau tekan untuk membuka tur portofolio.');
    this.actor.setAttribute('aria-haspopup', 'dialog'); this.actor.setAttribute('aria-expanded', 'false');
    if (this.bubble) { if (!this.bubble.id) this.bubble.id = `${this.root.id || 'calvin'}-pet-bubble`; this.actor.setAttribute('aria-controls', this.bubble.id); }
    this.measure(); this.p = this.pickEdge(this.preferredY()).point;
    const physical = this.root.querySelector('.pet-physical');
    if (physical) {
      this.wrapProxy = document.createElement('div');
      this.wrapProxy.className = `pet-wrap ${this.root.className}`; this.wrapProxy.hidden = true;
      this.wrapProxy.setAttribute('aria-hidden', 'true'); this.wrapProxy.setAttribute('inert', '');
      this.wrapProxy.style.pointerEvents = 'none';
      const clone = physical.cloneNode(true);
      clone.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
      this.wrapProxy.append(clone); document.body.append(this.wrapProxy);
    }
    this.listen(this.actor, 'pointerdown', e => this.pointerDown(e));
    this.listen(this.actor, 'pointermove', e => this.pointerMove(e));
    this.listen(this.actor, 'pointerup', e => this.pointerUp(e, false));
    this.listen(this.actor, 'pointercancel', e => this.pointerUp(e, true));
    this.listen(this.actor, 'lostpointercapture', e => { if (this.drag?.id === e.pointerId) this.pointerUp(e, true); });
    this.listen(this.actor, 'click', e => {
      // Tap pointer sudah ditangani pointerup dan menekan click sintetis, jadi click yang
      // lolos ke sini berasal dari Enter/Space atau teknologi bantu: aktivasi singkat yang sama.
      if (performance.now() < this.suppressClickUntil) { e.preventDefault(); return; }
      this.shortActivation('head');
    });
    this.listen(this.actor, 'keydown', e => this.keyDown(e));
    // Gelitik: hanya gerakan pointer di atas karakter, dengan ambang dan cooldown.
    this.listen(this.actor, 'pointermove', e => { if (!this.drag) this.feelTickle(e); });
    this.listen(this.actor, 'pointerleave', () => { this.tickle.travel = 0; });
    this.listen(this.actor, 'focus', () => {
      this.keyboardFocus = !this.pointerModality || this.actor.matches(':focus-visible');
      if (this.keyboardFocus) { this.stopRoute(); this.activity(); }
    });
    this.listen(this.actor, 'blur', () => { this.keyboardFocus = false; this.activity(); });
    this.listen(document, 'keydown', e => {
      if (e.key === 'Tab') this.pointerModality = false;
      if (e.key === 'Escape' && this.bubbleView) { this.stopTour(); this.closeBubble(); }
    });
    this.listen(document, 'pointerdown', e => {
      this.pointerModality = true; this.keyboardFocus = false;
      if (this.bubbleView === 'offer' && !this.root.contains(e.target)) this.closeBubble();
    }, true);
    this.listen(window, 'scroll', () => this.onScroll(), { passive: true });
    this.listen(window, 'resize', () => this.invalidate('resize'), { passive: true });
    this.listen(window, 'orientationchange', () => this.invalidate('resize'), { passive: true });
    this.listen(window, 'load', () => this.invalidate());
    this.listen(window, 'blur', () => { if (this.drag) this.cancelDrag(); });
    this.listen(window, 'calvin:layout', () => this.invalidate());
    this.listen(window, 'calvin:companion', e => this.context(e.detail?.action));
    this.listen(document, 'visibilitychange', () => { if (document.hidden && this.drag) this.cancelDrag(); this.sync(); });
    this.listen(this.media, 'change', () => this.setReduced(this.media.matches));
    this.listen(document, 'toggle', () => this.invalidate(), true);
    const geometryTransition = e => {
      if (this.root.contains(e.target) || e.target === this.wrapProxy || this.wrapProxy?.contains(e.target)) return;
      if (/^(transform|translate|scale|rotate|width|height|max-height|min-height|font-size|padding.*|margin.*|grid-template-.*)$/.test(e.propertyName)) this.invalidate();
    };
    // Reveal transforms do not resize their elements. Measure their final ink
    // position instead of retaining the mid-transition rectangle indefinitely.
    this.listen(document, 'transitionend', geometryTransition, true);
    this.listen(document, 'transitioncancel', geometryTransition, true);
    if ('ResizeObserver' in window) {
      this.resizeObserver = new ResizeObserver(() => this.invalidate());
      this.resizeObserver.observe(document.documentElement);
    }
    if ('MutationObserver' in window) {
      this.mutationObserver = new MutationObserver(records => {
        if (records.some(r => !this.root.contains(r.target) && r.target !== this.wrapProxy && !this.wrapProxy?.contains(r.target))) this.invalidate();
      });
      this.mutationObserver.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['open', 'hidden', 'aria-expanded'] });
    }
    document.fonts?.ready.then(() => { if (!this.destroyed) this.invalidate(); });
    this.paint(); this.sync(); return this;
  }

  measure() {
    const old = this.bounds;
    const width = this.root.offsetWidth || (innerWidth <= 720 ? 84 : 96);
    const height = this.root.offsetHeight || (innerWidth <= 720 ? 92 : 104);
    this.size = { width, height }; this.mobile = innerWidth <= 720;
    const topbar = document.querySelector('.topbar');
    const headerBottom = topbar ? Math.max(0, topbar.getBoundingClientRect().bottom) : 0;
    const left = width / 2 + 6, top = Math.min(innerHeight / 2, Math.max(height / 2 + 6, headerBottom + height / 2 + 5));
    this.bounds = { left, right: Math.max(left, innerWidth - width / 2 - 6), top, bottom: Math.max(top, innerHeight - height / 2 - 8) };
    let nodes = typeof this.obstacleSource === 'function' ? this.obstacleSource() : typeof this.obstacleSource === 'string' ? document.querySelectorAll(this.obstacleSource) : this.obstacleSource;
    // Kotak mentah disimpan supaya bentuk mengintip yang lebih ramping bisa diuji
    // dengan jejaknya sendiri, bukan dengan jejak kucing ukuran penuh.
    this.rawRects = [];
    this.obstacles = [...(nodes || [])].flatMap(node => {
      if (!node?.getBoundingClientRect || this.root.contains(node) || node.closest('[hidden]') || !node.getClientRects().length) return [];
      let rects = [node.getBoundingClientRect()];
      // A paragraph's block can fill the viewport while its short last line does
      // not. Protect actual line ink rather than inventing a full-width wall.
      const isText = node.matches?.('p,h1,h2,h3,h4,h5,h6,.eyebrow,.name,.role,.motto,.lede,.chapter-kicker,.display,.bridge,.case-lede,.case-sub,.case-fact,.case-role,.contact-lede,.foot-note');
      if (isText && document.createRange) {
        const range = document.createRange();
        try { range.selectNodeContents(node); const lines = [...range.getClientRects()].filter(r => r.width > 1 && r.height > 1); if (lines.length) rects = lines; }
        finally { range.detach?.(); }
      }
      // Jejak yang terlihat tidak simetris: caption menggantung di bawah badan, jadi sisi
      // atas penghalang perlu jarak lebih agar label itu tidak menimpa teks di bawahnya.
      const padX = width * .45 + 5, padUp = height * .5 + 4, padDown = height * .5 + 22;
      const live = rects.filter(r => r.width >= 1 && r.height >= 1 && r.bottom >= -height && r.top <= innerHeight + height);
      for (const r of live) this.rawRects.push({ left: r.left, right: r.right, top: r.top, bottom: r.bottom });
      return live.map(r => ({ left: r.left - padX, right: r.right + padX, top: r.top - padDown, bottom: r.bottom + padUp }));
    });
    const unique = new Set();
    this.obstacles = this.obstacles.filter(r => { const key = [r.left,r.right,r.top,r.bottom].map(v => Math.round(v)).join(','); if (unique.has(key)) return false; unique.add(key); return true; });
    this.geometryRevision++; this.dirty = false;
    const layoutResized = old && (old.left !== this.bounds.left || old.right !== this.bounds.right || old.top !== this.bounds.top || old.bottom !== this.bounds.bottom);
    if (layoutResized && !this.drag && !pointFree(this.p, this.bounds, this.obstacles)) {
      // Resize is layout placement, even when animation has been paused.
      this.p = this.pickEdge(clamp(this.p.y, this.bounds.top, this.bounds.bottom)).point;
      this.stopRoute(); this.recoveries++;
    }
  }

  preferredY() {
    let best = null, score = -Infinity;
    document.querySelectorAll('[data-cat-perch]').forEach(node => {
      const section = node.closest('section') || node.parentElement;
      const r = section.getBoundingClientRect();
      const visible = Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0));
      const merit = visible / Math.min(innerHeight, Math.max(1, r.height));
      if (visible && merit > score) { best = node.getBoundingClientRect().top; score = merit; }
    });
    return clamp(best ?? innerHeight * .72, this.bounds.top, this.bounds.bottom);
  }

  edgeCandidates(y) {
    const b = this.bounds, ys = [clamp(y, b.top, b.bottom), b.top, b.bottom];
    for (let v = b.top; v < b.bottom; v += 32) ys.push(v);
    for (const r of this.obstacles) ys.push(clamp(r.top - 3, b.top, b.bottom), clamp(r.bottom + 3, b.top, b.bottom));
    const result = [];
    for (const yy of [...new Set(ys)]) for (const x of [b.left, b.right]) result.push({ x, y: yy });
    return result;
  }

  /**
   * Bentuk mengintip untuk viewport padat: badan diciutkan dan ditempelkan ke margin
   * luar, jadi jejaknya jauh lebih kecil daripada kucing berdiri. Dipakai hanya ketika
   * tidak ada satu pun titik tepi yang benar-benar bebas.
   */
  perchFootprint() {
    const width = (this.size?.width || 96) * PERCH_SCALE;
    const height = (this.size?.height || 104) * PERCH_SCALE;
    return { halfX: width / 2, halfY: height / 2 };
  }

  /** Mencari tempat mengintip yang terbukti kosong terhadap kotak teks yang sebenarnya. */
  findPerch(y = this.p.y) {
    if (!this.rawRects) return null;
    const { halfX, halfY } = this.perchFootprint();
    const margin = 3;                                   // sisa badan yang tetap terlihat
    const xs = [halfX + margin, innerWidth - halfX - margin];
    const preferred = this.mobile ? xs[1] : (this.p.x < innerWidth / 2 ? xs[0] : xs[1]);
    const top = this.bounds.top, bottom = this.bounds.bottom;
    const free = (x, yy) => !this.rawRects.some(r =>
      x + halfX > r.left - 2 && x - halfX < r.right + 2 && yy + halfY > r.top - 2 && yy - halfY < r.bottom + 2);
    const candidates = [];
    for (let yy = Math.ceil(top); yy <= bottom; yy += 6) for (const x of xs) if (free(x, yy)) candidates.push({ x, y: yy });
    if (!candidates.length) return null;
    candidates.sort((a, b) =>
      (Math.abs(a.y - y) + (a.x === preferred ? 0 : 70)) - (Math.abs(b.y - y) + (b.x === preferred ? 0 : 70)));
    return candidates[0];
  }

  setPerched(on) {
    if (this.perched === on) return;
    this.perched = on;
    if (on) this.root.dataset.perch = 'edge'; else delete this.root.dataset.perch;
  }

  pickEdge(y = this.p.y, from = this.p) {
    const choices = this.edgeCandidates(y);
    const preferred = this.mobile ? this.bounds.right : (from.x < innerWidth / 2 ? this.bounds.left : this.bounds.right);
    const free = choices.filter(p => pointFree(p, this.bounds, this.obstacles));
    const sorted = (free.length ? free : choices).map(point => {
      const overlap = this.obstacles.reduce((sum, r) => sum + (inside(point, r) ? 1 : 0), 0);
      return { point, score: dist(point, from) + Math.abs(point.y - y) * .22 + (point.x !== preferred ? 32 : 0) + overlap * 10000, free: pointFree(point, this.bounds, this.obstacles) };
    }).sort((a, b) => a.score - b.score);
    return sorted[0] || { point: { x: this.bounds.right, y: this.bounds.bottom }, free: false };
  }

  invalidate(reason = 'geometry') {
    if (this.destroyed) return;
    this.dirty = true;
    if (reason === 'resize') this.resizePending = true;
    if (this.canRun()) this.request();
    else if (!this.layoutPending) {
      this.layoutPending = true;
      queueMicrotask(() => {
        this.layoutPending = false; if (this.destroyed) return;
        this.measure();
        if (this.reduced && !this.drag && !pointFree(this.p, this.bounds, this.obstacles)) { this.p = this.pickEdge(this.p.y).point; this.stopRoute(); }
        this.paint();
      });
    }
  }

  setPaused(value) { this.paused = Boolean(value); this.sync(); return this; }
  setReduced(value) {
    this.reduced = Boolean(value);
    if (this.reduced) {
      this.sequence = null; this.stateUntil = Infinity; this.expression = 'idle'; this.mode = 'rest';
      this.stopRoute(); this.transientUntil = Infinity;
    }
    this.dirty = true; this.sync(); return this;
  }

  sync() {
    const run = this.canRun();
    if (!run && this.anchor !== null) { this.logical = this.now(); this.anchor = null; }
    if (run && this.anchor === null) { this.anchor = performance.now(); this.previous = this.now(); }
    cancelAnimationFrame(this.frame); this.frame = 0; clearTimeout(this.timer); this.timer = 0;
    this.root.classList.toggle('is-paused', !run);
    if (this.dirty) this.measure();
    if (this.reduced && !this.drag && !pointFree(this.p, this.bounds, this.obstacles)) this.p = this.pickEdge(this.p.y).point;
    this.paint(); if (run) this.request();
  }

  activity() {
    this.lastActivity = this.now(); this.nextStroll = this.now() + 9000; this.boredShown = false;
    if (this.expression === 'sleep') { this.expression = 'greet'; this.transientUntil = this.now() + 900; }
    this.request();
  }

  request() {
    if (!this.canRun() || this.frame) return;
    clearTimeout(this.timer); this.timer = 0;
    this.frame = requestAnimationFrame(() => { this.frame = 0; this.tick(); });
  }
  wait(ms) {
    clearTimeout(this.timer); this.timer = 0;
    if (this.canRun()) this.timer = setTimeout(() => { this.timer = 0; this.request(); }, clamp(ms, 24, 2500));
  }
  stopRoute({ preserveWrap = false } = {}) {
    this.route = []; this.routeGoal = null; this.speed = 0; this.v = { x: 0, y: 0 }; this.egress = false;
    if (!preserveWrap) {
      // Transfer the visible proxy to the real actor before interrupting a portal.
      // An offscreen original must never be left behind when its proxy is removed.
      if (this.wrap?.phase === 'cross' && (this.p.x < 0 || this.p.x > innerWidth)) this.p.x = ((this.p.x % innerWidth) + innerWidth) % innerWidth;
      this.wrap = null; if (this.wrapProxy) this.wrapProxy.hidden = true;
    }
  }

  onScroll() {
    const real = performance.now(), dy = window.scrollY - this.lastScrollY;
    const dt = clamp((real - this.lastScrollReal) / 1000, .008, .12);
    this.scrollVelocity = this.scrollVelocity * .25 + dy / dt * .75;
    this.lastScrollY = window.scrollY; this.lastScrollReal = real;
    this.lastActivity = this.now(); this.nextStroll = this.now() + 9000;
    this.settleAt = this.now() + 240; this.dirty = true;
    if (!this.drag && this.canRun() && (Math.abs(this.scrollVelocity) > 650 || Math.abs(dy) > 75 || this.windUntilReal > real)) {
      this.windUntilReal = real + 190;
      if (this.mode !== 'wind') { this.interruptedMode = this.mode; this.stopRoute({ preserveWrap: Boolean(this.wrap?.phase === 'cross') }); this.mode = 'wind'; this.expression = 'wind'; }
    }
    this.request();
    if (!this.canRun()) this.invalidate();
  }

  pointerDown(e) {
    if (this.drag || !e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.preventDefault(); this.pointerModality = true; this.keyboardFocus = false;
    this.stopRoute(); this.sequence = null; this.stateUntil = Infinity; this.transientUntil = Infinity;
    this.windUntilReal = 0; this.interruptedMode = null; this.closeBubble(); this.setPerched(false); this.mode = 'drag'; this.expression = 'held';
    const real = performance.now();
    this.drag = { id: e.pointerId, offset: { x: e.clientX - this.p.x, y: e.clientY - this.p.y }, start: { x: e.clientX, y: e.clientY }, moved: false, samples: [{ x: e.clientX, y: e.clientY, t: real }], reversals: [], lastAxis: { x: 0, y: 0 }, axisTravel: { x: 0, y: 0 }, lastTurn: 0, shake: false, latest: { x: e.clientX, y: e.clientY }, zone: this.pointerZone(e) };
    try { this.actor.setPointerCapture(e.pointerId); } catch {}
    // Tahan nyaman: hanya berlaku selama belum melewati ambang seret 6 px.
    this.holdSatisfied = false;
    clearTimeout(this.holdTimer);
    this.holdTimer = setTimeout(() => {
      this.holdTimer = 0;
      if (!this.drag || this.drag.moved) return;
      this.holdSatisfied = true; this.expression = 'love';
      this.stateStarted = this.now(); this.stateDuration = 900;
      this.paint(); this.request();
    }, 350);
    this.activity(); this.paint();
  }

  /** Satu usapan panjang di atas karakter memicu satu tawa, bukan puluhan respons. */
  feelTickle(e) {
    const real = performance.now();
    if (real < this.tickle.cooldownUntil || this.sequence || this.bubbleView === 'tour') return;
    if (real > this.tickle.until) this.tickle.travel = 0;
    this.tickle.until = real + 420;
    const previous = this.tickle.at;
    if (previous) this.tickle.travel += Math.hypot(e.clientX - previous.x, e.clientY - previous.y);
    this.tickle.at = { x: e.clientX, y: e.clientY };
    if (this.tickle.travel < 90) return;
    this.tickle.travel = 0; this.tickle.cooldownUntil = real + 2600;
    this.activity();
    this.runSequence([
      { mode: 'rest', expression: 'laugh', duration: 900 },
      { mode: 'rest', expression: 'mischievous', duration: 700 }
    ], { keepBubble: true });
    this.paint(); this.request();
  }

  /** Kepala kira-kira 55 persen bagian atas kotak karakter. */
  pointerZone(e) {
    const r = this.actor.getBoundingClientRect();
    if (!r.height) return 'body';
    return (e.clientY - r.top) / r.height < .55 ? 'head' : 'body';
  }

  pointerMove(e) {
    if (!this.drag || this.drag.id !== e.pointerId) return;
    e.preventDefault();
    const d = this.drag, real = performance.now();
    const samples = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [];
    const events = samples.length ? samples : [e];
    for (const item of events) {
      let t = Number(item.timeStamp) || real;
      if (Math.abs(t - real) > 100000) t = real;
      const previous = d.samples[d.samples.length - 1];
      const dx = item.clientX - previous.x, dy = item.clientY - previous.y;
      for (const [axis, delta] of [['x', dx], ['y', dy]]) {
        if (Math.abs(delta) < .15) continue;
        const sign = Math.sign(delta);
        if (d.lastAxis[axis] && sign !== d.lastAxis[axis]) {
          if (d.axisTravel[axis] >= 12 && t - d.lastTurn > 45) { d.reversals.push(t); d.lastTurn = t; }
          d.axisTravel[axis] = Math.abs(delta);
        } else d.axisTravel[axis] += Math.abs(delta);
        d.lastAxis[axis] = sign;
      }
      if (t > previous.t) d.samples.push({ x: item.clientX, y: item.clientY, t });
      d.reversals = d.reversals.filter(v => t - v < 850);
      if (d.reversals.length >= 4) d.shake = true;
    }
    d.samples = d.samples.filter(p => real - p.t < 150);
    if (!d.samples.length) d.samples.push({ x: e.clientX, y: e.clientY, t: real });
    d.latest = { x: e.clientX, y: e.clientY };
    if (dist(d.start, d.latest) > 6) {
      if (!d.moved) { clearTimeout(this.holdTimer); this.holdTimer = 0; this.holdSatisfied = false; this.expression = 'held'; }
      d.moved = true;
    }
    if (d.moved) {
      this.p = { x: clamp(e.clientX - d.offset.x, this.bounds.left, this.bounds.right), y: clamp(e.clientY - d.offset.y, this.bounds.top, this.bounds.bottom) };
      const velocity = this.releaseVelocity(); this.v = velocity;
    }
    this.paint(); this.request();
  }

  releaseVelocity() {
    if (!this.drag) return { x: 0, y: 0 };
    const samples = this.drag.samples, last = samples[samples.length - 1];
    if (!last || performance.now() - last.t > 100) return { x: 0, y: 0 };
    const first = samples.find(p => last.t - p.t <= 95) || samples[0];
    const dt = Math.max(.016, (last.t - first.t) / 1000);
    return { x: clamp((last.x - first.x) / dt, -2400, 2400), y: clamp((last.y - first.y) / dt, -2400, 2400) };
  }

  pointerUp(e, cancelled) {
    if (!this.drag || this.drag.id !== e.pointerId) return;
    const d = this.drag, velocity = this.releaseVelocity(); this.drag = null;
    clearTimeout(this.holdTimer); this.holdTimer = 0;
    try { if (this.actor.hasPointerCapture(e.pointerId)) this.actor.releasePointerCapture(e.pointerId); } catch {}
    this.activity();
    if (!d.moved && !cancelled) {
      this.mode = 'rest';
      if (this.holdSatisfied) {
        // Tahan pelan: nyaman, lalu malu dan mengedip. Tidak membuka tawaran tur.
        this.holdSatisfied = false;
        this.runSequence([
          { mode: 'rest', expression: 'shy', duration: 820 },
          { mode: 'rest', expression: 'wink', duration: 620 }
        ]);
        this.suppressClickUntil = performance.now() + 450; this.paint(); this.request(); return;
      }
      // Tap singkat: satu jalur aktivasi untuk ekspresi sekaligus tawaran tur.
      this.shortActivation(d.zone === 'head' ? 'head' : 'body');
      this.suppressClickUntil = performance.now() + 450; this.paint(); return;
    }
    this.holdSatisfied = false;
    this.suppressClickUntil = performance.now() + 600;
    if (!this.canRun()) { this.staticReturn(); return; }
    const harsh = !cancelled && (Math.hypot(velocity.x, velocity.y) > 1000 || d.shake);
    if (harsh) {
      this.mode = 'flight'; this.expression = 'held'; this.flightAt = this.now(); this.harshLanding = true;
      this.v = { x: velocity.x * .38, y: velocity.y * .38 - 90 };
      const magnitude = Math.hypot(this.v.x, this.v.y);
      if (magnitude > 850) { this.v.x *= 850 / magnitude; this.v.y *= 850 / magnitude; }
    } else this.beginLanding(false);
    this.paint(); this.request();
  }

  cancelDrag() { if (this.drag) this.pointerUp({ pointerId: this.drag.id }, true); }
  staticReturn() {
    if (this.dirty) this.measure();
    const spot = this.pickEdge(this.p.y);
    if (spot.free) { this.setPerched(false); this.p = spot.point; }
    else { const perch = this.findPerch(this.p.y); if (perch) { this.setPerched(true); this.p = perch; } else { this.setPerched(false); this.p = spot.point; } }
    this.stopRoute(); this.mode = 'rest'; this.expression = 'idle'; this.paint();
  }

  beginLanding(harsh) {
    this.v = { x: 0, y: 0 }; this.speed = 0; this.landAt = this.now();
    // Keduanya berakhir dengan mengedip sebelum kembali ke tepi aman; tidak ada teks.
    this.runSequence(harsh ? [
      { mode: 'landing', expression: 'idle', duration: 180 },
      { mode: 'rest', expression: 'dizzy', duration: 900 },
      { mode: 'rest', expression: 'angry-build', duration: 780 },
      { mode: 'rest', expression: 'angry-burst', duration: 260 },
      { mode: 'rest', expression: 'angry', duration: 650 },
      { mode: 'rest', expression: 'sulk', duration: 1000 },
      { mode: 'rest', expression: 'wink', duration: 600 }
    ] : [
      { mode: 'landing', expression: 'surprised', duration: 180 },
      { mode: 'rest', expression: 'proud', duration: 800 },
      { mode: 'rest', expression: 'wink', duration: 600 }
    ], { walkBack: true, kind: 'landing' });
  }

  /** Rangkaian nonverbal di tempat. `walkBack` hanya untuk reaksi sesudah berpindah posisi. */
  runSequence(parts, { walkBack = false, keepBubble = false, kind = 'reaction' } = {}) {
    this.sequence = parts; this.sequenceWalksBack = walkBack; this.sequenceKeepsBubble = keepBubble;
    this.sequenceKind = kind;
    this.sequenceIndex = -1; this.transientUntil = Infinity; this.advanceSequence();
  }

  /** Prioritas: seret dan rangkaian pendaratan/marah tidak boleh dipotong intent kosmetik. */
  reactionIsProtected() {
    return Boolean(this.drag) || (Boolean(this.sequence) && this.sequenceKind === 'landing');
  }

  advanceSequence() {
    if (!this.sequence) return;
    this.sequenceIndex++;
    const part = this.sequence[this.sequenceIndex];
    if (!part) {
      const walkBack = this.sequenceWalksBack !== false;
      this.sequence = null; this.sequenceKeepsBubble = false; this.stateUntil = Infinity; this.expression = 'idle';
      if (walkBack) this.returnToEdge();
      if (this.tour.active) this.renderTour();
      return;
    }
    this.mode = part.mode; this.expression = part.expression;
    this.stateStarted = this.now(); this.stateDuration = part.duration;
    this.stateUntil = this.stateStarted + part.duration;
    // Anger is told entirely through face and body animation. The only speech
    // bubbles belong to an explicitly opened portfolio tour.
    if (this.bubbleView && !this.sequenceKeepsBubble) this.closeBubble();
  }

  /** Satu jalur aktivasi singkat: ekspresi, lalu tawaran tur bila belum terbuka. */
  shortActivation(zone = 'head') {
    const list = zone === 'head' ? HEAD_TAPS : BODY_TAPS;
    const index = zone === 'head' ? this.headTapIndex++ : this.bodyTapIndex++;
    const face = list[index % list.length];
    const offerAlreadyOpen = this.bubbleView === 'offer' || this.bubbleView === 'tour';
    const parts = [{ mode: 'rest', expression: face, duration: 900 }];
    // Kejutan pada badan boleh berlanjut menjadi bingung lalu bersin kecil, sekali saja.
    if (face === 'surprised') parts.push(
      { mode: 'rest', expression: 'puzzled', duration: 620 },
      { mode: 'rest', expression: 'sneeze', duration: 700 }
    );
    this.runSequence(parts, { keepBubble: true });
    if (!offerAlreadyOpen) this.openOffer({ fromTap: true });
    this.lastTapAt = performance.now();
  }

  returnToEdge(y = this.p.y) {
    if (this.drag || this.keyboardFocus || this.bubbleView === 'offer') return false;
    if (this.dirty) this.measure();
    if (!this.canRun()) { this.staticReturn(); return true; }
    const containing = this.obstacles.filter(r => inside(this.p, r));
    const allowed = this.obstacles.filter(r => !containing.includes(r));
    const choices = this.edgeCandidates(y).filter(p => pointFree(p, this.bounds, this.obstacles))
      .sort((a, b) => dist(a, this.p) - dist(b, this.p));
    let route = null, goal = null;
    for (const candidate of choices.slice(0, 16)) {
      this.routePlans++;
      route = planRoute(this.p, candidate, this.bounds, allowed, { preferEdges: true });
      if (route) { goal = candidate; break; }
    }
    if (!route) {
      // Tidak ada titik tepi yang bebas. Kandidat dengan free:false bukan tempat
      // istirahat yang sah, jadi kucing mengintip dari margin dengan jejak lebih kecil
      // sebelum jatuh ke fallback lama. Ia tetap terlihat dan tetap bisa disapa.
      const perch = this.findPerch(y);
      if (perch) {
        this.setPerched(true);
        goal = perch; route = dist(this.p, goal) > 2 ? [{ ...goal }] : [];
        this.routeObstacles = []; this.egress = true;
      } else {
        const fallback = this.pickEdge(y);
        // Explicit visible egress: brief overlap is preferable to a hide/teleport.
        goal = fallback.point; route = dist(this.p, goal) > 2 ? [{ ...goal }] : [];
        this.routeObstacles = []; this.egress = true;
      }
    } else { this.setPerched(false); this.routeObstacles = allowed; this.egress = containing.length > 0; }
    this.route = route; this.routeGoal = goal;
    this.mode = route.length ? (this.egress ? 'recover' : 'walk') : 'rest';
    this.expression = 'idle'; this.settleAt = Infinity; this.request(); return true;
  }

  walkTo(goal) {
    if (!this.canRun() || this.drag || this.bubbleView || this.keyboardFocus) return false;
    if (this.dirty) this.measure();
    const freeGoal = nearestFree(goal, this.bounds, this.obstacles, true);
    if (!freeGoal || !pointFree(this.p, this.bounds, this.obstacles)) return this.returnToEdge();
    this.routePlans++;
    const route = planRoute(this.p, freeGoal, this.bounds, this.obstacles, { preferEdges: true });
    if (!route) return false;
    this.route = route; this.routeGoal = freeGoal; this.routeObstacles = this.obstacles; this.egress = false;
    this.setPerched(false);
    this.mode = route.length ? 'walk' : 'rest'; this.expression = 'idle'; this.request(); return true;
  }

  /** A real full-width clear corridor is required. This is never scroll recovery. */
  requestWalkAcross({ direction = 'right', y } = {}) {
    if (!this.wrapProxy || !this.canRun() || this.mobile || this.drag || this.sequence || this.bubbleView || this.keyboardFocus || this.actor.matches(':hover')) return false;
    if (this.dirty) this.measure();
    if (!pointFree(this.p, this.bounds, this.obstacles)) return false;
    const candidates = y === undefined ? this.edgeCandidates(this.p.y).map(p => p.y) : [clamp(y, this.bounds.top, this.bounds.bottom)];
    const ys = [...new Set(candidates)].sort((a, b) => Math.abs(a - this.p.y) - Math.abs(b - this.p.y));
    for (const yy of ys) {
      const left = { x: this.bounds.left, y: yy }, right = { x: this.bounds.right, y: yy };
      if (!segmentClear(left, right, this.bounds, this.obstacles)) continue;
      const goal = direction === 'left' ? left : right;
      this.routePlans++;
      const route = planRoute(this.p, goal, this.bounds, this.obstacles, { preferEdges: true });
      if (!route) continue;
      this.route = route; this.routeGoal = goal; this.routeObstacles = this.obstacles; this.egress = false;
      this.wrap = { phase: route.length ? 'approach' : 'cross', direction: direction === 'left' ? -1 : 1, y: yy };
      this.mode = route.length ? 'walk' : 'wrap'; this.expression = 'idle'; this.nextWrap = this.now() + 24000;
      this.request(); return true;
    }
    this.nextWrap = this.now() + 9000; return false;
  }

  stepWrap(dt) {
    if (!this.wrap) return;
    const direction = this.wrap.direction;
    this.speed = approach(this.speed, 90, 260 * dt);
    const dx = direction * this.speed * dt;
    this.p.x += dx; this.p.y = this.wrap.y; this.v = { x: direction * this.speed, y: 0 };
    this.phase += Math.abs(dx) / 33 * Math.PI * 2; this.stride = approach(this.stride, 1, dt * 7);
    this.facing = direction > 0 ? 'right' : 'left'; this.lean = approach(this.lean, direction * 2, dt * 20);
    this.mode = 'wrap';
    if (direction > 0 && this.p.x >= innerWidth + this.bounds.left) {
      this.p.x -= innerWidth; this.wrapCount++; this.wrap = null; this.mode = 'rest'; this.speed = 0;
    } else if (direction < 0 && this.p.x <= this.bounds.right - innerWidth) {
      this.p.x += innerWidth; this.wrapCount++; this.wrap = null; this.mode = 'rest'; this.speed = 0;
    }
    if (!this.wrap) {
      this.v = { x: 0, y: 0 }; this.nextStroll = this.now() + 9000;
      if (!pointFree(this.p, this.bounds, this.obstacles)) this.settleAt = this.now() + 1;
    }
  }

  keyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') return; // Native button click opens the offer once.
    if (e.key === 'Escape') { e.preventDefault(); this.stopTour(); this.closeBubble(); this.keyboardFocus = false; this.returnToEdge(); return; }
    const delta = { ArrowLeft: [-24, 0], ArrowRight: [24, 0], ArrowUp: [0, -24], ArrowDown: [0, 24] }[e.key];
    if (!delta) return;
    e.preventDefault(); this.stopRoute(); this.sequence = null; this.closeBubble();
    this.keyboardFocus = true; this.pointerModality = false;
    this.p = { x: clamp(this.p.x + delta[0], this.bounds.left, this.bounds.right), y: clamp(this.p.y + delta[1], this.bounds.top, this.bounds.bottom) };
    this.mode = 'rest'; this.expression = 'held'; this.activity(); this.paint();
  }

  /**
   * Intent kosmetik dari UI. Prioritas lebih rendah daripada seret dan rangkaian reaksi,
   * jadi aksi arsip dan studi kasus tetap jalan walaupun reaksinya diabaikan di sini.
   */
  context(kind) {
    if (this.reactionIsProtected()) return;
    // Buka map: penasaran sebentar, lalu bangga. Tutup: mengedip, lalu tenang.
    if (kind === 'archive-open') {
      this.activity();
      this.runSequence([
        { mode: 'rest', expression: 'curious', duration: 420 },
        { mode: 'rest', expression: 'proud', duration: 900 }
      ], { keepBubble: true });
      this.paint(); this.request(); return;
    }
    if (kind === 'archive-close') {
      this.activity();
      this.runSequence([{ mode: 'rest', expression: 'wink', duration: 1050 }], { keepBubble: true });
      this.paint(); this.request(); return;
    }
    // Menjelajah informasi: respons pendek, dengan cooldown agar tidak ramai saat membaca.
    if (kind === 'explore' || kind === 'inspect') {
      const real = performance.now();
      if (real < this.nextExploreReaction) return;
      this.nextExploreReaction = real + 4200;
      this.activity();
      this.expression = kind === 'inspect' ? 'focused' : 'thinking';
      this.stateStarted = this.now(); this.stateDuration = 900;
      this.transientUntil = this.now() + 900; this.paint(); this.request(); return;
    }
    const expressions = { greet: 'greet', project: 'approve', cv: 'approve', contact: 'flower', cool: 'cool', coffee: 'coffee', determined: 'determined' };
    if (!expressions[kind]) return;
    this.activity(); this.expression = expressions[kind];
    this.stateStarted = this.now(); this.stateDuration = 2000;
    this.transientUntil = this.now() + 2000; this.paint(); this.request();
  }

  /** `fromTap` berarti ekspresi sapaan sudah dipilih oleh aktivasi singkat. */
  openOffer({ fromTap = false } = {}) {
    if (this.drag) return;
    if (!fromTap && (this.sequence || performance.now() < this.suppressClickUntil)) return;
    if (this.bubbleView === 'offer' || this.bubbleView === 'tour') return;   // tidak membuka ulang
    this.activity(); this.stopRoute(); this.mode = 'rest';
    if (!fromTap) this.expression = 'greet';
    this.showBubble('offer', 'Mau aku tunjukkan isi portofolio Calvin? Kamu yang menentukan kapan lanjut.', [
      ['Mulai tur', () => this.startTour()], ['Main saja', () => { this.closeBubble(); this.context('greet'); }]
    ]);
  }

  showBubble(view, text, actions) {
    if (!this.bubble) return;
    // Mengganti isi bubble menghapus tombol yang sedang difokus, jadi fokusnya dipulihkan
    // ke kontrol baru di posisi yang sama setelah Mulai/Lanjut.
    const hadFocus = Boolean(document.activeElement && this.bubble.contains(document.activeElement));
    const focusedIndex = hadFocus ? [...this.bubble.querySelectorAll('button')].indexOf(document.activeElement) : -1;
    this.bubbleView = view; this.bubble.replaceChildren(); this.bubble.hidden = false;
    this.bubble.setAttribute('role', 'dialog');
    this.bubble.setAttribute('aria-label', 'Pemandu portofolio');
    const p = document.createElement('p'); p.className = 'pet-bubble-text'; p.textContent = text; this.bubble.append(p);
    if (actions.length) {
      const controls = document.createElement('div'); controls.className = 'pet-bubble-actions';
      for (const [label, action] of actions) { const button = document.createElement('button'); button.type = 'button'; button.textContent = label; button.addEventListener('click', action); controls.append(button); }
      this.bubble.append(controls);
    }
    this.actor.setAttribute('aria-expanded', 'true'); this.paintBubble();
    if (hadFocus) {
      const buttons = [...this.bubble.querySelectorAll('button')];
      const next = buttons[Math.max(0, Math.min(focusedIndex, buttons.length - 1))];
      if (next) { try { next.focus({ preventScroll: true }); } catch { next.focus(); } }
    }
  }

  closeBubble() {
    // Tombol di dalam bubble ikut tersembunyi; fokus tidak boleh jatuh ke <body>.
    const held = Boolean(this.bubble && document.activeElement && this.bubble.contains(document.activeElement));
    this.bubbleView = null; if (this.bubble) this.bubble.hidden = true;
    this.actor.setAttribute('aria-expanded', 'false');
    if (!held) return;
    // :focus-visible ikut menyala pada fokus terprogram, jadi modalitas dibaca sebelum fokus
    // dipindah: menutup bubble dengan mouse tidak boleh menahan kucing di tempat.
    const viaPointer = this.pointerModality;
    try { this.actor.focus({ preventScroll: true }); } catch { this.actor.focus(); }
    if (viaPointer) { this.keyboardFocus = false; this.activity(); }
  }

  startTour() {
    this.tour = { active: true, index: -1 };
    // Bertekad: hanya ketika pengunjung sendiri yang meminta tur.
    this.expression = 'determined'; this.stateStarted = this.now(); this.stateDuration = 700;
    this.continueTour();
  }
  continueTour() {
    if (!this.tour.active) return;
    let next = this.tour.index + 1;
    while (next < this.steps.length && !document.getElementById(this.steps[next].id)) next++;
    if (next >= this.steps.length) { this.stopTour(); this.showBubble('offer', 'Tur selesai. Terima kasih sudah mampir!', [['Tutup', () => this.closeBubble()]]); return; }
    this.tour.index = next; this.renderTour();
    const step = this.steps[next], element = document.getElementById(step.id);
    const options = { element, behavior: this.reduced ? 'auto' : 'smooth', source: 'tour' };
    if (this.onNavigate) this.onNavigate(step.id, options); else element.scrollIntoView({ behavior: options.behavior, block: 'start' });
    this.activity();
  }
  renderTour() {
    if (!this.tour.active || this.tour.index < 0) return;
    const step = this.steps[this.tour.index];
    this.showBubble('tour', `${step.title}. ${step.text}`, [[this.tour.index === this.steps.length - 1 ? 'Selesai' : 'Lanjut', () => this.continueTour()], ['Berhenti', () => { this.stopTour(); this.closeBubble(); this.activity(); }]]);
  }
  stopTour() { this.tour.active = false; if (this.bubbleView === 'tour') this.closeBubble(); }

  paintBubble() {
    if (!this.bubble || this.bubble.hidden || !this.size) return;
    const w = this.bubble.offsetWidth || Math.min(220, innerWidth - 24), h = this.bubble.offsetHeight || 140;
    const right = this.p.x + this.size.width / 2 + 8;
    let left = right + w <= innerWidth - 8 ? right : this.p.x - this.size.width / 2 - w - 8;
    let top = this.p.y - h / 2;
    if (this.mobile) { left = clamp(this.p.x - w / 2, 8, innerWidth - w - 8); top = this.p.y + this.size.height / 2 + 8; if (top + h > innerHeight - 8) top = this.p.y - this.size.height / 2 - h - 8; }
    left = clamp(left, 8, Math.max(8, innerWidth - w - 8)); top = clamp(top, 8, Math.max(8, innerHeight - h - 8));
    this.bubble.style.left = `${left - (this.p.x - this.size.width / 2)}px`;
    this.bubble.style.top = `${top - (this.p.y - this.size.height / 2)}px`;
  }

  tick() {
    if (!this.canRun()) return;
    const at = this.now(), real = performance.now(), elapsed = Math.max(0, at - this.previous);
    const dt = clamp(elapsed / 1000, .001, .035); this.previous = at;
    const geometryChanged = this.dirty;
    if (this.dirty) this.measure();
    // Tahan nyaman mempertahankan wajahnya; begitu melewati ambang seret, wajah kembali held.
    if (this.drag) { this.mode = 'drag'; if (!this.holdSatisfied) this.expression = 'held'; this.paint(); this.request(); return; }
    if (this.mode === 'wind' && real < this.windUntilReal) {
      this.expression = 'wind';
      if (this.sequence) { this.stateUntil += elapsed; this.stateStarted += elapsed; }
      this.lean = approach(this.lean, clamp(-this.scrollVelocity / 180, -12, 12), dt * 65);
      this.paint(); this.request(); return;
    }
    if (this.mode === 'wind') {
      this.windUntilReal = 0;
      if (this.interruptedMode === 'flight') { this.interruptedMode = null; this.beginLanding(true); }
      else if (this.interruptedMode === 'wrap' && this.wrap?.phase === 'cross') { this.mode = 'wrap'; this.expression = 'idle'; }
      else if (this.sequence) { const part = this.sequence[this.sequenceIndex]; this.mode = part.mode; this.expression = part.expression; }
      else { this.mode = 'rest'; this.expression = 'idle'; this.returnToEdge(this.preferredY()); }
    }
    if (this.mode === 'wrap' && this.wrap?.phase === 'cross') {
      this.stepWrap(dt);
    } else if (this.mode === 'flight') {
      this.v.y += 690 * dt; this.v.x *= Math.exp(-3.5 * dt); this.v.y *= Math.exp(-1.6 * dt);
      const next = { x: this.p.x + this.v.x * dt, y: this.p.y + this.v.y * dt };
      let impact = false;
      if (next.x < this.bounds.left || next.x > this.bounds.right) { next.x = clamp(next.x, this.bounds.left, this.bounds.right); this.v.x *= -.24; impact = true; }
      if (next.y < this.bounds.top || next.y > this.bounds.bottom) { next.y = clamp(next.y, this.bounds.top, this.bounds.bottom); this.v.y *= -.18; impact = true; }
      this.p = next; this.lean = clamp(this.v.x / 24, -25, 25);
      if (at - this.flightAt > 410 || (impact && at - this.flightAt > 130)) this.beginLanding(true);
    } else if (this.sequence) {
      if (at >= this.stateUntil) this.advanceSequence();
      this.lean = approach(this.lean, this.expression === 'dizzy' ? Math.sin(at / 100) * 7 : this.expression === 'sulk' ? -5 : 0, dt * 50);
    } else {
      if (at >= this.transientUntil) { this.expression = 'idle'; this.transientUntil = Infinity; }
      if (at >= this.settleAt && real - this.lastScrollReal > 190) {
        this.settleAt = Infinity;
        if (!this.keyboardFocus && !this.bubbleView) this.returnToEdge(this.preferredY());
      }
      const heldByUI = this.keyboardFocus || this.bubbleView === 'offer' || this.bubbleView === 'tour';
      if (geometryChanged && !this.route.length && !this.wrap && !heldByUI && real - this.lastScrollReal > 190 && !pointFree(this.p, this.bounds, this.obstacles)) {
        this.returnToEdge();
      }
      if (geometryChanged && this.route.length && !this.egress && !segmentClear(this.p, this.route[0], this.bounds, this.obstacles)) {
        this.stopRoute(); this.settleAt = at + 180;
      }
      if (geometryChanged && this.wrap?.phase === 'approach' && !segmentClear({ x: this.bounds.left, y: this.wrap.y }, { x: this.bounds.right, y: this.wrap.y }, this.bounds, this.obstacles)) {
        this.stopRoute(); this.settleAt = at + 180;
      }
      if (!heldByUI && this.route.length) this.stepRoute(dt);
      else {
        this.speed = approach(this.speed, 0, 420 * dt); this.stride = approach(this.stride, 0, dt * 8); this.lean = approach(this.lean, 0, dt * 18);
        if (!this.route.length) this.mode = 'rest';
      }
      // Bosan sekali, menguap, lalu tidur sampai ada input yang relevan. Bosan dipasang
      // sesudah jelajah terakhir selesai, bukan pada detik tertentu, supaya tidak terlewat.
      if (!heldByUI && !this.route.length && at - this.lastActivity >= 11600) {
        const idleFor = at - this.lastActivity;
        if (idleFor >= 15200) { this.expression = 'sleep'; this.mode = 'sleep'; this.boredShown = false; }
        else if (this.boredShown && idleFor >= 13400) {
          if (this.expression !== 'yawn') { this.expression = 'yawn'; this.mode = 'rest'; this.stateStarted = at; this.stateDuration = 1800; }
        }
        else if (!this.boredShown) {
          this.boredShown = true; this.expression = 'bored'; this.mode = 'rest';
          this.stateStarted = at; this.stateDuration = 1400;
        }
      }
      else if (!heldByUI && !this.route.length && !this.mobile && at >= this.nextWrap && at - this.lastActivity < 14000) {
        this.requestWalkAcross();
      }
      else if (!heldByUI && !this.route.length && at >= this.nextStroll && at - this.lastActivity < 13000) {
        this.nextStroll = at + 11000;
        const direction = this.p.y > (this.bounds.top + this.bounds.bottom) / 2 ? -1 : 1;
        this.walkTo({ x: this.p.x, y: clamp(this.p.y + direction * (this.mobile ? 18 : 30), this.bounds.top, this.bounds.bottom) });
      }
    }
    this.paint();
    const active = this.mode === 'flight' || this.mode === 'landing' || this.mode === 'wrap' || this.sequence || this.route.length || Math.abs(this.lean) > .05 || this.stride > .01 || this.mode === 'wind';
    if (active) this.request();
    else {
      const deadlines = [this.settleAt, this.transientUntil, this.nextStroll, this.nextWrap, this.lastActivity + 14000].filter(v => Number.isFinite(v) && v > at + 1);
      this.wait(deadlines.length ? Math.min(...deadlines) - at : 2500);
    }
  }

  stepRoute(dt) {
    const target = this.route[0], d = dist(this.p, target);
    if (d < 1.6) {
      this.p = { ...target }; this.route.shift();
      if (!this.route.length) {
        this.speed = 0; this.v = { x: 0, y: 0 }; this.routeGoal = null; this.egress = false;
        if (this.wrap?.phase === 'approach') { this.wrap.phase = 'cross'; this.mode = 'wrap'; }
        else {
          this.mode = 'rest';
          // A reveal can finish while egress is already in progress. Its old
          // goal may now contain ink even though the final geometry is current.
          // Recheck arrival, not just events received while the actor was idle.
          if (!pointFree(this.p, this.bounds, this.obstacles)) {
            const safe = this.pickEdge(this.p.y);
            if (safe.free && dist(safe.point, this.p) > .1) { this.settleAt = this.now() + 60; this.dirty = true; }
          }
        }
      }
      return;
    }
    const desiredFace = Math.abs(target.x - this.p.x) > 3 ? (target.x > this.p.x ? 'right' : 'left') : this.facing;
    // This front-facing character turns by gaze/lean, never scaleX(0).
    this.facing = desiredFace;
    const max = this.egress ? Math.min(340, Math.max(160, d / 1.2)) : this.mobile ? 65 : 92;
    const desired = this.route.length > 1 ? Math.min(max, Math.max(42, Math.sqrt(2 * 220 * d))) : Math.min(max, Math.sqrt(2 * 220 * d));
    this.speed = approach(this.speed, desired, (desired > this.speed ? 300 : 420) * dt);
    const step = Math.min(d, this.speed * dt), dx = (target.x - this.p.x) / d * step, dy = (target.y - this.p.y) / d * step;
    const next = { x: this.p.x + dx, y: this.p.y + dy };
    if (!this.egress && !segmentClear(this.p, next, this.bounds, this.obstacles)) { this.stopRoute(); this.settleAt = this.now() + 150; return; }
    this.p = next; this.v = { x: dx / dt, y: dy / dt }; this.phase += step / 33 * Math.PI * 2;
    this.stride = approach(this.stride, Math.min(1, this.speed / 55), dt * 7);
    this.lean = approach(this.lean, clamp(this.v.x / 38, -4, 4), dt * 24);
    this.mode = this.egress ? 'recover' : 'walk';
  }

  paint() {
    if (!this.size || this.destroyed) return;
    const at = this.now(), style = this.root.style;
    this.root.dataset.mode = this.mode; this.root.dataset.expression = this.expression; this.root.dataset.facing = this.facing;
    style.setProperty('--pet-x', `${(this.p.x - this.size.width / 2).toFixed(2)}px`);
    style.setProperty('--pet-y', `${(this.p.y - this.size.height / 2).toFixed(2)}px`);
    let lean = this.lean, lift = 0, scale = 1, bob = 0, armL = 0, armR = 0, legL = 0, legR = 0, earL = 0, earR = 0;
    let rage = 0, burst = 0, squashX = 1, squashY = 1, headTilt = 0, shiftX = 0;
    const progress = this.stateDuration > 0 ? clamp((at - this.stateStarted) / this.stateDuration, 0, 1) : 0;
    if (this.mode === 'drag') {
      scale = 1.11; lift = -4; lean = clamp(this.v.x / 85, -12, 12);
      const swing = this.canRun() ? Math.sin(at / 115) * 9 : 0;
      armL = 48 + swing * .4; armR = -armL; legL = 4 + swing * .85; legR = -legL;
      earL = -5; earR = 5;
    } else if (this.mode === 'wind') {
      const gust = this.canRun() ? Math.sin(at / 85) : 0;
      armL = -27 + gust * 4; armR = 27 - gust * 4; legL = 6 + gust * 2; legR = -6 - gust * 2;
      earL = -13; earR = -9; lift = -2;
    } else if (this.mode === 'flight') {
      armL = -44; armR = 44; legL = 12; legR = -12; scale = 1.05;
    } else if (this.mode === 'landing') {
      const f = clamp((at - this.landAt) / 400, 0, 1);
      lift = Math.sin(f * Math.PI) * 4; legL = -8 * (1 - f); legR = 8 * (1 - f);
      scale = 1 + Math.sin(f * Math.PI) * .025;
    } else if (this.expression === 'angry-build') {
      // Anticipation: pressure rises before a single readable cartoon burst.
      // All joint values move as one silhouette; no detached limb teleports.
      const pressure = progress * progress * (3 - 2 * progress);
      rage = pressure; squashX = 1 + .08 * pressure; squashY = 1 - .045 * pressure;
      armL = 18 + pressure * 34; armR = -armL;
      legL = -pressure * 5; legR = pressure * 5; earL = -4 - pressure * 10; earR = -earL;
      const tremble = Math.sin(progress * Math.PI * 18) * pressure;
      shiftX = tremble * .7; lean += tremble * 1.1; headTilt = -2 * pressure;
    } else if (this.expression === 'angry-burst') {
      // One squash/stretch pop: starts at the previous inflated silhouette and
      // resolves back to its ordinary size without a flash or whole-body flip.
      const ease = progress * progress * (3 - 2 * progress), pop = Math.sin(progress * Math.PI);
      rage = 1; burst = progress;
      squashX = 1 + .08 * (1 - ease) + .14 * pop;
      squashY = 1 - .045 * (1 - ease) - .10 * Math.sin(progress * Math.PI * 2);
      lift = -3.4 * pop; armL = 52 + pop * 6; armR = -armL;
      legL = -5 + pop * 5; legR = -legL; earL = -14 + pop * 6; earR = -earL;
      headTilt = -2 * (1 - ease); lean += Math.sin(progress * Math.PI * 4) * (1 - progress) * 2;
    } else if (this.expression === 'angry') {
      rage = 1 - progress * .25; armL = 52 - progress * 9; armR = -armL;
      earL = -14 + progress * 5; earR = -earL;
      const stomp = Math.sin(progress * Math.PI * 6), decay = 1 - progress * .55;
      shiftX = stomp * decay; bob = -Math.abs(stomp) * 1.4 * decay;
      legL = Math.max(0, stomp) * 7; legR = Math.max(0, -stomp) * -7;
      lean += stomp * 1.2 * decay;
    } else if (this.expression === 'sulk') {
      const ease = progress * progress * (3 - 2 * progress);
      rage = .75 * (1 - ease); armL = 43 - ease * 30; armR = -armL;
      legL = 4; legR = -4; headTilt = -5 * Math.sin(progress * Math.PI);
      earL = -9 * (1 - ease); earR = -earL;
    }
    else if (this.mode === 'walk' || this.mode === 'recover' || this.mode === 'wrap' || this.stride > .01) {
      const stride = Math.sin(this.phase) * this.stride;
      legL = stride * 13; legR = -stride * 13; armL = -stride * 5; armR = stride * 5;
      bob = -(1 - Math.cos(this.phase * 2)) * this.stride * .9;
    }
    // Wajah paket 10 ditumpuk DI ATAS gait perjalanan, bukan menggantinya, supaya kaki tetap
    // melangkah sesuai jarak tempuh ketika reaksi kecil terjadi sambil berjalan.
    if (LIBRARY_POSES.has(this.expression)) {
      const lib = CalvinCatExpressions.getPose(this.expression, progress, {
        intensity: this.mobile ? .82 : 1,
        gaze: this.facing === 'right' ? 1 : -1,
        motion: this.canRun()
      });
      headTilt += lib.head; armL += lib.armL; armR += lib.armR; legL += lib.legL; legR += lib.legR;
      squashX *= lib.sx; squashY *= lib.sy; lift += lib.lift; lean += lib.lean; shiftX += lib.shift;
      if (lib.rage > rage) rage = lib.rage;
    }
    // Lapisan fisik (posisi, pantulan, skala saat diangkat) tetap milik berkas ini.
    style.setProperty('--pet-lean', `${lean.toFixed(2)}deg`); style.setProperty('--pet-lift', `${lift.toFixed(2)}px`);
    style.setProperty('--pet-scale', scale.toFixed(4)); style.setProperty('--pet-bob', `${bob.toFixed(2)}px`);
    style.setProperty('--ear-left', `${earL.toFixed(2)}deg`); style.setProperty('--ear-right', `${earR.toFixed(2)}deg`);
    style.setProperty('--pet-shift-x', `${shiftX.toFixed(2)}px`);
    style.setProperty('--pet-squash-x', squashX.toFixed(4));   // dipakai bayangan di bawah badan
    const walking = ['walk','recover','wrap'].includes(this.mode);
    const liftPhase = walking ? Math.sin(this.phase) * this.stride : 0;
    style.setProperty('--leg-scale-left', (1 - Math.max(0,liftPhase)*.10).toFixed(4));
    style.setProperty('--leg-scale-right', (1 - Math.max(0,-liftPhase)*.10).toFixed(4));
    // Lapisan ilustrasi ditulis satu kali lewat renderer pose; tidak ada pemilik kedua.
    if (this.skin) CalvinCatExpressions.apply(this.skin, {
      name: this.expression, head: headTilt, armL, armR, legL, legR,
      sx: squashX, sy: squashY, lift: 0, lean: 0, shift: 0,
      gaze: this.facing === 'right' ? 1.8 : -1.8, rage, burst,
      raised: (this.expression === 'held' || this.expression.startsWith('angry')) ? 1 : 0
    });
    if (this.wrapProxy) {
      this.wrapProxy.classList.toggle('is-paused', !this.canRun());
      const crossing = this.wrap?.phase === 'cross' && (this.p.x > innerWidth - this.size.width / 2 || this.p.x < this.size.width / 2);
      if (this.wrapProxy.hidden === Boolean(crossing)) this.wrapProxy.hidden = !crossing;
      if (crossing) {
        this.wrapProxy.style.cssText = this.root.style.cssText;
        this.wrapProxy.style.pointerEvents = 'none';
        this.wrapProxy.style.setProperty('--wrap-x', `${(this.p.x - this.size.width / 2 + (this.wrap.direction > 0 ? -innerWidth : innerWidth)).toFixed(2)}px`);
        this.wrapProxy.style.setProperty('--wrap-y', `${(this.p.y - this.size.height / 2).toFixed(2)}px`);
        this.wrapProxy.dataset.mode = this.mode; this.wrapProxy.dataset.expression = this.expression; this.wrapProxy.dataset.facing = this.facing;
        // Proxy dekoratif ikut membawa pose ilustrasi; ia tetap tanpa tombol, fokus, atau state.
        const proxySkin = this.wrapProxy.querySelector('.calvin-cat10');
        if (proxySkin && this.skin) { proxySkin.style.cssText = this.skin.style.cssText; proxySkin.dataset.expression = this.expression; }
      }
    }
    this.paintBubble();
  }

  inspect() {
    return { position: { ...this.p }, velocity: { ...this.v }, mode: this.mode, expression: this.expression, facing: this.facing,
      route: this.route.map(p => ({ ...p })), goal: this.routeGoal && { ...this.routeGoal }, pointerId: this.drag?.id ?? null,
      dragged: Boolean(this.drag?.moved), shake: Boolean(this.drag?.shake), paused: this.paused, reduced: this.reduced,
      raf: Boolean(this.frame), timer: Boolean(this.timer), visible: true, safetyHidden: false, recoveries: this.recoveries,
      viewport: { width: innerWidth, height: innerHeight }, bounds: { ...this.bounds }, clock: this.now(),
      reaction: this.sequence ? { stage: this.sequence[this.sequenceIndex]?.expression, progress: this.stateDuration > 0 ? clamp((this.now() - this.stateStarted) / this.stateDuration, 0, 1) : 0, duration: this.stateDuration } : null,
      geometryRevision: this.geometryRevision, routePlans: this.routePlans, wrap: this.wrap && { ...this.wrap }, wrapCount: this.wrapCount, tour: { ...this.tour }, bubble: this.bubbleView };
  }

  destroy() {
    if (this.destroyed) return;
    this.logical = this.now(); this.anchor = null; this.destroyed = true;
    cancelAnimationFrame(this.frame); clearTimeout(this.timer); this.frame = 0; this.timer = 0;
    this.listeners.forEach(remove => remove()); this.listeners = [];
    this.resizeObserver?.disconnect(); this.mutationObserver?.disconnect(); this.drag = null;
    this.wrapProxy?.remove(); this.wrapProxy = null;
  }
}

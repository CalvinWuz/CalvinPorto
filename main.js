/* Calvin — portofolio.
   Semua yang ada di file ini hanya tambahan: halaman tetap lengkap dan terbaca tanpanya. */
(function () {
  'use strict';

  var motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  var reduced = motionQuery.matches;

  function feature(fn) {
    try { fn(); } catch (e) { try { console.error('[portofolio]', e); } catch (_) {} }
  }
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function store(key, value) { try { localStorage.setItem(key, value); } catch (e) {} }
  function read(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }

  /* ── tema ───────────────────────────────────────────── */
  feature(function () {
    var btn = document.getElementById('themeBtn');
    var label = document.getElementById('themeLabel');
    var root = document.documentElement;
    if (!btn) return;

    function paint() {
      var dark = root.getAttribute('data-theme') === 'dark';
      if (label) label.textContent = dark ? 'terang' : 'gelap';
      btn.setAttribute('aria-pressed', dark ? 'true' : 'false');
      // Kedua <meta> digerbang oleh skema sistem, yang bisa berbeda dari pilihan tombol ini.
      var colour = dark ? '#0c0e13' : '#f7f8fa';
      document.querySelectorAll('meta[name="theme-color"]').forEach(function (m) {
        m.setAttribute('content', colour);
      });
    }
    paint();
    btn.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      store('calvin-theme', next);
      paint();
    });
  });

  /* ── menu mobile ────────────────────────────────────── */
  feature(function () {
    var btn = document.getElementById('menuBtn');
    var menu = document.getElementById('menu');
    if (!btn || !menu) return;

    function open() {
      menu.classList.add('is-open');
      btn.setAttribute('aria-expanded', 'true');
      btn.querySelector('.vh').textContent = 'Tutup menu';
    }
    function close(focusBack) {
      if (!menu.classList.contains('is-open')) return;
      menu.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
      btn.querySelector('.vh').textContent = 'Buka menu';
      if (focusBack) btn.focus();
    }
    btn.addEventListener('click', function () {
      if (menu.classList.contains('is-open')) close(false); else open();
    });
    // Memilih tujuan menutup menu; tautannya tetap berjalan seperti biasa.
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) close(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close(true);
    });
    document.addEventListener('click', function (e) {
      if (!menu.contains(e.target) && !btn.contains(e.target)) close(false);
    });
    // Menu hanya ada di lebar ponsel; jangan tertinggal terbuka saat layar melebar.
    var wide = window.matchMedia('(min-width: 721px)');
    var onWide = function (e) { if (e.matches) close(false); };
    if (wide.addEventListener) wide.addEventListener('change', onWide);
    else if (wide.addListener) wide.addListener(onWide);
  });

  /* ── stiker yang bisa digeser ────────────────────────── */
  feature(function () {
    var scene = document.getElementById('scene');
    var live = document.getElementById('sceneLive');
    if (!scene) return;
    var nodes = scene.querySelectorAll('.sticker');
    if (!nodes.length) return;

    var restAngles = [-9, 7, -12];
    var stickers = Array.prototype.map.call(nodes, function (el, i) {
      return { el: el, i: i, x: 0, y: 0, angle: restAngles[i], vx: 0, vy: 0, held: false, restAngle: restAngles[i] };
    });

    var saved = null;
    try {
      var raw = JSON.parse(read('calvin-stickers') || 'null');
      if (raw && raw.v === 1 && Array.isArray(raw.p)) saved = raw.p;
    } catch (e) {}
    var touched = Boolean(saved);
    var started = false;
    var lastWidth = 0;
    var lastNarrow = null;

    // Area main adalah seluruh hero, tetapi posisi AWAL selalu dihitung agar
    // tidak pernah menutupi nama, penjelasan peran, navigasi, atau tombol.
    function field() {
      var w = scene.clientWidth;
      var h = scene.clientHeight;
      var text = scene.parentNode.querySelector('.hero-inner');
      var below = 0, right = 0;
      if (text) {
        var a = scene.getBoundingClientRect();
        var b = text.getBoundingClientRect();
        below = Math.max(0, b.bottom - a.top + 10);
        right = Math.max(0, b.right - a.left + 24);
      }
      return { w: w, h: h, below: Math.min(below, Math.max(0, h - 150)), right: right };
    }
    function draw(s) {
      var f = field();
      s.x = clamp(s.x, 8, Math.max(8, f.w - s.el.offsetWidth - 8));
      s.y = clamp(s.y, 10, Math.max(10, f.h - s.el.offsetHeight - 6));
      s.el.style.transform = 'translate(' + s.x.toFixed(1) + 'px,' + s.y.toFixed(1) + 'px) rotate(' + s.angle.toFixed(2) + 'deg) scale(' + (s.held ? 1.055 : 1) + ')';
    }
    function layout() {
      var f = field();
      if (!f.w) return;
      // "Lebar" hanya kalau benar-benar ada kolom kosong di kanan teks.
      var wide = f.w - f.right > 210;
      var room = Math.max(90, f.h - f.below);
      stickers.forEach(function (s) {
        var fresh = !started || (lastNarrow !== wide && !touched);
        if (fresh) {
          var prior = !started && saved ? saved[s.i] : null;
          if (prior && isFinite(prior.x) && isFinite(prior.y)) {
            s.x = prior.x; s.y = prior.y;
          } else if (wide) {
            var side = f.right;
            var span = Math.max(150, f.w - side - s.el.offsetWidth - 16);
            // appsec di kiri bawah; dua lainnya mengisi kolom kanan yang kosong.
            s.x = s.i === 0 ? 0.035 * f.w : side + [0, 0.52, 0.18][s.i] * span;
            s.y = s.i === 0 ? f.below + 0.06 * room : [0, 0.13, 0.47][s.i] * f.h;
          } else {
            // Kolom sempit: dua di atas pada sisi berlawanan, satu di bawah tengah.
            var pad = 10;
            var w = s.el.offsetWidth || 120;
            if (s.i === 0) { s.x = pad; s.y = f.below + 4; }
            else if (s.i === 1) { s.x = Math.max(pad, f.w - w - pad); s.y = f.below + 10; }
            else { s.x = Math.max(pad, (f.w - w) / 2); s.y = f.below + Math.max(118, 0.52 * room); }
          }
          s.angle = s.restAngle;
        } else if (lastWidth && lastWidth !== f.w) {
          s.x = s.x / lastWidth * f.w;
        }
        draw(s);
      });
      started = true;
      lastWidth = f.w;
      lastNarrow = wide;
    }
    function remember() {
      touched = true;
      store('calvin-stickers', JSON.stringify({
        v: 1,
        p: stickers.map(function (s) { return { x: Math.round(s.x), y: Math.round(s.y) }; })
      }));
    }

    layout();
    if ('ResizeObserver' in window) new ResizeObserver(layout).observe(scene);
    else window.addEventListener('resize', layout);
    window.addEventListener('load', layout);

    var running = false, previous = 0;
    function tick(time) {
      var step = previous ? Math.min((time - previous) / 16.67, 2) : 1;
      previous = time;
      var moving = false;
      var f = field();
      stickers.forEach(function (s) {
        if (s.held) return;
        if (Math.abs(s.vx) + Math.abs(s.vy) < 0.15) {
          s.vx = 0; s.vy = 0; s.angle = s.restAngle; draw(s); return;
        }
        moving = true;
        var xmax = f.w - s.el.offsetWidth - 8;
        var ymax = f.h - s.el.offsetHeight - 6;
        s.x += s.vx * step; s.y += s.vy * step;
        if (s.x < 8 || s.x > xmax) s.vx *= -0.5;
        if (s.y < 10 || s.y > ymax) s.vy *= -0.5;
        s.vx *= Math.pow(0.90, step); s.vy *= Math.pow(0.90, step);
        s.angle += (s.restAngle - s.angle) * Math.min(0.12 * step, 1);
        draw(s);
      });
      if (moving) requestAnimationFrame(tick); else { running = false; previous = 0; }
    }

    stickers.forEach(function (s) {
      var startX = 0, startY = 0, lastX = 0, lastY = 0, lastTime = 0, moved = false;

      s.el.addEventListener('pointerdown', function (e) {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        s.held = true; s.vx = 0; s.vy = 0; moved = false;
        startX = e.clientX - s.x; startY = e.clientY - s.y;
        lastX = e.clientX; lastY = e.clientY; lastTime = performance.now();
        try { s.el.setPointerCapture(e.pointerId); } catch (_) {}
        s.el.style.zIndex = '6';
        s.el.classList.add('is-held');
        draw(s);
      });

      s.el.addEventListener('pointermove', function (e) {
        if (!s.held) return;
        var now = performance.now(), dt = Math.max(12, now - lastTime);
        s.vx = clamp((e.clientX - lastX) * 16 / dt, -17, 17);
        s.vy = clamp((e.clientY - lastY) * 16 / dt, -17, 17);
        s.x = e.clientX - startX; s.y = e.clientY - startY;
        s.angle = s.restAngle + clamp(s.vx * 0.75, -10, 10);
        draw(s);
        moved = true; lastX = e.clientX; lastY = e.clientY; lastTime = now;
      });

      function release() {
        if (!s.held) return;
        s.held = false;
        s.el.style.zIndex = '3';
        s.el.classList.remove('is-held');
        if (reduced) { s.vx = 0; s.vy = 0; s.angle = s.restAngle; }
        draw(s);
        if (moved) {
          if (live) live.textContent = 'Stiker berpindah mengikuti tanganmu.';
          remember();
        }
        if (!running && !reduced) { running = true; requestAnimationFrame(tick); }
      }
      s.el.addEventListener('pointerup', release);
      s.el.addEventListener('pointercancel', release);
      s.el.addEventListener('lostpointercapture', release);

      s.el.addEventListener('keydown', function (e) {
        var moves = { ArrowLeft: [-18, 0], ArrowRight: [18, 0], ArrowUp: [0, -18], ArrowDown: [0, 18] };
        var move = moves[e.key];
        if (!move) return;
        e.preventDefault();
        s.x += move[0]; s.y += move[1];
        draw(s);
        if (live) live.textContent = 'Stiker berpindah dengan tombol panah.';
        remember();
      });
    });
  });

  /* ── huruf nama merespons pointer dan keyboard ───────── */
  feature(function () {
    var name = document.getElementById('name');
    if (!name) return;
    var letters = Array.prototype.slice.call(name.children);
    if (!letters.length) return;

    function respond(x, y) {
      var rect = name.getBoundingClientRect();
      var nx = clamp(x / Math.max(1, rect.width) * 2 - 1, -1, 1);
      var ny = clamp(y / Math.max(1, rect.height) * 2 - 1, -1, 1);
      var power = reduced ? 0.25 : 1;
      letters.forEach(function (el, i) {
        var centre = (i + 0.5) / letters.length * rect.width;
        var pull = Math.max(0, 1 - Math.abs(x - centre) / (rect.width * 0.55));
        el.style.transform = 'translate(' + (nx * 7 * power).toFixed(2) + 'px,'
          + (-pull * 20 * power + ny * 3 * power).toFixed(2) + 'px) rotate('
          + (nx * (i - 2.5) * 0.9 * power).toFixed(2) + 'deg)';
      });
    }
    function rest() { letters.forEach(function (el) { el.style.transform = ''; }); }

    // Pointer halus: tidak mengunci scroll, dan sentuhan tetap bisa menggulir halaman.
    name.addEventListener('pointermove', function (e) {
      var r = name.getBoundingClientRect();
      respond(e.clientX - r.left, e.clientY - r.top);
    }, { passive: true });
    name.addEventListener('pointerleave', rest);
    name.addEventListener('pointercancel', rest);

    // Jalur keyboard: role, tabindex dan petunjuknya sudah ada di HTML,
    // jadi fokusnya tetap benar walau script ini gagal dimuat.
    var step = 0;
    name.addEventListener('keydown', function (e) {
      var r = name.getBoundingClientRect();
      if (e.key === 'ArrowLeft') { step = Math.max(0, step - 1); }
      else if (e.key === 'ArrowRight') { step = Math.min(letters.length, step + 1); }
      else if (e.key === 'Enter' || e.key === ' ') { step = (step + 2) % (letters.length + 1); }
      else return;
      e.preventDefault();
      respond(step / letters.length * r.width, r.height * 0.5);
    });
    name.addEventListener('blur', rest);
  });

  /* ── studi kasus: tautan yang bisa dibagikan ─────────── */
  feature(function () {
    var studies = document.querySelectorAll('details.study');
    if (!studies.length) return;

    function openFromHash() {
      var id = (location.hash || '').replace('#', '');
      if (!id) return;
      var target = document.getElementById(id);
      if (target && target.tagName === 'DETAILS') {
        target.open = true;
        requestAnimationFrame(function () {
          target.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' });
        });
      }
    }
    openFromHash();
    window.addEventListener('hashchange', openFromHash);

    studies.forEach(function (d) {
      d.addEventListener('toggle', function () {
        // replaceState, bukan pushState: alamatnya tetap bisa disalin tanpa membuat tombol Back membingungkan.
        if (d.open) {
          if (history.replaceState) history.replaceState(null, '', '#' + d.id);
        } else if (location.hash === '#' + d.id) {
          if (history.replaceState) history.replaceState(null, '', location.pathname + location.search);
        }
      });
    });
  });

  /* ── penanda bagian aktif di navigasi ────────────────── */
  feature(function () {
    if (!('IntersectionObserver' in window)) return;
    var links = {};
    document.querySelectorAll('.nav a[href^="#"]').forEach(function (a) {
      links[a.getAttribute('href').slice(1)] = a;
    });
    var sections = document.querySelectorAll('section[id]');
    if (!sections.length) return;
    var seen = {};
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { seen[en.target.id] = en.isIntersecting ? en.intersectionRatio : 0; });
      var best = null, bestRatio = 0;
      Object.keys(seen).forEach(function (id) {
        if (seen[id] > bestRatio) { bestRatio = seen[id]; best = id; }
      });
      Object.keys(links).forEach(function (id) {
        links[id].classList.toggle('is-current', id === best);
        if (id === best) links[id].setAttribute('aria-current', 'true');
        else links[id].removeAttribute('aria-current');
      });
    }, { threshold: [0.12, 0.4, 0.75] });
    sections.forEach(function (s) { io.observe(s); });
  });

  /* ── entrance halus per bagian ───────────────────────── */
  feature(function () {
    var parts = [];
    document.querySelectorAll('.section-head, .project, .about-col, .toolkit, .exp-grid > div, .contact-inner')
      .forEach(function (el) { parts.push(el); });
    if (!parts.length) return;
    if (reduced || !('IntersectionObserver' in window)) {
      parts.forEach(function (el) { el.classList.add('in'); });
      return;
    }
    parts.forEach(function (el) { el.classList.add('reveal'); });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('in');
        io.unobserve(en.target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    parts.forEach(function (el) { io.observe(el); });
    // Konten tidak boleh hilang kalau ada yang gagal.
    setTimeout(function () { parts.forEach(function (el) { el.classList.add('in'); }); }, 3500);
  });

  /* ── tahun footer ────────────────────────────────────── */
  feature(function () {
    var y = document.getElementById('year');
    if (y) y.textContent = String(new Date().getFullYear());
  });

  /* ── jembatan aksi ke maskot ─────────────────────────── */
  feature(function () {
    document.addEventListener('click', function (e) {
      var target = e.target && e.target.closest ? e.target.closest('[data-cat-action]') : null;
      if (!target) return;
      // Tidak ada preventDefault: tautan proyek dan CV harus tetap berjalan.
      window.dispatchEvent(new CustomEvent('calvin:companion', {
        detail: { action: target.getAttribute('data-cat-action') }
      }));
    }, true);
  });

  /* ── maskot kucing ───────────────────────────────────────
     Mesin state dengan waktu logis sendiri, jadi tidak ada pose yang
     kedaluwarsa saat tab disembunyikan atau saat dijeda. */
  feature(function () {
    var root = document.getElementById('calvin-cat-companion');
    if (!root) return;
    var actor = root.querySelector('.cat-actor');
    var lane = root.querySelector('.cat-lane');
    var puppet = root.querySelector('.cat-puppet');
    var hop = root.querySelector('.cat-hop');
    var pauseButton = root.querySelector('.cat-pause');
    var pauseText = root.querySelector('.cat-pause-text');
    var live = document.getElementById('cat-live');
    if (!actor || !lane || !puppet || !hop || !pauseButton) return;

    var speed = 90;              // px/detik
    var rest = 7;                // detik istirahat
    var durations = { greet: 1800, cool: 4000, stretch: 1000, approve: 2200, flower: 2600 };
    var lowPriority = { walk: 1, idle: 1, curious: 1, coffee: 1, yawn: 1 };

    var paused = reduced;
    var greets = 0;
    try {
      var saved = JSON.parse(read('calvin-cat') || 'null');
      if (saved && saved.v === 1) {
        if (typeof saved.paused === 'boolean') paused = saved.paused || reduced;
        if (Number.isSafeInteger(saved.greets) && saved.greets >= 0) greets = saved.greets;
      }
    } catch (e) {}

    var onScreen = !('IntersectionObserver' in window);
    var state = reduced ? 'idle' : 'walk';
    var stateUntil = reduced ? Infinity : 2400;
    var followingCool = false;
    var pendingAction = null;
    var restUntil = Infinity, coffeeAt = Infinity, coffeeUntil = Infinity, restNumber = 0;
    var pointerNear = false;
    var x = 25, direction = 1, gaze = 0;
    var hopAt = null, winkUntil = 0, lastActivityAt = 0, lastPointer = null;
    var elapsed = 0, runningSince = null, previousClock = 0;
    var frame = 0, timer = 0;

    function clock(now) {
      if (now === undefined) now = performance.now();
      return elapsed + (runningSince === null ? 0 : now - runningSince);
    }
    function canRun() { return !paused && onScreen && !document.hidden; }
    function cancelScheduled() {
      if (frame) cancelAnimationFrame(frame);
      if (timer) clearTimeout(timer);
      frame = 0; timer = 0;
    }
    function bounds() {
      var width = Math.max(0, lane.clientWidth - actor.offsetWidth);
      var inset = Math.min(12, width / 2);
      return { min: inset, max: Math.max(inset, width - inset) };
    }
    function remember() {
      store('calvin-cat', JSON.stringify({ v: 1, paused: paused, greets: greets }));
    }
    function announce(message) { if (live) live.textContent = message; }

    function paint(at) {
      if (at === undefined) at = clock();
      if (root.dataset.catState !== state) root.dataset.catState = state;
      root.classList.toggle('is-paused', !canRun() || reduced);
      actor.classList.toggle('is-walking', state === 'walk' && !reduced);
      actor.classList.toggle('is-winking', at < winkUntil);
      actor.style.transform = 'translate3d(' + x.toFixed(2) + 'px,0,0)';
      puppet.style.transform = 'scaleX(' + direction + ')';
      root.style.setProperty('--cat-gaze', (gaze * direction).toFixed(2) + 'px');
      var progress = hopAt === null ? 1 : clamp((at - hopAt) / 420, 0, 1);
      var lift = (reduced || progress >= 1) ? 0 : -7 * Math.sin(Math.PI * progress);
      hop.style.transform = 'translateY(' + lift.toFixed(2) + 'px)';
      var pressed = String(paused);
      var label = paused ? 'Lanjutkan gerakan kucing' : 'Jeda gerakan kucing';
      if (pauseButton.getAttribute('aria-pressed') !== pressed) pauseButton.setAttribute('aria-pressed', pressed);
      if (pauseButton.getAttribute('aria-label') !== label) pauseButton.setAttribute('aria-label', label);
      var text = paused ? 'Lanjutkan' : 'Jeda';
      if (pauseText && pauseText.textContent !== text) pauseText.textContent = text;
    }

    function clearRest() { restUntil = Infinity; coffeeAt = Infinity; coffeeUntil = Infinity; }
    function startRest(at, allowCoffee) {
      state = 'idle';
      restUntil = reduced ? Infinity : at + rest * 1000;
      stateUntil = restUntil;
      coffeeAt = Infinity; coffeeUntil = Infinity;
      if (allowCoffee) {
        restNumber += 1;
        // Seruputan pertama mudah ditemukan; sesudahnya hanya sesekali.
        if (!reduced && (restNumber - 1) % 3 === 0) {
          coffeeAt = at + 900;
          coffeeUntil = Math.min(restUntil, coffeeAt + 2200);
        }
      }
    }
    function startWalk(at) {
      clearRest();
      if (reduced) { startRest(at); return; }
      state = 'walk';
      stateUntil = at + 2400;
    }
    function sleep() {
      clearRest();
      state = 'sleep'; stateUntil = Infinity;
      pendingAction = null; followingCool = false; winkUntil = 0; hopAt = null; gaze = 0;
    }
    function beginAction(action, at) {
      clearRest();
      pendingAction = null;
      followingCool = action.kind === 'greet' && action.cool;
      state = action.kind;
      stateUntil = at + durations[state];
      winkUntil = state === 'greet' ? at + 420 : 0;
      hopAt = (state === 'greet' && !reduced) ? at : null;
    }
    function beginStretch(at, after) {
      clearRest();
      state = 'stretch'; stateUntil = at + durations.stretch;
      pendingAction = after || null; followingCool = false; winkUntil = 0; hopAt = null; gaze = 0;
    }
    function curiosity(at) {
      if (paused) return;
      if (pointerNear && (state === 'walk' || state === 'idle' || state === 'coffee')) {
        clearRest();
        state = 'curious';
        stateUntil = Infinity;
      } else if (!pointerNear && state === 'curious') startRest(at);
    }
    function advanceState(at) {
      if (state === 'walk') startRest(at, true);
      else if (state === 'idle') startWalk(at);
      else if (state === 'coffee') { state = 'idle'; stateUntil = restUntil; coffeeAt = Infinity; coffeeUntil = Infinity; }
      else if (state === 'stretch') { if (pendingAction) beginAction(pendingAction, at); else startRest(at); }
      else if (state === 'greet' && followingCool) { followingCool = false; state = 'cool'; stateUntil = at + durations.cool; }
      else if (state === 'yawn') sleep();
      else startRest(at);
    }
    function schedule(at) {
      if (!canRun()) return;
      if (!reduced && (state === 'walk' || hopAt !== null)) { frame = requestAnimationFrame(update); return; }
      var deadlines = [stateUntil];
      if (state === 'idle') deadlines.push(coffeeAt);
      if (lowPriority[state]) {
        if (state !== 'yawn') deadlines.push(lastActivityAt + 12400);
        deadlines.push(lastActivityAt + 14000);
      }
      if (winkUntil > at) deadlines.push(winkUntil);
      var next = Infinity;
      deadlines.forEach(function (t) { if (isFinite(t) && t > at && t < next) next = t; });
      if (isFinite(next)) timer = setTimeout(update, Math.max(16, next - at));
    }
    function update() {
      frame = 0; timer = 0;
      if (!canRun()) { sync(); return; }
      var at = clock();
      var dt = clamp((at - previousClock) / 1000, 0, 0.05);
      previousClock = at;
      for (var i = 0; i < 3 && at >= stateUntil; i += 1) advanceState(at);
      if (state === 'idle' && at >= coffeeAt && at < restUntil) {
        state = 'coffee'; stateUntil = coffeeUntil; coffeeAt = Infinity;
      }
      // Reaksi ambient tidak pernah memotong sapaan, aksi proyek/CV, atau peregangan bangun.
      if (lowPriority[state]) {
        var idleFor = at - lastActivityAt;
        if (idleFor >= 14000) sleep();
        else if (idleFor >= 12400 && state !== 'yawn') {
          clearRest();
          state = 'yawn'; stateUntil = lastActivityAt + 14000; winkUntil = 0; hopAt = null;
        } else curiosity(at);
      }
      if (state === 'walk' && !reduced) {
        var edge = bounds();
        x += direction * speed * dt;
        if (x >= edge.max) { x = edge.max; direction = -1; }
        if (x <= edge.min) { x = edge.min; direction = 1; }
      }
      if (hopAt !== null && at - hopAt >= 420) hopAt = null;
      paint(at);
      schedule(at);
    }
    function sync() {
      cancelScheduled();
      if (!canRun()) {
        if (runningSince !== null) { elapsed = clock(); runningSince = null; }
        paint(elapsed);
        return;
      }
      if (runningSince === null) { runningSince = performance.now(); previousClock = clock(); }
      update();
    }
    function activity() {
      var at = clock();
      lastActivityAt = at;
      if (paused) return;
      if (state === 'sleep') beginStretch(at);
      else if (state === 'yawn') startRest(at);
      curiosity(at);
      sync();
    }
    function requestAction(action, explicit) {
      if (paused) {
        if (explicit) announce('Pilih Lanjutkan untuk menyapa kucing.');
        return;
      }
      // Bagian kontak yang terbaca otomatis tidak boleh memotong aksi pengguna.
      if (!explicit && !lowPriority[state] && state !== 'sleep') return;
      var at = clock();
      lastActivityAt = at;
      if (state === 'sleep') beginStretch(at, action);
      else if (state === 'stretch') pendingAction = action;
      else beginAction(action, at);
      sync();
    }
    function greet() {
      if (paused) { announce('Pilih Lanjutkan untuk menyapa kucing.'); return; }
      greets = greets >= Number.MAX_SAFE_INTEGER ? 1 : greets + 1;
      var queuedCool = state === 'stretch' && pendingAction && pendingAction.kind === 'greet' && pendingAction.cool;
      var cool = greets % 3 === 0 || (state === 'greet' && followingCool) || queuedCool;
      requestAction({ kind: 'greet', cool: cool }, true);
      announce(cool ? 'Halo! Kucingmu sedang bergaya.' : 'Halo! Kucing menyapamu.');
      remember();
    }
    function contextualAction(action, explicit) {
      var kind = action === 'contact' ? 'flower'
        : (action === 'project' || action === 'cv') ? 'approve' : null;
      if (!kind) return;
      var wasPaused = paused;
      requestAction({ kind: kind }, explicit);
      if (explicit && !wasPaused) {
        announce(action === 'contact' ? 'Bunga untukmu!'
          : action === 'cv' ? 'Kucing menyetujui pilihan CV-mu.' : 'Kucing menyukai proyek ini.');
      }
    }
    function setPaused(value) {
      paused = Boolean(value);
      sync();
      remember();
    }

    pauseButton.addEventListener('click', function () {
      setPaused(!paused);
      announce(paused ? 'Gerakan kucing dijeda.' : 'Gerakan kucing dilanjutkan.');
    });
    actor.addEventListener('click', greet);

    root.addEventListener('pointermove', function (e) {
      var rect = actor.getBoundingClientRect();
      if (e.pointerType !== 'touch') {
        // Batas keluar lebih lebar supaya pose tidak berkedip di tepi area.
        var nearLimit = pointerNear ? 128 : 110;
        pointerNear = Math.hypot(e.clientX - rect.left - rect.width / 2, e.clientY - rect.top - rect.height / 2) <= nearLimit;
        if (!paused && !reduced && state !== 'sleep') {
          gaze = clamp((e.clientX - rect.left - rect.width / 2) / 70, -2.5, 2.5);
          root.style.setProperty('--cat-gaze', (gaze * direction).toFixed(2) + 'px');
        }
      } else pointerNear = false;
      if (!lastPointer || Math.hypot(e.clientX - lastPointer.x, e.clientY - lastPointer.y) >= 6) {
        lastPointer = { x: e.clientX, y: e.clientY };
        activity();
      } else if (!paused) {
        // Masuk dan keluar penasaran tanpa mengulang deadline pose apa pun.
        var prior = state;
        curiosity(clock());
        if (state !== prior) sync();
      }
    }, { passive: true });

    root.addEventListener('pointerleave', function () {
      pointerNear = false; lastPointer = null;
      if (!paused) {
        gaze = 0;
        root.style.setProperty('--cat-gaze', '0px');
        curiosity(clock());
        sync();
      }
    });
    root.addEventListener('focusin', activity);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { pointerNear = false; lastPointer = null; }
      sync();
    });

    function preferenceChanged(e) {
      reduced = e.matches;
      if (reduced) {
        paused = true; hopAt = null; gaze = 0;
        if (state === 'walk' || state === 'coffee' || state === 'curious') startRest(clock());
      }
      sync();
    }
    if (motionQuery.addEventListener) motionQuery.addEventListener('change', preferenceChanged);
    else if (motionQuery.addListener) motionQuery.addListener(preferenceChanged);

    window.addEventListener('calvin:companion', function (e) {
      contextualAction(e.detail && e.detail.action, true);
    });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.target !== root) return;
          onScreen = en.isIntersecting;
          if (!onScreen) { pointerNear = false; lastPointer = null; }
          sync();
        });
      }, { threshold: 0.1 }).observe(root);

      var contacts = document.querySelectorAll('[data-cat-contact]');
      if (contacts.length) {
        var visible = [];
        new IntersectionObserver(function (entries) {
          entries.forEach(function (en) {
            var isVisible = en.isIntersecting && en.intersectionRatio >= 0.35;
            var was = visible.indexOf(en.target) !== -1;
            if (isVisible && !was) { visible.push(en.target); contextualAction('contact', false); }
            else if (!isVisible && was) visible.splice(visible.indexOf(en.target), 1);
          });
        }, { threshold: 0.35 }).observe(contacts[0]);
      }
    }

    function resized() {
      var edge = bounds();
      x = clamp(x, edge.min, edge.max);
      paint();
    }
    if ('ResizeObserver' in window) new ResizeObserver(resized).observe(lane);
    else window.addEventListener('resize', resized);

    resized();
    paint();
    sync();
  });
})();

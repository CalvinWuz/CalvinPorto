/* Calvin — portofolio.
   Semua yang ada di file ini hanya tambahan: halaman tetap lengkap dan terbaca tanpanya. */
(function () {
  'use strict';

  var motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  var reduced = motionQuery.matches;
  var hasIO = 'IntersectionObserver' in window;

  function feature(fn) {
    try { fn(); } catch (e) { try { console.error('[portofolio]', e); } catch (_) {} }
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function store(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function read(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function drop(k) { try { localStorage.removeItem(k); } catch (e) {} }

  /* Satu tombol jeda mengendalikan maskot dan deretan logo. */
  var motionPaused = reduced || read('calvin-motion') === 'paused';
  var motionListeners = [];
  function onMotionChange(fn) { motionListeners.push(fn); }
  function setMotionPaused(v, persist) {
    motionPaused = Boolean(v);
    if (persist) store('calvin-motion', motionPaused ? 'paused' : 'playing');
    motionListeners.forEach(function (fn) { try { fn(motionPaused); } catch (e) {} });
  }

  /* Perubahan layout disiarkan sekali, bukan diukur ulang tiap frame. */
  var layoutListeners = [];
  var layoutPending = 0;
  function onLayout(fn) { layoutListeners.push(fn); }
  function announceLayout() {
    if (layoutPending) return;
    layoutPending = requestAnimationFrame(function () {
      layoutPending = 0;
      layoutListeners.forEach(function (fn) { try { fn(); } catch (e) {} });
    });
  }
  window.addEventListener('resize', announceLayout);
  window.addEventListener('orientationchange', announceLayout);
  window.addEventListener('load', announceLayout);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(announceLayout).catch(function () {});

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

  /* ── tombol jeda gerakan ────────────────────────────── */
  feature(function () {
    var btn = document.getElementById('motionBtn');
    if (!btn) return;
    function paint() {
      btn.setAttribute('aria-pressed', motionPaused ? 'true' : 'false');
      btn.querySelector('.vh').textContent = motionPaused
        ? 'Lanjutkan gerakan kucing dan deretan logo'
        : 'Jeda gerakan kucing dan deretan logo';
    }
    paint();
    onMotionChange(paint);
    btn.addEventListener('click', function () { setMotionPaused(!motionPaused, true); });
  });

  /* ── menu ponsel ────────────────────────────────────── */
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
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) close(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(true); });
    document.addEventListener('click', function (e) {
      if (!menu.contains(e.target) && !btn.contains(e.target)) close(false);
    });
    var wide = window.matchMedia('(min-width: 721px)');
    var onWide = function (e) { if (e.matches) close(false); };
    if (wide.addEventListener) wide.addEventListener('change', onWide);
    else if (wide.addListener) wide.addListener(onWide);
  });

  /* ── stiker yang bisa digeser ────────────────────────────
     Bidangnya dihitung dari scene dan blok teks hero saja. Posisi maskot
     tidak ikut dihitung: saat place() pertama berjalan maskot masih dalam
     transisi, dan dulu itulah yang membuat ketiga stiker menumpuk di kiri. */
  feature(function () {
    var scene = document.getElementById('scene');
    var live = document.getElementById('sceneLive');
    var resetBtn = document.getElementById('resetStickers');
    if (!scene) return;
    var nodes = scene.querySelectorAll('.sticker');
    if (!nodes.length) return;

    var CAT_LANE = 96;       // pita kanan hero yang disediakan untuk maskot
    var restAngles = [-9, 7, -12];
    var stickers = Array.prototype.map.call(nodes, function (el, i) {
      return { el: el, i: i, x: 0, y: 0, angle: restAngles[i], vx: 0, vy: 0, held: false, restAngle: restAngles[i] };
    });

    var saved = null;
    try {
      var raw = JSON.parse(read('calvin-stickers') || 'null');
      if (raw && raw.v === 3 && Array.isArray(raw.p) && raw.p.length === stickers.length) saved = raw.p;
    } catch (e) {}
    if (!saved) drop('calvin-stickers');   // skema lama dibuang, preferensi lain tidak disentuh
    var touched = Boolean(saved);
    var placed = false;

    function field() {
      var w = scene.clientWidth, h = scene.clientHeight;
      var a = scene.getBoundingClientRect();
      var grid = scene.parentNode.querySelector('.hero-grid');
      var below = 0;
      if (grid) {
        var b = grid.getBoundingClientRect();
        below = Math.max(0, b.bottom - a.top + 16);
      }
      var lane = w >= 721 ? CAT_LANE : 64;
      var max = w - lane;
      // Hanya sebagai batas tambahan setelah maskot benar-benar ditempatkan.
      // Posisi default TIDAK dihitung dari sini, supaya stiker tidak pernah
      // menumpuk saat maskot masih dalam transisi pembukaan.
      var cat = document.getElementById('companion');
      if (cat && cat.style.getPropertyValue('--dock-x')) {
        var cr = cat.getBoundingClientRect();
        if (cr.width) max = Math.min(max, cr.left - a.left - 8);
      }
      return {
        w: w, h: h,
        max: Math.max(160, max),
        below: Math.min(below, Math.max(0, h - 150))
      };
    }
    function draw(s) {
      var f = field();
      s.x = clamp(s.x, 8, Math.max(8, f.max - s.el.offsetWidth - 8));
      s.y = clamp(s.y, 8, Math.max(8, f.h - s.el.offsetHeight - 6));
      s.el.style.transform = 'translate(' + s.x.toFixed(1) + 'px,' + s.y.toFixed(1) + 'px) rotate('
        + s.angle.toFixed(2) + 'deg) scale(' + (s.held ? 1.055 : 1) + ')';
    }
    /* Komposisi default: tiga bentuk tersebar, bukan satu koordinat yang sama. */
    function defaults(f) {
      var wide = f.w >= 900;
      var room = Math.max(110, f.h - f.below);
      return stickers.map(function (s) {
        var w = s.el.offsetWidth || 130;
        if (wide) {
          if (s.i === 0) return { x: 0.015 * f.max, y: f.below + 0.16 * room };
          if (s.i === 1) return { x: Math.max(8, f.max - w - 0.02 * f.max), y: f.below - 2 };
          return { x: 0.47 * f.max, y: f.below + 0.42 * room };
        }
        var pad = 10;
        if (s.i === 0) return { x: pad, y: f.below + 4 };
        if (s.i === 1) return { x: Math.max(pad, f.max - w - pad), y: f.below + 12 };
        return { x: Math.max(pad, (f.max - w) / 2), y: f.below + Math.max(110, 0.5 * room) };
      });
    }
    function place(force) {
      var f = field();
      if (!f.w || !stickers[0].el.offsetWidth) return;   // tunggu sampai ukurannya nyata
      var d = defaults(f);
      stickers.forEach(function (s, i) {
        if (force || !placed) {
          var prior = (!force && saved) ? saved[s.i] : null;
          if (prior && isFinite(prior.x) && isFinite(prior.y)) { s.x = prior.x; s.y = prior.y; }
          else { s.x = d[i].x; s.y = d[i].y; }
          s.angle = s.restAngle;
        }
        draw(s);   // posisi pengguna tetap dihormati, hanya di-clamp ke bidang baru
      });
      placed = true;
    }
    function remember() {
      touched = true;
      store('calvin-stickers', JSON.stringify({
        v: 3, p: stickers.map(function (s) { return { x: Math.round(s.x), y: Math.round(s.y) }; })
      }));
    }

    place(false);
    onLayout(function () { place(false); });
    if ('ResizeObserver' in window) new ResizeObserver(announceLayout).observe(scene);

    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        touched = false;
        drop('calvin-stickers');
        stickers.forEach(function (s) { s.vx = 0; s.vy = 0; });
        place(true);
        if (live) live.textContent = 'Posisi stiker dikembalikan.';
      });
    }

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
        var xmax = f.max - s.el.offsetWidth - 8, ymax = f.h - s.el.offsetHeight - 6;
        s.x += s.vx * step; s.y += s.vy * step;
        if (s.x < 8 || s.x > xmax) s.vx *= -0.5;
        if (s.y < 8 || s.y > ymax) s.vy *= -0.5;
        s.vx *= Math.pow(0.9, step); s.vy *= Math.pow(0.9, step);
        s.angle += (s.restAngle - s.angle) * Math.min(0.12 * step, 1);
        draw(s);
      });
      if (moving) requestAnimationFrame(tick); else { running = false; previous = 0; }
    }

    stickers.forEach(function (s) {
      var sx = 0, sy = 0, lx = 0, ly = 0, lt = 0, moved = false;
      s.el.addEventListener('pointerdown', function (e) {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        s.held = true; s.vx = 0; s.vy = 0; moved = false;
        sx = e.clientX - s.x; sy = e.clientY - s.y;
        lx = e.clientX; ly = e.clientY; lt = performance.now();
        try { s.el.setPointerCapture(e.pointerId); } catch (_) {}
        s.el.style.zIndex = '6';
        s.el.classList.add('is-held');
        draw(s);
      });
      s.el.addEventListener('pointermove', function (e) {
        if (!s.held) return;
        var now = performance.now(), dt = Math.max(12, now - lt);
        s.vx = clamp((e.clientX - lx) * 16 / dt, -17, 17);
        s.vy = clamp((e.clientY - ly) * 16 / dt, -17, 17);
        s.x = e.clientX - sx; s.y = e.clientY - sy;
        s.angle = s.restAngle + clamp(s.vx * 0.75, -10, 10);
        draw(s);
        moved = true; lx = e.clientX; ly = e.clientY; lt = now;
      });
      function release() {
        if (!s.held) return;
        s.held = false;
        s.el.style.zIndex = '4';
        s.el.classList.remove('is-held');
        if (reduced) { s.vx = 0; s.vy = 0; s.angle = s.restAngle; }
        draw(s);
        if (moved) { if (live) live.textContent = 'Stiker berpindah mengikuti tanganmu.'; remember(); }
        if (!running && !reduced) { running = true; requestAnimationFrame(tick); }
      }
      s.el.addEventListener('pointerup', release);
      s.el.addEventListener('pointercancel', release);
      s.el.addEventListener('lostpointercapture', release);
      s.el.addEventListener('keydown', function (e) {
        var moves = { ArrowLeft: [-18, 0], ArrowRight: [18, 0], ArrowUp: [0, -18], ArrowDown: [0, 18] };
        var m = moves[e.key];
        if (!m) return;
        e.preventDefault();
        s.x += m[0]; s.y += m[1];
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
      var r = name.getBoundingClientRect();
      var nx = clamp(x / Math.max(1, r.width) * 2 - 1, -1, 1);
      var ny = clamp(y / Math.max(1, r.height) * 2 - 1, -1, 1);
      var power = reduced ? 0.25 : 1;
      letters.forEach(function (el, i) {
        var centre = (i + 0.5) / letters.length * r.width;
        var pull = Math.max(0, 1 - Math.abs(x - centre) / (r.width * 0.55));
        el.style.transform = 'translate(' + (nx * 7 * power).toFixed(2) + 'px,'
          + (-pull * 22 * power + ny * 3 * power).toFixed(2) + 'px) rotate('
          + (nx * (i - 2.5) * 0.9 * power).toFixed(2) + 'deg)';
      });
    }
    function rest() { letters.forEach(function (el) { el.style.transform = ''; }); }
    name.addEventListener('pointermove', function (e) {
      var r = name.getBoundingClientRect();
      respond(e.clientX - r.left, e.clientY - r.top);
    }, { passive: true });
    name.addEventListener('pointerleave', rest);
    name.addEventListener('pointercancel', rest);
    name.addEventListener('pointerup', function () { setTimeout(rest, 450); }, { passive: true });
    var step = 0;
    name.addEventListener('keydown', function (e) {
      var r = name.getBoundingClientRect();
      if (e.key === 'ArrowLeft') step = Math.max(0, step - 1);
      else if (e.key === 'ArrowRight') step = Math.min(letters.length, step + 1);
      else if (e.key === 'Enter' || e.key === ' ') step = (step + 2) % (letters.length + 1);
      else return;
      e.preventDefault();
      respond(step / letters.length * r.width, r.height * 0.5);
    });
    name.addEventListener('blur', rest);
  });

  /* ── alur Cookies: menegaskan tahap, isi tetap terbaca tanpa interaksi ── */
  feature(function () {
    var flow = document.getElementById('flow-cookies');
    if (!flow) return;
    var steps = Array.prototype.slice.call(flow.querySelectorAll('.flow-step'));
    function activate(i) {
      steps.forEach(function (s, n) {
        s.classList.toggle('is-on', n === i);
        s.querySelector('.flow-btn').setAttribute('aria-expanded', n === i ? 'true' : 'false');
      });
    }
    steps.forEach(function (s, i) {
      var btn = s.querySelector('.flow-btn');
      btn.addEventListener('click', function () { activate(i); });
      btn.addEventListener('mouseenter', function () { activate(i); });
      btn.addEventListener('focus', function () { activate(i); });
    });
    activate(0);
  });

  /* ── kanvas coretan mini (PapanTulis) ─────────────────── */
  feature(function () {
    var box = document.getElementById('sketch');
    var canvas = document.getElementById('sketchCanvas');
    if (!box || !canvas || !canvas.getContext) return;
    var ctx = canvas.getContext('2d');
    var live = document.getElementById('sketchLive');
    var drawBtn = document.getElementById('sketchDraw');
    var demoBtn = document.getElementById('sketchDemo');
    var clearBtn = document.getElementById('sketchClear');

    // Sentuh perlu diaktifkan dulu supaya swipe tetap menggulir halaman.
    var coarse = window.matchMedia('(any-pointer: coarse)').matches;
    var armed = !coarse;
    var strokes = [];       // disimpan dalam koordinat CSS, jadi resize tidak menggeser garis
    var current = null;
    var pointerId = null;

    function sizeCanvas() {
      var r = canvas.getBoundingClientRect();
      if (!r.width) return;
      var dpr = clamp(window.devicePixelRatio || 1, 1, 2);   // backing store dibatasi
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      repaint();
    }
    function colour() {
      return getComputedStyle(document.documentElement).getPropertyValue('--accent-text-2').trim() || '#8b7cff';
    }
    function repaint() {
      var r = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, r.width, r.height);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = colour(); ctx.lineWidth = 6;
      strokes.forEach(function (s) {
        if (s.length < 2) return;
        ctx.beginPath();
        ctx.moveTo(s[0].x, s[0].y);
        for (var i = 1; i < s.length; i++) ctx.lineTo(s[i].x, s[i].y);
        ctx.stroke();
      });
    }
    function at(e) {
      var r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }
    function setArmed(v) {
      armed = Boolean(v);
      box.classList.toggle('is-drawing', armed);
      if (drawBtn) drawBtn.textContent = armed ? 'Selesai' : 'Mulai menggambar';
      if (live) live.textContent = armed ? 'Mode menggambar aktif.' : 'Mode menggambar selesai. Halaman bisa digulir seperti biasa.';
    }
    function stop() {
      if (pointerId !== null) { try { canvas.releasePointerCapture(pointerId); } catch (e) {} }
      pointerId = null; current = null;
    }

    if (coarse && drawBtn) { drawBtn.hidden = false; setArmed(false); }
    if (drawBtn) drawBtn.addEventListener('click', function () { setArmed(!armed); stop(); });

    canvas.addEventListener('pointerdown', function (e) {
      if (!armed) return;                       // sentuh sebelum diaktifkan: scroll normal
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      pointerId = e.pointerId;
      try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
      current = [at(e)];
      strokes.push(current);
      box.classList.remove('show-demo');
      window.dispatchEvent(new CustomEvent('calvin:companion', { detail: { action: 'sketch' } }));
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!current || e.pointerId !== pointerId) return;
      current.push(at(e));
      repaint();
    });
    ['pointerup', 'pointercancel', 'lostpointercapture', 'pointerleave'].forEach(function (type) {
      canvas.addEventListener(type, function () {
        if (current && current.length < 2) strokes.pop();
        stop(); repaint();
      });
    });

    if (clearBtn) clearBtn.addEventListener('click', function () {
      strokes = []; stop(); repaint();
      box.classList.remove('show-demo');
      if (live) live.textContent = 'Coretan dihapus.';
    });
    if (demoBtn) demoBtn.addEventListener('click', function () {
      box.classList.toggle('show-demo');
      if (live) live.textContent = box.classList.contains('show-demo') ? 'Contoh garis ditampilkan.' : 'Contoh garis disembunyikan.';
    });

    sizeCanvas();
    onLayout(sizeCanvas);
    if ('ResizeObserver' in window) new ResizeObserver(announceLayout).observe(canvas);
    // Warna garis mengikuti tema.
    new MutationObserver(repaint).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  });

  /* ── studi kasus: tautan yang bisa dibagikan ─────────── */
  feature(function () {
    var studies = document.querySelectorAll('details.study');
    if (!studies.length) return;
    function openFromHash() {
      var id = (location.hash || '').replace('#', '');
      if (!id) return;
      var t = document.getElementById(id);
      if (t && t.tagName === 'DETAILS') {
        t.open = true;
        requestAnimationFrame(function () {
          t.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' });
        });
      }
    }
    openFromHash();
    window.addEventListener('hashchange', openFromHash);
    studies.forEach(function (d) {
      d.addEventListener('toggle', function () {
        if (d.open) { if (history.replaceState) history.replaceState(null, '', '#' + d.id); }
        else if (location.hash === '#' + d.id) {
          if (history.replaceState) history.replaceState(null, '', location.pathname + location.search);
        }
        announceLayout();
      });
    });
  });

  /* ── penanda bagian aktif di navigasi ────────────────── */
  feature(function () {
    if (!hasIO) return;
    var links = {};
    document.querySelectorAll('.nav a[href^="#"]').forEach(function (a) {
      links[a.getAttribute('href').slice(1)] = a;
    });
    var sections = document.querySelectorAll('main section[id]');
    if (!sections.length) return;
    var ratio = {};
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { ratio[en.target.id] = en.isIntersecting ? en.intersectionRatio : 0; });
      var best = null, top = 0;
      Object.keys(ratio).forEach(function (id) { if (ratio[id] > top) { top = ratio[id]; best = id; } });
      if (best && best.indexOf('p-') === 0) best = 'proyek';
      Object.keys(links).forEach(function (id) {
        var on = id === best;
        links[id].classList.toggle('is-current', on);
        if (on) links[id].setAttribute('aria-current', 'true');
        else links[id].removeAttribute('aria-current');
      });
    }, { threshold: [0.1, 0.35, 0.6] });
    sections.forEach(function (s) { io.observe(s); });
  });

  /* ── reveal: hanya disiapkan kalau observer tersedia ──
     Tidak ada timer global yang memaksa seluruh halaman selesai. */
  feature(function () {
    if (reduced || !hasIO) return;
    var plan = [
      ['.hero .eyebrow', 'reveal-up'], ['.hero-lead', 'reveal-up'], ['.hero-side', 'reveal-up'],
      ['.opener-grid > *', 'reveal-up'],
      ['.case-head', 'reveal-up'], ['.case-media', 'reveal-rise'], ['.case-crop', 'reveal-rise'],
      ['.flow-step', 'reveal-up'], ['.pipe li', 'reveal-up'], ['.sketch', 'reveal-rise'],
      ['.case-foot', 'reveal-up'],
      ['.traits-display', 'reveal-up'], ['.portrait', 'reveal-left'], ['.about-text', 'reveal-up'],
      ['.traits li', 'reveal-up'],
      ['.tools .section-head', 'reveal-up'], ['.marquee', 'reveal-up'], ['.learning', 'reveal-up'],
      ['.experience .section-head', 'reveal-up'], ['.tl-group', 'reveal-up'], ['.timeline li', 'reveal-left'],
      ['.closing > *', 'reveal-up']
    ];
    var targets = [];
    plan.forEach(function (pair) {
      document.querySelectorAll(pair[0]).forEach(function (el) {
        if (el.classList.contains('reveal') || el.classList.contains('cat-slot')) return;
        el.classList.add('reveal', pair[1]);
        targets.push(el);
      });
    });
    document.querySelectorAll('.scribble').forEach(function (svg) {
      var path = svg.querySelector('.ink');
      if (!path || !path.getTotalLength) return;
      var len = 0;
      try { len = Math.ceil(path.getTotalLength()); } catch (e) { return; }
      if (!len) return;
      svg.style.setProperty('--len', len);
      svg.classList.add('reveal', 'draw');
      targets.push(svg);
    });
    if (!targets.length) return;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('in');
        io.unobserve(en.target);
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -8% 0px' });

    targets.forEach(function (el, i) {
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.92 && r.bottom > 0) {
        el.style.transitionDelay = Math.min(i, 6) * 70 + 'ms';
        requestAnimationFrame(function () { el.classList.add('in'); });
      } else io.observe(el);
    });
  });

  /* ── deretan logo tools ──────────────────────────────────
     Satu sumber state: jeda bila manual ATAU reduced ATAU tab tersembunyi
     ATAU di luar layar ATAU pointer/fokus sedang di atasnya. Hover sementara
     tidak pernah menulis preferensi manual. */
  feature(function () {
    var box = document.getElementById('marquee');
    if (!box) return;
    var view = box.querySelector('.marquee-view');
    var tracks = box.querySelectorAll('.marquee-track');
    if (!tracks.length || !view) return;
    var onScreen = !hasIO;
    var hovered = false;

    function apply() {
      var run = !motionPaused && !reduced && onScreen && !document.hidden && !hovered;
      tracks.forEach(function (t) { t.style.animationPlayState = run ? 'running' : 'paused'; });
    }
    apply();
    onMotionChange(apply);
    document.addEventListener('visibilitychange', apply);
    view.addEventListener('pointerenter', function () { hovered = true; apply(); });
    view.addEventListener('pointerleave', function () { hovered = false; apply(); });
    view.addEventListener('focusin', function () { hovered = true; apply(); });
    view.addEventListener('focusout', function () { hovered = false; apply(); });
    if (hasIO) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { onScreen = en.isIntersecting; });
        apply();
      }, { threshold: 0 }).observe(box);
    }
  });

  /* ── tahun footer ────────────────────────────────────── */
  feature(function () {
    var y = document.getElementById('year');
    if (y) y.textContent = String(new Date().getFullYear());
  });

  /* ── jembatan aksi ke maskot ─────────────────────────── */
  feature(function () {
    document.addEventListener('click', function (e) {
      var t = e.target && e.target.closest ? e.target.closest('[data-cat-action]') : null;
      if (!t) return;
      window.dispatchEvent(new CustomEvent('calvin:companion', {
        detail: { action: t.getAttribute('data-cat-action') }
      }));
    }, true);
  });

  /* ── maskot kucing ───────────────────────────────────────
     Satu actor pada lapisan fixed. Dock diambil dari elemen .cat-slot yang
     memang disediakan tiap section, jadi safe zone-nya lokal, bukan gutter
     104 px sepanjang halaman. Jalan kecil dibatasi ruang nyata di dock. */
  feature(function () {
    var root = document.getElementById('companion');
    if (!root) return;
    var actor = root.querySelector('.cat-actor');
    var puppet = root.querySelector('.cat-puppet');
    var hop = root.querySelector('.cat-hop');
    var live = document.getElementById('cat-live');
    if (!actor || !puppet || !hop) return;

    var speed = 90, rest = 7;
    var durations = { greet: 1800, cool: 4000, stretch: 1000, approve: 2200, flower: 2600, peek: 1400 };
    var lowPriority = { walk: 1, idle: 1, curious: 1, coffee: 1, yawn: 1 };

    var greets = 0;
    try {
      var saved = JSON.parse(read('calvin-cat') || 'null');
      if (saved && saved.v === 2 && Number.isSafeInteger(saved.greets) && saved.greets >= 0) greets = saved.greets;
    } catch (e) {}

    var state = reduced ? 'idle' : 'walk';
    var stateUntil = reduced ? Infinity : 2400;
    var followingCool = false, pendingAction = null;
    var restUntil = Infinity, coffeeAt = Infinity, coffeeUntil = Infinity, restNumber = 0;
    var pointerNear = false;
    var x = 0, lane = 0, direction = 1, gaze = 0;
    var hopAt = null, winkUntil = 0, lastActivityAt = 0, lastPointer = null;
    var elapsed = 0, runningSince = null, previousClock = 0;
    var frame = 0, timer = 0;
    var cooldown = {};

    var slots = Array.prototype.slice.call(document.querySelectorAll('.cat-slot'));
    var activeSlot = slots[0] || null;
    var dockX = 24, dockY = window.innerHeight * 0.5;

    function clock(now) {
      if (now === undefined) now = performance.now();
      return elapsed + (runningSince === null ? 0 : now - runningSince);
    }
    function canRun() { return !motionPaused && !document.hidden; }
    function cancelScheduled() {
      if (frame) cancelAnimationFrame(frame);
      if (timer) clearTimeout(timer);
      frame = 0; timer = 0;
    }
    function remember() { store('calvin-cat', JSON.stringify({ v: 2, greets: greets })); }
    function announce(m) { if (live) live.textContent = m; }
    function cool(key, ms) {
      var at = clock();
      if (cooldown[key] && at < cooldown[key]) return false;
      cooldown[key] = at + ms;
      return true;
    }

    /* Pita bebas = dari tepi kanan kolom isi sampai tepi viewport.
       Diukur dari layout yang sebenarnya, bukan angka tetap, dan jalan kecil
       dibatasi ke dalam pita itu. */
    function freeBand() {
      var holder = activeSlot && (activeSlot.closest('.section') || activeSlot.closest('.field') || activeSlot.closest('.hero'));
      var left = window.innerWidth * 0.82;
      if (holder) {
        var hr = holder.getBoundingClientRect();
        var pad = parseFloat(getComputedStyle(holder).paddingRight) || 0;
        left = hr.right - pad + 8;
      }
      return { left: clamp(left, 0, window.innerWidth - 24), right: window.innerWidth - 8 };
    }
    function placeDock(instant) {
      if (!activeSlot) return;
      var size = root.offsetWidth || 72;
      var r = activeSlot.getBoundingClientRect();
      // Horizontalnya selalu di pita kanan yang dipesan layout, jadi kucing tidak
      // pernah menyapu teks di posisi scroll mana pun. Slot hanya memberi ketinggian.
      var band = freeBand();
      dockX = clamp(band.left + (band.right - band.left - size) / 2, 8, window.innerWidth - size - 8);
      dockY = clamp(r.top - size / 2, 76, window.innerHeight - size - 18);
      root.style.setProperty('--dock-ms', (instant || reduced) ? '0ms' : '720ms');
      root.style.setProperty('--dock-x', dockX.toFixed(1) + 'px');
      root.style.setProperty('--dock-y', dockY.toFixed(1) + 'px');
      var half = Math.min(dockX - band.left, band.right - size - dockX);
      lane = clamp(half, 0, 60);
      if (Math.abs(x) > lane) x = clamp(x, -lane, lane);
    }

    function paint(at) {
      if (at === undefined) at = clock();
      if (root.dataset.catState !== state) root.dataset.catState = state;
      root.classList.toggle('is-paused', !canRun() || reduced);
      actor.classList.toggle('is-walking', state === 'walk' && !reduced && lane > 10);
      actor.classList.toggle('is-winking', at < winkUntil);
      actor.style.setProperty('--walk', x.toFixed(2) + 'px');
      puppet.style.transform = 'scaleX(' + direction + ')';
      root.style.setProperty('--cat-gaze', (gaze * direction).toFixed(2) + 'px');
      var progress = hopAt === null ? 1 : clamp((at - hopAt) / 420, 0, 1);
      var lift = (reduced || progress >= 1) ? 0 : -7 * Math.sin(Math.PI * progress);
      hop.style.transform = 'translateY(' + lift.toFixed(2) + 'px)';
    }

    function clearRest() { restUntil = Infinity; coffeeAt = Infinity; coffeeUntil = Infinity; }
    function startRest(at, allowCoffee) {
      state = 'idle';
      restUntil = reduced ? Infinity : at + rest * 1000;
      stateUntil = restUntil;
      coffeeAt = Infinity; coffeeUntil = Infinity;
      if (allowCoffee) {
        restNumber += 1;
        if (!reduced && (restNumber - 1) % 3 === 0) {
          coffeeAt = at + 900;
          coffeeUntil = Math.min(restUntil, coffeeAt + 2200);
        }
      }
    }
    function startWalk(at) {
      clearRest();
      if (reduced || lane <= 10) { startRest(at); return; }   // tidak cukup ruang: berdiri saja
      state = 'walk'; stateUntil = at + 2400;
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
      stateUntil = at + (durations[state] || 1500);
      winkUntil = state === 'greet' ? at + 420 : 0;
      hopAt = (state === 'greet' && !reduced) ? at : null;
    }
    function beginStretch(at, after) {
      clearRest();
      state = 'stretch'; stateUntil = at + durations.stretch;
      pendingAction = after || null; followingCool = false; winkUntil = 0; hopAt = null; gaze = 0;
    }
    function curiosity(at) {
      if (motionPaused) return;
      if (pointerNear && (state === 'walk' || state === 'idle' || state === 'coffee')) {
        clearRest(); state = 'curious'; stateUntil = Infinity;
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
      if (!reduced && ((state === 'walk' && lane > 10) || hopAt !== null)) { frame = requestAnimationFrame(update); return; }
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
      if (lowPriority[state]) {
        var idleFor = at - lastActivityAt;
        if (idleFor >= 14000) sleep();
        else if (idleFor >= 12400 && state !== 'yawn') {
          clearRest();
          state = 'yawn'; stateUntil = lastActivityAt + 14000; winkUntil = 0; hopAt = null;
        } else curiosity(at);
      }
      if (state === 'walk' && !reduced && lane > 10) {
        x += direction * speed * dt;
        if (x >= lane) { x = lane; direction = -1; }
        if (x <= -lane) { x = -lane; direction = 1; }
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
      if (motionPaused) return;
      if (state === 'sleep') beginStretch(at);
      else if (state === 'yawn') startRest(at);
      curiosity(at);
      sync();
    }
    function requestAction(action, explicit) {
      if (motionPaused) {
        if (explicit) announce('Pilih Lanjutkan gerakan untuk menyapa kucing.');
        return;
      }
      if (!explicit && !lowPriority[state] && state !== 'sleep') return;
      var at = clock();
      lastActivityAt = at;
      if (state === 'sleep') beginStretch(at, action);
      else if (state === 'stretch') pendingAction = action;
      else beginAction(action, at);
      sync();
    }
    function greet() {
      if (motionPaused) { announce('Pilih Lanjutkan gerakan untuk menyapa kucing.'); return; }
      greets = greets >= Number.MAX_SAFE_INTEGER ? 1 : greets + 1;
      var queued = state === 'stretch' && pendingAction && pendingAction.kind === 'greet' && pendingAction.cool;
      var isCool = greets % 3 === 0 || (state === 'greet' && followingCool) || queued;
      requestAction({ kind: 'greet', cool: isCool }, true);
      announce(isCool ? 'Halo! Kucingmu sedang bergaya.' : 'Halo! Kucing menyapamu.');
      remember();
    }
    function contextualAction(action, explicit) {
      if (action === 'sketch') {
        if (!cool('sketch', 6000)) return;        // tidak tersenyum ulang tiap pointermove
        requestAction({ kind: 'greet', cool: false }, false);
        return;
      }
      var kind = action === 'contact' ? 'flower'
        : (action === 'project' || action === 'cv') ? 'approve'
        : action === 'peek' ? 'peek' : null;
      if (!kind) return;
      if (kind === 'flower' && !cool('flower', 20000)) return;
      if (kind === 'peek' && !cool('peek', 9000)) return;
      var wasPaused = motionPaused;
      requestAction({ kind: kind === 'peek' ? 'curious' : kind }, explicit);
      if (kind === 'peek') { stateUntil = clock() + durations.peek; sync(); }
      if (explicit && !wasPaused) {
        announce(action === 'contact' ? 'Bunga untukmu!'
          : action === 'cv' ? 'Kucing menyetujui pilihan CV-mu.' : 'Kucing menyukai proyek ini.');
      }
    }

    actor.addEventListener('click', greet);
    document.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') { pointerNear = false; return; }
      var r = actor.getBoundingClientRect();
      var nearLimit = pointerNear ? 128 : 110;
      var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      var wasNear = pointerNear;
      pointerNear = Math.hypot(e.clientX - cx, e.clientY - cy) <= nearLimit;
      if (!motionPaused && !reduced && state !== 'sleep') {
        gaze = clamp((e.clientX - cx) / 70, -2.5, 2.5);
        root.style.setProperty('--cat-gaze', (gaze * direction).toFixed(2) + 'px');
      }
      // Hanya gerakan dekat kucing yang dihitung aktivitas, bukan setiap jitter.
      if (pointerNear) {
        if (!lastPointer || Math.hypot(e.clientX - lastPointer.x, e.clientY - lastPointer.y) >= 6) {
          lastPointer = { x: e.clientX, y: e.clientY };
          activity();
          return;
        }
      }
      if (wasNear !== pointerNear && !motionPaused) {
        var prior = state;
        curiosity(clock());
        if (state !== prior) sync();
      }
    }, { passive: true });

    actor.addEventListener('focus', activity);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { pointerNear = false; lastPointer = null; }
      sync();
    });
    onMotionChange(function () { sync(); });

    function preferenceChanged(e) {
      reduced = e.matches;
      if (reduced) {
        hopAt = null; gaze = 0;
        if (state === 'walk' || state === 'coffee' || state === 'curious') startRest(clock());
        motionPaused = true;
      }
      sync();
    }
    if (motionQuery.addEventListener) motionQuery.addEventListener('change', preferenceChanged);
    else if (motionQuery.addListener) motionQuery.addListener(preferenceChanged);

    window.addEventListener('calvin:companion', function (e) {
      contextualAction(e.detail && e.detail.action, true);
    });

    /* Dock mengikuti slot section yang sedang dominan, dengan histeresis. */
    if (hasIO && slots.length) {
      var ratios = new Map();
      var owners = slots.map(function (s) { return s.closest('section') || s.parentNode; });
      var pick = 0;
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { ratios.set(en.target, en.isIntersecting ? en.intersectionRatio : 0); });
        var best = null, top = 0;
        ratios.forEach(function (v, k) { if (v > top) { top = v; best = k; } });
        if (!best || top <= 0.34) return;
        var i = owners.indexOf(best);
        var next = i >= 0 ? slots[i] : null;
        if (!next || next === activeSlot) return;
        clearTimeout(pick);
        pick = setTimeout(function () {
          var far = Math.abs(next.getBoundingClientRect().left - dockX) > window.innerWidth * 0.45;
          activeSlot = next;
          if (far && !reduced) {
            // sisi jauh: hilang dan muncul di dock baru, tidak menyapu teks
            root.classList.add('is-settling');
            setTimeout(function () {
              placeDock(true);
              root.classList.remove('is-settling');
              contextualAction('peek', false);
            }, 180);
          } else {
            placeDock(false);
            contextualAction('peek', false);
          }
          lastActivityAt = clock();     // pindah bab = pengunjung aktif
          sync();
        }, 90);
      }, { threshold: [0.12, 0.34, 0.55, 0.8] });
      owners.forEach(function (o) { if (o) io.observe(o); });
    }

    /* Bagian kontak memicu bunga sekali saat benar-benar masuk. */
    if (hasIO) {
      var contact = document.querySelector('[data-cat-contact]');
      if (contact) {
        var wasIn = false;
        new IntersectionObserver(function (entries) {
          entries.forEach(function (en) {
            var isIn = en.isIntersecting && en.intersectionRatio >= 0.35;
            if (isIn && !wasIn) contextualAction('contact', false);
            wasIn = isIn;
          });
        }, { threshold: 0.35 }).observe(contact);
      }
    }

    var scrollTick = 0;
    window.addEventListener('scroll', function () {
      if (scrollTick) return;
      scrollTick = requestAnimationFrame(function () {
        scrollTick = 0;
        placeDock(true);   // satu rect per frame scroll, bukan puluhan
      });
    }, { passive: true });
    onLayout(function () { placeDock(true); });

    placeDock(true);
    paint();
    sync();
  });
})();

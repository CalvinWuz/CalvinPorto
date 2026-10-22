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
  var manualPaused = read('calvin-motion') === 'paused';
  var motionPaused = manualPaused || reduced;
  var motionListeners = [];
  function onMotionChange(fn) { motionListeners.push(fn); }
  function broadcastMotion() {
    // Effective pause = jeda manual ATAU reduced motion ATAU tab tersembunyi.
    motionPaused = manualPaused || reduced || document.hidden;
    document.documentElement.setAttribute('data-motion', motionPaused ? 'paused' : 'playing');
    motionListeners.forEach(function (fn) { try { fn(motionPaused); } catch (e) {} });
  }
  function setMotionPaused(v, persist) {
    manualPaused = Boolean(v);
    if (persist) store('calvin-motion', manualPaused ? 'paused' : 'playing');
    broadcastMotion();
  }
  document.addEventListener('visibilitychange', broadcastMotion);
  // Preferensi OS dipegang state pusat, bukan oleh masing-masing fitur.
  var onReduceChange = function (e) { reduced = e.matches; broadcastMotion(); };
  if (motionQuery.addEventListener) motionQuery.addEventListener('change', onReduceChange);
  else if (motionQuery.addListener) motionQuery.addListener(onReduceChange);
  broadcastMotion();

  /* Perubahan layout disiarkan sekali, bukan diukur ulang tiap frame. */
  var geometryPending = 0;
  function notifyPetGeometry() {
    if (geometryPending) return;
    geometryPending = requestAnimationFrame(function () { geometryPending = 0; window.dispatchEvent(new Event('calvin:geometry')); });
  }
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
      btn.setAttribute('aria-pressed', manualPaused ? 'true' : 'false');
      btn.querySelector('.vh').textContent = manualPaused
        ? 'Lanjutkan gerakan kucing, deretan logo, dan tekstur tepi'
        : 'Jeda gerakan kucing, deretan logo, dan tekstur tepi';
    }
    paint();
    onMotionChange(paint);
    btn.addEventListener('click', function () { setMotionPaused(!manualPaused, true); });
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

    var CAT_LANE = 12;       // jarak aman tepi stiker; tidak menyediakan lajur maskot
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
      var lane = CAT_LANE;
      // Batas stiker stabil dan tidak membaca posisi maskot. Kucinglah yang
      // menghindari stiker, jadi perjalanannya tidak menggeser bidang main.
      var max = w - lane;
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
      notifyPetGeometry();
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
        // Sempit: dua di baris atas pada sisi berlawanan, satu di baris bawah.
        // Baris kedua dihitung dari tinggi baris pertama yang sebenarnya,
        // bukan angka tetap, supaya tidak pernah terclamp menimpa baris atas.
        var pad = 10;
        var h0 = stickers[0].el.offsetHeight || 94;
        var h1 = stickers[1].el.offsetHeight || 76;
        var h2 = s.el.offsetHeight || 100;
        var rowTop = Math.max(h0 + 4, h1 + 12);
        var secondY = f.below + Math.min(rowTop + 14, Math.max(0, f.h - f.below - h2 - 8));
        if (s.i === 0) return { x: pad, y: f.below + 4 };
        if (s.i === 1) return { x: Math.max(pad, f.max - w - pad), y: f.below + 12 };
        return { x: Math.max(pad, (f.max - w) / 2), y: secondY };
      });
    }
    var lastWide = null;
    function place(force) {
      var f = field();
      if (!f.w || !stickers[0].el.offsetWidth) return;   // tunggu sampai ukurannya nyata
      var wide = f.w >= 900;
      // Komposisi default disusun ulang untuk ukuran baru selama pengguna belum
      // memindahkan stiker. Posisi yang benar-benar dipilih pengguna dipertahankan
      // dan hanya di-clamp ke bidang baru.
      var relayout = force || !placed || (lastWide !== null && lastWide !== wide && !touched);
      var d = defaults(f);
      stickers.forEach(function (s, i) {
        if (relayout) {
          var prior = (!force && !placed && saved) ? saved[s.i] : null;
          if (prior && isFinite(prior.x) && isFinite(prior.y)) { s.x = prior.x; s.y = prior.y; }
          else { s.x = d[i].x; s.y = d[i].y; }
          s.angle = s.restAngle;
        }
        draw(s);
      });
      placed = true;
      lastWide = wide;
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
    // Tombolnya hanya memilih penekanan; seluruh paragraf tetap terlihat,
    // jadi aria-pressed, bukan disclosure palsu dengan aria-expanded.
    function activate(i) {
      steps.forEach(function (s, n) {
        s.classList.toggle('is-on', n === i);
        s.querySelector('.flow-btn').setAttribute('aria-pressed', n === i ? 'true' : 'false');
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
        if (d.open) {
          if (history.replaceState) history.replaceState(null, '', '#' + d.id);
          // Membuka rincian adalah menjelajah informasi; maskot ikut berpikir sebentar.
          window.dispatchEvent(new CustomEvent('calvin:companion', {detail: {action: 'explore'}}));
        }
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
      ['.flow-step', 'reveal-up'], ['.pipe li', 'reveal-up'],
      ['.case-foot', 'reveal-up'],
      ['.traits-display', 'reveal-up'], ['.portrait', 'reveal-left'], ['.about-text', 'reveal-up'],
      ['.traits li', 'reveal-up'],
      ['.tools .section-head', 'reveal-up'], ['.marquee', 'reveal-up'], ['.learning', 'reveal-up'],
      ['.experience .section-head', 'reveal-up'], ['.tl-group', 'reveal-up'], ['.timeline li', 'reveal-left'],
      ['.closing > *:not(.decor-07)', 'reveal-up']
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
    // Visibilitas tab sudah dihitung state pusat; marquee cukup ikut siarannya.
    onMotionChange(apply);
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

  /* Maskot 07: satu actor, posisi viewport dan kontrol gerak terpisah. */
  feature(function () {
    var root = document.getElementById('companion');
    if (!root) return;
    import('./js/companion.js').then(function (mod) {
      var cat = new mod.Companion({
        root: root,
        actor: root.querySelector('.pet-actor'),
        bubble: root.querySelector('.pet-bubble'),
        // Teks seluruh section dilindungi, bukan hanya judul dan tombolnya: paragraf
        // penjelas di .section-head sempat tertutup kucing pada lebar ponsel.
        obstacles: '.topbar,.nav.is-open,.sticker,.eyebrow,.name,.role,.motto,.lede,.cta,.hint,.chapter-kicker,.display,.bridge,.section-head p,.section-head h2,.case-tag,.case h3,.case-lede,.case-sub,.case-fact,.case-role,.flow-step,.pipe li,.pipeline figcaption,.stack,.link,details.study,.notebook-about p,.notebook-about h3,.notebook-about a,.px-notebook,.case-media,.case-visual,.notebook-about__portrait,.marquee-label,.marquee-view,.learn-list,.tools-note,.tl-group,.timeline li,.mailto,.contact-lede,.contact-actions,.contact-list,.cert-archive,.foot-top,.foot-note',
        sections: [
          {id:'p-cookies',title:'Cookies Risk Analyzer',text:'Di proyek tim lima orang ini, bagianku mengembangkan bot analisis indikator terkait UU PDP.'},
          {id:'p-bisindo',title:'BISINDO Translator',text:'Prototipe pribadiku untuk mengenali huruf dan isyarat kata melalui koordinat tangan, dengan inferensi lokal.'},
          {id:'p-papantulis',title:'PapanTulis',text:'Eksperimen pribadiku mengubah gerakan tangan menjadi kontrol menggambar dan presentasi.'},
          {id:'tentang',title:'Sedikit tentang Calvin',text:'Teliti, tuntas, dan lintas bidang. Ini cara belajarku lewat proyek yang masih terus diperbaiki.'},
          {id:'kontak',title:'Mari terhubung',text:'Aku mencari magang 6 atau 12 bulan di bidang keamanan aplikasi atau posisi Computer Science yang relevan.'}
        ]
      }).start();
      // Manual dan preferensi OS tetap dibedakan oleh mesin karakter.
      cat.setPaused(manualPaused);
      cat.setReduced(reduced);
      onMotionChange(function () { cat.setPaused(manualPaused); cat.setReduced(reduced); });
      onLayout(function () { cat.invalidate(); });
      window.addEventListener('calvin:geometry', function () { cat.invalidate(); });
      // Maskot menyapa sekali ketika bagian kontak benar-benar terbaca.
      if (hasIO) {
        var contact = document.querySelector('[data-cat-contact]');
        var contactInside = false;
        if (contact) new IntersectionObserver(function (entries) {
          entries.forEach(function (en) {
            var inside = en.isIntersecting && en.intersectionRatio >= .35;
            if (inside && !contactInside) window.dispatchEvent(new CustomEvent('calvin:companion', {detail:{action:'contact'}}));
            contactInside = inside;
          });
        }, {threshold:.35}).observe(contact);
      }
    }).catch(function (e) { console.error('[portofolio] companion', e); });
  });

  feature(function () {
    import('./js/explorer.js').then(function (mod) {
      mod.initProjectExplorer({onLayout: announceLayout});
    }).catch(function (e) { console.error('[portofolio] explorer', e); });
  });

  feature(function () {
    import('./js/archive.js').then(function (mod) {
      mod.initCertificateArchive({onLayout: announceLayout});
    }).catch(function (e) { console.error('[portofolio] arsip sertifikat', e); });
  });
})();

import('./js/ambient.js').then(function(m){m.initAmbient()}).catch(function(e){console.error('Ambient:',e)});

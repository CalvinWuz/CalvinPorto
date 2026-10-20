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

  /* Satu tombol jeda mengendalikan maskot dan deretan logo. */
  var motionPaused = reduced || read('calvin-motion') === 'paused';
  var motionListeners = [];
  function onMotionChange(fn) { motionListeners.push(fn); }
  function setMotionPaused(v, persist) {
    motionPaused = Boolean(v);
    if (persist) store('calvin-motion', motionPaused ? 'paused' : 'playing');
    motionListeners.forEach(function (fn) { try { fn(motionPaused); } catch (e) {} });
  }

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

  /* ── stiker yang bisa digeser ────────────────────────── */
  feature(function () {
    var scene = document.getElementById('scene');
    var live = document.getElementById('sceneLive');
    var resetBtn = document.getElementById('resetStickers');
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
      if (raw && raw.v === 2 && Array.isArray(raw.p)) saved = raw.p;
    } catch (e) {}
    var touched = Boolean(saved);
    var started = false, lastWidth = 0, lastWide = null;

    // Bidang main adalah seluruh hero, tetapi posisi AWAL dihitung agar tidak
    // pernah menutupi nama, kalimat peran, CTA, navigasi, atau kucing.
    function field() {
      var w = scene.clientWidth, h = scene.clientHeight;
      var a = scene.getBoundingClientRect();
      var grid = scene.parentNode.querySelector('.hero-grid');
      var below = 0, right = 0;
      if (grid) {
        var b = grid.getBoundingClientRect();
        below = Math.max(0, b.bottom - a.top + 14);
        right = Math.max(0, b.right - a.left);
      }
      // Jalur maskot dikeluarkan dari bidang main, jadi stiker tidak pernah menutupi kucing.
      // Diukur dari posisi maskot yang sebenarnya, bukan dari nilai token.
      var cat = document.getElementById('companion');
      var max = w;
      if (cat) {
        var cr = cat.getBoundingClientRect();
        if (cr.width) max = Math.min(max, cr.left - a.left - 10);
      }
      return {
        w: w, h: h, max: Math.max(120, max),
        below: Math.min(below, Math.max(0, h - 140)), right: right
      };
    }
    function draw(s) {
      var f = field();
      s.x = clamp(s.x, 8, Math.max(8, f.max - s.el.offsetWidth - 8));
      s.y = clamp(s.y, 8, Math.max(8, f.h - s.el.offsetHeight - 6));
      s.el.style.transform = 'translate(' + s.x.toFixed(1) + 'px,' + s.y.toFixed(1) + 'px) rotate('
        + s.angle.toFixed(2) + 'deg) scale(' + (s.held ? 1.055 : 1) + ')';
    }
    function place(fresh) {
      var f = field();
      if (!f.w) return;
      var wide = f.w >= 900;
      var room = Math.max(90, f.h - f.below);
      stickers.forEach(function (s) {
        var renew = fresh || !started || (lastWide !== wide && !touched);
        if (renew) {
          var prior = (!started && !fresh && saved) ? saved[s.i] : null;
          var w = s.el.offsetWidth || 120;
          if (prior && isFinite(prior.x) && isFinite(prior.y)) {
            s.x = prior.x; s.y = prior.y;
          } else if (wide) {
            // satu di kiri bawah, dua mengisi pita bawah di sisi kanan
            if (s.i === 0) { s.x = 0.02 * f.max; s.y = f.below + 0.10 * room; }
            else if (s.i === 1) { s.x = Math.max(8, f.max - w - 0.03 * f.max); s.y = f.below - 6; }
            else { s.x = 0.54 * f.max; s.y = f.below + 0.34 * room; }
          } else {
            var pad = 10;
            if (s.i === 0) { s.x = pad; s.y = f.below + 4; }
            else if (s.i === 1) { s.x = Math.max(pad, f.max - w - pad); s.y = f.below + 10; }
            else { s.x = Math.max(pad, (f.max - w) / 2); s.y = f.below + Math.max(112, 0.5 * room); }
          }
          s.angle = s.restAngle;
        } else if (lastWidth && lastWidth !== f.w) {
          s.x = s.x / lastWidth * f.w;
        }
        draw(s);
      });
      started = true; lastWidth = f.w; lastWide = wide;
    }
    function remember() {
      touched = true;
      store('calvin-stickers', JSON.stringify({
        v: 2, p: stickers.map(function (s) { return { x: Math.round(s.x), y: Math.round(s.y) }; })
      }));
    }

    place(false);
    if ('ResizeObserver' in window) new ResizeObserver(function () { place(false); }).observe(scene);
    else window.addEventListener('resize', function () { place(false); });
    window.addEventListener('load', function () { place(false); });

    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        touched = false;
        try { localStorage.removeItem('calvin-stickers'); } catch (e) {}
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

    // Pasif: sentuhan tetap bisa menggulir halaman, tidak ada scroll yang ditahan.
    name.addEventListener('pointermove', function (e) {
      var r = name.getBoundingClientRect();
      respond(e.clientX - r.left, e.clientY - r.top);
    }, { passive: true });
    name.addEventListener('pointerleave', rest);
    name.addEventListener('pointercancel', rest);
    name.addEventListener('pointerup', function () { setTimeout(rest, 450); }, { passive: true });

    // role, tabindex dan petunjuknya sudah ada di HTML, jadi fokus tetap benar tanpa script.
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
        // replaceState, bukan pushState: alamatnya bisa disalin tanpa membingungkan tombol Back.
        if (d.open) { if (history.replaceState) history.replaceState(null, '', '#' + d.id); }
        else if (location.hash === '#' + d.id) {
          if (history.replaceState) history.replaceState(null, '', location.pathname + location.search);
        }
        window.dispatchEvent(new CustomEvent('calvin:layout'));
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
      // bagian proyek memakai tiga section; tandai satu tautan "Proyek"
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
     Tanpa JS, tanpa observer, atau saat reduced motion, konten tampil apa adanya.
     Tidak ada timer global yang memaksa seluruh halaman selesai. */
  feature(function () {
    if (reduced || !hasIO) return;
    var plan = [
      ['.hero .eyebrow', 'reveal-up'],
      ['.hero .role', 'reveal-up'],
      ['.hero .hero-side', 'reveal-up'],
      ['.intro-work-inner h2', 'reveal-up'],
      ['.intro-work-inner .bridge', 'reveal-up'],
      ['.case-head', 'reveal-up'],
      ['.case-media', 'reveal-rise'],
      ['.beats li', 'reveal-up'],
      ['.case-foot', 'reveal-up'],
      ['.portrait', 'reveal-left'],
      // naik, bukan geser: geseran horizontal akan masuk ke jalur kucing sesaat
      ['.about-text', 'reveal-up'],
      ['.traits li', 'reveal-up'],
      ['.tools .section-head', 'reveal-up'],
      ['.marquee', 'reveal-up'],
      ['.learning', 'reveal-up'],
      ['.experience .section-head', 'reveal-up'],
      ['.timeline li', 'reveal-left'],
      ['.contact-inner', 'reveal-rise']
    ];
    var targets = [];
    plan.forEach(function (pair) {
      document.querySelectorAll(pair[0]).forEach(function (el) {
        el.classList.add('reveal', pair[1]);
        targets.push(el);
      });
    });
    // coretan tangan: digambar sekali saat masuk
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
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    targets.forEach(function (el, i) {
      // apa pun yang sudah terlihat saat halaman dibuka tampil langsung, tanpa menunggu
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.92 && r.bottom > 0) {
        el.style.transitionDelay = Math.min(i, 6) * 70 + 'ms';
        requestAnimationFrame(function () { el.classList.add('in'); });
      } else io.observe(el);
    });
  });

  /* ── deretan logo tools ─────────────────────────────── */
  feature(function () {
    var box = document.getElementById('marquee');
    if (!box) return;
    var tracks = box.querySelectorAll('.marquee-track');
    if (!tracks.length) return;
    var onScreen = !hasIO;

    function apply() {
      var run = !motionPaused && onScreen && !document.hidden && !reduced;
      tracks.forEach(function (t) { t.style.animationPlayState = run ? 'running' : 'paused'; });
    }
    apply();
    onMotionChange(apply);
    document.addEventListener('visibilitychange', apply);
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
      // Tidak ada preventDefault: tautan proyek dan CV harus tetap berjalan.
      window.dispatchEvent(new CustomEvent('calvin:companion', {
        detail: { action: t.getAttribute('data-cat-action') }
      }));
    }, true);
  });

  /* ── maskot kucing ───────────────────────────────────────
     Satu actor pada lapisan fixed sendiri, lepas dari footer.
     Dock = slot viewport per section; jalan kecil terjadi di dalam dock.
     Waktu logis sendiri, jadi tidak ada pose yang kedaluwarsa saat dijeda,
     saat tab disembunyikan, atau saat actor tidak terlihat. */
  feature(function () {
    var root = document.getElementById('companion');
    if (!root) return;
    var actor = root.querySelector('.cat-actor');
    var puppet = root.querySelector('.cat-puppet');
    var hop = root.querySelector('.cat-hop');
    var live = document.getElementById('cat-live');
    if (!actor || !puppet || !hop) return;

    var speed = 90, rest = 7;
    var durations = { greet: 1800, cool: 4000, stretch: 1000, approve: 2200, flower: 2600 };
    var lowPriority = { walk: 1, idle: 1, curious: 1, coffee: 1, yawn: 1 };
    var LANE = 44; // jalan pendek di dalam dock, bukan menyeberangi halaman

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
    var x = 0, direction = 1, gaze = 0;
    var hopAt = null, winkUntil = 0, lastActivityAt = 0, lastPointer = null;
    var elapsed = 0, runningSince = null, previousClock = 0;
    var frame = 0, timer = 0;

    /* ---- dock ----
       Sisi (kiri/kanan) diambil dari jalur --catgutter yang memang disediakan
       layout, jadi kucing berdiri di ruangnya sendiri. Hanya ketinggiannya
       yang dinyatakan sebagai pecahan tinggi viewport. */
    var SLOTS = {
      'hero-right':  { side: 'right', y: 0.56, yNarrow: 0.84 },
      'left-low':    { side: 'left',  y: 0.72, yNarrow: 0.80 },
      'left-mid':    { side: 'left',  y: 0.46, yNarrow: 0.26 },
      'left-top':    { side: 'left',  y: 0.28, yNarrow: 0.22 },
      'right-mid':   { side: 'right', y: 0.42, yNarrow: 0.24 },
      'right-low':   { side: 'right', y: 0.72, yNarrow: 0.80 }
    };
    var sections = Array.prototype.slice.call(document.querySelectorAll('[data-dock]'));
    var activeDock = sections.length ? sections[0].getAttribute('data-dock') : 'hero-right';

    function gutters() {
      // Satu pengukuran per perubahan layout, bukan tiap frame.
      var cs = getComputedStyle(document.documentElement);
      var gl = parseFloat(cs.getPropertyValue('--catgutter')) || 0;
      var gr = parseFloat(cs.getPropertyValue('--catgutter-r')) || 0;
      var probe = document.querySelector('.section') || document.querySelector('.hero');
      if (!probe) return { left: 12, right: window.innerWidth - 12, gl: gl, gr: gr };
      var r = probe.getBoundingClientRect();
      var p = getComputedStyle(probe);
      return {
        left: r.left + (parseFloat(p.paddingLeft) || 0) - gl,
        right: r.right - (parseFloat(p.paddingRight) || 0) + gr,
        gl: gl, gr: gr
      };
    }

    function placeDock() {
      var slot = SLOTS[activeDock] || SLOTS['hero-right'];
      var narrow = window.innerWidth < 721;
      var size = root.offsetWidth || 76;
      var g = gutters();
      // Di ponsel hanya jalur kanan yang disediakan, jadi semua dock ke kanan.
      var side = narrow ? 'right' : slot.side;
      var band = side === 'left' ? g.gl : g.gr;
      var px;
      if (band < size * 0.72) {
        px = side === 'left' ? 10 : window.innerWidth - size - 10;
      } else {
        px = side === 'left'
          ? g.left + (band - size) / 2
          : g.right - band + (band - size) / 2;
      }
      var y = narrow ? slot.yNarrow : slot.y;
      px = clamp(px, 8, window.innerWidth - size - 8);
      var py = clamp(y * window.innerHeight - size / 2, 76, window.innerHeight - size - 18);
      root.style.setProperty('--dock-x', px.toFixed(1) + 'px');
      root.style.setProperty('--dock-y', py.toFixed(1) + 'px');
    }

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

    function paint(at) {
      if (at === undefined) at = clock();
      if (root.dataset.catState !== state) root.dataset.catState = state;
      root.classList.toggle('is-paused', !canRun() || reduced);
      actor.classList.toggle('is-walking', state === 'walk' && !reduced);
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
        x += direction * speed * dt;
        if (x >= LANE) { x = LANE; direction = -1; }
        if (x <= -LANE) { x = -LANE; direction = 1; }
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
      if (motionPaused) { announce('Pilih Lanjutkan gerakan untuk menyapa kucing.'); return; }
      greets = greets >= Number.MAX_SAFE_INTEGER ? 1 : greets + 1;
      var queued = state === 'stretch' && pendingAction && pendingAction.kind === 'greet' && pendingAction.cool;
      var cool = greets % 3 === 0 || (state === 'greet' && followingCool) || queued;
      requestAction({ kind: 'greet', cool: cool }, true);
      announce(cool ? 'Halo! Kucingmu sedang bergaya.' : 'Halo! Kucing menyapamu.');
      remember();
    }
    function contextualAction(action, explicit) {
      var kind = action === 'contact' ? 'flower'
        : (action === 'project' || action === 'cv') ? 'approve' : null;
      if (!kind) return;
      var wasPaused = motionPaused;
      requestAction({ kind: kind }, explicit);
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
      // Hanya gerakan dekat kucing yang dihitung sebagai aktivitas bermakna,
      // supaya kursor diam di seberang halaman tidak menahannya terjaga selamanya.
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
        // jangan menimpa preferensi jeda yang pengguna simpan sendiri
        motionPaused = true;
      }
      sync();
    }
    if (motionQuery.addEventListener) motionQuery.addEventListener('change', preferenceChanged);
    else if (motionQuery.addListener) motionQuery.addListener(preferenceChanged);

    window.addEventListener('calvin:companion', function (e) {
      contextualAction(e.detail && e.detail.action, true);
    });

    /* pilih dock dari section yang paling dominan, dengan histeresis */
    if (hasIO && sections.length) {
      var seen = {};
      var pick = 0;
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          seen[en.target.id || en.target.className] = {
            el: en.target, r: en.isIntersecting ? en.intersectionRatio : 0
          };
        });
        var best = null, top = 0;
        Object.keys(seen).forEach(function (k) { if (seen[k].r > top) { top = seen[k].r; best = seen[k].el; } });
        if (!best) return;
        var dock = best.getAttribute('data-dock');
        // histeresis: hanya pindah kalau benar-benar dominan, jadi tidak bolak-balik di batas
        if (dock && dock !== activeDock && top > 0.34) {
          activeDock = dock;
          clearTimeout(pick);
          pick = setTimeout(placeDock, 60);
        }
      }, { threshold: [0.12, 0.34, 0.55, 0.8] });
      sections.forEach(function (s) { io.observe(s); });
    }

    var relayout = 0;
    function scheduleLayout() {
      clearTimeout(relayout);
      relayout = setTimeout(placeDock, 120);
    }
    window.addEventListener('resize', scheduleLayout);
    window.addEventListener('orientationchange', scheduleLayout);
    window.addEventListener('calvin:layout', scheduleLayout);

    placeDock();
    paint();
    sync();
  });
})();

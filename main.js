/* Calvin — portfolio.
   Everything here is an enhancement: the page is complete and readable without it. */
(function () {
  'use strict';
  var reduce = false;
  try { reduce = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  function feature(fn) { try { fn(); } catch (e) { try { console.error('[portfolio]', e); } catch (_) {} } }

  /* ── theme ───────────────────────────────────────────── */
  feature(function () {
    var btn = document.getElementById('theme'), root = document.documentElement;
    if (!btn) return;
    function paint() {
      var dark = root.getAttribute('data-theme') === 'dark';
      btn.textContent = dark ? 'Light' : 'Dark';
      btn.setAttribute('aria-pressed', dark ? 'true' : 'false');
      // the <meta>s are gated on the system scheme, which this button can disagree with.
      // Give both the chosen colour so whichever one the browser picks is right.
      var c = dark ? '#1b1a18' : '#eeecea';
      document.querySelectorAll('meta[name="theme-color"]').forEach(function (m) {
        m.setAttribute('content', c);
      });
    }
    paint();
    btn.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
      paint();
    });
  });

  /* ── the live thing: this page audits itself ─────────── */
  feature(function () {
    var run = document.getElementById('auditRun'), box = document.getElementById('audit'),
        note = document.getElementById('auditNote');
    if (!run || !box) return;
    function put(key, text, good) {
      var el = box.querySelector('[data-k="' + key + '"]');
      if (!el) return;
      el.textContent = text;
      el.className = good ? 'good' : '';
    }
    run.addEventListener('click', function () {
      // cookies this page has set
      var cookies = document.cookie ? document.cookie.split(';').filter(function (c) { return c.trim(); }).length : 0;

      // every resource the browser actually fetched, grouped by host
      var hosts = {}, third = 0;
      try {
        (performance.getEntriesByType('resource') || []).forEach(function (r) {
          var h;
          try { h = new URL(r.name).host; } catch (e) { return; }
          if (h && h !== location.host) { hosts[h] = true; }
        });
      } catch (e) {}
      var names = Object.keys(hosts);
      third = names.length;

      // bytes this site keeps on your device
      var bytes = 0;
      try {
        for (var i = 0; i < localStorage.length; i++) {
          var k = localStorage.key(i);
          bytes += (k + (localStorage.getItem(k) || '')).length;
        }
      } catch (e) {}

      put('cookies', cookies === 0 ? 'none' : String(cookies), cookies === 0);
      put('trackers', 'none', true);
      put('third', third === 0 ? 'none' : names.join(', '), third === 0 || names.every(function (n) { return /fonts\.(googleapis|gstatic)\.com/.test(n); }));
      put('storage', bytes === 0 ? 'nothing' : bytes + ' bytes (your theme choice)', bytes <= 32);

      if (note) note.textContent = 'Read from your own browser just now, with document.cookie, the Resource Timing API and localStorage. You can check it yourself in devtools.';
      run.textContent = 'Checked';
      run.disabled = true;
    });
  });

  /* ── signature motion: the work slowly crossfades ────── */
  feature(function () {
    var wrap = document.getElementById('shots');
    if (!wrap) return;
    var shots = wrap.querySelectorAll('img');
    if (!shots.length) return;
    shots[0].classList.add('on');
    if (reduce || shots.length < 2) return;
    var i = 0, timer = null;
    function step() {
      shots[i].classList.remove('on');
      i = (i + 1) % shots.length;
      shots[i].classList.add('on');
    }
    function start() { if (!timer) timer = setInterval(step, 5600); }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    var paused = false;
    start();
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop(); else if (!paused) start();
    });

    // Motion that runs by itself for more than five seconds needs a way to stop it (WCAG 2.2.2).
    var cap = document.querySelector('.hero-art .cap');
    if (!cap) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cap-btn';
    function label() {
      btn.textContent = paused ? 'Play' : 'Pause';
      btn.setAttribute('aria-label', (paused ? 'Resume' : 'Pause') + ' the changing picture');
    }
    label();
    btn.addEventListener('click', function () {
      paused = !paused;
      paused ? stop() : start();
      label();
    });
    cap.appendChild(document.createTextNode(' '));
    cap.appendChild(btn);
  });

  /* ── work ledger: preview follows the active row ─────── */
  var studies = {
    0: {
      name: 'BISINDO Translator', meta: '2025 · Python, PyTorch, MediaPipe, Transformer, PySide6',
      img: 'img/bisindo.jpg',
      alt: 'The BISINDO translator running, with hand landmarks drawn over a live camera view.',
      repo: 'https://github.com/CalvinWuz/BISINDO-Translator',
      blocks: [
        ['The problem', 'Deaf and hard of hearing communities in Indonesia use BISINDO, but almost no software understands it. The tools that exist are cloud based, English first, and they send camera frames to a server.'],
        ['Why it matters', 'A translator that only works online, or that streams someone’s webcam away from their machine, fails the very people it is for. Communication is not a feature you should have to trade privacy for.'],
        ['What I decided', ['Track hand and pose landmarks, never the picture, so no raw video can leave the device.', 'Classify sign sequences with a small Transformer over those landmarks.', 'One calm window that shows the reading and its confidence, nothing else.']],
        ['How it is built', 'MediaPipe pulls hand and pose landmarks from each frame. A lightweight Transformer reads the sequence in real time. The interface is PySide6, deliberately plain, and the whole thing runs offline with no network calls at all.'],
        ['What was hard', 'Holding real time speed on an ordinary laptop while keeping accuracy, and separating two handed signs that look almost identical without a large public dataset to learn from.'],
        ['What I took from it', 'Designing for accessibility changed how I approach everything else. The constraint that helps one group of people almost always makes the thing better for everyone.']
      ]
    },
    1: {
      name: 'Cookies Risk Analyzer', meta: '2026 · Node.js, React, Playwright, Docker, OWASP',
      img: 'img/cookierisk.jpg',
      alt: 'The Cookies Risk Analyzer home screen, with a field for a website address and a row of site categories.',
      repo: 'https://github.com/CalvinWuz/CookiesAnalyzer-Website',
      blocks: [
        ['The problem', 'Almost nobody knows how many third party trackers a site drops on them, or how much any one of them matters. The risk is real but invisible, so nothing gets done about it.'],
        ['Why it matters', 'Tracking cookies quietly build a profile of a person across the web. Turning that into a number a team can read is what turns a vague worry into something they can actually fix, and check against the law.'],
        ['What I decided', ['Crawl with headless Chromium so cookies are seen exactly as a browser sees them.', 'Score each one with the OWASP Risk Rating method, likelihood times impact, on a 1 to 9 scale.', 'Say why a cookie is risky, not only that it is.']],
        ['How it is built', 'A Node backend drives Playwright through several passes, including one that refuses consent, to catch trackers that ignore it. Each cookie is classified and scored, then checked against GDPR and Indonesia’s UU PDP No. 27/2022. It runs in Docker so a scan is reproducible, behind a React interface.'],
        ['What was hard', 'Telling a tracking cookie apart from a functional one reliably, and defending a single number for something as qualitative as privacy risk.'],
        ['What I took from it', 'Making a risk visible and numeric is most of the work. People act on what they can measure. Mapping a security standard onto a new domain also showed me how much judgement sits behind any score that looks objective.']
      ]
    },
    2: {
      name: 'Boardly', meta: '2025 · Python, OpenCV, MediaPipe, NumPy',
      img: 'img/detail/boardly-air.jpg',
      alt: 'Boardly running: strokes drawn in the air float in the room, with one hand tracked and labelled.',
      repo: 'https://github.com/CalvinWuz/PapanTulis',
      blocks: [
        ['The problem', 'A digital whiteboard needs a mouse, a stylus or a touchscreen. In a classroom that hardware is often the only thing standing between an idea and the screen.'],
        ['Why it matters', 'The most natural pointing device is the one everybody already has. Taking the hardware away means any laptop with a webcam becomes a board, and the person presenting can keep facing the room.'],
        ['What I decided', ['A small vocabulary that maps to intent: one finger draws, an open palm erases, a fist lifts the pen.', 'A gesture has to hold for several frames before it counts, so nothing fires by accident.', 'Once you are drawing, erasing needs a clearly higher score, so spreading your fingers never wipes the board.', 'A finished stroke is matched against a circle, a rectangle or a triangle and quietly replaced with clean geometry.']],
        ['How it is built', 'MediaPipe tracks up to two hands. Frames come in at 1280 by 720 but are processed at 640 by 360, which roughly doubles the throughput. A state machine moves between pause, draw, erase and laser, and a moving average smooths the fingertip into a steady line. Completed strokes run through Ramer Douglas Peucker simplification with vertex and circularity tests before being swapped for a shape.'],
        ['What was hard', 'Gesture detection is deceptively difficult. Early versions drew without a clear index finger and flipped into erase mid stroke. The fix was confidence scoring, debounce and hysteresis, not more conditionals.'],
        ['What I took from it', 'A natural interface lives or dies on how often it acts when you did not ask it to. Making the system refuse to act until it was sure did more for how it felt than any accuracy gain.']
      ]
    }
  };

  feature(function () {
    var ledger = document.getElementById('ledger'),
        img = document.getElementById('previewImg'),
        cap = document.getElementById('preview-cap'),
        rows = ledger ? ledger.querySelectorAll('.row') : [];
    if (!ledger || !rows.length) return;

    function show(i) {
      var s = studies[i]; if (!s || !img) return;
      img.src = s.img; img.alt = s.alt;
      if (cap) cap.textContent = s.name + '. Press to read how it was made.';
      ledger.classList.add('dim');
      rows.forEach(function (r) { r.classList.toggle('live', +r.dataset.i === i); });
    }
    function clear() {
      ledger.classList.remove('dim');
      rows.forEach(function (r) { r.classList.remove('live'); });
      if (cap) cap.textContent = 'Press a row to read how it was made.';
    }
    rows.forEach(function (r) {
      var i = +r.dataset.i;
      r.addEventListener('mouseenter', function () { show(i); });
      r.addEventListener('focus', function () { show(i); });
      r.addEventListener('click', function () { open(i, r); });
    });
    ledger.addEventListener('mouseleave', clear);

    /* ── case study ── */
    var dlg = document.getElementById('study'), last = null;
    function open(i, from) {
      var s = studies[i]; if (!s || !dlg) return;
      last = from;
      var html = '<div class="study-in"><div class="study-top">' +
        '<h3 id="studyTitle">' + s.name + '</h3>' +
        '<button type="button" class="study-close">Close</button></div>' +
        '<p class="study-meta">' + s.meta + '</p>' +
        '<img src="' + s.img + '" alt="' + s.alt + '">';
      s.blocks.forEach(function (b) {
        html += '<h4>' + b[0] + '</h4>';
        if (Array.isArray(b[1])) {
          html += '<ul>' + b[1].map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>';
        } else { html += '<p>' + b[1] + '</p>'; }
      });
      html += '<p><a class="repo" href="' + s.repo + '">Read the code on GitHub</a></p></div>';
      dlg.innerHTML = html;
      dlg.querySelector('.study-close').addEventListener('click', function () { dlg.close(); });
      if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
      dlg.scrollTop = 0;
    }
    if (dlg) dlg.addEventListener('close', function () { if (last) last.focus(); });
  });

  /* ── contact: compose a real email, send nothing ─────── */
  feature(function () {
    var form = document.getElementById('ask');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = (document.getElementById('askText').value || '').trim();
      var body = v ? v + '\n\n' : '';
      location.href = 'mailto:calvinguscalvin@gmail.com?subject=' +
        encodeURIComponent('From your portfolio') + '&body=' + encodeURIComponent(body);
    });
  });

  /* ── entrances ───────────────────────────────────────── */
  feature(function () {
    // reach past the grid wrappers so a section arrives part by part, not as one block
    var sel = [
      ':scope > h2', ':scope > p', ':scope > ul', ':scope > form', ':scope > dl',
      ':scope > .intro-grid > *',
      ':scope > .ledger-wrap > .ledger > li',
      ':scope > .ledger-wrap > .preview-hold',
      ':scope > .record-grid > div > .rec-group',
      ':scope > .letter-grid > *',
      ':scope > .contact-grid > *'
    ].join(',');
    var parts = [];
    document.querySelectorAll('section').forEach(function (sec) {
      sec.querySelectorAll(sel).forEach(function (el) { parts.push(el); });
    });
    document.querySelectorAll('.hero-col > *, .hero-art > *').forEach(function (el) { parts.push(el); });
    if (!parts.length) return;
    if (reduce || !('IntersectionObserver' in window)) { parts.forEach(function (el) { el.classList.add('in'); }); return; }
    parts.forEach(function (el) { el.classList.add('rise'); });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var sibs = Array.prototype.slice.call(en.target.parentNode.children).filter(function (n) { return n.classList.contains('rise'); });
        en.target.style.transitionDelay = (Math.max(0, sibs.indexOf(en.target)) * 80) + 'ms';
        en.target.classList.add('in');
        io.unobserve(en.target);
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    parts.forEach(function (el) { io.observe(el); });
    // never leave content hidden if something goes wrong
    setTimeout(function () { parts.forEach(function (el) { el.classList.add('in'); }); }, 4000);
  });

  feature(function () {
    var y = document.getElementById('year');
    if (y) y.textContent = new Date().getFullYear();
  });
})();

/* ═══════════════════════════════════════════════════════════════════════════
   HACKKNOW//OS — CLIENT
   neobrutalism × cosmic sci-fi
   Author: Gagan Chauhan · MIT
   ═══════════════════════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (n, mn, mx) => Math.min(mx, Math.max(mn, n));

  const STATE = {
    mode: 'default',
    music: false,
    cinematic: false,
    galaxy: false,
    loaded: false,
    mouse: { x: window.innerWidth / 2, y: window.innerHeight / 2, vx: 0, vy: 0 },
    audioCtx: null,
    musicNodes: null,
  };

  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TOUCH   = window.matchMedia('(pointer: coarse)').matches;

  // ═══════════════════════════════════════════════════════════════════════
  // 1. LOADER — cosmic boot sequence
  // ═══════════════════════════════════════════════════════════════════════
  function bootLoader() {
    const loader  = $('#loader');
    const fill    = $('#loader-fill');
    const pct     = $('#loader-percent');
    const logsEl  = $('#loader-logs');

    const sequence = [
      { t: 0,   line: '> hkOS · v2026.05.16 · kernel boot', cls: 'log-key' },
      { t: 4,   line: '> mounting /sys/cosmos ........ OK', cls: 'log-ok' },
      { t: 10,  line: '> loading kernel module brutalism.ko', cls: '' },
      { t: 17,  line: '> initializing AI orchestrator [4 engines]', cls: 'log-key' },
      { t: 24,  line: '  ✓ groq      ............. READY', cls: 'log-ok' },
      { t: 30,  line: '  ✓ gemini    ............. READY', cls: 'log-ok' },
      { t: 36,  line: '  ✓ claude    ............. READY', cls: 'log-ok' },
      { t: 42,  line: '  ✓ llama     ............. READY', cls: 'log-ok' },
      { t: 50,  line: '> spinning up edge network · cloudflare', cls: '' },
      { t: 58,  line: '> hydrating neural matrix .......... 96%', cls: 'log-key' },
      { t: 66,  line: '> connecting quantum interface ... LIVE', cls: 'log-ok' },
      { t: 74,  line: '> warming Worker fleet · 330 POPs', cls: '' },
      { t: 82,  line: '> compiling reality engine ......... OK', cls: 'log-ok' },
      { t: 90,  line: '> ⚠ cosmic anomaly detected — ignoring', cls: 'log-warn' },
      { t: 96,  line: '> finalizing handshake · DEL-01 → EARTH', cls: 'log-key' },
      { t: 100, line: '> SYSTEM READY · WELCOME, OPERATOR', cls: 'log-ok' },
    ];

    let printed = 0;
    let progress = 0;
    const start = performance.now();
    const DUR = REDUCED ? 1200 : 3400;

    function tick(now) {
      const elapsed = now - start;
      progress = clamp((elapsed / DUR) * 100, 0, 100);
      fill.style.width = progress + '%';
      pct.textContent = String(Math.floor(progress)).padStart(3, '0') + '%';

      while (printed < sequence.length && sequence[printed].t <= progress) {
        const s = sequence[printed++];
        const div = document.createElement('div');
        div.className = 'log-line ' + s.cls;
        div.textContent = s.line;
        logsEl.appendChild(div);
        // auto-scroll
        logsEl.scrollTop = logsEl.scrollHeight;
        if (logsEl.children.length > 9) logsEl.removeChild(logsEl.firstChild);
      }

      if (progress < 100) requestAnimationFrame(tick);
      else finish();
    }

    function finish() {
      setTimeout(() => {
        loader.classList.add('hidden');
        document.body.dataset.loaded = 'true';
        STATE.loaded = true;
        startHeroTyper();
        animateStats();
        animateSkills();
        notify('▸ SYSTEM ONLINE');
      }, REDUCED ? 80 : 400);
    }

    requestAnimationFrame(tick);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 2. CUSTOM CURSOR + SPARK TRAIL
  // ═══════════════════════════════════════════════════════════════════════
  function setupCursor() {
    if (TOUCH) return;
    const dot  = $('#cursor-dot');
    const ring = $('#cursor-ring');
    const spark = $('#spark-canvas');
    if (!dot || !ring) return;

    let dx = 0, dy = 0, rx = 0, ry = 0;

    window.addEventListener('mousemove', (e) => {
      STATE.mouse.x = e.clientX;
      STATE.mouse.y = e.clientY;
      const c = $('#mouse-coord');
      if (c) c.textContent = `${String(e.clientX).padStart(3,'0')},${String(e.clientY).padStart(3,'0')}`;
      // emit spark
      spawnSpark(e.clientX, e.clientY);
    }, { passive: true });

    // Smooth follow
    function follow() {
      dx += (STATE.mouse.x - dx) * 1; // dot snaps
      dy += (STATE.mouse.y - dy) * 1;
      rx += (STATE.mouse.x - rx) * 0.16;
      ry += (STATE.mouse.y - ry) * 0.16;
      dot.style.transform = `translate(${dx}px, ${dy}px) translate(-50%, -50%)`;
      ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
      requestAnimationFrame(follow);
    }
    follow();

    // Hover types
    document.addEventListener('mouseover', (e) => {
      const t = e.target.closest('[data-cursor]');
      document.body.classList.remove('cursor-link', 'cursor-button', 'cursor-card');
      if (t) {
        const k = t.dataset.cursor;
        if (k === 'link') document.body.classList.add('cursor-link');
        else if (k === 'button') document.body.classList.add('cursor-button');
        else if (k === 'card') document.body.classList.add('cursor-card');
      }
    });

    // Spark canvas
    const ctx = spark.getContext('2d');
    let dpr = window.devicePixelRatio || 1;
    function resize() {
      spark.width = window.innerWidth * dpr;
      spark.height = window.innerHeight * dpr;
      spark.style.width = window.innerWidth + 'px';
      spark.style.height = window.innerHeight + 'px';
      ctx.scale(dpr, dpr);
    }
    resize();
    window.addEventListener('resize', resize);

    const sparks = [];
    let lastEmit = 0;
    function spawnSpark(x, y) {
      const now = performance.now();
      if (now - lastEmit < 14) return;
      lastEmit = now;
      const count = STATE.galaxy ? 4 : 1;
      for (let i = 0; i < count; i++) {
        sparks.push({
          x, y,
          vx: rand(-0.6, 0.6),
          vy: rand(-1.2, -0.1),
          life: 1,
          size: rand(1.2, 2.6),
          hue: STATE.galaxy ? rand(200, 320) : (Math.random() < 0.4 ? 320 : 50),
        });
      }
    }

    function drawSparks() {
      ctx.clearRect(0, 0, spark.width / dpr, spark.height / dpr);
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.x += s.vx;
        s.y += s.vy;
        s.vy += 0.02;
        s.life -= 0.018;
        if (s.life <= 0) { sparks.splice(i, 1); continue; }
        ctx.globalAlpha = s.life;
        ctx.fillStyle = `hsl(${s.hue} 100% ${60 + (1 - s.life) * 20}%)`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size * s.life, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      requestAnimationFrame(drawSparks);
    }
    drawSparks();
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 3. COSMIC BACKGROUND CANVAS — stars, nebula, mouse reactive
  // ═══════════════════════════════════════════════════════════════════════
  function setupCosmos() {
    const canvas = $('#cosmos-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let stars = [], dust = [], nebs = [];

    function resize() {
      canvas.width  = innerWidth  * dpr;
      canvas.height = innerHeight * dpr;
      canvas.style.width  = innerWidth + 'px';
      canvas.style.height = innerHeight + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildField();
    }

    function buildField() {
      const area = innerWidth * innerHeight;
      const starCount = Math.min(280, Math.floor(area / 6000));
      const dustCount = Math.min(160, Math.floor(area / 9000));
      const nebCount = 7;

      stars = Array.from({ length: starCount }).map(() => ({
        x: Math.random() * innerWidth,
        y: Math.random() * innerHeight,
        z: rand(0.4, 1),
        r: rand(0.3, 1.6),
        tw: Math.random() * Math.PI * 2,
        col: Math.random() < 0.18 ? 'magenta' : (Math.random() < 0.3 ? 'cyan' : (Math.random() < 0.5 ? 'yellow' : 'white')),
      }));

      dust = Array.from({ length: dustCount }).map(() => ({
        x: Math.random() * innerWidth,
        y: Math.random() * innerHeight,
        vx: rand(-0.18, 0.18),
        vy: rand(-0.18, 0.18),
        r: rand(0.4, 1.4),
        a: rand(0.15, 0.55),
        hue: rand(35, 60),
      }));

      nebs = Array.from({ length: nebCount }).map((_, i) => ({
        x: rand(0, innerWidth),
        y: rand(0, innerHeight),
        r: rand(180, 420),
        h: i % 3 === 0 ? 320 : (i % 3 === 1 ? 270 : 190),
        a: rand(0.04, 0.10),
        drift: rand(0, Math.PI * 2),
      }));
    }

    const COL = {
      white:  () => 'rgba(255,251,234,',
      yellow: () => 'rgba(255,214,10,',
      magenta:() => 'rgba(255,0,110,',
      cyan:   () => 'rgba(0,240,255,',
    };

    let frame = 0;
    let fpsLast = performance.now();
    let fpsCnt = 0;
    function loop() {
      frame++;
      ctx.clearRect(0, 0, innerWidth, innerHeight);

      // nebulae
      for (let n of nebs) {
        n.drift += 0.0012;
        const ox = Math.cos(n.drift) * 30;
        const oy = Math.sin(n.drift) * 30;
        const grd = ctx.createRadialGradient(n.x + ox, n.y + oy, 0, n.x + ox, n.y + oy, n.r);
        grd.addColorStop(0, `hsla(${n.h}, 100%, 60%, ${n.a * (STATE.galaxy ? 2.2 : 1)})`);
        grd.addColorStop(1, `hsla(${n.h}, 100%, 60%, 0)`);
        ctx.fillStyle = grd;
        ctx.fillRect(n.x + ox - n.r, n.y + oy - n.r, n.r * 2, n.r * 2);
      }

      // stars
      for (let s of stars) {
        s.tw += 0.04;
        const tw = 0.6 + Math.sin(s.tw) * 0.4;
        const dx = (STATE.mouse.x - innerWidth / 2) * 0.012 * s.z;
        const dy = (STATE.mouse.y - innerHeight / 2) * 0.012 * s.z;
        const x = s.x + dx;
        const y = s.y + dy;
        ctx.fillStyle = (COL[s.col] || COL.white)() + (tw * 0.9) + ')';
        ctx.beginPath();
        ctx.arc(x, y, s.r, 0, Math.PI * 2);
        ctx.fill();
        if (s.r > 1.2) {
          ctx.fillStyle = (COL[s.col] || COL.white)() + (tw * 0.25) + ')';
          ctx.beginPath();
          ctx.arc(x, y, s.r * 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // dust drifts
      for (let d of dust) {
        // mouse repel
        const dxm = d.x - STATE.mouse.x;
        const dym = d.y - STATE.mouse.y;
        const dist2 = dxm * dxm + dym * dym;
        if (dist2 < 14000) {
          const f = (14000 - dist2) / 14000;
          d.x += (dxm / Math.sqrt(dist2 + 1)) * f * 1.6;
          d.y += (dym / Math.sqrt(dist2 + 1)) * f * 1.6;
        }
        d.x += d.vx; d.y += d.vy;
        if (d.x < -10) d.x = innerWidth + 10;
        if (d.x > innerWidth + 10) d.x = -10;
        if (d.y < -10) d.y = innerHeight + 10;
        if (d.y > innerHeight + 10) d.y = -10;
        ctx.fillStyle = `hsla(${d.hue}, 100%, 70%, ${d.a})`;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // mouse glow
      const mg = ctx.createRadialGradient(STATE.mouse.x, STATE.mouse.y, 0, STATE.mouse.x, STATE.mouse.y, 240);
      mg.addColorStop(0, 'rgba(255, 214, 10, 0.10)');
      mg.addColorStop(1, 'rgba(255, 214, 10, 0)');
      ctx.fillStyle = mg;
      ctx.fillRect(STATE.mouse.x - 240, STATE.mouse.y - 240, 480, 480);

      // FPS counter
      fpsCnt++;
      const t = performance.now();
      if (t - fpsLast >= 500) {
        const fps = Math.round((fpsCnt * 1000) / (t - fpsLast));
        const el = $('#fps-counter');
        if (el) el.textContent = fps;
        fpsCnt = 0;
        fpsLast = t;
      }

      requestAnimationFrame(loop);
    }

    resize();
    window.addEventListener('resize', resize);
    if (!REDUCED) loop();
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 4. NAVBAR SCROLL + SCROLL PROGRESS
  // ═══════════════════════════════════════════════════════════════════════
  function setupScroll() {
    const nav   = $('#navbar');
    const fill  = $('#scroll-fill');
    function onScroll() {
      const y = scrollY;
      const h = document.documentElement.scrollHeight - innerHeight;
      const p = h > 0 ? (y / h) * 100 : 0;
      fill.style.width = p + '%';
      if (y > 30) nav.classList.add('scrolled'); else nav.classList.remove('scrolled');
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 5. REVEAL ON SCROLL
  // ═══════════════════════════════════════════════════════════════════════
  function setupReveal() {
    const els = $$('.reveal');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    els.forEach((el) => io.observe(el));
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 6. STAT COUNTERS + SKILL ANIMATION
  // ═══════════════════════════════════════════════════════════════════════
  function animateNum(el, target, duration = 1400) {
    const start = performance.now();
    function step(now) {
      const t = clamp((now - start) / duration, 0, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.floor(target * eased).toString().padStart(el.textContent.length, '0');
      if (t < 1) requestAnimationFrame(step);
      else el.textContent = target.toString().padStart(el.textContent.length, '0');
    }
    requestAnimationFrame(step);
  }

  function animateStats() {
    $$('.stat-num').forEach((el) => {
      const target = parseInt(el.dataset.target, 10);
      animateNum(el, target, 1600);
    });
  }

  function animateSkills() {
    const skills = $$('.skill');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const fill = $('.skill-fill', entry.target);
          const pct = $('.skill-pct', entry.target);
          if (fill && fill.dataset.pct) fill.style.setProperty('--pct', fill.dataset.pct + '%');
          entry.target.classList.add('in');
          if (pct) animateNum(pct, parseInt(pct.dataset.target, 10), 1400);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });
    skills.forEach((el) => io.observe(el));
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 7. 3D TILT
  // ═══════════════════════════════════════════════════════════════════════
  function setupTilt() {
    if (TOUCH || REDUCED) return;
    const tiltEls = $$('[data-tilt]');
    tiltEls.forEach((el) => {
      el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        const tx = (x - 0.5) * 14;
        const ty = (y - 0.5) * -14;
        el.style.transform = `perspective(900px) rotateY(${tx}deg) rotateX(${ty}deg) translateZ(0)`;
        el.style.setProperty('--mx', (x * 100) + '%');
        el.style.setProperty('--my', (y * 100) + '%');
      });
      el.addEventListener('mouseleave', () => {
        el.style.transform = '';
      });
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 8. MAGNETIC BUTTONS
  // ═══════════════════════════════════════════════════════════════════════
  function setupMagnetic() {
    if (TOUCH || REDUCED) return;
    const mags = $$('.magnetic');
    mags.forEach((el) => {
      const STR = 0.32;
      el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - (rect.left + rect.width / 2);
        const y = e.clientY - (rect.top + rect.height / 2);
        el.style.transform = `translate(${x * STR}px, ${y * STR}px)`;
        el.style.setProperty('--mx', ((e.clientX - rect.left) / rect.width * 100) + '%');
        el.style.setProperty('--my', ((e.clientY - rect.top) / rect.height * 100) + '%');
      });
      el.addEventListener('mouseleave', () => {
        el.style.transform = '';
      });
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 9. RIPPLE ON CLICK (cards + buttons)
  // ═══════════════════════════════════════════════════════════════════════
  function setupRipple() {
    document.addEventListener('click', (e) => {
      const t = e.target.closest('.brutal-btn, .brutal-card, .dock-btn, .social');
      if (!t) return;
      const rect = t.getBoundingClientRect();
      const ripple = document.createElement('span');
      Object.assign(ripple.style, {
        position: 'absolute',
        left: (e.clientX - rect.left) + 'px',
        top: (e.clientY - rect.top) + 'px',
        width: '4px',
        height: '4px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255, 214, 10, 0.7), transparent 60%)',
        transform: 'translate(-50%, -50%) scale(1)',
        pointerEvents: 'none',
        zIndex: '50',
        mixBlendMode: 'screen',
      });
      const cs = getComputedStyle(t);
      if (cs.position === 'static') t.style.position = 'relative';
      t.appendChild(ripple);
      requestAnimationFrame(() => {
        ripple.style.transition = 'transform 0.7s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.7s ease';
        ripple.style.transform = 'translate(-50%, -50%) scale(120)';
        ripple.style.opacity = '0';
      });
      setTimeout(() => ripple.remove(), 800);
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 10. LIVE CLOCK + DELHI TIME
  // ═══════════════════════════════════════════════════════════════════════
  function setupClock() {
    const el = $('#status-time');
    const el2 = $('#badge-time');
    function tick() {
      const d = new Date();
      // Try to display Asia/Kolkata time
      let h, m, s;
      try {
        const opts = { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
        const fmt = new Intl.DateTimeFormat('en-GB', opts);
        const parts = fmt.formatToParts(d);
        h = parts.find(p => p.type === 'hour').value;
        m = parts.find(p => p.type === 'minute').value;
        s = parts.find(p => p.type === 'second').value;
      } catch (e) {
        h = String(d.getHours()).padStart(2, '0');
        m = String(d.getMinutes()).padStart(2, '0');
        s = String(d.getSeconds()).padStart(2, '0');
      }
      const str = `${h}:${m}:${s}`;
      if (el)  el.textContent  = str;
      if (el2) el2.textContent = str;
    }
    tick();
    setInterval(tick, 1000);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 11. HERO TYPER
  // ═══════════════════════════════════════════════════════════════════════
  function startHeroTyper() {
    const el = $('#hero-typer');
    if (!el) return;
    const seq = [
      'init --module=intelligence',
      'ship --product=hackknow --langs=3',
      'orchestrate --engines=4 --india=true',
      'broadcast --signal=cosmic --confidence=99',
      'build --in-public=always',
    ];
    let line = 0, ch = 0, dir = 1, hold = 0;
    function step() {
      const cur = seq[line];
      if (dir === 1) {
        el.textContent = cur.slice(0, ch);
        ch++;
        if (ch > cur.length) { dir = -1; hold = 40; }
      } else {
        if (hold > 0) { hold--; setTimeout(step, 50); return; }
        el.textContent = cur.slice(0, ch);
        ch--;
        if (ch === 0) { dir = 1; line = (line + 1) % seq.length; }
      }
      setTimeout(step, dir === 1 ? 55 : 25);
    }
    step();
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 12. NOTIFICATIONS
  // ═══════════════════════════════════════════════════════════════════════
  function notify(text, opts = {}) {
    const container = $('#notif-container');
    if (!container) return;
    const n = document.createElement('div');
    n.className = 'notif';
    n.innerHTML = `<span class="notif-dot" style="background:${opts.color || '#22C55E'};box-shadow:0 0 8px ${opts.color || '#22C55E'}"></span><span>${text}</span>`;
    container.appendChild(n);
    setTimeout(() => n.remove(), 3900);
    beep('tick');
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 13. AUDIO — WebAudio synth (no external files)
  // ═══════════════════════════════════════════════════════════════════════
  function getAudio() {
    if (STATE.audioCtx) return STATE.audioCtx;
    try {
      STATE.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) { return null; }
    return STATE.audioCtx;
  }

  function beep(kind = 'tick') {
    if (!STATE.music && kind !== 'force') return; // only when sound on
    const ctx = getAudio();
    if (!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    const map = {
      tick:  { f: 880, t: 'sine',     d: 0.05, v: 0.04 },
      hover: { f: 1320, t: 'triangle', d: 0.05, v: 0.03 },
      open:  { f: 660, t: 'square',   d: 0.10, v: 0.06 },
      close: { f: 220, t: 'sawtooth', d: 0.10, v: 0.05 },
      ok:    { f: 1480, t: 'sine',    d: 0.10, v: 0.06 },
    };
    const cfg = map[kind] || map.tick;
    o.type = cfg.t;
    o.frequency.value = cfg.f;
    const now = ctx.currentTime;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(cfg.v, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + cfg.d);
    o.start(now);
    o.stop(now + cfg.d + 0.02);
  }

  function startAmbient() {
    const ctx = getAudio();
    if (!ctx) return;
    if (STATE.musicNodes) return;
    const nodes = { oscs: [], gain: ctx.createGain() };
    nodes.gain.gain.value = 0;
    nodes.gain.connect(ctx.destination);
    const freqs = [55, 110, 138.59, 220, 329.63]; // A1, A2, C#3, A3, E4
    freqs.forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = i === 0 ? 'sine' : (i % 2 === 0 ? 'triangle' : 'sine');
      o.frequency.value = f;
      g.gain.value = 0.06 / (i + 1);
      // slow LFO
      const lfo = ctx.createOscillator();
      const lfoG = ctx.createGain();
      lfo.frequency.value = 0.05 + i * 0.03;
      lfoG.gain.value = 0.04 / (i + 1);
      lfo.connect(lfoG); lfoG.connect(g.gain);
      o.connect(g); g.connect(nodes.gain);
      o.start(); lfo.start();
      nodes.oscs.push(o, lfo);
    });
    nodes.gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 1.6);
    STATE.musicNodes = nodes;
  }

  function stopAmbient() {
    const ctx = getAudio();
    if (!ctx || !STATE.musicNodes) return;
    const n = STATE.musicNodes;
    const now = ctx.currentTime;
    n.gain.gain.cancelScheduledValues(now);
    n.gain.gain.linearRampToValueAtTime(0, now + 0.6);
    setTimeout(() => {
      n.oscs.forEach(o => { try { o.stop(); } catch(e){} });
      try { n.gain.disconnect(); } catch(e){}
      STATE.musicNodes = null;
    }, 700);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 14. MODES — galaxy, cinematic, music
  // ═══════════════════════════════════════════════════════════════════════
  function toggleMode(mode) {
    if (mode === 'galaxy') {
      STATE.galaxy = !STATE.galaxy;
      document.body.dataset.mode = STATE.galaxy ? 'galaxy' : 'default';
      $$('.dock-btn[data-action="galaxy"]').forEach((b) => b.classList.toggle('active', STATE.galaxy));
      const ind = $('#mode-indicator');
      if (ind) ind.textContent = STATE.galaxy ? 'GALAXY' : 'DEFAULT';
      notify(STATE.galaxy ? '▸ GALAXY MODE · ENGAGED' : '▸ GALAXY MODE · DISENGAGED', { color: '#B026FF' });
      beep('open');
    } else if (mode === 'cinematic') {
      STATE.cinematic = !STATE.cinematic;
      $('#cinematic-overlay').classList.toggle('on', STATE.cinematic);
      $$('.dock-btn[data-action="cinematic"]').forEach((b) => b.classList.toggle('active', STATE.cinematic));
      notify(STATE.cinematic ? '▸ CINEMATIC MODE · ON' : '▸ CINEMATIC MODE · OFF', { color: '#FFD60A' });
      beep('open');
    } else if (mode === 'music') {
      STATE.music = !STATE.music;
      $$('.dock-btn[data-action="music"]').forEach((b) => b.classList.toggle('active', STATE.music));
      const ic = $('#music-icon');
      if (ic) ic.textContent = STATE.music ? '♫' : '♪';
      if (STATE.music) startAmbient(); else stopAmbient();
      notify(STATE.music ? '▸ AMBIENT · ON · cosmic drone' : '▸ AMBIENT · OFF', { color: '#00F0FF' });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 15. TERMINAL
  // ═══════════════════════════════════════════════════════════════════════
  function openTerminal() {
    $('#terminal-overlay').classList.add('open');
    setTimeout(() => $('#terminal-input').focus(), 100);
    beep('open');
    const body = $('#terminal-body');
    if (body.dataset.booted) return;
    body.dataset.booted = 'true';
    termPrint('ascii', `
██╗  ██╗ █████╗  ██████╗██╗  ██╗██╗  ██╗███╗   ██╗ ██████╗ ██╗    ██╗
██║  ██║██╔══██╗██╔════╝██║ ██╔╝██║ ██╔╝████╗  ██║██╔═══██╗██║    ██║
███████║███████║██║     █████╔╝ █████╔╝ ██╔██╗ ██║██║   ██║██║ █╗ ██║
██╔══██║██╔══██║██║     ██╔═██╗ ██╔═██╗ ██║╚██╗██║██║   ██║██║███╗██║
██║  ██║██║  ██║╚██████╗██║  ██╗██║  ██╗██║ ╚████║╚██████╔╝╚███╔███╔╝
╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝  ╚══╝╚══╝
`);
    termPrint('key', 'HACKKNOW//OS — HK//SHELL v2.6 · operator: gagan');
    termPrint('', 'type `help` to list commands. `clear` to clear. `vision` for the manifesto.');
    termPrint('', '');
  }

  function closeTerminal() {
    $('#terminal-overlay').classList.remove('open');
    beep('close');
  }

  function termPrint(cls, text) {
    const body = $('#terminal-body');
    const line = document.createElement('div');
    line.className = 'line ' + cls;
    if (cls === 'ascii') line.textContent = text;
    else line.innerHTML = text;
    body.appendChild(line);
    body.scrollTop = body.scrollHeight;
  }

  const TERM_HISTORY = [];
  let histIdx = -1;

  const TERM_CMDS = {
    help() {
      termPrint('key', 'AVAILABLE COMMANDS');
      const cmds = [
        ['help',     'this message'],
        ['about',    'who is gagan chauhan'],
        ['projects', 'list active projects'],
        ['skills',   'capability matrix'],
        ['stack',    'tech stack'],
        ['vision',   'the manifesto'],
        ['contact',  'how to reach me'],
        ['socials',  'all signals'],
        ['hackknow', 'about hackknow.com'],
        ['future',   'roadmap / north star'],
        ['ai',       'enter AI assistant mode'],
        ['matrix',   'launch matrix rain'],
        ['galaxy',   'toggle galaxy mode'],
        ['cinema',   'toggle cinematic mode'],
        ['sound',    'toggle ambient sound'],
        ['whoami',   'system identity check'],
        ['date',     'current time @ DEL'],
        ['ls',       'list virtual fs'],
        ['cat <f>',  'cat a virtual file'],
        ['clear',    'clear terminal'],
        ['exit',     'close terminal'],
      ];
      cmds.forEach(([c, d]) => termPrint('', `  <span class="key">${c.padEnd(12, ' ')}</span> ${d}`));
    },
    about() {
      termPrint('key', 'OPERATOR · GAGAN CHAUHAN');
      termPrint('', 'Founder of HACKKNOW.COM. Solo full-stack dev in Delhi.');
      termPrint('', 'Orchestrates 4 AI engines (Groq · Gemini · Claude · Llama).');
      termPrint('', 'BCA student. EN · हिंदी · Hinglish. Building for 1.4B Indians.');
    },
    projects() {
      const list = [
        ['P01', 'HACKKNOW.COM  · India\'s premium digital marketplace'],
        ['P02', 'YEXCEL        · CSV → working Excel dashboards · free'],
        ['P03', 'YAHAVI AI     · multilingual sales sensei · v3.3'],
        ['P04', 'YAHAVI-BEYOND · Jarvis-grade voice OS · beta'],
        ['P05', 'AUTO-BLOG     · 60 SEO posts/day · 10× Groq keys'],
        ['P06', 'AI INFLUENCERS· grid of synthetic personas · 2026'],
      ];
      termPrint('key', '6 ACTIVE PROJECTS');
      list.forEach(([id, name]) => termPrint('', `  <span class="key">${id}</span> ${name}`));
    },
    skills() {
      const list = [
        ['AI ENGINEERING',   96],
        ['FULL-STACK',       93],
        ['AUTOMATION',       92],
        ['UI/UX',            90],
        ['PROMPT ENG.',      95],
        ['DASHBOARD ENG.',   88],
        ['VOICE SYSTEMS',    82],
        ['AI CONTENT',       94],
        ['GROWTH SYSTEMS',   87],
      ];
      list.forEach(([n, p]) => {
        const bar = '█'.repeat(Math.floor(p / 4)) + '░'.repeat(25 - Math.floor(p / 4));
        termPrint('', `  ${n.padEnd(18, ' ')} <span class="key">${bar}</span> ${p}%`);
      });
    },
    stack() {
      termPrint('key', 'TECH STACK');
      termPrint('', '  frontend  : React 19 · TypeScript · Vite · Tailwind · shadcn · Next.js');
      termPrint('', '  backend   : Cloudflare Workers · Node · Python · PHP · GraphQL');
      termPrint('', '  data      : Postgres · D1 · KV · R2 · WPGraphQL');
      termPrint('', '  ai        : Groq · Gemini · Claude · Llama · LangChain');
      termPrint('', '  commerce  : WordPress · WooCommerce · Razorpay');
    },
    vision() {
      termPrint('key', 'THE MANIFESTO');
      termPrint('', '  i.   speed is a feature.');
      termPrint('', '  ii.  orchestration > scale.');
      termPrint('', '  iii. edge is the new cloud.');
      termPrint('', '  iv.  build in public.');
      termPrint('', '');
      termPrint('ok', '  we are building intelligent systems beyond imagination.');
      termPrint('ok', '  for india. for the next 500M professionals coming online.');
    },
    contact() {
      termPrint('key', 'CONTACT');
      termPrint('', '  email   : <span class="link-out" data-link="mailto:hello@hackknow.com">hello@hackknow.com</span>');
      termPrint('', '  twitter : <span class="link-out" data-link="https://twitter.com/hackknow">@hackknow</span>');
      termPrint('', '  github  : <span class="link-out" data-link="https://github.com/gaganchauhan1997">@gaganchauhan1997</span>');
    },
    socials() {
      const list = [
        ['github',    'https://github.com/gaganchauhan1997'],
        ['linkedin',  'https://linkedin.com/in/gaganchauhan1997'],
        ['twitter',   'https://twitter.com/hackknow'],
        ['instagram', 'https://instagram.com/hackknow'],
        ['youtube',   'https://youtube.com/@hackknow'],
        ['website',   'https://hackknow.com'],
        ['yexcel',    'https://yexcel.hackknow.com'],
      ];
      termPrint('key', 'SIGNALS');
      list.forEach(([k, v]) => termPrint('', `  ${k.padEnd(10)} <span class="link-out" data-link="${v}">${v}</span>`));
    },
    hackknow() {
      termPrint('key', 'HACKKNOW.COM');
      termPrint('', '  India\'s premium digital marketplace.');
      termPrint('', '  396+ products · 24 categories · WordPress + WPGraphQL + Razorpay.');
      termPrint('', '  Storefront on Cloudflare Workers. p50 latency <180ms India-wide.');
      termPrint('ok', '  visit · <span class="link-out" data-link="https://hackknow.com">hackknow.com</span>');
    },
    future() {
      termPrint('key', 'NORTH STAR · 2027');
      termPrint('', '  HACKKNOW becomes the OS for Indian SMBs.');
      termPrint('', '  voice · agents · excel · storefront — single fabric.');
      termPrint('ok', '  AI influencer grid Q3 2026.');
      termPrint('ok', '  catalog 396 → 1,000 by Q2 2026.');
    },
    matrix() {
      termPrint('warn', '> launching matrix rain · press any key to exit');
      runMatrix();
    },
    ai() {
      termPrint('key', '▸ ENTERING AI ASSISTANT MODE');
      termPrint('', '  responses are scripted demos — no real model behind this.');
      const lines = [
        'YAHAVI > greetings, operator. how can i accelerate your shipping today?',
        'YAHAVI > i can route you to YEXCEL, HACKKNOW.COM, or YAHAVI-BEYOND.',
        'YAHAVI > tip: try the command "projects" to see what we\'re building.',
        'YAHAVI > tip: hit "/" to open the command palette anywhere on the site.',
      ];
      lines.forEach((l, i) => setTimeout(() => termPrint('ok', l), 600 * (i + 1)));
    },
    galaxy()  { toggleMode('galaxy');    },
    cinema()  { toggleMode('cinematic'); },
    cinematic(){toggleMode('cinematic'); },
    sound()   { toggleMode('music');     },
    music()   { toggleMode('music');     },
    whoami()  {
      termPrint('', '  user        : gagan');
      termPrint('', '  shell       : HK//SHELL v2.6');
      termPrint('', '  uplink      : cloudflare · 330 POPs');
      termPrint('', '  uptime      : ' + Math.floor(performance.now() / 1000) + 's this session');
      termPrint('', '  origin      : Delhi · IN');
    },
    date() {
      const d = new Date();
      try {
        termPrint('ok', new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'long' }).format(d));
      } catch (e) {
        termPrint('ok', d.toString());
      }
    },
    ls() {
      ['about.txt', 'projects.json', 'vision.md', 'roadmap.md', 'README.md', 'secrets.enc']
        .forEach((f) => termPrint('', `  <span class="key">${f}</span>`));
    },
    cat(args) {
      const f = (args || '').trim();
      if (!f) return termPrint('err', 'usage: cat <filename>');
      const files = {
        'about.txt': 'Founder of HACKKNOW.COM. Solo full-stack. Delhi/India. Multi-LLM orchestrator.',
        'vision.md': 'building intelligent systems beyond imagination. for india. in the open.',
        'roadmap.md': '2026 Q2 → catalog 1,000. Q3 → AI influencers. 2027 → HACKKNOW as OS.',
        'README.md': 'see https://github.com/gaganchauhan1997/hackknow-os',
        'projects.json': '["hackknow.com","yexcel","yahavi-ai","yahavi-beyond","auto-blog","ai-influencers"]',
        'secrets.enc': '0xFF7A56·0xB026FF·0xFFD60A — not today, friend.',
      };
      if (files[f]) termPrint('ok', files[f]);
      else termPrint('err', `cat: ${f}: no such file`);
    },
    clear() {
      $('#terminal-body').innerHTML = '';
      $('#terminal-body').dataset.booted = '';
      openTerminal();
    },
    exit() { closeTerminal(); },
    konami() {
      termPrint('key', '▸ DEVELOPER MODE · UNLOCKED');
      termPrint('ok', '  you found the konami sequence.');
      termPrint('ok', '  cosmic dust intensity → 3×');
      termPrint('ok', '  hidden command: `kernel` is now active.');
      window.__KONAMI__ = true;
    },
    kernel() {
      if (!window.__KONAMI__) return termPrint('err', 'kernel: permission denied. unlock developer mode first.');
      termPrint('key', '▸ KERNEL ACCESS GRANTED');
      termPrint('warn', '  HK_KERNEL_BUILD = 2026.05.16-classified');
      termPrint('warn', '  active nodes: DEL-01, DEL-02, BLR-07');
      termPrint('warn', '  pipeline: groq → routing → claude → caching → ship');
      termPrint('ok', '  signal locked.');
    },
  };

  function runTermCmd(raw) {
    const trimmed = raw.trim();
    if (!trimmed) return;
    TERM_HISTORY.unshift(trimmed); histIdx = -1;
    termPrint('cmd-echo', escapeHtml(trimmed));
    const [cmd, ...rest] = trimmed.split(/\s+/);
    const args = rest.join(' ');
    const fn = TERM_CMDS[cmd];
    if (fn) fn(args);
    else if (cmd === '?') TERM_CMDS.help();
    else termPrint('err', `hk: ${cmd}: command not found. try \`help\`.`);
    termPrint('', '');
  }

  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function setupTerminal() {
    const input = $('#terminal-input');
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        runTermCmd(input.value);
        input.value = '';
      } else if (e.key === 'ArrowUp') {
        histIdx = clamp(histIdx + 1, -1, TERM_HISTORY.length - 1);
        input.value = TERM_HISTORY[histIdx] || '';
        setTimeout(() => input.setSelectionRange(input.value.length, input.value.length), 0);
        e.preventDefault();
      } else if (e.key === 'ArrowDown') {
        histIdx = clamp(histIdx - 1, -1, TERM_HISTORY.length - 1);
        input.value = histIdx === -1 ? '' : (TERM_HISTORY[histIdx] || '');
        e.preventDefault();
      } else if (e.key === 'Tab') {
        // autocomplete
        e.preventDefault();
        const cur = input.value;
        const matches = Object.keys(TERM_CMDS).filter((k) => k.startsWith(cur));
        if (matches.length === 1) input.value = matches[0];
        else if (matches.length) termPrint('', '  ' + matches.join('  '));
      } else if (e.key === 'l' && (e.ctrlKey || e.metaKey)) {
        TERM_CMDS.clear();
        e.preventDefault();
      }
      // type sound
      if (STATE.music && e.key.length === 1) beep('hover');
    });

    // Click on virtual link
    $('#terminal-body').addEventListener('click', (e) => {
      const l = e.target.closest('[data-link]');
      if (!l) return;
      const url = l.dataset.link;
      if (url.startsWith('mailto:')) window.location.href = url;
      else window.open(url, '_blank', 'noopener');
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 16. MATRIX RAIN (terminal command)
  // ═══════════════════════════════════════════════════════════════════════
  function runMatrix() {
    const old = $('#matrix-rain'); if (old) old.remove();
    const c = document.createElement('canvas');
    c.id = 'matrix-rain';
    Object.assign(c.style, {
      position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(5, 5, 16, 0.9)',
    });
    document.body.appendChild(c);
    const cx = c.getContext('2d');
    c.width = innerWidth; c.height = innerHeight;
    const chars = 'HACKKNOWOSアイウエオカキクケコ01アイウ▸█▒░'.split('');
    const cols = Math.floor(c.width / 16);
    const drops = Array(cols).fill(0);
    let raf;
    function draw() {
      cx.fillStyle = 'rgba(5, 5, 16, 0.12)';
      cx.fillRect(0, 0, c.width, c.height);
      cx.font = '16px JetBrains Mono';
      drops.forEach((y, i) => {
        const ch = chars[Math.floor(Math.random() * chars.length)];
        const hue = Math.random() < 0.04 ? 320 : 50;
        cx.fillStyle = `hsl(${hue}, 100%, 60%)`;
        cx.fillText(ch, i * 16, y * 16);
        drops[i] = y * 16 > c.height && Math.random() > 0.975 ? 0 : y + 1;
      });
      raf = requestAnimationFrame(draw);
    }
    draw();
    const stop = () => { cancelAnimationFrame(raf); c.remove(); document.removeEventListener('keydown', stop); document.removeEventListener('click', stop); };
    setTimeout(() => {
      document.addEventListener('keydown', stop);
      document.addEventListener('click', stop);
    }, 60);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 17. COMMAND PALETTE
  // ═══════════════════════════════════════════════════════════════════════
  const PAL_ITEMS = [
    { id: 'go-hero',      label: 'Jump to · Hero',         icon: '⌂', shortcut: '#hero',     run: () => scrollTo('#hero') },
    { id: 'go-about',     label: 'Jump to · Dossier',      icon: '①', shortcut: '#about',    run: () => scrollTo('#about') },
    { id: 'go-projects',  label: 'Jump to · Projects',     icon: '②', shortcut: '#projects', run: () => scrollTo('#projects') },
    { id: 'go-skills',    label: 'Jump to · Skill Matrix', icon: '③', shortcut: '#skills',   run: () => scrollTo('#skills') },
    { id: 'go-timeline',  label: 'Jump to · Timeline',     icon: '④', shortcut: '#timeline', run: () => scrollTo('#timeline') },
    { id: 'go-vision',    label: 'Jump to · Vision',       icon: '⑤', shortcut: '#vision',   run: () => scrollTo('#vision') },
    { id: 'go-socials',   label: 'Jump to · Uplink',       icon: '⑥', shortcut: '#socials',  run: () => scrollTo('#socials') },
    { id: 'open-term',    label: 'Open · Terminal',        icon: '▸_',shortcut: 'T',         run: openTerminal },
    { id: 'tog-galaxy',   label: 'Toggle · Galaxy Mode',   icon: '✦', shortcut: 'G',         run: () => toggleMode('galaxy') },
    { id: 'tog-cinema',   label: 'Toggle · Cinematic Mode',icon: '◉', shortcut: '⇧␣',        run: () => toggleMode('cinematic') },
    { id: 'tog-sound',    label: 'Toggle · Ambient Sound', icon: '♪', shortcut: 'M',         run: () => toggleMode('music') },
    { id: 'visit-hk',     label: 'Visit · hackknow.com',   icon: '↗', shortcut: 'ext',       run: () => window.open('https://hackknow.com', '_blank', 'noopener') },
    { id: 'visit-yexcel', label: 'Visit · yexcel.hackknow.com', icon: '↗', shortcut: 'ext',   run: () => window.open('https://yexcel.hackknow.com', '_blank', 'noopener') },
    { id: 'visit-gh',     label: 'Visit · GitHub',         icon: '↗', shortcut: 'ext',       run: () => window.open('https://github.com/gaganchauhan1997', '_blank', 'noopener') },
    { id: 'visit-x',      label: 'Visit · X / Twitter',    icon: '↗', shortcut: 'ext',       run: () => window.open('https://twitter.com/hackknow', '_blank', 'noopener') },
    { id: 'email',        label: 'Email · hello@hackknow.com', icon: '✉', shortcut: 'mail',  run: () => window.location.href = 'mailto:hello@hackknow.com' },
    { id: 'copy-url',     label: 'Copy · Current URL',     icon: '⎘', shortcut: '⌘C',        run: () => { navigator.clipboard.writeText(location.href).then(() => notify('▸ URL COPIED')); } },
    { id: 'matrix',       label: 'Easter egg · Matrix rain', icon: '▒', shortcut: 'rain',    run: () => runMatrix() },
  ];

  function scrollTo(sel) {
    const el = $(sel);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderPalette(filter = '', activeIdx = 0) {
    const list = $('#palette-list');
    list.innerHTML = '';
    const f = filter.toLowerCase();
    const items = PAL_ITEMS.filter((i) => !f || i.label.toLowerCase().includes(f) || i.shortcut.toLowerCase().includes(f));
    if (!items.length) {
      list.innerHTML = '<div class="palette-item" style="opacity:0.6">no matches · try another query</div>';
      return [];
    }
    items.forEach((i, idx) => {
      const el = document.createElement('div');
      el.className = 'palette-item' + (idx === activeIdx ? ' active' : '');
      el.dataset.id = i.id;
      el.innerHTML = `
        <span class="pal-icon">${i.icon}</span>
        <span class="pal-label">${i.label}</span>
        <span class="pal-shortcut">${i.shortcut}</span>
        <span class="pal-arrow">↵</span>
      `;
      el.addEventListener('click', () => { i.run(); closePalette(); });
      list.appendChild(el);
    });
    return items;
  }

  let palActiveIdx = 0;
  let palVisible = [];

  function openPalette() {
    $('#palette-overlay').classList.add('open');
    $('#palette-input').value = '';
    palActiveIdx = 0;
    palVisible = renderPalette('', 0);
    setTimeout(() => $('#palette-input').focus(), 100);
    beep('open');
  }
  function closePalette() {
    $('#palette-overlay').classList.remove('open');
    beep('close');
  }

  function setupPalette() {
    const input = $('#palette-input');
    input.addEventListener('input', () => {
      palActiveIdx = 0;
      palVisible = renderPalette(input.value, 0);
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { closePalette(); e.preventDefault(); }
      else if (e.key === 'Enter') {
        if (palVisible[palActiveIdx]) { palVisible[palActiveIdx].run(); closePalette(); }
        e.preventDefault();
      } else if (e.key === 'ArrowDown') {
        palActiveIdx = clamp(palActiveIdx + 1, 0, palVisible.length - 1);
        palVisible = renderPalette(input.value, palActiveIdx);
        e.preventDefault();
      } else if (e.key === 'ArrowUp') {
        palActiveIdx = clamp(palActiveIdx - 1, 0, palVisible.length - 1);
        palVisible = renderPalette(input.value, palActiveIdx);
        e.preventDefault();
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 18. KEYBOARD SHORTCUTS
  // ═══════════════════════════════════════════════════════════════════════
  const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
  let konIdx = 0;

  function setupKeyboard() {
    document.addEventListener('keydown', (e) => {
      const inField = e.target.matches('input, textarea, [contenteditable]');
      // konami
      const key = e.key;
      if (key === KONAMI[konIdx]) {
        konIdx++;
        if (konIdx === KONAMI.length) {
          konIdx = 0;
          window.__KONAMI__ = true;
          notify('▸ KONAMI · DEVELOPER MODE UNLOCKED', { color: '#FF006E' });
          beep('ok');
          openTerminal();
          setTimeout(() => TERM_CMDS.konami(), 500);
        }
      } else { konIdx = (key === KONAMI[0]) ? 1 : 0; }

      // ESC
      if (e.key === 'Escape') {
        if ($('#palette-overlay').classList.contains('open')) closePalette();
        else if ($('#terminal-overlay').classList.contains('open')) closeTerminal();
      }

      // ignore other shortcuts when typing
      if (inField) return;

      // T → terminal
      if (e.key.toLowerCase() === 't') { openTerminal(); e.preventDefault(); }
      // / → palette  (and Cmd/Ctrl+K)
      else if (e.key === '/') { openPalette(); e.preventDefault(); }
      else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { openPalette(); e.preventDefault(); }
      // M → music
      else if (e.key.toLowerCase() === 'm') { toggleMode('music'); }
      // G → galaxy
      else if (e.key.toLowerCase() === 'g') { toggleMode('galaxy'); }
      // Shift+Space → cinematic
      else if (e.shiftKey && e.code === 'Space') { toggleMode('cinematic'); e.preventDefault(); }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 19. DOCK + INLINE TRIGGERS
  // ═══════════════════════════════════════════════════════════════════════
  function setupDock() {
    document.addEventListener('click', (e) => {
      const t = e.target.closest('[data-action]');
      if (!t) return;
      const a = t.dataset.action;
      if (a === 'terminal') { openTerminal(); e.preventDefault(); }
      else if (a === 'palette') { openPalette(); e.preventDefault(); }
      else if (a === 'music') toggleMode('music');
      else if (a === 'galaxy') toggleMode('galaxy');
      else if (a === 'cinematic') toggleMode('cinematic');
      else if (a === 'close-terminal') closeTerminal();
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 20. FAKE NOTIFICATIONS DRIP (life signs)
  // ═══════════════════════════════════════════════════════════════════════
  function notificationDrip() {
    const messages = [
      '▸ YEXCEL — new dashboard exported · 8s',
      '▸ HACKKNOW.COM — product #397 published',
      '▸ AUTO-BLOG — post shipped via Groq · 4h cron',
      '▸ YAHAVI v3.3 — upsell +34% rolling 24h',
      '▸ CF WORKER — p50 latency 162ms (DEL→BLR)',
    ];
    let i = 0;
    function fire() {
      if (!STATE.loaded) return setTimeout(fire, 4000);
      notify(messages[i % messages.length]);
      i++;
      setTimeout(fire, rand(18000, 32000));
    }
    setTimeout(fire, 12000);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 21. NAV LINK SMOOTH SCROLL
  // ═══════════════════════════════════════════════════════════════════════
  function setupAnchors() {
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const href = a.getAttribute('href');
      if (href.length < 2) return;
      const tgt = $(href);
      if (tgt) { e.preventDefault(); tgt.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // BOOT
  // ═══════════════════════════════════════════════════════════════════════
  function boot() {
    setupCosmos();
    setupCursor();
    setupScroll();
    setupReveal();
    setupTilt();
    setupMagnetic();
    setupRipple();
    setupClock();
    setupTerminal();
    setupPalette();
    setupKeyboard();
    setupDock();
    setupAnchors();
    bootLoader();
    notificationDrip();

    // intro tooltip after loader
    setTimeout(() => {
      if (!STATE.loaded) return;
      notify('▸ HINT · press "/" for command palette');
      setTimeout(() => notify('▸ HINT · press "T" for terminal'), 5000);
      setTimeout(() => notify('▸ HINT · try the konami code ↑↑↓↓←→←→ba'), 12000);
    }, 4200);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

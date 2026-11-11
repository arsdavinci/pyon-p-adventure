// fx.js — 演出レイヤー（画面シェイク / ヒットストップ / パーティクル / 環境エフェクト / トランジション）
// game.js より前に読み込む。game.js のグローバル（canvas, ctx, state など）は呼び出し時に参照する。
(() => {
  "use strict";

  const TAU = Math.PI * 2;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = arr => arr[(Math.random() * arr.length) | 0];
  const lite = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
  const MAX_PARTS = lite ? 280 : 620;
  const PASTEL = ["#fff3a4", "#ffd1ed", "#c9f6ff", "#d7c8ff", "#d9ffd6", "#ffffff"];
  const GOLD = ["#fff3a4", "#ffd85a", "#ffffff", "#ffe9b0"];
  const FONT = '"Segoe UI", "Hiragino Maru Gothic ProN", "Yu Gothic UI", system-ui, sans-serif';

  const S = {
    time: 0,
    trauma: 0, sx: 0, sy: 0,
    hitstop: 0,
    slowT: 0, slowScale: 1,
    flashes: [],
    parts: [],
    floaters: [],
    ambient: [], ambientKey: "", lastCam: 0, shootT: 2, boltT: 7, bolt: null,
    combo: 0, comboT: 0, comboPop: 0,
    squashX: 1, squashY: 1,
    transition: null,
    card: null,
    hurt: 0,
    ghosts: [], ghostT: 0, dustT: 0,
    wasGrounded: true, lastVy: 0
  };

  // ---------- スプライトキャッシュ ----------
  const glowCache = new Map();
  function glowSprite(color) {
    let c = glowCache.get(color);
    if (c) return c;
    c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d");
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.3, "rgba(255,255,255,0.55)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    g.globalCompositeOperation = "source-in";
    g.fillStyle = color;
    g.fillRect(0, 0, 64, 64);
    g.globalCompositeOperation = "source-over";
    const core = g.createRadialGradient(32, 32, 0, 32, 32, 11);
    core.addColorStop(0, "rgba(255,255,255,0.95)");
    core.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = core;
    g.fillRect(0, 0, 64, 64);
    glowCache.set(color, c);
    return c;
  }

  const vignetteCache = new Map();
  function vignetteSprite(rgb, inner = 0.42) {
    const key = rgb + inner;
    let c = vignetteCache.get(key);
    if (c) return c;
    c = document.createElement("canvas");
    c.width = 160;
    c.height = 90;
    const g = c.getContext("2d");
    const grad = g.createRadialGradient(80, 45, 90 * inner, 80, 45, 96);
    grad.addColorStop(0, `rgba(${rgb},0)`);
    grad.addColorStop(1, `rgba(${rgb},1)`);
    g.fillStyle = grad;
    g.fillRect(0, 0, 160, 90);
    vignetteCache.set(key, c);
    return c;
  }

  // ---------- パーティクル ----------
  const ADDITIVE = { glow: true, spark: true, ring: true };

  function add(p) {
    if (S.parts.length >= MAX_PARTS) S.parts.splice(0, 24);
    p.max = p.life;
    p.vx = p.vx || 0;
    p.vy = p.vy || 0;
    p.rot = p.rot || 0;
    p.type = p.type || "glow";
    S.parts.push(p);
    return p;
  }

  function updateParts(dt) {
    const arr = S.parts;
    let n = 0;
    for (let i = 0; i < arr.length; i++) {
      const p = arr[i];
      p.life -= dt;
      if (p.life <= 0) continue;
      if (p.drag) {
        const k = Math.max(0, 1 - p.drag * dt);
        p.vx *= k;
        p.vy *= k;
      }
      if (p.g) p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.grow) p.r = Math.max(0.1, p.r + p.grow * dt);
      if (p.vr) p.rot += p.vr * dt;
      arr[n++] = p;
    }
    arr.length = n;
  }

  function starPath(r, points = 4, inner = 0.42) {
    ctx.beginPath();
    const n = points * 2;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / points;
      const rr = i % 2 === 0 ? r : r * inner;
      if (i === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
      else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
  }

  function drawParts(screen) {
    const arr = S.parts;
    if (!arr.length) return;
    const cam = screen ? 0 : state.camera;
    const minX = cam - 120;
    const maxX = cam + canvas.width + 120;
    ctx.save();
    for (let pass = 0; pass < 2; pass++) {
      ctx.globalCompositeOperation = pass === 0 ? "source-over" : "lighter";
      for (let i = 0; i < arr.length; i++) {
        const p = arr[i];
        if (!!p.screen !== screen) continue;
        if (!!ADDITIVE[p.type] !== (pass === 1)) continue;
        if (p.x < minX || p.x > maxX) continue;
        const k = p.life / p.max;
        const a = (p.a ?? 1);
        switch (p.type) {
          case "glow": {
            ctx.globalAlpha = Math.min(1, k * 1.4) * a;
            const r = p.r;
            ctx.drawImage(glowSprite(p.color), p.x - r, p.y - r, r * 2, r * 2);
            break;
          }
          case "spark": {
            ctx.globalAlpha = Math.min(1, k * 1.6) * a;
            ctx.strokeStyle = p.color;
            ctx.lineWidth = p.r * (0.4 + k * 0.6);
            ctx.lineCap = "round";
            const len = p.len ?? 0.045;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x - p.vx * len, p.y - p.vy * len);
            ctx.stroke();
            break;
          }
          case "ring": {
            ctx.globalAlpha = k * a;
            ctx.strokeStyle = p.color;
            ctx.lineWidth = Math.max(0.5, (p.w ?? 5) * k);
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, TAU);
            ctx.stroke();
            break;
          }
          case "puff": {
            ctx.globalAlpha = k * 0.5 * a;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, TAU);
            ctx.fill();
            break;
          }
          case "dot": {
            ctx.globalAlpha = Math.min(1, k * 2) * a;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, TAU);
            ctx.fill();
            break;
          }
          case "bubble": {
            ctx.globalAlpha = Math.min(1, k * 2) * 0.8 * a;
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, TAU);
            ctx.stroke();
            break;
          }
          case "confetti": {
            ctx.globalAlpha = Math.min(1, k * 3) * a;
            ctx.fillStyle = p.color;
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            ctx.scale(1, Math.cos(S.time * (p.fs ?? 9) + (p.ph ?? 0)));
            ctx.fillRect(-p.r, -p.r * 0.5, p.r * 2, p.r);
            ctx.restore();
            break;
          }
          case "shard": {
            ctx.globalAlpha = Math.min(1, k * 2.4) * a;
            ctx.fillStyle = p.color;
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            ctx.beginPath();
            ctx.moveTo(-p.r, p.r * 0.6);
            ctx.lineTo(0, -p.r);
            ctx.lineTo(p.r, p.r * 0.7);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
            break;
          }
          default: { // star / star5
            ctx.globalAlpha = Math.min(1, k * 1.8) * a;
            ctx.fillStyle = p.color;
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            const s = 0.35 + k * 0.65;
            ctx.scale(s, s);
            starPath(p.r, p.type === "star5" ? 5 : 4, p.type === "star5" ? 0.48 : 0.38);
            ctx.fill();
            ctx.restore();
          }
        }
      }
    }
    ctx.restore();
  }

  function radial(x, y, n, opts) {
    const base = Math.random() * TAU;
    for (let i = 0; i < n; i++) {
      const a = base + (i / n) * TAU + rand(-0.25, 0.25);
      const sp = rand(opts.speed[0], opts.speed[1]);
      add({
        type: opts.type,
        x, y,
        vx: Math.cos(a) * sp + (opts.vx || 0),
        vy: Math.sin(a) * sp + (opts.vy || 0),
        g: opts.g || 0,
        drag: opts.drag || 0,
        life: rand(opts.life[0], opts.life[1]),
        r: rand(opts.r[0], opts.r[1]),
        grow: opts.grow || 0,
        color: pick(opts.colors),
        rot: Math.random() * TAU,
        vr: opts.spin ? rand(-opts.spin, opts.spin) : 0,
        len: opts.len,
        screen: opts.screen,
        ph: Math.random() * TAU,
        fs: rand(6, 13)
      });
    }
  }

  // ---------- フローティングテキスト ----------
  function floater(x, y, text, opts = {}) {
    if (S.floaters.length > 40) S.floaters.shift();
    S.floaters.push({
      x, y, text,
      color: opts.color || "#fff3a4",
      stroke: opts.stroke || "#7f67c8",
      size: opts.size || 20,
      vy: opts.vy ?? -64,
      life: opts.life || 0.9,
      max: opts.life || 0.9,
      screen: !!opts.screen
    });
  }

  function drawFloaters(screen) {
    if (!S.floaters.length) return;
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    for (const f of S.floaters) {
      if (f.screen !== screen) continue;
      const k = f.life / f.max;
      const age = 1 - k;
      const pop = age < 0.18 ? 0.5 + (age / 0.18) * 0.75 : 1.25 - Math.min(0.25, (age - 0.18) * 1.6);
      ctx.globalAlpha = Math.min(1, k * 2.6);
      ctx.font = `900 ${Math.round(f.size * pop)}px ${FONT}`;
      ctx.lineWidth = Math.max(3, f.size * 0.24);
      ctx.strokeStyle = f.stroke;
      ctx.fillStyle = f.color;
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.restore();
  }

  // ---------- 環境エフェクト ----------
  const AMBIENT = {
    moon: { kind: "twinkle", n: 30, colors: PASTEL, vy: [-16, -5], vx: [-8, 8], r: [3, 7], shoot: true },
    mars: { kind: "ember", n: 34, colors: ["#ffcf73", "#ff8a5c", "#ffd1a0", "#ff6f52"], vy: [-85, -28], vx: [-14, 22], r: [5, 12] },
    ice: { kind: "snow", n: 64, colors: ["#ffffff", "#e6fbff", "#c6fff4"], vy: [38, 112], vx: [-34, -8], r: [1.4, 3.6] },
    ocean: { kind: "bubble", n: 30, colors: ["#bff8ff", "#ffffff", "#9ee8ff"], vy: [-72, -26], vx: [-6, 6], r: [3, 9], rays: true },
    factory: { kind: "ember", n: 24, colors: ["#fff3a4", "#ffd85a", "#ffc67a"], vy: [-40, -12], vx: [-30, -8], r: [3, 8] },
    demon: { kind: "ember", n: 40, colors: ["#ff3d7f", "#b26bff", "#ff8db7", "#7d4dff"], vy: [-95, -30], vx: [-20, 20], r: [5, 13], bolt: true },
    space: { kind: "twinkle", n: 38, colors: PASTEL, vy: [-10, -3], vx: [-6, 6], r: [3, 8], shoot: true }
  };
  const WORLD_AMBIENT = ["moon", "mars", "ice", "ocean", "factory", "demon"];

  function ambientKeyNow() {
    const mode = state?.mode;
    if (mode === "worldMap" || mode === "title" || mode === "cutscene" || mode === "credits") return "space";
    return WORLD_AMBIENT[courses[currentCourse]?.worldIndex ?? 0] || "moon";
  }

  function seedAmbient(key) {
    const cfg = AMBIENT[key];
    S.ambient = [];
    S.ambientKey = key;
    const n = lite ? Math.round(cfg.n * 0.6) : cfg.n;
    for (let i = 0; i < n; i++) {
      S.ambient.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: rand(cfg.vx[0], cfg.vx[1]),
        vy: rand(cfg.vy[0], cfg.vy[1]),
        r: rand(cfg.r[0], cfg.r[1]),
        ph: Math.random() * TAU,
        par: rand(0.15, 0.6),
        color: pick(cfg.colors)
      });
    }
  }

  function updateAmbient(dt) {
    const key = ambientKeyNow();
    if (key !== S.ambientKey) seedAmbient(key);
    const cfg = AMBIENT[key];
    const cam = state?.mode === "worldMap" ? 0 : (state?.camera ?? 0);
    let dCam = cam - S.lastCam;
    if (Math.abs(dCam) > 400) dCam = 0;
    S.lastCam = cam;
    const W = canvas.width;
    const H = canvas.height;
    for (const p of S.ambient) {
      p.ph += dt * 2.2;
      p.x += (p.vx + Math.sin(p.ph * 0.7) * 10) * dt - dCam * p.par;
      p.y += p.vy * dt;
      if (p.x < -40) p.x += W + 80;
      else if (p.x > W + 40) p.x -= W + 80;
      if (p.y < -40) p.y += H + 80;
      else if (p.y > H + 40) p.y -= H + 80;
    }
    if (cfg.shoot) {
      S.shootT -= dt;
      if (S.shootT <= 0) {
        S.shootT = rand(2.6, 6.5);
        const x = rand(W * 0.3, W + 60);
        const y = rand(-20, H * 0.3);
        add({ type: "spark", screen: true, x, y, vx: rand(-760, -520), vy: rand(250, 360), r: 3, len: 0.16, life: rand(0.55, 0.85), color: pick(["#ffffff", "#fff3a4", "#c9f6ff"]) });
      }
    }
    if (cfg.bolt) {
      S.boltT -= dt;
      if (S.boltT <= 0) {
        S.boltT = rand(5, 11);
        const pts = [];
        let x = rand(120, W - 120);
        let y = -10;
        while (y < rand(200, 330)) {
          pts.push([x, y]);
          x += rand(-46, 46);
          y += rand(22, 52);
        }
        S.bolt = { pts, life: 0.32, max: 0.32 };
        flash("#d7b8ff", 0.16, 0.3);
      }
      if (S.bolt) {
        S.bolt.life -= dt;
        if (S.bolt.life <= 0) S.bolt = null;
      }
    } else {
      S.bolt = null;
    }
  }

  function drawAmbient() {
    const cfg = AMBIENT[S.ambientKey];
    if (!cfg) return;
    ctx.save();
    if (cfg.rays) {
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < 5; i++) {
        const sway = Math.sin(S.time * 0.35 + i * 1.7) * 60;
        const x = 120 + i * 270 + sway - ((state.camera * 0.12) % 270);
        const grad = ctx.createLinearGradient(0, 0, 0, canvas.height * 0.86);
        grad.addColorStop(0, "rgba(190, 250, 255, 0.16)");
        grad.addColorStop(1, "rgba(190, 250, 255, 0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(x, -10);
        ctx.lineTo(x + 70, -10);
        ctx.lineTo(x - 90, canvas.height * 0.86);
        ctx.lineTo(x - 230, canvas.height * 0.86);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
    }
    if (cfg.kind === "twinkle") {
      for (const p of S.ambient) {
        const tw = 0.5 + Math.sin(p.ph) * 0.5;
        ctx.globalAlpha = 0.18 + tw * 0.62;
        ctx.fillStyle = p.color;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.ph * 0.2);
        starPath(p.r * (0.7 + tw * 0.5), 4, 0.28);
        ctx.fill();
        ctx.restore();
      }
    } else if (cfg.kind === "snow") {
      ctx.fillStyle = "#ffffff";
      for (const p of S.ambient) {
        ctx.globalAlpha = 0.45 + Math.sin(p.ph) * 0.25;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, TAU);
        ctx.fill();
      }
    } else if (cfg.kind === "bubble") {
      ctx.lineWidth = 1.6;
      for (const p of S.ambient) {
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, TAU);
        ctx.stroke();
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(p.x - p.r * 0.35, p.y - p.r * 0.35, p.r * 0.2, 0, TAU);
        ctx.fill();
      }
    } else {
      ctx.globalCompositeOperation = "lighter";
      for (const p of S.ambient) {
        ctx.globalAlpha = 0.3 + (0.5 + Math.sin(p.ph * 2.3) * 0.5) * 0.45;
        ctx.drawImage(glowSprite(p.color), p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
      }
    }
    if (S.bolt) {
      const k = S.bolt.life / S.bolt.max;
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = k;
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#b98cff";
      ctx.lineWidth = 9;
      ctx.beginPath();
      S.bolt.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    ctx.restore();
  }

  // ---------- カメラ演出 ----------
  function shake(amount) {
    S.trauma = Math.min(1, S.trauma + amount);
  }
  function hitStop(sec) {
    S.hitstop = Math.max(S.hitstop, sec);
  }
  function slowMo(sec, scale = 0.35) {
    S.slowT = Math.max(S.slowT, sec);
    S.slowScale = scale;
  }
  function flash(color = "#ffffff", alpha = 0.6, dur = 0.25) {
    S.flashes.push({ color, alpha, life: dur, max: dur });
    if (S.flashes.length > 4) S.flashes.shift();
  }
  function squash(x, y) {
    S.squashX = x;
    S.squashY = y;
  }

  function startTransition(opts = {}) {
    const dur = opts.dur ?? 0.9;
    S.transition = {
      type: opts.type || "iris",
      t: opts.half ? dur / 2 : 0,
      dur,
      x: opts.x ?? canvas.width / 2,
      y: opts.y ?? canvas.height / 2,
      onMid: opts.onMid || null,
      fired: !!opts.half,
      color: opts.color || "#1b1236"
    };
    if (!opts.half && typeof playSfx === "function") playSfx("whoosh");
  }

  function updateTransition(dt) {
    const tr = S.transition;
    if (!tr) return;
    tr.t += dt;
    if (!tr.fired && tr.t >= tr.dur / 2) {
      tr.fired = true;
      tr.t = tr.dur / 2;
      const fn = tr.onMid;
      tr.onMid = null;
      if (fn) {
        try { fn(); } catch (err) { console.error(err); }
      }
    }
    if (S.transition === tr && tr.t >= tr.dur) S.transition = null;
  }

  function drawTransition() {
    const tr = S.transition;
    if (!tr) return;
    const half = tr.dur / 2;
    const k = tr.t < half ? tr.t / half : 1 - (tr.t - half) / half; // 0→1→0（1で全面カバー）
    const e = k * k * (3 - 2 * k);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (tr.type === "fade") {
      ctx.globalAlpha = e;
      ctx.fillStyle = tr.color;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      const maxR = Math.hypot(Math.max(tr.x, canvas.width - tr.x), Math.max(tr.y, canvas.height - tr.y)) + 20;
      const r = Math.max(0, maxR * (1 - e));
      ctx.fillStyle = tr.color;
      ctx.beginPath();
      ctx.rect(0, 0, canvas.width, canvas.height);
      ctx.arc(tr.x, tr.y, r, 0, TAU, true);
      ctx.fill("evenodd");
      if (r > 2) {
        ctx.strokeStyle = "rgba(255, 243, 164, 0.85)";
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(tr.x, tr.y, r, 0, TAU);
        ctx.stroke();
        ctx.strokeStyle = "rgba(255, 141, 183, 0.6)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(tr.x, tr.y, r + 9, 0, TAU);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // ---------- ステージタイトルカード ----------
  function showCard(title, sub, opts = {}) {
    S.card = { title, sub, t: 0, dur: opts.dur ?? 2.8, accent: opts.accent || "#ff8db7" };
  }

  function drawCard() {
    const c = S.card;
    if (!c) return;
    const W = canvas.width;
    const inK = Math.min(1, c.t / 0.45);
    const outK = Math.max(0, (c.t - (c.dur - 0.5)) / 0.5);
    const ease = 1 - Math.pow(1 - inK, 3);
    const y = 236;
    ctx.save();
    ctx.globalAlpha = 1 - outK;
    const bandW = W * ease;
    const grad = ctx.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, "rgba(44, 30, 92, 0)");
    grad.addColorStop(0.18, "rgba(44, 30, 92, 0.82)");
    grad.addColorStop(0.82, "rgba(44, 30, 92, 0.82)");
    grad.addColorStop(1, "rgba(44, 30, 92, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect((W - bandW) / 2, y, bandW, 132);
    ctx.fillStyle = c.accent;
    ctx.fillRect((W - bandW * 0.7) / 2, y, bandW * 0.7, 4);
    ctx.fillRect((W - bandW * 0.7) / 2, y + 128, bandW * 0.7, 4);
    const tx = W / 2 + (1 - ease) * 180 - outK * 120;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.font = `900 30px ${FONT}`;
    ctx.fillStyle = "#c9f6ff";
    ctx.strokeStyle = "rgba(20, 12, 50, 0.9)";
    ctx.lineWidth = 6;
    ctx.strokeText(c.sub, tx, y + 36);
    ctx.fillText(c.sub, tx, y + 36);
    ctx.font = `900 54px ${FONT}`;
    ctx.fillStyle = "#fff3a4";
    ctx.strokeStyle = "#7f67c8";
    ctx.lineWidth = 9;
    ctx.strokeText(c.title, tx, y + 88);
    ctx.fillText(c.title, tx, y + 88);
    ctx.restore();
  }

  // ---------- イベント用エミッタ ----------
  function centerOf(e) {
    return { x: e.x + e.w / 2, y: e.y + e.h / 2 };
  }

  function hit(x, y, colors = PASTEL, big = false) {
    add({ type: "glow", x, y, r: big ? 46 : 26, grow: 120, life: 0.13, color: colors[1] || "#fff3a4" });
    radial(x, y, big ? 9 : 5, { type: "spark", speed: [180, 460], life: [0.16, 0.3], r: [2.5, 4], colors, drag: 3 });
    add({ type: "ring", x, y, r: 6, grow: 240, w: 4, life: 0.2, color: colors[0] || "#ffffff" });
  }

  function enemyHurt(e, amount) {
    const c = centerOf(e);
    hit(c.x + rand(-e.w, e.w) * 0.25, c.y + rand(-e.h, e.h) * 0.25, PASTEL, e.boss);
    if (e.boss) {
      shake(0.07);
      if (amount >= 4 || Math.random() < 0.3) floater(c.x + rand(-30, 30), e.y - 6, String(amount), { color: "#ffffff", stroke: "#ff5f9e", size: 18, life: 0.6 });
    }
  }

  function enemyDefeat(e) {
    const c = centerOf(e);
    add({ type: "ring", x: c.x, y: c.y, r: 12, grow: 300, w: 7, life: 0.36, color: "#ffffff" });
    add({ type: "ring", x: c.x, y: c.y, r: 6, grow: 190, w: 5, life: 0.42, color: "#ff8db7" });
    add({ type: "glow", x: c.x, y: c.y, r: 70, grow: 90, life: 0.22, color: "#fff3a4" });
    radial(c.x, c.y, 10, { type: "star", speed: [120, 380], life: [0.45, 0.8], r: [5, 10], colors: PASTEL, g: 520, spin: 8 });
    radial(c.x, c.y, 7, { type: "puff", speed: [40, 150], life: [0.35, 0.6], r: [8, 15], colors: ["#ffffff", "#ffd1ed", "#d7c8ff"], grow: 22, drag: 2 });
    radial(c.x, c.y, 6, { type: "confetti", speed: [90, 300], life: [0.6, 1], r: [4, 6], colors: PASTEL, g: 620, spin: 9, vy: -120 });
    shake(0.22);
    hitStop(0.045);
    S.combo += 1;
    S.comboT = 2.8;
    S.comboPop = 1;
    let bonus = 0;
    if (S.combo >= 2) {
      bonus = Math.min(50, (S.combo - 1) * 5);
      floater(c.x, e.y - 34, `${S.combo} COMBO!`, { color: "#ff8db7", stroke: "#ffffff", size: 22 + Math.min(10, S.combo * 2), life: 1 });
      if (typeof playSfx === "function") playSfx("combo", c.x);
    }
    floater(c.x, e.y - 8, `+${5 + bonus}`, { size: 18 });
    return bonus;
  }

  function explosion(x, y, r = 90, colors = ["#ffffff", "#fff3a4", "#ff8db7"]) {
    add({ type: "glow", x, y, r: r * 1.1, grow: r * 1.5, life: 0.26, color: colors[1] });
    add({ type: "ring", x, y, r: r * 0.2, grow: r * 4.2, w: 8, life: 0.4, color: colors[0] });
    radial(x, y, 10, { type: "spark", speed: [r * 2.4, r * 6], life: [0.25, 0.5], r: [3, 5], colors, drag: 2.4 });
    radial(x, y, 6, { type: "puff", speed: [r * 0.5, r * 1.8], life: [0.4, 0.75], r: [r * 0.14, r * 0.28], colors: ["#ffffff", "#ffd1ed", "#d7c8ff"], grow: 30, drag: 2.2 });
    radial(x, y, 5, { type: "star", speed: [r * 1.5, r * 4], life: [0.5, 0.9], r: [5, 10], colors, g: 480, spin: 9 });
  }

  function bossFinale(x, y) {
    flash("#ffffff", 0.95, 0.9);
    shake(1);
    for (let i = 0; i < 3; i++) add({ type: "ring", x, y, r: 20 + i * 30, grow: 620 - i * 120, w: 12, life: 0.7 + i * 0.12, color: ["#ffffff", "#fff3a4", "#ff8db7"][i] });
    add({ type: "glow", x, y, r: 260, grow: 300, life: 0.5, color: "#fff3a4" });
    radial(x, y, lite ? 22 : 40, { type: "star5", speed: [180, 720], life: [0.8, 1.6], r: [7, 15], colors: GOLD.concat(PASTEL), g: 420, spin: 9 });
    radial(x, y, lite ? 26 : 50, { type: "confetti", speed: [160, 640], life: [1.2, 2.2], r: [5, 8], colors: PASTEL, g: 520, spin: 9, vy: -220, drag: 0.6 });
  }

  function coin(x, y) {
    add({ type: "glow", x, y, r: 26, grow: 60, life: 0.2, color: "#ffd85a" });
    radial(x, y, 5, { type: "star", speed: [60, 190], life: [0.3, 0.55], r: [4, 7], colors: GOLD, g: 260, spin: 8, vy: -60 });
    floater(x, y - 18, "+10", { size: 15, life: 0.6, color: "#ffffff", stroke: "#d98a2b" });
  }

  function starGet(x, y) {
    add({ type: "ring", x, y, r: 10, grow: 320, w: 7, life: 0.45, color: "#fff3a4" });
    add({ type: "glow", x, y, r: 80, grow: 120, life: 0.3, color: "#ffd85a" });
    radial(x, y, 14, { type: "star5", speed: [140, 420], life: [0.6, 1], r: [6, 12], colors: GOLD, g: 380, spin: 9 });
    flash("#fff3a4", 0.18, 0.25);
    floater(x, y - 30, "STAR GET!", { size: 24, color: "#fff3a4", stroke: "#ff8db7", life: 1.1 });
  }

  function oxygen(x, y) {
    add({ type: "ring", x, y, r: 10, grow: 220, w: 5, life: 0.4, color: "#bff8ff" });
    radial(x, y, 12, { type: "bubble", speed: [40, 150], life: [0.5, 0.9], r: [3, 8], colors: ["#bff8ff", "#ffffff"], g: -160, drag: 1.5 });
    floater(x, y - 26, "O2 MAX!", { size: 18, color: "#c9f6ff", stroke: "#277394" });
  }

  function muzzle(x, y, dir, colors = PASTEL) {
    add({ type: "glow", x: x + dir * 10, y, r: 24, life: 0.08, color: colors[1] || "#fff3a4" });
    for (let i = 0; i < 3; i++) {
      add({ type: "spark", x: x + dir * 8, y: y + rand(-5, 5), vx: dir * rand(260, 520), vy: rand(-110, 110), r: 2.6, life: rand(0.08, 0.16), color: pick(colors), drag: 4 });
    }
  }

  function beamTrail(b) {
    if (S.parts.length > MAX_PARTS * 0.7 || Math.random() > (lite ? 0.12 : 0.3)) return;
    const colors = b.colors || PASTEL;
    add({ type: "glow", x: b.x + b.w / 2 + rand(-6, 6), y: b.y + b.h / 2 + rand(-4, 4), r: rand(5, 11), life: rand(0.14, 0.26), color: pick(colors), a: 0.8 });
  }

  function beamGlow(b) {
    // drawBeams 内（translate/rotate 済み）で呼ばれる
    const colors = b.colors || PASTEL;
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.55;
    ctx.drawImage(glowSprite(colors[1] || "#fff3a4"), -b.w * 0.95, -b.h * 2.4, b.w * 1.9, b.h * 4.8);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 0.95;
  }

  function blockBreak(x, y) {
    add({ type: "ring", x, y, r: 8, grow: 210, w: 5, life: 0.26, color: "#ffffff" });
    radial(x, y, 8, { type: "shard", speed: [110, 320], life: [0.5, 0.85], r: [5, 9], colors: ["#fff3a4", "#ffd1ed", "#d7c8ff", "#f4e9cc"], g: 900, spin: 10, vy: -140 });
    radial(x, y, 4, { type: "star", speed: [60, 180], life: [0.3, 0.5], r: [4, 7], colors: GOLD, spin: 8 });
    shake(0.08);
  }

  function jump(x, y) {
    squash(0.8, 1.22);
    add({ type: "ring", x, y: y - 2, r: 8, grow: 110, w: 3, life: 0.2, color: "#ffffff", a: 0.7 });
  }

  function land(x, y, impact) {
    const power = Math.min(1, impact / 1100);
    squash(1 + 0.26 * power, 1 - 0.22 * power);
    const n = 2 + Math.round(power * 4);
    for (let i = 0; i < n; i++) {
      const side = i % 2 ? 1 : -1;
      add({ type: "puff", x: x + side * rand(6, 16), y: y - rand(0, 4), vx: side * rand(40, 150) * (0.5 + power), vy: rand(-46, -8), r: rand(5, 9), grow: 18, life: rand(0.25, 0.45), color: pick(["#ffffff", "#f4e9cc", "#ffd1ed"]), drag: 3 });
    }
    if (power > 0.72) shake(0.07);
  }

  function stomp(x, y, boosted) {
    add({ type: "ring", x, y, r: 10, grow: boosted ? 360 : 240, w: 6, life: 0.3, color: boosted ? "#fff3a4" : "#ffffff" });
    radial(x, y, boosted ? 12 : 7, { type: "star", speed: [120, 360], life: [0.35, 0.65], r: [5, 9], colors: GOLD, g: 420, spin: 9, vy: -80 });
    shake(boosted ? 0.26 : 0.16);
    hitStop(boosted ? 0.06 : 0.035);
    squash(1.2, 0.8);
    if (boosted) floater(x, y - 30, "BOOST!", { size: 22, color: "#9ee8ff", stroke: "#3f62c8" });
  }

  function playerHurt(x, y) {
    S.hurt = 1;
    shake(0.5);
    hitStop(0.08);
    flash("#ff5f8f", 0.22, 0.22);
    add({ type: "ring", x, y, r: 10, grow: 300, w: 6, life: 0.3, color: "#ff8db7" });
    radial(x, y, 10, { type: "spark", speed: [200, 520], life: [0.2, 0.4], r: [3, 5], colors: ["#ff8db7", "#ffffff", "#ff5f8f"], drag: 3 });
  }

  function playerDeath(x, y) {
    S.hurt = 1;
    shake(0.75);
    slowMo(0.55, 0.4);
    flash("#ffffff", 0.4, 0.3);
    add({ type: "ring", x, y, r: 14, grow: 420, w: 8, life: 0.45, color: "#ffffff" });
    radial(x, y, 16, { type: "star", speed: [140, 460], life: [0.6, 1.1], r: [5, 11], colors: PASTEL, g: 480, spin: 9 });
  }

  function weaponGet(x, y, label, fused) {
    add({ type: "ring", x, y, r: 10, grow: 260, w: 6, life: 0.4, color: fused ? "#ff8db7" : "#9ee8ff" });
    add({ type: "glow", x, y, r: 60, grow: 80, life: 0.25, color: fused ? "#ffd1ed" : "#c9f6ff" });
    radial(x, y, fused ? 14 : 8, { type: "star", speed: [110, 340], life: [0.4, 0.8], r: [5, 9], colors: PASTEL, g: 300, spin: 9, vy: -60 });
    if (label) floater(x, y - 40, label, { size: fused ? 22 : 17, color: fused ? "#ffd1ed" : "#c9f6ff", stroke: "#5b47a8", life: 1.2 });
    if (fused) flash("#ffd1ed", 0.16, 0.22);
  }

  function respawnSparkle(x, y) {
    radial(x, y, 14, { type: "star", speed: [80, 260], life: [0.5, 0.9], r: [5, 9], colors: GOLD, spin: 8, drag: 1.4 });
    add({ type: "glow", x, y, r: 90, grow: 60, life: 0.4, color: "#fff3a4" });
  }

  function confetti(n = 60) {
    const count = lite ? Math.round(n * 0.55) : n;
    for (let i = 0; i < count; i++) {
      add({
        type: "confetti", screen: true,
        x: rand(0, canvas.width), y: rand(-240, -10),
        vx: rand(-50, 50), vy: rand(130, 320), g: 30,
        r: rand(5, 9), life: rand(2.6, 4.2), color: pick(PASTEL.concat(["#ff8db7", "#9ee8ff"])),
        rot: Math.random() * TAU, vr: rand(-4, 4), ph: Math.random() * TAU, fs: rand(5, 11)
      });
    }
  }

  function firework(x, y, colors = PASTEL) {
    add({ type: "glow", screen: true, x, y, r: 60, grow: 200, life: 0.3, color: pick(colors) });
    radial(x, y, lite ? 14 : 24, { type: "spark", screen: true, speed: [160, 420], life: [0.6, 1.1], r: [3, 4.5], colors, g: 160, drag: 1.6, len: 0.06 });
    radial(x, y, 8, { type: "star", screen: true, speed: [80, 260], life: [0.6, 1], r: [4, 8], colors, g: 200, spin: 8 });
  }

  // ---------- プレイヤー追従（着地・ダッシュ・残像） ----------
  function trackPlayer(p, dt) {
    const swimming = !!p.swimming;
    if (!swimming) {
      if (p.grounded && !S.wasGrounded && S.lastVy > 260) {
        land(p.x + p.w / 2, p.y + p.h, S.lastVy);
        if (S.lastVy > 520 && typeof playSfx === "function") playSfx("land", p.x);
      }
      S.wasGrounded = p.grounded;
      S.lastVy = p.vy;
    }
    const speed = Math.abs(p.vx);
    const fast = speed > 300 || p.vy < -960;
    if (p.grounded && speed > 300) {
      S.dustT -= dt;
      if (S.dustT <= 0) {
        S.dustT = 0.07;
        add({ type: "puff", x: p.x + p.w / 2 - Math.sign(p.vx) * 14, y: p.y + p.h - 3, vx: -Math.sign(p.vx) * rand(20, 70), vy: rand(-40, -8), r: rand(4, 7), grow: 16, life: rand(0.22, 0.36), color: pick(["#ffffff", "#ffd1ed", "#c9f6ff"]) });
      }
    }
    if (swimming && (speed > 120 || Math.abs(p.vy) > 120)) {
      S.dustT -= dt;
      if (S.dustT <= 0) {
        S.dustT = 0.11;
        add({ type: "bubble", x: p.x + p.w / 2 - p.facing * 16, y: p.y + rand(10, 40), vx: rand(-20, 20), vy: rand(-70, -30), r: rand(2.5, 6), life: rand(0.5, 0.9), color: "#e6fbff" });
      }
    }
    S.ghostT -= dt;
    if (fast && S.ghostT <= 0) {
      S.ghostT = 0.045;
      S.ghosts.push({ x: p.x, y: p.y, facing: p.facing, vx: p.vx, vy: p.vy, grounded: p.grounded, swimming, life: 0.2 });
      if (S.ghosts.length > 6) S.ghosts.shift();
    }
  }

  function drawGhosts(p, drawFn) {
    if (!S.ghosts.length) return;
    ctx.save();
    for (const g of S.ghosts) {
      ctx.globalAlpha = Math.max(0, g.life / 0.2) * 0.3;
      drawFn({ ...p, x: g.x, y: g.y, facing: g.facing, vx: g.vx, vy: g.vy, grounded: g.grounded, swimming: g.swimming });
    }
    ctx.restore();
  }

  function playerTransform(p) {
    if (Math.abs(S.squashX - 1) < 0.01 && Math.abs(S.squashY - 1) < 0.01) return;
    const fx = p.x + p.w / 2;
    const fy = p.y + p.h;
    ctx.translate(fx, fy);
    ctx.scale(S.squashX, S.squashY);
    ctx.translate(-fx, -fy);
  }

  // ---------- ゴールゲート ----------
  function drawGoal(f, locked) {
    const cx = f.x + f.w / 2;
    const cy = f.y + 122;
    const base = f.y + f.h;
    const R = 80;
    const t = S.time;
    ctx.save();
    // 足元の光
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = locked ? 0.25 : 0.7;
    ctx.drawImage(glowSprite(locked ? "#b9a8e8" : "#fff3a4"), cx - 130, base - 26, 260, 52);
    // 外側のオーラ
    ctx.globalAlpha = locked ? 0.25 : 0.55 + Math.sin(t * 3) * 0.12;
    ctx.drawImage(glowSprite(locked ? "#8f7fc8" : "#ffd1ed"), cx - R * 1.9, cy - R * 1.9, R * 3.8, R * 3.8);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = locked ? 0.55 : 1;
    // 渦
    const swirl = ctx.createRadialGradient(cx, cy, 4, cx, cy, R);
    if (locked) {
      swirl.addColorStop(0, "rgba(120, 104, 170, 0.9)");
      swirl.addColorStop(1, "rgba(60, 48, 110, 0.75)");
    } else {
      swirl.addColorStop(0, "rgba(255, 255, 255, 0.98)");
      swirl.addColorStop(0.35, "rgba(201, 246, 255, 0.92)");
      swirl.addColorStop(0.7, "rgba(255, 209, 237, 0.88)");
      swirl.addColorStop(1, "rgba(200, 178, 255, 0.82)");
    }
    ctx.fillStyle = swirl;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, TAU);
    ctx.fill();
    if (!locked) {
      ctx.lineCap = "round";
      for (let i = 0; i < 3; i++) {
        ctx.strokeStyle = ["rgba(255,255,255,0.85)", "rgba(255, 243, 164, 0.8)", "rgba(158, 232, 255, 0.8)"][i];
        ctx.lineWidth = 5 - i;
        ctx.beginPath();
        const a0 = t * (1.6 + i * 0.5) + i * 2.1;
        for (let s = 0; s <= 26; s++) {
          const k = s / 26;
          const a = a0 + k * 4.2;
          const r = 8 + k * (R - 16);
          const x = cx + Math.cos(a) * r;
          const y = cy + Math.sin(a) * r;
          if (s === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
    // リング
    ctx.lineWidth = 10;
    ctx.strokeStyle = locked ? "#6f62a0" : "#ffffff";
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, TAU);
    ctx.stroke();
    ctx.lineWidth = 4;
    ctx.strokeStyle = locked ? "#4d4380" : "#ff8db7";
    ctx.setLineDash([16, 12]);
    ctx.lineDashOffset = -t * 40;
    ctx.beginPath();
    ctx.arc(cx, cy, R + 10, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    // 周回する星
    for (let i = 0; i < 6; i++) {
      const a = t * (locked ? 0.3 : 1.2) + (i / 6) * TAU;
      ctx.save();
      ctx.translate(cx + Math.cos(a) * (R + 22), cy + Math.sin(a) * (R + 22));
      ctx.rotate(-a * 2);
      ctx.fillStyle = locked ? "#8f7fc8" : PASTEL[i % PASTEL.length];
      starPath(i % 2 ? 7 : 10, 4, 0.36);
      ctx.fill();
      ctx.restore();
    }
    // ラベル
    const bob = Math.sin(t * 3.2) * 5;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.font = `900 30px ${FONT}`;
    ctx.lineWidth = 7;
    ctx.strokeStyle = locked ? "#3a2f66" : "#7f67c8";
    ctx.fillStyle = locked ? "#c8b2ff" : "#fff3a4";
    const label = locked ? "BOSS" : "GOAL";
    ctx.strokeText(label, cx, cy - R - 40 + bob);
    ctx.fillText(label, cx, cy - R - 40 + bob);
    if (locked) {
      ctx.strokeStyle = "rgba(200, 178, 255, 0.85)";
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(cx - R * 0.6, cy - R * 0.6);
      ctx.lineTo(cx + R * 0.6, cy + R * 0.6);
      ctx.moveTo(cx + R * 0.6, cy - R * 0.6);
      ctx.lineTo(cx - R * 0.6, cy + R * 0.6);
      ctx.stroke();
    }
    ctx.restore();
    if (!locked && Math.random() < 0.3) {
      const a = Math.random() * TAU;
      add({ type: "star", x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R, vx: Math.cos(a) * rand(20, 70), vy: Math.sin(a) * rand(20, 70) - 30, r: rand(4, 8), life: rand(0.5, 1), color: pick(PASTEL), vr: rand(-5, 5) });
    }
  }

  // ---------- フレーム更新 ----------
  function frame(raw) {
    S.time += raw;
    S.trauma = Math.max(0, S.trauma - raw * 1.7);
    const m = S.trauma * S.trauma * 17;
    S.sx = (Math.random() * 2 - 1) * m;
    S.sy = (Math.random() * 2 - 1) * m * 0.8;
    for (const f of S.flashes) f.life -= raw;
    if (S.flashes.length) S.flashes = S.flashes.filter(f => f.life > 0);
    for (const f of S.floaters) {
      f.life -= raw;
      f.y += f.vy * raw;
      f.vy *= 1 - Math.min(1, raw * 2.2);
    }
    if (S.floaters.length) S.floaters = S.floaters.filter(f => f.life > 0);
    for (const g of S.ghosts) g.life -= raw;
    if (S.ghosts.length) S.ghosts = S.ghosts.filter(g => g.life > 0);
    S.hurt = Math.max(0, S.hurt - raw * 1.8);
    S.comboPop = Math.max(0, S.comboPop - raw * 4);
    if (S.comboT > 0) {
      S.comboT -= raw;
      if (S.comboT <= 0) S.combo = 0;
    }
    const sk = Math.min(1, raw * 11);
    S.squashX += (1 - S.squashX) * sk;
    S.squashY += (1 - S.squashY) * sk;
    if (S.card) {
      S.card.t += raw;
      if (S.card.t >= S.card.dur) S.card = null;
    }
    updateAmbient(raw);
    updateTransition(raw);
    updateParts(S.hitstop > 0 ? raw * 0.2 : raw);
    if (S.hitstop > 0) {
      S.hitstop -= raw;
      return 0;
    }
    if (S.slowT > 0) {
      S.slowT -= raw;
      return raw * S.slowScale;
    }
    return raw;
  }

  // ---------- 描画 ----------
  function applyShake() {
    if (S.sx || S.sy) ctx.translate(Math.round(S.sx), Math.round(S.sy));
  }

  function drawWorld() {
    drawParts(false);
    drawFloaters(false);
  }

  function drawCombo() {
    if (S.combo < 2 || state.mode !== "playing") return;
    const x = canvas.width - 256;
    const y = 96 + (typeof isUnderwaterStage === "function" && isUnderwaterStage() ? 46 : 0);
    const s = 1 + S.comboPop * 0.35;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.font = `900 34px ${FONT}`;
    ctx.lineWidth = 7;
    ctx.strokeStyle = "#ffffff";
    ctx.fillStyle = "#ff5f9e";
    ctx.strokeText(`${S.combo}`, -46, 0);
    ctx.fillText(`${S.combo}`, -46, 0);
    ctx.font = `900 18px ${FONT}`;
    ctx.lineWidth = 5;
    ctx.strokeStyle = "#7f67c8";
    ctx.fillStyle = "#fff3a4";
    ctx.strokeText("COMBO", 22, 2);
    ctx.fillText("COMBO", 22, 2);
    ctx.restore();
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillRect(x - 70, y + 22, 140, 5);
    ctx.fillStyle = "#ff8db7";
    ctx.fillRect(x - 70, y + 22, 140 * Math.max(0, S.comboT / 2.8), 5);
    ctx.restore();
  }

  function drawScreen() {
    drawAmbient();
    drawParts(true);
    // ビネット
    const world = courses[currentCourse]?.worldIndex ?? 0;
    const tint = state.mode === "worldMap" ? "46, 28, 96" : ["70, 48, 130", "60, 12, 30", "8, 40, 80", "2, 30, 60", "40, 22, 70", "14, 4, 26"][world] || "46, 28, 96";
    ctx.save();
    ctx.globalAlpha = state.mode === "worldMap" ? 0.34 : world === 5 ? 0.6 : 0.38;
    ctx.drawImage(vignetteSprite(tint), 0, 0, canvas.width, canvas.height);
    const lowHp = (state.mode === "playing" && state.hp <= 1) ? 0.26 + Math.sin(S.time * 6) * 0.12 : 0;
    const hurtA = Math.max(S.hurt * 0.75, lowHp);
    if (hurtA > 0.01) {
      ctx.globalAlpha = hurtA;
      ctx.drawImage(vignetteSprite("255, 60, 110", 0.5), 0, 0, canvas.width, canvas.height);
    }
    ctx.restore();
    drawFloaters(true);
    drawCombo();
    if (state.mode !== "cutscene" && state.mode !== "credits" && state.mode !== "worldMap" && state.mode !== "title") drawCard();
  }

  function drawFlashes() {
    if (!S.flashes.length) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (const f of S.flashes) {
      ctx.globalAlpha = f.alpha * Math.max(0, f.life / f.max);
      ctx.fillStyle = f.color;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.restore();
  }

  function resetStage() {
    S.parts = S.parts.filter(p => p.screen);
    S.floaters = [];
    S.ghosts = [];
    S.combo = 0;
    S.comboT = 0;
    S.hurt = 0;
    S.wasGrounded = true;
    S.lastVy = 0;
    S.squashX = S.squashY = 1;
    S.lastCam = 0;
  }

  window.FX = {
    S, PASTEL, GOLD, FONT, lite,
    add, radial, floater, glowSprite, starPath,
    frame, applyShake, drawWorld, drawScreen, drawFlashes, drawTransition,
    shake, hitStop, slowMo, flash, squash,
    startTransition, showCard, resetStage,
    transitioning: () => !!S.transition,
    hit, enemyHurt, enemyDefeat, explosion, bossFinale,
    coin, starGet, oxygen, muzzle, beamTrail, beamGlow, blockBreak,
    jump, land, stomp, playerHurt, playerDeath, weaponGet, respawnSparkle,
    confetti, firework,
    trackPlayer, drawGhosts, playerTransform, drawGoal,
    resetCombo() { S.combo = 0; S.comboT = 0; }
  };
})();

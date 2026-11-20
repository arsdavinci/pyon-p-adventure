// hazards.js — 惑星ごとの「ステージのしかけ」。ステージが進むほど、ふえて・強くなる
//   月      : 月のシャボン玉（1-2〜・乗ると上へ）／流れ星（1-3〜）
//   火星    : 砂あらし（2-1〜・風で押される）／火山弾（2-3〜）
//   氷の星  : つらら（3-1〜）／ふぶき（3-3〜）
//   星の海  : 海流（4-1〜）／うずしお（4-4〜）
//   メカ工場: 落ちてくる荷物（5-1〜）／レーザーゲート（5-3〜）
//   魔王星  : まっ暗やみ（6-2〜・まわりしか見えない）／やみの流れ星（6-5〜）
// ボス・ボーナス部屋・迷路・山のぼり・最終ステージでは出さない。
// game.js より前に読み込む（game.js のグローバルは呼び出し時に使う）
(() => {
  "use strict";

  // 惑星ごとに、何番目のステージ（0 から）から出すか
  const PLAN = [
    { bubble: 1, faller: 2, fall: "star" },
    { gust: 0, gustLook: "sand", faller: 2, fall: "fire" },
    { faller: 0, fall: "icicle", gust: 2, gustLook: "snow" },
    { current: 0, whirl: 3 },
    { faller: 0, fall: "crate", laser: 2 },
    { dark: 1, faller: 4, fall: "dark" }
  ];

  const INTRO = {
    bubble: [["yana", "月のシャボン玉です。中に入ると、ふわっと上へ運ばれます。A でわって飛び出せます。", "Moon bubbles! Step inside and you'll float up. Press A to pop out."], ["pyon", "ふわふわじょ！ 高いとこのコインも取れそうじゃ！", "So floaty! I can reach the high coins!"]],
    star: [["yana", "流れ星が落ちてきます！ 地面の光る印から、はなれてください。", "Shooting stars incoming! Keep away from the glowing marks."], ["pyon", "願いごとする ひまもないでないか！", "No time to make a wish!"]],
    fire: [["yana", "火山弾です。赤い印のところに落ちてきます。", "Volcanic bombs! They land on the red marks."], ["pyon", "あっちっち、当たったらたまらんじょ！", "Hot hot! I don't want to get hit by that!"]],
    sand: [["yana", "砂あらしが来ます。風の向きを見て、ふんばってください。", "A sandstorm is coming. Watch the wind and hold your ground."], ["pyon", "目ぇに砂が入るじょ〜！", "Sand in my eyes!"]],
    icicle: [["yana", "頭の上につららがあります。ゆれたら落ちてきます！", "Icicles overhead! When they shake, they fall!"], ["pyon", "上も見て歩かないかんな！", "Gotta watch above me too!"]],
    snow: [["yana", "ふぶきです。風に押されます。足もとに気をつけて。", "A blizzard! The wind will push you. Mind your footing."], ["pyon", "さぶっ！ 耳がこおるじょ！", "Brr! My ears are freezing!"]],
    current: [["yana", "海流です。流れにさからうと進みにくくなります。止まるのを待つのも手です。", "Ocean currents. Swimming against them is slow. You can wait for them to stop."], ["pyon", "流れに乗ったら、楽ちんじゃ！", "Riding the flow is easy!"]],
    whirl: [["yana", "うずしおです！ まん中に近づくと、すいこまれます。", "A whirlpool! Get near the center and you'll be sucked in."], ["pyon", "ぐるぐる、目が回るじょ〜！", "Round and round, I'm getting dizzy!"]],
    crate: [["yana", "工場の荷物が落ちてきます。影を見て、よけてください。", "Factory cargo is falling. Watch the shadows and dodge."], ["pyon", "あぶない工場じゃなぁ！", "What a dangerous factory!"]],
    laser: [["yana", "レーザーゲートです。光が消えたすきに、通りぬけてください。", "Laser gates. Slip through while the beam is off."], ["pyon", "タイミングが大事じゃな！", "It's all about timing!"]],
    dark: [["yana", "ここから先は、まっ暗やみです。光線銃のあかりと、敵の目の光をたよりに進んでください。", "It's pitch dark ahead. Rely on your ray gun's glow and the enemies' shining eyes."], ["pyon", "ら、らんぴょん、明かり持ってきてー！", "R-Ranpyon, bring a light!"]],
    darkStar: [["yana", "やみの流れ星です。紫の印に気をつけて！", "Dark meteors! Watch for the purple marks!"], ["pyon", "魔王の星は、ぶっそうじゃなぁ！", "The Demon Star sure is dangerous!"]]
  };

  const FALL_LOOK = {
    star: { colors: ["#fff7b0", "#ffd85a", "#ff9bd4"], mark: "#ffe36a", warn: 0.95, dur: 0.55, slant: 260, r: 22 },
    fire: { colors: ["#ffd27a", "#ff7a3d", "#ff3d5a"], mark: "#ff5a3d", warn: 1.0, dur: 0.6, slant: -220, r: 24 },
    icicle: { colors: ["#ffffff", "#bff4ff", "#7fd8ff"], mark: "#9ee8ff", warn: 0.9, dur: 0.42, slant: 0, r: 18 },
    crate: { colors: ["#ffd06a", "#c98a3a", "#7a5530"], mark: "#ffb347", warn: 1.0, dur: 0.5, slant: 0, r: 26 },
    dark: { colors: ["#e3c2ff", "#a259ff", "#3a1a6a"], mark: "#c27bff", warn: 0.85, dur: 0.45, slant: 300, r: 24 }
  };

  // しかけに対抗する道具（その惑星のよろず屋で売っている。shop.js）
  const GUARD = { star: "starParasol", fire: "magmaBrella", icicle: "icicleHat", crate: "springHat", dark: "darkCharm", laser: "mirror", whirl: "floatRing", sand: "heavyPack", snow: "furCoat", current: "anchor" };
  const has = id => typeof Shop !== "undefined" && Shop.has(id);
  const guarded = kind => has(GUARD[kind]);
  let guardShownAt = 0;
  function guardFx(kind, x, y) {
    const now = performance.now();
    if (now - guardShownAt < 1200) return;
    guardShownAt = now;
    const p = state.player;
    FX.floater(x ?? p.x + p.w / 2, y ?? p.y - 20, `${Shop.itemName(GUARD[kind])}！`, { color: "#ffffff", stroke: "#7f67c8", size: 22, life: 1 });
    playSfx("equip", p.x);
  }

  const DARK_HINT = {
    buy: [["yana", "まっ暗で進みにくいですね……。この星のよろず屋で『ふわぴかランタン』を買うと、もっと楽にクリアできるかもしれません。", "It's hard to get around in this darkness... If you buy the Floaty Glow Lantern at this planet's shop, it might be much easier."], ["pyon", "ほな、こんど よってみるじょ！", "Then I'll stop by next time!"]],
    wear: [["yana", "ふわぴかランタンを持っていますね。持ち物で つけると、まわりが明るくなりますよ。", "You have the Floaty Glow Lantern. Turn it on from your items to light things up."]]
  };

  let S = null;
  let owner = null;
  let darkCv = null;

  function course() { return courses[currentCourse]; }

  function active() {
    const c = course();
    if (!c || !state || c.bossStage || c.finalStage || c.isMaze || c.isRoom || c.climbStage) return null;
    const plan = PLAN[c.worldIndex];
    return plan ? { c, plan, a: c.areaIndex ?? 0 } : null;
  }

  const on = (cfg, key) => cfg.plan[key] !== undefined && cfg.a >= cfg.plan[key];

  function solidAt(r) {
    for (const s of platforms) {
      if (s.passThrough || s.oneWay) continue;
      if (hit(r, s)) return true;
    }
    return false;
  }

  function hurt() {
    const p = state.player;
    if (p.invincible > 0 || state.mode !== "playing") return;
    if (hasEquippedWeapon() && isRideable(state.weaponPower)) return;
    damagePlayer(false, null, false);
  }

  function intro(key) {
    if (!INTRO[key] || typeof Story === "undefined") return;
    const seen = (Story.data.seen ??= {});
    if (seen[`hz_${key}`]) return;
    seen[`hz_${key}`] = true;
    try { Story.persist(); } catch (_) {}
    Chat.say(INTRO[key], true);
  }

  function reset(cfg) {
    owner = state;
    S = { fallT: 2.5, fallers: [], bubbleT: 1.5, bubbles: [], gust: { phase: "calm", t: 3, dir: 1 }, whirlT: 3, whirls: [], lasers: [], streaks: [], riding: null,
      beamN: 0, flash: 0, orb: null, darkT: 0, hinted: false };
    if (cfg && on(cfg, "laser")) {
      const gap = Math.max(560, 900 - cfg.a * 90);
      let i = 0;
      for (let x = 1100; x < 3400; x += gap, i++) {
        const top = lavaRockLandingY(x);
        if (top == null) continue;
        S.lasers.push({ x, bottom: top, top: top - 330, phase: i * 1.1, period: 3.4 - Math.min(0.8, cfg.a * 0.15) });
      }
    }
  }

  function viewLeft() { return state.camera ?? 0; }
  function viewTop() { return state.cameraY ?? 0; }
  function viewW() { return canvas.width / (state.viewZoom ?? ZOOM); }

  // ---------- 落ちてくるもの（流れ星・火山弾・つらら・荷物・やみの流れ星） ----------
  function spawnFaller(cfg) {
    const p = state.player;
    const look = FALL_LOOK[cfg.plan.fall];
    const lead = p.vx * 0.55 + p.facing * 60;
    const count = cfg.a >= 4 ? 2 : 1;
    for (let i = 0; i < count; i++) {
      const tx = clamp(p.x + p.w / 2 + lead + (i ? (Math.random() < 0.5 ? -1 : 1) * (180 + Math.random() * 160) : (Math.random() - 0.5) * 140), 60, WORLD_WIDTH - 60);
      const land = lavaRockLandingY(tx);
      if (land == null) continue;
      S.fallers.push({ x: tx, land, t: -i * 0.3, look, kind: cfg.plan.fall, hit: false });
    }
    playSfx(cfg.plan.fall === "icicle" ? "iceCrack" : "boltWarn", p.x);
    intro(cfg.plan.fall === "dark" ? "darkStar" : cfg.plan.fall);
  }

  function fallerPos(f) {
    const k = clamp((f.t - f.look.warn) / f.look.dur, 0, 1);
    const top = f.kind === "icicle" ? viewTop() + 30 : viewTop() - 60;
    return { x: f.x + f.look.slant * (1 - k), y: top + (f.land - top) * k * k, k };
  }

  function updateFallers(dt, cfg) {
    S.fallT -= dt;
    if (S.fallT <= 0) {
      S.fallT = Math.max(1.3, 3.4 - cfg.a * 0.3) + Math.random() * 0.9;
      spawnFaller(cfg);
    }
    const p = state.player;
    for (const f of S.fallers) {
      f.t += dt;
      if (f.t < f.look.warn) continue;
      const pos = fallerPos(f);
      if (pos.k < 1) {
        if (!f.whistled) { f.whistled = true; playSfx("rockWhistle", f.x); }
        const r = f.look.r;
        if (p.x < pos.x + r && p.x + p.w > pos.x - r && p.y < pos.y + r && p.y + p.h > pos.y - r) {
          if (guarded(f.kind)) {
            // 道具ではじく：その場でくだけて消える
            f.landed = true;
            f.done = f.t;
            FX.hit(pos.x, pos.y, f.look.colors);
            guardFx(f.kind);
          } else hurt();
        }
      } else if (!f.landed) {
        f.landed = true;
        f.done = f.t + 0.35;
        playSfx("rockThud", f.x);
        FX.shake(0.1);
        FX.hit(f.x, f.land - 10, f.look.colors);
        // 着地のしゅんかんに、すぐ横にいても当たる
        if (Math.abs(p.x + p.w / 2 - f.x) < f.look.r + 18 && Math.abs(p.y + p.h - f.land) < 40) {
          if (guarded(f.kind)) guardFx(f.kind);
          else hurt();
        }
      }
    }
    S.fallers = S.fallers.filter(f => !f.done || f.t < f.done);
  }

  function drawFallers() {
    const now = performance.now() / 1000;
    for (const f of S.fallers) {
      const look = f.look;
      // 地面の印（だんだん速く点めつ）
      if (!f.landed) {
        const k = clamp(f.t / look.warn, 0, 1);
        ctx.globalAlpha = 0.35 + Math.abs(Math.sin(now * (8 + k * 20))) * 0.5;
        ctx.fillStyle = look.mark;
        ctx.beginPath();
        ctx.ellipse(f.x, f.land - 3, 26 + k * 10, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      if (f.kind === "icicle" && f.t < look.warn) {
        // ゆれる つらら（画面の上）
        const shake = Math.sin(now * 50) * 3 * clamp(f.t / look.warn, 0, 1);
        drawIcicle(f.x + shake, viewTop() + 30);
        continue;
      }
      if (f.t < look.warn || f.landed) continue;
      const pos = fallerPos(f);
      ctx.save();
      ctx.translate(pos.x, pos.y);
      if (f.kind === "icicle") { drawIcicle(0, 0); ctx.restore(); continue; }
      if (f.kind === "crate") {
        ctx.rotate(now * 3);
        ctx.fillStyle = look.colors[1];
        ctx.strokeStyle = look.colors[2];
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.roundRect(-24, -24, 48, 48, 6);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-24, -24); ctx.lineTo(24, 24); ctx.moveTo(24, -24); ctx.lineTo(-24, 24);
        ctx.stroke();
        ctx.restore();
        continue;
      }
      // しっぽ
      const ang = Math.atan2(f.land - pos.y, -look.slant || 0.001);
      const grad = ctx.createLinearGradient(0, 0, -Math.cos(ang) * 90, -Math.sin(ang) * 90);
      grad.addColorStop(0, look.colors[1]);
      grad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.strokeStyle = grad;
      ctx.lineWidth = 14;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-Math.cos(ang) * 90, -Math.sin(ang) * 90);
      ctx.stroke();
      ctx.rotate(now * 6);
      ctx.fillStyle = look.colors[0];
      ctx.strokeStyle = look.colors[2];
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const rr = i % 2 ? 9 : 21;
        const a = -Math.PI / 2 + i * Math.PI / 5;
        ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawIcicle(x, y) {
    ctx.fillStyle = "#e8fbff";
    ctx.strokeStyle = "#7fd8ff";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x - 14, y - 12);
    ctx.lineTo(x + 14, y - 12);
    ctx.lineTo(x, y + 34);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // ---------- 月のシャボン玉 ----------
  function updateBubbles(dt, cfg) {
    const p = state.player;
    S.bubbleT -= dt;
    if (S.bubbleT <= 0 && S.bubbles.length < 3) {
      S.bubbleT = 3.2 - Math.min(1.2, cfg.a * 0.3);
      const x = p.x + p.w / 2 + (p.facing || 1) * (260 + Math.random() * 200);
      const land = lavaRockLandingY(x);
      if (land != null) S.bubbles.push({ x, y: land - 40, life: 7, r: 36, seed: Math.random() * 9 });
    }
    const jump = keys.has("Space") || gamepadState.jump;
    const dxIn = (keys.has("ArrowRight") || keys.has("KeyD") || gamepadState.right ? 1 : 0) - (keys.has("ArrowLeft") || keys.has("KeyA") || gamepadState.left ? 1 : 0);
    for (const b of S.bubbles) {
      b.life -= dt;
      b.y -= (S.riding === b ? 95 : 45) * dt;
      b.x += Math.sin(performance.now() / 600 + b.seed) * 14 * dt;
      if (S.riding === b) {
        const nx = b.x + dxIn * 130 * dt;
        if (!solidAt({ x: nx - 24, y: b.y - 30, w: 48, h: 60 })) b.x = nx;
        const blocked = solidAt({ x: b.x - 24, y: b.y - 34, w: 48, h: 10 });
        if ((jump && !S.jumpWas) || b.life <= 0 || blocked || b.y < viewTop() + 40 || state.mode !== "playing" || p.invincible > 1) {
          popBubble(b, jump && !S.jumpWas);
          continue;
        }
        p.x = b.x - p.w / 2;
        p.y = b.y - p.h / 2;
        p.vx = 0;
        p.vy = 0;
      } else if (!S.riding && b.life > 0.5 && state.mode === "playing" && !(hasEquippedWeapon() && isRideable(state.weaponPower))) {
        if (Math.hypot(p.x + p.w / 2 - b.x, p.y + p.h / 2 - b.y) < b.r + 10 && p.vy >= -200) {
          S.riding = b;
          playSfx("bubble", b.x);
          intro("bubble");
        }
      }
    }
    S.jumpWas = jump;
    S.bubbles = S.bubbles.filter(b => !b.popped && b.life > 0);
  }

  function popBubble(b, jumped) {
    b.popped = true;
    if (S.riding === b) {
      S.riding = null;
      const p = state.player;
      p.vy = jumped ? -820 : -200;
    }
    playSfx("bubble", b.x);
    FX.hit(b.x, b.y, ["#ffffff", "#ffd1ed", "#bff8ff"]);
  }

  function drawBubbles() {
    for (const b of S.bubbles) {
      const fade = clamp(b.life, 0, 1);
      ctx.globalAlpha = 0.85 * fade;
      const g = ctx.createRadialGradient(b.x - 10, b.y - 12, 3, b.x, b.y, b.r);
      g.addColorStop(0, "rgba(255,255,255,0.9)");
      g.addColorStop(0.55, "rgba(255,209,237,0.22)");
      g.addColorStop(1, "rgba(158,232,255,0.55)");
      ctx.fillStyle = g;
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  // ---------- 風（砂あらし・ふぶき）と海流 ----------
  function updateWind(dt, cfg, kind) {
    const g = S.gust;
    const p = state.player;
    g.t -= dt;
    const water = kind === "current";
    if (g.t <= 0) {
      if (g.phase === "calm") {
        g.phase = "warn";
        g.t = water ? 0.6 : 1.1;
        g.dir = Math.random() < 0.5 ? -1 : 1;
      } else if (g.phase === "warn") {
        g.phase = "blow";
        g.t = water ? 3.6 + cfg.a * 0.2 : 2.2 + cfg.a * 0.2;
        playSfx("swoop", p.x);
        intro(water ? "current" : cfg.plan.gustLook);
      } else {
        g.phase = "calm";
        g.t = (water ? 3 : 4.2) - Math.min(1.4, cfg.a * 0.25) + Math.random() * 1.2;
      }
    }
    if (g.phase === "blow" && state.mode === "playing" && !guarded(water ? "current" : cfg.plan.gustLook)) {
      const force = (water ? 120 + cfg.a * 14 : 170 + cfg.a * 28) * (p.grounded ? 0.75 : 1);
      const nx = p.x + g.dir * force * dt;
      if (!solidAt({ x: nx, y: p.y + 4, w: p.w, h: p.h - 8 })) p.x = clamp(nx, 0, WORLD_WIDTH - p.w);
    }
    // 風の線
    if (g.phase === "blow" && Math.random() < dt * 40) {
      S.streaks.push({ x: g.dir > 0 ? -40 : canvas.width + 40, y: Math.random() * canvas.height, v: (water ? 500 : 900) * g.dir, life: 1.4, len: 40 + Math.random() * 70 });
    }
    for (const s of S.streaks) { s.x += s.v * dt; s.life -= dt; }
    S.streaks = S.streaks.filter(s => s.life > 0);
  }

  // ---------- うずしお ----------
  function updateWhirls(dt, cfg) {
    const p = state.player;
    S.whirlT -= dt;
    if (S.whirlT <= 0 && S.whirls.length < 2) {
      S.whirlT = Math.max(3.5, 7 - cfg.a * 0.6);
      const x = p.x + p.w / 2 + (p.facing || 1) * (380 + Math.random() * 160);
      const y = clamp(p.y + (Math.random() - 0.5) * 200, viewTop() + 120, viewTop() + 420);
      S.whirls.push({ x, y, life: 6.5, spin: 0 });
    }
    for (const w of S.whirls) {
      w.life -= dt;
      w.spin += dt * 5;
      const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
      const d = Math.hypot(w.x - cx, w.y - cy);
      if (d < 240 && w.life > 0.4 && state.mode === "playing") {
        intro("whirl");
        if (guarded("whirl")) { if (d < 120) guardFx("whirl"); continue; }
        const pull = (1 - d / 240) * (160 + cfg.a * 12) * dt;
        const nx = p.x + (w.x - cx) / (d || 1) * pull;
        const ny = p.y + (w.y - cy) / (d || 1) * pull;
        if (!solidAt({ x: nx, y: ny, w: p.w, h: p.h })) { p.x = nx; p.y = ny; }
        if (d < 30) hurt();
      }
    }
    S.whirls = S.whirls.filter(w => w.life > 0);
  }

  function drawWhirls() {
    for (const w of S.whirls) {
      const fade = clamp(Math.min(w.life, 6.5 - w.life), 0, 1);
      ctx.save();
      ctx.translate(w.x, w.y);
      ctx.globalAlpha = 0.7 * fade;
      ctx.strokeStyle = "#bff8ff";
      ctx.lineWidth = 4;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        for (let a = 0; a < Math.PI * 4; a += 0.2) {
          const r = 8 + a * 15;
          ctx.lineTo(Math.cos(a + w.spin + i * 2.1) * r, Math.sin(a + w.spin + i * 2.1) * r * 0.8);
        }
        ctx.stroke();
      }
      ctx.fillStyle = "#2a5c8a";
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // ---------- レーザーゲート ----------
  function laserState(l) {
    const t = ((performance.now() / 1000 + l.phase) % l.period + l.period) % l.period;
    if (t < 1.3) return "on";
    if (t > l.period - 0.55) return "warn";
    return "off";
  }

  function updateLasers() {
    const p = state.player;
    for (const l of S.lasers) {
      const st = laserState(l);
      if (Math.abs(p.x + p.w / 2 - l.x) < 500) intro("laser");
      if (st === "on" && !l.wasOn && Math.abs(p.x - l.x) < 600) playSfx("switchOn", l.x);
      l.wasOn = st === "on";
      if (st === "on" && p.x < l.x + 9 && p.x + p.w > l.x - 9 && p.y < l.bottom && p.y + p.h > l.top) {
        if (guarded("laser")) guardFx("laser");
        else hurt();
      }
    }
  }

  function drawLasers() {
    const now = performance.now() / 1000;
    for (const l of S.lasers) {
      const st = laserState(l);
      // 上と下の機械
      ctx.fillStyle = "#5b5f86";
      ctx.strokeStyle = "#2c2650";
      ctx.lineWidth = 3;
      for (const y of [l.top - 10, l.bottom - 14]) {
        ctx.beginPath();
        ctx.roundRect(l.x - 18, y, 36, 24, 6);
        ctx.fill();
        ctx.stroke();
      }
      ctx.fillStyle = st === "off" ? "#7cf2a5" : "#ff4f7a";
      for (const y of [l.top + 2, l.bottom - 2]) {
        ctx.beginPath();
        ctx.arc(l.x, y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
      if (st === "warn") {
        ctx.globalAlpha = 0.25 + Math.abs(Math.sin(now * 30)) * 0.3;
        ctx.fillStyle = "#ff8db7";
        ctx.fillRect(l.x - 2, l.top + 14, 4, l.bottom - l.top - 28);
        ctx.globalAlpha = 1;
      } else if (st === "on") {
        const w = 12 + Math.sin(now * 40) * 3;
        ctx.globalAlpha = 0.45;
        ctx.fillStyle = "#ff4f7a";
        ctx.fillRect(l.x - w, l.top + 14, w * 2, l.bottom - l.top - 28);
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#fff0f6";
        ctx.fillRect(l.x - 3, l.top + 14, 6, l.bottom - l.top - 28);
      }
    }
  }

  // ---------- まいフレーム ----------
  function update(dt) {
    const cfg = active();
    if (owner !== state) reset(cfg);
    if (!cfg) return;
    if (on(cfg, "faller")) updateFallers(dt, cfg);
    if (on(cfg, "bubble")) updateBubbles(dt, cfg);
    if (on(cfg, "gust")) updateWind(dt, cfg, "gust");
    if (on(cfg, "current")) updateWind(dt, cfg, "current");
    if (on(cfg, "whirl")) updateWhirls(dt, cfg);
    if (on(cfg, "laser")) updateLasers();
    if (on(cfg, "dark")) updateDark(dt);
  }

  // ---------- まっ暗やみ ----------
  function updateDark(dt) {
    const p = state.player;
    if (state.mode === "playing") intro("dark");
    // 撃ったしゅんかん、光線銃のあかりがパッと広がる
    const n = state.beams.filter(b => b.owner === "player").length;
    if (n > S.beamN) S.flash = 1;
    S.beamN = n;
    S.flash = Math.max(0, S.flash - dt * 2.6);
    // ふわぴかランタンの光る玉：ぴょんぴーの頭の上を、ぷかぷか ついてくる
    const now = performance.now() / 1000;
    const tx = p.x + p.w / 2 - (p.facing || 1) * 18 + Math.sin(now * 1.7) * 8;
    const ty = p.y - 34 + Math.sin(now * 2.6) * 7;
    if (!S.orb) S.orb = { x: tx, y: ty };
    const k = 1 - Math.exp(-dt * 6);
    S.orb.x += (tx - S.orb.x) * k;
    S.orb.y += (ty - S.orb.y) * k;
    // しばらく進んだら、ヤナビスがランタンのことを教える（ステージごとに1回）
    if (state.mode === "playing") S.darkT += dt;
    if (!S.hinted && S.darkT > 8 && !has("lantern") && typeof Chat !== "undefined") {
      S.hinted = true;
      Chat.say(Shop.owns("lantern") ? DARK_HINT.wear : DARK_HINT.buy, false);
    }
  }

  // 世界の中（カメラの中）に描くもの
  function draw() {
    const cfg = active();
    if (!cfg || owner !== state || !S) return;
    ctx.save();
    drawLasers();
    drawWhirls();
    drawBubbles();
    drawFallers();
    ctx.restore();
  }

  // 画面の上にかぶせるもの（風の線・暗やみ・風の予告）
  function drawOverlay() {
    const cfg = active();
    if (!cfg || owner !== state || !S) return;
    ctx.save();
    const windy = on(cfg, "gust") || on(cfg, "current");
    if (windy) {
      const look = on(cfg, "current") ? "#bff8ff" : cfg.plan.gustLook === "snow" ? "#ffffff" : "#ffd9a0";
      ctx.strokeStyle = look;
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      for (const s of S.streaks) {
        ctx.globalAlpha = clamp(s.life, 0, 1) * 0.6;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x - Math.sign(s.v) * s.len, s.y);
        ctx.stroke();
      }
      if (S.gust.phase === "blow" && !on(cfg, "current")) {
        ctx.globalAlpha = 0.16;
        ctx.fillStyle = look;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      if (S.gust.phase === "warn") {
        // 風が来る向きを、画面のはしの矢印で知らせる
        const blink = Math.abs(Math.sin(performance.now() / 110));
        ctx.globalAlpha = 0.5 + blink * 0.5;
        ctx.fillStyle = look;
        ctx.strokeStyle = "rgba(44,38,80,0.8)";
        ctx.lineWidth = 4;
        const x = S.gust.dir > 0 ? 40 : canvas.width - 40;
        const y = canvas.height * 0.42;
        ctx.beginPath();
        ctx.moveTo(x + S.gust.dir * 34, y);
        ctx.lineTo(x - S.gust.dir * 10, y - 30);
        ctx.lineTo(x - S.gust.dir * 10, y + 30);
        ctx.closePath();
        ctx.stroke();
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  // まっ暗やみ：ふだんは何も見えない。見えるのは
  //   ・光線銃のほんのりしたあかり（撃つと一瞬広がる）・光る弾のまわり
  //   ・雷が落ちるときのまわり・落ちてくるものと、その印
  //   ・敵の光る目
  //   ・ふわぴかランタンをつけていれば、頭の上の光る玉のまわり（広い）
  function drawDark() {
    const cfg = active();
    if (!cfg || owner !== state || !S || !on(cfg, "dark")) return;
    const W = canvas.width;
    const H = canvas.height;
    darkCv ??= document.createElement("canvas");
    if (darkCv.width !== W || darkCv.height !== H) { darkCv.width = W; darkCv.height = H; }
    const d = darkCv.getContext("2d");
    const T = ctx.getTransform();
    d.setTransform(1, 0, 0, 1, 0, 0);
    d.globalCompositeOperation = "source-over";
    d.clearRect(0, 0, W, H);
    d.fillStyle = "rgba(6, 2, 18, 0.985)";
    d.fillRect(0, 0, W, H);
    d.setTransform(T);
    d.globalCompositeOperation = "destination-out";
    const light = (x, y, r, a = 1) => {
      const g = d.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(0,0,0,${a})`);
      g.addColorStop(0.5, `rgba(0,0,0,${a * 0.7})`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      d.fillStyle = g;
      d.beginPath();
      d.arc(x, y, r, 0, Math.PI * 2);
      d.fill();
    };
    const column = (x, top, bottom, w, a) => {
      const g = d.createLinearGradient(x - w, 0, x + w, 0);
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(0.5, `rgba(0,0,0,${a})`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      d.fillStyle = g;
      d.fillRect(x - w, top, w * 2, bottom - top);
    };
    const p = state.player;
    const px = p.x + p.w / 2;
    const py = p.y + p.h / 2;
    const lantern = has("lantern");
    if (lantern && S.orb) light(S.orb.x, S.orb.y + 40, Math.max(260, 440 - cfg.a * 22), 1);
    // 光線銃のあかり（銃がないときは、ぴょんぴーがやっと見えるくらい）
    const gun = hasEquippedWeapon();
    light(px + (gun ? (p.facing || 1) * 16 : 0), py, (gun ? 105 : 58) + S.flash * 230, gun ? 0.85 : 0.55);
    // 光る弾
    let count = 0;
    for (const b of state.beams) {
      if (++count > 48) break;
      light(b.x + b.w / 2, b.y + b.h / 2, b.bomb ? 150 : b.owner === "player" ? 80 : 60, 0.8);
    }
    // 雷：前ぶれでうすく、落ちたしゅんかんは まわりが大きく明るく
    const top = viewTop() - 40;
    for (const b of state.bolts ?? []) {
      if (b.t < 0) continue;
      if (b.t < BOLT_WARN) {
        const k = b.t / BOLT_WARN;
        column(b.x, top, b.landY, 40 + k * 50, 0.2 + k * 0.4);
        light(b.x, b.landY, 60 + k * 70, 0.35 + k * 0.45);
      } else {
        const fade = b.t < BOLT_WARN + BOLT_STRIKE ? 1 : clamp(1 - (b.t - BOLT_WARN - BOLT_STRIKE) / 0.25, 0, 1);
        column(b.x, top, b.landY, 380 * fade + 60, fade);
        light(b.x, b.landY, 420 * fade + 60, fade);
      }
    }
    // 落ちてくるもの（印と本体）
    for (const f of S.fallers) {
      if (f.landed) continue;
      light(f.x, f.land, 75, 0.75);
      if (f.t >= f.look.warn) { const pos = fallerPos(f); light(pos.x, pos.y, 110, 0.9); }
    }
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(darkCv, 0, 0);
    ctx.restore();
    drawEnemyEyes();
    if (lantern && S.orb) drawOrb(S.orb.x, S.orb.y);
  }

  // やみの中で光る、敵の目
  function drawEnemyEyes() {
    const now = performance.now() / 1000;
    const left = viewLeft() - 100;
    const right = viewLeft() + viewW() + 100;
    ctx.save();
    for (const e of state.enemies) {
      if (!e.alive || e.tutorialHidden || e.x + e.w < left || e.x > right) continue;
      // ときどき まばたき
      if (Math.sin(now * 1.1 + (e.x % 97)) > 0.985) continue;
      const f = e.facing ?? -1;
      const ex = e.x + e.w / 2 + f * e.w * 0.16;
      const ey = e.y + e.h * 0.34;
      const gap = Math.max(7, e.w * 0.14);
      const r = Math.max(3, Math.min(9, e.w * 0.055));
      const col = e.boss ? "#ff3d5a" : "#ffe36a";
      ctx.shadowColor = col;
      ctx.shadowBlur = 16;
      ctx.fillStyle = col;
      for (const sx of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(ex + sx * gap / 2, ey, r, r * 1.3, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#ffffff";
      for (const sx of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(ex + sx * gap / 2 + f * r * 0.3, ey - r * 0.3, r * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // ふわぴかランタンの光る玉
  function drawOrb(x, y) {
    const now = performance.now() / 1000;
    const pulse = 1 + Math.sin(now * 4) * 0.08;
    ctx.save();
    const halo = ctx.createRadialGradient(x, y, 0, x, y, 46 * pulse);
    halo.addColorStop(0, "rgba(255, 247, 194, 0.85)");
    halo.addColorStop(0.4, "rgba(255, 227, 106, 0.35)");
    halo.addColorStop(1, "rgba(255, 227, 106, 0)");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(x, y, 46 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = "#fff3a4";
    ctx.shadowBlur = 20;
    ctx.fillStyle = "#fffbe0";
    ctx.beginPath();
    ctx.arc(x, y, 13 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    // きらきら
    ctx.fillStyle = "#ffffff";
    for (let i = 0; i < 3; i++) {
      const a = now * 2 + i * 2.1;
      ctx.globalAlpha = 0.5 + Math.sin(now * 6 + i) * 0.4;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * 24, y + Math.sin(a) * 18, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  window.Hazards = { update, draw, drawDark, drawOverlay, riding: () => !!S?.riding };
})();

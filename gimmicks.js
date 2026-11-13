// gimmicks.js — たて方向のステージ生成（空ルート / のぼりステージ / 深い海）と
// ギミック（カギ・バリア扉・宝箱・スイッチと赤青ブロック・バネ）
// game.js より前に読み込む。game.js のグローバルは呼び出し時に参照する。
(() => {
  "use strict";

  const TAU = Math.PI * 2;
  // 山のぼりは 1-3 だけ（ほかのステージは、それぞれちがう通路）
  const CLIMB_AREAS = { 0: [2] };
  const CLIMB_BOTTOM = 1320;
  const UP = 112;
  const RED = "#ff7d9c";
  const BLUE = "#6fb8ff";
  const L = (ja, en) => (language === "ja" ? ja : en);
  const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  // 専用イラスト（assets/ に置けば自動で使う。なければ手描きの図形で表示）
  const SPRITE_FILES = {
    key: "gimmick-key", chestClosed: "gimmick-chest-closed", chestOpen: "gimmick-chest-open",
    switchRed: "gimmick-switch-red", switchBlue: "gimmick-switch-blue",
    blockRed: "gimmick-block-red", blockBlue: "gimmick-block-blue",
    spring: "gimmick-spring", door: "gimmick-door", goal: "gimmick-goal",
    poseHurt: "pyonpy-hurt", poseVictory: "pyonpy-victory", poseShoot: "pyonpy-shoot", poseSwim: "pyonpy-swim", swimSheet: "pyonpy-swim-6", crawlSheet: "pyonpy-crawl-6", poseCrawl: "pyonpy-crawl",
    poseShootUp: "pyonpy-shoot-up", poseShootUpFwd: "pyonpy-shoot-upfwd", poseShootDownFwd: "pyonpy-shoot-downfwd",
    poseAirShoot: "pyonpy-air-shoot", poseAirShootUp: "pyonpy-air-shoot-up", poseAirShootUpFwd: "pyonpy-air-shoot-upfwd",
    poseAirShootDownFwd: "pyonpy-air-shoot-downfwd", poseAirShootDown: "pyonpy-air-shoot-down"
  };

  // ねらう向きごとのポーズ。h = 絵（正方形）を描く大きさ、center = 絵の中で体の基準になる点、
  // hand = 絵の中のにぎりこぶしの位置（どちらも 0〜1。右向きの絵で測った値）
  const AIM_POSES = {
    ground: {
      fwd: { key: "poseShoot", h: 79, center: [0.5, 1], hand: [0.82, 0.5] },
      up: { key: "poseShootUp", h: 79, center: [0.5, 1], hand: [0.64, 0.15] },
      upfwd: { key: "poseShootUpFwd", h: 80, center: [0.5, 1], hand: [0.83, 0.32] },
      downfwd: { key: "poseShootDownFwd", h: 83, center: [0.5, 1], hand: [0.79, 0.78] }
    },
    air: {
      fwd: { key: "poseAirShoot", h: 94, center: [0.47, 0.53], hand: [0.8, 0.47] },
      up: { key: "poseAirShootUp", h: 88, center: [0.5, 0.53], hand: [0.63, 0.17] },
      upfwd: { key: "poseAirShootUpFwd", h: 85, center: [0.48, 0.5], hand: [0.82, 0.32] },
      downfwd: { key: "poseAirShootDownFwd", h: 88, center: [0.47, 0.52], hand: [0.78, 0.66] },
      down: { key: "poseAirShootDown", h: 87, center: [0.5, 0.5], hand: [0.53, 0.87] }
    }
  };

  function aimPoseFor(p) {
    if (!hasEquippedWeapon() || p.swimming) return null;
    const sin = Math.sin(p.aim ?? 0);
    const dir = sin < -0.9 ? "up" : sin < -0.3 ? "upfwd" : sin > 0.9 ? "down" : sin > 0.3 ? "downfwd" : "fwd";
    const active = state.gun.cooldown > 0 || dir !== "fwd";
    if (!active) return null;
    if (p.grounded) return Math.abs(p.vx) < 60 ? AIM_POSES.ground[dir] ?? null : null;
    return AIM_POSES.air[dir] ?? null;
  }

  // ポーズの絵を描いて、銃を持たせる手の位置を返す
  function drawAimPose(p, pose, im) {
    const f = p.facing < 0 ? -1 : 1;
    const cx = p.x + p.w / 2;
    const cy = pose.center[1] === 1 ? p.y + p.h + 6 : p.y + p.h * 0.5;
    const h = pose.h;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(f, 1);
    ctx.drawImage(im, -pose.center[0] * h, -pose.center[1] * h, h, h);
    ctx.restore();
    return { x: cx + f * (pose.hand[0] - pose.center[0]) * h, y: cy + (pose.hand[1] - pose.center[1]) * h };
  }
  const WORLD_KEYS = ["moon", "mars", "ice", "ocean", "factory", "demon"];
  // 地面に立てる街灯・塔などのかざり（fg-*）は、行き止まりや柱に見えるので使わない（読みこみもしない）
  const SHOW_PROPS = false;
  if (SHOW_PROPS) for (const w of WORLD_KEYS) {
    SPRITE_FILES[`fg_${w}_1`] = `fg-${w}-1`;
    SPRITE_FILES[`fg_${w}_2`] = `fg-${w}-2`;
  }
  const sprites = {};
  for (const [key, file] of Object.entries(SPRITE_FILES)) {
    const im = new Image();
    im.src = `assets/${file}.png`;
    sprites[key] = im;
  }
  const sprite = key => {
    const im = sprites[key];
    return im && im.complete && im.naturalWidth > 0 ? im : null;
  };
  // 足もと中央を (cx, bottom) に合わせて、高さ h で描く
  function drawStanding(im, cx, bottom, h, flip = false) {
    const w = h * (im.naturalWidth / im.naturalHeight);
    if (flip) {
      ctx.save();
      ctx.translate(cx, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(im, -w / 2, bottom - h, w, h);
      ctx.restore();
    } else {
      ctx.drawImage(im, cx - w / 2, bottom - h, w, h);
    }
  }

  function drawForeground() {
    if (!SHOW_PROPS) return;
    const world = courses[currentCourse]?.worldIndex ?? 0;
    const a = sprite(`fg_${WORLD_KEYS[world]}_1`);
    const b = sprite(`fg_${WORLD_KEYS[world]}_2`);
    if (!a && !b) return;
    const viewL = state.camera - 200;
    const viewR = state.camera + VIEW_W + 200;
    for (const spot of propSpots()) {
      if (spot.x > viewR || spot.x < viewL) continue;
      const im = (spot.seed % 2 ? a : b) || a || b;
      ctx.globalAlpha = 0.96;
      drawStanding(im, spot.x, spot.y, spot.h, spot.seed > 3);
      ctx.globalAlpha = 1;
    }
  }

  // 街灯などの置き場所。上に浮いた地面がかぶる場所には置かない（柱やかべに見えてしまうので）。
  // かぶるときは、その浮いた地面の上に置きなおす。置けなければ、なし
  const propCache = new WeakMap();
  function propSpots() {
    if (propCache.has(platforms)) return propCache.get(platforms);
    const solids = platforms.filter(q => !q.sky && !q.mover && q.h < 1000);
    const WIDTH = 60; // 街灯の横幅の半分くらい（よゆうをもって）
    const blockerAbove = (x, top, h, self) => solids.find(q => q !== self && q.y < top && q.y + q.h > top - h - 10 && x + WIDTH > q.x && x - WIDTH < q.x + q.w);
    const spots = [];
    for (const p of platforms) {
      if (p.sky || p.mover || p.w < 220) continue;
      if (!p.terrain && p.y < 430) continue;
      const count = Math.max(1, Math.floor(p.w / 420));
      for (let i = 0; i < count; i++) {
        const seed = Math.floor(p.x * 0.37 + i * 53) % 7;
        const h = 120 + seed * 9;
        const x = p.x + 60 + ((p.w - 120) * (i + 0.5)) / count + (seed - 3) * 14;
        const over = blockerAbove(x, p.y, h, p);
        if (!over) {
          spots.push({ x, y: p.y + 8, h, seed });
          continue;
        }
        // 上の浮いた地面の上へ（広さがあって、さらに上がふさがっていなければ）
        if (over.w < 120 || over.moving) continue;
        const ox = Math.min(Math.max(x, over.x + 50), over.x + over.w - 50);
        if (blockerAbove(ox, over.y, h, over)) continue;
        spots.push({ x: ox, y: over.y + 8, h, seed });
      }
    }
    propCache.set(platforms, spots);
    return spots;
  }

  // 横にコマが並んだシート画像を、透明なすき間で自動的にコマ分けする
  const sheetCache = new Map();
  function sheetFrames(im, count) {
    let frames = sheetCache.get(im);
    if (frames) return frames;
    const equal = () => Array.from({ length: count }, (_, i) => ({ x: (im.naturalWidth / count) * i, y: 0, w: im.naturalWidth / count, h: im.naturalHeight }));
    try {
      const c = document.createElement("canvas");
      const scale = Math.min(1, 1200 / im.naturalWidth);
      c.width = Math.round(im.naturalWidth * scale);
      c.height = Math.round(im.naturalHeight * scale);
      const g = c.getContext("2d", { willReadFrequently: true });
      g.drawImage(im, 0, 0, c.width, c.height);
      const data = g.getImageData(0, 0, c.width, c.height).data;
      const solid = (x, y) => data[(y * c.width + x) * 4 + 3] > 24;
      const runs = [];
      let start = -1;
      for (let x = 0; x <= c.width; x++) {
        let any = false;
        if (x < c.width) for (let y = 0; y < c.height; y += 2) if (solid(x, y)) { any = true; break; }
        if (any && start < 0) start = x;
        if (!any && start >= 0) {
          if (x - start > c.width * 0.03) runs.push([start, x]);
          start = -1;
        }
      }
      if (runs.length !== count) frames = equal();
      else {
        frames = runs.map(([x0, x1]) => {
          let top = c.height;
          let bottom = 0;
          for (let y = 0; y < c.height; y++) for (let x = x0; x < x1; x += 2) if (solid(x, y)) { top = Math.min(top, y); bottom = Math.max(bottom, y); break; }
          return { x: x0 / scale, y: top / scale, w: (x1 - x0) / scale, h: (bottom - top + 1) / scale };
        });
      }
    } catch (_) {
      frames = equal();
    }
    sheetCache.set(im, frames);
    return frames;
  }

  function drawSwimSheet(p, im) {
    const frames = sheetFrames(im, 6);
    const moving = Math.hypot(p.vx, p.vy) > 40;
    const f = frames[Math.floor(FX.S.time * (moving ? 11 : 5)) % frames.length];
    const maxW = Math.max(...frames.map(fr => fr.w));
    // 泳ぐ絵は横長なので、立っているとき（高さ約80）と同じくらいに見える 84 に（104 では大きすぎた）
    const s = 84 / maxW;
    const w = f.w * s;
    const h = f.h * s;
    const cx = p.x + p.w / 2;
    const cy = p.y + p.h / 2;
    ctx.save();
    ctx.translate(cx, cy);
    if (p.facing < 0) ctx.scale(-1, 1);
    ctx.rotate(p.swimTilt ?? Math.max(-0.5, Math.min(0.5, (p.vy / 330) * 0.45)));
    ctx.drawImage(im, f.x, f.y, f.w, f.h, -w / 2, -h / 2, w, h);
    ctx.restore();
  }

  // しゃがみ・ほふく前進：泳ぎの絵（はらばい）を、地面にふせて描く
  function drawCrawl(p, im, borrowed = false) {
    const frames = sheetFrames(im, 6);
    const moving = Math.abs(p.vx) > 20;
    const f = frames[moving ? Math.floor(FX.S.time * 5) % frames.length : 0];
    const maxW = Math.max(...frames.map(fr => fr.w));
    const s = 74 / maxW;
    const w = f.w * s;
    const h = f.h * s;
    ctx.save();
    if (borrowed) {
      // 泳ぎの絵を借りているあいだは、体を水平にたおして、少しつぶして地面にぺたっとつける
      ctx.translate(p.x + p.w / 2, p.y + p.h + 4 - h * 0.3);
      if (p.facing < 0) ctx.scale(-1, 1);
      ctx.rotate(0.3);
      ctx.scale(1, 0.82);
    } else {
      ctx.translate(p.x + p.w / 2, p.y + p.h + 6 - h / 2);
      if (p.facing < 0) ctx.scale(-1, 1);
    }
    ctx.drawImage(im, f.x, f.y, f.w, f.h, -w / 2, -h / 2, w, h);
    ctx.restore();
  }

  // ぴょんぴーの追加ポーズ。該当する絵があれば描いて true を返す
  function drawPlayerPose(p) {
    if (p.crouch && state.mode === "playing") {
      // ほふく前進の絵があれば使う。動いていないときは1枚絵、なければ泳ぎの絵で代用
      const moving = Math.abs(p.vx) > 30;
      if (!moving && sprite("poseCrawl")) {
        const im = sprite("poseCrawl");
        drawStanding(im, p.x + p.w / 2, p.y + p.h + 4, 84 * (im.naturalHeight / im.naturalWidth), p.facing < 0);
        return { key: "crawl", gun: null, crawl: true };
      }
      const sheet = sprite("crawlSheet") || sprite("swimSheet");
      if (sheet) {
        drawCrawl(p, sheet, !sprite("crawlSheet"));
        return { key: "crawl", gun: null, crawl: true };
      }
    }
    if (p.swimming && state.mode !== "stageClear" && !(p.invincible > 0.55 && sprite("poseHurt")) && sprite("swimSheet")) {
      drawSwimSheet(p, sprite("swimSheet"));
      return true;
    }
    let key = null;
    if (state.mode === "stageClear") key = "poseVictory";
    else if (p.invincible > 0.55 && state.mode === "playing") key = "poseHurt";
    else if (p.swimming) key = "poseSwim";
    if (!key && state.mode !== "respawning") {
      const pose = aimPoseFor(p);
      const poseIm = pose && sprite(pose.key);
      if (poseIm) return { key: pose.key, gun: drawAimPose(p, pose, poseIm) };
    }
    const im = key && sprite(key);
    if (!im) return false;
    // どのポーズも、待機のぴょんぴー（体の高さ約77）と同じ大きさに見えるように
    drawStanding(im, p.x + p.w / 2, p.y + p.h + 6, key === "poseSwim" ? 84 : 79, p.facing < 0);
    return { key, gun: null };
  }

  const phaseBlock = (x, y, w, h, phase) => ({ x, y, w, h, phase, broken: false });
  const switchBox = (x, y) => ({ x, y, w: 48, h: 48, switchBox: true, broken: false });
  const column = (x, y, w) => ({ x, y, w, h: CLIMB_BOTTOM - y, terrain: true });

  function isClimbArea(worldIndex, areaIndex) {
    return (CLIMB_AREAS[worldIndex] ?? []).includes(areaIndex);
  }

  // ---------- のぼりステージ：山をのぼって谷へおりる ----------
  function buildClimb(worldIndex, areaIndex) {
    const seed = worldIndex * 7 + areaIndex * 3;
    const cols = [column(0, GROUND_Y, 620)];
    let x = 620;
    let y = GROUND_Y;
    const push = (w, dy) => {
      y += dy;
      cols.push(column(x, y, w));
      x += w;
    };
    for (let i = 0; i < 8; i++) push(164 + ((seed + i * 5) % 4) * 14, i === 4 && seed % 2 ? 0 : -UP);
    push(360, 0);
    const drop = Math.round((940 - y) / 3);
    push(210, drop);
    push(210, drop);
    push(480, 940 - y);
    for (let i = 0; i < 4; i++) push(176, -UP);
    cols.push(column(x, GROUND_Y, WORLD_WIDTH - x));
    return { platforms: cols, meta: { plateau: 9, valley: 12, exit: 13, end: cols.length - 1 } };
  }

  function setupClimb(course) {
    const lv = course.level;
    const platforms = course.platforms;
    const m = course.climbMeta;
    course.top = -1100;
    course.bottom = CLIMB_BOTTOM;
    const colAt = cx => platforms.find(p => p.terrain && cx >= p.x && cx < p.x + p.w) ?? platforms[0];
    for (const b of course.blocks) {
      const c = colAt(b.x + 24);
      b.x = clamp(b.x, c.x + 24, Math.max(c.x + 24, c.x + c.w - 72));
      b.y += c.y - GROUND_Y;
    }
    for (const c of lv.coins) c.y += colAt(c.x).y - GROUND_Y;
    for (const s of lv.starItems ?? []) s.y += colAt(s.x).y - GROUND_Y;
    for (const g of lv.lavaGeysers ?? []) {
      const c = colAt(g.x + 36);
      g.h = 190;
      g.baseY = c.y + 28;
    }
    // 谷のパズル：スイッチONで赤いオリが消えてカギが取れるが、青いカベが出口をふさぐ
    const V = platforms[m.valley];
    const exit = platforms[m.exit];
    const end = platforms[m.end];
    const floor = V.y;
    const kx = V.x + 70;
    course.blocks = course.blocks.filter(b => b.x + 48 < V.x - 10 || b.x > exit.x + exit.w);
    course.blocks.push(
      switchBox(V.x + V.w / 2 - 24, floor - 152),
      phaseBlock(kx - 48, floor - 48, 48, 48, 0),
      phaseBlock(kx + 48, floor - 48, 48, 48, 0),
      phaseBlock(kx - 48, floor - 96, 144, 48, 0),
      phaseBlock(exit.x + 64, exit.y - 540, 48, 540, 1),
      { x: end.x + 170, y: course.top - 400, w: 44, h: GROUND_Y - (course.top - 400), door: true, broken: false }
    );
    lv.keys.push({ x: kx + 24, y: floor - 24 });
    lv.springs.push({ x: V.x + V.w - 96, y: floor - 22, w: 60, h: 22, power: 1150 });
    for (const e of lv.enemies) {
      if (e.x + e.w > kx - 70 && e.x < kx + 120) e.x = V.x + 250;
    }
    course.puzzle = "valley";
  }

  // ---------- 空ルート：階段 → 空の足場 → ごほうび ----------
  function solidBounds(s) {
    const m = s.mover;
    if (!m) return s;
    return m.axis === "x"
      ? { x: s.x - m.range, y: s.y, w: s.w + m.range * 2, h: s.h }
      : { x: s.x, y: s.y - m.range, w: s.w, h: s.h + m.range * 2 };
  }

  function blocked(r, solids, headroom = 64) {
    const zone = { x: r.x - 8, y: r.y - headroom, w: r.w + 16, h: r.h + headroom };
    return solids.some(s => overlap(zone, solidBounds(s)));
  }

  function setupSky(course) {
    const lv = course.level;
    const idx = STAGE_START_INDICES[course.worldIndex] + course.areaIndex;
    const puzzle = idx % 3 === 1;
    const hard = () => course.platforms.concat(course.blocks.filter(b => !b.breakable));
    const RISE = 116;
    const RUN = 124;
    const STEP_W = 104;
    const N = 6;
    const LANES = 4;
    const LANE_W = 230;
    const GAP = 118;
    const span = RUN * (N - 1) + STEP_W + GAP + LANES * (LANE_W + GAP);
    const bases = course.platforms.filter(p => !p.mover && !p.sky && !p.conveyor && p.w >= 200 && p.y >= 250 && p.y <= GROUND_Y && p.x + p.w >= 520 && p.x <= 2400);
    const cands = [];
    for (const b of bases) {
      cands.push([b, Math.max(b.x + 150, 520)]);
      cands.push([b, b.x + b.w - 100]);
    }
    for (let attempt = 0; attempt < cands.length; attempt++) {
      const [base, x0] = cands[(attempt + idx) % cands.length];
      if (x0 + span > 4300 || x0 < 480) continue;
      const steps = [];
      for (let i = 1; i <= N; i++) steps.push({ x: x0 + (i - 1) * RUN, y: base.y - RISE * i, w: STEP_W, h: 28, sky: true });
      const laneY = base.y - RISE * N;
      const lanes = [];
      let lx = x0 + (N - 1) * RUN + STEP_W + GAP;
      for (let k = 0; k < LANES; k++) {
        lanes.push({ x: lx, y: laneY + [0, -44, 26, -30][k % 4], w: LANE_W, h: 30, sky: true });
        lx += LANE_W + GAP;
      }
      const solids = hard();
      let downs = [];
      if (!puzzle) for (let k = 1; k < N; k++) downs.push({ x: lx + (k - 1) * RUN, y: laneY + RISE * k, w: STEP_W, h: 28, sky: true });
      const extras = puzzle ? [switchBox(x0 - 104, base.y - 152), switchBox(lanes[0].x + 150, lanes[0].y - 152)] : [];
      if (steps.concat(lanes).some(r => blocked(r, solids)) || extras.some(r => blocked(r, solids, 8))) continue;
      downs = downs.filter(r => r.x + r.w < 4330 && !blocked(r, solids));
      const all = steps.concat(lanes, downs);
      // じゃまになるアイテムブロックはどかす
      course.blocks = course.blocks.filter(b => !b.breakable || !all.concat(extras).some(r => overlap({ x: r.x - 8, y: r.y - 64, w: r.w + 16, h: r.h + 64 }, b)));

      if (puzzle) {
        // 青い階段（スイッチON）と赤い橋（スイッチOFF）
        course.platforms.push(...steps.slice(2), lanes[0], lanes[1], lanes[3]);
        course.blocks.push(
          phaseBlock(steps[0].x, steps[0].y, STEP_W, 28, 1),
          phaseBlock(steps[1].x, steps[1].y, STEP_W, 28, 1),
          phaseBlock(lanes[2].x, lanes[2].y, LANE_W, 30, 0),
          ...extras
        );
        course.puzzle = "sky";
      } else {
        course.platforms.push(...all);
      }
      steps.forEach((s, i) => lv.coins.push(coin(s.x + s.w / 2, s.y - 44, i % 2 ? "pea" : "kaki")));
      lanes.forEach((l, k) => {
        for (let c = 0; c < 3; c++) lv.coins.push(coin(l.x + 50 + c * 64, l.y - 46 - (c === 1 ? 26 : 0), (k + c) % 2 ? "pea" : "kaki"));
      });
      const last = lanes[LANES - 1];
      const stars = lv.starItems ?? [];
      if (stars.length >= 2) {
        stars[1].x = lanes[1].x + lanes[1].w / 2;
        stars[1].y = lanes[1].y - 74;
      }
      lv.keys.push({ x: last.x + last.w / 2, y: last.y - 40 });
      course.blocks.push(breakable(lanes[1].x + 30, lanes[1].y - 150, "power"));
      if (!puzzle) course.blocks.push(breakable(lanes[2].x + 92, lanes[2].y - 150, idx % 2 ? "hp" : "power"));
      if (course.difficulty >= 4 && !puzzle) {
        const l = lanes[2];
        const foe = enemy(l.x + 130, l.y - 42, l.x + 6, l.x + l.w - 6);
        foe.enemyKind = course.worldIndex;
        lv.enemies.push(foe);
      }
      course.top = Math.min(course.top, laneY - 560);
      placeChest(course);
      placeSpring(course, base, x0);
      return true;
    }
    return false;
  }

  function placeChest(course) {
    const lv = course.level;
    const f = lv.flag;
    const grounds = course.platforms.filter(p => !p.mover && !p.sky && Math.abs(p.y - GROUND_Y) < 2);
    const flagGround = grounds.find(p => f.x >= p.x && f.x <= p.x + p.w);
    let cx;
    let cy;
    if (flagGround && f.x - flagGround.x >= 320) {
      cx = f.x - 250;
      cy = flagGround.y - 46;
    } else {
      const wide = grounds.filter(p => p.x > 2400 && p.w >= 240 && p !== flagGround).sort((a, b) => b.w - a.w)[0];
      if (!wide) return;
      cx = wide.x + wide.w / 2 - 29;
      cy = wide.y - 46;
    }
    const chest = { x: cx, y: cy, w: 58, h: 46 };
    if (course.blocks.some(b => overlap(chest, b))) chest.x -= 70;
    lv.chests.push(chest);
  }

  function placeSpring(course, base, x0) {
    const sx = Math.max(base.x + 24, x0 - 330);
    if (sx + 60 > x0 - 120) return;
    const corridor = { x: sx - 6, y: base.y - 470, w: 72, h: 468 };
    if (course.platforms.concat(course.blocks).some(s => s !== base && overlap(corridor, solidBounds(s)))) return;
    course.level.springs.push({ x: sx, y: base.y - 22, w: 60, h: 22, power: 1120 });
    for (let i = 0; i < 4; i++) course.level.coins.push(coin(sx + 30, base.y - 190 - i * 56, i % 2 ? "pea" : "kaki"));
  }

  // ---------- 深い海 ----------
  function deepenOcean(course) {
    const lv = course.level;
    course.bottom = 1080;
    lv.enemies.forEach((e, i) => {
      if (!e.boss) e.y = 170 + ((i * 197 + course.difficulty * 53) % 760);
    });
    lv.coins.forEach((c, i) => {
      c.y = 150 + ((i * 233 + 90) % 800);
    });
    (lv.starItems ?? []).forEach((s, i) => {
      s.y = [830, 300, 900][i % 3];
    });
    if (lv.oxygenItems?.length) lv.oxygenItems.push(oxygenItem(1400, 640), oxygenItem(2800, 780), oxygenItem(4300, 560));
  }

  function finalize(course) {
    const lv = course.level;
    lv.keys = [];
    lv.springs = [];
    lv.chests = [];
    course.puzzle = null;
    course.top = course.bossStage ? -160 : 0;
    course.bottom = canvas.height;
    if (course.finalStage) return course;
    if (course.trait === "underwater") {
      deepenOcean(course);
      return course;
    }
    if (course.bossStage) return course;
    if (course.climbStage) setupClimb(course);
    // 区間をつないだ通路には、どれも同じ形になる「空のルート」は足さない
    else if (!course.chunky) setupSky(course);
    return course;
  }

  // ---------- ランタイム ----------
  function hint(x, y) {
    if ((state.gimmickHint ?? 0) > 0) return;
    state.gimmickHint = 2.6;
    FX.floater(x, y, L("カギが ひつよう！", "You need a key!"), { color: "#ffffff", stroke: "#ff5f9e", size: 22, life: 1.3 });
    playSfx("locked", x);
    Chat.event("needKey");
  }

  function hitSwitch(box) {
    if ((state.switchCooldown ?? 0) > 0) return;
    state.switchCooldown = 0.45;
    state.switchOn = !state.switchOn;
    box.bump = 1;
    const color = state.switchOn ? BLUE : RED;
    for (const b of blocks) {
      if (b.phase === undefined) continue;
      const solid = state.switchOn ? b.phase === 1 : b.phase === 0;
      if (!solid) {
        if (!b.broken) FX.radial(b.x + b.w / 2, b.y + Math.min(b.h, 60) / 2, 6, { type: "star", speed: [60, 200], life: [0.3, 0.55], r: [4, 7], colors: [b.phase ? BLUE : RED, "#ffffff"], spin: 8 });
        b.broken = true;
        b.pendingSolid = false;
      } else if (b.broken) {
        if (overlap(state.player, b) || state.enemies.some(e => e.alive && overlap(e, b))) b.pendingSolid = true;
        else {
          b.broken = false;
          b.appear = 1;
        }
      }
    }
    playSfx("switch", box.x);
    FX.flash(color, 0.16, 0.22);
    FX.shake(0.12);
    FX.add({ type: "ring", x: box.x + 24, y: box.y + 24, r: 12, grow: 420, w: 7, life: 0.4, color });
    Chat.event("switchUsed");
  }

  function update(dt) {
    const p = state.player;
    state.switchCooldown = Math.max(0, (state.switchCooldown ?? 0) - dt);
    state.gimmickHint = Math.max(0, (state.gimmickHint ?? 0) - dt);
    for (const k of state.keyItems ?? []) {
      if (k.taken) continue;
      if (p.x < k.x + 18 && p.x + p.w > k.x - 18 && p.y < k.y + 18 && p.y + p.h > k.y - 18) {
        k.taken = true;
        state.keys = (state.keys ?? 0) + 1;
        state.score += 30;
        playSfx("keyGet", k.x);
        FX.weaponGet(k.x, k.y, L("カギ ゲット！", "KEY GET!"), true);
        Chat.event("keyGet");
      }
    }
    for (const s of state.springs ?? []) {
      s.squish = Math.max(0, (s.squish ?? 0) - dt * 3);
      const feet = p.y + p.h;
      if (p.vy >= 0 && p.x + p.w > s.x + 4 && p.x < s.x + s.w - 4 && feet >= s.y && feet <= s.y + s.h + 14) {
        p.y = s.y - p.h;
        p.vy = -s.power;
        p.grounded = false;
        p.jumpHeld = false;
        p.coyote = 0;
        s.squish = 1;
        playSfx("spring", s.x);
        FX.squash(0.7, 1.36);
        FX.add({ type: "ring", x: s.x + s.w / 2, y: s.y, r: 10, grow: 300, w: 6, life: 0.3, color: "#fff3a4" });
        FX.radial(s.x + s.w / 2, s.y, 6, { type: "star", speed: [80, 240], life: [0.3, 0.55], r: [4, 7], colors: FX.GOLD, vy: -120, spin: 8 });
      }
    }
    for (const c of state.chests ?? []) {
      if (c.opened || !overlap(p, c)) continue;
      if ((state.keys ?? 0) > 0) {
        state.keys -= 1;
        c.opened = true;
        c.openT = 0;
        const cx = c.x + c.w / 2;
        const world = courses[currentCourse]?.worldIndex ?? 0;
        state.score += 300;
        state.lives = Math.min(MAX_LIVES, state.lives + 1);
        spawnWeaponDrop(cx - 20, c.y - 10, Math.min(MAX_WEAPON_POWER, 2 + world));
        spawnWeaponDrop(cx + 20, c.y - 10, Math.min(MAX_WEAPON_POWER, 1 + world));
        playSfx("unlock", cx);
        FX.starGet(cx, c.y);
        FX.floater(cx, c.y - 64, "+300", { size: 24, color: "#fff3a4", stroke: "#d98a2b", life: 1.2 });
        FX.radial(cx, c.y, 16, { type: "confetti", speed: [140, 420], life: [0.8, 1.4], r: [4, 7], colors: FX.PASTEL, g: 620, spin: 9, vy: -260 });
        Chat.event("chestOpen");
      } else {
        hint(c.x + c.w / 2, c.y - 30);
      }
    }
    for (const b of blocks) {
      if (b.bump) b.bump = Math.max(0, b.bump - dt * 5);
      if (b.appear) b.appear = Math.max(0, b.appear - dt * 4);
      if (b.pendingSolid && !overlap(p, b) && !state.enemies.some(e => e.alive && overlap(e, b))) {
        b.pendingSolid = false;
        b.broken = false;
        b.appear = 1;
      }
      if (b.door && !b.broken) {
        const near = p.x + p.w > b.x - 12 && p.x < b.x + b.w + 12;
        if (!near) continue;
        if ((state.keys ?? 0) > 0) {
          state.keys -= 1;
          b.broken = true;
          playSfx("unlock", b.x);
          const y = p.y + p.h / 2;
          FX.explosion(b.x + b.w / 2, y, 110, ["#ffffff", "#9ee8ff", "#fff3a4"]);
          FX.flash("#c9f6ff", 0.3, 0.3);
          FX.shake(0.4);
          FX.floater(b.x + b.w / 2, y - 80, "OPEN!", { size: 30, color: "#c9f6ff", stroke: "#3f62c8", life: 1.3 });
          Chat.event("doorOpen");
        } else {
          hint(b.x + b.w / 2, p.y - 20);
        }
      }
      if (b.switchBox && !flagsHint.switch && Math.abs(b.x - p.x) < 300 && Math.abs(b.y - p.y) < 260) {
        flagsHint.switch = true;
        Chat.event("switchHint");
      }
    }
  }
  const flagsHint = {};

  // ---------- 描画 ----------
  function tile(x, y, w, h, color, alpha, ghost) {
    const art = sprite(color === BLUE ? "blockBlue" : "blockRed");
    if (art) {
      ctx.save();
      ctx.globalAlpha = ghost ? 0.28 : alpha;
      ctx.drawImage(art, x, y, w, h);
      ctx.restore();
      return;
    }
    ctx.save();
    ctx.globalAlpha = alpha;
    if (ghost) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.setLineDash([9, 7]);
      ctx.lineDashOffset = -FX.S.time * 22;
      ctx.beginPath();
      ctx.roundRect(x + 3, y + 3, w - 6, h - 6, 8);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = color;
      ctx.globalAlpha = alpha * 0.14;
      ctx.fill();
    } else {
      const grad = ctx.createLinearGradient(0, y, 0, y + h);
      grad.addColorStop(0, "#ffffff");
      grad.addColorStop(0.22, color);
      grad.addColorStop(1, color);
      ctx.fillStyle = grad;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(x + 1.5, y + 1.5, w - 3, h - 3, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) * 0.17, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawBlock(b) {
    if (b.phase !== undefined) {
      const color = b.phase ? BLUE : RED;
      const ghost = b.broken;
      const horizontal = b.w >= b.h;
      const len = horizontal ? b.w : b.h;
      const n = Math.max(1, Math.round(len / 48));
      const size = len / n;
      const camTop = (state.cameraY ?? 0) - 60;
      const camBottom = (state.cameraY ?? 0) + VIEW_H + 60;
      const pop = b.appear ? 1 + b.appear * 0.12 : 1;
      for (let i = 0; i < n; i++) {
        const x = horizontal ? b.x + i * size : b.x;
        const y = horizontal ? b.y : b.y + i * size;
        if (y > camBottom || y + size < camTop) continue;
        const w = horizontal ? size : b.w;
        const h = horizontal ? b.h : size;
        if (pop !== 1) {
          ctx.save();
          ctx.translate(x + w / 2, y + h / 2);
          ctx.scale(pop, pop);
          tile(-w / 2, -h / 2, w, h, color, 1, false);
          ctx.restore();
        } else {
          tile(x, y, w, h, color, ghost ? 0.5 : 1, ghost);
        }
      }
      return true;
    }
    if (b.switchBox) {
      const color = state.switchOn ? BLUE : RED;
      const lift = (b.bump ?? 0) * 10;
      const swArt = sprite(state.switchOn ? "switchBlue" : "switchRed");
      if (swArt) {
        ctx.drawImage(swArt, b.x - 6, b.y - 6 - lift, 60, 60);
        return true;
      }
      ctx.save();
      ctx.translate(b.x + 24, b.y + 24 - lift);
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.5 + Math.sin(FX.S.time * 4) * 0.15;
      ctx.drawImage(FX.glowSprite(color), -52, -52, 104, 104);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#fffdf4";
      ctx.strokeStyle = color;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.roundRect(-22, -22, 44, 44, 10);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.rotate(Math.sin(FX.S.time * 3) * 0.12);
      FX.starPath(15, 5, 0.5);
      ctx.fill();
      ctx.restore();
      return true;
    }
    if (b.door) {
      if (b.broken) return true;
      const top = Math.max(b.y, (state.cameraY ?? 0) - 40);
      const bottom = b.y + b.h;
      const t = FX.S.time;
      const doorArt = sprite("door");
      if (doorArt) {
        const w = 76;
        const h = w * (doorArt.naturalHeight / doorArt.naturalWidth);
        for (let y = bottom - h; y + h > top; y -= h) ctx.drawImage(doorArt, b.x + b.w / 2 - w / 2, y, w, h);
        return true;
      }
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.55;
      ctx.drawImage(FX.glowSprite("#9ee8ff"), b.x - 50, top, b.w + 100, bottom - top);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 0.86;
      const grad = ctx.createLinearGradient(b.x, 0, b.x + b.w, 0);
      grad.addColorStop(0, "rgba(158, 232, 255, 0.35)");
      grad.addColorStop(0.5, "rgba(255, 255, 255, 0.95)");
      grad.addColorStop(1, "rgba(200, 178, 255, 0.35)");
      ctx.fillStyle = grad;
      ctx.fillRect(b.x, top, b.w, bottom - top);
      ctx.strokeStyle = "rgba(127, 103, 200, 0.8)";
      ctx.lineWidth = 3;
      ctx.setLineDash([18, 14]);
      ctx.lineDashOffset = t * 60;
      ctx.beginPath();
      ctx.moveTo(b.x + b.w / 2, top);
      ctx.lineTo(b.x + b.w / 2, bottom);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      // 錠前
      const ly = bottom - 96 + Math.sin(t * 3) * 4;
      const lx = b.x + b.w / 2;
      ctx.fillStyle = "#ffd85a";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(lx - 24, ly - 14, 48, 40, 9);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "#ffd85a";
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.arc(lx, ly - 16, 14, Math.PI, TAU);
      ctx.stroke();
      ctx.fillStyle = "#8a5a1c";
      ctx.beginPath();
      ctx.arc(lx, ly + 2, 6, 0, TAU);
      ctx.fill();
      ctx.fillRect(lx - 2.5, ly + 4, 5, 12);
      ctx.restore();
      return true;
    }
    return false;
  }

  function drawKeyShape(x, y, s = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.fillStyle = "#ffd85a";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.arc(-8, 0, 9, 0, TAU);
    ctx.moveTo(0, -3.5);
    ctx.lineTo(19, -3.5);
    ctx.lineTo(19, 8);
    ctx.lineTo(14, 8);
    ctx.lineTo(14, 3.5);
    ctx.lineTo(10, 3.5);
    ctx.lineTo(10, 7);
    ctx.lineTo(5.5, 7);
    ctx.lineTo(5.5, 3.5);
    ctx.lineTo(0, 3.5);
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
    ctx.fillStyle = "#b47a1e";
    ctx.beginPath();
    ctx.arc(-9, 0, 3.4, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawEntities() {
    const t = FX.S.time;
    for (const s of state.springs ?? []) {
      const springArt = sprite("spring");
      if (springArt) {
        const k = 1 + Math.sin((s.squish ?? 0) * Math.PI) * 0.35;
        const h = 58 * k;
        const w = 72;
        ctx.drawImage(springArt, s.x + s.w / 2 - w / 2, s.y + s.h - h, w, h);
        continue;
      }
      const sq = s.squish ?? 0;
      const top = s.y - sq * -10 - (sq > 0.5 ? (1 - sq) * 28 : sq * 28) + 0;
      const padY = s.y + (sq > 0 ? Math.sin(sq * Math.PI) * -16 : 0);
      ctx.save();
      ctx.strokeStyle = "#8f7fc8";
      ctx.lineWidth = 4;
      ctx.beginPath();
      const baseY = s.y + s.h;
      for (let i = 0; i <= 6; i++) {
        const yy = baseY - ((baseY - padY - 8) * i) / 6;
        const xx = s.x + s.w / 2 + (i % 2 ? 14 : -14);
        if (i === 0) ctx.moveTo(xx, yy);
        else ctx.lineTo(xx, yy);
      }
      ctx.stroke();
      ctx.fillStyle = "#ff8db7";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(s.x, padY, s.w, 11, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#fff3a4";
      ctx.beginPath();
      ctx.moveTo(s.x + s.w / 2, padY - 22 - Math.sin(t * 5) * 4);
      ctx.lineTo(s.x + s.w / 2 - 9, padY - 9 - Math.sin(t * 5) * 4);
      ctx.lineTo(s.x + s.w / 2 + 9, padY - 9 - Math.sin(t * 5) * 4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      void top;
    }
    for (const c of state.chests ?? []) {
      if (c.opened) c.openT = (c.openT ?? 0) + 1 / 60;
      const chestArt = sprite(c.opened ? "chestOpen" : "chestClosed");
      if (chestArt) {
        drawStanding(chestArt, c.x + c.w / 2, c.y + c.h + 4, c.opened ? 78 : 70);
        continue;
      }
      const lid = c.opened ? Math.min(1, (c.openT ?? 0) * 4) : 0;
      ctx.save();
      ctx.translate(c.x + c.w / 2, c.y + c.h);
      if (!c.opened) {
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = 0.45 + Math.sin(t * 3) * 0.15;
        ctx.drawImage(FX.glowSprite("#ffd85a"), -60, -84, 120, 100);
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = "#b07cd8";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(-27, -28, 54, 28, 5);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#ffd85a";
      ctx.fillRect(-27, -17, 54, 5);
      ctx.save();
      ctx.translate(-27, -28);
      ctx.rotate(-lid * 1.15);
      ctx.fillStyle = "#c79aee";
      ctx.beginPath();
      ctx.roundRect(0, -18, 54, 20, [12, 12, 2, 2]);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#ffd85a";
      ctx.fillRect(22, -18, 10, 20);
      ctx.restore();
      if (!c.opened) {
        ctx.fillStyle = "#fff3a4";
        ctx.strokeStyle = "#8a5a1c";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-7, -24, 14, 13, 3);
        ctx.fill();
        ctx.stroke();
        drawKeyShape(-4, -62 + Math.sin(t * 3.2) * 4, 0.9);
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#7f67c8";
        ctx.lineWidth = 4;
        ctx.font = `900 15px ${FX.FONT}`;
        ctx.textAlign = "center";
        ctx.lineJoin = "round";
        ctx.strokeText("?", 22, -56 + Math.sin(t * 3.2) * 4);
        ctx.fillText("?", 22, -56 + Math.sin(t * 3.2) * 4);
      }
      ctx.restore();
    }
    for (const k of state.keyItems ?? []) {
      if (k.taken) continue;
      const y = k.y + Math.sin(t * 4 + k.x) * 4;
      const keyArt = sprite("key");
      if (keyArt) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = 0.5;
        ctx.drawImage(FX.glowSprite("#ffd85a"), k.x - 36, y - 36, 72, 72);
        ctx.restore();
        ctx.drawImage(keyArt, k.x - 24, y - 24, 48, 48);
        continue;
      }
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.6 + Math.sin(t * 5) * 0.2;
      ctx.drawImage(FX.glowSprite("#ffd85a"), k.x - 34, y - 34, 68, 68);
      ctx.restore();
      drawKeyShape(k.x - 4, y, 1.15);
    }
  }

  function drawHud() {
    const n = state.keys ?? 0;
    const has = (state.keyItems ?? []).length > 0;
    if (!n && !has) return;
    ctx.save();
    ctx.fillStyle = "rgba(255, 255, 255, 0.78)";
    ctx.strokeStyle = "rgba(139, 106, 201, 0.72)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(14, 90, 96, 40, 8);
    ctx.fill();
    ctx.stroke();
    ctx.globalAlpha = n ? 1 : 0.4;
    drawKeyShape(40, 110, 1);
    ctx.globalAlpha = 1;
    ctx.fillStyle = n ? "#d98a2b" : "#9a8fc0";
    ctx.font = `900 20px ${FX.FONT}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(`× ${n}`, 66, 111);
    ctx.restore();
  }

  function resetStage() {
    flagsHint.switch = false;
  }

  window.Gimmick = {
    propSpots,
    CLIMB_BOTTOM, isClimbArea, buildClimb, finalize,
    update, hitSwitch, drawBlock, drawEntities, drawHud, drawKeyShape, resetStage,
    sprite, drawForeground, drawPlayerPose
  };
})();

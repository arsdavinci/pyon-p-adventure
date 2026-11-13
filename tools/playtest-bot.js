// tools/playtest-bot.js — 開発用：ステージを自動で歩いて「ゴール（出口の扉・旗）まで行けるか」を調べる
// プレビューで読みこんで、PlaytestBot.checkStage(i) / PlaytestBot.checkAll() を呼ぶ。ゲーム本体からは読みこまない。
// ゲームの本物の updatePlayer（重力・ジャンプ・当たり判定）を使って、立てる場所から いろいろな動きをためし、
// たどりつける場所を広げていく（幅優先さがし）。敵はいない状態で、地形だけを調べる。
(() => {
  "use strict";
  const DT = 1 / 60;
  const ORIG = courses.slice();
  const CELL = 32;

  function areasOf(ci) {
    const base = ORIG[ci];
    return base.areas ? base.areas : [base];
  }

  function load(ci, an) {
    courses[ci] = areasOf(ci)[an];
    currentCourse = ci;
    state = newState();
    state.mode = "playing";
    state.time = 9999;
    state.enemies = [];
    state.items = [];
    return courses[ci];
  }

  function restore(ci) {
    courses[ci] = ORIG[ci];
  }

  // 副作用（音・演出・会話）を止める
  function quiet(fn) {
    const saved = { playSfx: window.playSfx, damage: window.damagePlayer, shop: Shop.has, lock: Tutorial.lock, consume: Tutorial.consumeJump };
    window.playSfx = () => {};
    Shop.has = () => false;
    Tutorial.lock = () => null;
    Tutorial.consumeJump = () => false;
    try { return fn(); } finally {
      window.playSfx = saved.playSfx;
      Shop.has = saved.shop;
      Tutorial.lock = saved.lock;
      Tutorial.consumeJump = saved.consume;
    }
  }

  const KEYS = ["ArrowLeft", "ArrowRight", "ArrowDown", "Space", "KeyB", "KeyX", "KeyY"];
  function setKeys(list) {
    for (const k of KEYS) keys.delete(k);
    for (const k of list) keys.add(k);
  }

  function onSpike(p) {
    return (level.spikes ?? []).some(sp => p.x + p.w > sp.x + 4 && p.x < sp.x + sp.w - 4 && p.y + p.h > sp.y + 4 && p.y < sp.y + sp.h);
  }

  function springUnder(p) {
    const feet = p.y + p.h;
    return (state.springs ?? []).find(s => p.vy >= 0 && p.x + p.w > s.x + 4 && p.x < s.x + s.w - 4 && feet >= s.y && feet <= s.y + s.h + 14);
  }

  // ひとつの動きをためす。着地した場所（または失敗）を返す
  function tryAction(start, act, visit) {
    const p = state.player;
    Object.assign(p, { x: start.x, y: start.y, vx: start.vx ?? 0, vy: 0, grounded: true, coyote: 0.1, jumpWas: false, jumpHeld: false, airJumped: false, crouch: false, h: STAND_H, invincible: 99, onCart: false });
    p.y = start.feet - p.h;
    const dir = act.dir;
    if (act.run) p.vx = dir * 340;
    else if (act.jump) p.vx = dir * 220;
    let left = false;
    const startX = p.x;
    for (let f = 0; f < 200; f++) {
      const k = [];
      if (dir < 0) k.push("ArrowLeft");
      if (dir > 0) k.push("ArrowRight");
      if (act.run) k.push("KeyB");
      if (act.crouch) k.push("ArrowDown");
      if (act.jump && f >= (act.delay ?? 0) && f < (act.delay ?? 0) + act.jump) k.push("Space");
      if (act.stopAt && f >= act.stopAt) { k.length = 0; }
      setKeys(k);
      updatePlayer(DT);
      const sp = springUnder(p);
      if (sp) { p.vy = -sp.power; p.grounded = false; }
      if (visit) visit(p);
      if (p.y > worldBottom() + 20) return { dead: true };
      if (onSpike(p)) return { dead: true, spike: true };
      if (!p.grounded) left = true;
      if (p.grounded && left && f > 2) return { x: p.x, feet: p.y + p.h };
      // 歩くだけ・ほふく前進：ある程度進んだら、そこで止まる
      if (!act.jump && p.grounded && Math.abs(p.x - startX) >= (act.crouch ? 60 : 72)) return { x: p.x, feet: p.y + p.h, walk: true };
      if (!act.jump && p.grounded && f > 40 && Math.abs(p.vx) < 1) return null; // かべで止まった
    }
    return p.grounded ? { x: p.x, feet: p.y + p.h } : null;
  }

  const ACTIONS = [];
  for (const dir of [1, -1]) {
    ACTIONS.push({ dir });
    ACTIONS.push({ dir, crouch: true });
    for (const run of [false, true]) {
      for (const jump of [4, 9, 16, 40]) ACTIONS.push({ dir, run, jump });
    }
    // その場でジャンプして、空中で動く（高い足場へまっすぐ上がる）
    ACTIONS.push({ dir, jump: 40, delay: 0, vx0: 0 });
  }
  ACTIONS.push({ dir: 0, jump: 40 });

  // エリアのゴール
  function goalRect(area) {
    const lv = area.level;
    const exit = (lv.doors ?? []).find(d => d.exit);
    if (exit) return { x: exit.x, y: exit.y, w: exit.w, h: exit.h, kind: "door", locked: !!exit.locked };
    if (lv.flag && lv.flag.x > 0) return { ...lv.flag, kind: "flag" };
    return null;
  }

  function overlaps(p, r) {
    return p.x < r.x + r.w && p.x + p.w > r.x && p.y < r.y + r.h && p.y + p.h > r.y;
  }

  function checkArea(ci, an, opts = {}) {
    return quiet(() => {
      const area = load(ci, an);
      const p = state.player;
      // カギの扉・スイッチのブロックを、ためしにぜんぶ消す（パズルをとけた前提で地形を見る）
      if (opts.openAll) blocks = blocks.filter(b => !b.door && b.phase === undefined);
      if (area.trait === "underwater") return checkSea(ci, an, area);
      const goal = goalRect(area);
      // はじまりの場所
      const spawnX = an === 0 ? p.x : (area.spawn?.x ?? 90);
      p.x = spawnX;
      p.y = area.spawn ? area.spawn.y : Math.min(p.y, 300);
      if (area.spawn) p.y = area.spawn.y - p.h;
      p.vx = 0; p.vy = 0;
      setKeys([]);
      for (let i = 0; i < 240 && !p.grounded; i++) updatePlayer(DT);
      if (!p.grounded) { restore(ci); return { ci, an, ok: false, why: "start: not standing" }; }
      const seen = new Set();
      const cells = new Set();
      const queue = [{ x: p.x, feet: p.y + p.h }];
      const key = s => `${Math.round(s.x / 24)}:${Math.round(s.feet / 8)}`;
      seen.add(key(queue[0]));
      let reached = false;
      let nodes = 0;
      let minFeet = Infinity, maxX = -Infinity;
      const stands = [];
      const visit = q => {
        cells.add(`${Math.floor((q.x + q.w / 2) / CELL)}:${Math.floor((q.y + q.h / 2) / CELL)}`);
        if (goal && overlaps(q, goal)) reached = true;
      };
      const maxNodes = opts.maxNodes ?? 2500;
      while (queue.length && nodes < maxNodes && !(reached && !opts.full)) {
        const s = queue.shift();
        nodes++;
        for (const act of ACTIONS) {
          const r = tryAction({ ...s, vx: act.vx0 === 0 ? 0 : undefined }, act, visit);
          if (!r || r.dead) continue;
          const k = key(r);
          if (seen.has(k)) continue;
          seen.add(k);
          queue.push({ x: r.x, feet: r.feet });
          stands.push([Math.round(r.x), Math.round(r.feet)]);
          minFeet = Math.min(minFeet, r.feet); maxX = Math.max(maxX, r.x);
        }
      }
      setKeys([]);
      const lv = area.level;
      const inCells = (x, y) => {
        for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
          if (cells.has(`${Math.floor(x / CELL) + dx}:${Math.floor(y / CELL) + dy}`)) return true;
        }
        return false;
      };
      const keysMissed = (lv.keys ?? []).filter(k => !inCells(k.x + (k.w ?? 0) / 2, k.y + (k.h ?? 0) / 2)).length;
      const starsMissed = (lv.starItems ?? []).filter(s => !inCells(s.x, s.y)).length;
      const res = {
        ci, an, stage: stageLabel(ci), ok: !goal || reached, goal: goal?.kind, locked: goal?.locked, nodes,
        keys: (lv.keys ?? []).length, keysMissed, stars: (lv.starItems ?? []).length, starsMissed,
        movers: area.platforms.filter(q => q.mover).length, carts: area.platforms.filter(q => q.cart).length,
        arena: !!area.arena, climb: !!area.climbStage, minFeet: Math.round(minFeet), maxX: Math.round(maxX),
        goalAt: goal ? [Math.round(goal.x), Math.round(goal.y)] : null
      };
      if (opts.stands) res.stands = stands;
      restore(ci);
      return res;
    });
  }

  // 海：泳いで進めるか（門のすき間がぴょんぴーより大きいか、酸素がもつか）
  function checkSea(ci, an, area) {
    const lv = area.level;
    const gates = lv.seaGates ?? [];
    const narrow = gates.filter(g => g.gapH < 80);
    const goal = goalRect(area);
    const o2 = (lv.oxygenItems ?? []).map(o => o.x).sort((a, b) => a - b);
    let maxGap = 0, last = 0;
    for (const x of [...o2, goal ? goal.x : 4600]) { maxGap = Math.max(maxGap, x - last); last = x; }
    restore(ci);
    return { ci, an, stage: stageLabel(ci), sea: true, ok: narrow.length === 0, gates: gates.length, narrow: narrow.length, o2: o2.length, maxO2Gap: Math.round(maxGap), goal: goal?.kind };
  }

  // 自由にさがす：blocks を好きな形にして、start から targets（四角）のどれにとどくか
  function explore(ci, an, { blockFilter = null, phase = null, start = null, targets = [], maxNodes = 2500 } = {}) {
    return quiet(() => {
      const area = load(ci, an);
      const p = state.player;
      if (phase !== null) for (const b of blocks) if (b.phase !== undefined) b.broken = b.phase !== phase;
      if (blockFilter) blocks = blocks.filter(blockFilter);
      const s0 = start ?? { x: p.x, feet: p.y + p.h };
      const seen = new Set();
      const hitT = targets.map(() => false);
      const queue = [s0];
      const key = s => `${Math.round(s.x / 24)}:${Math.round(s.feet / 8)}`;
      seen.add(key(s0));
      let nodes = 0;
      const visit = q => targets.forEach((t, i) => { if (!hitT[i] && overlaps(q, t)) hitT[i] = true; });
      while (queue.length && nodes < maxNodes && !hitT.every(Boolean)) {
        const s = queue.shift();
        nodes++;
        for (const act of ACTIONS) {
          const r = tryAction({ ...s, vx: act.vx0 === 0 ? 0 : undefined }, act, visit);
          if (!r || r.dead) continue;
          const k = key(r);
          if (seen.has(k)) continue;
          seen.add(k);
          queue.push({ x: r.x, feet: r.feet });
        }
      }
      setKeys([]);
      restore(ci);
      return { hit: hitT, nodes };
    });
  }

  async function checkStage(ci, opts = {}) {
    const out = [];
    const areas = areasOf(ci);
    for (let an = 0; an < areas.length; an++) {
      out.push(checkArea(ci, an, opts));
      await new Promise(r => setTimeout(r, 0));
    }
    return out;
  }

  window.PlaytestBot = { load, restore, checkArea, checkStage, explore, areasOf, ORIG };
})();

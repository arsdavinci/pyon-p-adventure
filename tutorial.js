// tutorial.js — 1-1 のチュートリアル（踏む → 撃つ）と、はじめて光線銃をうばわれたときの案内（踏み返す）
// game.js より前に読み込む。game.js のグローバル（state, keys, gamepadState など）は呼び出し時に参照する。
(() => {
  "use strict";

  // ---- セリフ（声の台本にも入る。["だれ", "日本語", "English"]） ----
  const LINES = {
    intro: [
      ["yana", "前から敵が走ってきます。A でジャンプして、上から踏んでみてください。", "An enemy is running at you. Press A to jump and stomp on it."]
    ],
    now: [
      ["yana", "いまです！ A！", "Now! Press A!"]
    ],
    stomped: [
      ["pyon", "あれ？ 踏んだのに、こいつやられんじょ！ ふつうのゲームじゃったら、踏んだら倒せるもんでないか？", "Huh? I stomped it and it's still up! In most games, stomping beats them!"],
      ["yana", "この宇宙の敵は、踏まれてもひよるだけです。目を回しとるあいだは、さわっても平気ですけん。", "Enemies here just get dizzy when stomped. While they're dizzy, touching them is safe."],
      ["yana", "とどめは光線銃です。X か Y で撃ってみてください。", "Finish it with your ray gun. Press X or Y to shoot."]
    ],
    defeated: [
      ["pyon", "やったじょ！ 踏んでひよらせて、撃ってとどめじゃな。", "Got it! Stomp to make them dizzy, then shoot to finish!"],
      ["yana", "そのとおりです。ここからは、自由に進んでください。", "Exactly. From here on, go wherever you like."]
    ],
    stolen: [
      ["pyon", "あっ！ こいつら、吾輩の光線銃うばいやった！", "Hey! That thing stole my ray gun!"],
      ["yana", "あわてないでください。光線銃をうばった敵を踏み返せば、取りもどせます。", "Don't panic. Stomp the thief and you can get your ray gun back."]
    ],
    stolenNow: [
      ["yana", "いまです！ A で踏み返してください！", "Now! Press A and stomp it back!"]
    ],
    regained: [
      ["pyon", "落としたじょ！ 吾輩の光線銃、かえしてもらうけんな！", "It dropped it! I'm taking my ray gun back!"],
      ["yana", "落ちた光線銃にさわれば、また使えます。", "Touch the dropped ray gun to use it again."]
    ]
  };

  const L = (ja, en) => (language === "ja" ? ja : en);
  const NEAR = 170; // 敵がここまで来たら、画面を止めて「いまです！」

  // phase:
  //  approach  … 敵が走ってくる（ぴょんぴーは動けない）
  //  waitJump  … 画面が止まって、A を待つ
  //  air       … ジャンプ中（敵がぴょんぴーの下に来るように動く）
  //  talkStomp … 踏んだところで画面が止まって会話
  //  shoot     … X / Y で撃って倒す（ジャンプはできない）
  //  talkDone  … 倒したあとの会話（止まる）
  //  stolenTalk / thiefBack / thiefCome / thiefWait / thiefAir / regainTalk … 光線銃をうばわれたとき
  let phase = null;
  let enemy = null;
  let jumpQueued = false;
  let aWas = true;
  let talkSaid = false;
  let backT = 0;
  let airT = 0;

  const seen = key => !!(typeof Story !== "undefined" && Story.data.seen[key]);
  const mark = key => {
    if (typeof Story === "undefined") return;
    Story.data.seen[key] = true;
    Story.persist();
  };
  const say = key => Chat.say(LINES[key], true);
  const aDown = () => keys.has("Space") || gamepadState.jump;

  function reset() {
    phase = null;
    enemy = null;
    jumpQueued = false;
    talkSaid = false;
  }

  // ステージを始めたとき（1-1 で、まだチュートリアルをしていなければ始める）
  function stageStart() {
    reset();
    if (currentCourse !== 0 || seen("tutorialStomp")) return;
    const p = state.player;
    enemy = state.enemies
      .filter(e => e.alive && !e.boss && e.x > p.x + 200)
      .sort((a, b) => a.x - b.x)[0] ?? null;
    if (!enemy) return;
    enemy.tutorialSafe = true;
    enemy.weaponPower = 0;
    phase = "approach";
    aWas = true;
    say("intro");
  }

  // 敵がぴょんぴーに向かって歩く（ジャンプも射撃もしない）
  function walkToward(e, dt, speed) {
    const p = state.player;
    const dir = p.x + p.w / 2 < e.x + e.w / 2 ? -1 : 1;
    e.vx = dir * speed;
    e.facing = dir;
    e.gunCooldown = 99;
    e.vy += GRAVITY * dt;
    moveEnemyAndCollide(e, dt);
  }

  function gap(e) {
    const p = state.player;
    return Math.max(0, Math.max(e.x - (p.x + p.w), p.x - (e.x + e.w)));
  }

  // ジャンプ中は、敵がぴょんぴーの足の下に来るように少しずつよせる（かならず踏めるように）
  function steerUnder(e, dt) {
    const p = state.player;
    const want = p.x + p.w / 2 - e.w / 2;
    const step = 320 * dt;
    e.x += clamp(want - e.x, -step, step);
    e.vx = 0;
    e.gunCooldown = 99;
    e.vy += GRAVITY * dt;
    moveEnemyAndCollide(e, dt);
  }

  // 会話が終わるまで画面を止める。終わったら true
  function talkDone(key) {
    if (!talkSaid) {
      say(key);
      talkSaid = true;
      return false;
    }
    if (Chat.busy()) return false;
    talkSaid = false;
    return true;
  }

  // プレイ中に毎フレーム呼ぶ。true を返したら、そのフレームは画面を止める（ほかの更新をしない）
  function update(dt) {
    if (!phase) return false;
    const a = aDown();
    const aFresh = a && !aWas;
    aWas = a;
    if (enemy && !state.enemies.includes(enemy)) { reset(); return false; }

    switch (phase) {
      case "approach":
      case "thiefCome":
        if (gap(enemy) <= NEAR && state.player.grounded) {
          phase = phase === "approach" ? "waitJump" : "thiefWait";
          say(phase === "waitJump" ? "now" : "stolenNow");
          playSfx("cursor");
          return true;
        }
        return false;
      case "waitJump":
      case "thiefWait":
        if (aFresh) {
          jumpQueued = true;
          airT = 0;
          phase = phase === "waitJump" ? "air" : "thiefAir";
          return false;
        }
        return true;
      case "air":
      case "thiefAir":
        // 踏めずに着地したら、もう一度（敵がまた歩いてくる）
        airT += dt;
        if (airT > 0.3 && state.player.grounded) phase = phase === "air" ? "approach" : "thiefCome";
        return false;
      case "talkStomp":
        if (talkDone("stomped")) {
          phase = "shoot";
          // 敵のほうを向いておく
          const p = state.player;
          p.facing = enemy.x + enemy.w / 2 >= p.x + p.w / 2 ? 1 : -1;
        }
        return true;
      case "shoot":
        if (!enemy.alive) {
          phase = "talkDone";
          return true;
        }
        return false;
      case "talkDone":
        if (talkDone("defeated")) {
          mark("tutorialStomp");
          reset();
        }
        return true;
      case "stolenTalk":
        if (talkDone("stolen")) {
          phase = "thiefBack";
          backT = 0;
        }
        return true;
      case "thiefBack":
        backT += dt;
        if (gap(enemy) >= 300 || backT > 2.2) phase = "thiefCome";
        return false;
      case "regainTalk":
        if (talkDone("regained")) {
          mark("tutorialSteal");
          reset();
        }
        return true;
    }
    return false;
  }

  // 敵の動き（チュートリアルの敵だけ）。true を返したら、ふつうの動きはしない
  function moveEnemy(e, dt) {
    if (!phase || e !== enemy || e.stun > 0 && phase !== "shoot") return false;
    switch (phase) {
      case "approach":
      case "thiefCome":
        walkToward(e, dt, 120);
        return true;
      case "thiefBack": {
        const p = state.player;
        const dir = p.x + p.w / 2 < e.x + e.w / 2 ? 1 : -1;
        e.vx = dir * 170;
        e.facing = -dir;
        e.gunCooldown = 99;
        e.vy += GRAVITY * dt;
        moveEnemyAndCollide(e, dt);
        return true;
      }
      case "air":
      case "thiefAir":
        steerUnder(e, dt);
        return true;
      case "shoot": {
        // 撃ち終わるまで、目を回したまま。近すぎるときは、ふらふらと少しはなれる（撃ちやすいように）
        e.stun = Math.max(e.stun, 0.6);
        const p = state.player;
        const away = e.x + e.w / 2 >= p.x + p.w / 2 ? 1 : -1;
        e.vx = gap(e) < 110 ? away * 260 : 0;
        e.vy += GRAVITY * dt;
        moveEnemyAndCollide(e, dt);
        return true;
      }
    }
    return false;
  }

  // 敵を踏んだとき
  function onStomp(e) {
    if (e !== enemy) return;
    if (phase === "air" || phase === "approach" || phase === "waitJump") {
      phase = "talkStomp";
      e.stun = 2;
    } else if (phase === "thiefAir" || phase === "thiefCome" || phase === "thiefWait" || phase === "thiefBack") {
      e.tutorialSafe = false;
      phase = "regainTalk";
    }
  }

  // はじめて光線銃をうばわれたとき。true を返したら、ふつうの「うばわれた」会話はしない
  function onStolen(e) {
    if (seen("tutorialSteal") || (phase && phase !== null)) return false;
    enemy = e;
    e.tutorialSafe = true;
    phase = "stolenTalk";
    talkSaid = false;
    return true;
  }

  // ぴょんぴーの操作をしぼる
  function lock() {
    switch (phase) {
      case "approach":
      case "waitJump":
      case "air":
      case "thiefBack":
      case "thiefCome":
      case "thiefWait":
      case "thiefAir":
        return { move: false, jump: false, shoot: false };
      case "shoot":
        return { move: true, jump: false, shoot: true };
      case "talkStomp":
      case "talkDone":
      case "stolenTalk":
      case "regainTalk":
        return { move: false, jump: false, shoot: false };
    }
    return null;
  }

  function consumeJump() {
    if (!jumpQueued) return false;
    jumpQueued = false;
    return true;
  }

  // チュートリアル中は、いつものかけあいは出さない
  function muteChat() {
    return !!phase;
  }

  // 画面のまん中に出す、大きなボタンの案内
  function draw() {
    if (!phase) return;
    let text = null;
    const pc = typeof controlMode !== "undefined" && controlMode === "pc";
    if (phase === "waitJump" || phase === "thiefWait") text = pc ? L("Space でジャンプ！", "Space to jump!") : L("Ⓐ でジャンプ！", "Ⓐ to jump!");
    else if (phase === "shoot") text = pc ? L("X / J で撃とう！", "X / J to shoot!") : L("Ⓧ か Ⓨ で撃とう！", "Ⓧ or Ⓨ to shoot!");
    if (!text) return;
    const t = performance.now() / 1000;
    const s = 1 + Math.sin(t * 6) * 0.05;
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height * 0.3);
    ctx.scale(s, s);
    ctx.font = "900 46px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const w = ctx.measureText(text).width + 64;
    ctx.fillStyle = "rgba(255, 243, 164, 0.95)";
    ctx.strokeStyle = "#ff8db7";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -40, w, 80, 40);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#5a3d9a";
    ctx.fillText(text, 0, 2);
    ctx.restore();
  }

  window.Tutorial = { LINES, stageStart, update, moveEnemy, onStomp, onStolen, lock, consumeJump, muteChat, draw, reset, active: () => !!phase };
})();

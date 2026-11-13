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
    // 撃つ練習で、X・Y 以外を押したり、なかなか撃たなかったりしたとき（順番に、だんだん荒くなる）
    nag1: [["yana", "X か Y を押してください。", "Press X or Y."]],
    nag2: [["yana", "X！と Y！ですってば！", "X! And Y! I said X and Y!"]],
    nag3: [["yana", "えーーーくす！とー！ワイ！！！", "EEEX! AAAND! WHYYY!!!"]],
    nag4: [["yana", "わざとですよね？", "You're doing this on purpose, aren't you?"]],
    nag5: [["yana", "私はいいですよ。ここで何時間いても", "I don't mind. We can stay here for hours."]],
    nag6: [["yana", "あなたの大切な時間をどうぞ無駄にしてください", "Please, go ahead and waste your precious time."]],
    nagAuto: [["yana", "私が勝手に押します！", "Fine, I'll press it myself!"]],
    defeated: [
      ["pyon", "やったじょ！ 踏んでひよらせて、撃ってとどめじゃな。", "Got it! Stomp to make them dizzy, then shoot to finish!"],
      ["yana", "そのとおりです。ここからは、自由に進んでください。", "Exactly. From here on, go wherever you like."]
    ],
    stolen: [
      ["pyon", "あっ！ こいつら、吾輩の光線銃うばいやった！", "Hey! That thing stole my ray gun!"],
      ["yana", "うばわれた光線銃は、その敵を上からふむと落とします。ひろえば取りもどせますよ。", "Stomp that enemy from above and it will drop your ray gun. Pick it up to get it back."]
    ],
    stolenNow: [
      ["yana", "いまです！ A で踏み返してください！", "Now! Press A and stomp it back!"]
    ],
    // 合成の練習部屋（★の扉）をスルーしようとしたとき。さわるたびに、ヤナビスがだんだん荒くなる
    gate1: [
      ["yana", "ポータルです！ そこの入口に入ってみましょう！ ……よくスルーできますね！", "A portal! Go in that entrance! ...How can you just walk past it?!"],
      ["pyon", "なんや、めんどくさいなぁ。", "Ugh, what a hassle."]
    ],
    gate2: [
      ["yana", "なんで！！ 入りましょうってば！", "Why?! Go in, I said!"]
    ],
    gate3: [
      ["yana", "ぴょんぴーさん、聞こえてますか？ 入口はうしろです。う・し・ろ！", "Pyon-P, can you hear me? The entrance is behind you. BE-HIND!"],
      ["pyon", "わかっとるって……。", "I know, I know..."]
    ],
    gate4: [
      ["yana", "……いいかげんにしてください。入れって言うとるでしょうが！", "...That's enough. I'm TELLING you to go in!"]
    ],
    gate5: [
      ["yana", "もう知りません。わたしが入れます。", "That's it. I'll put you in myself."]
    ],
    gatePushed: [
      ["pyon", "そんなんあり！？", "You can DO that?!"]
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
  let bounceT = 0;
  // 撃つ練習で撃たないとき
  let nagN = 0;
  let nagT = 0;
  let nagWant = false;
  let wrongWas = true;
  let autoShoot = 0; // 0 = まだ / 1 = 言い終わるのを待つ / 2 = ヤナビスが X を押している
  let autoT = 0;
  let bounceNext = null;
  // どの場面でも止まったままにならないための見はり
  let phaseT = 0;
  let lastPhase = null;
  let missN = 0;
  let farT = 0;

  const seen = key => !!(typeof Story !== "undefined" && Story.data.seen[key]);
  const mark = key => {
    if (typeof Story === "undefined") return;
    Story.data.seen[key] = true;
    Story.persist();
  };
  const say = key => Chat.say(LINES[key], true);
  const aDown = () => keys.has("Space") || gamepadState.jump;

  function reset() {
    if (autoShoot === 2) keys.delete("KeyX");
    nagN = 0; nagT = 0; nagWant = false; autoShoot = 0; autoT = 0;
    phaseT = 0; lastPhase = null; missN = 0; farT = 0;
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

  // 敵を、ぴょんぴーの前（向いている側）の、同じ高さの地面におく（とどかない場所から呼びもどす）
  function bringEnemyNear(e, dist) {
    const p = state.player;
    const solids = platforms.concat(blocks.filter(b => !b.broken));
    for (const side of [p.facing || 1, -(p.facing || 1)]) {
      const x = side > 0 ? p.x + p.w + dist : p.x - dist - e.w;
      const y = p.y + p.h - e.h;
      const box = { x, y, w: e.w, h: e.h };
      if (solids.some(s => hit(box, s))) continue;
      e.x = x;
      e.y = y;
      e.vx = 0;
      e.vy = 0;
      spawnBlockPoof(e.x + e.w / 2, e.y + e.h / 2);
      return true;
    }
    return false;
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

  // ---- 1-1：★の扉（合成の練習部屋）に入るまで、少し先から進めない ----
  const GATE_AHEAD = 600; // 扉からこれだけ右に、見えないかべ
  let gateCount = 0;
  let gateTouching = false;
  let gatePush = null; // { yx, t, said }

  function gateDoor() {
    if (currentCourse !== 0 || (courses[0]?.areaNo ?? 0) !== 0) return null;
    if (typeof fuseGuideDone === "function" && fuseGuideDone()) return null;
    const door = (level.doors ?? []).find(d => d.bonus);
    if (!door || state.areaMemo?.[door.to]?.dropsGiven) return null;
    return door;
  }

  function updateGate(dt) {
    const door = gateDoor();
    if (!door) {
      gatePush = null;
      return false;
    }
    const wallX = door.x + GATE_AHEAD;
    // 扉に入るまで、かべの手前と先の敵は出さない
    if (state.gateFiltered !== true) {
      state.gateFiltered = true;
      state.enemies = state.enemies.filter(e => e.boss || e.x < door.x - 500 || e.x > wallX + 900 || e === enemy);
    }
    const p = state.player;
    if (gatePush) {
      // ヤナビスが飛んできて、ぴょんぴーを扉まで押していく
      gatePush.t += dt;
      const target = door.x + door.w / 2 - p.w / 2;
      if (gatePush.t < 0.9) {
        // 右から飛んでくる
        gatePush.yx += (p.x + p.w + 6 - gatePush.yx) * Math.min(1, dt * 6);
      } else {
        if (!gatePush.said) {
          gatePush.said = true;
          Chat.say(LINES.gatePushed, true);
        }
        p.facing = 1;
        p.x = Math.max(target, p.x - 300 * dt);
        gatePush.yx = p.x + p.w + 6;
        if (p.x <= target + 1 && !FX.transitioning() && gatePush.t > 1.6) {
          gatePush = null;
          enterArea(door.to, door.spawnX);
          return true;
        }
      }
      p.vx = 0;
      updateCamera(dt);
      return true;
    }
    if (p.x + p.w > wallX) {
      p.x = wallX - p.w;
      p.vx = Math.min(0, p.vx);
      if (!gateTouching) {
        gateTouching = true;
        gateCount += 1;
        playSfx("locked", p.x);
        if (gateCount >= 5) {
          Chat.say(LINES.gate5, true);
          gatePush = { yx: state.camera + VIEW_W + 80, t: 0, said: false };
        } else Chat.say(LINES[`gate${gateCount}`], true);
      }
    } else if (p.x + p.w < wallX - 80) gateTouching = false;
    return false;
  }

  // プレイ中に毎フレーム呼ぶ。true を返したら、そのフレームは画面を止める（ほかの更新をしない）
  function update(dt) {
    if (updateGate(dt)) return true;
    if (!phase) return false;
    const a = aDown();
    const aFresh = a && !aWas;
    aWas = a;
    // 会話のあいだは、A で次のセリフへ（ジャンプを待っているときはのぞく）
    if (aFresh && phase !== "waitJump" && phase !== "thiefWait" && Chat.busy()) Chat.next();
    if (enemy && !state.enemies.includes(enemy)) { reset(); return false; }
    if (phase !== lastPhase) { lastPhase = phase; phaseT = 0; }
    phaseT += dt;
    // 見はり：会話の場面が長すぎる（会話が止まっている）ときは、先へ進める
    if ((phase === "talkStomp" || phase === "talkDone" || phase === "stolenTalk" || phase === "regainTalk") && phaseT > 25) {
      Chat.next();
      talkSaid = true;
    }
    // 見はり：敵がとどかない場所（穴の下・かべの向こう）にいるときは、ぴょんぴーの前に呼びもどす
    if (enemy && enemy.alive && (phase === "approach" || phase === "thiefCome") && phaseT > 9 && !Chat.busy()) {
      bringEnemyNear(enemy, NEAR - 30);
      phaseT = 0;
    }

    switch (phase) {
      case "approach":
      case "thiefCome":
        if (gap(enemy) <= NEAR && state.player.grounded && !Chat.busy()) {
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
        if (airT > 0.3 && state.player.grounded) {
          missN += 1;
          // 何回も踏めなかったら、踏めたことにして先へ（止まったままにしない）
          if (missN >= 3) {
            missN = 0;
            const wasAir = phase === "air";
            stunEnemy(enemy);
            onStomp(enemy);
            if (phase === "air" || phase === "thiefAir") phase = wasAir ? "talkStomp" : "regainTalk";
            return false;
          }
          phase = phase === "air" ? "approach" : "autoJump";
        }
        return false;
      case "talkStomp":
        if (talkDone("stomped")) {
          phase = "shoot";
          // 敵のほうを向いておく
          const p = state.player;
          p.facing = enemy.x + enemy.w / 2 >= p.x + p.w / 2 ? 1 : -1;
        }
        return true;
      case "shoot": {
        if (!enemy.alive) {
          if (autoShoot === 2) keys.delete("KeyX");
          autoShoot = 0;
          phase = "talkDone";
          return true;
        }
        // 敵がとどかないほど遠い・穴に落ちた・かべの向こう → ぴょんぴーの前に呼びもどす
        {
          const pl = state.player;
          const lost = enemy.y > worldBottom() + 40 || Math.abs((enemy.y + enemy.h) - (pl.y + pl.h)) > 160;
          farT = gap(enemy) > 200 || lost ? farT + dt : 0;
          if (farT > (autoShoot ? 0.6 : 2.5) && pl.grounded) {
            bringEnemyNear(enemy, 140);
            farT = 0;
          }
        }
        // ヤナビスが撃ちはじめて4秒たっても倒れないときは、そのまま倒す（どんなときも止まらない）
        if (autoShoot === 2 && autoT > 4) {
          keys.delete("KeyX");
          damageEnemy(enemy, 99);
          return false;
        }
        // ヤナビスが代わりに撃つときは、いつも敵のほうを向く（敵が後ろにいると、ずっと外れてしまう）
        if (autoShoot) {
          const pl = state.player;
          pl.facing = enemy.x + enemy.w / 2 >= pl.x + pl.w / 2 ? 1 : -1;
        }
        // ヤナビスが代わりに X を押す（押したりはなしたりして、何発も撃つ）
        if (autoShoot === 2) {
          autoT += dt;
          if (autoT % 0.3 < 0.12) keys.add("KeyX"); else keys.delete("KeyX");
          return false;
        }
        if (autoShoot === 1) {
          if (!Chat.busy()) { autoShoot = 2; autoT = 0; }
          return false;
        }
        const p = state.player;
        // 撃っているあいだは、なにも言わない
        if (p.shootHeld) { nagT = 0; nagWant = false; return false; }
        // X・Y 以外のボタン（A・B）を押した
        const wrong = keys.has("Space") || keys.has("KeyB") || gamepadState.jump || gamepadState.run;
        if (wrong && !wrongWas) nagWant = true;
        wrongWas = wrong;
        // しばらく撃たなかったときも、次のひとことへ
        if (!Chat.busy()) nagT += dt;
        if (nagN > 0 && nagT > 7) nagWant = true;
        if (nagWant && !Chat.busy()) {
          nagWant = false;
          nagT = 0;
          if (nagN < 6) {
            nagN += 1;
            say(`nag${nagN}`);
          } else {
            say("nagAuto");
            autoShoot = 1;
          }
        }
        return false;
      }
      case "talkDone":
        if (talkDone("defeated")) {
          mark("tutorialStomp");
          reset();
        }
        return true;
      case "stolenTalk":
        // 言い終わるまで止めて、そのあとは自動で踏み返す
        if (talkDone("stolen")) phase = "autoJump";
        return true;
      case "autoJump":
        // 地面に立ったら、自動でジャンプ（敵がぴょんぴーの下に来る）
        if (state.player.grounded || phaseT > 3) {
          jumpQueued = true;
          airT = 0;
          phase = "thiefAir";
        }
        return false;
      case "thiefBack":
        backT += dt;
        if (gap(enemy) >= 300 || backT > 2.2) phase = "thiefCome";
        return false;
      case "stompBounce": {
        // 跳ねあがって、上へのいきおいがなくなるころ（いちばん高いところの少し前）で止める
        bounceT += dt;
        const p = state.player;
        if (bounceT > 0.12 && (p.vy > -140 || bounceT > 0.45)) phase = bounceNext;
        return false;
      }
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
        // ヤナビスの説明を言い終わるまでは、少し手前で待つ（「いまです！」で説明を切らないように）
        if (Chat.busy() && gap(e) <= NEAR + 120) {
          e.vx = 0;
          e.gunCooldown = 99;
          e.vy += GRAVITY * dt;
          moveEnemyAndCollide(e, dt);
          return true;
        }
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
      case "autoJump":
        e.vx = 0;
        e.gunCooldown = 99;
        e.vy += GRAVITY * dt;
        moveEnemyAndCollide(e, dt);
        return true;
      case "shoot": {
        // 撃ち終わるまで、目を回したまま。近すぎるときは、ふらふらと少しはなれる（撃ちやすいように）
        e.stun = Math.max(e.stun, 0.6);
        const p = state.player;
        const away = e.x + e.w / 2 >= p.x + p.w / 2 ? 1 : -1;
        // 近すぎるとはなれ、遠すぎるとふらふら近づく（光線銃がとどくきょりにいる）
        e.vx = gap(e) < 110 ? away * 260 : gap(e) > 170 ? -away * 160 : 0;
        e.allowDrop = false;
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
    // 踏んだら、すぐには止めない。ぴょんぴーが少し跳ねあがって、敵が見えるところで止める
    if (phase === "air" || phase === "approach" || phase === "waitJump") {
      phase = "stompBounce";
      bounceNext = "talkStomp";
      bounceT = 0;
      e.stun = 3;
    } else if (phase === "thiefAir" || phase === "autoJump" || phase === "thiefCome" || phase === "thiefWait" || phase === "thiefBack") {
      e.tutorialSafe = false;
      phase = "stompBounce";
      bounceNext = "regainTalk";
      bounceT = 0;
    }
  }

  // はじめて光線銃をうばわれたとき。true を返したら、ふつうの「うばわれた」会話はしない
  function onStolen(e) {
    if (seen("tutorialSteal") || (phase && phase !== null)) return false;
    enemy = e;
    e.tutorialSafe = true;
    phase = "stolenTalk";
    // いつもの「うばわれた」の説明（はじめての1回）も、もう言ったことにする
    if (typeof Story !== "undefined") Story.data.seen.tipStolen = true;
    talkSaid = false;
    return true;
  }

  // ぴょんぴーの操作をしぼる
  function lock() {
    if (gatePush) return { move: false, jump: false, shoot: false };
    switch (phase) {
      case "approach":
      case "waitJump":
      case "air":
      case "thiefBack":
      case "thiefCome":
      case "thiefWait":
      case "thiefAir":
      case "autoJump":
      case "stompBounce":
        return { move: false, jump: false, shoot: false };
      case "shoot":
        return autoShoot ? { move: false, jump: false, shoot: true } : { move: true, jump: false, shoot: true };
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
    return !!phase || !!gatePush;
  }

  // 画面のまん中に出す、大きなボタンの案内
  function draw() {
    drawGatePush();
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

  // ぴょんぴーを押しこむヤナビス
  function drawGatePush() {
    if (!gatePush) return;
    const im = Story.img.portraitYana;
    const p = state.player;
    const sx = (gatePush.yx - state.camera) * ZOOM;
    const bob = Math.sin(performance.now() / 120) * 4;
    const sy = (p.y + p.h - state.cameraY) * ZOOM + bob;
    const h = 120;
    ctx.save();
    if (Story.ok(im)) {
      const w = h * (im.naturalWidth / im.naturalHeight);
      ctx.drawImage(im, sx, sy - h, w, h);
    } else {
      ctx.fillStyle = "#e0559f";
      ctx.beginPath();
      ctx.arc(sx + 40, sy - 50, 40, 0, Math.PI * 2);
      ctx.fill();
    }
    if (gatePush.t > 0.9) {
      ctx.font = "900 30px system-ui, sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#e0559f";
      ctx.lineWidth = 6;
      ctx.textAlign = "center";
      ctx.strokeText(L("えいっ！", "Hup!"), sx + 30, sy - h - 10);
      ctx.fillText(L("えいっ！", "Hup!"), sx + 30, sy - h - 10);
    }
    ctx.restore();
  }

  window.Tutorial = { LINES, stageStart, update, moveEnemy, onStomp, onStolen, lock, consumeJump, muteChat, draw, reset, active: () => !!phase,
    // チュートリアル中の、練習の相手ではない敵（終わるまでかくしておく）
    hidesEnemy: e => !!phase && !!enemy && e !== enemy && !e.boss };
})();

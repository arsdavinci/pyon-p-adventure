// chat.js — 画面下の「そうび＋会話」パネルと、プレイ中のかけあい（ぴょんぴー / らんぴょん / ヤナビス）
// game.js より前に読み込む。game.js のグローバルは呼び出し時に参照する。
(() => {
  "use strict";

  const L = (ja, en) => (language === "ja" ? ja : en);
  const pick = arr => arr[(Math.random() * arr.length) | 0];
  const SPEAKERS = {
    pyon: { ja: "ぴょんぴー", en: "Pyon-P", color: "#7f67c8", initial: ["ぴ", "P"] },
    ran: { ja: "らんぴょん", en: "Ranpyon", color: "#ff5f9e", initial: ["ら", "R"], img: "portraitRan" },
    yana: { ja: "ヤナビス", en: "Yanabisu", color: "#e0559f", initial: ["ヤ", "Y"], img: "portraitYana" },
    luva: { ja: "ザ・ルーヴァ・セレス", en: "Za-Luva Seles", color: "#6f6aa8", initial: ["ル", "L"], img: "portraitLuva", alt: "cardLuva" }
  };

  let els = null;
  let commOn = false;
  let queue = [];
  let cur = null;
  let shown = 0;
  let hold = 0;
  let renderedCount = -1;
  let idleT = 12;
  let pollT = 0;
  let weaponKey = "";
  let flags = {};
  const lastAt = {};
  let clock = 0;

  const COOLDOWN = { hurt: 7, combo: 12, starGet: 2, weaponGet: 2.5, stompBoost: 25, idle: 10, death: 3, respawn: 3, stolen: 6, needKey: 14, switchUsed: 40, keyGet: 2, stomp: 4, canFuse: 6 };

  function dom() {
    if (els) return els;
    const q = id => document.querySelector(id);
    els = {
      panel: q("#commPanel"), icon: q("#commWeaponIcon"), name: q("#commWeaponName"), lv: q("#commWeaponLv"),
      hint: q("#commWeaponHint"), atk: q("#commAtk"), range: q("#commRange"), rapid: q("#commRapid"),
      label: q("#commWeaponLabel"), avatar: q("#commAvatar"), speaker: q("#commSpeaker"), text: q("#commText"),
      labAtk: q("#commLabAtk"), labRange: q("#commLabRange"), labRapid: q("#commLabRapid"),
      equip: q("#commEquipButton"), pause: q("#commPauseButton")
    };
    // 押してもキー入力のフォーカスを取らないようにする
    const bind = (button, fn) => {
      if (!button) return;
      button.addEventListener("pointerdown", event => event.preventDefault());
      button.addEventListener("click", event => {
        event.stopPropagation();
        button.blur();
        unlockAudio();
        fn();
      });
    };
    bind(els.equip, () => toggleInventory());
    bind(els.pause, () => {
      if (state.mode === "paused") resumeGame();
      else if (state.mode === "inventory") closeInventory();
      else pauseGame();
    });
    return els;
  }

  // ---------- ランピョンのツッコミ回復（かけらの数で変わる） ----------
  function ranReply() {
    const n = typeof Story !== "undefined" ? Story.shardCount() : 0;
    if (n <= 0) return pick([["ran", "…………。", "............"], ["ran", "（ツッコミが、出てこーへん……）", "(The comeback... just won't come out...)"]]);
    if (n <= 2) return pick([["ran", "な……なん……。", "N-no... w..."], ["ran", "……ちゃ、ちゃうやろ……？", "...Th-that's... not right...?"]]);
    if (n <= 4) return pick([["ran", "なんで……やねん。", "No... way."], ["ran", "それは……ちゃうやろ！", "That's... not it!"]]);
    if (n === 5) return pick([["ran", "なんでやねん！ ……言えた！", "No way! ...I said it!"], ["ran", "どないやねん！ あ、もどってきた！", "What even is that! Oh, it's coming back!"]]);
    return pick([["ran", "なんでやねん！！", "NO WAY!!"], ["ran", "もうええわ！ ……ありがとうな。", "That's enough! ...Thanks, partner."]]);
  }

  const GAGS = [
    ["柿ピーのピーは、ぴょんぴーのピーやで。知らんけど。", "The 'pea' in kaki-pea stands for Pyon-P. Probably."],
    ["うちの耳、アンテナちゃうで。……たまに電波入るけど。", "My ears aren't antennas. ...They do pick up radio sometimes."],
    ["宇宙で食べる月見バーガーは、だいたい月見えへん。", "You can never actually see the moon when eating a moon-viewing burger in space."],
    ["ジャンプ力のひみつ？ にんじんやない、柿ピーや！", "The secret to my jumps? Not carrots. Kaki-pea snacks!"],
    ["星がきれいやなあ……って、あれ敵のビームやん！", "What pretty stars... wait, those are enemy beams!"],
    ["もふもふは正義。これ、月の憲法第1条な。", "Fluffiness is justice. That's Article 1 of the Moon constitution."],
    ["帰ったら餃子やな。宇宙すくったあとの餃子は格別やで。", "Dumplings when I get home. Nothing beats post-universe-saving dumplings."]
  ];

  function controlsHint() {
    const pc = typeof controlMode !== "undefined" && controlMode === "pc";
    return pc
      ? ["yana", "←→で移動、Spaceでジャンプ、X か J で光線銃です。階段をのぼると、空のルートに行けますよ。", "Move with ←→, jump with Space, fire with X or J. Climb the steps to reach the sky route."]
      : ["yana", "十字キーで移動、Aでジャンプ、X・Yで光線銃です。階段をのぼると、空のルートに行けますよ。", "Move with the D-pad, jump with A, fire with X / Y. Climb the steps to reach the sky route."];
  }

  function stageStartLines() {
    const course = courses[currentCourse];
    if (!course) return null;
    const w = course.worldIndex;
    const a = course.areaIndex;
    if (course.finalStage) return [["yana", "魔王の反応です。……ぴょんぴー、ご武運を。", "The Demon Lord is just ahead. ...Good luck, Pyon-P."], ["pyon", "まかしとき。最後は笑わせて勝つ！", "Leave it to me. I'm winning this one with a laugh!"]];
    if (course.bossStage) return [["yana", "ボスの反応です。足元と頭上の予告マークに注意してください。", "Boss detected. Watch for warning marks at your feet and overhead."], ["pyon", "かけら、返してもらうで！", "I'm taking that shard back!"]];
    if (course.climbStage) {
      return w === 0
        ? [["yana", "のぼりステージです。山をこえて、谷をくだって、ゴールをめざしましょう。", "A climbing stage. Go over the mountain, down the valley, and on to the goal."], ["pyon", "山あり谷あり。芸人人生みたいやな！", "Ups and downs. Just like a comedian's career!"]]
        : [["yana", "のぼりステージです。落ちても下の道にもどるだけ。あせらずどうぞ。", "A climbing stage. If you fall you just land on the lower path, so take your time."]];
    }
    if (w === 0 && a === 0) return [controlsHint()];
    if (w === 0 && a === 1) return [["yana", "ブロックは下からたたくか、光線銃でうつとアイテムが出ます。", "Hit blocks from below or shoot them to get items."]];
    if (w === 0 && a === 3) return [["yana", "ダッシュボタンで速く走れます。敵をふんだ瞬間にジャンプすると、大ジャンプです。", "Hold dash to run. Press jump right as you stomp an enemy for a super jump."]];
    if (a === 0) {
      return [[
        ["yana", "マグマの柱は、ふき出す前に光ります。光ったらはなれて。", "Lava pillars glow before they erupt. Step back when you see the glow."],
        ["yana", "氷はすべります。はやめにブレーキをかけましょう。", "Ice is slippery. Start braking early."],
        ["yana", "上下にも泳げます。深いところにもアイテムがありますよ。", "You can swim up and down. There are items in the deep, too."],
        ["yana", "ベルトコンベアは向きに注意。動く床はタイミングを見て。", "Mind the conveyor direction, and time your jumps onto moving platforms."],
        ["yana", "重力がゆれています。ジャンプの高さが変わりますよ。", "Gravity is pulsing here. Your jump height will change."]
      ][w - 1]];
    }
    return [pick([
      ["pyon", "よっしゃ、行くで！", "Alright, here we go!"],
      ["pyon", "ここも柿ピーのにおいがするで！", "I can smell kaki-pea snacks around here!"],
      ["pyon", "らんぴょん、見ててや！", "Watch me, Ranpyon!"],
      ["pyon", "空のルートも見のがしたらあかんで。", "Don't miss the sky route up there."]
    ])];
  }

  const BUILDERS = {
    stageStart: stageStartLines,
    weaponGet: name => firstTime("tipWeapon") ? BUILDERS.fuseTeach() : [pick([
      ["pyon", `${name}、ゲットや！`, `Got the ${name}!`],
      ["pyon", `おっ、${name}やん。ええやん！`, `Ooh, a ${name}. Nice!`]
    ])],
    fuse: name => [["pyon", `合体成功！ ${name}になったで！`, `Fusion complete! It's a ${name} now!`]],
    canFuse: name => [
      ["yana", `${name}が2つそろいました。同じ光線銃を2つ合成すると、1つ上の新しい光線銃が生まれます。`, `You now have two ${name}s. Fuse two of the same ray gun to create the next, stronger one.`],
      ["yana", "SELECT（Tabキー）で装備画面をひらいて、同じ銃どうしを重ねてください。合成をくり返すと、全部で16種類まで進化しますよ。", "Press SELECT (Tab) to open the equipment screen and drop one onto the other. Keep fusing and they evolve through 16 types in all."],
      ["pyon", "配合みたいなもんやな。ええやん、いっちょ育てたろ！", "Like breeding, huh. Nice. Let's raise a monster of a gun!"]
    ],
    fuseTeach: () => [
      ["yana", "光線銃をひろいましたね。おぼえておいてください。同じ光線銃を2つ集めると、合成して新しい光線銃を生み出せます。", "You picked up a ray gun. Remember this: collect two of the same ray gun and you can fuse them into a new one."],
      ["pyon", "2つで1つ？ へってるやん！", "Two become one? That's fewer guns!"],
      ["yana", "数はへりますが、強くなります。……たぶん。", "Fewer, but stronger. ...Probably."]
    ],
    starGet: () => [pick([
      ["pyon", "スターゲット！ 残機もふえたで！", "Star get! Extra life, too!"],
      ["pyon", "きらきらや〜。もろとこ！", "So sparkly! I'll take it!"]
    ])],
    hurt: () => [pick([
      ["pyon", "いったぁ！", "Owww!"],
      ["pyon", "あいたた……まだまだ！", "Ouch... I'm not done yet!"],
      ["pyon", "耳はやめて、耳は！", "Not the ears! Anything but the ears!"]
    ])],
    lowHp: () => [["yana", "HPがのこり1です。むりせず、スターやハートをさがしましょう。", "Only 1 HP left. Play it safe and look for stars or hearts."]],
    death: () => [["pyon", "月まで飛ばされた〜！", "I got launched all the way to the moooon!"]],
    respawn: () => [["pyon", "三日月タクシーで復活や！ 好きなとこにおりるで。", "Back on the Crescent Taxi! I'll hop off wherever I like."]],
    combo: () => [["pyon", "コンボや！ ノってきたで！", "Combo! I'm on a roll!"], ranReply()],
    bossHalf: () => [["yana", "ボスの体力、のこり半分です！", "The boss is down to half health!"], ["pyon", "あとひといきや！", "Almost there!"]],
    stompBoost: () => [["pyon", "大ジャンプ！ 月までとどきそうや！", "Super jump! I could reach the moon!"]],
    timeLow: () => [["yana", "のこり時間30秒です。いそいで！", "30 seconds left. Hurry!"]],
    oxygenLow: () => [["yana", "酸素がのこりわずかです！ O2バブルへ！", "Oxygen is almost out! Get to an O2 bubble!"]],
    sky: () => [["pyon", "うわぁ、ええ景色！ 空のルートや！", "Whoa, what a view! It's the sky route!"]],
    valley: () => [["pyon", "谷底や……。なんか出そうやな。", "The bottom of the valley... feels like something's gonna pop out."]],
    deep: () => [["pyon", "ふかっ！ 耳がキーンってなる！", "So deep! My ears are popping!"]],
    stolen: () => {
      if (firstTime("tipStolen")) {
        return [
          ["pyon", "ちょ、こいつ武器うばいよったで！？ どういうこと！？ 敵が主人公の武器パクるゲームある！？ 返せや！", "Hey, this guy just stole my weapon!? What is going on!? What kind of game lets enemies swipe the hero's gun!? Give it back!"],
          ["yana", "うばわれた光線銃は、その敵を上からふむと落とします。ひろえば取りもどせますよ。", "Stomp that enemy from above and it will drop your ray gun. Pick it up to get it back."],
          ["pyon", "ほな、ふんだるわ。……こっちが悪者みたいやな。", "Fine, stomping it is. ...Now I feel like the bad guy."]
        ];
      }
      return [pick([
        ["pyon", "また取られた！ それ、うちのやぞ！ 返せや！", "Stolen again! That's MINE! Give it back!"],
        ["pyon", "どろぼー！ 光線銃どろぼーがおるでー！", "Thief! We've got a ray gun thief over here!"],
        ["pyon", "なんで敵のほうが装備ととのってんねん！", "Why is the enemy better equipped than me!?"]
      ])];
    },
    stomp: () => {
      if (firstTime("tipStomp")) {
        return [
          ["pyon", "えっ、ふんでも倒れへんの！？ ふつう、どのゲームでも一発やろ！", "Wait, stomping doesn't beat them!? In every other game that's a one-hit KO!"],
          ["yana", "このゲームでは、ふむと“ピヨる”だけです。ピヨっているあいだに光線銃でうってください。", "In this game, stomping only stuns them. Shoot them with your ray gun while they are dizzy."],
          ["pyon", "ややこしい仕様やな……。開発者、出てこい！", "What a fussy rule... Developer, show yourself!"]
        ];
      }
      return Math.random() < 0.25 ? [pick([
        ["pyon", "ピヨっとるピヨっとる。今のうちや！", "Dizzy, dizzy. Now's my chance!"],
        ["pyon", "ふむだけやと倒れへんの、まだ納得してへんからな。", "For the record, I'm still not over the stomp-doesn't-KO thing."]
      ])] : null;
    },
    needKey: () => [["yana", "カギが必要です。空のルートや、あやしい場所をさがしてみましょう。", "You need a key. Try the sky route, or anywhere that looks suspicious."]],
    keyGet: () => [["pyon", "カギや！ どっかに開けるもんがあるはずやで。", "A key! There's gotta be something to open with it."]],
    switchHint: () => [["yana", "★スイッチです。下からたたくか光線銃でうつと、赤と青のブロックが入れかわります。", "A star switch. Bump it from below or shoot it to swap the red and blue blocks."]],
    switchUsed: () => [["pyon", "おっ、赤と青が入れかわった！ 頭つかうやつやな。", "Whoa, red and blue swapped! Time to use my head."]],
    chestOpen: () => [["pyon", "宝箱あいた〜！ 大もうけや！", "The chest is open! Jackpot!"], ranReply()],
    doorOpen: () => [["pyon", "バリア解除！ カギさまさまやな。", "Barrier down! Thank you, little key."]],
    stageClear: () => [pick([
      ["pyon", "クリアや！ おおきに！", "Stage clear! Thanks a bunch!"],
      ["pyon", "よっしゃー！ この調子やで！", "Yesss! Let's keep it up!"]
    ])],
    gameOver: () => [["ran", "ぴょんぴー……！ まだ終わってへんで！", "Pyon-P...! It's not over yet!"]],
    map: () => {
      const w = courses[mapSelectedCourse]?.worldIndex ?? 0;
      const line = (MAP_STAGE_MESSAGES[language] ?? MAP_STAGE_MESSAGES.ja)[w] ?? "";
      const text = line.replace(/^ぴょんぴー「|」$|^Pyon-P: "|"$/g, "");
      return [["pyon", text, text]];
    },
    idle: () => {
      if (Math.random() < 0.18) {
        return [
          ["pyon", "ヤナビスって『あんまり賢くないシステムやな』の頭文字らしいで。", "Apparently Yanabisu stands for You Are Not A Very Intelligent System."],
          ["yana", "……ぜんぶ聞こえていますよ。正式名称は Y.A.N.A.V.I.S です。かっこいいでしょう。", "...I can hear all of that. My formal name is Y.A.N.A.V.I.S. Rather cool, right?"]
        ];
      }
      const g = pick(GAGS);
      return [["pyon", g[0], g[1]], ranReply()];
    }
  };

  // セーブデータに「もう言った」を残して、最初の1回だけの解説に使う
  function firstTime(key) {
    if (typeof Story === "undefined") return false;
    if (Story.data.seen[key]) return false;
    Story.data.seen[key] = true;
    return true;
  }
  const URGENT = { stageStart: 1, map: 1, gameOver: 1, bossHalf: 1, stolen: 1, canFuse: 1 };

  function say(lines, urgent = false) {
    if (!lines || !lines.length) return;
    if (urgent) {
      queue = lines.slice();
      cur = null;
    } else if (queue.length + (cur && hold < 1.2 ? 1 : 0) < 3) {
      queue.push(...lines);
    }
  }

  function event(name, arg) {
    if (name === "stageStart") {
      flags = {};
      idleT = 14;
    }
    const cd = COOLDOWN[name] ?? 0;
    if (cd && lastAt[name] !== undefined && clock - lastAt[name] < cd) return;
    lastAt[name] = clock;
    const builder = BUILDERS[name];
    if (!builder) return;
    const lines = builder(arg);
    say(lines, !!URGENT[name] || (lines && lines.length >= 3));
    idleT = Math.max(idleT, 9);
  }

  function once(flag, name) {
    if (flags[flag]) return;
    flags[flag] = true;
    event(name);
  }

  function poll() {
    if (state.mode !== "playing") return;
    const p = state.player;
    const course = courses[currentCourse];
    if (state.hp <= 1) once("lowHp", "lowHp");
    if (state.time < 30 && state.time > 0) once("timeLow", "timeLow");
    if (course?.trait === "underwater") {
      if ((state.oxygen ?? 100) < 25) once("o2", "oxygenLow");
      else if ((state.oxygen ?? 100) > 60) flags.o2 = false;
      if (p.y > 760) once("deep", "deep");
    } else {
      if (p.y < -90 && p.grounded) once("sky", "sky");
      if (course?.climbStage && p.y > 800 && p.grounded) once("valley", "valley");
    }
    if (course?.bossStage && state.bossIntroPlayed) {
      const boss = state.enemies.find(e => e.boss && e.alive);
      if (boss && boss.hp / Math.max(1, boss.maxHp) < 0.5) once("bossHalf", "bossHalf");
    }
    for (let power = 1; power < MAX_WEAPON_POWER; power++) {
      if ((state.weaponInventory[power - 1] ?? 0) >= 2 && canFusePower(power) && !flags[`fuse${power}`]) {
        flags[`fuse${power}`] = true;
        event("canFuse", weaponName(power));
        break;
      }
    }
  }

  // ---------- 表示 ----------
  function renderSpeaker() {
    const e = dom();
    if (!e.panel || !cur) return;
    const sp = SPEAKERS[cur[0]] || SPEAKERS.pyon;
    e.speaker.textContent = L(sp.ja, sp.en);
    e.speaker.style.color = sp.color;
    e.avatar.dataset.speaker = cur[0];
    e.avatar.style.borderColor = sp.color;
    const has = key => key && typeof Story !== "undefined" && Story.ok(Story.img[key]);
    const custom = has(sp.img) ? Story.img[sp.img].src : has(sp.alt) ? Story.img[sp.alt].src : "";
    e.avatar.style.backgroundPosition = custom ? "50% 24%" : "";
    e.avatar.style.backgroundSize = custom ? "230%" : "";
    if (cur[0] === "pyon") {
      e.avatar.style.backgroundImage = "";
      e.avatar.textContent = "";
    } else if (custom) {
      e.avatar.style.backgroundImage = `url("${custom}")`;
      e.avatar.textContent = "";
    } else if (cur[0] === "yana" && typeof Story !== "undefined") {
      e.avatar.style.backgroundImage = `url("${Story.yanabisIcon()}")`;
      e.avatar.textContent = "";
    } else {
      e.avatar.style.backgroundImage = "";
      e.avatar.textContent = L(sp.initial[0], sp.initial[1]);
      e.avatar.style.color = sp.color;
    }
    e.panel.classList.remove("comm-pop");
    void e.panel.offsetWidth;
    e.panel.classList.add("comm-pop");
  }

  function refreshWeapon(force = false) {
    const e = dom();
    if (!e.panel || !state) return;
    const equipped = hasEquippedWeapon();
    const power = equipped ? state.weaponPower : 0;
    const stock = power ? (state.weaponInventory[power - 1] ?? 0) : 0;
    const key = `${power}:${stock}:${language}:${state.gun?.holder}`;
    if (!force && key === weaponKey) return;
    weaponKey = key;
    e.label.textContent = L("そうび中", "EQUIPPED");
    const pc = typeof controlMode !== "undefined" && controlMode === "pc";
    if (e.equip) e.equip.textContent = L("そうび・合成", "Equip / Fuse") + (pc ? " [Tab]" : "");
    if (e.pause) e.pause.textContent = L("ポーズ", "Pause") + (pc ? " [Enter]" : "");
    e.labAtk.textContent = L("攻撃", "ATK");
    e.labRange.textContent = L("射程", "RNG");
    e.labRapid.textContent = L("連射", "RPD");
    if (!power) {
      const stolen = state.gun.holder !== null && state.gun.holder !== "inventory" && state.gun.holder !== "player";
      e.icon.style.visibility = "hidden";
      e.name.textContent = stolen ? L("うばわれた！", "Stolen!") : L("光線銃なし", "No ray gun");
      e.lv.textContent = "";
      e.hint.textContent = stolen ? L("敵をふんで取りかえそう", "Stomp the thief to get it back") : L("ひろうか、SELECTで装備しよう", "Pick one up or equip with SELECT");
      for (const bar of [e.atk, e.range, e.rapid]) bar.style.width = "0%";
      return;
    }
    const st = weaponStage(power);
    const icon = weaponIcons[power - 1];
    const src = icon?.src ?? icon;
    if (src && e.icon.getAttribute("src") !== src) e.icon.src = src;
    e.icon.style.visibility = "visible";
    e.name.textContent = weaponName(power);
    e.lv.textContent = `Lv${power}`;
    e.atk.style.width = `${Math.max(8, (st.damage / 16) * 100)}%`;
    e.range.style.width = `${Math.max(8, (st.range / 2320) * 100)}%`;
    e.rapid.style.width = `${Math.max(8, ((0.46 - st.cooldown) / 0.33) * 100)}%`;
    const fusable = stock >= 2 && canFusePower(power);
    e.hint.textContent = fusable
      ? L(`×${stock} もってる！ SELECTで合体できるよ`, `You have ×${stock}! Fuse them with SELECT`)
      : power >= MAX_WEAPON_POWER ? L("最終進化！", "Final evolution!") : L("同じ銃を2つ集めると合体", "Collect two of the same to fuse");
    e.hint.classList.toggle("comm-hint-hot", fusable);
  }

  function layout() {
    const panel = dom().panel;
    const hud = document.querySelector(".hud");
    const shell = document.querySelector(".shell");
    if (!panel || !hud || !shell) return;
    const availW = Math.min(window.innerWidth, 1440) - 16;
    const canvasH = (availW * 9) / 16 + 8;
    const free = window.innerHeight - hud.offsetHeight - 34 - canvasH;
    commOn = free >= 96 && window.innerWidth >= 560;
    document.body.dataset.comm = commOn ? "on" : "off";
    shell.style.setProperty("--comm-h", commOn ? `${Math.min(176, Math.floor(free))}px` : "0px");
  }

  function update(dt) {
    clock += dt;
    if (!state) return;
    pollT -= dt;
    if (pollT <= 0) {
      pollT = 0.25;
      poll();
      refreshWeapon();
    }
    if (state.mode === "playing") {
      idleT -= dt;
      if (idleT <= 0) {
        idleT = 18 + Math.random() * 10;
        if (!cur || hold > 5) event("idle");
      }
    }
    if (!cur && queue.length) {
      cur = queue.shift();
      shown = 0;
      hold = 0;
      renderedCount = -1;
      renderSpeaker();
    }
    if (!cur) return;
    const text = L(cur[1], cur[2]);
    const total = [...text].length;
    if (shown < total) {
      shown = Math.min(total, shown + dt * (language === "ja" ? 38 : 70));
    } else {
      hold += dt;
      if (queue.length && hold > 1.9 + total * 0.045) cur = null;
    }
    const count = Math.floor(shown);
    if (cur && count !== renderedCount) {
      renderedCount = count;
      const e = dom();
      if (e.text) e.text.textContent = [...text].slice(0, count).join("");
    }
  }

  // パネルが出せない画面（横長スマホ・全画面）用：キャンバス上部に小さく出す
  function drawToast() {
    if (commOn || !cur || hold > 4.2) return;
    const mode = state.mode;
    if (mode !== "playing" && mode !== "respawning" && mode !== "worldMap") return;
    const sp = SPEAKERS[cur[0]] || SPEAKERS.pyon;
    const text = [...L(cur[1], cur[2])].slice(0, Math.floor(shown)).join("");
    const fade = Math.min(1, (4.2 - hold) / 0.5);
    ctx.save();
    ctx.globalAlpha = 0.94 * fade;
    ctx.font = `800 19px ${FX.FONT}`;
    const name = L(sp.ja, sp.en);
    const full = L(cur[1], cur[2]);
    const maxW = 620;
    const lines = [];
    let line = "";
    for (const ch of (language === "ja" ? [...full] : full.split(/(\s+)/))) {
      if (line && ctx.measureText(line + ch).width > maxW - 40) {
        lines.push(line);
        line = ch.trimStart();
      } else line += ch;
    }
    lines.push(line);
    const h = 34 + lines.length * 25;
    const x = canvas.width / 2 - maxW / 2 + 20;
    const y = mode === "worldMap" ? 130 : 14;
    ctx.fillStyle = "rgba(255, 248, 253, 0.93)";
    ctx.strokeStyle = sp.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(x, y, maxW, h, 16);
    ctx.fill();
    ctx.stroke();
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.font = `900 15px ${FX.FONT}`;
    ctx.fillStyle = sp.color;
    ctx.fillText(name, x + 18, y + 9);
    ctx.font = `800 19px ${FX.FONT}`;
    ctx.fillStyle = "#3f355d";
    let remaining = [...text].length;
    lines.forEach((ln, i) => {
      if (remaining <= 0) return;
      const chars = [...ln];
      ctx.fillText(chars.slice(0, remaining).join(""), x + 18, y + 29 + i * 25);
      remaining -= chars.length;
    });
    ctx.restore();
  }

  function refresh() {
    weaponKey = "";
    renderedCount = -1;
    if (cur) renderSpeaker();
    refreshWeapon(true);
    layout();
  }

  window.addEventListener("resize", layout);
  window.addEventListener("orientationchange", () => setTimeout(layout, 250));
  document.addEventListener("fullscreenchange", () => setTimeout(layout, 120));

  window.Chat = { event, say, update, layout, drawToast, refresh, ranReply };
})();

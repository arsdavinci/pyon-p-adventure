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
const QUIET_MODES = ["cutscene", "movie", "title", "credits", "bossIntro", "bossOutro"];
    let stolenBag = [];
  let stolenLast = null;
  let commOn = false;
  let queue = [];
  let quietT = 0;
  let voiced = false;
  let cur = null;
  let shown = 0;
  let hold = 0;
  let renderedCount = -1;
  let idleT = 12;
  let pollT = 0;
  let weaponKey = "";
  let invText = null;
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
    bind(els.equip, () => {
      if (state.mode === "worldMap") Shop.open();
      else if (state.mode === "shop") Shop.close();
      else toggleInventory();
    });
    bind(els.pause, () => {
      if (state.mode === "paused") resumeGame();
      else if (state.mode === "inventory") closeInventory();
      else pauseGame();
    });
    return els;
  }

  // プレイ中はらんぴょんとは通信がつながっていないので、会話はぴょんぴーとヤナビスだけ

  const GAGS = [
    ["ぶどうまんじゅうの『ぶ』は、ぶっちぎりの『ぶ』じょ。知らんけど。", "The 'pea' in kaki-pea stands for Pyon-P. Probably."],
    ["吾輩の耳、アンテナでないじょ。……たまに電波入るけど。", "My ears aren't antennas. ...They do pick up radio sometimes."],
    ["月で食べる月見バーガーは、地面見ながら食う", "You can never actually see the moon when eating a moon-viewing burger in space."],
    ["ジャンプ力のひみつ？ にんじんでない、ぶどうまんじゅうじゃ！", "The secret to my jumps? Not carrots. Kaki-pea snacks!"],
    ["星がきれいじゃなあ……って、あれ敵のビームでないか！", "What pretty stars... wait, those are enemy beams!"],
    ["もふもふは正義じゃ。これ、月の憲法第1条な。", "Fluffiness is justice. That's Article 1 of the Moon constitution."],
    ["帰ったら餃子じゃな。宇宙すくったあとの餃子は格別じょ。", "Dumplings when I get home. Nothing beats post-universe-saving dumplings."]
  ];

  function controlsHint() {
    const pc = typeof controlMode !== "undefined" && controlMode === "pc";
    return pc
      ? ["yana", "←→で移動、Spaceでジャンプ、X か J で光線銃です。階段をのぼると、空のルートに行けますよ。", "Move with ←→, jump with Space, fire with X or J. Climb the steps to reach the sky route."]
      : ["yana", "十字キーで移動、Aでジャンプ、X・Yで光線銃です。階段をのぼると、空のルートに行けますよ。", "Move with the D-pad, jump with A, fire with X / Y. Climb the steps to reach the sky route."];
  }

  // 装備画面での合成のしかた（ボタン操作）
  function fuseHowTo() {
    const pc = typeof controlMode !== "undefined" && controlMode === "pc";
    return pc
      ? [
        ["yana", "Tabキーで装備画面をひらいて、Spaceでアイテムリストに入ります。", "Press Tab to open the equipment screen, then Space to enter the item list."],
        ["yana", "合成したい光線銃をえらんで、Spaceをおしたまま、矢印キーで同じ光線銃の上まで運んで、はなしてください。マウスでドラッグしてもできますよ。", "Pick a ray gun, hold Space, carry it onto a matching one with the arrow keys, then let go. You can also drag it with the mouse."]
      ]
      : [
        ["yana", "SELECTで装備画面をひらいて、Aでアイテムリストに入ります。", "Press SELECT to open the equipment screen, then A to enter the item list."],
        ["yana", "合成したい光線銃をえらんで、Aをおしたまま、十字キーで同じ光線銃の上まで運んで、Aをはなしてください。指でドラッグしてもできますよ。", "Pick a ray gun, hold A, carry it onto a matching one with the D-pad, then release A. You can also drag it with your finger."]
      ];
  }

  function dashHint() {
    const pc = typeof controlMode !== "undefined" && controlMode === "pc";
    return pc
      ? ["yana", "Shiftをおしたまま進むと、ダッシュで速く走れます。", "Hold Shift while moving to dash."]
      : ["yana", "Bボタンをおしたまま進むと、ダッシュで速く走れます。", "Hold B while moving to dash."];
  }

  function stageStartLines() {
    const course = courses[currentCourse];
    if (!course) return null;
    const w = course.worldIndex;
    const a = course.areaIndex;
    if (course.finalStage) return [["yana", "魔王の反応です。……ぴょんぴー、ご武運を。", "The Demon Lord is just ahead. ...Good luck, Pyon-P."], ["pyon", "まかしとき。最後は笑わせて勝つけん！", "Leave it to me. I'm winning this one with a laugh!"]];
    if (course.bossStage) return [["yana", "ボスの反応です。足元と頭上の予告マークに注意してください。", "Boss detected. Watch for warning marks at your feet and overhead."], ["pyon", "かけら、返してもらうじょ！", "I'm taking that shard back!"]];
    if (course.climbStage) {
      return w === 0
        ? [["yana", "のぼりステージです。山をこえて、谷をくだって、ゴールをめざしましょう。", "A climbing stage. Go over the mountain, down the valley, and on to the goal."], ["pyon", "山あり谷あり。芸人人生みたいじゃな！", "Ups and downs. Just like a comedian's career!"]]
        : [["yana", "のぼりステージです。落ちても下の道にもどるだけ。あせらずどうぞ。", "A climbing stage. If you fall you just land on the lower path, so take your time."]];
    }
    if (w === 0 && a === 0) return [controlsHint(), dashHint()];
    if (w === 0 && a === 1) {
      const pc = typeof controlMode !== "undefined" && controlMode === "pc";
      return [
        ["yana", "ブロックは下からたたくか、光線銃でうつとアイテムが出ます。", "Hit blocks from below or shoot them to get items."],
        pc
          ? ["yana", "↑↓をおしながら撃つと、上やななめ、空中なら真下にも撃てますよ。", "Hold ↑ or ↓ while firing to shoot up, diagonally, or straight down in midair."]
          : ["yana", "十字キーの上下をおしながら撃つと、上やななめ、空中なら真下にも撃てますよ。", "Hold up or down on the D-pad while firing to shoot up, diagonally, or straight down in midair."]
      ];
    }
    if (w === 0 && a === 3) return [["yana", "ダッシュボタンで速く走れます。敵をふんだ瞬間にジャンプすると、大ジャンプです。", "Hold dash to run. Press jump right as you stomp an enemy for a super jump."]];
    if (a === 0) {
      return [[
        ["yana", "マグマの柱は、ふき出す前に地面が赤く光ります。ふき出すと石もふってくるので、地面の影と「！」を見てよけてください。", "The ground glows red before a lava pillar erupts. Rocks rain down afterwards, so watch for shadows and \"!\" marks."],
        ["yana", "氷はすべります。はやめにブレーキをかけましょう。", "Ice is slippery. Start braking early."],
        ["yana", "岩のかべは、すき間を泳いで通ります。動く門は、先が赤く光ったらとじる合図。はさまれないように、開いているうちに通りぬけてください。", "Swim through the gaps in the rock walls. A moving gate glows red before it shuts, so slip through while it is open or you will be crushed."],
        ["yana", "ベルトコンベアは向きに注意。動く床はタイミングを見て。", "Mind the conveyor direction, and time your jumps onto moving platforms."],
        ["yana", "重力がゆれています。それに、雷が落ちてきます。空から光がさしこんだら、そこから急いではなれてください。", "Gravity is pulsing here, and lightning strikes. When light shines down from the sky, get out of it fast."]
      ][w - 1]];
    }
    return [pick([
      ["pyon", "よっしゃ、行くじょ！", "Alright, here we go!"],
      ["pyon", "ここもルナコインがいっぱい落ちとるじょ！", "I can smell kaki-pea snacks around here!"],
      ["pyon", "らんぴょん、見とってよ！", "Watch me, Ranpyon!"],
      ["pyon", "空のルートも見のがしたらいかんじょ。", "Don't miss the sky route up there."]
    ])];
  }

  const BUILDERS = {
    stageStart: stageStartLines,
    weaponGet: name => firstTime("tipWeapon") ? BUILDERS.fuseTeach() : [pick([
      ["pyon", "光線銃、ゲットじゃ！", "Got a ray gun!"],
      ["pyon", "おっ、新しい光線銃でないか。ええでないか！", "Ooh, a new ray gun. Nice!"]
    ])],
    fuse: name => [["pyon", "合体成功！ 強い光線銃になったじょ！", "Fusion complete! It's a stronger ray gun now!"]],
    canFuse: name => firstTime("tipFuseHowTo") ? [
      ["yana", "同じ光線銃が2つそろいました。同じ光線銃を2つ合成すると、1つ上の新しい光線銃が生まれます。", "You now have two of the same ray gun. Fuse them to create the next, stronger one."],
      ...fuseHowTo(),
      ["yana", "月の武器🌙と星の武器⭐は別の種類です。同じ種類の、同じ武器どうしでしか合成できません。合成をくり返すと、それぞれ Lv8 まで進化しますよ。", "Moon 🌙 and star ⭐ weapons are different types; only the exact same weapon can be fused. Each line evolves up to Lv8."],
      ["pyon", "配合みたいなもんじゃな。ええでないか、いっちょ育てたろ！", "Like breeding, huh. Nice. Let's raise a monster of a gun!"]
    ] : [
      ["yana", "同じ光線銃が2つそろいました。装備画面で、同じ光線銃どうしを重ねると合成できます。", "You have two of the same ray gun. Stack them in the equipment screen to fuse."]
    ],
    fuseTeach: () => [
      ["yana", "光線銃をひろいましたね。おぼえておいてください。同じ光線銃を2つ集めると、合成して新しい光線銃を生み出せます。", "You picked up a ray gun. Remember this: collect two of the same ray gun and you can fuse them into a new one."],
      ["pyon", "2つで1つ？ へっとるでないか！", "Two become one? That's fewer guns!"],
      ["yana", "数はへりますが、強くなります。……たぶん。", "Fewer, but stronger. ...Probably."]
    ],
    starGet: () => [pick([
      ["pyon", "スターゲット！ 残機もふえたじょ！", "Star get! Extra life, too!"],
      ["pyon", "きらきらじゃ〜。もろとこ！", "So sparkly! I'll take it!"]
    ])],
    hurt: () => [pick([
      ["pyon", "いったぁ！", "Owww!"],
      ["pyon", "あいたた……まだまだ！", "Ouch... I'm not done yet!"],
      ["pyon", "耳はやめて、耳は！", "Not the ears! Anything but the ears!"]
    ])],
    lowHp: () => [["yana", "HPがのこり1です。むりせず、スターやハートをさがしましょう。", "Only 1 HP left. Play it safe and look for stars or hearts."]],
    death: () => [["pyon", "月まで飛ばされもたわ〜！", "I got launched all the way to the moooon!"]],
    // 穴に落ちたとき（言い終わってから、三日月タクシーで上がってくる）
    fallPit: () => [["pyon", "さいならーーー", "Byeeeeee!"]],
    respawn: () => [["pyon", "三日月タクシーで復活じゃ！ 好きなとこにおりるじょ。", "Back on the Crescent Taxi! I'll hop off wherever I like."]],
    combo: () => [["pyon", "コンボじゃ！ ノってきたじょ！", "Combo! I'm on a roll!"]],
    bossHalf: () => [["yana", "ボスの体力、のこり半分です！", "The boss is down to half health!"], ["pyon", "あとひといきじゃ！", "Almost there!"]],
    stompBoost: () => [["pyon", "大ジャンプ！ 月までとどきそうじゃ！", "Super jump! I could reach the moon!"]],
    timeLow: () => [["yana", "のこり時間30秒です。いそいで！", "30 seconds left. Hurry!"]],
    oxygenLow: () => [["yana", "酸素がのこりわずかです！ O2バブルへ！", "Oxygen is almost out! Get to an O2 bubble!"]],
    sky: () => [["pyon", "うわぁ、ええ景色！ 空のルートじゃ！", "Whoa, what a view! It's the sky route!"]],
    valley: () => [["pyon", "谷底じゃ……。なんか出そうじゃな。", "The bottom of the valley... feels like something's gonna pop out."]],
    deep: () => [["pyon", "ふかっ！ 耳がキーンってなる！", "So deep! My ears are popping!"]],
    stolen: () => {
      if (firstTime("tipStolen")) {
        return [
          ["pyon", "ちょ、こいつ吾輩の武器うばいよったじょ！？ どういうこと！？ 敵が主人公の武器パクるゲームある！？ 返してだ！", "Hey, this guy just stole my weapon!? What is going on!? What kind of game lets enemies swipe the hero's gun!? Give it back!"],
          ["yana", "うばわれた光線銃は、その敵を上からふむと落とします。ひろえば取りもどせますよ。", "Stomp that enemy from above and it will drop your ray gun. Pick it up to get it back."],
          ["pyon", "ほな、ふんだろ。……こっちが悪者みたいじゃな。", "Fine, stomping it is. ...Now I feel like the bad guy."]
        ];
      }
      // 2回目からは、この順に1回ずつ → 4回目にヤナビスとのかけあい → そのあとは短いひとことを順番を混ぜて回す
      const seen = typeof Story !== "undefined" ? Story.data.seen : {};
      const n = seen.stolenN ?? 0;
      seen.stolenN = n + 1;
      if (typeof Story !== "undefined") Story.persist();
      const ONCE = [
        ["pyon", "また取られた！ それ、吾輩のじょ！ 返してだ！", "Stolen again! That's MINE! Give it back!"],
        ["pyon", "どろぼー！ 光線銃どろぼーがおるじょー！", "Thief! We've got a ray gun thief over here!"],
        ["pyon", "なんで敵のほうが装備ととのっとるんよ！", "Why is the enemy better equipped than me!?"]
      ];
      if (n < ONCE.length) return [ONCE[n]];
      if (n === ONCE.length) {
        return [
          ["pyon", "武器使わんと拳で戦えんのか！", "Can't you fight with your fists instead of stealing weapons!?"],
          ["yana", "『お前や！』、、とハッキリ敵の心の声が聞こえました。私そんな能力ないんですが", "\"Says YOU!\" ...I clearly heard the enemy think that. I don't even have that ability."]
        ];
      }
      if (!stolenBag.length) {
        stolenBag = [
          ["pyon", "もーームカつくーー！！", "Ugh, this is SO annoying!!"],
          ["pyon", "武器盗んなや！", "Quit stealing my weapon!"],
          ["pyon", "盗られた！はらたつ！", "Stolen! That makes me so mad!"],
          ["pyon", "返せや！", "Give it back!"],
          ["pyon", "また盗られた！これどうにかならんのほんま！", "Stolen again! Can't something be done about this!?"]
        ].sort(() => Math.random() - 0.5);
        // 前の回の最後と同じセリフが、続けて出ないようにする
        if (stolenLast && stolenBag[stolenBag.length - 1][1] === stolenLast) stolenBag.unshift(stolenBag.pop());
      }
      const line = stolenBag.pop();
      stolenLast = line[1];
      return [line];
    },
    stomp: () => {
      if (firstTime("tipStomp")) {
        return [
          ["pyon", "えっ、ふんでも倒れんの！？ ふつう、どのゲームでも一発じゃろ！", "Wait, stomping doesn't beat them!? In every other game that's a one-hit KO!"],
          ["yana", "このゲームでは、ふむと“ピヨる”だけです。ピヨっているあいだに光線銃でうってください。", "In this game, stomping only stuns them. Shoot them with your ray gun while they are dizzy."],
          ["pyon", "ややこしい仕様じゃな……。開発者、出てこい！", "What a fussy rule... Developer, show yourself!"]
        ];
      }
      return Math.random() < 0.25 ? [pick([
        ["pyon", "ピヨっとるピヨっとる。今のうちじゃ！", "Dizzy, dizzy. Now's my chance!"],
        ["pyon", "ふむだけじゃ倒れんの、まだ納得しとらんけんな。", "For the record, I'm still not over the stomp-doesn't-KO thing."]
      ])] : null;
    },
    needKey: () => [["yana", "カギが必要です。空のルートや、あやしい場所をさがしてみましょう。", "You need a key. Try the sky route, or anywhere that looks suspicious."]],
    keyGet: () => [["pyon", "カギじゃ！ どっかに開けるもんがあるはずじょ。", "A key! There's gotta be something to open with it."]],
    switchHint: () => [["yana", "★スイッチです。下からたたくか光線銃でうつと、赤と青のブロックが入れかわります。", "A star switch. Bump it from below or shoot it to swap the red and blue blocks."]],
    switchUsed: () => [["pyon", "おっ、赤と青が入れかわった！ 頭つかうやつじゃな。", "Whoa, red and blue swapped! Time to use my head."]],
    chestOpen: () => [["pyon", "宝箱あいた〜！ 大もうけじゃ！", "The chest is open! Jackpot!"]],
    doorOpen: () => [["pyon", "バリア解除！ カギさまさまじゃな。", "Barrier down! Thank you, little key."]],
    stageClear: () => [pick([
      ["pyon", "クリアじゃ！ おおきに！", "Stage clear! Thanks a bunch!"],
      ["pyon", "よっしゃー！ この調子じょ！", "Yesss! Let's keep it up!"]
    ])],
    gameOver: () => [["yana", "ぴょんぴーさん……！ まだ終わっていませんよ！", "Pyon-P...! It's not over yet!"]],
    dashTeach: () => {
      const pc = typeof controlMode !== "undefined" && controlMode === "pc";
      return [
        pc
          ? ["yana", "←か→を2回すばやくおしても、ダッシュになりますよ。", "Tapping ← or → twice quickly also starts a dash."]
          : ["yana", "十字キーの←か→を2回すばやくタップしても、ダッシュになりますよ。", "Tapping ← or → on the D-pad twice quickly also starts a dash."],
        ["yana", "ダッシュしながらジャンプすると、ふつうより高く飛べます。高い足場は、助走をつけてねらってください。", "Jump while dashing and you'll fly higher than usual. Get a running start for high ledges."],
        ["pyon", "助走が大事なんは、ボケもジャンプもいっしょじゃな！", "A good run-up matters for jokes AND jumps!"]
      ];
    },
    map: () => {
      const w = courses[mapSelectedCourse]?.worldIndex ?? 0;
      const line = (MAP_STAGE_MESSAGES[language] ?? MAP_STAGE_MESSAGES.ja)[w] ?? "";
      const text = line.replace(/^ぴょんぴー「|」$|^Pyon-P: "|"$/g, "");
      if (typeof Shop !== "undefined" && Shop.unlocked() && firstTime("tipShop")) {
        return [
          ["yana", "1-5から下へのびる道の先に『よろず屋 つきのわ』が開店しました。集めたルナコインで、便利な道具が買えますよ。", "The Tsukinowa General Store has opened at the end of the path below 1-5. Spend your Luna Coins on handy gear."],
          ["pyon", "2段ジャンプシューズ……たっか！ いつか買うたるけん！", "Double-Jump Shoes... so expensive! I'll buy them someday!"]
        ];
      }
      return [["pyon", text, text]];
    },
    idle: () => {
      if (Math.random() < 0.18) {
        return [
          ["pyon", "ヤナビスって『やっぱり なんか ビミョーな システム』の頭文字らしいじょ。", "Apparently Yanabisu stands for You Are Not A Very Intelligent System."],
          ["yana", "……ぜんぶ聞こえていますよ。正式名称は Y.A.N.A.V.I.S です。かっこいいでしょう。", "...I can hear all of that. My formal name is Y.A.N.A.V.I.S. Rather cool, right?"]
        ];
      }
      const g = pick(GAGS);
      return [["pyon", g[0], g[1]]];
    }
  };

  // セーブデータに「もう言った」を残して、最初の1回だけの解説に使う
  function firstTime(key) {
    if (typeof Story === "undefined") return false;
    if (Story.data.seen[key]) return false;
    Story.data.seen[key] = true;
    return true;
  }
  // ---- ステージごとのひとりごと（1つ）と、ヤナビスとのなにげない会話（2つ）。一度言ったら、もう言わない ----
  // ステージに入って、ひとりごと → 会話 → 会話 の順。だれもしゃべっていない静かなときにだけ流す
  let stageT = 0;
  let lastAmbientAt = 0;
  // ---------- ステージのなにげない会話（ステージごとに3つ・1回きり） ----------
  // 時間で次々に流すのではなく、「その場所に来たら」流す。
  //   ひとりごと … 最初の道の半分をこえたら
  //   会話その1 … 部屋（2つ目より先のエリア）に入って、しばらくしたら
  //   会話その2 … ゴールのある最後の道の、3分の1をこえたら
  // そのうえで、ほかのセリフのあとは しっかり間をあける。
  const AMBIENT_QUIET = 45;  // ほかのセリフが終わってから、これだけ静かだったら
  const AMBIENT_GAP = 90;    // なにげない会話どうしは、これだけあける
  let lastAmbientClock = -999;
  let lastTalkClock = 0;
  let areaSeen = -1;
  let areaT = 0;

  function areaProgress() {
    const course = courses[currentCourse];
    const lv = course?.level;
    if (!lv) return 0;
    const exit = (lv.doors ?? []).find(d => d.exit);
    const goalX = exit ? exit.x : lv.flag && lv.flag.x > 0 ? lv.flag.x : 3800;
    return clamp(state.player.x / Math.max(400, goalX), 0, 1);
  }

  function ambientPlaceOk(k) {
    const course = courses[currentCourse];
    const n = course?.areaNo ?? 0;
    const last = (course?.areas?.length ?? 1) - 1;
    // 寄り道の部屋（ボーナス・練習部屋）は、ふつうの順番に入れない
    const side = (course?.areas?.[0]?.level?.doors ?? []).filter(d => d.bonus).map(d => d.to);
    if (side.includes(n)) return false;
    const lastMain = course?.areas ? course.areas.filter((a, i) => !side.includes(i)).length - 1 : last;
    if (k === 0) return n === 0 && areaProgress() > 0.5;
    if (k === 1) return n >= 1 && n < lastMain && areaT > 10 || (lastMain <= 1 && n === lastMain && areaProgress() > 0.15);
    return n === lastMain && n > 0 && areaProgress() > 0.33 || (lastMain === 0 && areaProgress() > 0.8);
  }

  function ambient(dt) {
    stageT += dt;
    const n = courses[currentCourse]?.areaNo ?? 0;
    if (n !== areaSeen) { areaSeen = n; areaT = 0; }
    areaT += dt;
    if (typeof STAGE_TALK === "undefined" || typeof Story === "undefined") return;
    if (typeof Tutorial !== "undefined" && Tutorial.muteChat()) return;
    // しゃべっている最中・しゃべり終わってすぐは、まだ流さない
    if (queue.length || cur && (shown < [...L(cur[1], cur[2])].length || (typeof Voice !== "undefined" && Voice.busy && Voice.busy()))) { lastTalkClock = clock; return; }
    if (state.arena || (typeof Voice !== "undefined" && Voice.busy && Voice.busy())) { lastTalkClock = clock; return; }
    if (clock - lastTalkClock < AMBIENT_QUIET) return;
    if (clock - lastAmbientClock < AMBIENT_GAP) return;
    const data = STAGE_TALK[currentCourse];
    if (!data) return;
    const items = [["solo", [data.solo]], ["talk0", data.talks?.[0]], ["talk1", data.talks?.[1]]];
    for (let k = 0; k < items.length; k++) {
      const [name, lines] = items[k];
      const key = `amb${currentCourse}_${name}`;
      if (!lines || Story.data.seen[key]) continue;
      if (!ambientPlaceOk(k)) continue;
      Story.data.seen[key] = true;
      Story.persist();
      lastAmbientClock = clock;
      lastAmbientAt = stageT;
      say(lines);
      return;
    }
  }

  const URGENT = { stageStart: 1, map: 1, gameOver: 1, bossHalf: 1, stolen: 1, canFuse: 1, fallPit: 1, death: 1 };

  function say(lines, urgent = false) {
    if (!lines || !lines.length) return;
    if (urgent) {
      queue = lines.slice();
      cur = null;
    } else if (lines.length >= 3 || queue.length + (cur && hold < 1.2 ? 1 : 0) < 3) {
      // 長い話（3行以上）は、いま話している行を切らずに、あとにつづける
      queue.push(...lines);
    }
  }

  function event(name, arg) {
    // チュートリアル中は、いつものかけあいを出さない
    if (typeof Tutorial !== "undefined" && Tutorial.muteChat()) return;
    if (name === "stageStart") {
      flags = {};
      idleT = 14;
      stageT = 0;
      lastAmbientAt = 0;
    }
    const cd = COOLDOWN[name] ?? 0;
    if (cd && lastAt[name] !== undefined && clock - lastAt[name] < cd) return;
    lastAt[name] = clock;
    const builder = BUILDERS[name];
    if (!builder) return;
    const lines = builder(arg);
    say(lines, !!URGENT[name]);
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
    // 1-1：少し遊んだら、2回タップのダッシュとダッシュジャンプを教える（会話が終わってから）
    if (course && course.worldIndex === 0 && course.areaIndex === 0 && !course.climbStage && !course.bossStage) {
      flags.playT = (flags.playT ?? 0) + 0.25;
      if (flags.playT > 12 && !queue.length && (!cur || hold > 2.5)) once("tipDash", "dashTeach");
    }
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
      if ((state.weaponInventory[power - 1] ?? 0) >= 2 && (nextFusionPower(power) !== null) && !flags[`fuse${power}`]) {
        flags[`fuse${power}`] = true;
        event("canFuse", weaponName(power));
        break;
      }
    }
  }

  // ---------- 外から出すセリフ ----------
  // ボス戦の前後・お店など、ふだんの会話とちがう場面のセリフも、同じ下の欄に同じ出し方で出す。
  // o = { key, who, name, color, avatar（絵のURL）, size, pos, initial, text, modes（この場面のあいだだけ） }
  let ext = null;
  function paintAvatar(el, o) {
    if (!el) return;
    el.dataset.speaker = o.who || "";
    el.style.borderColor = o.color || "";
    const pic = o.who === "pyon" ? "" : (o.avatar || "");
    el.style.backgroundImage = pic ? `url("${pic}")` : "";
    el.style.backgroundSize = pic ? (o.size || "230%") : "";
    el.style.backgroundPosition = pic ? (o.pos || "50% 24%") : "";
    el.textContent = pic || o.who === "pyon" ? "" : (o.initial || "");
    el.style.color = o.color || "";
  }
  function show(o) {
    const e = dom();
    if (!e.panel || !commOn) return false;
    if (!ext || ext.key !== o.key) {
      e.speaker.textContent = o.name;
      e.speaker.style.color = o.color;
      paintAvatar(e.avatar, o);
      e.panel.classList.remove("comm-pop");
      void e.panel.offsetWidth;
      e.panel.classList.add("comm-pop");
    }
    ext = o;
    if (e.text.textContent !== o.text) e.text.textContent = o.text;
    return true;
  }
  function release() {
    if (!ext) return;
    ext = null;
    renderedCount = -1;
    const e = dom();
    if (cur) renderSpeaker();
    else if (e.text) { e.text.textContent = ""; e.speaker.textContent = ""; e.avatar.style.backgroundImage = ""; e.avatar.textContent = ""; }
  }
  const usingPanel = () => commOn;

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
    const key = `${power}:${stock}:${language}:${state.gun?.holder}:${state.mode === "worldMap" || state.mode === "shop"}:${typeof Shop !== "undefined" && Shop.unlocked()}`;
    if (!force && key === weaponKey) return;
    weaponKey = key;
    e.label.textContent = L("そうび中", "EQUIPPED");
    const pc = typeof controlMode !== "undefined" && controlMode === "pc";
    const onMap = state.mode === "worldMap" || state.mode === "shop";
    if (e.equip) e.equip.textContent = (onMap ? L("よろず屋", "Shop") : L("そうび・合成", "Equip / Fuse")) + (pc ? " [Tab]" : "");
    if (e.equip) e.equip.style.visibility = onMap && !Shop.unlocked() ? "hidden" : "visible";
    if (e.pause) e.pause.textContent = L("ポーズ", "Pause") + (pc ? " [Enter]" : "");
    e.labAtk.textContent = L("攻撃", "ATK");
    e.labRange.textContent = L("射程", "RNG");
    e.labRapid.textContent = L("連射", "RPD");
    if (!power) {
      const stolen = state.gun.holder !== null && state.gun.holder !== "inventory" && state.gun.holder !== "player";
      e.icon.style.visibility = "hidden";
      e.name.textContent = stolen ? L("うばわれた！", "Stolen!") : L("光線銃なし", "No ray gun");
      e.lv.textContent = "";
      e.hint.textContent = stolen ? (isUnderwaterStage() ? L("Xの空気鉄砲でひよらせて取りかえそう", "Stun the thief with your air gun (X)") : L("敵をふんで取りかえそう", "Stomp the thief to get it back")) : L("ひろうか、SELECTで装備しよう", "Pick one up or equip with SELECT");
      for (const bar of [e.atk, e.range, e.rapid]) bar.style.width = "0%";
      return;
    }
    const st = weaponStage(power);
    const icon = weaponIcons[power - 1];
    const src = icon?.src ?? icon;
    if (src && e.icon.getAttribute("src") !== src) e.icon.src = src;
    e.icon.style.visibility = "visible";
    e.name.textContent = weaponName(power);
    e.lv.textContent = weaponLevelLabel(power);
    e.atk.style.width = `${Math.max(8, (st.damage / 16) * 100)}%`;
    e.range.style.width = `${Math.max(8, (st.range / 2320) * 100)}%`;
    e.rapid.style.width = `${Math.max(8, ((0.46 - st.cooldown) / 0.33) * 100)}%`;
    const fusable = stock >= 2 && (nextFusionPower(power) !== null);
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
    if (typeof Handheld !== "undefined" && Handheld.active()) {
      // 携帯ゲーム機レイアウトでは handheld.js がパネルの大きさを決める
      commOn = Handheld.commOn();
      shell.style.removeProperty("--comm-h");
      return;
    }
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
    // そうび画面では、えらんでいるものの説明を会話の欄に出す
    if (state.mode === "inventory" && commOn) {
      const slot = inventorySlots()[state.inventorySelection];
      const raw = inventoryFocusComment(slot?.power ?? null);
      // 「ヤナビス「…」」ならヤナビス、それ以外はぴょんぴーがしゃべる
      const who = raw.startsWith("ヤナビス「") ? "yana" : "pyon";
      const text = raw.replace(/^(ぴょんぴー|ヤナビス)「/, "").replace(/」$/, "");
      if (text !== invText) {
        invText = text;
        // そうび画面のひとことも声で（カーソルを動かすと、前の声は止めて新しいほうを流す）
        if (typeof Voice !== "undefined") Voice.play("chat", text);
        const e = dom();
        if (who === "yana") {
          // ヤナビスの顔と名前（いつもの会話と同じ出し方）
          const keep = cur;
          cur = ["yana", text, text];
          renderSpeaker();
          cur = keep;
        } else {
          e.speaker.textContent = L("ぴょんぴー", "Pyon-P");
          e.speaker.style.color = SPEAKERS.pyon.color;
          e.avatar.dataset.speaker = "pyon";
          e.avatar.style.borderColor = SPEAKERS.pyon.color;
          e.avatar.style.backgroundImage = "";
          e.avatar.style.backgroundPosition = "";
          e.avatar.style.backgroundSize = "";
          e.avatar.textContent = "";
        }
        e.text.textContent = text;
      }
      return;
    }
    if (invText !== null) {
      // そうび画面をとじたら、もとの会話にもどす
      invText = null;
      renderedCount = -1;
      const e = dom();
      if (cur) renderSpeaker();
      else if (e.text) e.text.textContent = "";
    }
    // ボス戦の前後・お店のセリフを出しているあいだは、ふだんの会話を出さない
    if (ext) {
      if (!ext.modes || ext.modes.includes(state.mode)) return;
      release();
    }
    if (state.mode === "playing") ambient(dt);
    // 会話シーン・ムービー・ボス戦の会話のあいだは、ふだんの会話を次へ進めない
    // （進めると、その声で会話シーンの声が止まってしまう。のこりは、終わってから流す）
    if (QUIET_MODES.includes(state.mode)) return;
    if (!cur && queue.length) {
      cur = queue.shift();
      if (typeof Voice !== "undefined") Voice.play("chat", cur[1]);
      shown = 0;
      hold = 0;
      quietT = 0;
      voiced = false;
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
      // 声があるときは、最後までしゃべり終わってから少し間をあけて次へ。声がないときは読む時間だけ待つ
      const talking = typeof Voice !== "undefined" && Voice.busy && Voice.busy();
      if (talking) { quietT = 0; if (Voice.playing()) voiced = true; }
      else quietT += dt;
      if (queue.length && !talking && quietT > 0.6 && (voiced || hold > 1.9 + total * 0.045)) cur = null;
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

  // 会話がまだ続いている（文字を出している・声がしゃべっている・読む時間）なら true
  function busy() {
    if (queue.length) return true;
    if (!cur) return false;
    const total = [...L(cur[1], cur[2])].length;
    if (shown < total) return true;
    if (typeof Voice !== "undefined" && Voice.busy && Voice.busy()) return true;
    return voiced ? quietT < 0.6 : hold < 1.2 + total * 0.045;
  }

  window.Chat = { event, say, update, layout, drawToast, refresh, busy, show, release, paintAvatar, usingPanel };
})();

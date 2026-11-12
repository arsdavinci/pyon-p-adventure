// story.js — 物語（カットシーン）/ セーブ / ステージクリア演出 / エンディング / スタッフロール / BGM切り替え
// game.js より前に読み込む。game.js のグローバルは呼び出し時に参照する。
(() => {
  "use strict";

  const TAU = Math.PI * 2;
  const SAVE_KEY = "pyonpSaveV1";
  const L = (ja, en) => (language === "ja" ? ja : en);
  const ok = im => !!im && im.complete && im.naturalWidth > 0;
  const ease = k => 1 - Math.pow(1 - Math.min(1, Math.max(0, k)), 3);

  // ---------- 追加画像（あれば自動で使う。なくても動く） ----------
  const OPTIONAL = {
    portraitPyon: "assets/portrait-pyonpy.png",
    portraitRan: "assets/portrait-ranpyon.webp",
    portraitLuva: "assets/portrait-luva.webp",
    cardLuva: "assets/portrait-luva-card.jpg",
    portraitYana: "assets/portrait-yanabis.webp",
    portraitRan_smile: "assets/portrait-ranpyon-smile.webp",
    portraitRan_surprise: "assets/portrait-ranpyon-surprise.webp",
    portraitRan_trouble: "assets/portrait-ranpyon-trouble.webp",
    portraitYana_smile: "assets/portrait-yanabis-smile.webp",
    portraitYana_surprise: "assets/portrait-yanabis-surprise.webp",
    portraitYana_trouble: "assets/portrait-yanabis-trouble.webp",
    cgCity: "assets/cg-opening-city.webp",
    cgDuo: "assets/cg-opening-duo.webp",
    cgDark: "assets/cg-opening-dark.webp",
    cgDepart: "assets/cg-opening-depart.webp",
    cgLaugh: "assets/cg-ending-laugh.webp",
    cgStage: "assets/cg-ending-stage.webp",
    cgFinale: "assets/cg-ending-finale.webp",
    titleKey: "assets/title-keyvisual.webp",
    waraiStar: "assets/item-warai-star.webp"
  };
  const img = {};
  for (const [key, src] of Object.entries(OPTIONAL)) {
    const im = new Image();
    im.src = src;
    img[key] = im;
  }

  const WORLD_NAMES = [
    ["月あめ平原", "Moon Candy Field"],
    ["火星ネオンコロニー", "Mars Neon Colony"],
    ["クリスタル氷星", "Crystal Ice Planet"],
    ["星の海", "Star Ocean"],
    ["リングメカ工場", "Ring Mecha Factory"],
    ["魔王星", "Demon Star"]
  ];
  const BOSS_NAMES = [
    ["月あめキング", "Moon Candy King"],
    ["ドーム司令官", "Dome Commander"],
    ["クリスタルイエティ", "Crystal Yeti"],
    ["マンタクイーン", "Manta Queen"],
    ["ロボットキング", "Robot King"],
    ["魔王スターオーバーロード", "Star Overlord"]
  ];
  const worldName = i => L(WORLD_NAMES[i]?.[0] ?? "", WORLD_NAMES[i]?.[1] ?? "");
  const bossName = i => L(BOSS_NAMES[i]?.[0] ?? "", BOSS_NAMES[i]?.[1] ?? "");

  // ---------- セーブ ----------
  function blank() {
    return { unlocked: 0, completed: [], keep: null, stars: {}, seen: {}, cleared: false, best: 0 };
  }

  function readSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return blank();
      const d = Object.assign(blank(), JSON.parse(raw));
      if (!Array.isArray(d.completed)) d.completed = [];
      if (!d.stars || typeof d.stars !== "object") d.stars = {};
      if (!d.seen || typeof d.seen !== "object") d.seen = {};
      if (d.keep && (!Array.isArray(d.keep.weaponInventory) || !Array.isArray(d.keep.inventoryItems))) d.keep = null;
      return d;
    } catch (_) {
      return blank();
    }
  }

  let data = readSave();

  function persist() {
    try {
      data.unlocked = unlockedCourse;
      data.completed = [...completedCourses];
      data.keep = campaignKeep ? JSON.parse(JSON.stringify(campaignKeep)) : null;
      data.best = Math.max(data.best || 0, campaignKeep?.score || 0);
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (_) {}
  }

  function hasSave() {
    return data.unlocked > 0 || data.completed.length > 0 || !!data.seen.opening;
  }

  function resetSave() {
    data = blank();
    try { localStorage.removeItem(SAVE_KEY); } catch (_) {}
  }

  function applyToGame() {
    unlockedCourse = clamp(data.unlocked | 0, 0, courses.length - 1);
    completedCourses = new Set(data.completed.filter(i => i >= 0 && i < courses.length));
    campaignKeep = data.keep ? JSON.parse(JSON.stringify(data.keep)) : null;
    if (campaignKeep) {
      campaignKeep.lives = MAX_LIVES;
      campaignKeep.hp = MAX_HP;
    }
  }

  const bossCourseIndex = w => STAGE_START_INDICES[w] + STAGE_AREA_COUNTS[w] - 1;
  function shardCount() {
    let n = 0;
    for (let w = 0; w < STAGE_AREA_COUNTS.length; w++) if (completedCourses.has(bossCourseIndex(w))) n++;
    return n;
  }
  function starTotals() {
    let got = 0;
    let total = 0;
    courses.forEach((c, i) => {
      const n = (c.level.starItems ?? []).length;
      total += n;
      got += Math.min(n, data.stars[i] || 0);
    });
    return { got, total };
  }

  // ---------- 台本 ----------
  const SPEAKERS = {
    narr: { side: null },
    pyon: { ja: "ぴょんぴー", en: "Pyon-P", color: "#7f67c8", side: "left" },
    ran: { ja: "らんぴょん", en: "Ranpyon", color: "#ff5f9e", side: "right" },
    luva: { ja: "ザ・ルーヴァ・セレス", en: "Za-Luva Seles", color: "#6f6aa8", side: "right" },
    yana: { ja: "ヤナビス", en: "Yanabisu", color: "#e0559f", side: "right" },
    maou: { ja: "魔王", en: "Demon Lord", color: "#c0266d", side: "right" },
    mystery: { ja: "？？？", en: "???", color: "#5a2a78", side: "right" }
  };

  const SCRIPTS = {
    opening: {
      music: "opening",
      lines: [
        { s: "narr", bg: "city", ja: "月の内側に広がる、パステル色の街。\n月生まれ・月育ちのムーニアンたちは、今日も笑ってくらしていた。", en: "Inside the Moon lies a pastel city.\nThe Moonians who live there spend every day laughing together." },
        { s: "narr", ja: "三日月大使館のお笑いコンビ『ムーニアンズ』は、\n宇宙最大の舞台『銀河お笑いフェス』を、3日後にひかえていた。", en: "The comedy duo \"Moonians\" of the Crescent Embassy were\nthree days away from the biggest show in space: the Galaxy Comedy Fest." },
        { s: "pyon", bg: "duo", ja: "らんぴょん、フェスのネタ合わせしよか！ まずは新ギャグな。『月見バーガー、月で見たら……ただのバーガー！』", en: "Ranpyon, let's rehearse for the Fest! New gag first: \"A moon-viewing burger, viewed ON the moon... is just a burger!\"" },
        { s: "ran", ja: "…………。", en: "............" },
        { s: "pyon", ja: "えっ、ツッコミは！？ 『なんでやねん』は！？", en: "Huh? Where's the comeback!? Where's my \"No way!\"?" },
        { s: "ran", ja: "あかん……。どうツッコんだらええんか、ぜんぜん思い出されへん……。", en: "I can't... I've completely forgotten how to do a comeback..." },
        { s: "narr", bg: "dark", music: "finalBoss", fx: "shake", ja: "そのとき、夜空がまっくろにそまった。\n宇宙じゅうの“笑い”が、空のかなたへ吸い上げられていく——。", en: "At that moment the night sky turned pitch black.\nAll the laughter in the universe was being sucked away into the distance..." },
        { s: "mystery", fx: "flash", ja: "フハハハ！ 宇宙の笑いは、この魔王星がぜんぶいただいた！ もうだれも、笑うことはない！", en: "Mwahaha! The Demon Star has taken ALL the laughter in the universe! No one shall ever laugh again!" },
        { s: "luva", bg: "duo", music: "opening", ja: "緊急指令だ、ぴょんぴー。笑いのエネルギー『ワライスター』が6つにくだかれ、魔王の手下たちが6つの星へ持ち去った。", en: "Emergency orders, Pyon-P. The \"Warai Star\", the energy of laughter itself, was shattered into six pieces, and the Demon Lord's followers carried them off to six planets." },
        { s: "luva", ja: "かけらがもどらなければ、宇宙から笑顔が消えてしまう。……だれも笑えないままでは、3日後のフェスも開けない。", en: "Unless the shards return, smiles will vanish from the universe. ...And if no one can laugh, the Fest three days from now cannot be held." },
        { s: "luva", ja: "らんぴょんは笑いをうばわれて動けない。翻訳酸素カプセルのヤナビスが案内する。行けるのは、きみだけだ。", en: "Ranpyon has lost his laughter and cannot go. Yanabisu, in your translation oxygen capsule, will guide you. You are the only one who can do this." },
        { s: "pyon", ja: "なんでうちだけ平気なんやろ……まあええわ！ うちらの夢の舞台、つぶさせへんで！", en: "Why am I the only one who's fine... eh, whatever! Nobody's wrecking our dream stage!" },
        { s: "ran", ja: "ぴょんぴー……たのむ。うちの『なんでやねん』、取り返してきて。", en: "Pyon-P... please. Bring my \"No way!\" back." },
        { s: "pyon", bg: "depart", ja: "まかしとき！ 柿ピー食べたら百人力や。ほな、ちょっと宇宙すくってくるわ！", en: "Leave it to me! A handful of kaki-pea snacks and I'm unstoppable. Be right back, just gotta save the universe!" },
        { s: "narr", ja: "こうして、ぴょんぴーの大冒険がはじまった。", en: "And so, Pyon-P's great adventure began." }
      ]
    },
    world0: {
      music: "story",
      lines: [
        { s: "yana", bg: "world0", ja: "翻訳酸素カプセルからこんにちは。人工知能のヤナビスです。翻訳だけやなくて道案内もできますねん。……あ、関西弁がうつりました。", en: "Hello from your translation oxygen capsule. I am Yanabisu, the AI. I do translation AND directions, y'know. ...Oh dear, your accent is rubbing off on me." },
        { s: "yana", ja: "最初のかけらは『月あめ平原』に反応があります。敵は上からふむとピヨります。そのすきに光線銃でやっつけましょう。", en: "The first shard is somewhere in Moon Candy Field. Stomp enemies from above to stun them, then finish them with your ray gun." },
        { s: "yana", ja: "光線銃は、同じものを2つ集めると合体して強くなります。SELECT（Tabキー）で装備画面をひらけますよ。", en: "Collect two of the same ray gun and they fuse into a stronger one. Press SELECT (Tab) to open the equipment screen." },
        { s: "pyon", ja: "オッケー！ ほな、いっちょ行ったろか！", en: "Got it! Alright, let's do this!" }
      ]
    },
    world1: {
      music: "story",
      lines: [
        { s: "ran", bg: "world1", ja: "ぴょんぴー、聞こえる？ かけらが1つもどって、月のみんなに、ちょっとだけ笑顔がもどったで！", en: "Pyon-P, can you hear me? One shard is back, and everyone on the Moon is smiling again. Just a little!" },
        { s: "pyon", ja: "ほんまか！ ほな記念に一発ギャグを——", en: "Really!? Then to celebrate, here's a brand new gag—" },
        { s: "ran", ja: "……それは、まだ笑われへんと思う。", en: "...I don't think anyone can laugh at THAT yet." },
        { s: "pyon", ja: "まだ言うてへんのに！？", en: "I haven't even said it!" },
        { s: "yana", ja: "次は火星ネオンコロニーです。地面からふき出すマグマに注意してください。", en: "Next stop: Mars Neon Colony. Watch out for lava bursting from the ground." }
      ]
    },
    world2: {
      music: "story",
      lines: [
        { s: "yana", bg: "world2", ja: "クリスタル氷星に到着しました。地面がとてもすべります。", en: "We have arrived at the Crystal Ice Planet. The ground is extremely slippery." },
        { s: "pyon", ja: "まかしとき。うちのギャグはスベらへんけど、足はスベるかもしれん。", en: "No problem. My jokes never slip... my feet might, though." },
        { s: "ran", ja: "逆や逆！ ……あれ？ いま、ちょっとだけツッコめた？", en: "Other way around! ...Wait. Did I just do a comeback?" },
        { s: "pyon", ja: "おっ、もどってきてるやん！ この調子でかけら集めるで！", en: "Hey, it's coming back! Let's keep collecting those shards!" }
      ]
    },
    world3: {
      music: "story",
      lines: [
        { s: "yana", bg: "world3", ja: "星の海です。水の中では酸素がへっていきます。O2バブルでこまめに補給してください。", en: "This is the Star Ocean. Your oxygen drains underwater, so grab O2 bubbles often." },
        { s: "pyon", ja: "泳ぎは得意ちゃうけど……上下ボタンでぷかぷか行けるな！", en: "Swimming isn't my thing... but I can float around with up and down!" },
        { s: "luva", ja: "順調だね、ぴょんぴー。フェスの楽屋は、おさえたままにしてある。かならず帰っておいで。", en: "You're doing well, Pyon-P. I'm keeping your dressing room at the Fest reserved. Make sure you come back." },
        { s: "pyon", ja: "さすがボス！ 月見バーガーも用意しといて！", en: "You're the best, boss! Have a moon-viewing burger ready for me!" }
      ]
    },
    world4: {
      music: "story",
      lines: [
        { s: "yana", bg: "world4", ja: "リングメカ工場です。ベルトコンベアと動く床に気をつけて。", en: "The Ring Mecha Factory. Mind the conveyor belts and moving platforms." },
        { s: "ran", ja: "ぴょんぴー！ うち、だいぶツッコめるようになってきたで。『なんで…………やねん』！", en: "Pyon-P! My comebacks are almost back. \"No............ way!\"" },
        { s: "pyon", ja: "間（ま）が長い長い！ あとちょっとやな！", en: "That pause is WAY too long! We're nearly there!" },
        { s: "ran", ja: "のこりのかけら、たのんだで、相方！", en: "I'm counting on you for the rest, partner!" }
      ]
    },
    world5: {
      music: "story",
      lines: [
        { s: "yana", bg: "world5", ja: "……最後のかけらは、魔王星の城の奥です。重力が波のようにゆれています。", en: "...The last shard is deep inside the castle on the Demon Star. Gravity there pulses like a wave." },
        { s: "luva", ja: "フェスは、あしただ。ここから先は今までとはわけがちがう。気を引きしめて行きなさい。", en: "The Fest is tomorrow. From here on, it won't be like before. Stay sharp." },
        { s: "ran", ja: "ぴょんぴー。帰ってきたら、いちばんええツッコミ入れたるからな。", en: "Pyon-P. When you get home, I'll give you the best comeback of my life." },
        { s: "pyon", ja: "それ聞いたら負けられへんな。行くで、クライマックスや！", en: "Now I really can't lose. Here we go: the grand finale!" }
      ]
    },
    ending: {
      music: "story",
      lines: [
        { s: "narr", bg: "laugh", ja: "6つのかけらがひとつになり、\nワライスターは、かがやきを取りもどした。", en: "The six shards became one,\nand the Warai Star shone once more." },
        { s: "maou", ja: "なぜだ……。笑いなど、消えてしまえばよかったのだ……。", en: "Why... Laughter should have just disappeared..." },
        { s: "pyon", ja: "なあ魔王。ほんまは、あんたも笑いたかったんちゃうん？", en: "Hey, Demon Lord. Deep down, didn't you want to laugh too?" },
        { s: "maou", ja: "……昔、わしも芸人を目指しておった。だが何をやってもスベりつづけ……だれも笑ってくれなんだ。", en: "...Long ago, I too dreamed of being a comedian. But every joke I told bombed... Not one person laughed." },
        { s: "maou", ja: "だから決めたのだ。だれも笑わぬ宇宙なら、わしもスベらずにすむ、と。", en: "So I decided: in a universe where no one laughs, I can never bomb again." },
        { s: "pyon", ja: "スベるんがこわいんは、うちもいっしょや。でもな、スベった話は、あとでいちばんウケんねん！", en: "I'm scared of bombing too. But you know what? The stories about bombing get the biggest laughs later!" },
        { s: "yana", ja: "解析完了です。ぴょんぴーさんだけ笑いをうばわれなかった理由は……スベっても自分で笑っているから、でした。", en: "Analysis complete. The reason only Pyon-P kept his laughter is... he laughs at his own jokes even when they bomb." },
        { s: "pyon", ja: "それ、ほめてる！？ ……まあええわ。魔王、あんたも自分で笑ってみ。", en: "Is that a compliment!? ...Eh, fine. Demon Lord, try laughing at yourself for once." },
        { s: "pyon", ja: "ほな聞いて。『魔王星の夜が明けたら……まおう（もう）朝やん！』", en: "So listen up. \"When night ends on the Demon Star... it's a brand new DEMON-ing!\"" },
        { s: "maou", fx: "shake", ja: "…………ぷっ。ふ、ふはは！ ふははははは！ く、くだらん！ くだらなすぎる！！", en: "............Pfft. Heh, ha ha! HAHAHAHA! That's... that's so dumb! SO dumb!!" },
        { s: "narr", fx: "flash", ja: "魔王が笑ったしゅんかん、\nワライスターの光が、宇宙じゅうに降りそそいだ。", en: "The moment the Demon Lord laughed,\nthe light of the Warai Star rained down across the universe." },
        { s: "maou", ja: "……すまなかった。笑いは、みなに返そう。わしは、どうつぐなえばよい。", en: "...I am sorry. I will return the laughter to everyone. How can I make amends?" },
        { s: "pyon", ja: "ほな、あしたのフェス見に来て。いちばん前の席で、いちばんでかい声で笑うこと。それでチャラや！", en: "Then come to the Fest tomorrow. Front row, loudest laugh in the house. Do that and we're even!" },
        { s: "narr", bg: "stage", music: "ending", ja: "そして、次の日。\n『銀河お笑いフェス』は、予定どおり幕をあけた。", en: "And the next day,\nthe Galaxy Comedy Fest opened right on schedule." },
        { s: "pyon", aud: true, ja: "どうもー！ ムーニアンズです！ いやー、きのうちょっと宇宙すくってきましてね。", en: "Hello, hello! We're the Moonians! So, funny story: I kinda saved the universe yesterday." },
        { s: "ran", aud: true, fx: "shake", ja: "なんでやねん！！ 言い方かるいわ！", en: "NO WAY!! You can't say it that casually!" },
        { s: "narr", aud: true, ja: "客席には、約束どおり、月あめキング、ドーム司令官、クリスタルイエティ、\nマンタクイーン、ロボットキング——そして、いちばん前に魔王のすがたがあった。", en: "In the audience, just as promised, sat the Moon Candy King, the Dome Commander, the Crystal Yeti,\nthe Manta Queen, the Robot King... and in the very front row, the Demon Lord." },
        { s: "maou", aud: true, ja: "ふはは！ いいぞー！ もっとやれー！", en: "Hahaha! More! MORE!" },
        { s: "luva", aud: true, ja: "ふふ。次は地球の大舞台だね、ふたりとも。", en: "Hehe. Next up is the big stage on Earth, you two." },
        { s: "pyon", aud: true, ja: "よっしゃ！ 次は地球で、てっぺん獲るで！", en: "Alright! Next, we're taking the top spot on Earth!" },
        { s: "ran", aud: true, ja: "その前にネタ合わせや！", en: "Rehearsal first!" },
        { s: "narr", bg: "finale", ja: "宇宙に笑顔がもどった。\n魔王は次の年、フェスの新人コーナーに出て、ちゃんとスベって、ちゃんと笑われたそうだ。", en: "Smiles returned to the universe.\nThe next year, the Demon Lord entered the Fest's newcomer slot, bombed properly, and was laughed with properly." },
        { s: "narr", ja: "ムーニアンズの挑戦は、まだまだつづく——。", en: "And the Moonians' journey has only just begun..." }
      ]
    }
  };

  // ---------- カットシーン ----------
  let cs = null;
  let time = 0;
  const silhouetteCache = new Map();

  function silhouette(image) {
    if (!ok(image)) return null;
    let c = silhouetteCache.get(image.src);
    if (c) return c;
    c = document.createElement("canvas");
    c.width = Math.round(image.naturalWidth / 3);
    c.height = Math.round(image.naturalHeight / 3);
    const g = c.getContext("2d");
    g.drawImage(image, 0, 0, c.width, c.height);
    g.globalCompositeOperation = "source-in";
    g.fillStyle = "#0d0618";
    g.fillRect(0, 0, c.width, c.height);
    silhouetteCache.set(image.src, c);
    return c;
  }

  // ---------- ムービー（assets/video/<名前>.mp4 があれば流す。なければ何もしないで先へ） ----------
  const MOVIE_BEFORE = { opening: "opening", ending: "ending" };
  let movie = null;

  function playMovie(id, onEnd) {
    const prev = state.mode;
    state.mode = "movie";
    const wrap = document.querySelector(".game-wrap");
    const v = document.createElement("video");
    const hint = document.createElement("div");
    let started = false;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      try { v.pause(); } catch (_) {}
      v.remove();
      hint.remove();
      movie = null;
      if (state.mode === "movie") state.mode = prev;
      lastTime = performance.now();
      if (onEnd) onEnd();
    };
    const timer = setTimeout(() => { if (!started) finish(); }, 2500);
    v.playsInline = true;
    v.preload = "auto";
    v.muted = typeof soundEnabled !== "undefined" && !soundEnabled;
    v.style.cssText = "position:absolute;inset:0;width:100%;height:100%;object-fit:cover;background:#120a2a;z-index:5;";
    hint.textContent = L("タップ / Esc でスキップ", "Tap / Esc to skip");
    hint.style.cssText = "position:absolute;left:14px;top:12px;z-index:6;padding:6px 14px;border-radius:99px;background:rgba(18,10,42,.55);color:#fff;font:800 13px system-ui;pointer-events:none;";
    v.addEventListener("error", finish);
    v.addEventListener("ended", finish);
    v.addEventListener("click", finish);
    v.addEventListener("canplay", () => {
      if (done || started) return;
      started = true;
      wrap.appendChild(v);
      wrap.appendChild(hint);
      v.play().catch(finish);
    });
    movie = { finish };
    v.src = `assets/video/${id}.mp4`;
    v.load();
  }

  function play(id, onEnd, afterMovie = false) {
    if (!afterMovie && MOVIE_BEFORE[id]) {
      playMovie(MOVIE_BEFORE[id], () => play(id, onEnd, true));
      return;
    }
    const script = SCRIPTS[id];
    if (!script) {
      if (onEnd) onEnd();
      return;
    }
    cs = {
      id, script, i: -1, shown: 0, wrapped: null, wrapKey: "", lineT: 0, t: 0,
      onEnd: onEnd || null, ending: false,
      bg: "city", bgT: 0, music: script.music || "story",
      slots: { left: null, right: null }, active: null
    };
    state.mode = "cutscene";
    nextLine(true);
    FX.startTransition({ type: "fade", half: true, dur: 0.9 });
  }

  function nextLine(first = false) {
    cs.i += 1;
    if (cs.i >= cs.script.lines.length) {
      finish();
      return;
    }
    const ln = cs.script.lines[cs.i];
    cs.shown = 0;
    cs.wrapped = null;
    cs.lineT = 0;
    if (ln.bg && ln.bg !== cs.bg) {
      cs.bg = ln.bg;
      cs.bgT = 0;
    } else if (first && ln.bg) {
      cs.bg = ln.bg;
    }
    if (ln.music) cs.music = ln.music;
    const sp = SPEAKERS[ln.s] || SPEAKERS.narr;
    if (sp.side) {
      const slot = cs.slots[sp.side];
      if (!slot || slot.id !== ln.s) cs.slots[sp.side] = { id: ln.s, appear: 0 };
      cs.slots[sp.side].face = ln.face || guessFace(ln);
      cs.active = sp.side;
    } else {
      cs.active = null;
    }
    if (ln.fx === "shake") FX.shake(0.7);
    if (ln.fx === "flash") {
      FX.flash("#ffffff", 0.8, 0.6);
      FX.shake(0.4);
    }
  }

  function finish() {
    if (!cs || cs.ending) return;
    cs.ending = true;
    data.seen[cs.id] = true;
    persist();
    const fn = cs.onEnd;
    FX.startTransition({
      type: "fade", dur: 0.8,
      onMid: () => {
        cs = null;
        if (fn) fn();
        else state.mode = "worldMap";
      }
    });
  }

  function lineText(ln) {
    return language === "ja" ? ln.ja : ln.en;
  }

  function wrapLines(text, maxW) {
    const out = [];
    for (const para of text.split("\n")) {
      let line = "";
      const tokens = language === "ja" ? [...para] : para.split(/(\s+)/);
      for (const tk of tokens) {
        const test = line + tk;
        if (line && ctx.measureText(test).width > maxW && !"。、！？」』）…—ー".includes(tk)) {
          out.push(line.trimEnd());
          line = tk.trimStart();
        } else {
          line = test;
        }
      }
      out.push(line);
    }
    return out;
  }

  function advanceCutscene() {
    if (!cs || cs.ending || FX.transitioning()) return;
    const total = [...lineText(cs.script.lines[cs.i])].length;
    if (cs.shown < total) {
      cs.shown = total;
    } else {
      playSfx("confirm");
      nextLine();
    }
  }

  function updateCutscene(dt) {
    if (!cs) return;
    cs.t += dt;
    cs.bgT += dt;
    cs.lineT += dt;
    for (const side of ["left", "right"]) {
      const slot = cs.slots[side];
      if (slot) slot.appear = Math.min(1, slot.appear + dt * 4);
    }
    if (cs.ending) return;
    const ln = cs.script.lines[cs.i];
    const total = [...lineText(ln)].length;
    if (cs.shown < total) {
      const before = Math.floor(cs.shown);
      cs.shown = Math.min(total, cs.shown + dt * (language === "ja" ? 34 : 62));
      if (Math.floor(cs.shown) !== before && Math.floor(cs.shown) % 3 === 0) playSfx("text");
    }
  }

  function coverDraw(image, zoom = 1, panX = 0, panY = 0) {
    const s = Math.max(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight) * zoom;
    const w = image.naturalWidth * s;
    const h = image.naturalHeight * s;
    ctx.drawImage(image, (canvas.width - w) / 2 + panX, (canvas.height - h) / 2 + panY, w, h);
  }

  const BG_FALLBACK = {
    city: { cg: "cgCity", stage: 0 },
    duo: { cg: "cgDuo", alt: "cgStage", stage: 0, tint: "rgba(120, 90, 200, 0.22)" },
    dark: { cg: "cgDark", stage: 5, tint: "rgba(10, 4, 24, 0.5)" },
    depart: { cg: "cgDepart", map: true },
    laugh: { cg: "cgLaugh", stage: 5, glow: true },
    stage: { cg: "cgStage", stage: 0, spot: true },
    finale: { cg: "cgFinale", stage: 0, glow: true },
    world0: { stage: 0 }, world1: { stage: 1 }, world2: { stage: 2 },
    world3: { stage: 3 }, world4: { stage: 4 }, world5: { stage: 5 }
  };

  function drawBackground(key, t) {
    const cfg = BG_FALLBACK[key] || BG_FALLBACK.city;
    const zoom = 1.06 + Math.min(0.08, t * 0.006);
    const panX = Math.sin(t * 0.12) * 18;
    ctx.fillStyle = "#1b1236";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const cg = cfg.cg && ok(img[cfg.cg]) ? img[cfg.cg] : cfg.alt ? img[cfg.alt] : null;
    if (ok(cg)) {
      coverDraw(cg, zoom, panX, 0);
      return true;
    }
    let base = null;
    if (cfg.map && ok(worldMapImage)) base = worldMapImage;
    else if (cfg.stage === 0 && ok(pastelBackground)) base = pastelBackground;
    else if (ok(stageBackgroundImages[cfg.stage ?? 0])) base = stageBackgroundImages[cfg.stage ?? 0];
    if (base) coverDraw(base, zoom, panX, 0);
    if (cfg.tint) {
      ctx.fillStyle = cfg.tint;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    if (cfg.glow) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const cx = canvas.width / 2;
      const cy = 230;
      ctx.translate(cx, cy);
      ctx.rotate(t * 0.12);
      for (let i = 0; i < 12; i++) {
        ctx.rotate(TAU / 12);
        const grad = ctx.createLinearGradient(0, 0, 0, -620);
        grad.addColorStop(0, "rgba(255, 243, 164, 0.3)");
        grad.addColorStop(1, "rgba(255, 243, 164, 0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(-10, 0);
        ctx.lineTo(-64, -620);
        ctx.lineTo(64, -620);
        ctx.lineTo(10, 0);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      drawWaraiStar(canvas.width / 2, 230 + Math.sin(t * 2) * 8, 92, true);
    }
    if (cfg.spot) {
      ctx.save();
      ctx.fillStyle = "rgba(24, 12, 60, 0.5)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = "lighter";
      for (const [x, sway] of [[250, 0.2], [1030, -0.2], [640, 0]]) {
        const a = sway + Math.sin(t * 0.8 + x) * 0.05;
        const grad = ctx.createLinearGradient(x, -20, x + Math.sin(a) * 600, 640);
        grad.addColorStop(0, "rgba(255, 245, 200, 0.42)");
        grad.addColorStop(1, "rgba(255, 245, 200, 0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(x - 14, -20);
        ctx.lineTo(x + 14, -20);
        ctx.lineTo(x + Math.sin(a) * 600 + 170, 640);
        ctx.lineTo(x + Math.sin(a) * 600 - 170, 640);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
    return false;
  }

  function drawAudience(t) {
    const y = 508;
    for (let k = 0; k < 6; k++) {
      const im = bossThemeImages[k];
      if (!ok(im)) continue;
      const h = k === 5 ? 132 : 104;
      const w = h * (im.naturalWidth / im.naturalHeight);
      const x = 430 + k * 84;
      const bob = Math.abs(Math.sin(t * 5 + k * 1.3)) * 12;
      ctx.drawImage(im, x - w / 2, y - h - bob, w, h);
    }
  }

  function drawHoloCard(initial, color, t, picture = null) {
    ctx.save();
    ctx.translate(0, -190);
    ctx.shadowColor = color;
    ctx.shadowBlur = 26;
    const grad = ctx.createLinearGradient(0, -150, 0, 150);
    grad.addColorStop(0, "rgba(255,255,255,0.95)");
    grad.addColorStop(1, "rgba(236, 226, 255, 0.92)");
    ctx.fillStyle = grad;
    ctx.strokeStyle = color;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.roundRect(-120, -150, 240, 300, 24);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.stroke();
    ctx.beginPath();
    ctx.roundRect(-120, -150, 240, 300, 24);
    ctx.clip();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (ok(picture)) {
      const s = Math.max(240 / picture.naturalWidth, 300 / picture.naturalHeight);
      const w = picture.naturalWidth * s;
      const h = picture.naturalHeight * s;
      ctx.drawImage(picture, -w / 2, -150, w, h);
    } else {
      const face = ctx.createRadialGradient(0, -20, 10, 0, -20, 110);
      face.addColorStop(0, "#ffffff");
      face.addColorStop(1, color);
      ctx.fillStyle = face;
      ctx.beginPath();
      ctx.arc(0, -24, 88, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "rgba(60, 40, 110, 0.55)";
      ctx.lineWidth = 8;
      ctx.lineJoin = "round";
      ctx.font = `900 96px ${FX.FONT}`;
      ctx.strokeText(initial, 0, -20);
      ctx.fillText(initial, 0, -20);
    }
    ctx.fillStyle = ok(picture) ? "rgba(160, 200, 255, 0.07)" : "rgba(127, 103, 200, 0.12)";
    const off = (t * 40) % 12;
    for (let y = -150 + off; y < 150; y += 12) ctx.fillRect(-120, y, 240, 4);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(-74, 92, 148, 34, 17);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = `900 17px ${FX.FONT}`;
    ctx.fillText(L("つうしん中", "ON CALL"), 0, 110);
    ctx.restore();
  }

  // ヤナビス：白い丸型ロボ＋ピンクのうさ耳＋黒いバイザーにピンクのLEDの顔
  function drawYanabis(g, t, headOnly = false) {
    const TAU2 = Math.PI * 2;
    g.save();
    g.translate(0, (headOnly ? 0 : -236) + Math.sin(t * 2.4) * (headOnly ? 0 : 7));
    g.lineJoin = "round";
    g.lineCap = "round";
    // うさ耳
    for (const side of [-1, 1]) {
      g.save();
      g.translate(side * 42, -78);
      g.rotate(side * (0.16 + Math.sin(t * 2 + side) * 0.03));
      g.fillStyle = "#ff9ecb";
      g.strokeStyle = "#ffffff";
      g.lineWidth = 5;
      g.beginPath();
      g.ellipse(0, -62, 24, 66, 0, 0, TAU2);
      g.fill();
      g.stroke();
      g.fillStyle = "#ffd3e8";
      g.beginPath();
      g.ellipse(0, -58, 11, 46, 0, 0, TAU2);
      g.fill();
      g.restore();
    }
    if (!headOnly) {
      // ボディと車輪
      g.fillStyle = "#3a3346";
      g.beginPath();
      g.ellipse(-44, 196, 26, 15, 0, 0, TAU2);
      g.ellipse(44, 196, 26, 15, 0, 0, TAU2);
      g.fill();
      const body = g.createLinearGradient(0, 92, 0, 196);
      body.addColorStop(0, "#ffffff");
      body.addColorStop(1, "#dcd6ea");
      g.fillStyle = body;
      g.strokeStyle = "#c9c0dd";
      g.lineWidth = 4;
      g.beginPath();
      g.roundRect(-70, 86, 140, 104, 34);
      g.fill();
      g.stroke();
      g.fillStyle = "#ff7fc0";
      g.beginPath();
      g.roundRect(-28, 150, 56, 9, 5);
      g.fill();
      g.globalCompositeOperation = "lighter";
      g.globalAlpha = 0.5 + Math.sin(t * 4) * 0.2;
      g.drawImage(FX.glowSprite("#ff7fc0"), -44, 132, 88, 44);
      g.globalCompositeOperation = "source-over";
      g.globalAlpha = 1;
    }
    // あたま
    const head = g.createRadialGradient(-34, -44, 12, 0, 0, 122);
    head.addColorStop(0, "#ffffff");
    head.addColorStop(0.7, "#f3f0fa");
    head.addColorStop(1, "#cfc7e2");
    g.fillStyle = head;
    g.strokeStyle = "#c9c0dd";
    g.lineWidth = 4;
    g.beginPath();
    g.ellipse(0, 0, 112, 98, 0, 0, TAU2);
    g.fill();
    g.stroke();
    // サイドのライト
    g.fillStyle = "#ff7fc0";
    g.beginPath();
    g.arc(-108, 8, 11, 0, TAU2);
    g.arc(108, 8, 11, 0, TAU2);
    g.fill();
    // バイザー
    g.fillStyle = "#15111d";
    g.beginPath();
    g.roundRect(-84, -46, 168, 104, 46);
    g.fill();
    g.fillStyle = "rgba(255, 255, 255, 0.1)";
    g.beginPath();
    g.ellipse(-36, -24, 34, 12, -0.4, 0, TAU2);
    g.fill();
    // LEDの顔
    g.globalCompositeOperation = "lighter";
    g.globalAlpha = 0.75;
    g.drawImage(FX.glowSprite("#ff5fb0"), -78, -30, 76, 58);
    g.drawImage(FX.glowSprite("#ff5fb0"), 2, -30, 76, 58);
    g.globalCompositeOperation = "source-over";
    g.globalAlpha = 1;
    g.strokeStyle = "#ff8fcb";
    g.lineWidth = 8;
    const blink = Math.sin(t * 1.3) > 0.965;
    g.beginPath();
    if (blink) {
      g.moveTo(-54, 4);
      g.lineTo(-26, 4);
      g.moveTo(26, 4);
      g.lineTo(54, 4);
    } else {
      g.arc(-40, 10, 15, Math.PI * 1.08, Math.PI * 1.92);
      g.moveTo(54.4, 6.3);
      g.arc(40, 10, 15, Math.PI * 1.92, Math.PI * 1.08, true);
    }
    g.stroke();
    g.lineWidth = 6;
    g.beginPath();
    g.arc(0, 22, 12, Math.PI * 0.15, Math.PI * 0.85);
    g.stroke();
    g.restore();
  }

  let yanabisIconUrl = "";
  function yanabisIcon() {
    if (yanabisIconUrl) return yanabisIconUrl;
    const c = document.createElement("canvas");
    c.width = c.height = 192;
    const g = c.getContext("2d");
    g.fillStyle = "#e6f7ff";
    g.fillRect(0, 0, 192, 192);
    g.translate(96, 132);
    g.scale(0.62, 0.62);
    drawYanabis(g, 0.3, true);
    yanabisIconUrl = c.toDataURL("image/png");
    return yanabisIconUrl;
  }

  // セリフから表情をえらぶ（台本で face を指定していればそちらを優先）
  function guessFace(ln) {
    const text = ln.ja || "";
    if (/！？|えっ|あれ？/.test(text)) return "surprise";
    if (/……。$|あかん|出てこ|…………/.test(text)) return "trouble";
    if (/！/.test(text)) return "smile";
    return null;
  }

  function faceImage(base, face) {
    const alt = face ? img[`${base}_${face}`] : null;
    return ok(alt) ? alt : img[base];
  }

  function drawPortrait(id, cx, baseY, active, appear, flip, face = null) {
    ctx.save();
    const bob = active ? Math.sin(time * 5) * 4 : 0;
    ctx.translate(cx, baseY + (1 - ease(appear)) * 70 + bob);
    ctx.globalAlpha = ease(appear) * (active ? 1 : 0.55);
    const s = active ? 1 : 0.92;
    ctx.scale(s * (flip ? -1 : 1), s);
    ctx.imageSmoothingQuality = "high";
    const fit = (image, h, anchorY = 1) => {
      const w = h * (image.naturalWidth / image.naturalHeight);
      ctx.drawImage(image, -w / 2, -h * anchorY, w, h);
    };
    if (id === "pyon") {
      if (ok(img.portraitPyon)) fit(img.portraitPyon, 430);
      else if (ok(pyompyJump)) ctx.drawImage(pyompyJump, -0.478 * 540, -0.86 * 540, 540, 540);
    } else if (id === "maou") {
      if (ok(bossThemeImages[5])) fit(bossThemeImages[5], 410, 0.98);
    } else if (id === "mystery") {
      const sil = silhouette(bossThemeImages[5]);
      if (sil) {
        const h = 410;
        const w = h * (sil.width / sil.height);
        ctx.drawImage(sil, -w / 2, -h * 0.98, w, h);
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha *= 0.8 + Math.sin(time * 6) * 0.2;
        ctx.drawImage(FX.glowSprite("#ff3d7f"), -52, -300, 44, 30);
        ctx.drawImage(FX.glowSprite("#ff3d7f"), 8, -300, 44, 30);
      }
    } else if (id === "ran") {
      if (flip) ctx.scale(-1, 1);
      if (ok(img.portraitRan)) fit(faceImage("portraitRan", face), 540);
      else drawHoloCard(L("ら", "R"), "#ff8db7", time);
    } else if (id === "luva") {
      if (flip) ctx.scale(-1, 1);
      if (ok(img.portraitLuva)) fit(img.portraitLuva, 560);
      else drawHoloCard(L("ル", "L"), "#8f8ad0", time, img.cardLuva);
    } else if (id === "yana") {
      if (flip) ctx.scale(-1, 1);
      if (ok(img.portraitYana)) fit(faceImage("portraitYana", face), 470);
      else drawYanabis(ctx, time);
    }
    ctx.restore();
  }

  function skipRect() {
    return { x: 20, y: 10, w: 176, h: 40 };
  }

  // 携帯ゲーム機レイアウトでは、会話の吹き出しをゲーム画面の下の欄に出す
  const storyBox = {
    el: document.querySelector("#gbStory"),
    name: document.querySelector("#gbStoryName"),
    text: document.querySelector("#gbStoryText"),
    key: ""
  };
  storyBox.el?.addEventListener("pointerdown", event => {
    event.preventDefault();
    if (state?.mode !== "cutscene") return;
    if (typeof unlockAudio === "function") unlockAudio();
    advanceCutscene();
  });

  function useStoryBox() {
    return Boolean(storyBox.el) && typeof Handheld !== "undefined" && Handheld.active() && Handheld.commOn();
  }

  function renderStoryBox(ln, sp, narr) {
    const shown = Math.floor(cs.shown);
    const total = [...lineText(ln)].length;
    const done = shown >= total && !cs.ending;
    const key = `${cs.i}:${language}:${shown}:${done}`;
    if (key === storyBox.key) return;
    const fresh = !storyBox.key.startsWith(`${cs.i}:${language}:`);
    storyBox.key = key;
    storyBox.el.classList.toggle("is-narration", narr);
    storyBox.el.classList.toggle("is-done", done);
    storyBox.el.style.setProperty("--speaker", narr ? "#c8b2ff" : sp.color);
    storyBox.name.textContent = narr ? "" : L(sp.ja, sp.en);
    storyBox.text.textContent = [...lineText(ln)].slice(0, shown).join("").replace(/\n/g, language === "ja" ? "" : " ");
    if (fresh) {
      storyBox.el.classList.remove("is-pop");
      void storyBox.el.offsetWidth;
      storyBox.el.classList.add("is-pop");
    }
  }

  function drawCutscene() {
    const W = canvas.width;
    const H = canvas.height;
    if (!cs) {
      ctx.fillStyle = "#1b1236";
      ctx.fillRect(0, 0, W, H);
      return;
    }
    const ln = cs.script.lines[Math.min(cs.i, cs.script.lines.length - 1)];
    const hasCg = drawBackground(cs.bg, cs.t);
    if (ln.aud) drawAudience(cs.t);
    // 背景切り替えのフェード
    if (cs.bgT < 0.5) {
      ctx.fillStyle = `rgba(27, 18, 54, ${1 - cs.bgT / 0.5})`;
      ctx.fillRect(0, 0, W, H);
    }
    const shade = ctx.createLinearGradient(0, H * 0.45, 0, H);
    shade.addColorStop(0, "rgba(20, 10, 48, 0)");
    shade.addColorStop(1, "rgba(20, 10, 48, 0.72)");
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, W, H);
    // レターボックス
    const bar = 58 * ease(cs.t / 0.6);
    ctx.fillStyle = "#120a2a";
    ctx.fillRect(0, 0, W, bar);
    ctx.fillRect(0, H - bar * 0.4, W, bar * 0.4);

    const sp = SPEAKERS[ln.s] || SPEAKERS.narr;
    const boxX = 120;
    const boxW = W - 240;
    const boxH = 172;
    const boxY = H - boxH - 34;
    const narr = !sp.side;
    if (!hasCg || !narr) {
      const left = cs.slots.left;
      const right = cs.slots.right;
      if (left && !(narr && hasCg)) drawPortrait(left.id, 236, boxY + 44, cs.active === "left", left.appear * (narr ? 0.7 : 1), false, left.face);
      if (right && !(narr && hasCg)) drawPortrait(right.id, W - 236, boxY + 44, cs.active === "right", right.appear * (narr ? 0.7 : 1), true, right.face);
    }

    // テキストボックス
    if (useStoryBox()) renderStoryBox(ln, sp, narr);
    else drawCanvasTextBox(ln, sp, narr, boxX, boxY, boxW, boxH);
    drawSkipButton();
  }

  function drawCanvasTextBox(ln, sp, narr, boxX, boxY, boxW, boxH) {
    ctx.save();
    const pop = ease(cs.lineT / 0.18);
    ctx.translate(0, (1 - pop) * 10);
    ctx.fillStyle = narr ? "rgba(22, 12, 54, 0.84)" : "rgba(255, 248, 253, 0.96)";
    ctx.strokeStyle = narr ? "rgba(200, 178, 255, 0.9)" : sp.color;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 22);
    ctx.fill();
    ctx.stroke();
    if (!narr) {
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(boxX + 7, boxY + 7, boxW - 14, boxH - 14, 16);
      ctx.stroke();
      const name = L(sp.ja, sp.en);
      ctx.font = `900 22px ${FX.FONT}`;
      const nameW = ctx.measureText(name).width + 48;
      const nameX = sp.side === "left" ? boxX + 34 : boxX + boxW - nameW - 34;
      ctx.fillStyle = sp.color;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(nameX, boxY - 24, nameW, 44, 22);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(name, nameX + nameW / 2, boxY - 1);
    }
    ctx.font = `800 ${narr ? 27 : 28}px ${FX.FONT}`;
    const wrapKey = `${cs.i}:${language}`;
    if (cs.wrapKey !== wrapKey || !cs.wrapped) {
      cs.wrapped = wrapLines(lineText(ln), boxW - 140);
      cs.wrapKey = wrapKey;
    }
    const lines = cs.wrapped;
    const lh = 42;
    let remaining = Math.floor(cs.shown);
    const startY = boxY + (boxH - lines.length * lh) / 2 + lh / 2 + (narr ? 0 : 8);
    ctx.textBaseline = "middle";
    ctx.textAlign = narr ? "center" : "left";
    ctx.fillStyle = narr ? "#ffffff" : "#3f355d";
    for (let i = 0; i < lines.length && remaining > 0; i++) {
      const chars = [...lines[i]];
      const part = chars.slice(0, remaining).join("");
      remaining -= chars.length;
      if (narr) {
        const fullW = ctx.measureText(lines[i]).width;
        ctx.textAlign = "left";
        ctx.fillText(part, boxX + boxW / 2 - fullW / 2, startY + i * lh);
      } else {
        ctx.fillText(part, boxX + 48, startY + i * lh);
      }
    }
    const total = [...lineText(ln)].length;
    if (cs.shown >= total && !cs.ending) {
      ctx.fillStyle = narr ? "#fff3a4" : sp.color;
      ctx.beginPath();
      const ax = boxX + boxW - 44;
      const ay = boxY + boxH - 34 + Math.sin(time * 7) * 4;
      ctx.moveTo(ax - 11, ay - 7);
      ctx.lineTo(ax + 11, ay - 7);
      ctx.lineTo(ax, ay + 9);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function drawSkipButton() {
    const r = skipRect();
    ctx.save();
    ctx.globalAlpha = 0.88;
    ctx.fillStyle = "rgba(255,255,255,0.16)";
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(r.x, r.y, r.w, r.h, 20);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.font = `800 16px ${FX.FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(L("スキップ ▶▶ (Esc)", "SKIP ▶▶ (Esc)"), r.x + r.w / 2, r.y + r.h / 2 + 1);
    ctx.restore();
  }

  // ---------- ワライスター ----------
  function drawWaraiStar(x, y, r, lit = true) {
    ctx.save();
    ctx.translate(x, y);
    if (lit) {
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.8;
      ctx.drawImage(FX.glowSprite("#ffd85a"), -r * 2, -r * 2, r * 4, r * 4);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
    }
    if (lit && ok(img.waraiStar)) {
      const w = r * 2.3;
      const h = w * (img.waraiStar.naturalHeight / img.waraiStar.naturalWidth);
      ctx.drawImage(img.waraiStar, -w / 2, -h / 2, w, h);
      ctx.restore();
      return;
    }
    ctx.rotate(Math.sin(time * 2) * 0.08);
    const g = ctx.createLinearGradient(0, -r, 0, r);
    if (lit) {
      g.addColorStop(0, "#fffbd0");
      g.addColorStop(0.55, "#ffd85a");
      g.addColorStop(1, "#ff9fc4");
    } else {
      g.addColorStop(0, "rgba(160, 140, 210, 0.55)");
      g.addColorStop(1, "rgba(110, 92, 170, 0.55)");
    }
    ctx.fillStyle = g;
    ctx.strokeStyle = lit ? "#ffffff" : "rgba(255,255,255,0.4)";
    ctx.lineWidth = Math.max(2, r * 0.09);
    ctx.lineJoin = "round";
    FX.starPath(r, 5, 0.52);
    ctx.fill();
    ctx.stroke();
    if (lit && r > 12) {
      ctx.strokeStyle = "#8a5a1c";
      ctx.lineWidth = Math.max(1.5, r * 0.07);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(-r * 0.2, -r * 0.02, r * 0.1, Math.PI, TAU);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(r * 0.2, -r * 0.02, r * 0.1, Math.PI, TAU);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, r * 0.12, r * 0.2, 0.1 * Math.PI, 0.9 * Math.PI);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ---------- ステージクリア ----------
  let rc = null;

  function beginStageClear(opts = {}) {
    const course = courses[currentCourse];
    const stars = state.starItems.filter(s => s.taken).length;
    const starTotal = state.starItems.length;
    const coins = state.coinItems.filter(c => c.taken).length;
    const coinTotal = state.coinItems.length;
    const timeBonus = Math.ceil(Math.max(0, state.time) / 5) * 5;
    const perfect = coinTotal > 0 && coins === coinTotal;
    const scoreFrom = state.score;
    state.score += timeBonus + (perfect ? 100 : 0) + (opts.boss ? 200 : 0);
    data.stars[currentCourse] = Math.max(data.stars[currentCourse] || 0, stars);
    const f = level.flag;
    rc = {
      t: 0, boss: !!opts.boss, world: course.worldIndex,
      stars, starTotal, coins, coinTotal, timeBonus, perfect,
      scoreFrom, scoreTo: state.score,
      shard: opts.boss ? Math.min(6, shardCount() + (completedCourses.has(currentCourse) ? 0 : 1)) : 0,
      starPopped: 0, leaving: false, fireT: 0.4,
      gateX: f.x + f.w / 2, gateY: f.y + 122
    };
    state.mode = "stageClear";
    FX.resetCombo();
    FX.confetti(opts.boss ? 90 : 60);
    FX.flash("#ffffff", 0.45, 0.4);
    if (window.Bgm) {
      Bgm.stop(0.15);
      Bgm.jingle(opts.boss ? "bossClear" : "stageClear");
    }
    playSfx("stageClear", state.player.x);
  }

  function clearRowsDone() {
    return rc && rc.t > (rc.boss ? 3.6 : 2.9);
  }

  function advanceStageClear() {
    if (!rc || rc.leaving || FX.transitioning()) return;
    if (!clearRowsDone()) {
      rc.t = 10;
      return;
    }
    rc.leaving = true;
    playSfx("confirm");
    FX.startTransition({
      type: "iris", dur: 1.0, x: canvas.width / 2, y: canvas.height / 2,
      onMid: () => {
        rc = null;
        nextCourse();
      }
    });
  }

  function updateStageClear(dt) {
    if (!rc) return;
    rc.t += dt;
    const p = state.player;
    if (!rc.boss) {
      // ゲートに吸い込まれる
      const k = Math.min(1, dt * 5);
      p.x += (rc.gateX - p.w / 2 - p.x) * k;
      p.y += (rc.gateY - p.h / 2 - p.y) * k;
      p.vx = 0;
      p.vy = 0;
      if (rc.t < 0.8 && Math.random() < 0.5) {
        FX.add({ type: "star", x: p.x + p.w / 2, y: p.y + p.h / 2, vx: (Math.random() - 0.5) * 260, vy: (Math.random() - 0.5) * 260, r: 6, life: 0.5, color: FX.PASTEL[(Math.random() * 6) | 0], vr: 6 });
      }
    }
    const starStart = 1.5;
    const popped = Math.min(rc.stars, Math.max(0, Math.floor((rc.t - starStart) / 0.28) + 1));
    if (rc.t >= starStart && popped > rc.starPopped) {
      rc.starPopped = popped;
      playSfx("snackStar");
    }
    rc.fireT -= dt;
    if (rc.fireT <= 0 && !rc.leaving) {
      rc.fireT = rc.boss ? 0.5 : 0.9;
      FX.firework(120 + Math.random() * (canvas.width - 240), 70 + Math.random() * 180, Math.random() < 0.5 ? FX.PASTEL : FX.GOLD);
    }
  }

  function stageClearWarp() {
    // drawPlayer から参照: ゲートへ吸い込まれる縮小率
    if (!rc || rc.boss) return 1;
    return Math.max(0, 1 - rc.t / 0.7);
  }

  function drawStageClear() {
    if (!rc) return;
    const W = canvas.width;
    const t = rc.t;
    ctx.save();
    ctx.fillStyle = `rgba(24, 12, 60, ${0.42 * ease(t / 0.5)})`;
    ctx.fillRect(0, 0, W, canvas.height);

    // タイトル文字
    const title = rc.boss ? "BOSS CLEAR!" : "STAGE CLEAR!";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.font = `900 76px ${FX.FONT}`;
    const widths = [...title].map(ch => ctx.measureText(ch).width);
    const totalW = widths.reduce((a, b) => a + b, 0);
    let x = W / 2 - totalW / 2;
    [...title].forEach((ch, i) => {
      const k = ease((t - i * 0.045) / 0.35);
      const bounce = Math.sin(time * 4 + i * 0.5) * 6;
      const cx = x + widths[i] / 2;
      const cy = 118 - (1 - k) * 160 + bounce * k;
      ctx.globalAlpha = k;
      ctx.lineWidth = 14;
      ctx.strokeStyle = "#ffffff";
      ctx.strokeText(ch, cx, cy);
      ctx.lineWidth = 8;
      ctx.strokeStyle = rc.boss ? "#ff5f9e" : "#7f67c8";
      ctx.strokeText(ch, cx, cy);
      ctx.fillStyle = ["#fff3a4", "#ffd1ed", "#c9f6ff", "#d9ffd6"][i % 4];
      ctx.fillText(ch, cx, cy);
      x += widths[i];
    });
    ctx.globalAlpha = 1;

    // パネル
    const pk = ease((t - 0.45) / 0.4);
    const pw = 640;
    const ph = rc.boss ? 420 : 340;
    const px = W / 2 - pw / 2;
    const py = 188 + (1 - pk) * 40;
    ctx.globalAlpha = pk;
    ctx.fillStyle = "rgba(255, 248, 253, 0.96)";
    ctx.strokeStyle = "#c8b2ff";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.roundRect(px, py, pw, ph, 26);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "rgba(255, 141, 183, 0.6)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(px + 9, py + 9, pw - 18, ph - 18, 19);
    ctx.stroke();

    ctx.font = `900 24px ${FX.FONT}`;
    ctx.fillStyle = "#7f67c8";
    ctx.fillText(`${stageLabel()}  ${worldName(rc.world)}`, W / 2, py + 44);

    let rowY = py + 100;
    const row = (label, value, at, color = "#4d4773") => {
      const k = ease((t - at) / 0.3);
      if (k <= 0) {
        rowY += 54;
        return;
      }
      ctx.globalAlpha = pk * k;
      ctx.textAlign = "left";
      ctx.font = `800 24px ${FX.FONT}`;
      ctx.fillStyle = "#6a5f96";
      ctx.fillText(label, px + 64 - (1 - k) * 30, rowY);
      ctx.textAlign = "right";
      ctx.font = `900 28px ${FX.FONT}`;
      ctx.fillStyle = color;
      ctx.fillText(value, px + pw - 64, rowY);
      rowY += 54;
      ctx.globalAlpha = pk;
    };
    const count = (to, at, dur = 0.6) => Math.round(to * Math.min(1, Math.max(0, (t - at) / dur)));
    row(L("タイムボーナス", "Time Bonus"), `+${count(rc.timeBonus, 0.9)}`, 0.8, "#2aa7c9");
    row(L("柿ピー", "Kaki-Pea"), `${rc.coins} / ${rc.coinTotal}${rc.perfect ? "  PERFECT +100" : ""}`, 1.15, rc.perfect ? "#ff5f9e" : "#d98a2b");
    // スター
    {
      const k = ease((t - 1.5) / 0.3);
      if (k > 0) {
        ctx.globalAlpha = pk * k;
        ctx.textAlign = "left";
        ctx.font = `800 24px ${FX.FONT}`;
        ctx.fillStyle = "#6a5f96";
        ctx.fillText(L("スター", "Stars"), px + 64, rowY);
        for (let i = 0; i < rc.starTotal; i++) {
          const got = i < rc.starPopped;
          const since = t - (1.5 + i * 0.28);
          const s = got ? 1 + Math.max(0, 0.6 - since * 2.4) : 1;
          ctx.save();
          ctx.translate(px + pw - 64 - (rc.starTotal - 1 - i) * 52 - 20, rowY);
          ctx.scale(s, s);
          ctx.fillStyle = got ? "#ffd85a" : "rgba(160, 140, 210, 0.35)";
          ctx.strokeStyle = got ? "#ffffff" : "rgba(127, 103, 200, 0.4)";
          ctx.lineWidth = 3;
          FX.starPath(20, 5, 0.5);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }
        ctx.globalAlpha = pk;
      }
      rowY += 54;
    }
    if (rc.boss) {
      const k = ease((t - 2.1) / 0.4);
      if (k > 0) {
        ctx.globalAlpha = pk * k;
        ctx.textAlign = "left";
        ctx.font = `900 24px ${FX.FONT}`;
        ctx.fillStyle = "#ff5f9e";
        ctx.fillText(L("ワライスターのかけら", "Warai Star Shards"), px + 64, rowY);
        for (let i = 0; i < 6; i++) {
          const lit = i < rc.shard;
          const isNew = i === rc.shard - 1;
          const s = isNew ? 1 + Math.max(0, 1 - (t - 2.3) * 2) * 0.9 + Math.sin(time * 6) * 0.06 : 1;
          drawWaraiStar(px + pw - 64 - (5 - i) * 44 - 16, rowY, 17 * s, lit && (!isNew || t > 2.3));
        }
        ctx.globalAlpha = pk;
      }
      rowY += 60;
    }
    // スコア
    {
      const at = rc.boss ? 2.7 : 2.1;
      const k = ease((t - at) / 0.3);
      if (k > 0) {
        ctx.globalAlpha = pk * k;
        ctx.fillStyle = "rgba(200, 178, 255, 0.5)";
        ctx.fillRect(px + 56, rowY - 30, pw - 112, 3);
        ctx.textAlign = "left";
        ctx.font = `900 26px ${FX.FONT}`;
        ctx.fillStyle = "#7f67c8";
        ctx.fillText(L("スコア", "Score"), px + 64, rowY + 8);
        ctx.textAlign = "right";
        ctx.font = `900 40px ${FX.FONT}`;
        ctx.fillStyle = "#f5a91b";
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 6;
        const val = rc.scoreFrom + count(rc.scoreTo - rc.scoreFrom, at, 0.7);
        ctx.strokeText(String(val), px + pw - 64, rowY + 6);
        ctx.fillText(String(val), px + pw - 64, rowY + 6);
      }
    }
    ctx.globalAlpha = 1;
    if (clearRowsDone() && !rc.leaving && Math.sin(time * 6) > -0.3) {
      ctx.textAlign = "center";
      ctx.font = `900 22px ${FX.FONT}`;
      ctx.lineWidth = 6;
      ctx.strokeStyle = "rgba(44, 30, 92, 0.9)";
      ctx.fillStyle = "#ffffff";
      const msg = L("▶ ボタン / タップで つぎへ", "▶ Press a button / tap to continue");
      ctx.strokeText(msg, W / 2, py + ph + 36);
      ctx.fillText(msg, W / 2, py + ph + 36);
    }
    ctx.restore();
  }

  // ---------- スタッフロール ----------
  let cr = null;

  function creditLines() {
    const st = starTotals();
    const keep = campaignKeep || {};
    const rank = st.got >= st.total ? "S" : st.got >= st.total * 0.7 ? "A" : st.got >= st.total * 0.4 ? "B" : "C";
    return [
      { big: true, text: L("ぴょんぴーの大冒険", "Pyon-P Adventure") },
      { text: L("〜 ワライスターをとりもどせ 〜", "~ Bring Back the Warai Star ~"), color: "#ffd1ed" },
      { gap: 70 },
      { head: true, text: "CAST" },
      { text: L("ぴょんぴー", "Pyon-P") },
      { text: L("らんぴょん", "Ranpyon") },
      { text: L("ザ・ルーヴァ・セレス", "Za-Luva Seles") },
      { text: L("ヤナビス（Y.A.N.A.V.I.S）", "Yanabisu (Y.A.N.A.V.I.S)") },
      { gap: 40 },
      { head: true, text: L("6つの星のボスたち", "Bosses of the Six Planets") },
      ...BOSS_NAMES.map(([ja, en]) => ({ text: L(ja, en) })),
      { gap: 40 },
      { head: true, text: L("原作・キャラクター", "Original Characters") },
      { text: L("ムーニアンズ", "Moonians") },
      { gap: 40 },
      { head: true, text: L("ゲーム制作", "Game Production") },
      { text: L("ムーニアンズ ゲームチーム", "Moonians Game Team") },
      { gap: 40 },
      { head: true, text: L("スペシャルサンクス", "Special Thanks") },
      { text: L("あそんでくれた ムーニーのみんな", "Every Moonie who played") },
      { gap: 80 },
      { head: true, text: L("あなたの記録", "Your Record") },
      { text: `${L("スコア", "Score")}  ${keep.score ?? state.score ?? 0}` },
      { text: `${L("柿の種", "Kaki")} ${keep.kakiTotal ?? 0}   ${L("ピーナッツ", "Peanuts")} ${keep.peaTotal ?? 0}` },
      { text: `${L("スター", "Stars")}  ${st.got} / ${st.total}` },
      { text: `${L("ぼうけんランク", "Adventure Rank")}  ${rank}`, color: "#fff3a4" },
      { gap: 120 },
      { big: true, text: "THANK YOU FOR PLAYING!" }
    ];
  }

  function startCredits() {
    data.cleared = true;
    persist();
    const lines = creditLines();
    let y = 0;
    for (const ln of lines) {
      if (ln.gap) {
        y += ln.gap;
        continue;
      }
      y += ln.big ? 86 : ln.head ? 64 : 48;
      ln.y = y;
    }
    cr = { t: 0, scroll: 0, lines, height: y, fast: false, done: false, leaving: false, fireT: 1 };
    state.mode = "credits";
    FX.confetti(80);
  }

  function advanceCredits() {
    if (!cr || cr.leaving || FX.transitioning()) return;
    if (!cr.done) {
      cr.fast = !cr.fast;
      return;
    }
    cr.leaving = true;
    playSfx("confirm");
    FX.startTransition({
      type: "fade", dur: 1.2,
      onMid: () => {
        cr = null;
        returnToTitle();
      }
    });
  }

  function updateCredits(dt) {
    if (!cr) return;
    cr.t += dt;
    const end = cr.height + canvas.height * 0.55;
    if (!cr.done) {
      cr.scroll += dt * (cr.fast ? 420 : 62);
      if (cr.scroll >= end) {
        cr.scroll = end;
        cr.done = true;
        cr.doneT = 0;
        FX.confetti(120);
        if (window.Bgm) Bgm.jingle("fanfare");
      }
    } else {
      cr.doneT += dt;
    }
    cr.fireT -= dt;
    if (cr.fireT <= 0) {
      cr.fireT = cr.done ? 0.45 : 1.3;
      FX.firework(100 + Math.random() * (canvas.width - 200), 60 + Math.random() * 220, Math.random() < 0.5 ? FX.PASTEL : FX.GOLD);
    }
  }

  function drawCredits() {
    const W = canvas.width;
    const H = canvas.height;
    if (!cr) {
      ctx.fillStyle = "#1b1236";
      ctx.fillRect(0, 0, W, H);
      return;
    }
    const hasCg = drawBackground(cr.done ? "finale" : "city", cr.t);
    ctx.fillStyle = "rgba(24, 12, 60, 0.56)";
    ctx.fillRect(0, 0, W, H);
    // カーテンコール
    if (!hasCg) {
      const baseY = H - 26;
      for (let k = 0; k < 6; k++) {
        const im = bossThemeImages[k];
        if (!ok(im)) continue;
        const h = k === 5 ? 170 : 130;
        const w = h * (im.naturalWidth / im.naturalHeight);
        const x = (k < 3 ? 110 + k * 150 : W - 110 - (5 - k) * 150);
        const bob = Math.abs(Math.sin(cr.t * 4 + k * 1.1)) * 16;
        ctx.save();
        ctx.globalAlpha = 0.95;
        if (k >= 3) {
          ctx.translate(x, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(im, -w / 2, baseY - h - bob, w, h);
        } else {
          ctx.drawImage(im, x - w / 2, baseY - h - bob, w, h);
        }
        ctx.restore();
      }
      if (ok(pyompyJump)) {
        const hop = Math.abs(Math.sin(cr.t * 3.2)) * 46;
        ctx.drawImage(pyompyJump, W / 2 - 0.478 * 250, baseY - 0.82 * 250 - hop, 250, 250);
      }
    }
    // スクロール文字
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    for (const ln of cr.lines) {
      if (ln.gap) continue;
      const y = H + ln.y - cr.scroll;
      if (y < -60 || y > H + 60) continue;
      const edge = Math.min(1, Math.min(y - 40, H - 200 - y) / 90);
      ctx.globalAlpha = Math.max(0, Math.min(1, edge + 0.1)) * (cr.done ? Math.max(0, 1 - cr.doneT / 0.5) : 1);
      ctx.font = `900 ${ln.big ? 58 : ln.head ? 22 : 32}px ${FX.FONT}`;
      ctx.lineWidth = ln.big ? 10 : 6;
      ctx.strokeStyle = ln.big ? "#7f67c8" : "rgba(30, 16, 70, 0.9)";
      ctx.fillStyle = ln.color || (ln.big ? "#fff3a4" : ln.head ? "#9ee8ff" : "#ffffff");
      ctx.strokeText(ln.text, W / 2, y);
      ctx.fillText(ln.text, W / 2, y);
    }
    ctx.restore();
    if (cr.done) {
      const k = ease(cr.doneT / 0.8);
      ctx.save();
      ctx.globalAlpha = k;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineJoin = "round";
      ctx.font = `900 92px ${FX.FONT}`;
      ctx.lineWidth = 16;
      ctx.strokeStyle = "#ffffff";
      ctx.strokeText(L("おしまい", "THE END"), W / 2, 350);
      ctx.lineWidth = 9;
      ctx.strokeStyle = "#7f67c8";
      ctx.strokeText(L("おしまい", "THE END"), W / 2, 350);
      ctx.fillStyle = "#fff3a4";
      ctx.fillText(L("おしまい", "THE END"), W / 2, 350);
      ctx.font = `900 30px ${FX.FONT}`;
      ctx.lineWidth = 7;
      ctx.strokeStyle = "rgba(30, 16, 70, 0.9)";
      ctx.fillStyle = "#ffd1ed";
      const thanks = L("あそんでくれて ありがとう！", "Thank you so much for playing!");
      ctx.strokeText(thanks, W / 2, 430);
      ctx.fillText(thanks, W / 2, 430);
      if (cr.doneT > 1.2 && Math.sin(time * 6) > -0.3) {
        ctx.font = `900 20px ${FX.FONT}`;
        ctx.fillStyle = "#ffffff";
        const msg = L("▶ ボタン / タップで タイトルへ", "▶ Press a button / tap for title");
        ctx.strokeText(msg, W / 2, 486);
        ctx.fillText(msg, W / 2, 486);
      }
      ctx.restore();
    } else {
      ctx.save();
      ctx.globalAlpha = 0.75;
      ctx.textAlign = "right";
      ctx.font = `800 15px ${FX.FONT}`;
      ctx.fillStyle = "#ffffff";
      ctx.fillText(L(cr.fast ? "▶▶ はやおくり中" : "ボタン / タップで はやおくり", cr.fast ? "▶▶ Fast-forward" : "Press / tap to fast-forward"), W - 24, 28);
      ctx.restore();
    }
  }

  // ---------- 入力 ----------
  const STORY_MODES = { cutscene: true, stageClear: true, credits: true, bossDeath: true, movie: true, shop: true };
  const CONFIRM = ["Enter", "Space", "KeyX", "KeyY", "KeyJ", "KeyZ"];

  function handleKey(code) {
    const mode = state.mode;
    if (mode === "movie") {
      if (movie && (code === "Escape" || CONFIRM.includes(code))) movie.finish();
      return true;
    }
    if (mode === "shop") return Shop.handleKey(code);
    if (mode === "cutscene") {
      if (code === "Escape") {
        if (!FX.transitioning()) finish();
      } else if (CONFIRM.includes(code)) advanceCutscene();
      return true;
    }
    if (mode === "stageClear") {
      if (CONFIRM.includes(code) || code === "Escape") advanceStageClear();
      return true;
    }
    if (mode === "credits") {
      if (CONFIRM.includes(code) || code === "Escape") advanceCredits();
      return true;
    }
    return mode === "bossDeath";
  }

  function handlePointer(x, y) {
    const mode = state.mode;
    if (mode === "movie") {
      if (movie) movie.finish();
      return true;
    }
    if (mode === "shop") return Shop.handlePointer(x, y);
    if (mode === "cutscene") {
      const r = skipRect();
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
        if (!FX.transitioning()) finish();
      } else advanceCutscene();
      return true;
    }
    if (mode === "stageClear") {
      advanceStageClear();
      return true;
    }
    if (mode === "credits") {
      advanceCredits();
      return true;
    }
    return mode === "bossDeath";
  }

  function update(dt) {
    time += dt;
    const mode = state.mode;
    if (mode === "cutscene") updateCutscene(dt);
    else if (mode === "stageClear") updateStageClear(dt);
    else if (mode === "credits") updateCredits(dt);
    else if (mode === "shop") Shop.update(dt);
  }

  // ---------- ワールドマップの追加表示 ----------
  function drawMapNodeStars(index, p) {
    const total = (courses[index]?.level.starItems ?? []).length;
    if (!total || !completedCourses.has(index)) return;
    const got = Math.min(total, data.stars[index] || 0);
    ctx.save();
    for (let i = 0; i < total; i++) {
      ctx.save();
      ctx.translate(p.x + (i - (total - 1) / 2) * 13, p.y + 27);
      ctx.fillStyle = i < got ? "#ffd85a" : "rgba(90, 70, 150, 0.55)";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      FX.starPath(6.5, 5, 0.5);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  function drawMapHud() {
    const shards = shardCount();
    const st = starTotals();
    ctx.save();
    ctx.fillStyle = "rgba(255, 248, 253, 0.9)";
    ctx.strokeStyle = "#c8b2ff";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(22, 20, 330, 96, 18);
    ctx.fill();
    ctx.stroke();
    ctx.font = `900 17px ${FX.FONT}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ff5f9e";
    ctx.fillText(L("ワライスターのかけら", "Warai Star Shards"), 42, 44);
    for (let i = 0; i < 6; i++) drawWaraiStar(58 + i * 40, 82, 15, i < shards);
    ctx.textAlign = "right";
    ctx.fillStyle = "#d98a2b";
    ctx.fillText(`★ ${st.got}/${st.total}`, 336, 44);
    ctx.font = `900 22px ${FX.FONT}`;
    ctx.fillStyle = "#7f67c8";
    ctx.fillText(`${shards}/6`, 336, 84);
    ctx.restore();
  }

  // ---------- タイトル ----------
  function drawTitleKey() {
    if (!ok(img.titleKey)) return false;
    coverDraw(img.titleKey, 1.04 + Math.sin(time * 0.3) * 0.015, Math.sin(time * 0.2) * 10, 0);
    return true;
  }

  function returnToTitle() {
    currentCourse = 0;
    state = newState();
    state.mode = "title";
    pendingCourseStart = false;
    overlay.classList.remove("hidden");
    refreshTitleUi();
  }

  function refreshTitleUi() {
    const h1 = overlay.querySelector("h1");
    const p = overlay.querySelector("p");
    const newBtn = document.querySelector("#newGameButton");
    const sub = document.querySelector("#titleSub");
    const atTitle = state?.mode === "title";
    // タイトル画面では専用ロゴを出し、文字のタイトルとサブタイトルはロゴにまかせる
    const logo = document.querySelector(".brand-logo");
    if (logo) {
      logo.classList.toggle("title-logo", atTitle);
      if (atTitle) {
        if (!logo.src.endsWith("assets/title-logo.png")) logo.src = "assets/title-logo.png";
        logo.alt = t("title");
      } else if (logo.src.endsWith("assets/title-logo.png")) {
        logo.src = language === "en" ? "assets/moonians-logo-English.png" : "assets/moonians-logo.png";
      }
    }
    h1.classList.toggle("hidden", atTitle);
    if (atTitle) {
      h1.textContent = t("title");
      p.textContent = t("controls");
      startButton.textContent = hasSave() ? L("つづきから", "Continue") : L("はじめる", "Start");
    }
    if (newBtn) {
      newBtn.textContent = L("はじめから", "New Game");
      newBtn.classList.toggle("hidden", !(atTitle && hasSave()));
      delete newBtn.dataset.armed;
    }
    if (sub) {
      sub.textContent = L("〜 ワライスターをとりもどせ 〜", "~ Bring Back the Warai Star ~") + (data.cleared ? "  ★" : "");
      sub.classList.add("hidden");
    }
    const sound = document.querySelector("#soundButton");
    if (sound) sound.textContent = (typeof soundEnabled !== "undefined" && soundEnabled) ? "♪ ON" : "♪ OFF";
    if (typeof syncTitleFocus === "function") syncTitleFocus();
  }

  // ---------- BGM 切り替え ----------
  let lastWant;
  let lastDuck = false;

  function desiredTrack() {
    const m = state.mode;
    if (m === "title") return "title";
    if (m === "worldMap" || m === "shop") return "map";
    if (m === "cutscene") return cs?.music || "story";
    if (m === "credits") return cr?.done ? null : "credits";
    if (m === "stageClear" || m === "bossDeath" || m === "ended" || m === "movie") return null;
    const course = courses[currentCourse];
    if (course?.bossStage && state.bossIntroPlayed) {
      if (state.enemies.some(e => e.boss && e.alive)) return course.finalStage ? "finalBoss" : "boss";
      return null;
    }
    return `world${course?.worldIndex ?? 0}`;
  }

  // assets/bgm/<曲名>.mp3 があればそれを流し、なければ bgm.js の自動演奏を使う
  const fileTracks = {};
  let filePlaying = null;

  function fileTrack(name) {
    let tr = fileTracks[name];
    if (tr) return tr;
    const audio = new Audio();
    audio.loop = true;
    audio.preload = "auto";
    tr = fileTracks[name] = { audio, ready: false, missing: false, vol: 0, gain: null };
    // iPhone/iPad では audio.volume が変えられず、フェードアウトが終わらずに前の曲が鳴り続けるので、
    // WebAudio の GainNode を通して音量を操作する（ゲーム全体のミュートもここに効く）
    try {
      const ac = getAudioContext();
      const out = audioOut();
      if (ac && out && ac.createMediaElementSource) {
        tr.gain = ac.createGain();
        tr.gain.gain.value = 0;
        ac.createMediaElementSource(audio).connect(tr.gain).connect(out);
      }
    } catch (_) {
      tr.gain = null;
    }
    audio.addEventListener("canplaythrough", () => { tr.ready = true; }, { once: true });
    audio.addEventListener("error", () => { tr.missing = true; }, { once: true });
    audio.src = `assets/bgm/${name}.mp3`;
    return tr;
  }

  function setFileVol(tr, v) {
    tr.vol = v;
    if (tr.gain) tr.gain.gain.value = v;
    else tr.audio.volume = v;
  }

  // 音量は tr.vol で数える（audio.volume を読み返さない）ので、どの端末でも必ず止まる
  function fadeFile(tr, to, stopAfter) {
    clearInterval(tr.fade);
    tr.fade = setInterval(() => {
      const v = tr.vol + Math.sign(to - tr.vol) * 0.06;
      if (Math.abs(to - v) <= 0.06) {
        setFileVol(tr, to);
        clearInterval(tr.fade);
        if (stopAfter) tr.audio.pause();
      } else {
        setFileVol(tr, Math.min(1, Math.max(0, v)));
      }
    }, 30);
  }

  function syncMusic() {
    if (!window.Bgm || !audioUnlocked) return;
    const want = desiredTrack();
    const duck = state.mode === "paused" || state.mode === "inventory";
    const tr = want ? fileTrack(want) : null;
    const useFile = !!tr && tr.ready && !tr.missing;
    const key = want ? `${useFile ? "file" : "synth"}:${want}` : null;
    if (key !== lastWant) {
      lastWant = key;
      if (filePlaying && filePlaying !== tr) {
        fadeFile(filePlaying, 0, true);
        filePlaying = null;
      }
      if (useFile) {
        Bgm.stop(0.3);
        tr.audio.currentTime = 0;
        setFileVol(tr, 0);
        tr.audio.play().catch(() => { tr.missing = true; });
        fadeFile(tr, duck ? 0.2 : 0.6, false);
        filePlaying = tr;
      } else if (want) {
        Bgm.play(want);
      } else {
        Bgm.stop(0.4);
      }
    }
    if (filePlaying) filePlaying.audio.muted = !soundEnabled;
    if (duck !== lastDuck) {
      lastDuck = duck;
      Bgm.duck(duck);
      if (filePlaying) fadeFile(filePlaying, duck ? 0.2 : 0.6, false);
    }
  }

  window.Story = {
    get data() { return data; },
    img, ok,
    worldName, bossName,
    persist, hasSave, resetSave, applyToGame, shardCount, starTotals,
    play, playMovie, update, handleKey, handlePointer,
    isStoryMode: mode => !!STORY_MODES[mode],
    drawCutscene, drawStageClear, drawCredits, drawWaraiStar,
    beginStageClear, stageClearWarp, startCredits,
    drawMapNodeStars, drawMapHud,
    drawTitleKey, returnToTitle, refreshTitleUi, yanabisIcon,
    syncMusic,
    seen: id => !!data.seen[id]
  };
})();

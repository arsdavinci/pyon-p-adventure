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
    portraitPyon: "assets/pyonpy-victory.png",
    portraitRan: "assets/portrait-ranpyon.webp",
    portraitLuva: "assets/portrait-luva.webp",
    cardLuva: "assets/portrait-luva-card.jpg",
    portraitYana: "assets/portrait-yanabis.webp",
    portraitRan_smile: "assets/portrait-ranpyon-smile.webp",
    portraitRan_surprise: "assets/portrait-ranpyon-surprise.webp",
    portraitRan_trouble: "assets/portrait-ranpyon-trouble.webp",
    portraitLuva_trouble: "assets/portrait-luva-trouble.webp",
    portraitYana_smile: "assets/portrait-yanabis-smile.webp",
    portraitYana_surprise: "assets/portrait-yanabis-surprise.webp",
    portraitYana_trouble: "assets/portrait-yanabis-trouble.webp",
    portraitKaguya: "assets/portrait-kaguya.webp",
    // ホログラムのモニター（なければプログラムで描く）
    holoFrame: "assets/holo-monitor-frame.png",
    holoBase: "assets/holo-projector.png",
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
    // オープニング・エンディングの大きな絵は、会話がはじまるときに読みこむ（スマホのメモリを節約）
    if (key.startsWith("cg")) im.lazySrc = src;
    else im.src = src;
    img[key] = im;
  }
  function loadStoryArt() {
    for (const im of Object.values(img)) {
      if (im.lazySrc && !im.loadStarted) {
        im.loadStarted = true;
        im.src = im.lazySrc;
      }
    }
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

  // セーブファイル（3つ）用：今の記録をまるごと取り出す／入れかえる
  function exportSave() {
    return JSON.parse(JSON.stringify(data));
  }

  function importSave(saved) {
    const d = Object.assign(blank(), JSON.parse(JSON.stringify(saved || {})));
    if (!Array.isArray(d.completed)) d.completed = [];
    if (!d.stars || typeof d.stars !== "object") d.stars = {};
    if (!d.seen || typeof d.seen !== "object") d.seen = {};
    if (d.keep && (!Array.isArray(d.keep.weaponInventory) || !Array.isArray(d.keep.inventoryItems))) d.keep = null;
    data = d;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch (_) {}
    applyToGame();
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
      const n = courseStarTotal(i);
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
    mystery: { ja: "？？？", en: "???", color: "#5a2a78", side: "right" },
    // かぐや様は、まん中のホログラムのモニターに映る
    kaguya: { ja: "かぐや様", en: "Princess Kaguya", color: "#a46ad8", side: "holo" }
  };

  const SCRIPTS = {
    opening: {
      music: "opening",
      lines: [
        { s: "narr", bg: "city", ja: "月の内側に広がる、パステル色の街。\n月生まれ・月育ちのムーニアンたちは、今日も笑ってくらしていた。", en: "Inside the Moon lies a pastel city.\nThe Moonians who live there spend every day laughing together." },
        { s: "narr", ja: "三日月大使館のお笑いコンビ『ムーニアンズ』は、\n宇宙最大の舞台『銀河お笑いフェス』を、3日後にひかえていた。", en: "The comedy duo \"Moonians\" of the Crescent Embassy were\nthree days away from the biggest show in space: the Galaxy Comedy Fest." },
        { s: "pyon", bg: "duo", ja: "らんぴょん、フェスのネタ合わせしょうか！ まずは新ギャグじゃ。『月見バーガー、月で見たら……ただのバーガー！』", en: "Ranpyon, let's rehearse for the Fest! New gag first: \"A moon-viewing burger, viewed ON the moon... is just a burger!\"" },
        { s: "ran", ja: "…………。", en: "............" },
        { s: "pyon", ja: "えっ、ツッコミは！？ 『なんでよっ！』は！？", en: "Huh? Where's the comeback!? Where's my \"No way!\"?" },
        { s: "ran", ja: "すみません、先輩……。どうツッコんだらええんか、ぜんぜん思い出せんのです……。", en: "I can't... I've completely forgotten how to do a comeback..." },
        { s: "narr", bg: "dark", music: "bossAppear", fx: "shake", ja: "そのとき、夜空がまっくろにそまった。\n宇宙じゅうの“笑い”が、空のかなたへ吸い上げられていく——。", en: "At that moment the night sky turned pitch black.\nAll the laughter in the universe was being sucked away into the distance..." },
        { s: "mystery", fx: "flash", ja: "フハハハ！ 宇宙の笑いは、この魔王星がぜんぶいただいた！ もうだれも、笑うことはない！", en: "Mwahaha! The Demon Star has taken ALL the laughter in the universe! No one shall ever laugh again!" },
        { s: "luva", bg: "duo", face: "trouble", ja: "緊急指令だ、ぴょんぴー。笑いのエネルギー『ワライスター』が6つにくだかれ、魔王の手下たちが6つの星へ持ち去った。", en: "Emergency orders, Pyon-P. The \"Warai Star\", the energy of laughter itself, was shattered into six pieces, and the Demon Lord's followers carried them off to six planets." },
        { s: "luva", face: "trouble", ja: "かけらがもどらなければ、宇宙から笑顔が消えてしまう。……だれも笑えないままでは、3日後のフェスも開けない。", en: "Unless the shards return, smiles will vanish from the universe. ...And if no one can laugh, the Fest three days from now cannot be held." },
        { s: "luva", face: "trouble", ja: "らんぴょんは笑いをうばわれて動けない。AGIの人工知能パートナー、ヤナビスが案内する。行けるのは、きみだけだ。", en: "Ranpyon has lost his laughter and cannot go. Yanabisu, your AGI partner, will guide you. You are the only one who can do this." },
        { s: "pyon", ja: "なんで吾輩だけ平気なんじゃろ……。て、ちょっと待ってだ。そんな責任重大なこと、吾輩ひとりでせんとあかんの？", en: "Why am I the only one who's fine... Wait, hold on. I have to handle something THAT important all by myself?" },
        { s: "pyon", ja: "6つの星をまわるとか、めんどくさいじょ〜。吾輩、フェスのネタ考えるんでいそがしいけん、ほかの人にたのんでだ。", en: "Touring six planets? What a hassle. I'm busy writing material for the Fest, so ask someone else." },
        { s: "luva", ja: "……そう言うと思っていたよ。ぴょんぴー、じつは、ある方からメッセージがとどいている。", en: "...I thought you might say that. Pyon-P, there's a message for you from a certain someone." },
        { s: "kaguya", holo: "on", ja: "ぴょんぴー、聞こえていますか？ 月の宮の、かぐやです。", en: "Pyon-P, can you hear me? This is Kaguya, of the Moon Palace." },
        { s: "pyon", face: "surprise", ja: "か、か、か、かぐや様ぁ！？", en: "P-P-P-Princess Kaguya!?" },
        { s: "kaguya", ja: "宇宙から笑顔が消えてしまうなんて、わたくし、たえられません。……どうか、ワライスターを取りもどしてくださいませんか？", en: "I cannot bear the thought of smiles vanishing from the universe. ...Won't you please bring back the Warai Star?" },
        { s: "kaguya", ja: "フェスの日には、あなたたちの漫才を、いちばん前の席で楽しみにしていますね。", en: "On the day of the Fest, I'll be in the front row, looking forward to your act." },
        { s: "pyon", ja: "はいっ！！ もちろんです！ このぴょんぴー、かぐや様のためなら、宇宙のはてでもどこまでも行ってまいりますっ！", en: "Yes, Your Highness!! Of course! For you, I would go to the very edge of the universe!" },
        { s: "ran", face: "surprise", holo: "off", ja: "……手のひら返し、早！ さっきまで『めんどくさい』言うてましたやん。", en: "...Pyon-P, isn't that a bit of a fast turnaround? A second ago you were saying it was a hassle." },
        { s: "pyon", ja: "な、なにを言うとんじゃ！ 吾輩は、はじめから行く気まんまんじゃったじょ！", en: "Wh-what are you talking about! I was raring to go from the very start!" },
        { s: "ran", face: "trouble", ja: "ぴょんぴー先輩……お願いします。僕の『なんでよっ！』、取り返してきてください。", en: "Pyon-P... please. Bring my \"No way!\" back." },
        { s: "pyon", bg: "depart", ja: "まかしとき！ ぶどうまんじゅう食べたら百人力じゃ。ほな、ちょっと宇宙すくってくるけん！", en: "Leave it to me! A handful of kaki-pea snacks and I'm unstoppable. Be right back, just gotta save the universe!" },
        { s: "narr", ja: "こうして、ぴょんぴーの大冒険がはじまった。", en: "And so, Pyon-P's great adventure began." }
      ]
    },
    world0: {
      music: "select",
      lines: [
        { s: "yana", bg: "world0", ja: "はじめまして。AGIの人工知能パートナー、ヤナビスです。道案内も作戦も、まかしてほしいんじょ。……あ、阿波弁がうつりました。", en: "Nice to meet you. I am Yanabisu, your AGI partner. Directions, strategy, leave it all to me, y'know. ...Oh dear, your accent is rubbing off on me." },
        { s: "yana", ja: "最初のかけらは『月あめ平原』に反応があります。敵は上からふむとピヨります。そのすきに光線銃でやっつけましょう。", en: "The first shard is somewhere in Moon Candy Field. Stomp enemies from above to stun them, then finish them with your ray gun." },
        { s: "yana", ja: "光線銃は、同じものを2つ集めると合体して強くなります。SELECT（Tabキー）で装備画面をひらけますよ。", en: "Collect two of the same ray gun and they fuse into a stronger one. Press SELECT (Tab) to open the equipment screen." },
        { s: "pyon", ja: "オッケー！ ほな、吾輩、いっちょ行ってくるじょ！", en: "Got it! Alright, let's do this!" }
      ]
    },
    world1: {
      music: "select",
      lines: [
        { s: "ran", bg: "world1", ja: "ぴょんぴー先輩、聞こえますか？ かけらが1つもどって、月のみんなに、ちょっとだけ笑顔がもどりましたけん！", en: "Pyon-P, can you hear me? One shard is back, and everyone on the Moon is smiling again. Just a little!" },
        { s: "pyon", ja: "ほんまか！ ほな記念に一発ギャグを——", en: "Really!? Then to celebrate, here's a brand new gag—" },
        { s: "ran", ja: "……それは、まだ笑えんと思います。", en: "...I don't think anyone can laugh at THAT yet." },
        { s: "pyon", ja: "まだ言うてもないのに！？", en: "I haven't even said it!" },
        { s: "yana", ja: "次は火星ネオンコロニーです。地面からふき出すマグマに注意してください。", en: "Next stop: Mars Neon Colony. Watch out for lava bursting from the ground." }
      ]
    },
    world2: {
      music: "select",
      lines: [
        { s: "yana", bg: "world2", ja: "クリスタル氷星に到着しました。地面がとてもすべります。", en: "We have arrived at the Crystal Ice Planet. The ground is extremely slippery." },
        { s: "pyon", ja: "まかしとき。吾輩のギャグはスベらんけど、足はスベるかもしれんな。", en: "No problem. My jokes never slip... my feet might, though." },
        { s: "ran", ja: "逆です、逆！ ……あれ？ 僕、いま、ちょっとだけツッコめました？", en: "Other way around! ...Wait. Did I just do a comeback?" },
        { s: "pyon", ja: "おっ、もどってきよるでないか！ この調子でかけら集めるじょ！", en: "Hey, it's coming back! Let's keep collecting those shards!" }
      ]
    },
    world3: {
      music: "select",
      lines: [
        { s: "yana", bg: "world3", ja: "星の海です。水の中では酸素がへっていきます。O2バブルでこまめに補給してください。", en: "This is the Star Ocean. Your oxygen drains underwater, so grab O2 bubbles often." },
        { s: "pyon", ja: "泳ぎは得意でないけど……上下ボタンでぷかぷか行けるな！", en: "Swimming isn't my thing... but I can float around with up and down!" },
        { s: "luva", ja: "順調だね、ぴょんぴー。フェスの楽屋は、おさえたままにしてある。かならず帰っておいで。", en: "You're doing well, Pyon-P. I'm keeping your dressing room at the Fest reserved. Make sure you come back." },
        { s: "pyon", ja: "さすがボス！ 月見バーガーも用意しといてだ！", en: "You're the best, boss! Have a moon-viewing burger ready for me!" }
      ]
    },
    world4: {
      music: "select",
      lines: [
        { s: "yana", bg: "world4", ja: "リングメカ工場です。ベルトコンベアと動く床に気をつけて。", en: "The Ring Mecha Factory. Mind the conveyor belts and moving platforms." },
        { s: "ran", ja: "ぴょんぴー先輩！ 僕、だいぶツッコめるようになってきました。『なんで…………なっ』！", en: "Pyon-P! My comebacks are almost back. \"No............ way!\"" },
        { s: "pyon", ja: "間（ま）が長い長い！ あとちょっとじゃな！", en: "That pause is WAY too long! We're nearly there!" },
        { s: "ran", ja: "のこりのかけら、お願いしますけん、先輩！", en: "I'm counting on you for the rest, partner!" }
      ]
    },
    world5: {
      music: "select",
      lines: [
        { s: "yana", bg: "world5", ja: "……最後のかけらは、魔王星の城の奥です。重力が波のようにゆれています。", en: "...The last shard is deep inside the castle on the Demon Star. Gravity there pulses like a wave." },
        { s: "luva", ja: "フェスは、あしただ。ここから先は今までとはわけがちがう。気を引きしめて行きなさい。", en: "The Fest is tomorrow. From here on, it won't be like before. Stay sharp." },
        { s: "ran", ja: "ぴょんぴー先輩。帰ってきたら、いちばんええツッコミ入れますけん。", en: "Pyon-P. When you get home, I'll give you the best comeback of my life." },
        { s: "pyon", ja: "ほれ聞いたら負けられんな。行くじょ、クライマックスじゃ！", en: "Now I really can't lose. Here we go: the grand finale!" }
      ]
    },
    ending: {
      music: "story",
      lines: [
        { s: "narr", bg: "laugh", ja: "6つのかけらがひとつになり、\nワライスターは、かがやきを取りもどした。", en: "The six shards became one,\nand the Warai Star shone once more." },
        { s: "maou", ja: "なぜだ……。笑いなど、消えてしまえばよかったのだ……。", en: "Why... Laughter should have just disappeared..." },
        { s: "pyon", ja: "なあ魔王。ほんまは、あんたも笑いたかったんでないん？", en: "Hey, Demon Lord. Deep down, didn't you want to laugh too?" },
        { s: "maou", ja: "……昔、わしも芸人を目指しておった。だが何をやってもスベりつづけ……だれも笑ってくれなんだ。", en: "...Long ago, I too dreamed of being a comedian. But every joke I told bombed... Not one person laughed." },
        { s: "maou", ja: "だから決めたのだ。だれも笑わぬ宇宙なら、わしもスベらずにすむ、と。", en: "So I decided: in a universe where no one laughs, I can never bomb again." },
        { s: "pyon", ja: "スベるんがこわいんは、吾輩もいっしょじゃ。ほやけどな、スベった話は、あとでいちばんウケるんじょ！", en: "I'm scared of bombing too. But you know what? The stories about bombing get the biggest laughs later!" },
        { s: "yana", ja: "解析完了です。ぴょんぴーさんだけ笑いをうばわれなかった理由は……スベっても自分で笑っているから、でした。", en: "Analysis complete. The reason only Pyon-P kept his laughter is... he laughs at his own jokes even when they bomb." },
        { s: "pyon", ja: "ほれ、ほめとん！？ ……まあええわ。魔王、あんたも自分で笑ってみ。", en: "Is that a compliment!? ...Eh, fine. Demon Lord, try laughing at yourself for once." },
        { s: "pyon", ja: "ほな聞いてだ。『魔王とかけまして、黒番の囲碁棋士とときます』", en: "So listen up. \"When night ends on the Demon Star... it's a brand new DEMON-ing!\"" },
        { s: "maou", ja: "その心は？", en: "What's the connection?" },
        { s: "pyon", ja: "どちらも城（白）を攻めるでしょう", en: "Both of them are always attacking the white castle!" },
        { s: "maou", fx: "shake", ja: "…………ぷっ。ふ、ふはは！ ふははははは！ うまい！", en: "............Pfft. Heh, ha ha! HAHAHAHA! That's... that's so dumb! SO dumb!!" },
        { s: "narr", fx: "flash", ja: "魔王が笑ったしゅんかん、\nワライスターの光が、宇宙じゅうに降りそそいだ。", en: "The moment the Demon Lord laughed,\nthe light of the Warai Star rained down across the universe." },
        { s: "maou", ja: "……すまなかった。笑いは、みなに返そう。わしは、どうつぐなえばよい。", en: "...I am sorry. I will return the laughter to everyone. How can I make amends?" },
        { s: "pyon", ja: "ほな、あしたのフェス見に来てだ。いちばん前の席で、いちばんでかい声で笑うこと。ほれでチャラじゃ！", en: "Then come to the Fest tomorrow. Front row, loudest laugh in the house. Do that and we're even!" },
        { s: "narr", bg: "stage", music: "ending", ja: "そして、次の日。\n『銀河お笑いフェス』は、予定どおり幕をあけた。", en: "And the next day,\nthe Galaxy Comedy Fest opened right on schedule." },
        { s: "pyon", aud: true, ja: "どうもー！ ムーニアンズです！ いやー、きのうね宇宙崩壊寸前のところサクッと救ってきましてね", en: "Hello, hello! We're the Moonians! So, funny story: I kinda saved the universe yesterday." },
        { s: "ran", aud: true, fx: "shake", ja: "なんでよっ！！ 内容の重さにたいして言い方がかるすぎる！", en: "NO WAY!! You can't say it that casually!" },
        { s: "narr", aud: true, ja: "客席には、約束どおり、月あめキング、ドーム司令官、クリスタルイエティ、\nマンタクイーン、ロボットキング——そして、いちばん前に魔王のすがたがあった。", en: "In the audience, just as promised, sat the Moon Candy King, the Dome Commander, the Crystal Yeti,\nthe Manta Queen, the Robot King... and in the very front row, the Demon Lord." },
        { s: "maou", aud: true, ja: "ふはは！ ムーニアンズ最高！", en: "Hahaha! More! MORE!" },
        { s: "narr", aud: true, ja: "そして、魔王のとなりの特等席には——約束どおり、かぐや様のすがたもあった。", en: "And in the royal seat beside the Demon Lord... just as she had promised, sat Princess Kaguya." },
        { s: "kaguya", at: "right", aud: true, ja: "ふふっ……ぴょんぴー、とってもおもしろかったです。約束どおり、いちばん前で笑わせていただきました。", en: "Hehe... Pyon-P, that was wonderful. Just as I promised, I laughed from the very front row." },
        { s: "pyon", aud: true, ja: "か、かぐや様が……吾輩のネタで、わ、わ、笑って……。", en: "P-Princess Kaguya... l-l-laughed... at MY material..." },
        { s: "kaguya", at: "right", aud: true, ja: "宇宙の笑顔を守ってくださって、感謝です。ぴょんぴー。", en: "Thank you for protecting the smiles of the universe." },
        { s: "pyon", aud: true, ja: "……吾輩、もう、思いのこすことはないじょ……。", en: "...I have no regrets left in this life..." },
        { s: "ran", aud: true, fx: "shake", ja: "なんでよっ！ 先輩、まだまだ僕たちはこれからですよ！ 固まっとる場合ですか！", en: "NO WAY! We're still in the middle of our act! This is no time to freeze up!" },
        { s: "luva", aud: true, ja: "ふふ。次は地球の大舞台だね、ふたりとも。", en: "Hehe. Next up is the big stage on Earth, you two." },
        { s: "pyon", aud: true, ja: "よっしゃ！ 次は地球で、てっぺん獲ったるでー！", en: "Alright! Next, we're taking the top spot on Earth!" },
        { s: "ran", aud: true, ja: "今日から毎日ネタの稽古ですね！先輩！", en: "Rehearsal first!" },
        { s: "pyon", aud: true, ja: "稽古いややぁ！！アドリブでええやんアドリブでーー！", en: "Not rehearsals!! We can just ad-lib it, ad-lib it!" },
        { s: "ran", aud: true, ja: "地球ではアドリブだけではやってけませんよ！", en: "You can't get by on ad-libs alone on Earth!" },
        { s: "kaguya", at: "right", aud: true, ja: "お稽古中、お邪魔でなければ見学に行かせてください", en: "If it isn't a bother, may I come watch you rehearse?" },
        { s: "pyon", aud: true, ja: "もちろんです！吾輩ら毎日、いや毎時間ネタの練習してるんでいつでも待っとります！！らんぴょん！さぁネタの練習するでー", en: "Of course! We rehearse every day, no, every HOUR, so come anytime!! Ranpyon! Let's go rehearse!" },
        { s: "ran", aud: true, ja: "ちょろすぎか！....先輩でなんか困ったらかぐや様に頼もう...", en: "That was way too easy! ...Note to self: if Pyon-P ever gives me trouble, ask Princess Kaguya..." },
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
    // 読みこみに時間がかかっても待つ（スマホの回線でも流れるように）
    const timer = setTimeout(() => { if (!started) finish(); }, 12000);
    v.playsInline = true;
    v.preload = "auto";
    v.muted = typeof soundEnabled !== "undefined" && !soundEnabled;
    v.style.cssText = "position:absolute;inset:0;width:100%;height:100%;object-fit:cover;background:#120a2a;z-index:5;";
    const hintText = on => on ? pcKeys(L("▶ スキップ（A）", "▶ Skip (A)")) : L("スキップ ▶▶", "Skip ▶▶");
    hint.textContent = hintText(false);
    const hintStyle = on => `position:absolute;left:8px;top:8px;z-index:6;padding:3px 10px;border-radius:99px;font:800 11px system-ui;cursor:pointer;opacity:.9;` +
      (on ? "background:#fff3a4;color:#5a3d9a;border:2px solid #ff8db7;box-shadow:0 0 8px #ffd85a;" : "background:rgba(18,10,42,.45);color:#fff;border:1px solid rgba(255,255,255,.45);");
    hint.style.cssText = hintStyle(false);
    // スキップボタンは、タップすると選ばれ、選ばれているときにもう一度タップでスキップ
    hint.addEventListener("click", event => {
      event.stopPropagation();
      if (movie?.skipFocused) finish();
      else movie?.focusSkip();
    });
    v.addEventListener("error", finish);
    v.addEventListener("ended", finish);
    // 画面をタップしただけではスキップしない（スキップボタンだけ）
    v.addEventListener("canplay", () => {
      if (done || started) return;
      started = true;
      wrap.appendChild(v);
      wrap.appendChild(hint);
      // iPhone はタップ以外で音つき動画を再生させてくれないことがある。そのときは音なしで流す
      v.play().catch(() => {
        v.muted = true;
        v.play().catch(finish);
      });
    });
    // 読みこみのようす（動画が始まるまで、画面に「よみこみ中」を出す）
    const progress = () => {
      try {
        if (!movie || !v.duration || !isFinite(v.duration) || !v.buffered.length) return;
        movie.pct = Math.max(movie.pct, Math.min(1, v.buffered.end(v.buffered.length - 1) / v.duration));
      } catch (_) {}
    };
    v.addEventListener("progress", progress);
    v.addEventListener("loadedmetadata", progress);
    v.addEventListener("playing", () => { if (movie) movie.playing = true; });
    movie = {
      finish,
      pct: 0,
      playing: false,
      since: performance.now(),
      skipFocused: false,
      focusSkip(on = true) {
        this.skipFocused = on;
        hint.textContent = hintText(on);
        hint.style.cssText = hintStyle(on);
        if (on && typeof playSfx === "function") playSfx("cursor");
      }
    };
    v.src = `assets/video/${id}.mp4`;
    v.load();
  }

  function play(id, onEnd, afterMovie = false) {
    if (id === "opening" || id === "ending") loadStoryArt();
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
    if (ln.holo === "on") { cs.holo = { t: 0, on: true }; if (typeof playSfx === "function") playSfx("decide"); }
    if (ln.holo === "off" && cs.holo) { cs.holo.on = false; cs.holo.t = 0; }
    const sp = SPEAKERS[ln.s] || SPEAKERS.narr;
    // at でその行だけ立ち位置を変えられる（エンディングのかぐや様はモニターでなく本人が右に立つ）
    const side = ln.at || sp.side;
    if (side) {
      const slot = cs.slots[side];
      if (!slot || slot.id !== ln.s) cs.slots[side] = { id: ln.s, appear: 0 };
      cs.slots[side].face = ln.face || guessFace(ln);
      cs.active = side;
    } else {
      cs.active = null;
    }
    if (typeof Voice !== "undefined") Voice.play(cs.id, ln.ja);
    if (ln.fx === "shake") FX.shake(0.7);
    if (ln.fx === "flash") {
      FX.flash("#ffffff", 0.8, 0.6);
      FX.shake(0.4);
    }
  }

  function finish() {
    if (!cs || cs.ending) return;
    cs.ending = true;
    if (typeof Voice !== "undefined") Voice.stop();
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

  // 画面に出す文（PC ではキーの名前をそえる）。声は ln.ja のままでさがす
  function lineText(ln) {
    return pcKeys(language === "ja" ? ln.ja : ln.en);
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
      playSfx("page");
      nextLine();
    }
  }

  function updateCutscene(dt) {
    if (!cs) return;
    cs.t += dt;
    cs.bgT += dt;
    cs.lineT += dt;
    if (cs.holo) cs.holo.t += dt;
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
      if (ok(img.portraitPyon)) fit(img.portraitPyon, 440);
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
      if (ok(img.portraitLuva)) fit(faceImage("portraitLuva", face), 560);
      else drawHoloCard(L("ル", "L"), "#8f8ad0", time, img.cardLuva);
    } else if (id === "yana") {
      if (flip) ctx.scale(-1, 1);
      if (ok(img.portraitYana)) fit(faceImage("portraitYana", face), 470);
      else drawYanabis(ctx, time);
    } else if (id === "kaguya") {
      if (flip) ctx.scale(-1, 1);
      if (ok(img.portraitKaguya)) fit(img.portraitKaguya, 500);
    }
    ctx.restore();
  }

  // ---------- かぐや様のホログラム通信モニター ----------
  // 枠の絵（assets/holo-monitor-frame.png）と台座（assets/holo-projector.png）があれば使い、
  // なければプログラムで描く。ちらつき・走査線・ノイズ・ずれはプログラムで動かす。
  const holoBuf = document.createElement("canvas");
  function drawHoloMonitor(cx, cy, holo, speaking) {
    const MW = 560, MH = 360;
    // つくときは横線から上下にひらき、消えるときは横線にしぼんで消える
    let open = holo.on ? Math.min(1, holo.t / 0.45) : Math.max(0, 1 - holo.t / 0.35);
    if (!holo.on && open <= 0) { cs.holo = null; return; }
    open = ease(open);
    const h = Math.max(4, MH * open);
    // ときどき全体がチラッと暗くなる
    const blink = (Math.sin(time * 37) > 0.97 || Math.random() < 0.015) ? 0.55 : 1;
    const alpha = (0.82 + Math.sin(time * 9) * 0.05) * blink;
    ctx.save();
    ctx.translate(cx, cy);

    // 台座（光の柱が出ているプロジェクター）
    const baseY = MH / 2 + 70;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const beam = ctx.createLinearGradient(0, baseY, 0, -h / 2);
    beam.addColorStop(0, `rgba(120, 255, 240, ${0.28 * open})`);
    beam.addColorStop(1, "rgba(200, 160, 255, 0)");
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(-70, baseY);
    ctx.lineTo(70, baseY);
    ctx.lineTo(MW / 2, h / 2);
    ctx.lineTo(-MW / 2, h / 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    if (ok(img.holoBase)) {
      const bw = 300, bh = bw * (img.holoBase.naturalHeight / img.holoBase.naturalWidth);
      ctx.drawImage(img.holoBase, -bw / 2, baseY - bh * 0.45, bw, bh);
    } else {
      ctx.fillStyle = "#e9e2ff";
      ctx.strokeStyle = "#a98be0";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(0, baseY + 12, 110, 26, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#7ff6e6";
      ctx.beginPath();
      ctx.ellipse(0, baseY + 4, 62, 12, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = alpha;
    // 画面の中（すけたラベンダーのガラス）
    ctx.beginPath();
    ctx.roundRect(-MW / 2, -h / 2, MW, h, 22);
    ctx.save();
    ctx.clip();
    const glass = ctx.createLinearGradient(0, -MH / 2, 0, MH / 2);
    glass.addColorStop(0, "rgba(90, 60, 170, 0.55)");
    glass.addColorStop(1, "rgba(40, 120, 160, 0.45)");
    ctx.fillStyle = glass;
    ctx.fillRect(-MW / 2, -MH / 2, MW, MH);
    // かぐや様（ときどき横にずれるノイズ）
    const pic = img.portraitKaguya;
    if (ok(pic) && open > 0.3) {
      const ph = MH * 1.55;
      const pw = ph * (pic.naturalWidth / pic.naturalHeight);
      holoBuf.width = Math.ceil(pw);
      holoBuf.height = Math.ceil(MH);
      const g = holoBuf.getContext("2d");
      g.clearRect(0, 0, holoBuf.width, holoBuf.height);
      g.drawImage(pic, 0, -ph * 0.08 + (speaking ? Math.sin(time * 3) * 3 : 0), pw, ph);
      // 青むらさきに色をのせる
      g.globalCompositeOperation = "source-atop";
      g.fillStyle = "rgba(150, 230, 255, 0.16)";
      g.fillRect(0, 0, holoBuf.width, holoBuf.height);
      g.globalCompositeOperation = "source-over";
      const glitch = Math.random() < 0.06 || holo.t < 0.6;
      const strip = 6;
      for (let y = 0; y < MH; y += strip) {
        const dx = glitch && Math.random() < 0.25 ? (Math.random() - 0.5) * 26 : 0;
        ctx.drawImage(holoBuf, 0, y, holoBuf.width, strip, -pw / 2 + dx, -MH / 2 + y, pw, strip);
      }
      // 色ずれ（ピンクと水色のゴースト）
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = alpha * 0.12;
      ctx.drawImage(holoBuf, -pw / 2 - 4, -MH / 2);
      ctx.drawImage(holoBuf, -pw / 2 + 4, -MH / 2);
      ctx.restore();
    }
    // 走査線と、上から下へ流れる光の帯
    ctx.fillStyle = "rgba(255, 255, 255, 0.07)";
    const off = (time * 60) % 6;
    for (let y = -MH / 2 + off; y < MH / 2; y += 6) ctx.fillRect(-MW / 2, y, MW, 2);
    const bandY = ((time * 140) % (MH + 120)) - MH / 2 - 60;
    const band = ctx.createLinearGradient(0, bandY - 40, 0, bandY + 40);
    band.addColorStop(0, "rgba(160, 255, 245, 0)");
    band.addColorStop(0.5, "rgba(160, 255, 245, 0.16)");
    band.addColorStop(1, "rgba(160, 255, 245, 0)");
    ctx.fillStyle = band;
    ctx.fillRect(-MW / 2, bandY - 40, MW, 80);
    // ノイズのつぶ
    ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
    for (let i = 0; i < 26; i++) ctx.fillRect((Math.random() - 0.5) * MW, (Math.random() - 0.5) * MH, 2 + Math.random() * 6, 1.5);
    ctx.restore();

    // 枠
    if (ok(img.holoFrame)) {
      // 枠の絵の画面の穴は、横はばの約85%・高さの約76%（少し小さめに合わせて、画面のふちを枠でかくす）
      const fw = MW / 0.835, fh = h / 0.74;
      ctx.drawImage(img.holoFrame, -fw / 2, -fh / 2 + fh * 0.0146, fw, fh);
    } else {
      ctx.save();
      ctx.shadowColor = "#7ff6e6";
      ctx.shadowBlur = 22;
      ctx.strokeStyle = "rgba(160, 255, 245, 0.95)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(-MW / 2, -h / 2, MW, h, 22);
      ctx.stroke();
      ctx.shadowColor = "#ff8db7";
      ctx.strokeStyle = "rgba(255, 170, 220, 0.9)";
      ctx.lineWidth = 6;
      const c = 46;
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const x = sx * (MW / 2 + 10), y = sy * (h / 2 + 10);
        ctx.beginPath();
        ctx.moveTo(x, y - sy * c);
        ctx.lineTo(x, y);
        ctx.lineTo(x - sx * c, y);
        ctx.stroke();
      }
      ctx.restore();
    }
    // 上のラベル
    if (open > 0.6) {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "rgba(40, 20, 90, 0.75)";
      ctx.beginPath();
      ctx.roundRect(-MW / 2 + 22, -h / 2 + 16, 220, 32, 16);
      ctx.fill();
      ctx.strokeStyle = "#7ff6e6";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = (time % 1) < 0.5 ? "#ff8db7" : "#ffd1ed";
      ctx.beginPath();
      ctx.arc(-MW / 2 + 44, -h / 2 + 32, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#e8fffb";
      ctx.font = `900 17px ${FX.FONT}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(L("月の宮より 通信中", "MOON PALACE · LIVE"), -MW / 2 + 140, -h / 2 + 32);
    }
    ctx.restore();
  }

  function skipRect() {
    return { x: 20, y: 10, w: 176, h: 40 };
  }
  // スキップのとなり：「タイトルへ」
  function titleRect() {
    return { x: 206, y: 10, w: 150, h: 40 };
  }

  // 携帯ゲーム機レイアウトでは、会話の吹き出しをゲーム画面の下の欄に出す
  const storyBox = {
    el: document.querySelector("#gbStory"),
    name: document.querySelector("#gbStoryName"),
    text: document.querySelector("#gbStoryText"),
    key: ""
  };

  storyBox.skip = document.querySelector("#gbStorySkip");
  storyBox.title = document.querySelector("#gbStoryTitle");
  storyBox.title?.addEventListener("pointerdown", event => {
    event.preventDefault();
    event.stopPropagation();
    if (state?.mode === "cutscene" || state?.mode === "credits") openTitleAsk();
  });
  storyBox.skip?.addEventListener("pointerdown", event => {
    event.preventDefault();
    event.stopPropagation();
    if (state?.mode !== "cutscene" || !cs) return;
    // 1回目のタップで選ぶ、選ばれているときにもう一度タップでスキップ
    if (cs.skipFocused) { if (!FX.transitioning()) finish(); }
    else setSkipFocus(true);
  });
  function setSkipFocus(on) {
    if (!cs || !!cs.skipFocused === on) return;
    cs.skipFocused = on;
    storyBox.skip?.classList.toggle("is-focused", on);
    if (storyBox.skip) storyBox.skip.textContent = on ? pcKeys(L("スキップ？ A で決定", "Skip? Press A")) : L("スキップ ▶▶", "Skip ▶▶");
    if (typeof playSfx === "function") playSfx("cursor");
  }
  storyBox.el?.addEventListener("pointerdown", event => {
    event.preventDefault();
    if ((state?.mode === "bossIntro" || state?.mode === "bossOutro") && typeof advanceBossIntro === "function") {
      if (typeof unlockAudio === "function") unlockAudio();
      advanceBossIntro();
      return;
    }
    if (state?.mode !== "cutscene") return;
    if (cs?.skipFocused) { setSkipFocus(false); return; }
    if (typeof unlockAudio === "function") unlockAudio();
    advanceCutscene();
  });

  // ボス戦の前後の会話：会話シーンと同じ下の吹き出しに出す（o = { key, name, color, text, done }）
  function talkBox(o) {
    if (!useStoryBox()) return false;
    const key = `talk:${o.key}:${language}:${o.text.length}:${o.done}`;
    if (key === storyBox.key) return true;
    const fresh = !storyBox.key.startsWith(`talk:${o.key}:${language}:`);
    storyBox.key = key;
    storyBox.el.classList.remove("is-narration");
    storyBox.el.classList.toggle("is-done", o.done);
    storyBox.el.style.setProperty("--speaker", o.color);
    storyBox.name.textContent = o.name;
    storyBox.text.textContent = o.text;
    if (fresh) {
      storyBox.el.classList.remove("is-pop");
      void storyBox.el.offsetWidth;
      storyBox.el.classList.add("is-pop");
    }
    return true;
  }

  // 会話シーンと同じ大きさ・位置で、しゃべる人の立ち絵を描く（ボス戦の会話でも使う）
  function drawTalkPortrait(id, side, active, appear = 1, picture = null) {
    const W = canvas.width;
    const H = canvas.height;
    const cx = side === "left" ? 236 : W - 236;
    const footY = useStoryBox() ? H + 6 : H - 172 - 34 + 44;
    if (id === "boss") {
      if (!ok(picture)) return;
      ctx.save();
      const bob = active ? Math.sin(time * 5) * 4 : 0;
      ctx.translate(cx, footY + (1 - ease(appear)) * 70 + bob);
      ctx.globalAlpha = ease(appear) * (active ? 1 : 0.55);
      const s = active ? 1 : 0.92;
      // ボスの絵は右向きなので、左右をひっくり返して、ぴょんぴーのほう（左）を向かせる
      ctx.scale(-s, s);
      const h = 430;
      const w = h * (picture.naturalWidth / picture.naturalHeight);
      ctx.drawImage(picture, -w / 2, -h * 0.98, w, h);
      ctx.restore();
      return;
    }
    drawPortrait(id, cx, footY, active, appear, side === "right");
  }

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
    // スマホ（吹き出しが画面の外）のときは、立ち絵を画面の下まで下げる
    const footY = useStoryBox() ? H + 6 : boxY + 44;
    if (cs.holo) drawHoloMonitor(W / 2, 272, cs.holo, ln.s === "kaguya");
    if (!hasCg || !narr) {
      const left = cs.slots.left;
      const right = cs.slots.right;
      if (left && !(narr && hasCg)) drawPortrait(left.id, 236, footY, cs.active === "left", left.appear * (narr ? 0.7 : 1), false, left.face);
      if (right && !(narr && hasCg)) drawPortrait(right.id, W - 236, footY, cs.active === "right", right.appear * (narr ? 0.7 : 1), true, right.face);
    }

    // テキストボックス
    if (useStoryBox()) {
      renderStoryBox(ln, sp, narr);
      // 新しい会話がはじまったら、スキップの選択を元にもどす
      const on = !!cs.skipFocused;
      if (storyBox.skip && storyBox.skip.classList.contains("is-focused") !== on) {
        storyBox.skip.classList.toggle("is-focused", on);
        storyBox.skip.textContent = on ? pcKeys(L("スキップ？ A で決定", "Skip? Press A")) : L("スキップ ▶▶", "Skip ▶▶");
      }
    }
    else drawCanvasTextBox(ln, sp, narr, boxX, boxY, boxW, boxH);
    if (!useStoryBox()) drawSkipButton();
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
    const on = !!cs?.skipFocused;
    ctx.globalAlpha = 0.88;
    ctx.fillStyle = on ? "#fff3a4" : "rgba(255,255,255,0.16)";
    ctx.strokeStyle = on ? "#ff8db7" : "rgba(255,255,255,0.7)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(r.x, r.y, r.w, r.h, 20);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = on ? "#5a3d9a" : "#ffffff";
    ctx.font = `800 16px ${FX.FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(on ? pcKeys(L("スキップ？ A で決定", "Skip? Press A")) : L("スキップ ▶▶ (Esc)", "SKIP ▶▶ (Esc)"), r.x + r.w / 2, r.y + r.h / 2 + 1);
    // タイトルへ
    const tr = titleRect();
    ctx.fillStyle = "rgba(255,255,255,0.16)";
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.beginPath();
    ctx.roundRect(tr.x, tr.y, tr.w, tr.h, 20);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.fillText(L("タイトルへ (Tab)", "Title (Tab)"), tr.x + tr.w / 2, tr.y + tr.h / 2 + 1);
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
    const stars = state.starItems.filter(s => s.taken).length + (state.stageStarsGot ?? 0);
    const starTotal = courseStarTotal(currentCourse);
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
      if (opts.boss || !playFileJingle("stageClear")) Bgm.jingle(opts.boss ? "bossClear" : "stageClear");
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
    row(L("ルナコイン", "Luna Coins"), `${rc.coins} / ${rc.coinTotal}${rc.perfect ? "  PERFECT +100" : ""}`, 1.15, rc.perfect ? "#ff5f9e" : "#d98a2b");
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
      { text: `${L("ルナコイン", "Luna Coins")}  ${(keep.kakiTotal ?? 0) + (keep.peaTotal ?? 0)}` },
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
      // うっかりスキップしないように：十字キーで「スキップ」を選んでから、決定でスキップ
      // 動画が始まる前（よみこみ中）は、スキップの操作はうけつけない
      if (!movie || !movie.playing) return true;
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "KeyA", "KeyD", "KeyW", "KeyS"].includes(code)) movie.focusSkip();
      else if (movie.skipFocused && (code === "Escape" || CONFIRM.includes(code))) movie.finish();
      else movie.focusSkip(false);
      return true;
    }
    if (mode === "shop") return Shop.handleKey(code);
    if (mode === "cutscene") {
      // 十字キーで「スキップ」をえらぶ → A で決定。もう一度十字キーでやめる
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "KeyA", "KeyD", "KeyW", "KeyS"].includes(code)) {
        setSkipFocus(!cs?.skipFocused);
      } else if (code === "Escape") {
        if (!FX.transitioning()) finish();
      } else if (CONFIRM.includes(code)) {
        if (cs?.skipFocused) { if (!FX.transitioning()) finish(); }
        else advanceCutscene();
      }
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
    if (mode === "movie") return true; // 画面のタップではスキップしない（右上のスキップボタンで）
    if (mode === "shop") return Shop.handlePointer(x, y);
    if (mode === "cutscene") {
      const r = skipRect();
      const tr = titleRect();
      if (!useStoryBox() && x >= tr.x && x <= tr.x + tr.w && y >= tr.y && y <= tr.y + tr.h) openTitleAsk();
      else if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
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
    const total = courseStarTotal(index);
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
        if (!/title-logo.(png|webp)/.test(logo.src)) logo.src = "assets/title-logo.png";
        logo.alt = t("title");
      } else if (/title-logo.(png|webp)/.test(logo.src)) {
        logo.src = language === "en" ? "assets/moonians-logo-English.png" : "assets/moonians-logo.png";
      }
    }
    h1.classList.toggle("hidden", atTitle);
    if (atTitle) {
      h1.textContent = t("title");
      p.textContent = t("controls");
      // タイトルはいつも「はじめから」と「つづきから」の2つ
      startButton.textContent = L("つづきから", "Continue");
      const settingsBtn = document.querySelector("#settingsButton");
      if (settingsBtn) settingsBtn.textContent = L("せってい", "Settings");
    }
    if (newBtn) {
      newBtn.textContent = data.cleared ? L("強くてはじめから", "New Game+") : L("はじめから", "New Game");
      newBtn.classList.toggle("hidden", !atTitle);
      delete newBtn.dataset.armed;
    }
    if (sub) {
      sub.textContent = L("〜 ワライスターをとりもどせ 〜", "~ Bring Back the Warai Star ~") + (data.cleared ? "  ★" : "");
      sub.classList.add("hidden");
    }
    const sound = document.querySelector("#soundButton");
    if (sound) sound.textContent = (typeof soundEnabled !== "undefined" && soundEnabled) ? "♪ ON" : "♪ OFF";
    const toggle = document.querySelector("#soundToggle");
    if (toggle) {
      const on = typeof soundEnabled !== "undefined" && soundEnabled;
      toggle.textContent = on ? "♪ ON" : "♪ OFF";
      toggle.setAttribute("aria-pressed", on ? "true" : "false");
    }
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
    // そうび画面（SELECT）：assets/bgm/select.mp3 があればその曲、なければステージの曲を小さく流す
    if (m === "inventory") {
      const sel = fileTrack("select");
      if (sel.ready && !sel.missing) return "select";
    }
    const course = courses[currentCourse];
    // ボス登場の場面は「The Demon Star Arrives」、戦いがはじまったら戦闘曲
    if (m === "bossIntro") return "bossAppear";
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
        // 効果音のコンプレッサーを通すと、大きい曲で効果音が小さくなるので、曲は直接スピーカーへ
        ac.createMediaElementSource(audio).connect(tr.gain).connect(typeof bgmOut === "function" ? bgmOut() : ac.destination);
      }
    } catch (_) {
      tr.gain = null;
    }
    audio.addEventListener("canplaythrough", () => { tr.ready = true; }, { once: true });
    audio.addEventListener("error", () => { tr.missing = true; }, { once: true });
    audio.src = `assets/bgm/${name}.mp3`;
    return tr;
  }

  // 一回だけ鳴らす曲（ステージクリアのファンファーレなど）。mp3 が読めていなければ false
  let fileJingle = null;
  function playFileJingle(name) {
    const tr = fileTrack(name);
    if (!tr.ready || tr.missing || !soundEnabled) return false;
    if (filePlaying) { fadeFile(filePlaying, 0, true); filePlaying = null; lastWant = null; }
    tr.audio.loop = false;
    tr.audio.currentTime = 0;
    clearInterval(tr.fade);
    setFileVol(tr, 0.7);
    tr.audio.play().catch(() => { tr.missing = true; });
    fileJingle = tr;
    return true;
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

  let preloaded = false;
  const HURRY_TIME = 60;
  let lastHurry = false;

  function syncMusic() {
    if (!window.Bgm || !audioUnlocked) return;
    const want = desiredTrack();
    // ぜんぶの曲を先に読み込んでおく（切りかえの瞬間に、すぐ鳴らせるように）
    if (!preloaded) {
      preloaded = true;
      for (const name of ["title", "opening", "story", "select", "map", "bossAppear", "boss", "finalBoss", "ending", "credits", "stageClear",
        "world0", "world1", "world2", "world3", "world4", "world5"]) fileTrack(name);
    }
    const duck = state.mode === "paused" || (state.mode === "inventory" && want !== "select");
    const tr = want ? fileTrack(want) : null;
    const useFile = !!tr && tr.ready && !tr.missing;
    // 曲のファイルを読みこみ中は、前のプログラムの曲を鳴らさず、静かに待つ
    const loading = !!tr && !tr.ready && !tr.missing;
    const key = want ? `${useFile ? "file" : loading ? "wait" : "synth"}:${want}` : null;
    if (key !== lastWant) {
      lastWant = key;
      if (fileJingle && want) { fadeFile(fileJingle, 0, true); fileJingle = null; }
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
      } else if (want && !loading) {
        Bgm.play(want);
      } else {
        Bgm.stop(0.4);
      }
    }
    if (filePlaying) filePlaying.audio.muted = !soundEnabled;
    // 残り時間が少なくなったら、曲を速くしてせかす（60秒から）
    const inStage = ["playing", "paused", "inventory", "respawning", "dying"].includes(state.mode) && typeof state.time === "number";
    const hurry = inStage && state.time <= HURRY_TIME && !courses[currentCourse]?.bossStage;
    if (hurry && !lastHurry && state.mode === "playing" && typeof playTone === "function") {
      // 「急いで！」の合図
      for (let i = 0; i < 3; i++) playTone({ start: i * 0.16, freq: 1320, endFreq: 1180, duration: 0.11, type: "square", gain: 0.035 });
    }
    lastHurry = hurry;
    if (filePlaying) {
      const rate = hurry ? 1.3 : 1;
      if (Math.abs(filePlaying.audio.playbackRate - rate) > 0.01) {
        try { filePlaying.audio.preservesPitch = true; } catch (_) {}
        filePlaying.audio.playbackRate = rate;
      }
    }
    for (const name in fileTracks) {
      const other = fileTracks[name];
      if (other !== filePlaying && other.audio.playbackRate !== 1) other.audio.playbackRate = 1;
    }
    if (duck !== lastDuck) {
      lastDuck = duck;
      Bgm.duck(duck);
      if (filePlaying) fadeFile(filePlaying, duck ? 0.2 : 0.6, false);
    }
  }

  // 動画のよみこみ中なら { pct, t }、始まったら null
  function movieLoading() {
    if (!movie || movie.playing) return null;
    return { pct: movie.pct, t: (performance.now() - movie.since) / 1000 };
  }

  window.Story = {
    get data() { return data; },
    talkBox, drawTalkPortrait,
    movieLoading,
    img, ok,
    worldName, bossName,
    persist, hasSave, resetSave, applyToGame, shardCount, starTotals,
    play, playMovie, update, handleKey, handlePointer,
    isStoryMode: mode => !!STORY_MODES[mode],
    drawCutscene, drawStageClear, drawCredits, drawWaraiStar,
    beginStageClear, stageClearWarp, startCredits,
    drawMapNodeStars, drawMapHud,
    drawTitleKey, returnToTitle, refreshTitleUi, yanabisIcon,
    syncMusic, exportSave, importSave,
    seen: id => !!data.seen[id]
  };
})();

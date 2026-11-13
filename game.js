// 古いページ（前の版の index.html）がキャッシュから出てきたときは、キャッシュを消して読み直す
if (typeof FX === "undefined" || typeof Story === "undefined" || typeof Chat === "undefined" || typeof Gimmick === "undefined" || typeof Shop === "undefined" || typeof Handheld === "undefined") {
  (async () => {
    try {
      if (window.caches) await Promise.all((await caches.keys()).map(key => caches.delete(key)));
      if (navigator.serviceWorker) await Promise.all((await navigator.serviceWorker.getRegistrations()).map(reg => reg.update()));
    } catch (_) {}
    if (!sessionStorage.getItem("pyonpShellReload")) {
      sessionStorage.setItem("pyonpShellReload", "1");
      location.reload();
    }
  })();
  throw new Error("Old page shell was cached. Clearing the cache and reloading.");
}
const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const overlay = document.querySelector("#overlay");
const startButton = document.querySelector("#startButton");
const kakiCount = document.querySelector("#kakiCount");
const peaCount = document.querySelector("#peaCount");
const scoreCount = document.querySelector("#scoreCount");
const lifeCount = document.querySelector("#lifeCount");
const timeCount = document.querySelector("#timeCount");
const stageCount = document.querySelector("#stageCount");
const stageLabelEl = document.querySelector("#stageLabel");
const kakiLabelEl = document.querySelector("#kakiLabel");
const peaLabelEl = document.querySelector("#peaLabel");
const scoreLabelEl = document.querySelector("#scoreLabel");
const timeLabelEl = document.querySelector("#timeLabel");
const brandLogoEl = document.querySelector(".brand-logo");
const langJaButton = document.querySelector("#langJa");
const langEnButton = document.querySelector("#langEn");
const fullscreenButton = document.querySelector("#fullscreenButton");
const installHint = document.querySelector("#installHint");
const controlModeButtons = document.querySelectorAll("[data-control-mode]");

const TILE = 48;
const WORLD_WIDTH = 5200;
const GRAVITY = 1850;
const FRICTION = 0.82;
const MAX_LIVES = 3;
const MAX_HP = 5;
const MAX_OXYGEN = 100;
const STAGE_TRAITS = ["moonFloat", "marsLava", "iceSlide", "underwater", "factoryBelt", "demonPulse"];
const SEA_GATE_PERIOD = 4.0;
const SEA_GATE_W = 84;
const MAX_WEAPON_POWER = 26;
// 17〜25 はロボット「ムーニアン・メカ」Lv1〜9。🌙Lv8 と ⭐Lv8 を合体させると Lv1 ができる。
// ロボットを2台合体させると、空を飛べる戦闘機「ムーニアン・ファイター」(26) になる。
// （18〜25 のロボット Lv2〜9 は、前のセーブデータとの互換のためだけに残っている）
const MECH_POWER = 17;
const MECH_TOP = 25;
const FIGHTER_POWER = 26;
const isMechPower = power => power >= MECH_POWER && power <= MECH_TOP;
const isRideable = power => power >= MECH_POWER;
const MOON_TOP = 8;
const STAR_TOP = 16;
const WEAPON_ATTRIBUTE_SIZE = 8;
const MAX_INVENTORY_ITEMS = 27;
const VISIBLE_INVENTORY_ITEMS = 15;
const INVENTORY_FOCUS_AREAS = ["topMenu", "itemList"];
const INVENTORY_FOCUS_MODES = {
  AREA_SELECT: "areaSelect",
  INSIDE_TOP_MENU: "insideTopMenu",
  INSIDE_ITEM_LIST: "insideItemList"
};
const STOMP_BOUNCE_VY = -540;
const BOSS_STOMP_BOUNCE_VY = -700;
const STOMP_BOOST_VY = -1040;
const BOSS_STOMP_BOOST_VY = -1120;
const STOMP_BOOST_BUFFER = 0.16;
const STOMP_LATE_BOOST_WINDOW = 0.14;
const WEAPON_ASSET_VERSION = "weapon-cutout-v4";
const SELECT_UI_ASSET_VERSION = "select-ui-generated2-v2";
const BACKGROUND_ASSET_VERSION = "mirrored-bg-v1";
const ZOOM = 4 / 3;
const VIEW_W = canvas.width / ZOOM;
const VIEW_H = canvas.height / ZOOM;
const GROUND_Y = 492;
let soundEnabled = localStorage.getItem("pyonpSound") !== "off";
let audioMaster = null;
const WEAPON_DROP_RATES = [
  { power: 1, chance: 0.8 },
  { power: 2, chance: 0.1 },
  { power: 3, chance: 0.05 },
  { power: 4, chance: 0.03 },
  { power: 5, chance: 0.02 }
];
// ダメージを受けたときの、ぴょんぴーのさけび声（声だけ・文字は出さない）。ランダムに順番に回す
const HURT_CRIES = ["いた！", "う！", "いちち！", "うわ！", "あたたた！", "うへ！", "あうち！"];
let hurtCryBag = [];
function playHurtCry() {
  if (typeof Voice === "undefined") return;
  // ほかのセリフをしゃべっている最中は、じゃましない
  if (Voice.busy && Voice.busy()) return;
  if (!hurtCryBag.length) {
    hurtCryBag = HURT_CRIES.slice().sort(() => Math.random() - 0.5);
  }
  Voice.play("chat", hurtCryBag.pop());
}

// そうび画面で、ぴょんぴーが武器ごとに言うひとこと（WEAPON_NAMES_JA と同じ順）
const WEAPON_COMMENTS_JA = [
  "ムーンポッパー！ ポンッと一発、まっすぐ届けるじょ！",
  "ツインムーンシューター！ 前もうしろも、吾輩にはお見通しじゃ！",
  "ミルキーウェイキャノン！ 天の川みたいに、三本まとめて流れていくじょ！",
  "オービットリング！ 吾輩のまわりを、ぐるっと全部守ってくれるけん！",
  "リボンレーザー！ かわいいリボンで、敵をきゅっと結んじゃるじょ！",
  "ネビュラファン！ 七本の光で、星雲ごとあおいだるじょ！",
  "コメットリバース！ うしろの敵にも、ほうき星がおかえししてくれるじょ！",
  "ムーニアンノヴァ！ 月のパワー全開じゃ。まぶしすぎて目ぇ開けとれんじょ！",
  "サターンスプリッター！ 上下左右、十字にぜんぶ割ったるじょ！",
  "アクアリウムスピア！ 波みたいに、くねくね泳いでいくじょ！",
  "クエーサードライブ！ 宇宙のはしっこまで、ぶっとばしたるけん！",
  "ギャラクシーブーメラン！ 投げたら……ちゃんと帰ってくるんじゃろな？",
  "ブラックホールパルス！ 敵をつらぬいても、まだ止まらんじょ！",
  "コスモクラウン！ 王冠みたいな弾じゃ。今日から吾輩、宇宙の王さまじょ！",
  "スーパーノヴァ360！ ぐるっと全方向、どっからでもかかってこいじゃ！",
  "ステラガーディアンキャノン！ ねらわんでも、弾が勝手に追いかけてくれるじょ！",
  "ムーニアン・メカ！？ 吾輩、ロボットに乗っとるじょ！ ガッチャン！",
  "ムーニアン・メカ Lv2！ ちょっとだけ、ネジがしまった気がするじょ！",
  "ムーニアン・メカ Lv3！ 足音がドスンドスン、いい感じになってきたじょ！",
  "ムーニアン・メカ Lv4！ 弾がふえすぎて、数えるのやめたじょ！",
  "ムーニアン・メカ Lv5！ 半分きたじょ。ロボットの気持ち、わかってきた気がする！",
  "ムーニアン・メカ Lv6！ 爆発がでかすぎて、耳がうしろにたおれるじょ！",
  "ムーニアン・メカ Lv7！ ラッキーセブンじゃ！ ぶどうまんじゅうも七つ食べたいじょ！",
  "ムーニアン・メカ Lv8！ 敵がこっち見ただけで、逃げていきよるじょ！",
  "ムーニアン・メカ Lv9！ もう吾輩がロボットか、ロボットが吾輩か、わからんじょ！",
  "ムーニアン・ファイター！？ 最強の相棒じゃ！ らんぴょん、見とってよー！"
];

const WEAPON_NAMES_JA = [
  "ムーンポッパー",
  "ツインムーンシューター",
  "ミルキーウェイキャノン",
  "オービットリング",
  "リボンレーザー",
  "ネビュラファン",
  "コメットリバース",
  "ムーニアンノヴァ",
  "サターンスプリッター",
  "アクアリウムスピア",
  "クエーサードライブ",
  "ギャラクシーブーメラン",
  "ブラックホールパルス",
  "コスモクラウン",
  "スーパーノヴァ360",
  "ステラガーディアンキャノン",
  "ムーニアン・メカ",
  "ムーニアン・メカ Lv2",
  "ムーニアン・メカ Lv3",
  "ムーニアン・メカ Lv4",
  "ムーニアン・メカ Lv5",
  "ムーニアン・メカ Lv6",
  "ムーニアン・メカ Lv7",
  "ムーニアン・メカ Lv8",
  "ムーニアン・メカ Lv9",
  "ムーニアン・ファイター"
];
const WEAPON_STAGES = [
  { name: "weapon-moon-01-moon-popper", count: 1, damage: 1, range: 220, speed: 560, width: 24, height: 7, spread: 0, cooldown: 0.42, pattern: "forward", colors: ["#fff3a4","#bff8ff","#ff9bd4"] },
  { name: "weapon-moon-02-twinmoon-shooter", count: 2, damage: 2, range: 360, speed: 720, width: 34, height: 8, spread: 10, cooldown: 0.36, pattern: "both", colors: ["#fff3a4","#c9f6ff","#c8b2ff"] },
  { name: "weapon-moon-03-milkyway-cannon", count: 3, damage: 3, range: 500, speed: 820, width: 38, height: 8, spread: 12, cooldown: 0.32, pattern: "spread", colors: ["#ffd1ed","#d9ffd6","#c8b2ff"] },
  { name: "weapon-moon-04-orbit-ring", count: 5, damage: 4, range: 640, speed: 900, width: 40, height: 9, spread: 0, cooldown: 0.3, pattern: "radial", colors: ["#d9ffd6","#fff3a4","#61f2a5"] },
  { name: "weapon-moon-05-ribbon-laser", count: 5, damage: 5, range: 780, speed: 980, width: 44, height: 9, spread: 10, cooldown: 0.27, pattern: "fan", colors: ["#fff3a4","#ffd1ed","#9ee8ff"] },
  { name: "weapon-moon-06-nebula-fan", count: 7, damage: 6, range: 920, speed: 1060, width: 50, height: 10, spread: 0, cooldown: 0.25, pattern: "fan", colors: ["#ffd1ed","#9ee8ff","#a976ff"] },
  { name: "weapon-moon-07-comet-reverse", count: 7, damage: 7, range: 1060, speed: 1140, width: 54, height: 11, spread: 0, cooldown: 0.23, pattern: "bothSpread", colors: ["#c9f6ff","#ffffff","#64d2ff"] },
  { name: "weapon-moon-08-moonian-nova", count: 9, damage: 8, range: 1200, speed: 1220, width: 60, height: 12, spread: 12, cooldown: 0.21, pattern: "spread", colors: ["#ffffff","#fff3a4","#ff8db7"] },
  { name: "weapon-star-01-saturn-splitter", count: 4, damage: 1, range: 240, speed: 600, width: 26, height: 7, spread: 0, cooldown: 0.42, pattern: "cross", colors: ["#fff6a6","#ffb86b","#ffffff"] },
  { name: "weapon-star-02-aquarium-spear", count: 2, damage: 2, range: 380, speed: 740, width: 34, height: 8, spread: 0, cooldown: 0.36, pattern: "wave", colors: ["#bff8ff","#4fe3ff","#ffffff"] },
  { name: "weapon-star-03-quasar-drive", count: 3, damage: 3, range: 520, speed: 840, width: 38, height: 8, spread: 0, cooldown: 0.32, pattern: "fan", colors: ["#ffffff","#ffd85a","#ff5f9e"] },
  { name: "weapon-star-04-galaxy-boomerang", count: 4, damage: 4, range: 660, speed: 920, width: 40, height: 9, spread: 18, cooldown: 0.3, pattern: "bothSpread", colors: ["#d7c8ff","#ffffff","#7d8cff"] },
  { name: "weapon-star-05-black-hole-pulse", count: 6, damage: 5, range: 800, speed: 1000, width: 44, height: 10, spread: 0, cooldown: 0.27, pattern: "radial", pierce: 1, colors: ["#2d245d","#9ee8ff","#ffffff"] },
  { name: "weapon-star-06-cosmo-crown", count: 7, damage: 6, range: 940, speed: 1080, width: 50, height: 10, spread: 0, cooldown: 0.25, pattern: "crown", colors: ["#fff3a4","#ff8db7","#ffffff"] },
  { name: "weapon-star-07-supernova-360", count: 10, damage: 7, range: 1080, speed: 1160, width: 54, height: 11, spread: 0, cooldown: 0.23, pattern: "radial", pierce: 2, colors: ["#ffffff","#fff3a4","#ff3d7f"] },
  { name: "weapon-star-08-stellar-guardian-cannon", count: 8, damage: 8, range: 1220, speed: 1240, width: 60, height: 12, spread: 0, cooldown: 0.21, pattern: "homing", explosion: 110, colors: ["#ffffff","#9ee8ff","#ff3d7f"] },
  { name: "Moonian Mecha", count: 26, damage: 27, range: 2660, speed: 2020, width: 92, height: 22, spread: 0, cooldown: 0.116, pattern: "homing", explosion: 175, colors: ["#ffffff","#ff8db7","#9ee8ff"] },
  { name: "Moonian Mecha Lv2", count: 28, damage: 30, range: 2720, speed: 2040, width: 92, height: 22, spread: 0, cooldown: 0.112, pattern: "homing", explosion: 180, colors: ["#ffffff","#ff8db7","#9ee8ff"] },
  { name: "Moonian Mecha Lv3", count: 30, damage: 33, range: 2780, speed: 2060, width: 92, height: 22, spread: 0, cooldown: 0.108, pattern: "homing", explosion: 185, colors: ["#ffffff","#ff8db7","#9ee8ff"] },
  { name: "Moonian Mecha Lv4", count: 32, damage: 36, range: 2840, speed: 2080, width: 92, height: 22, spread: 0, cooldown: 0.104, pattern: "homing", explosion: 190, colors: ["#ffffff","#ff8db7","#9ee8ff"] },
  { name: "Moonian Mecha Lv5", count: 34, damage: 39, range: 2900, speed: 2100, width: 92, height: 22, spread: 0, cooldown: 0.1, pattern: "homing", explosion: 195, colors: ["#ffffff","#ff8db7","#9ee8ff"] },
  { name: "Moonian Mecha Lv6", count: 36, damage: 42, range: 2960, speed: 2120, width: 92, height: 22, spread: 0, cooldown: 0.096, pattern: "homing", explosion: 200, colors: ["#ffffff","#ff8db7","#9ee8ff"] },
  { name: "Moonian Mecha Lv7", count: 38, damage: 45, range: 3020, speed: 2140, width: 92, height: 22, spread: 0, cooldown: 0.092, pattern: "homing", explosion: 205, colors: ["#ffffff","#ff8db7","#9ee8ff"] },
  { name: "Moonian Mecha Lv8", count: 40, damage: 48, range: 3080, speed: 2160, width: 92, height: 22, spread: 0, cooldown: 0.088, pattern: "homing", explosion: 210, colors: ["#ffffff","#ff8db7","#9ee8ff"] },
  { name: "Moonian Mecha Lv9", count: 42, damage: 51, range: 3140, speed: 2180, width: 92, height: 22, spread: 0, cooldown: 0.084, pattern: "homing", explosion: 215, colors: ["#ffffff","#ff8db7","#9ee8ff"] },
  { name: "Moonian Fighter", count: 40, damage: 60, range: 3200, speed: 2400, width: 96, height: 22, spread: 0, cooldown: 0.08, pattern: "homing", explosion: 220, colors: ["#ffffff","#9ee8ff","#ffd85a"] }
];
const TEXT = {
  ja: {
    title: "ぴょんぴーの大冒険",
    controls: "移動: ← → / A D、ジャンプ: Space、ダッシュ: Shift、攻撃: J / X / Y",
    start: "Start",
    next: "Spaceでスタート",
    allClear: "全クリア！",
    replay: "もう一度遊ぶ",
    stage: "ステージ",
    time: "時間",
    kaki: "ルナコイン",
    pea: "ピーナッツ",
    score: "スコア",
    hp: "HP",
    final: "ラスボス",
    boss: "ボス",
    noGun: " / 未取得",
    stolen: " / うばわれ中",
    stock: "在庫",
    unequipped: "未装備",
    equipTitle: "ムーニアンズ装備",
    weaponData: "武器データ",
    atk: "攻撃力",
    range: "射程距離",
    rapid: "連射",
    fusionNext: "2つ融合すると",
    finalEvolution: "最終進化",
    unknown: "これ以上は未知",
    fuseQuestion: "を融合しますか？",
    sortItems: "整理",
    page: "ページ",
    showing: "表示",
    sorted: "アイテムを整理したよ",
    loreClassic: "はムーニアン工房で育った基本兵装。融合するほど星の火力が濃くなる。",
    loreExperimental: "は未知惑星の設計図から生まれた実験兵装。ムーニアンノヴァを越える弾道を持つ。",
    commentClassic: "、かわいい顔しとるけど、ちゃんと強いじょ！",
    commentExperimental: "！？ これ、撃ったあと画面を見るほうが忙しいやつじゃ！",
    ranks: ["おこづかいルナコイン", "ちょきんルナコイン", "いい感じのルナコイン", "お大尽ルナコイン", "満タンルナコインパーティー"],
    mix: "比率",
    balance: "バランス"
  },
  en: {
    title: "Pyon-P Adventure",
    controls: "Move: Arrow / A D. Jump: Space. Dash: Shift. Attack: J / X / Y.",
    start: "Start",
    next: "Press Space to start",
    allClear: "All Clear!",
    replay: "Play Again",
    stage: "Stage",
    time: "Time",
    kaki: "Luna Coins",
    pea: "Peanuts",
    score: "Score",
    hp: "HP",
    final: "FINAL",
    boss: "BOSS",
    noGun: " / no gun",
    stolen: " / stolen",
    stock: "Stock",
    unequipped: "No weapon",
    equipTitle: "MOONIANS EQUIP",
    weaponData: "WEAPON DATA",
    atk: "Attack",
    range: "Range",
    rapid: "Rapid",
    fusionNext: "Fuse 2 for",
    finalEvolution: "Final evolution",
    unknown: "Beyond unknown",
    fuseQuestion: " fusion?",
    sortItems: "Sort",
    page: "Page",
    showing: "Showing",
    sorted: "Items sorted",
    loreClassic: " is a classic Moonian weapon. Fuse copies to make the starfire stronger.",
    loreExperimental: " is an experimental SF weapon that goes beyond Moonian Nova with stranger firing patterns.",
    commentClassic: " still looks cute, but it hits hard!",
    commentExperimental: " makes the whole screen busy. Nice!",
    ranks: ["Pocket-Money Rookie", "Coin Saver", "Luna Coin Runner", "Big Coin Explorer", "Perfect Coin Master"],
    mix: "Mix",
    balance: "Balance"
  }
};
const keys = new Set();
let audioCtx = null;
let audioUnlocked = false;
let lastSfxAt = {};
const pyompySprite = new Image();
pyompySprite.src = "assets/pyompy-spritesheet.png";
const pyompyJump = new Image();
pyompyJump.src = "assets/pyompy-jump-nosmoke.png";
const pyompyRun = new Image();
pyompyRun.src = "assets/pyompy-run-6.png";
const pyompyCrescentRespawn = new Image();
pyompyCrescentRespawn.src = "assets/pyonpy-crescent-respawn.png";
const worldMapImage = new Image();
// 軽いWebPを使う。読みこみに失敗したら、少し待ってもう一度読みこむ（iPhoneで地図が出ないことがあった）
worldMapImage.src = "assets/world-map.webp";
let worldMapRetries = 0;
worldMapImage.onerror = () => {
  if (worldMapRetries++ > 5) return;
  setTimeout(() => { worldMapImage.src = `assets/world-map.webp?r=${Date.now()}`; }, 800 * worldMapRetries);
};
const pastelBackground = new Image();
pastelBackground.src = `assets/pastel-space-background.png?v=${BACKGROUND_ASSET_VERSION}`;
const pastelBackground2 = new Image();
pastelBackground2.src = `assets/pastel-space-background2.png?v=${BACKGROUND_ASSET_VERSION}`;
const moonGround = new Image();
moonGround.src = "assets/pastel-moon-ground.png";
const selectUiImage = new Image();
selectUiImage.src = `assets/select-ui-generated2.png?v=${SELECT_UI_ASSET_VERSION}`;
const stageBackgroundImages = [
  "assets/pastel-space-background.png",
  "assets/stage-mars-bg.png",
  "assets/stage-crystal-bg.png",
  "assets/stage-ocean-bg.png",
  "assets/stage-ring-bg.png",
  "assets/stage-demon-bg.png"
].map((src, i) => {
  // ステージの背景は、そのワールドに入ったときに読みこむ（スマホのメモリを節約。1-1 の背景だけ最初から）
  const img = new Image();
  img.lazySrc = `${src}?v=${BACKGROUND_ASSET_VERSION}`;
  if (i === 0) img.src = img.lazySrc;
  return img;
});
const stageBackgroundMirrorImages = [
  "assets/pastel-space-background2.png",
  "assets/stage-mars-bg2.png",
  "assets/stage-crystal-bg2.png",
  "assets/stage-ocean-bg2.png",
  "assets/stage-ring-bg2.png",
  "assets/stage-demon-bg2.png"
].map((src, i) => {
  const img = new Image();
  img.lazySrc = `${src}?v=${BACKGROUND_ASSET_VERSION}`;
  if (i === 0) img.src = img.lazySrc;
  return img;
});

// そのワールドの背景を読みこむ（まだなら）
function ensureStageBackground(i) {
  for (const list of [stageBackgroundImages, stageBackgroundMirrorImages]) {
    const img = list[i];
    if (img && img.lazySrc && !img.loadStarted) {
      img.loadStarted = true;
      img.src = img.lazySrc;
    }
  }
}
const stageGroundImages = [
  "assets/pastel-moon-ground.png",
  "assets/stage-mars-ground.png",
  "assets/stage-crystal-ground.png",
  "assets/stage-ocean-ground.png",
  "assets/stage-ring-ground.png",
  "assets/stage-demon-ground.png"
].map(src => {
  const img = new Image();
  img.src = src;
  return img;
});
const enemyThemeImages = [
  "assets/enemy-moon-jelly.png",
  "assets/enemy-mars-cactus.png",
  "assets/enemy-crystal-fluff.png",
  "assets/enemy-ocean-manta.png",
  "assets/enemy-mecha-bot.png",
  "assets/enemy-demon-imp.png"
].map(src => {
  const img = new Image();
  img.src = src;
  return img;
});
const bossThemeImages = [
  "assets/boss-moon-candy-king.png",
  "assets/boss-mars-dome-commander.png",
  "assets/boss-crystal-yeti.png",
  "assets/boss-ocean-manta-queen.png",
  "assets/boss-mecha-robot-king.png",
  "assets/boss-demon-star-overlord.png"
].map(src => {
  const img = new Image();
  img.src = src;
  return img;
});
const enemyAttackImages = [
  "assets/enemy-moon-jelly-attack.png",
  "assets/enemy-mars-cactus-attack.png",
  "assets/enemy-crystal-fluff-attack.png",
  "assets/enemy-ocean-manta-attack.png",
  "assets/enemy-mecha-bot-attack.png",
  "assets/enemy-demon-imp-attack.png"
].map(src => {
  const img = new Image();
  img.src = src;
  return img;
});
const enemyHurtImages = [
  "assets/enemy-moon-jelly-hurt.png",
  "assets/enemy-mars-cactus-hurt.png",
  "assets/enemy-crystal-fluff-hurt.png",
  "assets/enemy-ocean-manta-hurt.png",
  "assets/enemy-mecha-bot-hurt.png",
  "assets/enemy-demon-imp-hurt.png"
].map(src => {
  const img = new Image();
  img.src = src;
  return img;
});
const bossAttackImages = [
  "assets/boss-moon-candy-king-attack.png",
  "assets/boss-mars-dome-commander-attack.png",
  "assets/boss-crystal-yeti-attack.png",
  "assets/boss-ocean-manta-queen-attack.png",
  "assets/boss-mecha-robot-king-attack.png",
  "assets/boss-demon-star-overlord-attack.png"
].map(src => {
  const img = new Image();
  img.src = src;
  return img;
});
const bossHurtImages = [
  "assets/boss-moon-candy-king-hurt.png",
  "assets/boss-mars-dome-commander-hurt.png",
  "assets/boss-crystal-yeti-hurt.png",
  "assets/boss-ocean-manta-queen-hurt.png",
  "assets/boss-mecha-robot-king-hurt.png",
  "assets/boss-demon-star-overlord-hurt.png"
].map(src => {
  const img = new Image();
  img.src = src;
  return img;
});
const weaponIcons = [
  "assets/weapon-moon-01-moon-popper.png",
  "assets/weapon-moon-02-twinmoon-shooter.png",
  "assets/weapon-moon-03-milkyway-cannon.png",
  "assets/weapon-moon-04-orbit-ring.png",
  "assets/weapon-moon-05-ribbon-laser.png",
  "assets/weapon-moon-06-nebula-fan.png",
  "assets/weapon-moon-07-comet-reverse.png",
  "assets/weapon-moon-08-moonian-nova.png",
  "assets/weapon-star-01-saturn-splitter.png",
  "assets/weapon-star-02-aquarium-spear.png",
  "assets/weapon-star-03-quasar-drive.png",
  "assets/weapon-star-04-galaxy-boomerang.png",
  "assets/weapon-star-05-black-hole-pulse.png",
  "assets/weapon-star-06-cosmo-crown.png",
  "assets/weapon-star-07-supernova-360.png",
  "assets/weapon-star-08-stellar-guardian-cannon.png",
  "assets/weapon-mech-icon.png",
  "assets/weapon-mech-icon.png",
  "assets/weapon-mech-icon.png",
  "assets/weapon-mech-icon.png",
  "assets/weapon-mech-icon.png",
  "assets/weapon-mech-icon.png",
  "assets/weapon-mech-icon.png",
  "assets/weapon-mech-icon.png",
  "assets/weapon-mech-icon.png",
  "assets/weapon-fighter-icon.png"
].map(src => {
  const img = new Image();
  img.src = `${src}?v=${WEAPON_ASSET_VERSION}`;
  return img;
});
const PYOMPY_FRAMES = [
  { x: 43, y: 161, w: 223, h: 422 },
  { x: 282, y: 180, w: 292, h: 402 },
  { x: 568, y: 188, w: 292, h: 386 },
  { x: 856, y: 191, w: 292, h: 383 },
  { x: 1168, y: 125, w: 230, h: 345 },
  { x: 1346, y: 152, w: 282, h: 354 },
  { x: 1640, y: 180, w: 272, h: 403 },
  { x: 1888, y: 234, w: 270, h: 343 }
];
const PYOMPY_RUN_FRAMES = [
  { x: 0, y: 0, w: 323, h: 738 },
  { x: 323, y: 0, w: 323, h: 738 },
  { x: 646, y: 0, w: 324, h: 738 },
  { x: 970, y: 0, w: 323, h: 738 },
  { x: 1293, y: 0, w: 323, h: 738 },
  { x: 1616, y: 0, w: 323, h: 738 }
];
const gamepadState = {
  left: false,
  right: false,
  up: false,
  down: false,
  jump: false,
  run: false,
  shoot: false,
  start: false,
  select: false,
  jumpLatch: false,
  leftLatch: false,
  rightLatch: false,
  upLatch: false,
  downLatch: false,
  shootLatch: false,
  startLatch: false,
  selectLatch: false,
  inventoryMoveDelay: 0,
  padId: "",
  neutralAxisX: 0,
  neutralAxisY: 0
};

let state;
let lastTime = 0;
let animationId = 0;
let pendingCourseStart = false;
let language = localStorage.getItem("pyonpLanguage") || "ja";
// 端末は毎回自動で判定する。タイトルのボタンで切り替えたときだけ、その回のあいだ手動の選択を優先する
let controlMode = Handheld.detect();

let currentCourse = 0;
let unlockedCourse = 0;
let mapSelectedCourse = 0;
let completedCourses = new Set();
let doubleTapRunDir = 0;
let doubleTapRunUntil = 0;
let doubleTapRunGraceUntil = 0;
let lastMoveTapDir = 0;
let lastMoveTapAt = 0;
let mapRevealTimer = 0;
let mapRevealFromWorld = 0;
let mapMessageTimer = 0;
let mapInputLockTimer = 0;
let mapCamera = { x: 0, y: 0 };
let mapWalkTimer = 0;
// よろず屋は 1-3 から左へのびる別ルートの先（月のクレーターの中）にある
// よろず屋は、ワールドごとに1けん。道のとちゅうから枝分かれした先にある（そのワールドだけの品もならぶ）
// dir = そのステージで十字キーをどちらに押すと、お店への道に入るか
const SHOP_MAP_NODES = [
  { x: 176, y: 580, course: 4, world: 0, dir: "down", via: [[278, 512], [259, 540], [215, 566]] }, // 月あめ：石のわき道の先
  { x: 465, y: 592, course: 6, world: 1, dir: "down", via: [[500, 562]] },                        // 火星：道ばたの車
  { x: 708, y: 372, course: 12, world: 2, dir: "up", via: [[745, 405]] },                         // 氷：ドームの入口
  { x: 928, y: 690, course: 20, world: 3, dir: "left", via: [] },                                 // 海：下の泡の家
  { x: 1262, y: 268, course: 25, world: 4, dir: "right", via: [[1215, 248]] },                    // メカ：列車
  { x: 1605, y: 478, course: 29, world: 5, dir: "right", via: [] }                                // 魔王星：ランタンの家
];

// お店への枝道（絵の座標の点の列）
function shopLinkPoints(node) {
  if (!node.path) node.path = smoothPath([MAP_NODE_POINTS[node.course], ...(node.via ?? []).map(([x, y]) => ({ x, y })), { x: node.x, y: node.y }]);
  return node.path;
}
let mapShopIndex = 0;
let SHOP_MAP_NODE = SHOP_MAP_NODES[0];
let mapAtShop = false;
let mapShopT = 0; // 0 = 1-3 の上、1 = よろず屋の上（歩く途中は間）
const shopMapIcon = new Image();
shopMapIcon.src = "assets/map-shop.png";

function shopNodeAvailable(node = SHOP_MAP_NODE) {
  return typeof Shop !== "undefined" && Shop.unlocked() && unlockedCourse >= node.course;
}

function shopNodeToCanvas(node = SHOP_MAP_NODE) {
  const layout = mapImageLayout();
  return { x: layout.x + node.x * layout.scale, y: layout.y + node.y * layout.scale };
}

function setActiveShop(i) {
  mapShopIndex = i;
  SHOP_MAP_NODE = SHOP_MAP_NODES[i];
}

// ワールド2〜6のお店の場所：そのワールドの3つ目のステージから、まわりのステージや道からいちばんはなれた向きへ
function placeWorldShops() {
  const pts = MAP_NODE_POINTS;
  const segDist = (px, py, a, b) => {
    const dx = b.x - a.x, dy = b.y - a.y;
    const t = Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / (dx * dx + dy * dy || 1)));
    return Math.hypot(px - (a.x + dx * t), py - (a.y + dy * t));
  };
  for (let w = 1; w < STAGE_AREA_COUNTS.length; w++) {
    const course = Math.min(STAGE_START_INDICES[w] + 2, pts.length - 1);
    const base = pts[course];
    let best = null;
    for (let k = 0; k < 8; k++) {
      const ang = (k / 8) * Math.PI * 2;
      const x = base.x + Math.cos(ang) * 92;
      const y = base.y + Math.sin(ang) * 92;
      if (x < 60 || x > 1610 || y < 80 || y > 880) continue;
      let clear = Infinity;
      for (let i = 0; i < pts.length; i++) {
        if (i !== course) clear = Math.min(clear, Math.hypot(x - pts[i].x, y - pts[i].y));
        if (i > 0) clear = Math.min(clear, segDist(x, y, pts[i - 1], pts[i]) + (i - 1 === course || i === course ? 40 : 0));
      }
      for (const n of SHOP_MAP_NODES) clear = Math.min(clear, Math.hypot(x - n.x, y - n.y));
      if (!best || clear > best.clear) best = { x, y, clear };
    }
    const dx = best.x - base.x, dy = best.y - base.y;
    const dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? "left" : "right") : (dy < 0 ? "up" : "down");
    SHOP_MAP_NODES.push({ x: Math.round(best.x), y: Math.round(best.y), course, world: w, dir });
  }
}

// 十字キーの向きでマップを動く。お店のあるステージで、お店のほうへ押すとよろず屋への道に入る
function mapMove(direction) {
  if (mapAtShop) {
    if (direction !== SHOP_MAP_NODE.dir) {
      mapAtShop = false;
      mapSelectedCourse = SHOP_MAP_NODE.course;
      currentCourse = mapSelectedCourse;
      playSfx("cursor");
      updateHud();
    }
    return;
  }
  const shopHere = SHOP_MAP_NODES.findIndex(n => n.course === mapSelectedCourse && n.dir === direction && shopNodeAvailable(n));
  if (shopHere >= 0) {
    setActiveShop(shopHere);
    mapAtShop = true;
    playSfx("cursor");
    return;
  }
  moveMapSelection(direction === "left" || direction === "up" ? -1 : 1);
}

function confirmMapSelection() {
  if (mapAtShop) {
    if (mapShopT > 0.85) Shop.open(SHOP_MAP_NODE.world);
    return;
  }
  startMapCourse(mapSelectedCourse);
}
let mapWalkFrom = 0;
let mapWalkTo = 0;
let gameOverContinueAvailable = false;
let gameOverContinueCost = 0;
let pauseSelection = 0;
let campaignKeep = null;
let platforms = [];
let blocks = [];
let level = { enemies: [], coins: [], flag: rect(5000, 252, 28, 240) };

const STAGE_THEMES = [
  { name: "Pastel Moon", imageIndex: 0, sky: ["#bfc6ff", "#dfc8ff", "#fff0c8"], ground: ["#f4e9cc", "#cfc7d6"], accent: "#fff3a4", world: "Moon Candy Field" },
  { name: "Mars Neon Colony", imageIndex: 1, sky: ["#301334", "#7b2638", "#f06f52"], ground: ["#d7654b", "#7b2b3d"], accent: "#ffcf73", world: "Mars Base" },
  { name: "Crystal Unknown Planet", imageIndex: 2, sky: ["#071c3b", "#164f7a", "#6ee7d8"], ground: ["#59c7d3", "#246b91"], accent: "#c6fff4", world: "Crystal Planet" },
  { name: "Alien Ocean", imageIndex: 3, sky: ["#02233f", "#005f78", "#6af6d7"], ground: ["#1a9fb6", "#063f61"], accent: "#bff8ff", world: "Star Ocean" },
  { name: "Ringed Mecha Factory", imageIndex: 4, sky: ["#211044", "#563b86", "#ffc67a"], ground: ["#d7a15f", "#76538f"], accent: "#fff3a4", world: "Ring Factory" },
  { name: "Demon Star Citadel", imageIndex: 5, sky: ["#090916", "#35102b", "#8e1238"], ground: ["#403052", "#151224"], accent: "#ff3d7f", world: "Demon Star" }
];
const STAGE_AREA_COUNTS = [5, 5, 5, 7, 5, 8];
const TOTAL_COURSES = STAGE_AREA_COUNTS.reduce((sum, count) => sum + count, 0);
const STAGE_START_INDICES = STAGE_AREA_COUNTS.map((_, index) => STAGE_AREA_COUNTS.slice(0, index).reduce((sum, count) => sum + count, 0));

function stageAreaCount(worldIndex) {
  return STAGE_AREA_COUNTS[worldIndex] ?? 5;
}

function courseIndexToWorldArea(index) {
  let remaining = index;
  for (let worldIndex = 0; worldIndex < STAGE_AREA_COUNTS.length; worldIndex++) {
    const count = STAGE_AREA_COUNTS[worldIndex];
    if (remaining < count) return { worldIndex, areaIndex: remaining };
    remaining -= count;
  }
  return { worldIndex: STAGE_AREA_COUNTS.length - 1, areaIndex: stageAreaCount(STAGE_AREA_COUNTS.length - 1) - 1 };
}

const BOSS_DIALOGUES = [
  {
    bossJa: "ふわふわ月あめは、ぜんぶぼくの王国だよ！",
    pyonJa: "ぴょんぴー「じゃあ半分こして、平和も返してもらうよ！」",
    bossEn: "This fluffy moon candy kingdom is all mine!",
    pyonEn: "Pyon-P: Then I will split it fairly and bring peace back!"
  },
  {
    bossJa: "火星ドームのネオンを、きみの勇気で消せるかな？",
    pyonJa: "ぴょんぴー「勇気は省エネじゃないから、ずっと光るよ！」",
    bossEn: "Can your courage dim the neon of my Mars dome?",
    pyonEn: "Pyon-P: Courage does not run out. It keeps glowing!"
  },
  {
    bossJa: "この水晶の星で、きみもキラキラに固めてあげる。",
    pyonJa: "ぴょんぴー「固まる前に、こっちが先にとかす！」",
    bossEn: "On this crystal planet, I will freeze you into sparkle.",
    pyonEn: "Pyon-P: I will melt your plan before that happens!"
  },
  {
    bossJa: "星の海の底まで、泡にして沈めてあげるわ。",
    pyonJa: "ぴょんぴー「泳げなくても、ジャンプで越える！」",
    bossEn: "I will bubble you down to the bottom of the star sea.",
    pyonEn: "Pyon-P: Even if I cannot swim, I can jump over it!"
  },
  {
    bossJa: "リング工場の歯車に、かわいく巻き込まれな！",
    pyonJa: "ぴょんぴー「かわいいだけじゃなくて、強いんだよ！」",
    bossEn: "Get sweetly caught in the gears of my ring factory!",
    pyonEn: "Pyon-P: I am not just cute. I am strong too!"
  },
  {
    bossJa: "ここが終点だ。魔王星の夜に飲まれてしまえ！",
    pyonJa: "ぴょんぴー「ここが終点じゃない。大冒険のクライマックスだ！」",
    bossEn: "This is the end. Be swallowed by the night of Demon Star!",
    pyonEn: "Pyon-P: This is not the end. It is the climax!"
  }
];
const BOSS_DEFEAT_DIALOGUES = [
  {
    bossJa: "やられたー！ふわふわ王国、今日は閉店だよー！",
    pyonJa: "ぴょんぴー「閉店セールやな。平和だけもらって帰るで！」",
    bossEn: "I am beaten! The fluffy kingdom is closed today!",
    pyonEn: "Pyon-P: Closing sale? I will take the peace back!"
  },
  {
    bossJa: "ぐぬぬ、火星ドームのネオンが消えてしまう！",
    pyonJa: "ぴょんぴー「節電できてええやん。地球にも優しいで！」",
    bossEn: "No, the Mars dome neon is going dark!",
    pyonEn: "Pyon-P: Nice power saving. Space likes that!"
  },
  {
    bossJa: "きらきらに固めるつもりが、こっちが割れたー！",
    pyonJa: "ぴょんぴー「氷もプライドも、ぴょんと割れたな！」",
    bossEn: "I tried to freeze you, but I cracked instead!",
    pyonEn: "Pyon-P: Your ice and pride both cracked!"
  },
  {
    bossJa: "ぶくぶく……星の海に沈むのは私のほうだったわ。",
    pyonJa: "ぴょんぴー「浮き輪いる？耳でちょっとだけ貸したろか！」",
    bossEn: "Bubble bubble... I am the one sinking into the star sea.",
    pyonEn: "Pyon-P: Need a float? My ears are not for rent!"
  },
  {
    bossJa: "リング工場の歯車が、ぜんぶ空回りだー！",
    pyonJa: "ぴょんぴー「空回りはうちのジャンプだけで十分や！」",
    bossEn: "All the ring factory gears are spinning uselessly!",
    pyonEn: "Pyon-P: Leave the fancy spinning to my jumps!"
  },
  {
    bossJa: "魔王星の夜が……朝になってしまう……！",
    pyonJa: "ぴょんぴー「ほな、おはようさん！大冒険、勝利の朝や！」",
    bossEn: "The Demon Star night... is turning into morning!",
    pyonEn: "Pyon-P: Good morning then! Adventure wins!"
  }
];

BOSS_DIALOGUES[0].bossJa = "ふわふわ月あめは、ぜんぶぼくの王国だよ！";
BOSS_DIALOGUES[0].pyonJa = "ぴょんぴー「じゃあ半分こして、平和も返してもらうよ！」";
BOSS_DIALOGUES[1].bossJa = "火星ドームのネオンを、きみの勇気で消せるかな？";
BOSS_DIALOGUES[1].pyonJa = "ぴょんぴー「勇気は省エネじゃないから、ずっと光るよ！」";
BOSS_DIALOGUES[2].bossJa = "この水晶の星で、きみもキラキラに固めてあげる。";
BOSS_DIALOGUES[2].pyonJa = "ぴょんぴー「固まる前に、こっちが先にとかす！」";
BOSS_DIALOGUES[3].bossJa = "星の海の底まで、泡にして沈めてあげるわ。";
BOSS_DIALOGUES[3].pyonJa = "ぴょんぴー「泳げなくても、ジャンプで越えちゃう！」";
BOSS_DIALOGUES[4].bossJa = "リング工場の歯車に、かわいく巻き込まれな！";
BOSS_DIALOGUES[4].pyonJa = "ぴょんぴー「かわいいだけじゃなくて、強いんだから！」";
BOSS_DIALOGUES[5].bossJa = "ここが終点だ。魔王星の夜にのみこまれてしまえ！";
BOSS_DIALOGUES[5].pyonJa = "ぴょんぴー「終点じゃないよ。大冒険のクライマックスだ！」";

BOSS_DEFEAT_DIALOGUES[0].bossJa = "やられたー！ふわふわ王国、今日は閉店だよー！";
BOSS_DEFEAT_DIALOGUES[0].pyonJa = "ぴょんぴー「閉店セールやな。平和だけもらって帰るで！」";
BOSS_DEFEAT_DIALOGUES[1].bossJa = "ぐぬぬ、火星ドームのネオンが消えてしまう！";
BOSS_DEFEAT_DIALOGUES[1].pyonJa = "ぴょんぴー「節電できてええやん。地球にも優しいで！」";
BOSS_DEFEAT_DIALOGUES[2].bossJa = "きらきらに固めるつもりが、こっちが割れたー！";
BOSS_DEFEAT_DIALOGUES[2].pyonJa = "ぴょんぴー「氷もプライドも、ぱりんと割れたな！」";
BOSS_DEFEAT_DIALOGUES[3].bossJa = "ぶくぶく……星の海に沈むのは私のほうだったわ。";
BOSS_DEFEAT_DIALOGUES[3].pyonJa = "ぴょんぴー「浮き輪いる？耳でちょっとだけ貸したろか！」";
BOSS_DEFEAT_DIALOGUES[4].bossJa = "リング工場の歯車が、ぜんぶ空回りだー！";
BOSS_DEFEAT_DIALOGUES[4].pyonJa = "ぴょんぴー「空回りはうちのジャンプだけで十分や！」";
BOSS_DEFEAT_DIALOGUES[5].bossJa = "魔王星の夜が……朝になってしまう……！";
BOSS_DEFEAT_DIALOGUES[5].pyonJa = "ぴょんぴー「ほな、おはようさん！大冒険、勝利の朝や！」";

// 物語に合わせた台本（ボスは魔王から「ワライスターのかけら」をあずかっている）
const BOSS_STORY_LINES = [
  {
    intro: ["魔王さまからあずかった『かけら』は、ふわふわ月あめ王国のたからものだよ！", "The shard the Demon Lord gave me is the treasure of my fluffy candy kingdom!"],
    introPyon: ["それ、みんなの笑いじょ。半分こもなしで、ぜんぶ返してもらうけん！", "That's everybody's laughter. No splitting it. I'm taking all of it back!"],
    defeat: ["やられたー！ ……あれ？ なんか、おなかの底から笑えてきたよ。かけら、返すね！", "I'm beaten! ...Huh? I feel like laughing from deep in my belly. Here, take the shard back!"],
    defeatPyon: ["おおきに！ 今度フェスやるけん、月あめ持って見に来てだ！", "Thanks! We've got a Fest coming up. Bring some moon candy and come watch!"]
  },
  {
    intro: ["このかけらは火星ドームの動力にする。笑いなど、ネオンのこやしで十分だ！", "This shard will power my Mars dome. Laughter is nothing but fuel for neon!"],
    introPyon: ["笑いは電気代でないんじょ。みんなのもんじゃ、返してもらうけん！", "Laughter isn't a power bill. It belongs to everyone, so hand it over!"],
    defeat: ["ぐぬぬ……ネオンが消えたのに、なぜか胸が明るい。これが、笑いか……。持っていけ！", "Grr... the neon is out, yet my chest feels bright. So this is laughter... Take it!"],
    defeatPyon: ["節電もできて一石二鳥でないか。司令官もフェス、見に来てだ！", "Saves power too. Two birds, one stone! Come see the Fest, Commander!"]
  },
  {
    intro: ["かけらは、この水晶の星でキラキラに固めておく。きみもいっしょに固めてあげる。", "I will keep the shard frozen in sparkle on this crystal planet. You can freeze along with it."],
    introPyon: ["固まる前に、こっちが先にとかしちゃる！ かけらも、あんたの顔もな！", "I'll melt it before that happens. The shard, and that frozen face of yours!"],
    defeat: ["きらきらに固めるつもりが、こっちの顔がゆるんじゃった……。ふふっ。かけら、どうぞ。", "I meant to freeze everything, but my own face has melted into a smile... Hehe. Here is the shard."],
    defeatPyon: ["ええ笑顔でないか！ その顔でフェス見に来てだ！", "Now that's a great smile! Bring it to the Fest!"]
  },
  {
    intro: ["このかけらは星の海の底にしずめたわ。あなたも泡にして、しずめてあげる。", "I have sunk the shard to the bottom of the star sea. I shall turn you to bubbles and sink you too."],
    introPyon: ["泳ぎは得意でないけど、笑いをしずめたままにはできんじょ！", "I'm no swimmer, but I can't leave laughter at the bottom of the sea!"],
    defeat: ["ぶくぶく……あら、泡といっしょに笑いがこみあげてきたわ。かけらは、あなたにあずけるわね。", "Bubble bubble... oh my, laughter is rising with the bubbles. I shall leave the shard with you."],
    defeatPyon: ["おおきに、クイーン！ フェスの客席、いちばんええ水そう用意しとくけん！", "Thanks, Queen! I'll save you the best tank in the audience at the Fest!"]
  },
  {
    intro: ["カケラハ コウジョウノ ネンリョウ。ワライ、フヨウ。ハグルマニ マキコマレナ！", "SHARD IS FACTORY FUEL. LAUGHTER: NOT REQUIRED. GET CAUGHT IN THE GEARS!"],
    introPyon: ["笑いは不要でない、必要じゃ！ かわいいだけでのうて強いとこ、見せちゃるわ！", "Laughter is required, thank you! I'll show you I'm strong, not just cute!"],
    defeat: ["ハグルマ、カラマワリ……ピピ……ワライ、インストール カンリョウ。カケラ、ヘンキャク スル。", "GEARS SPINNING FREELY... BEEP... LAUGHTER: INSTALL COMPLETE. RETURNING SHARD."],
    defeatPyon: ["アップデートできてよかったな！ フェスも予定に入れといてだ！", "Glad the update went through! Put the Fest on your schedule too!"]
  },
  {
    intro: ["よくぞここまで来た。だが最後のかけらは渡さぬ。笑いなど、宇宙から消えてしまえばよいのだ！", "You have done well to come this far. But I will not give up the last shard. Laughter should vanish from the universe!"],
    introPyon: ["消させはせん。ここが終点でない、大冒険のクライマックスじゃ！", "Not on my watch. This isn't the end. It's the grand finale!"],
    defeat: ["ば、ばかな……。魔王星の夜が……明けていく……！", "I-impossible... The night of the Demon Star... is ending...!"],
    defeatPyon: ["ほな、おはようさん。なあ魔王、ちょっと話、聞かせてだ。", "Good morning, then. Hey, Demon Lord. Tell me your story."]
  }
];
BOSS_STORY_LINES.forEach((line, i) => {
  BOSS_DIALOGUES[i].bossJa = line.intro[0];
  BOSS_DIALOGUES[i].bossEn = line.intro[1];
  BOSS_DIALOGUES[i].pyonJa = line.introPyon[0];
  BOSS_DIALOGUES[i].pyonEn = line.introPyon[1];
  BOSS_DEFEAT_DIALOGUES[i].bossJa = line.defeat[0];
  BOSS_DEFEAT_DIALOGUES[i].bossEn = line.defeat[1];
  BOSS_DEFEAT_DIALOGUES[i].pyonJa = line.defeatPyon[0];
  BOSS_DEFEAT_DIALOGUES[i].pyonEn = line.defeatPyon[1];
});

const AREA_LANDMARKS = [
  "outpost",
  "towers",
  "harbor",
  "reactor",
  "throne"
];

const MAP_STAGE_MESSAGES = {
  ja: [
    "ぴょんぴー「パステル宇宙、出発じゃ！」",
    "ぴょんぴー「火星の赤い町まで道がつながったじょ！」",
    "ぴょんぴー「氷の星じゃ。すべらんように行こう！」",
    "ぴょんぴー「海の星、ぷかぷか進むじょ！」",
    "ぴょんぴー「メカの輪っか都市、ビリビリしよるな！」",
    "ぴょんぴー「最後の魔王城じゃ。ここで決めるじょ！」"
  ],
  en: [
    'Pyon-P: "Pastel space, here we go!"',
    'Pyon-P: "The road to Mars just opened!"',
    'Pyon-P: "An ice planet. Step steady!"',
    'Pyon-P: "Ocean star ahead. Floaty time!"',
    'Pyon-P: "A mechanical ring city. Careful!"',
    'Pyon-P: "The final castle. Let us finish this!"'
  ]
};

// マップの絵の、金色の石・道・目じるしの建物の上にステージを置く（絵の座標）
const MAP_NODE_POINTS = [
  // 1 月あめ平原
  { x: 220, y: 237 }, { x: 192, y: 320 }, { x: 177, y: 382 }, { x: 234, y: 442 }, { x: 290, y: 486 },
  // 2 火星（石 → 石 → ロケット台 → ドーム → 大きなドーム＝ボス）
  { x: 430, y: 540 }, { x: 527, y: 530 }, { x: 545, y: 428 }, { x: 395, y: 345 }, { x: 472, y: 255 },
  // 3 氷の星（門 → 石 → 石 → 石 → ロケット＝ボス）
  { x: 615, y: 530 }, { x: 715, y: 498 }, { x: 762, y: 447 }, { x: 765, y: 552 }, { x: 775, y: 646 },
  // 4 星の海（石 → 石 → 小さなドーム → 大きなドーム → サンゴの島 → 下のドーム → 石＝ボス）
  { x: 925, y: 577 }, { x: 1020, y: 545 }, { x: 1040, y: 474 }, { x: 962, y: 440 }, { x: 895, y: 482 }, { x: 985, y: 645 }, { x: 1102, y: 512 },
  // 5 メカ工場（石 → 石 → ロボットの像 → 上のドーム → 輪のむこうの石＝ボス）
  { x: 1215, y: 452 }, { x: 1269, y: 461 }, { x: 1222, y: 410 }, { x: 1170, y: 242 }, { x: 1362, y: 570 },
  // 6 魔王星（石 → 大きな輪 → 石 → 石 → 石 → ふしぎな門 → 城の階段 → 城の門＝魔王）
  { x: 1435, y: 587 }, { x: 1530, y: 560 }, { x: 1565, y: 460 }, { x: 1576, y: 412 }, { x: 1545, y: 365 }, { x: 1435, y: 440 }, { x: 1428, y: 340 }, { x: 1475, y: 282 }
];
// ステージ i-1 → i の道が通る点（絵の道にそって曲がる）
const MAP_LINK_WAYPOINTS = [
  [],
  [[240, 243], [262, 260], [268, 283], [258, 303], [230, 317]], [[198, 346], [190, 364]], [[188, 412], [212, 436]], [[262, 458]],
  [[322, 490], [362, 502], [390, 528]], [[480, 537]], [[522, 492]], [[500, 400], [455, 360]], [[440, 295]],
  [[520, 330], [545, 480], [585, 530]], [[665, 514]], [[742, 470]], [[792, 498]], [[800, 600]],
  [[820, 615], [870, 598]], [[972, 562]], [[1040, 510]], [[1000, 452]], [[920, 462]], [[905, 570], [940, 632]], [[1050, 612], [1090, 560]],
  [[1150, 478]], [[1242, 455]], [[1250, 428]], [[1200, 330]], [[1290, 300], [1335, 400], [1340, 510]],
  [[1400, 585]], [[1482, 588]], [[1555, 510]], [], [], [[1490, 405]], [[1430, 395]], [[1445, 310]]
];

// 点の列を、なめらかな曲線（Catmull-Rom）でつないだ点にする
function smoothPath(pts, perSeg = 10) {
  if (pts.length < 2) return pts.slice();
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < perSeg; k++) {
      const t = k / perSeg, t2 = t * t, t3 = t2 * t;
      out.push({
        x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3)
      });
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

const mapLinkCache = new Map();
// ステージ i-1 → i の道（絵の座標の点の列）
function mapLinkPoints(i) {
  if (mapLinkCache.has(i)) return mapLinkCache.get(i);
  const a = MAP_NODE_POINTS[i - 1], b = MAP_NODE_POINTS[i];
  const pts = [a, ...(MAP_LINK_WAYPOINTS[i] ?? []).map(([x, y]) => ({ x, y })), b];
  const path = smoothPath(pts);
  mapLinkCache.set(i, path);
  return path;
}

// 点の列の上で、全体の t（0〜1）の場所
function pointAlong(path, t) {
  if (path.length === 1) return path[0];
  const lens = [0];
  for (let i = 1; i < path.length; i++) lens.push(lens[i - 1] + Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y));
  const target = clamp(t, 0, 1) * lens[lens.length - 1];
  for (let i = 1; i < path.length; i++) {
    if (lens[i] >= target) {
      const k = (target - lens[i - 1]) / Math.max(0.001, lens[i] - lens[i - 1]);
      return { x: path[i - 1].x + (path[i].x - path[i - 1].x) * k, y: path[i - 1].y + (path[i].y - path[i - 1].y) * k };
    }
  }
  return path[path.length - 1];
}

// 道を、t（0〜1）のところまで、太い線と細い線で描く
function strokeMapPath(path, t, layout, styles) {
  const toC = p => ({ x: layout.x + p.x * layout.scale, y: layout.y + p.y * layout.scale });
  const lens = [0];
  for (let i = 1; i < path.length; i++) lens.push(lens[i - 1] + Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y));
  const limit = clamp(t, 0, 1) * lens[lens.length - 1];
  const pts = [toC(path[0])];
  for (let i = 1; i < path.length; i++) {
    if (lens[i] <= limit) pts.push(toC(path[i]));
    else { pts.push(toC(pointAlong(path, limit / lens[lens.length - 1]))); break; }
  }
  for (const st of styles) {
    ctx.strokeStyle = st.color;
    ctx.lineWidth = st.width;
    if (st.dash) { ctx.setLineDash(st.dash); ctx.lineDashOffset = -performance.now() / 60; }
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.stroke();
    if (st.dash) ctx.setLineDash([]);
  }
}

const MAP_WORLD_FOG_ZONES = [
  null,
  { x: 470, y: 452, rx: 185, ry: 302, rotate: -0.08, color: "rgba(255, 209, 237, 0.74)" },
  { x: 694, y: 498, rx: 205, ry: 340, rotate: -0.02, color: "rgba(201, 246, 255, 0.76)" },
  { x: 980, y: 488, rx: 210, ry: 328, rotate: 0.04, color: "rgba(217, 255, 214, 0.72)" },
  { x: 1254, y: 485, rx: 194, ry: 318, rotate: -0.03, color: "rgba(255, 243, 164, 0.7)" },
  { x: 1515, y: 450, rx: 255, ry: 380, rotate: 0.07, color: "rgba(200, 178, 255, 0.78)" }
];

// ---------- ステージごとの「つくり」 ----------
// 同じ星の中で、にたステージが続かないように、ステージごとに
//   kinds = 外の道に出てくる地形の種類（なければ全部まぜる）
//   rooms = 外の道のあとに入る部屋（順番どおり）
//   title = ステージが始まるときに出る名前
// を決める。ちがう星どうしは、にていてもよい。
const STAGE_RECIPES = [
  // 月あめ平原
  [
    { title: ["はじめての道", "First Steps"], rooms: ["winding"] },
    { title: ["空の島わたり", "Sky Islands"], kinds: ["islands", "mover", "pits", "shelf"], rooms: ["shaftUp"] },
    { title: ["月あめ山のぼり", "Candy Mountain"] }, // 山のぼりステージ
    { title: ["とりでのたたかい", "Fortress Fight"], kinds: ["pillars", "tower", "flat", "cliff"], rooms: ["arena", "cave"] }
  ],
  // 火星ネオンコロニー
  [
    { title: ["マグマの谷とび", "Lava Leaps"], kinds: ["pits", "valley", "stairs", "flat"], rooms: ["shaftDown"] },
    { title: ["地下トンネルたんけん", "Tunnel Dive"], kinds: ["tunnel", "crawlway", "pillars", "flat"], rooms: ["cave", "maze"] },
    { title: ["トゲトゲ台地", "Spike Plateau"], kinds: ["spikeField", "shelf", "tower"], rooms: ["winding"] },
    { title: ["火山のぼり", "Volcano Climb"], kinds: ["cliff", "stairs", "islands", "mover"], rooms: ["shaftUp", "arena"] }
  ],
  // クリスタル氷星
  [
    { title: ["つるつる大すべり", "Slip and Slide"], kinds: ["pits", "stairs", "flat", "valley"], rooms: ["winding"] },
    { title: ["氷の浮き島", "Frozen Isles"], kinds: ["islands", "mover", "shelf"], rooms: ["shaftUp"] },
    { title: ["クリスタルの迷路", "Crystal Maze"], kinds: ["tunnel", "crawlway", "pillars", "spikeField"], rooms: ["maze", "cave"] },
    { title: ["氷のとりで", "Ice Fortress"], kinds: ["tower", "cliff", "flat", "pillars"], rooms: ["arena", "shaftDown"] }
  ],
  // 星の海（泳ぐステージ：sea = 岩の門のならび方）
  [
    { title: ["はじめての海", "First Swim"], sea: "wide" },
    { title: ["ジグザグ岩", "Zigzag Reef"], sea: "zigzag" },
    { title: ["ぱくぱく門", "Snapping Gates"], sea: "timing" },
    { title: ["ふたご岩", "Twin Rocks"], sea: "pairs" },
    { title: ["門のウェーブ", "Gate Wave"], sea: "wave" },
    { title: ["せまい海みち", "Narrow Strait"], sea: "narrow" }
  ],
  // リングメカ工場
  [
    { title: ["トロッコ大ぼうそう", "Runaway Cart"], kinds: ["cart", "mover", "flat", "pits"], rooms: ["winding"] },
    { title: ["うごく足場の空", "Moving Sky"], kinds: ["islands", "mover", "shelf", "pits"], rooms: ["shaftUp"] },
    { title: ["工場の迷路", "Factory Maze"], kinds: ["tunnel", "crawlway", "pillars", "spikeField"], rooms: ["maze", "arena"] },
    { title: ["メカの塔", "Mecha Tower"], kinds: ["tower", "cliff", "stairs", "valley"], rooms: ["shaftDown", "cave"] }
  ],
  // 魔王星
  [
    { title: ["トゲの荒野", "Thorn Wastes"], kinds: ["spikeField", "shelf", "pits"], rooms: ["winding"] },
    { title: ["やみの浮き島", "Shadow Isles"], kinds: ["islands", "mover", "cliff"], rooms: ["shaftUp"] },
    { title: ["魔王の地下道", "Demon Tunnels"], kinds: ["tunnel", "crawlway", "pillars", "flat"], rooms: ["cave", "maze"] },
    { title: ["手下の大軍", "Minion Army"], kinds: ["flat", "pillars", "tower"], rooms: ["arena", "arena"] },
    { title: ["ならくの穴", "The Abyss"], kinds: ["cliff", "stairs", "valley"], rooms: ["shaftDown", "shaftUp"] },
    { title: ["まよいの城", "Castle of Confusion"], kinds: ["pits", "mover", "valley", "shelf"], rooms: ["maze", "winding"] },
    { title: ["魔王城への道", "Road to the Demon Castle"], rooms: ["cave", "arena", "shaftUp"] }
  ]
];

function stageRecipe(worldIndex, areaIndex) {
  return STAGE_RECIPES[worldIndex]?.[areaIndex] ?? null;
}

function makeCourse(worldIndex, areaIndex, layout = areaIndex, seed = null) {
  const recipe = stageRecipe(worldIndex, areaIndex);
  const difficulty = STAGE_START_INDICES[worldIndex] + areaIndex + 1;
  const bossStage = areaIndex === stageAreaCount(worldIndex) - 1;
  const finalStage = worldIndex === STAGE_THEMES.length - 1 && bossStage;
  const trait = STAGE_TRAITS[worldIndex] ?? "moonFloat";
  let platforms = [rect(0, 492, 620, 48)];
  let x = 620;
  for (let i = 0; i < 9; i++) {
    const w = Math.max(260, 440 - difficulty * 5 - (i % 3) * 28);
    platforms.push(rect(x, 492, w, 48));
    if (i % 2 === 0) platforms.push(rect(x + 80 + (i % 3) * 55, 360 - ((i + difficulty) % 4) * 38, 170 + (i % 2) * 42, 36));
    if (i % 3 === 1) platforms.push(rect(x + 250, 272 + ((i + worldIndex) % 2) * 54, 180, 36));
    x += w;
  }
  if (x < 4300) platforms.push(rect(x, 492, 4300 - x + 220, 48));
  platforms.push(rect(4300, 492, 900, 48));
  if (trait === "iceSlide") {
    platforms = buildIceCoursePlatforms(difficulty, areaIndex, bossStage);
  }
  if (trait === "factoryBelt") {
    platforms = buildFactoryCoursePlatforms(difficulty, areaIndex, bossStage);
  }
  if (trait !== "iceSlide" && trait !== "factoryBelt" && trait !== "underwater") {
    platforms = buildVariedCoursePlatforms(worldIndex, layout, difficulty, bossStage, finalStage);
  }
  if (finalStage) platforms = buildFinalBossCoursePlatforms();
  if (trait === "underwater") platforms.length = 0;
  const climb = !bossStage && trait !== "underwater" && Gimmick.isClimbArea(worldIndex, layout) ? Gimmick.buildClimb(worldIndex, layout) : null;
  if (climb) platforms = climb.platforms;
  // ふつうのステージは、区間をつないだ、その場所だけの通路にする
  const chunk = !bossStage && !finalStage && trait !== "underwater" && !climb
    ? buildChunkCourse({ seed: seed ?? (STAGE_START_INDICES[worldIndex] + areaIndex) * 3, difficulty, trait, endX: 3500, worldEnd: 3900, kinds: recipe?.kinds ?? CHUNK_KINDS })
    : null;
  // 外の道は 3900 まで。その先は高いかべ
  if (chunk) chunk.platforms.push(rect(3900, -1200, WORLD_WIDTH - 3900 + 200, canvas.height + 1248));
  if (chunk) platforms = chunk.platforms;

  const blocks = [];
  for (let i = 0; i < (finalStage || trait === "underwater" ? 0 : 9); i++) {
    const bx = 560 + i * 430 + (i % 2) * 90;
    const by = 300 - (i % 3) * 38;
    if (i % 3 === 0) blocks.push(breakable(bx, by, "hp"));
    else if (i % 3 === 1) blocks.push(breakable(bx, by, "power"));
    else blocks.push(breakable(bx, by, "power"));
  }
  if (chunk) blocks.splice(0, blocks.length, ...chunk.blocks);
  if (finalStage) {
    blocks.push(
      hiddenItemBox(3420, 252, "power"),
      hiddenItemBox(3520, 252, "hp"),
      hiddenItemBox(3620, 252, "power"),
      hiddenItemBox(3390, 308, "power"),
      hiddenItemBox(3490, 308, "hp"),
      hiddenItemBox(3590, 308, "power")
    );
  }

  const enemies = [];
  const enemyCount = finalStage ? 0 : Math.min(13, 5 + difficulty);
  for (let i = 0; i < enemyCount; i++) {
    const ex = 620 + i * Math.max(260, 520 - difficulty * 8);
    const left = Math.max(0, ex - 180);
    const right = Math.min(WORLD_WIDTH - 80, ex + 360);
    const power = Math.min(MAX_WEAPON_POWER, Math.max(2, Math.floor((difficulty + i) / 3)));
    const foe = (i + difficulty) % 3 === 0 ? armedEnemy(ex, 444, left, right, power) : enemy(ex, 444, left, right);
    foe.enemyKind = worldIndex;
    enemies.push(foe);
  }
  const chunkStuff = chunk ? chunkCourseContent(chunk, worldIndex, difficulty, enemyCount) : null;
  if (chunkStuff) enemies.splice(0, enemies.length, ...chunkStuff.enemies);
  else if (trait !== "underwater") placeEnemiesOnPlatforms(enemies, platforms);
  if (bossStage) {
    const bossPowers = [5, 4, 7, 9, 11, 16];
    const bossPower = finalStage ? 16 : bossPowers[worldIndex] ?? Math.min(MAX_WEAPON_POWER, 5 + worldIndex * 2);
    enemies.push(bossEnemy(finalStage ? 4280 : 4440, finalStage ? 320 : 392, 3940, 5120, {
      final: finalStage,
      bossKind: worldIndex,
      weaponPower: bossPower,
      // 最初のボスは、ムーンポッパー（いちばん弱い武器）でも時間内に倒せるくらいに
      hp: finalStage ? 420 : Math.round((96 + worldIndex * 34) * (worldIndex === 0 ? 1.25 : 1.6)),
      w: finalStage ? 190 : 96 + worldIndex * 10,
      h: finalStage ? 172 : 96 + worldIndex * 10
    }));
  }

  const coins = [];
  for (let i = 0; i < (finalStage ? 0 : 13); i++) {
    coins.push(coin(540 + i * 350, i % 2 ? 242 + (i % 3) * 36 : 430, i % 2 ? "pea" : "kaki"));
  }
  const starItems = finalStage ? [] : [
    starItem(950, 430),
    starItem(2260, 300),
    starItem(3740, 430)
  ];
  const oxygenItems = trait === "underwater" && !finalStage ? [
    oxygenItem(780, 96),
    oxygenItem(2060, 88),
    oxygenItem(3520, 104)
  ] : [];
  const seaGates = trait === "underwater" && !bossStage ? buildSeaGates(areaIndex, difficulty, seed ?? (STAGE_START_INDICES[worldIndex] + areaIndex) * 3, recipe?.sea ?? null) : [];
  const pitGeysers = chunk && trait === "marsLava"
    ? chunk.pitXs.filter((_, i, a) => a.length <= 4 || i % Math.ceil(a.length / 4) === 0).slice(0, 4).map((x, i) => lavaGeyser(x - 36, (i * 1.1 + 0.5) % 4.2))
    : null;
  const lavaGeysers = pitGeysers ? pitGeysers : trait === "marsLava" && !finalStage ? [
    lavaGeyser(980, 1.1),
    lavaGeyser(1780, 2.3),
    lavaGeyser(2880, 3.4),
    lavaGeyser(4140, 0.5)
  ] : [];
  const lavaPools = finalStage ? [
    lavaPool(410, 492, 88),
    lavaPool(860, 492, 115),
    lavaPool(1040, 492, 105),
    lavaPool(4050, 492, 640)
  ] : [];
  const rotatingFires = finalStage ? [
    rotatingFire(740, 364, 66, 1.25),
    rotatingFire(1460, 266, 62, -1.4),
    rotatingFire(1880, 258, 58, 1.55),
    rotatingFire(2320, 248, 66, -1.25),
    rotatingFire(2920, 244, 70, 1.35),
    rotatingFire(3300, 260, 58, -1.55)
  ] : [];

  return clearStuckThings(Gimmick.finalize({
    theme: STAGE_THEMES[worldIndex],
    worldIndex,
    areaIndex,
    trait,
    bossStage,
    finalStage,
    difficulty,
    climbStage: !!climb,
    climbMeta: climb?.meta ?? null,
    chunky: !!chunk,
    platforms,
    blocks,
    level: {
      enemies, coins: chunk ? chunk.coins : coins, starItems: chunkStuff ? chunkStuff.stars : starItems,
      oxygenItems, seaGates, lavaGeysers, lavaPools, rotatingFires, spikes: chunk ? chunk.spikes : [],
      lowBars: chunk ? chunk.lowBars : [], rails: chunk ? chunk.rails : [], crawlSpots: chunk ? chunk.crawlSpots : [],
      doorSpots: chunk ? chunk.doorSpots : [], flag: chunk ? rect(3760, 252, 28, 240) : rect(5060, 252, 28, 240)
    },
    gun: { x: Math.min(520, 330 + areaIndex * 70), y: 430 }
  }));
}

// 足場とかさなったコイン・敵はとりのぞく（あとから足した空のルートとぶつかったとき）
function clearStuckThings(course) {
  const solid = pt => course.platforms.some(p => pt.x > p.x + 2 && pt.x < p.x + p.w - 2 && pt.y > p.y + 2 && pt.y < p.y + p.h - 2);
  const lv = course.level;
  lv.coins = lv.coins.filter(c => !solid(c));
  lv.enemies = lv.enemies.filter(e => e.boss || !solid({ x: e.x + e.w / 2, y: e.y + e.h / 2 }));
  return course;
}

function icePlatform(x, y, w, h = 48, ramp = null) {
  return { ...rect(x, y, w, h), iceRamp: ramp };
}

function buildVariedCoursePlatforms(worldIndex, areaIndex, difficulty, bossStage, finalStage) {
  const lift = worldIndex % 2 ? 16 : 0;
  const variant = bossStage ? 4 : areaIndex % 4;
  if (variant === 0) {
    return [
      rect(0, 492, 760, 48),
      rect(900, 456 - lift, 300, 48),
      rect(1320, 420 - lift, 260, 48),
      rect(1710, 384 - lift, 300, 48),
      rect(2140, 348 - lift, 260, 48),
      rect(2540, 420, 340, 48),
      rect(3060, 492, 420, 48),
      rect(3660, 436, 300, 48),
      rect(4140, 388, 260, 48),
      rect(4600, 492, 600, 48),
      rect(1040, 294, 180, 36),
      rect(2920, 300, 210, 36),
      rect(3940, 264, 180, 36)
    ];
  }
  if (variant === 1) {
    return [
      rect(0, 492, 700, 48),
      rect(840, 438, 260, 48),
      rect(1210, 370, 230, 48),
      rect(1540, 296, 230, 48),
      rect(1940, 250, 300, 48),
      rect(2380, 326, 260, 48),
      rect(2760, 402, 300, 48),
      rect(3180, 492, 360, 48),
      rect(3720, 396, 260, 48),
      rect(4140, 310, 260, 48),
      rect(4560, 492, 640, 48),
      rect(2060, 420, 170, 34),
      rect(3420, 304, 170, 34)
    ];
  }
  if (variant === 2) {
    return [
      rect(0, 492, 760, 48),
      rect(940, 492, 280, 48),
      rect(1380, 492, 220, 48),
      rect(1770, 456, 300, 48),
      rect(2220, 420, 260, 48),
      rect(2640, 456, 240, 48),
      rect(3060, 492, 300, 48),
      rect(3540, 492, 240, 48),
      rect(3960, 448, 300, 48),
      rect(4460, 492, 740, 48),
      rect(1120, 332, 180, 36),
      rect(2500, 292, 190, 36),
      rect(3820, 318, 190, 36)
    ];
  }
  if (variant === 3) {
    return [
      rect(0, 492, 680, 48),
      rect(860, 430, 220, 48),
      rect(1240, 492, 260, 48),
      rect(1680, 384, 220, 48),
      rect(2100, 492, 300, 48),
      rect(2580, 338, 220, 48),
      rect(2960, 420, 240, 48),
      rect(3380, 492, 300, 48),
      rect(3880, 370, 240, 48),
      rect(4320, 492, 880, 48),
      rect(980, 286, 160, 34),
      rect(1840, 260, 160, 34),
      rect(3140, 292, 180, 34)
    ];
  }
  return [
    rect(0, 492, 820, 48),
    rect(980, 452, 260, 48),
    rect(1420, 408, 260, 48),
    rect(1840, 492, 360, 48),
    rect(2380, 370, 300, 48),
    rect(2860, 492, 420, 48),
    rect(3460, 430, 300, 48),
    rect(3940, 492, 1260, 48),
    rect(1220, 306, 170, 34),
    rect(2260, 292, 190, 34),
    rect(3360, 304, 190, 34)
  ];
}

function buildFinalBossCoursePlatforms() {
  return [
    rect(0, 492, 360, 48),
    rect(500, 430, 260, 48),
    rect(920, 492, 120, 48),
    rect(1160, 430, 280, 48),
    rect(1580, 360, 260, 48),
    rect(2000, 300, 260, 48),
    rect(2440, 360, 280, 48),
    rect(2880, 420, 240, 48),
    rect(3300, 360, 500, 48),
    rect(3920, 492, 150, 48),
    rect(4690, 492, 510, 48),
    rect(640, 292, 190, 36),
    rect(1320, 218, 170, 36),
    rect(1740, 210, 170, 36),
    rect(2200, 200, 170, 36),
    rect(2780, 204, 190, 36),
    rect(3180, 226, 170, 36),
    rect(4200, 350, 340, 34)
  ];
}

function buildIceCoursePlatforms(difficulty, areaIndex, bossStage) {
  const shift = (difficulty % 3) * 18;
  const platforms = [
    icePlatform(0, 492, 650),
    icePlatform(790, 492, 300),
    icePlatform(1230, 468, 170, 48, "down"),
    icePlatform(1400, 444, 170, 48, "down"),
    icePlatform(1570, 420, 230, 48, "down"),
    icePlatform(1940, 492, 310),
    icePlatform(2380, 492, 260),
    icePlatform(2780, 468, 160, 48, "up"),
    icePlatform(2940, 444, 160, 48, "up"),
    icePlatform(3100, 420, 230, 48, "up"),
    icePlatform(3500, 492, 300),
    icePlatform(3940, 492, bossStage ? 1260 : 360)
  ];
  if (areaIndex % 2 === 1 && !bossStage) {
    platforms.splice(5, 0,
      icePlatform(2120, 430, 130, 48, "down"),
      icePlatform(2250, 386, 130, 48, "down")
    );
  }
  if (areaIndex % 3 === 2) {
    platforms.push(
      icePlatform(820, 260, 150, 32),
      icePlatform(3020, 250, 160, 32)
    );
  }
  if (!bossStage) {
    platforms.push(
      icePlatform(4320, 468, 170, 48, "down"),
      icePlatform(4490, 444, 170, 48, "down"),
      icePlatform(4660, 420, 180, 48, "down"),
      icePlatform(4920, 492, 280)
    );
  }
  platforms.push(
    icePlatform(640 + shift, 344, 170, 32),
    icePlatform(1120 - shift, 304, 150, 32),
    icePlatform(1840 + shift, 318, 180, 32),
    icePlatform(2260, 270, 170, 32),
    icePlatform(3340 - shift, 316, 190, 32),
    icePlatform(3820, 286, 170, 32)
  );
  return platforms;
}

function beltPlatform(x, y, w, h = 48, conveyor = 0) {
  return { ...rect(x, y, w, h), conveyor };
}

function movingPlatform(x, y, w, h = 42, axis = "x", range = 180, speed = 1, phase = 0) {
  return { ...rect(x, y, w, h), mover: { baseX: x, baseY: y, axis, range, speed, phase } };
}

function buildFactoryCoursePlatforms(difficulty, areaIndex, bossStage) {
  const phase = (difficulty % 4) * 0.7;
  const longBelt = areaIndex % 2 === 0 ? -260 : -190;
  const platforms = [
    beltPlatform(0, 492, 720, 48, 0),
    beltPlatform(840, 492, 360, 48, longBelt),
    movingPlatform(1320, 448, 220, 42, "x", 210, 1.15, phase),
    beltPlatform(1700, 492, 420, 48, -230),
    movingPlatform(2260, 388, 210, 42, "y", 84, 1.35, phase + 1.4),
    beltPlatform(2600, 492, 390, 48, 210),
    movingPlatform(3180, 438, 240, 42, "x", 250, 1.05, phase + 2.2),
    beltPlatform(3680, 492, 420, 48, areaIndex % 3 === 1 ? 240 : -245),
    beltPlatform(4300, 492, bossStage ? 900 : 360, 48, bossStage ? 0 : -210)
  ];
  if (areaIndex % 3 === 2 && !bossStage) {
    platforms.splice(4, 0, movingPlatform(2140, 300, 190, 42, "x", 250, 1.45, phase + 0.9));
  }
  if (!bossStage) {
    platforms.push(
      movingPlatform(4680, 430, 220, 42, "x", 190, 1.25, phase + 3.1),
      beltPlatform(5000, 492, 260, 48, 0)
    );
  }
  platforms.push(
    movingPlatform(760, 334, 170, 36, "x", 120, 1.2, phase + 0.5),
    beltPlatform(1540, 308, 210, 36, 160),
    movingPlatform(2500, 292, 170, 36, "y", 72, 1.25, phase + 1.8),
    beltPlatform(3500, 324, 230, 36, -170)
  );
  return platforms;
}

// ---------- いろいろな通路（区間をつないでステージを作る） ----------
// ステージ・エリアごとに、区間の順番も大きさもちがう。どのステージも別の通路になる。
// ジャンプ：高さ約220、助走なしで横に約220とべる。区間はこの中でおさまるように作る
function seededRandom(seed) {
  let a = (Math.imul(seed + 1, 2654435761) >>> 0) || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CRAWL_GAP = 42; // ほふく前進のすき間（ふせると30、立つと54）
const CHUNK_KINDS = ["pits", "stairs", "spikeField", "pillars", "tunnel", "islands", "valley", "tower", "mover", "shelf", "flat", "cliff"];
const HIGH_Y = 240; // 地面のいちばん高いところ

function buildChunkCourse({ seed, difficulty, trait, endX = 4860, worldEnd = WORLD_WIDTH, kinds = CHUNK_KINDS }) {
  const rnd = seededRandom(seed);
  const pick = arr => arr[Math.floor(rnd() * arr.length)];
  const between = (a, b) => a + rnd() * (b - a);
  const k = clamp(difficulty / 34, 0, 1);
  const ice = trait === "iceSlide";
  const factory = trait === "factoryBelt";
  const BOTTOM = canvas.height;
  const out = { platforms: [], blocks: [], coins: [], enemySpots: [], rewardSpots: [], spikes: [], pitXs: [], keySpots: [], doorSpots: [], lowBars: [], rails: [], crawlSpots: [] };
  const P = out.platforms;
  let coinNo = 0;
  const addCoin = (x, y) => out.coins.push(coin(x, y, coinNo++ % 2 ? "pea" : "kaki"));
  // 地面（下までつまった土）。工場では一部がベルトコンベアになる
  const ground = (x, y, w) => {
    if (factory && w >= 260 && rnd() < 0.4) {
      P.push(beltPlatform(x, y, w, 48, (rnd() < 0.5 ? -1 : 1) * Math.round(between(150, 220))));
      P.push({ ...rect(x, y + 48, w, BOTTOM - y - 48), terrain: true, under: true });
    } else {
      P.push({ ...rect(x, y, w, BOTTOM - y), terrain: true });
    }
  };
  const ledge = (x, y, w, h = 30) => { P.push(rect(x, y, w, h)); };
  const spot = (x, y, left, right) => { if (right - left >= 120) out.enemySpots.push({ x, y, left, right }); };
  let blockNo = 0;
  const addBlock = (x, y) => { if (y > 70) out.blocks.push(breakable(x - 24, y, blockNo++ % 3 === 0 ? "hp" : "power")); };

  let x = 620;
  let gy = GROUND_Y;
  ground(0, GROUND_Y, 620);

  const C = {
    // すきまをとびこえる
    pits() {
      const n = 2 + (rnd() < 0.5 ? 1 : 0);
      for (let i = 0; i < n; i++) {
        const gap = between(110, 150 + k * 40) - (ice ? 10 : 0);
        const w = between(170, 250) + (ice ? 30 : 0);
        const ny = clamp(gy + pick([-90, -50, 0, 50, 90]), HIGH_Y + 20, GROUND_Y);
        out.pitXs.push(x + gap / 2);
        addCoin(x + gap / 2, Math.min(gy, ny) - 100);
        x += gap;
        ground(x, ny, w);
        spot(x + w / 2, ny, x + 10, x + w - 10);
        gy = ny;
        x += w;
      }
    },
    // 階段（上りか下り）
    stairs() {
      const up = gy - 3 * 84 >= HIGH_Y && (gy > 400 || rnd() < 0.5);
      const n = up ? 3 + (gy - 4 * 84 >= HIGH_Y && rnd() < 0.5 ? 1 : 0) : Math.max(1, Math.min(4, Math.floor((GROUND_Y - gy) / 64)));
      if (!up && n < 1) return C.flat();
      for (let i = 0; i < n; i++) {
        const w = between(150, 210);
        gy += up ? -between(64, 84) : between(60, 80);
        gy = clamp(gy, HIGH_Y, GROUND_Y);
        ground(x, gy, w);
        addCoin(x + w / 2, gy - 60);
        x += w;
      }
      spot(x - 90, gy, x - 180, x - 10);
    },
    // トゲの床と、上の小さな足場
    spikeField() {
      const len = between(620, 760);
      ground(x, gy, len);
      const w = between(300, 380 + k * 60);
      const sx = x + (len - w) / 2;
      out.spikes.push({ x: sx, y: gy - 22, w, h: 22 });
      const pw = ice ? 140 : 110;
      const count = Math.max(2, Math.ceil((w + 60) / 170));
      for (let j = 0; j < count; j++) {
        const px = sx + (w / count) * (j + 0.5) - pw / 2;
        ledge(px, gy - 95 - (j % 2) * 20, pw, 24);
        addCoin(px + pw / 2, gy - 140 - (j % 2) * 20);
      }
      out.keySpots.push({ x: sx + w / 2, y: gy - 210 });
      if (sx - x > 160) spot(x + (sx - x) / 2, gy, x + 10, sx - 20);
      x += len;
    },
    // 柱をとびこえる
    pillars() {
      const len = between(700, 860);
      ground(x, gy, len);
      const n = 2 + (rnd() < 0.5 ? 1 : 0);
      const step = len / (n + 1);
      let prev = x;
      for (let i = 0; i < n; i++) {
        const px = x + step * (i + 1) - 35;
        const h = between(90, 150 + k * 20);
        P.push({ ...rect(px, gy - h, 70, BOTTOM - gy + h), terrain: true });
        addCoin(px + 35, gy - h - 50);
        spot((prev + px) / 2, gy, prev + 10, px - 10);
        if (i === 0) addBlock((prev + px) / 2, gy - 160);
        prev = px + 70;
      }
      out.rewardSpots.push({ x: x + step - 0, y: gy - 260 });
      x += len;
    },
    // 天井の低いトンネル（屋根の上にものれる）
    tunnel() {
      const len = between(640, 800);
      ground(x, gy, len);
      const sx = x + 150;
      const sw = len - 300;
      ledge(x + 40, gy - 100, 80, 26);
      P.push(rect(sx, gy - 200, sw, 60));
      for (let c = 0; c < 4; c++) addCoin(sx + 40 + c * ((sw - 80) / 3), gy - 40);
      for (let c = 0; c < 3; c++) addCoin(sx + sw / 2 - 60 + c * 60, gy - 250);
      spot(sx + sw * 0.3, gy, sx, sx + sw);
      spot(sx + sw * 0.75, gy, sx, sx + sw);
      out.rewardSpots.push({ x: sx + sw / 2, y: gy - 270 });
      x += len;
    },
    // 空にうかぶ島をわたる
    islands() {
      const n = 3 + (rnd() < 0.4 ? 1 : 0);
      for (let i = 0; i < n; i++) {
        const gap = between(110, 160);
        const w = between(140, 200) + (ice ? 30 : 0);
        const ny = clamp(gy + pick([-90, -50, 0, 50, 90]), HIGH_Y + 20, 470);
        out.pitXs.push(x + gap / 2);
        x += gap;
        P.push(rect(x, ny, w, 40));
        addCoin(x + w / 2, ny - 50);
        if (i === 1) addBlock(x + w / 2, ny - 170);
        if (i === n - 1) out.rewardSpots.push({ x: x + w / 2, y: ny - 70 });
        gy = ny;
        x += w;
      }
      const gap = between(110, 150);
      const ny = clamp(gy + pick([0, 40, 60]), 340, GROUND_Y);
      out.pitXs.push(x + gap / 2);
      x += gap;
      ground(x, ny, 240);
      gy = ny;
      x += 240;
    },
    // 谷におりて、また上がる
    valley() {
      const floorY = 640;
      const len = between(520, 640);
      ground(x, floorY, len);
      const sx = x + len / 2 - 55;
      out.spikes.push({ x: sx, y: floorY - 22, w: 110, h: 22 });
      addCoin(sx + 55, floorY - 110);
      spot(x + 90, floorY, x + 10, sx - 20);
      spot(x + len - 90, floorY, sx + 130, x + len - 10);
      out.rewardSpots.push({ x: x + 70, y: floorY - 60 });
      addBlock(x + len - 120, floorY - 160);
      x += len;
      const target = clamp(gy, 400, GROUND_Y);
      const rise = floorY - target;
      const n = Math.max(2, Math.ceil(rise / 84));
      for (let j = 1; j <= n; j++) {
        ground(x, floorY - (rise * j) / n, 130);
        x += 130;
      }
      gy = target;
    },
    // 高い塔に、手前の足場からのぼってこえる
    tower() {
      if (gy < 330) return C.stairs();
      const len = 660;
      ground(x, gy, len);
      ledge(x + 50, gy - 110, 120, 26);
      const top = gy - 250;
      P.push({ ...rect(x + 210, top, 220, BOTTOM - top), terrain: true });
      for (let c = 0; c < 3; c++) addCoin(x + 250 + c * 70, top - 50);
      out.rewardSpots.push({ x: x + 320, y: top - 70 });
      spot(x + 550, gy, x + 450, x + len - 10);
      out.doorSpots.push({ x: x + 470, y: gy });
      x += len;
    },
    // 動く足場で穴をわたる
    mover() {
      const pitW = between(420, 520);
      const w = 170;
      const range = (pitW - w) / 2 - 30;
      P.push(movingPlatform(x + pitW / 2 - w / 2, gy - 10, w, 36, "x", range, between(0.9, 1.3), rnd() * 6));
      out.pitXs.push(x + 60, x + pitW - 60);
      addCoin(x + pitW / 2, gy - 120);
      x += pitW;
      ground(x, gy, 260);
      spot(x + 150, gy, x + 20, x + 250);
      out.doorSpots.push({ x: x + 60, y: gy });
      x += 260;
    },
    // トゲの上の高い棚（上を通るしかない）
    shelf() {
      const len = between(720, 840);
      ground(x, gy, len);
      const w = between(330, 390);
      const sx = x + (len - w) / 2;
      ledge(sx, gy - 140, w, 30);
      out.spikes.push({ x: sx + 40, y: gy - 22, w: w - 80, h: 22 });
      for (let c = 0; c < 4; c++) addCoin(sx + 50 + c * ((w - 100) / 3), gy - 190);
      out.rewardSpots.push({ x: sx + w / 2, y: gy - 210 });
      spot(sx + w / 2, gy - 140, sx + 10, sx + w - 10);
      x += len;
    },
    // がけ：足場を2つのぼって、高い台地へ
    cliff() {
      if (gy < HIGH_Y + 240) return C.stairs();
      ground(x, gy, 380);
      ledge(x + 60, gy - 110, 110, 26);
      ledge(x + 210, gy - 205, 110, 26);
      addCoin(x + 115, gy - 155);
      addCoin(x + 265, gy - 250);
      const ny = gy - 240;
      x += 380;
      const len = between(420, 620);
      ground(x, ny, len);
      for (let c = 0; c < 3; c++) addCoin(x + 80 + c * 70, ny - 50);
      spot(x + len * 0.6, ny, x + 20, x + len - 20);
      out.rewardSpots.push({ x: x + len - 80, y: ny - 70 });
      out.doorSpots.push({ x: x + 40, y: ny });
      gy = ny;
      x += len;
    },
    // トロッコ（メカのワールド）：レールの上を走る。頭の上のはりは、しゃがんでくぐる
    cart() {
      ground(x, gy, 220);
      const L = Math.round(between(1300, 1600));
      const startX = x + 220;
      const cw = 170;
      P.push({ ...rect(startX, gy, cw, 26), cart: { startX, endX: startX + L - cw, speed: 280, state: "idle" } });
      out.rails.push({ x0: startX, x1: startX + L, y: gy + 26 });
      for (let bx = startX + 420; bx < startX + L - 260; bx += between(320, 420)) {
        out.lowBars.push({ x: bx, y: gy - 150, w: 44, h: 150 - 36 });
        addCoin(bx + 22, gy - 16);
      }
      out.pitXs.push(startX + L / 2);
      x = startX + L;
      ground(x, gy, 320);
      out.enemySpots.push({ x: x + 220, y: gy, left: x + 120, right: x + 310, armed: true });
      x += 320;
    },
    // ほふく前進でしか通れない、低いすき間（上は高いかべなので、とびこえられない）
    crawlway() {
      const len = Math.round(between(360, 520));
      ground(x, gy, len + 160);
      const sx = x + 80;
      P.push(rect(sx, gy - CRAWL_GAP - 1400, len, 1400));
      for (let c = 0; c < Math.floor(len / 80); c++) addCoin(sx + 40 + c * 80, gy - 16);
      out.crawlSpots.push({ x: sx, y: gy, w: len });
      x += len + 160;
    },
    // ひと息つける平地（アイテムブロック）
    flat() {
      const len = between(480, 600);
      ground(x, gy, len);
      addBlock(x + len * 0.35, gy - 150);
      addBlock(x + len * 0.35 + 60, gy - 150);
      out.doorSpots.push({ x: x + 40, y: gy });
      spot(x + len * 0.7, gy, x + 20, x + len - 20);
      x += len;
    }
  };

  // 区間の順番：その場所だけのならび（同じ種類が続かない）
  const order = kinds.slice();
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const custom = kinds !== CHUNK_KINDS; // ステージごとに地形をしぼった道
  if (factory && !order.includes("mover")) order.splice(Math.floor(rnd() * order.length), 0, "mover");
  // ほふく前進でくぐる場所：全部まぜる道ではひとつ（はじめのほうに置く）。しぼった道では、えらんだときだけ
  if (!custom) order.splice(Math.floor(rnd() * 2), 0, "crawlway");
  // トロッコは長いので、えらんだときはいちばんはじめに
  if (custom && order.includes("cart")) { order.splice(order.indexOf("cart"), 1); order.unshift("cart"); }
  // メカのワールドは、はじめのほうにトロッコ
  if (factory && kinds === CHUNK_KINDS) order.splice(Math.floor(rnd() * 2), 0, "cart");
  // 旗の前に、地面へもどる階段と平地が入るように、区間はここまでにおさめる（はみ出したらやり直し）
  const limit = endX - 360;
  const lists = ["platforms", "blocks", "coins", "enemySpots", "rewardSpots", "spikes", "pitXs", "keySpots", "doorSpots", "lowBars", "rails", "crawlSpots"];
  let n = 0;
  let misses = 0;
  while (x < limit - 380 && misses < order.length) {
    const save = { x, gy, coinNo, blockNo, lens: lists.map(name => out[name].length) };
    C[order[n % order.length]]();
    n += 1;
    if (x > limit) {
      lists.forEach((name, i) => { out[name].length = save.lens[i]; });
      ({ x, gy, coinNo, blockNo } = save);
      misses += 1;
    } else {
      misses = 0;
    }
  }
  // 最後は旗のある地面（高さ GROUND_Y）にもどる
  while (gy < GROUND_Y - 4) {
    gy = Math.min(GROUND_Y, gy + 70);
    ground(x, gy, 100);
    x += 100;
  }
  ground(x, GROUND_Y, Math.max(300, worldEnd - x));
  out.endX = x;
  return out;
}

// 区間のデータを、コースの中身（敵・★・アイテム）にする
function chunkCourseContent(c, worldIndex, difficulty, enemyCount) {
  const enemies = [];
  const spots = c.enemySpots.slice().sort((a, b) => a.x - b.x);
  const take = Math.min(enemyCount, spots.length);
  for (let i = 0; i < take; i++) {
    const s = spots[Math.floor((i * spots.length) / take)];
    const power = Math.min(MAX_WEAPON_POWER, Math.max(2, Math.floor((difficulty + i) / 3)));
    const ex = clamp(s.x - 21, s.left, s.right - 42);
    const foe = s.armed || (i + difficulty) % 3 === 0 ? armedEnemy(ex, s.y - 42, s.left, s.right, power) : enemy(ex, s.y - 42, s.left, s.right);
    foe.enemyKind = worldIndex;
    enemies.push(foe);
  }
  // ★の場所：ごほうびの場所から3つ。たりないときは、敵の立つ地面の上（かべの中に入らない）
  const rewards = c.rewardSpots.slice();
  for (const s of c.enemySpots.slice().sort((a, b) => a.x - b.x)) {
    if (rewards.length >= 3) break;
    rewards.push({ x: (s.left + s.right) / 2, y: s.y - 80 });
  }
  rewards.sort((a, b) => a.x - b.x);
  const stars = [];
  for (let i = 0; i < 3; i++) {
    const r = rewards[Math.floor(((i + 0.5) * rewards.length) / 3)];
    stars.push(r ? starItem(r.x, r.y) : starItem(400 + i * 60, GROUND_Y - 80));
  }
  return { enemies, stars };
}

// ---------- まん中のエリア：ほら穴（天井のある、長い通路） ----------
function makeCaveArea(base, worldIndex, areaIndex, difficulty, seed) {
  const caveEnd = 3600;
  const c = buildChunkCourse({ seed, difficulty, trait: base.trait, endX: caveEnd - 300, worldEnd: caveEnd,
    kinds: ["pits", "stairs", "spikeField", "pillars", "tunnel", "valley", "shelf", "flat", "spikeField"] });
  const P = c.platforms;
  // 天井の高さは、ふつうの地形から決める（ほふく前進のかべのような、高い岩はのぞく）
  const ceilY = Math.min(...P.filter(p => p.h < 1000).map(p => p.y)) - 170;
  P.push(rect(-80, ceilY - 400, caveEnd + 160, 400));
  P.push(rect(-80, ceilY - 400, 80, canvas.height - ceilY + 448));
  P.push(rect(caveEnd, ceilY - 400, 2800, canvas.height - ceilY + 448));
  // 天井からさがる岩（下に通れる高さを残す）
  const rnd = seededRandom(seed + 77);
  for (let x = 700; x < caveEnd - 500; x += 380 + rnd() * 260) {
    let floor = Infinity;
    // 岩の左右少し先までの、いちばん高い床を見る（となりの足場へジャンプでのぼる高さを残す）
    for (const p of P) if (p.y > ceilY && x + 120 + 170 > p.x && x - 170 < p.x + p.w) floor = Math.min(floor, p.y);
    const h = floor - 190 - ceilY;
    // ★・カギ・コインのある場所にはさげない
    const busy = c.rewardSpots.concat(c.keySpots, c.coins).some(r => r.x > x - 60 && r.x < x + 180);
    if (floor < Infinity && h > 40 && !busy) P.push(rect(x, ceilY, 120, h));
  }
  const { enemies } = chunkCourseContent(c, worldIndex, difficulty, Math.min(10, 4 + Math.floor(difficulty / 2)));
  const surfaceAt = x => Math.min(...P.filter(p => p.y > ceilY && p.h < 1000 && x > p.x && x < p.x + p.w).map(p => p.y));
  const underCrawl = x => c.crawlSpots.some(s => x > s.x - 60 && x < s.x + s.w + 60);
  const openX = from => { let x = from; while (underCrawl(x) && x < caveEnd - 300) x += 120; return x; };
  const kx = openX(1600);
  const key = c.keySpots[Math.floor(c.keySpots.length / 2)] ?? c.rewardSpots[0] ?? { x: kx, y: surfaceAt(kx) - 110 };
  const fx = openX(caveEnd - 700);
  const star = c.rewardSpots.find(r => Math.abs(r.x - key.x) > 300) ?? c.rewardSpots.find(r => r !== key) ?? { x: fx, y: surfaceAt(fx) - 70 };
  const doorX = caveEnd - 200;
  const area = {
    ...base, climbStage: false, climbMeta: null, puzzle: null, isMaze: true, indoor: true,
    top: ceilY - 200, ceilingY: ceilY, bottom: canvas.height, platforms: P, blocks: c.blocks, gun: { x: 300, y: 430 }
  };
  area.level = {
    enemies, coins: c.coins, starItems: [starItem(star.x, star.y)],
    oxygenItems: [], seaGates: [], lavaGeysers: [], lavaPools: [], rotatingFires: [],
    keys: [key], springs: [], chests: [], spikes: c.spikes, crawlSpots: c.crawlSpots,
    flag: rect(doorX + 10, GROUND_Y - 240, 28, 240), doors: []
  };
  return area;
}

// ---------- まん中のエリア：たて穴（左右の足場をジグザグにのぼる塔） ----------
function makeShaftArea(base, worldIndex, areaIndex, difficulty, seed, down = false) {
  const rnd = seededRandom(seed);
  const between = (a, b) => a + rnd() * (b - a);
  const ice = base.trait === "iceSlide";
  const W = 1240;
  const RISE = 140;
  const COLS = [120, 490, 860]; // 足場の左はし（幅 260、すき間 110）
  let L = 9 + Math.min(4, Math.floor(difficulty / 8));
  if (L % 4 === 1 || L % 4 === 3) L += 1; // 最後の足場は左か右のはし
  const platforms = [];
  const spikes = [];
  const coins = [];
  const enemies = [];
  const blocks = [];
  // 一番下の床（まん中にトゲ）
  platforms.push({ ...rect(0, GROUND_Y, W, canvas.height - GROUND_Y), terrain: true });
  spikes.push({ x: 470, y: GROUND_Y - 22, w: 300, h: 22 });
  const pattern = [0, 1, 2, 1];
  let keySpot = null;
  const sideLevel = 3 + Math.floor(rnd() * Math.max(1, L - 5));
  for (let i = 1; i <= L; i++) {
    const y = GROUND_Y - RISE * i;
    const col = pattern[i % 4];
    const jitter = Math.round(between(-20, 20));
    const w = ice ? 260 : Math.round(between(220, 260));
    const lx = clamp(COLS[col] + jitter, COLS[col] - 10, COLS[col] + 260 - w + 10);
    if (i % 5 === 3) {
      platforms.push(movingPlatform(lx, y, w - 40, 32, "x", 50, between(0.8, 1.2), rnd() * 6));
    } else {
      platforms.push(rect(lx, y, w, 30));
      if (i % 3 === 0 && w >= 230) {
        const foe = enemy(lx + w / 2 - 21, y - 42, lx + 6, lx + w - 6);
        foe.enemyKind = worldIndex;
        enemies.push(foe);
      }
    }
    coins.push(coin(lx + w / 2, y - 50, i % 2 ? "pea" : "kaki"));
    // 寄り道の足場（ルートではない列）にカギ
    // まん中の列の段のときだけ。寄り道は、ひとつ下の段と同じ列（上の段とぶつからない）
    if (!keySpot && i >= sideLevel && col === 1 && i < L - 1) {
      const sideCol = pattern[(i - 1) % 4];
      const sx = COLS[sideCol] + 40;
      platforms.push(rect(sx, y - 40, 180, 26));
      keySpot = { x: sx + 90, y: y - 110 };
      spikes.push({ x: sx + 10, y: y - 40 - 22, w: 40, h: 22 });
    }
    if (i === Math.floor(L / 2)) blocks.push(breakable(lx + w / 2 - 24, y - 190, "hp"));
  }
  const lastCol = pattern[L % 4];
  const topY = GROUND_Y - RISE * (L + 1);
  // 一番上の床：最後の足場の真上はあけておく（下から入れるように）
  const topFloor = lastCol === 0 ? rect(COLS[1], topY, W - COLS[1], 40) : rect(0, topY, COLS[2] + 260 - 380, 40);
  platforms.push(topFloor);
  const ceilY = topY - 260;
  platforms.push(rect(-80, ceilY - 400, W + 160, 400));
  platforms.push(rect(-80, ceilY - 400, 80, canvas.height - ceilY + 448));
  platforms.push(rect(W, ceilY - 400, 2800, canvas.height - ceilY + 448));
  const doorX = lastCol === 0 ? W - 170 : 60;
  const area = {
    ...base, climbStage: false, climbMeta: null, puzzle: null, isMaze: true, indoor: true,
    top: ceilY - 200, ceilingY: ceilY, bottom: canvas.height, platforms, blocks, gun: { x: 300, y: 430 }
  };
  if (down) {
    // 下りのたて穴：いちばん上から入って、足場をつたって下までおりる。出口は下の床のはし
    area.spawn = { x: lastCol === 0 ? W - 200 : 140, y: topY };
    area.level = {
      enemies, coins,
      starItems: [starItem(lastCol === 0 ? 200 : W - 200, GROUND_Y - 70)],
      oxygenItems: [], seaGates: [], lavaGeysers: [], lavaPools: [], rotatingFires: [],
      keys: [], springs: [], chests: [], spikes,
      flag: rect(lastCol === 0 ? 70 : W - 160, GROUND_Y - 240, 28, 240), doors: []
    };
    return area;
  }
  area.level = {
    enemies, coins,
    starItems: [starItem(lastCol === 0 ? topFloor.x + 200 : topFloor.x + topFloor.w - 200, topY - 70)],
    oxygenItems: [], seaGates: [], lavaGeysers: [], lavaPools: [], rotatingFires: [],
    keys: [keySpot ?? { x: 620, y: GROUND_Y - RISE * 4 }], springs: [], chests: [], spikes,
    flag: rect(doorX + 10, topY - 240, 28, 240), doors: []
  };
  return area;
}

function placeEnemiesOnPlatforms(enemies, platforms) {
  const ground = platforms.filter(p => p.w >= 150 && (p.y >= 380 || p.terrain));
  for (const e of enemies) {
    const center = e.x + e.w / 2;
    const match = ground.find(p => center >= p.x + 24 && center <= p.x + p.w - 24) ??
      ground.reduce((best, p) => Math.abs((p.x + p.w / 2) - center) < Math.abs((best.x + best.w / 2) - center) ? p : best, ground[0]);
    if (!match) continue;
    e.x = clamp(center - e.w / 2, match.x + 12, match.x + match.w - e.w - 12);
    e.y = match.y - e.h;
    e.left = Math.max(match.x + 4, e.x - 160);
    e.right = Math.min(match.x + match.w - 4, e.x + 220);
  }
}

const courses = Array.from({ length: TOTAL_COURSES }, (_, index) => {
  const { worldIndex, areaIndex } = courseIndexToWorldArea(index);
  return makeCourse(worldIndex, areaIndex);
});

courses[0] = {
  ...courses[0],
  theme: STAGE_THEMES[0],
  platforms: [
    rect(0, 492, 980, 48),
    rect(1120, 492, 980, 48),
    rect(2240, 492, 840, 48),
    rect(3240, 492, 1960, 48),
    rect(520, 376, 220, 36),
    rect(1280, 350, 180, 36),
    rect(1680, 278, 210, 36),
    rect(2450, 376, 220, 36),
    rect(2860, 304, 170, 36),
    rect(3520, 372, 240, 36),
    rect(3970, 300, 190, 36),
    rect(4420, 380, 260, 36)
  ],
  blocks: [
    rect(760, 396, 48, 96),
    rect(1980, 396, 48, 96),
    rect(2150, 348, 48, 144),
    rect(3150, 396, 48, 96),
    rect(4620, 348, 48, 144)
  ],
  level: {
    enemies: [
      enemy(700, 444, 590, 910),
      enemy(1450, 444, 1260, 1780),
      enemy(2650, 444, 2380, 3000),
      enemy(3700, 444, 3300, 3900),
      enemy(4300, 444, 4020, 4580)
    ],
    coins: [
      coin(580, 326, "kaki"), coin(660, 326, "pea"), coin(1330, 300, "kaki"), coin(1734, 228, "pea"),
      coin(2510, 326, "kaki"), coin(2920, 254, "pea"), coin(3590, 322, "kaki"), coin(4050, 250, "pea"),
      coin(4480, 330, "kaki"), coin(4550, 330, "pea"), coin(4810, 430, "kaki")
    ],
    starItems: [
      starItem(930, 430),
      starItem(2240, 430),
      starItem(3370, 322)
    ],
    flag: rect(5000, 252, 28, 240)
  },
  gun: { x: 1030, y: 430 }
};
Gimmick.finalize(courses[0]);

for (let i = 1; i < stageAreaCount(0); i++) {
  courses[i] = {
    ...makeCourse(0, i),
    theme: STAGE_THEMES[0],
    gun: { x: 760 + i * 60, y: 430 }
  };
}

// ---------- エリアを扉でつないだステージ（まずはワールド1のふつうのステージ） ----------
// 1つのステージ = 3つのエリア。エリアのおわりの扉に入ると次のエリアへ。最後のエリアの旗でクリア。
// まん中のエリアの出口はカギつき（カギはそのエリアの空のルートにある）。最初のエリアには寄り道の小部屋がある
const DOOR_W = 70;
const DOOR_H = 110;

function groundUnder(course, x) {
  let top = null;
  for (const p of course.platforms) {
    if (p.mover || p.conveyor || x < p.x + 20 || x > p.x + p.w - 20) continue;
    if (p.y < 300) continue;
    if (top === null || p.y < top.y) top = p;
  }
  return top;
}

function makeBonusRoom(stageIndex, roomNo, returnTo) {
  const room = {
    ...courses[stageIndex],
    climbStage: false,
    climbMeta: null,
    puzzle: null,
    isRoom: true,
    top: 0,
    bottom: canvas.height,
    platforms: [rect(0, 492, 1400, 48), rect(-40, 0, 40, 540), rect(1400, 0, 40, 540), rect(420, 360, 200, 32), rect(820, 300, 200, 32)],
    blocks: [breakable(470, 220, "power"), breakable(560, 220, roomNo % 2 ? "power" : "hp"), breakable(870, 160, "hp")],
    gun: { x: 300, y: 430 }
  };
  const coins = [];
  for (let i = 0; i < 10; i++) coins.push(coin(200 + i * 100, 440 - (i % 3) * 40, i % 2 ? "pea" : "kaki"));
  for (let i = 0; i < 4; i++) coins.push(coin(860 + i * 40, 250, i % 2 ? "pea" : "kaki"));
  // 1-1 の小部屋は「合成の練習部屋」：決まった武器がおいてあって、ヤナビスが合成のしかたを教える
  if (stageIndex === 0) {
    room.tutorial = true;
    room.blocks = [breakable(870, 160, "hp")];
    room.fixedDrops = [{ x: 480, power: 1 }, { x: 600, power: 1 }, { x: 760, power: WEAPON_ATTRIBUTE_SIZE + 1 }];
  }
  room.level = {
    enemies: [], coins, starItems: [], oxygenItems: [], seaGates: [], lavaGeysers: [], lavaPools: [], rotatingFires: [],
    keys: [], springs: [], chests: [],
    flag: rect(-99999, 0, 1, 1),
    doors: [{ x: 120, y: 492 - DOOR_H, w: DOOR_W, h: DOOR_H, to: returnTo.area, spawnX: returnTo.x }]
  };
  return room;
}

// ---------- 入りくんだエリア（のぼったり、おりたり、はり地獄） ----------
// 何階もある建物の中を、はしの穴からのぼっていく。床にはトゲ、トゲの上には小さな足場。
// カギはトゲ地獄の上にあって、出口の扉はカギがないと開かない
const MAZE_W = 2600;
const MAZE_FLOOR_H = 240;

function makeMazeArea(base, worldIndex, areaIndex, difficulty, mazeSeed = worldIndex * 7 + areaIndex * 3) {
  const seed = mazeSeed;
  // 建物の幅・階の数・穴の広さは、ステージごとにちがう
  const mr = seededRandom(mazeSeed * 13 + 5);
  const MAZE_W = Math.round(2200 + mr() * 800);
  const floors = clamp(4 + Math.floor(difficulty / 14) + (mr() < 0.4 ? 1 : 0), 4, 6);
  const floorY = k => GROUND_Y - MAZE_FLOOR_H * k;
  const topY = floorY(floors);
  const platforms = [];
  const spikes = [];
  const coins = [];
  const enemies = [];
  const blocks = [];
  // 外のかべ・天井・一番下の床
  platforms.push(rect(-80, topY - 400, 80, GROUND_Y + 448 - topY), rect(MAZE_W, topY - 400, 2800, GROUND_Y + 448 - topY));
  platforms.push(rect(0, topY - 40, MAZE_W, 40));
  platforms.push(rect(0, GROUND_Y, MAZE_W, 48));
  const GAP = Math.round(250 + mr() * 70);
  for (let k = 1; k < floors; k++) {
    const y = floorY(k);
    // 奇数の階は右はしに穴、偶数の階は左はしに穴（ジグザグにのぼる）
    const gapRight = k % 2 === 1;
    platforms.push(gapRight ? rect(0, y, MAZE_W - GAP, 40) : rect(GAP, y, MAZE_W - GAP, 40));
    // 穴の下に、のぼるための足場
    // 足場はかべぎわに（横からとび乗って、そこから上の階へ）
    const sx = gapRight ? MAZE_W - 120 : 0;
    platforms.push(rect(sx, y + 122, 120, 26));
    // その手前に、低いふみ台（かべぎわの足場の真下にもぐって頭をぶつけずに、2段でのぼれる）
    platforms.push(rect(gapRight ? MAZE_W - 330 : 240, y + MAZE_FLOOR_H - 64, 90, 64));
  }
  let keySpot = null;
  for (let k = 0; k < floors; k++) {
    const y = floorY(k);
    const dir = k % 2 === 0 ? 1 : -1; // この階を進む向き
    const from = dir > 0 ? 360 : MAZE_W - 360;
    // トゲ：階ごとに2〜3か所。1か所は広い「はり地獄」で、上の小さな足場をわたる
    const spots = 3;
    const pitAt = (k + seed) % spots;
    for (let i = 0; i < spots; i++) {
      const cx = from + dir * (360 + i * 560 + ((seed + k * 3 + i) % 3) * 40);
      if (cx < 380 || cx > MAZE_W - 380) continue;
      if (i === pitAt && k > 0) {
        const w = 420 + Math.min(180, difficulty * 6);
        spikes.push({ x: cx - w / 2, y: y - 22, w, h: 22 });
        // 足場は近めに、たくさん（走らなくても、ひとつずつとび移れる間かく）
        const steps = Math.max(3, Math.round(w / 150));
        for (let j = 0; j < steps; j++) {
          const px = cx - w / 2 + (w / steps) * (j + 0.5) - 55;
          platforms.push(rect(px, y - 74 - (j % 2) * 14, 110, 22));
          coins.push(coin(px + 55, y - 122 - (j % 2) * 14, j % 2 ? "pea" : "kaki"));
        }
        if (!keySpot && k >= 1) keySpot = { x: cx, y: y - 150 };
      } else {
        const w = 110 + ((seed + i) % 2) * 30;
        spikes.push({ x: cx - w / 2, y: y - 22, w, h: 22 });
        coins.push(coin(cx, y - 110, (i + k) % 2 ? "pea" : "kaki"));
      }
    }
    // 敵
    const count = 1 + (difficulty > 8 ? 1 : 0);
    for (let i = 0; i < count; i++) {
      const ex = dir > 0 ? 820 + i * 900 + ((seed + k) % 4) * 60 : MAZE_W - 820 - i * 900 - ((seed + k) % 4) * 60;
      const power = Math.min(8, Math.max(2, Math.floor((difficulty + i) / 4)));
      const foe = (i + k + seed) % 3 === 0 ? armedEnemy(ex, y - 48, ex - 200, ex + 200, power) : enemy(ex, y - 48, ex - 200, ex + 200);
      foe.enemyKind = worldIndex;
      if (!spikes.some(sp => ex + 42 > sp.x - 30 && ex < sp.x + sp.w + 30 && sp.y === y - 22)) enemies.push(foe);
    }
    if (k % 2 === 1) {
      // アイテムブロックは、トゲの真上（とびこえる道のじゃま）をさけて置く
      const nearSpike = bx => spikes.some(sp => sp.y === y - 22 && bx + 48 > sp.x - 120 && bx < sp.x + sp.w + 120);
      const tries = [0, 200, -200, 400, -400, 600, -600, 800, -800].map(d => MAZE_W / 2 - 24 + (k - 2) * 90 + d)
        .filter(bx => bx > 380 && bx < MAZE_W - 430);
      const bx = tries.find(b => !nearSpike(b));
      if (bx !== undefined) blocks.push(breakable(bx, y - 150, k === 1 ? "hp" : "power"));
    }
  }
  if (!keySpot) keySpot = { x: MAZE_W / 2, y: floorY(1) - 150 };
  const topFloor = floors - 1;
  const exitRight = topFloor % 2 === 0;
  const doorX = exitRight ? MAZE_W - 170 : 100;
  const area = {
    ...base,
    climbStage: false,
    climbMeta: null,
    puzzle: null,
    isMaze: true,
    top: topY - 200,
    // 天井の下の面。三日月タクシーもここより上には行かない（屋根の上に出ると下りられなくなる）
    ceilingY: topY,
    bottom: canvas.height,
    platforms,
    blocks,
    gun: { x: 300, y: 430 }
  };
  area.level = {
    enemies, coins,
    starItems: [starItem(exitRight ? 300 : MAZE_W - 300, floorY(topFloor) - 70)],
    oxygenItems: [], seaGates: [], lavaGeysers: [], lavaPools: [], rotatingFires: [],
    keys: [keySpot], springs: [], chests: [], spikes,
    flag: rect(doorX + 10, floorY(topFloor) - 240, 28, 240),
    doors: []
  };
  return area;
}

// ---------- いろいろな形のエリア（くねくねトンネル・たて穴・たたかいの部屋） ----------
// ステージは、形のちがうエリアを扉でつないで作る。外の道 → 中の部屋いくつか → ゴールの道

function emptyLevelBits() {
  return { oxygenItems: [], seaGates: [], lavaGeysers: [], lavaPools: [], rotatingFires: [], springs: [], chests: [], lowBars: [], rails: [] };
}

// くねくねトンネル：上ったり下りたりしながら、ななめ上へ進む洞くつ
function makeWindingArea(base, worldIndex, difficulty, seed) {
  const rnd = seededRandom(seed * 7 + 11);
  const between = (a, b) => a + rnd() * (b - a);
  const pick = arr => arr[Math.floor(rnd() * arr.length)];
  const BOTTOM = canvas.height;
  const platforms = [];
  const spikes = [];
  const coins = [];
  const enemies = [];
  const blocks = [];
  const stars = [];
  let coinNo = 0;
  const addCoin = (x, y) => coins.push(coin(x, y, coinNo++ % 2 ? "pea" : "kaki"));
  const H = Math.round(between(250, 290)); // 通路の高さ
  const n = 8 + Math.floor(rnd() * 3) + Math.min(3, Math.floor(difficulty / 10));
  // ほふく前進でくぐる、天井の低い区間（入口と出口は同じ高さの床）
  const crawlIdx = 2 + Math.floor(rnd() * (n - 5));
  const crawlSpots = [];
  let x = 0;
  let fy = GROUND_Y;
  let minCeil = Infinity;
  const segs = [];
  for (let i = 0; i < n; i++) {
    const low = i === crawlIdx;
    const len = i === 0 ? 460 : i === n - 1 ? 420 : low ? Math.round(between(320, 440)) : Math.round(between(260, 520));
    if (i > 0) {
      // 多くは上り。ときどき下りや平らも（くねくね）
      const dy = low || i === crawlIdx + 1 ? 0 : pick([-120, -110, -90, -70, 0, 80, 100]);
      fy = clamp(fy + dy, -900, GROUND_Y);
    }
    const cy = low ? fy - CRAWL_GAP : fy - H;
    if (low) crawlSpots.push({ x, y: fy, w: len });
    minCeil = Math.min(minCeil, cy);
    segs.push({ x, len, fy, cy });
    x += len;
  }
  segs.forEach((s, i) => {
    const pit = i > 0 && i < n - 1 && i !== crawlIdx && s.len >= 400 && rnd() < 0.35;
    if (pit) {
      // とげの穴（落ちてもジャンプで出られる深さ）
      const px = s.x + s.len / 2 - 70;
      platforms.push({ ...rect(s.x, s.fy, px - s.x, BOTTOM - s.fy), terrain: true });
      platforms.push({ ...rect(px, s.fy + 130, 140, BOTTOM - s.fy - 130), terrain: true });
      platforms.push({ ...rect(px + 140, s.fy, s.x + s.len - px - 140, BOTTOM - s.fy), terrain: true });
      spikes.push({ x: px, y: s.fy + 130 - 22, w: 140, h: 22 });
      addCoin(px + 70, s.fy - 90);
    } else {
      platforms.push({ ...rect(s.x, s.fy, s.len, BOTTOM - s.fy), terrain: true });
    }
    // 天井（上までつまった岩）
    platforms.push(rect(s.x, s.cy - 1400, s.len, 1400));
    if (i === crawlIdx) {
      for (let c = 0; c < Math.floor(s.len / 80); c++) addCoin(s.x + 40 + c * 80, s.fy - 16);
      return;
    }
    if (i === 0 || i === n - 1 || pit) return;
    const mid = s.x + s.len / 2;
    const kind = Math.floor(rnd() * 5);
    if (kind === 0 && s.len >= 300) {
      spikes.push({ x: mid - 60, y: s.fy - 22, w: 120, h: 22 });
      addCoin(mid, s.fy - 110);
    } else if (kind === 1 && s.len >= 300) {
      const foe = (i + difficulty) % 3 === 0 ? armedEnemy(mid - 21, s.fy - 42, s.x + 10, s.x + s.len - 52, Math.min(MAX_WEAPON_POWER, Math.max(2, Math.floor(difficulty / 3)))) : enemy(mid - 21, s.fy - 42, s.x + 10, s.x + s.len - 52);
      foe.enemyKind = worldIndex;
      enemies.push(foe);
    } else if (kind === 2) {
      blocks.push(breakable(mid - 24, s.fy - 160, i % 3 === 0 ? "hp" : "power"));
    } else if (kind === 3 && s.len >= 380) {
      // 通路のまん中にうかぶ岩
      platforms.push(rect(mid - 50, s.fy - 120, 100, 30));
      addCoin(mid, s.fy - 160);
    } else {
      for (let c = 0; c < 3; c++) addCoin(s.x + 60 + c * ((s.len - 120) / 2), s.fy - 50);
    }
    if (stars.length === 0 && i === Math.floor(n * 0.6)) stars.push(starItem(mid, s.fy - 90));
  });
  if (!stars.length) {
    const s = segs[Math.floor(n / 2)];
    stars.push(starItem(s.x + s.len / 2, s.fy - 110));
  }
  const last = segs[n - 1];
  const end = last.x + last.len;
  platforms.push(rect(-80, minCeil - 1400, 80, BOTTOM - minCeil + 1448));
  platforms.push(rect(end, minCeil - 1400, 2800, BOTTOM - minCeil + 1448));
  const area = {
    ...base, climbStage: false, climbMeta: null, puzzle: null, isMaze: true, indoor: true, enclosed: true,
    top: minCeil - 160, bottom: BOTTOM, platforms, blocks, gun: { x: 300, y: 430 }
  };
  area.level = {
    ...emptyLevelBits(), enemies, coins, starItems: stars, keys: [], spikes, crawlSpots,
    flag: rect(end - 160, last.fy - 240, 28, 240), doors: []
  };
  return area;
}

// たたかいの部屋：敵をぜんぶたおすと、出口の扉があく
function makeArenaRoom(base, worldIndex, difficulty, seed) {
  const rnd = seededRandom(seed * 5 + 3);
  const W = 1400;
  const ceil = GROUND_Y - 470;
  const platforms = [
    { ...rect(0, GROUND_Y, W, canvas.height - GROUND_Y), terrain: true },
    rect(-80, ceil - 1400, 80, 2600), rect(W, ceil - 1400, 2800, 2600), rect(0, ceil - 1400, W, 1400)
  ];
  const layouts = [
    [[230, 340, 220], [950, 340, 220], [590, 220, 220]],
    [[160, 300, 260], [520, 380, 360], [980, 300, 260]],
    [[420, 340, 560], [200, 210, 180], [1020, 210, 180]]
  ];
  const lay = layouts[Math.floor(rnd() * layouts.length)];
  for (const [lx, ly, lw] of lay) platforms.push(rect(lx, ly, lw, 30));
  const count = Math.min(7, 4 + Math.floor(difficulty / 8));
  const enemies = [];
  for (let i = 0; i < count; i++) {
    const onLedge = i % 2 === 1 && lay[(i >> 1) % lay.length];
    // 入口（左）からはなして置く
    const ex = onLedge ? onLedge[0] + onLedge[2] / 2 - 21 : 560 + i * 120;
    const ey = onLedge ? onLedge[1] - 42 : GROUND_Y - 42;
    const left = onLedge ? onLedge[0] + 4 : 420;
    const right = onLedge ? onLedge[0] + onLedge[2] - 4 : W - 200;
    const foe = i % 3 === 2 ? armedEnemy(ex, ey, left, right, Math.min(MAX_WEAPON_POWER, Math.max(2, Math.floor(difficulty / 3)))) : enemy(ex, ey, left, right);
    foe.enemyKind = worldIndex;
    enemies.push(foe);
  }
  const coins = [];
  for (let i = 0; i < 6; i++) coins.push(coin(300 + i * 160, GROUND_Y - 40, i % 2 ? "pea" : "kaki"));
  const area = {
    ...base, climbStage: false, climbMeta: null, puzzle: null, isMaze: true, indoor: true, enclosed: true, arena: true,
    top: ceil - 160, ceilingY: ceil, bottom: canvas.height, platforms,
    blocks: [breakable(W / 2 - 24, ceil + 30, "hp")], gun: { x: 300, y: 430 }
  };
  area.level = {
    ...emptyLevelBits(), enemies, coins, starItems: [], keys: [], spikes: [],
    flag: rect(W - 150, GROUND_Y - 240, 28, 240), doors: []
  };
  return area;
}

function updateSpikes() {
  const p = state.player;
  for (const sp of level.spikes ?? []) {
    if (p.x + p.w > sp.x + 6 && p.x < sp.x + sp.w - 6 && p.y + p.h > sp.y + 6 && p.y < sp.y + sp.h) {
      damagePlayer(false, null, false);
      // はね上げて、トゲの上にい続けないようにする
      if (p.vy >= 0) p.vy = -520;
      return;
    }
  }
}

function drawSpikes() {
  for (const sp of level.spikes ?? []) {
    if (sp.x + sp.w < state.camera - 60 || sp.x > state.camera + VIEW_W + 60) continue;
    const n = Math.max(2, Math.round(sp.w / 22));
    const tw = sp.w / n;
    ctx.save();
    ctx.fillStyle = "#5a3d9a";
    ctx.fillRect(sp.x, sp.y + sp.h - 5, sp.w, 5);
    for (let i = 0; i < n; i++) {
      const x = sp.x + i * tw;
      const g = ctx.createLinearGradient(0, sp.y, 0, sp.y + sp.h);
      g.addColorStop(0, "#ffffff");
      g.addColorStop(0.5, "#ff8db7");
      g.addColorStop(1, "#c0266d");
      ctx.fillStyle = g;
      ctx.strokeStyle = "#7a1846";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + 1, sp.y + sp.h - 3);
      ctx.lineTo(x + tw / 2, sp.y);
      ctx.lineTo(x + tw - 1, sp.y + sp.h - 3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }
}

function buildStageAreas(index) {
  const base = courses[index];
  const { worldIndex, areaIndex } = courseIndexToWorldArea(index);
  const normalCount = stageAreaCount(worldIndex) - 1; // ボス以外のステージ数
  const underwater = base.trait === "underwater";
  const other = n => (areaIndex + n) % normalCount;
  const areas = [base];
  const seedFor = n => index * 7 + n;
  const diff = base.difficulty ?? 1;
  if (underwater) {
    // 海のワールドは泳ぐので、門の場所がちがう別の海のエリアを2つ
    areas.push({ ...makeCourse(worldIndex, areaIndex, 99, seedFor(1)), theme: base.theme, gun: base.gun });
    areas.push({ ...makeCourse(worldIndex, areaIndex, 99, seedFor(2)), theme: base.theme, gun: base.gun });
  } else {
    // 外の道のあとに、形のちがう部屋を3つ（ステージごとにえらぶ・順番もちがう）
    const rnd = seededRandom(index * 31 + 9);
    const kinds = ["winding", "shaftUp", "shaftDown", "arena", "maze", "cave", "winding"];
    for (let i = kinds.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [kinds[i], kinds[j]] = [kinds[j], kinds[i]];
    }
    let picked = [];
    for (const k of kinds) if (!picked.includes(k) && picked.length < 3) picked.push(k);
    // ステージごとに決めた部屋があれば、そっちを使う（同じ星の中でかぶらないように決めてある）
    const recipe = stageRecipe(worldIndex, areaIndex);
    if (recipe?.rooms) picked = recipe.rooms.slice();
    picked.forEach((k, i) => {
      const sd = seedFor(1 + i);
      areas.push(k === "winding" ? makeWindingArea(base, worldIndex, diff, sd)
        : k === "shaftUp" ? makeShaftArea(base, worldIndex, areaIndex, diff, sd)
          : k === "shaftDown" ? makeShaftArea(base, worldIndex, areaIndex, diff, sd, true)
            : k === "arena" ? makeArenaRoom(base, worldIndex, diff, sd)
              : k === "maze" ? makeMazeArea(base, worldIndex, areaIndex, diff, sd)
                : makeCaveArea(base, worldIndex, areaIndex, diff, sd));
      areas[areas.length - 1].indoor = true;
    });
    // さいごはゴールの旗がある外の道
    areas.push({ ...makeCourse(worldIndex, areaIndex, 99, seedFor(5)), theme: base.theme, gun: base.gun });
  }
  // ★はステージ全体で3つ：最初の道・まん中の部屋のどれか1つ・最後の道
  const lastNo = areas.length - 1;
  let middleStar = false;
  areas.forEach((area, n) => {
    area.areas = areas;
    area.areaNo = n;
    const lv = area.level;
    lv.chests = []; // カギは宝箱ではなく扉に使う
    const stars = lv.starItems ?? [];
    if (n === 0) lv.starItems = stars.slice(0, 1);
    else if (n === lastNo) lv.starItems = stars.slice(2, 3).length ? stars.slice(2, 3) : stars.slice(-1);
    else if (!middleStar && stars.length) { lv.starItems = stars.slice(0, 1); middleStar = true; }
    else lv.starItems = [];
    lv.doors = lv.doors ?? [];
    if (n < areas.length - 1) {
      const f = lv.flag;
      const locked = n > 0 && (lv.keys ?? []).length > 0 && !area.climbStage;
      lv.doors.push({ x: f.x - 10, y: f.y + f.h - DOOR_H, w: DOOR_W, h: DOOR_H, to: n + 1, spawnX: 90, locked, exit: true, needsClear: !!area.arena });
      lv.flag = rect(-99999, 0, 1, 1);
    }
  });
  // 最初のエリアの途中に、寄り道の小部屋
  const first = areas[0];
  // 寄り道の扉は、平らで安全な地面に
  const safe = (first.level.doorSpots ?? []).filter(d => d.x > 800 && d.x < 3900)
    .sort((a, b) => Math.abs(a.x - 2300) - Math.abs(b.x - 2300))[0];
  const crawls = first.level.crawlSpots ?? [];
  // 予備：広くて、上に何もない地面
  const wideGround = x => first.platforms
    .filter(p => p.w >= 200 && !p.mover && !p.conveyor && p.y >= 300 && p.h < 1000 && x > p.x + 40 && x + DOOR_W < p.x + p.w - 40)
    .sort((a, b) => a.y - b.y)[0];
  const doorFits = x => {
    const g = wideGround(x);
    if (!g || crawls.some(s => x + DOOR_W > s.x - 40 && x < s.x + s.w + 40)) return false;
    const r = { x, y: g.y - DOOR_H, w: DOOR_W, h: DOOR_H - 2 };
    return !first.platforms.some(q => q !== g && hit(r, q));
  };
  const freeX = [2300, 1900, 2800, 1500, 3200, 1200].find(doorFits);
  const spot = safe ? { x: safe.x - 40, y: safe.y, w: DOOR_W + 80 } : freeX ? wideGround(freeX) : null;
  if (spot && !first.climbStage) {
    const dx = clamp(safe ? safe.x : freeX, spot.x + 40, spot.x + spot.w - 40 - DOOR_W);
    const room = makeBonusRoom(index, index, { area: 0, x: dx });
    room.areas = areas;
    room.areaNo = areas.length;
    areas.push(room);
    first.level.doors.push({ x: dx, y: spot.y - DOOR_H, w: DOOR_W, h: DOOR_H, to: room.areaNo, spawnX: 230, bonus: true });
  }
  // （よろず屋は、ステージの中ではなく、ワールドマップの各ワールドにある）
  if (false) {
  const taken = first.level.doors.map(d => d.x);
  const farFromDoors = x => taken.every(t => Math.abs(t - x) > 260);
  const shopSafe = (first.level.doorSpots ?? []).filter(d => d.x > 500 && d.x < 3500 && farFromDoors(d.x))
    .sort((a, b) => Math.abs(a.x - 1100) - Math.abs(b.x - 1100))[0];
  const tryXs = [];
  for (let x = 700; x <= 3500; x += 100) tryXs.push(x);
  tryXs.sort((a, b) => Math.abs(a - 1100) - Math.abs(b - 1100));
  tryXs.push(320, 420); // どこにも置けなければ、スタート地点の近く
  const shopX = shopSafe ? shopSafe.x : tryXs.find(x => farFromDoors(x) && doorFits(x));
  const shopG = shopSafe ? { y: shopSafe.y } : shopX ? wideGround(shopX) : null;
  if (shopX && shopG) first.level.doors.push({ x: shopX, y: shopG.y - DOOR_H, w: DOOR_W, h: DOOR_H, to: 0, spawnX: shopX, shop: true });
  // 海のステージは、門より手前の水の中に、うかぶよろず屋
  else if (underwater) first.level.doors.push({ x: 560, y: 360, w: DOOR_W, h: DOOR_H, to: 0, spawnX: 560, shop: true });
  }
  courses[index] = areas[0];
}

// ぜんぶのワールドの、ボス以外のステージをエリア分けする
for (let i = 0; i < courses.length; i++) {
  if (!courses[i].bossStage && !courses[i].finalStage) buildStageAreas(i);
}

// ---------- 置いた物のおかしな場所を直す（全エリア・読みこみ時に1回） ----------
// ・O2バブル／★／カギ／コイン／敵が、かべ・岩の門の中にある → 外へずらす（ずらせないコインは消す）
// ・アイテムブロックが、かべにうまっている・下に立てる地面がない・高すぎる → とどく場所へ動かす（だめなら消す）
const BLOCK_REACH_MIN = 60;  // ブロックの下に立てる高さ（ぴょんぴーは 54）
const BLOCK_REACH_MAX = 190; // ジャンプで下からたたける高さ

function areaSolids(area) {
  return area.platforms.filter(p => !p.mover && !p.cart).concat((area.blocks ?? []).filter(b => !b.breakable && b.phase === undefined && !b.switchBox));
}

function pointInRects(x, y, rects, pad = 2) {
  return rects.some(p => x > p.x + pad && x < p.x + p.w - pad && y > p.y + pad && y < p.y + p.h - pad);
}

function rectHitsAny(r, rects, except = null) {
  return rects.some(p => p !== except && r.x < p.x + p.w && r.x + r.w > p.x && r.y < p.y + p.h && r.y + r.h > p.y);
}

// x のまっすぐ下で、y より下にある一番上の地面
function surfaceBelow(area, x, y) {
  let best = null;
  for (const p of area.platforms) {
    if (p.mover || x < p.x + 4 || x > p.x + p.w - 4 || p.y < y) continue;
    if (best === null || p.y < best) best = p.y;
  }
  return best;
}

// 岩の門の柱の中（すき間の外）か
function inSeaGate(area, x, y, r = 30) {
  const top = 58;
  const bottom = (area.bottom ?? canvas.height) - 42;
  for (const g of area.level.seaGates ?? []) {
    if (x + r < g.x - 10 || x - r > g.x + g.w + 10) continue;
    const gapY = top + 110 + g.frac * (bottom - top - 220);
    const half = g.moving ? 0 : g.gapH / 2 - r; // 動く門は閉じるので、柱の列にはおかない
    if (Math.abs(y - gapY) > half) return g;
  }
  return null;
}

function moveOutOfGates(area, obj, r = 30) {
  for (let i = 0; i < 6; i++) {
    const g = inSeaGate(area, obj.x, obj.y, r);
    if (!g) return true;
    obj.x = obj.x < g.x + g.w / 2 ? g.x - r - 40 : g.x + g.w + r + 40;
  }
  return !inSeaGate(area, obj.x, obj.y, r);
}

// 点がかべの中なら、近くの空いている場所（下に地面がある高さ）をさがす
function freeSpotNear(area, solids, x, y) {
  for (const dx of [0, 40, -40, 90, -90, 150, -150, 220, -220, 320, -320]) {
    for (let dy = 0; dy <= 420; dy += 30) {
      for (const sy of [y - dy, y + dy]) {
        if (pointInRects(x + dx, sy, solids, -6)) continue;
        const s = surfaceBelow(area, x + dx, sy);
        if (s !== null && s - sy <= 260 && s - sy >= 30) return { x: x + dx, y: sy };
      }
    }
  }
  return null;
}

const sanitizeStats = { moved: 0, removedCoins: 0, enemy: 0, blocksMoved: 0, blocksRemoved: 0 };

function sanitizeArea(area) {
  const lv = area.level;
  if (!lv) return;
  const solids = areaSolids(area);
  const underwater = area.trait === "underwater";
  const fixPoint = (o, r) => {
    if (underwater) {
      if (inSeaGate(area, o.x, o.y, r)) sanitizeStats.moved++;
      return moveOutOfGates(area, o, r);
    }
    if (!pointInRects(o.x, o.y, solids, -4)) return true;
    sanitizeStats.moved++;
    const spot = freeSpotNear(area, solids, o.x, o.y);
    if (!spot) return false;
    o.x = spot.x;
    o.y = spot.y;
    return true;
  };
  for (const o of lv.oxygenItems ?? []) fixPoint(o, 26);
  for (const s of lv.starItems ?? []) fixPoint(s, 22);
  for (const k of lv.keys ?? []) if (k) fixPoint(k, 22);
  const coinsBefore = (lv.coins ?? []).length;
  lv.coins = (lv.coins ?? []).filter(c => (underwater ? moveOutOfGates(area, c, 16) : !pointInRects(c.x, c.y, solids, -2)));
  sanitizeStats.removedCoins += coinsBefore - lv.coins.length;
  lv.enemies = (lv.enemies ?? []).filter(e => {
    if (e.boss) return true;
    if (underwater) {
      // 敵は左上が x,y なので、まん中で調べて動かす
      const c = { x: e.x + e.w / 2, y: e.y + e.h / 2 };
      if (inSeaGate(area, c.x, c.y, 26)) { sanitizeStats.enemy++; moveOutOfGates(area, c, 26); e.x = c.x - e.w / 2; }
      return true;
    }
    return !rectHitsAny({ x: e.x + 4, y: e.y + 4, w: e.w - 8, h: e.h - 8 }, solids);
  });
  // アイテムブロック
  if (!underwater && area.blocks) {
    const keep = [];
    for (const b of area.blocks) {
      if (!b.breakable) { keep.push(b); continue; }
      const others = solids.concat(keep.filter(k => k.breakable));
      const ok = r => {
        if (rectHitsAny(r, others)) return false;
        const s = surfaceBelow(area, r.x + r.w / 2, r.y + r.h);
        if (s === null) return false;
        const gap = s - (r.y + r.h);
        if (gap < BLOCK_REACH_MIN || gap > BLOCK_REACH_MAX) return false;
        // ブロックの真下に、ぴょんぴーが立てるすき間がある
        return !rectHitsAny({ x: r.x + 6, y: r.y + r.h + 2, w: r.w - 12, h: gap - 4 }, solids);
      };
      if (ok(b)) { keep.push(b); continue; }
      let placed = null;
      for (const dx of [0, 50, -50, 110, -110, 180, -180, 260, -260, 360, -360]) {
        const cx = b.x + dx + b.w / 2;
        const s = surfaceBelow(area, cx, b.y - 200);
        const tries = s === null ? [] : [s - 110 - b.h, s - 150 - b.h, s - 80 - b.h];
        for (const ny of tries) {
          const r = { ...b, x: b.x + dx, y: ny };
          if (ok(r)) { placed = r; break; }
        }
        if (placed) break;
      }
      if (placed) { keep.push(placed); sanitizeStats.blocksMoved++; } else sanitizeStats.blocksRemoved++;
    }
    area.blocks = keep;
  }
}

function sanitizeAllAreas() {
  const seen = new Set();
  for (const c of courses) {
    for (const a of c.areas ?? [c]) {
      if (!a || seen.has(a)) continue;
      seen.add(a);
      sanitizeArea(a);
    }
  }
}
sanitizeAllAreas();

// ステージ全体の★の数（エリアに分かれていても合計で数える）
function courseStarTotal(index) {
  const c = courses[index];
  const list = (c?.areas ?? [c]).filter(a => a && !a.isRoom);
  return list.reduce((sum, a) => sum + (a.level.starItems ?? []).length, 0);
}

// ステージを始めるときは、いつも最初のエリアから
function resetStageAreas(index) {
  const areas = courses[index]?.areas;
  if (areas) courses[index] = areas[0];
}

// 扉に入る：今の持ち物・時間・カギはそのままで、行き先のエリアを読みこむ
function enterArea(to, spawnX) {
  const areas = courses[currentCourse]?.areas;
  if (!areas?.[to] || FX.transitioning()) return;
  playSfx("decide");
  FX.startTransition({
    type: "fade",
    dur: 0.7,
    onMid: () => {
      const keep = campaignSnapshotFromState();
      const time = state.time;
      const keys = state.keys;
      const used = { charmUsed: state.charmUsed, iceShieldUsed: state.iceShieldUsed };
      // エリアごとに「取った★・取ったカギ・あけた扉」を覚えておく（もどってきても復活しない）
      const memo = JSON.parse(JSON.stringify(state.areaMemo ?? {}));
      const from = courses[currentCourse].areaNo ?? 0;
      memo[from] = {
        ...(memo[from] ?? {}),
        stars: state.starItems.map((s, i) => (s.taken ? i : -1)).filter(i => i >= 0),
        keys: (state.keyItems ?? []).map((k, i) => (k.taken ? i : -1)).filter(i => i >= 0),
        opened: (level.doors ?? []).map((d, i) => (d.lockedOriginally && !d.locked ? i : -1)).filter(i => i >= 0)
      };
      courses[currentCourse] = areas[to];
      state = newState();
      restoreCampaignSnapshot(keep);
      state.time = time;
      state.keys = keys;
      Object.assign(state, used);
      state.areaMemo = memo;
      state.doorHold = true;
      const mine = memo[to];
      if (mine) {
        mine.stars.forEach(i => { if (state.starItems[i]) state.starItems[i].taken = true; });
        mine.keys.forEach(i => { if (state.keyItems[i]) state.keyItems[i].taken = true; });
        mine.opened.forEach(i => { if (level.doors[i]) level.doors[i].locked = false; });
      }
      state.stageStarsGot = Object.entries(memo).filter(([n]) => Number(n) !== to).reduce((sum, [, m]) => sum + (m.stars?.length ?? 0), 0);
      unarmFirstStageEnemies();
      // 決まった武器をおく（1回目に入ったときだけ）と、練習部屋の説明
      const area = courses[currentCourse];
      if (area.fixedDrops && !memo[to]?.dropsGiven) {
        memo[to] = { ...(memo[to] ?? {}), dropsGiven: true, stars: memo[to]?.stars ?? [], keys: memo[to]?.keys ?? [], opened: memo[to]?.opened ?? [] };
        for (const d of area.fixedDrops) {
          state.items.push({ x: d.x, y: 300, type: "power", weaponPower: d.power, w: 28, h: 28, vx: 0, vy: -200, life: 9999, grounded: false });
        }
        if (area.tutorial) {
          Chat.say([
            ["yana", "光線銃がたくさん落ちていますね。ぜんぶひろって、合成してみましょう。", "Lots of ray guns lying around. Pick them all up and try fusing them."],
            ["yana", "SELECTで装備画面をひらいて、🌙ムーンポッパーをAでつかみ、もう1つの🌙ムーンポッパーの上ではなすと合成できます。", "Open the equipment screen with SELECT, grab a 🌙 Moon Popper with A and drop it on the other one to fuse."],
            ["yana", "でも⭐の武器とは合成できません。月の武器🌙と星の武器⭐は別の種類。同じ種類の、同じ武器どうしだけです。", "But you can't fuse it with the ⭐ weapon. Moon 🌙 and star ⭐ are different types; only the exact same weapon fuses."],
            ["pyon", "月は月、星は星で育てるんじゃな。まかしとき！", "Moon with moon, star with star. Got it!"]
          ], true);
        }
      }
      state.mode = "playing";
      const p = state.player;
      const sp = courses[currentCourse].spawn;
      const g = sp ? null : groundUnder(courses[currentCourse], spawnX + 20);
      p.x = sp ? sp.x : spawnX;
      p.y = (sp ? sp.y : g ? g.y : 492) - p.h;
      state.lastSafe = { x: p.x, y: p.y + p.h };
      // 扉から出てすぐは、敵は少し待ってから撃つ
      for (const e of state.enemies) e.gunCooldown = Math.max(e.gunCooldown ?? 0, 1.5);
      if (area.arena) Chat.say([["pyon", "敵がようけおるじょ！ ぜんぶたおさんと、扉はあかんみたいじゃ。", "So many enemies! Looks like the door won't open until they're all gone."]], true);
      p.vx = 0;
      p.vy = 0;
      p.grounded = true;
      p.invincible = 0.6;
      updateCamera(0, true);
      lastTime = performance.now();
    }
  });
}

function updateDoors() {
  const p = state.player;
  const doors = level.doors ?? [];
  state.nearDoor = null;
  const upHeld = keys.has("ArrowUp") || keys.has("KeyW") || gamepadState.up;
  if (!upHeld) state.doorHold = false;
  for (const d of doors) {
    const touching = p.x + p.w > d.x + 8 && p.x < d.x + d.w - 8 && p.y + p.h > d.y + 20 && p.y < d.y + d.h;
    if (!touching) continue;
    state.nearDoor = d;
    const up = keys.has("ArrowUp") || keys.has("KeyW") || gamepadState.up;
    // 扉から出てきた直後は、↑をいったんはなすまで入れない（すぐもどってしまわないように）
    if (state.doorHold) continue;
    if (!up || !(p.grounded || p.swimming)) continue;
    if (d.needsClear && state.enemies.some(e => e.alive && !e.boss)) {
      if ((state.gimmickHint ?? 0) <= 0) {
        state.gimmickHint = 2.2;
        FX.floater(d.x + d.w / 2, d.y - 20, language === "ja" ? "てきを ぜんぶ たおそう！" : "Defeat every enemy!", { color: "#ffffff", stroke: "#ff5f9e", size: 22, life: 1.3 });
        playSfx("locked", d.x);
      }
      continue;
    }
    if (d.shop) {
      Shop.openInStage();
      return;
    }
    // 合成の練習部屋：一度合成するまでは出られない
    if (courses[currentCourse]?.tutorial && !fuseGuideDone()) {
      if ((state.gimmickHint ?? 0) <= 0) {
        state.gimmickHint = 3.5;
        FX.floater(d.x + d.w / 2, d.y - 20, language === "ja" ? "合成してから 出よう！" : "Fuse first!", { color: "#ffffff", stroke: "#ff5f9e", size: 22, life: 1.5 });
        playSfx("locked", d.x);
        Chat.say([["yana", "出る前に、一度合成してみましょう！ SELECT で装備画面をひらいてください。", "Before you leave, try fusing once! Press SELECT to open the equipment screen."]], true);
      }
      continue;
    }
    if (d.locked) {
      if ((state.keys ?? 0) > 0) {
        state.keys -= 1;
        d.locked = false;
        playSfx("unlock", d.x);
        FX.floater(d.x + d.w / 2, d.y - 20, "OPEN!", { size: 28, color: "#c9f6ff", stroke: "#3f62c8", life: 1.1 });
        Chat.event("doorOpen");
      } else if ((state.gimmickHint ?? 0) <= 0) {
        state.gimmickHint = 2.2;
        FX.floater(d.x + d.w / 2, d.y - 20, language === "ja" ? "カギが ひつよう！" : "You need a key!", { color: "#ffffff", stroke: "#ff5f9e", size: 22, life: 1.3 });
        playSfx("locked", d.x);
        Chat.event("needKey");
      }
      continue;
    }
    enterArea(d.to, d.spawnX);
    return;
  }
}

const doorArt = {};
for (const key of ["portal", "locked", "bonus", "back"]) {
  const im = new Image();
  im.src = `assets/door-${key}.png`;
  doorArt[key] = im;
}

function drawDoors() {
  const t = performance.now() / 1000;
  for (const d of level.doors ?? []) {
    // 扉の絵（assets/door-*.png）があれば使う。カギを開けると、ふつうの扉の絵に変わる
    const shut = d.locked || (d.needsClear && state.enemies.some(e => e.alive && !e.boss));
    const art = doorArt[shut ? "locked" : d.bonus || d.shop ? "bonus" : d.exit ? "portal" : "back"];
    if (d.shop) {
      // よろず屋の看板
      ctx.save();
      ctx.font = `900 20px ${FX.FONT}`;
      const label = language === "ja" ? "よろず屋" : "SHOP";
      const lw = ctx.measureText(label).width + 22;
      ctx.fillStyle = "#fff3a4";
      ctx.strokeStyle = "#d98a2b";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(d.x + d.w / 2 - lw / 2, d.y - 44, lw, 30, 10);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#a35a12";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, d.x + d.w / 2, d.y - 28);
      ctx.restore();
    }
    // 「敵を全部たおす」部屋の出口には、のこりの数を出す（あと何体かわかるように）
    if (d.needsClear) {
      const left = state.enemies.filter(e => e.alive && !e.boss).length;
      ctx.save();
      ctx.font = `900 20px ${FX.FONT}`;
      const label = left > 0 ? (language === "ja" ? `のこり ${left} たい` : `${left} left`) : (language === "ja" ? "とびら オープン！" : "Door open!");
      const lw = ctx.measureText(label).width + 24;
      ctx.fillStyle = left > 0 ? "#ffd1ed" : "#c9f6ff";
      ctx.strokeStyle = left > 0 ? "#ff5f9e" : "#3f62c8";
      ctx.lineWidth = 3;
      ctx.beginPath();
      // 扉の絵（上にはみ出す）よりも上に出す
      ctx.roundRect(d.x + d.w / 2 - lw / 2, d.y - 96, lw, 32, 12);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = left > 0 ? "#c0266d" : "#3f62c8";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, d.x + d.w / 2, d.y - 79);
      ctx.restore();
    }
    const usedArt = art.complete && art.naturalWidth > 0;
    if (usedArt) {
      const w = d.w + 40;
      const h = w * (art.naturalHeight / art.naturalWidth);
      ctx.save();
      if (!d.locked) {
        ctx.shadowColor = d.bonus ? "#ff8db7" : "#9ee8ff";
        ctx.shadowBlur = 14 + Math.sin(t * 3 + d.x) * 6;
      }
      ctx.drawImage(art, d.x + d.w / 2 - w / 2, d.y + d.h - h + 4, w, h);
      ctx.restore();
    }
    if (!usedArt) {
    ctx.save();
    // 扉の枠
    ctx.fillStyle = d.bonus ? "#ffd1ed" : "#c8b2ff";
    ctx.strokeStyle = "#5a3d9a";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(d.x - 8, d.y - 8, d.w + 16, d.h + 8, [40, 40, 4, 4]);
    ctx.fill();
    ctx.stroke();
    // 入口（暗いアーチ）
    const g = ctx.createLinearGradient(0, d.y, 0, d.y + d.h);
    g.addColorStop(0, d.locked ? "#4d3a7a" : "#1d1440");
    g.addColorStop(1, d.locked ? "#2d2050" : "#0d0820");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(d.x, d.y, d.w, d.h, [34, 34, 0, 0]);
    ctx.fill();
    if (!d.locked) {
      // 中でまたたく星
      ctx.fillStyle = `rgba(255, 243, 164, ${0.5 + Math.sin(t * 4 + d.x) * 0.4})`;
      drawTinyStar(d.x + d.w * 0.35, d.y + 34, 5);
      drawTinyStar(d.x + d.w * 0.68, d.y + 58, 4);
    } else {
      // カギ穴
      ctx.fillStyle = "#ffd85a";
      ctx.beginPath();
      ctx.arc(d.x + d.w / 2, d.y + d.h * 0.48, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(d.x + d.w / 2 - 4, d.y + d.h * 0.48, 8, 20);
    }
    // 上の札
    const label = d.locked ? "🔒" : d.bonus ? "★" : d.exit ? "▶" : "◀";
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 20px Segoe UI, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, d.x + d.w / 2, d.y - 24);
    ctx.restore();
    }
    // 近くにいるときは「↑ではいる」
    if (state.nearDoor === d) {
      ctx.save();
      const bob = Math.sin(t * 6) * 4;
      const text = d.locked ? (language === "ja" ? "↑ カギであける" : "↑ Unlock") : (language === "ja" ? "↑ はいる" : "↑ Enter");
      ctx.font = "900 20px Segoe UI, system-ui, sans-serif";
      const w = ctx.measureText(text).width + 24;
      ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
      ctx.strokeStyle = "#ff8db7";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(d.x + d.w / 2 - w / 2, d.y - 96 + bob, w, 32, 16);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#5a3d9a";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, d.x + d.w / 2, d.y - 80 + bob);
      ctx.restore();
    }
  }
}


function rect(x, y, w, h) {
  return { x, y, w, h };
}

function breakable(x, y, item = null) {
  return { x, y, w: 48, h: 48, breakable: true, item, broken: false };
}

function hiddenItemBox(x, y, item = "power") {
  return { x, y, w: 48, h: 48, breakable: true, item, hiddenBox: true, broken: false };
}

function enemy(x, y, left, right) {
  return { x, y, w: 42, h: 42, vx: -86, vy: 0, left, right, alive: true, defeated: 0, alert: 0, trick: 0, grounded: true, jumpCooldown: 0, hp: 3, maxHp: 3, stun: 0 };
}

function armedEnemy(x, y, left, right, weaponPower = 2) {
  return { ...enemy(x, y, left, right), weaponPower, gunCooldown: 0.6 };
}

function bossEnemy(x, y, left, right, options = {}) {
  const w = options.w ?? 86;
  const h = options.h ?? 86;
  return {
    x, y,
    w,
    h,
    vx: options.final ? -210 : -150,
    vy: 0,
    left,
    right,
    alive: true,
    defeated: 0,
    alert: 1,
    trick: 0,
    grounded: true,
    jumpCooldown: 0,
    boss: true,
    finalBoss: !!options.final,
    bossKind: options.bossKind ?? 0,
    weaponPower: options.weaponPower ?? 4,
    gunCooldown: options.final ? 0.16 : 0.35,
    hp: options.hp ?? 34,
    maxHp: options.hp ?? 34,
    bossPattern: null,
    bossPatternCooldown: options.final ? 1.0 : 1.35
  };
}

function coin(x, y, type) {
  return { x, y, type, r: 14, taken: false, bob: Math.random() * Math.PI * 2 };
}

function starItem(x, y) {
  return { x, y, r: 18, taken: false, bob: Math.random() * Math.PI * 2 };
}

function oxygenItem(x, y) {
  return { x, y, r: 22, taken: false, respawn: 0, bob: Math.random() * Math.PI * 2 };
}

function lavaGeyser(x, phase = 0) {
  return { x, y: 492, w: 72, h: 390, phase, timer: phase, period: 4.2, active: false };
}

function lavaPool(x, y, w) {
  return { x, y, w, h: 48 };
}

function rotatingFire(x, y, radius = 64, speed = 1.2) {
  return { x, y, radius, speed, angle: Math.random() * Math.PI * 2, length: 96 };
}

function newState() {
  applyCourse(currentCourse);
  FX.resetStage();
  Gimmick.resetStage();
  return {
    mode: "playing",
    camera: 0,
    cameraY: cameraYMax(),
    keys: Shop.has("key") ? 1 : 0,
    keyItems: (level.keys ?? []).map(k => ({ ...k, taken: false })),
    springs: (level.springs ?? []).map(s => ({ ...s, squish: 0 })),
    chests: (level.chests ?? []).map(c => ({ ...c, opened: false })),
    switchOn: false,
    switchCooldown: 0,
    bossDeathTimer: 0,
    bossDeathTick: 0,
    bossDeathBoss: null,
    time: 120,
    score: 0,
    coinTotal: 0,
    kakiTotal: 0,
    peaTotal: 0,
    lives: MAX_LIVES,
    hp: MAX_HP,
    player: {
      x: 72,
      y: 380,
      w: 38,
      h: 54,
      vx: 0,
      vy: 0,
      grounded: false,
      invincible: 0,
      facing: 1
    },
    enemies: level.enemies.map((e, id) => ({ ...e, id, spawnX: e.x, spawnY: e.y, alive: true, defeated: 0, alert: e.boss ? 1 : 0, trick: 0, grounded: true, jumpCooldown: 0, gunCooldown: 0, attackAnim: 0, hurtAnim: 0, hp: e.hp ?? 1, maxHp: e.maxHp ?? e.hp ?? 1, facing: e.vx >= 0 ? 1 : -1 })),
    coinItems: (level.coins ?? []).map(c => ({ ...c, taken: false })),
    starItems: (level.starItems ?? []).map(s => ({ ...s, taken: false })),
    oxygen: MAX_OXYGEN,
    oxygenHurtCooldown: 0,
    oxygenItems: (level.oxygenItems ?? []).map(o => ({ ...o, taken: false, respawn: 0 })),
    seaGates: (level.seaGates ?? []).map(g => ({ ...g })),
    seaClock: 0,
    lavaGeysers: (level.lavaGeysers ?? []).map(g => ({ ...g })),
    lavaPools: (level.lavaPools ?? []).map(g => ({ ...g })),
    rotatingFires: (level.rotatingFires ?? []).map(g => ({ ...g })),
    bossHazards: [],
    stagePulse: 0,
    particles: [],
    items: [],
    gun: { x: courses[currentCourse].gun.x, y: courses[currentCourse].gun.y, holder: "player", cooldown: 0, weaponPower: 1 },
    weaponInventory: [1, ...Array(MAX_WEAPON_POWER - 1).fill(0)],
    inventoryItems: [1, ...Array(MAX_INVENTORY_ITEMS - 1).fill(null)],
    weaponPower: 1,
    inventorySelection: 0,
    inventoryScroll: 0,
    inventoryGrab: null,
    weaponDetail: null,
    fusionPrompt: null,
    itemFullPrompt: 0,
    inventoryMessage: 0,
    inventoryMessageLabel: "",
    inventoryFocusArea: "itemList",
    inventoryFocusMode: INVENTORY_FOCUS_MODES.AREA_SELECT,
    inventoryTopMenuIndex: 0,
    inventorySortFlash: 0,
    inventorySortToastLabel: "",
    inventorySortComment: "",
    inventorySortCommentUntil: 0,
    inventoryConfirmWorldMap: false,
    inventoryConfirmChoice: 0,
    stompBoostTimer: 0,
    stompLateBoostTimer: 0,
    deathTimer: 0,
    respawnTimer: 0,
    respawnDuration: 3,
    respawnStartY: -150,
    respawnTargetY: 260,
    bossIntroPlayed: false,
    bossIntroTimer: 0,
    bossIntroBossId: null,
    bossIntroStep: 0,
    bossDialoguePhase: "intro",
    bossOutroKind: 0,
    bossOutroFinal: false,
    bossOutroBoss: null,
    beams: []
  };
}

function applyCourse(index) {
  const course = courses[index];
  platforms = course.platforms.map(p => (p.cart ? { ...p, x: p.cart.startX, cart: { ...p.cart, state: "idle" } } : { ...p }));
  blocks = course.blocks.map(b => ({ ...b, broken: b.phase === 1 }));
  level = {
    keys: (course.level.keys ?? []).map(k => ({ ...k })),
    springs: (course.level.springs ?? []).map(s => ({ ...s })),
    chests: (course.level.chests ?? []).map(c => ({ ...c })),
    enemies: course.level.enemies.map(e => ({ ...e })),
    coins: (course.level.coins ?? []).map(c => ({ ...c })),
    starItems: (course.level.starItems ?? []).map(s => ({ ...s })),
    oxygenItems: (course.level.oxygenItems ?? []).map(o => ({ ...o })),
    seaGates: (course.level.seaGates ?? []).map(g => ({ ...g })),
    lavaGeysers: (course.level.lavaGeysers ?? []).map(g => ({ ...g })),
    lavaPools: (course.level.lavaPools ?? []).map(g => ({ ...g })),
    rotatingFires: (course.level.rotatingFires ?? []).map(g => ({ ...g })),
    doors: (course.level.doors ?? []).map(d => ({ ...d, lockedOriginally: !!d.locked })),
    spikes: (course.level.spikes ?? []).map(sp => ({ ...sp })),
    lowBars: (course.level.lowBars ?? []).map(b => ({ ...b })),
    crawlSpots: (course.level.crawlSpots ?? []).map(c => ({ ...c })),
    rails: (course.level.rails ?? []).map(r => ({ ...r })),
    flag: { ...course.level.flag }
  };
}

function worldTop() {
  return courses[currentCourse]?.top ?? 0;
}

function worldBottom() {
  return courses[currentCourse]?.bottom ?? canvas.height;
}

function cameraYMax() {
  const course = courses[currentCourse];
  const bottom = course?.bottom ?? canvas.height;
  return bottom - VIEW_H - (course?.trait === "underwater" ? 0 : 70);
}

function updateCamera(dt, snap = false) {
  const p = state.player;
  const lead = state.mode === "playing" ? p.facing * 34 : 0;
  const targetX = clamp(p.x + p.w / 2 - VIEW_W * 0.36 + lead, 0, WORLD_WIDTH - VIEW_W);
  const maxY = cameraYMax();
  const minY = Math.min(worldTop(), maxY);
  const camY = state.cameraY ?? maxY;
  const cy = p.y + p.h / 2;
  let targetY = camY;
  if (cy < camY + VIEW_H * 0.26) targetY = cy - VIEW_H * 0.26;
  else if (cy > camY + VIEW_H * 0.7) targetY = cy - VIEW_H * 0.7;
  // くねくねトンネルの中は、いつもまん中に（天井も床も見えるように）
  if (courses[currentCourse]?.enclosed) targetY = cy - VIEW_H * 0.55;
  if (state.mode === "playing" && !p.swimming) {
    // 足もとより下に地面があるときは、そこが見えるところまでカメラを下げる
    const feet = p.y + p.h;
    const reach = 300;
    const x0 = p.facing > 0 ? p.x - 30 : p.x - reach;
    const x1 = p.facing > 0 ? p.x + p.w + reach : p.x + p.w + 30;
    let floor = -Infinity;
    for (const s of platforms) {
      if (s.x >= x1 || s.x + s.w <= x0) continue;
      if (s.y > feet + 40 && s.y < feet + 620 && s.y > floor) floor = s.y;
    }
    let wantZoom = ZOOM;
    // 入りくんだエリア（建物の中）は下に落ちる心配がないので、引かずにぴょんぴーをアップで追う
    if (floor > -Infinity && !courses[currentCourse]?.isMaze) {
      // 画面に入りきらないほど深いときは、少し引いて（ズームアウトして）下まで見せる
      const span = floor + 90 - (p.y - 70);
      if (span > VIEW_H) wantZoom = clamp(canvas.height / span, 0.92, ZOOM);
      const viewH = canvas.height / wantZoom;
      const need = Math.min(floor + 90 - viewH, p.y - 70);
      if (need > targetY) targetY = need;
    }
    state.viewZoom = (state.viewZoom ?? ZOOM) + (wantZoom - (state.viewZoom ?? ZOOM)) * Math.min(1, dt * 4);
    const lookDown = keys.has("ArrowDown") || keys.has("KeyS") || gamepadState.down;
    if (lookDown && p.grounded) targetY = Math.max(targetY, Math.min(camY + 12, p.y - 60));
  }
  targetY = clamp(targetY, minY, maxY);
  if (snap) {
    state.camera = targetX;
    state.cameraY = clamp(cy - VIEW_H * 0.66, minY, maxY);
    return;
  }
  state.camera += (targetX - state.camera) * Math.min(1, dt * 7);
  state.cameraY = camY + (targetY - camY) * Math.min(1, dt * 6);
}

function announceStage() {
  const course = courses[currentCourse];
  const p = state.player;
  updateCamera(0, true);
  const tag = course.finalStage ? "  FINAL" : course.bossStage ? "  BOSS" : "";
  // ステージごとの名前（そのステージがどんな場所か、ひとことで）
  const recipeTitle = stageRecipe(course.worldIndex, course.areaIndex)?.title;
  const stageName = recipeTitle && !course.bossStage ? `  ${language === "ja" ? recipeTitle[0] : recipeTitle[1]}` : "";
  FX.showCard(Story.worldName(course.worldIndex), `STAGE ${stageLabel()}${tag}${stageName}`, { accent: course.theme?.accent });
  if (!FX.transitioning()) FX.startTransition({ type: "iris", half: true, dur: 1.1 });
  if (FX.S.transition) {
    FX.S.transition.x = (p.x + p.w / 2 - state.camera) * ZOOM;
    FX.S.transition.y = (p.y + p.h / 2 - state.cameraY) * ZOOM;
  }
  Chat.event("stageStart");
  Tutorial.stageStart();
  unarmFirstStageEnemies();
}

function maybePlayWorldIntro(worldIndex) {
  const id = `world${worldIndex}`;
  if (Story.seen(id)) return false;
  Story.play(id, () => {
    state.mode = "worldMap";
    lastTime = performance.now();
    Chat.event("map");
  });
  return true;
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  localStorage.setItem("pyonpSound", soundEnabled ? "on" : "off");
  if (audioMaster && audioCtx) applyVolumes();
  Story.refreshTitleUi();
}

function currentStageTrait() {
  return courses[currentCourse]?.trait ?? STAGE_TRAITS[courses[currentCourse]?.worldIndex ?? 0] ?? "moonFloat";
}

function isUnderwaterStage() {
  return currentStageTrait() === "underwater";
}

// ---------- テスト中だけ：アプリを閉じたところから「つづきから」ではじめる ----------
// 数秒ごとと、アプリを閉じる・かくれるときに、いまの記録を自動でとっておく。テストが終わったら false にする
const TEST_QUICK_RESUME = true;
const TEST_RESUME_KEY = "pyonpTestResumeV1";

function writeTestResume() {
  if (!TEST_QUICK_RESUME || !state || state.mode === "title" || state.mode === "movie") return;
  try {
    const data = Story.exportSave();
    data.unlocked = unlockedCourse;
    data.completed = [...completedCourses];
    if (state.weaponInventory) data.keep = campaignSnapshotFromState();
    const course = state.mode === "worldMap" ? mapSelectedCourse : currentCourse;
    localStorage.setItem(TEST_RESUME_KEY, JSON.stringify({ savedAt: Date.now(), course, data }));
  } catch (_) {}
}

function readTestResume() {
  if (!TEST_QUICK_RESUME) return null;
  try {
    const r = JSON.parse(localStorage.getItem(TEST_RESUME_KEY) || "null");
    return r && r.data ? r : null;
  } catch (_) {
    return null;
  }
}

if (TEST_QUICK_RESUME) {
  setInterval(writeTestResume, 5000);
  addEventListener("pagehide", writeTestResume);
  document.addEventListener("visibilitychange", () => { if (document.hidden) writeTestResume(); });
}

function resumeTestSave(r) {
  playSfx("gameStart");
  FX.startTransition({
    type: "fade",
    dur: 0.9,
    onMid: () => {
      pendingCourseStart = false;
      gameOverContinueAvailable = false;
      gameOverContinueCost = 0;
      overlay.classList.add("hidden");
      Story.importSave(r.data);
      const course = clamp(r.course | 0, 0, unlockedCourse);
      currentCourse = course;
      mapSelectedCourse = course;
      state = newState();
      if (campaignKeep) restoreCampaignSnapshot(campaignKeep);
      enterWorldMap(course, true);
      Story.refreshTitleUi();
      lastTime = performance.now();
    }
  });
}

function startGame(fresh = false) {
  if (FX.transitioning()) return;
  if (TEST_QUICK_RESUME && state?.mode === "title") {
    if (fresh) {
      try { localStorage.removeItem(TEST_RESUME_KEY); } catch (_) {}
    } else {
      const r = readTestResume();
      if (r) {
        resumeTestSave(r);
        return;
      }
    }
  }
  // 「つづきから」：セーブファイルがあれば、どのファイルから始めるか選ぶ画面を出す
  // 「つづきから」：セーブファイルを選ぶ画面（ファイルがなくても開いて、空っぽを見せる）
  if (!fresh && state?.mode === "title" && !state.saveMenu && (readSaveSlots().some(Boolean) || !Story.hasSave())) {
    openSaveMenu(true);
    overlay.classList.add("hidden");
    return;
  }
  const resume = !fresh && Story.hasSave();
  playSfx("gameStart");
  FX.startTransition({
    type: "fade",
    dur: 0.9,
    onMid: () => {
      pendingCourseStart = false;
      gameOverContinueAvailable = false;
      gameOverContinueCost = 0;
      overlay.classList.add("hidden");
      if (resume) {
        Story.applyToGame();
        currentCourse = unlockedCourse;
        mapSelectedCourse = unlockedCourse;
        state = newState();
        enterWorldMap(unlockedCourse, true);
        maybePlayWorldIntro(courses[unlockedCourse].worldIndex);
      } else {
        // 全クリしたあとの「はじめから」は、武器とルナコインを持ったまま最初から（強くてニューゲーム）
        const plus = Story.data.cleared && Story.data.keep ? JSON.parse(JSON.stringify(Story.data.keep)) : null;
        Story.resetSave();
        currentCourse = 0;
        unlockedCourse = 0;
        mapSelectedCourse = 0;
        completedCourses = new Set();
        campaignKeep = null;
        if (plus) {
          campaignKeep = { ...plus, score: 0, lives: MAX_LIVES, hp: MAX_HP };
          Story.data.newGamePlus = (Story.data.newGamePlus ?? 0) + 1;
          Story.data.cleared = false;
          Story.persist();
        }
        state = newState();
        if (campaignKeep) restoreCampaignSnapshot(campaignKeep);
        Story.play("opening", () => {
          enterWorldMap(0, true);
          maybePlayWorldIntro(0);
        });
      }
      Story.refreshTitleUi();
      lastTime = performance.now();
    }
  });
}

function startDirectCourse(index) {
  currentCourse = clamp(index, 0, courses.length - 1);
  unlockedCourse = Math.max(unlockedCourse, currentCourse);
  mapSelectedCourse = currentCourse;
  completedCourses = new Set(Array.from({ length: currentCourse }, (_, i) => i));
  campaignKeep = null;
  pendingCourseStart = false;
  state = newState();
  state.mode = "playing";
  overlay.classList.add("hidden");
  lastTime = performance.now();
  announceStage();
}

function startCurrentCourse() {
  pendingCourseStart = false;
  if (state?.mode === "worldMap" || state?.mode === "ready") {
    startMapCourse(mapSelectedCourse);
  } else {
    state.mode = "playing";
  }
  overlay.classList.add("hidden");
  lastTime = performance.now();
}

// 復活に払うルナコインの枚数
function continuePairCost(index = currentCourse) {
  const course = courses[index] ?? courses[0];
  return 2 * clamp(5 + course.worldIndex * 2 + Math.floor(course.areaIndex / 2), 5, 22);
}

// お金はルナコイン1種類（kakiTotal に入れる）。前のセーブの柿の種とピーナッツは、合わせてルナコインにする
function mergeOldSnacks(o) {
  if (!o) return o;
  if (o.peaTotal) {
    o.kakiTotal = (o.kakiTotal ?? 0) + o.peaTotal;
    o.peaTotal = 0;
  }
  return o;
}

function canPayContinue(cost = continuePairCost()) {
  mergeOldSnacks(state);
  return state && state.kakiTotal >= cost;
}

function continueFromGameOver() {
  if (!gameOverContinueAvailable || !canPayContinue(gameOverContinueCost)) return false;
  const snapshot = campaignSnapshotFromState();
  snapshot.kakiTotal = Math.max(0, snapshot.kakiTotal - gameOverContinueCost);
  snapshot.peaTotal = 0;
  snapshot.lives = MAX_LIVES;
  snapshot.hp = MAX_HP;
  state = newState();
  restoreCampaignSnapshot(snapshot);
  state.mode = "playing";
  gameOverContinueAvailable = false;
  gameOverContinueCost = 0;
  overlay.classList.add("hidden");
  updateHud();
  playSfx("respawn", state.player.x + state.player.w / 2);
  lastTime = performance.now();
  announceStage();
  return true;
}

function campaignSnapshotFromState() {
  if (!state) return campaignKeep;
  return {
    score: state.score ?? 0,
    coinTotal: state.coinTotal ?? 0,
    kakiTotal: (state.kakiTotal ?? 0) + (state.peaTotal ?? 0),
    peaTotal: 0,
    lives: state.lives ?? MAX_LIVES,
    hp: state.hp ?? MAX_HP,
    weaponInventory: [...(state.weaponInventory ?? [])],
    inventoryItems: [...(state.inventoryItems ?? [])],
    weaponPower: state.weaponPower ?? 1,
    hasGun: hasEquippedWeapon()
  };
}

function restoreCampaignSnapshot(snapshot) {
  if (!snapshot || !state) return;
  state.score = snapshot.score;
  state.coinTotal = snapshot.coinTotal;
  state.kakiTotal = (snapshot.kakiTotal ?? 0) + (snapshot.peaTotal ?? 0);
  state.peaTotal = 0;
  state.lives = snapshot.lives;
  state.hp = snapshot.hp;
  state.weaponInventory = [...snapshot.weaponInventory];
  state.inventoryItems = [...snapshot.inventoryItems];
  state.weaponPower = snapshot.weaponPower;
  state.gun.holder = snapshot.hasGun && state.weaponPower > 0 ? "player" : "inventory";
}

function enterWorldMap(selectedIndex = currentCourse, firstOpen = false, fromWorld = null) {
  currentCourse = clamp(selectedIndex, 0, courses.length - 1);
  mapSelectedCourse = clamp(selectedIndex, 0, unlockedCourse);
  mapAtShop = false;
  mapShopT = 0;
  if (!state) state = newState();
  state.mode = "worldMap";
  state.camera = 0;
  pendingCourseStart = false;
  mapRevealTimer = firstOpen ? 1.1 : 2.4;
  mapRevealFromWorld = fromWorld ?? courses[mapSelectedCourse]?.worldIndex ?? 0;
  mapMessageTimer = firstOpen ? 2.4 : 4.2;
  mapInputLockTimer = firstOpen ? 0.5 : 0.35;
  const point = MAP_NODE_POINTS[mapSelectedCourse] ?? MAP_NODE_POINTS[0];
  if (firstOpen) mapCamera = { x: point.x, y: point.y };
  Story.persist();
  Chat.event("map");
  updateHud();
}

function startMapCourse(index = mapSelectedCourse) {
  if (state?.mode === "worldMap" && mapInputLockTimer > 0) return;
  if (FX.transitioning()) return;
  const target = clamp(index, 0, unlockedCourse);
  if (state?.mode !== "worldMap") {
    beginCourse(target);
    return;
  }
  const node = mapPointToCanvas(target);
  playSfx("decide");
  FX.startTransition({ type: "iris", dur: 1.0, x: node.x, y: node.y, onMid: () => beginCourse(target) });
}

function beginCourse(index) {
  ensureStageBackground(courses[index]?.theme?.imageIndex ?? 0);
  resetStageAreas(index);
  currentCourse = index;
  mapSelectedCourse = index;
  const snapshot = campaignKeep;
  state = newState();
  restoreCampaignSnapshot(snapshot);
  for (const p of state.inventoryItems ?? []) if (p) markDex(p);
  // エリアが何個もあるステージは、時間を長めにする
  if (courses[index].areas) state.time = 520;
  // ボス戦は、弱い武器でも落ちついて戦えるように長め
  else if (courses[index].bossStage) state.time = 180;
  state.mode = "playing";
  pendingCourseStart = false;
  overlay.classList.add("hidden");
  lastTime = performance.now();
  if (courses[index].finalStage) {
    updateCamera(0, true);
    Story.playMovie("finalboss", () => {
      state.mode = "playing";
      announceStage();
    });
    return;
  }
  announceStage();
}

function moveMapSelection(dir) {
  mapSelectedCourse = clamp(mapSelectedCourse + dir, 0, unlockedCourse);
  currentCourse = mapSelectedCourse;
  playSfx("cursor");
  updateHud();
}

function returnToWorldMapFromInventory() {
  if (!state || state.mode !== "inventory") return;
  campaignKeep = campaignSnapshotFromState();
  state.inventoryConfirmWorldMap = false;
  state.inventoryGrab = null;
  state.fusionPrompt = null;
  enterWorldMap(currentCourse, false, null);
  overlay.classList.add("hidden");
  playSfx("respawn", state.player.x + state.player.w / 2);
  lastTime = performance.now();
}

function openInventory() {
  if (!state || (state.mode !== "playing" && state.mode !== "respawning" && state.mode !== "worldMap")) return;
  if (state.mode === "worldMap") {
    if (FX.transitioning() || mapInputLockTimer > 0) return;
    // マップでは、今の持ち物（次のステージに持っていくもの）を開く
    if (campaignKeep) restoreCampaignSnapshot(campaignKeep);
  }
  state.inventoryReturnMode = state.mode;
  state.mode = "inventory";
  const equippedSlot = inventorySlots().findIndex(slot => slot?.power === state.weaponPower);
  state.inventorySelection = equippedSlot >= 0 ? equippedSlot : 0;
  ensureInventorySelectionVisible();
  state.inventoryGrab = null;
  state.fusionPrompt = null;
  resetInventoryFocus();
  // はじめての合成：カーソルを、合成できる武器に合わせておく
  const guide = fuseGuideStep();
  if (guide?.step === 1) {
    state.inventorySelection = guide.source;
    ensureInventorySelectionVisible();
  }
  playSfx("decide");
}

function closeInventory() {
  if (!state || state.mode !== "inventory") return;
  if (fuseLessonOn()) return fuseLessonNudge();
  state.fuseLessonJustDone = false;
  state.inventoryGrab = null;
  state.fusionPrompt = null;
  state.inventoryConfirmWorldMap = false;
  state.saveMenu = null;
  state.deletePrompt = null;
  if (state.mechBoardPending) {
    // そうび画面をとじたら、ロボットに乗りこむ絵を見せる
    state.mechBoardPending = false;
    state.mechBoardUntil = performance.now() + 1600;
  }
  if (state.fighterTransformPending) {
    // 戦闘機に進化したら、変形中の絵を見せる
    state.fighterTransformPending = false;
    state.fighterTransformUntil = performance.now() + 1600;
  }
  const back = state.inventoryReturnMode;
  state.mode = back === "respawning" ? "respawning" : back === "worldMap" ? "worldMap" : "playing";
  state.inventoryReturnMode = null;
  if (back === "worldMap") {
    // マップで変えたそうびは、次のステージにそのまま持っていく
    campaignKeep = campaignSnapshotFromState();
    Story.persist();
    updateHud();
  }
  lastTime = performance.now();
  playSfx("cancel");
}

function toggleInventory() {
  if (!state) return;
  if (state.mode === "playing" || state.mode === "worldMap") openInventory();
  else if (state.mode === "inventory") closeInventory();
}

function pauseGame() {
  if (!state || (state.mode !== "playing" && state.mode !== "respawning")) return;
  state.pauseReturnMode = state.mode;
  state.mode = "paused";
  pauseSelection = 0;
  playSfx("decide");
}

function resumeGame() {
  if (!state || state.mode !== "paused") return;
  state.mode = state.pauseReturnMode === "respawning" ? "respawning" : "playing";
  state.pauseReturnMode = null;
  playSfx("cancel");
  lastTime = performance.now();
}

function returnToMapFromPause() {
  if (!state || state.mode !== "paused") return;
  campaignKeep = campaignSnapshotFromState();
  enterWorldMap(currentCourse, false, null);
  overlay.classList.add("hidden");
  playSfx("respawn", state.player.x + state.player.w / 2);
  lastTime = performance.now();
}

function choosePauseOption() {
  if (pauseSelection === 0) resumeGame();
  else returnToMapFromPause();
}

function loop(now) {
  const raw = clamp((now - lastTime) / 1000, 0, 0.032);
  lastTime = now;
  const dt = FX.frame(raw);
  Story.update(raw);
  Chat.update(raw);
  if (dt > 0) update(dt);
  Story.syncMusic();
  draw();
  animationId = requestAnimationFrame(loop);
}

function update(dt) {
  if (state.mode === "title") {
    updateGamepad();
    updateHud();
    return;
  }
  if (Story.isStoryMode(state.mode)) {
    updateGamepad();
    if (state.mode === "bossDeath") updateBossDeath(dt);
    updateParticles(dt);
    updateHud();
    return;
  }
  if (!overlay.classList.contains("hidden") && (state.mode === "playing" || state.mode === "ended" || pendingCourseStart)) {
    updateGamepad();
    updateHud();
    return;
  }
  if (state.mode === "worldMap") {
    updateGamepad();
    mapRevealTimer = Math.max(0, mapRevealTimer - dt);
    mapMessageTimer = Math.max(0, mapMessageTimer - dt);
    mapInputLockTimer = Math.max(0, mapInputLockTimer - dt);
    mapWalkTimer = Math.max(0, mapWalkTimer - dt);
    mapShopT = clamp(mapShopT + (mapAtShop ? 1 : -1) * dt / 0.6, 0, 1);
    updateWorldMapCamera(dt);
    updateHud();
    return;
  }
  if (state.mode === "paused") {
    updateGamepad();
    updateHud();
    return;
  }
  if (state.mode === "bossIntro") {
    updateGamepad();
    updateBossIntro(dt);
    updateParticles(dt);
    updateHud();
    return;
  }
  if (state.mode === "bossOutro") {
    updateGamepad();
    updateBossIntro(dt);
    updateParticles(dt);
    updateHud();
    return;
  }
  if (state.mode === "dying") {
    updateDeathFall(dt);
    updateParticles(dt);
    updateHud();
    return;
  }
  if (state.mode === "respawning") {
    updateGamepad();
    updateMoonRespawn(dt);
    updateParticles(dt);
    updateHud();
    return;
  }
  if (state.mode === "inventory") {
    updateGamepad();
    state.itemFullPrompt = Math.max(0, (state.itemFullPrompt ?? 0) - dt);
    updateParticles(dt);
    updateHud();
    return;
  }
  if (state.mode !== "playing") return;
  updateGamepad();
  // チュートリアルで画面を止めているあいだは、ほかのものを動かさない
  if (Tutorial.update(dt)) {
    updateParticles(dt);
    updateHud();
    return;
  }
  state.itemFullPrompt = Math.max(0, (state.itemFullPrompt ?? 0) - dt);
  state.stompBoostTimer = Math.max(0, (state.stompBoostTimer ?? 0) - dt);
  state.stompLateBoostTimer = Math.max(0, (state.stompLateBoostTimer ?? 0) - dt);
  state.time -= dt;
  if (state.time <= 0) damagePlayer();

  if (maybeStartBossIntro()) {
    updateParticles(dt);
    updateHud();
    return;
  }
  updateMovingPlatforms(dt);
  updatePlayer(dt);
  rescueAboveCeiling();
  if (state.arena) {
    const pl = state.player;
    if (pl.x < state.arena.left + 4) { pl.x = state.arena.left + 4; pl.vx = Math.max(0, pl.vx); }
    if (pl.x + pl.w > state.arena.right - 4) { pl.x = state.arena.right - 4 - pl.w; pl.vx = Math.min(0, pl.vx); }
  }
  FX.trackPlayer(state.player, dt);
  Gimmick.update(dt);
  updateStageTraits(dt);
  updateGun(dt);
  updateItems(dt);
  updateEnemies(dt);
  updateBossHazards(dt);
  updateBeams(dt);
  updateParticles(dt);
  collectCoins();
  collectStarItems();
  collectOxygenItems();
  updateDoors();
  updateSpikes();
  updateLowBars();
  updateCrawlHint();
  checkGoal();
  updateHud();
}

function maybeStartBossIntro() {
  const course = courses[currentCourse];
  if (!course || !course.bossStage || state.bossIntroPlayed) return false;
  const boss = state.enemies.find(e => e.boss && e.alive);
  if (!boss) return false;
  const p = state.player;
  if (p.x + p.w < boss.x - 500) return false;
  state.mode = "bossIntro";
  state.bossIntroPlayed = true;
  setupBossArena(boss);
  state.bossIntroTimer = 0;
  state.bossIntroBossId = boss.id;
  state.bossIntroStep = 0;
  state.beams = state.beams.filter(beam => beam.owner === "player");
  boss.attackAnim = 0.8;
  boss.gunCooldown = Math.max(boss.gunCooldown ?? 0, 1.2);
  p.vx = 0;
  p.vy = 0;
  p.grounded = true;
  lastTime = performance.now();
  return true;
}

// ---------- ボス戦のアリーナ ----------
// ボスがあらわれたら、うしろに光のかべができて逃げられない。床があるので落ちない。
// ボスは右はしにいて、決まった順番で攻撃する（体力が少なくなるとランダムになる）
function setupBossArena(boss) {
  const course = courses[currentCourse];
  const left = Math.max(0, boss.left - 20);
  const right = Math.min(WORLD_WIDTH, boss.right + 60);
  state.arena = { left, right, scripted: !isUnderwaterStage() && !course?.finalStage };
  const p = state.player;
  if (p.x < left + 10) p.x = left + 10;
  if (!state.arena.scripted) return;
  // 落ちない床と、頭の上の足場（ボスの突進をよけるため）
  platforms.push(rect(left, GROUND_Y, right - left, 48));
  const span = right - left;
  platforms.push(rect(left + span * 0.12, GROUND_Y - 170, 220, 30), rect(left + span * 0.52, GROUND_Y - 170, 220, 30));
  boss.script = { step: 0, phase: "idle", t: 1.4 };
  boss.left = left + 10;
  boss.right = right - 10;
}

const BOSS_SEQUENCE = ["orb", "charge", "rain", "orb", "leap"];

function updateBossScript(e, dt) {
  const a = state.arena;
  const p = state.player;
  const sc = e.script;
  const hpRate = (e.hp ?? e.maxHp) / Math.max(1, e.maxHp ?? 1);
  const angry = hpRate < 0.3;
  const home = a.right - e.w - 40;
  const face = () => { e.facing = p.x + p.w / 2 < e.x + e.w / 2 ? -1 : 1; };
  sc.t -= dt;
  e.vy += GRAVITY * dt;

  if (sc.phase === "idle") {
    // 右はしの定位置へもどる
    const dx = home - e.x;
    e.vx = Math.abs(dx) > 8 ? Math.sign(dx) * (angry ? 340 : 260) : 0;
    face();
    if (sc.t <= 0 && Math.abs(dx) < 16 && e.grounded) {
      const action = angry ? BOSS_SEQUENCE[Math.floor(Math.random() * BOSS_SEQUENCE.length)] : BOSS_SEQUENCE[sc.step % BOSS_SEQUENCE.length];
      sc.step += 1;
      sc.action = action;
      sc.phase = "wind";
      sc.t = action === "charge" ? (angry ? 0.6 : 0.85) : action === "leap" ? 0.55 : 0.5;
      e.attackAnim = 0.9;
      playSfx("equip", e.x + e.w / 2);
    }
  } else if (sc.phase === "wind") {
    // 攻撃の前ぶれ（体をゆらす）
    e.vx = 0;
    face();
    e.attackAnim = Math.max(e.attackAnim ?? 0, 0.2);
    if (sc.t <= 0) {
      if (sc.action === "orb" || sc.action === "rain") {
        fireBossPattern(e, { type: sc.action, targetX: clamp(p.x + p.w / 2, a.left + 120, a.right - 120), count: angry ? 5 : 3 });
        sc.phase = "idle";
        sc.t = angry ? 0.7 : 1.2;
      } else if (sc.action === "charge") {
        sc.phase = "charge";
        e.vx = -(angry ? 820 : 640);
        e.facing = -1;
        playSfx("whoosh", e.x);
      } else {
        // プレイヤーのいる場所へジャンプして、着地でしょうげき波
        const air = (2 * 920) / GRAVITY;
        const tx = clamp(p.x + p.w / 2 - e.w / 2, a.left + 20, a.right - e.w - 20);
        e.vy = -920;
        e.vx = (tx - e.x) / air;
        e.grounded = false;
        sc.phase = "leap";
        sc.t = 0.2;
      }
    }
  } else if (sc.phase === "charge") {
    // 左のかべまで突進（ジャンプか、上の足場でよける）
    e.vx = -(angry ? 820 : 640);
    if (e.x <= a.left + 20) {
      e.x = a.left + 20;
      e.vx = 0;
      FX.shake(0.25);
      playSfx("explosion", e.x);
      sc.phase = "idle";
      sc.t = angry ? 0.4 : 0.9;
    }
  } else if (sc.phase === "leap") {
    if (sc.t <= 0 && e.grounded) {
      e.vx = 0;
      FX.shake(0.3);
      playSfx("explosion", e.x + e.w / 2);
      fireBossPattern(e, { type: "eruption", targetX: e.x + e.w / 2, count: angry ? 4 : 2 });
      sc.phase = "idle";
      sc.t = angry ? 0.6 : 1.1;
    }
  }
  moveEnemyAndCollide(e, dt);
  e.x = clamp(e.x, a.left + 10, a.right - e.w - 10);
}

function drawBossArenaWalls() {
  const a = state.arena;
  if (!a) return;
  const t = performance.now() / 1000;
  for (const x of [a.left, a.right]) {
    const g = ctx.createLinearGradient(x - 18, 0, x + 18, 0);
    g.addColorStop(0, "rgba(255, 141, 183, 0)");
    g.addColorStop(0.5, `rgba(255, 141, 183, ${0.55 + Math.sin(t * 6) * 0.2})`);
    g.addColorStop(1, "rgba(255, 141, 183, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - 18, (state.cameraY ?? 0) - 40, 36, VIEW_H + 120);
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    for (let k = 0; k < 6; k++) {
      const y = (state.cameraY ?? 0) + ((t * 120 + k * 120) % (VIEW_H + 80)) - 40;
      ctx.fillRect(x - 2, y, 4, 34);
    }
  }
}

function updateBossIntro(dt) {
  state.bossIntroTimer += dt;
  const boss = state.enemies.find(e => e.id === state.bossIntroBossId && e.alive) ?? state.enemies.find(e => e.boss && e.alive);
  if (boss) {
    boss.attackAnim = Math.max(boss.attackAnim ?? 0, 0.12);
    const targetCamera = clamp(boss.x + boss.w / 2 - VIEW_W * 0.64, 0, WORLD_WIDTH - VIEW_W);
    state.camera += (targetCamera - state.camera) * Math.min(1, dt * 2.7);
  }
}

function advanceBossIntro() {
  if (state.mode !== "bossIntro" && state.mode !== "bossOutro") return false;
  if ((state.bossIntroTimer ?? 0) < 0.25) return true;
  if ((state.bossIntroStep ?? 0) === 0) {
    state.bossIntroStep = 1;
    state.bossIntroTimer = 0;
    playSfx("page");
  } else {
    if (state.mode === "bossOutro") {
      completeBossStageAfterOutro();
      return true;
    }
    state.mode = "playing";
    state.bossIntroBossId = null;
    state.bossIntroTimer = 0;
    state.bossIntroStep = 0;
    lastTime = performance.now();
    playSfx("laser", state.player.x + state.player.w / 2);
  }
  return true;
}

function startBossOutro(boss) {
  const p = state.player;
  state.mode = "bossOutro";
  state.bossIntroTimer = 0;
  state.bossIntroStep = 0;
  state.bossIntroBossId = boss.id;
  state.bossOutroKind = boss.bossKind ?? 0;
  state.bossOutroFinal = !!boss.finalBoss;
  state.bossOutroBoss = {
    x: boss.x,
    y: boss.y,
    w: boss.w,
    h: boss.h,
    bossKind: boss.bossKind ?? 0,
    finalBoss: !!boss.finalBoss
  };
  state.beams = state.beams.filter(beam => beam.owner === "player");
  p.vx = 0;
  p.vy = 0;
  lastTime = performance.now();
}

function completeBossStageAfterOutro() {
  state.bossIntroBossId = null;
  state.bossIntroTimer = 0;
  state.bossIntroStep = 0;
  state.bossOutroBoss = null;
  if (currentCourse < courses.length - 1) {
    Story.beginStageClear({ boss: true });
  } else {
    state.score += Math.ceil(state.time / 3) + 1000;
    completedCourses.add(currentCourse);
    campaignKeep = campaignSnapshotFromState();
    Story.persist();
    Story.play("ending", () => Story.playMovie("finale", () => Story.startCredits()));
  }
}

function beginBossDeath(boss) {
  state.mode = "bossDeath";
  state.bossDeathTimer = boss.finalBoss ? 3.3 : 2.3;
  state.bossDeathTick = 0;
  state.bossDeathBoss = boss;
  state.beams = [];
  state.bossHazards = [];
  boss.hurtAnim = 9;
  state.player.vx = 0;
  FX.hitStop(0.22);
  FX.slowMo(0.7, 0.3);
  FX.flash("#ffffff", 0.7, 0.35);
  FX.shake(0.8);
  playSfx("bossDown", boss.x + boss.w / 2);
}

function updateBossDeath(dt) {
  const boss = state.bossDeathBoss;
  if (!boss) {
    state.mode = "playing";
    return;
  }
  const p = state.player;
  p.vy += GRAVITY * dt;
  p.vx = 0;
  if (!isUnderwaterStage()) moveAndCollide(p, dt);
  state.bossDeathTimer -= dt;
  state.bossDeathTick -= dt;
  boss.defeated = 0.42;
  const cx = boss.x + boss.w / 2;
  const cy = boss.y + boss.h / 2;
  if (state.bossDeathTick <= 0) {
    state.bossDeathTick = 0.13;
    FX.explosion(cx + (Math.random() - 0.5) * boss.w * 1.5, cy + (Math.random() - 0.5) * boss.h * 1.4, 60 + Math.random() * 50);
    FX.shake(0.22);
    playSfx("explosion", cx);
  }
  if (state.bossDeathTimer <= 0) {
    FX.bossFinale(cx, cy);
    playSfx("bossDown", cx);
    boss.defeated = 0;
    boss.hurtAnim = 0;
    state.bossDeathBoss = null;
    startBossOutro(boss);
  }
}

function updateDeathFall(dt) {
  const p = state.player;
  state.deathTimer = Math.max(0, (state.deathTimer ?? 0) - dt);
  p.vy += GRAVITY * dt;
  // 穴に落ちたときは、画面の下まで落ちたらそこで待つ（「さいならーーー」を言い終わるまで）
  if (state.deathByPit && p.y > worldBottom() + 200) p.vy = 0;
  p.y += p.vy * dt;
  p.x += p.vx * dt;
  p.grounded = false;
  updateCamera(dt);
  if (state.deathByPit) {
    if (state.deathTimer > 0 || Chat.busy()) return;
  } else if (!(p.y > worldBottom() + 180 || state.deathTimer <= 0)) return;
  {
    if (state.lives <= 0) {
      endGame("Game Over", t("replay"), null, { allowContinue: true });
    } else {
      startMoonRespawn();
    }
  }
}

// 三日月タクシーで行ける一番上。天井のあるエリアでは、天井の下まで
function respawnMinY() {
  const ceiling = courses[currentCourse]?.ceilingY;
  return ceiling != null ? ceiling + 12 : worldTop() + 42;
}

// 天井より上（屋根の上）に出てしまったら、天井のすぐ下にもどす（つみ防止）
function rescueAboveCeiling() {
  const ceiling = courses[currentCourse]?.ceilingY;
  const p = state.player;
  if (ceiling == null || p.y + p.h > ceiling - 30) return;
  p.y = ceiling + 12;
  p.vy = 0;
  FX.respawnSparkle(p.x + p.w / 2, p.y + p.h / 2);
}

function updateMoonRespawn(dt) {
  const p = state.player;
  const duration = state.respawnDuration ?? 3;
  state.respawnTimer = Math.max(0, (state.respawnTimer ?? 0) - dt);
  const left = keys.has("ArrowLeft") || keys.has("KeyA") || gamepadState.left;
  const right = keys.has("ArrowRight") || keys.has("KeyD") || gamepadState.right;
  const up = keys.has("ArrowUp") || keys.has("KeyW") || keys.has("Space") || gamepadState.up || gamepadState.jump;
  const down = keys.has("ArrowDown") || keys.has("KeyS") || gamepadState.down;
  const run = keys.has("ShiftLeft") || keys.has("ShiftRight") || keys.has("KeyB") || gamepadState.run;
  const speed = run ? 410 : 285;
  const dx = (right ? 1 : 0) - (left ? 1 : 0);
  const dy = (down ? 1 : 0) - (up ? 1 : 0);
  const len = Math.hypot(dx, dy) || 1;
  if (courses[currentCourse]?.enclosed && state.lastSafe) {
    // 閉じたエリアでは、タクシーはさいごに立っていた場所へ、まっすぐおりる（かべの中に入らない）
    const k = 1 - clamp((state.respawnTimer ?? 0) / (state.respawnDuration ?? 3), 0, 1);
    p.x = state.lastSafe.x;
    p.y = state.lastSafe.y - p.h - 90 * (1 - k);
  } else {
    p.x = clamp(p.x + dx / len * speed * dt, 36, WORLD_WIDTH - p.w - 36);
    p.y = clamp(p.y + dy / len * speed * dt, respawnMinY(), worldBottom() - 290);
  }
  p.vx = dx / len * speed;
  p.vy = dy / len * speed;
  p.facing = dx < 0 ? -1 : dx > 0 ? 1 : p.facing;
  p.grounded = false;
  p.invincible = state.respawnTimer;
  p.onCrescent = true;
  updateCamera(dt);
  if (state.respawnTimer <= 0) {
    p.vy = 0;
    p.onCrescent = false;
    p.invincible = 1.2;
    for (let guard = 0; guard < 12; guard++) {
      const inside = platforms.concat(blocks.filter(b => !b.broken)).find(s => hit(p, s));
      if (!inside) break;
      p.y = inside.y - p.h - 1;
    }
    FX.respawnSparkle(p.x + p.w / 2, p.y + p.h / 2);
    state.mode = "playing";
    lastTime = performance.now();
  }
}

function updatePlayer(dt) {
  const p = state.player;
  if (isUnderwaterStage()) {
    updateSwimmingPlayer(dt);
    return;
  }
  if (hasEquippedWeapon() && state.weaponPower === FIGHTER_POWER) {
    updateFlyingPlayer(dt);
    return;
  }
  p.flying = false;
  p.swimming = false;
  // チュートリアル中は、使えるボタンをしぼる
  const tut = Tutorial.lock();
  const movingLeft = (!tut || tut.move) && (keys.has("ArrowLeft") || keys.has("KeyA") || gamepadState.left);
  const movingRight = (!tut || tut.move) && (keys.has("ArrowRight") || keys.has("KeyD") || gamepadState.right);
  // ジャンプは A（Space）だけ。十字キーの上下はねらう向きに使う
  const wantsJump = (tut && !tut.jump ? !!(p.jumpHeld && !p.grounded) : (keys.has("Space") || gamepadState.jump)) || Tutorial.consumeJump();
  const dxInput = (movingRight ? 1 : 0) - (movingLeft ? 1 : 0);
  const doubleTapRun = isDoubleTapRunActive(dxInput);
  const wantsRun = isRunHeld(dxInput) || doubleTapRun;
  const wantsShoot = (!tut || tut.shoot) && (keys.has("KeyX") || keys.has("KeyY") || keys.has("KeyJ") || gamepadState.shoot);
  const trait = currentStageTrait();
  const slippery = trait === "iceSlide" && !Shop.has("spikeShoes");
  // しゃがむ（地面で↓）。しゃがんだまま←→で、ほふく前進。敵の弾は頭の上を通りすぎる
  const wantsDown = (!tut || tut.move) && (keys.has("ArrowDown") || keys.has("KeyS") || gamepadState.down);
  const canCrouch = !(hasEquippedWeapon() && isRideable(state.weaponPower));
  if (wantsDown && p.grounded && canCrouch && !p.crouch) setCrouch(p, true);
  else if (p.crouch && (!wantsDown || !p.grounded || !canCrouch)) setCrouch(p, false);
  const crawl = !!p.crouch;
  const accel = crawl ? 900 : slippery ? (wantsRun ? 1380 : 820) : wantsRun ? 2100 : 1250;
  const boost = Shop.has("booster") ? 1.2 : 1; // ロケットブースター：ダッシュが速い
  const maxSpeed = crawl ? 75 : slippery ? (wantsRun ? 410 * boost : 270) : wantsRun ? 360 * boost : 235;

  if (movingLeft) {
    p.vx -= accel * dt;
    p.facing = -1;
  }
  if (movingRight) {
    p.vx += accel * dt;
    p.facing = 1;
  }
  if (!movingLeft && !movingRight) p.vx *= slippery ? 0.985 : FRICTION;

  if (p.grounded) p.airJumped = false;
  const canDoubleJump = Shop.has("double") || (hasEquippedWeapon() && isMechPower(state.weaponPower));
  if (wantsJump && !p.jumpWas && !p.grounded && (p.coyote ?? 0) <= 0 && !p.airJumped && canDoubleJump) {
    p.vy = trait === "moonFloat" ? -880 : -800;
    p.airJumped = true;
    p.jumpHeld = true;
    playSfx("jump", p.x);
    FX.jump(p.x + p.w / 2, p.y + p.h);
    FX.radial(p.x + p.w / 2, p.y + p.h, 8, { type: "star", speed: [80, 220], life: [0.3, 0.5], r: [4, 7], colors: FX.GOLD, spin: 8, vy: 60 });
  }
  p.jumpWas = wantsJump;
  p.coyote = p.grounded ? 0.1 : Math.max(0, (p.coyote ?? 0) - dt);
  // しゃがんでいるときは、立てる場所でだけジャンプできる
  if (wantsJump && p.crouch && !p.jumpWasCrouch) setCrouch(p, false);
  p.jumpWasCrouch = wantsJump;
  if (wantsJump && (p.grounded || p.coyote > 0) && !p.crouch) {
    spawnJumpSmoke(p.x + p.w / 2, p.y + p.h);
    FX.jump(p.x + p.w / 2, p.y + p.h);
    playSfx("jump", p.x);
    p.vy = trait === "moonFloat" ? -990 : -900;
    // ダッシュしながらのジャンプは少し高く飛べる
    if (wantsRun && Math.abs(p.vx) > 260) p.vy *= 1.08;
    // ロボットはジャンプ力が高い
    if (hasEquippedWeapon() && isMechPower(state.weaponPower)) p.vy *= 1.3;
    // 月あめジャンプ：少し高く
    if (Shop.has("moonJump")) p.vy *= 1.08;
    p.grounded = false;
    p.coyote = 0;
    p.jumpHeld = true;
  }
  if (p.jumpHeld && !wantsJump && p.vy < -320) {
    p.vy *= 0.5;
    p.jumpHeld = false;
  }
  if (p.vy >= 0) p.jumpHeld = false;

  p.aim = p.crouch ? (p.facing < 0 ? Math.PI : 0) : playerAimAngle(p, dxInput);
  const shootFresh = wantsShoot && !p.shootHeld;
  p.shootHeld = wantsShoot;
  // ロボット・戦闘機は、ボタンを押すたびに1発（おしっぱなしで連射しない）
  const rideShot = hasEquippedWeapon() && isRideable(state.weaponPower);
  if (wantsShoot && (!rideShot || shootFresh) && hasEquippedWeapon() && state.gun.cooldown <= 0) {
    const muzzle = playerMuzzle(p);
    shootBeam("player", muzzle.x, muzzle.y, p.facing, p.aim);
    state.gun.cooldown = weaponStage().cooldown;
  }

  p.vx = clamp(p.vx, -maxSpeed, maxSpeed);
  const gravity = trait === "moonFloat" ? GRAVITY * 0.78 : trait === "demonPulse" ? GRAVITY * (1 + Math.sin(state.stagePulse) * 0.2) : GRAVITY;
  p.vy += gravity * dt;
  // ロボット：落ちるときは足から逆噴射して、ゆっくり着地する
  p.retro = false;
  if (hasEquippedWeapon() && isMechPower(state.weaponPower) && !p.grounded && p.vy > 0) {
    p.vy = Math.min(p.vy, 230);
    p.retro = true;
  }
  p.invincible = Math.max(0, p.invincible - dt);

  moveAndCollide(p, dt);
  // 閉じたエリアでやられたときにもどる場所（さいごに立っていた安全な床）
  if (p.grounded && !p.onCart && !(level.spikes ?? []).some(sp => p.x + p.w > sp.x - 30 && p.x < sp.x + sp.w + 30 && Math.abs(p.y + p.h - sp.y - sp.h) < 30)) {
    state.lastSafe = { x: p.x, y: p.y + p.h };
  }

  if (p.y > worldBottom() + 100) damagePlayer(true);
  updateCamera(dt);
}

const STAND_H = 54;
const CROUCH_H = 30;

// しゃがむ・立つ（足の位置はそのまま）。上がつかえていて立てないときは、しゃがんだまま
function setCrouch(p, on) {
  if (on) {
    if (p.crouch) return;
    p.crouch = true;
    p.y += STAND_H - CROUCH_H;
    p.h = CROUCH_H;
    return;
  }
  if (!p.crouch) return;
  const standing = { x: p.x + 2, y: p.y - (STAND_H - CROUCH_H), w: p.w - 4, h: STAND_H - 2 };
  const blocked = platforms.some(s => hit(standing, s)) || blocks.some(b => !b.broken && hit(standing, b));
  if (blocked) return;
  p.crouch = false;
  p.y -= STAND_H - CROUCH_H;
  p.h = STAND_H;
}

function updateSwimmingPlayer(dt) {
  const p = state.player;
  const movingLeft = keys.has("ArrowLeft") || keys.has("KeyA") || gamepadState.left;
  const movingRight = keys.has("ArrowRight") || keys.has("KeyD") || gamepadState.right;
  const movingUp = keys.has("ArrowUp") || keys.has("KeyW") || keys.has("Space") || gamepadState.up || gamepadState.jump;
  const movingDown = keys.has("ArrowDown") || keys.has("KeyS") || gamepadState.down;
  const dxInput = (movingRight ? 1 : 0) - (movingLeft ? 1 : 0);
  const doubleTapRun = isDoubleTapRunActive(dxInput);
  const wantsRun = isRunHeld(dxInput) || doubleTapRun;
  const wantsShoot = keys.has("KeyX") || keys.has("KeyY") || keys.has("KeyJ") || gamepadState.shoot;
  const dx = dxInput;
  const dy = (movingDown ? 1 : 0) - (movingUp ? 1 : 0);
  const len = Math.hypot(dx, dy) || 1;
  const speed = (wantsRun ? 330 : 230) * (Shop.has("fins") ? 1.3 : 1);

  if (dx || dy) {
    p.vx += (dx / len * speed - p.vx) * Math.min(1, dt * 8);
    p.vy += (dy / len * speed - p.vy) * Math.min(1, dt * 8);
  } else {
    p.vx *= 0.9;
    p.vy *= 0.9;
  }
  if (dx < 0) p.facing = -1;
  if (dx > 0) p.facing = 1;

  p.aim = playerAimAngle(p, dxInput);
  const shootFresh = wantsShoot && !p.shootHeld;
  p.shootHeld = wantsShoot;
  // ロボット・戦闘機は、ボタンを押すたびに1発（おしっぱなしで連射しない）
  const rideShot = hasEquippedWeapon() && isRideable(state.weaponPower);
  if (wantsShoot && (!rideShot || shootFresh) && hasEquippedWeapon() && state.gun.cooldown <= 0) {
    const muzzle = playerMuzzle(p);
    shootBeam("player", muzzle.x, muzzle.y, p.facing, p.aim);
    state.gun.cooldown = weaponStage().cooldown;
  } else if (shootFresh && !hasEquippedWeapon() && state.gun.cooldown <= 0) {
    shootAirBubble(p);
  }

  // 泳ぐ向きに体をかたむける（上・下だけなら90度）
  const tiltTarget = dy ? Math.atan2(dy, Math.abs(dx)) : clamp((p.vy / 330) * 0.45, -0.5, 0.5);
  p.swimTilt = (p.swimTilt ?? 0) + (tiltTarget - (p.swimTilt ?? 0)) * Math.min(1, dt * 10);

  p.invincible = Math.max(0, p.invincible - dt);
  p.x = clamp(p.x + p.vx * dt, 0, WORLD_WIDTH - p.w);
  p.y = clamp(p.y + p.vy * dt, 58, worldBottom() - p.h - 42);
  resolveSeaGates(p);
  p.grounded = false;
  p.swimming = true;
  updateCamera(dt);
}

// 戦闘機：十字キーで上下左右に自由に飛ぶ（A でも上へ）。重力なし
function updateFlyingPlayer(dt) {
  const p = state.player;
  p.swimming = false;
  p.flying = true;
  const left = keys.has("ArrowLeft") || keys.has("KeyA") || gamepadState.left;
  const right = keys.has("ArrowRight") || keys.has("KeyD") || gamepadState.right;
  const up = keys.has("ArrowUp") || keys.has("KeyW") || keys.has("Space") || gamepadState.up || gamepadState.jump;
  const down = keys.has("ArrowDown") || keys.has("KeyS") || gamepadState.down;
  const dx = (right ? 1 : 0) - (left ? 1 : 0);
  const dy = (down ? 1 : 0) - (up ? 1 : 0);
  const len = Math.hypot(dx, dy) || 1;
  const fast = isRunHeld(dx) || isDoubleTapRunActive(dx);
  const speed = fast ? 520 : 380;
  p.vx += ((dx / len) * speed - p.vx) * Math.min(1, dt * 7);
  p.vy += ((dy / len) * speed - p.vy) * Math.min(1, dt * 7);
  if (dx) p.facing = dx;
  p.aim = p.facing < 0 ? Math.PI : 0;
  const wantsShoot = keys.has("KeyX") || keys.has("KeyY") || keys.has("KeyJ") || gamepadState.shoot;
  const shootFresh = wantsShoot && !p.shootHeld;
  p.shootHeld = wantsShoot;
  if (shootFresh && state.gun.cooldown <= 0) {
    const m = playerMuzzle(p);
    shootBeam("player", m.x, m.y, p.facing, p.aim);
    state.gun.cooldown = weaponStage().cooldown;
  }
  p.invincible = Math.max(0, p.invincible - dt);
  moveAndCollide(p, dt);
  const top = (state.cameraY ?? 0) + 20;
  const floor = worldBottom() - p.h - 10;
  if (p.y < top) { p.y = top; p.vy = Math.max(0, p.vy); }
  if (p.y > floor) { p.y = floor; p.vy = Math.min(0, p.vy); }
  p.grounded = false;
  updateCamera(dt);
}

function isRunHeld(dxInput = 0) {
  const keyboardRun = keys.has("ShiftLeft") || keys.has("ShiftRight") || keys.has("KeyB");
  const gamepadRun = gamepadState.run || (dxInput !== 0 && gamepadState.jump);
  return keyboardRun || gamepadRun;
}

function isDoubleTapRunActive(dxInput) {
  const now = performance.now();
  if (dxInput !== 0 && dxInput === doubleTapRunDir && now <= doubleTapRunUntil) {
    doubleTapRunGraceUntil = now + 180;
    return true;
  }
  if (dxInput !== 0 && dxInput !== doubleTapRunDir) {
    doubleTapRunDir = 0;
    doubleTapRunUntil = 0;
    doubleTapRunGraceUntil = 0;
    return false;
  }
  if (dxInput === 0 && now > doubleTapRunGraceUntil) {
    doubleTapRunDir = 0;
    doubleTapRunUntil = 0;
    return false;
  }
  return dxInput !== 0 && dxInput === doubleTapRunDir;
}

function updateStageTraits(dt) {
  const trait = currentStageTrait();
  state.stagePulse = (state.stagePulse ?? 0) + dt * 2.2;
  if (trait === "underwater") {
    updateOxygen(dt);
    state.seaClock = (state.seaClock ?? 0) + dt;
  }
  if (trait === "marsLava") updateLavaGeysers(dt);
  if (trait === "demonPulse") updateLightning(dt);
  updateFinalStageHazards(dt);
  if (trait === "factoryBelt" && state.player.grounded) {
    const support = platformUnderBody(state.player);
    if (support?.conveyor) {
      const dxInput = (keys.has("ArrowRight") || keys.has("KeyD") || gamepadState.right ? 1 : 0) - (keys.has("ArrowLeft") || keys.has("KeyA") || gamepadState.left ? 1 : 0);
      const resisting = dxInput && Math.sign(dxInput) !== Math.sign(support.conveyor);
      const runBonus = resisting && isRunHeld(dxInput) ? 0.45 : 1;
      state.player.x = clamp(state.player.x + support.conveyor * runBonus * dt, 0, WORLD_WIDTH - state.player.w);
    }
  }
}

function updateFinalStageHazards(dt) {
  if (!courses[currentCourse]?.finalStage) return;
  const p = state.player;
  for (const pool of state.lavaPools ?? []) {
    if (hit(p, pool)) damagePlayer(false, null, false);
  }
  for (const fire of state.rotatingFires ?? []) {
    fire.angle += fire.speed * dt;
    const fx = fire.x + Math.cos(fire.angle) * fire.radius;
    const fy = fire.y + Math.sin(fire.angle) * fire.radius;
    const playerCenterX = p.x + p.w / 2;
    const playerCenterY = p.y + p.h / 2;
    const dist = distanceToSegment(playerCenterX, playerCenterY, fire.x, fire.y, fx, fy);
    if (dist < 24 || hit(p, rect(fx - 18, fy - 18, 36, 36))) damagePlayer(false, null, false);
  }
}

function distanceToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy || 1;
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / lenSq, 0, 1);
  const sx = ax + dx * t;
  const sy = ay + dy * t;
  return Math.hypot(px - sx, py - sy);
}

// トロッコ：乗るとレールの上を走り出す。終点で止まる。ジャンプしても、いっしょに前へ進む
function updateCarts(dt) {
  const p = state.player;
  for (const c of platforms) {
    if (!c.cart) continue;
    const m = c.cart;
    const onIt = p.grounded && Math.abs(p.y + p.h - c.y) <= 6 && p.x + p.w > c.x + 4 && p.x < c.x + c.w - 4;
    if (m.state === "idle" && onIt) {
      m.state = "run";
      playSfx("equip", c.x);
      let told = false;
      try { told = localStorage.getItem("pyonpCartTip") === "1"; localStorage.setItem("pyonpCartTip", "1"); } catch (_) {}
      if (!told) {
        Chat.say([
          ["yana", "トロッコが走り出しました！ 頭の上のはりは、↓でしゃがんでくぐってください。敵の弾も、しゃがめば頭の上を通りすぎます。", "The cart is moving! Duck under the beams with ↓. Ducking also lets enemy shots fly over your head."],
          ["pyon", "ほふく前進じゃ！ 吾輩、地面すれすれでも、かっこええじょ！", "Belly crawl time! I look cool even down here!"]
        ], true);
      }
    }
    if (m.state !== "run") continue;
    const dx = Math.min(m.speed * dt, m.endX - c.x);
    c.x += dx;
    if (onIt) {
      p.x += dx;
      p.onCart = c;
    } else if (p.onCart === c && !p.grounded) {
      p.x += dx; // とんでいるあいだも、トロッコといっしょに進む
    } else if (p.grounded) {
      p.onCart = null;
    }
    if (c.x >= m.endX - 0.5) {
      m.state = "done";
      FX.shake(0.15);
    }
  }
}

function resetCarts() {
  for (const c of platforms) {
    if (!c.cart) continue;
    c.x = c.cart.startX;
    c.cart.state = "idle";
  }
  if (state?.player) state.player.onCart = null;
}

// 頭の上の低いはり：立っていると当たる。しゃがめば下をくぐれる
// ほふく前進のすき間の前で立っていたら、「↓でふせてくぐろう」と教える
function updateCrawlHint() {
  const p = state.player;
  if (p.crouch || !p.grounded) return;
  for (const c of level.crawlSpots ?? []) {
    const atMouth = (p.x + p.w >= c.x - 24 && p.x + p.w <= c.x + 6) || (p.x <= c.x + c.w + 24 && p.x >= c.x + c.w - 6);
    if (!atMouth || Math.abs(p.y + p.h - c.y) > 6) continue;
    if ((state.crawlHintCool ?? 0) > performance.now()) return;
    state.crawlHintCool = performance.now() + 3500;
    FX.floater(p.x + p.w / 2, p.y - 24, language === "ja" ? "↓でふせて くぐろう！" : "Duck with ↓ to crawl through!", { color: "#ffffff", stroke: "#7f67c8", size: 22, life: 1.6 });
    let told = false;
    try { told = localStorage.getItem("pyonpCrawlTip") === "1"; localStorage.setItem("pyonpCrawlTip", "1"); } catch (_) {}
    if (!told) {
      Chat.say([
        ["pyon", "せまっ！ 立ったままじゃ通れんじょ。↓でふせて、ほふく前進じゃ！", "So tight! Can't get through standing. Duck with ↓ and crawl!"]
      ], true);
    }
    return;
  }
}

function updateLowBars() {
  const p = state.player;
  for (const b of level.lowBars ?? []) {
    if (p.x + p.w > b.x + 4 && p.x < b.x + b.w - 4 && p.y < b.y + b.h - 4 && p.y + p.h > b.y + 4) {
      if (shopGuards("bar")) return;
      damagePlayer(false, null, false);
      return;
    }
  }
}

function drawRailsAndBars() {
  const top = (state.cameraY ?? 0) - 40;
  ctx.save();
  for (const r of level.rails ?? []) {
    if (r.x1 < state.camera - 60 || r.x0 > state.camera + VIEW_W + 60) continue;
    ctx.strokeStyle = "#6d5a8f";
    ctx.lineWidth = 5;
    for (const dy of [4, 14]) {
      ctx.beginPath();
      ctx.moveTo(r.x0, r.y + dy);
      ctx.lineTo(r.x1, r.y + dy);
      ctx.stroke();
    }
    ctx.fillStyle = "#4b3d66";
    for (let x = r.x0; x < r.x1; x += 46) ctx.fillRect(x, r.y + 2, 8, 16);
    ctx.fillStyle = "#3a2f52";
    for (let x = r.x0 + 200; x < r.x1 - 60; x += 420) ctx.fillRect(x, r.y + 18, 16, canvas.height - r.y);
  }
  for (const b of level.lowBars ?? []) {
    if (b.x + b.w < state.camera - 60 || b.x > state.camera + VIEW_W + 60) continue;
    ctx.fillStyle = "#4b3d66";
    ctx.fillRect(b.x + b.w / 2 - 6, top, 12, b.y - top);
    ctx.fillStyle = "#ffd85a";
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.save();
    ctx.beginPath();
    ctx.rect(b.x, b.y, b.w, b.h);
    ctx.clip();
    ctx.fillStyle = "#3a2f52";
    for (let y = b.y - 20; y < b.y + b.h; y += 26) {
      ctx.beginPath();
      ctx.moveTo(b.x, y);
      ctx.lineTo(b.x + b.w, y + 18);
      ctx.lineTo(b.x + b.w, y + 30);
      ctx.lineTo(b.x, y + 12);
      ctx.fill();
    }
    ctx.restore();
    ctx.strokeStyle = "#ff3d7f";
    ctx.lineWidth = 2;
    ctx.strokeRect(b.x, b.y, b.w, b.h);
  }
  for (const c of platforms) {
    if (!c.cart || c.x + c.w < state.camera - 60 || c.x > state.camera + VIEW_W + 60) continue;
    // トロッコの車輪
    ctx.fillStyle = "#3a2f52";
    for (const wx of [c.x + 30, c.x + c.w - 30]) {
      ctx.beginPath();
      ctx.arc(wx, c.y + c.h + 6, 12, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function updateMovingPlatforms(dt) {
  updateCarts(dt);
  const p = state.player;
  const t = (state.stagePulse ?? 0) + dt;
  for (const platform of platforms) {
    if (!platform.mover) continue;
    const oldX = platform.x;
    const oldY = platform.y;
    const m = platform.mover;
    const offset = Math.sin(t * m.speed + m.phase) * m.range;
    platform.x = m.baseX + (m.axis === "x" ? offset : 0);
    platform.y = m.baseY + (m.axis === "y" ? offset : 0);
    const carried = p.y + p.h <= oldY + 12 && p.y + p.h >= oldY - 12 && p.x + p.w > oldX && p.x < oldX + platform.w;
    if (carried) {
      p.x = clamp(p.x + platform.x - oldX, 0, WORLD_WIDTH - p.w);
      p.y += platform.y - oldY;
    }
  }
}

function platformUnderBody(body) {
  const foot = rect(body.x + 4, body.y + body.h, body.w - 8, 8);
  return platforms.find(p => hit(foot, p)) ?? null;
}

function updateOxygen(dt) {
  state.oxygen = clamp((state.oxygen ?? MAX_OXYGEN) - dt * (Shop.has("tank") ? 2.9 : 5.8), 0, MAX_OXYGEN);
  state.oxygenHurtCooldown = Math.max(0, (state.oxygenHurtCooldown ?? 0) - dt);
  for (const item of state.oxygenItems ?? []) {
    if (!item.taken) continue;
    item.respawn = Math.max(0, (item.respawn ?? 0) - dt);
    if (item.respawn <= 0) item.taken = false;
  }
  // 酸素が少ないとき：ピッピッと鳴らして、ぴょんぴーが知らせる（すぐわかるように）
  const low = state.oxygen < OXYGEN_LOW;
  if (low && !state.oxygenWarned) {
    state.oxygenWarned = true;
    Chat.say([["pyon", "く、くるしい……酸素が少ないじょ！ 丸いO2バブルをさがすんじゃ！", "C-can't breathe... I'm low on oxygen! Find a round O2 bubble!"]], true);
  }
  if (state.oxygen > OXYGEN_LOW + 20) state.oxygenWarned = false;
  if (low) {
    state.oxygenBeep = (state.oxygenBeep ?? 0) - dt;
    if (state.oxygenBeep <= 0) {
      state.oxygenBeep = state.oxygen <= 0 ? 0.45 : 0.9;
      playTone({ freq: 1180, endFreq: 980, duration: 0.09, type: "square", gain: 0.03 });
      playTone({ start: 0.12, freq: 1180, endFreq: 980, duration: 0.09, type: "square", gain: 0.03 });
    }
  }
  if (state.oxygen <= 0 && state.oxygenHurtCooldown <= 0) {
    state.oxygenHurtCooldown = 1.15;
    const p = state.player;
    FX.floater(p.x + p.w / 2, p.y - 20, language === "ja" ? "酸素がない！" : "No oxygen!", { color: "#ffffff", stroke: "#ff3d7f", size: 26, life: 1.1 });
    FX.flash("#ff3d7f", 0.25, 0.25);
    damagePlayer(false, null, false);
  }
}

const OXYGEN_LOW = 30;

// マグマの柱：ふき出す1秒前から地面が光って「！」が出る（LAVA_WARN_AT 〜 LAVA_ERUPT_AT が前ぶれ）
const LAVA_WARN_AT = 1.55;
const LAVA_ERUPT_AT = 2.55;
const LAVA_END_AT = 3.35;
// ふん石：柱がふき出すと石が舞い上がり、影が出てから落ちてくる
const ROCK_RISE = 0.7; // 舞い上がる時間
const ROCK_WARN = 1.3; // 影が出てから地面に落ちるまで
const ROCK_FALL = 0.5; // そのうち、実際に石が見えて落ちてくる時間
const ROCK_SIZE = 46;

// ---------- 魔王星：雷 ----------
// 空から光がさしこんで（前ぶれ 1.1秒）、そのあと雷が落ちる。光の柱の中にいるとダメージ
const BOLT_WARN = 1.1;
const BOLT_STRIKE = 0.3;
const BOLT_W = 70;

function updateLightning(dt) {
  const course = courses[currentCourse];
  if (course?.bossStage || course?.isMaze || course?.isRoom) return;
  const p = state.player;
  state.boltTimer = (state.boltTimer ?? 2.2) - dt;
  if (state.boltTimer <= 0) {
    const area = course?.areaIndex ?? 0;
    state.boltTimer = Math.max(1.2, 2.6 - area * 0.2) + Math.random() * 0.8;
    state.bolts ??= [];
    const px = p.x + p.w / 2;
    // 1本はプレイヤーの近く、先のステージではもう1本ふやす
    const count = area >= 3 ? 2 : 1;
    for (let i = 0; i < count; i++) {
      const offset = i === 0 ? (Math.random() - 0.5) * 160 + p.vx * 0.5 : (Math.random() < 0.5 ? -1 : 1) * (200 + Math.random() * 220);
      const x = clamp(px + offset, 40, WORLD_WIDTH - 40);
      state.bolts.push({ x, t: -i * 0.25, landY: lavaRockLandingY(x) ?? worldBottom(), seed: Math.random() * 1000 });
    }
  }
  for (const b of state.bolts ?? []) {
    b.t += dt;
    const striking = b.t >= BOLT_WARN && b.t < BOLT_WARN + BOLT_STRIKE;
    if (striking && !b.flashed) {
      b.flashed = true;
      playSfx("explosion", b.x);
      FX.shake(0.22);
      FX.flash("#fff7c2", 0.25, 0.15);
    }
    if (striking) {
      const top = (state.cameraY ?? 0) - 40;
      const r = { x: b.x - BOLT_W / 2 + 10, y: top, w: BOLT_W - 20, h: b.landY - top };
      // ロボット・戦闘機に乗っているときは雷が効かない（ひらいしんでも）
      if (hit(p, r) && !(hasEquippedWeapon() && isRideable(state.weaponPower)) && !shopGuards("bolt")) damagePlayer(false, null, false);
    }
  }
  state.bolts = (state.bolts ?? []).filter(b => b.t < BOLT_WARN + BOLT_STRIKE + 0.25);
}

function drawLightning() {
  const now = performance.now() / 1000;
  const top = (state.cameraY ?? 0) - 40;
  for (const b of state.bolts ?? []) {
    if (b.t < 0) continue;
    ctx.save();
    if (b.t < BOLT_WARN) {
      // 前ぶれ：空からうすい光がさしこみ、だんだん強く、速く点めつする
      const k = b.t / BOLT_WARN;
      const blink = 0.65 + Math.sin(now * (8 + k * 30)) * 0.35;
      const g = ctx.createLinearGradient(0, top, 0, b.landY);
      g.addColorStop(0, `rgba(255, 247, 194, ${(0.15 + k * 0.4) * blink})`);
      g.addColorStop(1, `rgba(200, 178, 255, ${(0.05 + k * 0.25) * blink})`);
      ctx.fillStyle = g;
      const w = BOLT_W * (0.5 + k * 0.5);
      ctx.fillRect(b.x - w / 2, top, w, b.landY - top);
      // 地面の光る輪
      ctx.strokeStyle = `rgba(255, 230, 120, ${0.4 + k * 0.6})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(b.x, b.landY + 2, 18 + k * 22, 6 + k * 6, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (b.t < BOLT_WARN + BOLT_STRIKE) {
      // 雷：ジグザグの光
      ctx.shadowColor = "#fff3a4";
      ctx.shadowBlur = 26;
      for (const [width, color] of [[16, "rgba(200, 178, 255, 0.9)"], [7, "#fffbe0"]]) {
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(b.x, top);
        const steps = 9;
        for (let i = 1; i <= steps; i++) {
          const y = top + ((b.landY - top) * i) / steps;
          const jitter = i === steps ? 0 : Math.sin(b.seed + i * 2.7 + now * 30) * 22;
          ctx.lineTo(b.x + jitter, y);
        }
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(255, 251, 224, 0.9)";
      ctx.beginPath();
      ctx.ellipse(b.x, b.landY, 46, 12, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function updateLavaGeysers(dt) {
  const p = state.player;
  for (const g of state.lavaGeysers ?? []) {
    const wasActive = g.active;
    g.timer = ((g.timer ?? 0) + dt) % g.period;
    g.active = g.timer > LAVA_ERUPT_AT && g.timer < LAVA_END_AT;
    if (g.active && !wasActive) eruptLavaRocks(g);
    if (!g.active) continue;
    const jet = { x: g.x, y: (g.baseY ?? canvas.height) - g.h, w: g.w, h: g.h };
    if (hit(p, jet) && p.invincible <= 0 && !shopGuards("lava")) damagePlayer(false, null, false);
  }
  updateLavaRocks(dt);
}

// x の真上から落ちてきた石が最初に当たる足場の高さ（なければ null ＝ 穴に落ちていく）
function lavaRockLandingY(x) {
  let top = null;
  for (const s of platforms.concat(blocks.filter(b => !b.broken))) {
    if (x < s.x || x > s.x + s.w) continue;
    if (top === null || s.y < top) top = s.y;
  }
  return top;
}

function eruptLavaRocks(g) {
  const course = courses[currentCourse];
  if (course?.bossStage) return;
  const p = state.player;
  const cx = g.x + g.w / 2;
  // 画面の近くでふき出したときだけ石を飛ばす
  if (Math.abs(cx - (p.x + p.w / 2)) > 900) return;
  state.lavaRocks ??= [];
  const offsets = [-(150 + Math.random() * 230), 150 + Math.random() * 230];
  // 1つはプレイヤーの近くをねらう（ちゃんとよける遊びになるように）
  const near = p.x + p.w / 2 - cx;
  if (Math.abs(near) < 620 && Math.abs(near) > 90) offsets.push(near + (Math.random() - 0.5) * 60);
  else offsets.push((Math.random() < 0.5 ? -1 : 1) * (330 + Math.random() * 200));
  offsets.forEach((offset, i) => {
    const tx = clamp(cx + offset, 60, WORLD_WIDTH - 60);
    state.lavaRocks.push({
      fromX: cx,
      fromY: (g.baseY ?? canvas.height) - g.h * 0.55,
      tx,
      landY: lavaRockLandingY(tx),
      t: -i * 0.28, // 少しずつずらして落とす
      spin: Math.random() * 6,
      done: false
    });
  });
  playSfx("explosion", cx);
  FX.shake(0.18);
}

function lavaRockRect(rock) {
  // 落ちているあいだの石の位置（影が出ている時間の最後の ROCK_FALL 秒）
  const fallT = rock.t - ROCK_RISE - (ROCK_WARN - ROCK_FALL);
  if (fallT < 0) return null;
  const k = clamp(fallT / ROCK_FALL, 0, 1);
  const startY = (state.cameraY ?? 0) - 90;
  const endY = (rock.landY ?? worldBottom() + 200) - ROCK_SIZE;
  const y = startY + (endY - startY) * k * k;
  return { x: rock.tx - ROCK_SIZE / 2, y, w: ROCK_SIZE, h: ROCK_SIZE };
}

function updateLavaRocks(dt) {
  const rocks = state.lavaRocks;
  if (!rocks?.length) return;
  for (const rock of rocks) {
    rock.t += dt;
    rock.spin += dt * 7;
    const r = lavaRockRect(rock);
    if (r && hit(state.player, r) && state.player.invincible <= 0 && !shopGuards("lava")) damagePlayer(false, null, false);
    if (rock.t >= ROCK_RISE + ROCK_WARN) {
      rock.done = true;
      if (rock.landY !== null) {
        spawnBlockPoof(rock.tx, rock.landY - 8);
        playSfx("break", rock.tx);
        FX.shake(0.1);
      }
    }
  }
  state.lavaRocks = rocks.filter(rock => !rock.done);
}

function drawLavaRockShape(x, y, size, spin) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(spin);
  const glow = ctx.createRadialGradient(0, 0, size * 0.2, 0, 0, size * 0.95);
  glow.addColorStop(0, "rgba(255, 170, 60, 0.75)");
  glow.addColorStop(1, "rgba(255, 90, 40, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.95, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#6b3a35";
  ctx.strokeStyle = "#ff8a3d";
  ctx.lineWidth = 3;
  ctx.beginPath();
  const pts = [1, 0.78, 0.96, 0.72, 1, 0.8, 0.92, 0.7];
  for (let i = 0; i < pts.length; i++) {
    const a = (i / pts.length) * Math.PI * 2;
    const r = (size / 2) * pts[i];
    if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#ffb04a";
  ctx.beginPath();
  ctx.arc(-size * 0.12, -size * 0.1, size * 0.1, 0, Math.PI * 2);
  ctx.arc(size * 0.16, size * 0.12, size * 0.07, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawLavaRocks() {
  const now = performance.now() / 1000;
  for (const rock of state.lavaRocks ?? []) {
    if (rock.t < 0) continue;
    if (rock.t < ROCK_RISE) {
      // 火口から舞い上がる
      const k = rock.t / ROCK_RISE;
      const x = rock.fromX + (rock.tx - rock.fromX) * k * 0.35;
      const y = rock.fromY - (rock.fromY - ((state.cameraY ?? 0) - 90)) * (1 - (1 - k) * (1 - k));
      drawLavaRockShape(x, y, ROCK_SIZE * 0.8, rock.spin);
      continue;
    }
    const warn = clamp((rock.t - ROCK_RISE) / ROCK_WARN, 0, 1);
    if (rock.landY !== null) {
      // 落ちる場所の影：だんだん大きく、こくなる
      const blink = 0.75 + Math.sin(now * (10 + warn * 22)) * 0.25;
      ctx.save();
      ctx.fillStyle = `rgba(90, 20, 30, ${(0.25 + warn * 0.45) * blink})`;
      ctx.beginPath();
      ctx.ellipse(rock.tx, rock.landY + 2, 16 + warn * 26, 5 + warn * 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(255, 90, 60, ${0.5 + warn * 0.5})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(rock.tx, rock.landY + 2, 20 + warn * 30, 7 + warn * 8, 0, 0, Math.PI * 2);
      ctx.stroke();
      // 上に「！」のしるし
      const my = rock.landY - 96 + Math.sin(now * 9) * 4;
      ctx.fillStyle = "#ff3d5a";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(rock.tx, my + 30);
      ctx.lineTo(rock.tx - 17, my);
      ctx.lineTo(rock.tx + 17, my);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.font = "900 17px Segoe UI, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("!", rock.tx, my + 11);
      ctx.restore();
    }
    const r = lavaRockRect(rock);
    if (r) drawLavaRockShape(r.x + r.w / 2, r.y + r.h / 2, ROCK_SIZE, rock.spin);
  }
}

function queueStompBoost() {
  if (state?.mode !== "playing") return;
  state.stompBoostTimer = STOMP_BOOST_BUFFER;
  if ((state.stompLateBoostTimer ?? 0) > 0) {
    applyStompBounce(null, true);
  }
}

function applyStompBounce(enemySource, boosted = false) {
  const p = state.player;
  const boss = Boolean(enemySource?.boss);
  p.vy = boosted ? (boss ? BOSS_STOMP_BOOST_VY : STOMP_BOOST_VY) : (boss ? BOSS_STOMP_BOUNCE_VY : STOMP_BOUNCE_VY);
  p.grounded = false;
  state.stompBoostTimer = 0;
  state.stompLateBoostTimer = boosted ? 0 : STOMP_LATE_BOOST_WINDOW;
  p.jumpHeld = false;
  FX.stomp(p.x + p.w / 2, p.y + p.h, boosted);
  if (boosted) Chat.event("stompBoost");
  spawnJumpSmoke(p.x + p.w / 2, p.y + p.h);
  playSfx(boosted ? "stompBoost" : "enemyHit", p.x + p.w / 2);
}

function moveAndCollide(body, dt) {
  const solid = platforms.concat(blocks.filter(b => !b.broken));
  body.x += body.vx * dt;
  for (const s of solid) {
    if (!hit(body, s)) continue;
    if (body.vx > 0) body.x = s.x - body.w;
    if (body.vx < 0) body.x = s.x + s.w;
    body.vx = 0;
  }

  body.y += body.vy * dt;
  body.grounded = false;
  for (const s of solid) {
    if (!hit(body, s)) continue;
    if (body.vy > 0) {
      body.y = s.y - body.h;
      body.grounded = true;
    }
    if (body.vy < 0) {
      body.y = s.y + s.h;
      if (s.breakable) breakBlock(s);
      if (s.switchBox) Gimmick.hitSwitch(s);
    }
    body.vy = 0;
  }
  body.x = clamp(body.x, 0, WORLD_WIDTH - body.w);
}

function updateEnemies(dt) {
  const p = state.player;
  for (const e of state.enemies) {
    if (!e.alive && e.defeated > 0) {
      e.defeated = Math.max(0, e.defeated - dt);
      continue;
    }
    if (!e.alive) continue;
    if (e.boss && courses[currentCourse]?.bossStage && !state.bossIntroPlayed) {
      e.vx = 0;
      e.vy += isUnderwaterStage() ? 0 : GRAVITY * dt;
      e.attackAnim = 0;
      e.gunCooldown = Math.max(e.gunCooldown ?? 0, 0.5);
      if (isUnderwaterStage()) updateSwimmingEnemy(e, dt, true);
      else moveEnemyAndCollide(e, dt);
      continue;
    }
    e.gunCooldown = Math.max(0, e.gunCooldown - dt);
    e.jumpCooldown = Math.max(0, e.jumpCooldown - dt);
    e.attackAnim = Math.max(0, (e.attackAnim ?? 0) - dt);
    e.hurtAnim = Math.max(0, (e.hurtAnim ?? 0) - dt);
    e.stun = Math.max(0, (e.stun ?? 0) - dt);
    if (Tutorial.moveEnemy(e, dt)) {
      // チュートリアルの敵は、決まった動きだけ
    } else if (e.stun > 0) {
      e.vx = 0;
      e.vy += isUnderwaterStage() ? 0 : GRAVITY * dt;
      if (isUnderwaterStage()) updateSwimmingEnemy(e, dt, true);
      else moveEnemyAndCollide(e, dt);
    } else if (isUnderwaterStage()) {
      updateSwimmingEnemy(e, dt);
    } else if (e.boss && e.script && state.arena?.scripted) {
      updateBossScript(e, dt);
    } else {
      updateEnemyMovement(e, dt);
    }
    if (e.boss && e.script && state.arena?.scripted) {
      // 攻撃は updateBossScript の中で決まった順番に出す
    } else if (e.boss && courses[currentCourse]?.bossStage && state.bossIntroPlayed) {
      updateBossAttackPattern(e, dt);
    } else if (!e.tutorialSafe && (state.gun.holder === e.id || e.weaponPower) && e.gunCooldown <= 0 && enemyCanSeePlayer(e)) {
      const dir = state.player.x + state.player.w / 2 < e.x + e.w / 2 ? -1 : 1;
      // ふつうの敵は胸の高さで撃つ（しゃがめば頭の上を通る）
      shootBeam(e.id, e.x + e.w / 2 + dir * 22, e.boss ? e.y + 22 : e.y + e.h - 50, dir);
      e.attackAnim = e.boss ? 0.42 : 0.28;
      e.gunCooldown = e.finalBoss ? 0.22 : e.boss ? (e.weaponPower >= 5 ? 0.48 : 0.68) : e.weaponPower >= 3 ? 0.92 : 1.25;
    }
    if (!hit(p, e)) continue;

    if (e.stun > 0) continue;
    const stomp = p.vy > 120 && p.y + p.h - e.y < 24;
    if (stomp) {
      stunEnemy(e);
      if (!e.boss && Shop.has("boots") && !e.tutorialSafe) damageEnemy(e, 3);
      applyStompBounce(e, (state.stompBoostTimer ?? 0) > 0);
      Tutorial.onStomp(e);
    } else if (!e.tutorialSafe) {
      damagePlayer(false, e, true);
    }
  }
}

function enemyCanSeePlayer(e) {
  // 画面の外からは撃ってこない（ズームしたカメラでも理不尽にならないように）
  const p = state.player;
  if (e.boss) return true;
  return e.x + e.w > state.camera - 20 && e.x < state.camera + VIEW_W + 20 && Math.abs((e.y + e.h / 2) - (p.y + p.h / 2)) < 420;
}

function damageEnemy(e, amount = 1) {
  if (!e.alive) return;
  if (e.boss && courses[currentCourse]?.bossStage && (!state.bossIntroPlayed || state.mode === "bossIntro")) return;
  e.hp = Math.max(0, (e.hp ?? 3) - amount);
  e.alert = 1;
  e.hurtAnim = e.boss ? 0.38 : 0.24;
  e.stun = e.boss ? 0.22 : 2;
  e.vx = 0;
  spawnBlockPoof(e.x + e.w / 2, e.y + e.h / 2);
  FX.enemyHurt(e, amount);
  if (e.hp > 0) {
    playSfx("enemyHit", e.x + e.w / 2);
    return;
  }
  e.alive = false;
  e.defeated = 0.42;
  playSfx("enemyDefeat", e.x + e.w / 2);
  const dropPower = enemyDropPower(e);
  if (dropPower) spawnWeaponDrop(e.x + e.w / 2, e.y + 8, dropPower, !e.stolenWeapon);
  // ごくたまに、たおした敵がぶどうまんじゅうを落とす
  else if (!e.boss && Math.random() < 0.015) spawnItem(e.x + e.w / 2, e.y + 8, "manju");
  e.weaponPower = 0;
  e.stolenWeapon = false;
  dropGunFromEnemy(e);
  state.score += e.boss ? 500 : 5;
  if (e.boss && courses[currentCourse]?.bossStage) {
    beginBossDeath(e);
    return;
  }
  state.score += FX.enemyDefeat(e);
  if (FX.S.combo === 3) Chat.event("combo");
}

function stunEnemy(e) {
  if (e.boss && courses[currentCourse]?.bossStage && (!state.bossIntroPlayed || state.mode === "bossIntro")) return;
  if (!e.boss) Chat.event("stomp");
  e.stun = e.boss ? 0.35 : 2;
  e.alert = 1;
  e.vx = 0;
  if (e.weaponPower) {
    const dropPower = enemyDropPower(e);
    if (dropPower) spawnWeaponDrop(e.x + e.w / 2, e.y + 8, dropPower, !e.stolenWeapon);
    e.weaponPower = 0;
    e.stolenWeapon = false;
  }
  if (state.gun.holder === e.id) {
    state.gun.holder = null;
    state.gun.x = e.x + e.w / 2;
    state.gun.y = e.y + e.h - 8;
  }
  spawnBlockPoof(e.x + e.w / 2, e.y + 8);
}

function updateEnemyMovement(e, dt) {
  const p = state.player;
  const enemyCenter = e.x + e.w / 2;
  const playerCenter = p.x + p.w / 2;
  const dx = playerCenter - enemyCenter;
  const distance = Math.abs(dx);
  const seesPlayer = distance < 640;
  const hasGun = state.gun.holder === e.id || e.weaponPower;

  e.alert = seesPlayer || hasGun ? Math.min(1, e.alert + dt * 2.8) : Math.max(0, e.alert - dt * 0.9);
  e.trick = Math.max(0, e.trick - dt);

  if (e.alert > 0.25) {
    const desiredDir = dx < 0 ? -1 : 1;
    const speed = e.boss ? (hasGun ? 360 : distance < 180 ? 520 : 430) : hasGun ? 260 : distance < 160 ? 430 : 340;
    const acceleration = e.boss ? 2500 : hasGun ? 1350 : 2100;
    const gap = getGapAhead(e, desiredDir);
    const blocked = hasWallAhead(e, desiredDir);
    const canJumpGap = gap > 0 && gap <= (e.boss ? 260 : 190);
    const playerLower = p.y + p.h > e.y + e.h + 42;
    const shouldDropTowardPlayer = !e.boss && gap > 190 && playerLower && distance < 620;
    const shouldStopAtGap = gap > 190 && !shouldDropTowardPlayer;
    e.allowDrop = shouldDropTowardPlayer;

    if (shouldStopAtGap && e.grounded) {
      e.vx *= 0.35;
    } else {
      e.vx += desiredDir * acceleration * dt;
      e.vx = clamp(e.vx, -speed, speed);
    }

    const shouldPounce = e.boss ? distance < 340 : !hasGun && distance < 240;
    const shouldClimb = state.player.y + state.player.h < e.y + e.h - 22;
    const shouldClearGap = e.grounded && canJumpGap;
    if (e.grounded && e.jumpCooldown <= 0 && (shouldPounce || shouldClimb || shouldClearGap || blocked)) {
      e.vy = shouldClearGap ? (e.boss ? -900 : -760) : shouldPounce ? (e.boss ? -820 : -690) : -640;
      e.vx += desiredDir * (shouldClearGap ? (e.boss ? 680 : 460) : shouldPounce ? (e.boss ? 520 : 340) : 260);
      e.grounded = false;
      e.jumpCooldown = e.boss ? 0.34 + Math.random() * 0.12 : shouldClearGap ? 0.8 : 0.48 + Math.random() * 0.25;
    }
  } else {
    const patrolDir = e.vx < 0 ? -1 : 1;
    if (e.grounded && getGapAhead(e, patrolDir) > 48) {
      e.vx = -patrolDir * 86;
    }
    e.vx += patrolDir * 120 * dt;
    e.vx = clamp(e.vx, -86, 86);
  }

  e.vy += GRAVITY * dt;
  moveEnemyAndCollide(e, dt);
  if (e.boss && e.y > canvas.height + 80) respawnBoss(e);
  if (e.bumped && e.grounded && e.jumpCooldown <= 0) {
    e.vy = -680;
    e.grounded = false;
    e.jumpCooldown = 0.52;
  }

  const minX = e.boss ? e.left : e.alert > 0.25 ? 0 : e.left;
  const maxX = e.boss ? e.right : e.alert > 0.25 ? WORLD_WIDTH : e.right;
  if (e.x < minX) {
    e.x = minX;
    e.vx = Math.abs(e.vx) || 86;
  }
  if (e.x + e.w > maxX) {
    e.x = maxX - e.w;
    e.vx = -Math.abs(e.vx) || -86;
  }
  syncEnemyFacing(e);
}

function updateSwimmingEnemy(e, dt, idle = false) {
  const p = state.player;
  const dx = p.x + p.w / 2 - (e.x + e.w / 2);
  const dy = p.y + p.h / 2 - (e.y + e.h / 2);
  const distance = Math.hypot(dx, dy) || 1;
  const seesPlayer = distance < 640;
  const hasGun = state.gun.holder === e.id || e.weaponPower;
  e.alert = seesPlayer || hasGun ? Math.min(1, e.alert + dt * 2.4) : Math.max(0, e.alert - dt * 0.7);
  const speed = idle ? 60 : e.boss ? 230 : hasGun ? 190 : 165;
  if (!idle && e.alert > 0.25) {
    const targetGap = hasGun ? 210 : 38;
    const pull = distance > targetGap ? 1 : -0.35;
    e.vx += dx / distance * speed * pull * dt * 6;
    e.vy += dy / distance * speed * pull * dt * 5;
  } else {
    e.vx += Math.sin((performance.now() / 650) + e.id) * 24 * dt;
    e.vy += Math.cos((performance.now() / 760) + e.id) * 24 * dt;
  }
  e.vx = clamp(e.vx * 0.986, -speed, speed);
  e.vy = clamp(e.vy * 0.986, -speed * 0.75, speed * 0.75);
  e.x = clamp(e.x + e.vx * dt, e.boss ? e.left : 0, (e.boss ? e.right : WORLD_WIDTH) - e.w);
  e.y = clamp(e.y + e.vy * dt, 72, worldBottom() - e.h - 48);
  // 敵も岩のかべ・門は通りぬけられない
  resolveSeaGates(e, true);
  e.grounded = false;
  syncEnemyFacing(e);
}

function updateBossAttackPattern(boss, dt) {
  if (!boss.alive || state.mode !== "playing") return;
  boss.bossPatternCooldown = Math.max(0, (boss.bossPatternCooldown ?? 1) - dt);
  if (!boss.bossPattern && boss.bossPatternCooldown <= 0) {
    boss.bossPattern = chooseBossPattern(boss);
    boss.attackAnim = 0.9;
    playSfx("equip", boss.x + boss.w / 2);
  }
  if (!boss.bossPattern) return;
  boss.bossPattern.timer -= dt;
  boss.attackAnim = Math.max(boss.attackAnim ?? 0, 0.18);
  if (boss.bossPattern.timer > 0) return;
  fireBossPattern(boss, boss.bossPattern);
  const phase = 1 - clamp((boss.hp ?? boss.maxHp) / Math.max(1, boss.maxHp ?? 1), 0, 1);
  boss.bossPattern = null;
  boss.bossPatternCooldown = boss.finalBoss ? 0.85 - phase * 0.18 : 1.25 - phase * 0.16;
}

function chooseBossPattern(boss) {
  const p = state.player;
  const phase = 1 - clamp((boss.hp ?? boss.maxHp) / Math.max(1, boss.maxHp ?? 1), 0, 1);
  const patterns = boss.finalBoss || phase > 0.45
    ? ["orb", "eruption", "rain", "rain"]
    : ["orb", "eruption", "rain"];
  const type = patterns[Math.floor((performance.now() / 500 + (boss.bossKind ?? 0)) % patterns.length)];
  return {
    type,
    timer: type === "orb" ? 0.45 : 0.75,
    targetX: clamp(p.x + p.w / 2, boss.left + 120, boss.right - 120),
    targetY: p.y + p.h / 2,
    count: boss.finalBoss ? 5 : phase > 0.45 ? 4 : 3
  };
}

function fireBossPattern(boss, pattern) {
  if (pattern.type === "orb") {
    const dir = state.player.x + state.player.w / 2 < boss.x + boss.w / 2 ? -1 : 1;
    const speed = boss.finalBoss ? 230 : 190;
    const count = boss.finalBoss ? 3 : 2;
    for (let i = 0; i < count; i++) {
      const angle = Math.atan2((state.player.y + state.player.h / 2) - (boss.y + 34 + i * 18), (state.player.x + state.player.w / 2) - (boss.x + boss.w / 2));
      state.beams.push({
        owner: boss.id,
        bossOrb: true,
        x: boss.x + boss.w / 2 + dir * 22,
        y: boss.y + 26 + i * 18,
        w: 38,
        h: 38,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        angle,
        life: 4.2,
        damage: 1,
        colors: ["#fff3a4", "#ff8db7", "#c8b2ff"],
        power: boss.weaponPower ?? 4,
        distance: 0,
        range: 960
      });
    }
    playSfx("laser", boss.x + boss.w / 2);
    return;
  }

  if (pattern.type === "rain") {
    const spacing = 118;
    for (let i = 0; i < pattern.count; i++) {
      const side = i - (pattern.count - 1) / 2;
      state.bossHazards.push({
        type: "fall",
        x: clamp(pattern.targetX + side * spacing, state.camera + 70, state.camera + VIEW_W - 70),
        y: (state.cameraY ?? 0) - 90 - i * 28,
        r: 24,
        telegraph: 0.72,
        life: 3.2,
        vy: boss.finalBoss ? 640 : 560,
        owner: boss.id
      });
    }
    return;
  }

  const spacing = 112;
  for (let i = 0; i < pattern.count; i++) {
    const side = i - (pattern.count - 1) / 2;
    state.bossHazards.push({
      type: "eruption",
      x: clamp(pattern.targetX + side * spacing, boss.left + 80, boss.right - 80),
      y: 492,
      w: 72,
      h: boss.finalBoss ? 210 : 168,
      telegraph: 0.84,
      active: 0,
      life: 1.45,
      owner: boss.id
    });
  }
}

function updateBossHazards(dt) {
  const p = state.player;
  for (const h of state.bossHazards ?? []) {
    h.life -= dt;
    if (h.telegraph > 0) {
      h.telegraph -= dt;
      if (h.telegraph <= 0) h.active = h.type === "eruption" ? 0.55 : 1;
      continue;
    }
    if (h.type === "fall") {
      h.y += h.vy * dt;
      const hitbox = rect(h.x - h.r, h.y - h.r, h.r * 2, h.r * 2);
      if (hit(hitbox, p)) {
        h.life = 0;
        damagePlayer(false, state.enemies.find(e => e.id === h.owner));
      }
    } else if (h.type === "eruption") {
      h.active -= dt;
      const hitbox = rect(h.x - h.w / 2, eruptionBaseY() - h.h, h.w, h.h);
      if (h.active > 0 && hit(hitbox, p)) damagePlayer(false, state.enemies.find(e => e.id === h.owner));
    }
  }
  state.bossHazards = (state.bossHazards ?? []).filter(h => h.life > 0 && h.y < worldBottom() + 120);
}

function eruptionBaseY() {
  return isUnderwaterStage() ? worldBottom() : GROUND_Y + 48;
}

function respawnBoss(e) {
  e.x = e.spawnX ?? 4400;
  e.y = e.spawnY ?? 416;
  e.vx = -Math.abs(e.vx || 120);
  syncEnemyFacing(e);
  e.vy = 0;
  e.grounded = false;
  e.alert = 1;
  e.allowDrop = false;
  e.jumpCooldown = 0.6;
  spawnBlockPoof(e.x + e.w / 2, e.y + e.h / 2);
}

function updateEnemyMovementOld(e, dt) {
  const p = state.player;
  const enemyCenter = e.x + e.w / 2;
  const playerCenter = p.x + p.w / 2;
  const dx = playerCenter - enemyCenter;
  const distance = Math.abs(dx);
  const sameLane = Math.abs((p.y + p.h) - (e.y + e.h)) < 180;
  const seesPlayer = sameLane && distance < 820;
  const hasGun = state.gun.holder === e.id;

  e.alert = seesPlayer || hasGun ? Math.min(1, e.alert + dt * 2.8) : Math.max(0, e.alert - dt * 0.9);
  e.trick = Math.max(0, e.trick - dt);

  if (e.alert > 0.25) {
    const prediction = p.vx * (hasGun ? 0.36 : 0.22);
    const chaseLeft = e.left - 360;
    const chaseRight = e.right + 360;
    const target = clamp(playerCenter + prediction, chaseLeft + e.w / 2, chaseRight - e.w / 2);
    const desiredDir = target < enemyCenter ? -1 : 1;
    const desiredDistance = hasGun ? 170 : 22;
    const tooCloseWithGun = hasGun && distance < 130;
    const dir = tooCloseWithGun ? -desiredDir : desiredDir;
    const huntSpeed = hasGun ? 230 : distance < 160 ? 360 : 300;

    if (!hasGun && distance < 120 && e.trick <= 0) {
      e.trick = 0.08 + Math.random() * 0.08;
    }

    if (e.trick > 0) {
      e.vx *= 0.55;
    } else if (hasGun && Math.abs(distance - desiredDistance) < 42) {
      e.vx *= 0.7;
    } else {
      e.vx += dir * 1450 * dt;
      e.vx = clamp(e.vx, -huntSpeed, huntSpeed);
    }

    const playerHigher = p.y + p.h < e.y + e.h - 22;
    const leapRange = distance < 260 && !hasGun;
    if (e.grounded && e.jumpCooldown <= 0 && (playerHigher || leapRange)) {
      e.vy = leapRange ? -620 : -500;
      e.vx += desiredDir * (leapRange ? 230 : 120);
      e.grounded = false;
      e.jumpCooldown = 0.55 + Math.random() * 0.35;
    }
  } else {
    const patrolDir = e.vx < 0 ? -1 : 1;
    e.vx += patrolDir * 120 * dt;
    e.vx = clamp(e.vx, -86, 86);
  }

  e.vy += GRAVITY * dt;
  moveEnemyAndCollide(e, dt);
  const minX = e.alert > 0.25 ? e.left - 360 : e.left;
  const maxX = e.alert > 0.25 ? e.right + 360 : e.right;
  if (e.x < minX) {
    e.x = minX;
    e.vx = Math.abs(e.vx) || 86;
  }
  if (e.x + e.w > maxX) {
    e.x = maxX - e.w;
    e.vx = -Math.abs(e.vx) || -86;
  }
  syncEnemyFacing(e);
}

function syncEnemyFacing(e) {
  if (Math.abs(e.vx ?? 0) > 4) e.facing = e.vx > 0 ? 1 : -1;
}

function moveEnemyAndCollide(e, dt) {
  const solid = platforms.concat(blocks.filter(b => !b.broken));
  const wasGrounded = e.grounded;
  const oldX = e.x;
  e.bumped = false;
  e.x += e.vx * dt;
  for (const s of solid) {
    if (!hit(e, s)) continue;
    if (e.vx > 0) e.x = s.x - e.w;
    if (e.vx < 0) e.x = s.x + s.w;
    e.bumped = true;
    e.vx *= -0.35;
  }
  if (wasGrounded && !e.allowDrop && !hasSupportUnder(e)) {
    e.x = oldX;
    e.vx = 0;
  }
  e.allowDrop = false;

  e.y += e.vy * dt;
  e.grounded = false;
  for (const s of solid) {
    if (!hit(e, s)) continue;
    if (e.vy > 0) {
      e.y = s.y - e.h;
      e.grounded = true;
    }
    if (e.vy < 0) e.y = s.y + s.h;
    e.vy = 0;
  }
}

function hasSupportUnder(e) {
  const probe = {
    x: e.x + 5,
    y: e.y + e.h + 3,
    w: e.w - 10,
    h: 10
  };
  return platforms.concat(blocks.filter(b => !b.broken)).some(s => hit(probe, s));
}

function hasGroundAhead(e, dir) {
  const probe = {
    x: e.x + (dir > 0 ? e.w + 12 : -24),
    y: e.y + e.h + 6,
    w: 18,
    h: 18
  };
  return platforms.concat(blocks.filter(b => !b.broken)).some(s => hit(probe, s));
}

function getGapAhead(e, dir) {
  const footY = e.y + e.h + 8;
  const startX = e.x + (dir > 0 ? e.w + 8 : -8);
  for (let d = 0; d <= 240; d += 24) {
    const probe = {
      x: startX + dir * d - 8,
      y: footY,
      w: 16,
      h: 24
    };
    if (platforms.concat(blocks.filter(b => !b.broken)).some(s => hit(probe, s))) return d;
  }
  return 999;
}

function hasWallAhead(e, dir) {
  const probe = {
    x: e.x + (dir > 0 ? e.w + 3 : -15),
    y: e.y + 8,
    w: 12,
    h: e.h - 14
  };
  return platforms.concat(blocks.filter(b => !b.broken)).some(s => hit(probe, s));
}

function updateGun(dt) {
  state.gun.cooldown = Math.max(0, state.gun.cooldown - dt);
  if (state.gun.holder !== null) return;
  const g = rect(state.gun.x - 16, state.gun.y - 14, 32, 28);
  if (hit(state.player, g)) addWeaponStock(state.gun.weaponPower ?? 1);
}

function getAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioCtx) audioCtx = new AudioContextClass();
  if (audioCtx.state === "suspended") {
    audioCtx.resume().then(() => {
      audioUnlocked = true;
    }).catch(() => {});
  } else {
    audioUnlocked = true;
  }
  return audioCtx;
}

// 効果音（audioMaster）とセリフ（voiceBus）は同じコンプレッサーを通る。BGM は bgmOut() から直接スピーカーへ
let voiceBus = null;
let bgmBus = null;
function audioOut() {
  const ctxAudio = getAudioContext();
  if (!ctxAudio) return null;
  if (!audioMaster) {
    audioMaster = ctxAudio.createGain();
    audioMaster.gain.value = soundEnabled ? Settings.level("sfx") : 0;
    const comp = ctxAudio.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 6;
    audioMaster.connect(comp);
    comp.connect(ctxAudio.destination);
    voiceBus = ctxAudio.createGain();
    voiceBus.gain.value = soundEnabled ? Settings.level("voice") : 0;
    voiceBus.connect(comp);
  }
  return audioMaster;
}

function voiceOut() {
  audioOut();
  return voiceBus;
}

function bgmOut() {
  const ctxAudio = getAudioContext();
  if (!ctxAudio) return null;
  if (!bgmBus) {
    bgmBus = ctxAudio.createGain();
    bgmBus.gain.value = Settings.level("bgm");
    bgmBus.connect(ctxAudio.destination);
  }
  return bgmBus;
}

function unlockAudio() {
  const ctxAudio = getAudioContext();
  if (!ctxAudio || audioUnlocked) return;
  try {
    const source = ctxAudio.createBufferSource();
    const gain = ctxAudio.createGain();
    source.buffer = ctxAudio.createBuffer(1, 1, ctxAudio.sampleRate);
    gain.gain.value = 0.0001;
    source.connect(gain);
    gain.connect(ctxAudio.destination);
    source.start(0);
    audioUnlocked = ctxAudio.state === "running";
  } catch (_) {}
  // せっていの音量をのせる（BGM のプログラム演奏にも）
  try { applyVolumes(); } catch (_) {}
}

function playTone({ start = 0, freq = 440, endFreq = freq, duration = 0.12, type = "sine", gain = 0.08, pan = 0 }) {
  const ctxAudio = getAudioContext();
  if (!ctxAudio) return;
  const now = ctxAudio.currentTime + start;
  const osc = ctxAudio.createOscillator();
  const vol = ctxAudio.createGain();
  const stereo = ctxAudio.createStereoPanner ? ctxAudio.createStereoPanner() : null;
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
  vol.gain.setValueAtTime(0.0001, now);
  vol.gain.exponentialRampToValueAtTime(gain, now + 0.015);
  vol.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  if (stereo) {
    stereo.pan.setValueAtTime(pan, now);
    osc.connect(vol).connect(stereo).connect(audioOut());
  } else {
    osc.connect(vol).connect(audioOut());
  }
  osc.start(now);
  osc.stop(now + duration + 0.03);
}

function playNoise({ duration = 0.12, gain = 0.05, filter = 1400, start = 0 }) {
  const ctxAudio = getAudioContext();
  if (!ctxAudio) return;
  const now = ctxAudio.currentTime + start;
  const sampleCount = Math.max(1, Math.floor(ctxAudio.sampleRate * duration));
  const buffer = ctxAudio.createBuffer(1, sampleCount, ctxAudio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < sampleCount; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / sampleCount);
  const source = ctxAudio.createBufferSource();
  source.buffer = buffer;
  const filt = ctxAudio.createBiquadFilter();
  filt.type = "bandpass";
  filt.frequency.setValueAtTime(filter, now);
  const vol = ctxAudio.createGain();
  vol.gain.setValueAtTime(gain, now);
  vol.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  source.connect(filt).connect(vol).connect(audioOut());
  source.start(now);
}

function playSfx(name, x = state?.player?.x ?? 0) {
  const now = performance.now();
  const minGap = name === "laser" ? 45 : name === "text" ? 34 : name === "enemyHit" || name === "explosion" ? 70 : 100;
  if ((lastSfxAt[name] ?? 0) + minGap > now) return;
  lastSfxAt[name] = now;
  const pan = clamp(((x - (state?.camera ?? 0)) / canvas.width) * 2 - 1, -0.8, 0.8);
  if (name === "laser") {
    // 光線銃を撃つ音：ピュンッ（スマホのスピーカーでも聞こえるように、少し低めの芯の音も足す）
    playTone({ freq: 920, endFreq: 1720, duration: 0.105, type: "triangle", gain: 0.11, pan });
    playTone({ start: 0.018, freq: 1850, endFreq: 1280, duration: 0.07, type: "sine", gain: 0.07, pan });
    playTone({ freq: 520, endFreq: 300, duration: 0.07, type: "square", gain: 0.035, pan });
  } else if (name === "enemyHit") {
    // 弾が敵に当たった音：バシッ
    playTone({ freq: 620, endFreq: 260, duration: 0.12, type: "square", gain: 0.1, pan });
    playTone({ freq: 1400, endFreq: 900, duration: 0.05, type: "triangle", gain: 0.07, pan });
    playNoise({ duration: 0.09, gain: 0.07, filter: 1900 });
  } else if (name === "stompBoost") {
    playTone({ freq: 760, endFreq: 1480, duration: 0.14, type: "triangle", gain: 0.06, pan });
    playTone({ start: 0.055, freq: 1220, endFreq: 2040, duration: 0.16, type: "sine", gain: 0.042, pan });
    playNoise({ duration: 0.07, gain: 0.018, filter: 3200 });
  } else if (name === "enemyDefeat") {
    playTone({ freq: 540, endFreq: 920, duration: 0.1, type: "sine", gain: 0.055, pan });
    playTone({ start: 0.075, freq: 820, endFreq: 1320, duration: 0.14, type: "triangle", gain: 0.05, pan });
    playNoise({ duration: 0.16, gain: 0.03, filter: 2600 });
  } else if (name === "playerDamage") {
    // ダメージを受けた音：ドスッ＋ピヨン
    playTone({ freq: 520, endFreq: 160, duration: 0.22, type: "sawtooth", gain: 0.11, pan });
    playTone({ freq: 140, endFreq: 60, duration: 0.18, type: "sine", gain: 0.16, pan });
    playNoise({ duration: 0.14, gain: 0.08, filter: 900 });
    playTone({ start: 0.12, freq: 900, endFreq: 1500, duration: 0.12, type: "triangle", gain: 0.05, pan });
  } else if (name === "death") {
    playTone({ freq: 440, endFreq: 180, duration: 0.32, type: "triangle", gain: 0.07, pan });
    playTone({ start: 0.11, freq: 320, endFreq: 120, duration: 0.3, type: "sine", gain: 0.052, pan });
  } else if (name === "respawn") {
    playTone({ freq: 640, endFreq: 980, duration: 0.18, type: "sine", gain: 0.055, pan });
    playTone({ start: 0.1, freq: 980, endFreq: 1480, duration: 0.22, type: "triangle", gain: 0.05, pan });
    playTone({ start: 0.22, freq: 1480, endFreq: 1980, duration: 0.18, type: "sine", gain: 0.035, pan });
  } else if (name === "stageClear") {
    playTone({ freq: 523, endFreq: 523, duration: 0.12, type: "triangle", gain: 0.052, pan });
    playTone({ start: 0.08, freq: 659, endFreq: 659, duration: 0.12, type: "triangle", gain: 0.052, pan });
    playTone({ start: 0.16, freq: 784, endFreq: 784, duration: 0.15, type: "triangle", gain: 0.054, pan });
    playTone({ start: 0.29, freq: 1046, endFreq: 1174, duration: 0.28, type: "sine", gain: 0.05, pan });
    playTone({ start: 0.29, freq: 1318, endFreq: 1568, duration: 0.28, type: "triangle", gain: 0.035, pan });
    playNoise({ start: 0.22, duration: 0.28, gain: 0.018, filter: 4600 });
  } else if (name === "pickup") {
    playTone({ freq: 760, endFreq: 1220, duration: 0.12, type: "sine", gain: 0.045, pan });
    playTone({ start: 0.08, freq: 1220, endFreq: 1640, duration: 0.12, type: "triangle", gain: 0.036, pan });
  } else if (name === "powerUp") {
    playTone({ freq: 523, endFreq: 659, duration: 0.12, type: "triangle", gain: 0.052, pan });
    playTone({ start: 0.07, freq: 659, endFreq: 784, duration: 0.13, type: "triangle", gain: 0.05, pan });
    playTone({ start: 0.14, freq: 784, endFreq: 1046, duration: 0.16, type: "sine", gain: 0.048, pan });
    playTone({ start: 0.24, freq: 1318, endFreq: 1568, duration: 0.18, type: "sine", gain: 0.034, pan });
    playNoise({ start: 0.08, duration: 0.24, gain: 0.018, filter: 5200 });
  } else if (name === "snackStar") {
    playTone({ freq: 784, endFreq: 1174, duration: 0.1, type: "triangle", gain: 0.07, pan });
    playTone({ start: 0.055, freq: 1174, endFreq: 1760, duration: 0.13, type: "sine", gain: 0.06, pan });
    playTone({ start: 0.14, freq: 1760, endFreq: 2637, duration: 0.16, type: "triangle", gain: 0.046, pan });
    playNoise({ start: 0.03, duration: 0.18, gain: 0.02, filter: 6200 });
  } else if (name === "equip") {
    playTone({ freq: 420, endFreq: 840, duration: 0.11, type: "triangle", gain: 0.045, pan });
    playTone({ start: 0.055, freq: 980, endFreq: 1380, duration: 0.12, type: "sine", gain: 0.04, pan });
  } else if (name === "jump") {
    playTone({ freq: 380, endFreq: 760, duration: 0.13, type: "sine", gain: 0.04, pan });
  } else if (name === "land") {
    playNoise({ duration: 0.07, gain: 0.03, filter: 420 });
  } else if (name === "gameStart") {
    // ぴょーん！と跳ねてキラキラ上がる、宇宙コメディっぽいスタート音
    playTone({ freq: 220, endFreq: 880, duration: 0.16, type: "square", gain: 0.05, pan: 0 });
    playTone({ start: 0.14, freq: 880, endFreq: 330, duration: 0.12, type: "triangle", gain: 0.05, pan: 0 });
    [523, 659, 784, 1046, 1318].forEach((f, i) =>
      playTone({ start: 0.24 + i * 0.06, freq: f, endFreq: f, duration: 0.12, type: "square", gain: 0.04, pan: (i - 2) * 0.2 }));
    playTone({ start: 0.56, freq: 1568, endFreq: 3136, duration: 0.32, type: "triangle", gain: 0.05, pan: 0 });
    playTone({ start: 0.56, freq: 2093, endFreq: 2093, duration: 0.36, type: "sine", gain: 0.035, pan: 0 });
    playNoise({ start: 0.52, duration: 0.36, gain: 0.025, filter: 6000 });
  } else if (name === "cursor") {
    // 十字キーでカーソルを動かしたとき：ピッ
    playTone({ freq: 1320, endFreq: 1320, duration: 0.05, type: "square", gain: 0.05, pan: 0 });
    playTone({ start: 0.012, freq: 2640, endFreq: 2640, duration: 0.03, type: "sine", gain: 0.03, pan: 0 });
  } else if (name === "decide") {
    // 決定：ピコッ（上がる2音）
    playTone({ freq: 988, endFreq: 988, duration: 0.06, type: "square", gain: 0.055, pan: 0 });
    playTone({ start: 0.06, freq: 1480, endFreq: 1480, duration: 0.11, type: "square", gain: 0.055, pan: 0 });
    playTone({ start: 0.06, freq: 2960, endFreq: 2960, duration: 0.08, type: "sine", gain: 0.025, pan: 0 });
  } else if (name === "cancel") {
    // キャンセル：ポワン（下がる2音）
    playTone({ freq: 880, endFreq: 880, duration: 0.06, type: "triangle", gain: 0.07, pan: 0 });
    playTone({ start: 0.06, freq: 587, endFreq: 440, duration: 0.14, type: "triangle", gain: 0.07, pan: 0 });
  } else if (name === "page") {
    // 会話を送るとき：ポッ
    playTone({ freq: 740, endFreq: 1100, duration: 0.06, type: "sine", gain: 0.06, pan: 0 });
    playTone({ start: 0.02, freq: 1480, endFreq: 1480, duration: 0.04, type: "triangle", gain: 0.025, pan: 0 });
  } else if (name === "confirm") {
    playTone({ freq: 660, endFreq: 660, duration: 0.07, type: "triangle", gain: 0.045, pan: 0 });
    playTone({ start: 0.06, freq: 990, endFreq: 990, duration: 0.1, type: "triangle", gain: 0.042, pan: 0 });
  } else if (name === "text") {
    playTone({ freq: 880, endFreq: 820, duration: 0.03, type: "triangle", gain: 0.014, pan: 0 });
  } else if (name === "whoosh") {
    playNoise({ duration: 0.34, gain: 0.03, filter: 900 });
    playTone({ freq: 240, endFreq: 720, duration: 0.3, type: "sine", gain: 0.02, pan: 0 });
  } else if (name === "combo") {
    playTone({ freq: 880, endFreq: 1320, duration: 0.08, type: "square", gain: 0.03, pan });
    playTone({ start: 0.06, freq: 1320, endFreq: 1760, duration: 0.1, type: "triangle", gain: 0.035, pan });
  } else if (name === "explosion") {
    playNoise({ duration: 0.3, gain: 0.07, filter: 520 });
    playTone({ freq: 160, endFreq: 48, duration: 0.28, type: "sawtooth", gain: 0.05, pan });
  } else if (name === "bossDown") {
    playNoise({ duration: 0.9, gain: 0.09, filter: 380 });
    playTone({ freq: 220, endFreq: 36, duration: 0.9, type: "sawtooth", gain: 0.07, pan });
    playTone({ start: 0.05, freq: 880, endFreq: 1760, duration: 0.5, type: "sine", gain: 0.04, pan });
  } else if (name === "break") {
    playNoise({ duration: 0.1, gain: 0.04, filter: 1500 });
    playTone({ freq: 300, endFreq: 150, duration: 0.09, type: "square", gain: 0.03, pan });
  } else if (name === "keyGet" || name === "unlock") {
    playTone({ freq: 1046, endFreq: 1046, duration: 0.09, type: "triangle", gain: 0.05, pan });
    playTone({ start: 0.08, freq: 1318, endFreq: 1318, duration: 0.09, type: "triangle", gain: 0.05, pan });
    playTone({ start: 0.16, freq: 1568, endFreq: 2093, duration: 0.22, type: "sine", gain: 0.05, pan });
    if (name === "unlock") playNoise({ start: 0.02, duration: 0.2, gain: 0.03, filter: 3000 });
  } else if (name === "locked") {
    playTone({ freq: 196, endFreq: 185, duration: 0.09, type: "square", gain: 0.04, pan });
    playTone({ start: 0.11, freq: 185, endFreq: 165, duration: 0.14, type: "square", gain: 0.04, pan });
  } else if (name === "switch") {
    playTone({ freq: 520, endFreq: 1040, duration: 0.08, type: "square", gain: 0.04, pan });
    playTone({ start: 0.07, freq: 780, endFreq: 1560, duration: 0.12, type: "triangle", gain: 0.045, pan });
  } else if (name === "spring") {
    playTone({ freq: 220, endFreq: 1320, duration: 0.24, type: "sine", gain: 0.06, pan });
    playTone({ start: 0.02, freq: 330, endFreq: 1760, duration: 0.2, type: "triangle", gain: 0.03, pan });
  }
}

// 十字キーでねらう向き（8方向）。左右だけなら向いている方、上下は空中でも地上でもOK。
// 地上で下だけを押したときは、足もとではなく前ななめ下をねらう
function playerAimAngle(p, dxInput = 0) {
  const up = keys.has("ArrowUp") || keys.has("KeyW") || gamepadState.up;
  const down = keys.has("ArrowDown") || keys.has("KeyS") || gamepadState.down;
  const vy = up && !down ? -1 : down && !up ? 1 : 0;
  let vx = dxInput;
  if (!vx && !vy) vx = p.facing || 1;
  if (!vx && vy > 0 && p.grounded && !p.swimming) vx = p.facing || 1;
  return Math.atan2(vy, vx);
}

// 銃をにぎる肩の位置と、銃口の位置
function playerShoulder(p) {
  if (p.crouch) return { x: p.x + p.w / 2 + (p.facing || 1) * 22, y: p.y + 12 };
  return { x: p.x + p.w / 2 + (p.facing || 1) * 4, y: p.y + 30 };
}

function playerMuzzle(p) {
  if (isRideable(state.weaponPower) && hasEquippedWeapon()) {
    if (state.weaponPower === FIGHTER_POWER) return { x: p.x + p.w / 2 + (p.facing || 1) * 60, y: p.y + p.h / 2 };
    return { x: p.x + p.w / 2 + (p.facing || 1) * 30, y: p.y + p.h - 150 };
  }
  const s = playerShoulder(p);
  const a = p.aim ?? (p.facing < 0 ? Math.PI : 0);
  return { x: s.x + Math.cos(a) * 30, y: s.y + Math.sin(a) * 30 };
}

function shootBeam(owner, x, y, dir, aimAngle = null) {
  if (owner === "player" && !hasEquippedWeapon()) return;
  const stage = owner === "player" ? weaponStage() : enemyWeaponStage(owner);
  const beamSpeed = owner === "player" ? stage.speed : stage.speed * 0.5;
  const base = aimAngle ?? (dir >= 0 ? 0 : Math.PI);
  playSfx("laser", x);
  if (owner === "player") FX.muzzle(x, y, Math.cos(base) >= -0.01 ? 1 : -1, stage.colors);
  if (stage.pattern === "homing" && owner === "player" && isRideable(state.weaponPower)) {
    shootMechMissile(x, y, dir, stage);
    return;
  }
  // ふつうの敵の弾は、まっすぐ1発（しゃがめばよけられる）。ボスはいろいろな撃ち方
  const plainEnemy = owner !== "player" && !state.enemies.find(e => e.id === owner)?.boss;
  if (stage.pattern === "homing" && !plainEnemy) {
    shootHomingMissiles(owner, x, y, dir, stage);
    return;
  }
  const angles = plainEnemy ? [base] : weaponAngles(stage, dir, base);
  for (let i = 0; i < angles.length; i++) {
    const angle = angles[i];
    const side = i - (angles.length - 1) / 2;
    const offset = stage.pattern === "forward" ? side * stage.spread : 0;
    // ならんで出る弾は、ねらう向きに対して横にずらす
    const offsetX = -Math.sin(base) * offset;
    const offsetY = Math.cos(base) * offset;
    state.beams.push({
      owner,
      x: x + offsetX,
      y: y + offsetY,
      w: stage.width,
      h: stage.height,
      vx: Math.cos(angle) * beamSpeed,
      vy: Math.sin(angle) * beamSpeed,
      angle,
      life: stage.range / beamSpeed,
      damage: stage.damage,
      colors: stage.colors,
      power: owner === "player" ? state.weaponPower : stage.damage,
      pierce: stage.pierce ?? 0,
      wave: stage.pattern === "wave" ? side : 0,
      distance: 0,
      range: stage.range
    });
  }
}

// 武器がないときの空気鉄砲（水中だけ）。少ししか飛ばず、酸素をつかう。当たった敵はひよるだけ
const AIR_BUBBLE_OXYGEN = 6;
function shootAirBubble(p) {
  if ((state.oxygen ?? MAX_OXYGEN) < AIR_BUBBLE_OXYGEN + 2) return;
  state.oxygen -= AIR_BUBBLE_OXYGEN;
  state.gun.cooldown = 0.45;
  const a = p.aim ?? (p.facing < 0 ? Math.PI : 0);
  const cx = p.x + p.w / 2 + Math.cos(a) * 34;
  const cy = p.y + p.h / 2 + Math.sin(a) * 34;
  state.beams.push({
    owner: "player", bubble: true,
    x: cx - 15, y: cy - 15, w: 30, h: 30,
    vx: Math.cos(a) * 420, vy: Math.sin(a) * 420, angle: 0,
    life: 1, damage: 0, colors: ["#e8fbff", "#9ee8ff", "#ffffff"], power: 0,
    pierce: 0, wave: 0, distance: 0, range: 230
  });
  playTone({ start: 0, freq: 520, endFreq: 260, duration: 0.14, type: "sine", gain: 0.035 });
}

function drawAirBubble(b) {
  const k = 1 - b.distance / b.range;
  const r = 13 + (1 - k) * 5;
  ctx.globalAlpha = 0.55 + k * 0.4;
  const g = ctx.createRadialGradient(-4, -4, 2, 0, 0, r);
  g.addColorStop(0, "rgba(255, 255, 255, 0.95)");
  g.addColorStop(0.6, "rgba(190, 240, 255, 0.35)");
  g.addColorStop(1, "rgba(120, 210, 255, 0.6)");
  ctx.fillStyle = g;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(-r * 0.4, -r * 0.4, r * 0.22, 0, Math.PI * 2);
  ctx.fill();
}

function shootHomingMissiles(owner, x, y, dir, stage) {
  const visibleEnemies = state.enemies
    .filter(e => e.alive && e.x + e.w > state.camera - 60 && e.x < state.camera + canvas.width + 60)
    .sort((a, b) => Math.abs((a.x + a.w / 2) - x) - Math.abs((b.x + b.w / 2) - x));
  const targets = visibleEnemies.length ? visibleEnemies : state.enemies.filter(e => e.alive).slice(0, 1);
  const count = Math.max(stage.count, targets.length);
  for (let i = 0; i < count; i++) {
    const target = targets[i % Math.max(1, targets.length)] ?? null;
    const launchAngle = -Math.PI / 2 + (i - (count - 1) / 2) * 0.08;
    state.beams.push({
      owner,
      homing: true,
      targetId: target?.id ?? null,
      x: x + dir * 10,
      y: y - 22,
      w: stage.width,
      h: stage.height,
      vx: Math.cos(launchAngle) * stage.speed * 0.45 + dir * 120,
      vy: Math.sin(launchAngle) * stage.speed * 0.45,
      angle: launchAngle,
      life: 2.8,
      damage: stage.damage,
      colors: stage.colors,
      power: owner === "player" ? state.weaponPower : stage.damage,
      explosion: stage.explosion ?? 76,
      distance: 0,
      range: stage.range
    });
  }
}

function weaponAngles(stage, dir, base = null) {
  const facing = base ?? (dir >= 0 ? 0 : Math.PI);
  const spreadAngles = (count, arc) => Array.from({ length: count }, (_, i) => facing + (i - (count - 1) / 2) * arc);
  if (stage.pattern === "radial") return Array.from({ length: stage.count }, (_, i) => i * Math.PI * 2 / stage.count);
  if (stage.pattern === "both") return [facing, facing + Math.PI];
  if (stage.pattern === "bothSpread") return [facing - 0.16, facing + 0.16, facing + Math.PI - 0.16, facing + Math.PI + 0.16];
  if (stage.pattern === "fan") return spreadAngles(stage.count, 0.16);
  if (stage.pattern === "cross") return [facing, facing - 0.36, facing + 0.36, facing - Math.PI / 2, facing + Math.PI / 2, facing + Math.PI];
  if (stage.pattern === "crown") return [facing, ...spreadAngles(stage.count - 1, 0.13).map(a => a - 0.45)];
  if (stage.pattern === "wave") return spreadAngles(stage.count, 0.08);
  if (stage.pattern === "spread") return spreadAngles(stage.count, 0.09);
  return spreadAngles(stage.count, 0);
}

function weaponStage(power = state.weaponPower) {
  return WEAPON_STAGES[clamp(Math.floor(power), 1, MAX_WEAPON_POWER) - 1];
}

function weaponAttribute(power = state?.weaponPower ?? 1) {
  const value = clamp(Math.floor(power), 1, MAX_WEAPON_POWER);
  if (value >= MECH_POWER) return "mech";
  return value <= WEAPON_ATTRIBUTE_SIZE ? "moon" : "star";
}

function weaponRank(power = state?.weaponPower ?? 1) {
  const value = clamp(Math.floor(power), 1, MAX_WEAPON_POWER);
  if (value >= MECH_POWER) return value - MECH_POWER + 1;
  return ((value - 1) % WEAPON_ATTRIBUTE_SIZE) + 1;
}

// 月の武器は 🌙、星の武器は ⭐。レベルは月・星それぞれ 1〜8 で数える
function weaponLevelLabel(power = state?.weaponPower ?? 1, space = false) {
  if (Math.floor(power) === FIGHTER_POWER) return "✈MAX";
  if (isMechPower(Math.floor(power))) return `🤖Lv${space ? " " : ""}${Math.floor(power) - MECH_POWER + 1}`;
  return `${weaponAttribute(power) === "moon" ? "🌙" : "⭐"}Lv${space ? " " : ""}${weaponRank(power)}`;
}

// 合成できる組み合わせ：同じ武器どうし（最高レベル以外）、または 🌙Lv8 と ⭐Lv8（ロボットになる）
function fusionResult(a, b) {
  if (!a || !b) return null;
  if ((a === MOON_TOP && b === STAR_TOP) || (a === STAR_TOP && b === MOON_TOP)) return MECH_POWER;
  // ロボット2台を合体させると、戦闘機になる
  if (isMechPower(a) && isMechPower(b)) return FIGHTER_POWER;
  if (a === b) return nextFusionPower(a);
  return null;
}


function drawWeaponMark(x, y, size, power) {
  if (Math.floor(power) >= MECH_POWER) {
    drawWeaponMark(x - size * 0.3, y, size * 0.75, 1);
    drawWeaponMark(x + size * 0.35, y, size * 0.75, 16);
    return;
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.lineWidth = Math.max(2, size * 0.14);
  ctx.strokeStyle = "#ffffff";
  if (weaponAttribute(power) === "moon") {
    ctx.fillStyle = "#ffd85a";
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.5, 0.25 * Math.PI, 1.75 * Math.PI);
    ctx.arc(size * 0.24, 0, size * 0.4, 1.68 * Math.PI, 0.32 * Math.PI, true);
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
  } else {
    ctx.fillStyle = "#ff7fb0";
    drawFivePointStar(0, 0, size * 0.55);
    ctx.stroke();
    ctx.fill();
  }
  ctx.restore();
}

function nextFusionPower(power) {
  const value = clamp(Math.floor(power), 1, MAX_WEAPON_POWER);
  if (value >= MECH_POWER) return null;
  if (weaponRank(value) >= WEAPON_ATTRIBUTE_SIZE) return null;
  return value + 1;
}

function canFusePower(power) {
  return nextFusionPower(power) !== null || power === MOON_TOP || power === STAR_TOP || isMechPower(power);
}

// ---------- 武器の出かた ----------
// ・ワールドごとに、出るレベルの上限がある（合成してようやく目標のレベルに届くように）
//   ワールド1：Lv1 だけ → 集めて合成で Lv3 / ワールド2：〜Lv3 → Lv5 / ワールド3：〜Lv5 → Lv7
//   ワールド4：〜Lv7 → 月Lv8 / ワールド5：月〜8・星〜7 → 星Lv8（ロボット） / ワールド6：〜Lv8
// ・Lv2 より上は「一度でも合成して作った（持った）ことのある武器」だけが出る（つくった武器ずかん）
// ・レベルが高いほど出にくい。持っている武器と同じものが出やすい
const DROP_CAP = { moon: [1, 3, 5, 7, 8, 8], star: [1, 3, 5, 7, 7, 8] };
const DEX_POWERS = [...Array.from({ length: STAR_TOP }, (_, i) => i + 1), MECH_POWER, FIGHTER_POWER];

function weaponDex() {
  const d = Story.data;
  if (!d.dex || typeof d.dex !== "object") d.dex = {};
  return d.dex;
}

function markDex(power) {
  const v = Math.floor(power ?? 0);
  if (!v || !DEX_POWERS.includes(v)) return;
  const dex = weaponDex();
  if (dex[v]) return;
  dex[v] = true;
  Story.persist();
}

function dexCount() {
  const dex = weaponDex();
  return DEX_POWERS.filter(p => dex[p]).length;
}

function dropWorld() {
  return clamp(courses[currentCourse]?.worldIndex ?? 0, 0, 5);
}

function dropAllowed(power) {
  if (!power || power > STAR_TOP) return false;
  const attr = weaponAttribute(power);
  const rank = weaponRank(power);
  return rank <= DROP_CAP[attr][dropWorld()] && (rank === 1 || !!weaponDex()[power]);
}

// いちばん多く持っている武器（同じ数なら、そうび中の武器）
function favoriteWeapon() {
  const counts = {};
  for (const p of state?.inventoryItems ?? []) if (p && p <= STAR_TOP) counts[p] = (counts[p] ?? 0) + 1;
  let best = null;
  for (const [p, n] of Object.entries(counts)) {
    const v = Number(p);
    if (!best || n > counts[best] || (n === counts[best] && v === state.weaponPower)) best = v;
  }
  return best;
}

function pickDropPower(attrOnly = null) {
  const fav = favoriteWeapon();
  // 半分くらいは、持っている武器と同じもの（合成しやすいように）
  if (fav && dropAllowed(fav) && (!attrOnly || weaponAttribute(fav) === attrOnly) && Math.random() < 0.5) return fav;
  const list = [];
  for (const attr of attrOnly ? [attrOnly] : ["moon", "star"]) {
    for (let rank = 1; rank <= WEAPON_ATTRIBUTE_SIZE; rank++) {
      const power = attr === "star" ? WEAPON_ATTRIBUTE_SIZE + rank : rank;
      if (dropAllowed(power)) list.push({ power, weight: Math.pow(0.5, rank - 1) });
    }
  }
  const total = list.reduce((s, it) => s + it.weight, 0);
  let roll = Math.random() * total;
  for (const it of list) {
    roll -= it.weight;
    if (roll <= 0) return it.power;
  }
  return attrOnly === "star" ? WEAPON_ATTRIBUTE_SIZE + 1 : 1;
}

// 敵が自分で持っていた銃：たまにだけ落とす。落とすのは、今のワールドで出てよい武器（同じ月・星の種類）
// ぴょんぴーからうばった銃は、そのまま返す
// 1-1 では、合成の練習部屋で はじめて合成するまで、新しい光線銃は手に入らない
// （「2つそろった、合成しましょう」は、練習部屋に入ってから）
function firstWeaponsLocked() {
  return currentCourse === 0 && !courses[0]?.tutorial && !fuseGuideDone();
}

// 1-1 の外の道の敵は、練習部屋で合成するまで光線銃を持たない
function unarmFirstStageEnemies() {
  if (!firstWeaponsLocked()) return;
  for (const e of state.enemies) {
    if (e.boss || e.stolenWeapon || state.gun.holder === e.id) continue;
    e.weaponPower = 0;
  }
}

function enemyDropPower(e) {
  const power = e.weaponPower ?? 0;
  if (!power) return 0;
  if (e.stolenWeapon) return power;
  if (firstWeaponsLocked()) return 0;
  if (!e.boss && Math.random() > 0.35) return 0;
  const attr = power <= STAR_TOP ? weaponAttribute(power) : null;
  return pickDropPower(attr);
}

function randomWeaponDropPower() {
  return pickDropPower();
}

function oldRandomWeaponDropPower() {
  const totalSnacks = state ? state.kakiTotal + state.peaTotal : 0;
  const balance = totalSnacks > 0 ? 1 : 0;
  const difficulty = courses[currentCourse]?.difficulty ?? 1;
  // まず月か星かを決める（最初のステージから半々で出る）。レベルの上限は月も星も同じ
  const star = Math.random() < 0.5;
  // 出るレベルの上限：はじめは Lv1〜2、先へ進むほど上がる（最後のワールドで Lv8）
  const cap = clamp(1 + Math.floor(difficulty / 4), 2, WEAPON_ATTRIBUTE_SIZE);
  const weights = Array.from({ length: cap }, (_, i) => {
    const rank = i + 1;
    const curve = Math.max(0.03, 1.15 - rank * 0.13);
    const unlock = rank <= 5 ? 1 : Math.max(0.08, (difficulty - rank + 6) / 14);
    const snackBonus = 1 + balance * 0.24 + totalSnacks * 0.001;
    return { power: star ? WEAPON_ATTRIBUTE_SIZE + rank : rank, weight: curve * unlock * snackBonus };
  });
  const total = weights.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * total;
  for (const item of weights) {
    roll -= item.weight;
    if (roll <= 0) return item.power;
  }
  return 1;
}

function addWeaponStock(power = 1) {
  if (totalInventoryItems() >= MAX_INVENTORY_ITEMS) {
    showItemFullPrompt();
    return false;
  }
  const powerValue = clamp(Math.floor(power), 1, MAX_WEAPON_POWER);
  ensureInventoryItems();
  const emptyIndex = state.inventoryItems.findIndex(item => !item);
  if (emptyIndex < 0) {
    showItemFullPrompt();
    return false;
  }
  state.inventoryItems[emptyIndex] = powerValue;
  markDex(powerValue);
  syncWeaponInventoryFromItems();
  playSfx("powerUp", state.player.x + state.player.w / 2);
  if (state.weaponPower > 0 && !state.weaponInventory[state.weaponPower - 1]) {
    state.weaponPower = 0;
    state.gun.holder = "inventory";
  }
  state.inventorySelection = emptyIndex;
  ensureInventorySelectionVisible();
  if (!hasEquippedWeapon()) {
    state.weaponPower = powerValue;
    state.gun.holder = "player";
  } else if (state.gun.holder === null) {
    state.gun.holder = "inventory";
  }
  spawnBlockPoof(state.player.x + state.player.w / 2, state.player.y + 18);
  FX.weaponGet(state.player.x + state.player.w / 2, state.player.y + 10, `${weaponName(powerValue)} ${weaponLevelLabel(powerValue)}`, false);
  Chat.event("weaponGet", weaponName(powerValue));
  return true;
}

function equipWeapon(index) {
  const power = index + 1;
  const equippedSlot = firstInventoryIndexByPower(power);
  if (equippedSlot < 0) return;
  state.weaponPower = power;
  state.gun.holder = "player";
  state.inventorySelection = equippedSlot;
  ensureInventorySelectionVisible();
  playSfx("equip", state.player.x + state.player.w / 2);
  spawnBlockPoof(state.player.x + state.player.w / 2, state.player.y + 18);
}

function hasEquippedWeapon() {
  return state.weaponPower > 0 && state.gun.holder === "player" && (state.weaponInventory[state.weaponPower - 1] ?? 0) > 0;
}

function removeEquippedWeaponForSteal() {
  const index = clamp(state.weaponPower, 1, MAX_WEAPON_POWER) - 1;
  const stolenPower = state.weaponPower;
  ensureInventoryItems();
  const itemIndex = firstInventoryIndexByPower(stolenPower);
  if (itemIndex >= 0) state.inventoryItems[itemIndex] = null;
  syncWeaponInventoryFromItems();
  state.weaponPower = 0;
  state.inventorySelection = 0;
  return stolenPower;
}

function fuseWeapons(power) {
  const index = clamp(Math.floor(power), 1, MAX_WEAPON_POWER) - 1;
  if (!canFusePower(index + 1) || state.weaponInventory[index] < 2) return;
  const slots = inventorySlots();
  const first = slots.findIndex(slot => slot?.power === index + 1);
  const second = slots.findIndex((slot, i) => i !== first && slot?.power === index + 1);
  if (first >= 0 && second >= 0) fuseInventoryItems(first, second);
}

function inventorySlots() {
  ensureInventoryItems();
  return state.inventoryItems.map((power, index) => power ? { power, copy: index } : null);
}

function ensureInventoryItems() {
  if (!state.inventoryItems) {
    state.inventoryItems = [];
    for (let power = 1; power <= MAX_WEAPON_POWER; power++) {
      const count = state.weaponInventory[power - 1] ?? 0;
      for (let i = 0; i < count; i++) state.inventoryItems.push(power);
    }
    while (state.inventoryItems.length < MAX_INVENTORY_ITEMS) state.inventoryItems.push(null);
  }
  if (state.inventoryItems.length < MAX_INVENTORY_ITEMS) {
    state.inventoryItems.push(...Array(MAX_INVENTORY_ITEMS - state.inventoryItems.length).fill(null));
  }
}

function syncWeaponInventoryFromItems() {
  ensureInventoryItems();
  state.weaponInventory = Array(MAX_WEAPON_POWER).fill(0);
  for (const power of state.inventoryItems) {
    if (power) state.weaponInventory[power - 1] += 1;
  }
}

// せいとん後のならび：月（Lv1→8）、星（Lv1→8）、ロボット・戦闘機の順。
// 入りきるときは、種類ごとに新しい段から始めて見やすくする
function sortedInventoryLayout(items = state.inventoryItems) {
  const list = items.filter(Boolean).sort((a, b) => a - b);
  const groups = [
    list.filter(p => weaponAttribute(p) === "moon"),
    list.filter(p => weaponAttribute(p) === "star"),
    list.filter(p => weaponAttribute(p) === "mech")
  ].filter(g => g.length);
  const rowed = [];
  groups.forEach((g, i) => {
    if (i > 0) while (rowed.length % 5) rowed.push(null);
    rowed.push(...g);
  });
  const out = rowed.length <= MAX_INVENTORY_ITEMS ? rowed : list;
  return [...out, ...Array(MAX_INVENTORY_ITEMS - out.length).fill(null)];
}

function compactInventoryItems() {
  ensureInventoryItems();
  state.inventoryItems = sortedInventoryLayout();
  syncWeaponInventoryFromItems();
  state.inventoryScroll = 0;
  state.inventorySelection = Math.min(firstInventoryIndexByPower(state.weaponPower), MAX_INVENTORY_ITEMS - 1);
  if (state.inventorySelection < 0) state.inventorySelection = 0;
  state.inventoryGrab = null;
  state.fusionPrompt = null;
  state.inventoryMessage = performance.now() + 1400;
  state.inventoryMessageLabel = t("sorted");
}

function runInventorySort() {
  if (fuseLessonOn()) return fuseLessonNudge();

  ensureInventoryItems();
  const items = state.inventoryItems.filter(Boolean);
  const compacted = sortedInventoryLayout();
  const alreadyCompact = state.inventoryItems.every((item, index) => item === compacted[index]);
  if (items.length === 0) {
    state.inventorySortToastLabel = "整理するものなし";
    state.inventorySortComment = "ぴょんぴー「いや整理するもんがないでないか！」";
  } else if (alreadyCompact) {
    state.inventorySortToastLabel = "整理済み";
    state.inventorySortComment = "ぴょんぴー「いや、もう整理されとるじょ！」";
  } else {
    compactInventoryItems();
    state.inventorySortToastLabel = "整理されました";
    state.inventorySortComment = "ぴょんぴー「わあ、きれいに並んだな！」";
  }
  state.inventorySortFlash = performance.now() + 220;
  state.inventorySortCommentUntil = performance.now() + 2200;
  state.inventoryMessage = performance.now() + 1400;
  state.inventoryMessageLabel = state.inventorySortToastLabel;
  playSfx("decide");
}

function totalInventoryItems(inventory = state.inventoryItems) {
  ensureInventoryItems();
  return inventory.filter(Boolean).length;
}

function firstInventoryIndexByPower(power) {
  ensureInventoryItems();
  return state.inventoryItems.findIndex(item => item === power);
}

function fuseInventoryItems(fromIndex, toIndex) {
  ensureInventoryItems();
  const power = state.inventoryItems[fromIndex];
  const nextPower = fusionResult(power, state.inventoryItems[toIndex]);
  if (!power || !nextPower) return;
  state.inventoryItems[fromIndex] = null;
  state.inventoryItems[toIndex] = nextPower;
  markDex(nextPower);
  syncWeaponInventoryFromItems();
  if (state.weaponPower > 0 && !state.weaponInventory[state.weaponPower - 1]) {
    state.weaponPower = 0;
    state.gun.holder = "inventory";
  }
  state.inventorySelection = toIndex;
  ensureInventorySelectionVisible();
  spawnBlockPoof(state.player.x + state.player.w / 2, state.player.y - 10);
  state.score += 25 * nextPower;
  if (!fuseGuideDone()) {
    Story.data.seen.fuseGuide = true;
    Story.persist();
    state.inventorySortComment = "ぴょんぴー「合成できたじょ！ 同じ武器を2つ重ねるたびに、どんどん強うなるけんな。いらん武器は X ですてられるじょ。」";
    state.inventorySortCommentUntil = performance.now() + 6000;
    state.fuseLessonJustDone = true;
  }
  playSfx("powerUp", state.player.x);
  FX.flash("#ffd1ed", 0.3, 0.3);
  FX.firework(canvas.width / 2, canvas.height / 2 - 40, FX.PASTEL);
  Chat.event("fuse", weaponName(nextPower));
  if (isRideable(nextPower)) {
    // ロボット完成（または戦闘機に進化）：そのまま乗りこむ
    equipWeapon(nextPower - 1);
    if (nextPower === MECH_POWER) state.mechBoardPending = true;
    if (nextPower === FIGHTER_POWER) state.fighterTransformPending = true;
    FX.flash("#ffffff", 0.6, 0.5);
    FX.shake(0.4);
  }
}

function showItemFullPrompt() {
  state.itemFullPrompt = 2.8;
}

function clampInventoryScroll() {
  const maxScroll = Math.max(0, MAX_INVENTORY_ITEMS - VISIBLE_INVENTORY_ITEMS);
  const rowScroll = Math.floor((state.inventoryScroll ?? 0) / 5) * 5;
  state.inventoryScroll = clamp(rowScroll, 0, maxScroll);
}

function ensureInventorySelectionVisible() {
  state.inventorySelection = clamp(state.inventorySelection, 0, MAX_INVENTORY_ITEMS - 1);
  if (state.inventorySelection < state.inventoryScroll) {
    state.inventoryScroll = Math.floor(state.inventorySelection / 5) * 5;
  }
  if (state.inventorySelection >= state.inventoryScroll + VISIBLE_INVENTORY_ITEMS) {
    state.inventoryScroll = Math.floor(state.inventorySelection / 5) * 5 - 10;
  }
  clampInventoryScroll();
}

function strongestWeaponPower(inventory = state.weaponInventory) {
  while (inventory.length < MAX_WEAPON_POWER) inventory.push(0);
  for (let i = MAX_WEAPON_POWER - 1; i >= 0; i--) {
    if ((inventory[i] ?? 0) > 0) return i + 1;
  }
  return 0;
}

function previewWeaponPowerAfterPickup(power = 1) {
  const inventory = [...state.weaponInventory];
  const index = clamp(Math.floor(power), 1, MAX_WEAPON_POWER) - 1;
  inventory[index] += 1;
  return strongestWeaponPower(inventory);
}

function weaponInventoryLabel() {
  return state.weaponInventory
    .map((count, index) => count > 0 ? `${weaponLevelLabel(index + 1)}x${count}` : null)
    .filter(Boolean)
    .join(" ");
}

function t(key) {
  return (TEXT[language] ?? TEXT.ja)[key] ?? TEXT.ja[key] ?? key;
}

function weaponName(power = state?.weaponPower ?? 1) {
  if (!power || power < 1) return t("unequipped");
  const index = clamp(Math.floor(power), 1, MAX_WEAPON_POWER) - 1;
  return language === "ja" ? WEAPON_NAMES_JA[index] : WEAPON_STAGES[index].name;
}

function weaponLore(power) {
  const attribute = weaponAttribute(power) === "moon" ? "moon" : "star";
  return `${weaponName(power)} [${attribute}]` + (weaponAttribute(power) === "moon" ? t("loreClassic") : t("loreExperimental"));
}

function pyonpyWeaponComment(power) {
  return language === "ja"
    ? `ぴょんぴー「${WEAPON_COMMENTS_JA[clamp(Math.floor(power), 1, WEAPON_COMMENTS_JA.length) - 1] ?? weaponName(power) + t("commentClassic")}」`
    : `Pyon-P: "${weaponName(power)}${power <= 5 ? t("commentClassic") : t("commentExperimental")}"`;
}

function setLanguage(nextLanguage) {
  language = nextLanguage === "en" ? "en" : "ja";
  localStorage.setItem("pyonpLanguage", language);
  applyLanguage();
  updateHud();
  draw();
}

function setControlMode(nextMode, manual = false) {
  controlMode = nextMode === "ipad" ? "ipad" : nextMode === "pc" ? "pc" : "iphone";
  if (manual) Handheld.rememberManual(controlMode);
  document.body.dataset.controlMode = controlMode === "pc" ? "pc" : "mobile";
  document.body.dataset.controlDevice = controlMode;
  controlModeButtons.forEach(button => button.classList.toggle("active", button.dataset.controlMode === controlMode));
  Handheld.layout();
  Chat.layout();
  updateHud();
}

function applyLanguage() {
  document.documentElement.lang = language;
  document.title = t("title");
  if (brandLogoEl) {
    brandLogoEl.src = language === "en" ? "assets/moonians-logo-English.png" : "assets/moonians-logo.png";
    brandLogoEl.alt = language === "en" ? "Moonians" : "ムーニアンズ";
  }
  if (pendingCourseStart) overlay.querySelector("h1").textContent = `Stage ${stageLabel()}`;
  else if (state?.mode !== "ended") overlay.querySelector("h1").textContent = t("title");
  overlay.querySelector("p").textContent = pendingCourseStart ? t("next") : t("controls");
  startButton.textContent = t("start");
  if (stageLabelEl) stageLabelEl.firstChild.textContent = `${t("stage")} `;
  if (kakiLabelEl) kakiLabelEl.firstChild.textContent = `${t("kaki")} `;
  if (peaLabelEl) peaLabelEl.firstChild.textContent = `${t("pea")} `;
  if (scoreLabelEl) scoreLabelEl.firstChild.textContent = `${t("score")} `;
  if (timeLabelEl) timeLabelEl.firstChild.textContent = `${t("time")} `;
  langJaButton?.classList.toggle("active", language === "ja");
  langEnButton?.classList.toggle("active", language === "en");
  setControlMode(controlMode);
  updateFullscreenButton();
  Story.refreshTitleUi();
  Handheld.refresh();
  Chat.refresh();
}

let installHintTimer = 0;

function isStandaloneDisplay() {
  return window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone === true;
}

function isFullscreenActive() {
  return Boolean(document.fullscreenElement || document.webkitFullscreenElement);
}

function updateFullscreenButton() {
  if (!fullscreenButton) return;
  const standalone = isStandaloneDisplay();
  const fullscreen = isFullscreenActive();
  if (standalone || fullscreen) fullscreenButton.textContent = language === "ja" ? "全画面中" : "Full";
  else fullscreenButton.textContent = language === "ja" ? "全画面" : "Full Screen";
  fullscreenButton.setAttribute("aria-pressed", fullscreen || standalone ? "true" : "false");
}

function showInstallHint(message) {
  if (!installHint) return;
  clearTimeout(installHintTimer);
  installHint.textContent = message;
  installHint.classList.remove("hidden");
  installHintTimer = window.setTimeout(() => installHint.classList.add("hidden"), 5200);
}

function nudgeMobileBrowserChrome() {
  window.setTimeout(() => window.scrollTo({ top: 1, left: 0, behavior: "smooth" }), 80);
}

async function enterBestFullscreen() {
  nudgeMobileBrowserChrome();
  if (isStandaloneDisplay()) {
    showInstallHint(language === "ja" ? "ホーム画面版で起動中。これがiPhoneの一番広い表示やで。" : "Running from Home Screen. This is the widest iPhone view.");
    return;
  }

  const target = document.querySelector(".shell") || document.documentElement;
  const requestFullscreen = target.requestFullscreen || target.webkitRequestFullscreen;
  if (requestFullscreen) {
    try {
      await requestFullscreen.call(target);
      try {
        await screen.orientation?.lock?.("landscape");
      } catch (_) {}
      updateFullscreenButton();
      return;
    } catch (_) {}
  }

  showInstallHint(language === "ja"
    ? "iPhoneのSafariはボタンだけではURLバーを完全に消せないから、共有ボタンから「ホーム画面に追加」で開いてね。"
    : "iPhone Safari cannot fully hide the URL bar from a button. Use Share, then Add to Home Screen.");
}

function enemyWeaponStage(owner) {
  const enemy = state.enemies.find(e => e.id === owner);
  return weaponStage(enemy?.weaponPower ?? Math.min(2, state.weaponPower));
}

function updateBeams(dt) {
  for (const b of state.beams) {
    if (b.homing) updateHomingMissile(b, dt);
    const wave = b.wave ? Math.sin((b.distance + performance.now() / 18) / 52 + b.wave) * 70 * dt : 0;
    const stepX = b.vx * dt;
    const stepY = (b.vy ?? 0) * dt + wave;
    b.x += stepX;
    b.y += stepY;
    b.distance += Math.hypot(stepX, stepY);
    b.life -= dt;
    if (b.distance >= b.range) b.life = 0;
    // たてに飛ぶ弾は当たり判定もたて長にする
    const upright = Math.abs(b.vy ?? 0) > Math.abs(b.vx);
    const beamRect = upright
      ? rect(b.x + b.w / 2 - b.h / 2, b.y + b.h / 2 - b.w / 2, b.h, b.w)
      : rect(b.x, b.y, b.w, b.h);
    b.hitRect = beamRect;
    if (b.owner === "player") {
      if (!b.bubble) FX.beamTrail(b);
      // 敵の弾とぶつかったら、おたがいに消える（撃って防げる）
      for (const other of state.beams) {
        if (other.owner === "player" || other.life <= 0 || !other.hitRect || !hit(beamRect, other.hitRect)) continue;
        other.life = 0;
        FX.hit((b.x + other.x) / 2 + b.w / 2, (b.y + other.y) / 2 + b.h / 2, b.colors);
        playSfx("break", b.x);
        if (b.explosion) explodeMissile(b.x + b.w / 2, b.y + b.h / 2, b);
        if (b.pierce > 0 && !b.explosion) b.pierce -= 1;
        else b.life = 0;
        break;
      }
      if (b.life <= 0) continue;
      for (const block of blocks) {
        if (block.switchBox && hit(beamRect, block)) {
          Gimmick.hitSwitch(block);
          FX.hit(b.x + b.w / 2, b.y + b.h / 2, b.colors);
          b.life = 0;
          break;
        }
        if (!block.breakable || block.broken || !hit(beamRect, block)) continue;
        if (!b.bubble) breakBlock(block);
        b.life = 0;
        break;
      }
      if (b.life <= 0) continue;
      if (beamHitsWall(beamRect)) {
        // 弾はかべや地面を通りぬけない
        if (b.explosion) explodeMissile(b.x + b.w / 2, b.y + b.h / 2, b);
        else FX.hit(b.x + b.w / 2, b.y + b.h / 2, b.colors);
        b.life = 0;
        continue;
      }
      for (const e of state.enemies) {
        if (!e.alive || !hit(beamRect, e)) continue;
        if (b.bubble) {
          // 空気鉄砲：ダメージはなく、ひよらせるだけ（うばわれた武器は落とす）
          stunEnemy(e);
          FX.hit(b.x + b.w / 2, b.y + b.h / 2, b.colors);
        } else if (b.explosion) explodeMissile(b.x + b.w / 2, b.y + b.h / 2, b);
        else damageEnemy(e, b.damage ?? 1);
        if (b.pierce > 0) b.pierce -= 1;
        else b.life = 0;
        break;
      }
    } else if (hit(beamRect, state.player)) {
      const source = state.enemies.find(e => e.id === b.owner);
      if (state.player.invincible > 0 || !shopGuards("shot")) damagePlayer(false, source);
      b.life = 0;
    } else if (!b.bossOrb && beamHitsWall(beamRect)) {
      // 敵の弾も、かべや地面で止まる（ボスの大きな弾だけは別）
      FX.hit(b.x + b.w / 2, b.y + b.h / 2, b.colors);
      b.life = 0;
    }
  }
  state.beams = state.beams.filter(b => (
    b.life > 0 &&
    b.x > state.camera - 260 &&
    b.x < state.camera + VIEW_W + 260 &&
    b.y > (state.cameraY ?? 0) - 260 &&
    b.y < (state.cameraY ?? 0) + VIEW_H + 260
  ));
}

// ---------- 星の海：岩のかべと、開いたりとじたりする岩の門 ----------
// 門はすき間を泳いで通る。とじる前に先が赤く光るので、開いているうちに通りぬける。はさまれるとダメージ

function buildSeaGates(areaIndex, difficulty, seed = areaIndex, style = null) {
  // 門の数・場所・すき間の高さは、エリアごとにちがう
  const rnd = seededRandom(seed + 500);
  if (style) {
    // ステージごとの、門のならび方
    const gates = [];
    const gate = (x, frac, gapH, moving, phase = 0) => gates.push({
      x: Math.round(clamp(x, 900, 4560)), w: SEA_GATE_W, frac: clamp(frac, 0.12, 0.88), gapH, moving, phase: phase % SEA_GATE_PERIOD
    });
    const spread = (n, i) => 980 + i * ((4500 - 980) / Math.max(1, n - 1));
    const movingGap = Math.max(150, 200 - difficulty * 2);
    if (style === "wide") {
      // 門は少なく、動かない。すき間は広い
      const n = 3 + Math.floor(rnd() * 2);
      for (let i = 0; i < n; i++) gate(spread(n, i) + (rnd() - 0.5) * 200, 0.2 + rnd() * 0.6, 210, false);
    } else if (style === "zigzag") {
      // 動かない門がたくさん。すき間が上・下・上・下と入れかわる
      const n = 7;
      for (let i = 0; i < n; i++) gate(spread(n, i), (i % 2 ? 0.84 : 0.16) + (rnd() - 0.5) * 0.08, 160, false);
    } else if (style === "timing") {
      // ぜんぶ開いたりとじたりする門。タイミングを見て通る
      const n = 5;
      for (let i = 0; i < n; i++) gate(spread(n, i) + (rnd() - 0.5) * 160, 0.15 + rnd() * 0.7, movingGap, true, rnd() * SEA_GATE_PERIOD);
    } else if (style === "pairs") {
      // 2まいひと組の岩。あいだのせまい水路を、たてに泳いでぬける
      const n = 3;
      for (let i = 0; i < n; i++) {
        const x = 1150 + i * 1350 + (rnd() - 0.5) * 160;
        const up = rnd() < 0.5;
        gate(x, up ? 0.18 : 0.82, 165, false);
        gate(x + 250, up ? 0.82 : 0.18, 165, false);
      }
    } else if (style === "wave") {
      // 動く門が、はしから順番に開いていく。波に乗って一気にぬける
      const n = 7;
      for (let i = 0; i < n; i++) gate(spread(n, i), 0.3 + rnd() * 0.4, Math.max(170, movingGap), true, SEA_GATE_PERIOD - i * 0.55 + 8);
    } else {
      // せまいすき間がつづく。ところどころ動く門
      const n = 6;
      for (let i = 0; i < n; i++) {
        const moving = i % 3 === 2;
        gate(spread(n, i) + (rnd() - 0.5) * 140, 0.14 + rnd() * 0.72, moving ? movingGap : 132, moving, i * 1.1);
      }
    }
    return gates;
  }
  const count = clamp(3 + Math.floor(rnd() * 3) + Math.floor(difficulty / 12), 3, 7);
  const gates = [];
  for (let i = 0; i < count; i++) {
    const x = 980 + i * ((4500 - 980) / Math.max(1, count - 1)) + (rnd() - 0.5) * 220;
    const moving = rnd() < 0.55;
    gates.push({
      x: Math.round(clamp(x, 900, 4560)),
      w: SEA_GATE_W,
      frac: 0.12 + rnd() * 0.76, // すき間の高さ（0 = 上、1 = 下）
      gapH: moving ? Math.max(150, 200 - difficulty * 2) : 150,
      moving,
      phase: (i * 1.37 + areaIndex * 0.6) % SEA_GATE_PERIOD
    });
  }
  return gates;
}

// 門の開きぐあい（1 = 全開、0 = とじている）と、とじる前ぶれ
function seaGateState(g) {
  if (!g.moving) return { open: 1, warn: false };
  const t = ((state.seaClock ?? 0) + g.phase) % SEA_GATE_PERIOD;
  if (t < 1.9) return { open: 1, warn: t > 1.1 };
  if (t < 2.5) return { open: 1 - (t - 1.9) / 0.6, warn: true };
  if (t < 2.9) return { open: 0, warn: false };
  return { open: (t - 2.9) / 1.1, warn: false };
}

function seaGateRects(g) {
  const swimTop = 58;
  const swimBottom = worldBottom() - 42;
  const gapY = swimTop + 110 + g.frac * (swimBottom - swimTop - 220);
  const gap = g.gapH * seaGateState(g).open;
  const top = { x: g.x, y: -400, w: g.w, h: gapY - gap / 2 + 400 };
  const bottom = { x: g.x, y: gapY + gap / 2, w: g.w, h: worldBottom() + 300 - (gapY + gap / 2) };
  return { top, bottom, gap, gapY };
}

function resolveSeaGates(p, isEnemy = false) {
  for (const g of state.seaGates ?? []) {
    if (p.x + p.w <= g.x || p.x >= g.x + g.w) continue;
    const { top, bottom, gap } = seaGateRects(g);
    if (gap < p.h - 2) {
      // はさまれた：ダメージを受けて、近いほうの外へはじき出される
      if (!isEnemy) damagePlayer(false, null, false);
      p.x = p.x + p.w / 2 < g.x + g.w / 2 ? g.x - p.w - 2 : g.x + g.w + 2;
      p.vx = 0;
      continue;
    }
    for (const r of [top, bottom]) {
      if (!hit(p, r)) continue;
      const penX = Math.min(p.x + p.w - r.x, r.x + r.w - p.x);
      const penY = r === top ? r.y + r.h - p.y : p.y + p.h - r.y;
      if (penX < penY) {
        p.x = p.x + p.w / 2 < r.x + r.w / 2 ? r.x - p.w : r.x + r.w;
        p.vx = 0;
      } else {
        p.y = r === top ? r.y + r.h : r.y - p.h;
        p.vy = 0;
      }
    }
  }
}

function drawSeaGates() {
  const now = performance.now() / 1000;
  for (const g of state.seaGates ?? []) {
    if (g.x + g.w < state.camera - 80 || g.x > state.camera + VIEW_W + 80) continue;
    const { top, bottom, gap } = seaGateRects(g);
    const st = seaGateState(g);
    for (const r of [top, bottom]) {
      const isTop = r === top;
      const tipY = isTop ? r.y + r.h : r.y;
      ctx.save();
      const grad = ctx.createLinearGradient(r.x, 0, r.x + r.w, 0);
      grad.addColorStop(0, g.moving ? "#5a4fa8" : "#3f6f8f");
      grad.addColorStop(0.5, g.moving ? "#8f7be0" : "#62a9c4");
      grad.addColorStop(1, g.moving ? "#4a3f96" : "#356080");
      ctx.fillStyle = grad;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      if (isTop) ctx.roundRect(r.x, r.y, r.w, r.h, [0, 0, 22, 22]);
      else ctx.roundRect(r.x, r.y, r.w, r.h, [22, 22, 0, 0]);
      ctx.fill();
      ctx.stroke();
      // もよう（岩のすじ）
      ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
      ctx.lineWidth = 2;
      for (let k = 1; k <= 5; k++) {
        const ly = tipY + (isTop ? -1 : 1) * k * 70;
        ctx.beginPath();
        ctx.moveTo(r.x + 10, ly);
        ctx.lineTo(r.x + r.w - 10, ly + 10);
        ctx.stroke();
      }
      if (g.moving) {
        // 先のギザギザ。とじる前は赤く点めつする
        const blink = st.warn ? 0.55 + Math.sin(now * 22) * 0.45 : 0;
        ctx.fillStyle = st.warn ? `rgba(255, 70, 90, ${0.55 + blink * 0.45})` : "#ffd85a";
        for (let k = 0; k < 4; k++) {
          const tx = r.x + 6 + k * ((r.w - 12) / 4);
          const tw = (r.w - 12) / 4;
          ctx.beginPath();
          ctx.moveTo(tx, tipY);
          ctx.lineTo(tx + tw / 2, tipY + (isTop ? 16 : -16));
          ctx.lineTo(tx + tw, tipY);
          ctx.closePath();
          ctx.fill();
        }
        if (st.warn) {
          ctx.shadowColor = "#ff465a";
          ctx.shadowBlur = 18;
          ctx.strokeStyle = `rgba(255, 70, 90, ${0.5 + blink * 0.5})`;
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.moveTo(r.x, tipY);
          ctx.lineTo(r.x + r.w, tipY);
          ctx.stroke();
        }
      }
      ctx.restore();
    }
    // とじる前ぶれ：すき間に「！」
    if (g.moving && st.warn && gap > 60) {
      const cy = (top.y + top.h + bottom.y) / 2;
      ctx.save();
      ctx.fillStyle = "#ff3d5a";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(g.x + g.w / 2, cy, 17 + Math.sin(now * 12) * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.font = "900 22px Segoe UI, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("!", g.x + g.w / 2, cy + 1);
      ctx.restore();
    }
  }
}

function beamHitsWall(r) {
  for (const g of state.seaGates ?? []) {
    if (r.x + r.w <= g.x || r.x >= g.x + g.w) continue;
    const jaws = seaGateRects(g);
    if (hit(r, jaws.top) || hit(r, jaws.bottom)) return true;
  }
  for (const s of platforms) if (hit(r, s)) return true;
  for (const block of blocks) if (!block.broken && hit(r, block)) return true;
  return false;
}

// 画面に映っている、ねらえるもの（敵とアイテムブロック）
function visibleMissileTargets() {
  const left = state.camera - 40;
  const right = state.camera + VIEW_W + 40;
  const top = (state.cameraY ?? 0) - 40;
  const bottom = (state.cameraY ?? 0) + VIEW_H + 40;
  const inView = o => o.x + o.w > left && o.x < right && o.y + o.h > top && o.y < bottom;
  const list = [];
  for (const e of state.enemies) if (e.alive && inView(e)) list.push({ kind: "enemy", ref: e });
  for (const b of blocks) if (b.breakable && !b.broken && inView(b)) list.push({ kind: "block", ref: b });
  return list;
}

// ロボットのミサイル：押すたびに1発。まだ誰もねらっていない一番近い敵（いなければアイテムブロック）へ
function shootMechMissile(x, y, dir, stage) {
  const aimed = new Set(state.beams.filter(b => b.homing && b.owner === "player" && b.life > 0).map(b => b.targetRef));
  const targets = visibleMissileTargets().filter(t => !aimed.has(t.ref));
  const dist = t => Math.hypot(t.ref.x + t.ref.w / 2 - x, t.ref.y + t.ref.h / 2 - y);
  targets.sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "enemy" ? -1 : 1) || dist(a) - dist(b));
  const target = targets[0] ?? null;
  const launchAngle = -Math.PI / 2 + dir * 0.5;
  state.beams.push({
    owner: "player",
    homing: true,
    targetRef: target?.ref ?? null,
    targetId: target?.kind === "enemy" ? target.ref.id : null,
    x: x + dir * 10,
    y: y - 10,
    w: stage.width,
    h: stage.height,
    vx: Math.cos(launchAngle) * stage.speed * 0.45 + dir * 160,
    vy: Math.sin(launchAngle) * stage.speed * 0.45,
    angle: launchAngle,
    life: 3,
    damage: stage.damage,
    colors: stage.colors,
    power: state.weaponPower,
    explosion: stage.explosion ?? 120,
    pierce: 0,
    wave: 0,
    distance: 0,
    range: stage.range * 2
  });
}

function updateHomingMissile(b, dt) {
  let target = null;
  if (b.targetRef && b.targetRef.alive !== false && !b.targetRef.broken) target = b.targetRef;
  if (!target && b.targetRef === null && (b.power ?? 0) < MECH_POWER) {
    target = state.enemies.find(e => e.id === b.targetId && e.alive) ||
      state.enemies.find(e => e.alive && e.x + e.w > state.camera - 80 && e.x < state.camera + canvas.width + 80);
  }
  if (!target && (b.power ?? 0) < MECH_POWER) {
    target = state.enemies.find(e => e.id === b.targetId && e.alive) ||
      state.enemies.find(e => e.alive && e.x + e.w > state.camera - 80 && e.x < state.camera + canvas.width + 80);
  }
  if (!target) return;
  const tx = target.x + target.w / 2;
  const ty = target.y + target.h / 2;
  const dx = tx - b.x;
  const dy = ty - b.y;
  const desired = Math.atan2(dy, dx);
  const speed = Math.hypot(b.vx, b.vy);
  const turn = clampAngle(desired - Math.atan2(b.vy, b.vx));
  const nextAngle = Math.atan2(b.vy, b.vx) + clamp(turn, -5.8 * dt, 5.8 * dt);
  const nextSpeed = Math.min((weaponStage(b.power).speed ?? 900), speed + 900 * dt);
  b.vx = Math.cos(nextAngle) * nextSpeed;
  b.vy = Math.sin(nextAngle) * nextSpeed;
  b.angle = nextAngle;
}

function explodeMissile(x, y, missile) {
  const radius = missile.explosion ?? 76;
  for (const e of state.enemies) {
    if (!e.alive) continue;
    const ex = e.x + e.w / 2;
    const ey = e.y + e.h / 2;
    const dist = Math.hypot(ex - x, ey - y);
    if (dist <= radius + Math.max(e.w, e.h) * 0.35) damageEnemy(e, missile.damage ?? 1);
  }
  spawnExplosion(x, y, radius, missile.colors);
}

function clampAngle(angle) {
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}

function breakBlock(block) {
  if (!block.breakable || block.broken) return;
  block.broken = true;
  spawnBlockPoof(block.x + block.w / 2, block.y + block.h / 2);
  FX.blockBreak(block.x + block.w / 2, block.y + block.h / 2);
  playSfx("break", block.x);
  const times = Shop.has("drill") ? 2 : 1;
  for (let k = 0; k < times; k++) spawnBlockContents(block, k);
}

function spawnBlockContents(block, k) {
  if (block.item === "power" && (Math.random() < 0.5 || firstWeaponsLocked())) {
    // 武器ブロックの半分は、ルナコインがはじける（武器は出にくい）
    for (let i = 0; i < 4; i++) {
      const c = coin(block.x + block.w / 2 + (i - 1.5) * 34 + k * 20, block.y - 40 - (i % 2) * 24 - k * 40, i % 2 ? "pea" : "kaki");
      state.coinItems.push({ ...c, taken: false });
    }
    return;
  }
  if (block.item) spawnItem(block.x + block.w / 2 + k * 30, block.y - 12, block.item);
}

function spawnBlockPoof(x, y) {
  const colors = ["#fff3a4", "#ffd1ed", "#c9f6ff", "#d7c8ff"];
  for (let i = 0; i < 10; i++) {
    state.particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 160,
      vy: -70 - Math.random() * 120,
      life: 0.45,
      maxLife: 0.45,
      r: 4 + Math.random() * 5,
      color: colors[i % colors.length],
      spin: Math.random() * Math.PI
    });
  }
}

function spawnExplosion(x, y, radius = 70, colors = ["#ffffff", "#fff3a4", "#ff8db7"]) {
  for (let i = 0; i < 24; i++) {
    const angle = i * Math.PI * 2 / 24;
    const speed = 90 + Math.random() * 220;
    state.particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.46,
      maxLife: 0.46,
      r: 4 + Math.random() * radius * 0.08,
      color: colors[i % colors.length],
      spin: Math.random() * Math.PI
    });
  }
  state.particles.push({
    x, y,
    vx: 0,
    vy: 0,
    life: 0.32,
    maxLife: 0.32,
    r: radius,
    color: "rgba(255, 255, 255, 0.62)",
    spin: 0
  });
}

// レアな武器：Lv3 以上か、そのワールドで出る中でいちばん高いレベル（Lv1 しか出ないワールドはのぞく）
function isRareDrop(power) {
  if (!power || power > STAR_TOP) return false;
  const rank = weaponRank(power);
  const cap = DROP_CAP[weaponAttribute(power)][dropWorld()];
  return rank >= 3 || (cap > 1 && rank === cap);
}

function announceRareDrop(x, y, power) {
  if (!isRareDrop(power)) return;
  FX.floater(x, y - 30, language === "ja" ? "レア！" : "RARE!", { color: "#fff3a4", stroke: "#ff5f9e", size: 30, life: 1.4 });
  FX.radial(x, y, 14, { type: "star", speed: [120, 300], life: [0.5, 0.9], r: [5, 9], colors: FX.GOLD, spin: 10 });
  playTone({ freq: 880, endFreq: 1760, duration: 0.18, type: "triangle", gain: 0.05 });
  playTone({ start: 0.14, freq: 1320, endFreq: 2200, duration: 0.22, type: "sine", gain: 0.04 });
}

function spawnItem(x, y, type) {
  // ライフの星は、ごくたまに「ぶどうまんじゅう」（ライフもHPも満タン）になる
  if (type === "hp" && Math.random() < 0.08) type = "manju";
  const weaponPower = type === "power" ? randomWeaponDropPower() : null;
  if (weaponPower) announceRareDrop(x, y, weaponPower);
  state.items.push({
    x, y, type,
    weaponPower,
    rare: !!weaponPower && isRareDrop(weaponPower),
    w: 28, h: 28,
    vx: 70,
    vy: -420,
    life: type === "hp" ? 5.2 : type === "manju" ? 12 : 9,
    grounded: false
  });
}

function spawnWeaponDrop(x, y, weaponPower, fresh = false) {
  if (fresh) announceRareDrop(x, y, weaponPower);
  state.items.push({
    x, y, type: "power",
    weaponPower,
    rare: fresh && isRareDrop(weaponPower),
    w: 28, h: 28,
    vx: -90 + Math.random() * 180,
    vy: -500,
    life: 9,
    grounded: false
  });
}

function updateItems(dt) {
  const underwater = isUnderwaterStage();
  for (const item of state.items) {
    if (underwater) {
      // 水の中：ふわふわ浮かびながら、ゆっくりしずむ。底についたらそこでとまる。武器は消えない
      if (item.type !== "power") item.life -= dt;
      // 出てきたときの勢いも水がやわらげる（上へ飛んでいきすぎない）
      item.vy = clamp(item.vy + 140 * dt, -90, 38);
      item.vx *= Math.pow(0.2, dt);
      item.x += (item.vx + Math.sin(performance.now() / 600 + item.x * 0.01) * 14) * dt;
      item.y += item.vy * dt;
      const floor = worldBottom() - 70 - item.h;
      if (item.y < 70) item.y = 70;
      if (item.y > floor) {
        item.y = floor;
        item.vy = 0;
      }
      item.x = clamp(item.x, 10, WORLD_WIDTH - item.w - 10);
      if (hit(state.player, item)) {
        if (item.type === "hp") {
          state.lives = Math.min(MAX_LIVES, state.lives + 1);
          state.hp = MAX_HP;
          playSfx("snackStar", item.x);
          FX.starGet(item.x + item.w / 2, item.y + item.h / 2);
        }
        if (item.type === "manju") eatBudouManju(item);
        if (item.type === "power" && !addWeaponStock(item.weaponPower ?? 1)) {
          item.vy = -60;
          item.vx = pusherAwayFromPlayer(item) * 0.4;
          continue;
        }
        item.life = 0;
      }
      continue;
    }
    item.life -= dt;
    item.vy += GRAVITY * dt;
    item.x += item.vx * dt;
    item.y += item.vy * dt;
    item.grounded = false;
    for (const s of platforms.concat(blocks.filter(b => !b.broken))) {
      if (!hit(item, s)) continue;
      if (item.vy > 0) {
        item.y = s.y - item.h;
        item.vy = item.type === "hp" ? -360 : item.type === "manju" ? -150 : -180;
        item.vx *= item.type === "hp" ? 1.03 : item.type === "manju" ? 0.4 : 0.75;
        item.grounded = true;
      } else if (item.vy < 0) {
        item.y = s.y + s.h;
        item.vy = 0;
      }
    }
    if (hit(state.player, item)) {
      if (item.type === "hp") {
        state.lives = Math.min(MAX_LIVES, state.lives + 1);
        state.hp = MAX_HP;
        playSfx("snackStar", item.x);
        FX.starGet(item.x + item.w / 2, item.y + item.h / 2);
      }
      if (item.type === "manju") eatBudouManju(item);
      if (item.type === "power" && !addWeaponStock(item.weaponPower ?? 1)) {
        item.vy = -260;
        item.vx = pusherAwayFromPlayer(item);
        continue;
      }
      item.life = 0;
    }
    if (item.y > worldBottom() + 80) item.life = 0;
  }
  state.items = state.items.filter(item => item.life > 0);
}

// ぶどうまんじゅう：ライフもHPも満タン
function eatBudouManju(item) {
  state.lives = MAX_LIVES;
  state.hp = MAX_HP;
  playSfx("snackStar", item.x);
  playSfx("powerUp");
  FX.starGet(item.x + item.w / 2, item.y + item.h / 2);
  FX.floater(item.x + item.w / 2, item.y - 20, language === "ja" ? "ぶどうまんじゅう！ 満タン！" : "Grape Manju! Full!", { color: "#f3dcff", stroke: "#7a4fa8", size: 26, life: 1.4 });
}

function pusherAwayFromPlayer(item) {
  const playerCenter = state.player.x + state.player.w / 2;
  const itemCenter = item.x + item.w / 2;
  return itemCenter < playerCenter ? -130 : 130;
}

function dropGunFromEnemy(enemy) {
  if (state.gun.holder !== enemy.id) return;
  state.gun.holder = null;
  state.gun.x = enemy.x + enemy.w / 2;
  state.gun.y = enemy.y + enemy.h - 8;
  state.gun.weaponPower = enemy.weaponPower ?? state.weaponPower;
}

function collectCoins() {
  const p = state.player;
  for (const c of state.coinItems) {
    if (c.taken) continue;
    const reach = c.r + (Shop.has("magnet") ? 96 : 0);
    const nearX = p.x < c.x + reach && p.x + p.w > c.x - reach;
    const nearY = p.y < c.y + reach && p.y + p.h > c.y - reach;
    if (nearX && nearY) {
      c.taken = true;
      state.coinTotal += 1;
      state.kakiTotal += 1;
      state.score += 10;
      playSfx("pickup", c.x);
      FX.coin(c.x, c.y);
    }
  }
}

function collectStarItems() {
  const p = state.player;
  for (const s of state.starItems) {
    if (s.taken) continue;
    const nearX = p.x < s.x + s.r && p.x + p.w > s.x - s.r;
    const nearY = p.y < s.y + s.r && p.y + p.h > s.y - s.r;
    if (nearX && nearY) {
      s.taken = true;
      state.score += 50;
      state.lives = Math.min(MAX_LIVES, state.lives + 1);
      playSfx("snackStar", s.x);
      spawnStarBurst(s.x, s.y);
      FX.starGet(s.x, s.y);
      Chat.event("starGet");
    }
  }
}

function collectOxygenItems() {
  if (!isUnderwaterStage()) return;
  const p = state.player;
  for (const o of state.oxygenItems ?? []) {
    if (o.taken) continue;
    const nearX = p.x < o.x + o.r && p.x + p.w > o.x - o.r;
    const nearY = p.y < o.y + o.r && p.y + p.h > o.y - o.r;
    if (nearX && nearY) {
      o.taken = true;
      o.respawn = 7.5;
      state.oxygen = MAX_OXYGEN;
      state.score += 15;
      playSfx("pickup", o.x);
      spawnBubbleBurst(o.x, o.y);
      FX.oxygen(o.x, o.y);
    }
  }
}

function spawnBubbleBurst(x, y) {
  const colors = ["#bff8ff", "#ffffff", "#9ee8ff", "#d9ffd6"];
  for (let i = 0; i < 16; i++) {
    state.particles.push({
      x,
      y,
      vx: -45 + Math.random() * 90,
      vy: -60 - Math.random() * 100,
      life: 0.52 + Math.random() * 0.28,
      maxLife: 0.8,
      r: 4 + Math.random() * 7,
      color: colors[i % colors.length],
      spin: Math.random() * Math.PI
    });
  }
}

function spawnStarBurst(x, y) {
  const colors = ["#fff3a4", "#ffd85a", "#ffffff", "#ffd1ed", "#9ee8ff"];
  for (let i = 0; i < 18; i++) {
    const angle = i * Math.PI * 2 / 18;
    const speed = 70 + Math.random() * 150;
    state.particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 40,
      life: 0.42 + Math.random() * 0.18,
      maxLife: 0.6,
      r: 4 + Math.random() * 5,
      color: colors[i % colors.length],
      star: true,
      spin: Math.random() * Math.PI
    });
  }
}

function spawnJumpSmoke(x, y) {
  const colors = ["#fff3a4", "#c9f6ff", "#ffd1ed", "#d9ffd6", "#d7c8ff"];
  for (let i = 0; i < 14; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    state.particles.push({
      x: x + side * (8 + Math.random() * 16),
      y: y - 2 + Math.random() * 5,
      vx: side * (22 + Math.random() * 42),
      vy: -58 - Math.random() * 64,
      life: 0.58 + Math.random() * 0.24,
      maxLife: 0.58 + Math.random() * 0.24,
      r: 5 + Math.random() * 7,
      color: colors[i % colors.length],
      spin: Math.random() * Math.PI
    });
  }
  state.particles.push({
    x,
    y: y - 8,
    vx: 0,
    vy: -84,
    life: 0.62,
    maxLife: 0.62,
    r: 5,
    color: "#fff3a4",
    star: true,
    spin: 0
  });
}

function updateParticles(dt) {
  for (const p of state.particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 82 * dt;
    p.r += 12 * dt;
    p.spin += 5 * dt;
  }
  state.particles = state.particles.filter(p => p.life > 0);
}

function drawParticles() {
  for (const p of state.particles) {
    const fade = Math.max(0, p.life / p.maxLife);
    ctx.save();
    ctx.globalAlpha = fade * 0.76;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.spin);
    ctx.fillStyle = p.color;
    if (p.star) {
      drawTinyStar(0, 0, p.r);
    } else {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.72)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.r, p.r * 0.62, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }
}

// ---------- よろず屋のアイテムで、ダメージをふせぐ ----------
// kind: "lava"（マグマ・ふん石） / "bolt"（雷） / "bar"（トロッコのはり） / "shot"（敵の弾）
function shopGuards(kind) {
  const p = state.player;
  const guard = (ja, en) => {
    p.invincible = Math.max(p.invincible, 0.9);
    FX.floater(p.x + p.w / 2, p.y - 20, language === "ja" ? ja : en, { color: "#ffffff", stroke: "#7f67c8", size: 22, life: 1 });
    playSfx("equip", p.x);
    return true;
  };
  if (kind === "bolt" && Shop.has("rod")) return true;
  if (kind === "bar" && Shop.has("helmet")) return true;
  if (kind === "lava" && Shop.has("heatCape")) {
    state.heatCapeTick = !state.heatCapeTick;
    if (state.heatCapeTick) return guard("マントでふせいだ！", "Cape blocked it!");
  }
  if (kind === "shot" && Shop.has("iceShield") && !state.iceShieldUsed) {
    state.iceShieldUsed = true;
    return guard("こおりのたて！", "Ice Shield!");
  }
  return false;
}

function damagePlayer(fell = false, sourceEnemy = null, canStealWeapon = false) {
  const p = state.player;
  if (state.mode === "dying" || state.mode === "respawning") return;
  if (!fell && p.invincible > 0) return;
  if (!fell && canStealWeapon && sourceEnemy && sourceEnemy.alive && hasEquippedWeapon() && !Shop.has("strap") && !isRideable(state.weaponPower)) {
    const playerPower = state.weaponPower;
    const enemyPower = sourceEnemy.weaponPower ?? 0;
    if (enemyPower === 0 || playerPower > enemyPower || (sourceEnemy.boss && playerPower >= enemyPower)) {
      const ownDrop = enemyPower > 0 ? enemyDropPower(sourceEnemy) : 0;
      if (ownDrop) spawnWeaponDrop(sourceEnemy.x + sourceEnemy.w / 2, sourceEnemy.y + 8, ownDrop, !sourceEnemy.stolenWeapon);
      sourceEnemy.weaponPower = removeEquippedWeaponForSteal();
      sourceEnemy.stolenWeapon = true;
      state.gun.holder = sourceEnemy.id;
      // はじめてうばわれたときは、画面を止めて「踏み返せば取りもどせる」と教える
      if (!Tutorial.onStolen(sourceEnemy)) Chat.event("stolen");
      sourceEnemy.gunCooldown = sourceEnemy.boss ? 0.2 : 0.5;
    }
  }
  if (!fell && Shop.has("kingCape")) {
    state.kingCapeTick = !state.kingCapeTick;
    if (state.kingCapeTick) {
      p.invincible = Math.max(p.invincible, 1.1);
      FX.floater(p.x + p.w / 2, p.y - 20, language === "ja" ? "王さまのマント！" : "Royal Cape!", { color: "#ffffff", stroke: "#ff3d7f", size: 22, life: 1 });
      playSfx("equip", p.x);
      return;
    }
  }
  if (fell) {
    state.hp = 0;
  } else {
    const hitDamage = sourceEnemy?.weaponPower ? Math.max(1, weaponStage(sourceEnemy.weaponPower).damage) : 1;
    const minHpAfterHit = state.hp > 1 ? 1 : 0;
    state.hp = Math.max(minHpAfterHit, state.hp - hitDamage);
  }
  FX.resetCombo();
  if (state.hp > 0) {
    playSfx("playerDamage", p.x + p.w / 2);
    FX.playerHurt(p.x + p.w / 2, p.y + p.h / 2);
    // 「いったぁ！」などの文字のセリフは、はじめてのときだけ。そのあとは声だけのさけび声
    if (!Story.data.seen.hurtTalk) {
      Story.data.seen.hurtTalk = true;
      Story.persist();
      Chat.event("hurt");
    } else {
      playHurtCry();
    }
    p.invincible = Shop.has("cushion") ? 2.7 : 1.35;
    p.vx = sourceEnemy ? (p.x < sourceEnemy.x ? -260 : 260) : -p.facing * 220;
    p.vy = -360;
    return;
  }
  if (!fell && Shop.has("charm") && !state.charmUsed) {
    // うさみみお守り：その場で元気に復活
    state.charmUsed = true;
    state.hp = MAX_HP;
    p.invincible = 2.2;
    p.vy = -420;
    FX.floater(p.x + p.w / 2, p.y - 24, language === "ja" ? "うさみみお守り！" : "Bunny-Ear Charm!", { color: "#ffffff", stroke: "#ff5f9e", size: 26, life: 1.4 });
    FX.flash("#ffd1ed", 0.4, 0.3);
    playSfx("respawn", p.x);
    return;
  }
  if (fell && Shop.has("charm") && !state.charmUsed) state.charmSaveLife = true;
  startDeathFall(fell);
  return;
  state.lives -= 1;
  if (state.lives <= 0) return endGame("Game Over", "もう一度走る");
  state.hp = MAX_HP;
  p.x = Math.max(72, state.camera + 80);
  p.y = 260;
  p.vx = 0;
  p.vy = 0;
  p.invincible = 1.6;
  state.time = Math.max(30, state.time);
}

function startDeathFall(fell = false) {
  const p = state.player;
  state.deathByPit = fell;
  playSfx("death", p.x + p.w / 2);
  if (state.charmSaveLife) {
    // 穴に落ちたときは、お守りでライフをへらさない
    state.charmSaveLife = false;
    state.charmUsed = true;
  } else {
    state.lives = Math.max(0, state.lives - 1);
  }
  state.hp = 0;
  state.mode = "dying";
  state.deathTimer = 1.55;
  p.onCrescent = false;
  p.invincible = 0;
  p.grounded = false;
  p.vx = 0;
  if (fell) {
    // 穴に落ちたとき：はね上がらずに、そのまま下へ落ちていきながら「さいならーーー」
    p.vy = Math.max(p.vy, 200);
    state.deathTimer = 1.2;
    Chat.event("fallPit");
    return;
  }
  p.vy = -720;
  spawnBlockPoof(p.x + p.w / 2, p.y + p.h / 2);
  FX.playerDeath(p.x + p.w / 2, p.y + p.h / 2);
  Chat.event("death");
}

function startMoonRespawn() {
  const p = state.player;
  if (p.crouch) { p.crouch = false; p.h = STAND_H; }
  resetCarts();
  playSfx("respawn", p.x + p.w / 2);
  state.hp = MAX_HP;
  state.time = Math.max(30, state.time);
  state.mode = "respawning";
  state.respawnDuration = 3;
  state.respawnTimer = state.respawnDuration;
  state.respawnStartY = -170;
  state.respawnTargetY = 260;
  p.x = Math.max(72, state.camera + 120);
  p.y = clamp((state.cameraY ?? 0) + 110, respawnMinY(), worldBottom() - 290);
  p.vx = 0;
  p.vy = 0;
  p.facing = 1;
  p.grounded = false;
  p.invincible = state.respawnDuration;
  p.onCrescent = true;
  spawnJumpSmoke(p.x + p.w / 2, p.y - 60);
  FX.respawnSparkle(p.x + p.w / 2, p.y);
  Chat.event("respawn");
}

function goalLocked() {
  return !!courses[currentCourse]?.bossStage && state.enemies.some(e => e.boss && e.alive);
}

function checkGoal() {
  if (courses[currentCourse]?.bossStage) return;
  const f = level.flag;
  if (hit(state.player, rect(f.x - 46, f.y + 30, f.w + 92, f.h - 30))) {
    Chat.event("stageClear");
    Story.beginStageClear({ boss: false });
  }
}

function nextCourse() {
  const oldWorld = courses[currentCourse]?.worldIndex ?? 0;
  const clearedCourse = currentCourse;
  completedCourses.add(currentCourse);
  campaignKeep = campaignSnapshotFromState();
  unlockedCourse = Math.max(unlockedCourse, Math.min(currentCourse + 1, courses.length - 1));
  const newWorld = courses[unlockedCourse]?.worldIndex ?? oldWorld;
  mapWalkFrom = clearedCourse;
  mapWalkTo = unlockedCourse;
  mapWalkTimer = unlockedCourse > clearedCourse ? 1.2 : 0;
  enterWorldMap(unlockedCourse, false, newWorld !== oldWorld ? oldWorld : null);
  overlay.classList.add("hidden");
  lastTime = performance.now();
  if (newWorld !== oldWorld) maybePlayWorldIntro(newWorld);
}

function endGame(title, label, message = null, options = {}) {
  state.mode = "ended";
  gameOverContinueCost = options.allowContinue ? continuePairCost(currentCourse) : 0;
  gameOverContinueAvailable = !!options.allowContinue && canPayContinue(gameOverContinueCost);
  const continueText = language === "ja"
    ? `ルナコイン ${gameOverContinueCost} 枚を払って ${stageLabel()} から復活`
    : `Pay ${gameOverContinueCost} Luna Coins to continue from ${stageLabel()}`;
  const shortageText = language === "ja"
    ? `復活にはルナコイン ${gameOverContinueCost} 枚が必要`
    : `Continue needs ${gameOverContinueCost} Luna Coins`;
  overlay.querySelector("h1").textContent = title;
  overlay.querySelector("p").textContent = message || `${t("kaki")} ${state.kakiTotal}  ${t("score")} ${state.score}${options.allowContinue ? `  /  ${gameOverContinueAvailable ? continueText : shortageText}` : ""}`;
  startButton.textContent = gameOverContinueAvailable ? (language === "ja" ? "このステージから復活" : "Continue") : (language === "ja" ? "マップにもどる" : "Back to Map");
  overlay.classList.remove("hidden");
  Story.refreshTitleUi();
  if (window.Bgm) {
    Bgm.stop(0.2);
    Bgm.jingle("gameOver");
  }
  Chat.event("gameOver");
}

function kakipiRank() {
  const total = courses.reduce((sum, course) => sum + (course.level.coins ?? []).length, 0);
  const ratio = state.coinTotal / total;
  let rank = t("ranks")[0];
  if (ratio >= 1) rank = t("ranks")[4];
  else if (ratio >= 0.75) rank = t("ranks")[3];
  else if (ratio >= 0.5) rank = t("ranks")[2];
  else if (ratio >= 0.25) rank = t("ranks")[1];
  return `${t("kaki")} ${state.kakiTotal}  ${rank}  ${t("score")} ${state.score}`;
}

function stageLabel(index = currentCourse) {
  const course = courses[index];
  return course ? `${course.worldIndex + 1}-${course.areaIndex + 1}` : "1-1";
}

function updateHud() {
  document.body.dataset.gameMode = state.mode;
  document.body.dataset.overlayOpen = overlay.classList.contains("hidden") ? "false" : "true";
  stageCount.textContent = stageLabel();
  kakiCount.textContent = state.kakiTotal;
  if (peaCount) peaCount.textContent = state.peaTotal;
  scoreCount.textContent = state.score;
  lifeCount.textContent = `${"★".repeat(clamp(state.lives, 0, MAX_LIVES))}${"☆".repeat(MAX_LIVES - clamp(state.lives, 0, MAX_LIVES))}`;
  timeCount.textContent = Math.max(0, Math.ceil(state.time));
}

function draw() {
  const mode = state.mode;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  FX.applyShake();
  // 動画の読みこみ中・再生中は、うしろのステージを見せない（暗い画面で待つ）
  const inGame = mode !== "worldMap" && mode !== "cutscene" && mode !== "credits" && mode !== "shop" && mode !== "movie" && !(mode === "title" && Story.drawTitleKey());
  // マップから開いたそうび画面は、うしろにマップを見せる
  const mapInventory = mode === "inventory" && state.inventoryReturnMode === "worldMap";
  if (mode === "movie") {
    ctx.fillStyle = "#120a2a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawMovieLoading();
  } else if (mode === "worldMap" || mapInventory) drawWorldMapScreen();
  else if (mode === "cutscene") Story.drawCutscene();
  else if (mode === "credits") Story.drawCredits();
  else if (mode === "shop") Shop.draw();
  else if (inGame) drawGameWorld();
  ctx.restore();
  FX.drawScreen();
  if (inGame && mode !== "title") {
    if (mode !== "stageClear" && !mapInventory) {
      drawStageBadge();
      Gimmick.drawHud();
      drawHpMeter();
      drawOxygenMeter();
      drawBossHpMeter();
    }
    if (mode === "bossIntro" || mode === "bossOutro") drawBossIntroOverlay();
    if (mode === "stageClear") Story.drawStageClear();
    if (mode === "paused") drawPauseScreen();
    if (state.itemFullPrompt > 0) drawItemFullPrompt();
    if (mode === "inventory") {
      drawInventoryScreen();
      drawFuseGuide();
    }
    if (mode === "playing") Tutorial.draw();
  }
  if (mode === "title" && state.saveMenu) drawSaveMenu();
  if (mode === "title" && state.settingsMenu) drawSettingsMenu();
  Chat.drawToast();
  FX.drawFlashes();
  FX.drawTransition();
}

function drawGameWorld() {
  const title = state.mode === "title";
  if (title) {
    const span = WORLD_WIDTH - VIEW_W;
    const tt = (performance.now() / 1000 * 46) % (span * 2);
    state.camera = tt < span ? tt : span * 2 - tt;
    state.cameraY = cameraYMax();
  }
  const cam = state.camera;
  const camY = state.cameraY ?? cameraYMax();
  const rest = cameraYMax();
  ctx.save();
  const lift = clamp((rest - camY) * 0.05, -34, 34);
  ctx.translate(canvas.width / 2, canvas.height / 2 + lift);
  ctx.scale(1.1, 1.1);
  ctx.translate(-canvas.width / 2, -canvas.height / 2);
  drawSky(cam);
  ctx.restore();
  if (courses[currentCourse]?.indoor && !title) {
    // 建物・洞くつの中は、うしろを少し暗く
    ctx.fillStyle = "rgba(28, 16, 58, 0.62)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.save();
  const zoom = title ? ZOOM : (state.viewZoom ?? ZOOM);
  ctx.scale(zoom, zoom);
  ctx.translate(-Math.round(cam * zoom) / zoom, -Math.round(camY * zoom) / zoom);
  drawMountains();
  drawStageEnvironment();
  drawPlatforms();
  Gimmick.drawForeground();
  drawStageHazards();
  drawSpikes();
  drawRailsAndBars();
  drawDoors();
  drawBossArenaWalls();
  drawBossHazards();
  drawGun();
  drawItems();
  Gimmick.drawEntities();
  drawParticles();
  drawCoins(performance.now() / 1000);
  drawFlag();
  drawBeams();
  drawEnemies();
  if (!title) drawPlayer();
  FX.drawWorld();
  ctx.restore();
}

function pauseButtonRects() {
  const w = 300;
  const h = 58;
  const x = canvas.width / 2 - w / 2;
  return [
    { x, y: canvas.height / 2 + 4, w, h },
    { x, y: canvas.height / 2 + 76, w, h }
  ];
}

function drawPauseScreen() {
  const rects = pauseButtonRects();
  ctx.save();
  ctx.fillStyle = "rgba(18, 10, 42, 0.56)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(255, 245, 252, 0.96)";
  ctx.strokeStyle = "#c8b2ff";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.roundRect(canvas.width / 2 - 230, canvas.height / 2 - 132, 460, 292, 10);
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.font = "900 54px Segoe UI, system-ui, sans-serif";
  ctx.fillStyle = "#fff3a4";
  ctx.strokeStyle = "#7f67c8";
  ctx.lineWidth = 7;
  ctx.strokeText("PAUSE", canvas.width / 2, canvas.height / 2 - 104);
  ctx.fillText("PAUSE", canvas.width / 2, canvas.height / 2 - 104);

  const labels = language === "ja" ? ["再開", "マップに戻る"] : ["Resume", "Return to Map"];
  for (let i = 0; i < rects.length; i++) {
    const r = rects[i];
    const selected = pauseSelection === i;
    ctx.fillStyle = selected ? "#9ee8ff" : "#ffffff";
    ctx.strokeStyle = selected ? "#ff8db7" : "#c8b2ff";
    ctx.lineWidth = selected ? 5 : 3;
    ctx.beginPath();
    ctx.roundRect(r.x, r.y, r.w, r.h, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = selected ? "#2c2650" : "#4d4773";
    ctx.font = "900 24px Segoe UI, system-ui, sans-serif";
    ctx.fillText(labels[i], r.x + r.w / 2, r.y + 13);
  }

  ctx.fillStyle = "rgba(127, 103, 200, 0.82)";
  ctx.font = "800 14px Segoe UI, system-ui, sans-serif";
  ctx.fillText(language === "ja" ? "Startでも再開" : "Press Start to resume", canvas.width / 2, canvas.height / 2 + 148);
  ctx.restore();
}

// マップのアップぐあいと、丸・文字・ぴょんぴーの大きさ
const MAP_ZOOM = 3.3;
const MAP_UI = 1.55;

function mapImageLayout() {
  const imgW = worldMapImage.naturalWidth || 1680;
  const imgH = worldMapImage.naturalHeight || 945;
  const scale = Math.max(canvas.width / imgW, canvas.height / imgH) * MAP_ZOOM;
  const w = imgW * scale;
  const h = imgH * scale;
  const visibleW = canvas.width / scale;
  const visibleH = canvas.height / scale;
  const camX = clamp(mapCamera.x, visibleW / 2, imgW - visibleW / 2);
  const camY = clamp(mapCamera.y, visibleH / 2, imgH - visibleH / 2);
  return { imgW, imgH, scale, camX, camY, x: canvas.width / 2 - camX * scale, y: canvas.height / 2 - camY * scale, w, h };
}

function mapPointToCanvas(index) {
  const layout = mapImageLayout();
  const point = MAP_NODE_POINTS[index] ?? MAP_NODE_POINTS[0];
  return {
    x: layout.x + point.x * layout.scale,
    y: layout.y + point.y * layout.scale,
    scale: layout.scale
  };
}

function currentMapWalkerPoint() {
  if (mapWalkTimer > 0 && mapWalkTo !== mapWalkFrom) {
    const progress = 1 - clamp(mapWalkTimer / 1.2, 0, 1);
    const eased = progress * progress * (3 - progress * 2);
    // となりのステージへは、絵の道にそって歩く
    if (Math.abs(mapWalkTo - mapWalkFrom) === 1) {
      const link = mapLinkPoints(Math.max(mapWalkFrom, mapWalkTo));
      return pointAlong(link, mapWalkTo > mapWalkFrom ? eased : 1 - eased);
    }
    const from = MAP_NODE_POINTS[mapWalkFrom] ?? MAP_NODE_POINTS[0];
    const to = MAP_NODE_POINTS[mapWalkTo] ?? MAP_NODE_POINTS[mapSelectedCourse] ?? MAP_NODE_POINTS[0];
    return { x: from.x + (to.x - from.x) * eased, y: from.y + (to.y - from.y) * eased };
  }
  const base = MAP_NODE_POINTS[mapSelectedCourse] ?? MAP_NODE_POINTS[0];
  if (mapShopT <= 0) return base;
  const k = mapShopT * mapShopT * (3 - mapShopT * 2);
  return pointAlong(shopLinkPoints(SHOP_MAP_NODE), k);
}

function updateWorldMapCamera(dt) {
  const target = currentMapWalkerPoint();
  const follow = Math.min(1, dt * 4.2);
  mapCamera.x += (target.x - mapCamera.x) * follow;
  mapCamera.y += (target.y - mapCamera.y) * follow;
}

function mapCourseAt(x, y) {
  for (let i = 0; i <= unlockedCourse; i++) {
    const p = mapPointToCanvas(i);
    const radius = (i === mapSelectedCourse ? 28 : 23) * MAP_UI;
    if (Math.hypot(x - p.x, y - p.y) <= radius) return i;
  }
  return -1;
}

function mapWorldFogZoneToCanvas(zone) {
  const layout = mapImageLayout();
  return {
    x: layout.x + zone.x * layout.scale,
    y: layout.y + zone.y * layout.scale,
    rx: zone.rx * layout.scale,
    ry: zone.ry * layout.scale,
    rotate: zone.rotate,
    color: zone.color,
    scale: layout.scale
  };
}

function drawMapIslandFog(zone, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  const t = performance.now() / 1000;
  const main = mapWorldFogZoneToCanvas(zone);
  ctx.translate(main.x, main.y);
  ctx.rotate(main.rotate + Math.sin(t * 0.5) * 0.015);

  const base = ctx.createRadialGradient(0, 0, Math.min(main.rx, main.ry) * 0.08, 0, 0, Math.max(main.rx, main.ry));
  base.addColorStop(0, "rgba(255, 255, 255, 0.86)");
  base.addColorStop(0.42, zone.color);
  base.addColorStop(0.82, "rgba(231, 225, 255, 0.64)");
  base.addColorStop(1, "rgba(231, 225, 255, 0)");
  ctx.fillStyle = base;
  ctx.beginPath();
  ctx.ellipse(0, 0, main.rx, main.ry, 0, 0, Math.PI * 2);
  ctx.fill();

  const puffs = [
    { x: -0.42, y: -0.22, r: 0.34 },
    { x: -0.1, y: -0.36, r: 0.36 },
    { x: 0.28, y: -0.26, r: 0.32 },
    { x: 0.44, y: 0.02, r: 0.3 },
    { x: 0.18, y: 0.28, r: 0.36 },
    { x: -0.28, y: 0.24, r: 0.34 }
  ];
  for (let i = 0; i < puffs.length; i++) {
    const p = puffs[i];
    const drift = Math.sin(t + i * 1.6) * main.rx * 0.03;
    const x = p.x * main.rx + drift;
    const y = p.y * main.ry;
    const r = p.r * Math.max(main.rx, main.ry);
    const puff = ctx.createRadialGradient(x, y, 2, x, y, r);
    puff.addColorStop(0, "rgba(255, 255, 255, 0.78)");
    puff.addColorStop(0.62, "rgba(255, 231, 247, 0.42)");
    puff.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = puff;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawLockedMapFog(reveal) {
  const unlockedWorld = courses[unlockedCourse]?.worldIndex ?? 0;
  for (let worldIndex = 1; worldIndex < MAP_WORLD_FOG_ZONES.length; worldIndex++) {
    const zone = MAP_WORLD_FOG_ZONES[worldIndex];
    if (!zone) continue;
    if (worldIndex > unlockedWorld) {
      drawMapIslandFog(zone, 0.98);
    } else if (mapRevealTimer > 0 && worldIndex === unlockedWorld && mapRevealFromWorld !== unlockedWorld) {
      drawMapIslandFog(zone, 1 - reveal);
    }
  }
}

function drawWorldMapScreen() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const layout = mapImageLayout();
  if (worldMapImage.complete && worldMapImage.naturalWidth > 0) {
    ctx.drawImage(worldMapImage, layout.x, layout.y, layout.w, layout.h);
  } else {
    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, "#bfc6ff");
    grad.addColorStop(0.55, "#ffd4ec");
    grad.addColorStop(1, "#fff3c8");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  const reveal = mapRevealTimer > 0 ? 1 - clamp(mapRevealTimer / 2.4, 0, 1) : 1;
  const lastPathIndex = Math.max(0, unlockedCourse - (mapRevealTimer > 0 ? 1 : 0));
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const mapLayout = mapImageLayout();
  for (let i = 1; i <= unlockedCourse; i++) {
    const activeReveal = i > lastPathIndex ? reveal : 1;
    strokeMapPath(mapLinkPoints(i), activeReveal, mapLayout, [
      { color: "rgba(35, 210, 54, 0.88)", width: 24 },
      { color: "rgba(255, 243, 164, 0.92)", width: 8 }
    ]);
  }
  for (const node of SHOP_MAP_NODES) {
    if (!shopNodeAvailable(node)) continue;
    strokeMapPath(shopLinkPoints(node), 1, mapLayout, [
      { color: "rgba(255, 196, 64, 0.9)", width: 21 },
      { color: "rgba(255, 255, 255, 0.95)", width: 6, dash: [14, 13] }
    ]);
  }
  ctx.restore();

  drawLockedMapFog(reveal);

  const visibleNodeLimit = Math.min(MAP_NODE_POINTS.length - 1, unlockedCourse);
  for (let i = 0; i <= visibleNodeLimit; i++) {
    const unlocked = i <= unlockedCourse;
    const completed = completedCourses.has(i);
    const p = mapPointToCanvas(i);
    const selected = i === mapSelectedCourse;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(MAP_UI, MAP_UI);
    ctx.translate(-p.x, -p.y);
    ctx.save();
    ctx.globalAlpha = unlocked ? 1 : 0.24;
    if (selected) {
      const pulse = 1 + Math.sin(performance.now() / 130) * 0.08;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.92)";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 28 * pulse, 0, Math.PI * 2);
      ctx.stroke();
    }
    const radius = selected ? 20 : 16;
    ctx.fillStyle = completed ? "rgba(168, 255, 194, 0.92)" : unlocked ? "rgba(255, 255, 255, 0.92)" : "rgba(215, 200, 255, 0.72)";
    ctx.strokeStyle = unlocked ? "#23d236" : "rgba(127, 103, 200, 0.74)";
    ctx.lineWidth = selected ? 6 : 5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = unlocked ? "#ff3d7f" : "#7f67c8";
    ctx.font = "900 13px Segoe UI, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(stageLabel(i), p.x, p.y + 1);
    if (completed) {
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#61c989";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.x - 7, p.y - 22);
      ctx.lineTo(p.x - 2, p.y - 16);
      ctx.lineTo(p.x + 9, p.y - 27);
      ctx.stroke();
    }
    ctx.restore();
    Story.drawMapNodeStars(i, p);
    ctx.restore();
  }

  SHOP_MAP_NODES.forEach((node, i) => { if (shopNodeAvailable(node)) drawShopMapNode(node, i); });

  const walkerPoint = currentMapWalkerPoint();
  const layoutForWalker = mapImageLayout();
  const p = {
    x: layoutForWalker.x + walkerPoint.x * layoutForWalker.scale,
    y: layoutForWalker.y + walkerPoint.y * layoutForWalker.scale
  };
  ctx.save();
  // 足もとが、ステージの丸の上に少しかぶるくらい（大きめに見せる）
  ctx.translate(p.x, p.y - 12 * MAP_UI + Math.sin(performance.now() / 140) * 3);
  ctx.scale(MAP_UI, MAP_UI);
  const walking = mapWalkTimer > 0 || (mapShopT > 0 && mapShopT < 1);
  if (pyompyRun.complete && pyompyRun.naturalWidth > 0 && walking) {
    const frame = PYOMPY_RUN_FRAMES[Math.floor(performance.now() / 90) % PYOMPY_RUN_FRAMES.length];
    const h = 84;
    const w = h * (frame.w / frame.h);
    const dir = mapWalkTimer > 0
      ? ((MAP_NODE_POINTS[mapWalkTo]?.x ?? walkerPoint.x) >= (MAP_NODE_POINTS[mapWalkFrom]?.x ?? walkerPoint.x) ? 1 : -1)
      : (mapAtShop ? -1 : 1);
    ctx.scale(dir, 1);
    ctx.drawImage(pyompyRun, frame.x, frame.y, frame.w, frame.h, -w / 2, -h, w, h);
  } else if (pyompyJump.complete && pyompyJump.naturalWidth > 0) {
    // この絵は下に約19%の余白があるので、その分さげて足をそろえる
    const h = 108;
    const w = h * (pyompyJump.naturalWidth / pyompyJump.naturalHeight);
    ctx.drawImage(pyompyJump, -w / 2, -h + h * 0.19, w, h);
  } else {
    ctx.scale(0.62, 0.62);
    drawPlayerFallback({ x: -18, y: -50 });
  }
  ctx.restore();

  Story.drawMapHud();
  drawWorldMapPanel();
}

// よろず屋の目じるし（assets/map-shop.png があればそれを、なければ仮の絵を出す）
function drawShopMapNode(node = SHOP_MAP_NODE, i = mapShopIndex) {
  const p = shopNodeToCanvas(node);
  const t = performance.now() / 1000;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(MAP_UI, MAP_UI);
  ctx.translate(-p.x, -p.y);
  drawShopMapNodeInner(p, t, mapAtShop && i === mapShopIndex);
  ctx.restore();
}

function drawShopMapNodeInner(p, t, here = mapAtShop) {
  ctx.save();
  if (here) {
    const pulse = 1 + Math.sin(t * 7.7) * 0.08;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.92)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 40 * pulse, 0, Math.PI * 2);
    ctx.stroke();
  }
  const bob = Math.sin(t * 2.4) * 3;
  if (shopMapIcon.complete && shopMapIcon.naturalWidth > 0) {
    const h = here ? 92 : 80;
    const w = h * (shopMapIcon.naturalWidth / shopMapIcon.naturalHeight);
    ctx.drawImage(shopMapIcon, p.x - w / 2, p.y - h * 0.78 + bob, w, h);
  } else {
    // 仮の絵：三日月の看板がついた小さなお店
    ctx.translate(p.x, p.y + bob);
    ctx.fillStyle = "#fff6dc";
    ctx.strokeStyle = "#d98a2b";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(-24, -30, 48, 34, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#ff8db7";
    ctx.beginPath();
    ctx.moveTo(-32, -28);
    ctx.lineTo(0, -52);
    ctx.lineTo(32, -28);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#ffd85a";
    ctx.beginPath();
    ctx.arc(0, -14, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff6dc";
    ctx.beginPath();
    ctx.arc(4, -17, 8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // 名前の札
  ctx.save();
  const label = language === "ja" ? "よろず屋" : "Shop";
  ctx.font = "900 14px Segoe UI, system-ui, sans-serif";
  const lw = ctx.measureText(label).width + 20;
  ctx.fillStyle = here ? "#ffd85a" : "rgba(255, 251, 224, 0.95)";
  ctx.strokeStyle = "#d98a2b";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(p.x - lw / 2, p.y + 14, lw, 22, 11);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#8a4f12";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, p.x, p.y + 25);
  ctx.restore();
}

function drawWorldMapPanel() {
  if (mapAtShop) {
    ctx.save();
    ctx.fillStyle = "rgba(255, 251, 236, 0.94)";
    ctx.strokeStyle = "#ffd85a";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(24, canvas.height - 148, canvas.width - 48, 128, 14);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#d98a2b";
    ctx.font = `900 38px ${FX.FONT}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(language === "ja" ? "よろず屋 つきのわ" : "Tsukinowa General Store", 50, canvas.height - 134);
    ctx.fillStyle = "#4d4773";
    ctx.font = `800 27px ${FX.FONT}`;
    ctx.fillText(language === "ja" ? "ルナコインで、べんりな道具やぶどうまんじゅうが買えるお店。" : "Trade Luna Coins for handy gear and grape manju.", 50, canvas.height - 82);
    ctx.fillStyle = "#ff8db7";
    ctx.font = `900 22px ${FX.FONT}`;
    ctx.textAlign = "right";
    { const back = { left: "→", right: "←", up: "↓", down: "↑" }[SHOP_MAP_NODE.dir] ?? "→"; ctx.fillText(language === "ja" ? `決定で入る ／ ${back}でもどる` : `Confirm: enter  /  ${back}: back`, canvas.width - 50, canvas.height - 50); }
    ctx.restore();
    return;
  }
  const course = courses[mapSelectedCourse] ?? courses[0];
  const world = course?.worldIndex ?? 0;
  const line = MAP_STAGE_MESSAGES[language]?.[world] ?? MAP_STAGE_MESSAGES.en[world] ?? "";
  ctx.save();
  ctx.fillStyle = "rgba(255, 245, 252, 0.92)";
  ctx.strokeStyle = "#c8b2ff";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(24, canvas.height - 148, canvas.width - 48, 128, 14);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#7f67c8";
  ctx.font = `900 38px ${FX.FONT}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  // ステージの名前（どんな場所か）も出す。ボスはボスの名前
  const recipeName = stageRecipe(course.worldIndex, course.areaIndex)?.title;
  const placeName = course.bossStage ? `  ${t("boss")} ${Story.bossName(course.worldIndex)}` : recipeName ? `  ${language === "ja" ? recipeName[0] : recipeName[1]}` : "";
  ctx.fillText(`${stageLabel(mapSelectedCourse)}  ${Story.worldName(world)}${placeName}`, 50, canvas.height - 134);
  // 下の会話欄に同じセリフが出ているときは、ここには出さない（読む場所を1つにする）
  const talkBelow = typeof Handheld !== "undefined" && Handheld.active() && Handheld.commOn();
  ctx.fillStyle = "#4d4773";
  ctx.font = `800 27px ${FX.FONT}`;
  if (!talkBelow) ctx.fillText(line, 50, canvas.height - 82);
  ctx.fillStyle = "#ff8db7";
  ctx.font = `900 22px ${FX.FONT}`;
  ctx.textAlign = "right";
  ctx.fillText((typeof controlMode !== "undefined" && controlMode === "pc") ? (language === "ja" ? "Enter / Space でスタート" : "Enter / Space to start") : (language === "ja" ? "A でスタート" : "Press A to start"), canvas.width - 50, canvas.height - 50);
  ctx.restore();
}

function drawBossIntroOverlay() {
  const boss = state.mode === "bossOutro"
    ? (state.bossOutroBoss ?? { bossKind: state.bossOutroKind ?? 0, finalBoss: !!state.bossOutroFinal, x: 0, y: 0, w: 86, h: 86 })
    : state.enemies.find(e => e.id === state.bossIntroBossId && e.alive) ?? state.enemies.find(e => e.boss && e.alive);
  if (!boss) return;
  const timer = state.bossIntroTimer ?? 0;
  const outro = state.mode === "bossOutro";
  const kind = outro ? (state.bossOutroKind ?? 0) : (boss.bossKind ?? 0);
  const lines = outro
    ? (BOSS_DEFEAT_DIALOGUES[kind] ?? BOSS_DEFEAT_DIALOGUES[0])
    : (BOSS_DIALOGUES[kind] ?? BOSS_DIALOGUES[0]);
  const showingPyon = (state.bossIntroStep ?? 0) === 1;
  const raw = showingPyon ? (language === "ja" ? lines.pyonJa : lines.pyonEn) : (language === "ja" ? lines.bossJa : lines.bossEn);
  const text = raw.replace(/^ぴょんぴー「/, "").replace(/」$/, "").replace(/^Pyon-P: /, "");
  const accent = showingPyon ? "#7f67c8" : boss.finalBoss ? "#c0266d" : "#ff5f9e";
  const speaker = showingPyon ? (language === "ja" ? "ぴょんぴー" : "Pyon-P") : Story.bossName(kind);
  const W = canvas.width;
  const H = canvas.height;
  const fade = clamp(timer / 0.35, 0, 1);
  const slide = 1 - Math.pow(1 - fade, 3);

  ctx.save();
  ctx.globalAlpha = fade;
  ctx.fillStyle = "rgba(18, 10, 42, 0.42)";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#120a2a";
  ctx.fillRect(0, 0, W, 64 * slide);
  ctx.fillRect(0, H - 30 * slide, W, 30);

  // 見出し
  const banner = outro ? (language === "ja" ? "ボスをたおした！" : "BOSS DEFEATED!") : boss.finalBoss ? "FINAL BOSS" : `BOSS  ${Story.bossName(kind)}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.font = "900 30px " + FX.FONT;
  ctx.lineWidth = 7;
  ctx.strokeStyle = boss.finalBoss ? "#c0266d" : "#7f67c8";
  ctx.fillStyle = "#fff3a4";
  ctx.strokeText(banner, W / 2, 33 * slide);
  ctx.fillText(banner, W / 2, 33 * slide);

  // 下に会話の欄がある端末では、セリフはそっちに出す（ほかの会話と同じ出し方）
  const shownNow = Math.floor(timer * (language === "ja" ? 36 : 64));
  if (typeof Handheld !== "undefined" && Handheld.active() && Handheld.commOn()) {
    // 会話シーンと同じ見た目：左にぴょんぴー、右にボスの立ち絵。セリフは下の吹き出し
    const pic = bossThemeImages[kind]?.complete && bossThemeImages[kind].naturalWidth > 0 ? bossThemeImages[kind] : bossAttackImages[kind];
    const appear = clamp(timer / 0.4, 0, 1);
    Story.drawTalkPortrait("pyon", "left", showingPyon, (state.bossIntroStep ?? 0) === 1 ? 1 : 0.999);
    Story.drawTalkPortrait("boss", "right", !showingPyon, (state.bossIntroStep ?? 0) === 0 ? appear : 1, pic);
    const all = [...text];
    Story.talkBox({
      key: `boss:${outro}:${kind}:${state.bossIntroStep ?? 0}`,
      name: speaker,
      color: accent,
      text: all.slice(0, shownNow).join(""),
      done: shownNow >= all.length
    });
    ctx.restore();
    return;
  }

  const boxW = W - 500;
  const boxH = 150;
  const boxX = 236;
  const boxY = H - boxH - 46;
  const bob = Math.sin(performance.now() / 160) * 4;
  ctx.globalAlpha = fade * (showingPyon ? 1 : 0.5);
  drawPyonpyBust(122, boxY + 118 + (showingPyon ? bob : 0), 2.65);
  ctx.globalAlpha = fade * (showingPyon ? 0.5 : 1);
  drawBossBust(boss, W - 136, boxY + 116 + (showingPyon ? 0 : bob), kind);
  ctx.globalAlpha = fade;

  ctx.fillStyle = "rgba(255, 248, 253, 0.97)";
  ctx.strokeStyle = accent;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxW, boxH, 22);
  ctx.fill();
  ctx.stroke();
  ctx.font = "900 21px " + FX.FONT;
  const nameW = ctx.measureText(speaker).width + 46;
  const nameX = showingPyon ? boxX + 26 : boxX + boxW - nameW - 26;
  ctx.fillStyle = accent;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(nameX, boxY - 22, nameW, 42, 21);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.fillText(speaker, nameX + nameW / 2, boxY);

  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = "#3f355d";
  ctx.font = "800 27px " + FX.FONT;
  const shown = Math.floor(timer * (language === "ja" ? 36 : 64));
  wrapText([...text].slice(0, shown).join(""), boxX + 40, boxY + 38, boxW - 80, 38);
  if (shown >= [...text].length) {
    ctx.fillStyle = accent;
    const ax = boxX + boxW - 40;
    const ay = boxY + boxH - 30 + Math.sin(performance.now() / 140) * 4;
    ctx.beginPath();
    ctx.moveTo(ax - 11, ay - 7);
    ctx.lineTo(ax + 11, ay - 7);
    ctx.lineTo(ax, ay + 9);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawPyonpyBust(cx, cy, scale = 2.4) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = "rgba(255, 245, 252, 0.76)";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(-82, -138, 164, 170, 8);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(-82, -138, 164, 170, 8);
  ctx.clip();
  if (pyompyJump.complete && pyompyJump.naturalWidth > 0) {
    const drawH = 205;
    const drawW = drawH * (pyompyJump.naturalWidth / pyompyJump.naturalHeight);
    ctx.drawImage(pyompyJump, -drawW / 2 - 2, -158, drawW, drawH);
  } else if (pyompySprite.complete && pyompySprite.naturalWidth > 0) {
    const source = PYOMPY_FRAMES[0];
    const drawH = 186;
    const drawW = drawH * (source.w / source.h);
    ctx.drawImage(pyompySprite, source.x, source.y, source.w, source.h, -drawW / 2, -150, drawW, drawH);
  } else {
    ctx.translate(-34, -95);
    ctx.scale(scale, scale);
    drawPlayerFallback({ x: 0, y: 0 });
  }
  ctx.restore();
}

function drawBossBust(boss, cx, cy, kind) {
  const img = bossAttackImages[kind]?.complete && bossAttackImages[kind].naturalWidth > 0 ? bossAttackImages[kind] : bossThemeImages[kind];
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = boss.finalBoss ? "rgba(32, 8, 38, 0.8)" : "rgba(255, 245, 252, 0.72)";
  ctx.strokeStyle = boss.finalBoss ? "#ff3d7f" : "rgba(255, 255, 255, 0.9)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(-104, -170, 208, 204, 8);
  ctx.fill();
  ctx.stroke();
  if (img?.complete && img.naturalWidth > 0) {
    const h = boss.finalBoss ? 248 : 212;
    const w = h * (img.naturalWidth / img.naturalHeight);
    const pulse = 1 + Math.sin(performance.now() / 120) * 0.018;
    ctx.scale(pulse, pulse);
    ctx.scale(-1, 1);
    ctx.drawImage(img, -w / 2, -h + 20, w, h);
  }
  ctx.restore();
}

function drawHpMeter() {
  const x = canvas.width - 366;
  const y = 18;
  const w = 220;
  const h = 44;
  const ratio = clamp(state.hp / MAX_HP, 0, 1);
  ctx.save();
  ctx.fillStyle = "rgba(255, 255, 255, 0.78)";
  ctx.strokeStyle = "rgba(139, 106, 201, 0.78)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();
  ctx.stroke();
  ctx.font = "900 15px Segoe UI, system-ui, sans-serif";
  ctx.fillStyle = "#7f67c8";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("HP", x + 14, y + h / 2);
  ctx.fillStyle = "rgba(215, 200, 255, 0.7)";
  ctx.beginPath();
  ctx.roundRect(x + 48, y + 13, 154, 18, 6);
  ctx.fill();
  const hpGrad = ctx.createLinearGradient(x + 48, y, x + 202, y);
  hpGrad.addColorStop(0, "#a8ffc2");
  hpGrad.addColorStop(0.55, "#fff3a4");
  hpGrad.addColorStop(1, "#ff8db7");
  ctx.fillStyle = hpGrad;
  ctx.beginPath();
  ctx.roundRect(x + 48, y + 13, 154 * ratio, 18, 6);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.72)";
  ctx.lineWidth = 1;
  for (let i = 1; i < MAX_HP; i++) {
    const sx = x + 48 + (154 / MAX_HP) * i;
    ctx.beginPath();
    ctx.moveTo(sx, y + 13);
    ctx.lineTo(sx, y + 31);
    ctx.stroke();
  }
  ctx.restore();
}

function drawOxygenMeter() {
  if (!isUnderwaterStage()) return;
  const x = canvas.width - 366;
  const y = 70;
  const w = 220;
  const h = 38;
  const ratio = clamp((state.oxygen ?? MAX_OXYGEN) / MAX_OXYGEN, 0, 1);
  const low = (state.oxygen ?? MAX_OXYGEN) < OXYGEN_LOW;
  const empty = (state.oxygen ?? MAX_OXYGEN) <= 0;
  const blink = 0.5 + Math.sin(performance.now() / (empty ? 70 : 120)) * 0.5;
  ctx.save();
  if (low && state.mode === "playing") {
    // 画面のふちを赤く点めつさせる
    const edge = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, canvas.height * 0.35, canvas.width / 2, canvas.height / 2, canvas.width * 0.7);
    edge.addColorStop(0, "rgba(255, 61, 127, 0)");
    edge.addColorStop(1, `rgba(255, 61, 127, ${(empty ? 0.5 : 0.28) * blink})`);
    ctx.fillStyle = edge;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // 上のまん中に大きく「酸素が少ない！」
    const msg = language === "ja" ? (empty ? "酸素ゼロ！ O2バブルをとって！" : "酸素が少ない！ O2バブルをとって！") : (empty ? "Out of oxygen! Grab an O2 bubble!" : "Low oxygen! Grab an O2 bubble!");
    ctx.font = `900 30px ${FX.FONT}`;
    const mw = ctx.measureText(msg).width + 44;
    const mx = canvas.width / 2 - mw / 2;
    const my = 120;
    ctx.globalAlpha = 0.65 + blink * 0.35;
    ctx.fillStyle = empty ? "#ff3d7f" : "#fff3a4";
    ctx.strokeStyle = empty ? "#ffffff" : "#ff3d7f";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(mx, my, mw, 52, 26);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = empty ? "#ffffff" : "#c0266d";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(msg, canvas.width / 2, my + 27);
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = low ? `rgba(255, 228, 238, ${0.8 + blink * 0.2})` : "rgba(235, 252, 255, 0.78)";
  ctx.strokeStyle = low ? "#ff3d7f" : "rgba(106, 198, 231, 0.82)";
  ctx.lineWidth = low ? 4 : 3;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();
  ctx.stroke();
  ctx.font = "900 14px Segoe UI, system-ui, sans-serif";
  ctx.fillStyle = low ? "#c0266d" : "#277394";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("O2", x + 14, y + h / 2);
  ctx.fillStyle = "rgba(201, 246, 255, 0.72)";
  ctx.beginPath();
  ctx.roundRect(x + 48, y + 11, 154, 16, 6);
  ctx.fill();
  const oxGrad = ctx.createLinearGradient(x + 48, y, x + 202, y);
  oxGrad.addColorStop(0, "#ffffff");
  oxGrad.addColorStop(0.45, low ? "#ff8db7" : "#9ee8ff");
  oxGrad.addColorStop(1, low ? "#ff3d7f" : "#61f2a5");
  ctx.fillStyle = oxGrad;
  ctx.beginPath();
  ctx.roundRect(x + 48, y + 11, 154 * ratio, 16, 6);
  ctx.fill();
  ctx.restore();
}

function drawBossHpMeter() {
  const boss = state.enemies?.find(e => e.boss && e.alive && courses[currentCourse]?.bossStage && state.bossIntroPlayed);
  if (!boss || state.mode !== "playing") return;
  const w = 520;
  const h = 34;
  const x = canvas.width / 2 - w / 2;
  const y = canvas.height - 62;
  const ratio = clamp((boss.hp ?? 0) / Math.max(1, boss.maxHp ?? 1), 0, 1);
  ctx.save();
  ctx.fillStyle = "rgba(30, 24, 52, 0.54)";
  ctx.strokeStyle = boss.finalBoss ? "#ff3d7f" : "#ff8db7";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
  ctx.beginPath();
  ctx.roundRect(x + 12, y + 11, w - 24, 12, 6);
  ctx.fill();
  const grad = ctx.createLinearGradient(x + 12, y, x + w - 12, y);
  grad.addColorStop(0, "#fff3a4");
  grad.addColorStop(0.45, "#ff8db7");
  grad.addColorStop(1, boss.finalBoss ? "#ff3d7f" : "#c8b2ff");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(x + 12, y + 11, (w - 24) * ratio, 12, 6);
  ctx.fill();
  ctx.font = "900 15px Segoe UI, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillStyle = "#fffaf0";
  ctx.strokeStyle = "rgba(44, 38, 80, 0.8)";
  ctx.lineWidth = 3;
  const label = boss.finalBoss ? "FINAL BOSS" : "BOSS";
  ctx.strokeText(label, x + w / 2, y - 4);
  ctx.fillText(label, x + w / 2, y - 4);
  ctx.restore();
}

function drawStageEnvironment() {
  const trait = currentStageTrait();
  if (trait === "underwater") {
    ctx.save();
    const grad = ctx.createLinearGradient(0, 20, 0, worldBottom());
    grad.addColorStop(0, "rgba(106, 246, 215, 0.22)");
    grad.addColorStop(0.45, "rgba(0, 95, 120, 0.3)");
    grad.addColorStop(1, "rgba(2, 22, 52, 0.62)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, WORLD_WIDTH, worldBottom());
    ctx.strokeStyle = "rgba(191, 248, 255, 0.38)";
    ctx.lineWidth = 3;
    for (let x = -80; x < WORLD_WIDTH + 120; x += 180) {
      const waveY = 86 + Math.sin(performance.now() / 650 + x * 0.01) * 8;
      ctx.beginPath();
      ctx.arc(x, waveY, 58, 0.08 * Math.PI, 0.92 * Math.PI);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawStageHazards() {
  ctx.save();
  drawFinalStageHazards();
  drawSeaGates();
  drawLightning();
  if (currentStageTrait() !== "marsLava") {
    ctx.restore();
    return;
  }
  for (const g of state.lavaGeysers ?? []) {
    const warmup = g.timer > LAVA_WARN_AT && g.timer <= LAVA_ERUPT_AT;
    if (!g.active && !warmup) continue;
    const base = g.baseY ?? canvas.height;
    if (warmup) {
      // 前ぶれ：地面が赤く光って、だんだん速く点めつし、「！」が出る
      const k = (g.timer - LAVA_WARN_AT) / (LAVA_ERUPT_AT - LAVA_WARN_AT);
      const blink = 0.6 + Math.sin(performance.now() / 1000 * (10 + k * 26)) * 0.4;
      const gx = g.x + g.w / 2;
      const groundY = lavaRockLandingY(gx) ?? GROUND_Y;
      ctx.fillStyle = `rgba(255, 80, 50, ${(0.3 + k * 0.5) * blink})`;
      ctx.beginPath();
      ctx.ellipse(gx, groundY + 2, g.w * (0.5 + k * 0.35), 9 + k * 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ff3d5a";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      const my = groundY - 104 + Math.sin(performance.now() / 110) * 4;
      ctx.beginPath();
      ctx.moveTo(gx, my + 34);
      ctx.lineTo(gx - 20, my);
      ctx.lineTo(gx + 20, my);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.font = "900 19px Segoe UI, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("!", gx, my + 12);
      void base;
    }
    const alpha = g.active ? 0.86 : 0.34;
    const x = g.x;
    const y = (g.baseY ?? canvas.height) - g.h;
    const grad = ctx.createLinearGradient(x, y, x + g.w, y);
    grad.addColorStop(0, `rgba(255, 243, 164, ${alpha * 0.25})`);
    grad.addColorStop(0.45, `rgba(255, 111, 82, ${alpha})`);
    grad.addColorStop(1, `rgba(255, 141, 183, ${alpha * 0.42})`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(x, y, g.w, g.h, 28);
    ctx.fill();
    ctx.fillStyle = `rgba(255, 243, 164, ${alpha})`;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.arc(x + 10 + i * 13, y + 18 + Math.sin(performance.now() / 120 + i) * 9, 5 + i % 2 * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  drawLavaRocks();
  ctx.restore();
}

function drawFinalStageHazards() {
  if (!courses[currentCourse]?.finalStage) return;
  for (const pool of state.lavaPools ?? []) {
    const grad = ctx.createLinearGradient(pool.x, pool.y, pool.x, pool.y + pool.h);
    grad.addColorStop(0, "#ff8d3d");
    grad.addColorStop(0.45, "#ff3d3d");
    grad.addColorStop(1, "#6b1020");
    ctx.fillStyle = grad;
    ctx.fillRect(pool.x, pool.y + 6, pool.w, pool.h - 6);
    ctx.fillStyle = "rgba(255, 243, 164, 0.78)";
    for (let x = pool.x + 12; x < pool.x + pool.w; x += 38) {
      ctx.beginPath();
      ctx.arc(x, pool.y + 14 + Math.sin(performance.now() / 130 + x) * 4, 7, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  for (const fire of state.rotatingFires ?? []) {
    const fx = fire.x + Math.cos(fire.angle) * fire.radius;
    const fy = fire.y + Math.sin(fire.angle) * fire.radius;
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(fire.x, fire.y, fire.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "#ff6f34";
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(fire.x, fire.y);
    ctx.lineTo(fx, fy);
    ctx.stroke();
    ctx.strokeStyle = "#fff3a4";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(fire.x, fire.y);
    ctx.lineTo(fx, fy);
    ctx.stroke();
    ctx.save();
    ctx.translate(fx, fy);
    ctx.rotate(fire.angle * 2);
    ctx.fillStyle = "#ff6f34";
    ctx.strokeStyle = "#fff3a4";
    ctx.lineWidth = 3;
    drawTinyStar(0, 0, 18);
    ctx.stroke();
    ctx.restore();
  }
}

function drawBossHazards() {
  ctx.save();
  for (const h of state.bossHazards ?? []) {
    if (h.type === "fall") {
      const warning = h.telegraph > 0;
      const x = h.x;
      const y = warning ? (state.cameraY ?? 0) + 56 : h.y;
      const pulse = 1 + Math.sin(performance.now() / 95) * 0.08;
      ctx.globalAlpha = warning ? 0.62 : 0.92;
      ctx.strokeStyle = warning ? "#ff8db7" : "#fff3a4";
      ctx.fillStyle = warning ? "rgba(255, 141, 183, 0.16)" : "rgba(255, 111, 82, 0.78)";
      ctx.lineWidth = warning ? 4 : 2;
      ctx.beginPath();
      ctx.arc(x, y, h.r * (warning ? 1.6 * pulse : 1), 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      if (!warning) {
        ctx.fillStyle = "rgba(255, 243, 164, 0.86)";
        drawTinyStar(x, y, h.r * 0.72);
      }
    } else if (h.type === "eruption") {
      const warning = h.telegraph > 0;
      const x = h.x - h.w / 2;
      const baseY = eruptionBaseY();
      const y = baseY - h.h;
      ctx.globalAlpha = warning ? 0.64 : 0.9;
      ctx.fillStyle = warning ? "rgba(255, 141, 183, 0.18)" : "rgba(255, 111, 82, 0.82)";
      ctx.strokeStyle = warning ? "#ff8db7" : "#fff3a4";
      ctx.lineWidth = warning ? 4 : 2;
      ctx.beginPath();
      ctx.roundRect(x, warning ? baseY - 76 : y, h.w, warning ? 28 : h.h + 200, 20);
      ctx.fill();
      ctx.stroke();
      if (!warning) {
        ctx.fillStyle = "rgba(255, 243, 164, 0.7)";
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.arc(x + 12 + i * 16, y + 18 + Math.sin(performance.now() / 110 + i) * 8, 6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
  ctx.restore();
}

function drawItemFullPrompt() {
  const x = canvas.width / 2 - 250;
  const y = 118;
  const w = 500;
  const h = 112;
  ctx.save();
  ctx.globalAlpha = clamp(state.itemFullPrompt / 0.25, 0, 1);
  ctx.fillStyle = "rgba(255, 245, 252, 0.94)";
  ctx.strokeStyle = "#c8b2ff";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#7f67c8";
  ctx.font = "900 25px Segoe UI, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("アイテムがいっぱいです", x + w / 2, y + 22);
  ctx.fillStyle = "#4d4773";
  ctx.font = "800 16px Segoe UI, system-ui, sans-serif";
  ctx.fillText("装備画面で融合して、空きを作ってね。", x + w / 2, y + 64);
  ctx.restore();
}

// 動画が始まるまでの「よみこみ中」画面（はねるぴょんぴーの耳の月と、進みぐあいのバー）
function drawMovieLoading() {
  const info = Story.movieLoading();
  if (!info) return;
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const t = performance.now() / 1000;
  ctx.save();
  // ゆっくり光る星
  for (let i = 0; i < 40; i++) {
    const x = (i * 197.3) % canvas.width;
    const y = (i * 113.7) % canvas.height;
    ctx.globalAlpha = 0.25 + 0.35 * Math.sin(t * 2 + i);
    ctx.fillStyle = "#fff3c4";
    ctx.fillRect(x, y, 3, 3);
  }
  ctx.globalAlpha = 1;
  // はねる3つの月
  for (let i = 0; i < 3; i++) {
    const y = cy - 40 - Math.abs(Math.sin(t * 4 + i * 0.7)) * 26;
    ctx.fillStyle = ["#ffd85a", "#ff8db7", "#8fe3ff"][i];
    ctx.beginPath();
    ctx.arc(cx - 60 + i * 60, y, 16, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 34px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const dots = ".".repeat(1 + (Math.floor(t * 2.5) % 3));
  ctx.fillText((language === "ja" ? "ムービーを よみこみ中" : "Loading movie") + dots, cx, cy + 34);
  // 進みぐあい（わからないときは、行ったり来たりする光）
  const w = 420, h = 14, x = cx - w / 2, y = cy + 78;
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 7);
  ctx.fill();
  ctx.fillStyle = "#ff8db7";
  ctx.beginPath();
  if (info.pct > 0.02) ctx.roundRect(x, y, Math.max(h, w * info.pct), h, 7);
  else ctx.roundRect(x + (w - 110) * (0.5 + 0.5 * Math.sin(t * 2.4)), y, 110, h, 7);
  ctx.fill();
  if (info.t > 6) {
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "700 20px system-ui, sans-serif";
    ctx.fillText(language === "ja" ? "回線がゆっくりみたい。もう少し待ってね" : "Slow connection. Just a moment...", cx, cy + 128);
  }
  ctx.restore();
}

function drawStageBadge() {
  const label = `${stageLabel()}${currentCourse === courses.length - 1 ? ` ${t("final")}` : courses[currentCourse]?.bossStage ? ` ${t("boss")}` : ""}`;
  const owner = hasEquippedWeapon() ? "" : state.gun.holder !== null && state.gun.holder !== "inventory" ? t("stolen") : t("noGun");
  const weaponLabel = hasEquippedWeapon() ? `${weaponName()} ${weaponLevelLabel(state.weaponPower)}` : `${t("unequipped")}${owner}`;
  ctx.save();
  ctx.font = "800 24px Segoe UI, system-ui, sans-serif";
  ctx.textBaseline = "top";
  const width = Math.max(ctx.measureText(label).width + 28, ctx.measureText(weaponLabel).width + 28);
  ctx.fillStyle = "rgba(255, 255, 255, 0.76)";
  ctx.strokeStyle = "rgba(139, 106, 201, 0.72)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(14, 14, width, 68, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#ffd85a";
  ctx.strokeStyle = "#7f67c8";
  ctx.lineWidth = 5;
  ctx.strokeText(label, 28, 22);
  ctx.fillText(label, 28, 22);
  ctx.font = "800 15px Segoe UI, system-ui, sans-serif";
  ctx.lineWidth = 4;
  ctx.fillStyle = "#9ee8ff";
  ctx.strokeText(weaponLabel, 28, 52);
  ctx.fillText(weaponLabel, 28, 52);
  ctx.restore();
}

function drawInventoryScreen() {
  ctx.save();
  ctx.fillStyle = "rgba(91, 74, 151, 0.62)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const panelX = 86;
  const panelY = 58;
  const panelW = canvas.width - 172;
  const panelH = canvas.height - 116;
  const panelGrad = ctx.createLinearGradient(panelX, panelY, panelX + panelW, panelY + panelH);
  panelGrad.addColorStop(0, "rgba(255, 245, 252, 0.96)");
  panelGrad.addColorStop(0.52, "rgba(239, 248, 255, 0.96)");
  panelGrad.addColorStop(1, "rgba(246, 238, 255, 0.96)");
  ctx.fillStyle = panelGrad;
  ctx.strokeStyle = "#c8b2ff";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(panelX, panelY, panelW, panelH, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#7f67c8";
  ctx.font = "900 30px Segoe UI, system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(t("equipTitle"), panelX + 28, panelY + 22);
  ctx.font = "800 15px Segoe UI, system-ui, sans-serif";
  ctx.fillStyle = "#ff8db7";
  ctx.fillText("Select / Tabで閉じる  A・Enter・Space・タッチで装備", panelX + 30, panelY + 58);

  const cardW = 142;
  const cardH = 230;
  const gap = 12;
  const startX = panelX + 28;
  const y = panelY + 98;
  ctx.font = "800 14px Segoe UI, system-ui, sans-serif";
  for (let i = 0; i < MAX_WEAPON_POWER; i++) {
    const x = startX + i * (cardW + gap);
    const count = state.weaponInventory[i] ?? 0;
    const selected = state.inventorySelection === i;
    const equipped = state.weaponPower === i + 1;
    const disabled = count <= 0;
    ctx.globalAlpha = disabled ? 0.42 : 1;
    ctx.fillStyle = selected ? "#fff3a4" : "#ffffff";
    ctx.strokeStyle = equipped ? "#ff8db7" : selected ? "#7f67c8" : "#d7c8ff";
    ctx.lineWidth = equipped ? 5 : selected ? 4 : 2;
    ctx.beginPath();
    ctx.roundRect(x, y, cardW, cardH, 8);
    ctx.fill();
    ctx.stroke();

    ctx.save();
    ctx.translate(x + cardW / 2, y + 68);
    drawRayGun(0, 0, 1, 1.55, i + 1);
    ctx.restore();

    ctx.fillStyle = "#4d4773";
    ctx.textAlign = "center";
    ctx.font = "900 13px Segoe UI, system-ui, sans-serif";
    wrapInventoryText(weaponName(i + 1), x + cardW / 2, y + 118, cardW - 18, 15);
    ctx.font = "900 22px Segoe UI, system-ui, sans-serif";
    ctx.fillStyle = "#f5b51b";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 4;
    ctx.strokeText(`x${count}`, x + cardW / 2, y + 164);
    ctx.fillText(`x${count}`, x + cardW / 2, y + 164);
    ctx.font = "800 13px Segoe UI, system-ui, sans-serif";
    ctx.fillStyle = equipped ? "#ff5f9e" : "#8b6ac9";
    ctx.fillText(equipped ? "装備中" : disabled ? "なし" : "装備できる", x + cardW / 2, y + 198);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function wrapInventoryText(text, x, y, maxWidth, lineHeight) {
  let line = "";
  let lineY = y;
  for (const char of text) {
    const test = line + char;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, lineY);
      line = char;
      lineY += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, lineY);
}

// そうび画面の素材（あれば使う。なくてもプログラムで描く）
const uiArt = {};
for (const [key, file] of Object.entries({
  bg: "ui-select-bg", panel: "ui-panel", slot: "ui-slot", slotSel: "ui-slot-selected",
  button: "ui-button", buttonSel: "ui-button-selected",
  iconBack: "ui-icon-back", iconSort: "ui-icon-sort", iconMap: "ui-icon-map", iconSave: "ui-icon-save"
})) {
  const im = new Image();
  im.src = `assets/${file}.png`;
  uiArt[key] = im;
}
const uiReady = im => !!im && im.complete && im.naturalWidth > 0;

// 四すみを保ったまま枠の画像を引きのばす
function drawNineSlice(img, r, srcCorner = 96, corner = 36) {
  const sw = img.naturalWidth;
  const sh = img.naturalHeight;
  const sx = [0, srcCorner, sw - srcCorner];
  const sy = [0, srcCorner, sh - srcCorner];
  const swid = [srcCorner, sw - srcCorner * 2, srcCorner];
  const shei = [srcCorner, sh - srcCorner * 2, srcCorner];
  const dx = [r.x, r.x + corner, r.x + r.w - corner];
  const dy = [r.y, r.y + corner, r.y + r.h - corner];
  const dwid = [corner, r.w - corner * 2, corner];
  const dhei = [corner, r.h - corner * 2, corner];
  for (let iy = 0; iy < 3; iy++) {
    for (let ix = 0; ix < 3; ix++) ctx.drawImage(img, sx[ix], sy[iy], swid[ix], shei[iy], dx[ix], dy[iy], dwid[ix], dhei[iy]);
  }
}

function drawUiPanel(r) {
  if (uiReady(uiArt.panel)) {
    drawNineSlice(uiArt.panel, r);
    return;
  }
  ctx.save();
  const g = ctx.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h);
  g.addColorStop(0, "rgba(250, 244, 255, 0.9)");
  g.addColorStop(1, "rgba(228, 246, 255, 0.9)");
  ctx.fillStyle = g;
  ctx.strokeStyle = "#8edce8";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(r.x, r.y, r.w, r.h, 20);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "rgba(255, 141, 183, 0.6)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(r.x + 7, r.y + 7, r.w - 14, r.h - 14, 15);
  ctx.stroke();
  ctx.restore();
}

// 画像がないときの、かんたんなアイコン
function drawUiIconFallback(index, cx, cy, color) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (index === 0) {
    ctx.beginPath();
    ctx.moveTo(18, 14);
    ctx.lineTo(18, -4);
    ctx.lineTo(-14, -4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-4, -18);
    ctx.lineTo(-20, -4);
    ctx.lineTo(-4, 10);
    ctx.stroke();
  } else if (index === 1) {
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-20, -14 + i * 14);
      ctx.lineTo(-20 + 40 - i * 12, -14 + i * 14);
      ctx.stroke();
    }
  } else if (index === 2) {
    ctx.beginPath();
    ctx.arc(0, 0, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(0, 0, 25, 8, -0.4, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.roundRect(-17, -21, 34, 42, 6);
    ctx.stroke();
    ctx.fillRect(-9, -21, 18, 13);
    ctx.fillRect(-10, 4, 20, 10);
  }
  ctx.restore();
}

function drawInventoryTopBar() {
  const mode = state.inventoryFocusMode ?? INVENTORY_FOCUS_MODES.INSIDE_ITEM_LIST;
  const buttons = inventoryTopMenuButtonRects();
  const ja = language === "ja";
  const labels = ja ? ["もどる", "せいとん", "マップ", "セーブ"] : ["Back", "Sort", "Map", "Save"];
  const icons = [uiArt.iconBack, uiArt.iconSort, uiArt.iconMap, uiArt.iconSave];
  const colors = ["#3fb9d2", "#8f7be0", "#ff7fb0", "#e0a020"];
  const t = performance.now() / 1000;
  for (let i = 0; i < buttons.length; i++) {
    const r = buttons[i];
    const on = mode === INVENTORY_FOCUS_MODES.INSIDE_TOP_MENU && state.inventoryTopMenuIndex === i;
    ctx.save();
    const art = on ? uiArt.buttonSel : uiArt.button;
    if (uiReady(art)) {
      ctx.drawImage(art, r.x, r.y, r.w, r.h);
    } else {
      if (on) {
        ctx.shadowColor = "#ffd85a";
        ctx.shadowBlur = 16 + Math.sin(t * 6) * 6;
      }
      ctx.fillStyle = on ? "#fff3a4" : "rgba(255, 255, 255, 0.86)";
      ctx.strokeStyle = on ? "#ff8db7" : "#c8b2ff";
      ctx.lineWidth = on ? 6 : 3;
      ctx.beginPath();
      ctx.roundRect(r.x + 3, r.y + 3, r.w - 6, r.h - 6, 22);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    if (uiReady(icons[i])) ctx.drawImage(icons[i], r.x + 16, r.y + 14, 64, 64);
    else drawUiIconFallback(i, r.x + 48, r.y + 46, colors[i]);
    ctx.fillStyle = "#4d4773";
    ctx.font = `900 ${ja ? 32 : 30}px ${FX.FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(labels[i], r.x + 88 + (r.w - 100) / 2, r.y + r.h / 2 + 2);
    ctx.restore();
  }

  // 右上：のこりライフとページ
  ctx.save();
  for (let i = 0; i < MAX_LIVES; i++) {
    ctx.save();
    ctx.translate(1094 + i * 44, 34);
    ctx.fillStyle = i < state.lives ? "#ffd85a" : "rgba(215, 200, 255, 0.6)";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    drawFivePointStar(0, 0, 17);
    ctx.stroke();
    ctx.restore();
  }
  const info = inventoryPageInfo();
  const pages = inventoryPageButtonRects();
  const arrows = ["◀", "▶"];
  for (let i = 0; i < 2; i++) {
    const r = pages[i];
    const usable = i === 0 ? (state.inventoryScroll ?? 0) > 0 : info.currentPage < info.totalPages;
    ctx.globalAlpha = usable ? 1 : 0.4;
    ctx.fillStyle = "rgba(255, 255, 255, 0.88)";
    ctx.strokeStyle = "#8edce8";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(r.x, r.y, r.w, r.h, 14);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#7f67c8";
    ctx.font = `900 24px ${FX.FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(arrows[i], r.x + r.w / 2, r.y + r.h / 2 + 1);
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "rgba(68, 54, 132, 0.9)";
  ctx.lineWidth = 5;
  ctx.font = `900 28px ${FX.FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const pageText = `${info.currentPage} / ${info.totalPages}`;
  ctx.strokeText(pageText, 1138, 85);
  ctx.fillText(pageText, 1138, 85);
  ctx.restore();
}

function drawBigStatBar(label, value, max, x, y, width) {
  const ratio = clamp(value / max, 0, 1);
  ctx.fillStyle = "#4d4773";
  ctx.font = `900 24px ${FX.FONT}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x, y + 12);
  ctx.textAlign = "right";
  ctx.fillStyle = "#ff5f9e";
  ctx.fillText(String(value), x + width, y + 12);
  ctx.fillStyle = "#ded2ff";
  ctx.beginPath();
  ctx.roundRect(x, y + 30, width, 14, 7);
  ctx.fill();
  const g = ctx.createLinearGradient(x, 0, x + width, 0);
  g.addColorStop(0, "#7fd6ea");
  g.addColorStop(1, "#ff8db7");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(x, y + 30, Math.max(14, width * ratio), 14, 7);
  ctx.fill();
}

function drawInventoryWeaponCard() {
  const r = { x: 20, y: 118, w: 410, h: inventoryBodyHeight() };
  const extra = r.h - 474; // たてに広いときは、絵やバーの間を少しあける
  drawUiPanel(r);
  const slot = inventorySlots()[state.inventorySelection];
  const ja = language === "ja";
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (!slot) {
    ctx.fillStyle = "#9a8fc4";
    ctx.font = `900 30px ${FX.FONT}`;
    ctx.fillText(ja ? "からっぽ" : "Empty", r.x + r.w / 2, r.y + r.h / 2 - 20);
    ctx.font = `800 22px ${FX.FONT}`;
    ctx.fillText(ja ? "武器のあるマスをえらんでね" : "Pick a slot with a ray gun", r.x + r.w / 2, r.y + r.h / 2 + 24);
    ctx.restore();
    return;
  }
  const power = slot.power;
  const stage = weaponStage(power);
  const nextPower = nextFusionPower(power);
  const cx = r.x + r.w / 2;
  drawDexBadge(r.x + r.w - 18, r.y + 16);
  drawWeaponIcon(cx, r.y + 74 + extra * 0.2, power, weaponIconFitScale(power, r.w - 150, 2.1 + extra / 400), 1);
  ctx.translate(0, extra * 0.45);
  ctx.fillStyle = "#5a3d9a";
  let nameSize = 34;
  ctx.font = `900 ${nameSize}px ${FX.FONT}`;
  while (nameSize > 22 && ctx.measureText(weaponName(power)).width > r.w - 48) {
    nameSize -= 2;
    ctx.font = `900 ${nameSize}px ${FX.FONT}`;
  }
  ctx.fillText(weaponName(power), cx, r.y + 158);
  ctx.fillStyle = "#ff5f9e";
  ctx.font = `900 28px ${FX.FONT}`;
  drawWeaponMark(cx - 52, r.y + 197, 30, power);
  ctx.fillText(`Lv ${weaponRank(power)}`, cx + 14, r.y + 198);

  const bx = r.x + 34;
  const bw = r.w - 68;
  drawBigStatBar(t("atk"), stage.damage, 16, bx, r.y + 224, bw);
  drawBigStatBar(t("range"), stage.range, 2400, bx, r.y + 280, bw);
  drawBigStatBar(t("rapid"), Math.round((1 / stage.cooldown) * 10), 80, bx, r.y + 336, bw);

  // 合成すると何になるか
  ctx.translate(0, extra * 0.45);
  ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
  ctx.strokeStyle = "#d6c8ff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(r.x + 24, r.y + 396, r.w - 48, 60, 16);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#7f67c8";
  ctx.font = `900 21px ${FX.FONT}`;
  if (nextPower) {
    ctx.textAlign = "left";
    ctx.fillText(ja ? "2つ合成 →" : "Fuse 2 →", r.x + 40, r.y + 427);
    drawWeaponIcon(r.x + 190, r.y + 426, nextPower, 0.62, 1);
    let nextName = weaponName(nextPower);
    ctx.font = `900 19px ${FX.FONT}`;
    while (nextName.length > 3 && ctx.measureText(nextName).width > r.w - 256) nextName = nextName.slice(0, -2) + "…";
    ctx.fillText(nextName, r.x + 228, r.y + 427);
  } else {
    ctx.textAlign = "center";
    ctx.fillText(t("finalEvolution"), cx, r.y + 427);
  }
  ctx.restore();
}

// つくった武器ずかん（今までに手に入れた・合成した武器の数）
function drawDexBadge(right, top) {
  const text = `${language === "ja" ? "ずかん" : "Dex"} ${dexCount()}/${DEX_POWERS.length}`;
  ctx.save();
  ctx.font = `900 18px ${FX.FONT}`;
  const w = ctx.measureText(text).width + 24;
  ctx.fillStyle = "rgba(255, 243, 164, 0.95)";
  ctx.strokeStyle = "#ff8db7";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(right - w, top, w, 30, 15);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#c0266d";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, right - w / 2, top + 16);
  ctx.restore();
}

function drawInventoryCommentBar() {
  const r = { x: 20, y: 604, w: 1240, h: 102 };
  drawUiPanel(r);
  const slot = inventorySlots()[state.inventorySelection];
  const raw = inventoryFocusComment(slot?.power ?? null);
  const text = raw.replace(/^ぴょんぴー「/, "").replace(/」$/, "");
  ctx.save();
  ctx.fillStyle = "#7f67c8";
  ctx.beginPath();
  ctx.roundRect(r.x + 22, r.y + 16, 150, 34, 17);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = `900 22px ${FX.FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(language === "ja" ? "ぴょんぴー" : "Pyon-P", r.x + 97, r.y + 34);
  ctx.fillStyle = "#4d4773";
  ctx.font = `900 26px ${FX.FONT}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  wrapText(text, r.x + 190, r.y + 16, r.w - 214, 36);
  ctx.restore();
}

function drawInventoryScreen() {
  ctx.save();
  if (uiReady(uiArt.bg)) {
    ctx.drawImage(uiArt.bg, 0, 0, canvas.width, canvas.height);
  } else {
    const g = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    g.addColorStop(0, "#b9a8f0");
    g.addColorStop(0.55, "#a9c8f4");
    g.addColorStop(1, "#bfe9f0");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // うっすらした格子（ハイテクな感じ）
    ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= canvas.width; x += 40) { ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); }
    for (let y = 0; y <= canvas.height; y += 40) { ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); }
    ctx.stroke();
  }
  drawInventoryTopBar();
  drawInventoryWeaponCard();
  for (const slot of inventorySlotRects()) drawInventorySlot(slot);
  if (!inventoryTalkBelow()) drawInventoryCommentBar();
  drawInventoryMessage();
  drawGamepadInventoryGhost();
  if (state.inventoryGrab) drawDraggedInventoryItem();
  if (state.inventoryConfirmWorldMap) drawInventoryDialogScaled(drawInventoryWorldMapConfirm);
  if (state.deletePrompt) drawInventoryDialogScaled(drawDeletePrompt);
  if (state.fusionPrompt) drawInventoryDialogScaled(drawFusionPrompt);
  ctx.restore();
  if (state.saveMenu) drawSaveMenu();
}

function drawInventoryDynamicText() {
  ctx.save();
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "rgba(68, 54, 132, 0.9)";
  ctx.lineWidth = 4;

  ctx.font = "900 15px Segoe UI, system-ui, sans-serif";
  const lines = [
    ["NAME   PYON-P", 254, 200],
    [`STAGE  ${stageLabel()}`, 254, 230],
    ["WEAPON", 254, 260]
  ];
  for (const [text, x, y] of lines) {
    ctx.strokeText(text, x, y);
    ctx.fillText(text, x, y);
  }
  ctx.font = "900 14px Segoe UI, system-ui, sans-serif";
  wrapText(weaponName(), 254, 286, 196, 18, true);
  drawInventoryHpStrip();
  ctx.restore();
}

function drawInventoryHpStrip() {
  const x = 276;
  const y = 382;
  const w = 142;
  const h = 34;
  ctx.save();
  ctx.fillStyle = "rgba(255, 250, 255, 0.36)";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.48)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let i = 0; i < MAX_LIVES; i++) {
    ctx.save();
    ctx.translate(x + 34 + i * 38, y + h / 2 + 1);
    ctx.fillStyle = i < state.lives ? "#ffd85a" : "rgba(215, 200, 255, 0.55)";
    ctx.strokeStyle = i < state.lives ? "#ffffff" : "rgba(255, 255, 255, 0.58)";
    ctx.lineWidth = 2.4;
    drawFivePointStar(0, 0, 12);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

function drawItemCaseOverlay() {
  for (const slot of inventorySlotRects()) drawInventorySlot(slot);
  drawInventoryScrollBar();
  drawInventoryPageInfo();
  drawEquippedWeaponPanel();
  drawInventorySortPlanetButton();
  drawInventoryFocusNavigation();
  drawInventoryMessage();
}

function drawInventoryScrollBar() {
  const total = MAX_INVENTORY_ITEMS;
  const maxScroll = Math.max(0, total - VISIBLE_INVENTORY_ITEMS);
  const x = 1250;
  const y = 196;
  const h = 284;
  const thumbH = Math.max(44, h * (VISIBLE_INVENTORY_ITEMS / total));
  const thumbY = y + (h - thumbH) * ((state.inventoryScroll ?? 0) / maxScroll);
  ctx.save();
  ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
  ctx.strokeStyle = "rgba(200, 178, 255, 0.7)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, 10, h, 5);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#fff3a4";
  ctx.strokeStyle = "#9f91cf";
  ctx.beginPath();
  ctx.roundRect(x + 1, thumbY, 8, thumbH, 4);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function inventoryPageInfo() {
  const totalPages = Math.ceil(MAX_INVENTORY_ITEMS / VISIBLE_INVENTORY_ITEMS);
  const currentPage = clamp(Math.floor((state.inventoryScroll ?? 0) / VISIBLE_INVENTORY_ITEMS) + 1, 1, totalPages);
  const first = Math.min(MAX_INVENTORY_ITEMS, (state.inventoryScroll ?? 0) + 1);
  const last = Math.min(MAX_INVENTORY_ITEMS, (state.inventoryScroll ?? 0) + VISIBLE_INVENTORY_ITEMS);
  return { currentPage, totalPages, first, last };
}

function drawInventoryPageInfo() {
  const info = inventoryPageInfo();
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.font = "900 16px Segoe UI, system-ui, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "rgba(68, 54, 132, 0.9)";
  ctx.lineWidth = 4;
  const pageText = `${t("page")} ${info.currentPage}/${info.totalPages}`;
  const rangeText = `${t("showing")} ${info.first}-${info.last}/${MAX_INVENTORY_ITEMS}`;
  ctx.strokeText(pageText, 1002, 492);
  ctx.fillText(pageText, 1002, 492);
  ctx.font = "800 12px Segoe UI, system-ui, sans-serif";
  ctx.strokeText(rangeText, 1002, 514);
  ctx.fillText(rangeText, 1002, 514);
  ctx.restore();
}

function inventorySortButtonRect() {
  // せいとんは上のメニューの2つめのボタンになった（昔の惑星ボタンは画面の外へ）
  return { x: -100, y: -100, w: 0, h: 0 };
}

function inventoryTopMenuAreaRect() {
  return { x: 38, y: 44, w: 540, h: 92 };
}

function inventoryItemListAreaRect() {
  return { x: 748, y: 148, w: 505, h: 355 };
}

function inventoryTopMenuButtonRects() {
  return [0, 1, 2, 3].map(i => ({ x: 20 + i * 248, y: 14, w: 236, h: 92 }));
}

function inventoryPageButtonRects() {
  return [{ x: 1016, y: 60, w: 64, h: 48 }, { x: 1196, y: 60, w: 64, h: 48 }];
}

function changeInventoryPage(dir) {
  if (fuseLessonOn()) return fuseLessonNudge();

  const before = state.inventoryScroll ?? 0;
  state.inventoryScroll = clamp(before + dir * VISIBLE_INVENTORY_ITEMS, 0, MAX_INVENTORY_ITEMS - VISIBLE_INVENTORY_ITEMS);
  clampInventoryScroll();
  state.inventorySelection = clamp(state.inventorySelection, state.inventoryScroll, state.inventoryScroll + VISIBLE_INVENTORY_ITEMS - 1);
  playSfx(state.inventoryScroll === before ? "locked" : "cursor");
}

// 小さい確認ウインドウ（合成・マップにもどる）を大きく見せる倍率
const INVENTORY_DIALOG_SCALE = 1.7;
function inventoryDialogPoint(x, y) {
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  return { x: cx + (x - cx) / INVENTORY_DIALOG_SCALE, y: cy + (y - cy) / INVENTORY_DIALOG_SCALE };
}

function drawInventoryDialogScaled(drawFn) {
  ctx.save();
  ctx.fillStyle = "rgba(30, 20, 70, 0.6)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.scale(INVENTORY_DIALOG_SCALE, INVENTORY_DIALOG_SCALE);
  ctx.translate(-canvas.width / 2, -canvas.height / 2);
  drawFn();
  ctx.restore();
}

function handleInventoryWorldMapConfirmPointer(x, y) {
  if (!state.inventoryConfirmWorldMap) return false;
  const pt = inventoryDialogPoint(x, y);
  const rects = inventoryWorldMapConfirmButtonRects();
  for (let i = 0; i < rects.length; i++) {
    const b = rects[i];
    if (pt.x >= b.x && pt.x <= b.x + b.w && pt.y >= b.y && pt.y <= b.y + b.h) {
      handleInventoryWorldMapConfirm(i === 0);
      return true;
    }
  }
  return true;
}

function handleInventoryTopMenuPointer(x, y) {
  const inside = r => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  const buttons = inventoryTopMenuButtonRects();
  for (let i = 0; i < buttons.length; i++) {
    if (!inside(buttons[i])) continue;
    state.inventoryGrab = null;
    state.inventoryFocusMode = INVENTORY_FOCUS_MODES.INSIDE_TOP_MENU;
    state.inventoryTopMenuIndex = i;
    activateInventoryTopMenuButton();
    return true;
  }
  const pages = inventoryPageButtonRects();
  if (inside(pages[0])) { changeInventoryPage(-1); return true; }
  if (inside(pages[1])) { changeInventoryPage(1); return true; }
  return false;
}

function inventoryWorldMapConfirmButtonRects() {
  const r = { x: 420, y: 240, w: 440, h: 190 };
  return [
    { x: r.x + 86, y: r.y + 112, w: 112, h: 46 },
    { x: r.x + 246, y: r.y + 112, w: 112, h: 46 }
  ];
}

function fusionPromptButtonRects() {
  const x = canvas.width / 2 - 270;
  const y = canvas.height / 2 - 56;
  return [
    { x: canvas.width / 2 - 140, y: y + 54, w: 130, h: 48 },
    { x: canvas.width / 2 + 14, y: y + 54, w: 130, h: 48 }
  ];
}

function resetInventoryFocus() {
  if (!state) return;
  state.inventoryFocusArea = "itemList";
  state.inventoryFocusMode = INVENTORY_FOCUS_MODES.INSIDE_ITEM_LIST;
  state.inventoryTopMenuIndex = 0;
  state.inventoryConfirmWorldMap = false;
  state.inventoryConfirmChoice = 0;
}

// もちものの一番上の段で上を押すと、上のメニューへ
function inventoryFocusTopMenu() {
  if (fuseLessonOn()) return fuseLessonNudge();

  state.inventoryFocusMode = INVENTORY_FOCUS_MODES.INSIDE_TOP_MENU;
  state.inventoryFocusArea = "topMenu";
  state.inventoryTopMenuIndex = clamp((state.inventorySelection - (state.inventoryScroll ?? 0)) % 5, 0, 3);
  playSfx("cursor");
}

function inventoryFocusItemList() {
  state.inventoryFocusMode = INVENTORY_FOCUS_MODES.INSIDE_ITEM_LIST;
  state.inventoryFocusArea = "itemList";
  playSfx("cursor");
}

function inventoryAtTopRow() {
  return state.inventorySelection - (state.inventoryScroll ?? 0) < 5 && (state.inventoryScroll ?? 0) === 0 && !state.inventoryGrab;
}

function moveInventoryFocusArea(dir) {
  if (fuseLessonOn()) return fuseLessonNudge();

  const current = INVENTORY_FOCUS_AREAS.indexOf(state.inventoryFocusArea ?? "itemList");
  const next = (current + dir + INVENTORY_FOCUS_AREAS.length) % INVENTORY_FOCUS_AREAS.length;
  state.inventoryFocusArea = INVENTORY_FOCUS_AREAS[next];
  playSfx("cursor");
}

function enterInventoryFocusedArea() {
  if (state.inventoryFocusArea === "topMenu") {
    state.inventoryFocusMode = INVENTORY_FOCUS_MODES.INSIDE_TOP_MENU;
    playSfx("decide");
    return;
  }
  if (state.inventoryFocusArea === "itemList") {
    state.inventoryFocusMode = INVENTORY_FOCUS_MODES.INSIDE_ITEM_LIST;
    playSfx("decide");
    return;
  }
  if (state.inventoryFocusArea === "sortButton") runInventorySort();
}

function leaveInventoryInnerFocus() {
  // つかんでいたら、まずはなす。メニューにいたらもちものへ。もちものにいたら画面をとじる
  if (state.inventoryGrab) {
    state.inventoryGrab = null;
    playSfx("cancel");
    return;
  }
  if (state.inventoryFocusMode === INVENTORY_FOCUS_MODES.INSIDE_TOP_MENU) {
    state.inventoryFocusMode = INVENTORY_FOCUS_MODES.INSIDE_ITEM_LIST;
    state.inventoryFocusArea = "itemList";
    playSfx("cancel");
    return;
  }
  closeInventory();
}

function activateInventoryTopMenuButton() {
  if (fuseLessonOn()) return fuseLessonNudge();

  const index = state.inventoryTopMenuIndex ?? 0;
  if (index === 0) {
    closeInventory();
    return;
  }
  if (index === 2) {
    state.inventoryConfirmWorldMap = true;
    state.inventoryConfirmChoice = 0;
    playSfx("decide");
    return;
  }
  if (index === 3) {
    openSaveMenu();
    return;
  }
  runInventorySort();
}

// ---------- セーブ・ロード（そうび画面の4つめのボタン。3つまで記録できる） ----------
const SAVE_SLOT_KEY = "pyonpSaveSlotsV1";
const SAVE_SLOT_COUNT = 3;
const saveText = (ja, en) => (language === "ja" ? ja : en);

function readSaveSlots() {
  let list = [];
  try {
    list = JSON.parse(localStorage.getItem(SAVE_SLOT_KEY) || "[]");
  } catch (_) {}
  if (!Array.isArray(list)) list = [];
  return Array.from({ length: SAVE_SLOT_COUNT }, (_, i) => (list[i] && typeof list[i] === "object" && list[i].data ? list[i] : null));
}

function openSaveMenu(loadOnly = false) {
  const slots = readSaveSlots();
  // ロードだけのときは、いちばん新しいファイルを最初に選んでおく
  let sel = 0;
  if (loadOnly) slots.forEach((slot, i) => { if (slot && (!slots[sel] || slot.savedAt > slots[sel].savedAt)) sel = i; });
  state.saveMenu = { tab: loadOnly ? 1 : 0, sel, confirm: null, choice: 0, slots, note: "", noteUntil: 0, loadOnly };
  playSfx("decide");
}

// ---------- せってい画面（タイトルの「せってい」から） ----------
// 音のオン・オフ、BGM・セリフ・効果音の大きさ（0〜10）、A/B/X/Y ボタンの役目
const SETTINGS_ROWS = ["sound", "bgm", "voice", "sfx", "A", "B", "X", "Y", "reset", "close"];

function openSettingsMenu() {
  if (!state || state.mode !== "title") return;
  state.settingsMenu = { sel: 0 };
  overlay.classList.add("hidden");
  playSfx("decide");
}

function closeSettingsMenu() {
  state.settingsMenu = null;
  playSfx("cancel");
  overlay.classList.remove("hidden");
  Story.refreshTitleUi();
  if (typeof Handheld !== "undefined") Handheld.refresh();
}

// いまの音量を、BGM・セリフ・効果音それぞれのつまみにのせる
function applyVolumes() {
  const ac = getAudioContext();
  if (!ac) return;
  audioOut();
  const on = soundEnabled ? 1 : 0;
  // 音が止まっているあいだ（まだタップしていない等）は、なめらかな変化が進まないので、そのまま値を入れる
  const setGain = (node, v) => {
    if (!node) return;
    if (ac.state !== "running") {
      node.gain.cancelScheduledValues(0);
      node.gain.value = v;
    } else {
      node.gain.setTargetAtTime(v, ac.currentTime, 0.04);
    }
  };
  setGain(audioMaster, on * Settings.level("sfx"));
  setGain(voiceBus, on * Settings.level("voice"));
  setGain(bgmOut(), Settings.level("bgm"));
  if (window.Bgm?.setVolume) Bgm.setVolume(0.6 * Settings.level("bgm"));
}

function settingsChange(row, dir) {
  if (row === "sound") {
    toggleSound();
  } else if (row === "bgm" || row === "voice" || row === "sfx") {
    Settings.setLevel(row, Settings.data[row] + dir);
    applyVolumes();
  } else if (Settings.BUTTONS.includes(row)) {
    Settings.cycleButton(row, dir);
  } else {
    return;
  }
  playSfx("cursor");
  // セリフの大きさを変えたら、ためしに声を流す
  if (row === "voice" && typeof Voice !== "undefined") Voice.play("chat", "ぶどうまんじゅうの『ぶ』は、ぶっちぎりの『ぶ』じょ。知らんけど。");
}

function settingsActivate(row) {
  if (row === "close") return closeSettingsMenu();
  if (row === "reset") {
    Settings.reset();
    applyVolumes();
    playSfx("decide");
    return;
  }
  settingsChange(row, 1);
}

function handleSettingsKey(code) {
  const m = state.settingsMenu;
  if (!m) return;
  const row = SETTINGS_ROWS[m.sel];
  if (code === "ArrowUp" || code === "KeyW") { m.sel = (m.sel + SETTINGS_ROWS.length - 1) % SETTINGS_ROWS.length; playSfx("cursor"); }
  else if (code === "ArrowDown" || code === "KeyS") { m.sel = (m.sel + 1) % SETTINGS_ROWS.length; playSfx("cursor"); }
  else if (code === "ArrowLeft" || code === "KeyA") settingsChange(row, -1);
  else if (code === "ArrowRight" || code === "KeyD") settingsChange(row, 1);
  else if (["Space", "Enter", "KeyX", "KeyY", "KeyJ", "KeyZ"].includes(code)) settingsActivate(row);
  else if (["Escape", "KeyB", "Backspace", "Select"].includes(code)) closeSettingsMenu();
}

// 画面いっぱいに2列（左：音、右：ボタン）。下に「もどす」「とじる」
function settingsLayout() {
  return { x: 30, y: 16, w: canvas.width - 60, h: canvas.height - 32 };
}

function settingsRowRect(i) {
  const colW = 570;
  const left = canvas.width / 2 - colW - 12;
  const right = canvas.width / 2 + 12;
  if (i < 4) return { x: left, y: 104 + i * 104, w: colW, h: 88 };
  if (i < 8) return { x: right, y: 104 + (i - 4) * 104, w: colW, h: 88 };
  return { x: i === 8 ? left : right, y: 530, w: colW, h: 84 };
}

function handleSettingsPointer(px, py) {
  const m = state.settingsMenu;
  if (!m) return;
  SETTINGS_ROWS.forEach((row, i) => {
    const r = settingsRowRect(i);
    if (px < r.x || px > r.x + r.w || py < r.y || py > r.y + r.h) return;
    m.sel = i;
    if (row === "close" || row === "reset" || row === "sound") return settingsActivate(row);
    // 左半分の ◀ / 右半分の ▶
    const mid = r.x + 210 + (r.w - 270) / 2;
    settingsChange(row, px < mid ? -1 : 1);
  });
}

function drawSettingsMenu() {
  const m = state.settingsMenu;
  if (!m) return;
  const ja = language === "ja";
  const L = settingsLayout();
  const h = L.h;
  ctx.save();
  ctx.fillStyle = "rgba(40, 26, 96, 0.55)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(255, 248, 253, 0.97)";
  ctx.strokeStyle = "#c8b2ff";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.roundRect(L.x, L.y, L.w, h, 26);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#7f67c8";
  ctx.font = `900 46px ${FX.FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(ja ? "せってい" : "Settings", L.x + L.w / 2, L.y + 46);
  const label = {
    sound: ja ? "音" : "Sound", bgm: "BGM", voice: ja ? "セリフ" : "Voices", sfx: ja ? "効果音" : "Effects",
    A: ja ? "A ボタン" : "A button", B: ja ? "B ボタン" : "B button", X: ja ? "X ボタン" : "X button", Y: ja ? "Y ボタン" : "Y button",
    reset: ja ? "はじめの設定にもどす" : "Reset to default", close: ja ? "とじる" : "Close"
  };
  SETTINGS_ROWS.forEach((row, i) => {
    const r = settingsRowRect(i);
    const on = m.sel === i;
    ctx.fillStyle = on ? "#fff3a4" : "rgba(239, 230, 255, 0.7)";
    ctx.strokeStyle = on ? "#ff8db7" : "rgba(200, 178, 255, 0.7)";
    ctx.lineWidth = on ? 4 : 2;
    ctx.beginPath();
    ctx.roundRect(r.x, r.y, r.w, r.h, 16);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#5a3d9a";
    ctx.font = `900 36px ${FX.FONT}`;
    if (row === "reset" || row === "close") {
      ctx.textAlign = "center";
      ctx.fillText(label[row], r.x + r.w / 2, r.y + r.h / 2 + 1);
      return;
    }
    ctx.textAlign = "left";
    ctx.fillText(label[row], r.x + 24, r.y + r.h / 2 + 1);
    const vx = r.x + 210;
    const vw = r.w - 270;
    ctx.textAlign = "center";
    if (row === "sound") {
      ctx.fillStyle = soundEnabled ? "#3fbf7f" : "#c0266d";
      ctx.fillText(soundEnabled ? "ON" : "OFF", vx + vw / 2, r.y + r.h / 2 + 1);
    } else if (row === "bgm" || row === "voice" || row === "sfx") {
      const v = Settings.data[row];
      ctx.fillText("◀", vx, r.y + r.h / 2 + 1);
      ctx.fillText("▶", vx + vw, r.y + r.h / 2 + 1);
      const bx = vx + 30;
      const bw = vw - 60;
      for (let k = 0; k < 10; k++) {
        ctx.fillStyle = k < v ? "#ff8db7" : "rgba(200, 178, 255, 0.45)";
        ctx.beginPath();
        ctx.roundRect(bx + k * (bw / 10) + 2, r.y + 12, bw / 10 - 4, r.h - 24, 4);
        ctx.fill();
      }
      ctx.fillStyle = "#5a3d9a";
      ctx.font = `900 30px ${FX.FONT}`;
      ctx.fillText(String(v), vx + vw + 32, r.y + r.h / 2 + 1);
    } else {
      ctx.fillText("◀", vx, r.y + r.h / 2 + 1);
      ctx.fillText("▶", vx + vw, r.y + r.h / 2 + 1);
      ctx.fillText(Settings.actionLabel(Settings.data.buttons[row], language), vx + vw / 2, r.y + r.h / 2 + 1);
    }
  });
  ctx.fillStyle = "#9b86d6";
  ctx.font = `800 28px ${FX.FONT}`;
  ctx.textAlign = "center";
  ctx.fillText(ja ? "↑↓ でえらぶ　←→ でかえる　A できめる　B でもどる" : "↑↓ choose  ←→ change  A select  B back", L.x + L.w / 2, L.y + h - 36);
  ctx.restore();
}

function closeSaveMenu() {
  const fromTitle = state.saveMenu?.loadOnly;
  state.saveMenu = null;
  playSfx("cancel");
  if (fromTitle) {
    overlay.classList.remove("hidden");
    Story.refreshTitleUi();
  }
}

function saveMenuNote(text) {
  if (!state.saveMenu) return;
  state.saveMenu.note = text;
  state.saveMenu.noteUntil = performance.now() + 2200;
}

function saveToSlot(index) {
  const menu = state.saveMenu;
  campaignKeep = campaignSnapshotFromState();
  Story.persist();
  menu.slots[index] = { savedAt: Date.now(), course: currentCourse, data: Story.exportSave() };
  try {
    localStorage.setItem(SAVE_SLOT_KEY, JSON.stringify(menu.slots));
    playSfx("powerUp");
    saveMenuNote(saveText(`ファイル${index + 1}にセーブしたよ！`, `Saved to File ${index + 1}!`));
  } catch (_) {
    playSfx("locked");
    saveMenuNote(saveText("セーブできなかった……", "Could not save..."));
  }
}

function loadFromSlot(index) {
  const slot = state.saveMenu?.slots[index];
  if (!slot || FX.transitioning()) return;
  playSfx("powerUp");
  FX.startTransition({
    type: "fade",
    dur: 0.9,
    onMid: () => {
      Story.importSave(slot.data);
      state.saveMenu = null;
      state.inventoryGrab = null;
      state.fusionPrompt = null;
      enterWorldMap(clamp(slot.course | 0, 0, unlockedCourse), true, null);
      overlay.classList.add("hidden");
      lastTime = performance.now();
    }
  });
}

function saveMenuConfirmSelected() {
  const menu = state.saveMenu;
  const slot = menu.slots[menu.sel];
  if (menu.tab === 0) {
    if (slot) {
      menu.confirm = "save";
      menu.choice = 1;
      playSfx("decide");
    } else saveToSlot(menu.sel);
  } else if (slot) {
    menu.confirm = "load";
    menu.choice = 1;
    playSfx("decide");
  } else {
    playSfx("locked");
    saveMenuNote(saveText("このファイルは、からっぽだよ。", "This file is empty."));
  }
}

function saveMenuAnswer(yes) {
  const menu = state.saveMenu;
  const kind = menu.confirm;
  menu.confirm = null;
  if (!yes) {
    playSfx("cancel");
    return;
  }
  if (kind === "save") saveToSlot(menu.sel);
  else if (kind === "delete") deleteSaveSlot(menu.sel);
  else loadFromSlot(menu.sel);
}

function deleteSaveSlot(index) {
  const menu = state.saveMenu;
  menu.slots[index] = null;
  try { localStorage.setItem(SAVE_SLOT_KEY, JSON.stringify(menu.slots)); } catch (_) {}
  playSfx("break");
  saveMenuNote(saveText(`ファイル${index + 1}を消したよ。`, `Deleted File ${index + 1}.`));
}

function handleSaveMenuKey(code, repeat = false) {
  const menu = state.saveMenu;
  if (!menu || repeat || FX.transitioning()) return true;
  const left = code === "ArrowLeft" || code === "KeyA";
  const right = code === "ArrowRight" || code === "KeyD";
  const up = code === "ArrowUp" || code === "KeyW";
  const down = code === "ArrowDown" || code === "KeyS";
  const ok = code === "Enter" || code === "Space" || code === "KeyZ";
  const back = code === "Escape" || code === "KeyB";
  if (menu.confirm) {
    if (left || right) {
      menu.choice = 1 - menu.choice;
      playSfx("cursor");
    } else if (ok) saveMenuAnswer(menu.choice === 0);
    else if (back) saveMenuAnswer(false);
    return true;
  }
  if ((left || right) && menu.loadOnly) {
    menu.onClose = !menu.onClose;
    playSfx("cursor");
  } else if (left || right) {
    // ←→ で「セーブする → ロードする → とじる」の順に動く
    const pos = ((menu.onClose ? 2 : menu.tab) + (right ? 1 : 2)) % 3;
    menu.onClose = pos === 2;
    if (pos < 2) menu.tab = pos;
    playSfx("cursor");
  } else if (up || down) {
    menu.onClose = false;
    menu.sel = (menu.sel + (down ? 1 : SAVE_SLOT_COUNT - 1)) % SAVE_SLOT_COUNT;
    playSfx("cursor");
  } else if (ok) {
    if (menu.onClose) closeSaveMenu();
    else saveMenuConfirmSelected();
  } else if ((code === "KeyX" || code === "KeyC" || code === "Delete") && !menu.onClose) {
    // X：選んでいるファイルを消す（確認あり）
    if (menu.slots[menu.sel]) {
      menu.confirm = "delete";
      menu.choice = 1;
      playSfx("decide");
    } else playSfx("locked");
  } else if (back) closeSaveMenu();
  return true;
}

function saveMenuLayout() {
  const win = { x: 210, y: 44, w: 860, h: 632 };
  const tabs = [0, 1].map(i => ({ x: win.x + 40 + i * 250, y: win.y + 84, w: 236, h: 62 }));
  const slots = Array.from({ length: SAVE_SLOT_COUNT }, (_, i) => ({ x: win.x + 40, y: win.y + 170 + i * 128, w: win.w - 80, h: 114 }));
  const close = { x: win.x + win.w - 196, y: win.y + 84, w: 156, h: 62 };
  const yesNo = [0, 1].map(i => ({ x: 400 + i * 260, y: 420, w: 220, h: 72 }));
  return { win, tabs, slots, close, yesNo };
}

function handleSaveMenuPointer(x, y) {
  const menu = state.saveMenu;
  if (!menu || FX.transitioning()) return true;
  const inside = r => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  const lay = saveMenuLayout();
  if (menu.confirm) {
    if (inside(lay.yesNo[0])) saveMenuAnswer(true);
    else if (inside(lay.yesNo[1])) saveMenuAnswer(false);
    return true;
  }
  if (inside(lay.close) || !inside(lay.win)) {
    closeSaveMenu();
    return true;
  }
  for (let i = 0; i < lay.tabs.length; i++) {
    if (menu.loadOnly) break;
    if (inside(lay.tabs[i]) && menu.tab !== i) {
      menu.tab = i;
      menu.onClose = false;
      playSfx("cursor");
      return true;
    }
  }
  for (let i = 0; i < lay.slots.length; i++) {
    if (!inside(lay.slots[i])) continue;
    if (menu.sel === i) saveMenuConfirmSelected();
    else {
      menu.sel = i;
      playSfx("cursor");
    }
    return true;
  }
  return true;
}

function drawSaveMenu() {
  const menu = state.saveMenu;
  if (!menu) return;
  const lay = saveMenuLayout();
  const { win } = lay;
  const t = performance.now() / 1000;
  const font = (size, weight = 900) => `${weight} ${size}px ${FX.FONT}`;
  const panel = (r, fill, stroke, width = 3, radius = 16) => {
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.roundRect(r.x, r.y, r.w, r.h, radius);
    ctx.fill();
    ctx.stroke();
  };
  ctx.save();
  ctx.fillStyle = "rgba(30, 20, 70, 0.62)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // ウインドウ本体（パステルのサイバー風）
  const body = ctx.createLinearGradient(win.x, win.y, win.x + win.w, win.y + win.h);
  body.addColorStop(0, "rgba(246, 240, 255, 0.98)");
  body.addColorStop(1, "rgba(226, 244, 255, 0.98)");
  ctx.shadowColor = "rgba(142, 220, 232, 0.9)";
  ctx.shadowBlur = 26;
  panel(win, body, "#8edce8", 5, 24);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(255, 141, 183, 0.75)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(win.x + 10, win.y + 10, win.w - 20, win.h - 20, 18);
  ctx.stroke();

  ctx.fillStyle = "#5a3d9a";
  ctx.font = font(34);
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(menu.loadOnly ? saveText("どのファイルからはじめる？", "Continue from which file?") : saveText("セーブ ／ ロード", "SAVE / LOAD"), win.x + 44, win.y + 48);
  ctx.fillStyle = "#8f8ad0";
  ctx.font = font(16, 800);
  ctx.textAlign = "right";
  ctx.fillText("DATA TERMINAL  //  3 FILES", win.x + win.w - 44, win.y + 50);

  // タブ
  const tabLabels = [saveText("セーブする", "Save"), saveText("ロードする", "Load")];
  for (let i = 0; i < 2; i++) {
    if (menu.loadOnly && i === 0) continue;
    const r = lay.tabs[i];
    const on = menu.tab === i && !menu.onClose;
    panel(r, on ? (i === 0 ? "#ff8db7" : "#7fd6ea") : menu.tab === i ? "rgba(255, 243, 164, 0.6)" : "rgba(255,255,255,0.75)", on ? "#ffffff" : "#c8b2ff", on ? 4 : 2, 18);
    ctx.fillStyle = on ? "#ffffff" : "#7f67c8";
    ctx.font = font(26);
    ctx.textAlign = "center";
    ctx.fillText(tabLabels[i], r.x + r.w / 2, r.y + r.h / 2 + 1);
  }
  if (menu.onClose) {
    ctx.shadowColor = "#ffd85a";
    ctx.shadowBlur = 16;
  }
  panel(lay.close, menu.onClose ? "#fff3a4" : "rgba(255,255,255,0.8)", menu.onClose ? "#ff8db7" : "#c8b2ff", menu.onClose ? 5 : 2, 18);
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#7f67c8";
  ctx.font = font(22);
  ctx.textAlign = "center";
  ctx.fillText(saveText("とじる", "Close"), lay.close.x + lay.close.w / 2, lay.close.y + lay.close.h / 2 + 1);

  // ファイル3つ
  for (let i = 0; i < SAVE_SLOT_COUNT; i++) {
    const r = lay.slots[i];
    const slot = menu.slots[i];
    const on = menu.sel === i && !menu.onClose;
    const accent = menu.tab === 0 ? "#ff8db7" : "#4fc3dc";
    if (on) {
      ctx.shadowColor = accent;
      ctx.shadowBlur = 14 + Math.sin(t * 6) * 6;
    }
    panel(r, on ? "#fffbe0" : "rgba(255,255,255,0.86)", on ? accent : "#d6c8ff", on ? 5 : 2, 18);
    ctx.shadowBlur = 0;
    // 番号
    ctx.fillStyle = on ? accent : "#b9a8ee";
    ctx.beginPath();
    ctx.roundRect(r.x + 16, r.y + 17, 84, 80, 14);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = font(15);
    ctx.textAlign = "center";
    ctx.fillText("FILE", r.x + 58, r.y + 38);
    ctx.font = font(40);
    ctx.fillText(String(i + 1), r.x + 58, r.y + 72);
    ctx.textAlign = "left";
    if (!slot) {
      ctx.fillStyle = "#b3a9d6";
      ctx.font = font(28);
      ctx.fillText(saveText("—— からっぽ ——", "—— EMPTY ——"), r.x + 124, r.y + r.h / 2 + 1);
      continue;
    }
    const d = slot.data || {};
    const course = clamp(slot.course | 0, 0, courses.length - 1);
    const world = courses[course]?.worldIndex ?? 0;
    const stars = Object.values(d.stars || {}).reduce((a, b) => a + (b | 0), 0);
    const when = new Date(slot.savedAt || 0);
    const pad = n => String(n).padStart(2, "0");
    ctx.fillStyle = "#4d4773";
    ctx.font = font(28);
    ctx.fillText(`${saveText("ステージ", "Stage")} ${stageLabel(course)}  ${Story.worldName(world)}`, r.x + 124, r.y + 38);
    ctx.fillStyle = "#7f67c8";
    ctx.font = font(21, 800);
    ctx.fillText(
      `★ ${stars}   ${saveText("ルナコイン", "Luna Coins")} ${(d.keep?.kakiTotal ?? 0) + (d.keep?.peaTotal ?? 0)}`,
      r.x + 124, r.y + 80
    );
    ctx.fillStyle = "#9a8fc4";
    ctx.textAlign = "right";
    ctx.fillText(`${when.getMonth() + 1}/${when.getDate()} ${pad(when.getHours())}:${pad(when.getMinutes())}`, r.x + r.w - 22, r.y + 80);
  }

  // 下の説明
  ctx.textAlign = "center";
  ctx.font = font(20, 800);
  const showNote = menu.note && performance.now() < menu.noteUntil;
  ctx.fillStyle = showNote ? "#ff5f9e" : "#7f67c8";
  const pc = typeof controlMode !== "undefined" && controlMode === "pc";
  const help = pc
    ? saveText("←→ セーブ/ロード　↑↓ ファイル　Space 決定　X 消す　Esc とじる", "←→ Save/Load  ↑↓ File  Space: OK  X: Delete  Esc: Close")
    : saveText("←→ セーブ/ロード　↑↓ ファイル　A 決定　X 消す　B とじる", "←→ Save/Load  ↑↓ File  A: OK  X: Delete  B: Close");
  ctx.fillText(showNote ? menu.note : help, win.x + win.w / 2, win.y + win.h - 34);

  // 確認
  if (menu.confirm) {
    ctx.fillStyle = "rgba(30, 20, 70, 0.55)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const box = { x: 330, y: 230, w: 620, h: 300 };
    panel(box, "rgba(255, 250, 255, 0.98)", "#ff8db7", 5, 22);
    ctx.fillStyle = "#4d4773";
    ctx.font = font(28);
    const q = menu.confirm === "delete"
      ? [saveText(`ファイル${menu.sel + 1}を消す？`, `Delete File ${menu.sel + 1}?`), saveText("消した記録は、もどせないよ。", "This can't be undone.")]
      : menu.confirm === "save"
      ? [saveText(`ファイル${menu.sel + 1}に上書きセーブする？`, `Overwrite File ${menu.sel + 1}?`), saveText("前の記録は消えるよ。", "The old record will be lost.")]
      : [saveText(`ファイル${menu.sel + 1}をロードする？`, `Load File ${menu.sel + 1}?`), saveText("今の進みぐあいは、ロードした記録に入れかわるよ。", "Your current progress will be replaced.")];
    ctx.fillText(q[0], box.x + box.w / 2, box.y + 76);
    ctx.fillStyle = "#7f67c8";
    ctx.font = font(20, 800);
    ctx.fillText(q[1], box.x + box.w / 2, box.y + 126);
    const labels = [saveText("はい", "Yes"), saveText("いいえ", "No")];
    for (let i = 0; i < 2; i++) {
      const b = lay.yesNo[i];
      const on = menu.choice === i;
      panel(b, on ? "#fff3a4" : "#ffffff", on ? "#ff5f9e" : "#c8b2ff", on ? 5 : 2, 18);
      ctx.fillStyle = "#4d4773";
      ctx.font = font(28);
      ctx.fillText(labels[i], b.x + b.w / 2, b.y + b.h / 2 + 1);
    }
  }
  ctx.restore();
}

function handleInventoryWorldMapConfirm(accept) {
  if (accept) returnToWorldMapFromInventory();
  else {
    state.inventoryConfirmWorldMap = false;
    playSfx(accept ? "decide" : "cancel");
  }
}

function drawEquippedWeaponPanel() {
  const r = { x: 956, y: 36, w: 158, h: 70 };
  ctx.save();
  ctx.fillStyle = "rgba(255, 243, 164, 0.94)";
  ctx.strokeStyle = "#9f91cf";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(r.x, r.y, r.w, r.h, 8);
  ctx.fill();
  ctx.stroke();
  const equipped = hasEquippedWeapon();
  if (equipped) {
    drawWeaponIcon(r.x + r.w / 2 - 2, r.y + 36, state.weaponPower, 0.9, 1);
  }
  ctx.restore();
}

function drawInventorySortPlanetButton() {
  const r = inventorySortButtonRect();
  ctx.save();
  const pressed = state.inventorySortFlash && performance.now() < state.inventorySortFlash;
  const focused = state.inventoryFocusMode === INVENTORY_FOCUS_MODES.AREA_SELECT && state.inventoryFocusArea === "sortButton";
  const pulse = 0.55 + Math.sin(performance.now() / 260) * 0.12;
  ctx.translate(pressed ? 2 : 0, pressed ? 3 : 0);
  ctx.fillStyle = pressed ? "rgba(255, 243, 164, 0.82)" : focused ? "rgba(255, 209, 237, 0.62)" : `rgba(158, 232, 255, ${pulse})`;
  ctx.strokeStyle = pressed || focused ? "#ff8db7" : "#fff3a4";
  ctx.lineWidth = pressed || focused ? 6 : 4;
  ctx.beginPath();
  ctx.arc(r.x + r.w / 2, r.y + r.h / 2, 34, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fill();
  ctx.strokeStyle = "#7f67c8";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(r.x + r.w / 2, r.y + r.h / 2, 36, 12, -0.35, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawInventoryFocusNavigation() {
  if (state.inventoryConfirmWorldMap) {
    drawInventoryWorldMapConfirm();
    return;
  }
  if (state.fusionPrompt) return;
  const mode = state.inventoryFocusMode ?? INVENTORY_FOCUS_MODES.AREA_SELECT;
  const area = state.inventoryFocusArea ?? "itemList";
  const buttons = inventoryTopMenuButtonRects();
  if (area === "itemList") {
    drawInventoryItemListFocusGlow(mode === INVENTORY_FOCUS_MODES.INSIDE_ITEM_LIST);
  }
  if (area === "topMenu" || mode === INVENTORY_FOCUS_MODES.INSIDE_TOP_MENU) {
    for (let i = 0; i < buttons.length; i++) {
      drawTopMenuNumberBadge(buttons[i], i + 1, mode === INVENTORY_FOCUS_MODES.INSIDE_TOP_MENU && i === state.inventoryTopMenuIndex);
    }
  }
  if (mode === INVENTORY_FOCUS_MODES.INSIDE_TOP_MENU) {
    drawInventoryFocusRect(buttons[state.inventoryTopMenuIndex ?? 0], "#ff5f9e", 5, 8);
  }
}

function drawInventoryItemListFocusGlow(active) {
  const r = inventoryItemListAreaRect();
  ctx.save();
  ctx.fillStyle = active ? "rgba(255, 243, 164, 0.1)" : "rgba(255, 209, 237, 0.08)";
  ctx.strokeStyle = active ? "#fff3a4" : "#ff8db7";
  ctx.shadowColor = active ? "#fff3a4" : "#ff8db7";
  ctx.shadowBlur = active ? 18 : 12;
  ctx.lineWidth = active ? 5 : 4;
  ctx.beginPath();
  ctx.roundRect(r.x, r.y, r.w, r.h, 10);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawInventoryFocusRect(r, color, width = 4, radius = 12) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 14;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.roundRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4, radius);
  ctx.stroke();
  ctx.restore();
}

function drawTopMenuNumberBadge(r, number, active) {
  ctx.save();
  const x = r.x + r.w - 18;
  const y = r.y + 18;
  ctx.fillStyle = active ? "#ff3d7f" : "rgba(255, 95, 158, 0.86)";
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = active ? 4 : 3;
  ctx.beginPath();
  ctx.arc(x, y, active ? 17 : 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 16px Segoe UI, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(number), x, y + 1);
  ctx.restore();
}

// ---------- いらない武器をすてる（もちもので X） ----------
function openDeletePrompt() {
  if (fuseLessonOn()) return fuseLessonNudge();

  const slot = inventorySlots()[state.inventorySelection];
  if (!slot || state.inventoryGrab) {
    playSfx("locked");
    return;
  }
  const lastEquipped = hasEquippedWeapon() && slot.power === state.weaponPower && (state.weaponInventory[slot.power - 1] ?? 0) <= 1;
  if (lastEquipped) {
    playSfx("locked");
    state.inventoryMessage = performance.now() + 1600;
    state.inventoryMessageLabel = language === "ja" ? "そうび中なのですてられない" : "Can't discard: equipped";
    return;
  }
  state.deletePrompt = { index: state.inventorySelection, power: slot.power, choice: 1 };
  playSfx("decide");
}

function answerDeletePrompt(yes) {
  const prompt = state.deletePrompt;
  state.deletePrompt = null;
  if (!yes || !prompt) {
    playSfx("cancel");
    return;
  }
  state.inventoryItems[prompt.index] = null;
  syncWeaponInventoryFromItems();
  if (state.weaponPower > 0 && !state.weaponInventory[state.weaponPower - 1]) {
    state.weaponPower = 0;
    state.gun.holder = "inventory";
  }
  playSfx("break");
  state.inventoryMessage = performance.now() + 1400;
  state.inventoryMessageLabel = language === "ja" ? `${weaponName(prompt.power)}をすてた` : `Discarded ${weaponName(prompt.power)}`;
}

function handleDeletePromptKey(code) {
  if (code === "ArrowLeft" || code === "ArrowRight" || code === "KeyA" || code === "KeyD") {
    state.deletePrompt.choice = 1 - state.deletePrompt.choice;
    playSfx("cursor");
  } else if (code === "Enter" || code === "Space" || code === "KeyZ") answerDeletePrompt(state.deletePrompt.choice === 0);
  else if (code === "Escape" || code === "KeyB") answerDeletePrompt(false);
  return true;
}

function handleDeletePromptPointer(x, y) {
  const pt = inventoryDialogPoint(x, y);
  const rects = inventoryWorldMapConfirmButtonRects();
  for (let i = 0; i < rects.length; i++) {
    const b = rects[i];
    if (pt.x >= b.x && pt.x <= b.x + b.w && pt.y >= b.y && pt.y <= b.y + b.h) {
      answerDeletePrompt(i === 0);
      return;
    }
  }
}

function drawDeletePrompt() {
  const prompt = state.deletePrompt;
  ctx.save();
  const r = { x: 420, y: 240, w: 440, h: 190 };
  ctx.fillStyle = "rgba(255, 250, 255, 0.96)";
  ctx.strokeStyle = "#ff3d5a";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(r.x, r.y, r.w, r.h, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#4d4773";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.font = "900 20px Segoe UI, system-ui, sans-serif";
  ctx.fillText(`${weaponName(prompt.power)} ${weaponLevelLabel(prompt.power)}`, r.x + r.w / 2, r.y + 26);
  ctx.font = "900 22px Segoe UI, system-ui, sans-serif";
  ctx.fillStyle = "#ff3d5a";
  ctx.fillText(language === "ja" ? "この武器をすてますか？" : "Discard this weapon?", r.x + r.w / 2, r.y + 62);
  const labels = language === "ja" ? ["はい", "いいえ"] : ["Yes", "No"];
  const rects = inventoryWorldMapConfirmButtonRects();
  for (let i = 0; i < labels.length; i++) {
    const b = rects[i];
    const selected = prompt.choice === i;
    ctx.fillStyle = selected ? "#fff3a4" : "#ffffff";
    ctx.strokeStyle = selected ? "#ff5f9e" : "#c8b2ff";
    ctx.lineWidth = selected ? 4 : 2;
    ctx.beginPath();
    ctx.roundRect(b.x, b.y, b.w, b.h, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#4d4773";
    ctx.font = "900 18px Segoe UI, system-ui, sans-serif";
    ctx.fillText(labels[i], b.x + b.w / 2, b.y + 12);
  }
  ctx.restore();
}

function drawInventoryWorldMapConfirm() {
  ctx.save();
  const r = { x: 420, y: 240, w: 440, h: 190 };
  ctx.fillStyle = "rgba(255, 250, 255, 0.96)";
  ctx.strokeStyle = "#ff8db7";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(r.x, r.y, r.w, r.h, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#4d4773";
  ctx.font = "900 24px Segoe UI, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("ワールドマップに戻りますか？", r.x + r.w / 2, r.y + 36);
  const labels = ["はい", "いいえ"];
  const rects = inventoryWorldMapConfirmButtonRects();
  for (let i = 0; i < labels.length; i++) {
    const b = rects[i];
    const selected = (state.inventoryConfirmChoice ?? 0) === i;
    ctx.fillStyle = selected ? "#fff3a4" : "#ffffff";
    ctx.strokeStyle = selected ? "#ff5f9e" : "#c8b2ff";
    ctx.lineWidth = selected ? 4 : 2;
    ctx.beginPath();
    ctx.roundRect(b.x, b.y, b.w, b.h, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#4d4773";
    ctx.font = "900 18px Segoe UI, system-ui, sans-serif";
    ctx.fillText(labels[i], b.x + b.w / 2, b.y + 12);
  }
  ctx.restore();
}

function drawInventoryMessage() {
  if (!state.inventoryMessage || performance.now() > state.inventoryMessage) return;
  ctx.save();
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = "rgba(77, 71, 115, 0.9)";
  ctx.strokeStyle = "#fff3a4";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(646, 124, 400, 56, 16);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.font = `900 26px ${FX.FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(state.inventoryMessageLabel || t("sorted"), 846, 153);
  ctx.restore();
}

function drawInventoryTabs(x, y) {
  const tabs = ["EXIT", "FILE", "MAP", "ITEM"];
  ctx.font = "900 23px Georgia, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let i = 0; i < tabs.length; i++) {
    const tx = x + 28 + i * 100;
    ctx.fillStyle = tabs[i] === "ITEM" ? "#fff3a4" : "#ffffff";
    ctx.strokeStyle = "#9f91cf";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(tx, y + 18, 86, 42, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = tabs[i] === "ITEM" ? "#ff8db7" : "#4d4773";
    ctx.fillText(tabs[i], tx + 43, y + 39);
  }
}

function drawPyompyStatusPanel(x, y, w, h) {
  ctx.fillStyle = "#f8f4ff";
  ctx.strokeStyle = "#9f91cf";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 6);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#7f67c8";
  ctx.font = "900 18px Georgia, serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("STATUS", x + 18, y + 18);

  ctx.fillStyle = "#d7c8ff";
  ctx.fillRect(x + 20, y + 50, 132, 118);
  drawPyompyPortrait(x + 86, y + 124);
  ctx.fillStyle = "#7f67c8";
  ctx.fillRect(x + 20, y + 178, 132, 34);
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 21px Georgia, serif";
  ctx.textAlign = "center";
  ctx.fillText("PYON-P", x + 86, y + 202);

  ctx.fillStyle = "#ebfbff";
  ctx.strokeStyle = "#8edce8";
  ctx.strokeRect(x + 168, y + 50, 270, 74);
  ctx.fillStyle = "#4d4773";
  ctx.font = "800 15px Segoe UI, system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("DATA", x + 180, y + 60);
  ctx.fillText("NAME     PYON-P", x + 180, y + 82);
  ctx.fillText(`STAGE    ${stageLabel()}`, x + 180, y + 102);
  ctx.fillText(`WEAPON   ${weaponName()}`, x + 180, y + 122);

  ctx.fillStyle = "#eefcff";
  ctx.strokeStyle = "#8edce8";
  ctx.strokeRect(x + 168, y + 144, 270, 112);
  ctx.fillStyle = "#4d4773";
  ctx.fillText("CONDITION", x + 180, y + 154);
  drawHeartMonitor(x + 184, y + 178, 178, 58);
  ctx.fillStyle = "#67d973";
  ctx.font = "900 28px Georgia, serif";
  ctx.fillText(state.lives >= 4 ? "Fine" : state.lives >= 2 ? "Caution" : "Danger", x + 370, y + 222);
}

function drawPyompyPortrait(cx, cy) {
  ctx.save();
  ctx.translate(cx - 20, cy - 35);
  ctx.scale(1.8, 1.8);
  drawPlayerFallback({ x: 0, y: 0 });
  ctx.restore();
}

function drawHeartMonitor(x, y, w, h) {
  ctx.save();
  ctx.strokeStyle = "rgba(103, 217, 115, 0.18)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 6; i++) {
    ctx.beginPath();
    ctx.moveTo(x, y + i * h / 6);
    ctx.lineTo(x + w, y + i * h / 6);
    ctx.stroke();
  }
  ctx.strokeStyle = "#67d973";
  ctx.lineWidth = 4;
  ctx.beginPath();
  const points = [[0, 0.58], [0.18, 0.58], [0.25, 0.18], [0.33, 0.86], [0.43, 0.28], [0.52, 0.62], [0.62, 0.36], [0.7, 0.58], [1, 0.58]];
  points.forEach(([px, py], i) => {
    const xx = x + px * w;
    const yy = y + py * h;
    if (i === 0) ctx.moveTo(xx, yy);
    else ctx.lineTo(xx, yy);
  });
  ctx.stroke();
  ctx.restore();
}

function drawInventoryCommand(x, y) {
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#9f91cf";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(x, y, 96, 118, 4);
  ctx.fill();
  ctx.stroke();
  const commands = ["使う", "調べる", "組合せ"];
  ctx.textAlign = "center";
  ctx.font = "900 20px Georgia, serif";
  for (let i = 0; i < commands.length; i++) {
    ctx.fillStyle = i === 2 ? "#9ee8ff" : "#f8f4ff";
    ctx.fillRect(x + 10, y + 10 + i * 34, 76, 28);
    ctx.fillStyle = "#4d4773";
    ctx.fillText(commands[i], x + 48, y + 31 + i * 34);
  }
}

function drawItemCase(x, y, w, h) {
  ctx.fillStyle = "#f8f4ff";
  ctx.strokeStyle = "#9f91cf";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#7f67c8";
  ctx.font = "900 18px Georgia, serif";
  ctx.textAlign = "center";
  ctx.fillText("ITEM LIST", x + w / 2, y + h - 18);

  for (const slot of inventorySlotRects()) drawInventorySlot(slot);
}

// 下に会話の欄がある端末（スマホのたて持ち）では、コメントはそっちに出して、
// そうび画面の中のコメント欄はなくす。空いたぶんマスをたてに大きくする
function inventoryTalkBelow() {
  return typeof Handheld !== "undefined" && Handheld.active() && Handheld.commOn();
}

function inventoryBodyHeight() {
  return inventoryTalkBelow() ? 588 : 474;
}

function inventorySlotRects() {
  const slots = inventorySlots();
  const rects = [];
  const startX = 446;
  const startY = 118;
  const size = 150;
  const gapX = 13;
  const gapY = 12;
  const slotH = (inventoryBodyHeight() - gapY * 2) / 3;
  clampInventoryScroll();
  for (let i = 0; i < VISIBLE_INVENTORY_ITEMS; i++) {
    const col = i % 5;
    const row = Math.floor(i / 5);
    const index = state.inventoryScroll + i;
    const item = slots[index] || null;
    rects.push({ ...(item || {}), empty: !item, index, x: startX + col * (size + gapX), y: startY + row * (slotH + gapY), w: size, h: slotH });
  }
  return rects;
}

function drawInventorySlot(slot) {
  const inList = (state.inventoryFocusMode ?? INVENTORY_FOCUS_MODES.INSIDE_ITEM_LIST) === INVENTORY_FOCUS_MODES.INSIDE_ITEM_LIST;
  const selected = state.inventorySelection === slot.index;
  const grabbed = state.inventoryGrab?.from === slot.index;
  // 同じ武器がいくつあっても「そうび中」の札は最初の1つだけに出す
  const equipped = !slot.empty && hasEquippedWeapon() && state.weaponPower === slot.power &&
    inventorySlots().findIndex(item => item?.power === state.weaponPower) === slot.index;
  const t = performance.now() / 1000;
  ctx.save();
  ctx.globalAlpha = grabbed ? 0.35 : 1;
  const art = selected && inList ? uiArt.slotSel : uiArt.slot;
  if (uiReady(art)) {
    ctx.drawImage(art, slot.x, slot.y, slot.w, slot.h);
  } else {
    if (selected && inList) {
      ctx.shadowColor = "#ffd85a";
      ctx.shadowBlur = 16 + Math.sin(t * 6) * 6;
    }
    ctx.fillStyle = selected ? "rgba(255, 249, 214, 0.92)" : slot.empty ? "rgba(255, 255, 255, 0.34)" : "rgba(255, 255, 255, 0.74)";
    ctx.strokeStyle = selected ? (inList ? "#ff8db7" : "#ffd85a") : "rgba(142, 220, 232, 0.9)";
    ctx.lineWidth = selected ? 6 : 3;
    ctx.beginPath();
    ctx.roundRect(slot.x + 3, slot.y + 3, slot.w - 6, slot.h - 6, 18);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
  if (slot.empty) {
    ctx.restore();
    return;
  }
  // つかんでいる武器と合成できるマスは、赤く光らせて「合成」の札を出す
  const grab = state.inventoryGrab;
  const fusable = grab && slot.index !== grab.from && fusionResult(slot.power, grab.power) !== null;
  if (fusable) {
    const pulse = 0.6 + Math.sin(t * 8) * 0.4;
    ctx.save();
    ctx.shadowColor = "#ff3d5a";
    ctx.shadowBlur = 18 + pulse * 10;
    ctx.fillStyle = `rgba(255, 61, 90, ${0.12 + pulse * 0.12})`;
    ctx.strokeStyle = "#ff3d5a";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.roundRect(slot.x + 3, slot.y + 3, slot.w - 6, slot.h - 6, 18);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  drawWeaponIcon(slot.x + slot.w / 2, slot.y + slot.h / 2 - (equipped ? 10 : 2), slot.power, weaponIconFitScale(slot.power, slot.w - 20, 1.7), 1);
  if (fusable) {
    ctx.fillStyle = "#ff3d5a";
    ctx.beginPath();
    ctx.roundRect(slot.x + 16, slot.y + slot.h - 40, slot.w - 32, 30, 15);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = `900 20px ${FX.FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(language === "ja" ? "合成できる" : "FUSE", slot.x + slot.w / 2, slot.y + slot.h - 24);
  }
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // レベル
  ctx.fillStyle = "#7f67c8";
  ctx.font = `900 22px ${FX.FONT}`;
  ctx.textAlign = "left";
  drawWeaponMark(slot.x + 24, slot.y + 24, 24, slot.power);
  ctx.fillText(`Lv${weaponRank(slot.power)}`, slot.x + 40, slot.y + 25);
  // 同じ武器の数
  const count = state.weaponInventory[slot.power - 1] ?? 0;
  if (count > 1) {
    ctx.fillStyle = "#ffd85a";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(slot.x + slot.w - 62, slot.y + 8, 54, 34, 14);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#5a3d9a";
    ctx.font = `900 24px ${FX.FONT}`;
    ctx.textAlign = "center";
    ctx.fillText(`×${count}`, slot.x + slot.w - 35, slot.y + 26);
  }
  if (equipped && !fusable) {
    ctx.fillStyle = "#ff8db7";
    ctx.beginPath();
    ctx.roundRect(slot.x + 16, slot.y + slot.h - 40, slot.w - 32, 30, 15);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = `900 20px ${FX.FONT}`;
    ctx.textAlign = "center";
    ctx.fillText(language === "ja" ? "そうび中" : "EQUIPPED", slot.x + slot.w / 2, slot.y + slot.h - 24);
  }
  ctx.restore();
}

function drawDraggedInventoryItem() {
  const drag = state.inventoryGrab;
  if (!drag) return;
  // ボタン（A・Space）でつかんだときも、十字キーで選んだマスへついてくる
  if (!drag.pointer && !drag.gamepad) {
    const slot = inventorySlotRects().find(s => s.index === state.inventorySelection);
    if (slot) {
      drag.x = slot.x + slot.w / 2;
      drag.y = slot.y + slot.h / 2;
      drag.displayX = (drag.displayX ?? drag.x) + (drag.x - (drag.displayX ?? drag.x)) * 0.35;
      drag.displayY = (drag.displayY ?? drag.y) + (drag.y - (drag.displayY ?? drag.y)) * 0.35;
      drag.moved = drag.moved || drag.from !== state.inventorySelection;
    }
  }
  const t = performance.now() / 1000;
  const cx = drag.displayX ?? drag.x;
  const cy = drag.displayY ?? drag.y;
  const lift = 22 + Math.sin(t * 5) * 5; // ふわふわ浮かせる
  const target = inventorySlotRects().find(s => s.index === state.inventorySelection);
  const canFuseHere = !drag.pointer && target && !target.empty && target.index !== drag.from && fusionResult(target.power, drag.power) !== null;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1.6, 1.6);
  ctx.translate(-cx, -cy);
  // 下に落ちる影
  ctx.fillStyle = "rgba(40, 26, 96, 0.28)";
  ctx.beginPath();
  ctx.ellipse(cx, cy + 26, 30 - Math.sin(t * 5) * 4, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.translate(cx, cy - lift);
  ctx.rotate(Math.sin(t * 8) * 0.05);
  // うしろの光
  const glow = ctx.createRadialGradient(0, 0, 6, 0, 0, 58);
  glow.addColorStop(0, canFuseHere ? "rgba(255, 141, 183, 0.75)" : "rgba(255, 243, 164, 0.7)");
  glow.addColorStop(1, "rgba(255, 243, 164, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, 58, 0, Math.PI * 2);
  ctx.fill();
  drawWeaponIcon(0, 0, drag.power, 1.4, 1);
  ctx.strokeStyle = canFuseHere ? "#ff8db7" : "#fff3a4";
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 6]);
  ctx.lineDashOffset = -t * 30;
  ctx.beginPath();
  ctx.roundRect(-44, -34, 88, 68, 10);
  ctx.stroke();
  ctx.setLineDash([]);
  // 同じ光線銃の上に来たら「合成！」と出す
  if (canFuseHere) {
    ctx.fillStyle = "#ff8db7";
    ctx.beginPath();
    ctx.roundRect(-56, -62, 112, 24, 12);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 14px Segoe UI, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(language === "ja" ? "はなして合成" : "Release: Fuse", 0, -50);
  }
  ctx.restore();
}

function drawGamepadInventoryGhost() {
  const grab = state.inventoryGrab;
  if (!grab || grab.pointer) return;
  const slot = inventorySlotRects().find(s => s.index === state.inventorySelection);
  if (!slot) return;
  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.translate(slot.x + slot.w / 2, slot.y + slot.h / 2);
  drawWeaponIcon(0, 0, grab.power, 1.7, 1);
  ctx.restore();
}

function drawSelectedWeaponPreview() {
  const slot = inventorySlots()[state.inventorySelection];
  if (state.fusionPrompt || state.inventoryConfirmWorldMap) return;
  if (slot) drawWeaponDetail(slot.power);
  drawPyonpyCommentPanel(inventoryFocusComment(slot?.power));
}

function drawWeaponDetail(power) {
  const stage = weaponStage(power);
  const nextPower = nextFusionPower(power);
  ctx.save();

  const x = 462;
  const y = 154;
  const w = 252;
  const h = 370;
  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, "rgba(255, 245, 252, 0.34)");
  grad.addColorStop(0.55, "rgba(232, 248, 255, 0.28)");
  grad.addColorStop(1, "rgba(246, 238, 255, 0.32)");
  ctx.fillStyle = grad;
  ctx.strokeStyle = "rgba(255,255,255,0.38)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.translate(x + w / 2, y + 48);
  drawWeaponIcon(0, 0, power, 1.02, 1);
  ctx.restore();

  ctx.fillStyle = "#7f67c8";
  ctx.font = "900 17px Segoe UI, system-ui, sans-serif";
  wrapText(weaponName(power), x + w / 2, y + 88, w - 42, 21, true);
  ctx.fillStyle = "#ff8db7";
  ctx.font = "900 13px Segoe UI, system-ui, sans-serif";
  ctx.fillText(`Lv ${power}`, x + w / 2, y + 132);

  drawStatBar(t("atk"), stage.damage, 16, x + 32, y + 166, 188);
  drawStatBar(t("range"), stage.range, 2400, x + 32, y + 212, 188);
  drawStatBar(t("rapid"), Math.round((1 / stage.cooldown) * 10), 80, x + 32, y + 258, 188);

  ctx.textAlign = "center";
  if (nextPower) {
    ctx.fillStyle = "#4d4773";
    ctx.font = "900 12px Segoe UI, system-ui, sans-serif";
    ctx.fillText(t("fusionNext"), x + w / 2, y + 292);
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.filter = "grayscale(1) brightness(0.62) contrast(1.25)";
    drawWeaponIcon(x + w / 2, y + 322, nextPower, 0.54, 1);
    ctx.restore();
    ctx.fillStyle = "#4d4773";
    ctx.font = "800 11px Segoe UI, system-ui, sans-serif";
    wrapText(weaponName(nextPower), x + w / 2, y + 348, w - 54, 15, true);
  } else {
    ctx.fillStyle = "#4d4773";
    ctx.font = "900 13px Segoe UI, system-ui, sans-serif";
    wrapText(t("finalEvolution"), x + w / 2, y + 330, w - 48, 18, true);
  }

  ctx.restore();
}

// ---------- はじめての合成を、ていねいに教える ----------
// 同じ武器を2つ持っていて、まだ合成したことがないときだけ。1回合成したら、もう出さない
function fuseGuideDone() {
  return !!Story.data.seen?.fuseGuide;
}

function findFusePair() {
  const items = state.inventoryItems ?? [];
  for (let i = 0; i < items.length; i++) {
    if (!items[i]) continue;
    for (let j = i + 1; j < items.length; j++) {
      if (items[j] === items[i] && fusionResult(items[i], items[j]) !== null) return [i, j];
    }
  }
  return null;
}

function fuseGuideStep() {
  if (!state || state.mode !== "inventory" || fuseGuideDone() || state.saveMenu || state.deletePrompt) return null;
  if (state.fusionPrompt) return { step: 3 };
  const grab = state.inventoryGrab;
  if (grab) {
    const items = state.inventoryItems ?? [];
    const target = items.findIndex((p, i) => p && i !== grab.from && p === grab.power && fusionResult(p, grab.power) !== null);
    return target >= 0 ? { step: 2, target } : null;
  }
  const pair = findFusePair();
  if (!pair) return null;
  const sel = state.inventorySelection;
  const source = pair.includes(sel) ? sel : pair[0];
  return { step: 1, source, target: source === pair[0] ? pair[1] : pair[0] };
}

// はじめての合成は、ヤナビスが教える。決まった動きだけできて、合成するまで画面をとじられない
function fuseGuideText(g) {
  const pc = typeof controlMode !== "undefined" && controlMode === "pc";
  const a = pc ? "Space" : "A";
  if (g.step === 1) return `はじめての合成です。同じ武器を2つ重ねると、強い武器になります。まず、光っている武器の上で ${a} をおしたままにしてください。`;
  if (g.step === 2) return `つかめましたね。${a} をおしたまま、十字キーで、もうひとつの光っている武器の上まで運んで、そこで ${a} をはなしてください。`;
  return `「はい」をえらんで、${a} で合成です！`;
}

function fuseLessonOn() {
  return !!state && state.mode === "inventory" && !fuseGuideDone() && !!fuseGuideStep();
}

// レッスン中に、決まった動き以外をしようとしたとき
function fuseLessonNudge(text = "まずは一度、合成してみましょう！ 光っている武器をつかんでください。") {
  state.inventorySortComment = `ヤナビス「${text}」`;
  state.inventorySortCommentUntil = performance.now() + 2600;
  playSfx("locked");
}

function fuseLessonDoneText() {
  const pc = typeof controlMode !== "undefined" && controlMode === "pc";
  return pc
    ? "合成できました！ 同じ武器を重ねるたびに強くなりますよ。Tab でこの画面をとじて、冒険にもどりましょう。"
    : "合成できました！ 同じ武器を重ねるたびに強くなりますよ。SELECT でこの画面をとじて、冒険にもどりましょう。";
}

function drawFuseGuide() {
  const g = fuseGuideStep();
  if (!g || g.step === 3) return;
  const rects = inventorySlotRects();
  const idx = g.step === 1 ? g.source : g.target;
  const r = rects.find(s => s.index === idx);
  const other = g.step === 1 ? rects.find(s => s.index === g.target) : null;
  const t = performance.now() / 1000;
  ctx.save();
  const glow = (s, color) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 6 + Math.sin(t * 6) * 2;
    ctx.shadowColor = color;
    ctx.shadowBlur = 22;
    ctx.beginPath();
    ctx.roundRect(s.x - 6, s.y - 6, s.w + 12, s.h + 12, 18);
    ctx.stroke();
  };
  if (other) glow(other, "rgba(255, 216, 90, 0.55)");
  if (r) {
    glow(r, "#ffd85a");
    // 上下にはねる矢印と、ひとこと
    const cx = r.x + r.w / 2;
    // 上の段は、上のメニューにかぶらないように、下から指す
    const below = r.y < 200;
    const bob = Math.sin(t * 7) * 7;
    const ay = below ? r.y + r.h + 18 + bob : r.y - 18 + bob;
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#ff5f9e";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 4;
    ctx.beginPath();
    if (below) {
      ctx.moveTo(cx - 20, ay + 26);
      ctx.lineTo(cx + 20, ay + 26);
      ctx.lineTo(cx, ay);
    } else {
      ctx.moveTo(cx - 20, ay - 26);
      ctx.lineTo(cx + 20, ay - 26);
      ctx.lineTo(cx, ay);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
    const pc = typeof controlMode !== "undefined" && controlMode === "pc";
    const key = pc ? "Space" : "A";
    const ja = language === "ja";
    const label = g.step === 1 ? (ja ? `${key} をおしたまま` : `Hold ${key}`) : (ja ? `ここで ${key} をはなす` : `Release ${key} here`);
    ctx.font = `900 24px ${FX.FONT}`;
    const w = ctx.measureText(label).width + 30;
    const bx = clamp(cx - w / 2, 20, canvas.width - w - 20);
    const by = below ? ay + 32 : Math.max(8, ay - 72);
    ctx.fillStyle = "#fff3a4";
    ctx.strokeStyle = "#ff5f9e";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(bx, by, w, 40, 20);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#5a3d9a";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, bx + w / 2, by + 21);
  }
  ctx.restore();
}

function inventoryFocusComment(power = state.weaponPower) {
  if (state.inventorySortComment && performance.now() < (state.inventorySortCommentUntil ?? 0)) {
    return state.inventorySortComment;
  }
  const guide = fuseGuideStep();
  if (guide) return `ヤナビス「${fuseGuideText(guide)}」`;
  if (state.fuseLessonJustDone) return `ヤナビス「${fuseLessonDoneText()}」`;
  if (state.inventoryConfirmWorldMap) {
    return "ぴょんぴー「ワールドマップに戻るんか？ はいならマップへ、いいえならここに残るじょ！」";
  }
  const mode = state.inventoryFocusMode ?? INVENTORY_FOCUS_MODES.AREA_SELECT;
  const area = state.inventoryFocusArea ?? "itemList";
  if (mode === INVENTORY_FOCUS_MODES.INSIDE_TOP_MENU) {
    const messages = [
      "ぴょんぴー「ここはゲーム画面に戻るボタンじゃ。冒険に戻ろう！」",
      "ぴょんぴー「せいとんボタンじゃ。もちものを前からきれいにならべなおすじょ！」",
      "ぴょんぴー「ここはワールドマップに戻るボタンじゃ。押す前に確認するけんな！」",
      "ぴょんぴー「ここはセーブとロードじゃ。ファイルは3つまで記録できるじょ！」"
    ];
    return messages[state.inventoryTopMenuIndex ?? 0] ?? messages[0];
  }
  if (mode === INVENTORY_FOCUS_MODES.INSIDE_ITEM_LIST && power) {
    if (state.inventoryGrab) return "ぴょんぴー「同じ武器の上ではなすと合成、からっぽのマスではなすと移動、その場ではなすとそうびじゃ！」";
    return pyonpyWeaponComment(power);
  }
  if (mode === INVENTORY_FOCUS_MODES.INSIDE_ITEM_LIST) {
    return "ぴょんぴー「Aで武器をつかめるじょ。Xでいらん武器をすてる、Yでせいとん、一番上で↑をおすとメニュー、Bでとじるじょ！」";
  }
  if (area === "topMenu") {
    return "ぴょんぴー「上のメニューじゃ。Aで入ると、ゲームに戻るボタンやマップに戻るボタンを選べるじょ！」";
  }
  if (area === "sortButton") {
    return "ぴょんぴー「この惑星ボタンを押すと、アイテムが前からきれいに整理されるじょ！」";
  }
  return "ぴょんぴー「ここはアイテムリストじゃ。武器と武器を融合させて、もっと強い武器を作れるじょ！」";
}

function drawPyonpyCommentPanel(comment) {
  const x = 40;
  const y = 570;
  const w = 1188;
  const h = 96;
  ctx.save();
  ctx.fillStyle = "rgba(255, 245, 252, 0.34)";
  ctx.strokeStyle = "rgba(200, 178, 255, 0.58)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#4d4773";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.88)";
  ctx.lineWidth = 4;
  ctx.font = "900 20px Segoe UI, system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  wrapText(comment, x + 36, y + 24, w - 72, 28, true);
  ctx.restore();
}

function drawStatBar(label, value, max, x, y, width = 180) {
  const ratio = clamp(value / max, 0, 1);
  ctx.fillStyle = "#4d4773";
  ctx.font = "900 12px Segoe UI, system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`${label} ${value}`, x, y);
  ctx.fillStyle = "#d7c8ff";
  ctx.beginPath();
  ctx.roundRect(x, y + 17, width, 8, 4);
  ctx.fill();
  ctx.fillStyle = "#ff8db7";
  ctx.beginPath();
  ctx.roundRect(x, y + 17, width * ratio, 8, 4);
  ctx.fill();
}

function wrapText(text, x, y, maxWidth, lineHeight, stroke = false) {
  let line = "";
  let lineY = y;
  for (const char of text) {
    const test = line + char;
    if (ctx.measureText(test).width > maxWidth && line) {
      if (stroke) ctx.strokeText(line, x, lineY);
      ctx.fillText(line, x, lineY);
      line = char;
      lineY += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) {
    if (stroke) ctx.strokeText(line, x, lineY);
    ctx.fillText(line, x, lineY);
  }
}

function drawFusionPrompt() {
  const prompt = state.fusionPrompt;
  const x = canvas.width / 2 - 270;
  const y = canvas.height / 2 - 56;
  const buttons = fusionPromptButtonRects();
  ctx.save();
  ctx.fillStyle = "#fffaf0";
  ctx.strokeStyle = "#c8b2ff";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(x, y, 540, 112, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#4d4773";
  ctx.font = "900 23px Georgia, serif";
  ctx.textAlign = "center";
  const result = Number.isInteger(prompt.to) ? fusionResult(state.inventoryItems[prompt.from], state.inventoryItems[prompt.to]) : null;
  const question = result === FIGHTER_POWER ? (language === "ja" ? "戦闘機に進化しますか？" : "Evolve into the Fighter?")
    : result === MECH_POWER ? (language === "ja" ? "ロボットに合体しますか？" : "Combine into the Mecha?")
    : isMechPower(result) ? (language === "ja" ? `ロボットを合体して ${weaponLevelLabel(result)} にしますか？` : `Merge into ${weaponLevelLabel(result)}?`)
    : `${weaponName(prompt.power)}${t("fuseQuestion")}`;
  ctx.fillText(question, canvas.width / 2, y + 36);
  const labels = ["Yes", "No"];
  ctx.font = "900 28px Georgia, serif";
  for (let i = 0; i < buttons.length; i++) {
    const b = buttons[i];
    const selected = prompt.choice === i;
    ctx.fillStyle = selected ? "#fff3a4" : "#ffffff";
    ctx.strokeStyle = selected ? "#ff8db7" : "#c8b2ff";
    ctx.lineWidth = selected ? 4 : 2;
    ctx.beginPath();
    ctx.roundRect(b.x, b.y, b.w, b.h, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = selected ? "#ff5f9e" : "#4d4773";
    ctx.fillText(labels[i], b.x + b.w / 2, b.y + 32);
  }
  ctx.restore();
}

function drawSky(cam) {
  const theme = courses[currentCourse]?.theme;
  if (!theme) {
    if (pastelBackground.complete && pastelBackground.naturalWidth > 0) {
      drawPastelBackgroundImage(cam);
      return;
    }

    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "#bfc6ff");
    gradient.addColorStop(0.42, "#dfc8ff");
    gradient.addColorStop(0.72, "#ffd4ec");
    gradient.addColorStop(1, "#fff0c8");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < 68; i++) {
      const x = ((i * 151 - cam * 0.16) % 1080 + 1080) % 1080 - 60;
      const y = 24 + ((i * 67) % 310);
      const size = 2 + (i % 3);
      ctx.fillStyle = i % 6 === 0 ? "rgba(255, 246, 166, 0.92)" : "rgba(255, 255, 255, 0.8)";
      if (i % 8 === 0) drawTinyStar(x, y, size + 2);
      else {
        ctx.beginPath();
        ctx.arc(x, y, size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    drawPastelRibbon(cam);
    drawPlanet(790 - cam * 0.06, 88, 76);
    drawMoon(150 - cam * 0.1, 112, 52);
    return;
  }

  ensureStageBackground(theme.imageIndex);
  const bg = stageBackgroundImages[theme.imageIndex];
  if (bg?.complete && bg.naturalWidth > 0) {
    if (theme.imageIndex === 0) drawPastelBackgroundImage(cam);
    else drawStageBackgroundImage(bg, stageBackgroundMirrorImages[theme.imageIndex], cam);
    return;
  }

  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, theme.sky[0]);
  gradient.addColorStop(0.5, theme.sky[1]);
  gradient.addColorStop(1, theme.sky[2]);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 82; i++) {
    const x = ((i * 151 - cam * 0.14) % 1080 + 1080) % 1080 - 60;
    const y = 18 + ((i * 67) % 340);
    const size = 1.5 + (i % 4);
    ctx.fillStyle = i % 7 === 0 ? theme.accent : "rgba(255, 255, 255, 0.78)";
    if (i % 8 === 0) drawTinyStar(x, y, size + 2);
    else {
      ctx.beginPath();
      ctx.arc(x, y, size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawWorldIllustration(theme, cam);
}

function drawStageBackgroundImage(img, mirrorImg, cam) {
  const imgW = img.naturalWidth;
  const imgH = img.naturalHeight;
  const scale = Math.max(canvas.width / imgW, canvas.height / imgH);
  const drawW = imgW * scale;
  const drawH = imgH * scale;
  const y = (canvas.height - drawH) / 2;
  const mirrorReady = mirrorImg?.complete && mirrorImg.naturalWidth > 0;
  const pairW = mirrorReady ? drawW * 2 : drawW;
  const parallax = (cam * 0.08) % pairW;
  for (let x = -parallax - pairW; x < canvas.width + pairW; x += pairW) {
    ctx.drawImage(img, x, y, drawW, drawH);
    if (mirrorReady) ctx.drawImage(mirrorImg, x + drawW, y, drawW, drawH);
  }
}

function drawWorldIllustration(theme, cam) {
  const world = courses[currentCourse]?.worldIndex ?? 0;
  const area = courses[currentCourse]?.areaIndex ?? 0;
  ctx.save();
  if (world === 0) {
    drawPlanet(770 - cam * 0.05, 105, 86);
    ctx.strokeStyle = "rgba(255, 207, 115, 0.56)";
    ctx.lineWidth = 5;
    for (let x = -80 - (cam * 0.18) % 240; x < canvas.width + 160; x += 240) {
      ctx.beginPath();
      ctx.moveTo(x, 448);
      ctx.lineTo(x + 70, 320);
      ctx.lineTo(x + 140, 448);
      ctx.stroke();
    }
  } else if (world === 1) {
    drawPlanet(700 - cam * 0.04, 92, 72);
    ctx.fillStyle = "rgba(198,255,244,0.38)";
    for (let x = -120 - (cam * 0.22) % 300; x < canvas.width + 200; x += 300) {
      ctx.beginPath();
      ctx.moveTo(x, 470);
      ctx.lineTo(x + 86, 230);
      ctx.lineTo(x + 166, 470);
      ctx.fill();
    }
  } else if (world === 2) {
    ctx.globalAlpha = 0.48;
    for (let y = 80; y < 390; y += 58) {
      ctx.strokeStyle = y % 116 === 0 ? "#bff8ff" : "#6af6d7";
      ctx.lineWidth = 5;
      ctx.beginPath();
      for (let x = -40; x <= canvas.width + 40; x += 36) {
        const wy = y + Math.sin((x + cam * 0.1) / 80) * 13;
        if (x === -40) ctx.moveTo(x, wy);
        else ctx.lineTo(x, wy);
      }
      ctx.stroke();
    }
    drawMoon(160 - cam * 0.08, 112, 50);
  } else if (world === 3) {
    drawPlanet(790 - cam * 0.04, 102, 94);
    ctx.strokeStyle = "rgba(255, 243, 164, 0.62)";
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.ellipse(790 - cam * 0.04, 102, 158, 28, -0.16, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    ctx.fillStyle = "rgba(255, 61, 127, 0.18)";
    for (let x = -160 - (cam * 0.12) % 360; x < canvas.width + 220; x += 360) {
      ctx.beginPath();
      ctx.moveTo(x, 492);
      ctx.lineTo(x + 70, 190);
      ctx.lineTo(x + 145, 492);
      ctx.fill();
      ctx.fillRect(x + 36, 245, 68, 210);
    }
    drawMoon(820 - cam * 0.04, 92, 58);
  }
  drawStageLandmark(theme, world, area, cam);
  drawPastelRibbon(cam);
  ctx.restore();
}

function drawStageLandmark(theme, world, area, cam) {
  const landmark = AREA_LANDMARKS[area];
  const drift = (cam * (0.2 + area * 0.025)) % 760;
  const baseX = 620 - drift;
  ctx.save();
  ctx.globalAlpha = 0.72;
  for (let repeat = 0; repeat < 3; repeat++) {
    const x = baseX + repeat * 760;
    if (landmark === "outpost") drawOutpost(x, 420, theme, world);
    if (landmark === "towers") drawSignalTowers(x, 430, theme, world);
    if (landmark === "harbor") drawAlienHarbor(x, 426, theme, world);
    if (landmark === "reactor") drawPlanetReactor(x, 428, theme, world);
    if (landmark === "throne") drawBossGate(x, 430, theme, world);
  }
  ctx.restore();
}

function drawOutpost(x, y, theme, world) {
  ctx.fillStyle = "rgba(255,255,255,0.16)";
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(x - 82, y - 74, 164, 74, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = `${theme.ground[1]}bb`;
  ctx.fillRect(x - 62, y - 112, 36, 112);
  ctx.fillRect(x + 28, y - 96, 34, 96);
  ctx.fillStyle = theme.accent;
  for (let i = 0; i < 4; i++) ctx.fillRect(x - 52 + i * 28, y - 52, 12, 12);
  if (world === 0) {
    ctx.strokeStyle = "rgba(255,207,115,0.58)";
    ctx.beginPath();
    ctx.arc(x, y - 112, 42, 0.2, Math.PI - 0.2);
    ctx.stroke();
  }
}

function drawSignalTowers(x, y, theme, world) {
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 4;
  for (let i = 0; i < 3; i++) {
    const tx = x - 90 + i * 90;
    ctx.beginPath();
    ctx.moveTo(tx, y);
    ctx.lineTo(tx + 30, y - 170 - i * 20);
    ctx.lineTo(tx + 60, y);
    ctx.stroke();
    ctx.fillStyle = world === 1 ? "rgba(198,255,244,0.42)" : "rgba(255,255,255,0.22)";
    ctx.beginPath();
    ctx.arc(tx + 30, y - 180 - i * 20, 20 + i * 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawAlienHarbor(x, y, theme) {
  ctx.strokeStyle = "rgba(191,248,255,0.56)";
  ctx.lineWidth = 5;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.ellipse(x - 120 + i * 80, y - 54 - (i % 2) * 24, 52, 18, -0.12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = `${theme.ground[0]}66`;
    ctx.fill();
  }
  ctx.fillStyle = "rgba(255,255,255,0.16)";
  ctx.beginPath();
  ctx.arc(x, y - 132, 46, 0, Math.PI * 2);
  ctx.fill();
}

function drawPlanetReactor(x, y, theme) {
  ctx.fillStyle = `${theme.ground[1]}aa`;
  ctx.beginPath();
  ctx.roundRect(x - 102, y - 132, 204, 132, 8);
  ctx.fill();
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(x, y - 78, 52, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.48)";
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(x, y - 78, 26 + i * 18, i * 0.7, Math.PI + i * 0.7);
    ctx.stroke();
  }
}

function drawBossGate(x, y, theme, world) {
  ctx.fillStyle = world === 4 ? "rgba(10,8,24,0.78)" : `${theme.ground[1]}aa`;
  ctx.strokeStyle = world === 4 ? "#ff3d7f" : theme.accent;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(x - 110, y);
  ctx.lineTo(x - 88, y - 154);
  ctx.quadraticCurveTo(x, y - 224, x + 88, y - 154);
  ctx.lineTo(x + 110, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.beginPath();
  ctx.arc(x, y - 116, 42, 0, Math.PI * 2);
  ctx.fill();
  if (world === 4) {
    ctx.fillStyle = "#fff3a4";
    drawTinyStar(x, y - 174, 10);
  }
}

function drawPastelBackgroundImage(cam) {
  const firstReady = pastelBackground.complete && pastelBackground.naturalWidth > 0;
  const secondReady = pastelBackground2.complete && pastelBackground2.naturalWidth > 0;
  if (!firstReady) return;
  const imgW = pastelBackground.naturalWidth;
  const imgH = pastelBackground.naturalHeight;
  const scale = Math.max(canvas.width / imgW, canvas.height / imgH);
  const drawW = imgW * scale;
  const drawH = imgH * scale;
  const y = (canvas.height - drawH) / 2;
  const pairW = secondReady ? drawW * 2 : drawW;
  const parallax = (cam * 0.12) % pairW;

  for (let x = -parallax - pairW; x < canvas.width + pairW; x += pairW) {
    ctx.drawImage(pastelBackground, x, y, drawW, drawH);
    if (secondReady) ctx.drawImage(pastelBackground2, x + drawW, y, drawW, drawH);
  }
}

function drawPlanet(x, y, r) {
  const planet = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, 4, x, y, r);
  planet.addColorStop(0, "#fff8d2");
  planet.addColorStop(0.42, "#bff8ff");
  planet.addColorStop(1, "#c7b7ff");
  ctx.fillStyle = planet;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255, 176, 220, 0.55)";
  ctx.beginPath();
  ctx.ellipse(x - 4, y - 12, r * 0.72, r * 0.12, 0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(188, 255, 216, 0.7)";
  ctx.beginPath();
  ctx.ellipse(x + 8, y + 18, r * 0.62, r * 0.1, -0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.28)";
  ctx.beginPath();
  ctx.arc(x - 22, y - 24, r * 0.48, 0, Math.PI * 2);
  ctx.fill();
}

function drawMoon(x, y, r) {
  const moon = ctx.createRadialGradient(x - r * 0.32, y - r * 0.4, 3, x, y, r);
  moon.addColorStop(0, "#ffffff");
  moon.addColorStop(0.58, "#fff2bd");
  moon.addColorStop(1, "#ffd4e8");
  ctx.fillStyle = moon;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(190, 174, 220, 0.34)";
  ctx.beginPath();
  ctx.arc(x - 14, y - 7, 8, 0, Math.PI * 2);
  ctx.arc(x + 15, y + 10, 11, 0, Math.PI * 2);
  ctx.arc(x + 8, y - 18, 5, 0, Math.PI * 2);
  ctx.fill();
}

function drawPastelRibbon(cam) {
  ctx.save();
  ctx.globalAlpha = 0.42;
  for (let band = 0; band < 3; band++) {
    ctx.strokeStyle = ["#fff6a6", "#bff8ff", "#ffd1ed"][band];
    ctx.lineWidth = 10 - band * 2;
    ctx.beginPath();
    for (let x = -40; x <= canvas.width + 40; x += 40) {
      const y = 185 + band * 18 + Math.sin((x + cam * 0.18) / 110 + band) * 18;
      if (x === -40) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function drawMountains() {
  const course = courses[currentCourse];
  if (course?.trait === "underwater" || course?.climbStage) return;
  const theme = courses[currentCourse]?.theme;
  ctx.fillStyle = theme ? `${theme.ground[1]}88` : "rgba(178, 178, 234, 0.55)";
  for (let x = -220; x < WORLD_WIDTH + 400; x += 520) {
    ctx.beginPath();
    ctx.moveTo(x, 492);
    ctx.lineTo(x + 220, 260);
    ctx.lineTo(x + 450, 492);
    ctx.fill();
  }
  ctx.fillStyle = theme ? `${theme.ground[0]}66` : "rgba(196, 225, 241, 0.58)";
  for (let x = 70; x < WORLD_WIDTH + 500; x += 640) {
    ctx.beginPath();
    ctx.moveTo(x, 492);
    ctx.lineTo(x + 160, 330);
    ctx.lineTo(x + 350, 492);
    ctx.fill();
  }
}

function drawPlatforms() {
  const theme = courses[currentCourse]?.theme;
  const viewL = state.camera - 60;
  const viewR = state.camera + VIEW_W + 60;
  for (const p of platforms) {
    if (p.x > viewR || p.x + p.w < viewL) continue;
    if (p.terrain) {
      drawTerrainBody(p, theme);
      drawMoonRock({ x: p.x, y: p.y, w: p.w, h: 48 }, theme?.ground[0] ?? "#f4e9cc", theme?.ground[1] ?? "#cfc7d6");
      continue;
    }
    if (p.h > 160 && !p.mover && !p.conveyor) {
      // 天井やかべの大きな岩：中を土でうめて、下のふちに岩をつける
      drawTerrainBody(p, theme);
      drawMoonRock({ x: p.x, y: p.y + p.h - 40, w: p.w, h: 40 }, theme?.ground[0] ?? "#f4e9cc", theme?.ground[1] ?? "#cfc7d6");
      continue;
    }
    drawMoonRock(p, theme?.ground[0] ?? "#f4e9cc", theme?.ground[1] ?? "#cfc7d6");
    if (p.iceRamp) drawIceSlopeMarks(p);
    if (p.conveyor) drawConveyorSurface(p);
    if (p.mover) drawMovingPlatformGlow(p);
  }
  for (const b of blocks) {
    if (b.x > viewR || b.x + b.w < viewL) continue;
    if (Gimmick.drawBlock(b)) continue;
    if (b.broken) continue;
    if (b.breakable) drawBreakableBlock(b);
    else drawMoonRock(b, theme?.ground[1] ?? "#d8d3ff", theme?.accent ?? "#aaa7d8");
  }
}

function drawTerrainBody(p, theme) {
  const top = Math.max(p.y + 30, (state.cameraY ?? 0) - 20);
  const bottom = Math.min(p.y + p.h, (state.cameraY ?? 0) + VIEW_H + 20);
  if (bottom <= top) return;
  const light = theme?.ground[0] ?? "#f4e9cc";
  const dark = theme?.ground[1] ?? "#cfc7d6";
  ctx.save();
  ctx.beginPath();
  ctx.rect(p.x, top, p.w, bottom - top);
  ctx.clip();
  const grad = ctx.createLinearGradient(0, p.y, 0, p.y + 560);
  grad.addColorStop(0, light);
  grad.addColorStop(0.5, dark);
  grad.addColorStop(1, dark);
  ctx.fillStyle = grad;
  ctx.fillRect(p.x, top, p.w, bottom - top);
  const shade = ctx.createLinearGradient(0, p.y + 30, 0, p.y + 760);
  shade.addColorStop(0, "rgba(72, 48, 140, 0.1)");
  shade.addColorStop(1, "rgba(40, 22, 96, 0.55)");
  ctx.fillStyle = shade;
  ctx.fillRect(p.x, top, p.w, bottom - top);
  // 地層のすじ・小石
  const first = Math.max(0, Math.floor((top - p.y - 70) / 62));
  for (let i = first; p.y + 70 + i * 62 < bottom; i++) {
    const y = p.y + 70 + i * 62;
    const seed = (p.x * 13 + i * 71) % 97;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.14)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(p.x, y + (seed % 9) - 4);
    ctx.quadraticCurveTo(p.x + p.w / 2, y + ((seed * 3) % 17) - 8, p.x + p.w, y + ((seed * 5) % 9) - 4);
    ctx.stroke();
    ctx.fillStyle = i % 2 ? "rgba(255, 255, 255, 0.16)" : "rgba(40, 22, 96, 0.14)";
    ctx.beginPath();
    ctx.ellipse(p.x + 18 + ((seed * 7) % Math.max(20, p.w - 36)), y + 26, 13 + (seed % 9), 6 + (seed % 4), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
    ctx.beginPath();
    ctx.arc(p.x + 12 + ((seed * 11) % Math.max(20, p.w - 24)), y + 44, 3 + (seed % 3), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "rgba(30, 16, 80, 0.2)";
  ctx.fillRect(p.x, top, 6, bottom - top);
  ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
  ctx.fillRect(p.x + p.w - 4, top, 4, bottom - top);
  ctx.restore();
}

function drawIceSlopeMarks(p) {
  ctx.save();
  ctx.globalAlpha = 0.72;
  ctx.strokeStyle = "#c6fff4";
  ctx.lineWidth = 3;
  const dir = p.iceRamp === "up" ? -1 : 1;
  for (let x = p.x + 28; x < p.x + p.w - 20; x += 42) {
    ctx.beginPath();
    ctx.moveTo(x, p.y + 13);
    ctx.lineTo(x + dir * 22, p.y + 30);
    ctx.stroke();
  }
  ctx.restore();
}

function drawConveyorSurface(p) {
  ctx.save();
  ctx.globalAlpha = 0.86;
  ctx.fillStyle = "rgba(30, 24, 52, 0.28)";
  ctx.fillRect(p.x, p.y + 4, p.w, 12);
  const dir = Math.sign(p.conveyor);
  ctx.fillStyle = p.conveyor > 0 ? "#9ee8ff" : "#ff8db7";
  const offset = (performance.now() / 28) % 44;
  for (let x = p.x - 44 + offset; x < p.x + p.w + 44; x += 44) {
    ctx.beginPath();
    ctx.moveTo(x, p.y + 10);
    ctx.lineTo(x - dir * 15, p.y + 4);
    ctx.lineTo(x - dir * 15, p.y + 16);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawMovingPlatformGlow(p) {
  ctx.save();
  ctx.globalAlpha = 0.62;
  ctx.strokeStyle = "#fff3a4";
  ctx.lineWidth = 3;
  ctx.strokeRect(p.x + 4, p.y + 4, p.w - 8, p.h - 8);
  ctx.restore();
}

function drawBreakableBlock(b) {
  const grad = ctx.createLinearGradient(b.x, b.y, b.x + b.w, b.y + b.h);
  if (b.hiddenBox) {
    grad.addColorStop(0, "#9ee8ff");
    grad.addColorStop(0.5, "#4da7ff");
    grad.addColorStop(1, "#c8b2ff");
  } else {
    grad.addColorStop(0, "#fff5b8");
    grad.addColorStop(0.45, "#ffd1ed");
    grad.addColorStop(1, "#c9f6ff");
  }
  ctx.fillStyle = grad;
  ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 3;
  ctx.strokeRect(b.x + 2, b.y + 2, b.w - 4, b.h - 4);
  ctx.fillStyle = "#8b6ac9";
  ctx.font = "bold 24px system-ui";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("?", b.x + b.w / 2, b.y + b.h / 2 + 1);
}

function drawMoonRock(r, fill, edge) {
  const theme = courses[currentCourse]?.theme;
  const groundImg = theme ? stageGroundImages[theme.imageIndex] : null;
  if (theme?.imageIndex === 0 && moonGround.complete && moonGround.naturalWidth > 0) {
    drawMoonGroundImage(r);
    return;
  }
  if (groundImg?.complete && groundImg.naturalWidth > 0) {
    drawStageGroundImage(r, groundImg);
    return;
  }
  if (!courses[currentCourse]?.theme && moonGround.complete && moonGround.naturalWidth > 0) {
    drawMoonGroundImage(r);
    return;
  }
  const grad = ctx.createLinearGradient(r.x, r.y, r.x, r.y + r.h);
  grad.addColorStop(0, fill);
  grad.addColorStop(1, edge);
  ctx.fillStyle = grad;
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.fillStyle = "rgba(255,255,255,0.24)";
  ctx.fillRect(r.x, r.y, r.w, 4);
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.fillRect(r.x, r.y + r.h - 10, r.w, 10);
  ctx.fillStyle = "rgba(255, 255, 255, 0.16)";
  for (let x = r.x + 20; x < r.x + r.w; x += 132) {
    ctx.beginPath();
    ctx.ellipse(x, r.y + 18, 18, 7, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(255,255,255,0.38)";
  ctx.lineWidth = 2;
  for (let x = r.x; x < r.x + r.w; x += TILE) {
    ctx.strokeRect(x, r.y, Math.min(TILE, r.x + r.w - x), r.h);
  }
}

function drawStageGroundImage(r, img) {
  const destH = r.h + 14;
  const tileW = destH * (img.naturalWidth / img.naturalHeight);
  for (let x = r.x; x < r.x + r.w; x += tileW) {
    const w = Math.min(tileW, r.x + r.w - x);
    ctx.drawImage(img, 0, 0, img.naturalWidth * (w / tileW), img.naturalHeight, x, r.y - 6, w, destH);
  }
  ctx.strokeStyle = "rgba(255, 255, 255, 0.72)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(r.x, r.y + 2);
  ctx.lineTo(r.x + r.w, r.y + 2);
  ctx.stroke();
}

function drawMoonGroundImage(r) {
  const srcX = 0;
  const srcY = 168;
  const srcW = moonGround.naturalWidth;
  const srcH = 410;
  const destH = r.h + 18;
  const tileW = destH * (srcW / srcH);
  for (let x = r.x; x < r.x + r.w; x += tileW) {
    const w = Math.min(tileW, r.x + r.w - x);
    ctx.drawImage(moonGround, srcX, srcY, srcW * (w / tileW), srcH, x, r.y - 8, w, destH);
  }

  ctx.strokeStyle = "rgba(255, 255, 255, 0.78)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(r.x, r.y + 2);
  ctx.lineTo(r.x + r.w, r.y + 2);
  ctx.stroke();
}

function drawItems() {
  for (const item of state.items) {
    if (item.type === "manju") {
      const bob = Math.sin(performance.now() / 260 + item.x) * 3;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.45 + Math.sin(performance.now() / 160) * 0.2;
      ctx.drawImage(FX.glowSprite("#d7a8ff"), item.x + item.w / 2 - 36, item.y + item.h / 2 - 36 + bob, 72, 72);
      ctx.restore();
      drawBudouManju(item.x + item.w / 2, item.y + item.h / 2 + bob - 8, 62);
    } else if (item.type === "hp") {
      ctx.save();
      ctx.translate(item.x + item.w / 2, item.y + item.h / 2);
      ctx.rotate(performance.now() / 220);
      ctx.fillStyle = "#ffd85a";
      drawTinyStar(0, 0, 14);
      ctx.restore();
    } else {
      const dropPower = item.weaponPower ?? 1;
      if (item.rare) {
        // レアな武器は、まわりがキラキラ光る
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = 0.6 + Math.sin(performance.now() / 120) * 0.25;
        ctx.drawImage(FX.glowSprite("#ffd85a"), item.x + item.w / 2 - 40, item.y + item.h / 2 - 40, 80, 80);
        ctx.restore();
      }
      const nextPower = previewWeaponPowerAfterPickup(dropPower);
      drawRayGun(item.x + item.w / 2, item.y + item.h / 2, 1, 0.88, dropPower);
      ctx.fillStyle = "#fff3a4";
      ctx.strokeStyle = "#7f67c8";
      ctx.lineWidth = 3;
      ctx.font = "bold 14px system-ui";
      ctx.textAlign = "center";
      const label = nextPower > state.weaponPower ? `合体` : weaponLevelLabel(dropPower);
      ctx.strokeText(label, item.x + item.w / 2 + 14, item.y + 4);
      ctx.fillText(label, item.x + item.w / 2 + 14, item.y + 4);
    }
  }
}

function drawCoins(t) {
  for (const c of state.coinItems) {
    if (c.taken) continue;
    const y = c.y + Math.sin(t * 5 + c.bob) * 4;
    drawKakipi(c.x, y, c.type);
  }
  for (const s of state.starItems) {
    if (s.taken) continue;
    const y = s.y + Math.sin(t * 5.6 + s.bob) * 5;
    drawCollectibleStar(s.x, y, s.r);
  }
  for (const o of state.oxygenItems ?? []) {
    if (o.taken) continue;
    const y = o.y + Math.sin(t * 4.6 + o.bob) * 6;
    drawOxygenBubble(o.x, y, o.r);
  }
}

function drawOxygenBubble(x, y, r) {
  ctx.save();
  ctx.translate(x, y);
  const glow = ctx.createRadialGradient(0, 0, 3, 0, 0, r * 1.8);
  glow.addColorStop(0, "rgba(255, 255, 255, 0.92)");
  glow.addColorStop(0.5, "rgba(158, 232, 255, 0.62)");
  glow.addColorStop(1, "rgba(106, 246, 215, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(235, 252, 255, 0.72)";
  ctx.strokeStyle = "#9ee8ff";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#277394";
  ctx.font = "900 16px Segoe UI, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("O2", 0, 1);
  ctx.restore();
}

function drawCollectibleStar(x, y, r) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(performance.now() / 360);
  const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, r * 1.8);
  glow.addColorStop(0, "rgba(255, 255, 255, 0.9)");
  glow.addColorStop(0.45, "rgba(255, 243, 164, 0.52)");
  glow.addColorStop(1, "rgba(255, 216, 90, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffd85a";
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 3;
  drawTinyStar(0, 0, r);
  ctx.stroke();
  ctx.restore();
}

// ステージで集めるお金「ルナコイン」。絵（assets/item-luna-coin.png）があればそれを、なければ描いたコイン
const lunaCoinImage = new Image();
lunaCoinImage.src = "assets/item-luna-coin.png";
const budouManjuImage = new Image();
budouManjuImage.src = "assets/item-budou-manju.png";

function drawKakipi(x, y, type) {
  // くるくる回って見えるように、横はばを少しだけ変える
  const spin = Math.abs(Math.cos(performance.now() / 520 + x * 0.013));
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(0.35 + spin * 0.65, 1);
  drawLunaCoin(0, 0, 13);
  ctx.restore();
}

function drawLunaCoin(x, y, r) {
  if (lunaCoinImage.complete && lunaCoinImage.naturalWidth > 0) {
    ctx.drawImage(lunaCoinImage, x - r * 1.1, y - r * 1.1, r * 2.2, r * 2.2);
    return;
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#ffe7a0";
  ctx.strokeStyle = "#a98be0";
  ctx.lineWidth = r * 0.22;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#e9b84f";
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.62, 0, Math.PI * 2);
  ctx.fill();
  // 三日月
  ctx.fillStyle = "#fff6cf";
  ctx.beginPath();
  ctx.arc(-r * 0.08, 0, r * 0.44, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e9b84f";
  ctx.beginPath();
  ctx.arc(r * 0.12, -r * 0.1, r * 0.38, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
  ctx.beginPath();
  ctx.ellipse(-r * 0.45, -r * 0.5, r * 0.16, r * 0.26, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ぴょんぴーの大好物。満タン回復アイテム。絵（assets/item-budou-manju.png）がなければ描いたまんじゅう
function drawBudouManju(x, y, size) {
  if (budouManjuImage.complete && budouManjuImage.naturalWidth > 0) {
    ctx.drawImage(budouManjuImage, x - size / 2, y - size / 2, size, size);
    return;
  }
  const r = size * 0.15;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.6);
  ctx.strokeStyle = "#c79a5a";
  ctx.lineWidth = Math.max(2, size * 0.05);
  ctx.beginPath();
  ctx.moveTo(0, -size * 0.48);
  ctx.lineTo(0, size * 0.48);
  ctx.stroke();
  for (let i = 0; i < 4; i++) {
    const cy = -size * 0.3 + i * r * 1.75;
    ctx.fillStyle = "#b07fd8";
    ctx.strokeStyle = "#7a4fa8";
    ctx.lineWidth = Math.max(1.5, size * 0.03);
    ctx.beginPath();
    ctx.arc(0, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
    ctx.beginPath();
    ctx.arc(-r * 0.35, cy - r * 0.35, r * 0.28, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#7fd08a";
  ctx.beginPath();
  ctx.ellipse(r * 0.9, -size * 0.36, r * 0.75, r * 0.4, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawKakiSeed() {
  ctx.fillStyle = "#d46c2f";
  ctx.strokeStyle = "#9b3f22";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(-7, 0, 6, 15, 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(255, 214, 132, 0.55)";
  ctx.beginPath();
  ctx.ellipse(-9, -5, 2, 5, 0.25, 0, Math.PI * 2);
  ctx.fill();
}

function drawPeanut() {
  ctx.fillStyle = "#f2c16f";
  ctx.strokeStyle = "#a8742a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, -6, 8, 10, -0.12, 0, Math.PI * 2);
  ctx.ellipse(0, 7, 8, 10, 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(255, 242, 190, 0.65)";
  ctx.beginPath();
  ctx.ellipse(-3, -8, 3, 4, -0.2, 0, Math.PI * 2);
  ctx.ellipse(-2, 5, 3, 4, -0.2, 0, Math.PI * 2);
  ctx.fill();
}

function drawFlag() {
  if (courses[currentCourse]?.finalStage) return;
  FX.drawGoal(level.flag, goalLocked());
}

function drawGun() {
  if (state.gun.holder !== null) return;
  drawRayGun(state.gun.x, state.gun.y, 1, 1, state.gun.weaponPower ?? 1);
}

function drawBeams() {
  for (const b of state.beams) {
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.translate(b.x + b.w / 2, b.y + b.h / 2);
    ctx.rotate(b.angle ?? 0);
    if (b.bubble) {
      drawAirBubble(b);
      ctx.restore();
      continue;
    }
    if (b.bossOrb) {
      drawBossOrb(b);
      ctx.restore();
      continue;
    }
    if (b.homing) {
      drawHomingMissile(b);
      ctx.restore();
      continue;
    }
    FX.beamGlow(b);
    const grad = ctx.createLinearGradient(-b.w / 2, 0, b.w / 2, 0);
    const colors = b.colors || WEAPON_STAGES[0].colors;
    grad.addColorStop(0, colors[0]);
    grad.addColorStop(0.5, colors[1]);
    grad.addColorStop(1, colors[2]);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(-b.w / 2, -b.h / 2, b.w, b.h, 4);
    ctx.fill();
    if ((b.power ?? 1) >= 4) {
      ctx.fillStyle = "rgba(255,255,255,0.42)";
      ctx.beginPath();
      ctx.ellipse(4, 0, b.w * 0.62, b.h * 1.45, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.fillRect(-b.w / 2 + 4, -b.h / 2 + 2, b.w - 8, 2);
    ctx.restore();
  }
}

function drawBossOrb(b) {
  const r = Math.max(b.w, b.h) / 2;
  const colors = b.colors || ["#fff3a4", "#ff8db7", "#c8b2ff"];
  const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, r * 1.9);
  glow.addColorStop(0, "rgba(255,255,255,0.95)");
  glow.addColorStop(0.35, colors[1]);
  glow.addColorStop(1, "rgba(255,141,183,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = colors[0];
  ctx.lineWidth = 3;
  ctx.fillStyle = colors[2];
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.72)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2);
  ctx.stroke();
}

function drawHomingMissile(b) {
  // ロボットと戦闘機のミサイルは、専用の絵を使う
  const art = typeof mechArt !== "undefined" ? mechArt.missile : null;
  if ((b.power ?? 0) >= MECH_POWER && art && art.complete && art.naturalWidth > 0) {
    const w = 58;
    const h = w * (art.naturalHeight / art.naturalWidth);
    ctx.drawImage(art, -w / 2, -h / 2, w, h);
    return;
  }
  const colors = b.colors || WEAPON_STAGES[0].colors;
  ctx.fillStyle = colors[1];
  ctx.strokeStyle = colors[2];
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-b.w / 2, -b.h / 2, b.w, b.h, 5);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(b.w / 2 + 8, 0);
  ctx.lineTo(b.w / 2 - 2, -b.h / 2);
  ctx.lineTo(b.w / 2 - 2, b.h / 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = colors[2];
  ctx.beginPath();
  ctx.moveTo(-b.w / 2, -b.h / 2);
  ctx.lineTo(-b.w / 2 - 10, -b.h);
  ctx.lineTo(-b.w / 2 + 2, 0);
  ctx.lineTo(-b.w / 2 - 10, b.h);
  ctx.lineTo(-b.w / 2, b.h / 2);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = "#fff3a4";
  ctx.beginPath();
  ctx.ellipse(-b.w / 2 - 16, 0, 16, 6, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawRayGun(x, y, dir = 1, scale = 1, power = 1) {
  if (drawWeaponIcon(x, y, power, scale, dir)) return;
  const stageIndex = clamp(Math.floor(power), 1, MAX_WEAPON_POWER) - 1;
  const colors = WEAPON_STAGES[stageIndex].colors;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir * scale, scale);
  if (stageIndex === 0) drawMoonPopper(colors);
  else if (stageIndex === 1) drawTwinStarShooter(colors);
  else if (stageIndex === 2) drawMilkyWayCannon(colors);
  else if (stageIndex === 3) drawRibbonLaser(colors);
  else if (stageIndex === 4) drawMoonianNova(colors);
  else drawExperimentalGun(colors, stageIndex);
  ctx.restore();
}

// 武器の絵が maxWidth におさまる倍率（強い武器ほど絵が大きいので、マスからはみ出さないようにする）
function weaponIconFitScale(power, maxWidth, wanted) {
  const index = clamp(Math.floor(power), 1, MAX_WEAPON_POWER) - 1;
  const baseW = [58, 70, 82, 76, 92][index] ?? Math.min(150, 86 + index * 4);
  return Math.min(wanted, maxWidth / baseW);
}

function drawWeaponIcon(x, y, power = 1, scale = 1, dir = 1) {
  const index = clamp(Math.floor(power), 1, MAX_WEAPON_POWER) - 1;
  const img = weaponIcons[index];
  if (!img || !img.complete || img.naturalWidth <= 0) return false;
  const baseW = ([58, 70, 82, 76, 92][index] ?? Math.min(150, 86 + index * 4)) * scale;
  const baseH = baseW * (img.naturalHeight / img.naturalWidth);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  ctx.drawImage(img, -baseW / 2, -baseH / 2, baseW, baseH);
  ctx.restore();
  return true;
}

function drawExperimentalGun(colors, stageIndex) {
  const size = 42 + stageIndex * 2;
  drawGunBody(-size * 0.55, -14, size, 24, 9, colors[1], colors[2]);
  drawGunBody(-size * 0.25, -22, size * 0.52, 12, 6, "#ffffff", colors[0]);
  ctx.fillStyle = colors[2];
  ctx.beginPath();
  ctx.ellipse(size * 0.46, -2, 13 + stageIndex * 0.6, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = colors[0];
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = colors[0];
  for (let i = 0; i < Math.min(5, stageIndex - 3); i++) drawTinyStar(-22 + i * 13, -4 + (i % 2) * 8, 3.5);
  ctx.fillStyle = "#24305d";
  ctx.fillRect(-18, 7, 11, 22);
}

function drawGunBody(x, y, w, h, radius, fill, stroke = "#6f62bd") {
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fill();
  ctx.stroke();
}

function drawMoonPopper(colors) {
  drawGunBody(-16, -7, 24, 12, 5, colors[1]);
  ctx.fillStyle = colors[0];
  ctx.fillRect(4, -5, 13, 7);
  ctx.fillStyle = colors[2];
  ctx.beginPath();
  ctx.arc(13, -1, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ff8db7";
  ctx.fillRect(-7, 3, 7, 13);
}

function drawTwinStarShooter(colors) {
  drawGunBody(-20, -9, 30, 16, 7, colors[1]);
  drawGunBody(2, -10, 21, 6, 3, colors[0]);
  drawGunBody(2, 1, 21, 6, 3, "#ffffff");
  ctx.fillStyle = colors[2];
  ctx.beginPath();
  ctx.arc(20, -7, 4, 0, Math.PI * 2);
  ctx.arc(20, 4, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ff8db7";
  ctx.fillRect(-10, 5, 8, 15);
  ctx.fillStyle = "#fff3a4";
  drawTinyStar(-7, -14, 4);
}

function drawRibbonLaser(colors) {
  drawGunBody(-24, -10, 36, 18, 8, "#d7c8ff");
  ctx.strokeStyle = colors[2];
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-16, -1);
  ctx.bezierCurveTo(-6, -13, 8, 11, 23, -2);
  ctx.stroke();
  drawGunBody(5, -7, 24, 10, 5, colors[0]);
  ctx.fillStyle = colors[1];
  ctx.beginPath();
  ctx.arc(30, -2, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(30, -2, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ff8db7";
  ctx.fillRect(-12, 5, 9, 17);
}

function drawMilkyWayCannon(colors) {
  drawGunBody(-30, -13, 42, 22, 9, colors[2]);
  drawGunBody(-18, -18, 26, 9, 5, "#ffffff");
  drawGunBody(2, -11, 36, 16, 8, colors[1]);
  ctx.fillStyle = colors[0];
  ctx.beginPath();
  ctx.ellipse(37, -3, 10, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#6f62bd";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#fff3a4";
  for (let i = 0; i < 3; i++) drawTinyStar(-20 + i * 13, -4 + (i % 2) * 6, 3.5);
  ctx.fillStyle = "#8b6ac9";
  ctx.fillRect(-16, 6, 11, 20);
}

function drawMoonianNova(colors) {
  drawGunBody(-36, -16, 48, 27, 10, "#c8b2ff");
  drawGunBody(-25, -22, 30, 12, 6, "#ffffff");
  drawGunBody(0, -14, 44, 21, 10, colors[1]);
  ctx.fillStyle = colors[2];
  ctx.beginPath();
  ctx.ellipse(44, -4, 14, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#6f62bd";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = colors[0];
  ctx.beginPath();
  ctx.arc(44, -4, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(7, -3, 13, -0.7, 1.95);
  ctx.stroke();
  ctx.fillStyle = "#fff3a4";
  drawTinyStar(-22, -4, 5);
  drawTinyStar(14, -20, 4);
  ctx.fillStyle = "#8b6ac9";
  ctx.fillRect(-19, 7, 12, 23);
}

function drawEnemies() {
  for (const e of state.enemies) {
    if (!e.alive && e.defeated <= 0) continue;
    if (e.boss) drawBossAlien(e);
    else drawPastelAlien(e);
    // ピヨっているあいだは点滅させず、頭の上に星を回す
    if (e.alive && e.stun > 0) drawDizzyStars(e);
  }
}

// 攻撃が当たった瞬間に重ねる、赤くそめた絵（画像ごとに1回だけ作る）
const redTintCache = new Map();
function redTintOf(img) {
  let tinted = redTintCache.get(img);
  if (tinted) return tinted;
  tinted = document.createElement("canvas");
  tinted.width = img.naturalWidth;
  tinted.height = img.naturalHeight;
  const g = tinted.getContext("2d");
  g.drawImage(img, 0, 0);
  g.globalCompositeOperation = "source-atop";
  g.fillStyle = "#ff2d55";
  g.fillRect(0, 0, tinted.width, tinted.height);
  redTintCache.set(img, tinted);
  return tinted;
}

// 0〜1：攻撃が当たってからの赤さ
function enemyHitRed(e) {
  if (!e.alive || !(e.hurtAnim > 0)) return 0;
  const k = Math.min(1, e.hurtAnim / (e.boss ? 0.38 : 0.24));
  return 0.25 + k * 0.55;
}

function drawDizzyStars(e) {
  const t = performance.now() / 1000;
  const cx = e.x + e.w / 2;
  const headY = e.boss
    ? (e.finalBoss ? e.y + e.h - 214 : e.y - e.h * 0.5)
    : e.y - e.h * 0.62;
  const rx = Math.max(22, e.w * 0.55);
  const ry = rx * 0.32;
  const fadeOut = Math.min(1, e.stun / 0.3);
  ctx.save();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#b8860b";
  for (let i = 0; i < 3; i++) {
    const a = t * 6 + (i * Math.PI * 2) / 3;
    const x = cx + Math.cos(a) * rx;
    const y = headY + Math.sin(a) * ry;
    const front = Math.sin(a) > 0;
    const r = front ? 13 : 9;
    ctx.globalAlpha = fadeOut * (front ? 1 : 0.6);
    // ふちどりを先にぬって、背景にとけこまないようにする
    ctx.fillStyle = "#8a5a00";
    drawTinyStar(x, y, r + 3);
    ctx.fillStyle = front ? "#ffe35a" : "#fff3a4";
    drawTinyStar(x, y, r);
  }
  ctx.restore();
}

function drawBossAlien(e) {
  if (drawBossImage(e)) return;
  if (e.finalBoss) {
    drawFinalBossAlien(e);
    return;
  }
  const cx = e.x + e.w / 2;
  const baseY = e.y + e.h;
  const dying = !e.alive;
  const t = dying ? 1 - e.defeated / 0.42 : 0;
  const squashX = dying ? 1 + t * 0.8 : 1;
  const squashY = dying ? Math.max(0.16, 1 - t * 0.74) : 1;
  const alpha = dying ? Math.max(0, 1 - t * 0.86) : 1;
  const bob = dying ? 0 : Math.sin(performance.now() / 260 + e.x) * 2.5;
  const palettes = [
    ["#ffcf73", "#d7654b", "#7b2b3d"],
    ["#c6fff4", "#59c7d3", "#246b91"],
    ["#bff8ff", "#1a9fb6", "#063f61"],
    ["#fff3a4", "#d7a15f", "#76538f"],
    ["#ff3d7f", "#403052", "#151224"]
  ];
  const bossColors = palettes[e.bossKind ?? 0] ?? palettes[0];

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cx, baseY + bob);
  ctx.scale(squashX, squashY);
  ctx.translate(-cx, -baseY);

  const body = ctx.createLinearGradient(e.x, e.y, e.x + e.w, e.y + e.h);
  body.addColorStop(0, bossColors[0]);
  body.addColorStop(0.48, bossColors[1]);
  body.addColorStop(1, bossColors[2]);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(cx, e.y + e.h * 0.49, e.w * 0.44, e.h * 0.39, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = bossColors[2];
  ctx.beginPath();
  ctx.ellipse(e.x + e.w * 0.22, e.y + e.h * 0.22, e.w * 0.13, e.h * 0.27, -0.55, 0, Math.PI * 2);
  ctx.ellipse(e.x + e.w * 0.78, e.y + e.h * 0.22, e.w * 0.13, e.h * 0.27, 0.55, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = bossColors[0];
  if ((e.bossKind ?? 0) === 0) drawTinyStar(cx, e.y + 5, 10);
  else if (e.bossKind === 1) {
    ctx.beginPath();
    ctx.moveTo(cx, e.y - 5);
    ctx.lineTo(cx + 18, e.y + 26);
    ctx.lineTo(cx, e.y + 44);
    ctx.lineTo(cx - 18, e.y + 26);
    ctx.closePath();
    ctx.fill();
  } else if (e.bossKind === 2) {
    ctx.beginPath();
    ctx.arc(cx, e.y + 12, 14, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.bossKind === 3) {
    ctx.strokeStyle = bossColors[0];
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(cx, e.y + 18, e.w * 0.36, e.h * 0.08, -0.18, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(cx - 24, e.y + 22);
    ctx.lineTo(cx, e.y - 10);
    ctx.lineTo(cx + 24, e.y + 22);
    ctx.lineTo(cx + 12, e.y + 16);
    ctx.lineTo(cx, e.y + 34);
    ctx.lineTo(cx - 12, e.y + 16);
    ctx.closePath();
    ctx.fill();
  }

  ctx.fillStyle = "#203b6b";
  ctx.beginPath();
  ctx.arc(e.x + e.w * 0.37, e.y + e.h * 0.48, 5, 0, Math.PI * 2);
  ctx.arc(e.x + e.w * 0.63, e.y + e.h * 0.48, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(e.x + e.w * 0.39, e.y + e.h * 0.44, 2, 2);
  ctx.fillRect(e.x + e.w * 0.65, e.y + e.h * 0.44, 2, 2);

  ctx.strokeStyle = "#8b6ac9";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(e.x + e.w * 0.37, e.y + e.h * 0.65);
  ctx.quadraticCurveTo(cx, e.y + e.h * 0.75, e.x + e.w * 0.63, e.y + e.h * 0.65);
  ctx.stroke();

  ctx.fillStyle = "#8b6ac9";
  ctx.fillRect(e.x + e.w * 0.14, e.y + e.h * 0.82, e.w * 0.18, 8);
  ctx.fillRect(e.x + e.w * 0.68, e.y + e.h * 0.82, e.w * 0.18, 8);
  ctx.restore();

  if (e.alive) {
    const hpRatio = Math.max(0, e.hp / e.maxHp);
    ctx.save();
    ctx.fillStyle = "rgba(255, 255, 255, 0.84)";
    ctx.fillRect(e.x - 5, e.y - 18, e.w + 10, 10);
    ctx.fillStyle = "#ff8db7";
    ctx.fillRect(e.x - 3, e.y - 16, (e.w + 6) * hpRatio, 6);
    ctx.strokeStyle = "#8b6ac9";
    ctx.lineWidth = 2;
    ctx.strokeRect(e.x - 5, e.y - 18, e.w + 10, 10);
    ctx.restore();
  }

  if ((state.gun.holder === e.id || e.weaponPower) && e.alive) {
    const dir = state.player.x < e.x ? -1 : 1;
    drawRayGun(e.x + e.w / 2 + dir * 28, e.y + 46, -dir, 0.92, e.weaponPower ?? Math.min(2, state.weaponPower));
  }
  if (dying) drawAlienPoof(cx, baseY - 28, t);
}

function drawBossImage(e) {
  const kind = e.bossKind ?? 0;
  const poseImg = e.hurtAnim > 0 ? bossHurtImages[kind] : e.attackAnim > 0 ? bossAttackImages[kind] : null;
  let img = poseImg || bossThemeImages[kind];
  if (!img || !img.complete || img.naturalWidth <= 0) img = bossThemeImages[kind];
  if (!img || !img.complete || img.naturalWidth <= 0) return false;
  const dying = !e.alive;
  const t = dying ? 1 - e.defeated / 0.42 : 0;
  const alpha = dying ? Math.max(0, 1 - t * 0.86) : 1;
  const bob = dying ? 0 : Math.sin(performance.now() / 260 + e.x) * 3;
  const drawH = e.finalBoss ? 228 : e.h * 1.65;
  const drawW = drawH * (img.naturalWidth / img.naturalHeight);
  const dx = e.x + e.w / 2 - drawW / 2;
  const dy = e.y + e.h - drawH + 8 + bob;
  const facingRight = (e.facing ?? (e.vx >= 0 ? 1 : -1)) > 0;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  const red = enemyHitRed(e);
  if (facingRight) {
    ctx.drawImage(img, dx, dy, drawW, drawH);
    if (red) {
      ctx.globalAlpha = alpha * red;
      ctx.drawImage(redTintOf(img), dx, dy, drawW, drawH);
    }
  } else {
    ctx.translate(dx + drawW / 2, dy + drawH / 2);
    ctx.scale(-1, 1);
    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    if (red) {
      ctx.globalAlpha = alpha * red;
      ctx.drawImage(redTintOf(img), -drawW / 2, -drawH / 2, drawW, drawH);
    }
  }
  ctx.restore();

  if (e.alive) {
    const hpRatio = Math.max(0, e.hp / e.maxHp);
    ctx.save();
    ctx.fillStyle = "rgba(255, 255, 255, 0.84)";
    ctx.fillRect(e.x - 12, e.y - 24, e.w + 24, 12);
    ctx.fillStyle = e.finalBoss ? "#ff3d7f" : "#ff8db7";
    ctx.fillRect(e.x - 9, e.y - 21, (e.w + 18) * hpRatio, 7);
    ctx.strokeStyle = e.finalBoss ? "#fff3a4" : "#8b6ac9";
    ctx.lineWidth = 2;
    ctx.strokeRect(e.x - 12, e.y - 24, e.w + 24, 12);
    ctx.restore();
  }
  if ((state.gun.holder === e.id || e.weaponPower) && e.alive) {
    const dir = state.player.x < e.x ? -1 : 1;
    drawRayGun(e.x + e.w / 2 + dir * (e.finalBoss ? 72 : 34), e.y + e.h * 0.52, -dir, e.finalBoss ? 1.35 : 0.92, e.weaponPower ?? Math.min(2, state.weaponPower));
  }
  if (dying) drawAlienPoof(e.x + e.w / 2, e.y + e.h / 2, t);
  return true;
}

function drawFinalBossAlien(e) {
  const cx = e.x + e.w / 2;
  const baseY = e.y + e.h;
  const t = performance.now() / 1000;
  const dying = !e.alive;
  const fade = dying ? Math.max(0, e.defeated / 0.42) : 1;
  ctx.save();
  ctx.globalAlpha = fade;
  ctx.translate(cx, baseY + Math.sin(t * 4) * 4);

  const aura = ctx.createRadialGradient(0, -80, 20, 0, -80, 150);
  aura.addColorStop(0, "rgba(255,61,127,0.46)");
  aura.addColorStop(0.55, "rgba(158,232,255,0.18)");
  aura.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(0, -80, 160, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#151224";
  ctx.strokeStyle = "#ff3d7f";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-72, -150);
  ctx.lineTo(-118, -86);
  ctx.lineTo(-74, -104);
  ctx.lineTo(-48, -72);
  ctx.lineTo(0, -164);
  ctx.lineTo(48, -72);
  ctx.lineTo(74, -104);
  ctx.lineTo(118, -86);
  ctx.lineTo(72, -150);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  const body = ctx.createLinearGradient(-90, -138, 90, 0);
  body.addColorStop(0, "#35102b");
  body.addColorStop(0.48, "#7a1c58");
  body.addColorStop(1, "#0b0f2a");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, -72, 78, 86, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#9ee8ff";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = "#ff3d7f";
  ctx.beginPath();
  ctx.arc(-28, -92, 9, 0, Math.PI * 2);
  ctx.arc(28, -92, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(-25, -96, 3, 3);
  ctx.fillRect(31, -96, 3, 3);

  ctx.strokeStyle = "#fff3a4";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-33, -60);
  ctx.quadraticCurveTo(0, -42, 33, -60);
  ctx.stroke();

  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    const a = t * 1.6 + i * Math.PI / 4;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * 96, -80 + Math.sin(a) * 26, 9, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  if (e.alive) {
    const hpRatio = Math.max(0, e.hp / e.maxHp);
    ctx.save();
    ctx.fillStyle = "rgba(255, 255, 255, 0.86)";
    ctx.fillRect(e.x - 20, e.y - 30, e.w + 40, 14);
    ctx.fillStyle = "#ff3d7f";
    ctx.fillRect(e.x - 17, e.y - 27, (e.w + 34) * hpRatio, 8);
    ctx.strokeStyle = "#fff3a4";
    ctx.lineWidth = 3;
    ctx.strokeRect(e.x - 20, e.y - 30, e.w + 40, 14);
    ctx.restore();
  }

  if (e.alive) {
    const dir = state.player.x < e.x ? -1 : 1;
    drawRayGun(e.x + e.w / 2 + dir * 72, e.y + 82, -dir, 1.35, e.weaponPower);
  }
  if (dying) drawAlienPoof(cx, baseY - 70, 1 - e.defeated / 0.42);
}

function drawPastelAlien(e) {
  if (drawEnemyImage(e)) return;
  const cx = e.x + e.w / 2;
  const baseY = e.y + e.h;
  const dying = !e.alive;
  const t = dying ? 1 - e.defeated / 0.42 : 0;
  const squashX = dying ? 1 + t * 0.8 : 1;
  const squashY = dying ? Math.max(0.18, 1 - t * 0.72) : 1;
  const alpha = dying ? Math.max(0, 1 - t * 0.86) : 1;
  const bob = dying ? 0 : Math.sin(performance.now() / 230 + e.x) * 2;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cx, baseY + bob);
  ctx.scale(squashX, squashY);
  ctx.translate(-cx, -baseY);

  const body = ctx.createLinearGradient(e.x, e.y, e.x + e.w, e.y + e.h);
  body.addColorStop(0, "#bff7ff");
  body.addColorStop(0.48, "#d9ffd6");
  body.addColorStop(1, "#ffd1ed");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(cx, e.y + 22, 22, 19, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#c8b2ff";
  ctx.beginPath();
  ctx.ellipse(e.x + 10, e.y + 11, 6, 13, -0.55, 0, Math.PI * 2);
  ctx.ellipse(e.x + 32, e.y + 11, 6, 13, 0.55, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#203b6b";
  ctx.beginPath();
  ctx.arc(e.x + 15, e.y + 21, 3, 0, Math.PI * 2);
  ctx.arc(e.x + 28, e.y + 21, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(e.x + 16, e.y + 19, 1.5, 1.5);
  ctx.fillRect(e.x + 29, e.y + 19, 1.5, 1.5);

  ctx.strokeStyle = "#8b6ac9";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(e.x + 17, e.y + 29);
  ctx.quadraticCurveTo(cx, e.y + 33, e.x + 26, e.y + 29);
  ctx.stroke();

  ctx.fillStyle = "#8b6ac9";
  ctx.fillRect(e.x + 8, e.y + 37, 8, 5);
  ctx.fillRect(e.x + 27, e.y + 37, 8, 5);
  ctx.restore();

  if ((state.gun.holder === e.id || e.weaponPower) && e.alive) {
    const dir = state.player.x < e.x ? -1 : 1;
    drawRayGun(e.x + e.w / 2 + dir * 18, e.y + 24, -dir, 0.72, e.weaponPower ?? Math.min(2, state.weaponPower));
  }
  if (dying) drawAlienPoof(cx, baseY - 18, t);
}

function drawEnemyImage(e) {
  const kind = e.enemyKind ?? courses[currentCourse]?.worldIndex ?? 0;
  const poseImg = e.hurtAnim > 0 ? enemyHurtImages[kind] : e.attackAnim > 0 ? enemyAttackImages[kind] : null;
  let img = poseImg || enemyThemeImages[kind];
  if (!img || !img.complete || img.naturalWidth <= 0) img = enemyThemeImages[kind];
  if (!img || !img.complete || img.naturalWidth <= 0) return false;
  const dying = !e.alive;
  const t = dying ? 1 - e.defeated / 0.42 : 0;
  const alpha = dying ? Math.max(0, 1 - t * 0.86) : 1;
  const bob = dying ? 0 : Math.sin(performance.now() / 220 + e.x) * 2;
  const drawH = e.h * 1.75;
  const drawW = drawH * (img.naturalWidth / img.naturalHeight);
  const dx = e.x + e.w / 2 - drawW / 2;
  const dy = e.y + e.h - drawH + 6 + bob;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  const facingRight = (e.facing ?? (e.vx >= 0 ? 1 : -1)) > 0;
  const flipImage = !facingRight;
  const red = enemyHitRed(e);
  if (flipImage) {
    ctx.translate(dx + drawW, dy);
    ctx.scale(-1, 1);
    ctx.drawImage(img, 0, 0, drawW, drawH);
    if (red) {
      ctx.globalAlpha = alpha * red;
      ctx.drawImage(redTintOf(img), 0, 0, drawW, drawH);
    }
  } else {
    ctx.drawImage(img, dx, dy, drawW, drawH);
    if (red) {
      ctx.globalAlpha = alpha * red;
      ctx.drawImage(redTintOf(img), dx, dy, drawW, drawH);
    }
  }
  ctx.restore();
  if ((state.gun.holder === e.id || e.weaponPower) && e.alive) {
    const dir = state.player.x < e.x ? -1 : 1;
    drawRayGun(e.x + e.w / 2 + dir * 18, e.y + 24, -dir, 0.72, e.weaponPower ?? Math.min(2, state.weaponPower));
  }
  if (dying) drawAlienPoof(e.x + e.w / 2, e.y + e.h / 2, t);
  return true;
}

function drawAlienPoof(cx, cy, t) {
  ctx.save();
  ctx.globalAlpha = Math.max(0, 1 - t);
  ctx.fillStyle = "#fff3a4";
  for (let i = 0; i < 5; i++) {
    const angle = i * Math.PI * 0.4 - Math.PI / 2;
    const dist = 10 + t * 30 + i * 2;
    const x = cx + Math.cos(angle) * dist;
    const y = cy + Math.sin(angle) * dist;
    drawTinyStar(x, y, 4 + i % 2);
  }
  ctx.restore();
}

function drawTinyStar(x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 4;
    const radius = i % 2 === 0 ? r : r * 0.45;
    const px = x + Math.cos(a) * radius;
    const py = y + Math.sin(a) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

function drawFivePointStar(x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5;
    const radius = i % 2 === 0 ? r : r * 0.48;
    const px = x + Math.cos(a) * radius;
    const py = y + Math.sin(a) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

function drawPlayer() {
  const p = state.player;
  if (p.onCrescent) {
    drawCrescentRespawnSprite(p);
    return;
  }
  const warp = state.mode === "stageClear" ? Story.stageClearWarp() : 1;
  if (warp <= 0.02) return;
  const spriteReady = pyompySprite.complete && pyompySprite.naturalWidth > 0;
  if (spriteReady && state.mode === "playing") FX.drawGhosts(p, drawPlayerSprite);
  ctx.save();
  FX.playerTransform(p);
  if (warp < 1) {
    const cx = p.x + p.w / 2;
    const cy = p.y + p.h / 2;
    ctx.translate(cx, cy);
    ctx.rotate((1 - warp) * 9);
    ctx.scale(warp, warp);
    ctx.translate(-cx, -cy);
  }
  drawPlayerBody(p);
  ctx.restore();
}

function drawPlayerBody(p) {
  if (hasEquippedWeapon() && isRideable(state.weaponPower)) {
    if (p.invincible > 0 && state.mode !== "respawning" && Math.floor(performance.now() / 90) % 2) return;
    if (state.weaponPower === FIGHTER_POWER) drawFighter(p);
    else drawMech(p);
    return;
  }
  if (hasEquippedWeapon() && state.weaponPower >= 16) drawBackCannon(p);
  if (p.invincible > 0 && state.mode !== "respawning" && Math.floor(performance.now() / 90) % 2) return;
  const pose = Gimmick.drawPlayerPose(p);
  if (pose) {
    // ポーズの絵には銃が描かれていないので、にぎった手に、ねらう向きで銃を持たせる
    if (pose.gun && hasEquippedWeapon()) drawGunInHand(p, pose.gun.x, pose.gun.y);
    // 泳いでいるとき・ふせているときも、銃を持たせる（前にのばした手のあたり）
    else if ((p.swimming || pose.crawl) && hasEquippedWeapon()) drawAimedGun(p);
    return;
  }
  if (pyompySprite.complete && pyompySprite.naturalWidth > 0) drawPlayerSprite(p);
  else drawPlayerFallback(p);
  if (hasEquippedWeapon()) drawAimedGun(p);
}

// ---------- ロボット「ムーニアン・メカ」 ----------
// assets/mech-*.png があれば使い、なければプログラムで描いた仮のロボットを出す
const mechArt = {};
for (const key of ["idle", "jump", "shoot", "walk-6", "board", "missile"]) {
  const im = new Image();
  im.src = `assets/mech-${key}.png`;
  mechArt[key] = im;
}
// 歩きのシートは、コマの下半分にロボットが描かれているので、その部分だけ切りとって使う
const MECH_WALK_CROP = { y: 456, h: 568 };
const MECH_H = 170; // ぴょんぴー（約84）の2倍くらい

function drawMech(p) {
  const f = p.facing || 1;
  const cx = p.x + p.w / 2;
  const bottom = p.y + p.h + 4;
  const t = performance.now() / 1000;
  const grounded = p.grounded || isPlayerVisuallyOnGround(p);
  const walking = grounded && Math.abs(p.vx) > 35;
  const shooting = state.gun.cooldown > 0;
  const ok = im => im && im.complete && im.naturalWidth > 0;
  ctx.save();
  ctx.translate(cx, bottom);
  ctx.scale(f, 1);
  if (p.retro && !grounded) drawMechRetroThrust(t);
  // 合体した直後は、乗りこむ絵をしばらく出す
  const boarding = (state.mechBoardUntil ?? 0) > performance.now() && grounded;
  const art = boarding ? mechArt.board : !grounded ? mechArt.jump : shooting ? mechArt.shoot : walking ? null : mechArt.idle;
  const sheet = mechArt["walk-6"];
  if (walking && !boarding && ok(sheet)) {
    const frame = Math.floor(t * 10) % 6;
    const fw = sheet.naturalWidth / 6;
    const crop = MECH_WALK_CROP;
    const dw = MECH_H * (fw / crop.h);
    ctx.drawImage(sheet, frame * fw, crop.y, fw, crop.h, -dw / 2, -MECH_H, dw, MECH_H);
  } else if (ok(art)) {
    const dh = grounded ? MECH_H : MECH_H * 1.05;
    const dw = dh * (art.naturalWidth / art.naturalHeight);
    ctx.drawImage(art, -dw / 2, grounded ? -dh : -dh * 0.9, dw, dh);
  } else {
    drawMechPlaceholder(t, walking, grounded, shooting);
  }
  ctx.restore();
}

// ---------- 戦闘機「ムーニアン・ファイター」 ----------
const fighterArt = {};
for (const key of ["fly", "shoot", "transform"]) {
  const im = new Image();
  im.src = `assets/fighter-${key}.png`;
  fighterArt[key] = im;
}

function drawFighter(p) {
  const f = p.facing || 1;
  const t = performance.now() / 1000;
  const cx = p.x + p.w / 2;
  const cy = p.y + p.h / 2 + Math.sin(t * 4) * 3;
  const tilt = clamp((p.vy ?? 0) / 900, -0.25, 0.25);
  const ready = im => im && im.complete && im.naturalWidth > 0;
  const transforming = (state.fighterTransformUntil ?? 0) > performance.now() && ready(fighterArt.transform);
  const art = state.gun.cooldown > 0 ? fighterArt.shoot : fighterArt.fly;
  const W = 190; // 絵の横はば
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(f, 1);
  ctx.rotate(tilt);
  if (transforming) {
    // ロボットから変形中の絵（キラキラつき）
    const s = W * 1.05;
    ctx.drawImage(fighterArt.transform, -s / 2, -s / 2, s, s);
    ctx.restore();
    return;
  }
  // エンジンの炎（絵があるときは、機体の後ろの噴射口から出す）
  const useArt = ready(art);
  const nozzleX = useArt ? -W / 2 + 6 : -58;
  const nozzleY = useArt ? -W * 0.5 * 0.12 : 0;
  const flame = 30 + Math.random() * 16;
  const g = ctx.createLinearGradient(nozzleX, 0, nozzleX - flame, 0);
  g.addColorStop(0, "rgba(255, 255, 255, 0.95)");
  g.addColorStop(0.35, "rgba(158, 232, 255, 0.9)");
  g.addColorStop(1, "rgba(255, 120, 180, 0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(nozzleX, nozzleY - 12);
  ctx.lineTo(nozzleX - flame, nozzleY);
  ctx.lineTo(nozzleX, nozzleY + 12);
  ctx.closePath();
  ctx.fill();
  if (useArt) {
    const h = W * (art.naturalHeight / art.naturalWidth);
    ctx.drawImage(art, -W / 2, -h / 2, W, h);
  } else {
    drawFighterPlaceholder();
  }
  ctx.restore();
}

// 仮の戦闘機（画像がとどくまで）
function drawFighterPlaceholder() {
  const stroke = "#5a3d9a";
  ctx.lineJoin = "round";
  ctx.lineWidth = 3;
  // つばさ
  ctx.fillStyle = "#b7e9f2";
  ctx.strokeStyle = stroke;
  ctx.beginPath();
  ctx.moveTo(-10, -6);
  ctx.lineTo(-40, -46);
  ctx.lineTo(-20, -46);
  ctx.lineTo(20, -6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-10, 8);
  ctx.lineTo(-40, 44);
  ctx.lineTo(-20, 44);
  ctx.lineTo(20, 8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // 機体
  const body = ctx.createLinearGradient(-60, -20, 60, 20);
  body.addColorStop(0, "#d9cbff");
  body.addColorStop(1, "#a68ef0");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-60, -14);
  ctx.quadraticCurveTo(30, -24, 70, 0);
  ctx.quadraticCurveTo(30, 24, -60, 14);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "#fff3a4";
  ctx.beginPath();
  ctx.moveTo(-50, 0);
  ctx.lineTo(50, 0);
  ctx.stroke();
  // うさ耳のしっぽ翼
  ctx.fillStyle = "#ffd1ed";
  ctx.strokeStyle = stroke;
  ctx.beginPath();
  ctx.ellipse(-48, -24, 6, 16, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // コックピットとぴょんぴー
  ctx.fillStyle = "rgba(200, 245, 255, 0.85)";
  ctx.strokeStyle = "#ffffff";
  ctx.beginPath();
  ctx.ellipse(18, -12, 20, 13, 0, Math.PI, 0);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#fffaf0";
  ctx.beginPath();
  ctx.arc(18, -14, 8, 0, Math.PI * 2);
  ctx.fill();
  // ミサイル
  ctx.fillStyle = "#ff8db7";
  ctx.strokeStyle = stroke;
  ctx.beginPath();
  ctx.roundRect(-10, 16, 40, 9, 4);
  ctx.fill();
  ctx.stroke();
  drawWeaponMark(-28, 0, 12, 1);
  drawWeaponMark(-12, 0, 12, 16);
}

// 足の裏からの逆噴射（ゆっくり降りているとき）
function drawMechRetroThrust(t) {
  for (const side of [-1, 1]) {
    const x = side * 24;
    const len = 62 + Math.sin(t * 50 + side) * 10 + Math.random() * 14;
    ctx.save();
    ctx.shadowColor = "#9ee8ff";
    ctx.shadowBlur = 22;
    const g = ctx.createLinearGradient(0, -4, 0, len);
    g.addColorStop(0, "rgba(255, 255, 255, 1)");
    g.addColorStop(0.3, "rgba(158, 232, 255, 0.95)");
    g.addColorStop(0.7, "rgba(255, 141, 183, 0.6)");
    g.addColorStop(1, "rgba(255, 141, 183, 0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - 20, -4);
    ctx.quadraticCurveTo(x, len * 1.2, x + 20, -4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
    ctx.beginPath();
    ctx.ellipse(x, 2, 12, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // まわりに散る光のつぶ
    ctx.fillStyle = "rgba(255, 243, 164, 0.8)";
    for (let k = 0; k < 3; k++) {
      const px = x + (Math.random() - 0.5) * 30;
      const py = len * (0.5 + Math.random() * 0.6);
      ctx.beginPath();
      ctx.arc(px, py, 2 + Math.random() * 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// 仮のロボット（画像がとどくまで）
function drawMechPlaceholder(t, walking, grounded, shooting) {
  const step = walking ? Math.sin(t * 12) : 0;
  const bob = walking ? Math.abs(Math.cos(t * 12)) * 4 : Math.sin(t * 3) * 1.5;
  const legs = grounded ? 0 : 10;
  const stroke = "#5a3d9a";
  ctx.lineJoin = "round";
  ctx.lineWidth = 3;
  // 足
  for (const side of [-1, 1]) {
    const swing = step * side * 10;
    ctx.fillStyle = side < 0 ? "#9ad9e8" : "#b7e9f2";
    ctx.strokeStyle = stroke;
    ctx.beginPath();
    ctx.roundRect(side * 22 - 12 + swing, -62 + legs, 24, 50 - legs, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#fff3a4";
    ctx.beginPath();
    ctx.ellipse(side * 22 + swing + 4, -8 + legs * 0.4, 22, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.translate(0, -bob);
  // 背中のブースター
  ctx.fillStyle = "#c8b2ff";
  ctx.strokeStyle = stroke;
  ctx.beginPath();
  ctx.roundRect(-54, -126, 18, 46, 6);
  ctx.fill();
  ctx.stroke();
  if (!grounded) {
    ctx.fillStyle = `rgba(255, 180, 80, ${0.6 + Math.sin(t * 40) * 0.3})`;
    ctx.beginPath();
    ctx.moveTo(-52, -80);
    ctx.lineTo(-38, -80);
    ctx.lineTo(-45, -56 - Math.random() * 10);
    ctx.closePath();
    ctx.fill();
  }
  // 体
  const body = ctx.createLinearGradient(-44, -150, 44, -60);
  body.addColorStop(0, "#d9cbff");
  body.addColorStop(1, "#a68ef0");
  ctx.fillStyle = body;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(-44, -150, 88, 92, 26);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "#fff3a4";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(-38, -144, 76, 80, 22);
  ctx.stroke();
  // うさ耳アンテナ
  for (const side of [-1, 1]) {
    ctx.fillStyle = "#ffd1ed";
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(side * 16, -168, 7, 18, side * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  // コックピット（中にぴょんぴー）
  ctx.fillStyle = "rgba(200, 245, 255, 0.85)";
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(6, -114, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#fffaf0";
  ctx.beginPath();
  ctx.arc(8, -112, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#3f355d";
  ctx.beginPath();
  ctx.arc(13, -114, 2.4, 0, Math.PI * 2);
  ctx.arc(4, -114, 2.4, 0, Math.PI * 2);
  ctx.fill();
  // 肩のミサイルポッド
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(side * 40, -150);
    ctx.rotate(shooting ? -0.35 : 0);
    ctx.fillStyle = "#ff8db7";
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(-16, -18, 32, 26, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#5a3d9a";
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.arc(-9 + k * 9, -5, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  // 三日月と星のマーク
  drawWeaponMark(-26, -92, 16, 1);
  drawWeaponMark(28, -92, 16, 16);
}

function drawGunInHand(p, x, y) {
  const f = p.facing || 1;
  const a = p.aim ?? (f < 0 ? Math.PI : 0);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(f, 1);
  ctx.rotate(clampAngle(f > 0 ? a : Math.PI - a));
  drawRayGun(9, -3, -1, 0.7, state.weaponPower);
  ctx.restore();
}

// ねらっている向きに銃を回して持たせる（8方向）
function drawAimedGun(p) {
  const f = p.facing || 1;
  const a = p.aim ?? (f < 0 ? Math.PI : 0);
  // 右向きを基準にした角度（左向きのときは左右を反転して考える）
  const rel = f > 0 ? a : Math.PI - a;
  const s = playerShoulder(p);
  ctx.save();
  ctx.translate(s.x, s.y + 4);
  ctx.scale(f, 1);
  ctx.rotate(clampAngle(rel));
  drawRayGun(21, 0, -1, 0.7, state.weaponPower);
  ctx.restore();
}

function drawCrescentRespawnSprite(p) {
  const duration = state.respawnDuration ?? 3;
  const remaining = clamp(state.respawnTimer ?? 0, 0, duration);
  const elapsed = duration - remaining;
  const progress = clamp(elapsed / duration, 0, 1);
  const blinkInterval = 0.34 - progress * 0.25;
  const visible = Math.floor(elapsed / Math.max(0.055, blinkInterval)) % 2 === 0;
  if (!visible) return;

  const bob = Math.sin(performance.now() / 145) * 4;
  if (pyompyCrescentRespawn.complete && pyompyCrescentRespawn.naturalWidth > 0) {
    const drawW = 146;
    const drawH = drawW * (pyompyCrescentRespawn.naturalHeight / pyompyCrescentRespawn.naturalWidth);
    const dx = p.x + p.w / 2 - drawW / 2;
    const dy = p.y + p.h - drawH + 38 + bob;
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.globalAlpha = 0.9 + Math.sin(performance.now() / 95) * 0.08;
    ctx.shadowColor = "rgba(255, 243, 164, 0.65)";
    ctx.shadowBlur = 18;
    if ((p.facing ?? 1) < 0) {
      ctx.translate(dx + drawW, dy);
      ctx.scale(-1, 1);
      ctx.drawImage(pyompyCrescentRespawn, 0, 0, drawW, drawH);
    } else {
      ctx.drawImage(pyompyCrescentRespawn, dx, dy, drawW, drawH);
    }
    ctx.restore();
    return;
  }

  drawCrescentMount(p.x + p.w / 2, p.y + p.h + 18 + bob);
  drawPlayerFallback(p);
}

function drawCrescentMount(cx, cy) {
  const bob = Math.sin(performance.now() / 180) * 3;
  ctx.save();
  ctx.translate(cx, cy + bob);
  ctx.shadowColor = "rgba(255, 243, 164, 0.8)";
  ctx.shadowBlur = 18;
  ctx.fillStyle = "#fff3a4";
  ctx.beginPath();
  ctx.arc(0, 0, 38, 0.22 * Math.PI, 1.78 * Math.PI);
  ctx.arc(14, -5, 34, 1.72 * Math.PI, 0.28 * Math.PI, true);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = "#ffd1ed";
  drawTinyStar(-36, -16, 5);
  ctx.fillStyle = "#9ee8ff";
  drawTinyStar(36, -22, 4);
  ctx.restore();
}

function drawBackCannon(p) {
  const bob = Math.sin(performance.now() / 180) * 4;
  const dir = p.facing || 1;
  const x = p.x + p.w / 2 - dir * 30;
  const y = p.y + 14 + bob;
  ctx.save();
  ctx.globalAlpha = 0.96;
  ctx.translate(x, y);
  ctx.scale(-dir, 1);
  drawWeaponIcon(0, 0, 16, 0.72, 1);
  ctx.strokeStyle = "rgba(158, 232, 255, 0.62)";
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(-12, 18);
  ctx.quadraticCurveTo(-4, 34, 18, 36);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "rgba(255, 243, 164, 0.72)";
  drawTinyStar(-34, -22, 4);
  drawTinyStar(30, -18, 3);
  ctx.restore();
}

function drawPlayerSprite(p) {
  const visuallyGrounded = p.grounded || isPlayerVisuallyOnGround(p);
  if (!visuallyGrounded && pyompyJump.complete && pyompyJump.naturalWidth > 0) {
    drawPlayerJumpSprite(p);
    return;
  }
  if (visuallyGrounded && Math.abs(p.vx) > 35 && pyompyRun.complete && pyompyRun.naturalWidth > 0) {
    drawPlayerRunSprite(p);
    return;
  }

  const speed = Math.abs(p.vx);
  const t = performance.now() / 1000;
  let frame = 0;

  const airborne = !visuallyGrounded;
  if (airborne) {
    frame = 0;
  } else if (speed > 45) {
    frame = 1 + Math.floor(t * 10) % 3;
  }

  const source = PYOMPY_FRAMES[frame];
  const drawH = 82;
  const drawW = drawH * (source.w / source.h);
  const dx = p.x + p.w / 2 - drawW * (source.anchorX ?? 0.5);
  const dy = p.y + p.h - drawH + 1;

  ctx.save();
  if (p.facing < 0) {
    ctx.translate(dx + drawW, dy);
    ctx.scale(-1, 1);
    ctx.drawImage(pyompySprite, source.x, source.y, source.w, source.h, 0, 0, drawW, drawH);
  } else {
    ctx.drawImage(pyompySprite, source.x, source.y, source.w, source.h, dx, dy, drawW, drawH);
  }
  ctx.restore();
}

function isPlayerVisuallyOnGround(p) {
  if (p.swimming || p.vy < -40) return false;
  const probe = rect(p.x + 5, p.y + p.h, p.w - 10, 10);
  return platforms.concat(blocks.filter(b => !b.broken)).some(s => hit(probe, s));
}

function drawPlayerRunSprite(p) {
  const t = performance.now() / 1000;
  const speedRate = clamp(Math.abs(p.vx) / 360, 0.45, 1.2);
  const frame = Math.floor(t * 13 * speedRate) % PYOMPY_RUN_FRAMES.length;
  const source = PYOMPY_RUN_FRAMES[frame];
  const drawH = 142; // 待機のぴょんぴーと同じくらいの大きさ
  const drawW = drawH * (source.w / source.h);
  const contactBaseline = 566;
  const scale = drawH / source.h;
  const dx = p.x + p.w / 2 - drawW / 2;
  const dy = p.y + p.h - contactBaseline * scale + 1;

  ctx.save();
  if (p.facing < 0) {
    ctx.translate(dx + drawW, dy);
    ctx.scale(-1, 1);
    ctx.drawImage(pyompyRun, source.x, source.y, source.w, source.h, 0, 0, drawW, drawH);
  } else {
    ctx.drawImage(pyompyRun, source.x, source.y, source.w, source.h, dx, dy, drawW, drawH);
  }
  ctx.restore();
}

function drawPlayerJumpSprite(p) {
  const source = { x: 253, y: 48, w: 700, h: 966 };
  const drawH = 80; // 待機のぴょんぴー（約77）と同じくらい。ジャンプは体がのびるので少しだけ高め
  const drawW = drawH * (source.w / source.h);
  const dx = p.x + p.w / 2 - drawW * 0.54;
  const dy = p.y + p.h - drawH + 7;

  ctx.save();
  if (p.facing < 0) {
    ctx.translate(dx + drawW, dy);
    ctx.scale(-1, 1);
    ctx.drawImage(pyompyJump, source.x, source.y, source.w, source.h, 0, 0, drawW, drawH);
  } else {
    ctx.drawImage(pyompyJump, source.x, source.y, source.w, source.h, dx, dy, drawW, drawH);
  }
  ctx.restore();
}

function drawPlayerFallback(p) {
  const x = p.x;
  const y = p.y;

  // ぴょんぴー: white plush face, blue eyes, bunny cap, shiny jacket, purple accents.
  ctx.fillStyle = "#f4f1e8";
  ctx.beginPath();
  ctx.ellipse(x + 20, y + 17, 18, 17, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f4f1e8";
  ctx.beginPath();
  ctx.ellipse(x + 11, y - 2, 6, 17, -0.25, 0, Math.PI * 2);
  ctx.ellipse(x + 28, y - 4, 6, 19, 0.22, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f4bdd2";
  ctx.beginPath();
  ctx.ellipse(x + 11, y - 1, 3, 11, -0.25, 0, Math.PI * 2);
  ctx.ellipse(x + 28, y - 3, 3, 12, 0.22, 0, Math.PI * 2);
  ctx.fill();

  const cap = ctx.createLinearGradient(x + 4, y + 2, x + 35, y + 17);
  cap.addColorStop(0, "#e9f8ff");
  cap.addColorStop(0.45, "#f7edff");
  cap.addColorStop(1, "#fff2a9");
  ctx.fillStyle = cap;
  ctx.fillRect(x + 5, y + 4, 30, 9);
  ctx.fillStyle = "#f4f1e8";
  ctx.fillRect(x + 1, y + 11, 38, 5);

  ctx.fillStyle = "#083174";
  ctx.beginPath();
  ctx.arc(x + 12, y + 18, 3, 0, Math.PI * 2);
  ctx.arc(x + 28, y + 18, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x + 13, y + 16, 1.5, 1.5);
  ctx.fillRect(x + 29, y + 16, 1.5, 1.5);

  ctx.fillStyle = "#9b6840";
  ctx.beginPath();
  ctx.ellipse(x + 20, y + 24, 6, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#5c4639";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 14, y + 29);
  ctx.quadraticCurveTo(x + 20, y + 32, x + 26, y + 29);
  ctx.stroke();

  const jacket = ctx.createLinearGradient(x + 4, y + 32, x + 36, y + 50);
  jacket.addColorStop(0, "#edf9ff");
  jacket.addColorStop(0.35, "#d8d2ff");
  jacket.addColorStop(0.7, "#fff3bd");
  jacket.addColorStop(1, "#d6fff1");
  ctx.fillStyle = jacket;
  ctx.fillRect(x + 6, y + 32, 28, 16);
  ctx.fillStyle = "#7859b7";
  ctx.fillRect(x + 6, y + 45, 28, 4);
  ctx.fillRect(x + 18, y + 32, 3, 17);

  ctx.fillStyle = "#1c1d25";
  ctx.fillRect(x + 8, y + 49, 10, 6);
  ctx.fillRect(x + 22, y + 49, 10, 6);
  ctx.fillStyle = "#c8b2ff";
  ctx.fillRect(x + 5, y + 53, 13, 5);
  ctx.fillRect(x + 22, y + 53, 13, 5);
}

function hit(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function registerMoveTap(dir) {
  if (!dir) return;
  const now = performance.now();
  if (lastMoveTapDir === dir && now - lastMoveTapAt <= 280) {
    doubleTapRunDir = dir;
    doubleTapRunUntil = Infinity;
    doubleTapRunGraceUntil = now + 180;
  }
  lastMoveTapDir = dir;
  lastMoveTapAt = now;
}

function updateGamepad() {
  const now = performance.now();
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  const pad = Array.from(pads).find(Boolean);
  if (!pad) {
    gamepadState.left = false;
    gamepadState.right = false;
    gamepadState.up = false;
    gamepadState.down = false;
    gamepadState.jump = false;
    gamepadState.run = false;
    gamepadState.shoot = false;
    gamepadState.start = false;
    gamepadState.select = false;
    return;
  }

  if (gamepadState.padId !== pad.id) {
    gamepadState.padId = pad.id;
    gamepadState.neutralAxisX = pad.axes[0] || 0;
    gamepadState.neutralAxisY = pad.axes[1] || 0;
  }
  const axisX = clamp((pad.axes[0] || 0) - (gamepadState.neutralAxisX || 0), -1, 1);
  const axisY = clamp((pad.axes[1] || 0) - (gamepadState.neutralAxisY || 0), -1, 1);
  const dpadLeft = Boolean(pad.buttons[14]?.pressed);
  const dpadRight = Boolean(pad.buttons[15]?.pressed);
  const dpadUp = Boolean(pad.buttons[12]?.pressed);
  const dpadDown = Boolean(pad.buttons[13]?.pressed);
  const phys = { A: Boolean(pad.buttons[0]?.pressed), B: Boolean(pad.buttons[1]?.pressed), X: Boolean(pad.buttons[2]?.pressed), Y: Boolean(pad.buttons[3]?.pressed) };
  // ゲーム中は、せっていのボタンの割り当てで読みかえる（メニューでは A=決定、B=もどる のまま）
  const act = inGameplay() ? Settings.padActions(phys) : { jump: phys.A, dash: phys.B, attack: phys.X || phys.Y };
  const jumpPressed = act.jump;
  const runPressed = act.dash || Boolean(pad.buttons[5]?.pressed);
  const shootPressed = act.attack;
  const selectPressed = Boolean(pad.buttons[8]?.pressed);
  const startPressed = Boolean(pad.buttons[9]?.pressed);

  gamepadState.left = axisX < -0.35 || dpadLeft;
  gamepadState.right = axisX > 0.35 || dpadRight;
  gamepadState.up = axisY < -0.35 || dpadUp;
  gamepadState.down = axisY > 0.35 || dpadDown;
  gamepadState.jump = jumpPressed;
  gamepadState.run = runPressed;
  gamepadState.shoot = shootPressed;
  gamepadState.select = selectPressed;
  gamepadState.start = startPressed;
  if (state.mode === "playing") {
    if (gamepadState.left && !gamepadState.leftLatch) registerMoveTap(-1);
    if (gamepadState.right && !gamepadState.rightLatch) registerMoveTap(1);
  }

  if (state.mode === "title" && state.settingsMenu) {
    if (gamepadState.left && !gamepadState.leftLatch) handleSettingsKey("ArrowLeft");
    if (gamepadState.right && !gamepadState.rightLatch) handleSettingsKey("ArrowRight");
    if (gamepadState.up && !gamepadState.upLatch) handleSettingsKey("ArrowUp");
    if (gamepadState.down && !gamepadState.downLatch) handleSettingsKey("ArrowDown");
    if (jumpPressed && !gamepadState.jumpLatch) handleSettingsKey("Space");
    if (runPressed && !gamepadState.runLatch) handleSettingsKey("Escape");
    gamepadState.leftLatch = gamepadState.left;
    gamepadState.rightLatch = gamepadState.right;
    gamepadState.upLatch = gamepadState.up;
    gamepadState.downLatch = gamepadState.down;
    gamepadState.runLatch = runPressed;
    gamepadState.jumpLatch = jumpPressed;
    gamepadState.shootLatch = shootPressed;
    return;
  }
  if (state.mode === "title" && state.saveMenu) {
    if (gamepadState.left && !gamepadState.leftLatch) handleSaveMenuKey("ArrowLeft");
    if (gamepadState.right && !gamepadState.rightLatch) handleSaveMenuKey("ArrowRight");
    if (gamepadState.up && !gamepadState.upLatch) handleSaveMenuKey("ArrowUp");
    if (gamepadState.down && !gamepadState.downLatch) handleSaveMenuKey("ArrowDown");
    if (jumpPressed && !gamepadState.jumpLatch) handleSaveMenuKey("Space");
    if (shootPressed && !gamepadState.shootLatch) handleSaveMenuKey("KeyX");
    if (runPressed && !gamepadState.runLatch) handleSaveMenuKey("Escape");
    gamepadState.leftLatch = gamepadState.left;
    gamepadState.rightLatch = gamepadState.right;
    gamepadState.upLatch = gamepadState.up;
    gamepadState.downLatch = gamepadState.down;
    gamepadState.runLatch = runPressed;
    gamepadState.jumpLatch = jumpPressed;
    gamepadState.shootLatch = shootPressed;
    return;
  } else if (!overlay.classList.contains("hidden")) {
    const anyStartPressed = jumpPressed || shootPressed || runPressed || startPressed || selectPressed;
    const anyStartLatched = gamepadState.jumpLatch || gamepadState.shootLatch || gamepadState.runLatch || gamepadState.startLatch || gamepadState.selectLatch;
    if (state.mode === "title" && gamepadState.up && !gamepadState.upLatch) moveTitleFocus(-1);
    if (state.mode === "title" && gamepadState.down && !gamepadState.downLatch) moveTitleFocus(1);
    if (anyStartPressed && !anyStartLatched) confirmOverlay();
    gamepadState.leftLatch = gamepadState.left;
    gamepadState.rightLatch = gamepadState.right;
    gamepadState.upLatch = gamepadState.up;
    gamepadState.downLatch = gamepadState.down;
    gamepadState.runLatch = runPressed;
    gamepadState.selectLatch = selectPressed;
    gamepadState.startLatch = startPressed;
    gamepadState.jumpLatch = jumpPressed;
    gamepadState.shootLatch = shootPressed;
    return;
  }

  if (Story.isStoryMode(state.mode)) {
    if ((jumpPressed && !gamepadState.jumpLatch) || (shootPressed && !gamepadState.shootLatch)) Story.handleKey("Space");
    if ((startPressed && !gamepadState.startLatch) || (selectPressed && !gamepadState.selectLatch) || (runPressed && !gamepadState.runLatch && state.mode === "shop")) Story.handleKey("Escape");
    if (gamepadState.up && !gamepadState.upLatch) Story.handleKey("ArrowUp");
    if (gamepadState.down && !gamepadState.downLatch) Story.handleKey("ArrowDown");
    gamepadState.leftLatch = gamepadState.left;
    gamepadState.rightLatch = gamepadState.right;
    gamepadState.upLatch = gamepadState.up;
    gamepadState.downLatch = gamepadState.down;
    gamepadState.runLatch = runPressed;
    gamepadState.selectLatch = selectPressed;
    gamepadState.startLatch = startPressed;
    gamepadState.jumpLatch = jumpPressed;
    gamepadState.shootLatch = shootPressed;
    return;
  }

  if (state.mode === "bossIntro" || state.mode === "bossOutro") {
    if ((jumpPressed && !gamepadState.jumpLatch) || (shootPressed && !gamepadState.shootLatch) || (startPressed && !gamepadState.startLatch)) advanceBossIntro();
    gamepadState.leftLatch = gamepadState.left;
    gamepadState.rightLatch = gamepadState.right;
    gamepadState.upLatch = gamepadState.up;
    gamepadState.downLatch = gamepadState.down;
    gamepadState.selectLatch = selectPressed;
    gamepadState.startLatch = startPressed;
    gamepadState.jumpLatch = jumpPressed;
    gamepadState.shootLatch = shootPressed;
    return;
  }

  if (state.mode === "worldMap") {
    const moveName = gamepadState.left ? "left" : gamepadState.up ? "up" : gamepadState.right ? "right" : gamepadState.down ? "down" : "";
    const freshMove = (gamepadState.left && !gamepadState.leftLatch) || (gamepadState.right && !gamepadState.rightLatch) || (gamepadState.up && !gamepadState.upLatch) || (gamepadState.down && !gamepadState.downLatch);
    if (!moveName) {
      gamepadState.inventoryMoveDelay = 0;
    } else if (freshMove || now >= gamepadState.inventoryMoveDelay) {
      mapMove(moveName);
      gamepadState.inventoryMoveDelay = now + (freshMove ? 230 : 125);
    }
    // マップでも SELECT でそうび画面（お店は、地図のお店のところで A）
    if (selectPressed && !gamepadState.selectLatch) openInventory();
    if ((jumpPressed && !gamepadState.jumpLatch) || (shootPressed && !gamepadState.shootLatch) || (startPressed && !gamepadState.startLatch)) confirmMapSelection();
    gamepadState.leftLatch = gamepadState.left;
    gamepadState.rightLatch = gamepadState.right;
    gamepadState.upLatch = gamepadState.up;
    gamepadState.downLatch = gamepadState.down;
    gamepadState.selectLatch = selectPressed;
    gamepadState.startLatch = startPressed;
    gamepadState.jumpLatch = jumpPressed;
    gamepadState.shootLatch = shootPressed;
    return;
  }

  if (state.mode === "paused") {
    if (startPressed && !gamepadState.startLatch) resumeGame();
    if ((gamepadState.left || gamepadState.up || gamepadState.right || gamepadState.down) && !(gamepadState.leftLatch || gamepadState.upLatch || gamepadState.rightLatch || gamepadState.downLatch)) {
      pauseSelection = 1 - pauseSelection;
      playSfx("cursor");
    }
    if ((jumpPressed && !gamepadState.jumpLatch) || (shootPressed && !gamepadState.shootLatch)) choosePauseOption();
    gamepadState.leftLatch = gamepadState.left;
    gamepadState.rightLatch = gamepadState.right;
    gamepadState.upLatch = gamepadState.up;
    gamepadState.downLatch = gamepadState.down;
    gamepadState.selectLatch = selectPressed;
    gamepadState.startLatch = startPressed;
    gamepadState.jumpLatch = jumpPressed;
    gamepadState.shootLatch = shootPressed;
    return;
  }

  if (startPressed && !gamepadState.startLatch && (state.mode === "playing" || state.mode === "respawning") && overlay.classList.contains("hidden")) {
    pauseGame();
  }
  if (jumpPressed && !gamepadState.jumpLatch && state.mode === "playing") queueStompBoost();
  if (selectPressed && !gamepadState.selectLatch) toggleInventory();
  if (state.mode === "inventory") {
    updateInventoryGamepadFocus(now, jumpPressed, runPressed, shootPressed);
  }
  if (startPressed && !gamepadState.startLatch && state.mode !== "inventory" && !overlay.classList.contains("hidden")) {
    confirmOverlay();
  }
  gamepadState.leftLatch = gamepadState.left;
  gamepadState.rightLatch = gamepadState.right;
  gamepadState.upLatch = gamepadState.up;
  gamepadState.downLatch = gamepadState.down;
  gamepadState.runLatch = runPressed;
  gamepadState.selectLatch = selectPressed;
  gamepadState.startLatch = startPressed;
  gamepadState.jumpLatch = jumpPressed;
  gamepadState.shootLatch = shootPressed;
}

window.addEventListener("keydown", event => {
  unlockAudio();
  const code = normalizeInputCode(event);
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space", "Tab", "Enter"].includes(code)) event.preventDefault();
  handleKeyDown(code, event);
});

// キーボードと画面のボタン（タッチ）で共通の入力処理
function handleKeyDown(code, event = { repeat: false }) {
  if (state?.mode === "title" && state.settingsMenu) {
    if (!event.repeat || ["ArrowLeft", "ArrowRight", "KeyA", "KeyD"].includes(code)) handleSettingsKey(code);
    return;
  }
  if (state?.mode === "title" && state.saveMenu) {
    handleSaveMenuKey(code, event.repeat);
    return;
  }
  if (code === "KeyM" && !event.repeat) toggleSound();
  if (Story.isStoryMode(state.mode)) {
    if (!event.repeat) Story.handleKey(code);
    return;
  }
  if (FX.transitioning() && (state.mode === "worldMap" || state.mode === "title" || state.mode === "ended")) return;
  if (!event.repeat && (code === "ArrowLeft" || code === "KeyA")) registerMoveTap(-1);
  if (!event.repeat && (code === "ArrowRight" || code === "KeyD")) registerMoveTap(1);
  if (!event.repeat && code === "Space") queueStompBoost();
  if (state.mode === "bossIntro" || state.mode === "bossOutro") {
    if (!event.repeat && ["Enter", "Space", "KeyX", "KeyY", "KeyJ", "KeyZ", "KeyA"].includes(code)) advanceBossIntro();
    return;
  }
  if (state.mode === "paused") {
    if (!event.repeat && (code === "Enter" || code === "KeyP" || code === "Escape")) {
      resumeGame();
      return;
    }
    if (!event.repeat && (code === "ArrowUp" || code === "ArrowDown" || code === "ArrowLeft" || code === "ArrowRight" || code === "KeyW" || code === "KeyS" || code === "KeyA" || code === "KeyD")) {
      pauseSelection = 1 - pauseSelection;
      playSfx("cursor");
    }
    if (!event.repeat && (code === "Space" || code === "KeyX" || code === "KeyY" || code === "KeyJ")) choosePauseOption();
    return;
  }
  if (state.mode === "worldMap") {
    if (!event.repeat && (code === "Tab" || code === "Select" || code === "KeyI" || code === "KeyE")) openInventory();
    if (code === "ArrowLeft" || code === "KeyA") mapMove("left");
    if (code === "ArrowRight" || code === "KeyD") mapMove("right");
    if (code === "ArrowUp" || code === "KeyW") mapMove("up");
    if (code === "ArrowDown" || code === "KeyS") mapMove("down");
    if (code === "Enter" || code === "Space" || code === "KeyX" || code === "KeyY" || code === "KeyJ") confirmMapSelection();
    return;
  }
  if (!event.repeat && code === "Enter" && (state.mode === "playing" || state.mode === "respawning") && overlay.classList.contains("hidden")) {
    pauseGame();
    return;
  }
  if (!event.repeat && (code === "KeyP" || code === "Escape") && overlay.classList.contains("hidden")) {
    if (state.mode === "inventory") closeInventory();
    else if (state.mode === "playing" || state.mode === "respawning") pauseGame();
    return;
  }
  if (code === "Tab" || code === "Backspace" || code === "Select" || ((code === "KeyI" || code === "KeyE") && !event.repeat && state.mode !== "inventory")) {
    toggleInventory();
    return;
  }
  if (state.mode === "inventory") {
    handleInventoryKeyboardFocus(code, event.repeat);
    return;
  }
  if (!overlay.classList.contains("hidden") && state.mode === "title" && !event.repeat) {
    if (code === "ArrowUp" || code === "KeyW") return moveTitleFocus(-1);
    if (code === "ArrowDown" || code === "KeyS") return moveTitleFocus(1);
    if (["KeyX", "KeyY", "KeyJ"].includes(code)) return confirmOverlay();
  }
  if ((code === "Enter" || code === "Space") && !overlay.classList.contains("hidden")) {
    confirmOverlay();
    return;
  }
  keys.add(code);
}

// タイトルの「はじめから / つづきから」を十字キーで選ぶ（上から順に並ぶ）
let titleFocusIndex = -1;

function titleMenuButtons() {
  return [document.querySelector("#newGameButton"), startButton, document.querySelector("#settingsButton")]
    .filter(button => button && !button.classList.contains("hidden"));
}

function syncTitleFocus() {
  const buttons = titleMenuButtons();
  if (titleFocusIndex < 0 || titleFocusIndex >= buttons.length) {
    // 読みこめるものがあれば「つづきから」、なければ「はじめから」を選んでおく
    const canLoad = readSaveSlots().some(Boolean) || Story.hasSave();
    titleFocusIndex = buttons.indexOf(canLoad ? startButton : document.querySelector("#newGameButton"));
  }
  for (const button of document.querySelectorAll(".title-actions button")) {
    button.classList.toggle("is-focused", buttons[titleFocusIndex] === button);
  }
}

function moveTitleFocus(dir) {
  const buttons = titleMenuButtons();
  if (buttons.length < 2) return;
  syncTitleFocus();
  const next = clamp(titleFocusIndex + dir, 0, buttons.length - 1);
  if (next === titleFocusIndex) return;
  titleFocusIndex = next;
  Story.refreshTitleUi(); // 「セーブを消してはじめる？」の確認を取り消す
  syncTitleFocus();
  playSfx("cursor");
}

function confirmOverlay() {
  if (state?.mode === "ended" && gameOverContinueAvailable) continueFromGameOver();
  else if (state?.mode === "title" && !pendingCourseStart) {
    syncTitleFocus();
    (titleMenuButtons()[titleFocusIndex] ?? startButton).click();
  } else pendingCourseStart ? startCurrentCourse() : startGame();
}

function handleKeyUp(code) {
  if (state.mode === "inventory" && (code === "Enter" || code === "Space") && state.inventoryGrab && !state.inventoryGrab.pointer) {
    releaseInventoryGrab();
    return;
  }
  keys.delete(code);
}

window.addEventListener("keyup", event => handleKeyUp(normalizeInputCode(event)));
startButton.addEventListener("click", () => {
  unlockAudio();
  if (state?.mode === "ended" && gameOverContinueAvailable) continueFromGameOver();
  else pendingCourseStart ? startCurrentCourse() : startGame();
});

langJaButton?.addEventListener("click", event => {
  event.stopPropagation();
  setLanguage("ja");
});

langEnButton?.addEventListener("click", event => {
  event.stopPropagation();
  setLanguage("en");
});

controlModeButtons.forEach(button => {
  button.addEventListener("click", event => {
    event.stopPropagation();
    setControlMode(button.dataset.controlMode, true);
  });
});

fullscreenButton?.addEventListener("click", event => {
  event.stopPropagation();
  enterBestFullscreen();
});

document.addEventListener("fullscreenchange", updateFullscreenButton);
document.addEventListener("webkitfullscreenchange", updateFullscreenButton);
window.addEventListener("orientationchange", nudgeMobileBrowserChrome);
window.addEventListener("resize", updateFullscreenButton);

canvas.addEventListener("pointerdown", event => {
  unlockAudio();
  const pos = canvasPoint(event);
  if (state.mode === "title" && state.settingsMenu) {
    handleSettingsPointer(pos.x, pos.y);
    event.preventDefault();
    return;
  }
  if (state.mode === "title" && state.saveMenu) {
    handleSaveMenuPointer(pos.x, pos.y);
    event.preventDefault();
    return;
  }
  if (Story.isStoryMode(state.mode)) {
    Story.handlePointer(pos.x, pos.y);
    event.preventDefault();
    return;
  }
  if (state.mode === "bossIntro" || state.mode === "bossOutro") {
    advanceBossIntro();
    event.preventDefault();
    return;
  }
  if (state.mode === "paused") {
    const rects = pauseButtonRects();
    const hitIndex = rects.findIndex(r => pos.x >= r.x && pos.x <= r.x + r.w && pos.y >= r.y && pos.y <= r.y + r.h);
    if (hitIndex >= 0) {
      pauseSelection = hitIndex;
      choosePauseOption();
      event.preventDefault();
    }
    return;
  }
  if (state.mode === "worldMap") {
    const tapped = SHOP_MAP_NODES.findIndex(n => {
      if (!shopNodeAvailable(n)) return false;
      const sp = shopNodeToCanvas(n);
      return Math.hypot(pos.x - sp.x, pos.y - (sp.y - 16 * MAP_UI)) <= 44 * MAP_UI;
    });
    if (tapped >= 0) {
      {
        if (mapAtShop && tapped === mapShopIndex) confirmMapSelection();
        else {
          setActiveShop(tapped);
          mapSelectedCourse = SHOP_MAP_NODE.course;
          currentCourse = mapSelectedCourse;
          mapAtShop = true;
          playSfx("cursor");
          updateHud();
        }
        event.preventDefault();
        return;
      }
    }
    const courseIndex = mapCourseAt(pos.x, pos.y);
    if (courseIndex >= 0) {
      if (courseIndex === mapSelectedCourse && !mapAtShop) startMapCourse(courseIndex);
      else {
        mapAtShop = false;
        mapSelectedCourse = courseIndex;
        currentCourse = courseIndex;
        playSfx("cursor");
        updateHud();
      }
      event.preventDefault();
    }
    return;
  }
  if (state.mode === "inventory") {
    if (state.saveMenu) {
      handleSaveMenuPointer(pos.x, pos.y);
      event.preventDefault();
      return;
    }
    if (state.deletePrompt) {
      handleDeletePromptPointer(pos.x, pos.y);
      event.preventDefault();
      return;
    }
    if (handleInventoryWorldMapConfirmPointer(pos.x, pos.y)) {
      event.preventDefault();
      return;
    }
    if (handleFusionPromptPointer(pos.x, pos.y)) return;
    if (handleInventoryTopMenuPointer(pos.x, pos.y)) {
      event.preventDefault();
      return;
    }
    const sortButton = inventorySortButtonRect();
    if (pos.x >= sortButton.x && pos.x <= sortButton.x + sortButton.w && pos.y >= sortButton.y && pos.y <= sortButton.y + sortButton.h) {
      runInventorySort();
      event.preventDefault();
      return;
    }
    const slot = inventorySlotAt(pos.x, pos.y);
    if (slot) {
      state.inventorySelection = slot.index;
      if (!slot.empty) {
        state.inventoryGrab = { from: slot.index, power: slot.power, x: pos.x, y: pos.y, startX: pos.x, startY: pos.y, moved: false, pointer: true, gamepad: false };
      }
      event.preventDefault();
      return;
    }
    return;
  }
  if (state.mode === "playing" && pos.x < 360 && pos.y < 112) openInventory();
});

canvas.addEventListener("pointermove", event => {
  if (state.mode !== "inventory" || !state.inventoryGrab) return;
  const pos = canvasPoint(event);
  if (Math.hypot(pos.x - state.inventoryGrab.startX, pos.y - state.inventoryGrab.startY) > 8) state.inventoryGrab.moved = true;
  state.inventoryGrab.x = pos.x;
  state.inventoryGrab.y = pos.y;
});

canvas.addEventListener("pointerup", event => {
  if (state.mode !== "inventory" || !state.inventoryGrab) return;
  const pos = canvasPoint(event);
  const target = inventorySlotAt(pos.x, pos.y);
  const grab = state.inventoryGrab;
  state.inventoryGrab = null;
  if (target && !target.empty && target.index === grab.from && !grab.moved) {
    equipWeapon(target.power - 1);
    return;
  }
  if (target && !target.empty && target.index !== grab.from && fusionResult(target.power, grab.power) !== null) {
    state.fusionPrompt = { power: grab.power, choice: 0, from: grab.from, to: target.index };
    return;
  }
  if (target && target.empty) {
    state.inventoryItems[grab.from] = null;
    state.inventoryItems[target.index] = grab.power;
    syncWeaponInventoryFromItems();
    state.inventorySelection = target.index;
    ensureInventorySelectionVisible();
    return;
  }
  if (target && !target.empty) {
    state.inventorySelection = target.index;
    if (target.index !== grab.from && grab.moved) explainNoFuse(grab.power, target.power);
    else equipWeapon(target.power - 1);
  }
});

canvas.addEventListener("wheel", event => {
  if (state.mode !== "inventory") return;
  event.preventDefault();
  const delta = event.deltaY > 0 ? VISIBLE_INVENTORY_ITEMS : -VISIBLE_INVENTORY_ITEMS;
  state.inventoryScroll = clamp((state.inventoryScroll ?? 0) + delta, 0, MAX_INVENTORY_ITEMS - VISIBLE_INVENTORY_ITEMS);
  clampInventoryScroll();
  state.inventorySelection = clamp(state.inventorySelection, state.inventoryScroll, state.inventoryScroll + VISIBLE_INVENTORY_ITEMS - 1);
}, { passive: false });

function canvasPoint(event) {
  const bounds = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - bounds.left) * (canvas.width / bounds.width),
    y: (event.clientY - bounds.top) * (canvas.height / bounds.height)
  };
}

function inventoryCardIndexAt(x, y) {
  const panelX = 86;
  const panelY = 58;
  const cardW = 142;
  const cardH = 230;
  const gap = 12;
  const startX = panelX + 28;
  const cardY = panelY + 98;
  for (let i = 0; i < MAX_WEAPON_POWER; i++) {
    const cardX = startX + i * (cardW + gap);
    if (x >= cardX && x <= cardX + cardW && y >= cardY && y <= cardY + cardH) return i;
  }
  return -1;
}

function normalizeInputCode(event) {
  if (event.code && event.code !== "Unidentified") return event.code;
  const aliases = {
    Left: "ArrowLeft",
    Right: "ArrowRight",
    Up: "ArrowUp",
    Down: "ArrowDown",
    Spacebar: "Space",
    " ": "Space",
    b: "KeyB",
    B: "KeyB",
    y: "KeyY",
    Y: "KeyY",
    Tab: "Tab",
    Select: "Select",
    Shift: "ShiftLeft"
  };
  return aliases[event.key] || event.key || event.code;
}

function moveInventorySelection(dir) {
  if (!state || state.mode !== "inventory") return;
  // はじめての合成：つかむまでは、光っている武器から動かない
  if (fuseLessonOn() && !state.inventoryGrab) return fuseLessonNudge();
  state.inventorySelection = (state.inventorySelection + dir + MAX_INVENTORY_ITEMS * 4) % MAX_INVENTORY_ITEMS;
  ensureInventorySelectionVisible();
  playSfx("cursor");
}

function equipSelectedInventorySlot() {
  if (fuseLessonOn()) return fuseLessonNudge();

  const slot = inventorySlots()[state.inventorySelection];
  if (slot) equipWeapon(slot.power - 1);
}

function startInventoryGrab(gamepad = false) {
  if (!state || state.mode !== "inventory" || state.inventoryGrab) return;
  if (fuseLessonOn()) {
    const g = fuseGuideStep();
    if (g?.step === 1 && state.inventorySelection !== g.source) {
      state.inventorySelection = g.source;
      ensureInventorySelectionVisible();
    }
  }
  const slot = inventorySlotRects().find(s => s.index === state.inventorySelection);
  if (!slot || slot.empty) return;
  const centerX = slot.x + slot.w / 2;
  const centerY = slot.y + slot.h / 2;
  state.inventoryGrab = {
    from: slot.index,
    power: slot.power,
    x: centerX,
    y: centerY,
    displayX: centerX,
    displayY: centerY,
    startX: centerX,
    startY: centerY,
    moved: false,
    gamepad,
    pointer: false
  };
  playSfx("decide");
}

function updateGamepadInventoryGrabPosition() {
  const grab = state.inventoryGrab;
  if (!grab?.gamepad) return;
  const slot = inventorySlotRects().find(s => s.index === state.inventorySelection);
  if (!slot) return;
  const targetX = slot.x + slot.w / 2;
  const targetY = slot.y + slot.h / 2;
  grab.x = targetX;
  grab.y = targetY;
  grab.displayX = (grab.displayX ?? grab.x) + (targetX - (grab.displayX ?? grab.x)) * 0.45;
  grab.displayY = (grab.displayY ?? grab.y) + (targetY - (grab.displayY ?? grab.y)) * 0.45;
  grab.moved = grab.moved || grab.from !== state.inventorySelection;
}

function releaseInventoryGrab() {
  const grab = state.inventoryGrab;
  if (!grab) return;
  const target = inventorySlotRects().find(s => s.index === state.inventorySelection);
  // はじめての合成：光っている武器の上でなければ、はなさない（つかんだまま）
  if (fuseLessonOn()) {
    const g = fuseGuideStep();
    if (g?.step === 2 && target?.index !== g.target) {
      grab.gamepad = true;
      return fuseLessonNudge("そこではありません。光っている武器の上まで運んで、はなしてください。");
    }
  }
  state.inventoryGrab = null;
  if (!target) return;
  if (target.empty) {
    state.inventoryItems[grab.from] = null;
    state.inventoryItems[target.index] = grab.power;
    syncWeaponInventoryFromItems();
    state.inventorySelection = target.index;
    ensureInventorySelectionVisible();
    return;
  }
  if (target.index !== grab.from && fusionResult(target.power, grab.power) !== null) {
    state.fusionPrompt = { power: grab.power, choice: 0, from: grab.from, to: target.index };
    return;
  }
  if (target.index === grab.from) equipWeapon(target.power - 1);
  else explainNoFuse(grab.power, target.power);
}

// 合成できない組み合わせのとき、理由をぴょんぴーが説明する
function explainNoFuse(a, b) {
  if (!a || !b || a === b && nextFusionPower(a) === null && !isMechPower(a)) {
    if (a && a === b) showFuseHint("最高レベルどうしは、もう合成できんのじゃ。🌙Lv8 と ⭐Lv8 ならロボットになるじょ！", "Max level");
    return;
  }
  const ta = weaponAttribute(a);
  const tb = weaponAttribute(b);
  if (ta !== tb && ta !== "mech" && tb !== "mech") {
    showFuseHint("月の武器と星の武器は、別の種類じゃ！ 同じ種類の、同じ武器どうしでしか合成できんじょ。（🌙Lv8 と ⭐Lv8 だけは特別にロボットになるけん）", "🌙 と ⭐ は別の種類");
  } else {
    showFuseHint("ちがう武器どうしは合成できんじょ。同じ武器を2つ重ねてだ！", "同じ武器どうしで合成");
  }
}

function showFuseHint(comment, toast) {
  state.inventorySortComment = `ぴょんぴー「${comment}」`;
  state.inventorySortCommentUntil = performance.now() + 4200;
  state.inventoryMessage = performance.now() + 1800;
  state.inventoryMessageLabel = toast;
  playSfx("locked");
}

function handleInventoryAction() {
  const slot = inventorySlots()[state.inventorySelection];
  if (!state.inventoryGrab && !slot) return;
  if (!state.inventoryGrab) startInventoryGrab(false);
  else releaseInventoryGrab();
}

function confirmFusionPrompt() {
  if (!state.fusionPrompt) return;
  const prompt = state.fusionPrompt;
  if (fuseLessonOn()) prompt.choice = 0;
  state.fusionPrompt = null;
  playSfx(prompt.choice === 0 ? "decide" : "cancel");
  if (prompt.choice === 0) {
    if (Number.isInteger(prompt.from) && Number.isInteger(prompt.to)) fuseInventoryItems(prompt.from, prompt.to);
    else fuseWeapons(prompt.power);
  }
}

function handleFusionPromptPointer(x, y) {
  if (!state.fusionPrompt) return false;
  const pt = inventoryDialogPoint(x, y);
  const rects = fusionPromptButtonRects();
  const inside = b => pt.x >= b.x && pt.x <= b.x + b.w && pt.y >= b.y && pt.y <= b.y + b.h;
  if (inside(rects[0])) {
    state.fusionPrompt.choice = 0;
    confirmFusionPrompt();
  } else if (inside(rects[1])) {
    if (fuseLessonOn()) return fuseLessonNudge("ここは「はい」をえらんでください。"), true;
    state.fusionPrompt = null;
    playSfx("cancel");
  }
  return true;
}

function inventorySlotAt(x, y) {
  return inventorySlotRects().find(slot => x >= slot.x && x <= slot.x + slot.w && y >= slot.y && y <= slot.y + slot.h) || null;
}

function inventoryFreshMove() {
  return (gamepadState.left && !gamepadState.leftLatch) ||
    (gamepadState.right && !gamepadState.rightLatch) ||
    (gamepadState.up && !gamepadState.upLatch) ||
    (gamepadState.down && !gamepadState.downLatch);
}

function handleInventoryKeyboardFocus(code, repeat = false) {
  if (state.saveMenu) return handleSaveMenuKey(code, repeat);
  if (state.deletePrompt) return repeat ? true : handleDeletePromptKey(code);
  if (state.inventoryConfirmWorldMap) {
    if (code === "ArrowLeft" || code === "ArrowRight" || code === "KeyA" || code === "KeyD") {
      state.inventoryConfirmChoice = 1 - (state.inventoryConfirmChoice ?? 0);
      playSfx("cursor");
      return true;
    }
    if (code === "Enter" || code === "Space" || code === "KeyZ") {
      handleInventoryWorldMapConfirm((state.inventoryConfirmChoice ?? 0) === 0);
      return true;
    }
    if (code === "Escape" || code === "KeyB") {
      handleInventoryWorldMapConfirm(false);
      return true;
    }
    return true;
  }

  if (state.fusionPrompt) {
    if (code === "ArrowLeft" || code === "ArrowRight" || code === "KeyA" || code === "KeyD") {
      state.fusionPrompt.choice = 1 - state.fusionPrompt.choice;
      playSfx("cursor");
    }
    if (fuseLessonOn()) state.fusionPrompt.choice = 0;
    if (code === "Enter" || code === "Space" || code === "KeyZ") confirmFusionPrompt();
    if ((code === "Escape" || code === "KeyB") && !fuseLessonOn()) {
      state.fusionPrompt = null;
      playSfx("cancel");
    }
    return true;
  }

  const mode = state.inventoryFocusMode ?? INVENTORY_FOCUS_MODES.AREA_SELECT;
  if (mode === INVENTORY_FOCUS_MODES.AREA_SELECT) {
    if (!repeat && (code === "ArrowLeft" || code === "ArrowUp" || code === "KeyA" || code === "KeyW")) {
      moveInventoryFocusArea(-1);
      return true;
    }
    if (!repeat && (code === "ArrowRight" || code === "ArrowDown" || code === "KeyD" || code === "KeyS")) {
      moveInventoryFocusArea(1);
      return true;
    }
    if (!repeat && (code === "Enter" || code === "Space" || code === "KeyZ")) {
      enterInventoryFocusedArea();
      return true;
    }
    if (!repeat && (code === "KeyX" || code === "KeyY") && state.inventoryFocusArea === "itemList") {
      runInventorySort();
      return true;
    }
    if (!repeat && code === "Escape") {
      closeInventory();
      return true;
    }
    return true;
  }

  if (mode === INVENTORY_FOCUS_MODES.INSIDE_TOP_MENU) {
    if (!repeat && (code === "ArrowLeft" || code === "KeyA")) {
      state.inventoryTopMenuIndex = (state.inventoryTopMenuIndex + 3) % 4;
      playSfx("cursor");
      return true;
    }
    if (!repeat && (code === "ArrowRight" || code === "KeyD")) {
      state.inventoryTopMenuIndex = (state.inventoryTopMenuIndex + 1) % 4;
      playSfx("cursor");
      return true;
    }
    if (!repeat && (code === "Enter" || code === "Space" || code === "KeyZ")) {
      activateInventoryTopMenuButton();
      return true;
    }
    if (!repeat && (code === "ArrowDown" || code === "KeyS")) {
      inventoryFocusItemList();
      return true;
    }
    if (!repeat && (code === "Escape" || code === "KeyB")) {
      leaveInventoryInnerFocus();
      return true;
    }
    return true;
  }

  if (mode === INVENTORY_FOCUS_MODES.INSIDE_ITEM_LIST) {
    if (code === "ArrowLeft" || code === "KeyA") moveInventorySelection(-1);
    if (code === "ArrowRight" || code === "KeyD") moveInventorySelection(1);
    if (code === "ArrowUp" || code === "KeyW") {
      if (inventoryAtTopRow()) {
        if (!repeat) inventoryFocusTopMenu();
      } else moveInventorySelection(-5);
    }
    if (code === "ArrowDown" || code === "KeyS") moveInventorySelection(5);
    if (!repeat && (code === "Enter" || code === "Space" || code === "KeyZ")) startInventoryGrab(false);
    if (!repeat && code === "KeyE") equipSelectedInventorySlot();
    // X（C / Delete）＝すてる、Y＝せいとん
    if (!repeat && (code === "KeyX" || code === "KeyC" || code === "Delete")) openDeletePrompt();
    if (!repeat && code === "KeyY") runInventorySort();
    if (!repeat && (code === "Escape" || code === "KeyB")) leaveInventoryInnerFocus();
    return true;
  }
  return false;
}

function updateInventoryGamepadFocus(now, jumpPressed, runPressed, shootPressed) {
  if (state.deletePrompt) {
    if ((gamepadState.left || gamepadState.right) && !(gamepadState.leftLatch || gamepadState.rightLatch)) handleDeletePromptKey("ArrowLeft");
    if (jumpPressed && !gamepadState.jumpLatch) handleDeletePromptKey("Space");
    if (runPressed && !gamepadState.runLatch) handleDeletePromptKey("Escape");
    return;
  }
  if (state.saveMenu) {
    if (gamepadState.left && !gamepadState.leftLatch) handleSaveMenuKey("ArrowLeft");
    if (gamepadState.right && !gamepadState.rightLatch) handleSaveMenuKey("ArrowRight");
    if (gamepadState.up && !gamepadState.upLatch) handleSaveMenuKey("ArrowUp");
    if (gamepadState.down && !gamepadState.downLatch) handleSaveMenuKey("ArrowDown");
    if (jumpPressed && !gamepadState.jumpLatch) handleSaveMenuKey("Space");
    if (shootPressed && !gamepadState.shootLatch) handleSaveMenuKey("KeyX");
    if (runPressed && !gamepadState.runLatch) handleSaveMenuKey("Escape");
    return;
  }
  if (state.inventoryConfirmWorldMap) {
    if ((gamepadState.left || gamepadState.right) && !(gamepadState.leftLatch || gamepadState.rightLatch)) {
      state.inventoryConfirmChoice = 1 - (state.inventoryConfirmChoice ?? 0);
      playSfx("cursor");
    }
    if (jumpPressed && !gamepadState.jumpLatch) handleInventoryWorldMapConfirm((state.inventoryConfirmChoice ?? 0) === 0);
    if (runPressed && !gamepadState.runLatch) handleInventoryWorldMapConfirm(false);
    return;
  }

  if (state.fusionPrompt) {
    if ((gamepadState.left || gamepadState.right) && !(gamepadState.leftLatch || gamepadState.rightLatch)) state.fusionPrompt.choice = 1 - state.fusionPrompt.choice;
    if (fuseLessonOn()) state.fusionPrompt.choice = 0;
    if (jumpPressed && !gamepadState.jumpLatch) confirmFusionPrompt();
    if (runPressed && !gamepadState.runLatch && !fuseLessonOn()) state.fusionPrompt = null;
    return;
  }

  const mode = state.inventoryFocusMode ?? INVENTORY_FOCUS_MODES.AREA_SELECT;
  if (mode === INVENTORY_FOCUS_MODES.AREA_SELECT) {
    const moveDir = gamepadState.left || gamepadState.up ? -1 : gamepadState.right || gamepadState.down ? 1 : 0;
    const freshMove = inventoryFreshMove();
    if (!moveDir) {
      gamepadState.inventoryMoveDelay = 0;
    } else if (freshMove || now >= gamepadState.inventoryMoveDelay) {
      moveInventoryFocusArea(moveDir);
      gamepadState.inventoryMoveDelay = now + (freshMove ? 230 : 140);
    }
    if (jumpPressed && !gamepadState.jumpLatch) enterInventoryFocusedArea();
    if (shootPressed && !gamepadState.shootLatch && state.inventoryFocusArea === "itemList") runInventorySort();
    return;
  }

  if (mode === INVENTORY_FOCUS_MODES.INSIDE_TOP_MENU) {
    const moveDir = gamepadState.left ? -1 : gamepadState.right ? 1 : 0;
    const freshMove = (gamepadState.left && !gamepadState.leftLatch) || (gamepadState.right && !gamepadState.rightLatch);
    if (!moveDir) {
      gamepadState.inventoryMoveDelay = 0;
    } else if (freshMove || now >= gamepadState.inventoryMoveDelay) {
      state.inventoryTopMenuIndex = (state.inventoryTopMenuIndex + moveDir + 4) % 4;
      playSfx("cursor");
      gamepadState.inventoryMoveDelay = now + (freshMove ? 230 : 140);
    }
    if (gamepadState.down && !gamepadState.downLatch) inventoryFocusItemList();
    if (jumpPressed && !gamepadState.jumpLatch) activateInventoryTopMenuButton();
    if (runPressed && !gamepadState.runLatch) leaveInventoryInnerFocus();
    return;
  }

  if (mode === INVENTORY_FOCUS_MODES.INSIDE_ITEM_LIST) {
    const moveDir = gamepadState.left ? -1 : gamepadState.right ? 1 : gamepadState.up ? -5 : gamepadState.down ? 5 : 0;
    const freshMove = inventoryFreshMove();
    if (!moveDir) {
      gamepadState.inventoryMoveDelay = 0;
    } else if (freshMove || now >= gamepadState.inventoryMoveDelay) {
      if (moveDir === -5 && inventoryAtTopRow()) {
        if (freshMove) inventoryFocusTopMenu();
      } else moveInventorySelection(moveDir);
      gamepadState.inventoryMoveDelay = now + (freshMove ? 230 : 115);
    }
    if (jumpPressed && !gamepadState.jumpLatch) startInventoryGrab(true);
    if (!jumpPressed && gamepadState.jumpLatch && state.inventoryGrab?.gamepad) releaseInventoryGrab();
    if (shootPressed && !gamepadState.shootLatch) {
      // ゲームパッド：X（ボタン2）＝すてる、Y（ボタン3）＝せいとん
      const pad = Array.from(navigator.getGamepads ? navigator.getGamepads() : []).find(Boolean);
      if (pad?.buttons[3]?.pressed) runInventorySort();
      else openDeletePrompt();
    }
    if (runPressed && !gamepadState.runLatch) leaveInventoryInnerFocus();
    updateGamepadInventoryGrabPosition();
  }
}

// 画面のボタン（handheld.js が呼ぶ）。キーボードと同じ処理に流すので、
// 会話送り・ワールドマップ・そうび画面・よろず屋もボタンだけで操作できる
// ゲーム中だけ、せっていのボタンの割り当てで読みかえる。はなすときは、押したときと同じキーをはなす
const touchHeldCodes = {};
function inGameplay() {
  return state && (state.mode === "playing" || state.mode === "respawning");
}

function pressTouchControl(code) {
  unlockAudio();
  const mapped = Settings.mapCode(code, inGameplay());
  touchHeldCodes[code] = mapped;
  handleKeyDown(mapped);
}

function releaseTouchControl(code) {
  const mapped = touchHeldCodes[code] ?? code;
  delete touchHeldCodes[code];
  handleKeyUp(mapped);
  if (mapped !== code) keys.delete(code);
}

for (const eventName of ["contextmenu", "selectstart", "dragstart"]) {
  document.addEventListener(eventName, event => event.preventDefault());
}
document.addEventListener("pointerdown", unlockAudio, { passive: true });
document.addEventListener("touchstart", unlockAudio, { passive: true });
document.addEventListener("touchmove", event => event.preventDefault(), { passive: false });

state = newState();
state.mode = "title";
applyLanguage();
const debugParams = new URLSearchParams(window.location.search);
if (debugParams.get("stage") === "final") {
  startDirectCourse(courses.length - 1);
} else if (/^\d-\d$/.test(debugParams.get("stage") ?? "")) {
  const [dw, da] = debugParams.get("stage").split("-").map(Number);
  startDirectCourse((STAGE_START_INDICES[dw - 1] ?? 0) + da - 1);
}
document.querySelector("#newGameButton")?.addEventListener("click", event => {
  event.stopPropagation();
  unlockAudio();
  // セーブファイル（3つ）は消さずに、そのまま最初からはじめる。ファイルを消したいときはセーブ画面の X で
  startGame(true);
});
document.querySelector("#settingsButton")?.addEventListener("click", event => {
  event.stopPropagation();
  unlockAudio();
  openSettingsMenu();
});
document.querySelector("#soundButton")?.addEventListener("click", event => {
  event.stopPropagation();
  unlockAudio();
  toggleSound();
  playSfx("decide");
});
Story.refreshTitleUi();
Chat.layout();
updateHud();
draw();
lastTime = performance.now();
animationId = requestAnimationFrame(loop);

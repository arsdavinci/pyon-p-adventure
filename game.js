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
const MAX_WEAPON_POWER = 16;
const WEAPON_ATTRIBUTE_SIZE = 8;
const MAX_INVENTORY_ITEMS = 27;
const VISIBLE_INVENTORY_ITEMS = 15;
const INVENTORY_FOCUS_AREAS = ["topMenu", "itemList", "sortButton"];
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
const WEAPON_DROP_RATES = [
  { power: 1, chance: 0.8 },
  { power: 2, chance: 0.1 },
  { power: 3, chance: 0.05 },
  { power: 4, chance: 0.03 },
  { power: 5, chance: 0.02 }
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
  "ステラガーディアンキャノン"
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
  { name: "weapon-star-01-saturn-splitter", count: 9, damage: 9, range: 1340, speed: 1300, width: 62, height: 12, spread: 0, cooldown: 0.2, pattern: "cross", colors: ["#fff6a6","#ffb86b","#ffffff"] },
  { name: "weapon-star-02-aquarium-spear", count: 10, damage: 10, range: 1480, speed: 1380, width: 66, height: 13, spread: 0, cooldown: 0.19, pattern: "wave", colors: ["#bff8ff","#4fe3ff","#ffffff"] },
  { name: "weapon-star-03-quasar-drive", count: 11, damage: 11, range: 1620, speed: 1460, width: 70, height: 14, spread: 0, cooldown: 0.18, pattern: "fan", colors: ["#ffffff","#ffd85a","#ff5f9e"] },
  { name: "weapon-star-04-galaxy-boomerang", count: 12, damage: 12, range: 1760, speed: 1540, width: 74, height: 15, spread: 18, cooldown: 0.17, pattern: "bothSpread", colors: ["#d7c8ff","#ffffff","#7d8cff"] },
  { name: "weapon-star-05-black-hole-pulse", count: 14, damage: 13, range: 1900, speed: 1620, width: 76, height: 16, spread: 0, cooldown: 0.16, pattern: "radial", pierce: 1, colors: ["#2d245d","#9ee8ff","#ffffff"] },
  { name: "weapon-star-06-cosmo-crown", count: 15, damage: 14, range: 2040, speed: 1700, width: 80, height: 17, spread: 0, cooldown: 0.15, pattern: "crown", colors: ["#fff3a4","#ff8db7","#ffffff"] },
  { name: "weapon-star-07-supernova-360", count: 18, damage: 15, range: 2180, speed: 1780, width: 84, height: 18, spread: 0, cooldown: 0.14, pattern: "radial", pierce: 2, colors: ["#ffffff","#fff3a4","#ff3d7f"] },
  { name: "weapon-star-08-stellar-guardian-cannon", count: 20, damage: 16, range: 2320, speed: 1860, width: 88, height: 19, spread: 0, cooldown: 0.13, pattern: "homing", explosion: 140, colors: ["#ffffff","#9ee8ff","#ff3d7f"] }
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
    kaki: "柿の種",
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
    commentClassic: "、かわいい顔してるけどちゃんと強いよ！",
    commentExperimental: "！？これ、撃ったあと画面を見るほうが忙しいやつだ！",
    ranks: ["ちょこっと柿ピー", "おやつ柿ピー", "いい感じの柿ピー", "大盛り柿ピー", "満タン柿ピーパーティー"],
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
    kaki: "Kaki",
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
    ranks: ["Snack Rookie", "Space Snack Scout", "Balanced Snack Runner", "Big Snack Explorer", "Perfect Snack Master"],
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
worldMapImage.src = "assets/world-map.png";
const pastelBackground = new Image();
pastelBackground.src = "assets/pastel-space-background.png";
const pastelBackground2 = new Image();
pastelBackground2.src = "assets/pastel-space-background2.png";
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
].map(src => {
  const img = new Image();
  img.src = src;
  return img;
});
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
  "assets/weapon-star-08-stellar-guardian-cannon.png"
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
let controlMode = localStorage.getItem("pyonpControlMode") || (matchMedia("(pointer: coarse)").matches ? "iphone" : "pc");
if (controlMode === "mobile") controlMode = "iphone";

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

const AREA_LANDMARKS = [
  "outpost",
  "towers",
  "harbor",
  "reactor",
  "throne"
];

const MAP_STAGE_MESSAGES = {
  ja: [
    "ぴょんぴー「パステル宇宙、出発や！」",
    "ぴょんぴー「火星の赤い町まで道がつながったで！」",
    "ぴょんぴー「氷の星や。すべらんように行こ！」",
    "ぴょんぴー「海の星、ぷかぷか進むで！」",
    "ぴょんぴー「メカの輪っか都市、ビリビリしてるな！」",
    "ぴょんぴー「最後の魔王城や。ここで決めるで！」"
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

const MAP_NODE_POINTS = [
  { x: 220, y: 237 }, { x: 190, y: 320 }, { x: 174, y: 392 }, { x: 228, y: 460 }, { x: 292, y: 499 },
  { x: 406, y: 566 }, { x: 486, y: 565 }, { x: 525, y: 475 }, { x: 385, y: 380 }, { x: 470, y: 307 },
  { x: 672, y: 371 }, { x: 773, y: 482 }, { x: 705, y: 527 }, { x: 667, y: 628 }, { x: 784, y: 674 },
  { x: 888, y: 618 }, { x: 1012, y: 678 }, { x: 1157, y: 728 }, { x: 1185, y: 654 }, { x: 1027, y: 571 },
  { x: 971, y: 440 }, { x: 951, y: 269 }, { x: 1064, y: 310 }, { x: 1169, y: 478 }, { x: 1261, y: 473 },
  { x: 1236, y: 395 }, { x: 1187, y: 309 }, { x: 1332, y: 537 }, { x: 1388, y: 613 }, { x: 1467, y: 623 },
  { x: 1562, y: 591 }, { x: 1539, y: 489 }, { x: 1538, y: 438 }, { x: 1518, y: 330 }, { x: 1510, y: 266 }
];
const MAP_WORLD_FOG_ZONES = [
  null,
  { x: 470, y: 452, rx: 185, ry: 302, rotate: -0.08, color: "rgba(255, 209, 237, 0.74)" },
  { x: 694, y: 498, rx: 205, ry: 340, rotate: -0.02, color: "rgba(201, 246, 255, 0.76)" },
  { x: 980, y: 488, rx: 210, ry: 328, rotate: 0.04, color: "rgba(217, 255, 214, 0.72)" },
  { x: 1254, y: 485, rx: 194, ry: 318, rotate: -0.03, color: "rgba(255, 243, 164, 0.7)" },
  { x: 1515, y: 450, rx: 255, ry: 380, rotate: 0.07, color: "rgba(200, 178, 255, 0.78)" }
];

function makeCourse(worldIndex, areaIndex) {
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
    platforms = buildVariedCoursePlatforms(worldIndex, areaIndex, difficulty, bossStage, finalStage);
  }
  if (finalStage) platforms = buildFinalBossCoursePlatforms();
  if (trait === "underwater") platforms.length = 0;

  const blocks = [];
  for (let i = 0; i < (finalStage || trait === "underwater" ? 0 : 9); i++) {
    const bx = 560 + i * 430 + (i % 2) * 90;
    const by = 300 - (i % 3) * 38;
    if (i % 3 === 0) blocks.push(breakable(bx, by, "hp"));
    else if (i % 3 === 1) blocks.push(breakable(bx, by, "power"));
    else blocks.push(breakable(bx, by, "power"));
  }
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
  if (trait !== "underwater") placeEnemiesOnPlatforms(enemies, platforms);
  if (bossStage) {
    const bossPowers = [5, 4, 7, 9, 11, 16];
    const bossPower = finalStage ? 16 : bossPowers[worldIndex] ?? Math.min(MAX_WEAPON_POWER, 5 + worldIndex * 2);
    enemies.push(bossEnemy(finalStage ? 4280 : 4440, finalStage ? 320 : 392, 3940, 5120, {
      final: finalStage,
      bossKind: worldIndex,
      weaponPower: bossPower,
      hp: finalStage ? 320 : 96 + worldIndex * 34,
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
  const lavaGeysers = trait === "marsLava" && !finalStage ? [
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

  return {
    theme: STAGE_THEMES[worldIndex],
    worldIndex,
    areaIndex,
    trait,
    bossStage,
    finalStage,
    difficulty,
    platforms,
    blocks,
    level: { enemies, coins, starItems, oxygenItems, lavaGeysers, lavaPools, rotatingFires, flag: rect(5060, 252, 28, 240) },
    gun: { x: 330 + areaIndex * 70, y: 430 }
  };
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
    rect(3940, 492, finalStage ? 1260 : 1120, 48),
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

function placeEnemiesOnPlatforms(enemies, platforms) {
  const ground = platforms.filter(p => p.w >= 150 && p.y >= 380);
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

for (let i = 1; i < stageAreaCount(0); i++) {
  courses[i] = {
    ...makeCourse(0, i),
    theme: STAGE_THEMES[0],
    gun: { x: 760 + i * 60, y: 430 }
  };
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
  return { x, y, radius, speed, angle: Math.random() * Math.PI * 2, length: 58 };
}

function newState() {
  applyCourse(currentCourse);
  return {
    mode: "playing",
    camera: 0,
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
  platforms = course.platforms.map(p => ({ ...p }));
  blocks = course.blocks.map(b => ({ ...b, broken: false }));
  level = {
    enemies: course.level.enemies.map(e => ({ ...e })),
    coins: (course.level.coins ?? []).map(c => ({ ...c })),
    starItems: (course.level.starItems ?? []).map(s => ({ ...s })),
    oxygenItems: (course.level.oxygenItems ?? []).map(o => ({ ...o })),
    lavaGeysers: (course.level.lavaGeysers ?? []).map(g => ({ ...g })),
    lavaPools: (course.level.lavaPools ?? []).map(g => ({ ...g })),
    rotatingFires: (course.level.rotatingFires ?? []).map(g => ({ ...g })),
    flag: { ...course.level.flag }
  };
}

function currentStageTrait() {
  return courses[currentCourse]?.trait ?? STAGE_TRAITS[courses[currentCourse]?.worldIndex ?? 0] ?? "moonFloat";
}

function isUnderwaterStage() {
  return currentStageTrait() === "underwater";
}

function startGame() {
  currentCourse = 0;
  unlockedCourse = 0;
  mapSelectedCourse = 0;
  completedCourses = new Set();
  campaignKeep = null;
  pendingCourseStart = false;
  state = newState();
  state.mode = "worldMap";
  enterWorldMap(0, true);
  overlay.classList.add("hidden");
  lastTime = performance.now();
  cancelAnimationFrame(animationId);
  animationId = requestAnimationFrame(loop);
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
  cancelAnimationFrame(animationId);
  animationId = requestAnimationFrame(loop);
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

function continuePairCost(index = currentCourse) {
  const course = courses[index] ?? courses[0];
  return clamp(5 + course.worldIndex * 2 + Math.floor(course.areaIndex / 2), 5, 22);
}

function canPayContinue(cost = continuePairCost()) {
  return state && state.kakiTotal >= cost && state.peaTotal >= cost;
}

function continueFromGameOver() {
  if (!gameOverContinueAvailable || !canPayContinue(gameOverContinueCost)) return false;
  const snapshot = campaignSnapshotFromState();
  snapshot.kakiTotal = Math.max(0, snapshot.kakiTotal - gameOverContinueCost);
  snapshot.peaTotal = Math.max(0, snapshot.peaTotal - gameOverContinueCost);
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
  return true;
}

function campaignSnapshotFromState() {
  if (!state) return campaignKeep;
  return {
    score: state.score ?? 0,
    coinTotal: state.coinTotal ?? 0,
    kakiTotal: state.kakiTotal ?? 0,
    peaTotal: state.peaTotal ?? 0,
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
  state.kakiTotal = snapshot.kakiTotal;
  state.peaTotal = snapshot.peaTotal;
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
  updateHud();
}

function startMapCourse(index = mapSelectedCourse) {
  if (state?.mode === "worldMap" && mapInputLockTimer > 0) return;
  currentCourse = clamp(index, 0, unlockedCourse);
  mapSelectedCourse = currentCourse;
  const snapshot = campaignKeep;
  state = newState();
  restoreCampaignSnapshot(snapshot);
  state.mode = "playing";
  pendingCourseStart = false;
  overlay.classList.add("hidden");
  lastTime = performance.now();
}

function moveMapSelection(dir) {
  mapSelectedCourse = clamp(mapSelectedCourse + dir, 0, unlockedCourse);
  currentCourse = mapSelectedCourse;
  playSfx("equip", state?.player?.x ?? 480);
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
  if (!state || (state.mode !== "playing" && state.mode !== "respawning")) return;
  state.inventoryReturnMode = state.mode;
  state.mode = "inventory";
  const equippedSlot = inventorySlots().findIndex(slot => slot?.power === state.weaponPower);
  state.inventorySelection = equippedSlot >= 0 ? equippedSlot : 0;
  ensureInventorySelectionVisible();
  state.inventoryGrab = null;
  state.fusionPrompt = null;
  resetInventoryFocus();
}

function closeInventory() {
  if (!state || state.mode !== "inventory") return;
  state.inventoryGrab = null;
  state.fusionPrompt = null;
  state.inventoryConfirmWorldMap = false;
  state.mode = state.inventoryReturnMode === "respawning" ? "respawning" : "playing";
  state.inventoryReturnMode = null;
  lastTime = performance.now();
}

function toggleInventory() {
  if (!state) return;
  if (state.mode === "playing") openInventory();
  else if (state.mode === "inventory") closeInventory();
}

function pauseGame() {
  if (!state || (state.mode !== "playing" && state.mode !== "respawning")) return;
  state.pauseReturnMode = state.mode;
  state.mode = "paused";
  pauseSelection = 0;
  playSfx("equip", state.player.x + state.player.w / 2);
}

function resumeGame() {
  if (!state || state.mode !== "paused") return;
  state.mode = state.pauseReturnMode === "respawning" ? "respawning" : "playing";
  state.pauseReturnMode = null;
  playSfx("equip", state.player.x + state.player.w / 2);
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
  const dt = Math.min((now - lastTime) / 1000, 0.032);
  lastTime = now;
  update(dt);
  draw();
  animationId = requestAnimationFrame(loop);
}

function update(dt) {
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
  checkGoal();
  updateHud();
}

function maybeStartBossIntro() {
  const course = courses[currentCourse];
  if (!course || !course.bossStage || state.bossIntroPlayed) return false;
  const boss = state.enemies.find(e => e.boss && e.alive);
  if (!boss) return false;
  const p = state.player;
  if (p.x + p.w < boss.x - 620) return false;
  state.mode = "bossIntro";
  state.bossIntroPlayed = true;
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

function updateBossIntro(dt) {
  state.bossIntroTimer += dt;
  const boss = state.enemies.find(e => e.id === state.bossIntroBossId && e.alive) ?? state.enemies.find(e => e.boss && e.alive);
  if (boss) {
    boss.attackAnim = Math.max(boss.attackAnim ?? 0, 0.12);
    const targetCamera = clamp(boss.x - 610, 0, WORLD_WIDTH - canvas.width);
    state.camera += (targetCamera - state.camera) * Math.min(1, dt * 2.7);
  }
}

function advanceBossIntro() {
  if (state.mode !== "bossIntro" && state.mode !== "bossOutro") return false;
  if ((state.bossIntroTimer ?? 0) < 0.25) return true;
  if ((state.bossIntroStep ?? 0) === 0) {
    state.bossIntroStep = 1;
    state.bossIntroTimer = 0;
    playSfx("equip", state.player.x + state.player.w / 2);
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
  playSfx("stageClear", state.player.x + state.player.w / 2);
  if (currentCourse < courses.length - 1) {
    nextCourse();
  } else {
    state.score += Math.ceil(state.time / 3);
    completedCourses.add(currentCourse);
    campaignKeep = campaignSnapshotFromState();
    endGame(t("allClear"), t("replay"), kakipiRank());
  }
}

function updateDeathFall(dt) {
  const p = state.player;
  state.deathTimer = Math.max(0, (state.deathTimer ?? 0) - dt);
  p.vy += GRAVITY * dt;
  p.y += p.vy * dt;
  p.x += p.vx * dt;
  p.grounded = false;
  state.camera = clamp(p.x - 330, 0, WORLD_WIDTH - canvas.width);
  if (p.y > canvas.height + 180 || state.deathTimer <= 0) {
    if (state.lives <= 0) {
      endGame("Game Over", t("replay"), null, { allowContinue: true });
    } else {
      startMoonRespawn();
    }
  }
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
  p.x = clamp(p.x + dx / len * speed * dt, 36, WORLD_WIDTH - p.w - 36);
  p.y = clamp(p.y + dy / len * speed * dt, 42, 430);
  p.vx = dx / len * speed;
  p.vy = dy / len * speed;
  p.facing = dx < 0 ? -1 : dx > 0 ? 1 : p.facing;
  p.grounded = false;
  p.invincible = state.respawnTimer;
  p.onCrescent = true;
  state.camera = clamp(p.x - 330, 0, WORLD_WIDTH - canvas.width);
  if (state.respawnTimer <= 0) {
    p.vy = 0;
    p.onCrescent = false;
    p.invincible = 0;
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
  p.swimming = false;
  const movingLeft = keys.has("ArrowLeft") || keys.has("KeyA") || gamepadState.left;
  const movingRight = keys.has("ArrowRight") || keys.has("KeyD") || gamepadState.right;
  const wantsJump = keys.has("Space") || keys.has("ArrowUp") || keys.has("KeyW") || gamepadState.jump;
  const dxInput = (movingRight ? 1 : 0) - (movingLeft ? 1 : 0);
  const doubleTapRun = isDoubleTapRunActive(dxInput);
  const wantsRun = isRunHeld(dxInput) || doubleTapRun;
  const wantsShoot = keys.has("KeyX") || keys.has("KeyY") || keys.has("KeyJ") || gamepadState.shoot;
  const trait = currentStageTrait();
  const slippery = trait === "iceSlide";
  const accel = slippery ? (wantsRun ? 1380 : 820) : wantsRun ? 2100 : 1250;
  const maxSpeed = slippery ? (wantsRun ? 410 : 270) : wantsRun ? 360 : 235;

  if (movingLeft) {
    p.vx -= accel * dt;
    p.facing = -1;
  }
  if (movingRight) {
    p.vx += accel * dt;
    p.facing = 1;
  }
  if (!movingLeft && !movingRight) p.vx *= slippery ? 0.985 : FRICTION;

  if (wantsJump && p.grounded) {
    spawnJumpSmoke(p.x + p.w / 2, p.y + p.h);
    p.vy = trait === "moonFloat" ? -990 : -900;
    p.grounded = false;
  }

  if (wantsShoot && hasEquippedWeapon() && state.gun.cooldown <= 0) {
    shootBeam("player", p.x + p.w / 2 + p.facing * 24, p.y + 28, p.facing);
    state.gun.cooldown = weaponStage().cooldown;
  }

  p.vx = clamp(p.vx, -maxSpeed, maxSpeed);
  const gravity = trait === "moonFloat" ? GRAVITY * 0.78 : trait === "demonPulse" ? GRAVITY * (1 + Math.sin(state.stagePulse) * 0.2) : GRAVITY;
  p.vy += gravity * dt;
  p.invincible = Math.max(0, p.invincible - dt);

  moveAndCollide(p, dt);

  if (p.y > canvas.height + 100) damagePlayer(true);
  state.camera = clamp(p.x - 330, 0, WORLD_WIDTH - canvas.width);
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
  const speed = wantsRun ? 330 : 230;

  if (dx || dy) {
    p.vx += (dx / len * speed - p.vx) * Math.min(1, dt * 8);
    p.vy += (dy / len * speed - p.vy) * Math.min(1, dt * 8);
  } else {
    p.vx *= 0.9;
    p.vy *= 0.9;
  }
  if (dx < 0) p.facing = -1;
  if (dx > 0) p.facing = 1;

  if (wantsShoot && hasEquippedWeapon() && state.gun.cooldown <= 0) {
    shootBeam("player", p.x + p.w / 2 + p.facing * 24, p.y + 28, p.facing);
    state.gun.cooldown = weaponStage().cooldown;
  }

  p.invincible = Math.max(0, p.invincible - dt);
  p.x = clamp(p.x + p.vx * dt, 0, WORLD_WIDTH - p.w);
  p.y = clamp(p.y + p.vy * dt, 58, canvas.height - p.h - 42);
  p.grounded = false;
  p.swimming = true;
  state.camera = clamp(p.x - 330, 0, WORLD_WIDTH - canvas.width);
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
  if (trait === "underwater") updateOxygen(dt);
  if (trait === "marsLava") updateLavaGeysers(dt);
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
    if (hit(p, rect(fx - 16, fy - 16, 32, 32))) damagePlayer(false, null, false);
  }
}

function updateMovingPlatforms(dt) {
  if (currentStageTrait() !== "factoryBelt") return;
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
  state.oxygen = clamp((state.oxygen ?? MAX_OXYGEN) - dt * 5.8, 0, MAX_OXYGEN);
  state.oxygenHurtCooldown = Math.max(0, (state.oxygenHurtCooldown ?? 0) - dt);
  for (const item of state.oxygenItems ?? []) {
    if (!item.taken) continue;
    item.respawn = Math.max(0, (item.respawn ?? 0) - dt);
    if (item.respawn <= 0) item.taken = false;
  }
  if (state.oxygen <= 0 && state.oxygenHurtCooldown <= 0) {
    state.oxygenHurtCooldown = 1.15;
    damagePlayer(false, null, false);
  }
}

function updateLavaGeysers(dt) {
  const p = state.player;
  for (const g of state.lavaGeysers ?? []) {
    g.timer = ((g.timer ?? 0) + dt) % g.period;
    g.active = g.timer > 2.55 && g.timer < 3.35;
    if (!g.active) continue;
    const jet = { x: g.x, y: canvas.height - g.h, w: g.w, h: g.h };
    if (hit(p, jet)) damagePlayer(false, null, false);
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
    if (e.stun > 0) {
      e.vx = 0;
      e.vy += isUnderwaterStage() ? 0 : GRAVITY * dt;
      if (isUnderwaterStage()) updateSwimmingEnemy(e, dt, true);
      else moveEnemyAndCollide(e, dt);
    } else if (isUnderwaterStage()) {
      updateSwimmingEnemy(e, dt);
    } else {
      updateEnemyMovement(e, dt);
    }
    if (e.boss && courses[currentCourse]?.bossStage && state.bossIntroPlayed) {
      updateBossAttackPattern(e, dt);
    } else if ((state.gun.holder === e.id || e.weaponPower) && e.gunCooldown <= 0) {
      const dir = state.player.x + state.player.w / 2 < e.x + e.w / 2 ? -1 : 1;
      shootBeam(e.id, e.x + e.w / 2 + dir * 22, e.y + 22, dir);
      e.attackAnim = e.boss ? 0.42 : 0.28;
      e.gunCooldown = e.finalBoss ? 0.22 : e.boss ? (e.weaponPower >= 5 ? 0.48 : 0.68) : e.weaponPower >= 3 ? 0.92 : 1.25;
    }
    if (!hit(p, e)) continue;

    if (e.stun > 0) continue;
    const stomp = p.vy > 120 && p.y + p.h - e.y < 24;
    if (stomp) {
      stunEnemy(e);
      applyStompBounce(e, (state.stompBoostTimer ?? 0) > 0);
    } else {
      damagePlayer(false, e, true);
    }
  }
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
  if (e.hp > 0) {
    playSfx("enemyHit", e.x + e.w / 2);
    return;
  }
  e.alive = false;
  e.defeated = 0.42;
  playSfx("enemyDefeat", e.x + e.w / 2);
  if (e.weaponPower) spawnWeaponDrop(e.x + e.w / 2, e.y + 8, e.weaponPower);
  e.weaponPower = 0;
  dropGunFromEnemy(e);
  state.score += e.boss ? 50 : 5;
  if (e.boss && courses[currentCourse]?.bossStage) startBossOutro(e);
}

function stunEnemy(e) {
  if (e.boss && courses[currentCourse]?.bossStage && (!state.bossIntroPlayed || state.mode === "bossIntro")) return;
  e.stun = e.boss ? 0.35 : 2;
  e.alert = 1;
  e.vx = 0;
  if (e.weaponPower) {
    spawnWeaponDrop(e.x + e.w / 2, e.y + 8, e.weaponPower);
    e.weaponPower = 0;
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
  const seesPlayer = distance < 1050;
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
  const seesPlayer = distance < 1050;
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
  e.y = clamp(e.y + e.vy * dt, 72, canvas.height - e.h - 48);
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
        x: clamp(pattern.targetX + side * spacing, state.camera + 90, state.camera + canvas.width - 90),
        y: -90 - i * 28,
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
      const hitbox = rect(h.x - h.w / 2, canvas.height - h.h, h.w, h.h);
      if (h.active > 0 && hit(hitbox, p)) damagePlayer(false, state.enemies.find(e => e.id === h.owner));
    }
  }
  state.bossHazards = (state.bossHazards ?? []).filter(h => h.life > 0 && h.y < canvas.height + 120);
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
    osc.connect(vol).connect(stereo).connect(ctxAudio.destination);
  } else {
    osc.connect(vol).connect(ctxAudio.destination);
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
  source.connect(filt).connect(vol).connect(ctxAudio.destination);
  source.start(now);
}

function playSfx(name, x = state?.player?.x ?? 0) {
  const now = performance.now();
  const minGap = name === "laser" ? 45 : name === "enemyHit" ? 70 : 100;
  if ((lastSfxAt[name] ?? 0) + minGap > now) return;
  lastSfxAt[name] = now;
  const pan = clamp(((x - (state?.camera ?? 0)) / canvas.width) * 2 - 1, -0.8, 0.8);
  if (name === "laser") {
    playTone({ freq: 920, endFreq: 1720, duration: 0.105, type: "triangle", gain: 0.055, pan });
    playTone({ start: 0.018, freq: 1850, endFreq: 1280, duration: 0.07, type: "sine", gain: 0.035, pan });
  } else if (name === "enemyHit") {
    playTone({ freq: 620, endFreq: 260, duration: 0.12, type: "square", gain: 0.045, pan });
    playNoise({ duration: 0.08, gain: 0.025, filter: 1900 });
  } else if (name === "stompBoost") {
    playTone({ freq: 760, endFreq: 1480, duration: 0.14, type: "triangle", gain: 0.06, pan });
    playTone({ start: 0.055, freq: 1220, endFreq: 2040, duration: 0.16, type: "sine", gain: 0.042, pan });
    playNoise({ duration: 0.07, gain: 0.018, filter: 3200 });
  } else if (name === "enemyDefeat") {
    playTone({ freq: 540, endFreq: 920, duration: 0.1, type: "sine", gain: 0.055, pan });
    playTone({ start: 0.075, freq: 820, endFreq: 1320, duration: 0.14, type: "triangle", gain: 0.05, pan });
    playNoise({ duration: 0.16, gain: 0.03, filter: 2600 });
  } else if (name === "playerDamage") {
    playTone({ freq: 520, endFreq: 160, duration: 0.22, type: "sawtooth", gain: 0.06, pan });
    playNoise({ duration: 0.12, gain: 0.035, filter: 900 });
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
  }
}

function shootBeam(owner, x, y, dir) {
  if (owner === "player" && !hasEquippedWeapon()) return;
  const stage = owner === "player" ? weaponStage() : enemyWeaponStage(owner);
  const beamSpeed = owner === "player" ? stage.speed : stage.speed * 0.5;
  playSfx("laser", x);
  if (stage.pattern === "homing") {
    shootHomingMissiles(owner, x, y, dir, stage);
    return;
  }
  const angles = weaponAngles(stage, dir);
  for (let i = 0; i < angles.length; i++) {
    const angle = angles[i];
    const side = i - (angles.length - 1) / 2;
    const offsetY = stage.pattern === "forward" ? side * stage.spread : 0;
    state.beams.push({
      owner,
      x,
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

function weaponAngles(stage, dir) {
  const facing = dir >= 0 ? 0 : Math.PI;
  const spreadAngles = (count, arc) => Array.from({ length: count }, (_, i) => facing + (i - (count - 1) / 2) * arc);
  if (stage.pattern === "radial") return Array.from({ length: stage.count }, (_, i) => i * Math.PI * 2 / stage.count);
  if (stage.pattern === "both") return [0, Math.PI];
  if (stage.pattern === "bothSpread") return [-0.16, 0.16, Math.PI - 0.16, Math.PI + 0.16];
  if (stage.pattern === "fan") return spreadAngles(stage.count, 0.16);
  if (stage.pattern === "cross") return [facing, facing - 0.36, facing + 0.36, -Math.PI / 2, Math.PI / 2, facing + Math.PI];
  if (stage.pattern === "crown") return [facing, ...spreadAngles(stage.count - 1, 0.13).map(a => a - 0.45)];
  if (stage.pattern === "wave") return spreadAngles(stage.count, 0.08);
  if (stage.pattern === "spread") return spreadAngles(stage.count, 0.09);
  return spreadAngles(stage.count, 0);
}

function weaponStage(power = state.weaponPower) {
  return WEAPON_STAGES[clamp(Math.floor(power), 1, MAX_WEAPON_POWER) - 1];
}

function weaponAttribute(power = state?.weaponPower ?? 1) {
  return clamp(Math.floor(power), 1, MAX_WEAPON_POWER) <= WEAPON_ATTRIBUTE_SIZE ? "moon" : "star";
}

function weaponRank(power = state?.weaponPower ?? 1) {
  const value = clamp(Math.floor(power), 1, MAX_WEAPON_POWER);
  return ((value - 1) % WEAPON_ATTRIBUTE_SIZE) + 1;
}

function nextFusionPower(power) {
  const value = clamp(Math.floor(power), 1, MAX_WEAPON_POWER);
  if (weaponRank(value) >= WEAPON_ATTRIBUTE_SIZE) return null;
  return value + 1;
}

function canFusePower(power) {
  return nextFusionPower(power) !== null;
}

function randomWeaponDropPower() {
  const totalSnacks = state ? state.kakiTotal + state.peaTotal : 0;
  const balance = totalSnacks > 0 ? 1 - Math.abs(state.kakiTotal - state.peaTotal) / totalSnacks : 0;
  const difficulty = courses[currentCourse]?.difficulty ?? 1;
  const cap = clamp(3 + Math.floor(difficulty / 2), 5, MAX_WEAPON_POWER);
  const weights = Array.from({ length: cap }, (_, i) => {
    const power = i + 1;
    const curve = Math.max(0.03, 1.15 - power * 0.13);
    const unlock = power <= 5 ? 1 : Math.max(0.08, (difficulty - power + 6) / 14);
    const snackBonus = 1 + balance * 0.24 + totalSnacks * 0.001;
    return { power, weight: curve * unlock * snackBonus };
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

function compactInventoryItems() {
  ensureInventoryItems();
  const items = state.inventoryItems.filter(Boolean);
  state.inventoryItems = [...items, ...Array(MAX_INVENTORY_ITEMS - items.length).fill(null)];
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
  ensureInventoryItems();
  const items = state.inventoryItems.filter(Boolean);
  const compacted = [...items, ...Array(MAX_INVENTORY_ITEMS - items.length).fill(null)];
  const alreadyCompact = state.inventoryItems.every((item, index) => item === compacted[index]);
  if (items.length === 0) {
    state.inventorySortToastLabel = "整理するものなし";
    state.inventorySortComment = "ぴょんぴー「いや整理するものがないがな！」";
  } else if (alreadyCompact) {
    state.inventorySortToastLabel = "整理済み";
    state.inventorySortComment = "ぴょんぴー「いやもう整理されとる！」";
  } else {
    compactInventoryItems();
    state.inventorySortToastLabel = "整理されました";
    state.inventorySortComment = "ぴょんぴー「わあ、綺麗に並んだな！」";
  }
  state.inventorySortFlash = performance.now() + 220;
  state.inventorySortCommentUntil = performance.now() + 2200;
  state.inventoryMessage = performance.now() + 1400;
  state.inventoryMessageLabel = state.inventorySortToastLabel;
  playSfx("equip", state.player.x + state.player.w / 2);
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
  const nextPower = nextFusionPower(power);
  if (!power || state.inventoryItems[toIndex] !== power || !nextPower) return;
  state.inventoryItems[fromIndex] = null;
  state.inventoryItems[toIndex] = nextPower;
  syncWeaponInventoryFromItems();
  if (state.weaponPower > 0 && !state.weaponInventory[state.weaponPower - 1]) {
    state.weaponPower = 0;
    state.gun.holder = "inventory";
  }
  state.inventorySelection = toIndex;
  ensureInventorySelectionVisible();
  spawnBlockPoof(state.player.x + state.player.w / 2, state.player.y - 10);
  state.score += 25 * nextPower;
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
    .map((count, index) => count > 0 ? `Lv${index + 1}x${count}` : null)
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
    ? `ぴょんぴー「${weaponName(power)}${power <= 5 ? t("commentClassic") : t("commentExperimental")}」`
    : `Pyon-P: "${weaponName(power)}${power <= 5 ? t("commentClassic") : t("commentExperimental")}"`;
}

function setLanguage(nextLanguage) {
  language = nextLanguage === "en" ? "en" : "ja";
  localStorage.setItem("pyonpLanguage", language);
  applyLanguage();
  updateHud();
  draw();
}

function setControlMode(nextMode) {
  controlMode = nextMode === "ipad" ? "ipad" : nextMode === "pc" ? "pc" : "iphone";
  localStorage.setItem("pyonpControlMode", controlMode);
  document.body.dataset.controlMode = controlMode === "pc" ? "pc" : "mobile";
  document.body.dataset.controlDevice = controlMode;
  controlModeButtons.forEach(button => button.classList.toggle("active", button.dataset.controlMode === controlMode));
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
    const beamRect = rect(b.x, b.y, b.w, b.h);
    if (b.owner === "player") {
      for (const block of blocks) {
        if (!block.breakable || block.broken || !hit(beamRect, block)) continue;
        breakBlock(block);
        b.life = 0;
        break;
      }
      if (b.life <= 0) continue;
      for (const e of state.enemies) {
        if (!e.alive || !hit(beamRect, e)) continue;
        if (b.explosion) explodeMissile(b.x + b.w / 2, b.y + b.h / 2, b);
        else damageEnemy(e, b.damage ?? 1);
        if (b.pierce > 0) b.pierce -= 1;
        else b.life = 0;
        break;
      }
    } else if (hit(beamRect, state.player)) {
      const source = state.enemies.find(e => e.id === b.owner);
      damagePlayer(false, source);
      b.life = 0;
    }
  }
  state.beams = state.beams.filter(b => (
    b.life > 0 &&
    b.x > state.camera - 260 &&
    b.x < state.camera + canvas.width + 260 &&
    b.y > -220 &&
    b.y < canvas.height + 220
  ));
}

function updateHomingMissile(b, dt) {
  const target = state.enemies.find(e => e.id === b.targetId && e.alive) ||
    state.enemies.find(e => e.alive && e.x + e.w > state.camera - 80 && e.x < state.camera + canvas.width + 80);
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
  if (block.item) spawnItem(block.x + block.w / 2, block.y - 12, block.item);
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

function spawnItem(x, y, type) {
  state.items.push({
    x, y, type,
    weaponPower: type === "power" ? randomWeaponDropPower() : null,
    w: 28, h: 28,
    vx: 70,
    vy: -420,
    life: type === "hp" ? 5.2 : 9,
    grounded: false
  });
}

function spawnWeaponDrop(x, y, weaponPower) {
  state.items.push({
    x, y, type: "power",
    weaponPower,
    w: 28, h: 28,
    vx: -90 + Math.random() * 180,
    vy: -500,
    life: 9,
    grounded: false
  });
}

function updateItems(dt) {
  for (const item of state.items) {
    item.life -= dt;
    item.vy += GRAVITY * dt;
    item.x += item.vx * dt;
    item.y += item.vy * dt;
    item.grounded = false;
    for (const s of platforms.concat(blocks.filter(b => !b.broken))) {
      if (!hit(item, s)) continue;
      if (item.vy > 0) {
        item.y = s.y - item.h;
        item.vy = item.type === "hp" ? -360 : -180;
        item.vx *= item.type === "hp" ? 1.03 : 0.75;
        item.grounded = true;
      } else if (item.vy < 0) {
        item.y = s.y + s.h;
        item.vy = 0;
      }
    }
    if (hit(state.player, item)) {
      if (item.type === "hp") state.lives = Math.min(MAX_LIVES, state.lives + 1);
      if (item.type === "power" && !addWeaponStock(item.weaponPower ?? 1)) {
        item.vy = -260;
        item.vx = pusherAwayFromPlayer(item);
        continue;
      }
      item.life = 0;
    }
    if (item.y > canvas.height + 80) item.life = 0;
  }
  state.items = state.items.filter(item => item.life > 0);
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
    const nearX = p.x < c.x + c.r && p.x + p.w > c.x - c.r;
    const nearY = p.y < c.y + c.r && p.y + p.h > c.y - c.r;
    if (nearX && nearY) {
      c.taken = true;
      state.coinTotal += 1;
      if (c.type === "pea") state.peaTotal += 1;
      else state.kakiTotal += 1;
      state.score += 10;
      playSfx("pickup", c.x);
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

function damagePlayer(fell = false, sourceEnemy = null, canStealWeapon = false) {
  const p = state.player;
  if (state.mode === "dying" || state.mode === "respawning") return;
  if (!fell && p.invincible > 0) return;
  if (!fell && canStealWeapon && sourceEnemy && sourceEnemy.alive && hasEquippedWeapon()) {
    const playerPower = state.weaponPower;
    const enemyPower = sourceEnemy.weaponPower ?? 0;
    if (enemyPower === 0 || playerPower > enemyPower || (sourceEnemy.boss && playerPower >= enemyPower)) {
      if (enemyPower > 0) spawnWeaponDrop(sourceEnemy.x + sourceEnemy.w / 2, sourceEnemy.y + 8, enemyPower);
      sourceEnemy.weaponPower = removeEquippedWeaponForSteal();
      state.gun.holder = sourceEnemy.id;
      sourceEnemy.gunCooldown = sourceEnemy.boss ? 0.2 : 0.5;
    }
  }
  if (fell) {
    state.hp = 0;
  } else {
    const hitDamage = sourceEnemy?.weaponPower ? Math.max(1, weaponStage(sourceEnemy.weaponPower).damage) : 1;
    const minHpAfterHit = state.hp > 1 ? 1 : 0;
    state.hp = Math.max(minHpAfterHit, state.hp - hitDamage);
  }
  if (state.hp > 0) {
    playSfx("playerDamage", p.x + p.w / 2);
    p.invincible = 1.35;
    p.vx = sourceEnemy ? (p.x < sourceEnemy.x ? -260 : 260) : -p.facing * 220;
    p.vy = -360;
    return;
  }
  startDeathFall();
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

function startDeathFall() {
  const p = state.player;
  playSfx("death", p.x + p.w / 2);
  state.lives = Math.max(0, state.lives - 1);
  state.hp = 0;
  state.mode = "dying";
  state.deathTimer = 1.55;
  p.onCrescent = false;
  p.invincible = 0;
  p.grounded = false;
  p.vx = 0;
  p.vy = -720;
  spawnBlockPoof(p.x + p.w / 2, p.y + p.h / 2);
}

function startMoonRespawn() {
  const p = state.player;
  playSfx("respawn", p.x + p.w / 2);
  state.hp = MAX_HP;
  state.time = Math.max(30, state.time);
  state.mode = "respawning";
  state.respawnDuration = 3;
  state.respawnTimer = state.respawnDuration;
  state.respawnStartY = -170;
  state.respawnTargetY = 260;
  p.x = Math.max(72, state.camera + 120);
  p.y = 120;
  p.vx = 0;
  p.vy = 0;
  p.facing = 1;
  p.grounded = false;
  p.invincible = state.respawnDuration;
  p.onCrescent = true;
  spawnJumpSmoke(p.x + p.w / 2, 36);
}

function checkGoal() {
  const bossAlive = state.enemies.some(e => e.boss && e.alive);
  if (currentCourse === courses.length - 1 && bossAlive) return;
  if (hit(state.player, level.flag)) {
    playSfx("stageClear", state.player.x + state.player.w / 2);
    if (currentCourse < courses.length - 1) {
      nextCourse();
    } else {
      state.score += Math.ceil(state.time / 3);
      completedCourses.add(currentCourse);
      campaignKeep = campaignSnapshotFromState();
      endGame(t("allClear"), t("replay"), kakipiRank());
    }
  }
}

function nextCourse() {
  const oldWorld = courses[currentCourse]?.worldIndex ?? 0;
  const clearedCourse = currentCourse;
  completedCourses.add(currentCourse);
  state.score += Math.ceil(state.time / 5);
  campaignKeep = campaignSnapshotFromState();
  unlockedCourse = Math.max(unlockedCourse, Math.min(currentCourse + 1, courses.length - 1));
  const newWorld = courses[unlockedCourse]?.worldIndex ?? oldWorld;
  mapWalkFrom = clearedCourse;
  mapWalkTo = unlockedCourse;
  mapWalkTimer = unlockedCourse > clearedCourse ? 1.2 : 0;
  enterWorldMap(unlockedCourse, false, newWorld !== oldWorld ? oldWorld : null);
  overlay.classList.add("hidden");
  lastTime = performance.now();
}

function endGame(title, label, message = null, options = {}) {
  state.mode = "ended";
  gameOverContinueCost = options.allowContinue ? continuePairCost(currentCourse) : 0;
  gameOverContinueAvailable = !!options.allowContinue && canPayContinue(gameOverContinueCost);
  const continueText = language === "ja"
    ? `柿の種 ${gameOverContinueCost} と ピーナッツ ${gameOverContinueCost} を払って ${stageLabel()} から復活`
    : `Pay ${gameOverContinueCost} Kaki and ${gameOverContinueCost} Peanuts to continue from ${stageLabel()}`;
  const shortageText = language === "ja"
    ? `復活には柿の種 ${gameOverContinueCost} と ピーナッツ ${gameOverContinueCost} が必要`
    : `Continue needs ${gameOverContinueCost} Kaki and ${gameOverContinueCost} Peanuts`;
  overlay.querySelector("h1").textContent = title;
  overlay.querySelector("p").textContent = message || `${t("kaki")} ${state.kakiTotal}  ${t("pea")} ${state.peaTotal}  ${t("score")} ${state.score}${options.allowContinue ? `  /  ${gameOverContinueAvailable ? continueText : shortageText}` : ""}`;
  startButton.textContent = gameOverContinueAvailable ? (language === "ja" ? "このステージから復活" : "Continue") : label;
  overlay.classList.remove("hidden");
}

function kakipiRank() {
  const total = courses.reduce((sum, course) => sum + (course.level.coins ?? []).length, 0);
  const ratio = state.coinTotal / total;
  const snackTotal = state.kakiTotal + state.peaTotal;
  const balance = snackTotal > 0 ? Math.round((1 - Math.abs(state.kakiTotal - state.peaTotal) / snackTotal) * 100) : 0;
  const mix = state.peaTotal === 0 ? `${state.kakiTotal}:0` : `${state.kakiTotal}:${state.peaTotal}`;
  let rank = t("ranks")[0];
  if (ratio >= 1) rank = t("ranks")[4];
  else if (ratio >= 0.75) rank = t("ranks")[3];
  else if (ratio >= 0.5) rank = t("ranks")[2];
  else if (ratio >= 0.25) rank = t("ranks")[1];
  return `${t("kaki")} ${state.kakiTotal}  ${t("pea")} ${state.peaTotal}  ${t("mix")} ${mix}  ${t("balance")} ${balance}%  ${rank}  ${t("score")} ${state.score}`;
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
  peaCount.textContent = state.peaTotal;
  scoreCount.textContent = state.score;
  lifeCount.textContent = `${"★".repeat(clamp(state.lives, 0, MAX_LIVES))}${"☆".repeat(MAX_LIVES - clamp(state.lives, 0, MAX_LIVES))}`;
  timeCount.textContent = Math.max(0, Math.ceil(state.time));
}

function draw() {
  if (state.mode === "worldMap") {
    drawWorldMapScreen();
    return;
  }
  const cam = state.camera;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawSky(cam);
  ctx.save();
  ctx.translate(-Math.floor(cam), 0);
  drawMountains();
  drawStageEnvironment();
  drawPlatforms();
  drawStageHazards();
  drawBossHazards();
  drawGun();
  drawItems();
  drawParticles();
  drawCoins(performance.now() / 1000);
  drawFlag();
  drawBeams();
  drawEnemies();
  drawPlayer();
  ctx.restore();
  drawStageBadge();
  drawHpMeter();
  drawOxygenMeter();
  drawBossHpMeter();
  if (state.mode === "bossIntro" || state.mode === "bossOutro") drawBossIntroOverlay();
  if (state.mode === "paused") drawPauseScreen();
  if (state.itemFullPrompt > 0) drawItemFullPrompt();
  if (state.mode === "inventory") drawInventoryScreen();
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

function mapImageLayout() {
  const imgW = worldMapImage.naturalWidth || 1680;
  const imgH = worldMapImage.naturalHeight || 945;
  const scale = Math.max(canvas.width / imgW, canvas.height / imgH) * 2.35;
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
    const from = MAP_NODE_POINTS[mapWalkFrom] ?? MAP_NODE_POINTS[0];
    const to = MAP_NODE_POINTS[mapWalkTo] ?? MAP_NODE_POINTS[mapSelectedCourse] ?? MAP_NODE_POINTS[0];
    const progress = 1 - clamp(mapWalkTimer / 1.2, 0, 1);
    const eased = progress * progress * (3 - progress * 2);
    return {
      x: from.x + (to.x - from.x) * eased,
      y: from.y + (to.y - from.y) * eased
    };
  }
  return MAP_NODE_POINTS[mapSelectedCourse] ?? MAP_NODE_POINTS[0];
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
    const radius = i === mapSelectedCourse ? 28 : 23;
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
  for (let i = 1; i <= unlockedCourse; i++) {
    const from = mapPointToCanvas(i - 1);
    const to = mapPointToCanvas(i);
    const activeReveal = i > lastPathIndex ? reveal : 1;
    const endX = from.x + (to.x - from.x) * activeReveal;
    const endY = from.y + (to.y - from.y) * activeReveal;
    ctx.strokeStyle = "rgba(35, 210, 54, 0.88)";
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255, 243, 164, 0.92)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(endX, endY);
    ctx.stroke();
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
  }

  const walkerPoint = currentMapWalkerPoint();
  const layoutForWalker = mapImageLayout();
  const p = {
    x: layoutForWalker.x + walkerPoint.x * layoutForWalker.scale,
    y: layoutForWalker.y + walkerPoint.y * layoutForWalker.scale
  };
  ctx.save();
  ctx.translate(p.x, p.y - 28 + Math.sin(performance.now() / 140) * 3);
  const walking = mapWalkTimer > 0;
  if (pyompyRun.complete && pyompyRun.naturalWidth > 0 && walking) {
    const frame = PYOMPY_RUN_FRAMES[Math.floor(performance.now() / 90) % PYOMPY_RUN_FRAMES.length];
    const h = 46;
    const w = h * (frame.w / frame.h);
    const dir = (MAP_NODE_POINTS[mapWalkTo]?.x ?? walkerPoint.x) >= (MAP_NODE_POINTS[mapWalkFrom]?.x ?? walkerPoint.x) ? 1 : -1;
    ctx.scale(dir, 1);
    ctx.drawImage(pyompyRun, frame.x, frame.y, frame.w, frame.h, -w / 2, -h, w, h);
  } else if (pyompyJump.complete && pyompyJump.naturalWidth > 0) {
    const h = 48;
    const w = h * (pyompyJump.naturalWidth / pyompyJump.naturalHeight);
    ctx.drawImage(pyompyJump, -w / 2, -h, w, h);
  } else {
    ctx.scale(0.62, 0.62);
    drawPlayerFallback({ x: -18, y: -50 });
  }
  ctx.restore();

  drawWorldMapPanel();
}

function drawWorldMapPanel() {
  const course = courses[mapSelectedCourse] ?? courses[0];
  const world = course?.worldIndex ?? 0;
  const line = MAP_STAGE_MESSAGES[language]?.[world] ?? MAP_STAGE_MESSAGES.en[world] ?? "";
  ctx.save();
  ctx.fillStyle = "rgba(255, 245, 252, 0.92)";
  ctx.strokeStyle = "#c8b2ff";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(34, canvas.height - 108, canvas.width - 68, 82, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#7f67c8";
  ctx.font = "900 24px Segoe UI, system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(`${stageLabel(mapSelectedCourse)}  ${course.bossStage ? t("boss") : ""}`, 58, canvas.height - 92);
  ctx.fillStyle = "#4d4773";
  ctx.font = "800 17px Segoe UI, system-ui, sans-serif";
  ctx.fillText(line, 58, canvas.height - 60);
  ctx.fillStyle = "#ff8db7";
  ctx.font = "900 15px Segoe UI, system-ui, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(language === "ja" ? "Enter / Space でスタート" : "Enter / Space to start", canvas.width - 58, canvas.height - 60);
  ctx.restore();
}

function drawBossIntroOverlay() {
  const boss = state.mode === "bossOutro"
    ? (state.bossOutroBoss ?? { bossKind: state.bossOutroKind ?? 0, finalBoss: !!state.bossOutroFinal, x: 0, y: 0, w: 86, h: 86 })
    : state.enemies.find(e => e.id === state.bossIntroBossId && e.alive) ?? state.enemies.find(e => e.boss && e.alive);
  if (!boss) return;
  const timer = state.bossIntroTimer ?? 0;
  const kind = state.mode === "bossOutro" ? (state.bossOutroKind ?? 0) : (boss.bossKind ?? 0);
  const lines = state.mode === "bossOutro"
    ? (BOSS_DEFEAT_DIALOGUES[kind] ?? BOSS_DEFEAT_DIALOGUES[0])
    : (BOSS_DIALOGUES[kind] ?? BOSS_DIALOGUES[0]);
  const bossText = language === "ja" ? lines.bossJa : lines.bossEn;
  const pyonText = language === "ja" ? lines.pyonJa : lines.pyonEn;
  const showingPyon = (state.bossIntroStep ?? 0) === 1;
  const text = showingPyon ? pyonText : bossText;
  const speaker = showingPyon ? "PYON-P" : boss.finalBoss ? "FINAL BOSS" : "BOSS";

  ctx.save();
  const fade = clamp(timer / 0.45, 0, 1);
  ctx.globalAlpha = fade;
  ctx.fillStyle = "rgba(18, 10, 42, 0.48)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(12, 7, 30, 0.88)";
  ctx.fillRect(0, 0, canvas.width, 78);
  ctx.fillRect(0, canvas.height - 178, canvas.width, 178);

  if (showingPyon) drawPyonpyBust(132, canvas.height - 80, 2.65);
  else drawBossBust(boss, canvas.width - 150, canvas.height - 62, kind);

  ctx.fillStyle = "rgba(255, 245, 252, 0.96)";
  ctx.strokeStyle = boss.finalBoss ? "#ff3d7f" : "#c8b2ff";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(202, canvas.height - 146, 536, 108, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = showingPyon ? "#7f67c8" : boss.finalBoss ? "#ff3d7f" : "#8b6ac9";
  ctx.font = "900 16px Segoe UI, system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(speaker, 228, canvas.height - 128);
  ctx.fillStyle = "#3f355d";
  ctx.font = "900 22px Segoe UI, system-ui, sans-serif";
  wrapText(text, 228, canvas.height - 98, 486, 28);
  ctx.fillStyle = "rgba(127, 103, 200, 0.78)";
  ctx.font = "900 13px Segoe UI, system-ui, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(language === "ja" ? "ボタンで次へ" : "Press a button", 710, canvas.height - 54);

  ctx.fillStyle = "#fff3a4";
  ctx.strokeStyle = "#7f67c8";
  ctx.lineWidth = 5;
  ctx.font = "900 26px Segoe UI, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.strokeText(boss.finalBoss ? "FINAL BOSS" : `BOSS ${stageLabel()}`, canvas.width / 2, 24);
  ctx.fillText(boss.finalBoss ? "FINAL BOSS" : `BOSS ${stageLabel()}`, canvas.width / 2, 24);
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
  const x = canvas.width - 250;
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
  const x = canvas.width - 250;
  const y = 70;
  const w = 220;
  const h = 38;
  const ratio = clamp((state.oxygen ?? MAX_OXYGEN) / MAX_OXYGEN, 0, 1);
  ctx.save();
  ctx.fillStyle = "rgba(235, 252, 255, 0.78)";
  ctx.strokeStyle = "rgba(106, 198, 231, 0.82)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();
  ctx.stroke();
  ctx.font = "900 14px Segoe UI, system-ui, sans-serif";
  ctx.fillStyle = "#277394";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("O2", x + 14, y + h / 2);
  ctx.fillStyle = "rgba(201, 246, 255, 0.72)";
  ctx.beginPath();
  ctx.roundRect(x + 48, y + 11, 154, 16, 6);
  ctx.fill();
  const oxGrad = ctx.createLinearGradient(x + 48, y, x + 202, y);
  oxGrad.addColorStop(0, "#ffffff");
  oxGrad.addColorStop(0.45, "#9ee8ff");
  oxGrad.addColorStop(1, "#61f2a5");
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
    const grad = ctx.createLinearGradient(0, 20, 0, canvas.height);
    grad.addColorStop(0, "rgba(106, 246, 215, 0.22)");
    grad.addColorStop(0.55, "rgba(0, 95, 120, 0.26)");
    grad.addColorStop(1, "rgba(2, 35, 63, 0.32)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, WORLD_WIDTH, canvas.height);
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
  if (currentStageTrait() !== "marsLava") {
    ctx.restore();
    return;
  }
  for (const g of state.lavaGeysers ?? []) {
    const warmup = g.timer > 2.1 && g.timer <= 2.55;
    if (!g.active && !warmup) continue;
    const alpha = g.active ? 0.86 : 0.34;
    const x = g.x;
    const y = canvas.height - g.h;
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
      const y = warning ? 92 : h.y;
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
      const y = canvas.height - h.h;
      ctx.globalAlpha = warning ? 0.64 : 0.9;
      ctx.fillStyle = warning ? "rgba(255, 141, 183, 0.18)" : "rgba(255, 111, 82, 0.82)";
      ctx.strokeStyle = warning ? "#ff8db7" : "#fff3a4";
      ctx.lineWidth = warning ? 4 : 2;
      ctx.beginPath();
      ctx.roundRect(x, warning ? canvas.height - 42 : y, h.w, warning ? 28 : h.h, 20);
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

function drawStageBadge() {
  const label = `${stageLabel()}${currentCourse === courses.length - 1 ? ` ${t("final")}` : courses[currentCourse]?.areaIndex === 4 ? ` ${t("boss")}` : ""}`;
  const owner = hasEquippedWeapon() ? "" : state.gun.holder !== null && state.gun.holder !== "inventory" ? t("stolen") : t("noGun");
  const weaponLabel = hasEquippedWeapon() ? `${weaponName()} Lv${state.weaponPower}` : `${t("unequipped")}${owner}`;
  const inventoryLabel = `${t("stock")} ${weaponInventoryLabel()}`;
  ctx.save();
  ctx.font = "800 24px Segoe UI, system-ui, sans-serif";
  ctx.textBaseline = "top";
  const width = Math.max(ctx.measureText(label).width + 28, ctx.measureText(weaponLabel).width + 28, ctx.measureText(inventoryLabel).width + 28);
  ctx.fillStyle = "rgba(255, 255, 255, 0.76)";
  ctx.strokeStyle = "rgba(139, 106, 201, 0.72)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(14, 14, width, 86, 8);
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
  ctx.font = "800 13px Segoe UI, system-ui, sans-serif";
  ctx.fillStyle = "#ff8db7";
  ctx.strokeText(inventoryLabel, 28, 72);
  ctx.fillText(inventoryLabel, 28, 72);
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

function drawInventoryScreen() {
  ctx.save();
  if (selectUiImage.complete && selectUiImage.naturalWidth > 0) {
    ctx.drawImage(selectUiImage, 0, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = "rgba(64, 55, 118, 0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  drawInventoryDynamicText();
  drawItemCaseOverlay();
  drawSelectedWeaponPreview();
  drawGamepadInventoryGhost();
  if (state.inventoryGrab) drawDraggedInventoryItem();
  if (state.fusionPrompt) drawFusionPrompt();
  ctx.restore();
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
  return { x: 1190, y: 118, w: 74, h: 70 };
}

function inventoryTopMenuAreaRect() {
  return { x: 38, y: 44, w: 540, h: 92 };
}

function inventoryItemListAreaRect() {
  return { x: 748, y: 148, w: 505, h: 355 };
}

function inventoryTopMenuButtonRects() {
  return [
    { x: 50, y: 54, w: 118, h: 64 },
    { x: 184, y: 54, w: 118, h: 64 },
    { x: 318, y: 54, w: 118, h: 64 },
    { x: 452, y: 54, w: 118, h: 64 }
  ];
}

function resetInventoryFocus() {
  if (!state) return;
  state.inventoryFocusArea = "itemList";
  state.inventoryFocusMode = INVENTORY_FOCUS_MODES.AREA_SELECT;
  state.inventoryTopMenuIndex = 0;
  state.inventoryConfirmWorldMap = false;
  state.inventoryConfirmChoice = 0;
}

function moveInventoryFocusArea(dir) {
  const current = INVENTORY_FOCUS_AREAS.indexOf(state.inventoryFocusArea ?? "itemList");
  const next = (current + dir + INVENTORY_FOCUS_AREAS.length) % INVENTORY_FOCUS_AREAS.length;
  state.inventoryFocusArea = INVENTORY_FOCUS_AREAS[next];
  playSfx("equip", state.player.x + state.player.w / 2);
}

function enterInventoryFocusedArea() {
  if (state.inventoryFocusArea === "topMenu") {
    state.inventoryFocusMode = INVENTORY_FOCUS_MODES.INSIDE_TOP_MENU;
    playSfx("equip", state.player.x + state.player.w / 2);
    return;
  }
  if (state.inventoryFocusArea === "itemList") {
    state.inventoryFocusMode = INVENTORY_FOCUS_MODES.INSIDE_ITEM_LIST;
    playSfx("equip", state.player.x + state.player.w / 2);
    return;
  }
  if (state.inventoryFocusArea === "sortButton") runInventorySort();
}

function leaveInventoryInnerFocus() {
  state.inventoryGrab = null;
  state.inventoryFocusMode = INVENTORY_FOCUS_MODES.AREA_SELECT;
  playSfx("equip", state.player.x + state.player.w / 2);
}

function activateInventoryTopMenuButton() {
  const index = state.inventoryTopMenuIndex ?? 0;
  if (index === 0) {
    closeInventory();
    return;
  }
  if (index === 2) {
    state.inventoryConfirmWorldMap = true;
    state.inventoryConfirmChoice = 0;
    playSfx("equip", state.player.x + state.player.w / 2);
    return;
  }
  state.inventoryMessage = performance.now() + 1000;
  state.inventoryMessageLabel = "未定ボタンです";
  playSfx("equip", state.player.x + state.player.w / 2);
}

function handleInventoryWorldMapConfirm(accept) {
  if (accept) returnToWorldMapFromInventory();
  else {
    state.inventoryConfirmWorldMap = false;
    playSfx("equip", state.player.x + state.player.w / 2);
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

function drawInventoryWorldMapConfirm() {
  ctx.save();
  ctx.fillStyle = "rgba(35, 25, 75, 0.48)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
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
  for (let i = 0; i < labels.length; i++) {
    const b = { x: r.x + 86 + i * 160, y: r.y + 112, w: 112, h: 46 };
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
  ctx.roundRect(928, 158, 230, 34, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 14px Segoe UI, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(state.inventoryMessageLabel || t("sorted"), 1043, 175);
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

function inventorySlotRects() {
  const slots = inventorySlots();
  const rects = [];
  const startX = 760;
  const startY = 195;
  const size = 88;
  const gapX = 10;
  const gapY = 10;
  clampInventoryScroll();
  for (let i = 0; i < VISIBLE_INVENTORY_ITEMS; i++) {
    const col = i % 5;
    const row = Math.floor(i / 5);
    const index = state.inventoryScroll + i;
    const item = slots[index] || null;
    rects.push({ ...(item || {}), empty: !item, index, x: startX + col * (size + gapX), y: startY + row * (size + gapY), w: size, h: size });
  }
  return rects;
}

function drawInventorySlot(slot) {
  const selected = state.inventorySelection === slot.index;
  const grabbed = state.inventoryGrab?.from === slot.index;
  const equipped = !slot.empty && state.weaponPower === slot.power;
  ctx.save();
  ctx.globalAlpha = grabbed ? 0.35 : 1;
  ctx.fillStyle = selected ? "rgba(255, 243, 164, 0.35)" : "rgba(52, 36, 161, 0.12)";
  ctx.strokeStyle = equipped ? "#ff8db7" : selected ? "#fff3a4" : "rgba(142, 220, 232, 0.72)";
  ctx.lineWidth = equipped ? 4 : selected ? 3 : 2;
  ctx.beginPath();
  ctx.roundRect(slot.x, slot.y, slot.w, slot.h, 4);
  ctx.fill();
  ctx.stroke();
  if (slot.empty) {
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    ctx.font = "900 14px Segoe UI, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("EMPTY", slot.x + slot.w / 2, slot.y + 43);
    ctx.restore();
    return;
  }
  ctx.save();
  ctx.translate(slot.x + slot.w / 2, slot.y + 44);
  drawWeaponIcon(0, 0, slot.power, 1.08, 1);
  ctx.restore();
  const count = state.weaponInventory[slot.power - 1] ?? 0;
  if (count > 1) {
    ctx.fillStyle = "#fff3a4";
    ctx.strokeStyle = "#7f67c8";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(slot.x + slot.w - 34, slot.y + 8, 28, 20, 7);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#4d4773";
    ctx.font = "900 12px Segoe UI, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`x${count}`, slot.x + slot.w - 20, slot.y + 13);
  }
  ctx.restore();
}

function drawDraggedInventoryItem() {
  const drag = state.inventoryGrab;
  if (!drag) return;
  ctx.save();
  ctx.globalAlpha = drag.gamepad ? 0.72 : 0.86;
  ctx.translate(drag.displayX ?? drag.x, drag.displayY ?? drag.y);
  ctx.rotate(Math.sin(performance.now() / 120) * 0.04);
  drawWeaponIcon(0, 0, drag.power, drag.gamepad ? 1.35 : 1.18, 1);
  ctx.strokeStyle = "rgba(255, 243, 164, 0.85)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(-38, -30, 76, 60, 8);
  ctx.stroke();
  ctx.restore();
}

function drawGamepadInventoryGhost() {
  const grab = state.inventoryGrab;
  if (!grab?.gamepad) return;
  const slot = inventorySlotRects().find(s => s.index === state.inventorySelection);
  if (!slot) return;
  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.translate(slot.x + slot.w / 2, slot.y + slot.h / 2);
  drawWeaponIcon(0, 0, grab.power, 0.98, 1);
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

function inventoryFocusComment(power = state.weaponPower) {
  if (state.inventorySortComment && performance.now() < (state.inventorySortCommentUntil ?? 0)) {
    return state.inventorySortComment;
  }
  if (state.inventoryConfirmWorldMap) {
    return "ぴょんぴー「ワールドマップに戻る？ はいならマップへ、いいえならここに残るよ！」";
  }
  const mode = state.inventoryFocusMode ?? INVENTORY_FOCUS_MODES.AREA_SELECT;
  const area = state.inventoryFocusArea ?? "itemList";
  if (mode === INVENTORY_FOCUS_MODES.INSIDE_TOP_MENU) {
    const messages = [
      "ぴょんぴー「ここはゲーム画面に戻るボタンだよ。冒険に戻ろう！」",
      "ぴょんぴー「ここはまだ準備中のボタンだよ。今は押しても何も起きないよ！」",
      "ぴょんぴー「ここはワールドマップに戻るボタンだよ。押す前に確認するね！」",
      "ぴょんぴー「ここもまだ準備中だよ。あとで何か入れよう！」"
    ];
    return messages[state.inventoryTopMenuIndex ?? 0] ?? messages[0];
  }
  if (mode === INVENTORY_FOCUS_MODES.INSIDE_ITEM_LIST && power) {
    return pyonpyWeaponComment(power);
  }
  if (area === "topMenu") {
    return "ぴょんぴー「上のメニューだよ。Aで入ると、ゲームに戻るボタンやマップに戻るボタンを選べるよ！」";
  }
  if (area === "sortButton") {
    return "ぴょんぴー「この惑星ボタンを押すと、アイテムが前からきれいに整理されるよ！」";
  }
  return "ぴょんぴー「ここはアイテムリストだよ。武器と武器を融合させて、もっと強い武器を作れるよ！」";
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
  ctx.save();
  ctx.fillStyle = "rgba(30, 24, 52, 0.78)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
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
  ctx.fillText(`${weaponName(prompt.power)}${t("fuseQuestion")}`, canvas.width / 2, y + 36);
  ctx.font = "900 28px Georgia, serif";
  ctx.fillStyle = prompt.choice === 0 ? "#ff8db7" : "#4d4773";
  ctx.fillText("Yes", canvas.width / 2 - 75, y + 80);
  ctx.fillStyle = prompt.choice === 1 ? "#ff8db7" : "#4d4773";
  ctx.fillText("No", canvas.width / 2 + 80, y + 80);
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

  const bg = stageBackgroundImages[theme.imageIndex];
  if (bg?.complete && bg.naturalWidth > 0) {
    if (theme.imageIndex === 0) drawPastelBackgroundImage(cam);
    else drawStageBackgroundImage(bg, cam);
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

function drawStageBackgroundImage(img, cam) {
  const imgW = img.naturalWidth;
  const imgH = img.naturalHeight;
  const scale = Math.max(canvas.width / imgW, canvas.height / imgH);
  const drawW = imgW * scale;
  const drawH = imgH * scale;
  const y = (canvas.height - drawH) / 2;
  const parallax = (cam * 0.08) % drawW;
  for (let x = -parallax - drawW; x < canvas.width + drawW; x += drawW) {
    ctx.drawImage(img, x, y, drawW, drawH);
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
  for (const p of platforms) {
    drawMoonRock(p, theme?.ground[0] ?? "#f4e9cc", theme?.ground[1] ?? "#cfc7d6");
    if (p.iceRamp) drawIceSlopeMarks(p);
    if (p.conveyor) drawConveyorSurface(p);
    if (p.mover) drawMovingPlatformGlow(p);
  }
  for (const b of blocks) {
    if (b.broken) continue;
    if (b.breakable) drawBreakableBlock(b);
    else drawMoonRock(b, theme?.ground[1] ?? "#d8d3ff", theme?.accent ?? "#aaa7d8");
  }
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
    if (item.type === "hp") {
      ctx.save();
      ctx.translate(item.x + item.w / 2, item.y + item.h / 2);
      ctx.rotate(performance.now() / 220);
      ctx.fillStyle = "#ffd85a";
      drawTinyStar(0, 0, 14);
      ctx.restore();
    } else {
      const dropPower = item.weaponPower ?? 1;
      const nextPower = previewWeaponPowerAfterPickup(dropPower);
      drawRayGun(item.x + item.w / 2, item.y + item.h / 2, 1, 0.88, dropPower);
      ctx.fillStyle = "#fff3a4";
      ctx.strokeStyle = "#7f67c8";
      ctx.lineWidth = 3;
      ctx.font = "bold 14px system-ui";
      ctx.textAlign = "center";
      const label = nextPower > state.weaponPower ? `合体` : `Lv${dropPower}`;
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

function drawKakipi(x, y, type) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(type === "pea" ? 0.22 : -0.18);

  if (type === "pea") {
    drawPeanut();
  } else {
    drawKakiSeed();
  }
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
  const f = level.flag;
  ctx.fillStyle = "#2f3238";
  ctx.fillRect(f.x, f.y, f.w, f.h);
  ctx.fillStyle = "#e85d4f";
  ctx.fillRect(f.x + f.w, f.y + 10, 104, 58);
  ctx.fillStyle = "#f8f4df";
  ctx.fillRect(f.x + f.w + 16, f.y + 26, 50, 10);
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
    if (e.alive && e.stun > 0 && Math.floor(performance.now() / 110) % 2) continue;
    if (e.boss) drawBossAlien(e);
    else drawPastelAlien(e);
  }
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
  if (facingRight) {
    ctx.drawImage(img, dx, dy, drawW, drawH);
  } else {
    ctx.translate(dx + drawW / 2, dy + drawH / 2);
    ctx.scale(-1, 1);
    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
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
  if (flipImage) {
    ctx.translate(dx + drawW, dy);
    ctx.scale(-1, 1);
    ctx.drawImage(img, 0, 0, drawW, drawH);
  } else {
    ctx.drawImage(img, dx, dy, drawW, drawH);
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
  if (hasEquippedWeapon() && state.weaponPower >= 16) drawBackCannon(p);
  if (p.invincible > 0 && state.mode !== "respawning" && Math.floor(performance.now() / 90) % 2) return;
  if (pyompySprite.complete && pyompySprite.naturalWidth > 0) {
    drawPlayerSprite(p);
    if (hasEquippedWeapon()) drawRayGun(p.x + p.w / 2 + p.facing * 25, p.y + 34, -p.facing, 0.7, state.weaponPower);
    return;
  }
  drawPlayerFallback(p);
  if (hasEquippedWeapon()) drawRayGun(p.x + p.w / 2 + p.facing * 25, p.y + 34, -p.facing, 0.7, state.weaponPower);
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
  if (!p.grounded && pyompyJump.complete && pyompyJump.naturalWidth > 0) {
    drawPlayerJumpSprite(p);
    return;
  }
  if (p.grounded && Math.abs(p.vx) > 55 && pyompyRun.complete && pyompyRun.naturalWidth > 0) {
    drawPlayerRunSprite(p);
    return;
  }

  const speed = Math.abs(p.vx);
  const t = performance.now() / 1000;
  let frame = 0;

  const airborne = !p.grounded;
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

function drawPlayerRunSprite(p) {
  const t = performance.now() / 1000;
  const speedRate = clamp(Math.abs(p.vx) / 360, 0.45, 1.2);
  const frame = Math.floor(t * 13 * speedRate) % PYOMPY_RUN_FRAMES.length;
  const source = PYOMPY_RUN_FRAMES[frame];
  const drawH = 170;
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
  const drawH = 96;
  const drawW = drawH * (source.w / source.h);
  const dx = p.x + p.w / 2 - drawW * 0.54;
  const dy = p.y + p.h - drawH + 8;

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
  const jumpPressed = Boolean(pad.buttons[0]?.pressed);
  const runPressed = Boolean(pad.buttons[1]?.pressed || pad.buttons[5]?.pressed);
  const shootPressed = Boolean(pad.buttons[2]?.pressed || pad.buttons[3]?.pressed);
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

  if (!overlay.classList.contains("hidden")) {
    const anyStartPressed = jumpPressed || shootPressed || runPressed || startPressed || selectPressed;
    const anyStartLatched = gamepadState.jumpLatch || gamepadState.shootLatch || gamepadState.runLatch || gamepadState.startLatch || gamepadState.selectLatch;
    if (anyStartPressed && !anyStartLatched) {
      if (state?.mode === "ended" && gameOverContinueAvailable) continueFromGameOver();
      else pendingCourseStart ? startCurrentCourse() : startGame();
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
    const moveDir = gamepadState.left || gamepadState.up ? -1 : gamepadState.right || gamepadState.down ? 1 : 0;
    const freshMove = (gamepadState.left && !gamepadState.leftLatch) || (gamepadState.right && !gamepadState.rightLatch) || (gamepadState.up && !gamepadState.upLatch) || (gamepadState.down && !gamepadState.downLatch);
    if (!moveDir) {
      gamepadState.inventoryMoveDelay = 0;
    } else if (freshMove || now >= gamepadState.inventoryMoveDelay) {
      moveMapSelection(moveDir);
      gamepadState.inventoryMoveDelay = now + (freshMove ? 230 : 125);
    }
    if ((jumpPressed && !gamepadState.jumpLatch) || (shootPressed && !gamepadState.shootLatch) || (startPressed && !gamepadState.startLatch)) startMapCourse(mapSelectedCourse);
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
      playSfx("equip", state.player.x + state.player.w / 2);
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
    if (state?.mode === "ended" && gameOverContinueAvailable) continueFromGameOver();
    else pendingCourseStart ? startCurrentCourse() : startGame();
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
  if (!event.repeat && (code === "ArrowLeft" || code === "KeyA")) registerMoveTap(-1);
  if (!event.repeat && (code === "ArrowRight" || code === "KeyD")) registerMoveTap(1);
  if (!event.repeat && (code === "Space" || code === "ArrowUp" || code === "KeyW")) queueStompBoost();
  if (state.mode === "bossIntro" || state.mode === "bossOutro") {
    if (!event.repeat && ["Enter", "Space", "KeyX", "KeyY", "KeyJ", "KeyZ", "KeyA"].includes(code)) advanceBossIntro();
    return;
  }
  if (state.mode === "paused") {
    if (!event.repeat && code === "Enter") {
      resumeGame();
      return;
    }
    if (!event.repeat && (code === "ArrowUp" || code === "ArrowDown" || code === "ArrowLeft" || code === "ArrowRight" || code === "KeyW" || code === "KeyS" || code === "KeyA" || code === "KeyD")) {
      pauseSelection = 1 - pauseSelection;
      playSfx("equip", state.player.x + state.player.w / 2);
    }
    if (!event.repeat && (code === "Space" || code === "KeyX" || code === "KeyY" || code === "KeyJ")) choosePauseOption();
    return;
  }
  if (state.mode === "worldMap") {
    if (code === "ArrowLeft" || code === "KeyA") moveMapSelection(-1);
    if (code === "ArrowRight" || code === "KeyD") moveMapSelection(1);
    if (code === "ArrowUp" || code === "KeyW") moveMapSelection(-1);
    if (code === "ArrowDown" || code === "KeyS") moveMapSelection(1);
    if (code === "Enter" || code === "Space" || code === "KeyX" || code === "KeyY" || code === "KeyJ") startMapCourse(mapSelectedCourse);
    return;
  }
  if (!event.repeat && code === "Enter" && (state.mode === "playing" || state.mode === "respawning") && overlay.classList.contains("hidden")) {
    pauseGame();
    return;
  }
  if (code === "Tab" || code === "Backspace" || code === "Select") {
    toggleInventory();
    return;
  }
  if (state.mode === "inventory") {
    handleInventoryKeyboardFocus(code, event.repeat);
    return;
  }
  if ((code === "Enter" || code === "Space") && !overlay.classList.contains("hidden")) {
    if (state?.mode === "ended" && gameOverContinueAvailable) continueFromGameOver();
    else pendingCourseStart ? startCurrentCourse() : startGame();
    return;
  }
  keys.add(code);
});

window.addEventListener("keyup", event => {
  const code = normalizeInputCode(event);
  if (state.mode === "inventory" && (code === "Enter" || code === "Space") && state.inventoryGrab && !state.inventoryGrab.pointer) {
    releaseInventoryGrab();
    return;
  }
  keys.delete(code);
});
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
    setControlMode(button.dataset.controlMode);
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
    const courseIndex = mapCourseAt(pos.x, pos.y);
    if (courseIndex >= 0) {
      if (courseIndex === mapSelectedCourse) startMapCourse(courseIndex);
      else {
        mapSelectedCourse = courseIndex;
        currentCourse = courseIndex;
        playSfx("equip", state?.player?.x ?? 480);
        updateHud();
      }
      event.preventDefault();
    }
    return;
  }
  if (state.mode === "inventory") {
    if (handleFusionPromptPointer(pos.x, pos.y)) return;
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
    if (pos.x < 150 && pos.y < 110) closeInventory();
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
  if (target && !target.empty && target.index !== grab.from && target.power === grab.power && canFusePower(target.power)) {
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
    equipWeapon(target.power - 1);
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
  state.inventorySelection = (state.inventorySelection + dir + MAX_INVENTORY_ITEMS * 4) % MAX_INVENTORY_ITEMS;
  ensureInventorySelectionVisible();
}

function equipSelectedInventorySlot() {
  const slot = inventorySlots()[state.inventorySelection];
  if (slot) equipWeapon(slot.power - 1);
}

function startInventoryGrab(gamepad = false) {
  if (!state || state.mode !== "inventory" || state.inventoryGrab) return;
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
  if (target.index !== grab.from && target.power === grab.power && canFusePower(target.power)) {
    state.fusionPrompt = { power: grab.power, choice: 0, from: grab.from, to: target.index };
    return;
  }
  if (target.index === grab.from) equipWeapon(target.power - 1);
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
  state.fusionPrompt = null;
  if (prompt.choice === 0) {
    if (Number.isInteger(prompt.from) && Number.isInteger(prompt.to)) fuseInventoryItems(prompt.from, prompt.to);
    else fuseWeapons(prompt.power);
  }
}

function handleFusionPromptPointer(x, y) {
  if (!state.fusionPrompt) return false;
  if (x >= 340 && x <= 470 && y >= 430 && y <= 476) {
    state.fusionPrompt.choice = 0;
    confirmFusionPrompt();
    return true;
  }
  if (x >= 515 && x <= 620 && y >= 430 && y <= 476) {
    state.fusionPrompt = null;
    return true;
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
  if (state.inventoryConfirmWorldMap) {
    if (code === "ArrowLeft" || code === "ArrowRight" || code === "KeyA" || code === "KeyD") {
      state.inventoryConfirmChoice = 1 - (state.inventoryConfirmChoice ?? 0);
      playSfx("equip", state.player.x + state.player.w / 2);
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
    if (code === "ArrowLeft" || code === "ArrowRight" || code === "KeyA" || code === "KeyD") state.fusionPrompt.choice = 1 - state.fusionPrompt.choice;
    if (code === "Enter" || code === "Space" || code === "KeyZ") confirmFusionPrompt();
    if (code === "Escape" || code === "KeyB") state.fusionPrompt = null;
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
      playSfx("equip", state.player.x + state.player.w / 2);
      return true;
    }
    if (!repeat && (code === "ArrowRight" || code === "KeyD")) {
      state.inventoryTopMenuIndex = (state.inventoryTopMenuIndex + 1) % 4;
      playSfx("equip", state.player.x + state.player.w / 2);
      return true;
    }
    if (!repeat && (code === "Enter" || code === "Space" || code === "KeyZ")) {
      activateInventoryTopMenuButton();
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
    if (code === "ArrowUp" || code === "KeyW") moveInventorySelection(-5);
    if (code === "ArrowDown" || code === "KeyS") moveInventorySelection(5);
    if (!repeat && (code === "Enter" || code === "Space" || code === "KeyZ")) startInventoryGrab(false);
    if (!repeat && code === "KeyE") equipSelectedInventorySlot();
    if (!repeat && (code === "KeyX" || code === "KeyY" || code === "KeyC")) runInventorySort();
    if (!repeat && (code === "Escape" || code === "KeyB")) leaveInventoryInnerFocus();
    return true;
  }
  return false;
}

function updateInventoryGamepadFocus(now, jumpPressed, runPressed, shootPressed) {
  if (state.inventoryConfirmWorldMap) {
    if ((gamepadState.left || gamepadState.right) && !(gamepadState.leftLatch || gamepadState.rightLatch)) {
      state.inventoryConfirmChoice = 1 - (state.inventoryConfirmChoice ?? 0);
      playSfx("equip", state.player.x + state.player.w / 2);
    }
    if (jumpPressed && !gamepadState.jumpLatch) handleInventoryWorldMapConfirm((state.inventoryConfirmChoice ?? 0) === 0);
    if (runPressed && !gamepadState.runLatch) handleInventoryWorldMapConfirm(false);
    return;
  }

  if (state.fusionPrompt) {
    if ((gamepadState.left || gamepadState.right) && !(gamepadState.leftLatch || gamepadState.rightLatch)) state.fusionPrompt.choice = 1 - state.fusionPrompt.choice;
    if (jumpPressed && !gamepadState.jumpLatch) confirmFusionPrompt();
    if (runPressed && !gamepadState.runLatch) state.fusionPrompt = null;
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
      playSfx("equip", state.player.x + state.player.w / 2);
      gamepadState.inventoryMoveDelay = now + (freshMove ? 230 : 140);
    }
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
      moveInventorySelection(moveDir);
      gamepadState.inventoryMoveDelay = now + (freshMove ? 230 : 115);
    }
    if (jumpPressed && !gamepadState.jumpLatch) startInventoryGrab(true);
    if (!jumpPressed && gamepadState.jumpLatch && state.inventoryGrab?.gamepad) releaseInventoryGrab();
    if (shootPressed && !gamepadState.shootLatch) runInventorySort();
    if (runPressed && !gamepadState.runLatch) leaveInventoryInnerFocus();
    updateGamepadInventoryGrabPosition();
  }
}

function handleTouchStartButton() {
  if (!overlay.classList.contains("hidden")) {
    if (state?.mode === "ended" && gameOverContinueAvailable) continueFromGameOver();
    else pendingCourseStart ? startCurrentCourse() : startGame();
    return;
  }
  if (state.mode === "paused") {
    resumeGame();
    return;
  }
  if (state.mode === "worldMap") {
    startMapCourse(mapSelectedCourse);
    return;
  }
  if (state.mode === "playing" || state.mode === "respawning") pauseGame();
}

function pressTouchControl(code) {
  unlockAudio();
  if (code === "Select") {
    toggleInventory();
    return;
  }
  if (code === "Enter") {
    handleTouchStartButton();
    return;
  }
  if (code === "ArrowLeft") registerMoveTap(-1);
  if (code === "ArrowRight") registerMoveTap(1);
  if (code === "Space" || code === "ArrowUp") queueStompBoost();
  keys.add(code);
}

function releaseTouchControl(code) {
  keys.delete(code);
}

for (const button of document.querySelectorAll("[data-key]")) {
  const code = button.dataset.key;
  const press = event => {
    event.preventDefault();
    pressTouchControl(code);
  };
  const release = event => {
    event.preventDefault();
    releaseTouchControl(code);
  };
  button.addEventListener("pointerdown", press);
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("pointerleave", release);
}

for (const eventName of ["contextmenu", "selectstart", "dragstart"]) {
  document.addEventListener(eventName, event => event.preventDefault());
}
document.addEventListener("pointerdown", unlockAudio, { passive: true });
document.addEventListener("touchstart", unlockAudio, { passive: true });
document.addEventListener("touchmove", event => event.preventDefault(), { passive: false });

state = newState();
applyLanguage();
const debugParams = new URLSearchParams(window.location.search);
if (debugParams.get("stage") === "6-5" || debugParams.get("stage") === "final") {
  startDirectCourse(courses.length - 1);
}
updateHud();
draw();
lastTime = performance.now();
animationId = requestAnimationFrame(loop);

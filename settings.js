// settings.js — せってい（音の大きさ・ボタンの割り当て）

// PC（キーボード）で遊んでいるときは、画面に出す文の「A」「SELECT」などに、押すキーをそえる。
// 例：「SELECTで装備画面」→「SELECT（Tab）で装備画面」。声は元の文でさがすので、文そのものは変えない（表示だけ）。
// キーボードでは A キーは「左へ移動」なので、A ボタン＝Space、B（もどる）＝Esc、SELECT＝Tab、START＝Enter。X・Y はそのまま。
function pcKeys(text) {
  if (typeof text !== "string" || !text) return text;
  if (typeof controlMode === "undefined" || controlMode !== "pc") return text;
  const KEY = { A: "Space", B: "Esc" };
  const ja = typeof language === "undefined" || language === "ja";
  if (ja) {
    return text
      .replace(/SELECT(?![（(]Tab)/g, "SELECT（Tab）")
      .replace(/START(?![（(]Enter)/g, "START（Enter）")
      .replace(/十字キー(?![（(])/g, "十字キー（矢印キー）")
      .replace(/[（(]([AB])[）)]/g, (_, b) => `（${KEY[b]}）`)
      .replace(/(?<![A-Za-z（(])([AB])(ボタン)?(?![A-Za-z（(）)])/g, (_, b, btn) => `${b}${btn ?? ""}（${KEY[b]}）`);
  }
  return text
    .replace(/SELECT(?! \(Tab)/g, "SELECT (Tab)")
    .replace(/START(?! \(Enter)/g, "START (Enter)")
    .replace(/the D-pad/g, "the arrow keys")
    .replace(/\(([AB])\)/g, (_, b) => `(${KEY[b]})`)
    .replace(/([Pp]ress |[Ww]ith |[Hh]old |then |  )([AB])(?=[\s.,!:]|$)/g, (_, pre, b) => `${pre}${b} (${KEY[b]})`);
}

// localStorage の "pyonpSettings" に保存する。はじめは今までと同じ（音はぜんぶ 10、A=ジャンプ B=ダッシュ X・Y=こうげき）
const Settings = (() => {
  "use strict";

  const KEY = "pyonpSettings";
  const BUTTONS = ["A", "B", "X", "Y"];
  const ACTIONS = ["jump", "dash", "attack"];
  const DEFAULT = { master: 100, bgm: 10, voice: 10, sfx: 10, buttons: { A: "jump", B: "dash", X: "attack", Y: "attack" } };
  // ゲーム中に、そのボタンが出すキー（キーボードと同じ処理に流す）
  const ACTION_CODE = { jump: "Space", dash: "KeyB", attack: "KeyX" };
  // 画面のボタンがもともと出すキー → どのボタンか
  const BUTTON_OF_CODE = { Space: "A", KeyB: "B", KeyX: "X", KeyY: "Y" };
  const LABEL = {
    ja: { jump: "ジャンプ", dash: "ダッシュ", attack: "こうげき" },
    en: { jump: "Jump", dash: "Dash", attack: "Shoot" }
  };

  function fresh() {
    return { ...DEFAULT, buttons: { ...DEFAULT.buttons } };
  }

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || "null");
      if (!saved || typeof saved !== "object") return fresh();
      const d = { ...fresh(), ...saved, buttons: { ...DEFAULT.buttons, ...(saved.buttons || {}) } };
      for (const k of ["bgm", "voice", "sfx"]) d[k] = Math.max(0, Math.min(10, Math.round(Number(d[k]) || 0)));
      d.master = Math.max(0, Math.min(100, Math.round(Number(d.master ?? 100))));
      if (!isFinite(d.master)) d.master = 100;
      for (const b of BUTTONS) if (!ACTIONS.includes(d.buttons[b])) d.buttons[b] = DEFAULT.buttons[b];
      // ジャンプ・ダッシュ・こうげきのどれかがないまま残っていたら、はじめの割り当てにもどす（遊べなくならないように）
      if (ACTIONS.some(a => !BUTTONS.some(b => d.buttons[b] === a))) d.buttons = { ...DEFAULT.buttons };
      return d;
    } catch (_) {
      return fresh();
    }
  }

  let data = load();

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (_) {}
  }

  // 0〜10 → 音量の倍率（ゲーム機の下の小窓の「全体の音量」0〜100 をかける）
  const level = k => (data[k] / 10) * (data.master / 100);
  const master = () => data.master;
  function setMaster(v) {
    data.master = Math.max(0, Math.min(100, Math.round(v)));
    save();
  }

  // ゲーム中だけ、ボタンの割り当てをかえる（メニューでは A=決定、B=もどる のまま）
  function mapCode(code, inGame) {
    if (!inGame) return code;
    const b = BUTTON_OF_CODE[code];
    if (!b) return code;
    return ACTION_CODE[data.buttons[b]] ?? code;
  }

  // ゲームパッド：A=0 B=1 X=2 Y=3 のボタンが、いまどの役目か
  function padActions(pressed) {
    const out = { jump: false, dash: false, attack: false };
    for (const b of BUTTONS) if (pressed[b]) out[data.buttons[b]] = true;
    return out;
  }

  // ボタンの役目をかえる。かえたボタンだけがかわる（ほかのボタンは動かさない）
  function setButton(button, action) {
    if (data.buttons[button] === action) return;
    data.buttons[button] = action;
    save();
  }

  // どのボタンにも割り当てられていない役目（とじるときに、そろっているか調べる）
  function missingActions() {
    return ACTIONS.filter(a => !BUTTONS.some(b => data.buttons[b] === a));
  }

  function cycleButton(button, dir) {
    const i = ACTIONS.indexOf(data.buttons[button]);
    setButton(button, ACTIONS[(i + dir + ACTIONS.length) % ACTIONS.length]);
  }

  function setLevel(k, v) {
    data[k] = Math.max(0, Math.min(10, Math.round(v)));
    save();
  }

  function reset() {
    data = fresh();
    save();
  }

  function actionLabel(action, lang) {
    return (LABEL[lang] ?? LABEL.ja)[action] ?? action;
  }

  return {
    get data() { return data; },
    BUTTONS, ACTIONS, level, master, setMaster, mapCode, padActions, setButton, cycleButton, setLevel, reset, actionLabel, save, missingActions
  };
})();

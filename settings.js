// settings.js — せってい（音の大きさ・ボタンの割り当て）
// localStorage の "pyonpSettings" に保存する。はじめは今までと同じ（音はぜんぶ 10、A=ジャンプ B=ダッシュ X・Y=こうげき）
const Settings = (() => {
  "use strict";

  const KEY = "pyonpSettings";
  const BUTTONS = ["A", "B", "X", "Y"];
  const ACTIONS = ["jump", "dash", "attack"];
  const DEFAULT = { bgm: 10, voice: 10, sfx: 10, buttons: { A: "jump", B: "dash", X: "attack", Y: "attack" } };
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
      for (const b of BUTTONS) if (!ACTIONS.includes(d.buttons[b])) d.buttons[b] = DEFAULT.buttons[b];
      return d;
    } catch (_) {
      return fresh();
    }
  }

  let data = load();

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (_) {}
  }

  // 0〜10 → 音量の倍率
  const level = k => data[k] / 10;

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

  // ボタンの役目をかえる。ジャンプとダッシュは、どこかのボタンにかならず残す
  function setButton(button, action) {
    const old = data.buttons[button];
    if (old === action) return;
    data.buttons[button] = action;
    if (action !== "attack") {
      for (const other of BUTTONS) {
        if (other !== button && data.buttons[other] === action) data.buttons[other] = old;
      }
    }
    if (old !== "attack" && !BUTTONS.some(b => data.buttons[b] === old)) {
      const giver = ["Y", "X", "B", "A"].find(b => b !== button && data.buttons[b] === "attack");
      if (giver) data.buttons[giver] = old;
    }
    if (!BUTTONS.some(b => data.buttons[b] === "attack")) {
      const giver = ["Y", "X"].find(b => b !== button);
      data.buttons[giver] = "attack";
    }
    save();
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
    BUTTONS, ACTIONS, level, mapCode, padActions, setButton, cycleButton, setLevel, reset, actionLabel, save
  };
})();

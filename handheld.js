// 携帯ゲーム機ふうレイアウト（スマホ・タブレットのたて持ち）と、タッチ操作・端末の自動判定
(() => {
  "use strict";

  // 本体画像（898 x 1752）の中の位置。単位はすべて元画像のピクセル
  const SRC = {
    W: 898,
    HOLE_T: 123, // 画面の穴までの上の余白
    HOLE_B: 65, // 画面の穴の下〜枠画像の下端
    HOLE_W: 729,
    HUD: 46,
    CTRL_H: 716,
    OVERLAP: 4,
    CROP_TOP: 54, // せまい画面では上下のかざり部分を画面外に出してよい量
    CROP_BOTTOM: 48
  };
  const CROP_MAX = SRC.CROP_TOP + SRC.CROP_BOTTOM;
  const FIXED = SRC.HOLE_T + (SRC.HOLE_W * 9) / 16 + SRC.HUD + SRC.HOLE_B + SRC.CTRL_H - SRC.OVERLAP;
  const BLEED = 1.0; // 本体の横はばを画面の横はばにぴったり合わせる（左右が見切れないように）
  const COMM_MIN = 120; // 会話だけ出せる高さ
  const COMM_FULL = 236; // 会話＋そうび中の武器を出せる高さ
  const COMM_TARGET = 200;

  const shell = document.querySelector(".shell");
  const controls = document.querySelector(".touch-controls");
  const dpad = document.querySelector(".touch-dpad");
  const actions = document.querySelector(".touch-actions");
  const guide = document.querySelector("#gbGuide");
  const statusText = document.querySelector("#gbStatusText");
  const statusBattery = document.querySelector("#gbBattery");
  const statusFill = document.querySelector("#gbBatteryFill");
  const statusWifi = document.querySelector("#gbWifi");

  let isActive = false;
  let commSrc = 0;

  // ---------- 端末の判定 ----------
  function autoDetect() {
    const ua = navigator.userAgent || "";
    const mq = query => Boolean(window.matchMedia && window.matchMedia(query).matches);
    const touchPoints = navigator.maxTouchPoints || 0;
    if (/iPad/.test(ua) || (navigator.platform === "MacIntel" && touchPoints > 1)) return "ipad";
    if (/iPhone|iPod/.test(ua)) return "iphone";
    const android = /Android/i.test(ua);
    const touch = mq("(pointer: coarse)") || android || (touchPoints > 0 && !mq("(hover: hover) and (pointer: fine)"));
    if (!touch) return "pc";
    if (android && !/Mobile/i.test(ua)) return "ipad";
    return Math.min(screen.width, screen.height) >= 600 ? "ipad" : "iphone";
  }

  function manualMode() {
    try {
      const saved = sessionStorage.getItem("pyonpControlModeManual");
      return saved === "iphone" || saved === "ipad" || saved === "pc" ? saved : "";
    } catch (_) {
      return "";
    }
  }

  function detect() {
    return manualMode() || autoDetect();
  }

  function rememberManual(mode) {
    try {
      sessionStorage.setItem("pyonpControlModeManual", mode);
    } catch (_) {}
  }

  // ---------- レイアウト ----------
  const safeProbe = document.createElement("div");
  safeProbe.style.cssText = "position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;"
    + "padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);";
  document.body.appendChild(safeProbe);

  function safeArea() {
    const cs = getComputedStyle(safeProbe);
    const n = v => parseFloat(v) || 0;
    return { t: n(cs.paddingTop), r: n(cs.paddingRight), b: n(cs.paddingBottom), l: n(cs.paddingLeft) };
  }

  // ページが使える高さ。iPhone のホーム画面アプリでは画面の下はしの帯に描けないので、
  // 画面そのものの高さではなく、ページに渡された高さに収める
  function fullHeight() {
    return Math.max(window.innerHeight, document.documentElement.clientHeight || 0);
  }

  function layout() {
    if (!shell) return;
    const safe = safeArea();
    const availW = window.innerWidth - safe.l - safe.r;
    // 本体の上のかざりはステータスバーの下、下のかざりはホームバーの下に入ってもよい
    const uGuess = (availW * BLEED) / SRC.W;
    const underTop = Math.min(safe.t, (SRC.HOLE_T - 30) * uGuess);
    // 下のかざりはホームバーの下まで入れて、本体を画面の下はしまでのばす
    const underBottom = safe.b;
    const viewH = fullHeight();
    const availH = viewH - safe.t - safe.b + underTop + underBottom;
    const mobile = document.body.dataset.controlMode === "mobile";
    isActive = mobile && availH > availW * 1.05;
    document.body.dataset.layout = isActive ? "handheld" : "classic";
    if (!isActive) {
      commSrc = 0;
      delete document.body.dataset.commSize;
      for (const name of ["--u", "--gb-x", "--gb-y", "--gb-screen-h"]) shell.style.removeProperty(name);
      return;
    }

    const uWide = (availW * BLEED) / SRC.W; // 横幅いっぱいに使ったときの倍率
    const uShort = availH / (FIXED - CROP_MAX); // 会話パネルなしで高さに収まる最大の倍率
    let u;
    let comm;
    let crop;
    if (uShort >= uWide) {
      // スマホ：横幅で大きさが決まる。あまった高さを会話パネルに回す
      u = uWide;
      const free = availH / u - FIXED;
      // あまった高さはぜんぶ会話パネルに回して、下にすき間を作らない
      crop = Math.min(CROP_MAX, Math.max(0, COMM_TARGET - free));
      comm = free + crop;
      if (comm < COMM_MIN) {
        comm = 0;
        crop = Math.max(0, -free);
      }
    } else if (availW < 600) {
      // スマホで高さが足りない：ゲーム画面の大きさを優先して会話パネルはなし
      u = uShort;
      comm = 0;
      crop = CROP_MAX;
    } else {
      // タブレットなど：高さに合わせて本体ごと小さくして、会話パネルも出す
      u = availH / (FIXED + COMM_TARGET);
      comm = COMM_TARGET;
      crop = 0;
    }

    commSrc = comm;
    const total = (FIXED + comm) * u;
    const visible = total - crop * u;
    const cropTop = crop * (SRC.CROP_TOP / CROP_MAX);
    const x = safe.l + (availW - SRC.W * u) / 2;
    const y = safe.t - underTop + Math.max(0, availH - visible) / 2 - cropTop * u;
    const screenH = (SRC.HOLE_T + (SRC.HOLE_W * 9) / 16 + SRC.HUD + comm + SRC.HOLE_B) * u;
    shell.style.setProperty("--u", `${u}px`);
    shell.style.setProperty("--gb-x", `${x}px`);
    shell.style.setProperty("--gb-y", `${y}px`);
    shell.style.setProperty("--gb-screen-h", `${screenH}px`);
    document.body.dataset.comm = comm > 0 ? "on" : "off";
    document.body.dataset.commSize = comm >= COMM_FULL ? "full" : "chat";
  }

  // ---------- ダブルタップ・ピンチでのズームを止める ----------
  for (const name of ["gesturestart", "gesturechange", "gestureend", "dblclick"]) {
    document.addEventListener(name, event => event.preventDefault(), { passive: false });
  }
  let lastTouchEnd = 0;
  document.addEventListener("touchend", event => {
    const now = Date.now();
    const quick = now - lastTouchEnd < 350;
    lastTouchEnd = now;
    // 2回目のすばやいタップがズームにならないようにする（ボタンはそのまま押せる）
    if (quick && !event.target.closest?.("button, a, input, select, textarea")) event.preventDefault();
  }, { passive: false });

  // ---------- ボタン入力 ----------
  // iPhone で長押しすると出る虫めがね（ルーペ）や文字選択を止める。ボタンは pointer イベントで動く
  if (controls) controls.addEventListener("touchstart", event => event.preventDefault(), { passive: false });

  function press(code) {
    if (typeof pressTouchControl === "function") pressTouchControl(code);
  }

  function release(code) {
    if (typeof releaseTouchControl === "function") releaseTouchControl(code);
  }

  function buzz() {
    try {
      if (navigator.vibrate) navigator.vibrate(8);
    } catch (_) {}
  }

  // SELECT / START / L / R：ひとつずつ押すボタン
  for (const button of document.querySelectorAll(".touch-small, .touch-shoulder")) {
    const code = button.dataset.key;
    let pointer = null;
    button.addEventListener("pointerdown", event => {
      event.preventDefault();
      if (pointer !== null) return;
      pointer = event.pointerId;
      try {
        button.setPointerCapture(pointer);
      } catch (_) {}
      button.classList.add("is-pressed");
      buzz();
      press(code);
    });
    const up = event => {
      if (event.pointerId !== pointer) return;
      event.preventDefault();
      pointer = null;
      button.classList.remove("is-pressed");
      release(code);
    };
    button.addEventListener("pointerup", up);
    button.addEventListener("pointercancel", up);
  }

  // 十字キー：指をすべらせて向きを変えられる
  const DPAD_KEYS = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
  const dpadButtons = {};
  if (dpad) {
    for (const code of DPAD_KEYS) dpadButtons[code] = dpad.querySelector(`[data-key="${code}"]`);
    const held = new Set();
    let pointer = null;

    const apply = dirs => {
      let pressedNew = false;
      for (const code of DPAD_KEYS) {
        const want = dirs.has(code);
        if (want && !held.has(code)) {
          held.add(code);
          dpadButtons[code]?.classList.add("is-pressed");
          press(code);
          pressedNew = true;
        } else if (!want && held.has(code)) {
          held.delete(code);
          dpadButtons[code]?.classList.remove("is-pressed");
          release(code);
        }
      }
      if (pressedNew) buzz();
      const rx = held.has("ArrowUp") ? 1 : held.has("ArrowDown") ? -1 : 0;
      const ry = held.has("ArrowRight") ? 1 : held.has("ArrowLeft") ? -1 : 0;
      dpad.style.setProperty("--rx", `${rx * 11}deg`);
      dpad.style.setProperty("--ry", `${ry * 11}deg`);
      dpad.classList.toggle("is-pressed", held.size > 0);
    };

    const dirsAt = event => {
      const rect = dpad.getBoundingClientRect();
      const dx = event.clientX - (rect.left + rect.width / 2);
      const dy = event.clientY - (rect.top + rect.height / 2);
      const dirs = new Set();
      if (Math.hypot(dx, dy) < rect.width * 0.09) return dirs;
      const ax = Math.abs(dx);
      const ay = Math.abs(dy);
      // 左右を広めに、ななめはせまめに（うっかりジャンプを減らす）
      if (ax >= ay * 0.6) dirs.add(dx < 0 ? "ArrowLeft" : "ArrowRight");
      if (ay >= ax) dirs.add(dy < 0 ? "ArrowUp" : "ArrowDown");
      return dirs;
    };

    dpad.addEventListener("pointerdown", event => {
      event.preventDefault();
      if (pointer !== null) return;
      pointer = event.pointerId;
      try {
        dpad.setPointerCapture(pointer);
      } catch (_) {}
      apply(dirsAt(event));
    });
    dpad.addEventListener("pointermove", event => {
      if (event.pointerId !== pointer) return;
      event.preventDefault();
      apply(dirsAt(event));
    });
    const up = event => {
      if (event.pointerId !== pointer) return;
      event.preventDefault();
      pointer = null;
      apply(new Set());
    };
    dpad.addEventListener("pointerup", up);
    dpad.addEventListener("pointercancel", up);
  }

  // A / B / X / Y：となり合う2つを親指1本で同時に押せる（ダッシュしながらジャンプ）
  if (actions) {
    const buttons = [...actions.querySelectorAll("[data-key]")];
    const pointers = new Map();
    const held = new Set();
    let centers = [];
    let spacing = 1;

    const measure = () => {
      centers = buttons.map(button => {
        const r = button.getBoundingClientRect();
        return { button, code: button.dataset.key, x: r.left + r.width / 2, y: r.top + r.height / 2 };
      });
      spacing = Infinity;
      for (let i = 0; i < centers.length; i++) {
        for (let j = i + 1; j < centers.length; j++) {
          spacing = Math.min(spacing, Math.hypot(centers[i].x - centers[j].x, centers[i].y - centers[j].y));
        }
      }
      if (!Number.isFinite(spacing) || spacing <= 0) spacing = 1;
    };

    const buttonsAt = event => {
      const hit = new Set();
      let nearest = null;
      let nearestD = Infinity;
      for (const c of centers) {
        const d = Math.hypot(event.clientX - c.x, event.clientY - c.y);
        if (d <= spacing * 0.62) hit.add(c.button);
        if (d < nearestD) {
          nearestD = d;
          nearest = c.button;
        }
      }
      if (!hit.size && nearest && nearestD <= spacing * 1.25) hit.add(nearest);
      return hit;
    };

    const apply = () => {
      const want = new Set();
      for (const set of pointers.values()) for (const button of set) want.add(button);
      let pressedNew = false;
      for (const button of buttons) {
        if (want.has(button) && !held.has(button)) {
          held.add(button);
          button.classList.add("is-pressed");
          press(button.dataset.key);
          pressedNew = true;
        } else if (!want.has(button) && held.has(button)) {
          held.delete(button);
          button.classList.remove("is-pressed");
          release(button.dataset.key);
        }
      }
      if (pressedNew) buzz();
    };

    actions.addEventListener("pointerdown", event => {
      event.preventDefault();
      if (!pointers.size) measure();
      try {
        actions.setPointerCapture(event.pointerId);
      } catch (_) {}
      pointers.set(event.pointerId, buttonsAt(event));
      apply();
    });
    actions.addEventListener("pointermove", event => {
      if (!pointers.has(event.pointerId)) return;
      event.preventDefault();
      pointers.set(event.pointerId, buttonsAt(event));
      apply();
    });
    const up = event => {
      if (!pointers.has(event.pointerId)) return;
      event.preventDefault();
      pointers.delete(event.pointerId);
      apply();
    };
    actions.addEventListener("pointerup", up);
    actions.addEventListener("pointercancel", up);
  }

  // ---------- 下の小窓（電池・時計・通信） ----------
  let battery = null;

  function clockText() {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  }

  function renderStatus() {
    if (!statusText) return;
    if (battery) {
      const pct = Math.round(battery.level * 100);
      statusText.textContent = `${pct}%`;
      if (statusBattery) {
        statusBattery.hidden = false;
        statusBattery.classList.toggle("is-low", pct <= 20 && !battery.charging);
        statusBattery.classList.toggle("is-charging", battery.charging);
      }
      if (statusFill) statusFill.style.width = `${Math.max(6, pct)}%`;
    } else {
      // 電池残量を取れないブラウザ（iPhone など）では時計を出す
      statusText.textContent = clockText();
      if (statusBattery) statusBattery.hidden = true;
    }
    if (statusWifi) statusWifi.classList.toggle("is-off", navigator.onLine === false);
  }

  if (navigator.getBattery) {
    navigator.getBattery().then(found => {
      battery = found;
      battery.addEventListener("levelchange", renderStatus);
      battery.addEventListener("chargingchange", renderStatus);
      renderStatus();
    }).catch(() => {});
  }
  window.addEventListener("online", renderStatus);
  window.addEventListener("offline", renderStatus);
  setInterval(renderStatus, 20000);
  renderStatus();

  // ---------- ことば ----------
  function refresh() {
    const ja = typeof language === "undefined" || language === "ja";
    if (guide) {
      const chip = (cls, label) => `<b class="gb-chip ${cls}">${label}</b>`;
      guide.innerHTML = `
        <div class="gb-guide-title">
          <span>${chip("a", "A")}${ja ? "ジャンプ" : "Jump"}</span>
          <span>${chip("b", "B")}${ja ? "ダッシュ" : "Dash"}</span>
          <span>${chip("x", "X")}${chip("y", "Y")}${ja ? "こうげき" : "Shoot"}</span>
          <span>${chip("pill", "SELECT")}${ja ? "そうび・合成" : "Equip / Fuse"}</span>
          <span>${chip("pill", "START")}${ja ? "ポーズ" : "Pause"}</span>
        </div>
        <div class="gb-guide-story">
          <span>${chip("a", "A")}${ja ? "または画面タップで つぎへ" : "or tap the screen to continue"}</span>
        </div>`;
    }
    const labels = ja ? { iphone: "スマホ", ipad: "タブレット", pc: "PC" } : { iphone: "Phone", ipad: "Tablet", pc: "PC" };
    for (const button of document.querySelectorAll("button[data-control-mode]")) {
      button.textContent = labels[button.dataset.controlMode] ?? button.textContent;
    }
  }

  window.addEventListener("resize", layout);
  // ホーム画面から開いたとき、最初の画面の高さがあとから変わることがあるので測りなおす
  window.addEventListener("load", () => { layout(); setTimeout(layout, 400); setTimeout(layout, 1200); });
  window.addEventListener("pageshow", () => setTimeout(layout, 100));
  window.addEventListener("orientationchange", () => setTimeout(layout, 250));
  window.visualViewport?.addEventListener("resize", layout);
  document.addEventListener("fullscreenchange", () => setTimeout(layout, 120));

  window.Handheld = {
    detect,
    rememberManual,
    layout,
    refresh,
    active: () => isActive,
    commOn: () => commSrc > 0
  };
})();

// trial.js — 体験版のおわり：マンタクイーン（星の海のボス）をたおしたら
//   「体験版はここまで / COMING SOON」と、感想フォーム（作者にとどく）を出す。
// 体験版のあいだは、星の海のボスより先のステージは開かない（lastPlayableCourse）。
// game.js より前に読み込む（game.js のグローバルは呼び出し時に使う）
const TRIAL_EDITION = true;
const TRIAL_LAST_WORLD = 3; // 星の海（マンタクイーン）まで

// 体験版で遊べる、いちばん最後のステージ（courses の番号）
function lastPlayableCourse() {
  if (!TRIAL_EDITION) return courses.length - 1;
  const next = courses.findIndex(c => c.worldIndex > TRIAL_LAST_WORLD);
  return next < 0 ? courses.length - 1 : next - 1;
}

(() => {
  "use strict";

  // 感想のとどけ先（ムーニアンズ公式サイトのお仕事フォームと同じ Zapier。作者にとどく）
  const ENDPOINT = "https://hooks.zapier.com/hooks/catch/27045252/45sqdoq/";

  const TEXT = {
    ja: {
      badge: "体験版",
      title: "体験版はここまで！",
      thanks: "マンタクイーンまで あそんでくれて、ほんとうにありがとう！",
      soonHead: "COMING SOON",
      soon: "ロボットキングのリングメカ工場、そして魔王星へ……。\nぴょんぴーの冒険のつづきは、ただいま制作中！ 楽しみに待っててね。",
      pyon: "つづきも、ぜったい あそんでな！ 待っとるけんな！",
      formHead: "あなたの感想を聞かせてください",
      formLead: "いただいた意見を参考に、このあとの続きを作ったり、今のステージを改善したりしていきます。ひとことでも、うれしいです！",
      name: "ニックネーム",
      any: "なくてもOK",
      fun: "たのしかった？",
      good: "よかったところ・好きなところ",
      goodPh: "例：ボスがかわいかった、武器の合成がたのしい など",
      bad: "むずかしかった・直してほしいところ",
      badPh: "例：〇-〇 がむずかしすぎた、ここが分かりにくかった など",
      other: "そのほか（ほしい機能・見つけたバグ など）",
      send: "感想を送る",
      sending: "送っています…",
      sent: "とどきました！ ありがとう！\nつづきを楽しみに待っててね。",
      empty: "どれか1つ、書いてね（星だけでもOK）",
      fail: "送れませんでした。電波のよいところで、もう一度ためしてね。",
      map: "マップにもどる",
      toTitle: "タイトルにもどる"
    },
    en: {
      badge: "DEMO",
      title: "That's the end of the demo!",
      thanks: "Thank you so much for playing all the way to the Manta Queen!",
      soonHead: "COMING SOON",
      soon: "On to the Robot King's Ring Mecha Factory, and then the Demon Star...\nThe rest of Pyon-P's adventure is in the works. Stay tuned!",
      pyon: "Play the rest too, OK? I'll be waiting!",
      formHead: "Tell us what you thought",
      formLead: "Your feedback will shape the rest of the game and help improve the stages you just played. Even one line helps!",
      name: "Nickname",
      any: "optional",
      fun: "Was it fun?",
      good: "What you liked",
      goodPh: "e.g. the bosses were cute, weapon fusion is fun",
      bad: "What was too hard / what should change",
      badPh: "e.g. stage X-X was too hard, this part was confusing",
      other: "Anything else (wishes, bugs you found...)",
      send: "Send feedback",
      sending: "Sending...",
      sent: "Got it! Thank you!\nLook forward to the rest of the adventure.",
      empty: "Please write something (or just pick the stars).",
      fail: "Couldn't send. Please try again with a better connection.",
      map: "Back to Map",
      toTitle: "Back to Title"
    }
  };
  const tx = () => TEXT[typeof language !== "undefined" && language === "en" ? "en" : "ja"];

  let root = null;
  let stars = 0;
  let opened = 0;

  function build() {
    const T = tx();
    root?.remove();
    root = document.createElement("div");
    root.id = "trialEnd";
    root.className = "trial-end";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-label", T.title);
    root.innerHTML = `
      <div class="trial-card">
        <div class="trial-left">
        <span class="trial-badge">${T.badge}</span>
        <h1 class="trial-title">${T.title}</h1>
        <p class="trial-thanks">${T.thanks}</p>
        <div class="trial-soon">
          <div class="trial-soon-head">★ ${T.soonHead} ★</div>
          <p>${T.soon.replace(/\n/g, "<br>")}</p>
          <div class="trial-pyon">
            <img src="assets/avatar-pyonpy.webp" alt="">
            <span>${T.pyon}</span>
          </div>
        </div>
        <div class="trial-actions">
          <button type="button" class="trial-map">${T.map}</button>
          <button type="button" class="trial-title-btn">${T.toTitle}</button>
        </div>
        </div>
        <form class="trial-form" novalidate>
          <h2>${T.formHead}</h2>
          <p class="trial-lead">${T.formLead}</p>
          <label>${T.name}<em>${T.any}</em><input name="nickname" maxlength="40" autocomplete="nickname"></label>
          <div class="trial-fun"><span>${T.fun}</span><div class="trial-stars" role="radiogroup" aria-label="${T.fun}">
            ${[1, 2, 3, 4, 5].map(n => `<button type="button" data-star="${n}" role="radio" aria-checked="false" aria-label="${n}">★</button>`).join("")}
          </div></div>
          <label>${T.good}<em>${T.any}</em><textarea name="good" maxlength="2000" rows="2" placeholder="${T.goodPh}"></textarea></label>
          <label>${T.bad}<em>${T.any}</em><textarea name="bad" maxlength="2000" rows="2" placeholder="${T.badPh}"></textarea></label>
          <label>${T.other}<em>${T.any}</em><textarea name="other" maxlength="2000" rows="2"></textarea></label>
          <label class="trial-trap" aria-hidden="true">website<input name="website" tabindex="-1" autocomplete="off"></label>
          <button class="trial-send" type="submit">${T.send}</button>
          <p class="trial-result" role="status" hidden></p>
        </form>
      </div>`;
    // スマホでは、ゲーム画面が小さくて書きにくいので、画面いっぱいに出す
    const mobile = document.body.dataset.controlMode === "mobile";
    root.classList.toggle("trial-full", mobile);
    (mobile ? document.body : document.querySelector(".game-wrap") ?? document.body).appendChild(root);

    // 入力中のキーを、ゲームにわたさない（スペースでジャンプ…などを防ぐ）
    for (const type of ["keydown", "keyup"]) root.addEventListener(type, e => e.stopPropagation());
    root.querySelectorAll("[data-star]").forEach(b => b.addEventListener("click", () => setStars(+b.dataset.star)));
    root.querySelector("form").addEventListener("submit", send);
    root.querySelector(".trial-map").addEventListener("click", () => close("map"));
    root.querySelector(".trial-title-btn").addEventListener("click", () => close("title"));
    setStars(stars);
  }

  function setStars(n) {
    stars = n;
    root?.querySelectorAll("[data-star]").forEach(b => {
      const on = +b.dataset.star <= n;
      b.classList.toggle("on", on);
      b.setAttribute("aria-checked", String(+b.dataset.star === n));
    });
    if (n && typeof playSfx === "function") playSfx("decide");
  }

  function result(text, ok) {
    const r = root.querySelector(".trial-result");
    r.innerHTML = text.replace(/\n/g, "<br>");
    r.classList.toggle("ok", ok);
    r.hidden = false;
  }

  function send(event) {
    event.preventDefault();
    const T = tx();
    const form = root.querySelector("form");
    const data = new FormData(form);
    const get = k => String(data.get(k) ?? "").trim();
    if (get("website") || Date.now() - opened < 2500) return; // ロボットよけ
    if (!stars && !get("good") && !get("bad") && !get("other")) { result(T.empty, false); return; }
    const device = typeof controlMode !== "undefined" ? controlMode : (document.body.dataset.controlMode ?? "");
    const version = typeof GAME_VERSION !== "undefined" ? `Ver.1(${(GAME_VERSION / 100).toFixed(2)})` : "";
    const message = [
      `【たのしかった】${stars ? "★".repeat(stars) + "☆".repeat(5 - stars) + `（${stars}/5）` : "えらばれていません"}`,
      `【よかったところ】\n${get("good") || "—"}`,
      `【むずかしかった・直してほしいところ】\n${get("bad") || "—"}`,
      `【そのほか】\n${get("other") || "—"}`,
      `――\nバージョン: ${version} / 端末: ${device} / 言語: ${typeof language !== "undefined" ? language : ""}`,
      `ブラウザ: ${navigator.userAgent}`
    ].join("\n\n");
    // ムーニアンズ公式のフォームと同じ名前の欄で送る（とどくメールの形をそろえる）
    const body = new URLSearchParams();
    body.append("name", get("nickname") || "（ニックネームなし）");
    body.append("email", "");
    body.append("kind", "ぴょんぴーの大冒険 体験版の感想");
    body.append("message", message);
    body.append("fun", String(stars));
    body.append("good", get("good"));
    body.append("bad", get("bad"));
    body.append("other", get("other"));
    body.append("version", version);
    body.append("device", device);
    body.append("page", location.href);
    body.append("sent_at", new Date().toISOString());
    const button = root.querySelector(".trial-send");
    button.disabled = true;
    button.textContent = T.sending;
    fetch(ENDPOINT, { method: "POST", mode: "no-cors", body }).then(() => {
      form.querySelectorAll("input, textarea, [data-star]").forEach(el => { el.disabled = true; });
      button.textContent = "✓";
      result(T.sent, true);
      try { Story.data.seen.trialFeedbackSent = true; Story.persist(); } catch (_) {}
      if (typeof playSfx === "function") playSfx("stageClear");
    }).catch(() => {
      button.disabled = false;
      button.textContent = T.send;
      result(T.fail, false);
    });
  }

  function open() {
    stars = 0;
    opened = Date.now();
    build();
    try { Story.data.seen.trialEndSeen = true; Story.persist(); } catch (_) {}
    if (typeof Voice !== "undefined") Voice.stop?.();
  }

  function close(to) {
    if (!root) return;
    if (typeof playSfx === "function") playSfx("decide");
    root.remove();
    root = null;
    if (to === "title" && typeof Story !== "undefined") {
      FX.startTransition({ type: "fade", dur: 0.6, onMid: () => { Story.returnToTitle(); lastTime = performance.now(); } });
    } else lastTime = performance.now();
  }

  // 体験版のおわり（星の海のボスをクリアしたあと）かどうか
  const isTrialEnd = courseIndex => TRIAL_EDITION && courses[courseIndex]?.bossStage && courses[courseIndex]?.worldIndex === TRIAL_LAST_WORLD;

  window.TrialEnd = { open, close, isOpen: () => !!root, isTrialEnd };
})();

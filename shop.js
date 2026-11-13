// shop.js — よろず屋「つきのわ」：集めたルナコインで便利アイテムを買う
// game.js より前に読み込む。game.js のグローバルは呼び出し時に参照する。
(() => {
  "use strict";

  const L = (ja, en) => (language === "ja" ? ja : en);
  const UNLOCK_COURSE = 4; // 1-4 までクリアして、1-5 が開くと開店（マップの月あめのお店が出るとき）

  // price は「ルナコイン何枚」か。from は「ステージがいくつ開いたら店にならぶか」（なければ最初から）
  const ITEMS = [
    { id: "manju", from: 0, price: 20, repeat: true, color: "#c8a2e8", mark: "🍇", file: "item-budou-manju",
      ja: ["ぶどうまんじゅう", "ぴょんぴーの大好物。かばんに入れておいて、好きなときに食べるとライフとHPが満タン。何度でも買える。"],
      en: ["Grape Manju", "Pyon-P's favorite treat. Keep it in your bag and eat it any time to fully restore lives and HP."] },
    { id: "double", from: 0, price: 200, color: "#d9ffd6", mark: "✦",
      ja: ["2段ジャンプシューズ", "空中でもう1回ジャンプできる。空ルートもらくらく。"],
      en: ["Double-Jump Shoes", "Jump once more in mid-air. Sky routes become a breeze."] },
    { id: "cushion", from: 0, price: 80, color: "#ffd1ed", mark: "☁",
      ja: ["ふわふわクッション", "ダメージを受けたあとの無敵時間が2倍になる。"],
      en: ["Fluffy Cushion", "Doubles your invincibility time after taking a hit."] },
    { id: "magnet", from: 5, price: 120, color: "#9ee8ff", mark: "U",
      ja: ["コインじしゃく", "近くのルナコインが勝手に集まってくる。"],
      en: ["Coin Magnet", "Nearby Luna Coins fly to you on their own."] },
    { id: "strap", from: 8, price: 160, color: "#c8b2ff", mark: "∞",
      ja: ["ぜったいはなさんストラップ", "敵に光線銃をうばわれなくなる。"],
      en: ["Never-Let-Go Strap", "Enemies can no longer steal your ray gun."] },
    { id: "key", from: 12, price: 200, color: "#ffd85a", mark: "♪",
      ja: ["あいかぎ", "どのステージも、カギを1本持った状態で始まる。"],
      en: ["Spare Key", "Start every stage already holding one key."] },
    { id: "boots", from: 17, price: 300, color: "#ff8db7", mark: "▼",
      ja: ["ふつうのゲームのくつ", "ふむだけで敵を倒せる。そう、ふつうのゲームみたいに。"],
      en: ["Normal-Game Boots", "Stomping actually beats enemies. You know, like in a normal game."] },
    { id: "statue", from: 24, price: 1999, color: "#fff3a4", mark: "★",
      ja: ["黄金のぶどうまんじゅう像", "とくに効果はない。でも、すごい。"],
      en: ["Golden Grape Manju Statue", "Does nothing in particular. But it is magnificent."] },
    // ---- そのワールドのステージの中のお店でしか買えない ----
    { id: "moonJump", from: 5, world: 0, price: 120, color: "#fff3a4", mark: "☾",
      ja: ["月あめジャンプ", "ジャンプが少し高くなる。月あめのふわふわパワー。"],
      en: ["Moon Candy Jump", "Your jumps go a little higher. Fluffy moon-candy power."] },
    { id: "charm", from: 5, world: 0, price: 300, color: "#ffd1ed", mark: "♥",
      ja: ["うさみみお守り", "ステージで1回だけ、やられてもその場で復活できる。"],
      en: ["Bunny-Ear Charm", "Once per stage, get back up on the spot instead of going down."] },
    { id: "heatCape", world: 1, price: 200, color: "#ff9a6b", mark: "♨",
      ja: ["たいねつマント", "マグマとふん石のダメージが半分になる。"],
      en: ["Heatproof Cape", "Halves damage from lava and falling rocks."] },
    { id: "drill", world: 1, price: 400, color: "#ffcf73", mark: "⚒",
      ja: ["火星ドリル", "アイテムブロックの中身が2つ出てくる。"],
      en: ["Mars Drill", "Item blocks give you two of what's inside."] },
    { id: "spikeShoes", world: 2, price: 240, color: "#c6fff4", mark: "❄",
      ja: ["スパイクシューズ", "氷の上でもすべらない。"],
      en: ["Spike Shoes", "No more slipping on ice."] },
    { id: "iceShield", world: 2, price: 440, color: "#9ee8ff", mark: "◇",
      ja: ["こおりのたて", "ステージで1回だけ、敵の弾をふせぐ。"],
      en: ["Ice Shield", "Blocks one enemy shot per stage."] },
    { id: "tank", world: 3, price: 300, color: "#bff8ff", mark: "O₂",
      ja: ["大きな酸素タンク", "水の中で、酸素が2倍長もちする。"],
      en: ["Big Oxygen Tank", "Your oxygen lasts twice as long underwater."] },
    { id: "fins", world: 3, price: 500, color: "#7fd8ff", mark: "≈",
      ja: ["ひれ", "泳ぐのが速くなる。"],
      en: ["Swim Fins", "You swim faster."] },
    { id: "helmet", world: 4, price: 360, color: "#ffc67a", mark: "⛑",
      ja: ["ヘルメット", "トロッコの頭の上のはりに当たってもへいき。"],
      en: ["Hard Hat", "Mine-cart beams can't hurt you anymore."] },
    { id: "booster", world: 4, price: 600, color: "#ff8db7", mark: "»",
      ja: ["ロケットブースター", "ダッシュが速くなる。"],
      en: ["Rocket Booster", "Your dash gets faster."] },
    { id: "rod", world: 5, price: 500, color: "#d7c8ff", mark: "ϟ",
      ja: ["ひらいしん", "雷が当たらなくなる。"],
      en: ["Lightning Rod", "Lightning can't hit you anymore."] },
    { id: "kingCape", world: 5, price: 800, color: "#ff3d7f", mark: "♛",
      ja: ["王さまのマント", "受けるダメージが半分になる。"],
      en: ["Royal Cape", "Halves the damage you take."] }
  ];

  const art = {};
  const load = (key, file) => {
    const im = new Image();
    im.src = `assets/${file}.png`;
    art[key] = im;
  };
  load("keeper", "shop-keeper");
  load("bg", "shop-bg");
  for (const it of ITEMS) load(it.id, it.file ?? `shop-item-${it.id}`);
  const ok = im => im && im.complete && im.naturalWidth > 0;

  let sel = 0;
  let t = 0;
  let line = null;
  let lineT = 0;

  const owned = () => {
    const d = Story.data;
    if (!d.shop || typeof d.shop !== "object") d.shop = {};
    return d.shop;
  };
  // 買った道具は「つけている」ときだけ効く。そうびの欄で、はずしたり つけなおしたりできる
  const offMap = () => {
    const d = Story.data;
    if (!d.shopOff || typeof d.shopOff !== "object") d.shopOff = {};
    return d.shopOff;
  };
  const owns = id => typeof Story !== "undefined" && !!owned()[id];
  const has = id => owns(id) && !offMap()[id];
  const MANJU_MAX = 9;
  const manjuCount = () => (typeof Story !== "undefined" ? Math.max(0, Story.data.manjuStock | 0) : 0);
  // そうびの欄にならべる道具（買ったもの。まんじゅうと金の像はのぞく）
  const gearList = () => ITEMS.filter(it => it.id !== "manju" && it.id !== "statue" && owns(it.id));
  function toggleGear(id) {
    if (!owns(id)) return null;
    const off = offMap();
    if (off[id]) delete off[id];
    else off[id] = true;
    Story.persist();
    return !off[id];
  }
  // かばんのぶどうまんじゅうを1つ食べる（ステージの中・そうび画面・ポーズ中）
  function useManju() {
    if (manjuCount() <= 0 || !state || !["playing", "inventory", "paused"].includes(state.mode)) return false;
    if (state.lives >= MAX_LIVES && state.hp >= MAX_HP) return "full";
    Story.data.manjuStock = manjuCount() - 1;
    Story.persist();
    const p = state.player;
    eatBudouManju({ x: p.x, y: p.y, w: p.w, h: p.h });
    return true;
  }
  const itemName = id => { const it = ITEMS.find(x => x.id === id); return it ? L(it.ja[0], it.en[0]) : id; };
  const itemDesc = id => { const it = ITEMS.find(x => x.id === id); return it ? L(it.ja[1], it.en[1]) : ""; };
  const itemIcon = id => { const it = ITEMS.find(x => x.id === id); return `assets/${it?.file ?? `shop-item-${id}`}.png`; };
  const unlocked = () => unlockedCourse >= UNLOCK_COURSE;

  function wallet() {
    if (!campaignKeep) campaignKeep = campaignSnapshotFromState();
    return campaignKeep;
  }
  // ルナコインの枚数（前のセーブの柿の種とピーナッツは、合わせてルナコインにする）
  const pairs = () => { mergeOldSnacks(wallet()); return wallet().kakiTotal ?? 0; };

  function say(ja, en) {
    line = [ja, en];
    lineT = 0;
  }

  // ならぶ商品：どこでも買える物 ＋（ステージの中のお店なら）そのワールドだけの物
  let shopWorld = null;
  let inStage = null;
  // ステージが進むほど、品ぞろえがふえる
  const stock = () => ITEMS.filter(it => (it.world === undefined || it.world === shopWorld) && unlockedCourse >= (it.from ?? 0));

  // ステージの中のよろず屋：いまの持ち物でお買い物して、終わったらステージにもどる
  function openInStage() {
    if (state.mode !== "playing" || FX.transitioning()) return;
    inStage = { prevKeep: campaignKeep };
    campaignKeep = campaignSnapshotFromState();
    shopWorld = courses[currentCourse]?.worldIndex ?? 0;
    playSfx("decide");
    FX.startTransition({
      type: "fade", dur: 0.6,
      onMid: () => {
        state.mode = "shop";
        sel = 0;
        scroll = 0;
        tab = 0;
        page = 0;
        say("まいど〜！ ここのお店には、このあたりでしか売ってへん品もあるで。",
          "Welcome! This branch has a few things you won't find anywhere else.");
      }
    });
  }

  function open(world = null) {
    if (!unlocked() || state.mode !== "worldMap" || FX.transitioning()) return;
    shopWorld = world;
    inStage = null;
    playSfx("decide");
    FX.startTransition({
      type: "fade", dur: 0.6,
      onMid: () => {
        state.mode = "shop";
        sel = 0;
        scroll = 0;
        tab = 0;
        page = 0;
        const first = !Story.data.seen.shopVisit;
        Story.data.seen.shopVisit = true;
        // 前に来たときより品がふえていたら、それを知らせる
        const seenKey = "shopStock" + (shopWorld ?? "");
        const count = stock().length;
        const more = !first && count > (Story.data.seen[seenKey] ?? count);
        Story.data.seen[seenKey] = count;
        say(first
          ? "まいど〜！ よろず屋『つきのわ』へようこそ。お代はルナコインでいただくで。"
          : more ? "まいど〜！ 新しい品が入ったで。見てってや！" : "まいど〜！ 今日はなに買うてく？",
        first
          ? "Welcome to Tsukinowa General Store! I take payment in Luna Coins."
          : more ? "Welcome back! New stock just came in. Take a look!" : "Welcome back! What'll it be today?");
      }
    });
  }

  function close() {
    if (FX.transitioning()) return;
    playSfx("cancel");
    Story.persist();
    if (inStage) {
      const back = inStage;
      inStage = null;
      FX.startTransition({
        type: "fade", dur: 0.6,
        onMid: () => {
          // お店で使ったルナコイン・買ったまんじゅう・売った武器を、ステージの持ち物にもどす
          restoreCampaignSnapshot(campaignKeep);
          campaignKeep = back.prevKeep;
          state.mode = "playing";
          state.doorHold = true;
          updateHud();
          lastTime = performance.now();
        }
      });
      return;
    }
    FX.startTransition({ type: "fade", dur: 0.6, onMid: () => { state.mode = "worldMap"; lastTime = performance.now(); } });
  }

  function buy() {
    const it = stock()[sel];
    const w = wallet();
    if (!it.repeat && owns(it.id)) {
      playSfx("locked");
      say("それはもう持ってるで。だいじに使いや。", "You already own that one. Take good care of it.");
      return;
    }
    if (pairs() < it.price) {
      playSfx("locked");
      const lack = it.price - pairs();
      say(it.id === "statue" ? "それは夢の品や。こつこつ集めて、いつか買いに来てな。" : `あと ${lack} 枚足りへんな。ためてまた来てや。`,
        it.id === "statue" ? "That one is a dream item. Keep saving and come back someday." : `You're ${lack} coins short. Save up and come back.`);
      return;
    }
    w.kakiTotal -= it.price;
    w.peaTotal = 0;
    state.kakiTotal = w.kakiTotal;
    state.peaTotal = 0;
    if (it.id === "manju") {
      // その場で食べずに、かばんへ（そうびの欄から、好きなときに食べる）
      if (manjuCount() >= MANJU_MAX) {
        w.kakiTotal += it.price;
        state.kakiTotal = w.kakiTotal;
        playSfx("locked");
        say(`かばんがもう いっぱいや。${MANJU_MAX}個までやで。`, `Your bag is full. ${MANJU_MAX} at most.`);
        return;
      }
      Story.data.manjuStock = manjuCount() + 1;
      say(`ぶどうまんじゅう、おまち！ かばんに入れといたで（${manjuCount()}個）。`, `One Grape Manju! It's in your bag (${manjuCount()}).`);
    } else {
      owned()[it.id] = true;
      say(it.id === "statue" ? "……ほんまに買うたん！？ うちの店の家宝やで。大事にしてや！" : it.id === "boots" ? "これで、ふつうのゲームみたいに遊べるで。" : "おおきに！ ええ買いもんしたな。",
        it.id === "statue" ? "...You actually bought it!? That was the shop's treasure. Take care of it!" : it.id === "boots" ? "Now you can play it like a normal game." : "Thank you kindly! A fine purchase.");
    }
    playSfx("powerUp");
    FX.firework(canvas.width * 0.7, 250, FX.GOLD);
    FX.flash("#fff3a4", 0.25, 0.25);
    Story.persist();
  }

  // 一覧は大きな行を5つずつ見せて、のこりは上下にスクロール（スマホでも読める大きさ）
  const ROWS = 5;
  const LIST = { x: 420, y: 146, w: 800, step: 108, h: 100 };
  let scroll = 0;
  function rowRect(i) {
    return { x: LIST.x, y: LIST.y + i * LIST.step, w: LIST.w, h: LIST.h };
  }
  // スクロールの ▲▼（一覧の右）
  const arrowRect = up => ({ x: LIST.x + LIST.w + 8, y: up ? LIST.y : LIST.y + ROWS * LIST.step - 8 - 150, w: 46, h: 150 });
  function keepSelVisible(total) {
    if (sel < scroll) scroll = sel;
    if (sel >= scroll + ROWS) scroll = sel - ROWS + 1;
    scroll = Math.max(0, Math.min(scroll, Math.max(0, total - ROWS)));
  }
  // 長い説明は2行までに折りかえし、はみ出たら「…」
  function twoLines(text, maxW) {
    const out = [];
    let line = "";
    const parts = language === "ja" ? [...text] : text.split(/(\s+)/);
    let cut = false;
    for (const ch of parts) {
      if (line && ctx.measureText(line + ch).width > maxW) {
        out.push(line);
        line = ch.trimStart();
        if (out.length === 2) { cut = true; break; }
      } else line += ch;
    }
    if (!cut && line) out.push(line);
    if (cut) {
      let last = out[1];
      while (last && ctx.measureText(last + "…").width > maxW) last = [...last].slice(0, -1).join("");
      out[1] = last + "…";
    }
    return out;
  }

  // ---------- 武器を売る ----------
  // 上のタブで「買う」「売る」を切りかえる。売るとルナコインがもらえる
  let tab = 0; // 0 = 買う, 1 = 売る
  let page = 0;
  const SELL_ROWS = 5;
  const tabRect = i => ({ x: 420 + i * 270, y: 82, w: 260, h: 54 });

  // 1つ売ったときにもらえる数（月は Lv×3、星は Lv×6）
  const sellPrice = power => 2 * (power === FIGHTER_POWER ? 3000 : power >= MECH_POWER ? 200 * (power - MECH_POWER + 1) : weaponRank(power) * (weaponAttribute(power) === "star" ? 6 : 3));

  // 売れる武器の一覧（もっている武器を種類ごとにまとめる）
  function sellList() {
    const w = wallet();
    const inv = w.weaponInventory ?? [];
    const list = [];
    for (let power = 1; power <= MAX_WEAPON_POWER; power++) {
      if ((inv[power - 1] ?? 0) > 0) list.push({ power, count: inv[power - 1] });
    }
    return list;
  }

  function sellRowCount() {
    return Math.min(SELL_ROWS, Math.max(0, sellList().length - page * SELL_ROWS));
  }

  function sell() {
    const list = sellList();
    const entry = list[page * SELL_ROWS + sel];
    if (!entry) {
      playSfx("locked");
      say("売れる武器がないで。", "You have no weapons to sell.");
      return;
    }
    const w = wallet();
    // そうび中の武器が最後の1つなら売らない（手ぶらにならないように）
    if (entry.count <= 1 && w.weaponPower === entry.power && w.hasGun) {
      playSfx("locked");
      say("それはそうび中の最後の1つやろ。手ぶらになってまうで。", "That's the last one you have equipped. You'd be empty-handed!");
      return;
    }
    const price = sellPrice(entry.power);
    const items = w.inventoryItems ?? [];
    let idx = -1;
    for (let i = items.length - 1; i >= 0; i--) if (items[i] === entry.power) { idx = i; break; }
    if (idx >= 0) items[idx] = null;
    w.weaponInventory[entry.power - 1] = Math.max(0, (w.weaponInventory[entry.power - 1] ?? 0) - 1);
    mergeOldSnacks(w);
    w.kakiTotal = (w.kakiTotal ?? 0) + price;
    if (state) {
      state.kakiTotal = w.kakiTotal;
      state.peaTotal = 0;
      state.weaponInventory = [...w.weaponInventory];
      state.inventoryItems = [...items];
    }
    playSfx("pickup");
    say(`${weaponName(entry.power)}、買い取ったで！ ルナコイン ${price} 枚や。`,
      `I'll take that ${weaponName(entry.power)}! Here's ${price} Luna Coins.`);
    Story.persist();
    const rows = sellRowCount();
    if (!rows && page > 0) page -= 1;
    sel = Math.min(sel, Math.max(0, sellRowCount() - 1));
  }

  function switchTab(next) {
    if (next === tab) return;
    tab = next;
    sel = 0;
    page = 0;
    playSfx("cursor");
    if (tab === 1) say("いらん武器があったら買い取るで。強い武器ほど高う買うで。", "Got weapons you don't need? I'll buy them. The stronger, the better the price.");
  }
  const backRect = () => ({ x: 34, y: 20, w: 170, h: 46 });

  function handleKey(code) {
    const rows = tab === 0 ? stock().length : sellRowCount();
    const pages = Math.max(1, Math.ceil(sellList().length / SELL_ROWS));
    if (code === "ArrowLeft" || code === "KeyA") {
      if (tab === 1 && page > 0) { page -= 1; sel = 0; playSfx("cursor"); }
      else switchTab(0);
    } else if (code === "ArrowRight" || code === "KeyD") {
      if (tab === 1 && page < pages - 1) { page += 1; sel = 0; playSfx("cursor"); }
      else switchTab(1);
    } else if ((code === "ArrowUp" || code === "KeyW") && rows) {
      sel = (sel + rows - 1) % rows;
      if (tab === 0) keepSelVisible(rows);
      playSfx("cursor");
    } else if ((code === "ArrowDown" || code === "KeyS") && rows) {
      sel = (sel + 1) % rows;
      if (tab === 0) keepSelVisible(rows);
      playSfx("cursor");
    } else if (["Enter", "Space", "KeyX", "KeyJ", "KeyY"].includes(code)) {
      if (tab === 0) buy();
      else sell();
    }
    else if (["Escape", "Tab", "Backspace", "KeyB", "Select"].includes(code)) close();
    return true;
  }

  function handlePointer(x, y) {
    const b = backRect();
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
      close();
      return true;
    }
    for (let i = 0; i < 2; i++) {
      const r = tabRect(i);
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
        switchTab(i);
        return true;
      }
    }
    const inR = r => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
    if (tab === 0) {
      const total = stock().length;
      // ▲▼ でスクロール
      if (total > ROWS && inR(arrowRect(true)) && scroll > 0) { scroll = Math.max(0, scroll - ROWS); sel = Math.max(scroll, Math.min(sel, scroll + ROWS - 1)); playSfx("cursor"); return true; }
      if (total > ROWS && inR(arrowRect(false)) && scroll + ROWS < total) { scroll = Math.min(total - ROWS, scroll + ROWS); sel = Math.max(scroll, Math.min(sel, scroll + ROWS - 1)); playSfx("cursor"); return true; }
      for (let i = 0; i < Math.min(ROWS, total - scroll); i++) {
        if (!inR(rowRect(i))) continue;
        const idx = scroll + i;
        if (sel === idx) buy();
        else { sel = idx; playSfx("cursor"); }
        return true;
      }
      return true;
    }
    const rows = sellRowCount();
    for (let i = 0; i < rows; i++) {
      if (!inR(rowRect(i))) continue;
      if (sel === i) sell();
      else { sel = i; playSfx("cursor"); }
      return true;
    }
    return true;
  }

  function update(dt) {
    t += dt;
    lineT += dt;
  }

  function drawKeeper(cx, base) {
    const bob = Math.sin(t * 2.4) * 5;
    if (ok(art.keeper)) {
      const h = 400;
      const w = h * (art.keeper.naturalWidth / art.keeper.naturalHeight);
      ctx.drawImage(art.keeper, cx - w / 2, base - h + bob, w, h);
      return;
    }
    // 仮の店主：おもちみたいな月うさぎの商人
    ctx.save();
    ctx.translate(cx, base - 150 + bob);
    ctx.fillStyle = "#fffaf0";
    ctx.strokeStyle = "#c8b2ff";
    ctx.lineWidth = 6;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(s * 46, -150, 24, 62, s * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.ellipse(0, 0, 130, 120, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#4d4773";
    ctx.beginPath();
    ctx.arc(-40, -20, 9, 0, Math.PI * 2);
    ctx.arc(40, -20, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffd85a";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(40, -20, 22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "#4d4773";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(0, 8, 22, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
    ctx.fillStyle = "#ff8db7";
    ctx.beginPath();
    ctx.roundRect(-70, 70, 140, 34, 12);
    ctx.fill();
    ctx.restore();
  }

  function drawIcon(it, x, y, size) {
    if (ok(art[it.id])) {
      ctx.drawImage(art[it.id], x - size / 2, y - size / 2, size, size);
      return;
    }
    ctx.save();
    ctx.fillStyle = it.color;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, size * 0.44, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#5a3d9a";
    ctx.font = `900 ${Math.round(size * 0.44)}px ${FX.FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(it.mark, x, y + 2);
    ctx.restore();
  }

  function drawSellList() {
    const list = sellList();
    const rows = list.slice(page * SELL_ROWS, page * SELL_ROWS + SELL_ROWS);
    if (!rows.length) {
      ctx.fillStyle = "rgba(255, 248, 253, 0.9)";
      ctx.beginPath();
      ctx.roundRect(LIST.x, LIST.y, LIST.w, 130, 14);
      ctx.fill();
      ctx.fillStyle = "#8b82b3";
      ctx.font = `900 30px ${FX.FONT}`;
      ctx.textAlign = "center";
      ctx.fillText(L("売れる武器がないよ", "No weapons to sell"), LIST.x + LIST.w / 2, LIST.y + 65);
      return;
    }
    const w = wallet();
    rows.forEach((entry, i) => {
      const r = rowRect(i);
      const active = i === sel;
      const locked = entry.count <= 1 && w.weaponPower === entry.power && w.hasGun;
      ctx.fillStyle = active ? "#fffbe0" : "rgba(255, 248, 253, 0.9)";
      ctx.strokeStyle = active ? "#4fc3dc" : "#c8b2ff";
      ctx.lineWidth = active ? 5 : 2;
      ctx.beginPath();
      ctx.roundRect(r.x - (active ? 8 : 0), r.y, r.w + (active ? 8 : 0), r.h, 14);
      ctx.fill();
      ctx.stroke();
      drawWeaponIcon(r.x + 54, r.y + r.h / 2, entry.power, weaponIconFitScale(entry.power, 92, 0.9), 1);
      ctx.textAlign = "left";
      ctx.font = `900 30px ${FX.FONT}`;
      ctx.fillStyle = locked ? "#9a8fc0" : "#4d4773";
      ctx.fillText(`${weaponName(entry.power)}  ${weaponLevelLabel(entry.power)}`, r.x + 112, r.y + 32);
      ctx.font = `800 21px ${FX.FONT}`;
      ctx.fillStyle = "#8b82b3";
      ctx.fillText(locked ? L(`もってる数 ${entry.count}（そうび中なので売れない）`, `Owned ${entry.count} (equipped)`) : L(`もってる数 ${entry.count}`, `Owned ${entry.count}`), r.x + 112, r.y + 70);
      ctx.textAlign = "right";
      ctx.font = `900 30px ${FX.FONT}`;
      ctx.fillStyle = locked ? "#b3a9d6" : "#2f9e6a";
      ctx.fillText(`+${sellPrice(entry.power)} ${L("枚", "coins")}`, r.x + r.w - 18, r.y + r.h / 2);
    });
    const pages = Math.max(1, Math.ceil(list.length / SELL_ROWS));
    if (pages > 1) {
      ctx.fillStyle = "#ffffff";
      ctx.font = `900 24px ${FX.FONT}`;
      ctx.textAlign = "center";
      ctx.fillText(`◀ ${page + 1} / ${pages} ▶`, LIST.x + LIST.w / 2, rowRect(SELL_ROWS).y + 4);
    }
  }

  function draw() {
    const W = canvas.width;
    const H = canvas.height;
    if (ok(art.bg)) {
      const s = Math.max(W / art.bg.naturalWidth, H / art.bg.naturalHeight);
      ctx.drawImage(art.bg, (W - art.bg.naturalWidth * s) / 2, (H - art.bg.naturalHeight * s) / 2, art.bg.naturalWidth * s, art.bg.naturalHeight * s);
      ctx.fillStyle = "rgba(40, 24, 90, 0.28)";
      ctx.fillRect(0, 0, W, H);
    } else {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#6f5bb8");
      g.addColorStop(0.6, "#b49ae6");
      g.addColorStop(1, "#ffd9ec");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "rgba(255, 255, 255, 0.14)";
      for (let i = 0; i < 6; i++) ctx.fillRect(0, 150 + i * 90, 500, 10);
    }
    ctx.save();
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";

    // もどる
    const b = backRect();
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.strokeStyle = "#c8b2ff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(b.x, b.y, b.w, b.h, 23);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#7f67c8";
    ctx.font = `900 18px ${FX.FONT}`;
    ctx.textAlign = "center";
    ctx.fillText(inStage ? L("◀ ステージへ", "◀ Back") : L("◀ マップへ (Esc)", "◀ Map (Esc)"), b.x + b.w / 2, b.y + b.h / 2 + 1);

    // 看板と さいふ
    ctx.font = `900 34px ${FX.FONT}`;
    ctx.lineWidth = 8;
    ctx.strokeStyle = "#7f67c8";
    ctx.fillStyle = "#fff3a4";
    ctx.textAlign = "left";
    ctx.strokeText(L("よろず屋 つきのわ", "Tsukinowa General Store"), 230, 44);
    ctx.fillText(L("よろず屋 つきのわ", "Tsukinowa General Store"), 230, 44);
    const w = wallet();
    ctx.fillStyle = "rgba(255, 248, 253, 0.95)";
    ctx.strokeStyle = "#ffd85a";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(W - 420, 20, 386, 52, 16);
    ctx.fill();
    ctx.stroke();
    ctx.font = `900 22px ${FX.FONT}`;
    ctx.fillStyle = "#b8862a";
    drawLunaCoin(W - 388, 46, 15);
    ctx.fillStyle = "#b8862a";
    ctx.textBaseline = "middle";
    ctx.fillText(`${L("ルナコイン", "Luna Coins")} ${pairs()}`, W - 362, 47);

    drawKeeper(250, H - 150);

    // 買う ／ 売る のタブ
    for (let i = 0; i < 2; i++) {
      const r = tabRect(i);
      const on = tab === i;
      ctx.fillStyle = on ? (i === 0 ? "#ff8db7" : "#7fd6ea") : "rgba(255, 248, 253, 0.85)";
      ctx.strokeStyle = on ? "#ffffff" : "#c8b2ff";
      ctx.lineWidth = on ? 4 : 2;
      ctx.beginPath();
      ctx.roundRect(r.x, r.y, r.w, r.h, 20);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = on ? "#ffffff" : "#7f67c8";
      ctx.font = `900 28px ${FX.FONT}`;
      ctx.textAlign = "center";
      ctx.fillText(i === 0 ? L("買う", "Buy") : L("売る", "Sell"), r.x + r.w / 2, r.y + r.h / 2 + 1);
    }
    if (tab === 1) drawSellList();

    // 商品リスト（大きな行を5つ。のこりは ▲▼ でスクロール）
    if (tab === 0) {
      const all = stock();
      keepSelVisible(all.length);
      all.slice(scroll, scroll + ROWS).forEach((it, i) => {
        const idx = scroll + i;
        const r = rowRect(i);
        const active = idx === sel;
        const got = !it.repeat && owns(it.id);
        const afford = pairs() >= it.price;
        ctx.fillStyle = active ? "#fffbe0" : "rgba(255, 248, 253, 0.93)";
        ctx.strokeStyle = active ? "#ff8db7" : "#c8b2ff";
        ctx.lineWidth = active ? 6 : 2;
        ctx.beginPath();
        ctx.roundRect(r.x - (active ? 10 : 0), r.y, r.w + (active ? 10 : 0), r.h, 18);
        ctx.fill();
        ctx.stroke();
        drawIcon(it, r.x + 50, r.y + r.h / 2, 78);
        const txt = language === "ja" ? it.ja : it.en;
        const priceW = 170;
        ctx.textAlign = "left";
        ctx.font = `900 30px ${FX.FONT}`;
        ctx.fillStyle = got ? "#9a8fc0" : "#4d4773";
        ctx.fillText(txt[0], r.x + 100, r.y + 26);
        if (it.world !== undefined) {
          // ここでしか買えない印
          const nameW = ctx.measureText(txt[0]).width;
          ctx.fillStyle = "#ff5f9e";
          ctx.beginPath();
          ctx.roundRect(r.x + 112 + nameW, r.y + 12, 118, 28, 14);
          ctx.fill();
          ctx.fillStyle = "#ffffff";
          ctx.font = `900 17px ${FX.FONT}`;
          ctx.fillText(L("ここだけ！", "Only here!"), r.x + 124 + nameW, r.y + 27);
        }
        ctx.font = `700 19px ${FX.FONT}`;
        ctx.fillStyle = "#7d74a8";
        twoLines(txt[1], r.w - 100 - priceW - 10).forEach((ln, k) => ctx.fillText(ln, r.x + 100, r.y + 60 + k * 24));
        ctx.textAlign = "right";
        ctx.font = `900 30px ${FX.FONT}`;
        if (got) {
          ctx.fillStyle = "#3fae6b";
          ctx.fillText(L("もってる ✓", "Owned ✓"), r.x + r.w - 20, r.y + r.h / 2);
        } else {
          ctx.fillStyle = afford ? "#d98a2b" : "#c0266d";
          ctx.fillText(`${it.price} ${L("枚", "coins")}`, r.x + r.w - 20, r.y + r.h / 2);
        }
        if (it.id === "manju" && manjuCount() > 0) {
          ctx.font = `800 18px ${FX.FONT}`;
          ctx.fillStyle = "#8b6ac9";
          ctx.fillText(L(`かばんに ${manjuCount()}個`, `${manjuCount()} in bag`), r.x + r.w - 20, r.y + r.h - 16);
        }
      });
      // ▲▼（まだ上・下に商品があるとき）
      if (all.length > ROWS) {
        for (const up of [true, false]) {
          const a = arrowRect(up);
          const can = up ? scroll > 0 : scroll + ROWS < all.length;
          ctx.globalAlpha = can ? 1 : 0.3;
          ctx.fillStyle = "rgba(255, 248, 253, 0.92)";
          ctx.strokeStyle = "#c8b2ff";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(a.x, a.y, a.w, a.h, 16);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = "#7f67c8";
          ctx.font = `900 26px ${FX.FONT}`;
          ctx.textAlign = "center";
          ctx.fillText(up ? "▲" : "▼", a.x + a.w / 2, a.y + a.h / 2);
          ctx.globalAlpha = 1;
        }
        ctx.fillStyle = "#ffffff";
        ctx.font = `900 18px ${FX.FONT}`;
        ctx.textAlign = "center";
        const ar = arrowRect(true);
        ctx.fillText(`${scroll + 1}-${Math.min(all.length, scroll + ROWS)}`, ar.x + ar.w / 2, (ar.y + ar.h + arrowRect(false).y) / 2);
        ctx.fillText(`/${all.length}`, ar.x + ar.w / 2, (ar.y + ar.h + arrowRect(false).y) / 2 + 22);
      }
    }

    // 店主のセリフ（下に会話の欄がある端末では、そっちに出す）
    const below = line && typeof Handheld !== "undefined" && Handheld.active() && Handheld.commOn() &&
      Chat.show({
        key: "shop:" + line[0],
        who: "keeper",
        name: L("店主 モチまる", "Mochimaru"),
        color: "#ff5f9e",
        avatar: ok(art.keeper) ? art.keeper.src : "",
        size: "250%",
        pos: "50% 16%",
        initial: L("モ", "M"),
        text: [...L(line[0], line[1])].slice(0, Math.floor(lineT * (language === "ja" ? 40 : 70))).join(""),
        modes: ["shop"]
      });
    if (line && !below) {
      const text = L(line[0], line[1]);
      const shown = [...text].slice(0, Math.floor(lineT * (language === "ja" ? 40 : 70))).join("");
      ctx.fillStyle = "rgba(255, 248, 253, 0.97)";
      ctx.strokeStyle = "#ff8db7";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(24, H - 150, 380, 128, 18);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#ff5f9e";
      ctx.font = `900 16px ${FX.FONT}`;
      ctx.textAlign = "left";
      ctx.fillText(L("店主 モチまる", "Mochimaru the shopkeeper"), 42, H - 130);
      ctx.fillStyle = "#3f355d";
      ctx.font = `800 18px ${FX.FONT}`;
      ctx.textBaseline = "top";
      wrapText(shown, 42, H - 112, 346, 25);
      ctx.textBaseline = "middle";
    }
    ctx.fillStyle = "#ffffff";
    ctx.font = `800 15px ${FX.FONT}`;
    ctx.textAlign = "right";
    ctx.fillText(pcKeys(L("←→ 買う／売る ／ ↑↓ えらぶ ／ 決定 ／ B でもどる", "←→ Buy/Sell  /  ↑↓ choose  /  Confirm  /  B: back")), W - 44, H - 18);
    ctx.restore();
  }

  // ワールドマップ上のショップボタン
  const mapButton = () => ({ x: canvas.width - 262, y: 80, w: 228, h: 48 });
  function drawMapButton() {
    if (!unlocked()) return;
    const r = mapButton();
    ctx.save();
    ctx.fillStyle = "rgba(255, 251, 224, 0.95)";
    ctx.strokeStyle = "#ffd85a";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(r.x, r.y + Math.sin(FX.S.time * 3) * 2, r.w, r.h, 24);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#d98a2b";
    ctx.font = `900 19px ${FX.FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(L("よろず屋", "Shop"), r.x + r.w / 2, r.y + r.h / 2 + 1); // SELECT はそうび画面。お店はここをタップか、地図のお店で A
    ctx.restore();
  }
  function mapPointer(x, y) {
    const r = mapButton();
    if (unlocked() && x >= r.x && x <= r.x + r.w && y >= r.y - 4 && y <= r.y + r.h + 4) {
      open();
      return true;
    }
    return false;
  }

  window.Shop = { ITEMS, has, owns, gearList, toggleGear, manjuCount, useManju, itemName, itemDesc, itemIcon, unlocked, open, openInStage, close, update, draw, handleKey, handlePointer, drawMapButton, mapPointer };
})();

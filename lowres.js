// スマホでは、大きな絵のかわりに軽い絵（assets/m/）を読みこむ。
// iPhone はメモリが少なく、絵をたくさん広げると、アプリごと閉じてしまう（よろず屋に入ったときなど）。
// 軽い絵は「元の大きさ」をなのるので（naturalWidth / naturalHeight）、ゲームのコードは元のピクセル座標のまま動く。
// drawImage で絵の一部を切りとるときも、元の座標を軽い絵の座標に読みかえる。
// 読みこみに失敗した絵は、少し待ってから3回までやり直す。
(function () {
  "use strict";
  // 名前 → 元の大きさ [幅, 高さ]
  const LOW = {"boss-crystal-yeti-attack.png": [1448, 1086], "boss-crystal-yeti-hurt.png": [1448, 1086], "boss-crystal-yeti.png": [1402, 1122], "boss-demon-star-overlord-attack.png": [1449, 1086], "boss-demon-star-overlord-hurt.png": [1448, 1086], "boss-demon-star-overlord.png": [1448, 1086], "boss-mars-dome-commander-attack.png": [1448, 1086], "boss-mars-dome-commander-hurt.png": [1444, 1089], "boss-mars-dome-commander.png": [1448, 1086], "boss-mecha-robot-king-attack.png": [1448, 1086], "boss-mecha-robot-king-hurt.png": [1448, 1086], "boss-mecha-robot-king.png": [1402, 1122], "boss-moon-candy-king-attack.png": [1448, 1086], "boss-moon-candy-king-hurt.png": [1448, 1086], "boss-moon-candy-king.png": [1402, 1122], "boss-ocean-manta-queen-attack.png": [1448, 1086], "boss-ocean-manta-queen-hurt.png": [1449, 1086], "boss-ocean-manta-queen.png": [1449, 1086], "cg-ending-finale.png": [1672, 941], "cg-ending-finale.webp": [1280, 720], "cg-ending-laugh.png": [1672, 941], "cg-ending-laugh.webp": [1280, 720], "cg-ending-stage.png": [1280, 720], "cg-ending-stage.webp": [1280, 720], "cg-opening-city.png": [1672, 941], "cg-opening-city.webp": [1280, 720], "cg-opening-dark.png": [1672, 941], "cg-opening-dark.webp": [1280, 720], "cg-opening-depart.png": [1672, 941], "cg-opening-depart.webp": [1280, 720], "cg-opening-duo.png": [1672, 941], "cg-opening-duo.webp": [1280, 720], "door-back.png": [512, 768], "door-bonus.png": [512, 768], "door-locked.png": [512, 768], "door-portal.png": [512, 768], "enemy-crystal-fluff-attack.png": [1448, 1086], "enemy-crystal-fluff-hurt.png": [1434, 1097], "enemy-crystal-fluff.png": [1402, 1122], "enemy-demon-imp-attack.png": [1448, 1086], "enemy-demon-imp-hurt.png": [1484, 1060], "enemy-demon-imp.png": [1402, 1122], "enemy-mars-cactus-attack.png": [1444, 1089], "enemy-mars-cactus-hurt.png": [1448, 1086], "enemy-mars-cactus.png": [1254, 1254], "enemy-mecha-bot-attack.png": [1448, 1086], "enemy-mecha-bot-hurt.png": [1489, 1056], "enemy-mecha-bot.png": [1484, 1060], "enemy-moon-jelly-attack.png": [1402, 1122], "enemy-moon-jelly-hurt.png": [1448, 1086], "enemy-moon-jelly.png": [1402, 1122], "enemy-ocean-manta-attack.png": [1448, 1086], "enemy-ocean-manta-hurt.png": [1448, 1086], "enemy-ocean-manta.png": [1448, 1086], "fg-demon-1.png": [512, 768], "fg-demon-2.png": [512, 768], "fg-factory-1.png": [512, 768], "fg-factory-2.png": [512, 768], "fg-ice-1.png": [512, 768], "fg-ice-2.png": [512, 768], "fg-mars-1.png": [512, 768], "fg-mars-2.png": [512, 768], "fg-moon-1.png": [512, 768], "fg-moon-2.png": [512, 768], "fg-ocean-1.png": [512, 768], "fg-ocean-2.png": [512, 768], "fighter-fly.png": [1024, 512], "fighter-shoot.png": [1024, 512], "fighter-transform.png": [1024, 1024], "gb-controls.webp": [898, 716], "gb-frame-mid.webp": [898, 780], "gb-frame.webp": [898, 1040], "gimmick-block-blue.png": [512, 512], "gimmick-block-red.png": [512, 512], "gimmick-chest-closed.png": [512, 512], "gimmick-chest-open.png": [512, 512], "gimmick-door.png": [256, 768], "gimmick-goal.png": [768, 768], "gimmick-key.png": [512, 512], "gimmick-spring.png": [512, 512], "gimmick-switch-blue.png": [512, 512], "gimmick-switch-red.png": [512, 512], "item-warai-star.png": [512, 512], "item-warai-star.webp": [512, 512], "mech-board.png": [1024, 1024], "mech-idle.png": [1024, 1024], "mech-jump.png": [1024, 1024], "mech-shoot.png": [1024, 1024], "mech-walk-6.png": [3072, 1024], "moonians-logo-English.png": [1024, 352], "moonians-logo.png": [2421, 833], "pastel-moon-ground.png": [2103, 748], "pastel-space-background.png": [1672, 941], "pastel-space-background2.png": [1671, 941], "portrait-luva-card.jpg": [550, 660], "portrait-luva-chibi.png": [1024, 1536], "portrait-luva.png": [1024, 1536], "portrait-luva.webp": [480, 720], "portrait-ranpyon-smile.png": [1024, 1536], "portrait-ranpyon-smile.webp": [480, 720], "portrait-ranpyon-surprise.png": [1024, 1536], "portrait-ranpyon-surprise.webp": [480, 720], "portrait-ranpyon-trouble.png": [1024, 1536], "portrait-ranpyon-trouble.webp": [480, 720], "portrait-ranpyon.png": [1024, 1536], "portrait-ranpyon.webp": [480, 720], "portrait-yanabis-smile.png": [1024, 1536], "portrait-yanabis-smile.webp": [480, 720], "portrait-yanabis-surprise.png": [1024, 1536], "portrait-yanabis-surprise.webp": [480, 720], "portrait-yanabis-trouble.png": [1024, 1536], "portrait-yanabis-trouble.webp": [480, 720], "portrait-yanabis.png": [1254, 1254], "portrait-yanabis.webp": [720, 720], "pyompy-jump-nosmoke.png": [1254, 1254], "pyompy-jump.png": [1254, 1254], "pyompy-run-6.png": [1939, 738], "pyompy-run.png": [1983, 793], "pyompy-spritesheet.png": [2172, 724], "pyonpy-air-shoot-down.png": [1024, 1024], "pyonpy-air-shoot-downfwd.png": [1024, 1024], "pyonpy-air-shoot-up.png": [1024, 1024], "pyonpy-air-shoot-upfwd.png": [1024, 1024], "pyonpy-air-shoot.png": [1024, 1024], "pyonpy-crescent-respawn.png": [1024, 1024], "pyonpy-hurt.png": [1024, 1024], "pyonpy-shoot-downfwd.png": [1024, 1024], "pyonpy-shoot-up.png": [1024, 1024], "pyonpy-shoot-upfwd.png": [1024, 1024], "pyonpy-shoot.png": [1024, 1024], "pyonpy-swim-6.png": [2400, 600], "pyonpy-swim.png": [1024, 1024], "pyonpy-victory.png": [1024, 1024], "run6.png": [1939, 738], "select-ui-generated.png": [1448, 1086], "select-ui-generated2.png": [1280, 720], "shop-bg.png": [1672, 941], "shop-item-boots.png": [512, 512], "shop-item-burger.png": [512, 512], "shop-item-cushion.png": [512, 512], "shop-item-double.png": [512, 512], "shop-item-key.png": [512, 512], "shop-item-magnet.png": [512, 512], "shop-item-statue.png": [512, 512], "shop-item-strap.png": [512, 512], "shop-keeper.png": [1024, 1536], "stage-crystal-bg.png": [1672, 941], "stage-crystal-bg2.png": [1672, 941], "stage-crystal-ground.png": [2097, 750], "stage-demon-bg.png": [1672, 941], "stage-demon-bg2.png": [1672, 941], "stage-demon-ground.png": [2100, 749], "stage-mars-bg.png": [1672, 941], "stage-mars-bg2.png": [1672, 941], "stage-mars-ground.png": [2103, 748], "stage-ocean-bg.png": [1672, 941], "stage-ocean-bg2.png": [1672, 941], "stage-ocean-ground.png": [2106, 747], "stage-ring-bg.png": [1672, 941], "stage-ring-bg2.png": [1672, 941], "stage-ring-ground.png": [2103, 748], "title-keyvisual.png": [1672, 941], "title-keyvisual.webp": [1280, 720], "title-logo-v2.png": [1672, 941], "title-logo.png": [1672, 941], "ui-select-bg.png": [1672, 941], "weapon-fighter-icon.png": [512, 512], "weapon-mech-icon.png": [512, 512], "weapon-moon-01-moon-popper.png": [1254, 1254], "weapon-moon-02-twinmoon-shooter.png": [1254, 1254], "weapon-moon-03-milkyway-cannon.png": [1402, 1122], "weapon-moon-04-orbit-ring.png": [1402, 1122], "weapon-moon-05-ribbon-laser.png": [1402, 1122], "weapon-moon-06-nebula-fan.png": [1411, 1115], "weapon-moon-07-comet-reverse.png": [1402, 1122], "weapon-moon-08-moonian-nova.png": [1254, 1254], "weapon-star-01-saturn-splitter.png": [1536, 1024], "weapon-star-02-aquarium-spear.png": [1334, 1179], "weapon-star-03-quasar-drive.png": [1402, 1122], "weapon-star-04-galaxy-boomerang.png": [1254, 1254], "weapon-star-05-black-hole-pulse.png": [1254, 1254], "weapon-star-06-cosmo-crown.png": [1536, 1024], "weapon-star-07-supernova-360.png": [1402, 1122], "weapon-star-08-stellar-guardian-cannon.png": [1402, 1122], "world-map.png": [1672, 941], "world-map.webp": [1672, 941]};
  const coarse = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
  const small = Math.min(screen.width || 9999, screen.height || 9999) <= 900;
  const useLow = coarse && small;
  window.LOW_RES_IMAGES = useLow;

  function lowInfo(url) {
    if (!useLow || typeof url !== "string") return null;
    const m = url.match(/^(.*?)assets\/([^/?#]+)(\?[^#]*)?$/);
    if (!m || !LOW[m[2]]) return null;
    return { url: m[1] + "assets/m/" + m[2].replace(/\.(png|webp|jpg)$/i, ".webp"), orig: LOW[m[2]] };
  }
  window.lowResSrc = url => lowInfo(url)?.url ?? url;

  const srcDesc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "src");
  const nwDesc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "naturalWidth");
  const nhDesc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "naturalHeight");
  if (!srcDesc || !srcDesc.set) return;

  if (useLow && nwDesc && nhDesc) {
    // 軽い絵は、読みこめたあと「元の大きさ」をなのる
    Object.defineProperty(HTMLImageElement.prototype, "naturalWidth", {
      configurable: true,
      get() {
        const real = nwDesc.get.call(this);
        return this.__orig && real > 0 ? this.__orig[0] : real;
      }
    });
    Object.defineProperty(HTMLImageElement.prototype, "naturalHeight", {
      configurable: true,
      get() {
        const real = nhDesc.get.call(this);
        return this.__orig && real > 0 ? this.__orig[1] : real;
      }
    });
    // drawImage：元の座標で切りとり・元の大きさで描く
    const draw = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (img, ...a) {
      if (img && img.__orig) {
        const realW = nwDesc.get.call(img);
        if (realW > 0) {
          const s = realW / img.__orig[0];
          if (a.length === 8) return draw.call(this, img, a[0] * s, a[1] * s, a[2] * s, a[3] * s, a[4], a[5], a[6], a[7]);
          if (a.length === 2) return draw.call(this, img, a[0], a[1], img.__orig[0], img.__orig[1]);
        }
      }
      return draw.call(this, img, ...a);
    };
  }

  Object.defineProperty(HTMLImageElement.prototype, "src", {
    configurable: true,
    enumerable: srcDesc.enumerable,
    get: srcDesc.get,
    set(value) {
      const info = lowInfo(String(value));
      const url = info ? info.url : String(value);
      this.__orig = info ? info.orig : null;
      if (!this.__retryHooked) {
        this.__retryHooked = true;
        this.addEventListener("error", () => {
          const tries = (this.__retries || 0) + 1;
          if (tries > 3 || !this.__wanted) return;
          this.__retries = tries;
          const base = this.__wanted;
          setTimeout(() => {
            srcDesc.set.call(this, base + (base.includes("?") ? "&" : "?") + "retry=" + tries);
          }, 600 * tries);
        });
      }
      this.__wanted = url;
      this.__retries = 0;
      srcDesc.set.call(this, url);
    }
  });
})();

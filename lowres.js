// スマホでは、大きな絵のかわりに軽い絵（assets/m/）を読みこむ。
// iPhone はメモリが少なく、重い絵がたくさんあると、ときどき読みこまれない（顔や背景が出ない）ため。
// 読みこみに失敗した絵は、少し待ってから3回までやり直す。
(function () {
  "use strict";
  const LOW = new Set(["shop-item-boots.png","shop-item-burger.png","shop-item-cushion.png","shop-item-double.png","shop-item-key.png","shop-item-magnet.png","shop-item-statue.png","shop-item-strap.png", "title-logo.png", "boss-crystal-yeti-attack.png", "boss-crystal-yeti-hurt.png", "boss-crystal-yeti.png", "boss-demon-star-overlord-attack.png", "boss-demon-star-overlord-hurt.png", "boss-demon-star-overlord.png", "boss-mars-dome-commander-attack.png", "boss-mars-dome-commander-hurt.png", "boss-mars-dome-commander.png", "boss-mecha-robot-king-attack.png", "boss-mecha-robot-king-hurt.png", "boss-mecha-robot-king.png", "boss-moon-candy-king-attack.png", "boss-moon-candy-king-hurt.png", "boss-moon-candy-king.png", "boss-ocean-manta-queen-attack.png", "boss-ocean-manta-queen-hurt.png", "boss-ocean-manta-queen.png", "cg-opening-dark.webp", "pastel-space-background.png", "pastel-space-background2.png", "shop-bg.png", "shop-keeper.png", "stage-crystal-bg.png", "stage-crystal-bg2.png", "stage-demon-bg.png", "stage-demon-bg2.png", "stage-mars-bg.png", "stage-mars-bg2.png", "stage-ocean-bg.png", "stage-ocean-bg2.png", "stage-ring-bg.png", "stage-ring-bg2.png", "weapon-fighter-icon.png", "weapon-mech-icon.png", "weapon-moon-01-moon-popper.png", "weapon-moon-02-twinmoon-shooter.png", "weapon-moon-03-milkyway-cannon.png", "weapon-moon-04-orbit-ring.png", "weapon-moon-05-ribbon-laser.png", "weapon-moon-06-nebula-fan.png", "weapon-moon-07-comet-reverse.png", "weapon-moon-08-moonian-nova.png", "weapon-star-01-saturn-splitter.png", "weapon-star-02-aquarium-spear.png", "weapon-star-03-quasar-drive.png", "weapon-star-04-galaxy-boomerang.png", "weapon-star-05-black-hole-pulse.png", "weapon-star-06-cosmo-crown.png", "weapon-star-07-supernova-360.png", "weapon-star-08-stellar-guardian-cannon.png"]);
  const coarse = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
  const small = Math.min(screen.width || 9999, screen.height || 9999) <= 900;
  const useLow = coarse && small;
  window.LOW_RES_IMAGES = useLow;

  function mapSrc(url) {
    if (!useLow || typeof url !== "string") return url;
    const m = url.match(/^(.*?)assets\/([^/?#]+)(\?[^#]*)?$/);
    if (!m || !LOW.has(m[2])) return url;
    return m[1] + "assets/m/" + m[2].replace(/\.(png|webp|jpg)$/i, ".webp");
  }
  window.lowResSrc = mapSrc;

  const desc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "src");
  if (!desc || !desc.set) return;
  Object.defineProperty(HTMLImageElement.prototype, "src", {
    configurable: true,
    enumerable: desc.enumerable,
    get: desc.get,
    set(value) {
      const url = mapSrc(String(value));
      if (!this.__retryHooked) {
        this.__retryHooked = true;
        this.addEventListener("error", () => {
          const tries = (this.__retries || 0) + 1;
          if (tries > 3 || !this.__wanted) return;
          this.__retries = tries;
          const base = this.__wanted;
          setTimeout(() => {
            desc.set.call(this, base + (base.includes("?") ? "&" : "?") + "retry=" + tries);
          }, 600 * tries);
        });
      }
      this.__wanted = url;
      this.__retries = 0;
      desc.set.call(this, url);
    }
  });
})();

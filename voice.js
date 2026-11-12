// voice.js — セリフの声（アフレコブースで作った mp3）を流す
// 声は assets/voice/<stage>/manifest.json（{ "<id>": { text, file, v } }）で探す。無ければ何もしない。
// id = セリフ（空白と▼をのぞく）の FNV-1a 32bit（tools/voice_extract.py と同じ計算）
// 音は game.js の audioOut()（全体の音量・ミュート）を通す。日本語のときだけ流す。
const Voice = (() => {
  "use strict";

  const manifests = {};
  const buffers = new Map();
  let current = null;
  let token = 0;

  function fnv(text) {
    const bytes = new TextEncoder().encode(String(text).replace(/[\s▼]/g, ""));
    let h = 0x811c9dc5;
    for (const b of bytes) {
      h ^= b;
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h.toString(16).padStart(8, "0");
  }

  function manifest(stage) {
    if (!manifests[stage]) {
      manifests[stage] = fetch(`assets/voice/${stage}/manifest.json`, { cache: "no-cache" })
        .then(r => (r.ok ? r.json() : {}))
        .catch(() => ({}));
    }
    return manifests[stage];
  }

  async function buffer(url) {
    if (!buffers.has(url)) {
      buffers.set(url, fetch(url)
        .then(r => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(r.status))))
        .then(data => getAudioContext().decodeAudioData(data))
        .catch(() => null));
    }
    return buffers.get(url);
  }

  function stop() {
    token += 1;
    if (current) {
      try { current.stop(); } catch (_) {}
      current = null;
    }
  }

  async function play(stage, text) {
    stop();
    if (typeof language !== "undefined" && language !== "ja") return;
    if (!stage || !text) return;
    const my = token;
    const entry = (await manifest(stage))[fnv(text)];
    if (!entry || my !== token) return;
    const url = `assets/voice/${stage}/${encodeURIComponent(entry.file || `${fnv(text)}.mp3`)}?v=${entry.v || 0}`;
    const buf = await buffer(url);
    const out = typeof audioOut === "function" ? audioOut() : null;
    if (!buf || !out || my !== token) return;
    const src = getAudioContext().createBufferSource();
    const gain = getAudioContext().createGain();
    gain.gain.value = 1.1;
    src.buffer = buf;
    src.connect(gain);
    gain.connect(out);
    src.onended = () => { if (current === src) current = null; };
    src.start();
    current = src;
  }

  // 次に流れそうな台本の声を先に読んでおく（物語の1行目で待たないように）
  function preload(stage) {
    manifest(stage);
  }

  return { play, stop, preload, fnv, playing: () => !!current };
})();

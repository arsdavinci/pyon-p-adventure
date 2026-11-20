/* 斜面の頂点は、左端からの距離とワールド内の高さ。描画と衝突で同じ折れ線を使う。 */
function shapedGround(x, profile, material) {
  const y = Math.min(...profile.map(point => point[1]));
  return { x, y, w: profile[profile.length - 1][0], h: canvas.height + 48 - y, profile, material };
}

function surfaceY(ground, worldX) {
  if (!ground.profile) return ground.y;
  const points = ground.profile;
  const x = clamp(worldX - ground.x, 0, ground.w);
  for (let i = 1; i < points.length; i++) {
    const [right, endY] = points[i];
    if (x > right) continue;
    const [left, startY] = points[i - 1];
    return startY + (endY - startY) * ((x - left) / (right - left));
  }
  return points[points.length - 1][1];
}

// 歩行中は足元を次の高さへ運ぶ。ジャンプ・飛行時は上に抜けていける。
function followGround(body, ground, oldX) {
  if (!ground.profile || body.x >= ground.x + ground.w || body.x + body.w <= ground.x) return false;
  const oldTop = surfaceY(ground, oldX + body.w / 2);
  const feet = body.y + body.h;
  if (feet > oldTop + 0.01) return false;
  const top = surfaceY(ground, body.x + body.w / 2);
  if (body.grounded && body.vy >= 0 && Math.abs(feet - oldTop) < 0.01) body.y = top - body.h;
  return true;
}

const LANDFORM_COLORS = {
  candy: ["#ffebc6", "#e59aba", "#ab77ae"],
  basalt: ["#ad675f", "#74445b", "#362f51"],
  ice: ["#c2faf8", "#75bddd", "#726ead"]
};

function drawShapedGround(p, theme) {
  const points = p.profile;
  const palette = LANDFORM_COLORS[p.material];
  ctx.save();
  ctx.translate(p.x, 0);
  ctx.beginPath();
  for (const [x, y] of points) ctx.lineTo(x, y);
  ctx.lineTo(p.w, p.y + p.h);
  ctx.lineTo(0, p.y + p.h);
  ctx.closePath();
  ctx.clip();
  const gradient = ctx.createLinearGradient(0, p.y, 0, p.y + p.h);
  gradient.addColorStop(0, palette[0]);
  gradient.addColorStop(0.55, palette[1]);
  gradient.addColorStop(1, palette[2]);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, p.y, p.w, p.h);

  // 岩肌に既存の地面イラストの質感を薄く重ねる。
  const img = p.material === "candy" ? moonGround : stageGroundImages[theme.imageIndex];
  if (img?.complete && img.naturalWidth) {
    const [cropY, cropH] = STAGE_GROUND_CROP[theme.imageIndex] ?? [168, 410];
    ctx.globalAlpha = 0.16;
    ctx.drawImage(img, 0, cropY + cropH * 0.35, img.naturalWidth, cropH * 0.57, 0, p.y, p.w, p.h);
    ctx.globalAlpha = 1;
  }

  // 岩の中にも同じ星の地質が続く。光る模様は歩けるふちより下に置く。
  if (p.material === "candy") {
    for (let depth = 54; depth < p.h; depth += 58) {
      ctx.beginPath();
      for (let x = 0; x <= p.w + 12; x += 12) {
        ctx.lineTo(x, surfaceY(p, p.x + x) + depth + Math.sin(x / 77 + depth / 40) * 10);
      }
      ctx.strokeStyle = depth % 116 === 54 ? "#ffe3bc" : "#f8b9d2";
      ctx.lineWidth = 16;
      ctx.stroke();
    }
  } else {
    for (let x = 28; x < p.w; x += 88) {
      const depth = 60 + 26 * Math.sin(x * 0.079);
      const y = surfaceY(p, p.x + x) + depth;
      ctx.beginPath();
      if (p.material === "ice") {
        const h = 42 + 36 * Math.abs(Math.sin(x / 47));
        ctx.moveTo(x, y);
        ctx.lineTo(x + 28, y + h);
        ctx.lineTo(x - 22, y + h + 28);
        ctx.closePath();
        ctx.fillStyle = "rgba(226,255,255,.48)";
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 6, y + h - 3);
        ctx.lineTo(x - 22, y + h + 28);
        ctx.fillStyle = "rgba(149,143,242,.4)";
        ctx.fill();
      } else {
        const dx = 12 + 14 * Math.sin(x / 25);
        ctx.moveTo(x, y);
        ctx.lineTo(x + dx, y + 24);
        ctx.lineTo(x - 8, y + 47);
        ctx.lineTo(x + dx / 2, y + 86);
        ctx.moveTo(x - 8, y + 47);
        ctx.lineTo(x - 21, y + 56);
        ctx.strokeStyle = "#713d51";
        ctx.lineWidth = 6;
        ctx.stroke();
        ctx.strokeStyle = "#ffb467";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  }
  // 既存の惑星ごとの地面の絵を、歩ける斜面に沿って貼る。
  for (let i = 1; i < points.length; i++) {
    const [x, y] = points[i - 1];
    const [end, endY] = points[i];
    ctx.save();
    ctx.transform(1, (endY - y) / (end - x), 0, 1, x, y);
    drawMoonRock({ x: 0, y: 0, w: end - x, h: 32 }, theme.ground[0], theme.ground[1]);
    ctx.restore();
  }
  ctx.restore();
}

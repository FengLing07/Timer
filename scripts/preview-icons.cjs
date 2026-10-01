/**
 * 图标验收工具：把生成出来的各图层并排渲染，用来肉眼确认
 * 尺寸、透明通道、圆形遮罩下的表现，以及主体是否落在自适应图标的「安全圆」内。
 *
 *   node scripts/preview-icons.cjs      → 输出 _icon-preview.png
 */
const path = require('node:path');
const sharp = require('sharp');

const ASSETS = path.join(__dirname, '..', 'assets');
const C = 1024;

/**
 * 模拟 Android 的圆形遮罩。
 * 注意：sharp 连续调用两次 .composite() 是「覆盖」而不是「叠加」，
 * 必须把所有图层放进同一次 composite 调用里。
 */
async function maskedAdaptive(size) {
  const plate = await sharp(path.join(ASSETS, 'android-icon-background.png'))
    .resize(size, size)
    .png()
    .toBuffer();
  const fg = await sharp(path.join(ASSETS, 'android-icon-foreground.png'))
    .resize(size, size)
    .png()
    .toBuffer();

  const mask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`
  );
  const circle = await sharp(mask).png().toBuffer();

  return sharp(plate)
    .composite([{ input: fg }, { input: circle, blend: 'dest-in' }])
    .png()
    .toBuffer();
}

/** 自适应前景层叠上「安全圆」参考线：用来肉眼确认主体没有越界 */
async function foregroundWithSafeCircle(size) {
  const fg = await sharp(path.join(ASSETS, 'android-icon-foreground.png'))
    .resize(size, size)
    .png()
    .toBuffer();
  // 安全圆直径 = 画布 × 66/108
  const safeRadius = (size / 2) * (66 / 108);
  const guide = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
       <circle cx="${size / 2}" cy="${size / 2}" r="${safeRadius}" fill="none" stroke="#FF6B6B" stroke-width="2" stroke-dasharray="6 5"/>
     </svg>`
  );
  const guidePng = await sharp(guide).png().toBuffer();

  return sharp({
    create: { width: size, height: size, channels: 4, background: { r: 26, g: 33, b: 27, alpha: 1 } },
  })
    .composite([{ input: fg }, { input: guidePng }])
    .png()
    .toBuffer();
}

async function main() {
  const S = 200;
  const small = await sharp(path.join(ASSETS, 'icon.png')).resize(48, 48).png().toBuffer();
  const smallZoom = await sharp(small).resize(48 * 4, 48 * 4, { kernel: 'nearest' }).png().toBuffer();
  const medium = await sharp(path.join(ASSETS, 'icon.png')).resize(S, S).png().toBuffer();
  const adaptiveCircle = await maskedAdaptive(S);
  const adaptiveSquare = await sharp(path.join(ASSETS, 'android-icon-background.png'))
    .resize(S, S)
    .composite([
      {
        input: await sharp(path.join(ASSETS, 'android-icon-foreground.png')).resize(S, S).png().toBuffer(),
      },
    ])
    .png()
    .toBuffer();
  const mono = await sharp(path.join(ASSETS, 'android-icon-monochrome.png')).resize(S, S).png().toBuffer();
  const splash = await sharp({
    create: { width: S, height: S, channels: 4, background: '#1A211B' },
  })
    .composite([{ input: await sharp(path.join(ASSETS, 'splash-icon.png')).resize(S, S).png().toBuffer() }])
    .png()
    .toBuffer();

  const GAP = 24;
  const PAD = 24;
  const safeGuide = await foregroundWithSafeCircle(S);
  const W = PAD * 2 + S * 6 + GAP * 5 + 48 * 4 + GAP;
  const H = PAD * 2 + S;

  await sharp({
    create: { width: W, height: H, channels: 4, background: { r: 18, g: 18, b: 18, alpha: 1 } },
  })
    .composite([
      { input: medium, left: PAD, top: PAD },
      { input: adaptiveSquare, left: PAD + S + GAP, top: PAD },
      { input: adaptiveCircle, left: PAD + (S + GAP) * 2, top: PAD },
      { input: mono, left: PAD + (S + GAP) * 3, top: PAD },
      { input: splash, left: PAD + (S + GAP) * 4, top: PAD },
      { input: safeGuide, left: PAD + (S + GAP) * 5, top: PAD },
      { input: small, left: PAD + (S + GAP) * 6 + 48 + GAP, top: PAD },
      { input: smallZoom, left: PAD + (S + GAP) * 6 + 48 * 2 + GAP * 2, top: PAD },
    ])
    .png()
    .toFile(path.join(__dirname, '..', '_icon-preview.png'));

  console.log('已生成 _icon-preview.png');
  console.log('列: 主图标 | 自适应(方形) | 自适应(圆形遮罩) | monochrome | 启动屏 | 安全圆参考 | 48px | 48px×4');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

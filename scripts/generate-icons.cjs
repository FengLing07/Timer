/**
 * 生成 App 图标（全部由代码画出来，不依赖任何设计稿或图片素材）。
 *
 * 为什么要代码生成而不是用设计工具：
 * 1. 图标用的就是 App 主题里的护眼色，主题一改可以一键重生成，不会出现
 *    「图标还是旧配色」这种不一致；
 * 2. Android 自适应图标有严格的「安全区」要求（内容必须落在中间 66% 内，
 *    否则会被各种厂商的圆角/水滴遮罩切掉），代码生成能保证像素级准确；
 * 3. monochrome（主题图标）图层必须是纯色剪影，位图给不了这个保证。
 *
 * 用法：
 *   node scripts/generate-icons.cjs           # 默认沙漏方案
 *   node scripts/generate-icons.cjs clock     # 换成表针时钟方案
 *
 * 运行方式（sharp 不在项目依赖里，用 Codex 内置运行时即可）：
 *   $env:NODE_PATH="C:\Users\<你>\.codex\...\node\node_modules"
 * 或者项目里 `npm i -D sharp` 之后再运行。
 */
const fs = require('node:fs');
const path = require('node:path');

const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const ASSETS = path.join(ROOT, 'assets');
const SOURCE = path.join(ASSETS, 'icon-source');

const CANVAS = 1024;

/** 取自 src/theme/theme.ts 的护眼主题 */
const MINT = '#8ED6A4';
const BG_GRADIENT_FROM = '#232D22';
const BG_GRADIENT_TO = '#141A15';

const rad = (deg) => (deg * Math.PI) / 180;

/**
 * 方案一（默认）：沙漏。
 * 48px 下轮廓最结实、最容易辨认，而且「时间在流走」这个隐喻和学习计时直接对应。
 *
 * 几何约束（这是自适应图标最容易踩的坑）：
 * Android 要求把内容放进画布中间 66/108 的「安全圆」里，否则遇到圆形 / 水滴
 * 遮罩时边角会被切掉。1024 画布下安全圆半径 = 512 × 66/108 ≈ 313。
 * 所以主体取「半宽 172 × 半高 258」，外接圆半径 √(172² + 258²) ≈ 310 < 313，
 * 横梁的四个角点也稳稳落在安全区内。
 */
function hourglassMotif({ color, scale }) {
  const center = CANVAS / 2;
  const halfWidth = 172 * scale;
  const halfHeight = 258 * scale;
  const barHeight = 40 * scale;
  const glassHalfWidth = 124 * scale;

  const left = center - halfWidth;
  const right = center + halfWidth;
  const top = center - halfHeight;
  const bottom = center + halfHeight;
  const glassTop = top + barHeight;
  const glassBottom = bottom - barHeight;

  return [
    // 上下两根横梁（外框）
    `<rect x="${left}" y="${top}" width="${right - left}" height="${barHeight}" rx="${barHeight / 2}" fill="${color}"/>`,
    `<rect x="${left}" y="${bottom - barHeight}" width="${right - left}" height="${barHeight}" rx="${barHeight / 2}" fill="${color}"/>`,
    // 上下两个三角（沙），在腰部交汇
    `<path d="M ${center - glassHalfWidth} ${glassTop} L ${center + glassHalfWidth} ${glassTop} L ${center} ${center} Z" fill="${color}"/>`,
    `<path d="M ${center - glassHalfWidth} ${glassBottom} L ${center + glassHalfWidth} ${glassBottom} L ${center} ${center} Z" fill="${color}"/>`,
  ].join('\n    ');
}

/**
 * 方案二：表针时钟。更「标准」，但小尺寸下圆环和指针不如沙漏清晰。
 */
function clockMotif({ color, scale }) {
  const c = CANVAS / 2;
  const radius = 330 * scale;
  const ringStroke = 66 * scale;
  const toPoint = (clockAngle, length) => ({
    x: c + length * scale * Math.cos(rad(clockAngle - 90)),
    y: c + length * scale * Math.sin(rad(clockAngle - 90)),
  });
  const hourEnd = toPoint(300, 150);
  const minuteEnd = toPoint(60, 235);

  return [
    `<circle cx="${c}" cy="${c}" r="${radius}" fill="none" stroke="${color}" stroke-width="${ringStroke}"/>`,
    `<line x1="${c}" y1="${c}" x2="${hourEnd.x.toFixed(1)}" y2="${hourEnd.y.toFixed(1)}" stroke="${color}" stroke-width="${58 * scale}" stroke-linecap="round"/>`,
    `<line x1="${c}" y1="${c}" x2="${minuteEnd.x.toFixed(1)}" y2="${minuteEnd.y.toFixed(1)}" stroke="${color}" stroke-width="${44 * scale}" stroke-linecap="round"/>`,
    `<circle cx="${c}" cy="${c}" r="${42 * scale}" fill="${color}"/>`,
  ].join('\n    ');
}

const VARIANTS = { hourglass: hourglassMotif, clock: clockMotif };
const VARIANT_NAME =
  process.argv[2] && VARIANTS[process.argv[2]] ? process.argv[2] : 'hourglass';

function motif(options) {
  return VARIANTS[VARIANT_NAME](options);
}

function svgDocument(inner) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS}" height="${CANVAS}" viewBox="0 0 ${CANVAS} ${CANVAS}">
  <defs>
    <linearGradient id="plate" x1="0" y1="0" x2="0.45" y2="1">
      <stop offset="0" stop-color="${BG_GRADIENT_FROM}"/>
      <stop offset="1" stop-color="${BG_GRADIENT_TO}"/>
    </linearGradient>
  </defs>
  ${inner}
</svg>
`;
}

/** 完整图标：满幅底色 + 主体（用于 iOS 与 Android 传统图标） */
const fullIcon = svgDocument(
  `<rect width="${CANVAS}" height="${CANVAS}" fill="url(#plate)"/>
    ${motif({ color: MINT, scale: 1.35 })}`
);

/** 自适应图标的前景层：透明底 + 主体严格落在安全圆内（scale = 1 即为安全尺寸） */
const foreground = svgDocument(motif({ color: MINT, scale: 1 }));

/** 自适应图标的背景层：只要满幅底色 */
const background = svgDocument(`<rect width="${CANVAS}" height="${CANVAS}" fill="url(#plate)"/>`);

/** 主题图标（monochrome）：纯白剪影，颜色由系统着色 */
const monochrome = svgDocument(motif({ color: '#FFFFFF', scale: 1 }));

/** 启动屏：透明底 + 放大一点的主体（启动屏底色已经是深墨绿） */
const splash = svgDocument(motif({ color: MINT, scale: 1.2 }));

const SVG_OUTPUTS = [
  ['app-icon.svg', fullIcon],
  ['app-icon-foreground.svg', foreground],
  ['app-icon-background.svg', background],
  ['app-icon-monochrome.svg', monochrome],
  ['app-icon-splash.svg', splash],
];

const PNG_OUTPUTS = [
  ['icon.png', fullIcon, CANVAS],
  ['android-icon-foreground.png', foreground, CANVAS],
  ['android-icon-background.png', background, CANVAS],
  ['android-icon-monochrome.png', monochrome, CANVAS],
  ['splash-icon.png', splash, CANVAS],
  ['favicon.png', fullIcon, 64],
];

async function main() {
  fs.mkdirSync(SOURCE, { recursive: true });

  for (const [name, svg] of SVG_OUTPUTS) {
    fs.writeFileSync(path.join(SOURCE, name), svg, 'utf8');
  }

  for (const [name, svg, size] of PNG_OUTPUTS) {
    const target = path.join(ASSETS, name);
    await sharp(Buffer.from(svg), { density: 384 })
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ compressionLevel: 9 })
      .toFile(target);
    const { size: bytes } = fs.statSync(target);
    console.log(`${name.padEnd(30)} ${size}x${size}  ${(bytes / 1024).toFixed(1)} KB`);
  }

  console.log(`\nSVG 源文件已写入 assets/icon-source/`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

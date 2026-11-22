// Instagram 用画像の書き出し
// 使い方（このフォルダで）: node render.js            … すべて書き出す
//                          node render.js feed        … feed.html だけ
// src/*.html の .frame を1枚ずつ PNG にして export/ に保存します。
// パソコンの Microsoft Edge（ヘッドレス）で描画し、sharp-cli で切り出します。
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const SETS = {
  feed:      { w: 1080, h: 1350, count: 3, prefix: 'feed' },
  story:     { w: 1080, h: 1920, count: 3, prefix: 'story' },
  carousel:  { w: 1080, h: 1350, count: 6, prefix: 'carousel' },
  highlight: { w: 1080, h: 1920, count: 5, prefix: 'highlight' },
};

const here = __dirname;
const out = path.join(here, 'export');
const tmp = path.join(require('os').tmpdir(), 'iepro-ig-render');
fs.mkdirSync(out, { recursive: true });
fs.mkdirSync(tmp, { recursive: true });

const only = process.argv[2];
for (const [name, s] of Object.entries(SETS)) {
  if (only && only !== name) continue;
  const src = path.join(here, 'src', name + '.html');
  if (!fs.existsSync(src)) { console.log('skip (no file):', name); continue; }
  const full = path.join(tmp, name + '-full.png');
  execFileSync(EDGE, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--user-data-dir=' + path.join(tmp, 'profile'),
    '--allow-file-access-from-files',
    '--virtual-time-budget=15000',
    `--window-size=${s.w},${s.h * s.count}`,
    '--screenshot=' + full,
    'file:///' + src.replace(/\\/g, '/'),
  ], { stdio: 'ignore' });
  for (let i = 0; i < s.count; i++) {
    const file = path.join(out, `${s.prefix}-${String(i + 1).padStart(2, '0')}.png`);
    execFileSync(process.platform === 'win32' ? 'npx.cmd' : 'npx',
      ['-y', 'sharp-cli@5.1.0', '-i', full, '-o', file, 'extract', String(i * s.h), '0', String(s.w), String(s.h)],
      { stdio: 'ignore', shell: process.platform === 'win32' });
    console.log('wrote', path.relative(here, file));
  }
}

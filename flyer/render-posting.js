// ポスティングチラシ候補5案の書き出し
// 使い方（このフォルダで）: node render-posting.js [guides]
//   export/posting/ に 入稿用 PDF（10ページ）と、1ページずつの確認用 JPG（p01〜p10）を保存します。
//   guides を付けると、JPG に赤線（仕上がり線）と青の点線（文字を置ける範囲）が入ります。
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PAGES = 10;
const here = __dirname;
const out = path.join(here, 'export', 'posting');
const tmp = path.join(require('os').tmpdir(), 'iepro-flyer-render');
fs.mkdirSync(out, { recursive: true });
fs.mkdirSync(tmp, { recursive: true });
const profile = '--user-data-dir=' + path.join(tmp, 'profile');
const src = path.join(here, 'src', 'posting.html');
const url = 'file:///' + src.replace(/\\/g, '/');
const guides = process.argv[2] === 'guides';

execFileSync(EDGE, ['--headless=new', '--disable-gpu', profile, '--allow-file-access-from-files',
  '--virtual-time-budget=15000', '--no-pdf-header-footer', '--print-to-pdf-no-header',
  '--print-to-pdf=' + path.join(out, 'いえプロ不動産_ポスティング候補5案.pdf'), url], { stdio: 'ignore' });
console.log('wrote PDF');

const pxW = 817, pxH = 1146; // 216×303mm を 96dpi で
for (let i = 1; i <= PAGES; i++) {
  const png = path.join(tmp, `posting-${i}.png`);
  execFileSync(EDGE, ['--headless=new', '--disable-gpu', '--hide-scrollbars', profile, '--allow-file-access-from-files',
    '--virtual-time-budget=15000', '--force-device-scale-factor=1.5', `--window-size=${pxW},${pxH}`,
    '--screenshot=' + png, `${url}?page=${i}${guides ? '&guides' : ''}`], { stdio: 'ignore' });
  const jpg = path.join(out, `p${String(i).padStart(2, '0')}.jpg`);
  execFileSync('npx', ['-y', 'sharp-cli@5.1.0', '-i', png, '-o', jpg, '-f', 'jpeg', '-q', '82'], { stdio: 'ignore', shell: true });
  console.log('wrote', path.basename(jpg));
}

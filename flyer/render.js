// A4 チラシの書き出し
// 使い方（このフォルダで）: node render.js
//   export/ に 入稿用 PDF（塗り足し込み 216×303mm）と、確認用の PNG を保存します。
//   確認用 PNG には赤線（仕上がり線）と青の点線（文字を置ける範囲）が入ります。PDF には入りません。
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const FILES = [
  { src: 'single.html', pdf: 'いえプロ不動産_チラシ_A4片面.pdf', pages: 1, png: 'preview-single' },
  { src: 'double.html', pdf: 'いえプロ不動産_チラシ_A4両面.pdf', pages: 2, png: 'preview-double' },
];

const here = __dirname;
const out = path.join(here, 'export');
const tmp = path.join(require('os').tmpdir(), 'iepro-flyer-render');
fs.mkdirSync(out, { recursive: true });
fs.mkdirSync(tmp, { recursive: true });
const profile = '--user-data-dir=' + path.join(tmp, 'profile');
const only = process.argv[2];

for (const f of FILES) {
  if (only && !f.src.startsWith(only)) continue;
  const src = path.join(here, 'src', f.src);
  if (!fs.existsSync(src)) { console.log('skip (no file):', f.src); continue; }
  const url = 'file:///' + src.replace(/\\/g, '/');

  // 入稿用 PDF
  execFileSync(EDGE, ['--headless=new', '--disable-gpu', profile, '--allow-file-access-from-files',
    '--virtual-time-budget=15000', '--no-pdf-header-footer', '--print-to-pdf-no-header',
    '--print-to-pdf=' + path.join(out, f.pdf), url], { stdio: 'ignore' });
  console.log('wrote', f.pdf);

  // 確認用 PNG（ガイド線つき、1ページずつ）
  const pxW = 817, pxH = 1146; // 216×303mm を 96dpi で
  const full = path.join(tmp, f.png + '.png');
  execFileSync(EDGE, ['--headless=new', '--disable-gpu', '--hide-scrollbars', profile, '--allow-file-access-from-files',
    '--virtual-time-budget=15000', '--force-device-scale-factor=2', `--window-size=${pxW},${pxH * f.pages}`,
    '--screenshot=' + full, url + '?guides'], { stdio: 'ignore' });
  for (let i = 0; i < f.pages; i++) {
    const file = path.join(out, `${f.png}-${i + 1}.png`);
    execFileSync('npx', ['-y', 'sharp-cli@5.1.0', '-i', full, '-o', file, 'extract',
      String(i * pxH * 2), '0', String(pxW * 2), String(pxH * 2)], { stdio: 'ignore', shell: true });
    console.log('wrote', path.basename(file));
  }
}

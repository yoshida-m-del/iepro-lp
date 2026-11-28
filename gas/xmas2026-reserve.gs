/**
 * いえプロ不動産 クリスマスキャンペーン 予約フォーム受付スクリプト
 *
 * このコードは「クリスマスキャンペーン予約」用スプレッドシートの
 * 拡張機能 > Apps Script に貼り付けて使います。
 *
 * やること：
 *   1. 予約内容をスプレッドシートの「予約一覧」シートに1行追加
 *   2. NOTIFY_TO 宛てに通知メール（何件目の予約かも表示）
 *   3. お客様に自動返信メール（ご予約内容の控え）
 *   4. 迷惑メール（ボット）対策のチェック
 */

// ===== 設定 =====
const NOTIFY_TO = 'info@iepro-fudosan.com';   // 通知メールの送り先（複数ならカンマ区切り）
const SENDER_NAME = 'いえプロ不動産';            // 自動返信メールの差出人名
const SEND_AUTO_REPLY = true;                   // お客様への自動返信を送るなら true
const SHEET_NAME = '予約一覧';                   // 記録するシート名（無ければ自動で作成）
const LIMIT = 10;                               // 先着人数（通知メールに何件目かを表示）
const MIN_FILL_SECONDS = 5;                     // これより速く送信されたらボットとみなす
const MAX_PER_10MIN = 20;                       // 10分あたりの受付上限（大量送信対策）

const COMPANY = '株式会社Gハウスいえプロ不動産';
const TEL = '06-6185-1252';
const HEADERS = ['受付日時', 'お名前', '電話番号', 'メールアドレス', 'ご希望の内容', '物件の所在地', '物件名・URL',
  '面談場所', '第1希望', '第2希望', '第3希望', 'ご質問・ご要望', 'ギフト券（目安）', '対応状況', '担当者', 'メモ'];
const PURPOSES = { visit: '来店物件相談', view: '内覧' };

// ===== 受付処理 =====
function doPost(e) {
  const p = (e && e.parameter) || {};

  // --- 迷惑メール対策 1：隠し項目（人には見えない欄）に入力があればボット ---
  if (p.website) return json_({ ok: true });
  // --- 迷惑メール対策 2：ページを開いてから送信までが速すぎる ---
  if (!(Number(p.elapsed || 0) / 1000 >= MIN_FILL_SECONDS)) return json_({ ok: true });

  // --- 入力チェック（ブラウザ側でもチェックしていますが、念のためこちらでも） ---
  const d = {
    name: clean_(p.name, 50),
    tel: clean_(p.tel, 30),
    email: clean_(p.email, 254),
    purpose: PURPOSES[p.purpose] || '',
    address: clean_(p.address, 200),
    propname: clean_(p.propname, 300),
    place: clean_(p.place, 200),
    slot1: clean_(p.slot1, 40),
    slot2: clean_(p.slot2, 40),
    slot3: clean_(p.slot3, 40),
    memo: clean_(p.memo, 2000),
    gift: clean_(p.gift, 100),
  };
  if (!d.name || !d.tel || !d.email || !d.purpose || !d.slot1) return json_({ ok: false, error: 'required' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) return json_({ ok: false, error: 'email' });
  if (!/^[0-9０-９\-－‐ー()（）+＋\s]+$/.test(d.tel)) return json_({ ok: false, error: 'tel' });
  if (p.purpose === 'view' && !d.address) return json_({ ok: false, error: 'required' });
  if (p.purpose === 'visit' && !d.place) return json_({ ok: false, error: 'required' });
  if ((d.memo.match(/https?:\/\//gi) || []).length > 2) return json_({ ok: true });

  // --- 迷惑メール対策 3：短時間の大量送信を止める ＋ スプレッドシートに記録 ---
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let count;
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const cache = CacheService.getScriptCache();
    const n = Number(cache.get('count') || 0);
    if (n >= MAX_PER_10MIN) return json_({ ok: false, error: 'busy' });
    cache.put('count', String(n + 1), 600);

    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow(HEADERS);
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#1F3A5F').setFontColor('#FFFFFF');
    }
    sheet.appendRow([
      new Date(), safe_(d.name), safe_(d.tel), safe_(d.email), d.purpose, safe_(d.address), safe_(d.propname),
      safe_(d.place), d.slot1, d.slot2, d.slot3, safe_(d.memo), safe_(d.gift), '未対応', '', '',
    ]);
    count = sheet.getLastRow() - 1;
  } finally {
    lock.releaseLock();
  }

  // --- 通知メール（社内） ---
  const detail = [
    'お名前　　　　：' + d.name + ' 様',
    '電話番号　　　：' + d.tel,
    'メールアドレス：' + d.email,
    'ご希望の内容　：' + d.purpose,
    d.address ? '物件の所在地　：' + d.address : '',
    d.propname ? '物件名・URL　 ：' + d.propname : '',
    d.place ? '面談場所　　　：' + d.place : '',
    '第1希望　　　 ：' + d.slot1,
    d.slot2 ? '第2希望　　　 ：' + d.slot2 : '',
    d.slot3 ? '第3希望　　　 ：' + d.slot3 : '',
    'ご質問・ご要望：' + (d.memo || '（なし）'),
    'ギフト券（目安）：' + (d.gift || '-'),
  ].filter(String).join('\n');

  const over = count > LIMIT ? '\n※先着' + LIMIT + '名を超えています。特典の対象かご確認ください。\n' : '';
  MailApp.sendEmail({
    to: NOTIFY_TO,
    replyTo: d.email,
    subject: '【クリスマス予約 ' + count + '件目】' + d.purpose + '　' + d.name + ' 様',
    body: [
      'クリスマスキャンペーンの予約フォームから申し込みがありました（' + count + '件目／先着' + LIMIT + '名）。',
      over,
      detail,
      '',
      '---',
      '■対応のお願い',
      '・日時を確定し、お客様にご連絡してください。',
      '・ご来店の場合は前日に確認のお電話をしてください。',
      '・スプレッドシートの「対応状況」「担当者」を更新してください。',
      '',
      '記録先：' + ss.getUrl(),
      'このメールに返信すると、お客様に返信できます。',
    ].join('\n'),
  });

  // --- 自動返信メール（お客様） ---
  if (SEND_AUTO_REPLY) {
    MailApp.sendEmail({
      to: d.email,
      name: SENDER_NAME,
      replyTo: NOTIFY_TO.split(',')[0].trim(),
      subject: '【いえプロ不動産】ご予約を受け付けました（クリスマスキャンペーン）',
      body: [
        d.name + ' 様',
        '',
        'このたびは、いえプロ不動産のクリスマスキャンペーンにお申し込みいただき、ありがとうございます。',
        '以下の内容でご予約を受け付けました。',
        '',
        '※まだ日時は確定していません。担当者より、日時確定のご連絡をいたします。',
        '',
        '━━━━━━━━━━━━━━━━',
        detail,
        '━━━━━━━━━━━━━━━━',
        '',
        '■ご来店・ご内覧の前に',
        '・ご来店の場合、前日に当社から確認のお電話をします。',
        '・当日は本人確認書類をお持ちください。',
        '・キャンペーン期間中1世帯1回、先着10名様までとなります。',
        '・ギフト券はAmazonギフト券またはQUOカードからお選びいただけます。',
        '',
        '日時の変更・キャンセルは、このメールへの返信またはお電話でご連絡ください。',
        '',
        '――――――――――――――――',
        COMPANY,
        '本社（新森オフィス）〒535-0022 大阪府大阪市旭区新森6-3-25 エクセレント新森1階',
        'TEL：' + TEL + '　営業時間 9:00～18:00（火・水曜日定休）',
        '※このメールはご予約時に自動でお送りしています。',
      ].join('\n'),
    });
  }

  return json_({ ok: true });
}

// ブラウザで URL を直接開いたときの表示（動作確認用）
function doGet() {
  return ContentService.createTextOutput('クリスマスキャンペーン予約の受付スクリプトは動作しています。');
}

// ===== 補助関数 =====
function clean_(v, max) {
  return String(v == null ? '' : v)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, max);
}

// = + - @ で始まる値は数式として実行されないよう先頭に ' を付ける
function safe_(v) {
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// Apps Script エディタから実行して、権限の許可・シート作成・メール送信をテストする用
function testSetup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss.getSheetByName(SHEET_NAME)) {
    const sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#1F3A5F').setFontColor('#FFFFFF');
  }
  MailApp.sendEmail(NOTIFY_TO, '【テスト】クリスマス予約フォーム設定', 'Apps Script からのテスト送信です。このメールが届けば設定OKです。\n記録先：' + ss.getUrl());
}
